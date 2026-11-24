import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine.js';

/**
 * Director de Terror Psicológico 3D (inspirado en Amnesia / Silent Hill 2 / RE7):
 * Dispara eventos ambientales dinámicos para que el edificio se sienta vivo y opresivo:
 *  - Aparición fugaz de una silueta oscura al final del pasillo que se desvanece al iluminarla.
 *  - Apagones/parpadeos bruscos de luces acompañados de golpes metálicos lejanos.
 *  - Susurros direccionales en el oído izquierdo o derecho cuando estás en la penumbra.
 */
export class HorrorDirector3D {
  constructor(scene, collisionSystem, atmosphere) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.atmosphere = atmosphere;

    this.nextEventAt = performance.now() + 9500;
    this.apparition = null;
    this.apparitionExpiresAt = 0;
    this.blackoutUntil = 0;

    this.buildApparitionMesh();
  }

  buildApparitionMesh() {
    const group = new THREE.Group();
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050608,
      transparent: true,
      opacity: 0.92,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe8d5d5 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.35, 6, 10), shadowMat);
    body.position.y = 1.02;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), shadowMat);
    head.position.y = 1.9;
    group.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
    eyeL.position.set(-0.055, 1.92, 0.15);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.055;
    group.add(eyeL, eyeR);

    group.visible = false;
    this.scene.add(group);
    this.apparition = group;
  }

  spawnHallwayApparition(player) {
    const forward = player.getForwardDirection();
    forward.y = 0;
    if (forward.lengthSq() < 0.001) return false;
    forward.normalize();

    // Intentar colocarla entre 7 y 11 metros delante del jugador si hay línea de visión despejada
    for (const dist of [10.5, 8.5, 6.8]) {
      const tx = player.position.x + forward.x * dist;
      const tz = player.position.z + forward.z * dist;
      if (this.collision.hasLineOfSight(player.position.x, player.position.z, tx, tz)) {
        const resolved = this.collision.resolveMovement(tx, tz, 0.35);
        if (Math.hypot(resolved.x - tx, resolved.z - tz) < 0.25) {
          this.apparition.position.set(tx, 0, tz);
          this.apparition.lookAt(player.position.x, 1.6, player.position.z);
          this.apparition.visible = true;
          this.apparitionExpiresAt = performance.now() + 2600;
          soundEngine.playWhisper((Math.random() - 0.5) * 1.4);
          return true;
        }
      }
    }
    return false;
  }

  update(dt, timeSec, player, isPaused) {
    if (isPaused || !player || player.isDead) return;
    const now = performance.now();

    // Actualizar aparición activa (tiembla y desaparece al acercarse o vencer su temporizador)
    if (this.apparition.visible) {
      this.apparition.position.x += Math.sin(timeSec * 45) * 0.012;
      const dist = Math.hypot(
        this.apparition.position.x - player.position.x,
        this.apparition.position.z - player.position.z
      );
      if (now >= this.apparitionExpiresAt || dist < 3.4) {
        this.apparition.visible = false;
        if (dist < 4.5) {
          soundEngine.playHorrorSting();
          player.drainSanity(6);
        }
      }
    }

    // Efecto temporal de caída de tensión en los fluorescentes
    if (now < this.blackoutUntil) {
      this.atmosphere.hemiLight.intensity = 0.24 + Math.random() * 0.14;
    } else if (this.blackoutUntil > 0) {
      this.blackoutUntil = 0;
      this.atmosphere.setPowerRestored(this.atmosphere.powerRestored);
    }

    // Programar nuevo evento psicológico cada 15-26 segundos
    if (now >= this.nextEventAt) {
      this.nextEventAt = now + 15000 + Math.random() * 11000;
      const roll = Math.random();

      if (roll < 0.42) {
        // Aparición fugaz al fondo del pasillo
        const spawned = this.spawnHallwayApparition(player);
        if (!spawned) soundEngine.playWhisper(Math.random() > 0.5 ? -0.85 : 0.85);
      } else if (roll < 0.72) {
        // Golpe metálico seco en tuberías + caída breve de tensión
        soundEngine.playMetallicBang(Math.random() > 0.5 ? -0.9 : 0.9);
        this.blackoutUntil = now + 1800;
      } else {
        // Susurro direccional detrás del hombro
        soundEngine.playWhisper(Math.random() > 0.5 ? -0.95 : 0.95);
      }
    }
  }
}
