import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { puzzleManager } from './PuzzleManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

export function CoreSealPuzzleModal({ isSolved, hasPower, onClose }) {
  const def = PUZZLES_CATALOG.puzzle_core_seal;
  const [selected, setSelected] = useState(
    isSolved ? def.expectedSlots : [def.slotOptions[0][1], def.slotOptions[1][1], def.slotOptions[2][1]]
  );
  const [solvedNow, setSolvedNow] = useState(isSolved);
  const [feedback, setFeedback] = useState(
    hasPower
      ? 'Alinea los tres Protocolos de Contención hallados en Hemeroteca, Generadores y Oficina de la Dra. Vance.'
      : 'ENERGÍA INSUFICIENTE: primero debes estabilizar los 120V en la Sala de Generadores.'
  );

  function setSlot(index, value) {
    if (solvedNow || !hasPower) return;
    soundEngine.playFlashlightClick();
    setSelected((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function handleValidate() {
    if (solvedNow || !hasPower) return;
    const ok = def.expectedSlots.every((expected, idx) => selected[idx] === expected);
    if (ok) {
      await puzzleManager.completePuzzle(def.puzzleKey);
      setSolvedNow(true);
      setFeedback('SELLO LIBERADO. La compuerta blindada hacia la Cámara del Núcleo 09 está abierta.');
    } else {
      soundEngine.playError();
      setFeedback('Secuencia de protocolos rechazada. Revisa los códigos recopilados en tu Archivo de Investigación [TAB].');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-2xl rounded-sm overflow-hidden border-[#a82929]/50">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#a82929]/30 bg-[#140a0c]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#f29191]">
            <ShieldAlert className="w-4 h-4" />
            Sello de Contención — Cámara del Núcleo 09
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {def.slotOptions.map((options, idx) => (
              <div key={idx} className="p-4 bg-[#0a0c10] border border-[#dfd7c5]/15 rounded-sm space-y-2.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#d4943a]">
                  Protocolo {idx + 1}
                </div>
                <div className="space-y-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={solvedNow || !hasPower}
                      onClick={() => setSlot(idx, opt)}
                      className={`w-full py-2 px-2.5 font-mono text-xs rounded-sm border transition ${
                        selected[idx] === opt
                          ? 'bg-[#d4943a] text-[#090a0c] border-[#d4943a] font-bold'
                          : 'bg-[#12161e] text-[#948e80] border-[#dfd7c5]/12 hover:border-[#d4943a]/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className={`text-xs font-mono ${solvedNow ? 'text-[#7fe0a7]' : !hasPower ? 'text-[#f29191]' : 'text-[#c7bfb0]'}`}>
            {feedback}
          </p>

          <div className="flex justify-end">
            {solvedNow ? (
              <button type="button" onClick={onClose} className="btn-primary">
                <CheckCircle2 className="w-4 h-4" />
                Compuerta Abierta — Avanzar
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasPower}
                onClick={handleValidate}
                className="btn-danger"
              >
                <ShieldCheck className="w-4 h-4" />
                Validar Sello del Núcleo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
