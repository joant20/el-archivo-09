import React from 'react';
import {
  BookOpen,
  Compass,
  EyeOff,
  Flashlight,
  Keyboard,
  Play,
  ShieldCheck,
  Skull,
  X,
} from 'lucide-react';

/**
 * Expediente de Inducción / Guía de Supervivencia de EL ARCHIVO 09.
 * Se muestra automáticamente al iniciar una partida nueva y puede consultarse
 * en cualquier momento desde el Menú Principal, Pausa o pulsando [H].
 */
export function IntroBriefingModal({ isFirstStart = false, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="dossier-surface w-full max-w-4xl rounded-sm overflow-hidden my-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#d4943a]">
              PROTOCOLO DE INDUCCIÓN · EXPEDIENTE #09-E
            </div>
            <h2 className="font-display text-xl sm:text-2xl tracking-widest text-[#ebe3d2] mt-0.5">
              {isFirstStart ? 'HAS DESPERTADO EN EL ARCHIVO 09' : 'GUÍA Y OBJETIVO DEL JUEGO'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-1.5"
            aria-label="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido en 3 bloques claros */}
        <div className="p-6 space-y-5 max-h-[76vh] overflow-y-auto">
          {/* Bloque 1: De qué trata y qué debes hacer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="p-4 bg-[#0d1016] border border-[#dfd7c5]/14 rounded-sm space-y-2.5">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#d4943a]">
                <Compass className="w-4 h-4" />
                ¿De qué trata y qué debes hacer?
              </div>
              <p className="text-xs sm:text-sm text-[#d6cebc] leading-relaxed">
                Estás encerrado en un centro subterráneo abandonado donde el{' '}
                <strong className="text-[#ebe3d2]">Proyecto Mnemosyne</strong> salió mal. Tu meta es
                descubrir qué ocurrió y abrir la <strong className="text-[#ebe3d2]">Cámara del Núcleo 09</strong>{' '}
                al final del pasillo sur.
              </p>
              <ol className="space-y-1.5 text-xs text-[#c7bfb0] font-mono pt-1">
                <li>
                  <span className="text-[#d4943a] font-bold">1.</span> Recoge el{' '}
                  <span className="text-[#ebe3d2]">Memorando</span> sobre la mesa en tu celda{' '}
                  <kbd className="px-1 bg-white/10 rounded-sm">[E]</kbd> y sal al Pasillo Central.
                </li>
                <li>
                  <span className="text-[#d4943a] font-bold">2.</span> Investiga documentos, fotos y
                  cintas para deducir claves y abrir zonas selladas (Seguridad, Hemeroteca,
                  Enfermería, Generadores y Oficina Vance).
                </li>
                <li>
                  <span className="text-[#d4943a] font-bold">3.</span> Restaura los{' '}
                  <span className="text-[#ebe3d2]">120V</span>, reúne los{' '}
                  <span className="text-[#ebe3d2]">3 Protocolos</span> y decide el destino del Núcleo 09.
                </li>
              </ol>
            </section>

            {/* Bloque 2: Supervivencia y Muerte con Memoria */}
            <section className="p-4 bg-[#0d1016] border border-[#dfd7c5]/14 rounded-sm space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#f29191]">
                <Skull className="w-4 h-4" />
                Criaturas, Sigilo y Memoria Permanente
              </div>

              <div className="space-y-2 text-xs text-[#d6cebc] leading-relaxed">
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-[#8cb6d9] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#ebe3d2]">El Eco patrulla los pasillos:</strong> es
                    hipersensible al ruido y a la linterna directa. Agáchate con{' '}
                    <kbd className="px-1 bg-white/10 font-mono">[C]</kbd>, apaga la luz{' '}
                    <kbd className="px-1 bg-white/10 font-mono">[F]</kbd>, escóndete en{' '}
                    <strong className="text-[#ebe3d2]">casilleros metálicos [E]</strong> o lanza una
                    bengala <kbd className="px-1 bg-white/10 font-mono">[Q]</kbd>.
                  </span>
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-[#0e1b15] border border-[#4d9e6f]/40 rounded-sm">
                  <ShieldCheck className="w-4 h-4 text-[#7fe0a7] shrink-0 mt-0.5" />
                  <span className="text-[#ccefd9]">
                    <strong>Si mueres, no pierdes tu investigación:</strong> volverás al último{' '}
                    <strong>Nodo de Estabilización</strong> (esfera verde), pero conservarás el 100%
                    de tus documentos, códigos, enigmas resueltos y el historial de muertes.
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Bloque 3: Controles visuales */}
          <section className="p-4 bg-[#0a0c10] border border-[#dfd7c5]/12 rounded-sm space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#d4943a]">
              <Keyboard className="w-4 h-4" />
              Controles en Primera Persona
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs font-mono">
              {[
                { key: 'WASD / Flechas', desc: 'Caminar' },
                { key: 'Mouse (Clic)', desc: 'Mirar en 360°' },
                { key: 'E', desc: 'Abrir / Leer / Esconderse' },
                { key: 'F', desc: 'Linterna ON / OFF' },
                { key: 'C / Ctrl', desc: 'Agacharse (Sigilo)' },
                { key: 'Shift', desc: 'Correr (hace ruido)' },
                { key: 'Q', desc: 'Lanzar bengala' },
                { key: 'TAB', desc: 'Archivo de Investigación' },
                { key: 'I', desc: 'Inventario / Curar' },
                { key: 'H', desc: 'Ver esta Guía' },
                { key: 'ESC', desc: 'Pausa / Sensibilidad' },
              ].map((ctrl) => (
                <div
                  key={ctrl.key}
                  className="p-2 bg-[#12161e] border border-[#dfd7c5]/10 rounded-sm flex flex-col gap-0.5"
                >
                  <span className="text-[#d4943a] font-bold">{ctrl.key}</span>
                  <span className="text-[#c7bfb0] text-[11px]">{ctrl.desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Pie con acción clara */}
        <div className="px-6 py-4 border-t border-[#dfd7c5]/12 bg-[#0c0e13] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#948e80]">
            <Flashlight className="w-4 h-4 text-[#d4943a]" />
            <span>
              Consejo: abre el <strong className="text-[#ebe3d2]">Archivo [TAB]</strong> siempre que
              necesites cruzar pistas para un enigma.
            </span>
          </div>
          <button type="button" onClick={onClose} className="btn-primary">
            {isFirstStart ? <Play className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            {isFirstStart ? 'Comenzar Investigación' : 'Entendido — Volver'}
          </button>
        </div>
      </div>
    </div>
  );
}
