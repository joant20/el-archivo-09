import React, { useState } from 'react';
import { CheckCircle2, Terminal, X } from 'lucide-react';
import { PUZZLES_CATALOG } from '../data/puzzlesData.js';
import { puzzleManager } from './PuzzleManager.js';
import { soundEngine } from '../audio/SoundEngine.js';

function normalizePassword(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function TerminalPuzzleModal({ isSolved, onClose }) {
  const def = PUZZLES_CATALOG.puzzle_terminal_seguridad;
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([
    'ARCHIVO-09 SECURITY OS v2.4 // TERMINAL CCTV',
    'ESTADO COMPUERTA HEMEROTECA: BLOQUEADA',
    'INGRESE CLAVE DE SUPERVISOR PARA ANULACIÓN REMOTA:',
  ]);
  const [solvedNow, setSolvedNow] = useState(isSolved);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (solvedNow || busy) return;

    const attempt = normalizePassword(input);
    if (!attempt) return;

    if (attempt === def.expectedPassword) {
      setBusy(true);
      await puzzleManager.completePuzzle(def.puzzleKey);
      setLogs((prev) => [
        ...prev,
        `> ${input}`,
        'ACCESO CONCEDIDO — SUPERVISOR A. VALDÉS VERIFICADO.',
        'COMPUERTA DE HEMEROTECA DESBLOQUEADA PERMANENTEMENTE.',
      ]);
      setSolvedNow(true);
      setBusy(false);
    } else {
      soundEngine.playError();
      setLogs((prev) => [
        ...prev,
        `> ${input}`,
        'ERROR 403: CLAVE INVÁLIDA. Consulte el Memorando TI y la Placa de Inauguración en tu Archivo [TAB].',
      ]);
    }
    setInput('');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#07110c] border-2 border-[#4d9e6f]/50 rounded-sm shadow-[0_0_50px_rgba(77,158,111,0.2)] overflow-hidden relative">
        <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-35" />

        <div className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b border-[#4d9e6f]/30 bg-[#050c09]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#7fe0a7]">
            <Terminal className="w-4 h-4" />
            Terminal de Seguridad — Sala CCTV
          </div>
          <button type="button" onClick={onClose} className="text-[#7fe0a7] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 p-5 space-y-4 font-mono">
          <div className="h-52 overflow-y-auto bg-black/55 border border-[#4d9e6f]/25 p-3.5 space-y-1.5 text-xs text-[#91f2ba]">
            {logs.map((line, i) => (
              <div key={i} className={line.startsWith('ERROR') ? 'text-[#ff8585]' : ''}>
                {line}
              </div>
            ))}
          </div>

          {solvedNow ? (
            <div className="p-3.5 bg-[#4d9e6f]/20 border border-[#4d9e6f]/50 text-[#9cf5c5] text-xs flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Compuerta del Archivo Documental abierta.
              </span>
              <button type="button" onClick={onClose} className="btn-primary py-1 px-3 text-xs">
                Salir
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Introduce contraseña..."
                className="flex-1 px-3.5 py-2.5 bg-black/75 border border-[#4d9e6f]/45 text-[#9cf5c5] text-sm focus:outline-none focus:border-[#7fe0a7]"
              />
              <button type="submit" disabled={busy} className="btn-primary">
                Ejecutar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
