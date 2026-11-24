import React, { useState } from 'react';
import { Flame, Home, ShieldAlert, Sparkles, X } from 'lucide-react';
import { saveStateManager } from '../save-system/SaveStateManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

const ENDINGS = {
  purga_termica: {
    title: 'FINAL I — PROTOCOLO DE PURGA TÉRMICA',
    subtitle: 'El ciclo del Proyecto Mnemosyne ha terminado para siempre.',
    narrative:
      'Activas la incineración del subnivel. El Núcleo 09 emite un alarido electromagnético que sacude los ocho sectores mientras El Eco se disuelve en ceniza. Ningún cuerpo volverá a ser reconstruido en el Archivo 09. Antes de que el fuego alcance las compuertas, logras transmitir tu Archivo de Investigación íntegro hacia la superficie.',
  },
  extraccion_neural: {
    title: 'FINAL II — EXTRACCIÓN NEURAL',
    subtitle: 'Escapaste del edificio... pero parte de la Entidad viajó contigo.',
    narrative:
      'Rediriges la corriente de 120V hacia los conductos de evacuación y liberas el elevador de emergencia mientras mantienes el sustrato del Núcleo en estasis. Al salir a la fría noche de noviembre de 1994, conservas intactos cada documento, cada muerte y cada secreto. En la distancia, aún escuchas un latido sincronizado con el tuyo.',
  },
};

export function EndingScreen({ playTimeSeconds, saveState, onClose, onExitToMenu }) {
  const [chosen, setChosen] = useState(null);
  const [saving, setSaving] = useState(false);

  async function selectEnding(endingKey) {
    setSaving(true);
    soundEngine.playPuzzleSolved();
    try {
      await saveStateManager.recordEnding(endingKey, playTimeSeconds || 0);
      await saveStateManager.recordDiscovery({
        entryKey: `evt_final_${endingKey}`,
        category: 'event',
        title: ENDINGS[endingKey].title,
        description: ENDINGS[endingKey].subtitle,
        locationRoom: 'Cámara del Núcleo 09',
        isResolved: true,
      });
    } catch {
      // Continuar mostrando el epílogo incluso si falla un log secundario
    }
    setChosen(endingKey);
    setSaving(false);
  }

  if (chosen) {
    const epilogue = ENDINGS[chosen];
    const permanent = saveState?.permanent || {};
    return (
      <div className="fixed inset-0 z-50 bg-[#050608]/98 backdrop-blur-lg flex items-center justify-center p-6 overflow-y-auto">
        <div className="dossier-surface max-w-2xl w-full p-8 rounded-sm space-y-6 text-center">
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-[#d4943a]">
            EXPEDIENTE CERRADO — EL ARCHIVO 09
          </div>
          <h2 className="font-display text-3xl text-[#ebe3d2] tracking-wider">{epilogue.title}</h2>
          <p className="text-sm font-mono text-[#7fe0a7]">{epilogue.subtitle}</p>
          <p className="text-sm text-[#d6cebc] leading-relaxed text-left bg-[#0c0f14] p-5 border border-[#dfd7c5]/12 rounded-sm">
            {epilogue.narrative}
          </p>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs pt-2">
            <div className="p-3 bg-[#0a0c10] border border-[#dfd7c5]/12">
              <div className="text-xl text-[#d4943a] font-bold">
                {permanent.investigationEntries?.length || 0}
              </div>
              <div className="text-[#948e80] mt-0.5">Descubrimientos</div>
            </div>
            <div className="p-3 bg-[#0a0c10] border border-[#dfd7c5]/12">
              <div className="text-xl text-[#7fe0a7] font-bold">
                {permanent.solvedPuzzles?.length || 0}/5
              </div>
              <div className="text-[#948e80] mt-0.5">Enigmas</div>
            </div>
            <div className="p-3 bg-[#0a0c10] border border-[#dfd7c5]/12">
              <div className="text-xl text-[#f29191] font-bold">
                {saveState?.meta?.death_count || 0}
              </div>
              <div className="text-[#948e80] mt-0.5">Muertes</div>
            </div>
          </div>

          <button type="button" onClick={onExitToMenu} className="btn-primary w-full">
            <Home className="w-4 h-4" />
            Volver al Menú Principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/88 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-2xl rounded-sm overflow-hidden border-[#a82929]/60">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#a82929]/30 bg-[#140a0c]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#f29191]">
            <ShieldAlert className="w-4 h-4" />
            Consola Central del Núcleo 09 — Decisión Final
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#dfd7c5] leading-relaxed">
            Has llegado al corazón bioeléctrico del Proyecto Mnemosyne. La Dra. Vance dejó
            habilitados dos protocolos terminales. Elige el destino del Archivo 09:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => selectEnding('purga_termica')}
              className="p-5 bg-[#1b0d10] hover:bg-[#261115] border border-[#a82929]/60 rounded-sm text-left space-y-2 transition"
            >
              <div className="flex items-center gap-2 text-[#f29191] font-mono text-xs uppercase font-bold">
                <Flame className="w-4 h-4" />
                Protocolo de Purga Térmica
              </div>
              <p className="text-xs text-[#d6c2c2] leading-relaxed">
                Destruye el Núcleo 09 y erradica a El Eco para siempre mientras envías el expediente
                al exterior.
              </p>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => selectEnding('extraccion_neural')}
              className="p-5 bg-[#0f1821] hover:bg-[#14212e] border border-[#d4943a]/55 rounded-sm text-left space-y-2 transition"
            >
              <div className="flex items-center gap-2 text-[#e8b460] font-mono text-xs uppercase font-bold">
                <Sparkles className="w-4 h-4" />
                Protocolo de Extracción Neural
              </div>
              <p className="text-xs text-[#cdd4dc] leading-relaxed">
                Desvía los 120V al elevador de emergencia para huir con vida, dejando el sustrato
                latente bajo tierra.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
