import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_fallback_change_in_env';

export function signAuthToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión como investigador.' });
  }

  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada o token inválido. Vuelve a iniciar sesión.' });
  }
}
