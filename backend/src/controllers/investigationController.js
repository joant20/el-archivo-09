import { saveModel } from '../models/saveModel.js';
import { investigationModel } from '../models/investigationModel.js';

const ALLOWED_CATEGORIES = new Set(['document', 'photo', 'recording', 'code', 'clue', 'event']);

export const investigationController = {
  async recordEntry(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const { entryKey, category, title, description, contentData, locationRoom, isResolved } = req.body;
      if (!entryKey || !ALLOWED_CATEGORIES.has(category) || !title || !description || !locationRoom) {
        return res.status(400).json({
          error: 'Datos de investigación incompletos o categoría inválida.',
        });
      }

      const result = await investigationModel.recordEntry(saveId, {
        entryKey: String(entryKey).slice(0, 100),
        category,
        title: String(title).slice(0, 180),
        description: String(description),
        contentData: contentData ?? null,
        locationRoom: String(locationRoom).slice(0, 100),
        isResolved: Boolean(isResolved),
      });

      return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async resolveClue(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const { entryKey } = req.params;
      const updated = await investigationModel.markClueResolved(saveId, entryKey);
      return res.json({ resolved: updated, entryKey });
    } catch (error) {
      return next(error);
    }
  },

  async recordRoomVisit(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const { roomKey, roomName } = req.body;
      if (!roomKey || !roomName) {
        return res.status(400).json({ error: 'Se requieren roomKey y roomName.' });
      }

      const result = await investigationModel.recordRoomVisit(
        saveId,
        String(roomKey).slice(0, 64),
        String(roomName).slice(0, 120)
      );
      return res.status(result.isFirstVisit ? 201 : 200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
