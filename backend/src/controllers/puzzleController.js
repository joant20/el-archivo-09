import { saveModel } from '../models/saveModel.js';
import { puzzleModel } from '../models/puzzleModel.js';

export const puzzleController = {
  async solve(req, res, next) {
    try {
      const saveId = Number(req.params.saveId);
      const owned = await saveModel.findOwnedSlot(saveId, req.user.id);
      if (!owned) {
        return res.status(404).json({ error: 'Partida no encontrada.' });
      }

      const { puzzleKey, puzzleTitle, solutionSummary, locationRoom } = req.body;
      if (!puzzleKey || !puzzleTitle || !solutionSummary || !locationRoom) {
        return res.status(400).json({ error: 'Faltan datos para registrar el enigma resuelto.' });
      }

      const result = await puzzleModel.recordSolved(saveId, {
        puzzleKey: String(puzzleKey).slice(0, 100),
        puzzleTitle: String(puzzleTitle).slice(0, 180),
        solutionSummary: String(solutionSummary).slice(0, 255),
        locationRoom: String(locationRoom).slice(0, 100),
      });

      return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
