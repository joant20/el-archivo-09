import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FacilityWorld3D } from './engine3d/FacilityWorld3D.js';
import { eventBus } from './game/EventBus.js';
import { saveStateManager } from './save-system/SaveStateManager.js';
import { MainMenu } from './scenes/MainMenu.jsx';
import { GameHUD } from './scenes/GameHUD.jsx';
import { PauseModal } from './scenes/PauseModal.jsx';
import { DeathScreen } from './scenes/DeathScreen.jsx';
import { EndingScreen } from './scenes/EndingScreen.jsx';
import { IntroBriefingModal } from './scenes/IntroBriefingModal.jsx';
import { CinematicIntroTrailer } from './scenes/CinematicIntroTrailer.jsx';
import { DossierModal } from './investigation/DossierModal.jsx';
import { InventoryModal } from './inventory/InventoryModal.jsx';
import { TerminalPuzzleModal } from './puzzles/TerminalPuzzleModal.jsx';
import { SafePuzzleModal } from './puzzles/SafePuzzleModal.jsx';
import { GeneratorPuzzleModal } from './puzzles/GeneratorPuzzleModal.jsx';
import { TapePuzzleModal } from './puzzles/TapePuzzleModal.jsx';
import { CoreSealPuzzleModal } from './puzzles/CoreSealPuzzleModal.jsx';

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [saveState, setSaveState] = useState(null);
  const [hudStats, setHudStats] = useState(null);
  const [crosshairTarget, setCrosshairTarget] = useState(null);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Overlays activos (el juego 3D pausa automáticamente y libera el puntero al abrirlos)
  const [activeOverlay, setActiveOverlay] = useState(null); // 'dossier' | 'inventory' | 'pause' | 'puzzle' | 'ending' | 'guide'
  const [isFirstBriefing, setIsFirstBriefing] = useState(false);
  const [dossierEntryKey, setDossierEntryKey] = useState(null);
  const [activePuzzleKey, setActivePuzzleKey] = useState(null);
  const [deathData, setDeathData] = useState(null);
  const [endingMeta, setEndingMeta] = useState(null);

  const canvasContainerRef = useRef(null);
  const world3DRef = useRef(null);

  useEffect(() => {
    if (!inGame) return;
    const paused = Boolean(activeOverlay || deathData);
    eventBus.emit('game:setPaused', paused);
  }, [inGame, activeOverlay, deathData]);

  // Suscripción a eventos del mundo 3D -> React UI
  useEffect(() => {
    const offs = [
      eventBus.on('save:updated', (nextSave) => setSaveState(nextSave)),
      eventBus.on('hud:stats', (stats) => setHudStats(stats)),
      eventBus.on('hud:crosshairTarget', (target) => setCrosshairTarget(target)),
      eventBus.on('fps:pointerLock', (locked) => setPointerLocked(Boolean(locked))),
      eventBus.on('ui:toast', (toast) => {
        const id = `${Date.now()}_${Math.random()}`;
        setToasts((prev) => [...prev.slice(-2), { id, ...toast }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4400);
      }),
      eventBus.on('ui:openDossierEntry', (entryKey) => {
        setDossierEntryKey(entryKey);
        setActiveOverlay('dossier');
      }),
      eventBus.on('ui:openPuzzle', (puzzleKey) => {
        setActivePuzzleKey(puzzleKey);
        setActiveOverlay('puzzle');
      }),
      eventBus.on('ui:openEndingChoice', (meta) => {
        setEndingMeta(meta);
        setActiveOverlay('ending');
      }),
      eventBus.on('game:playerDied', (payload) => {
        setActiveOverlay(null);
        setDeathData(payload);
        if (payload.save) setSaveState(payload.save);
      }),
    ];

    return () => offs.forEach((off) => off());
  }, []);

  // Montar/destruir motor 3D Three.js
  useEffect(() => {
    if (!inGame || !canvasContainerRef.current) return;

    const world = new FacilityWorld3D(canvasContainerRef.current);
    world3DRef.current = world;

    return () => {
      world.dispose();
      world3DRef.current = null;
    };
  }, [inGame]);

  // Atajos globales de teclado (TAB = Archivo, I = Inventario, ESC = Pausa / Cerrar modal)
  useEffect(() => {
    if (!inGame) return;

    const handleKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          setActiveOverlay(null);
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setDossierEntryKey(null);
        setActiveOverlay((prev) => (prev === 'dossier' ? null : 'dossier'));
      } else if (e.key === 'i' || e.key === 'I') {
        if (deathData) return;
        e.preventDefault();
        setActiveOverlay((prev) => (prev === 'inventory' ? null : 'inventory'));
      } else if (e.key === 'h' || e.key === 'H') {
        if (deathData) return;
        e.preventDefault();
        setIsFirstBriefing(false);
        setActiveOverlay((prev) => (prev === 'guide' ? null : 'guide'));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeOverlay) {
          setActiveOverlay(null);
        } else if (!deathData) {
          setActiveOverlay('pause');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inGame, activeOverlay, deathData]);

  const handleStartSave = useCallback((loadedSave) => {
    saveStateManager.setLoadedSave(loadedSave);
    setSaveState(loadedSave);
    setDeathData(null);
    const isFresh =
      (loadedSave?.permanent?.investigationEntries?.length || 0) <= 1 &&
      (loadedSave?.meta?.death_count || 0) === 0;
    setIsFirstBriefing(isFresh);
    setActiveOverlay(isFresh ? 'trailer' : null);
    setCrosshairTarget(null);
    setInGame(true);
  }, []);

  const handleExitToMenu = useCallback(() => {
    setInGame(false);
    setActiveOverlay(null);
    setDeathData(null);
    setHudStats(null);
    setCrosshairTarget(null);
    setPointerLocked(false);
    saveStateManager.clear();
  }, []);

  const handleCloseModalAndResume = useCallback(() => {
    setActiveOverlay(null);
    setTimeout(() => eventBus.emit('fps:requestLock'), 40);
  }, []);

  const handleRespawn = useCallback(() => {
    setDeathData(null);
    setActiveOverlay(null);
    eventBus.emit('game:respawnFromCheckpoint');
    setTimeout(() => eventBus.emit('fps:requestLock'), 60);
  }, []);

  const isSolved = (puzzleKey) =>
    Boolean(saveState?.permanent?.solvedPuzzles?.some((p) => p.puzzle_key === puzzleKey));

  return (
    <div className="relative w-full h-full bg-[#030406] overflow-hidden">
      <div className="film-grain" />

      {!inGame ? (
        <MainMenu onStartSave={handleStartSave} />
      ) : (
        <>
          {/* Escena 3D WebGL2 en Primera Persona (Three.js) */}
          <div ref={canvasContainerRef} className="w-full h-full cursor-crosshair" />

          {/* HUD ultra-discreto */}
          {!deathData && (
            <GameHUD
              hudStats={hudStats}
              crosshairTarget={crosshairTarget}
              pointerLocked={pointerLocked}
              saveState={saveState}
              toasts={toasts}
              onRequestPointerLock={() => eventBus.emit('fps:requestLock')}
              onOpenDossier={() => {
                setDossierEntryKey(null);
                setActiveOverlay('dossier');
              }}
              onOpenInventory={() => setActiveOverlay('inventory')}
              onOpenGuide={() => {
                setIsFirstBriefing(false);
                setActiveOverlay('guide');
              }}
              onOpenPause={() => setActiveOverlay('pause')}
            />
          )}

          {/* Tráiler Cinematográfico de Introducción (al iniciar Nueva Partida) */}
          {activeOverlay === 'trailer' && (
            <CinematicIntroTrailer
              onFinish={handleCloseModalAndResume}
              onOpenControls={() => {
                setIsFirstBriefing(true);
                setActiveOverlay('guide');
              }}
            />
          )}

          {/* Expediente de Inducción / Cómo Jugar [H] */}
          {activeOverlay === 'guide' && (
            <IntroBriefingModal
              isFirstStart={isFirstBriefing}
              onClose={handleCloseModalAndResume}
            />
          )}

          {/* Pantalla de Muerte con acceso al Archivo */}
          {deathData && activeOverlay !== 'dossier' && (
            <DeathScreen
              deathData={deathData}
              saveState={saveState}
              onOpenDossier={() => {
                setDossierEntryKey(null);
                setActiveOverlay('dossier');
              }}
              onRespawn={handleRespawn}
            />
          )}

          {/* Archivo de Investigación [TAB] */}
          {activeOverlay === 'dossier' && (
            <DossierModal
              saveState={saveState}
              initialEntryKey={dossierEntryKey}
              onClose={() => {
                setActiveOverlay(null);
                if (!deathData) setTimeout(() => eventBus.emit('fps:requestLock'), 40);
              }}
            />
          )}

          {/* Inventario Visual [I] */}
          {activeOverlay === 'inventory' && (
            <InventoryModal
              saveState={saveState}
              onUseConsumable={(itemKey) => eventBus.emit('inventory:useConsumable', itemKey)}
              onClose={handleCloseModalAndResume}
            />
          )}

          {/* Menú de Pausa [ESC] */}
          {activeOverlay === 'pause' && (
            <PauseModal
              onResume={handleCloseModalAndResume}
              onOpenDossier={() => {
                setDossierEntryKey(null);
                setActiveOverlay('dossier');
              }}
              onOpenGuide={() => {
                setIsFirstBriefing(false);
                setActiveOverlay('guide');
              }}
              onExitToMenu={handleExitToMenu}
            />
          )}

          {/* Los 5 Enigmas Deductivos */}
          {activeOverlay === 'puzzle' && activePuzzleKey === 'puzzle_terminal_seguridad' && (
            <TerminalPuzzleModal
              isSolved={isSolved('puzzle_terminal_seguridad')}
              onClose={handleCloseModalAndResume}
            />
          )}
          {activeOverlay === 'puzzle' && activePuzzleKey === 'puzzle_caja_fuerte' && (
            <SafePuzzleModal
              isSolved={isSolved('puzzle_caja_fuerte')}
              onClose={handleCloseModalAndResume}
            />
          )}
          {activeOverlay === 'puzzle' && activePuzzleKey === 'puzzle_generadores' && (
            <GeneratorPuzzleModal
              isSolved={isSolved('puzzle_generadores')}
              onClose={handleCloseModalAndResume}
            />
          )}
          {activeOverlay === 'puzzle' && activePuzzleKey === 'puzzle_cinta_vance' && (
            <TapePuzzleModal
              isSolved={isSolved('puzzle_cinta_vance')}
              onClose={handleCloseModalAndResume}
            />
          )}
          {activeOverlay === 'puzzle' && activePuzzleKey === 'puzzle_core_seal' && (
            <CoreSealPuzzleModal
              isSolved={isSolved('puzzle_core_seal')}
              hasPower={isSolved('puzzle_generadores')}
              onClose={handleCloseModalAndResume}
            />
          )}

          {/* Consola de Decisión Final / 2 Epílogos */}
          {activeOverlay === 'ending' && (
            <EndingScreen
              playTimeSeconds={endingMeta?.playTimeSeconds || 0}
              saveState={saveState}
              onClose={handleCloseModalAndResume}
              onExitToMenu={handleExitToMenu}
            />
          )}
        </>
      )}
    </div>
  );
}
