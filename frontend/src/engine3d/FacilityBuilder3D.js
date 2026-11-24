import * as THREE from 'three';
import {
  MAP_COLS,
  MAP_ROWS,
  ROOMS,
  DOORWAYS,
  INTERIOR_OBSTACLES,
  INTERACTABLES,
} from '../data/roomsData.js';
import { CELL_SIZE, WALL_HEIGHT, tileToWorld } from './scale3d.js';

/**
 * Construye el complejo subterráneo 3D completo de EL ARCHIVO 09:
 * - 8 habitaciones cerradas (pisos PBR, muros de 3.3m, techos, vigas y tuberías aéreas).
 * - Puertas 3D reales con bisagra que giran al abrirse y LED de estado.
 * - Mobiliario modelado por sala (catre, escritorios, consolas CRT, caja fuerte,
 *   estanterías altas, camillas, turbinas industriales, grabadora de carrete y Reactor del Núcleo).
 * - Casilleros metálicos practicables en primera persona y todos los objetos interactuables.
 */
export class FacilityBuilder3D {
  constructor(scene, textureFactory, collisionSystem) {
    this.scene = scene;
    this.textures = textureFactory;
    this.collision = collisionSystem;

    this.floorGrid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(null));
    this.solidGrid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(true));

    this.interactableMeshes = [];
    this.interactableObjects = new Map(); // id -> { def, group, hitMesh, active }
    this.doors = new Map(); // doorId -> { def, pivot, isLocked, isOpen, targetAngle, currentAngle, ledMat }
    this.animatedProps = []; // props animados (reactor, carretes, nodos)
  }

  build() {
    // 1. Marcar celdas transitables
    ROOMS.forEach((room) => {
      room.rects.forEach(({ x1, y1, x2, y2 }) => {
        for (let r = y1; r <= y2; r += 1) {
          for (let c = x1; c <= x2; c += 1) {
            this.floorGrid[r][c] = room;
            this.solidGrid[r][c] = false;
          }
        }
      });
    });

    DOORWAYS.forEach((door) => {
      for (let r = door.y1; r <= door.y2; r += 1) {
        for (let c = door.x1; c <= door.x2; c += 1) {
          this.floorGrid[r][c] = { key: 'doorway', name: door.label, theme: 'corridor' };
          this.solidGrid[r][c] = false;
        }
      }
    });

    INTERIOR_OBSTACLES.forEach((obs) => {
      for (let r = obs.y1; r <= obs.y2; r += 1) {
        for (let c = obs.x1; c <= obs.x2; c += 1) {
          this.solidGrid[r][c] = true;
        }
      }
    });

    // 2. Construir pisos y techos por rectángulo de habitación (rápido y con UVs repetidos nítidos)
    this.buildFloorsAndCeilings();

    // 3. Construir muros exteriores e interiores con colisiones 3D
    this.buildPerimeterWalls();

    // 4. Construir obstáculos arquitectónicos 3D (estanterías, turbinas, reactor central)
    this.buildInteriorObstacles3D();

    // 5. Construir puertas 3D funcionales con bisagras y LED
    this.buildDoors3D();

    // 6. Decoración arquitectónica realista (vigas de techo, tuberías, camas, escritorios, camillas)
    this.buildArchitecturalProps();

    // 7. Construir objetos interactuables 3D (documentos, fotos, cintas, enigmas, checkpoints, casilleros, suministros)
    this.buildInteractables3D();
  }

  buildFloorsAndCeilings() {
    const ceilBaseMat = this.textures.getCeilingMaterial();

    const createPlaneRect = (x1, y1, x2, y2, theme) => {
      const cols = x2 - x1 + 1;
      const rows = y2 - y1 + 1;
      const w = cols * CELL_SIZE;
      const d = rows * CELL_SIZE;
      const cx = (x1 + cols / 2) * CELL_SIZE;
      const cz = (y1 + rows / 2) * CELL_SIZE;

      // Clonar material con repetición UV proporcional al tamaño real de la sala
      const floorMat = this.textures.getFloorMaterial(theme).clone();
      floorMat.map = floorMat.map.clone();
      floorMat.map.repeat.set(Math.max(1, cols * 0.5), Math.max(1, rows * 0.5));
      floorMat.map.needsUpdate = true;

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(cx, 0, cz);
      floor.receiveShadow = true;
      this.scene.add(floor);

      const ceilMat = ceilBaseMat.clone();
      ceilMat.map = ceilMat.map.clone();
      ceilMat.map.repeat.set(Math.max(1, cols * 0.45), Math.max(1, rows * 0.45));
      ceilMat.map.needsUpdate = true;

      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(cx, WALL_HEIGHT, cz);
      this.scene.add(ceiling);
    };

    ROOMS.forEach((room) => {
      room.rects.forEach((rect) => createPlaneRect(rect.x1, rect.y1, rect.x2, rect.y2, room.theme));
    });

    DOORWAYS.forEach((door) => {
      createPlaneRect(door.x1, door.y1, door.x2, door.y2, 'corridor');
    });
  }

  buildPerimeterWalls() {
    // Creamos segmentos de muro continuos únicamente donde el espacio sólido linda con suelo transitable
    const wallThickness = 0.22;
    const wallMeshesByTheme = new Map();

    const addWallSegment = (cx, cz, lenX, lenZ, theme) => {
      const mat = this.textures.getWallMaterial(theme);
      const geo = new THREE.BoxGeometry(lenX, WALL_HEIGHT, lenZ);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, WALL_HEIGHT / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.collision.addCenteredBox(cx, cz, lenX, lenZ, 'wall');
      wallMeshesByTheme.set(`${cx},${cz}`, mesh);
    };

    // Caras horizontales (norte/sur de celdas transitables)
    for (let r = 0; r < MAP_ROWS; r += 1) {
      let runNorth = null;
      let runSouth = null;

      for (let c = 0; c <= MAP_COLS; c += 1) {
        const walkable = c < MAP_COLS && !this.solidGrid[r][c];
        const roomTheme = walkable ? this.floorGrid[r][c]?.theme || 'corridor' : null;
        const wallNorth = walkable && (r === 0 || this.solidGrid[r - 1][c]);
        const wallSouth = walkable && (r === MAP_ROWS - 1 || this.solidGrid[r + 1][c]);

        if (wallNorth && !runNorth) runNorth = { start: c, theme: roomTheme };
        if ((!wallNorth || (runNorth && runNorth.theme !== roomTheme)) && runNorth) {
          const count = c - runNorth.start;
          const cx = (runNorth.start + count / 2) * CELL_SIZE;
          const cz = r * CELL_SIZE - wallThickness / 2;
          addWallSegment(cx, cz, count * CELL_SIZE + 0.04, wallThickness, runNorth.theme);
          runNorth = wallNorth ? { start: c, theme: roomTheme } : null;
        }

        if (wallSouth && !runSouth) runSouth = { start: c, theme: roomTheme };
        if ((!wallSouth || (runSouth && runSouth.theme !== roomTheme)) && runSouth) {
          const count = c - runSouth.start;
          const cx = (runSouth.start + count / 2) * CELL_SIZE;
          const cz = (r + 1) * CELL_SIZE + wallThickness / 2;
          addWallSegment(cx, cz, count * CELL_SIZE + 0.04, wallThickness, runSouth.theme);
          runSouth = wallSouth ? { start: c, theme: roomTheme } : null;
        }
      }
    }

    // Caras verticales (oeste/este de celdas transitables)
    for (let c = 0; c < MAP_COLS; c += 1) {
      let runWest = null;
      let runEast = null;

      for (let r = 0; r <= MAP_ROWS; r += 1) {
        const walkable = r < MAP_ROWS && !this.solidGrid[r][c];
        const roomTheme = walkable ? this.floorGrid[r][c]?.theme || 'corridor' : null;
        const wallWest = walkable && (c === 0 || this.solidGrid[r][c - 1]);
        const wallEast = walkable && (c === MAP_COLS - 1 || this.solidGrid[r][c + 1]);

        if (wallWest && !runWest) runWest = { start: r, theme: roomTheme };
        if ((!wallWest || (runWest && runWest.theme !== roomTheme)) && runWest) {
          const count = r - runWest.start;
          const cx = c * CELL_SIZE - wallThickness / 2;
          const cz = (runWest.start + count / 2) * CELL_SIZE;
          addWallSegment(cx, cz, wallThickness, count * CELL_SIZE + 0.04, runWest.theme);
          runWest = wallWest ? { start: r, theme: roomTheme } : null;
        }

        if (wallEast && !runEast) runEast = { start: r, theme: roomTheme };
        if ((!wallEast || (runEast && runEast.theme !== roomTheme)) && runEast) {
          const count = r - runEast.start;
          const cx = (c + 1) * CELL_SIZE + wallThickness / 2;
          const cz = (runEast.start + count / 2) * CELL_SIZE;
          addWallSegment(cx, cz, wallThickness, count * CELL_SIZE + 0.04, runEast.theme);
          runEast = wallEast ? { start: r, theme: roomTheme } : null;
        }
      }
    }
  }

  buildInteriorObstacles3D() {
    const shelfMat = this.textures.getBookshelfMaterial();
    const steelDark = this.textures.getMetalMaterial('#2a3036', 0.45, 0.72);
    const copperMat = this.textures.getMetalMaterial('#7a4e2b', 0.25, 0.8);

    INTERIOR_OBSTACLES.forEach((obs) => {
      const cols = obs.x2 - obs.x1 + 1;
      const rows = obs.y2 - obs.y1 + 1;
      const w = cols * CELL_SIZE - 0.16;
      const d = rows * CELL_SIZE - 0.16;
      const cx = (obs.x1 + cols / 2) * CELL_SIZE;
      const cz = (obs.y1 + rows / 2) * CELL_SIZE;

      this.collision.addCenteredBox(cx, cz, w, d, 'obstacle');

      if (obs.kind === 'shelf') {
        const height = 2.65;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), [
          steelDark,
          steelDark,
          steelDark,
          steelDark,
          shelfMat,
          shelfMat,
        ]);
        mesh.position.set(cx, height / 2, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      } else if (obs.kind === 'turbine') {
        const group = new THREE.Group();
        group.position.set(cx, 0, cz);

        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), steelDark);
        base.position.y = 0.225;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(Math.min(w, d) * 0.42, Math.min(w, d) * 0.44, 2.3, 20),
          steelDark
        );
        cyl.position.y = 1.55;
        cyl.castShadow = true;
        cyl.receiveShadow = true;
        group.add(cyl);

        // Anillos de bobina de cobre
        for (let i = 0; i < 3; i += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(Math.min(w, d) * 0.44, 0.09, 10, 24),
            copperMat
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.9 + i * 0.65;
          group.add(ring);
        }

        // Tubería superior hacia el techo
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 12), steelDark);
        pipe.position.y = 2.85;
        group.add(pipe);

        this.scene.add(group);
      } else if (obs.kind === 'core_reactor') {
        // Reactor Bioeléctrico 09 (pieza central imponente)
        const group = new THREE.Group();
        group.position.set(cx, 0, cz);

        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.0, 0.55, 24), steelDark);
        pedestal.position.y = 0.275;
        pedestal.receiveShadow = true;
        group.add(pedestal);

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x3b0f16,
          roughness: 0.15,
          metalness: 0.2,
          transparent: true,
          opacity: 0.48,
        });
        const chamber = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.5, 24), glassMat);
        chamber.position.y = 1.8;
        group.add(chamber);

        const bioCoreMat = new THREE.MeshStandardMaterial({
          color: 0x8f121e,
          emissive: new THREE.Color(0xc91e2e),
          emissiveIntensity: 1.8,
          roughness: 0.35,
        });
        const bioCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), bioCoreMat);
        bioCore.position.y = 1.75;
        bioCore.castShadow = true;
        group.add(bioCore);

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.08, 12, 32), steelDark);
        ring1.position.y = 1.75;
        group.add(ring1);

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.06, 12, 32), copperMat);
        ring2.position.y = 1.75;
        ring2.rotation.x = Math.PI / 3;
        group.add(ring2);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.5, 0.45, 24), steelDark);
        cap.position.y = WALL_HEIGHT - 0.22;
        group.add(cap);

        this.scene.add(group);
        this.animatedProps.push({ kind: 'core_reactor', bioCore, bioCoreMat, ring1, ring2 });
      }
    });
  }

  buildDoors3D() {
    const frameMat = this.textures.getMetalMaterial('#22262b', 0.4, 0.75);
    const handleMat = this.textures.getMetalMaterial('#a89b82', 0.15, 0.85);

    DOORWAYS.forEach((doorDef) => {
      const cols = doorDef.x2 - doorDef.x1 + 1;
      const rows = doorDef.y2 - doorDef.y1 + 1;
      const spanW = cols * CELL_SIZE;
      const spanD = rows * CELL_SIZE;
      const cx = (doorDef.x1 + cols / 2) * CELL_SIZE;
      const cz = (doorDef.y1 + rows / 2) * CELL_SIZE;

      const isHeavy = Boolean(doorDef.lockedBy);
      const isLocked = Boolean(doorDef.lockedBy);
      const doorHeight = 2.48;
      const leafWidth = 1.72;
      const doorwaySpan = doorDef.orientation === 'vertical' ? spanD : spanW;
      const sideJambWidth = Math.max(0.18, (doorwaySpan - leafWidth) / 2);

      const assembly = new THREE.Group();
      assembly.position.set(cx, 0, cz);
      if (doorDef.orientation === 'vertical') {
        assembly.rotation.y = Math.PI / 2;
      }

      // Dintel superior hasta el techo
      const lintelH = WALL_HEIGHT - doorHeight;
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(doorwaySpan + 0.04, lintelH, 0.28),
        frameMat
      );
      lintel.position.set(0, doorHeight + lintelH / 2, 0);
      lintel.castShadow = true;
      assembly.add(lintel);

      // Jambas laterales macizas
      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(sideJambWidth, doorHeight, 0.28),
        frameMat
      );
      leftJamb.position.set(-doorwaySpan / 2 + sideJambWidth / 2, doorHeight / 2, 0);
      leftJamb.castShadow = true;
      assembly.add(leftJamb);

      const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(sideJambWidth, doorHeight, 0.28),
        frameMat
      );
      rightJamb.position.set(doorwaySpan / 2 - sideJambWidth / 2, doorHeight / 2, 0);
      rightJamb.castShadow = true;
      assembly.add(rightJamb);

      // Pivote de bisagra en el borde izquierdo de la hoja
      const pivot = new THREE.Group();
      pivot.position.set(-leafWidth / 2, 0, 0);
      assembly.add(pivot);

      const leafMat = this.textures.getDoorMaterial(isHeavy);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafWidth - 0.04, doorHeight - 0.04, 0.1), leafMat);
      leaf.position.set(leafWidth / 2, doorHeight / 2, 0);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      leaf.userData.interactable = {
        type: 'door',
        doorId: doorDef.id,
        label: doorDef.label,
      };
      pivot.add(leaf);
      this.interactableMeshes.push(leaf);

      // Manija metálica a ambos lados
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.22), handleMat);
      handle.position.set(leafWidth - 0.18, 1.05, 0);
      pivot.add(handle);

      // LED de estado sobre el marco (rojo = bloqueada, verde = libre)
      const ledMat = new THREE.MeshBasicMaterial({
        color: isLocked ? 0xe03a3a : 0x4d9e6f,
      });
      const ledFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.34), ledMat);
      ledFront.position.set(0, doorHeight + 0.16, 0);
      assembly.add(ledFront);

      this.scene.add(assembly);

      // Colisión dinámica para la puerta cerrada
      const boxHalfW = doorDef.orientation === 'vertical' ? 0.16 : doorwaySpan / 2;
      const boxHalfD = doorDef.orientation === 'vertical' ? doorwaySpan / 2 : 0.16;
      this.collision.setDynamicBox(
        doorDef.id,
        cx - boxHalfW,
        cx + boxHalfW,
        cz - boxHalfD,
        cz + boxHalfD,
        true
      );

      this.doors.set(doorDef.id, {
        def: doorDef,
        pivot,
        leaf,
        ledMat,
        cx,
        cz,
        isLocked,
        isOpen: false,
        currentAngle: 0,
        targetAngle: 0,
      });
    });
  }

  buildArchitecturalProps() {
    const steel = this.textures.getMetalMaterial('#2f353b', 0.45, 0.72);
    const pipeMat = this.textures.getMetalMaterial('#3d4347', 0.55, 0.75);
    const darkWood = this.textures.getWoodMaterial(true);
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4e4b45, roughness: 0.95 });

    // Vigas de hormigón y tuberías aéreas a lo largo del Pasillo Central
    for (let c = 16; c <= 43; c += 4) {
      const p = tileToWorld(c, 7);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 7 * CELL_SIZE), steel);
      beam.position.set(p.x, WALL_HEIGHT - 0.13, p.z);
      this.scene.add(beam);
    }
    const longPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 29 * CELL_SIZE, 10),
      pipeMat
    );
    longPipe.rotation.z = Math.PI / 2;
    const pMid = tileToWorld(29, 4.4);
    longPipe.position.set(pMid.x, WALL_HEIGHT - 0.32, pMid.z);
    this.scene.add(longPipe);

    // Catre metálico en Celda B-04
    {
      const pos = tileToWorld(3, 7);
      const cot = new THREE.Group();
      cot.position.set(pos.x, 0, pos.z);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.05), steel);
      frame.position.y = 0.42;
      frame.castShadow = true;
      cot.add(frame);
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 1.95), fabricMat);
      mattress.position.y = 0.55;
      mattress.castShadow = true;
      mattress.receiveShadow = true;
      cot.add(mattress);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.38), fabricMat);
      pillow.position.set(0, 0.68, -0.68);
      cot.add(pillow);
      this.scene.add(cot);
      this.collision.addCenteredBox(pos.x, pos.z, 1.15, 2.1, 'low_prop');
    }

    // Camilla médica en Enfermería
    {
      const pos = tileToWorld(40, 19);
      const gurney = new THREE.Group();
      gurney.position.set(pos.x, 0, pos.z);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 2.0), fabricMat);
      top.position.y = 0.82;
      top.castShadow = true;
      gurney.add(top);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 1.75), steel);
      base.position.y = 0.36;
      gurney.add(base);
      this.scene.add(gurney);
      this.collision.addCenteredBox(pos.x, pos.z, 1.1, 2.1, 'low_prop');
    }

    // Escritorio ejecutivo de madera en la Oficina de la Dra. Vance
    {
      const pos = tileToWorld(52, 19);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.82, 1.05), darkWood);
      desk.position.set(pos.x, 0.41, pos.z);
      desk.castShadow = true;
      desk.receiveShadow = true;
      this.scene.add(desk);
      this.collision.addCenteredBox(pos.x, pos.z, 2.15, 1.1, 'low_prop');
    }

    // === Detalles ambientales de terror psicológico (grafitis de advertencia y rastros) ===
    const createWallWarning = (text, col, row, offsetX, offsetZ, rotY) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 160;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillStyle = 'rgba(138, 18, 24, 0.82)';
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 95);
      // Goteos de pintura/sangre seca
      for (let i = 0; i < 14; i += 1) {
        const gx = 70 + Math.random() * 370;
        ctx.fillRect(gx, 96, 3, 14 + Math.random() * 38);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.78),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      const base = tileToWorld(col, row);
      plane.position.set(base.x + offsetX, 1.75, base.z + offsetZ);
      plane.rotation.y = rotY;
      this.scene.add(plane);
    };

    // Advertencias pintadas en los pasillos principales
    createWallWarning('NO CORRAS · TE ESCUCHA', 18, 4, 0, -0.68, 0);
    createWallWarning('SUJETO 09 — YA MORISTE AQUÍ', 31, 4, 0, -0.68, 0);
    createWallWarning('NÚCLEO 09 // NO ABRIR', 29, 25, 0, 0.65, Math.PI);

    // Rastros orgánicos de arrastre en el suelo (con bordes irregulares y salpicaduras)
    const stainCanvas = document.createElement('canvas');
    stainCanvas.width = 256;
    stainCanvas.height = 128;
    const sCtx = stainCanvas.getContext('2d');
    sCtx.clearRect(0, 0, 256, 128);
    for (let i = 0; i < 18; i += 1) {
      const bx = 28 + (i / 18) * 195 + (Math.random() - 0.5) * 18;
      const by = 48 + (Math.random() - 0.5) * 34;
      const br = 12 + Math.random() * 22;
      const g = sCtx.createRadialGradient(bx, by, 2, bx, by, br);
      g.addColorStop(0, 'rgba(72, 9, 14, 0.85)');
      g.addColorStop(0.55, 'rgba(54, 7, 11, 0.45)');
      g.addColorStop(1, 'rgba(40, 4, 8, 0)');
      sCtx.fillStyle = g;
      sCtx.beginPath();
      sCtx.arc(bx, by, br, 0, Math.PI * 2);
      sCtx.fill();
    }
    const stainTex = new THREE.CanvasTexture(stainCanvas);
    stainTex.colorSpace = THREE.SRGBColorSpace;
    const stainMat = new THREE.MeshStandardMaterial({
      map: stainTex,
      roughness: 0.24,
      metalness: 0.08,
      transparent: true,
      depthWrite: false,
    });
    [
      { col: 16, row: 7, sx: 1.6, sz: 0.6 },
      { col: 21, row: 7.4, sx: 2.1, sz: 0.7 },
      { col: 29, row: 12, sx: 0.9, sz: 2.3 },
      { col: 36, row: 17.5, sx: 1.7, sz: 0.75 },
    ].forEach((s) => {
      const p = tileToWorld(s.col, s.row);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(s.sx, s.sz), stainMat);
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(p.x, 0.012, p.z);
      this.scene.add(decal);
    });
  }

  buildInteractables3D() {
    const steel = this.textures.getMetalMaterial('#2f363d', 0.35, 0.72);
    const deskWood = this.textures.getWoodMaterial(true);
    const paperMat = this.textures.getDocumentTexture();

    INTERACTABLES.forEach((def) => {
      const pos = tileToWorld(def.col, def.row);
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      let hitMesh = null;

      const tagData = {
        type: def.type,
        id: def.id,
        def,
        label: def.label,
      };

      if (def.type === 'checkpoint') {
        // Nodo de Estabilización Biométrico 3D
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.25, 18), steel);
        base.position.y = 0.125;
        group.add(base);

        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.45, 16), steel);
        col.position.y = 0.95;
        col.castShadow = true;
        group.add(col);

        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x4d9e6f,
          emissive: new THREE.Color(0x4d9e6f),
          emissiveIntensity: 1.5,
        });
        const orb = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 10, 24), ringMat);
        orb.position.y = 1.65;
        group.add(orb);

        hitMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 1.9, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 0.95;
        group.add(hitMesh);
        this.collision.addCenteredBox(pos.x, pos.z, 0.85, 0.85, 'low_prop');
        this.animatedProps.push({ kind: 'checkpoint', orb });
      } else if (def.type === 'locker') {
        // Casillero metálico 3D practicable en primera persona
        const h = 2.25;
        const w = 0.96;
        const d = 0.86;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Rejillas de ventilación delanteras
        const ventMat = new THREE.MeshBasicMaterial({ color: 0x050608 });
        for (let i = 0; i < 4; i += 1) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.04), ventMat);
          slit.position.set(0, 1.55 + i * 0.1, d / 2 + 0.01);
          group.add(slit);
        }

        hitMesh = body;
        this.collision.addCenteredBox(pos.x, pos.z, w, d, 'prop');
      } else if (def.type === 'investigation') {
        // Pedestal o mesa baja con documento, fotografía o cinta magnética 3D
        const table = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.78, 0.65), deskWood);
        table.position.y = 0.39;
        table.castShadow = true;
        table.receiveShadow = true;
        group.add(table);

        if (def.spriteKind === 'photo') {
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.025, 0.36),
            new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.75, emissive: 0x261d12 })
          );
          frame.position.set(0, 0.8, 0);
          frame.rotation.y = 0.25;
          group.add(frame);
        } else if (def.spriteKind === 'recording') {
          const deck = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.1, 0.24),
            new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5, metalness: 0.6 })
          );
          deck.position.set(0, 0.83, 0);
          group.add(deck);
          const spoolMat = new THREE.MeshStandardMaterial({ color: 0xd4943a, emissive: 0x5c3a0c });
          const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), spoolMat);
          s1.position.set(-0.08, 0.89, 0);
          const s2 = s1.clone();
          s2.position.x = 0.08;
          group.add(s1, s2);
        } else {
          const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.44), paperMat);
          sheet.position.set(0, 0.795, 0);
          sheet.rotation.y = -0.22;
          group.add(sheet);
        }

        hitMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.15, 0.8),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 0.58;
        group.add(hitMesh);
        this.collision.addCenteredBox(pos.x, pos.z, 0.85, 0.65, 'low_prop');
      } else if (def.type === 'puzzle' || def.type === 'ending_console') {
        const isCore = def.spriteKind === 'core_panel' || def.type === 'ending_console';
        const isTerminal = def.spriteKind === 'terminal';
        const isSafe = def.spriteKind === 'safe';

        const consoleBase = new THREE.Mesh(
          new THREE.BoxGeometry(isSafe ? 0.95 : 1.15, isSafe ? 1.25 : 1.05, 0.75),
          steel
        );
        consoleBase.position.y = isSafe ? 0.625 : 0.525;
        consoleBase.castShadow = true;
        consoleBase.receiveShadow = true;
        group.add(consoleBase);

        const screenColor = isCore ? 0xd93644 : isTerminal ? 0x4d9e6f : 0xd4943a;
        const screenMat = new THREE.MeshStandardMaterial({
          color: screenColor,
          emissive: new THREE.Color(screenColor),
          emissiveIntensity: 1.3,
          roughness: 0.25,
        });

        if (isSafe) {
          const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), screenMat);
          dial.rotation.x = Math.PI / 2;
          dial.position.set(0, 0.82, 0.4);
          group.add(dial);
        } else {
          const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.36), steel);
          monitor.position.set(0, 1.32, -0.05);
          group.add(monitor);
          const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), screenMat);
          screen.position.set(0, 1.32, 0.14);
          group.add(screen);
        }

        hitMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 1.8, 0.95),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 0.9;
        group.add(hitMesh);
        this.collision.addCenteredBox(pos.x, pos.z, 1.1, 0.75, 'low_prop');
      } else if (def.type === 'consumable') {
        // Suministro médico / batería / bengala sobre caja pequeña
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), steel);
        crate.position.y = 0.21;
        crate.castShadow = true;
        group.add(crate);

        const color =
          def.itemKind === 'medkit' ? 0xd9d4c7 : def.itemKind === 'battery' ? 0xd4943a : 0xc43232;
        const itemMesh = new THREE.Mesh(
          def.itemKind === 'flare'
            ? new THREE.CylinderGeometry(0.05, 0.05, 0.32, 10)
            : new THREE.BoxGeometry(0.32, 0.16, 0.24),
          new THREE.MeshStandardMaterial({
            color,
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.32,
            roughness: 0.45,
          })
        );
        if (def.itemKind === 'flare') itemMesh.rotation.z = Math.PI / 2;
        itemMesh.position.y = 0.52;
        group.add(itemMesh);

        hitMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.95, 0.75),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 0.48;
        group.add(hitMesh);
      }

      if (hitMesh) {
        hitMesh.userData.interactable = tagData;
        this.interactableMeshes.push(hitMesh);
      }

      this.scene.add(group);
      this.interactableObjects.set(def.id, {
        def,
        group,
        hitMesh,
        x: pos.x,
        z: pos.z,
        active: true,
      });
    });
  }

  unlockDoor(doorId) {
    const door = this.doors.get(doorId);
    if (!door || !door.isLocked) return false;
    door.isLocked = false;
    door.ledMat.color.setHex(0x4d9e6f);
    return true;
  }

  toggleDoor(doorId) {
    const door = this.doors.get(doorId);
    if (!door || door.isLocked) return { ok: false, door };
    door.isOpen = !door.isOpen;
    door.targetAngle = door.isOpen ? Math.PI * 0.52 : 0;
    this.collision.setDynamicActive(doorId, !door.isOpen);
    return { ok: true, isOpen: door.isOpen, door };
  }

  update(dt, timeSec) {
    // Animación fluida de bisagras de puertas 3D
    this.doors.forEach((door) => {
      if (Math.abs(door.currentAngle - door.targetAngle) > 0.005) {
        door.currentAngle = THREE.MathUtils.lerp(
          door.currentAngle,
          door.targetAngle,
          Math.min(1, dt * 6.5)
        );
        door.pivot.rotation.y = door.currentAngle;
      }
    });

    // Animaciones de ambiente (Reactor Núcleo 09 y Nodos de Estabilización)
    this.animatedProps.forEach((p) => {
      if (p.kind === 'core_reactor') {
        p.ring1.rotation.y = timeSec * 0.45;
        p.ring1.rotation.x = Math.sin(timeSec * 0.7) * 0.35;
        p.ring2.rotation.z = -timeSec * 0.6;
        p.bioCore.scale.setScalar(1 + Math.sin(timeSec * 2.8) * 0.06);
        p.bioCoreMat.emissiveIntensity = 1.5 + Math.sin(timeSec * 2.8) * 0.55;
      } else if (p.kind === 'checkpoint') {
        p.orb.rotation.y = timeSec * 1.1;
        p.orb.rotation.x = Math.sin(timeSec * 1.5) * 0.25;
      }
    });
  }

  getRoomAtWorld(wx, wz) {
    const col = Math.floor(wx / CELL_SIZE);
    const row = Math.floor(wz / CELL_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
    const room = this.floorGrid[row][col];
    return room && room.key !== 'doorway' ? room : null;
  }
}
