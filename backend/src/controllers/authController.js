import bcrypt from 'bcryptjs';
import { userModel } from '../models/userModel.js';
import { signAuthToken } from '../middleware/authMiddleware.js';

export const authController = {
  async register(req, res, next) {
    try {
      const username = String(req.body.username || '').trim();
      const password = String(req.body.password || '');

      if (username.length < 3 || username.length > 40) {
        return res.status(400).json({ error: 'El nombre de investigador debe tener entre 3 y 40 caracteres.' });
      }
      if (password.length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
      }

      const existing = await userModel.findByUsername(username);
      if (existing) {
        return res.status(409).json({ error: 'Ese nombre de investigador ya está registrado.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userModel.create(username, passwordHash);
      const token = signAuthToken(user);

      return res.status(201).json({ token, user });
    } catch (error) {
      return next(error);
    }
  },

  async login(req, res, next) {
    try {
      const username = String(req.body.username || '').trim();
      const password = String(req.body.password || '');

      if (!username || !password) {
        return res.status(400).json({ error: 'Debes ingresar usuario y contraseña.' });
      }

      const user = await userModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const token = signAuthToken(user);
      return res.json({
        token,
        user: { id: user.id, username: user.username, created_at: user.created_at },
      });
    } catch (error) {
      return next(error);
    }
  },

  async me(req, res, next) {
    try {
      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      return res.json({ user });
    } catch (error) {
      return next(error);
    }
  },
};
