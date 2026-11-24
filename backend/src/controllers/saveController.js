import { saveModel } from '../models/saveModel.js';
import { deathMemoryService } from '../services/deathMemoryService.js';

export const saveController = {
  async list(req, res, next) {
    try {
      const saves = await saveModel.listByUser(req.user.id);
      return res.json({ saves });
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const rawName = String(req.body.slotName || 'Expediente #09').trim();
      const slotName = rawName.length > 0 ? rawName.slice(0, 80) : 'Expediente #09';

      const saveId = await saveModel.createSlot(req.user.id, slotName);
      const state = await deathMemoryService.loadFullSaveState(saveId, req.user.id);
      return res.status(201).json({ save: state });
    } catch (error) {
      return next(error);
    }
  },

  async getOne(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      if (!Number.isInteger(saveId) || saveId <= 0) {
        return res.status(400).json({ error: 'ID de partida inválido.' });
      }

      const state = await deathMemoryService.loadFullSaveState(saveId, req.user.id);
      if (!state) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }
      return res.json({ save: state });
    } catch (error) {
      return next(error);
    }
  },

  async updateMeta(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      await saveModel.updateMeta(saveId, {
        playTimeSeconds: req.body.playTimeSeconds,
        endingReached: req.body.endingReached,
      });

      const state = await deathMemoryService.loadFullSaveState(saveId, req.user.id);
      return res.json({ save: state });
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const deleted = await saveModel.deleteSlot(saveId, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }
      return res.json({ deleted: true });
    } catch (error) {
      return next(error);
    }
  },
};
