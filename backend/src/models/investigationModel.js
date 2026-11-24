import { pool } from '../config/db.js';

function parseJsonSafe(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const investigationModel = {
  async listEntries(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, entry_key, category, title, description, content_data, location_room, is_resolved, discovered_at
       FROM investigation_entries
       WHERE save_slot_id = ?
       ORDER BY discovered_at ASC, id ASC`,
      [saveSlotId]
    );
    return rows.map((row) => ({
      ...row,
      is_resolved: Boolean(row.is_resolved),
      content_data: parseJsonSafe(row.content_data),
    }));
  },

  /**
   * Inserta un descubrimiento de manera idempotente.
   * Gracias a UNIQUE(save_slot_id, entry_key) + INSERT IGNORE,
   * jamás se duplicará un documento, foto, código, grabación, pista o evento.
   */
  async recordEntry(saveSlotId, entry, connection = pool) {
    const {
      entryKey,
      category,
      title,
      description,
      contentData = null,
      locationRoom,
      isResolved = false,
    } = entry;

    const [insertResult] = await connection.query(
      `INSERT IGNORE INTO investigation_entries
         (save_slot_id, entry_key, category, title, description, content_data, location_room, is_resolved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saveSlotId,
        entryKey,
        category,
        title,
        description,
        contentData ? JSON.stringify(contentData) : null,
        locationRoom,
        isResolved ? 1 : 0,
      ]
    );

    const [rows] = await connection.query(
      `SELECT id, entry_key, category, title, description, content_data, location_room, is_resolved, discovered_at
       FROM investigation_entries
       WHERE save_slot_id = ? AND entry_key = ?
       LIMIT 1`,
      [saveSlotId, entryKey]
    );

    const record = rows[0];
    return {
      created: insertResult.affectedRows > 0,
      entry: {
        ...record,
        is_resolved: Boolean(record.is_resolved),
        content_data: parseJsonSafe(record.content_data),
      },
    };
  },

  async markClueResolved(saveSlotId, entryKey, connection = pool) {
    const [result] = await connection.query(
      `UPDATE investigation_entries
       SET is_resolved = 1
       WHERE save_slot_id = ? AND entry_key = ?`,
      [saveSlotId, entryKey]
    );
    return result.affectedRows > 0;
  },

  async listExploredRooms(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, room_key, room_name, first_visited_at, last_visited_at, visit_count
       FROM explored_rooms
       WHERE save_slot_id = ?
       ORDER BY first_visited_at ASC`,
      [saveSlotId]
    );
    return rows;
  },

  async recordRoomVisit(saveSlotId, roomKey, roomName, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO explored_rooms (save_slot_id, room_key, room_name, visit_count)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         visit_count = visit_count + 1,
         last_visited_at = CURRENT_TIMESTAMP`,
      [saveSlotId, roomKey, roomName]
    );

    const [rows] = await connection.query(
      `SELECT id, room_key, room_name, first_visited_at, last_visited_at, visit_count
       FROM explored_rooms
       WHERE save_slot_id = ? AND room_key = ?
       LIMIT 1`,
      [saveSlotId, roomKey]
    );

    // En MySQL ON DUPLICATE KEY UPDATE: affectedRows === 1 es fila nueva, 2 es actualización
    return {
      isFirstVisit: result.affectedRows === 1,
      room: rows[0],
    };
  },

  async listDeathHistory(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, death_number, cause, enemy_type, location_room, checkpoint_restored, died_at
       FROM death_history
       WHERE save_slot_id = ?
       ORDER BY death_number DESC`,
      [saveSlotId]
    );
    return rows;
  },
};
