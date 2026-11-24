import * as THREE from 'three';
import { tileToWorld } from '../engine3d/scale3d.js';
import { soundEngine } from '../audio/SoundEngine.js';

/**
 * El Eco (Espécimen 09-A / Alfa) — Criatura 3D articulada de ~2.15 m de altura.
 * Modelo jerárquico orgánico con extremidades largas, torso encorvado, hendidura sensorial
 * pálida sin ojos, venas bioluminiscentes y animación procedural de acecho y persecución.
 */
export class EchoStalker3D {
  constructor(scene, collisionSystem, spawnConfig) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.config = spawnConfig;
    this.waypoints = spawnConfig.waypoints.map((w) => tileToWorld(w.col, w.row));
    this.waypointIndex = 0;

    this.state = 'PATROL';
    this.targetPos = { ...this.waypoints[1] };
    this.searchUntil = 0;
    this.walkPhase = Math.random() * 10;
    this.prevStepSign = 1;
    this.growlTimer = 1.5 + Math.random() * 3;
    this.lastStingAt = 0;

    this.root = new THREE.Group();
    const start = this.waypoints[0];
    this.root.position.set(start.x, 0, start.z);
    this.buildArticulatedModel();
    scene.add(this.root);
  }

  buildArticulatedModel() {
    const fleshMat = new THREE.MeshStandardMaterial({
      color: 0x3b262c,
      roughness: 0.62,
      metalness: 0.14,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x7d6568,
      roughness: 0.52,
      metalness: 0.18,
    });
    const veinMat = new THREE.MeshStandardMaterial({
      color: 0xc92232,
      emissive: new THREE.Color(0xff293d),
      emissiveIntensity: 2.2,
      roughness: 0.35,
    });
    const slitMat = new THREE.MeshBasicMaterial({ color: 0xffe4e6 });

    // Pelvis y torso encorvado
    this.torsoPivot = new THREE.Group();
    this.torsoPivot.position.y = 1.05;
    this.root.add(this.torsoPivot);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.52, 8, 12), fleshMat);
    torso.position.y = 0.36;
    torso.rotation.x = 0.24;
    torso.castShadow = true;
    this.torsoPivot.add(torso);

    // Costillas / espinas dorsales visibles
    for (let i = 0; i < 4; i += 1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.015, 0.025, 6, 12, Math.PI * 1.3), boneMat);
      rib.position.set(0, 0.22 + i * 0.14, 0.04);
      rib.rotation.x = Math.PI / 2 + 0.2;
      this.torsoPivot.add(rib);
    }

    // Vena bioluminiscente en el pecho
    const coreVein = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 6, 8), veinMat);
    coreVein.position.set(0, 0.42, 0.21);
    this.torsoPivot.add(coreVein);

    // Cabeza alargada sin ojos con hendidura sensorial
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 0.86, 0.15);
    this.torsoPivot.add(this.headPivot);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), fleshMat);
    skull.scale.set(0.85, 1.35, 1.05);
    skull.castShadow = true;
    this.headPivot.add(skull);

    const sensorySlit = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.05), slitMat);
    sensorySlit.position.set(0, 0.02, 0.19);
    this.headPivot.add(sensorySlit);

    // Brazos muy largos articulados con garras
    const makeArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.31, 0.66, 0.08);
      this.torsoPivot.add(shoulder);

      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.48, 6, 8), fleshMat);
      upper.position.y = -0.26;
      upper.castShadow = true;
      shoulder.add(upper);

      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.56, 6, 8), boneMat);
      forearm.position.set(0, -0.78, 0.1);
      forearm.rotation.x = -0.35;
      forearm.castShadow = true;
      shoulder.add(forearm);

      for (let c = -1; c <= 1; c += 1) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.18, 5), veinMat);
        claw.position.set(c * 0.035, -1.12, 0.22);
        claw.rotation.x = Math.PI - 0.35;
        shoulder.add(claw);
      }
      return shoulder;
    };

    this.leftArm = makeArm(-1);
    this.rightArm = makeArm(1);

    // Piernas largas articuladas
    const makeLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.16, 1.02, 0);
      this.root.add(hip);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.46, 6, 8), fleshMat);
      thigh.position.y = -0.26;
      thigh.castShadow = true;
      hip.add(thigh);

      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.48, 6, 8), boneMat);
      shin.position.set(0, -0.74, -0.04);
      shin.castShadow = true;
      hip.add(shin);

      return hip;
    };

    this.leftLeg = makeLeg(-1);
    this.rightLeg = makeLeg(1);

    // Tenue luz carmesí calibrada para r172 (hace que su silueta sea amenazante en la penumbra)
    this.auraLight = new THREE.PointLight(0xd91c2c, 4.8, 7.5, 1.5);
    this.auraLight.position.set(0, 1.55, 0.25);
    this.root.add(this.auraLight);
  }

  resetToHome() {
    const start = this.waypoints[0];
    this.root.position.set(start.x, 0, start.z);
    this.state = 'PATROL';
    this.waypointIndex = 0;
    this.targetPos = { ...this.waypoints[1] };
  }

  attractToSound(wx, wz) {
    const dist = Math.hypot(wx - this.root.position.x, wz - this.root.position.z);
    if (dist < 16) {
      this.state = 'INVESTIGATE';
      this.targetPos = { x: wx, z: wz };
      this.searchUntil = performance.now() + 6000;
    }
  }

  update(dt, timeSec, playerController, activeFlares) {
    if (!playerController || playerController.isDead) {
      return { danger: 0, attacked: false };
    }

    const now = performance.now();
    const px = playerController.position.x;
    const pz = playerController.position.z;
    const ex = this.root.position.x;
    const ez = this.root.position.z;

    // Prioridad a bengalas 3D activas
    if (activeFlares && activeFlares.length > 0) {
      const flare = activeFlares.find(
        (f) => Math.hypot(f.mesh.position.x - ex, f.mesh.position.z - ez) < 13.5
      );
      if (flare) {
        this.state = 'INVESTIGATE';
        this.targetPos = { x: flare.mesh.position.x, z: flare.mesh.position.z };
        this.searchUntil = now + 2200;
      }
    }

    const distToPlayer = Math.hypot(px - ex, pz - ez);
    const hasLOS =
      distToPlayer < 12 && this.collision.hasLineOfSight(ex, ez, px, pz);

    const hearsPlayer = !playerController.isHiding && distToPlayer < Math.max(2.6, playerController.noiseRadius);
    const seesFlashlight =
      !playerController.isHiding && playerController.flashlightOn && hasLOS && distToPlayer < 9.5;

    if ((hearsPlayer || seesFlashlight) && distToPlayer < 11.5) {
      if (this.state !== 'CHASE' && now - this.lastStingAt > 9000) {
        this.lastStingAt = now;
        soundEngine.playHorrorSting();
      }
      this.state = 'CHASE';
      this.targetPos = { x: px, z: pz };
      this.searchUntil = now + 4500;
    } else if (this.state === 'CHASE' && now > this.searchUntil) {
      this.state = 'SEARCH';
      this.searchUntil = now + 3200;
    } else if ((this.state === 'INVESTIGATE' || this.state === 'SEARCH') && now > this.searchUntil) {
      this.state = 'PATROL';
      this.targetPos = { ...this.waypoints[this.waypointIndex] };
    }

    const speed =
      this.state === 'CHASE' ? 3.55 : this.state === 'INVESTIGATE' ? 2.4 : this.state === 'SEARCH' ? 1.15 : 1.7;

    const dx = this.targetPos.x - ex;
    const dz = this.targetPos.z - ez;
    const distTarget = Math.hypot(dx, dz);

    if (distTarget > 0.35) {
      const nx = dx / distTarget;
      const nz = dz / distTarget;
      const resolved = this.collision.resolveMovement(ex + nx * speed * dt, ez + nz * speed * dt, 0.38);
      this.root.position.x = resolved.x;
      this.root.position.z = resolved.z;

      const targetYaw = Math.atan2(nx, nz);
      // Giro suave hacia el objetivo
      let diff = targetYaw - this.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.root.rotation.y += diff * Math.min(1, dt * 7);

      this.walkPhase += dt * (this.state === 'CHASE' ? 11.5 : 5.5);
    } else if (this.state === 'PATROL') {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      this.targetPos = { ...this.waypoints[this.waypointIndex] };
    }

    // Animación procedural inquietante de extremidades y pisadas espaciales 3D sincronizadas
    const swing = Math.sin(this.walkPhase);
    const stepSign = swing >= 0 ? 1 : -1;
    if (stepSign !== this.prevStepSign && distTarget > 0.35 && distToPlayer < 15) {
      this.prevStepSign = stepSign;
      soundEngine.playSpatialFootstep(
        ex,
        ez,
        px,
        pz,
        playerController.yaw,
        this.state === 'CHASE'
      );
    }
    this.leftLeg.rotation.x = swing * 0.55;
    this.rightLeg.rotation.x = -swing * 0.55;
    this.leftArm.rotation.x = -swing * 0.48 - (this.state === 'CHASE' ? 0.65 : 0.15);
    this.rightArm.rotation.x = swing * 0.48 - (this.state === 'CHASE' ? 0.65 : 0.15);
    this.torsoPivot.position.y = 1.05 + Math.abs(swing) * 0.05;
    this.headPivot.rotation.z = Math.sin(timeSec * (this.state === 'CHASE' ? 16 : 3.2)) * 0.24;
    this.headPivot.rotation.y = Math.sin(timeSec * 4.5) * 0.18;

    // Sonido espacial direccional (gruñidos y respiración)
    this.growlTimer -= dt;
    if (this.growlTimer <= 0 && distToPlayer < 14) {
      this.growlTimer = this.state === 'CHASE' ? 1.5 : 3.8 + Math.random() * 2.5;
      soundEngine.playSpatialGrowl(
        ex,
        ez,
        px,
        pz,
        playerController.yaw,
        this.state === 'CHASE'
      );
    }

    const attacked = !playerController.isHiding && distToPlayer < 1.25;
    const danger = distToPlayer < 12 ? Math.max(0, 1 - distToPlayer / 12) : 0;

    return {
      danger,
      attacked,
      damage: 34,
      cause: `Desgarrado por ${this.config.name}`,
      enemyType: this.config.type,
    };
  }
}
