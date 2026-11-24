import { TILE_SIZE } from '../data/roomsData.js';

/**
 * Escala arquitectónica 3D realista en metros.
 * Mantiene compatibilidad exacta con las coordenadas (pos_x, pos_y) ya guardadas en MySQL.
 */
export const CELL_SIZE = 1.45; // metros por celda del mapa
export const WALL_HEIGHT = 3.3; // altura de techo en metros
export const EYE_HEIGHT_STAND = 1.66;
export const EYE_HEIGHT_CROUCH = 1.02;
export const PLAYER_RADIUS = 0.38;

export const PX_TO_METERS = CELL_SIZE / TILE_SIZE;
export const METERS_TO_PX = TILE_SIZE / CELL_SIZE;

export function tileToWorld(col, row) {
  return {
    x: (col + 0.5) * CELL_SIZE,
    z: (row + 0.5) * CELL_SIZE,
  };
}

export function pxToWorld(px, py) {
  return {
    x: px * PX_TO_METERS,
    z: py * PX_TO_METERS,
  };
}

export function worldToPx(wx, wz) {
  return {
    x: Math.round(wx * METERS_TO_PX),
    y: Math.round(wz * METERS_TO_PX),
  };
}
