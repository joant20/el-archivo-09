import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Headphones,
  HelpCircle,
  KeyRound,
  Map,
  MapPin,
  Puzzle,
  Skull,
  Volume2,
  X,
} from 'lucide-react';
import { ROOMS } from '../data/roomsData.js';
import { soundEngine } from '../audio/SoundEngine.js';

const TABS = [
  { id: 'document', label: 'Documentos', icon: FileText },
  { id: 'photo', label: 'Fotografías', icon: Camera },
  { id: 'recording', label: 'Grabaciones', icon: Headphones },
  { id: 'code', label: 'Códigos', icon: KeyRound },
  { id: 'puzzles', label: 'Enigmas', icon: Puzzle },
  { id: 'rooms', label: 'Habitaciones', icon: Map },
  { id: 'clue', label: 'Pistas', icon: HelpCircle },
  { id: 'history', label: 'Eventos y Muertes', icon: Skull },
];

function formatDateTime(value) {
  if (!value) return 'Fecha desconocida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DossierModal({ saveState, initialEntryKey, onClose }) {
  const permanent = saveState?.permanent || {
    investigationEntries: [],
    solvedPuzzles: [],
    exploredRooms: [],
    deathHistory: [],
  };

  const [activeTab, setActiveTab] = useState('document');
  const [selectedId, setSelectedId] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Si se abrió haciendo clic en un documento/foto específico en el mundo, ir directo a él
  useEffect(() => {
    if (!initialEntryKey) return;
    const found = permanent.investigationEntries.find((e) => e.entry_key === initialEntryKey);
    if (found) {
      setActiveTab(found.category === 'event' ? 'history' : found.category);
      setSelectedId(found.entry_key);
    }
  }, [initialEntryKey, permanent.investigationEntries]);

  function getFilteredItems() {
    if (activeTab === 'puzzles') return permanent.solvedPuzzles;
    if (activeTab === 'rooms') return permanent.exploredRooms;
    if (activeTab === 'history') {
      const deaths = permanent.deathHistory.map((d) => ({
        _kind: 'death',
        key: `death_${d.id}`,
        title: `Muerte #${d.death_number} — Reconstrucción en ${d.checkpoint_restored}`,
        description: `${d.cause} (Amenaza: ${d.enemy_type}). Todo el Archivo de Investigación fue preservado.`,
        location_room: d.location_room,
        timestamp: d.died_at,
      }));
      const events = permanent.investigationEntries
        .filter((e) => e.category === 'event')
        .map((e) => ({
          _kind: 'event',
          key: e.entry_key,
          title: e.title,
          description: e.description,
          location_room: e.location_room,
          timestamp: e.discovered_at,
        }));
      return [...deaths, ...events].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    return permanent.investigationEntries.filter((e) => e.category === activeTab);
  }

  const items = getFilteredItems();
  const selectedEntry =
    activeTab === 'document' ||
    activeTab === 'photo' ||
    activeTab === 'recording' ||
    activeTab === 'code' ||
    activeTab === 'clue'
      ? items.find((i) => i.entry_key === selectedId) || items[0] || null
      : null;

  function playRecordingTone(entry) {
    setPlayingAudioId(entry.entry_key);
    soundEngine.init();
    soundEngine.playTapeSample(0.95);
    setTimeout(() => setPlayingAudioId(null), 2400);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/82 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="dossier-surface w-full max-w-6xl h-[88vh] rounded-sm flex flex-col overflow-hidden">
        {/* Cabecera del Expediente */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfd7c5]/15 bg-[#0c0e13]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#d4943a]">
              MEMORIA PERMANENTE (CAPA A — INMUTABLE ANTE LA MUERTE)
            </div>
            <h2 className="font-display text-xl sm:text-2xl tracking-widest text-[#ebe3d2] mt-0.5">
              ARCHIVO DE INVESTIGACIÓN
            </h2>
          </div>

          <button type="button" onClick={onClose} className="btn-secondary py-1.5 px-3 text-xs">
            <X className="w-4 h-4" />
            Cerrar [TAB / ESC]
          </button>
        </div>

        {/* Barra de 8 pestañas */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2.5 bg-[#0a0c10] border-b border-[#dfd7c5]/10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'puzzles'
                ? permanent.solvedPuzzles.length
                : tab.id === 'rooms'
                ? permanent.exploredRooms.length
                : tab.id === 'history'
                ? permanent.deathHistory.length +
                  permanent.investigationEntries.filter((e) => e.category === 'event').length
                : permanent.investigationEntries.filter((e) => e.category === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedId(null);
                }}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-sm whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#d4943a] text-[#090a0c] font-bold'
                    : 'text-[#948e80] hover:text-[#dfd7c5] hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-sm ${
                    isActive ? 'bg-black/20 text-[#090a0c]' : 'bg-white/5 text-[#948e80]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {activeTab === 'rooms' ? (
            <RoomsExplorerView
              exploredRooms={permanent.exploredRooms}
              activeCheckpoint={saveState?.checkpoint?.room_key}
            />
          ) : activeTab === 'puzzles' ? (
            <SolvedPuzzlesView solvedPuzzles={permanent.solvedPuzzles} />
          ) : activeTab === 'history' ? (
            <HistoryTimelineView items={items} deathCount={saveState?.meta?.death_count || 0} />
          ) : (
            <>
              {/* Lista izquierda */}
              <div className="md:col-span-5 border-r border-[#dfd7c5]/10 overflow-y-auto p-4 space-y-2.5 bg-[#0c0f14]">
                {items.length === 0 ? (
                  <div className="py-12 px-4 text-center text-xs font-mono text-[#7c776b] border border-dashed border-[#dfd7c5]/12 rounded-sm">
                    Sin registros descubiertos en esta sección todavía. Explora las habitaciones e
                    inspecciona objetos con [E].
                  </div>
                ) : (
                  items.map((entry) => {
                    const isSelected = selectedEntry?.entry_key === entry.entry_key;
                    return (
                      <button
                        key={entry.entry_key}
                        type="button"
                        onClick={() => setSelectedId(entry.entry_key)}
                        className={`w-full text-left p-3.5 rounded-sm border transition ${
                          isSelected
                            ? 'bg-[#1a1f28] border-[#d4943a]/70'
                            : 'bg-[#101319] border-[#dfd7c5]/10 hover:border-[#dfd7c5]/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm text-[#ebe3d2] leading-snug">
                            {entry.title}
                          </span>
                          {entry.category === 'clue' && (
                            <span
                              className={`shrink-0 px-2 py-0.5 text-[10px] font-mono uppercase rounded-sm ${
                                entry.is_resolved
                                  ? 'bg-[#4d9e6f]/20 text-[#7fe0a7] border border-[#4d9e6f]/40'
                                  : 'bg-[#d4943a]/20 text-[#f0ba65] border border-[#d4943a]/40'
                              }`}
                            >
                              {entry.is_resolved ? 'Resuelta' : 'Pendiente'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-[#8e887a]">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#d4943a]" />
                            {entry.location_room}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(entry.discovered_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Visor detallado derecha */}
              <div className="md:col-span-7 overflow-y-auto p-6 bg-[#11141a]">
                {!selectedEntry ? (
                  <div className="h-full flex items-center justify-center text-xs font-mono text-[#7c776b]">
                    Selecciona un elemento del expediente para inspeccionarlo.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="border-b border-[#dfd7c5]/12 pb-4">
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#948e80] mb-2">
                        <span className="inline-flex items-center gap-1 text-[#d4943a]">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedEntry.location_room}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Registrado: {formatDateTime(selectedEntry.discovered_at)}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl text-[#ebe3d2]">
                        {selectedEntry.title}
                      </h3>
                    </div>

                    <p className="text-sm text-[#d6cebc] leading-relaxed">
                      {selectedEntry.description}
                    </p>

                    {/* Visor especial según categoría */}
                    {selectedEntry.category === 'document' && selectedEntry.content_data?.excerpt && (
                      <div className="p-5 bg-[#1b1915] border border-[#d4943a]/30 rounded-sm space-y-2 shadow-inner">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#a39882] uppercase border-b border-[#dfd7c5]/10 pb-2">
                          <span>{selectedEntry.content_data.author}</span>
                          <span>{selectedEntry.content_data.dateWritten}</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-[#ece3cf] leading-relaxed">
                          {selectedEntry.content_data.excerpt}
                        </pre>
                      </div>
                    )}

                    {selectedEntry.category === 'photo' && (
                      <PhotoEvidenceCard contentData={selectedEntry.content_data} />
                    )}

                    {selectedEntry.category === 'recording' && (
                      <div className="p-5 bg-[#0b0e13] border border-[#d4943a]/35 rounded-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-xs text-[#d4943a]">
                            CINTA MAGNÉTICA · DURACIÓN {selectedEntry.content_data?.duration || '00:30'}
                          </div>
                          <button
                            type="button"
                            onClick={() => playRecordingTone(selectedEntry)}
                            className="btn-primary py-1.5 px-3 text-xs"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            {playingAudioId === selectedEntry.entry_key
                              ? 'Reproduciendo señal...'
                              : 'Reproducir Cinta'}
                          </button>
                        </div>
                        <blockquote className="border-l-2 border-[#d4943a]/60 pl-4 font-mono text-xs text-[#dfd7c5] leading-relaxed">
                          “{selectedEntry.content_data?.transcript || selectedEntry.description}”
                        </blockquote>
                      </div>
                    )}

                    {selectedEntry.category === 'code' && selectedEntry.content_data?.value && (
                      <div className="p-5 bg-[#0a1410] border border-[#4d9e6f]/45 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-[#79d9a1]">
                            VALOR REGISTRADO
                          </div>
                          <div className="font-mono text-2xl font-bold tracking-[0.2em] text-[#ebe3d2] mt-1">
                            {selectedEntry.content_data.value}
                          </div>
                        </div>
                        <div className="text-xs font-mono text-[#948e80]">
                          Destino: {selectedEntry.content_data.target}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoEvidenceCard({ contentData }) {
  return (
    <div className="bg-[#e8e1d1] text-[#1a1814] p-4 pb-6 rounded-sm max-w-md shadow-2xl border border-black/30">
      <div className="bg-[#14171c] text-[#dfd7c5] p-5 border border-black/50 space-y-3 font-mono">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#d4943a]">
          {contentData?.photoType === 'missing_board'
            ? 'CUARTO OSCURO — REVELADO ROJO'
            : 'ARCHIVO FOTOGRÁFICO — 1989'}
        </div>
        <div className="text-sm font-bold tracking-wider border-y border-[#dfd7c5]/20 py-2">
          {contentData?.caption}
        </div>
        <ul className="space-y-1.5 text-xs text-[#ece3cf]">
          {(contentData?.highlights || []).map((line) => (
            <li key={line} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4943a]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 text-center font-mono text-[11px] text-[#453f34] font-semibold">
        Evidencia física escaneada — Expediente #09
      </div>
    </div>
  );
}

function RoomsExplorerView({ exploredRooms, activeCheckpoint }) {
  const exploredMap = new Map(exploredRooms.map((r) => [r.room_key, r]));
  return (
    <div className="md:col-span-12 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[#ebe3d2]">
          PLANO DE EXPLORACIÓN ({exploredRooms.length} / {ROOMS.length} HABITACIONES)
        </h3>
        <span className="font-mono text-xs text-[#4d9e6f]">
          Nodo de Estabilización activo: {activeCheckpoint || 'celda_b04'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ROOMS.map((room) => {
          const info = exploredMap.get(room.key);
          const isCp = activeCheckpoint === room.key;
          return (
            <div
              key={room.key}
              className={`p-4 rounded-sm border ${
                info
                  ? 'bg-[#12171f] border-[#d4943a]/40'
                  : 'bg-[#0a0c10] border-[#dfd7c5]/10 opacity-55'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-[#ebe3d2]">{room.name}</span>
                {isCp && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#4d9e6f]/25 text-[#7fe0a7] border border-[#4d9e6f]/50">
                    NODO
                  </span>
                )}
              </div>
              {info ? (
                <div className="mt-2 space-y-1 text-[10px] font-mono text-[#948e80]">
                  <div>Primera visita: {formatDateTime(info.first_visited_at)}</div>
                  <div>Visitas registradas: {info.visit_count}</div>
                </div>
              ) : (
                <div className="mt-2 text-[10px] font-mono text-[#6b675e]">
                  Área aún no explorada
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolvedPuzzlesView({ solvedPuzzles }) {
  return (
    <div className="md:col-span-12 overflow-y-auto p-6 space-y-4">
      <h3 className="font-display text-lg text-[#ebe3d2]">
        ENIGMAS RESUELTOS ({solvedPuzzles.length} / 5)
      </h3>
      {solvedPuzzles.length === 0 ? (
        <div className="p-8 text-center text-xs font-mono text-[#7c776b] border border-dashed border-[#dfd7c5]/15">
          Todavía no has resuelto ningún enigma. Reúne documentos y fotografías para deducir claves.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {solvedPuzzles.map((p) => (
            <div
              key={p.puzzle_key}
              className="p-4 bg-[#0f1914] border border-[#4d9e6f]/40 rounded-sm space-y-2"
            >
              <div className="flex items-center gap-2 text-[#7fe0a7] font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {p.puzzle_title}
              </div>
              <p className="text-xs text-[#dfd7c5]">{p.solution_summary}</p>
              <div className="flex flex-wrap gap-3 text-[10px] font-mono text-[#948e80]">
                <span>Ubicación: {p.location_room}</span>
                <span>Resuelto: {formatDateTime(p.solved_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTimelineView({ items, deathCount }) {
  return (
    <div className="md:col-span-12 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[#ebe3d2]">
          LÍNEA TEMPORAL DE ACONTECIMIENTOS Y MUERTES
        </h3>
        <span className="font-mono text-xs text-[#e07a7a]">
          Reconstrucciones celulares totales: {deathCount}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.key}
            className={`p-4 rounded-sm border ${
              item._kind === 'death'
                ? 'bg-[#1d0f12] border-[#a82929]/55'
                : 'bg-[#11151c] border-[#dfd7c5]/12'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`font-semibold text-sm ${
                  item._kind === 'death' ? 'text-[#f2a2a2]' : 'text-[#ebe3d2]'
                }`}
              >
                {item.title}
              </span>
              <span className="font-mono text-[10px] text-[#948e80]">
                {formatDateTime(item.timestamp)}
              </span>
            </div>
            <p className="text-xs text-[#cfc7b6] mt-1">{item.description}</p>
            <div className="text-[10px] font-mono text-[#d4943a] mt-1.5">
              Ubicación: {item.location_room}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
