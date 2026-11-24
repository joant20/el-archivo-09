/**
 * Motor de persistencia local (Fallback para despliegues web estáticos como Netlify/Vercel).
 * Replica exactamente el contrato de la API Express + MySQL y la separación estricta en 3 capas:
 *   - Capa A (permanent): investigationEntries, solvedPuzzles, exploredRooms, deathHistory (inmutable al morir)
 *   - Capa B (survival): estado temporal de supervivencia
 *   - Capa C (checkpoint): último Nodo de Estabilización
 */

const DB_KEY = 'archivo09_portable_db_v1';

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignorar corrupción local
  }
  return { nextUserId: 1, nextSaveId: 1, nextEntryId: 1, users: [], saves: {} };
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function nowIso() {
  return new Date().toISOString();
}

function getCurrentUser(db, token) {
  if (!token || !token.startsWith('local_')) return null;
  const uid = Number(token.replace('local_', ''));
  return db.users.find((u) => u.id === uid) || null;
}

export const localStorageBackend = {
  async register(username, password) {
    const db = readDb();
    const clean = String(username || '').trim();
    if (clean.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres.');
    if (String(password || '').length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
    if (db.users.some((u) => u.username.toLowerCase() === clean.toLowerCase())) {
      throw new Error('Ese nombre de investigador ya existe en este navegador.');
    }
    const user = { id: db.nextUserId++, username: clean, password, created_at: nowIso() };
    db.users.push(user);
    writeDb(db);
    return {
      token: `local_${user.id}`,
      user: { id: user.id, username: user.username, created_at: user.created_at },
    };
  },

  async login(username, password) {
    const db = readDb();
    const clean = String(username || '').trim();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === clean.toLowerCase() && u.password === password
    );
    if (!user) throw new Error('Credenciales inválidas (si eres nuevo aquí, pulsa "Registrar").');
    return {
      token: `local_${user.id}`,
      user: { id: user.id, username: user.username, created_at: user.created_at },
    };
  },

  async me(token) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    if (!user) throw new Error('Sesión local no válida.');
    return { user: { id: user.id, username: user.username, created_at: user.created_at } };
  },

  async listSaves(token) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    if (!user) throw new Error('No autorizado.');
    const list = Object.values(db.saves)
      .filter((s) => s.meta.user_id === user.id)
      .sort((a, b) => new Date(b.meta.updated_at) - new Date(a.meta.updated_at))
      .map((s) => ({
        ...s.meta,
        current_room: s.survival.room_key,
        hp: s.survival.hp,
        total_discoveries: s.permanent.investigationEntries.length,
        total_puzzles_solved: s.permanent.solvedPuzzles.length,
      }));
    return { saves: list };
  },

  async createSave(token, slotName) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    if (!user) throw new Error('No autorizado.');

    const id = db.nextSaveId++;
    const ts = nowIso();
    const defaultConsumables = { medkit: 1, battery: 1, flare: 2 };

    const fullSave = {
      meta: {
        id,
        user_id: user.id,
        slot_name: String(slotName || 'Expediente #09').slice(0, 80),
        death_count: 0,
        play_time_seconds: 0,
        ending_reached: null,
        created_at: ts,
        updated_at: ts,
      },
      permanent: {
        investigationEntries: [
          {
            id: db.nextEntryId++,
            entry_key: 'evt_despertar_b04',
            category: 'event',
            title: 'Despertar en Celda B-04',
            description:
              'Despertaste en la sala de contención B-04 sin recordar cómo llegaste. Una linterna y tu credencial borrosa #09-E estaban junto al catre.',
            content_data: { phase: 'inicio' },
            location_room: 'Celda de Observación B-04',
            is_resolved: true,
            discovered_at: ts,
          },
        ],
        solvedPuzzles: [],
        exploredRooms: [
          {
            id: db.nextEntryId++,
            room_key: 'celda_b04',
            room_name: 'Celda de Observación B-04',
            first_visited_at: ts,
            last_visited_at: ts,
            visit_count: 1,
          },
        ],
        deathHistory: [],
      },
      survival: {
        room_key: 'celda_b04',
        pos_x: 220,
        pos_y: 210,
        hp: 100,
        sanity: 100,
        stamina: 100,
        battery: 100,
        consumables: { ...defaultConsumables },
        keyItems: ['linterna_estandar', 'credencial_09e'],
        updated_at: ts,
      },
      checkpoint: {
        checkpoint_key: 'cp_celda_b04',
        room_key: 'celda_b04',
        pos_x: 220,
        pos_y: 210,
        hp: 100,
        sanity: 100,
        battery: 100,
        consumables: { ...defaultConsumables },
        saved_at: ts,
      },
    };

    db.saves[id] = fullSave;
    writeDb(db);
    return { save: fullSave };
  },

  async getSave(token, saveId) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    const save = db.saves[saveId];
    if (!user || !save || save.meta.user_id !== user.id) throw new Error('Partida no encontrada.');
    return { save };
  },

  async updateSaveMeta(token, saveId, meta) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    const save = db.saves[saveId];
    if (!user || !save || save.meta.user_id !== user.id) throw new Error('Partida no encontrada.');
    if (typeof meta.playTimeSeconds === 'number') save.meta.play_time_seconds = Math.floor(meta.playTimeSeconds);
    if (typeof meta.endingReached === 'string') save.meta.ending_reached = meta.endingReached;
    save.meta.updated_at = nowIso();
    writeDb(db);
    return { save };
  },

  async deleteSave(token, saveId) {
    const db = readDb();
    const user = getCurrentUser(db, token);
    const save = db.saves[saveId];
    if (!user || !save || save.meta.user_id !== user.id) throw new Error('Partida no encontrada.');
    delete db.saves[saveId];
    writeDb(db);
    return { deleted: true };
  },

  async recordInvestigation(token, saveId, entry) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) throw new Error('Partida no encontrada.');

    const existing = save.permanent.investigationEntries.find((e) => e.entry_key === entry.entryKey);
    if (existing) {
      return { created: false, entry: existing };
    }

    const createdEntry = {
      id: db.nextEntryId++,
      entry_key: entry.entryKey,
      category: entry.category,
      title: entry.title,
      description: entry.description,
      content_data: entry.contentData || null,
      location_room: entry.locationRoom,
      is_resolved: Boolean(entry.isResolved),
      discovered_at: nowIso(),
    };
    save.permanent.investigationEntries.push(createdEntry);
    save.meta.updated_at = nowIso();
    writeDb(db);
    return { created: true, entry: createdEntry };
  },

  async resolveClue(_token, saveId, entryKey) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) return { resolved: false, entryKey };
    const found = save.permanent.investigationEntries.find((e) => e.entry_key === entryKey);
    if (found) found.is_resolved = true;
    writeDb(db);
    return { resolved: Boolean(found), entryKey };
  },

  async recordRoomVisit(_token, saveId, roomKey, roomName) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) return { isFirstVisit: false };
    const ts = nowIso();
    const existing = save.permanent.exploredRooms.find((r) => r.room_key === roomKey);
    if (existing) {
      existing.visit_count += 1;
      existing.last_visited_at = ts;
      writeDb(db);
      return { isFirstVisit: false, room: existing };
    }
    const room = {
      id: db.nextEntryId++,
      room_key: roomKey,
      room_name: roomName,
      first_visited_at: ts,
      last_visited_at: ts,
      visit_count: 1,
    };
    save.permanent.exploredRooms.push(room);
    writeDb(db);
    return { isFirstVisit: true, room };
  },

  async solvePuzzle(_token, saveId, puzzle) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) throw new Error('Partida no encontrada.');
    const existing = save.permanent.solvedPuzzles.find((p) => p.puzzle_key === puzzle.puzzleKey);
    if (existing) return { created: false, puzzle: existing };

    const rec = {
      id: db.nextEntryId++,
      puzzle_key: puzzle.puzzleKey,
      puzzle_title: puzzle.puzzleTitle,
      solution_summary: puzzle.solutionSummary,
      location_room: puzzle.locationRoom,
      solved_at: nowIso(),
    };
    save.permanent.solvedPuzzles.push(rec);
    save.meta.updated_at = nowIso();
    writeDb(db);
    return { created: true, puzzle: rec };
  },

  async updateSurvival(_token, saveId, partial) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) throw new Error('Partida no encontrada.');
    const cur = save.survival;
    save.survival = {
      ...cur,
      room_key: partial.roomKey ?? cur.room_key,
      pos_x: typeof partial.posX === 'number' ? partial.posX : cur.pos_x,
      pos_y: typeof partial.posY === 'number' ? partial.posY : cur.pos_y,
      hp: typeof partial.hp === 'number' ? Math.max(0, Math.min(100, Math.round(partial.hp))) : cur.hp,
      sanity: typeof partial.sanity === 'number' ? Math.max(0, Math.min(100, Math.round(partial.sanity))) : cur.sanity,
      stamina: typeof partial.stamina === 'number' ? partial.stamina : cur.stamina,
      battery: typeof partial.battery === 'number' ? partial.battery : cur.battery,
      consumables: partial.consumables ?? cur.consumables,
      keyItems: Array.isArray(partial.keyItems)
        ? Array.from(new Set([...cur.keyItems, ...partial.keyItems]))
        : cur.keyItems,
      updated_at: nowIso(),
    };
    writeDb(db);
    return { survival: save.survival };
  },

  async saveCheckpoint(_token, saveId, cp) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) throw new Error('Partida no encontrada.');
    const ts = nowIso();
    save.checkpoint = {
      checkpoint_key: cp.checkpointKey,
      room_key: cp.roomKey,
      pos_x: cp.posX,
      pos_y: cp.posY,
      hp: Math.max(70, Math.min(100, Math.round(cp.hp ?? 100))),
      sanity: Math.max(70, Math.min(100, Math.round(cp.sanity ?? 100))),
      battery: Math.max(50, Math.min(100, cp.battery ?? 100)),
      consumables: { ...(cp.consumables || { medkit: 1, battery: 1, flare: 2 }) },
      saved_at: ts,
    };
    save.survival = {
      ...save.survival,
      room_key: save.checkpoint.room_key,
      pos_x: save.checkpoint.pos_x,
      pos_y: save.checkpoint.pos_y,
      hp: save.checkpoint.hp,
      sanity: save.checkpoint.sanity,
      stamina: 100,
      battery: save.checkpoint.battery,
      consumables: { ...save.checkpoint.consumables },
      keyItems: Array.isArray(cp.keyItems)
        ? Array.from(new Set([...save.survival.keyItems, ...cp.keyItems]))
        : save.survival.keyItems,
      updated_at: ts,
    };
    writeDb(db);
    return { checkpoint: save.checkpoint };
  },

  async registerDeath(_token, saveId, deathInfo) {
    const db = readDb();
    const save = db.saves[saveId];
    if (!save) throw new Error('Partida no encontrada.');

    const ts = nowIso();
    save.meta.death_count += 1;
    const deathNum = save.meta.death_count;
    const cp = save.checkpoint;

    // Capa A: Historial de muertes + evento (inmutable)
    save.permanent.deathHistory.unshift({
      id: db.nextEntryId++,
      death_number: deathNum,
      cause: deathInfo.cause || 'Colapso vital',
      enemy_type: deathInfo.enemyType || 'entidad_desconocida',
      location_room: deathInfo.locationRoom || 'Instalación Archivo 09',
      checkpoint_restored: cp.checkpoint_key,
      died_at: ts,
    });

    save.permanent.investigationEntries.push({
      id: db.nextEntryId++,
      entry_key: `evt_muerte_${deathNum}`,
      category: 'event',
      title: `Reconstrucción #${deathNum} tras fallecimiento`,
      description: `Causa: ${deathInfo.cause || 'Ataque letal'}. Reconstruido en ${cp.checkpoint_key}; tu investigación permaneció intacta.`,
      content_data: { deathNumber: deathNum, checkpointRestored: cp.checkpoint_key },
      location_room: deathInfo.locationRoom || 'Instalación Archivo 09',
      is_resolved: true,
      discovered_at: ts,
    });

    // Capa B restaurada desde Capa C (conservando objetos clave)
    save.survival = {
      ...save.survival,
      room_key: cp.room_key,
      pos_x: cp.pos_x,
      pos_y: cp.pos_y,
      hp: cp.hp,
      sanity: cp.sanity,
      stamina: 100,
      battery: cp.battery,
      consumables: { ...cp.consumables },
      updated_at: ts,
    };

    save.meta.updated_at = ts;
    writeDb(db);
    return { save };
  },
};
