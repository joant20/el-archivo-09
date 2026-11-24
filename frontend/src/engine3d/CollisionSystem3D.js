/**
 * Sistema de colisiones 3D de deslizamiento suave (Círculo horizontal XZ vs AABBs).
 * Soporta muros fijos, mobiliario sólido y puertas que se abren/cierran dinámicamente.
 */
export class CollisionSystem3D {
  constructor() {
    this.staticBoxes = []; // { minX, maxX, minZ, maxZ, tag }
    this.dynamicBoxes = new Map(); // id -> { minX, maxX, minZ, maxZ, active }
  }

  addBox(minX, maxX, minZ, maxZ, tag = 'wall') {
    this.staticBoxes.push({ minX, maxX, minZ, maxZ, tag });
  }

  addCenteredBox(cx, cz, widthX, depthZ, tag = 'prop') {
    this.addBox(cx - widthX / 2, cx + widthX / 2, cz - depthZ / 2, cz + depthZ / 2, tag);
  }

  setDynamicBox(id, minX, maxX, minZ, maxZ, active = true) {
    this.dynamicBoxes.set(id, { minX, maxX, minZ, maxZ, active });
  }

  setDynamicActive(id, active) {
    const box = this.dynamicBoxes.get(id);
    if (box) box.active = active;
  }

  /**
   * Resuelve movimiento (x, z) aplicando deslizamiento contra paredes sin atascarse en esquinas.
   */
  resolveMovement(x, z, radius) {
    let rx = x;
    let rz = z;

    const resolveAgainst = (box) => {
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          // Si está exactamente en el borde interno, empujar por el eje menor
          const penLeft = Math.abs(rx - box.minX);
          const penRight = Math.abs(box.maxX - rx);
          const penTop = Math.abs(rz - box.minZ);
          const penBottom = Math.abs(box.maxZ - rz);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) rx = box.minX - radius;
          else if (minPen === penRight) rx = box.maxX + radius;
          else if (minPen === penTop) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    };

    // Dos pasadas garantizan estabilidad en esquinas interiores de 90°
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < this.staticBoxes.length; i += 1) {
        resolveAgainst(this.staticBoxes[i]);
      }
      this.dynamicBoxes.forEach((box) => {
        if (box.active) resolveAgainst(box);
      });
    }

    return { x: rx, z: rz };
  }

  /**
   * Comprueba si hay línea de visión directa sin muros entre dos puntos (para IA de enemigos).
   */
  hasLineOfSight(x1, z1, x2, z2) {
    const steps = Math.max(4, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.45));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;

      for (let b = 0; b < this.staticBoxes.length; b += 1) {
        const box = this.staticBoxes[b];
        if (box.tag === 'low_prop') continue;
        if (px >= box.minX && px <= box.maxX && pz >= box.minZ && pz <= box.maxZ) {
          return false;
        }
      }
      for (const box of this.dynamicBoxes.values()) {
        if (box.active && px >= box.minX && px <= box.maxX && pz >= box.minZ && pz <= box.maxZ) {
          return false;
        }
      }
    }
    return true;
  }
}
