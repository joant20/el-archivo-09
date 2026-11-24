import * as THREE from 'three';
import { ENEMY_SPAWNS } from '../data/roomsData.js';
import { INVESTIGATION_CATALOG } from '../data/investigationData.js';
import { PBRTextureFactory } from './PBRTextureFactory.js';
import { CollisionSystem3D } from './CollisionSystem3D.js';
import { FacilityBuilder3D } from './FacilityBuilder3D.js';
import { LightingAtmosphere3D } from './LightingAtmosphere3D.js';
import { HorrorDirector3D } from './HorrorDirector3D.js';
import { worldToPx } from './scale3d.js';
import { FirstPersonController } from '../player/FirstPersonController.js';
import { EchoStalker3D } from '../enemies/EchoStalker3D.js';
import { StaticShadow3D } from '../enemies/StaticShadow3D.js';
import { saveStateManager } from '../save-system/SaveStateManager.js';
import { investigationManager } from '../investigation/InvestigationManager.js';
import { soundEngine } from '../audio/SoundEngine.js';
import { eventBus } from '../game/EventBus.js';

/**
 * Motor Principal 3D en Primera Persona de EL ARCHIVO 09 (Three.js WebGL2).
 * Conecta las 8 habitaciones modeladas, iluminación dinámica, raycast desde la mira central,
 * criaturas 3D articuladas, escondites y toda la persistencia de Capas A / B / C en MySQL.
 */
export class FacilityWorld3D {
  constructor(container) {
    this.container = container;
    this.isPausedByUI = false;
    this.isDead = false;
    this.disposed = false;
    this.currentRoomKey = null;
    this.playSecondsAccum = 0;
    this.lastHudEmit = 0;
    this.lastSurvivalSync = 0;
    this.currentTarget = null;
    this.unsubscribers = [];

    // 1. Renderizador WebGL2 cinematográfico con mapas de sombra suaves y ACES tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // 2. Escena y Cámara en Primera Persona
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.08,
      46
    );

    // 3. Sistemas 3D
    const saveState = saveStateManager.getState();
    this.textures = new PBRTextureFactory();
    this.collision = new CollisionSystem3D();
    this.builder = new FacilityBuilder3D(this.scene, this.textures, this.collision);
    this.builder.build();

    this.atmosphere = new LightingAtmosphere3D(this.scene, this.collision);
    this.horrorDirector = new HorrorDirector3D(this.scene, this.collision, this.atmosphere);

    this.player = new FirstPersonController(
      this.camera,
      this.scene,
      this.renderer.domElement,
      this.collision,
      saveState?.survival
    );
    this.player.onPointerLockChange = (locked) => {
      eventBus.emit('fps:pointerLock', locked);
    };

    // 4. Criaturas 3D articuladas
    this.enemies = ENEMY_SPAWNS.map((cfg) =>
      cfg.type === 'echo_stalker'
        ? new EchoStalker3D(this.scene, this.collision, cfg)
        : new StaticShadow3D(this.scene, this.collision, cfg)
    );

    // 5. Raycaster 3D desde la retícula central de pantalla
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.9;
    this.screenCenter = new THREE.Vector2(0, 0);

    // 6. Aplicar desbloqueos permanentes ya existentes en MySQL
    this.applyPermanentUnlocks();

    // 7. Eventos de teclado, ratón y comunicación con React
    this.bindEvents();

