import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TrailerDirector3D } from '../engine3d/TrailerDirector3D.js';
import { soundEngine } from '../audio/SoundEngine.js';

const TOTAL_SECONDS = 32;

const TRAILER_CHAPTERS = [
  {
    start: 0,
    end: 6.5,
    stamp: 'REC ● 03 NOV 1994 // ARCHIVO 09 · SUBNIVEL',
    label: 'CAPÍTULO I — LA INSTALACIÓN SELLADA',
    subtitle:
      'Bajo cuarenta metros de hormigón, el Proyecto Mnemosyne intentó vencer a la muerte transfiriendo la memoria humana a un organismo vivo.',
    voice:
      'Bajo cuarenta metros de hormigón, el Proyecto Mnemosyne intentó vencer a la muerte transfiriendo la memoria humana a un organismo vivo.',
  },
  {
    start: 6.5,
    end: 13.5,
    stamp: 'ALERTA BIO-CONTENCIÓN // ESPÉCIMEN SUELTO',
    label: 'CAPÍTULO II — EL ECO',
    subtitle:
      'El experimento colapsó. Ahora criaturas ciegas patrullan los pasillos cazando cada sonido y cada haz de luz.',
    voice:
      'El experimento colapsó. Ahora criaturas ciegas patrullan los pasillos, cazando cada sonido y cada haz de luz.',
  },
  {
    start: 13.5,
    end: 20.0,
    stamp: 'CÁMARA DEL NÚCLEO 09 // BUCLE DE RECONSTRUCCIÓN',
    label: 'CAPÍTULO III — MUERTE Y MEMORIA',
    subtitle:
      'El Núcleo 09 reconstruye los cuerpos de quienes mueren aquí. Si caes, regresarás al último punto de control... pero nunca perderás lo que ya investigaste.',
    voice:
      'El Núcleo cero nueve reconstruye los cuerpos de quienes mueren aquí. Si caes, regresarás al último punto de control, pero jamás perderás tus documentos ni tus enigmas resueltos.',
  },
  {
    start: 20.0,
    end: 27.5,
    stamp: 'CELDA B-04 // TU MISIÓN A CONTINUACIÓN',
    label: 'CAPÍTULO IV — LO QUE DEBES HACER',
    subtitle:
      'Despiertas en la Celda B-04. Recoge el memorando, explora las ocho salas en sigilo, restaura los 120 voltios y reúne los tres protocolos para abrir el Núcleo.',
    voice:
      'Despiertas en la Celda B cero cuatro. Recoge el memorando de tu escritorio, explora las ocho salas en sigilo, restaura la energía de ciento veinte voltios y reúne los tres protocolos para abrir el Núcleo.',
  },
  {
    start: 27.5,
    end: 32.0,
    stamp: 'SEÑAL ACTIVA // DESPERTAR',
    label: 'EL ARCHIVO 09',
    subtitle:
      'Escucha los pasillos. Escóndete en los casilleros cuando lo oigas acercarse. Tu investigación comienza ahora.',
    voice: 'Escucha los pasillos. Tu investigación comienza ahora.',
    isTitle: true,
  },
];

function formatSec(sec) {
  const s = Math.floor(sec);
  return `00:${String(s).padStart(2, '0')}`;
}

/**
 * Reproductor de Video/Tráiler 3D en Tiempo Real con narración de voz en español,
 * subtítulos cinematográficos, audio de impacto y controles de reproducción.
 */
