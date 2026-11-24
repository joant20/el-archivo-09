/**
 * Mapa continuo de las 8 habitaciones de EL ARCHIVO 09.
 * Cuadrícula: 60 columnas x 42 filas (TILE_SIZE = 40px -> 2400 x 1680 px).
 */

export const TILE_SIZE = 40;
export const MAP_COLS = 60;
export const MAP_ROWS = 42;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// Helper para convertir coordenadas de celda a píxeles centrales
export const tileToPx = (col, row) => ({
  x: col * TILE_SIZE + TILE_SIZE / 2,
  y: row * TILE_SIZE + TILE_SIZE / 2,
});

export const ROOMS = [
  {
    key: 'celda_b04',
    name: 'Celda de Observación B-04',
    theme: 'cell',
    rects: [{ x1: 2, y1: 2, x2: 12, y2: 11 }],
    ambientColor: 0x3b4a5e,
    droneFreq: 52,
  },
  {
    key: 'pasillo_central',
    name: 'Pasillo Central Norte',
    theme: 'corridor',
    rects: [
      { x1: 15, y1: 4, x2: 44, y2: 10 },
      { x1: 26, y1: 11, x2: 33, y2: 25 },
    ],
    ambientColor: 0x454034,
    droneFreq: 48,
  },
  {
    key: 'sala_seguridad',
    name: 'Sala de Seguridad y CCTV',
    theme: 'security',
    rects: [{ x1: 47, y1: 2, x2: 57, y2: 12 }],
    ambientColor: 0x26413b,
    droneFreq: 58,
  },
  {
    key: 'archivo_documental',
    name: 'Archivo Documental (Hemeroteca)',
    theme: 'archive',
    rects: [{ x1: 2, y1: 14, x2: 23, y2: 25 }],
    ambientColor: 0x423528,
    droneFreq: 44,
  },
  {
    key: 'enfermeria',
    name: 'Enfermería y Cuarto Oscuro',
    theme: 'medical',
    rects: [{ x1: 36, y1: 14, x2: 44, y2: 24 }],
    ambientColor: 0x4a2929,
    droneFreq: 55,
  },
  {
    key: 'generadores',
    name: 'Sala de Generadores (Subnivel)',
    theme: 'generator',
    rects: [{ x1: 36, y1: 27, x2: 57, y2: 39 }],
    ambientColor: 0x3b3522,
    droneFreq: 40,
  },
  {
    key: 'oficina_vance',
    name: 'Oficina de la Dra. Elena Vance',
    theme: 'office',
    rects: [{ x1: 47, y1: 15, x2: 57, y2: 24 }],
    ambientColor: 0x453226,
    droneFreq: 50,
  },
  {
    key: 'camara_nucleo',
    name: 'Cámara del Núcleo 09',
    theme: 'core',
    rects: [{ x1: 10, y1: 28, x2: 33, y2: 39 }],
    ambientColor: 0x5c1f24,
    droneFreq: 36,
  },
];

// Pasos de puerta que conectan habitaciones contiguas
export const DOORWAYS = [
  {
    id: 'door_celda',
    label: 'Puerta de Celda B-04',
    x1: 13,
    y1: 6,
    x2: 14,
    y2: 7,
    orientation: 'vertical',
    lockedBy: null,
  },
  {
    id: 'door_seguridad',
    label: 'Acceso Sala de Seguridad',
    x1: 45,
    y1: 6,
    x2: 46,
    y2: 7,
    orientation: 'vertical',
    lockedBy: null,
  },
  {
    id: 'door_archivo',
    label: 'Compuerta de Hemeroteca',
    x1: 17,
    y1: 11,
    x2: 18,
    y2: 13,
    orientation: 'horizontal',
    lockedBy: { type: 'puzzle', key: 'puzzle_terminal_seguridad', hint: 'Bloqueada electrónicamente desde la Terminal de Seguridad.' },
  },
  {
    id: 'door_enfermeria',
    label: 'Acceso a Enfermería',
    x1: 34,
    y1: 17,
    x2: 35,
    y2: 18,
    orientation: 'vertical',
    lockedBy: null,
  },
  {
    id: 'door_generadores',
    label: 'Escotilla a Generadores',
    x1: 39,
    y1: 25,
    x2: 40,
    y2: 26,
    orientation: 'horizontal',
    lockedBy: null,
  },
  {
    id: 'door_vance',
    label: 'Puerta Oficina Dra. Vance',
    x1: 51,
    y1: 13,
    x2: 52,
    y2: 14,
    orientation: 'horizontal',
    lockedBy: { type: 'keyItem', key: 'tarjeta_nivel_2', hint: 'Requiere Tarjeta de Acceso Nivel 2 (Caja Fuerte de Seguridad).' },
  },
  {
    id: 'door_nucleo',
    label: 'Compuerta Blindada — Núcleo 09',
    x1: 29,
    y1: 26,
    x2: 30,
    y2: 27,
    orientation: 'horizontal',
    lockedBy: { type: 'puzzle', key: 'puzzle_core_seal', hint: 'Sellada con 3 Protocolos de Contención. Usa el panel del Sello junto a la compuerta.' },
  },
];

