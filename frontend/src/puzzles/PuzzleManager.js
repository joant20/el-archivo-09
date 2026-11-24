import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { saveStateManager } from '../save-system/SaveStateManager.js';
import { soundEngine } from '../audio/SoundEngine.js';
import { eventBus } from '../game/EventBus.js';

/**
 * Consolida la resolución de cualquiera de los 5 enigmas en Capa A (permanente):
 * - Registra en solved_puzzles (sin duplicados)
 * - Resuelve las pistas pendientes vinculadas
 * - Añade códigos/grabaciones de recompensa al Archivo de Investigación
 * - Entrega objetos clave o suministros si corresponde
 */
export const puzzleManager = {
  async completePuzzle(puzzleKey) {
    const def = PUZZLES_CATALOG[puzzleKey];
    if (!def) return;

    await saveStateManager.recordPuzzleSolved({
      puzzleKey: def.puzzleKey,
      puzzleTitle: def.title,
      solutionSummary: def.solutionSummary,
      locationRoom: def.locationRoom,
    });

    if (Array.isArray(def.resolvesClues)) {
      for (const clueKey of def.resolvesClues) {
        await saveStateManager.resolveClue(clueKey);
      }
    }

    if (def.rewardCode) {
      await saveStateManager.recordDiscovery({
        ...def.rewardCode,
        isResolved: true,
      });
    }

    if (def.rewardRecording) {
      await saveStateManager.recordDiscovery({
        ...def.rewardRecording,
        isResolved: true,
      });
    }

    if (def.rewardKeyItem || def.rewardConsumables) {
      const currentSurvival = saveStateManager.getState()?.survival || {};
      const nextKeyItems = def.rewardKeyItem
        ? Array.from(new Set([...(currentSurvival.keyItems || []), def.rewardKeyItem]))
        : currentSurvival.keyItems || [];

      const nextConsumables = { ...(currentSurvival.consumables || {}) };
      if (def.rewardConsumables) {
        Object.entries(def.rewardConsumables).forEach(([k, qty]) => {
          nextConsumables[k] = (nextConsumables[k] || 0) + qty;
        });
      }

      await saveStateManager.syncSurvival({
        keyItems: nextKeyItems,
        consumables: nextConsumables,
      });
    }

    soundEngine.playPuzzleSolved();
    eventBus.emit('ui:toast', {
      kind: 'success',
      title: 'ENIGMA RESUELTO (PERMANENTE)',
      message: def.solutionSummary,
    });
  },
};
