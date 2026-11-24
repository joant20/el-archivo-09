import * as THREE from 'three';
import { tileToWorld } from '../engine3d/scale3d.js';

/**
 * La Sombra Estática — Anomalía Cognitiva 3D flotante.
 * Silueta oscura fracturada rodeada de fragmentos orbitales y luz espectral fría
 * que drena la cordura al acercarse o mirarla fijamente en el subnivel.
 */
export class StaticShadow3D {
  constructor(scene, collisionSystem, spawnConfig) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.config = spawnConfig;
    this.waypoints = spawnConfig.waypoints.map((w) => tileToWorld(w.col, w.row));
    this.waypointIndex = 0;

    this.root = new THREE.Group();
    const start = this.waypoints[0];
    this.root.position.set(start.x, 0, start.z);
    this.shards = [];
    this.buildModel();
    scene.add(this.root);
  }

  buildModel() {
    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x090d14,
      emissive: new THREE.Color(0x1f355c),
      emissiveIntensity: 0.75,
      roughness: 0.3,
      transparent: true,
      opacity: 0.86,
    });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.75, 7), voidMat);
    body.position.y = 1.15;
    body.rotation.x = Math.PI;
    this.root.add(body);

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), voidMat);
    head.position.y = 2.02;
    this.root.add(head);

    const shardMat = new THREE.MeshBasicMaterial({ color: 0x8fb4eb });
    for (let i = 0; i < 10; i += 1) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06), shardMat);
      this.root.add(shard);
      this.shards.push({
        mesh: shard,
        angle: (i / 10) * Math.PI * 2,
        radius: 0.42 + (i % 3) * 0.16,
        height: 0.8 + (i % 4) * 0.35,
        speed: (i % 2 === 0 ? 1 : -1) * (1.2 + (i % 3) * 0.5),
      });
    }

    this.coldLight = new THREE.PointLight(0x6391e0, 10.5, 11, 1.4);
    this.coldLight.position.y = 1.6;
    this.root.add(this.coldLight);
  }

  resetToHome() {
    const start = this.waypoints[0];
    this.root.position.set(start.x, 0, start.z);
    this.waypointIndex = 0;
  }

  update(dt, timeSec, playerController) {
    if (!playerController || playerController.isDead) {
      return { danger: 0, attacked: false };
    }

    const px = playerController.position.x;
    const pz = playerController.position.z;
    const ex = this.root.position.x;
    const ez = this.root.position.z;
    const dist = Math.hypot(px - ex, pz - ez);

    let target = this.waypoints[this.waypointIndex];
    let speed = 1.55;

    if (!playerController.isHiding && dist < 8.5) {
      target = { x: px, z: pz };
      speed = 2.35;
      playerController.drainSanity(dt * 12);
    }

    const dx = target.x - ex;
    const dz = target.z - ez;
    const distTarget = Math.hypot(dx, dz);
    if (distTarget > 0.35) {
      const nx = dx / distTarget;
      const nz = dz / distTarget;
      const resolved = this.collision.resolveMovement(ex + nx * speed * dt, ez + nz * speed * dt, 0.36);
      this.root.position.x = resolved.x;
      this.root.position.z = resolved.z;
    } else {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }

    // Flotación y fragmentos orbitales
    this.root.position.y = Math.sin(timeSec * 2.4) * 0.12;
    this.coldLight.intensity = 9.5 + Math.sin(timeSec * 14) * 3.5;
    this.shards.forEach((s) => {
      s.angle += dt * s.speed;
      s.mesh.position.set(
        Math.cos(s.angle) * s.radius,
        s.height + Math.sin(timeSec * 3 + s.angle) * 0.12,
        Math.sin(s.angle) * s.radius
      );
      s.mesh.rotation.y += dt * 3;
    });

    const attacked = !playerController.isHiding && dist < 1.25;
    const danger = dist < 10 ? Math.max(0, 1 - dist / 10) : 0;

    return {
      danger,
      attacked,
      damage: 25,
      cause: `Colapso cognitivo ante ${this.config.name}`,
      enemyType: this.config.type,
    };
  }
}
