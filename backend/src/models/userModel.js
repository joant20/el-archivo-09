import { pool } from '../config/db.js';

export const userModel = {
  async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async create(username, passwordHash) {
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );
    return { id: result.insertId, username };
  },
};
