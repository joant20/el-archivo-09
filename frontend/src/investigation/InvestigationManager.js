import { INVESTIGATION_CATALOG } from '../data/investigationData.js';
import { saveStateManager } from '../save-system/SaveStateManager.js';
import { eventBus } from '../game/EventBus.js';
import { soundEngine } from '../audio/SoundEngine.js';

/**
 * Coordina el registro en el ARCHIVO DE INVESTIGACIÓN (Capa A),
 * asegurando notificaciones cinematográficas y desbloqueo de códigos/pistas vinculadas.
 */
export const investigationManager = {
  async discoverByKey(entryKey) {
    const def = INVESTIGATION_CATALOG[entryKey];
    if (!def) return false;

    const alreadyHad = saveStateManager.hasEntry(entryKey);
    const res = await saveStateManager.recordDiscovery({
      entryKey: def.entryKey,
      category: def.category,
      title: def.title,
      description: def.description,
      contentData: def.contentData || null,
      locationRoom: def.locationRoom,
      isResolved: def.isResolved ?? true,
    });

    if (res.created) {
      soundEngine.playDiscovery();
      eventBus.emit('ui:toast', {
        kind: 'discovery',
        title: 'REGISTRADO EN ARCHIVO DE INVESTIGACIÓN',
        message: `${def.title} (${def.locationRoom})`,
      });
    } else if (alreadyHad) {
      eventBus.emit('ui:toast', {
        kind: 'info',
        title: 'YA DOCUMENTADO',
        message: `"${def.title}" ya figura en tu expediente [TAB].`,
      });
    }

    // Si este documento desbloquea una pista pendiente, la añadimos automáticamente
    if (def.unlocksClue && INVESTIGATION_CATALOG[def.unlocksClue]) {
      const clueDef = INVESTIGATION_CATALOG[def.unlocksClue];
      await saveStateManager.recordDiscovery({
        entryKey: clueDef.entryKey,
        category: 'clue',
        title: clueDef.title,
        description: clueDef.description,
        locationRoom: clueDef.locationRoom,
        isResolved: false,
      });
    }

    // Si revela un código directo, lo registramos en la pestaña Códigos
    if (def.unlocksCode) {
      await saveStateManager.recordDiscovery({
        entryKey: def.unlocksCode.entryKey,
        category: 'code',
        title: def.unlocksCode.title,
        description: def.unlocksCode.description,
        contentData: def.unlocksCode.contentData || null,
        locationRoom: def.unlocksCode.locationRoom,
        isResolved: true,
      });
    }

    return res.created;
  },
};
