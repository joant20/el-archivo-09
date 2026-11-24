import { pool } from '../config/db.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const survivalModel = {
  async getSurvivalState(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT room_key, pos_x, pos_y, hp, sanity, stamina, battery, consumables_json, key_items_json, updated_at
       FROM survival_states
       WHERE save_slot_id = ?
       LIMIT 1`,
      [saveSlotId]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      consumables: parseJson(rows[0].consumables_json, {}),
      keyItems: parseJson(rows[0].key_items_json, []),
    };
  },

  async updateSurvivalState(saveSlotId, state, connection = pool) {
    const current = await this.getSurvivalState(saveSlotId, connection);
    if (!current) return null;

    const nextRoom = state.roomKey ?? current.room_key;
    const nextX = typeof state.posX === 'number' ? state.posX : current.pos_x;
    const nextY = typeof state.posY === 'number' ? state.posY : current.pos_y;
    const nextHp = typeof state.hp === 'number' ? Math.max(0, Math.min(100, Math.round(state.hp))) : current.hp;
    const nextSanity = typeof state.sanity === 'number' ? Math.max(0, Math.min(100, Math.round(state.sanity))) : current.sanity;
    const nextStamina = typeof state.stamina === 'number' ? Math.max(0, Math.min(100, state.stamina)) : current.stamina;
    const nextBattery = typeof state.battery === 'number' ? Math.max(0, Math.min(100, state.battery)) : current.battery;
    const nextConsumables = state.consumables ?? current.consumables;
    // Unimos objetos clave sin perder nunca los ya conseguidos
    const nextKeyItems = Array.isArray(state.keyItems)
      ? Array.from(new Set([...current.keyItems, ...state.keyItems]))
      : current.keyItems;

    await connection.query(
      `UPDATE survival_states
       SET room_key = ?, pos_x = ?, pos_y = ?, hp = ?, sanity = ?, stamina = ?, battery = ?,
           consumables_json = ?, key_items_json = ?
       WHERE save_slot_id = ?`,
      [
        nextRoom,
        nextX,
        nextY,
        nextHp,
        nextSanity,
        nextStamina,
        nextBattery,
        JSON.stringify(nextConsumables),
        JSON.stringify(nextKeyItems),
        saveSlotId,
      ]
    );

    return this.getSurvivalState(saveSlotId, connection);
  },

  async getCheckpointState(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT checkpoint_key, room_key, pos_x, pos_y, hp, sanity, battery, consumables_json, saved_at
       FROM checkpoint_states
       WHERE save_slot_id = ?
       LIMIT 1`,
      [saveSlotId]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      consumables: parseJson(rows[0].consumables_json, {}),
    };
  },

  /**
   * CAPA C: Guarda un nuevo Nodo de Estabilización (Punto de Control).
   * Garantiza recursos mínimos seguros (al menos 70 HP y 50% batería) para evitar bucles imposibles.
   */
  async saveCheckpoint(saveSlotId, cp, connection = pool) {
    const safeHp = Math.max(70, Math.min(100, Math.round(cp.hp ?? 100)));
    const safeSanity = Math.max(70, Math.min(100, Math.round(cp.sanity ?? 100)));
    const safeBattery = Math.max(50, Math.min(100, cp.battery ?? 100));
    const consumables = cp.consumables ?? { medkit: 1, battery: 1, flare: 2 };

    await connection.query(
      `UPDATE checkpoint_states
       SET checkpoint_key = ?, room_key = ?, pos_x = ?, pos_y = ?,
           hp = ?, sanity = ?, battery = ?, consumables_json = ?, saved_at = CURRENT_TIMESTAMP
       WHERE save_slot_id = ?`,
      [
        cp.checkpointKey,
        cp.roomKey,
        cp.posX,
        cp.posY,
        safeHp,
        safeSanity,
        safeBattery,
        JSON.stringify(consumables),
        saveSlotId,
      ]
    );

    // Sincronizamos también Capa B al activar el Nodo de Estabilización
    await this.updateSurvivalState(
      saveSlotId,
      {
        roomKey: cp.roomKey,
        posX: cp.posX,
        posY: cp.posY,
        hp: safeHp,
        sanity: safeSanity,
        stamina: 100,
        battery: safeBattery,
        consumables,
        keyItems: cp.keyItems,
      },
      connection
    );

    return this.getCheckpointState(saveSlotId, connection);
  },
};