// Obstáculos interiores sólidos (estanterías, turbinas, reactor central) que proyectan sombras reales
export const INTERIOR_OBSTACLES = [
  // Estanterías de la Hemeroteca
  { x1: 6, y1: 17, x2: 10, y2: 18, kind: 'shelf' },
  { x1: 14, y1: 17, x2: 18, y2: 18, kind: 'shelf' },
  { x1: 6, y1: 21, x2: 10, y2: 22, kind: 'shelf' },
  { x1: 14, y1: 21, x2: 18, y2: 22, kind: 'shelf' },
  // Turbinas de la Sala de Generadores
  { x1: 41, y1: 31, x2: 43, y2: 33, kind: 'turbine' },
  { x1: 49, y1: 31, x2: 51, y2: 33, kind: 'turbine' },
  // Reactor Central del Núcleo 09
  { x1: 20, y1: 33, x2: 23, y2: 34, kind: 'core_reactor' },
];

// Luces ambientales de la instalación (fluorescentes, alertas rojas, luces tras restaurar energía)
export const FACILITY_LIGHTS = [
  { col: 6, row: 6, radius: 170, color: 0xc2d4ea, intensity: 0.48, flicker: true, requiresPower: false },
  { col: 21, row: 7, radius: 190, color: 0xe6c88c, intensity: 0.42, flicker: true, requiresPower: false },
  { col: 34, row: 7, radius: 185, color: 0xe6c88c, intensity: 0.36, flicker: true, requiresPower: false },
  { col: 30, row: 19, radius: 180, color: 0xd98062, intensity: 0.38, flicker: false, requiresPower: true },
  { col: 52, row: 6, radius: 190, color: 0x73c4a4, intensity: 0.5, flicker: false, requiresPower: false },
  { col: 12, row: 19, radius: 155, color: 0xd4a45e, intensity: 0.28, flicker: true, requiresPower: true },
  { col: 40, row: 19, radius: 185, color: 0xe65c5c, intensity: 0.45, flicker: false, requiresPower: false },
  { col: 46, row: 35, radius: 220, color: 0xe5b24c, intensity: 0.52, flicker: true, requiresPower: true },
  { col: 52, row: 19, radius: 190, color: 0xe2b778, intensity: 0.48, flicker: false, requiresPower: false },
  { col: 22, row: 34, radius: 290, color: 0xc92c38, intensity: 0.62, flicker: true, requiresPower: false },
];

