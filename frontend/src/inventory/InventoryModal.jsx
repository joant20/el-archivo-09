import React from 'react';
import { Backpack, BatteryCharging, Flame, HeartPulse, KeyRound, X } from 'lucide-react';
import { CONSUMABLE_DEFS, KEY_ITEM_DEFS } from './InventoryManager.js';

export function InventoryModal({ saveState, onUseConsumable, onClose }) {
  const consumables = saveState?.survival?.consumables || {};
  const keyItems = saveState?.survival?.keyItems || [];

  const getIcon = (key) => {
    if (key === 'medkit') return <HeartPulse className="w-5 h-5 text-[#e06363]" />;
    if (key === 'battery') return <BatteryCharging className="w-5 h-5 text-[#d4943a]" />;
    if (key === 'flare') return <Flame className="w-5 h-5 text-[#f09d51]" />;
    return <KeyRound className="w-5 h-5 text-[#7fe0a7]" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="dossier-surface w-full max-w-3xl rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div className="flex items-center gap-2.5">
            <Backpack className="w-5 h-5 text-[#d4943a]" />
            <div>
              <h2 className="font-display text-xl tracking-widest text-[#ebe3d2]">
                EQUIPO E INVENTARIO
              </h2>
              <p className="text-[11px] font-mono text-[#948e80]">
                Consumibles temporales (Capa B) y objetos clave permanentes
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary py-1.5 px-3 text-xs">
            <X className="w-4 h-4" />
            Cerrar [I / ESC]
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Consumibles (Capa B) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#d4943a]">
                Suministros Consumibles (Se reinician al último punto de control al morir)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(CONSUMABLE_DEFS).map((item) => {
                const qty = consumables[item.key] || 0;
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-sm border flex flex-col justify-between gap-3 ${
                      qty > 0
                        ? 'bg-[#12161e] border-[#dfd7c5]/18'
                        : 'bg-[#0a0c10] border-[#dfd7c5]/8 opacity-55'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {getIcon(item.key)}
                        <span className="font-mono text-lg font-bold text-[#ebe3d2]">x{qty}</span>
                      </div>
                      <div className="font-semibold text-sm text-[#ebe3d2]">{item.name}</div>
                      <p className="text-xs text-[#948e80] leading-snug">{item.shortDesc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => {
                        onUseConsumable(item.key);
                        if (item.key === 'flare') onClose();
                      }}
                      className="btn-primary py-1.5 text-xs w-full"
                    >
                      {item.key === 'flare' ? 'Lanzar Ahora' : 'Usar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Objetos Clave */}
          <section className="space-y-3 border-t border-[#dfd7c5]/10 pt-5">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#7fe0a7]">
              Objetos Clave y Credenciales (Conservados)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {keyItems.map((keyId) => {
                const def = KEY_ITEM_DEFS[keyId] || {
                  key: keyId,
                  name: keyId,
                  shortDesc: 'Objeto clave de la instalación.',
                };
                return (
                  <div
                    key={def.key}
                    className="p-3.5 bg-[#0f1814] border border-[#4d9e6f]/35 rounded-sm flex items-start gap-3"
                  >
                    <div className="mt-0.5">{getIcon(def.key)}</div>
                    <div>
                      <div className="font-semibold text-sm text-[#ebe3d2]">{def.name}</div>
                      <p className="text-xs text-[#a5b8ad] mt-0.5">{def.shortDesc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
