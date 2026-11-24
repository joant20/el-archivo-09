export function errorHandler(err, req, res, _next) {
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe en la base de datos.' });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({
    error: status === 500 ? 'Error interno del servidor en Archivo 09.' : err.message,
  });
}
