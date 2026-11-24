import React, { useState, useEffect } from 'react';
import {
  FileText,
  Film,
  HelpCircle,
  KeyRound,
  LogOut,
  Play,
  Plus,
  ShieldAlert,
  Skull,
  Trash2,
  UserPlus,
  Loader2,
  Volume2,
  Keyboard,
} from 'lucide-react';
import { apiClient } from '../save-system/ApiClient.js';
import { soundEngine } from '../audio/SoundEngine.js';
import { IntroBriefingModal } from './IntroBriefingModal.jsx';
import { CinematicIntroTrailer } from './CinematicIntroTrailer.jsx';

export function MainMenu({ onStartSave }) {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saves, setSaves] = useState([]);
  const [newSlotName, setNewSlotName] = useState('Expediente #09-A');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const health = await apiClient.health();
        if (active) {
          setDbStatus(
            health.database === 'connected'
              ? 'connected'
              : health.mode === 'local'
              ? 'local'
              : 'degraded'
          );
        }
      } catch {
        if (active) setDbStatus('local');
      }

      if (apiClient.getToken()) {
        try {
          const meRes = await apiClient.me();
          if (active && meRes.user) {
            setUser(meRes.user);
            const listRes = await apiClient.listSaves();
            if (active) setSaves(listRes.saves || []);
          }
        } catch {
          apiClient.setToken(null);
        }
      }
      if (active) setLoading(false);
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function refreshSaves() {
    const listRes = await apiClient.listSaves();
    setSaves(listRes.saves || []);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    soundEngine.init();
    try {
      const res =
        authMode === 'register'
          ? await apiClient.register(username.trim(), password)
          : await apiClient.login(username.trim(), password);

      apiClient.setToken(res.token);
      setUser(res.user);
      setPassword('');
      await refreshSaves();
      soundEngine.playDiscovery();
    } catch (err) {
      soundEngine.playError();
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickGuest() {
    setError('');
    setSubmitting(true);
    soundEngine.init();
    try {
      const guestUser = 'investigador_invitado';
      const guestPass = 'archivo09_invitado';
      let res;
      try {
        res = await apiClient.login(guestUser, guestPass);
      } catch {
        res = await apiClient.register(guestUser, guestPass);
      }
      apiClient.setToken(res.token);
      setUser(res.user);
      const listRes = await apiClient.listSaves();
      const existing = listRes.saves || [];
      if (existing.length > 0) {
        setSaves(existing);
      } else {
        const created = await apiClient.createSave('Expediente #09');
        soundEngine.playCheckpoint();
        onStartSave(created.save);
      }
    } catch (err) {
      soundEngine.playError();
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSave(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    soundEngine.init();
    try {
      const res = await apiClient.createSave(newSlotName.trim() || 'Expediente #09');
      soundEngine.playCheckpoint();
      onStartSave(res.save);
    } catch (err) {
      soundEngine.playError();
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadSave(saveId) {
    setError('');
    setSubmitting(true);
    soundEngine.init();
    try {
      const res = await apiClient.getSave(saveId);
      soundEngine.playDoorUnlock();
      onStartSave(res.save);
    } catch (err) {
      soundEngine.playError();
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSave(saveId) {
    if (!window.confirm('¿Eliminar permanentemente este expediente y todo su historial?')) return;
    setError('');
    try {
      await apiClient.deleteSave(saveId);
      await refreshSaves();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    apiClient.setToken(null);
    setUser(null);
    setSaves([]);
  }

  return (
    <div className="relative w-full h-full overflow-y-auto bg-[#060709] text-[#dfd7c5]">
      {/* Fondo atmosférico con haz de luz tenue */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 28%, rgba(212,148,58,0.12) 0%, rgba(16,19,24,0.6) 38%, rgba(6,7,9,0.98) 76%)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 crt-scanlines opacity-25" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 min-h-full flex flex-col justify-between gap-8">
        {/* Cabecera superior */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfd7c5]/10 pb-4">
          <div className="flex items-center gap-3 font-mono text-xs tracking-widest uppercase text-[#948e80]">
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected'
                  ? 'bg-[#4d9e6f] shadow-[0_0_8px_#4d9e6f]'
                  : dbStatus === 'local' || dbStatus === 'checking'
                  ? 'bg-[#d4943a] shadow-[0_0_8px_#d4943a]'
                  : 'bg-[#a82929]'
              }`}
            />
            <span>
              {dbStatus === 'connected'
                ? 'RED ARCHIVO 09 // MYSQL SINCRONIZADO'
                : dbStatus === 'local'
                ? 'MODO WEB PORTÁTIL // GUARDADO LOCAL EN NAVEGADOR'
                : dbStatus === 'checking'
                ? 'VERIFICANDO ENLACE DE BASE DE DATOS...'
                : 'MODO LOCAL ACTIVO'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.init();
                setShowTrailer(true);
              }}
              className="btn-ghost text-[#f29191]"
            >
              <Film className="w-4 h-4" />
              Ver Tráiler
            </button>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="btn-ghost text-[#d4943a]"
            >
              <HelpCircle className="w-4 h-4" />
              Cómo Jugar
            </button>
            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              className="btn-ghost"
            >
              <Keyboard className="w-4 h-4" />
              Controles
            </button>
            {user && (
              <button type="button" onClick={handleLogout} className="btn-ghost text-[#d4943a]">
                <LogOut className="w-4 h-4" />
                {user.username}
              </button>
            )}
          </div>
        </header>

        {/* Cuerpo principal cinematográfico */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center my-auto">
          {/* Columna izquierda: Título, lore breve y atmósfera */}
          <section className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#a82929]/45 bg-[#a82929]/10 text-[#e07a7a] font-mono text-[11px] tracking-[0.25em] uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              Expediente Clasificado · Noviembre 1994
            </div>

            <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-[0.14em] text-[#ebe3d2] leading-tight animate-glitch">
              EL ARCHIVO
              <span className="block text-[#d4943a] mt-1">09</span>
            </h1>

            <p className="text-[#a8a192] text-base leading-relaxed max-w-xl">
              Despiertas sellado dentro de una instalación subterránea del Proyecto Mnemosyne.
              Explora las ocho salas, ilumina la oscuridad con tu linterna, descifra documentos y
              sobrevive a lo que patrulla los pasillos.
            </p>

            <div className="border-l-2 border-[#d4943a]/70 pl-4 py-1 text-sm text-[#c7bfb0] italic">
              “Tu cuerpo puede colapsar y reconstruirse en el último nodo... pero tu memoria y cada
              pista del Archivo de Investigación permanecen intactas.”
            </div>

            {showControls && (
              <div className="dossier-surface p-4 rounded-sm grid grid-cols-2 gap-3 text-xs font-mono">
                <div><span className="text-[#d4943a]">WASD / Flechas</span> — Caminar</div>
                <div><span className="text-[#d4943a]">Mouse (Clic)</span> — Cámara 360° Primera Persona</div>
                <div><span className="text-[#d4943a]">E</span> — Abrir puertas / Inspeccionar / Esconderse</div>
                <div><span className="text-[#d4943a]">F</span> — Encender / Apagar linterna 3D</div>
                <div><span className="text-[#d4943a]">Shift / C</span> — Correr / Agacharse (sigilo)</div>
                <div><span className="text-[#d4943a]">Q</span> — Lanzar bengala distractora</div>
                <div><span className="text-[#d4943a]">TAB</span> — Archivo de Investigación</div>
                <div><span className="text-[#d4943a]">I / ESC</span> — Inventario / Pausa</div>
              </div>
            )}
          </section>

          {/* Columna derecha: Autenticación o Selector de Partidas */}
          <section className="lg:col-span-6">
            <div className="dossier-surface rounded-sm p-6 sm:p-8 space-y-6">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-3 text-[#948e80]">
                  <Loader2 className="w-7 h-7 animate-spin text-[#d4943a]" />
                  <span className="font-mono text-xs tracking-widest uppercase">
                    Desencriptando credenciales...
                  </span>
                </div>
              ) : !user ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#dfd7c5]/10 pb-4">
                    <div>
                      <h2 className="font-display text-xl tracking-wider text-[#ebe3d2]">
                        {authMode === 'login' ? 'ACCESO DE INVESTIGADOR' : 'NUEVO EXPEDIENTE'}
                      </h2>
                      <p className="text-xs text-[#948e80] mt-1">
                        Tu progreso permanente se guarda en MySQL.
                      </p>
                    </div>
                    <div className="flex gap-1 bg-[#0a0c10] p-1 rounded-sm border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setError('');
                        }}
                        className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm transition ${
                          authMode === 'login'
                            ? 'bg-[#d4943a] text-[#090a0c] font-bold'
                            : 'text-[#948e80] hover:text-[#dfd7c5]'
                        }`}
                      >
                        Entrar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setError('');
                        }}
                        className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm transition ${
                          authMode === 'register'
                            ? 'bg-[#d4943a] text-[#090a0c] font-bold'
                            : 'text-[#948e80] hover:text-[#dfd7c5]'
                        }`}
                      >
                        Registrar
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-[#a82929]/20 border border-[#a82929]/50 text-[#f3b0b0] text-xs font-mono">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#948e80] mb-1.5">
                        Identificador de Investigador *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={40}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ej: agente_vance"
                        className="w-full px-3.5 py-2.5 bg-[#090b0f] border border-[#dfd7c5]/20 rounded-sm text-sm text-[#dfd7c5] focus:outline-none focus:border-[#d4943a]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#948e80] mb-1.5">
                        Clave de Acceso *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full px-3.5 py-2.5 bg-[#090b0f] border border-[#dfd7c5]/20 rounded-sm text-sm text-[#dfd7c5] focus:outline-none focus:border-[#d4943a]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full mt-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : authMode === 'register' ? (
                        <UserPlus className="w-4 h-4" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {authMode === 'register' ? 'Registrar e Ingresar' : 'Iniciar Sesión'}
                    </button>

                    <div className="pt-2 border-t border-[#dfd7c5]/10">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleQuickGuest}
                        className="btn-secondary w-full text-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-[#d4943a]" />
                        Jugar Ahora (Acceso Rápido)
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-[#dfd7c5]/10 pb-4">
                    <div>
                      <h2 className="font-display text-xl tracking-wider text-[#ebe3d2]">
                        EXPEDIENTES ACTIVOS
                      </h2>
                      <p className="text-xs text-[#948e80] mt-0.5">
                        Investigador: <span className="text-[#d4943a] font-mono">{user.username}</span>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-[#a82929]/20 border border-[#a82929]/50 text-[#f3b0b0] text-xs font-mono">
                      {error}
                    </div>
                  )}

                  {/* Crear nueva partida */}
                  <form onSubmit={handleCreateSave} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newSlotName}
                      onChange={(e) => setNewSlotName(e.target.value)}
                      maxLength={80}
                      placeholder="Nombre de la nueva partida..."
                      className="flex-1 px-3 py-2 bg-[#090b0f] border border-[#dfd7c5]/20 rounded-sm text-sm text-[#dfd7c5] focus:outline-none focus:border-[#d4943a]"
                    />
                    <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap">
                      <Plus className="w-4 h-4" />
                      Nueva Partida
                    </button>
                  </form>

                  {/* Lista de partidas guardadas */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {saves.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-[#dfd7c5]/15 rounded-sm text-[#948e80] text-xs font-mono">
                        Aún no tienes partidas guardadas. Crea un expediente para iniciar el descenso.
                      </div>
                    ) : (
                      saves.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-3.5 bg-[#0b0e13] border border-[#dfd7c5]/12 hover:border-[#d4943a]/50 rounded-sm flex items-center justify-between gap-3 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#ebe3d2] truncate">
                                {slot.slot_name}
                              </span>
                              {slot.ending_reached && (
                                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#4d9e6f]/20 text-[#79d9a1] border border-[#4d9e6f]/40">
                                  Completado
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-mono text-[#948e80]">
                              <span className="inline-flex items-center gap-1">
                                <FileText className="w-3 h-3 text-[#d4943a]" />
                                {slot.total_discoveries} pistas
                              </span>
                              <span>{slot.total_puzzles_solved}/5 enigmas</span>
                              <span className="inline-flex items-center gap-1 text-[#d66d6d]">
                                <Skull className="w-3 h-3" />
                                {slot.death_count} muertes
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleLoadSave(slot.id)}
                              className="btn-secondary py-1.5 px-3 text-xs"
                            >
                              <Play className="w-3.5 h-3.5 text-[#d4943a]" />
                              Continuar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSave(slot.id)}
                              title="Eliminar expediente"
                              className="p-2 text-[#948e80] hover:text-[#e06363] hover:bg-[#a82929]/15 rounded-sm transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </main>

        {/* Pie */}
        <footer className="flex items-center justify-between text-[11px] font-mono text-[#6f6a5f] border-t border-[#dfd7c5]/10 pt-4">
          <span>THREE.JS 3D FPS · REACT · EXPRESS · MYSQL 8.4 · DOCKER</span>
          <span className="inline-flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#d4943a]" />
            Recomendado jugar con audio activado
          </span>
        </footer>
      </div>
      {showTrailer && (
        <CinematicIntroTrailer
          onFinish={() => setShowTrailer(false)}
          onOpenControls={() => {
            setShowTrailer(false);
            setShowGuide(true);
          }}
        />
      )}
      {showGuide && <IntroBriefingModal isFirstStart={false} onClose={() => setShowGuide(false)} />}
    </div>
  );
}
