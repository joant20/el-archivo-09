import * as THREE from 'three';
import {
  EYE_HEIGHT_STAND,
  EYE_HEIGHT_CROUCH,
  PLAYER_RADIUS,
  pxToWorld,
} from '../engine3d/scale3d.js';
import { soundEngine } from '../audio/SoundEngine.js';

/**
 * Controlador de Primera Persona (FPS) estilo Resident Evil 7 / Amnesia:
 * - Pointer Lock con mirada libre de 360° y control de sensibilidad.
 * - Movimiento WASD relativo a la orientación, agachado suave y carrera con head-bob.
 * - Linterna 3D física en mano con SpotLight de sombras dinámicas e inercia natural.
 * - Escondite en primera persona dentro de casilleros mirando por las rejillas.
 */
export class FirstPersonController {
  constructor(camera, scene, domElement, collisionSystem, initialSurvival) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.collision = collisionSystem;

    // Estado de supervivencia (Capa B)
    const start = pxToWorld(initialSurvival?.pos_x || 220, initialSurvival?.pos_y || 210);
    this.position = new THREE.Vector3(start.x, EYE_HEIGHT_STAND, start.z);
    this.yaw = -Math.PI * 0.42; // Ángulo cinematográfico hacia escritorio, documento y puerta
    this.pitch = -0.05;
    this.sensitivity = 0.0021;
    this.isDraggingLook = false;

    this.hp = initialSurvival?.hp ?? 100;
    this.sanity = initialSurvival?.sanity ?? 100;
    this.stamina = initialSurvival?.stamina ?? 100;
    this.battery = initialSurvival?.battery ?? 100;

    this.flashlightOn = true;
    this.isHiding = false;
    this.lockerReturnPos = null;
    this.lockerBaseYaw = 0;
    this.isStealth = false;
    this.isRunning = false;
    this.isDead = false;
    this.deathAnimT = 0;
    this.noiseRadius = 0;
    this.invulnerableUntil = 0;

    this.currentEyeHeight = EYE_HEIGHT_STAND;
    this.headBobPhase = 0;
    this.stepTimer = 0;
    this.shakeIntensity = 0;

    this.keys = new Set();
    this.isLocked = false;
    this.onPointerLockChange = null;

    // === Linterna 3D física con sombras reales e inercia ===
    this.flashlightPivot = new THREE.Object3D();
    this.flashlightPivot.position.copy(this.position);
    scene.add(this.flashlightPivot);

    // Foco principal calibrado para luces físicas Three.js r172 (sombras suaves 3D en tiempo real)
    this.spotLight = new THREE.SpotLight(0xfff1d6, 46, 28, Math.PI * 0.28, 0.65, 1.22);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.25;
    this.spotLight.shadow.camera.far = 28;
    this.spotLight.shadow.bias = -0.0005;
    this.spotLight.position.set(0.22, -0.18, -0.18);

    this.spotTarget = new THREE.Object3D();
    this.spotTarget.position.set(0.02, -0.1, -10);
    this.flashlightPivot.add(this.spotLight);
    this.flashlightPivot.add(this.spotTarget);
    this.spotLight.target = this.spotTarget;

    // Luz de rebote difusa cercana (simula rebote ambiental de la linterna en paredes próximas)
    this.fillLight = new THREE.PointLight(0x9fb2c7, 4.2, 8.5, 1.45);
    this.fillLight.position.set(0, -0.05, -0.35);
    this.flashlightPivot.add(this.fillLight);

    // Cuerpo 3D visible de la linterna en primer plano inferior derecho
    this.buildFlashlightMesh();

