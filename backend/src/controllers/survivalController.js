import { saveModel } from '../models/saveModel.js';
import { survivalModel } from '../models/survivalModel.js';
import { deathMemoryService } from '../services/deathMemoryService.js';

export const survivalController = {
  async updateSurvival(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const updated = await survivalModel.updateSurvivalState(saveId, req.body);
      return res.json({ survival: updated });
    } catch (error) {
      return next(error);
    }
  },

  async saveCheckpoint(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const { checkpointKey, roomKey, posX, posY, hp, sanity, battery, consumables, keyItems } = req.body;
      if (!checkpointKey || !roomKey || typeof posX !== 'number' || typeof posY !== 'number') {
        return res.status(400).json({ error: 'Datos de punto de control incompletos.' });
      }

      const checkpoint = await survivalModel.saveCheckpoint(saveId, {
        checkpointKey,
        roomKey,
        posX,
        posY,
        hp,
        sanity,
        battery,
        consumables,
        keyItems,
      });

      return res.json({ checkpoint });
    } catch (error) {
      return next(error);
    }
  },

  async registerDeath(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const { cause, enemyType, locationRoom } = req.body;

      const restoredSave = await deathMemoryService.handlePlayerDeath(saveId, req.user.id, {
        cause,
        enemyType,
        locationRoom,
      });

      if (!restoredSave) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      return res.json({ save: restoredSave });
    } catch (error) {
      return next(error);
    }
  },
};
