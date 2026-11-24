import React, { useState } from 'react';
import { CheckCircle2, Zap, X } from 'lucide-react';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { puzzleManager } from './PuzzleManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

export function GeneratorPuzzleModal({ isSolved, onClose }) {
  const def = PUZZLES_CATALOG.puzzle_generadores;
  const [activeIds, setActiveIds] = useState(isSolved ? def.requiredBreakers : []);
  const [solvedNow, setSolvedNow] = useState(isSolved);
  const [message, setMessage] = useState(
    'Equilibra los disyuntores exactamente a 120V energizando los sectores críticos del Manual Eléctrico.'
  );

  const totalVoltage = def.breakers
    .filter((b) => activeIds.includes(b.id))
    .reduce((sum, b) => sum + b.volts, 0);

  const isOverload = totalVoltage > def.targetVoltage;

  function toggleBreaker(id) {
    if (solvedNow) return;
    soundEngine.playFlashlightClick();
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleEngage() {
    if (solvedNow) return;

    const exactRequired =
      activeIds.length === def.requiredBreakers.length &&
      def.requiredBreakers.every((id) => activeIds.includes(id));

    if (totalVoltage === def.targetVoltage && exactRequired) {
      await puzzleManager.completePuzzle(def.puzzleKey);
      setSolvedNow(true);
      setMessage(
        'RED ESTABILIZADA A 120V. Nodo de Enfermería activado. Pantalla de diagnóstico revela PROTOCOLO II: OMEGA-09.'
      );
    } else if (isOverload) {
      soundEngine.playError();
      setMessage(`SOBRECARGA (${totalVoltage}V > 120V). Desactiva circuitos no esenciales.`);
    } else {
      soundEngine.playError();
      setMessage(
        `Voltaje actual ${totalVoltage}V o circuitos incorrectos. Revisa los 3 sectores obligatorios en el Manual Eléctrico [TAB].`
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-2xl rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#d4943a]">
            <Zap className="w-4 h-4" />
            Subestación Eléctrica — Balance de Carga 120V
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Medidor de voltaje */}
          <div className="p-4 bg-[#07090d] border border-[#dfd7c5]/15 rounded-sm space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[#948e80]">CARGA ACTUAL / LÍMITE</span>
              <span
                className={`text-lg font-bold ${
                  isOverload
                    ? 'text-[#ff6b6b]'
                    : totalVoltage === 120
                    ? 'text-[#7fe0a7]'
                    : 'text-[#d4943a]'
                }`}
              >
                {totalVoltage}V / 120V
              </span>
            </div>
            <div className="h-3 bg-[#171c24] rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isOverload ? 'bg-[#c93838]' : totalVoltage === 120 ? 'bg-[#4d9e6f]' : 'bg-[#d4943a]'
                }`}
                style={{ width: `${Math.min(100, (totalVoltage / 150) * 100)}%` }}
              />
            </div>
          </div>

          {/* Disyuntores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {def.breakers.map((b) => {
              const on = activeIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={solvedNow}
                  onClick={() => toggleBreaker(b.id)}
                  className={`p-3.5 rounded-sm border text-left flex items-center justify-between transition ${
                    on
                      ? 'bg-[#1a221b] border-[#4d9e6f] text-[#ebe3d2]'
                      : 'bg-[#101319] border-[#dfd7c5]/15 text-[#948e80] hover:border-[#d4943a]/50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{b.label}</div>
                    <div className="font-mono text-xs text-[#d4943a] mt-0.5">{b.volts}V</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded-sm ${
                      on ? 'bg-[#4d9e6f] text-[#07100a] font-bold' : 'bg-[#1e232c] text-[#8d887d]'
                    }`}
                  >
                    {on ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>

          <p className={`text-xs font-mono ${solvedNow ? 'text-[#7fe0a7]' : 'text-[#c7bfb0]'}`}>
            {message}
          </p>

          <div className="flex justify-end gap-2">
            {solvedNow ? (
              <button type="button" onClick={onClose} className="btn-primary">
                <CheckCircle2 className="w-4 h-4" />
                Energía Activa — Cerrar
              </button>
            ) : (
              <button type="button" onClick={handleEngage} className="btn-primary">
                <Zap className="w-4 h-4" />
                Activar Subestación
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
