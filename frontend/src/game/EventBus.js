/**
 * EventBus ligero para comunicar Phaser 3 (mundo 2D) con React (UI cinematográfica).
 * Mantiene desacoplada la lógica del juego de los componentes visuales.
 */
class GameEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.delete(callback);
    }
  }

  emit(eventName, payload) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error en listener de "${eventName}":`, err);
      }
    });
  }
}

export const eventBus = new GameEventBus();
