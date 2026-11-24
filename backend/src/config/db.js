import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones: reutiliza conexiones a MySQL en lugar de abrir y cerrar una nueva en cada petición
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'archivo09_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archivo09',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
});

/**
 * Espera a que MySQL esté listo para aceptar consultas.
 * Aunque Docker tenga healthcheck, reintentar aquí evita fallos al arrancar.
 */
export async function waitForDatabase(maxAttempts = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log(`[DB] Conexión a MySQL establecida correctamente (intento ${attempt}).`);
      return;
    } catch (error) {
      console.warn(`[DB] Esperando a MySQL (${attempt}/${maxAttempts}): ${error.message}`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
