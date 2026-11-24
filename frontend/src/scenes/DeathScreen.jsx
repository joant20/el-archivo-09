import React from 'react';
import { BookOpen, RotateCcw, ShieldCheck, Skull } from 'lucide-react';

export function DeathScreen({ deathData, saveState, onOpenDossier, onRespawn }) {
  const permanent = saveState?.permanent || {};
  const checkpoint = saveState?.checkpoint || {};
  const deathNumber = saveState?.meta?.death_count || 1;
  const totalEntries = permanent.investigationEntries?.length || 0;
  const solvedCount = permanent.solvedPuzzles?.length || 0;
  const roomsCount = permanent.exploredRooms?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#080304]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="dossier-surface w-full max-w-2xl rounded-sm border-[#a82929]/70 p-6 sm:p-8 space-y-6 shadow-[0_0_90px_rgba(168,41,41,0.3)]">
        <div className="text-center space-y-2 border-b border-[#a82929]/30 pb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#a82929]/20 border border-[#a82929]/60 text-[#f28a8a] mx-auto">
            <Skull className="w-6 h-6" />
          </div>
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-[#e07a7a]">
            COLAPSO VITAL REGISTRADO — MUERTE #{deathNumber}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-widest text-[#f5e6e6]">
            TU CUERPO HA CAÍDO
          </h2>
          <p className="text-sm text-[#cfa8a8] font-mono">
            {deathData?.cause || 'Fallecimiento en la instalación'} · {deathData?.locationRoom}
          </p>
        </div>

        {/* Separación explícita: Qué se conserva (Capa A) vs Qué se reinicia (Capa B -> C) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#0d1913] border border-[#4d9e6f]/45 rounded-sm space-y-2">
            <div className="font-mono uppercase tracking-wider text-[#7fe0a7] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Memoria Permanente Conservada
            </div>
            <ul className="space-y-1 text-[#d2e6da] font-mono text-[11px]">
              <li>• {totalEntries} registros en Archivo de Investigación</li>
              <li>• {solvedCount} enigmas resueltos permanecen abiertos</li>
              <li>• {roomsCount} habitaciones exploradas registradas</li>
              <li>• Muerte #{deathNumber} archivada en tu historial</li>
            </ul>
          </div>

          <div className="p-4 bg-[#171113] border border-[#a82929]/40 rounded-sm space-y-2">
            <div className="font-mono uppercase tracking-wider text-[#f2a2a2]">
              Reconstrucción en Checkpoint
            </div>
            <ul className="space-y-1 text-[#d6c3c3] font-mono text-[11px]">
              <li>• Nodo destino: {checkpoint.checkpoint_key || 'cp_celda_b04'}</li>
              <li>• Salud / Cordura restauradas ({checkpoint.hp ?? 100}%)</li>
              <li>• Consumibles devueltos al último punto de control</li>
              <li>• Objetos clave conservados</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="button" onClick={onOpenDossier} className="btn-secondary flex-1">
            <BookOpen className="w-4 h-4 text-[#d4943a]" />
            Consultar Archivo e Historial
          </button>
          <button type="button" onClick={onRespawn} className="btn-primary flex-1">
            <RotateCcw className="w-4 h-4" />
            Reconstruir en Punto de Control
          </button>
        </div>
      </div>
    </div>
  );
}