    // 8. Arrancar bucle 3D a 60 FPS
    this.clock = new THREE.Clock();
    this.rafId = requestAnimationFrame(this.loop);
  }

  bindEvents() {
    this._onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    this._onCanvasClick = () => {
      soundEngine.init();
      if (!this.isPausedByUI && !this.isDead) {
        this.player.requestPointerLock();
      }
    };

    this._onKeyDown = (e) => {
      if (this.isPausedByUI || this.isDead) return;
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'KeyE') {
        soundEngine.init();
        this.handleInteract();
      } else if (e.code === 'KeyF') {
        soundEngine.init();
        this.player.toggleFlashlight();
      } else if (e.code === 'KeyQ') {
        soundEngine.init();
        this.throwFlare();
      }
    };

    window.addEventListener('resize', this._onResize);
    this.renderer.domElement.addEventListener('click', this._onCanvasClick);
    window.addEventListener('keydown', this._onKeyDown);

    this.unsubscribers.push(
      eventBus.on('game:setPaused', (paused) => {
        this.isPausedByUI = Boolean(paused);
        if (this.isPausedByUI) {
          this.player.exitPointerLock();
        }
      }),
      eventBus.on('fps:requestLock', () => {
        soundEngine.init();
        if (!this.isPausedByUI && !this.isDead) {
          this.player.requestPointerLock();
        }
      }),
      eventBus.on('fps:setSensitivity', (sens) => {
        this.player.setSensitivity(sens);
      }),
      eventBus.on('inventory:useConsumable', (itemKey) => {
        this.useConsumable(itemKey);
      }),
      eventBus.on('save:updated', () => {
        this.applyPermanentUnlocks();
      }),
      eventBus.on('game:respawnFromCheckpoint', () => {
        this.respawnAtCheckpoint();
      })
    );
  }

  applyPermanentUnlocks() {
    const powerSolved = saveStateManager.isPuzzleSolved('puzzle_generadores');
    this.atmosphere.setPowerRestored(powerSolved);

    if (saveStateManager.isPuzzleSolved('puzzle_terminal_seguridad')) {
      this.builder.unlockDoor('door_archivo');
    }
    if (saveStateManager.hasKeyItem('tarjeta_nivel_2')) {
      this.builder.unlockDoor('door_vance');
    }
    if (saveStateManager.isPuzzleSolved('puzzle_core_seal')) {
      this.builder.unlockDoor('door_nucleo');
    }
  }

  updateCrosshairTarget() {
    if (this.player.isHiding) {
      const next = { label: 'Salir del casillero', action: 'Salir' };
      if (this.currentTarget?.label !== next.label) {
        this.currentTarget = { isExitLocker: true, ...next };
        eventBus.emit('hud:crosshairTarget', next);
      }
      return;
    }

    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const hits = this.raycaster.intersectObjects(this.builder.interactableMeshes, false);

    let found = null;
    for (let i = 0; i < hits.length; i += 1) {
      const hit = hits[i];
      const meta = hit.object.userData.interactable;
      if (!meta) continue;
      if (meta.id) {
        const obj = this.builder.interactableObjects.get(meta.id);
        if (obj && !obj.active) continue;
      }
      found = { meta, object: hit.object, distance: hit.distance };
      break;
    }

    if (found) {
      const { meta } = found;
      let action = 'Inspeccionar';
      if (meta.type === 'door') {
        const door = this.builder.doors.get(meta.doorId);
        action = door?.isLocked ? 'Sellada' : door?.isOpen ? 'Cerrar' : 'Abrir';
      } else if (meta.type === 'locker') {
        action = 'Esconderse';
      } else if (meta.type === 'consumable') {
        action = 'Recoger';
      } else if (meta.type === 'checkpoint') {
        action = 'Estabilizar Nodo';
      } else if (meta.type === 'puzzle' || meta.type === 'ending_console') {
        action = 'Operar';
      }

      if (this.currentTarget?.label !== meta.label || this.currentTarget?.action !== action) {
        this.currentTarget = { ...found, label: meta.label, action };
        eventBus.emit('hud:crosshairTarget', { label: meta.label, action });
      }
    } else if (this.currentTarget !== null) {
      this.currentTarget = null;
      eventBus.emit('hud:crosshairTarget', null);
    }
  }

  async handleInteract() {
    if (this.player.isHiding) {
      this.player.toggleLockerHide(null);
      return;
    }

    if (!this.currentTarget || !this.currentTarget.meta) return;
    const { meta } = this.currentTarget;

    // 1. Puertas físicas 3D
    if (meta.type === 'door') {
      const res = this.builder.toggleDoor(meta.doorId);
      if (!res.ok) {
        soundEngine.playError();
        eventBus.emit('ui:toast', {
          kind: 'warning',
          title: res.door.def.label.toUpperCase(),
          message: res.door.def.lockedBy?.hint || 'Compuerta sellada.',
        });
        if (meta.doorId === 'door_nucleo') {
          const clue = INVESTIGATION_CATALOG.clue_sello_nucleo;
          await saveStateManager.recordDiscovery({
            entryKey: clue.entryKey,
            category: 'clue',
            title: clue.title,
            description: clue.description,
            locationRoom: clue.locationRoom,
            isResolved: false,
          });
        }
      } else {
        soundEngine.playDoorCreak(res.isOpen);
      }
      return;
    }

    const obj = this.builder.interactableObjects.get(meta.id);
    if (!obj || !obj.active) return;
    const { def } = obj;

    // 2. Escondite en casillero 3D (vista desde dentro hacia afuera)
    if (def.type === 'locker') {
      const lookOutYaw = Math.atan2(
        this.player.position.x - obj.x,
        this.player.position.z - obj.z
      );
      this.player.toggleLockerHide({
        insidePos: { x: obj.x, z: obj.z },
        lookOutYaw,
      });
      return;
    }

    // 3. Documentos, fotografías y grabaciones (Capa A)
    if (def.type === 'investigation') {
      await investigationManager.discoverByKey(def.entryKey);
      this.player.exitPointerLock();
      eventBus.emit('ui:openDossierEntry', def.entryKey);
      return;
    }

    // 4. Enigmas interactivos
    if (def.type === 'puzzle') {
      this.player.exitPointerLock();
      eventBus.emit('ui:openPuzzle', def.puzzleKey);
      return;
    }

    // 5. Consola final del Núcleo 09
    if (def.type === 'ending_console') {
      this.player.exitPointerLock();
      eventBus.emit('ui:openEndingChoice', {
        playTimeSeconds: Math.round(this.playSecondsAccum),
      });
      return;
    }

    // 6. Checkpoints (Nodos de Estabilización - Capa C)
    if (def.type === 'checkpoint') {
      if (def.requiresPower && !saveStateManager.isPuzzleSolved('puzzle_generadores')) {
        soundEngine.playError();
        eventBus.emit('ui:toast', {
          kind: 'warning',
          title: 'NODO SIN ENERGÍA',
          message: 'Restaura los 120V en la Sala de Generadores para activar el Nodo de Enfermería.',
        });
        return;
      }

      const currentSave = saveStateManager.getState();
      const snap = this.player.getStateSnapshot();
      const pxCoords = worldToPx(snap.wx, snap.wz);

      await saveStateManager.activateCheckpoint({
        checkpointKey: def.checkpointKey,
        roomKey: def.roomKey,
        posX: pxCoords.x,
        posY: pxCoords.y,
        hp: Math.max(snap.hp, 85),
        sanity: Math.max(snap.sanity, 85),
        battery: Math.max(snap.battery, 65),
        consumables: currentSave?.survival?.consumables || { medkit: 1, battery: 1, flare: 2 },
        keyItems: currentSave?.survival?.keyItems || [],
      });

      this.player.heal(25);
      soundEngine.playCheckpoint();
      eventBus.emit('ui:toast', {
        kind: 'success',
        title: 'PUNTO DE CONTROL ESTABILIZADO',
        message: `${def.label} guardado en MySQL.`,
      });
      return;
    }

    // 7. Consumibles temporales (Capa B)
    if (def.type === 'consumable') {
      obj.active = false;
      obj.group.visible = false;

      const current = saveStateManager.getState()?.survival?.consumables || {};
      const nextConsumables = {
        ...current,
        [def.itemKind]: (current[def.itemKind] || 0) + (def.amount || 1),
      };
      await saveStateManager.syncSurvival({ consumables: nextConsumables });
      soundEngine.playDiscovery();
      eventBus.emit('ui:toast', {
        kind: 'info',
        title: 'SUMINISTRO RECOGIDO',
        message: `+${def.amount || 1} ${def.label}.`,
      });
    }
  }

  async useConsumable(itemKey) {
    if (this.isDead) return;
    const current = saveStateManager.getState()?.survival?.consumables || {};
    const qty = current[itemKey] || 0;
    if (qty <= 0) {
      soundEngine.playError();
      return;
    }

    if (itemKey === 'medkit') {
      this.player.heal(45);
      soundEngine.playCheckpoint();
      eventBus.emit('ui:toast', {
        kind: 'success',
        title: 'BOTIQUÍN APLICADO',
        message: 'Salud (+45) y cordura (+15) estabilizadas.',
      });
    } else if (itemKey === 'battery') {
      this.player.rechargeBattery(60);
      soundEngine.playFlashlightClick();
      eventBus.emit('ui:toast', {
        kind: 'success',
        title: 'BATERÍA REEMPLAZADA',
        message: 'Linterna recargada (+60%).',
      });
    } else if (itemKey === 'flare') {
      this.throwFlare();
      return;
    }

    const nextConsumables = { ...current, [itemKey]: qty - 1 };
    const snap = this.player.getStateSnapshot();
    await saveStateManager.syncSurvival({
      hp: snap.hp,
      sanity: snap.sanity,
      battery: snap.battery,
      consumables: nextConsumables,
    });
  }

  async throwFlare() {
    if (this.player.isHiding) return;
    const current = saveStateManager.getState()?.survival?.consumables || {};
    if ((current.flare || 0) <= 0) {
      soundEngine.playError();
      eventBus.emit('ui:toast', {
        kind: 'warning',
        title: 'SIN BENGALAS',
        message: 'No te quedan bengalas de distracción.',
      });
      return;
    }

    const forward = this.player.getForwardDirection();
    const origin = this.camera.position.clone().addScaledVector(forward, 0.45);
    this.atmosphere.spawnFlare(origin, forward, 13);
    soundEngine.playDoorUnlock();

    const attractX = origin.x + forward.x * 4;
    const attractZ = origin.z + forward.z * 4;
    this.enemies.forEach((e) => {
      if (e.attractToSound) e.attractToSound(attractX, attractZ);
    });

    const nextConsumables = { ...current, flare: current.flare - 1 };
    await saveStateManager.syncSurvival({ consumables: nextConsumables });
    eventBus.emit('ui:toast', {
      kind: 'info',
      title: 'BENGALA LANZADA',
      message: 'Ilumina el corredor y atrae a las criaturas cercanas.',
    });
  }

  async triggerDeath(cause, enemyType) {
    if (this.isDead) return;
    this.isDead = true;
    this.player.triggerDeathAnimation();
    soundEngine.playDeathSequence();

    const room = this.builder.getRoomAtWorld(this.player.position.x, this.player.position.z);
    const locationRoom = room?.name || 'Corredor Subterráneo';

    try {
      const updatedSave = await saveStateManager.triggerDeath({
        cause,
        enemyType,
        locationRoom,
      });
      setTimeout(() => {
        if (!this.disposed) {
          eventBus.emit('game:playerDied', {
            cause,
            enemyType,
            locationRoom,
            save: updatedSave,
          });
        }
      }, 950);
    } catch (error) {
      console.error('[FacilityWorld3D] Error registrando muerte:', error);
      eventBus.emit('game:playerDied', {
        cause,
        enemyType,
        locationRoom,
        save: saveStateManager.getState(),
      });
    }
  }

  respawnAtCheckpoint() {
    const save = saveStateManager.getState();
    this.isDead = false;
    this.isPausedByUI = false;
    this.player.applySurvivalState(save?.survival);
    this.enemies.forEach((e) => e.resetToHome());
    this.builder.interactableObjects.forEach((obj) => {
      if (obj.def.type === 'consumable') {
        obj.active = true;
        obj.group.visible = true;
      }
    });
    this.applyPermanentUnlocks();
    soundEngine.playCheckpoint();
  }

  loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const dt = Math.min(0.05, this.clock.getDelta());
    const timeSec = this.clock.elapsedTime;
    const now = performance.now();

    if (!this.isPausedByUI && !this.isDead) {
      this.playSecondsAccum += dt;
    }

    this.player.update(dt, timeSec, this.isPausedByUI);
    this.builder.update(dt, timeSec);
    this.atmosphere.update(dt, timeSec, this.player.position);
    this.horrorDirector.update(dt, timeSec, this.player, this.isPausedByUI || this.isDead);

    const snap = this.player.getStateSnapshot();

    // Detectar habitación actual (Capa A)
    const room = this.builder.getRoomAtWorld(snap.wx, snap.wz);
    if (room && room.key !== this.currentRoomKey) {
      this.currentRoomKey = room.key;
      saveStateManager.recordRoomVisit(room.key, room.name).catch(() => {});
      eventBus.emit('hud:roomChanged', { roomKey: room.key, roomName: room.name });
    }

    // Raycast desde la mira central
    if (!this.isPausedByUI && !this.isDead) {
      this.updateCrosshairTarget();
    }

    // Actualizar criaturas 3D
    let maxDanger = 0;
    if (!this.isPausedByUI && !this.isDead) {
      for (const enemy of this.enemies) {
        const res =
          enemy instanceof EchoStalker3D
            ? enemy.update(dt, timeSec, this.player, this.atmosphere.flares)
            : enemy.update(dt, timeSec, this.player);

        if (res.danger > maxDanger) maxDanger = res.danger;
        if (res.attacked) {
          const hurt = this.player.takeDamage(res.damage);
          if (hurt && this.player.hp <= 0) {
            this.triggerDeath(res.cause, res.enemyType);
            break;
          }
        }
      }
    }

    soundEngine.setRoomAmbience(room?.droneFreq || 48, maxDanger);
    soundEngine.updateHeartbeat(maxDanger);

    // Enviar snapshot discreto al HUD
    if (now - this.lastHudEmit > 110) {
      this.lastHudEmit = now;
      eventBus.emit('hud:stats', {
        ...snap,
        danger: maxDanger,
        roomName: room?.name || 'Corredor Subterráneo',
        roomKey: room?.key || 'pasillo_central',
      });
    }

    // Sincronización periódica ligera de Capa B hacia MySQL
    if (!this.isPausedByUI && !this.isDead && now - this.lastSurvivalSync > 8000) {
      this.lastSurvivalSync = now;
      const pxCoords = worldToPx(snap.wx, snap.wz);
      saveStateManager
        .syncSurvival({
          roomKey: room?.key || 'pasillo_central',
          posX: pxCoords.x,
          posY: pxCoords.y,
          hp: snap.hp,
          sanity: snap.sanity,
          stamina: snap.stamina,
          battery: snap.battery,
        })
        .catch(() => {});
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('click', this._onCanvasClick);
    }
    this.unsubscribers.forEach((off) => off());
    this.player.exitPointerLock();
    this.player.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
