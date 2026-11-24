import React, { useState } from 'react';
import { BookOpen, HelpCircle, Home, Mouse, Play, Volume2 } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine.js';
import { eventBus } from '../game/EventBus.js';

export function PauseModal({ onResume, onOpenDossier, onOpenGuide, onExitToMenu }) {
  const [volumes, setVolumes] = useState({ ...soundEngine.volumes });
  const [sensitivity, setSensitivity] = useState(0.0021);

  function updateVolume(key, value) {
    const num = Number(value);
    const next = { ...volumes, [key]: num };
    setVolumes(next);
    soundEngine.setVolumes(next);
  }

  function updateSensitivity(value) {
    const num = Number(value);
    setSensitivity(num);
    eventBus.emit('fps:setSensitivity', num);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/82 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-md rounded-sm p-6 space-y-5">
        <div className="text-center border-b border-[#dfd7c5]/12 pb-4">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#d4943a]">
            SISTEMA EN PAUSA
          </div>
          <h2 className="font-display text-2xl tracking-widest text-[#ebe3d2] mt-1">
            EL ARCHIVO 09
          </h2>
        </div>

        {/* Sensibilidad de cámara FPS */}
        <div className="space-y-2 bg-[#0a0c10] p-4 rounded-sm border border-[#dfd7c5]/10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#d4943a]">
            <Mouse className="w-4 h-4" />
            Cámara en Primera Persona
          </div>
          <label className="block space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-[#c7bfb0]">
              <span>Sensibilidad del Mouse</span>
              <span>{Math.round((sensitivity / 0.004) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0008"
              max="0.0042"
              step="0.0001"
              value={sensitivity}
              onChange={(e) => updateSensitivity(e.target.value)}
              className="w-full accent-[#d4943a]"
            />
          </label>
        </div>

        {/* Controles de audio reales */}
        <div className="space-y-3 bg-[#0a0c10] p-4 rounded-sm border border-[#dfd7c5]/10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#d4943a]">
            <Volume2 className="w-4 h-4" />
            Mezclador de Audio 3D
          </div>
          {[
            { key: 'master', label: 'Volumen General' },
            { key: 'ambient', label: 'Ambiente / Dron' },
            { key: 'sfx', label: 'Efectos / Espacial 3D' },
          ].map((slider) => (
            <label key={slider.key} className="block space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-[#c7bfb0]">
                <span>{slider.label}</span>
                <span>{Math.round(volumes[slider.key] * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumes[slider.key]}
                onChange={(e) => updateVolume(slider.key, e.target.value)}
                className="w-full accent-[#d4943a]"
              />
            </label>
          ))}
        </div>

        <div className="space-y-2.5">
          <button type="button" onClick={onResume} className="btn-primary w-full">
            <Play className="w-4 h-4" />
            Reanudar en Primera Persona
          </button>
          <button type="button" onClick={onOpenDossier} className="btn-secondary w-full">
            <BookOpen className="w-4 h-4 text-[#d4943a]" />
            Archivo de Investigación [TAB]
          </button>
          <button type="button" onClick={onOpenGuide} className="btn-secondary w-full">
            <HelpCircle className="w-4 h-4 text-[#d4943a]" />
            Cómo Jugar / Instrucciones [H]
          </button>
          <button type="button" onClick={onExitToMenu} className="btn-danger w-full">
            <Home className="w-4 h-4" />
            Volver al Menú Principal
          </button>
        </div>
      </div>
    </div>
  );
}
