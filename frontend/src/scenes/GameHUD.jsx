import React from 'react';
import {
  Activity,
  EyeOff,
  Flame,
  Flashlight,
  MousePointerClick,
} from 'lucide-react';

/**
 * HUD cinematográfico ultra-discreto inspirado en Resident Evil 7 y Silent Hill 2 Remake.
 * - Retícula central mínima que solo muestra el prompt [E] al apuntar a un objeto 3D interactuable.
 * - Sin cajas grandes permanentes ni menús administrativos tapando la inmersión.
 * - El Archivo de Investigación [TAB] y el Inventario [I] se abren bajo demanda.
 */
export function GameHUD({
  hudStats,
  crosshairTarget,
  pointerLocked,
  saveState,
  toasts,
  onRequestPointerLock,
  onOpenDossier,
  onOpenInventory,
  onOpenGuide,
  onOpenPause,
}) {
  const hp = hudStats?.hp ?? saveState?.survival?.hp ?? 100;
  const sanity = hudStats?.sanity ?? saveState?.survival?.sanity ?? 100;
  const battery = hudStats?.battery ?? saveState?.survival?.battery ?? 100;
  const danger = hudStats?.danger ?? 0;
  const isHiding = Boolean(hudStats?.isHiding);
  const consumables = saveState?.survival?.consumables || {};

  // Objetivo actual discreto y dinámico para que el jugador siempre sepa su siguiente paso
  const entries = saveState?.permanent?.investigationEntries || [];
  const solved = new Set((saveState?.permanent?.solvedPuzzles || []).map((p) => p.puzzle_key));
  const hasEntry = (k) => entries.some((e) => e.entry_key === k);
  const hasKey = (k) => (saveState?.survival?.keyItems || []).includes(k);

  let currentObjective = 'Inspecciona el Memorando en tu celda [E] y abre la puerta al Pasillo Central.';
  if (solved.has('puzzle_core_seal')) {
    currentObjective = 'Entra a la Cámara del Núcleo 09 al sur del pasillo y opera la Consola Central.';
  } else if (solved.has('puzzle_generadores') && solved.has('puzzle_cinta_vance') && hasEntry('code_protocolo_1')) {
    currentObjective = 'Usa los 3 Protocolos en el Sello del Núcleo 09 al sur del Pasillo Central.';
  } else if (hasKey('tarjeta_nivel_2') && !solved.has('puzzle_cinta_vance')) {
    currentObjective = 'Usa la Tarjeta Nivel 2 en Seguridad para entrar a la Oficina de la Dra. Vance y calibrar su cinta.';
  } else if (solved.has('puzzle_terminal_seguridad') && !solved.has('puzzle_caja_fuerte')) {
    currentObjective = 'Explora la Hemeroteca y la Enfermería para deducir el código de la Caja Fuerte en Seguridad.';
  } else if (!solved.has('puzzle_terminal_seguridad') && hasEntry('doc_memorando_ti')) {
    currentObjective = 'Busca la Placa de 1989 en el Pasillo Central y desbloquea la Terminal en Sala de Seguridad.';
  } else if (!solved.has('puzzle_generadores') && solved.has('puzzle_caja_fuerte')) {
    currentObjective = 'Baja por Enfermería a la Sala de Generadores y equilibra la red eléctrica a 120V.';
  }

  // Viñeta orgánica y pulso de sangre al recibir daño o acercarse una criatura
  const lowHpFactor = hp < 45 ? (45 - hp) / 45 : 0;
  const dangerIntensity = Math.min(0.9, danger * 0.65 + lowHpFactor * 0.75);
  const vignetteShadow =
    dangerIntensity > 0.14
      ? `inset 0 0 ${130 + dangerIntensity * 120}px rgba(135, 14, 22, ${0.38 + dangerIntensity * 0.48})`
      : 'inset 0 0 135px rgba(0, 0, 0, 0.78)';

  return (
    <>
      {/* Viñeta de terror psicológico */}
      <div className="horror-vignette" style={{ boxShadow: vignetteShadow }} />

      {/* Efecto visual de rejillas cuando estás escondido dentro de un casillero metálico */}
      {isHiding && (
        <div
          className="pointer-events-none fixed inset-0 z-20"
          style={{
            background:
              'linear-gradient(to bottom, rgba(4,5,7,0.94) 0%, rgba(4,5,7,0.94) 24%, transparent 26%, transparent 38%, rgba(4,5,7,0.92) 40%, rgba(4,5,7,0.92) 46%, transparent 48%, transparent 60%, rgba(4,5,7,0.94) 62%, rgba(4,5,7,0.94) 100%)',
          }}
        />
      )}

      {/* Retícula central discreta + Prompt contextual 3D */}
      <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center">
        <div
          className={`rounded-full transition-all duration-150 ${
            crosshairTarget
              ? 'w-3.5 h-3.5 border border-[#d4943a] bg-[#d4943a]/30 shadow-[0_0_12px_rgba(212,148,58,0.6)]'
              : 'w-1.5 h-1.5 bg-[#dfd7c5]/60'
          }`}
        />

        {crosshairTarget && (
          <div className="mt-4 px-3 py-1 bg-black/70 backdrop-blur-sm border border-[#dfd7c5]/20 rounded-sm text-center">
            <span className="font-mono text-[11px] tracking-wider text-[#d4943a] font-semibold">
              [E] {crosshairTarget.action}
            </span>
            <span className="font-sans text-xs text-[#ebe3d2] ml-2">
              {crosshairTarget.label}
            </span>
          </div>
        )}
      </div>

      {/* Capa HUD periférica ultra-discreta */}
      <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-5">
        {/* Esquina superior izquierda: nombre sutil del sector actual + objetivo dinámico discreto */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 max-w-md drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            <div className="font-display text-xs tracking-[0.28em] uppercase text-[#dfd7c5]/85">
              {hudStats?.roomName || 'Celda de Observación B-04'}
            </div>
            <div className="text-[11px] text-[#c7bfb0]/80 leading-snug">
              <span className="font-mono text-[#d4943a]/90 uppercase mr-1.5">Objetivo:</span>
              {currentObjective}
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-[#948e80]/80">
              {isHiding && (
                <span className="inline-flex items-center gap-1 text-[#79d9a1]">
                  <EyeOff className="w-3 h-3" />
                  OCULTO EN CASILLERO
                </span>
              )}
              {hudStats?.isStealth && !isHiding && (
                <span className="text-[#9cb8d9]">AGACHADO · SIGILO</span>
              )}
            </div>
          </div>

          {/* Notificaciones discretas al registrar descubrimientos */}
          <div className="flex flex-col gap-2 max-w-xs w-full">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`px-3.5 py-2.5 rounded-sm border backdrop-blur-md shadow-2xl ${
                  toast.kind === 'discovery'
                    ? 'bg-[#101319]/90 border-[#d4943a]/65 text-[#ebe3d2]'
                    : toast.kind === 'warning'
                    ? 'bg-[#1f0d10]/90 border-[#a82929]/75 text-[#f5c2c2]'
                    : toast.kind === 'success'
                    ? 'bg-[#0d1a14]/90 border-[#4d9e6f]/65 text-[#ccefd9]'
                    : 'bg-[#0d1016]/90 border-[#dfd7c5]/20 text-[#dfd7c5]'
                }`}
              >
                <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#d4943a]">
                  {toast.title}
                </div>
                <div className="text-xs mt-0.5 leading-snug">{toast.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Banner discreto abajo-centro (cero solapamiento con título de sala ni retícula) */}
        {!pointerLocked && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={onRequestPointerLock}
              className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/75 hover:bg-black/90 border border-[#d4943a]/40 rounded-sm text-[11px] font-mono text-[#ebe3d2] whitespace-nowrap transition shadow-xl"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-[#d4943a]" />
              <span>Clic para cámara 360° (o arrastra el mouse) · WASD caminar</span>
            </button>
          </div>
        )}

        {/* Pie periférico minimalista */}
        <div className="flex items-end justify-between gap-4">
          {/* Signos vitales sutiles sin caja pesada */}
          <div className="w-44 space-y-1.5 opacity-85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
            <div className="flex items-center gap-2">
              <Activity
                className={`w-3.5 h-3.5 shrink-0 ${
                  hp < 35 ? 'text-[#e05252] animate-pulse' : 'text-[#4d9e6f]'
                }`}
              />
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    hp < 35 ? 'bg-[#c93838]' : 'bg-[#4d9e6f]'
                  }`}
                  style={{ width: `${hp}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-[#c7bfb0] w-7 text-right">{hp}%</span>
            </div>

            <div className="flex items-center gap-2">
              <Flashlight
                className={`w-3.5 h-3.5 shrink-0 ${
                  hudStats?.flashlightOn ? 'text-[#d4943a]' : 'text-[#6c685e]'
                }`}
              />
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    battery < 20 ? 'bg-[#c93838]' : 'bg-[#d4943a]'
                  }`}
                  style={{ width: `${battery}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-[#c7bfb0] w-7 text-right">
                {battery}%
              </span>
            </div>

            {sanity < 92 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#8da4d0] w-3.5 text-center">Ψ</span>
                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7792c7] transition-all duration-300"
                    style={{ width: `${sanity}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-[#8da4d0] w-7 text-right">
                  {sanity}%
                </span>
              </div>
            )}
          </div>

          {/* Atajos discretos (clicables si el puntero está libre) */}
          <div className="pointer-events-auto flex items-center gap-3 font-mono text-[10px] tracking-wider text-[#948e80]/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
            <button
              type="button"
              onClick={onOpenDossier}
              className="hover:text-[#d4943a] transition"
            >
              [TAB] Archivo
            </button>
            <button
              type="button"
              onClick={onOpenInventory}
              className="hover:text-[#d4943a] transition"
            >
              [I] Equipo
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 text-[#d48b5a]">
              <Flame className="w-3 h-3" />
              {consumables.flare || 0} [Q]
            </span>
            <button
              type="button"
              onClick={onOpenGuide}
              className="hover:text-[#d4943a] transition"
            >
              [H] Guía
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              className="hover:text-[#dfd7c5] transition"
            >
              [ESC] Pausa
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