// Objetos interactivos del mundo: documentos, fotos, grabaciones, enigmas, checkpoints, consumibles y escondites
export const INTERACTABLES = [
  // === CHECKPOINTS (Nodos de Estabilización - Capa C) ===
  {
    id: 'cp_celda_b04',
    type: 'checkpoint',
    checkpointKey: 'cp_celda_b04',
    roomKey: 'celda_b04',
    col: 4,
    row: 4,
    label: 'Nodo de Estabilización #1 (Celda B-04)',
    requiresPower: false,
  },
  {
    id: 'cp_enfermeria',
    type: 'checkpoint',
    checkpointKey: 'cp_enfermeria',
    roomKey: 'enfermeria',
    col: 42,
    row: 16,
    label: 'Nodo de Estabilización #2 (Enfermería)',
    requiresPower: true,
  },

  // === DOCUMENTOS, FOTOS Y GRABACIONES (Capa A) ===
  {
    id: 'pickup_doc_memorando_ti',
    type: 'investigation',
    entryKey: 'doc_memorando_ti',
    col: 9,
    row: 4,
    label: 'Memorando Interno #14',
    spriteKind: 'document',
  },
  {
    id: 'pickup_photo_placa_1989',
    type: 'investigation',
    entryKey: 'photo_placa_1989',
    col: 23,
    row: 5,
    label: 'Placa Conmemorativa (1989)',
    spriteKind: 'photo',
  },
  {
    id: 'pickup_doc_manual_generadores',
    type: 'investigation',
    entryKey: 'doc_manual_generadores',
    col: 38,
    row: 9,
    label: 'Manual de Subestación Eléctrica',
    spriteKind: 'document',
  },
  {
    id: 'pickup_doc_registro_cctv',
    type: 'investigation',
    entryKey: 'doc_registro_cctv',
    col: 49,
    row: 9,
    label: 'Bitácora CCTV de Seguridad',
    spriteKind: 'document',
  },
  {
    id: 'pickup_doc_informe_cifrado',
    type: 'investigation',
    entryKey: 'doc_informe_cifrado',
    col: 4,
    row: 23,
    label: 'Informe Cifrado de Caja Fuerte',
    spriteKind: 'document',
  },
  {
    id: 'pickup_doc_registro_sujetos',
    type: 'investigation',
    entryKey: 'doc_registro_sujetos',
    col: 21,
    row: 23,
    label: 'Expediente Sujeto #09-E',
    spriteKind: 'document',
  },
  {
    id: 'pickup_rec_cinta_01',
    type: 'investigation',
    entryKey: 'rec_cinta_01',
    col: 12,
    row: 15,
    label: 'Cinta Magnética #01',
    spriteKind: 'recording',
  },
  {
    id: 'pickup_photo_cuarto_oscuro',
    type: 'investigation',
    entryKey: 'photo_cuarto_oscuro',
    col: 38,
    row: 22,
    label: 'Fotografía del Cuarto Oscuro',
    spriteKind: 'photo',
  },
  {
    id: 'pickup_doc_parte_medico',
    type: 'investigation',
    entryKey: 'doc_parte_medico',
    col: 42,
    row: 22,
    label: 'Parte Médico y Reporte Acústico',
    spriteKind: 'document',
  },
  {
    id: 'pickup_doc_diario_vance',
    type: 'investigation',
    entryKey: 'doc_diario_vance',
    col: 49,
    row: 22,
    label: 'Diario Final — Dra. Elena Vance',
    spriteKind: 'document',
  },

  // === ENIGMAS INTERACTIVOS ===
  {
    id: 'obj_puzzle_terminal',
    type: 'puzzle',
    puzzleKey: 'puzzle_terminal_seguridad',
    col: 54,
    row: 4,
    label: 'Terminal de Seguridad CCTV',
    spriteKind: 'terminal',
  },
  {
    id: 'obj_puzzle_safe',
    type: 'puzzle',
    puzzleKey: 'puzzle_caja_fuerte',
    col: 55,
    row: 9,
    label: 'Caja Fuerte Mural',
    spriteKind: 'safe',
  },
  {
    id: 'obj_puzzle_generators',
    type: 'puzzle',
    puzzleKey: 'puzzle_generadores',
    col: 54,
    row: 33,
    label: 'Panel de Balance de Carga (120V)',
    spriteKind: 'generator_panel',
  },
  {
    id: 'obj_puzzle_tape',
    type: 'puzzle',
    puzzleKey: 'puzzle_cinta_vance',
    col: 54,
    row: 19,
    label: 'Reproductor Reel-to-Reel (Cinta #02)',
    spriteKind: 'tape_deck',
  },
  {
    id: 'obj_puzzle_core_seal',
    type: 'puzzle',
    puzzleKey: 'puzzle_core_seal',
    col: 27,
    row: 24,
    label: 'Panel de Sellado — Núcleo 09',
    spriteKind: 'core_panel',
  },

  // === CONSOLA DE DECISIÓN FINAL (CÁMARA DEL NÚCLEO) ===
  {
    id: 'obj_core_ending',
    type: 'ending_console',
    col: 21.5,
    row: 36.5,
    label: 'Consola Central del Núcleo 09',
    spriteKind: 'ending_console',
  },

  // === CONSUMIBLES DE SUPERVIVENCIA (Capa B - reaparecen si mueres antes de guardar) ===
  { id: 'item_medkit_celda', type: 'consumable', itemKind: 'medkit', amount: 1, col: 4, row: 9, label: 'Botiquín de Emergencia' },
  { id: 'item_battery_seg', type: 'consumable', itemKind: 'battery', amount: 1, col: 49, row: 4, label: 'Batería de Litio' },
  { id: 'item_flare_arc', type: 'consumable', itemKind: 'flare', amount: 2, col: 4, row: 16, label: 'Bengalas de Distracción (x2)' },
  { id: 'item_medkit_enf', type: 'consumable', itemKind: 'medkit', amount: 1, col: 38, row: 16, label: 'Botiquín Clínico' },
  { id: 'item_battery_gen', type: 'consumable', itemKind: 'battery', amount: 1, col: 38, row: 37, label: 'Batería Industrial' },
  { id: 'item_flare_gen', type: 'consumable', itemKind: 'flare', amount: 1, col: 54, row: 29, label: 'Bengala de Señal' },
  { id: 'item_medkit_vance', type: 'consumable', itemKind: 'medkit', amount: 1, col: 55, row: 22, label: 'Botiquín de Dirección' },

  // === ESCONDITES (Casilleros metálicos contra El Eco) ===
  { id: 'locker_celda', type: 'locker', col: 10, row: 10, label: 'Casillero Metálico' },
  { id: 'locker_pasillo', type: 'locker', col: 28, row: 14, label: 'Casillero de Servicio' },
  { id: 'locker_archivo_1', type: 'locker', col: 3, row: 19, label: 'Casillero de Hemeroteca' },
  { id: 'locker_archivo_2', type: 'locker', col: 22, row: 19, label: 'Casillero de Hemeroteca' },
  { id: 'locker_generadores', type: 'locker', col: 37, row: 32, label: 'Casillero Industrial' },
  { id: 'locker_nucleo', type: 'locker', col: 12, row: 34, label: 'Cabina de Contención' },
];

