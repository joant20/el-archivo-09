import { apiClient } from './ApiClient.js';
import { eventBus } from '../game/EventBus.js';

/**
 * Orquestador central de las 3 capas de estado en el cliente:
 *  - Capa A (permanent): Archivo de Investigación, enigmas resueltos, habitaciones e historial de muertes.
 *  - Capa B (survival): Salud, cordura, batería, consumibles y posición en tiempo real.
 *  - Capa C (checkpoint): Último Nodo de Estabilización guardado.
 */
class SaveStateManager {
  constructor() {
    this.state = null;
    this.saveId = null;
    this.syncTimer = null;
  }

  setLoadedSave(fullSave) {
    this.state = fullSave;
    this.saveId = fullSave?.meta?.id || null;
    this.emitUpdate();
  }

  clear() {
    this.state = null;
    this.saveId = null;
    this.emitUpdate();
  }

  getState() {
    return this.state;
  }

  hasEntry(entryKey) {
    return Boolean(
      this.state?.permanent?.investigationEntries?.some((e) => e.entry_key === entryKey)
    );
  }

  isPuzzleSolved(puzzleKey) {
    return Boolean(
      this.state?.permanent?.solvedPuzzles?.some((p) => p.puzzle_key === puzzleKey)
    );
  }

  hasKeyItem(itemKey) {
    return Boolean(this.state?.survival?.keyItems?.includes(itemKey));
  }

  emitUpdate() {
    eventBus.emit('save:updated', this.state);
  }

  async recordDiscovery(entry) {
    if (!this.saveId || !this.state) return { created: false };

    // Evita tráfico innecesario si ya está registrado en Capa A
    if (this.hasEntry(entry.entryKey)) {
      return { created: false };
    }

    const result = await apiClient.recordInvestigation(this.saveId, entry);
    if (result.created && result.entry) {
      this.state = {
        ...this.state,
        permanent: {
          ...this.state.permanent,
          investigationEntries: [...this.state.permanent.investigationEntries, result.entry],
        },
      };
      this.emitUpdate();
    }
    return result;
  }

  async resolveClue(entryKey) {
    if (!this.saveId || !this.state) return;
    await apiClient.resolveClue(this.saveId, entryKey);
    this.state = {
      ...this.state,
      permanent: {
        ...this.state.permanent,
        investigationEntries: this.state.permanent.investigationEntries.map((item) =>
          item.entry_key === entryKey ? { ...item, is_resolved: true } : item
        ),
      },
    };
    this.emitUpdate();
  }

  async recordRoomVisit(roomKey, roomName) {
    if (!this.saveId || !this.state) return { isFirstVisit: false };
    const result = await apiClient.recordRoomVisit(this.saveId, roomKey, roomName);
    if (result.room) {
      const existing = this.state.permanent.exploredRooms.filter((r) => r.room_key !== roomKey);
      this.state = {
        ...this.state,
        permanent: {
          ...this.state.permanent,
          exploredRooms: [...existing, result.room],
        },
      };
      this.emitUpdate();
    }
    return result;
  }

  async recordPuzzleSolved(puzzlePayload) {
    if (!this.saveId || !this.state) return { created: false };
    if (this.isPuzzleSolved(puzzlePayload.puzzleKey)) return { created: false };

    const result = await apiClient.solvePuzzle(this.saveId, puzzlePayload);
    if (result.created && result.puzzle) {
      this.state = {
        ...this.state,
        permanent: {
          ...this.state.permanent,
          solvedPuzzles: [...this.state.permanent.solvedPuzzles, result.puzzle],
        },
      };
      this.emitUpdate();
    }
    return result;
  }

  async syncSurvival(partialSurvival) {
    if (!this.saveId || !this.state) return;
    const res = await apiClient.updateSurvival(this.saveId, partialSurvival);
    if (res.survival) {
      this.state = {
        ...this.state,
        survival: res.survival,
      };
      this.emitUpdate();
    }
  }

  async activateCheckpoint(checkpointPayload) {
    if (!this.saveId || !this.state) return null;
    const res = await apiClient.saveCheckpoint(this.saveId, checkpointPayload);
    const refreshed = await apiClient.getSave(this.saveId);
    this.setLoadedSave(refreshed.save);
    return res.checkpoint;
  }

  async triggerDeath(deathInfo) {
    if (!this.saveId || !this.state) return null;
    const res = await apiClient.registerDeath(this.saveId, deathInfo);
    if (res.save) {
      this.setLoadedSave(res.save);
      return res.save;
    }
    return null;
  }

  async recordEnding(endingKey, playTimeSeconds) {
    if (!this.saveId || !this.state) return null;
    const res = await apiClient.updateSaveMeta(this.saveId, {
      endingReached: endingKey,
      playTimeSeconds,
    });
    if (res.save) {
      this.setLoadedSave(res.save);
      return res.save;
    }
    return null;
  }
}

export const saveStateManager = new SaveStateManager();
