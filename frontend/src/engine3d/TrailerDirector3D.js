import * as THREE from 'three';
import { PBRTextureFactory } from './PBRTextureFactory.js';

/**
 * Motor de Cinemática 3D en Tiempo Real (Tráiler de Introducción de EL ARCHIVO 09).
 * Renderiza 5 tomas de cámara animadas en WebGL2 PBR:
 *   0: Travelling lento por el pasillo subterráneo inundado de niebla y fluorescentes parpadeantes.
 *   1: Aparición 3D de El Eco acechando hacia la cámara bajo luz roja de emergencia.
 *   2: Órbita cinematográfica alrededor del Reactor Bioeléctrico del Núcleo 09.
 *   3: Despertar en primera persona en Celda B-04 enfocando el expediente y la salida.
 *   4: Plano final oscuro con haz de linterna y niebla para el título EL ARCHIVO 09.
 */
export class TrailerDirector3D {
  constructor(container) {
    this.container = container;
    this.disposed = false;
    this.paused = false;
    this.currentTime = 0;
    this.totalDuration = 32; // segundos totales del tráiler

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030406);
    this.scene.fog = new THREE.FogExp2(0x030406, 0.068);

    this.camera = new THREE.PerspectiveCamera(
      54,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      55
    );

    this.textures = new PBRTextureFactory();
    this.hemi = new THREE.HemisphereLight(0x3f5268, 0x161a20, 0.55);
    this.scene.add(this.hemi);

    // Construir 3 sets cinematográficos dedicados en zonas separadas de la escena
    this.buildCorridorSet();      // Z = 0 .. -28 (Tomas 0 y 1)
    this.buildCoreReactorSet();   // X = 60 (Toma 2)
    this.buildCellAwakeningSet(); // X = -60 (Tomas 3 y 4)
    this.buildDust();

