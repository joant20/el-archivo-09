import React, { useState } from 'react';
import { CheckCircle2, Headphones, Radio, X } from 'lucide-react';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { puzzleManager } from './PuzzleManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

const SPEEDS = [0.5, 0.75, 1.0, 1.25];

export function TapePuzzleModal({ isSolved, onClose }) {
  const def = PUZZLES_CATALOG.puzzle_cinta_vance;
  const [frequency, setFrequency] = useState(isSolved ? def.targetFrequency : 52.0);
  const [speed, setSpeed] = useState(isSolved ? def.targetSpeed : 1.0);
  const [solvedNow, setSolvedNow] = useState(isSolved);
  const [feedback, setFeedback] = useState(
    'La interferencia de la Entidad distorsiona la cinta. Calibra frecuencia y velocidad según el Reporte Acústico.'
  );

  const freqDiff = Math.abs(frequency - def.targetFrequency);
  const speedMatch = speed === def.targetSpeed;
  const clarity = Math.max(
    0,
    Math.min(1, (1 - freqDiff / 18) * (speedMatch ? 1 : 0.45))
  );

  function handlePreview() {
    soundEngine.playTapeSample(clarity);
  }

  async function handleDecode() {
    if (solvedNow) return;
    if (Math.abs(frequency - def.targetFrequency) <= 0.5 && speed === def.targetSpeed) {
      await puzzleManager.completePuzzle(def.puzzleKey);
      setSolvedNow(true);
      setFeedback('SEÑAL DESPEJADA — Grabación completa archivada y Protocolo III (SILENCIO) registrado.');
    } else {
      soundEngine.playError();
      setFeedback(
        'Señal todavía distorsionada. Consulta los parámetros exactos (Hz y velocidad) en el Parte Médico de Enfermería.'
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-xl rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#d4943a]">
            <Headphones className="w-4 h-4" />
            Reproductor Magnético — Cinta #02 (Dra. Vance)
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Indicador de claridad de señal */}
          <div className="p-4 bg-[#080a0e] border border-[#dfd7c5]/15 rounded-sm space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[#948e80]">CLARIDAD DE SEÑAL</span>
              <span className={clarity > 0.92 ? 'text-[#7fe0a7] font-bold' : 'text-[#d4943a]'}>
                {Math.round(clarity * 100)}%
              </span>
            </div>
            <div className="h-2.5 bg-[#171c24] rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all ${clarity > 0.92 ? 'bg-[#4d9e6f]' : 'bg-[#d4943a]'}`}
                style={{ width: `${Math.round(clarity * 100)}%` }}
              />
            </div>
          </div>

          {/* Dial de Frecuencia */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-[#c7bfb0]">FRECUENCIA DE FILTRO</span>
              <span className="text-[#d4943a] font-bold">{frequency.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min="32"
              max="60"
              step="0.5"
              disabled={solvedNow}
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full accent-[#d4943a]"
            />
          </div>

          {/* Selector de velocidad */}
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#c7bfb0]">VELOCIDAD DEL CARRETE</div>
            <div className="grid grid-cols-4 gap-2">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  disabled={solvedNow}
                  onClick={() => {
                    soundEngine.playFlashlightClick();
                    setSpeed(sp);
                  }}
                  className={`py-2 font-mono text-xs rounded-sm border transition ${
                    speed === sp
                      ? 'bg-[#d4943a] text-[#090a0c] border-[#d4943a] font-bold'
                      : 'bg-[#101319] text-[#948e80] border-[#dfd7c5]/15 hover:border-[#d4943a]/50'
                  }`}
                >
                  {sp.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>

          <p className={`text-xs font-mono ${solvedNow ? 'text-[#7fe0a7]' : 'text-[#c7bfb0]'}`}>
            {feedback}
          </p>

          {solvedNow && (
            <blockquote className="p-4 bg-[#0f1a14] border-l-2 border-[#4d9e6f] font-mono text-xs text-[#d6f5e3] leading-relaxed">
              “{def.rewardRecording.contentData.transcript}”
            </blockquote>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button type="button" onClick={handlePreview} className="btn-secondary text-xs">
              <Radio className="w-4 h-4 text-[#d4943a]" />
              Escuchar Señal
            </button>
            {solvedNow ? (
              <button type="button" onClick={onClose} className="btn-primary text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Cerrar Reproductor
              </button>
            ) : (
              <button type="button" onClick={handleDecode} className="btn-primary text-xs">
                Decodificar Grabación
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
