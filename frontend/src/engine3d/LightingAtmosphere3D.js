import * as THREE from 'three';
import { FACILITY_LIGHTS } from '../data/roomsData.js';
import { WALL_HEIGHT, tileToWorld } from './scale3d.js';

/**
 * Atmósfera 3D de terror psicológico (FogExp2, fluorescentes parpadeantes,
 * polvo en suspensión iluminado y bengalas 3D con física de rebote).
 */
export class LightingAtmosphere3D {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.powerRestored = false;
    this.fixtures = [];
    this.flares = [];

    // Niebla exponencial atmosférica (oscurece fondos largos sin ocultar la habitación inmediata)
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.048);

    // Luz hemisférica fría calibrada para leer arquitectura PBR en penumbra
    this.hemiLight = new THREE.HemisphereLight(0x4c6078, 0x1e2228, 0.72);
    scene.add(this.hemiLight);

    this.buildFixtures();
    this.buildDustParticles();
  }

  buildFixtures() {
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x22262b,
      roughness: 0.6,
      metalness: 0.7,
    });

    FACILITY_LIGHTS.forEach((def) => {
      const pos = tileToWorld(def.col, def.row);
      const group = new THREE.Group();
      group.position.set(pos.x, WALL_HEIGHT - 0.08, pos.z);

      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.24), housingMat);
      group.add(housing);

      const tubeMat = new THREE.MeshBasicMaterial({ color: def.color });
      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.05, 0.12), tubeMat);
      tube.position.y = -0.05;
      group.add(tube);

      this.scene.add(group);

      const light = new THREE.PointLight(def.color, 0, 18.5, 1.32);
      light.position.set(pos.x, WALL_HEIGHT - 0.35, pos.z);
      this.scene.add(light);

      this.fixtures.push({
        def,
        light,
        tubeMat,
        phase: Math.random() * 100,
        baseIntensity: def.intensity * 26,
      });
    });
  }

  buildDustParticles() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = 0.2 + Math.random() * (WALL_HEIGHT - 0.4);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xd8d0be,
      size: 0.032,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.scene.add(this.dustPoints);
  }

  setPowerRestored(restored) {
    this.powerRestored = Boolean(restored);
    this.scene.fog.density = this.powerRestored ? 0.036 : 0.048;
    this.hemiLight.intensity = this.powerRestored ? 0.95 : 0.72;
  }

  spawnFlare(origin, forwardDir, durationSec = 13) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc92c2c,
      emissive: new THREE.Color(0xff4224),
      emissiveIntensity: 3.0,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const light = new THREE.PointLight(0xff4526, 36, 16, 1.35);
    light.position.copy(origin);
    this.scene.add(light);

    const velocity = forwardDir.clone().multiplyScalar(7.5);
    velocity.y = Math.max(1.4, velocity.y + 1.8);

    this.flares.push({
      mesh,
      light,
      velocity,
      expiresAt: performance.now() + durationSec * 1000,
    });
  }

  update(dt, timeSec, playerPos) {
    // 1. Parpadeo realista de tubos fluorescentes y luces de emergencia
    this.fixtures.forEach((f) => {
      const enabled = !f.def.requiresPower || this.powerRestored;
      if (!enabled) {
        f.light.intensity = 0;
        f.tubeMat.color.setHex(0x16181c);
        return;
      }

      let flicker = 1;
      if (f.def.flicker) {
        const w = Math.sin(timeSec * 6.5 + f.phase) * Math.sin(timeSec * 19.3 + f.phase);
        flicker = w > 0.84 ? 0.14 : 0.86 + w * 0.14;
      }
      f.light.intensity = f.baseIntensity * flicker;
      f.tubeMat.color.setHex(f.def.color).multiplyScalar(0.45 + 0.55 * flicker);
    });

    // 2. Mantener la nube de polvo centrada alrededor del jugador con deriva suave
    if (this.dustPoints && playerPos) {
      this.dustPoints.position.set(
        playerPos.x + Math.sin(timeSec * 0.2) * 0.4,
        Math.sin(timeSec * 0.35) * 0.12,
        playerPos.z + Math.cos(timeSec * 0.22) * 0.4
      );
    }

    // 3. Física de bengalas 3D (arco, rebote en suelo y colisión contra muros)
    const now = performance.now();
    this.flares = this.flares.filter((flare) => {
      if (now >= flare.expiresAt) {
        this.scene.remove(flare.mesh);
        this.scene.remove(flare.light);
        return false;
      }

      flare.velocity.y -= 13.5 * dt;
      const nextX = flare.mesh.position.x + flare.velocity.x * dt;
      const nextZ = flare.mesh.position.z + flare.velocity.z * dt;
      const resolved = this.collision.resolveMovement(nextX, nextZ, 0.15);

      if (Math.abs(resolved.x - nextX) > 0.01) flare.velocity.x *= -0.45;
      if (Math.abs(resolved.z - nextZ) > 0.01) flare.velocity.z *= -0.45;

      flare.mesh.position.x = resolved.x;
      flare.mesh.position.z = resolved.z;
      flare.mesh.position.y += flare.velocity.y * dt;

      if (flare.mesh.position.y <= 0.06) {
        flare.mesh.position.y = 0.06;
        flare.velocity.y *= -0.32;
        flare.velocity.x *= 0.72;
        flare.velocity.z *= 0.72;
      }

      const pulse = 0.82 + Math.sin(timeSec * 28) * 0.18;
      flare.light.position.set(flare.mesh.position.x, flare.mesh.position.y + 0.25, flare.mesh.position.z);
      flare.light.intensity = 38 * pulse;
      return true;
    });
  }
}