    // Cuaternión objetivo para inercia suave de mano
    this.cameraQuat = new THREE.Quaternion();
    this.flashlightQuat = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.bindEvents();
  }

  buildFlashlightMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1d2126,
      roughness: 0.45,
      metalness: 0.78,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4943a,
      roughness: 0.35,
      metalness: 0.8,
    });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff5dc });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.26, 14), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.07, 14), bodyMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.15;
    group.add(head);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.012, 14), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -0.13;
    group.add(ring);

    this.lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), lensMat);
    this.lensMesh.position.z = -0.186;
    this.lensMesh.rotation.y = Math.PI;
    group.add(this.lensMesh);

    group.position.set(0.28, -0.25, -0.44);
    group.rotation.y = 0.08;
    group.rotation.x = 0.04;
    this.flashlightMesh = group;
    this.flashlightPivot.add(group);
  }

  bindEvents() {
    this._onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this._onMouseDown = (e) => {
      if (e.target === this.domElement) {
        this.isDraggingLook = true;
      }
    };
    this._onMouseUp = () => {
      this.isDraggingLook = false;
    };
    this._onMouseMove = (e) => {
      if ((!this.isLocked && !this.isDraggingLook) || this.isDead) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      this.yaw -= dx * this.sensitivity;
      this.pitch -= dy * this.sensitivity;

      // Limitar rotación vertical para evitar volteo
      const maxPitch = Math.PI * 0.43;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      // Si está escondido en un casillero, limitar giro lateral para mirar por las rejillas
      if (this.isHiding) {
        const diff = this.yaw - this.lockerBaseYaw;
        const clamped = Math.max(-0.55, Math.min(0.55, diff));
        this.yaw = this.lockerBaseYaw + clamped;
      }
    };
    this._onPointerLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) {
        this.keys.clear();
      }
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isLocked);
      }
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }

  requestPointerLock() {
    if (this.domElement && document.pointerLockElement !== this.domElement) {
      try {
        const p = this.domElement.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch {
        // Ignorar si el navegador requiere gesto directo
      }
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignorar
      }
    }
  }

  setSensitivity(value) {
    this.sensitivity = Math.max(0.0007, Math.min(0.005, value));
  }

  applySurvivalState(survival) {
    if (!survival) return;
    const pos = pxToWorld(survival.pos_x, survival.pos_y);
    this.position.set(pos.x, EYE_HEIGHT_STAND, pos.z);
    this.hp = survival.hp;
    this.sanity = survival.sanity;
    this.stamina = survival.stamina ?? 100;
    this.battery = survival.battery;
    this.isHiding = false;
    this.isDead = false;
    this.deathAnimT = 0;
    this.pitch = 0;
    this.flashlightOn = this.battery > 0;
    this.flashlightMesh.visible = true;
    this.invulnerableUntil = performance.now() + 2400;
  }

  toggleFlashlight() {
    if (this.isHiding || this.isDead) return;
    if (!this.flashlightOn && this.battery <= 0) {
      soundEngine.playError();
      return;
    }
    this.flashlightOn = !this.flashlightOn;
    soundEngine.playFlashlightClick();
  }

  toggleLockerHide(lockerData) {
    if (this.isHiding) {
      this.isHiding = false;
      if (this.lockerReturnPos) {
        this.position.x = this.lockerReturnPos.x;
        this.position.z = this.lockerReturnPos.z;
      }
      this.flashlightMesh.visible = true;
      if (this.battery > 0) this.flashlightOn = true;
      soundEngine.playDoorUnlock();
      return false;
    }

    this.isHiding = true;
    this.lockerReturnPos = { x: this.position.x, z: this.position.z };
    this.position.x = lockerData.insidePos.x;
    this.position.z = lockerData.insidePos.z;
    this.lockerBaseYaw = lockerData.lookOutYaw;
    this.yaw = lockerData.lookOutYaw;
    this.pitch = 0;
    this.flashlightOn = false;
    this.flashlightMesh.visible = false;
    this.noiseRadius = 0;
    soundEngine.playDoorUnlock();
    return true;
  }

  takeDamage(amount) {
    const now = performance.now();
    if (now < this.invulnerableUntil || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = now + 1200;
    this.shakeIntensity = 0.085;
    soundEngine.playDamage();
    return true;
  }

  triggerDeathAnimation() {
    this.isDead = true;
    this.deathAnimT = 0;
    this.flashlightOn = false;
    this.exitPointerLock();
  }

  drainSanity(amount) {
    this.sanity = Math.max(0, this.sanity - amount);
  }

  heal(amount) {
    this.hp = Math.min(100, this.hp + amount);
    this.sanity = Math.min(100, this.sanity + 15);
  }

  rechargeBattery(amount) {
    this.battery = Math.min(100, this.battery + amount);
  }

  getForwardDirection(out = new THREE.Vector3()) {
    this.camera.getWorldDirection(out);
    return out;
  }

  update(dt, timeSec, isPaused) {
    // Animación visceral de caída al suelo al morir
    if (this.isDead) {
      this.deathAnimT = Math.min(1, this.deathAnimT + dt * 1.6);
      const y = THREE.MathUtils.lerp(this.currentEyeHeight, 0.28, this.deathAnimT);
      this.camera.position.set(this.position.x, y, this.position.z);
      this.euler.set(this.pitch - this.deathAnimT * 0.45, this.yaw, this.deathAnimT * 0.85, 'YXZ');
      this.camera.quaternion.setFromEuler(this.euler);
      this.spotLight.intensity = 0;
      return;
    }

    if (isPaused) {
      this.noiseRadius = 0;
      return;
    }

    // 1. Movimiento horizontal WASD respecto a hacia dónde mira la cámara
    let moveF = 0;
    let moveR = 0;
    if (!this.isHiding) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveF += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveF -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveR += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveR -= 1;
    }

    const moving = moveF !== 0 || moveR !== 0;
    this.isStealth = !this.isHiding && (this.keys.has('KeyC') || this.keys.has('ControlLeft') || this.keys.has('ControlRight'));
    this.isRunning =
      moving &&
      !this.isStealth &&
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.stamina > 6;

    const targetEye = this.isStealth ? EYE_HEIGHT_CROUCH : EYE_HEIGHT_STAND;
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, targetEye, Math.min(1, dt * 9));

    let speed = 3.15;
    if (this.isStealth) speed = 1.65;
    else if (this.isRunning) speed = 5.15;

    if (moving) {
      const len = Math.hypot(moveF, moveR);
      const nf = moveF / len;
      const nr = moveR / len;

      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      const nextX = this.position.x + (forwardX * nf + rightX * nr) * speed * dt;
      const nextZ = this.position.z + (forwardZ * nf + rightZ * nr) * speed * dt;

      const resolved = this.collision.resolveMovement(nextX, nextZ, PLAYER_RADIUS);
      this.position.x = resolved.x;
      this.position.z = resolved.z;

      // Head-bob natural al caminar/correr
      const bobFreq = this.isRunning ? 12.5 : this.isStealth ? 5.5 : 8.5;
      this.headBobPhase += dt * bobFreq;

      if (this.isRunning) {
        this.stamina = Math.max(0, this.stamina - 26 * dt);
        this.noiseRadius = 11.5;
      } else if (this.isStealth) {
        this.stamina = Math.min(100, this.stamina + 11 * dt);
        this.noiseRadius = 1.4;
      } else {
        this.stamina = Math.min(100, this.stamina + 12 * dt);
        this.noiseRadius = 4.8;
      }

      this.stepTimer += dt;
      const stepInterval = this.isRunning ? 0.3 : this.isStealth ? 0.62 : 0.45;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        soundEngine.playFootstep(this.isRunning);
      }
    } else {
      this.stamina = Math.min(100, this.stamina + 20 * dt);
      this.noiseRadius = 0;
    }

    // 2. FOV dinámico sutil al correr o sufrir pérdida de cordura
    const targetFov = this.isRunning ? 74 : this.sanity < 40 ? 64 : 68;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    }

    // 3. Posición y rotación final de cámara (con head-bob y temblor por daño)
    const bobAmp = moving ? (this.isRunning ? 0.065 : this.isStealth ? 0.018 : 0.036) : 0.004;
    const bobY = Math.sin(this.headBobPhase) * bobAmp;
    const bobX = Math.cos(this.headBobPhase * 0.5) * bobAmp * 0.5;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 0.25);
    }

    this.camera.position.set(
      this.position.x + bobX + shakeX,
      this.currentEyeHeight + bobY + shakeY,
      this.position.z
    );

    this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.cameraQuat.setFromEuler(this.euler);
    this.camera.quaternion.copy(this.cameraQuat);

    // 4. Inercia orgánica de la linterna 3D + batería
    this.flashlightPivot.position.copy(this.camera.position);
    this.flashlightQuat.slerp(this.cameraQuat, Math.min(1, dt * 13));
    this.flashlightPivot.quaternion.copy(this.flashlightQuat);

    if (this.flashlightOn && this.battery > 0 && !this.isHiding) {
      this.battery = Math.max(0, this.battery - 0.85 * dt);
      if (this.battery <= 0) {
        this.flashlightOn = false;
        soundEngine.playFlashlightClick();
      }
      const lowFlicker =
        this.battery < 18 && Math.sin(timeSec * 29) * Math.sin(timeSec * 13) > 0.55 ? 0.18 : 1;
      const batteryFactor = 0.6 + (this.battery / 100) * 0.4;
      this.spotLight.intensity = 46 * batteryFactor * lowFlicker;
      this.fillLight.intensity = 4.2 * batteryFactor * lowFlicker;
      this.lensMesh.visible = true;
    } else {
      this.spotLight.intensity = 0;
      this.fillLight.intensity = this.isHiding ? 0.65 : 1.1;
      this.lensMesh.visible = false;
    }

    if (this.flashlightOn && this.sanity < 100) {
      this.sanity = Math.min(100, this.sanity + 1.1 * dt);
    }
  }

  getStateSnapshot() {
    return {
      wx: this.position.x,
      wz: this.position.z,
      hp: Math.round(this.hp),
      sanity: Math.round(this.sanity),
      stamina: Math.round(this.stamina),
      battery: Math.round(this.battery),
      flashlightOn: this.flashlightOn,
      isHiding: this.isHiding,
      isStealth: this.isStealth,
      isRunning: this.isRunning,
      noiseRadius: this.noiseRadius,
    };
  }
}
