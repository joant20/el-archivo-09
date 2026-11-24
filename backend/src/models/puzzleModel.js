import { pool } from '../config/db.js';

export const puzzleModel = {
  async listSolved(saveSlotId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, puzzle_key, puzzle_title, solution_summary, location_room, solved_at
       FROM solved_puzzles
       WHERE save_slot_id = ?
       ORDER BY solved_at ASC`,
      [saveSlotId]
    );
    return rows;
  },

  async recordSolved(saveSlotId, puzzle, connection = pool) {
    const { puzzleKey, puzzleTitle, solutionSummary, locationRoom } = puzzle;

    const [result] = await connection.query(
      `INSERT IGNORE INTO solved_puzzles
         (save_slot_id, puzzle_key, puzzle_title, solution_summary, location_room)
       VALUES (?, ?, ?, ?, ?)`,
      [saveSlotId, puzzleKey, puzzleTitle, solutionSummary, locationRoom]
    );

    const [rows] = await connection.query(
      `SELECT id, puzzle_key, puzzle_title, solution_summary, location_room, solved_at
       FROM solved_puzzles
       WHERE save_slot_id = ? AND puzzle_key = ?
       LIMIT 1`,
      [saveSlotId, puzzleKey]
    );

    return {
      created: result.affectedRows > 0,
      puzzle: rows[0],
    };
  },
};
