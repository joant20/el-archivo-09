import { pool } from '../config/db.js';

const DEFAULT_CONSUMABLES = {
  medkit: 1,
  battery: 1,
  flare: 2,
};

export const saveModel = {
  async listByUser(userId) {
    const [rows] = await pool.query(
      `SELECT
         s.id,
         s.slot_name,
         s.death_count,
         s.play_time_seconds,
         s.ending_reached,
         s.created_at,
         s.updated_at,
         sv.room_key AS current_room,
         sv.hp,
         (SELECT COUNT(*) FROM investigation_entries ie WHERE ie.save_slot_id = s.id) AS total_discoveries,
         (SELECT COUNT(*) FROM solved_puzzles sp WHERE sp.save_slot_id = s.id) AS total_puzzles_solved
       FROM save_slots s
       LEFT JOIN survival_states sv ON sv.save_slot_id = s.id
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC`,
      [userId]
    );
    return rows;
  },

  async findOwnedSlot(saveId, userId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, user_id, slot_name, death_count, play_time_seconds, ending_reached, created_at, updated_at
       FROM save_slots
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [saveId, userId]
    );
    return rows[0] || null;
  },

  /**
   * Crea una nueva partida inicializando las 3 capas en una sola transacción:
   * - Capa A: primera habitación explorada + evento inicial de despertar
   * - Capa B: estado temporal de supervivencia
   * - Capa C: primer punto de control (Celda B-04)
   */
  async createSlot(userId, slotName) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [slotResult] = await connection.query(
        'INSERT INTO save_slots (user_id, slot_name) VALUES (?, ?)',
        [userId, slotName]
      );
      const saveSlotId = slotResult.insertId;

      const initialConsumables = JSON.stringify(DEFAULT_CONSUMABLES);
      const initialKeyItems = JSON.stringify(['linterna_estandar', 'credencial_09e']);

      // Capa C: Punto de control inicial
      await connection.query(
        `INSERT INTO checkpoint_states
           (save_slot_id, checkpoint_key, room_key, pos_x, pos_y, hp, sanity, battery, consumables_json)
         VALUES (?, 'cp_celda_b04', 'celda_b04', 220, 210, 100, 100, 100, ?)`,
        [saveSlotId, initialConsumables]
      );

      // Capa B: Estado temporal de supervivencia inicial
      await connection.query(
        `INSERT INTO survival_states
           (save_slot_id, room_key, pos_x, pos_y, hp, sanity, stamina, battery, consumables_json, key_items_json)
         VALUES (?, 'celda_b04', 220, 210, 100, 100, 100, 100, ?, ?)`,
        [saveSlotId, initialConsumables, initialKeyItems]
      );

      // Capa A: Habitación inicial explorada
      await connection.query(
        `INSERT INTO explored_rooms (save_slot_id, room_key, room_name, visit_count)
         VALUES (?, 'celda_b04', 'Celda de Observación B-04', 1)`,
        [saveSlotId]
      );

      // Capa A: Primer acontecimiento registrado
      await connection.query(
        `INSERT INTO investigation_entries
           (save_slot_id, entry_key, category, title, description, content_data, location_room, is_resolved)
         VALUES (?, 'evt_despertar_b04', 'event', 'Despertar en Celda B-04',
                 'Despertaste en la sala de contención B-04 sin recordar cómo llegaste. Una linterna y tu credencial borrosa #09-E estaban junto al catre.',
                 ?, 'Celda de Observación B-04', 1)`,
        [saveSlotId, JSON.stringify({ phase: 'inicio' })]
      );

      await connection.commit();
      return saveSlotId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateMeta(saveId, { playTimeSeconds, endingReached }) {
    const updates = [];
    const params = [];

    if (typeof playTimeSeconds === 'number' && playTimeSeconds >= 0) {
      updates.push('play_time_seconds = ?');
      params.push(Math.floor(playTimeSeconds));
    }
    if (typeof endingReached === 'string' && endingReached.length > 0) {
      updates.push('ending_reached = ?');
      params.push(endingReached.slice(0, 64));
    }
    if (updates.length === 0) return;

    params.push(saveId);
    await pool.query(`UPDATE save_slots SET ${updates.join(', ')} WHERE id = ?`, params);
  },

  async deleteSlot(saveId, userId) {
    const [result] = await pool.query(
      'DELETE FROM save_slots WHERE id = ? AND user_id = ?',
      [saveId, userId]
    );
    return result.affectedRows > 0;
  },
};
