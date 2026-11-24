import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, waitForDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import saveRoutes from './routes/saveRoutes.js';
import investigationRoutes from './routes/investigationRoutes.js';
import puzzleRoutes from './routes/puzzleRoutes.js';
import survivalRoutes from './routes/survivalRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT || 8080);

// Configuración CORS segura
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Endpoint de salud para Docker healthcheck y verificación rápida
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', service: 'el-archivo-09-backend', database: 'connected' });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      service: 'el-archivo-09-backend',
      database: 'disconnected',
      detail: error.message,
    });
  }
});

// Rutas de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/saves', saveRoutes);
app.use('/api/saves', investigationRoutes);
app.use('/api/saves', puzzleRoutes);
app.use('/api/saves', survivalRoutes);

// 404 para rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado en Archivo 09.' });
});

// Manejo centralizado de errores
app.use(errorHandler);

async function startServer() {
  try {
    await waitForDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[API] Servidor de EL ARCHIVO 09 activo en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[API] No se pudo conectar a MySQL. Cerrando servidor:', error.message);
    process.exit(1);
  }
}

startServer();
