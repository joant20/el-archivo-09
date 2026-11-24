/**
 * Definición lógica de los 5 enigmas deductivos de EL ARCHIVO 09.
 * Cada solución proviene directamente de las pistas físicas del mundo.
 */

export const PUZZLES_CATALOG = {
  puzzle_terminal_seguridad: {
    puzzleKey: 'puzzle_terminal_seguridad',
    title: 'Terminal de Seguridad CCTV',
    locationRoom: 'Sala de Seguridad y CCTV',
    expectedPassword: 'valdes1989',
    solutionSummary: 'Contraseña deducida (valdes1989) -> Compuerta de Hemeroteca desbloqueada',
    resolvesClues: ['clue_terminal_seguridad'],
    unlocksDoor: 'door_archivo',
    rewardCode: {
      entryKey: 'code_terminal_seguridad',
      category: 'code',
      title: 'Clave Consola CCTV: valdes1989',
      description: 'Contraseña deducida a partir de la placa de 1989 (A. Valdés) y el Memorando de Sistemas.',
      locationRoom: 'Sala de Seguridad y CCTV',
      contentData: { value: 'valdes1989', target: 'Terminal de Seguridad' },
    },
  },

  puzzle_caja_fuerte: {
    puzzleKey: 'puzzle_caja_fuerte',
    title: 'Caja Fuerte Mural de Seguridad',
    locationRoom: 'Sala de Seguridad y CCTV',
    expectedCode: '4279',
    solutionSummary: 'Combinación 4279 (B-D-A-C) -> Tarjeta de Acceso Nivel 2 obtenida',
    resolvesClues: ['clue_caja_fuerte'],
    rewardKeyItem: 'tarjeta_nivel_2',
    rewardConsumables: { battery: 1 },
    rewardCode: {
      entryKey: 'code_caja_fuerte',
      category: 'code',
      title: 'Combinación Caja Fuerte: 4279',
      description: 'Descifrado César (-3) de E-G-D-F => B-D-A-C cruzado con el tablero de desaparecidos (4-2-7-9).',
      locationRoom: 'Sala de Seguridad y CCTV',
      contentData: { value: '4279', target: 'Caja Fuerte de Seguridad' },
    },
  },

  puzzle_generadores: {
    puzzleKey: 'puzzle_generadores',
    title: 'Panel de Balance de Carga (120V)',
    locationRoom: 'Sala de Generadores (Subnivel)',
    targetVoltage: 120,
    requiredBreakers: ['b_enfermeria', 'b_nucleo', 'b_luces'],
    breakers: [
      { id: 'b_ventilacion', label: 'Ventilación Auxiliar', volts: 25 },
      { id: 'b_enfermeria', label: 'Enfermería / Nodo #2', volts: 35 },
      { id: 'b_camaras', label: 'Cámaras Perimetrales', volts: 40 },
      { id: 'b_nucleo', label: 'Compuerta Núcleo 09', volts: 50 },
      { id: 'b_luces', label: 'Luces de Emergencia', volts: 35 },
      { id: 'b_servidores', label: 'Servidores Antiguos', volts: 15 },
    ],
    solutionSummary: 'Red estabilizada a 120V (35+50+35) -> Energía restaurada y Protocolo II obtenido',
    resolvesClues: ['clue_generadores_120v'],
    rewardCode: {
      entryKey: 'code_protocolo_2',
      category: 'code',
      title: 'Protocolo del Núcleo II: OMEGA-09',
      description: 'Desplegado en la pantalla de diagnóstico de la subestación al equilibrar los 120V.',
      locationRoom: 'Sala de Generadores (Subnivel)',
      contentData: { value: 'OMEGA-09', target: 'Sello del Núcleo 09 (Ranura II)' },
    },
  },

  puzzle_cinta_vance: {
    puzzleKey: 'puzzle_cinta_vance',
    title: 'Grabadora Magnética — Cinta #02 (Dra. Vance)',
    locationRoom: 'Oficina de la Dra. Elena Vance',
    targetFrequency: 44.0,
    targetSpeed: 0.75,
    solutionSummary: 'Cinta calibrada a 44.0 Hz / 0.75x -> Protocolo III: SILENCIO revelado',
    rewardRecording: {
      entryKey: 'rec_cinta_vance',
      category: 'recording',
      title: 'Cinta #02 — Mensaje Calibrado de la Dra. Vance',
      description:
        'Voz clara tras anular interferencia: "El tercer protocolo es SILENCIO. Usa los tres en la compuerta sur del pasillo. No dejes que el Eco complete el ciclo."',
      locationRoom: 'Oficina de la Dra. Elena Vance',
      contentData: {
        duration: '00:36',
        frequency: 44.0,
        transcript:
          'Aquí Elena Vance, 11 de noviembre. Si calibraste esta cinta, todavía conservas tu lucidez entre reconstrucciones. El tercer protocolo de sellado es SILENCIO. Combínalo con MNEMOSYNE y OMEGA-09 en la puerta del Núcleo. Termina esto.',
      },
    },
    rewardCode: {
      entryKey: 'code_protocolo_3',
      category: 'code',
      title: 'Protocolo del Núcleo III: SILENCIO',
      description: 'Última palabra clave revelada en la grabación calibrada de la Dra. Elena Vance.',
      locationRoom: 'Oficina de la Dra. Elena Vance',
      contentData: { value: 'SILENCIO', target: 'Sello del Núcleo 09 (Ranura III)' },
    },
  },

  puzzle_core_seal: {
    puzzleKey: 'puzzle_core_seal',
    title: 'Sello de Contención — Cámara del Núcleo 09',
    locationRoom: 'Pasillo Central Norte',
    requiresPowerPuzzle: 'puzzle_generadores',
    expectedSlots: ['MNEMOSYNE', 'OMEGA-09', 'SILENCIO'],
    slotOptions: [
      ['MNEMOSYNE', 'ARCHIVO-04', 'VALDES', 'ECOS'],
      ['OMEGA-09', 'ALPHA-12', 'DELTA-03', 'SIGMA-09'],
      ['SILENCIO', 'MEMORIA', 'SOMBRA', 'PURGA'],
    ],
    solutionSummary: 'Protocolos MNEMOSYNE / OMEGA-09 / SILENCIO verificados -> Cámara del Núcleo abierta',
    resolvesClues: ['clue_sello_nucleo'],
    unlocksDoor: 'door_nucleo',
  },
};