    this._onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);

    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  buildCorridorSet() {
    const group = new THREE.Group();
    const wallMat = this.textures.getWallMaterial('corridor');
    const floorMat = this.textures.getFloorMaterial('corridor').clone();
    floorMat.map = floorMat.map.clone();
    floorMat.map.repeat.set(2, 11);
    floorMat.map.needsUpdate = true;

    const ceilMat = this.textures.getCeilingMaterial();
    const steelMat = this.textures.getMetalMaterial('#2a3036', 0.5, 0.72);

    const length = 30;
    const width = 4.6;
    const height = 3.4;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -length / 2 + 2);
    floor.receiveShadow = true;
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(width, length), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, height, -length / 2 + 2);
    group.add(ceil);

    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.25, height, length), wallMat);
    wallL.position.set(-width / 2, height / 2, -length / 2 + 2);
    wallL.receiveShadow = true;
    group.add(wallL);

    const wallR = wallL.clone();
    wallR.position.x = width / 2;
    group.add(wallR);

    // Compuerta blindada al fondo del pasillo
    const endDoor = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.3), this.textures.getDoorMaterial(true));
    endDoor.position.set(0, height / 2, -length + 2);
    group.add(endDoor);

    // Vigas, pilares y tubos fluorescentes parpadeantes
    this.corridorLights = [];
    for (let z = -1; z >= -25; z -= 6) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.24, 0.28), steelMat);
      beam.position.set(0, height - 0.12, z);
      group.add(beam);

      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe6cfa1 });
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.14), tubeMat);
      tube.position.set(0, height - 0.26, z - 2.5);
      group.add(tube);

      const pl = new THREE.PointLight(0xe6cfa1, 22, 16, 1.35);
      pl.position.set(0, height - 0.45, z - 2.5);
      group.add(pl);
      this.corridorLights.push({ pl, tubeMat, phase: Math.abs(z) * 1.7 });
    }

    // Luz roja de emergencia para la aparición de El Eco (Toma 2)
    this.emergencyLight = new THREE.PointLight(0xe6192a, 0, 20, 1.3);
    this.emergencyLight.position.set(0, 2.8, -16);
    group.add(this.emergencyLight);

    // Modelo 3D articulado de El Eco para la Toma 2
    this.monster = this.createTrailerMonster();
    this.monster.root.position.set(0, 0, -21);
    group.add(this.monster.root);

    this.scene.add(group);
  }

  createTrailerMonster() {
    const root = new THREE.Group();
    const flesh = new THREE.MeshStandardMaterial({ color: 0x3b252b, roughness: 0.62, metalness: 0.14 });
    const bone = new THREE.MeshStandardMaterial({ color: 0x80676a, roughness: 0.5, metalness: 0.18 });
    const vein = new THREE.MeshStandardMaterial({
      color: 0xd92232,
      emissive: new THREE.Color(0xff2b40),
      emissiveIntensity: 2.5,
    });

    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 1.08;
    root.add(torsoPivot);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.56, 8, 12), flesh);
    torso.position.y = 0.36;
    torso.rotation.x = 0.22;
    torsoPivot.add(torso);

    for (let i = 0; i < 4; i += 1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.026, 6, 12, Math.PI * 1.3), bone);
      rib.position.set(0, 0.22 + i * 0.14, 0.05);
      rib.rotation.x = Math.PI / 2 + 0.2;
      torsoPivot.add(rib);
    }

    const chestVein = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 8), vein);
    chestVein.position.set(0, 0.42, 0.22);
    torsoPivot.add(chestVein);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.9, 0.16);
    torsoPivot.add(headPivot);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), flesh);
    skull.scale.set(0.85, 1.38, 1.08);
    headPivot.add(skull);

    const slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.24, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffe4e6 })
    );
    slit.position.set(0, 0.02, 0.2);
    headPivot.add(slit);

    const makeLimb = (x, y, len, isArm) => {
      const p = new THREE.Group();
      p.position.set(x, y, 0.06);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(isArm ? 0.055 : 0.072, len, 6, 8), isArm ? bone : flesh);
      m.position.y = -len * 0.55;
      p.add(m);
      if (isArm) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 5), vein);
        claw.position.set(0, -len - 0.14, 0.08);
        claw.rotation.x = Math.PI - 0.3;
        p.add(claw);
      }
      return p;
    };

    const leftArm = makeLimb(-0.34, 0.68, 0.95, true);
    const rightArm = makeLimb(0.34, 0.68, 0.95, true);
    torsoPivot.add(leftArm, rightArm);

    const leftLeg = makeLimb(-0.18, 1.06, 0.96, false);
    const rightLeg = makeLimb(0.18, 1.06, 0.96, false);
    root.add(leftLeg, rightLeg);

    return { root, torsoPivot, headPivot, leftArm, rightArm, leftLeg, rightLeg };
  }

  buildCoreReactorSet() {
    const group = new THREE.Group();
    group.position.set(60, 0, 0);

    const steel = this.textures.getMetalMaterial('#22262c', 0.4, 0.78);
    const copper = this.textures.getMetalMaterial('#7a4e2b', 0.2, 0.82);

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.2, 28), this.textures.getFloorMaterial('core'));
    floor.position.y = -0.1;
    group.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 6.5, 24, 1, true),
      this.textures.getWallMaterial('core')
    );
    walls.material.side = THREE.BackSide;
    walls.position.y = 3.2;
    group.add(walls);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.65, 24), steel);
    pedestal.position.y = 0.32;
    group.add(pedestal);

    this.bioCoreMat = new THREE.MeshStandardMaterial({
      color: 0xa61422,
      emissive: new THREE.Color(0xe62034),
      emissiveIntensity: 2.6,
      roughness: 0.3,
    });
    this.bioCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), this.bioCoreMat);
    this.bioCore.position.y = 2.25;
    group.add(this.bioCore);

    this.coreRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.09, 12, 32), steel);
    this.coreRing1.position.y = 2.25;
    group.add(this.coreRing1);

    this.coreRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.07, 12, 32), copper);
    this.coreRing2.position.y = 2.25;
    this.coreRing2.rotation.x = Math.PI / 3;
    group.add(this.coreRing2);

    this.coreLight = new THREE.PointLight(0xff293e, 45, 22, 1.35);
    this.coreLight.position.set(0, 2.4, 0);
    group.add(this.coreLight);

    this.scene.add(group);
  }

  buildCellAwakeningSet() {
    const group = new THREE.Group();
    group.position.set(-60, 0, 0);

    const w = 8;
    const d = 8;
    const h = 3.3;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.textures.getFloorMaterial('cell'));
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.textures.getCeilingMaterial());
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    group.add(ceil);

    const wallMat = this.textures.getWallMaterial('cell');
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), wallMat);
    backWall.position.set(0, h / 2, -d / 2);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, d), wallMat);
    leftWall.position.set(-w / 2, h / 2, 0);
    group.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = w / 2;
    group.add(rightWall);

    // Puerta de salida de la Celda B-04
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.48, 0.14), this.textures.getDoorMaterial(false));
    door.position.set(1.4, 1.24, -d / 2 + 0.18);
    group.add(door);

    const led = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), new THREE.MeshBasicMaterial({ color: 0x4d9e6f }));
    led.position.set(1.4, 2.66, -d / 2 + 0.22);
    group.add(led);

    // Escritorio con el Memorando #14 clasificado
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.82, 0.75), this.textures.getWoodMaterial(true));
    desk.position.set(-1.3, 0.41, -1.6);
    group.add(desk);

    const doc = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.48), this.textures.getDocumentTexture());
    doc.position.set(-1.25, 0.84, -1.55);
    doc.rotation.y = 0.25;
    group.add(doc);

    // Nodo de Estabilización brillante verde
    const podCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 1.4, 14),
      this.textures.getMetalMaterial('#2d333b', 0.3, 0.72)
    );
    podCol.position.set(-2.9, 0.7, -2.5);
    group.add(podCol);

    this.cellPodRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.05, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0x4d9e6f, emissive: new THREE.Color(0x4d9e6f), emissiveIntensity: 2 })
    );
    this.cellPodRing.position.set(-2.9, 1.62, -2.5);
    group.add(this.cellPodRing);

    const podLight = new THREE.PointLight(0x4d9e6f, 16, 10, 1.4);
    podLight.position.set(-2.9, 1.7, -2.3);
    group.add(podLight);

    // Linterna cinematográfica barriendo la celda
    this.cellSpot = new THREE.SpotLight(0xfff1d6, 52, 22, Math.PI * 0.26, 0.65, 1.2);
    this.cellSpot.position.set(-0.2, 1.55, 2.4);
    this.cellSpotTarget = new THREE.Object3D();
    this.cellSpotTarget.position.set(-1.2, 0.9, -1.6);
    group.add(this.cellSpot, this.cellSpotTarget);
    this.cellSpot.target = this.cellSpotTarget;

    this.scene.add(group);
  }

  buildDust() {
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = 0.2 + Math.random() * 3.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xded5c2, size: 0.036, transparent: true, opacity: 0.35 })
    );
    this.scene.add(this.dust);
  }

  setPaused(p) {
    this.paused = Boolean(p);
  }

  seek(seconds) {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, seconds));
  }

  loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (!this.paused) {
      this.currentTime = Math.min(this.totalDuration, this.currentTime + dt);
    }

    const t = this.currentTime;

    // Animar luces del pasillo
    this.corridorLights.forEach((l) => {
      const wave = Math.sin(t * 9 + l.phase) * Math.sin(t * 23 + l.phase);
      const flick = wave > 0.78 ? 0.1 : 0.85 + wave * 0.15;
      l.pl.intensity = 22 * flick;
      l.tubeMat.color.setHex(0xe6cfa1).multiplyScalar(0.35 + 0.65 * flick);
    });

    // Animar Reactor del Núcleo
    this.coreRing1.rotation.y = t * 0.7;
    this.coreRing1.rotation.x = Math.sin(t * 0.9) * 0.4;
    this.coreRing2.rotation.z = -t * 0.85;
    this.bioCore.scale.setScalar(1 + Math.sin(t * 3.5) * 0.07);
    this.coreLight.intensity = 38 + Math.sin(t * 3.5) * 14;

    // Animar Nodo de Celda B-04
    this.cellPodRing.rotation.y = t * 1.4;

    // === COREOGRAFÍA DE LAS 5 TOMAS DE CÁMARA 3D ===
    if (t < 6.5) {
      // TOMA 1 (0 - 6.5s): Travelling cinematográfico por el Pasillo Central
      const p = t / 6.5;
      this.scene.fog.color.setHex(0x030406);
      this.scene.fog.density = 0.062;
      this.emergencyLight.intensity = 0;
      this.monster.root.visible = false;

      this.camera.position.set(Math.sin(t * 0.6) * 0.28, 1.35 + Math.sin(t * 1.4) * 0.04, 1.2 - p * 11.5);
      this.camera.lookAt(0, 1.45, -24);
      this.dust.position.set(0, 0, this.camera.position.z - 4);
    } else if (t < 13.5) {
      // TOMA 2 (6.5 - 13.5s): El Eco 3D avanza hacia la cámara bajo luz roja estroboscópica
      const local = t - 6.5;
      const p = local / 7.0;
      this.scene.fog.color.setHex(0x0b0204);
      this.scene.fog.density = 0.075;
      this.monster.root.visible = true;

      // Estrobo rojo dramático
      const strobe = Math.sin(local * 14) > -0.2 ? 55 : 6;
      this.emergencyLight.intensity = strobe;

      // El Eco camina hacia la cámara
      const mz = -20.5 + p * 6.5;
      this.monster.root.position.set(0, 0, mz);
      const swing = Math.sin(local * 7.5);
      this.monster.leftLeg.rotation.x = swing * 0.55;
      this.monster.rightLeg.rotation.x = -swing * 0.55;
      this.monster.leftArm.rotation.x = -swing * 0.5 - 0.5;
      this.monster.rightArm.rotation.x = swing * 0.5 - 0.5;
      this.monster.headPivot.rotation.z = Math.sin(local * 16) * 0.28;

      // Cámara retrocede temblando levemente
      const shake = (Math.random() - 0.5) * 0.025;
      this.camera.position.set(shake, 1.48 + shake, -10.5 + p * 2.1);
      this.camera.lookAt(0, 1.55, mz);
      this.dust.position.set(0, 0, mz + 2);
    } else if (t < 20.0) {
      // TOMA 3 (13.5 - 20s): Órbita 3D sobre el Reactor Bioeléctrico del Núcleo 09
      const local = t - 13.5;
      this.scene.fog.color.setHex(0x080204);
      this.scene.fog.density = 0.055;
      const angle = local * 0.36;
      const radius = 5.4 - (local / 6.5) * 1.1;
      this.camera.position.set(60 + Math.cos(angle) * radius, 2.0 + Math.sin(local * 0.5) * 0.4, Math.sin(angle) * radius);
      this.camera.lookAt(60, 2.2, 0);
      this.dust.position.set(60, 0, 0);
    } else if (t < 27.5) {
      // TOMA 4 (20 - 27.5s): Despertar en Celda B-04 + barrido de linterna hacia documento y puerta
      const local = t - 20.0;
      const p = local / 7.5;
      this.scene.fog.color.setHex(0x040608);
      this.scene.fog.density = 0.05;

      // La cámara se levanta lentamente (despertando) y gira del documento a la puerta
      const camY = THREE.MathUtils.lerp(0.85, 1.66, Math.min(1, p * 1.4));
      this.camera.position.set(-60 - 0.2 + p * 0.5, camY, 2.6 - p * 1.2);
      const lookX = THREE.MathUtils.lerp(-61.5, -58.7, p);
      const lookY = THREE.MathUtils.lerp(0.95, 1.45, p);
      this.camera.lookAt(lookX, lookY, -2.8);

      // La linterna barre junto a la mirada
      this.cellSpot.position.set(this.camera.position.x + 60, camY - 0.1, this.camera.position.z);
      this.cellSpotTarget.position.set(lookX + 60, lookY - 0.1, -2.8);
      this.dust.position.set(-60, 0, 0);
    } else {
      // TOMA 5 (27.5 - 32s): Plano final de título en el pasillo oscuro
      const local = t - 27.5;
      this.scene.fog.color.setHex(0x030406);
      this.scene.fog.density = 0.072;
      this.monster.root.visible = false;
      this.emergencyLight.intensity = 10 + Math.sin(local * 6) * 6;
      this.camera.position.set(0, 1.6, -4 - local * 0.45);
      this.camera.lookAt(0, 1.5, -24);
      this.dust.position.set(0, 0, -10);
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
