import { localStorageBackend } from './LocalStorageBackend.js';

/**
 * Cliente HTTP hacia el backend Express + MySQL (/api).
 * Si el juego se publica como versión web portátil sin servidor backend (ej. Netlify / Vercel),
 * activa automáticamente el almacenamiento local preservando la misma separación de 3 capas.
 */
const TOKEN_KEY = 'archivo09_jwt_token';
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let storageMode = 'server'; // 'server' | 'local'

export const apiClient = {
  getMode() {
    return storageMode;
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Error de servidor (${response.status})`);
    }
    return data;
  },

  async health() {
    try {
      const res = await this.request('/health');
      if (res && res.database === 'connected') {
        storageMode = 'server';
        return { ...res, mode: 'server' };
      }
      storageMode = 'local';
      return { status: 'local', database: 'local', mode: 'local' };
    } catch {
      storageMode = 'local';
      return { status: 'local', database: 'local', mode: 'local' };
    }
  },

  // === Auth ===
  register(username, password) {
    if (storageMode === 'local') return localStorageBackend.register(username, password);
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  login(username, password) {
    if (storageMode === 'local') return localStorageBackend.login(username, password);
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    if (storageMode === 'local') return localStorageBackend.me(this.getToken());
    return this.request('/auth/me');
  },

  // === Partidas ===
  listSaves() {
    if (storageMode === 'local') return localStorageBackend.listSaves(this.getToken());
    return this.request('/saves');
  },
  createSave(slotName) {
    if (storageMode === 'local') return localStorageBackend.createSave(this.getToken(), slotName);
    return this.request('/saves', {
      method: 'POST',
      body: JSON.stringify({ slotName }),
    });
  },
  getSave(saveId) {
    if (storageMode === 'local') return localStorageBackend.getSave(this.getToken(), saveId);
    return this.request(`/saves/${saveId}`);
  },
  updateSaveMeta(saveId, meta) {
    if (storageMode === 'local') return localStorageBackend.updateSaveMeta(this.getToken(), saveId, meta);
    return this.request(`/saves/${saveId}/meta`, {
      method: 'PATCH',
      body: JSON.stringify(meta),
    });
  },
  deleteSave(saveId) {
    if (storageMode === 'local') return localStorageBackend.deleteSave(this.getToken(), saveId);
    return this.request(`/saves/${saveId}`, { method: 'DELETE' });
  },

  // === Capa A: Investigación Permanente ===
  recordInvestigation(saveId, entry) {
    if (storageMode === 'local') return localStorageBackend.recordInvestigation(this.getToken(), saveId, entry);
    return this.request(`/saves/${saveId}/investigation`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
  resolveClue(saveId, entryKey) {
    if (storageMode === 'local') return localStorageBackend.resolveClue(this.getToken(), saveId, entryKey);
    return this.request(`/saves/${saveId}/investigation/${encodeURIComponent(entryKey)}/resolve`, {
      method: 'PATCH',
    });
  },
  recordRoomVisit(saveId, roomKey, roomName) {
    if (storageMode === 'local') return localStorageBackend.recordRoomVisit(this.getToken(), saveId, roomKey, roomName);
    return this.request(`/saves/${saveId}/rooms/visit`, {
      method: 'POST',
      body: JSON.stringify({ roomKey, roomName }),
    });
  },
  solvePuzzle(saveId, puzzle) {
    if (storageMode === 'local') return localStorageBackend.solvePuzzle(this.getToken(), saveId, puzzle);
    return this.request(`/saves/${saveId}/puzzles/solve`, {
      method: 'POST',
      body: JSON.stringify(puzzle),
    });
  },

  // === Capa B & C: Supervivencia, Checkpoint y Muerte ===
  updateSurvival(saveId, survival) {
    if (storageMode === 'local') return localStorageBackend.updateSurvival(this.getToken(), saveId, survival);
    return this.request(`/saves/${saveId}/survival`, {
      method: 'PUT',
      body: JSON.stringify(survival),
    });
  },
  saveCheckpoint(saveId, checkpoint) {
    if (storageMode === 'local') return localStorageBackend.saveCheckpoint(this.getToken(), saveId, checkpoint);
    return this.request(`/saves/${saveId}/checkpoint`, {
      method: 'PUT',
      body: JSON.stringify(checkpoint),
    });
  },
  registerDeath(saveId, deathInfo) {
    if (storageMode === 'local') return localStorageBackend.registerDeath(this.getToken(), saveId, deathInfo);
    return this.request(`/saves/${saveId}/death`, {
      method: 'POST',
      body: JSON.stringify(deathInfo),
    });
  },
};
