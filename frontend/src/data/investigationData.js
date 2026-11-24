/**
 * Catálogo maestro de descubrimientos narrativos de EL ARCHIVO 09.
 * Cada pista tiene una función real en la historia y en la deducción de los 5 enigmas.
 */

export const INVESTIGATION_CATALOG = {
  // === DOCUMENTOS ===
  doc_memorando_ti: {
    entryKey: 'doc_memorando_ti',
    category: 'document',
    title: 'Memorando Interno #14 — Políticas de Consola',
    locationRoom: 'Celda de Observación B-04',
    description:
      'Directiva de Sistemas (1992): "Por orden de Dirección, la clave de la Terminal de Seguridad se compone del apellido del Jefe de Seguridad en minúsculas (sin tildes) seguido del año de inauguración de la instalación."',
    contentData: {
      codeRef: 'DOC-01',
      author: 'Departamento de Sistemas — Archivo 09',
      dateWritten: '12/03/1992',
      excerpt:
        'Recordatorio obligatorio: nunca anote contraseñas completas en papel. Formato estándar de consola de seguridad: [apellido_jefe_seguridad] + [año_fundación]. Ejemplo: gomez1984.',
    },
    unlocksClue: 'clue_terminal_seguridad',
  },

  doc_manual_generadores: {
    entryKey: 'doc_manual_generadores',
    category: 'document',
    title: 'Manual Eléctrico — Subestación Subnivel',
    locationRoom: 'Pasillo Central Norte',
    description:
      'Esquema de emergencia: la red colapsa si supera 120V. Para energizar el Nodo Biométrico y el sello del Núcleo deben mantenerse activos exactamente: ENFERMERÍA (35V) + NÚCLEO 09 (50V) + LUCES DE EMERGENCIA (35V).',
    contentData: {
      codeRef: 'DOC-02',
      author: 'Ing. Tomás Herrera',
      dateWritten: '04/09/1994',
      excerpt:
        'ADVERTENCIA: Carga máxima exacta = 120V. Circuitos críticos obligatorios: Enfermería (35V), Núcleo 09 (50V) y Luces de Emergencia (35V). Desconecte ventilación, cámaras externas y servidores auxiliares para evitar disparo térmico.',
    },
    unlocksClue: 'clue_generadores_120v',
  },

  doc_registro_cctv: {
    entryKey: 'doc_registro_cctv',
    category: 'document',
    title: 'Bitácora Nocturna de Cámaras CCTV',
    locationRoom: 'Sala de Seguridad y CCTV',
    description:
      'Anotaciones del guardia nocturno sobre la Entidad 09: "Es completamente ciega en los pasillos, pero detecta pisadas rápidas y haces de linterna sostenidos. Los casilleros metálicos bloquean su rastreo."',
    contentData: {
      codeRef: 'DOC-03',
      author: 'Aris Valdés — Jefe de Seguridad',
      dateWritten: '28/10/1994',
      excerpt:
        '23:14 — El espécimen escapó de la Hemeroteca. Reacciona de inmediato a carreras y luces directas. Protocolo de supervivencia: caminar en sigilo [C], apagar linterna [F], ocultarse en casilleros [E] o lanzar bengalas [Q].',
    },
  },

  doc_informe_cifrado: {
    entryKey: 'doc_informe_cifrado',
    category: 'document',
    title: 'Informe Cifrado de Caja Fuerte (Hemeroteca)',
    locationRoom: 'Archivo Documental (Hemeroteca)',
    description:
      'Nota confidencial con cifrado alfabético: "RUGHQ GH VHFWRUHV: E - G - D - F". Necesitas hallar la clave de desplazamiento usada por el archivo para descifrar la secuencia de los cuatro sectores.',
    contentData: {
      codeRef: 'DOC-04',
      author: 'Comité de Contención',
      dateWritten: '01/11/1994',
      excerpt:
        'CLASIFICADO // COMBINACIÓN CAJA FUERTE DE SEGURIDAD\nTexto cifrado: "RUGHQ GH VHFWRUHV: E - G - D - F"\nSustituya cada sector descifrado por el número de bajas registradas en el tablero del Cuarto Oscuro.',
    },
    unlocksClue: 'clue_caja_fuerte',
  },

  doc_registro_sujetos: {
    entryKey: 'doc_registro_sujetos',
    category: 'document',
    title: 'Expediente del Sujeto #09-E (Proyecto Mnemosyne)',
    locationRoom: 'Archivo Documental (Hemeroteca)',
    description:
      'Tu propio número de credencial aparece listado como voluntario de reconstrucción neural. Al pie del expediente figura la primera clave de sellado del Núcleo: PROTOCOLO I = MNEMOSYNE.',
    contentData: {
      codeRef: 'DOC-05',
      author: 'Dra. Elena Vance',
      dateWritten: '05/11/1994',
      excerpt:
        'Sujeto #09-E: retención de memoria post-mortem confirmada al 99.4%. Aunque el cuerpo colapse y deba ser reconstruido en el último Nodo de Estabilización, el recuerdo persiste.\n[SELLO NÚCLEO — PROTOCOLO I: MNEMOSYNE]',
    },
    unlocksCode: {
      entryKey: 'code_protocolo_1',
      title: 'Protocolo del Núcleo I: MNEMOSYNE',
      description: 'Primera palabra clave del sello de contención de la Cámara del Núcleo 09.',
      locationRoom: 'Archivo Documental (Hemeroteca)',
      contentData: { value: 'MNEMOSYNE', target: 'Sello del Núcleo 09 (Ranura I)' },
    },
  },

  doc_parte_medico: {
    entryKey: 'doc_parte_medico',
    category: 'document',
    title: 'Parte Médico y Reporte Acústico — Enfermería',
    locationRoom: 'Enfermería y Cuarto Oscuro',
    description:
      'Incluye dos anotaciones críticas: 1) Los informes del archivo usan desplazamiento César +3 (retrocede 3 letras en el alfabeto). 2) Las cintas magnéticas de la Dra. Vance solo son audibles a 44.0 Hz y velocidad 0.75x.',
    contentData: {
      codeRef: 'DOC-06',
      author: 'Dr. Mateo Roldán',
      dateWritten: '07/11/1994',
      excerpt:
        'Nota al margen (Seguridad): Los documentos de la Hemeroteca usan Cifrado César +3 (E→B, G→D, D→A, F→C).\n\nNota Acústica (Oficina Vance): La estática del Eco distorsiona las grabaciones. Calibrar carrete a 44.0 Hz y velocidad 0.75x.',
    },
    unlocksCode: {
      entryKey: 'code_calibracion_cinta',
      title: 'Calibración Acústica: 44.0 Hz / 0.75x',
      description: 'Parámetros exactos para limpiar la interferencia en la grabadora de la Oficina de la Dra. Vance.',
      locationRoom: 'Enfermería y Cuarto Oscuro',
      contentData: { value: '44.0 Hz | 0.75x', target: 'Reproductor Reel-to-Reel (Oficina Dra. Vance)' },
    },
  },

  doc_diario_vance: {
    entryKey: 'doc_diario_vance',
    category: 'document',
    title: 'Diario Final de la Dra. Elena Vance',
    locationRoom: 'Oficina de la Dra. Elena Vance',
    description:
      'Confesión de la directora: la Entidad 09 no guarda recuerdos por compasión; los colecciona recreando cuerpos indefinidamente. Solo existen dos salidas en el Núcleo: PURGAR el edificio entero o EXTRAER tu conciencia.',
    contentData: {
      codeRef: 'DOC-07',
      author: 'Dra. Elena Vance',
      dateWritten: '11/11/1994',
      excerpt:
        'Si estás leyendo esto, ya moriste al menos una vez y volviste a despertar en B-04. El Eco reconstruye tu cuerpo para seguir alimentándose de tu memoria. Llega a la Cámara del Núcleo y decide: Purga Térmica o Extracción Neural.',
    },
  },

  // === FOTOGRAFÍAS ===
  photo_placa_1989: {
    entryKey: 'photo_placa_1989',
    category: 'photo',
    title: 'Fotografía: Placa de Inauguración (1989)',
    locationRoom: 'Pasillo Central Norte',
    description:
      'Instantánea Polaroid manchada de óxido junto al vestíbulo. Muestra la placa de bronce fundacional: "INSTALACIÓN ARCHIVO 09 — OCTUBRE 1989" y la firma del primer Jefe de Seguridad: "A. VALDÉS".',
    contentData: {
      photoType: 'plaque_1989',
      caption: 'ARCHIVO 09 · OCTUBRE 1989 · JEFE DE SEGURIDAD: A. VALDÉS',
      highlights: ['Año de fundación: 1989', 'Jefe de Seguridad: A. Valdés'],
    },
  },

  photo_cuarto_oscuro: {
    entryKey: 'photo_cuarto_oscuro',
    category: 'photo',
    title: 'Fotografía Revelada: Tablero de Desaparecidos',
    locationRoom: 'Enfermería y Cuarto Oscuro',
    description:
      'Revelado en luz roja dentro del cuarto oscuro. Muestra el recuento oficial de personal desaparecido en cada sector: Sector A = 7, Sector B = 4, Sector C = 9, Sector D = 2.',
    contentData: {
      photoType: 'missing_board',
      caption: 'REGISTRO DE BAJAS POR SECTOR — NOVIEMBRE 1994',
      highlights: ['Sector A: 7', 'Sector B: 4', 'Sector C: 9', 'Sector D: 2'],
    },
  },

  // === GRABACIONES ===
  rec_cinta_01: {
    entryKey: 'rec_cinta_01',
    category: 'recording',
    title: 'Cinta #01 — Evacuación Fallida (Hemeroteca)',
    locationRoom: 'Archivo Documental (Hemeroteca)',
    description:
      'Grabación de campo con interferencia metálica. Se escucha a un técnico susurrando: "Sellamos la puerta del Núcleo con los tres protocolos. La Dra. Vance se llevó el tercero a su oficina tras cerrar la caja fuerte de Seguridad."',
    contentData: {
      duration: '00:24',
      frequency: 190,
      transcript:
        '[ESTÁTICA] ...no corras, escucha las pisadas. Sellamos la Cámara del Núcleo con tres protocolos. El primero quedó en los expedientes de sujetos; el segundo está en la subestación de generadores; Elena guardó el tercero en su cinta personal...',
    },
  },

  // === PISTAS PENDIENTES (se resuelven automáticamente al completar su enigma) ===
  clue_terminal_seguridad: {
    entryKey: 'clue_terminal_seguridad',
    category: 'clue',
    title: 'Acceder a la Terminal de Seguridad',
    locationRoom: 'Celda de Observación B-04',
    description:
      'Debes deducir la contraseña de la consola en la Sala de Seguridad usando el formato del Memorando TI ([apellido sin tildes] + [año]) y los datos de la placa fundacional en el Pasillo Central.',
    isResolved: false,
  },

  clue_caja_fuerte: {
    entryKey: 'clue_caja_fuerte',
    category: 'clue',
    title: 'Abrir la Caja Fuerte de Seguridad',
    locationRoom: 'Archivo Documental (Hemeroteca)',
    description:
      'Descifra la secuencia de sectores del Informe Cifrado (usando la clave César del Parte Médico de Enfermería) y reemplaza cada sector por las cifras de la Fotografía del Cuarto Oscuro.',
    isResolved: false,
  },

  clue_generadores_120v: {
    entryKey: 'clue_generadores_120v',
    category: 'clue',
    title: 'Restaurar la Red Eléctrica en Generadores (120V)',
    locationRoom: 'Pasillo Central Norte',
    description:
      'Baja a la Sala de Generadores por la Enfermería y equilibra los disyuntores exactamente a 120V para reactivar el Nodo Biométrico #2 y alimentar la compuerta del Núcleo.',
    isResolved: false,
  },

  clue_sello_nucleo: {
    entryKey: 'clue_sello_nucleo',
    category: 'clue',
    title: 'Desbloquear el Sello de la Cámara del Núcleo 09',
    locationRoom: 'Pasillo Central Norte',
    description:
      'Reúne los 3 Protocolos de Contención (Hemeroteca, Generadores y Oficina de la Dra. Vance) y restaura la energía para abrir la compuerta sur hacia el Núcleo 09.',
    isResolved: false,
  },
};
