import React, { useState } from 'react';
import { CheckCircle2, Delete, Lock, X } from 'lucide-react';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { puzzleManager } from './PuzzleManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

export function SafePuzzleModal({ isSolved, onClose }) {
  const def = PUZZLES_CATALOG.puzzle_caja_fuerte;
  const [digits, setDigits] = useState('');
  const [feedback, setFeedback] = useState('Introduce la combinación de 4 dígitos deducida del archivo y el cuarto oscuro.');
  const [isError, setIsError] = useState(false);
  const [solvedNow, setSolvedNow] = useState(isSolved);

  function pressDigit(d) {
    if (solvedNow || digits.length >= 4) return;
    soundEngine.playTone(540 + Number(d) * 35, 0.05, 0.06, 'triangle');
    setDigits((prev) => prev + d);
    setIsError(false);
  }

  function clearDigits() {
    setDigits('');
    setIsError(false);
  }

  async function handleConfirm() {
    if (solvedNow || digits.length < 4) return;

    if (digits === def.expectedCode) {
      await puzzleManager.completePuzzle(def.puzzleKey);
      setSolvedNow(true);
      setIsError(false);
      setFeedback('¡CERROJO LIBERADO! Has recuperado la Tarjeta de Acceso Nivel 2 y 1 Batería de Litio.');
    } else {
      soundEngine.playError();
      setIsError(true);
      setFeedback('Combinación incorrecta. Descifra el Informe de Hemeroteca (-3 César) y crúzalo con la Fotografía del Cuarto Oscuro.');
      setDigits('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-md rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#d4943a]">
            <Lock className="w-4 h-4" />
            Caja Fuerte Mural — Seguridad
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Pantalla digital de 4 dígitos */}
          <div className="bg-[#07090d] border border-[#dfd7c5]/20 p-4 rounded-sm text-center">
            <div className="font-mono text-4xl tracking-[0.45em] text-[#ebe3d2] pl-4">
              {solvedNow ? '4279' : digits.padEnd(4, '•')}
            </div>
          </div>

          <p
            className={`text-xs font-mono text-center min-h-[2.5rem] ${
              solvedNow ? 'text-[#7fe0a7]' : isError ? 'text-[#f29191]' : 'text-[#948e80]'
            }`}
          >
            {feedback}
          </p>

          {solvedNow ? (
            <div className="p-4 bg-[#0f1f16] border border-[#4d9e6f]/45 rounded-sm flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs text-[#8ff0b8] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Tarjeta Nivel 2 en inventario.
              </span>
              <button type="button" onClick={onClose} className="btn-primary py-1.5 px-3 text-xs">
                Cerrar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="btn-secondary py-3.5 text-lg font-mono"
                >
                  {d}
                </button>
              ))}
              <button type="button" onClick={clearDigits} className="btn-danger py-3.5 text-xs">
                <Delete className="w-4 h-4" />
                Borrar
              </button>
              <button
                type="button"
                onClick={() => pressDigit('0')}
                className="btn-secondary py-3.5 text-lg font-mono"
              >
                0
              </button>
              <button
                type="button"
                disabled={digits.length < 4}
                onClick={handleConfirm}
                className="btn-primary py-3.5 text-xs"
              >
                Abrir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
