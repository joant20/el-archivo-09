import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP_COLS,
  MAP_ROWS,
  ROOMS,
  DOORWAYS,
  INTERIOR_OBSTACLES,
  INTERACTABLES,
  ENEMY_SPAWNS,
} from '../data/roomsData.js';
import { INVESTIGATION_CATALOG } from '../data/investigationData.js';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';

function buildWalkableGrid() {
  const solid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(true));
  ROOMS.forEach((room) => {
    room.rects.forEach(({ x1, y1, x2, y2 }) => {
      for (let r = y1; r <= y2; r += 1) {
        for (let c = x1; c <= x2; c += 1) {
          solid[r][c] = false;
        }
      }
    });
  });
  DOORWAYS.forEach((door) => {
    for (let r = door.y1; r <= door.y2; r += 1) {
      for (let c = door.x1; c <= door.x2; c += 1) {
        solid[r][c] = false;
      }
    }
  });
  INTERIOR_OBSTACLES.forEach((obs) => {
    for (let r = obs.y1; r <= obs.y2; r += 1) {
      for (let c = obs.x1; c <= obs.x2; c += 1) {
        solid[r][c] = true;
      }
    }
  });
  return solid;
}

test('Integridad del Mapa: todos los interactuables y patrullas están en suelo transitable', () => {
  const solid = buildWalkableGrid();

  INTERACTABLES.forEach((item) => {
    const c = Math.floor(item.col);
    const r = Math.floor(item.row);
    assert.equal(
      solid[r][c],
      false,
      `El interactuable "${item.id}" en (${c},${r}) está dentro de una pared u obstáculo.`
    );
  });

  ENEMY_SPAWNS.forEach((enemy) => {
    enemy.waypoints.forEach((wp, idx) => {
      assert.equal(
        solid[wp.row][wp.col],
        false,
        `El waypoint #${idx} de "${enemy.id}" en (${wp.col},${wp.row}) está dentro de una pared.`
      );
    });
  });
});

test('Integridad de Enigmas y Pistas: soluciones coherentes y sin claves rotas', () => {
  // 1. Verificar que los 5 enigmas existen
  assert.equal(Object.keys(PUZZLES_CATALOG).length, 5);

  // 2. Verificar que los disyuntores requeridos de Generadores suman exactamente 120V
  const gen = PUZZLES_CATALOG.puzzle_generadores;
  const totalRequiredVolts = gen.breakers
    .filter((b) => gen.requiredBreakers.includes(b.id))
    .reduce((sum, b) => sum + b.volts, 0);
  assert.equal(totalRequiredVolts, gen.targetVoltage);

  // 3. Verificar que el Cifrado César (-3) de "E - G - D - F" produce "B - D - A - C" -> 4279
  const cipher = ['E', 'G', 'D', 'F'];
  const decoded = cipher.map((ch) => String.fromCharCode(ch.charCodeAt(0) - 3));
  assert.deepEqual(decoded, ['B', 'D', 'A', 'C']);
  const missingBySector = { A: 7, B: 4, C: 9, D: 2 };
  const derivedCode = decoded.map((sec) => missingBySector[sec]).join('');
  assert.equal(derivedCode, PUZZLES_CATALOG.puzzle_caja_fuerte.expectedCode);

  // 4. Verificar que cada interactuable de tipo investigation referencia una entrada válida
  INTERACTABLES.filter((i) => i.type === 'investigation').forEach((item) => {
    assert.ok(
      INVESTIGATION_CATALOG[item.entryKey],
      `Falta entrada "${item.entryKey}" en INVESTIGATION_CATALOG`
    );
  });
});