export function CinematicIntroTrailer({ onFinish, onOpenControls }) {
  const containerRef = useRef(null);
  const directorRef = useRef(null);
  const lastChapterRef = useRef(-1);

  const [currentTime, setCurrentTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [finished, setFinished] = useState(false);

  const speakSpanish = useCallback((text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const esVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('es') && v.name.toLowerCase().includes('male')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('es'));
      if (esVoice) utter.voice = esVoice;
      utter.lang = 'es-ES';
      utter.rate = 0.94;
      utter.pitch = 0.78; // Tono más grave y cinematográfico
      utter.volume = 0.92;
      window.speechSynthesis.speak(utter);
    } catch {
      // Si el navegador no soporta voz, continúan los subtítulos y el sonido ambiental
    }
  }, []);

  const stopVoice = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar
      }
    }
  }, []);

  // Montar el director de cámara 3D WebGL2
  useEffect(() => {
    if (!containerRef.current) return;
    soundEngine.init();
    const director = new TrailerDirector3D(containerRef.current);
    directorRef.current = director;

    const timer = setInterval(() => {
      if (!directorRef.current) return;
      const t = directorRef.current.currentTime;
      setCurrentTime(t);
      if (t >= TOTAL_SECONDS) {
        setFinished(true);
      }
    }, 100);

    return () => {
      clearInterval(timer);
      stopVoice();
      director.dispose();
      directorRef.current = null;
    };
  }, [stopVoice]);

  // Calcular capítulo activo según el tiempo del video 3D
  const chapterIndex = Math.max(
    0,
    TRAILER_CHAPTERS.findIndex((c) => currentTime >= c.start && currentTime < c.end)
  );
  const activeIdx = currentTime >= TOTAL_SECONDS ? TRAILER_CHAPTERS.length - 1 : chapterIndex;
  const chapter = TRAILER_CHAPTERS[activeIdx];

  // Disparar voz narrada + impacto de sonido en cada cambio de toma
  useEffect(() => {
    if (paused) return;
    if (lastChapterRef.current === activeIdx) return;
    lastChapterRef.current = activeIdx;

    soundEngine.playTrailerBoom(activeIdx === 1 || activeIdx === 4 ? 1.15 : 0.75);
    if (activeIdx === 1) {
      setTimeout(() => soundEngine.playHorrorSting(), 450);
    }
    if (voiceEnabled && chapter?.voice) {
      speakSpanish(chapter.voice);
    }
  }, [activeIdx, paused, voiceEnabled, chapter, speakSpanish]);

  // Atajos de teclado: ESC salta, Espacio pausa/reanuda
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopVoice();
        onFinish();
      } else if (e.key === ' ') {
        e.preventDefault();
        setPaused((prev) => {
          const next = !prev;
          directorRef.current?.setPaused(next);
          if (next) stopVoice();
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish, stopVoice]);

  function togglePause() {
    const next = !paused;
    setPaused(next);
    directorRef.current?.setPaused(next);
    if (next) stopVoice();
    else if (voiceEnabled && chapter?.voice) speakSpanish(chapter.voice);
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next) stopVoice();
    else if (!paused && chapter?.voice) speakSpanish(chapter.voice);
  }

  function handleSeek(e) {
    const val = Number(e.target.value);
    setFinished(false);
    lastChapterRef.current = -1;
    directorRef.current?.seek(val);
    setCurrentTime(val);
  }

  function handleReplay() {
    setFinished(false);
    setPaused(false);
    lastChapterRef.current = -1;
    directorRef.current?.setPaused(false);
    directorRef.current?.seek(0);
    setCurrentTime(0);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Canvas 3D WebGL2 renderizando el tráiler en vivo a pantalla completa */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Grano cinematográfico y viñeta de película */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ boxShadow: 'inset 0 0 150px rgba(0,0,0,0.85)' }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 crt-scanlines opacity-20" />

      {/* Barra Letterbox Superior */}
      <header className="relative z-20 h-14 bg-black/95 border-b border-white/10 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-mono text-[10px] sm:text-xs tracking-[0.22em] text-[#b5ae9e]">
          <span className="w-2 h-2 rounded-full bg-[#d63636] animate-pulse" />
          <span className="truncate">{chapter.stamp}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            stopVoice();
            onFinish();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#c7bfb0] hover:text-white border border-white/20 hover:border-[#d4943a] rounded-sm transition shrink-0"
        >
          <FastForward className="w-3.5 h-3.5" />
          Saltar Tráiler [ESC]
        </button>
      </header>

      {/* Capa central: Título final o etiqueta sutil de capítulo + subtítulos de cine */}
      <div className="relative z-20 flex-1 flex flex-col justify-between items-center px-6 py-6 pointer-events-none">
        <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-[#d4943a] bg-black/55 px-3 py-1 rounded-sm border border-[#d4943a]/30">
          {chapter.label}
        </div>

        {chapter.isTitle && (
          <div className="text-center space-y-5 pointer-events-auto">
            <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-[0.22em] text-[#f5ede0] drop-shadow-[0_6px_30px_rgba(0,0,0,0.95)] animate-glitch">
              EL ARCHIVO <span className="text-[#d4943a]">09</span>
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  onFinish();
                }}
                className="btn-primary px-7 py-3"
              >
                <Play className="w-4 h-4" />
                Despertar en Celda B-04
              </button>
              {onOpenControls && (
                <button
                  type="button"
                  onClick={() => {
                    stopVoice();
                    onOpenControls();
                  }}
                  className="btn-secondary py-3"
                >
                  Ver Controles
                </button>
              )}
              {finished && (
                <button type="button" onClick={handleReplay} className="btn-ghost text-[#d4943a]">
                  <RotateCcw className="w-4 h-4" />
                  Repetir Tráiler
                </button>
              )}
            </div>
          </div>
        )}

        {/* Subtítulos cinematográficos en la parte inferior del cuadro */}
        <div className="max-w-3xl text-center">
          <p className="inline-block bg-black/78 backdrop-blur-sm px-5 py-2.5 rounded-sm border border-white/10 text-sm sm:text-base text-[#f0e9da] leading-relaxed shadow-2xl">
            {chapter.subtitle}
          </p>
        </div>
      </div>

      {/* Barra Letterbox Inferior: Controles reales de reproductor de video */}
      <footer className="relative z-20 h-16 bg-black/95 border-t border-white/10 px-5 flex items-center gap-4">
        <button
          type="button"
          onClick={finished ? handleReplay : togglePause}
          className="p-2 text-[#ebe3d2] hover:text-[#d4943a] transition"
          aria-label={paused ? 'Reproducir' : 'Pausar'}
        >
          {finished ? (
            <RotateCcw className="w-5 h-5" />
          ) : paused ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </button>

        <span className="font-mono text-xs text-[#b5ae9e] w-24 shrink-0">
          {formatSec(currentTime)} / {formatSec(TOTAL_SECONDS)}
        </span>

        <input
          type="range"
          min={0}
          max={TOTAL_SECONDS}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-[#d4943a] cursor-pointer"
          aria-label="Línea de tiempo del tráiler"
        />

        <button
          type="button"
          onClick={toggleVoice}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-[#c7bfb0] hover:text-[#d4943a] border border-white/10 rounded-sm transition shrink-0"
          title="Activar o silenciar voz narrada"
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4 text-[#d4943a]" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{voiceEnabled ? 'Voz ON' : 'Voz OFF'}</span>
        </button>
      </footer>
    </div>
  );
}