// Rutas de patrulla de las criaturas
export const ENEMY_SPAWNS = [
  {
    id: 'echo_pasillo',
    type: 'echo_stalker',
    name: 'El Eco Errante (Espécimen 09-B)',
    homeRoom: 'pasillo_central',
    waypoints: [
      { col: 23, row: 7 },
      { col: 36, row: 7 },
      { col: 30, row: 7 },
      { col: 30, row: 16 },
      { col: 30, row: 22 },
      { col: 28, row: 14 },
      { col: 28, row: 7 },
    ],
  },
  {
    id: 'echo_hemeroteca',
    type: 'echo_stalker',
    name: 'El Eco (Espécimen 09-A)',
    homeRoom: 'archivo_documental',
    waypoints: [
      { col: 12, row: 16 },
      { col: 20, row: 16 },
      { col: 20, row: 20 },
      { col: 12, row: 20 },
      { col: 4, row: 20 },
      { col: 4, row: 16 },
    ],
  },
  {
    id: 'shadow_generadores',
    type: 'static_shadow',
    name: 'Sombra Estática (Anomalía)',
    homeRoom: 'generadores',
    waypoints: [
      { col: 46, row: 29 },
      { col: 46, row: 36 },
      { col: 54, row: 36 },
      { col: 39, row: 35 },
    ],
  },
  {
    id: 'echo_nucleo',
    type: 'echo_stalker',
    name: 'El Eco Alfa (Guardián del Núcleo)',
    homeRoom: 'camara_nucleo',
    waypoints: [
      { col: 15, row: 30 },
      { col: 28, row: 30 },
      { col: 28, row: 37 },
      { col: 15, row: 37 },
    ],
  },
];
