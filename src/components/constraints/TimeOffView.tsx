import React, { useState } from 'react';
import { 
  Teacher, 
  Room, 
  PromotionGroup, 
  TimeSlot, 
  TimeOffEntry, 
  TimeOffValue 
} from '../../types';
import { Translations } from '../../services/i18n';
import { 
  Check, 
  X, 
  AlertCircle, 
  Users, 
  DoorClosed, 
  Layers, 
  RotateCcw, 
  Calendar,
  Sliders
} from 'lucide-react';

interface TimeOffViewProps {
  teachers: Teacher[];
  rooms: Room[];
  promotions: PromotionGroup[];
  timeSlots: TimeSlot[];
  sessionDates: string[];
  timeOffConstraints: TimeOffEntry[];
  t: Translations;
  onUpdateTimeOff: (updated: TimeOffEntry[]) => void;
}

export const TimeOffView: React.FC<TimeOffViewProps> = ({
  teachers,
  rooms,
  promotions,
  timeSlots,
  sessionDates,
  timeOffConstraints,
  t,
  onUpdateTimeOff
}) => {
  const [selectedType, setSelectedType] = useState<'teacher' | 'room' | 'promotion'>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(teachers[0]?.id || '');
  const [filterSearch, setFilterSearch] = useState('');

  // Helper to get status of entity for a specific date and timeslot
  const getSlotValue = (entityId: string, entityType: 'teacher' | 'room' | 'promotion', date: string, timeSlotId?: string): TimeOffValue => {
    const found = timeOffConstraints.find(
      c => c.entityId === entityId && c.entityType === entityType && c.date === date && (!timeSlotId || !c.timeSlotId || c.timeSlotId === timeSlotId)
    );
    return found ? found.value : 'AVAILABLE';
  };

  // Cycle slot value: AVAILABLE -> UNDESIRED -> UNAVAILABLE -> AVAILABLE
  const cycleSlotValue = (entityId: string, entityType: 'teacher' | 'room' | 'promotion', date: string, timeSlotId?: string) => {
    const current = getSlotValue(entityId, entityType, date, timeSlotId);
    let nextValue: TimeOffValue = 'AVAILABLE';
    if (current === 'AVAILABLE') nextValue = 'UNDESIRED';
    else if (current === 'UNDESIRED') nextValue = 'UNAVAILABLE';
    else nextValue = 'AVAILABLE';

    const filtered = timeOffConstraints.filter(
      c => !(c.entityId === entityId && c.entityType === entityType && c.date === date && (!timeSlotId || !c.timeSlotId || c.timeSlotId === timeSlotId))
    );

    if (nextValue !== 'AVAILABLE') {
      filtered.push({
        id: `timeoff-${entityType}-${entityId}-${date}-${timeSlotId || 'all'}`,
        entityType,
        entityId,
        date,
        timeSlotId,
        value: nextValue
      });
    }

    onUpdateTimeOff(filtered);
  };

  // Batch toggle whole date
  const toggleWholeDate = (entityId: string, entityType: 'teacher' | 'room' | 'promotion', date: string, value: TimeOffValue) => {
    let filtered = timeOffConstraints.filter(
      c => !(c.entityId === entityId && c.entityType === entityType && c.date === date)
    );

    if (value !== 'AVAILABLE') {
      timeSlots.forEach(ts => {
        filtered.push({
          id: `timeoff-${entityType}-${entityId}-${date}-${ts.id}`,
          entityType,
          entityId,
          date,
          timeSlotId: ts.id,
          value
        });
      });
    }

    onUpdateTimeOff(filtered);
  };

  // Reset selected entity to all available
  const resetEntity = (entityId: string, entityType: 'teacher' | 'room' | 'promotion') => {
    const filtered = timeOffConstraints.filter(
      c => !(c.entityId === entityId && c.entityType === entityType)
    );
    onUpdateTimeOff(filtered);
  };

  const activeEntityName = () => {
    if (selectedType === 'teacher') {
      const t = teachers.find(x => x.id === selectedEntityId);
      return t ? `${t.nom} ${t.prenom}` : 'Sélectionner un enseignant';
    }
    if (selectedType === 'room') {
      const r = rooms.find(x => x.id === selectedEntityId);
      return r ? `${r.nom} (${r.capaciteExamen} places)` : 'Sélectionner une salle';
    }
    const p = promotions.find(x => x.id === selectedEntityId);
    return p ? `${p.nom} (${p.filiere})` : 'Sélectionner une promotion';
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Left Sidebar: Entities List */}
      <div className="w-full lg:w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-xs">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-1 rtl:space-x-reverse mb-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setSelectedType('teacher');
                if (teachers.length > 0) setSelectedEntityId(teachers[0].id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition ${
                selectedType === 'teacher' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Enseignants</span>
            </button>

            <button
              onClick={() => {
                setSelectedType('room');
                if (rooms.length > 0) setSelectedEntityId(rooms[0].id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition ${
                selectedType === 'room' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>Salles</span>
            </button>

            <button
              onClick={() => {
                setSelectedType('promotion');
                if (promotions.length > 0) setSelectedEntityId(promotions[0].id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition ${
                selectedType === 'promotion' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Promotions</span>
            </button>
          </div>

          <input
            type="text"
            placeholder={t.search}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* Scrollable list of entities */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {selectedType === 'teacher' && teachers
            .filter(t => `${t.nom} ${t.prenom} ${t.departement}`.toLowerCase().includes(filterSearch.toLowerCase()))
            .map(t => {
              const constraintCount = timeOffConstraints.filter(c => c.entityId === t.id && c.entityType === 'teacher').length;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedEntityId(t.id)}
                  className={`w-full text-left rtl:text-right p-2 rounded-lg text-xs transition flex items-center justify-between ${
                    selectedEntityId === t.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{t.nom} {t.prenom}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.grade} - {t.departement}</div>
                  </div>
                  {constraintCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded font-mono font-semibold">
                      {constraintCount}
                    </span>
                  )}
                </button>
              );
            })}

          {selectedType === 'room' && rooms
            .filter(r => `${r.nom} ${r.type}`.toLowerCase().includes(filterSearch.toLowerCase()))
            .map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedEntityId(r.id)}
                className={`w-full text-left rtl:text-right p-2 rounded-lg text-xs transition flex items-center justify-between ${
                  selectedEntityId === r.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent'
                }`}
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{r.nom}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{r.type} - {r.batiment}</div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">{r.capaciteExamen} pl.</span>
              </button>
            ))}

          {selectedType === 'promotion' && promotions
            .filter(p => `${p.nom} ${p.filiere}`.toLowerCase().includes(filterSearch.toLowerCase()))
            .map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedEntityId(p.id)}
                className={`w-full text-left rtl:text-right p-2 rounded-lg text-xs transition flex items-center justify-between ${
                  selectedEntityId === p.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent'
                }`}
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.nom}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.filiere} ({p.cycle})</div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">{p.effectif} ét.</span>
              </button>
            ))}
        </div>
      </div>

      {/* Right Main Area: Interactive aSc Time-Off Grid */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {/* Entity Banner & Quick Actions */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Disponibilités & Contraintes de surveillance :</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center space-x-2 rtl:space-x-reverse">
              <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{activeEntityName()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => resetEntity(selectedEntityId, selectedType)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Tout réinitialiser à Disponible</span>
            </button>
          </div>
        </div>

        {/* Legend / Instructions */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs mb-4 flex-wrap shadow-xs">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <span className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-white font-bold text-[10px]">
              ✓
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t.availableSlot}</span>
          </div>

          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <span className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white font-bold text-[10px]">
              ?
            </span>
            <span className="text-amber-700 dark:text-amber-400 font-semibold">{t.undesiredSlot}</span>
          </div>

          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <span className="w-4 h-4 rounded bg-rose-600 flex items-center justify-center text-white font-bold text-[10px]">
              ✕
            </span>
            <span className="text-rose-700 dark:text-rose-400 font-semibold">{t.unavailableSlot}</span>
          </div>

          <div className="text-slate-500 dark:text-slate-400 text-[11px] ml-auto">
            Astuce : Cliquez sur une case pour basculer son statut (Disponible → Non souhaité → Interdit).
          </div>
        </div>

        {/* The aSc Time-Off Grid */}
        <div className="overflow-x-auto bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 text-left rtl:text-right font-bold text-slate-700 dark:text-slate-300 w-44">
                  Jour / Date
                </th>
                {timeSlots.map(slot => (
                  <th key={slot.id} className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    <div>{slot.debut} - {slot.fin}</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({slot.label})</div>
                  </th>
                ))}
                <th className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400 w-32">
                  Action Rapide
                </th>
              </tr>
            </thead>
            <tbody>
              {sessionDates.map(date => (
                <tr key={date} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2 rtl:space-x-reverse">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{date}</span>
                  </td>

                  {timeSlots.map(slot => {
                    const status = getSlotValue(selectedEntityId, selectedType, date, slot.id);

                    return (
                      <td key={slot.id} className="p-2 text-center">
                        <button
                          onClick={() => cycleSlotValue(selectedEntityId, selectedType, date, slot.id)}
                          className={`w-full py-2.5 px-2 rounded-lg font-bold transition flex flex-col items-center justify-center gap-1 shadow-2xs ${
                            status === 'AVAILABLE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                              : status === 'UNDESIRED'
                              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/70'
                          }`}
                        >
                          {status === 'AVAILABLE' && (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-[10px]">Disponible</span>
                            </>
                          )}
                          {status === 'UNDESIRED' && (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-[10px]">Non souhaité</span>
                            </>
                          )}
                          {status === 'UNAVAILABLE' && (
                            <>
                              <X className="w-4 h-4" />
                              <span className="text-[10px]">Indisponible</span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}

                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-1 rtl:space-x-reverse">
                      <button
                        onClick={() => toggleWholeDate(selectedEntityId, selectedType, date, 'UNAVAILABLE')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/40 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded text-[10px] font-semibold border border-rose-300 dark:border-rose-700/50 transition shadow-2xs"
                        title="Bloquer toute la journée"
                      >
                        Veto Jour
                      </button>
                      <button
                        onClick={() => toggleWholeDate(selectedEntityId, selectedType, date, 'AVAILABLE')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-semibold border border-emerald-300 dark:border-emerald-700/50 transition shadow-2xs"
                        title="Rendre disponible toute la journée"
                      >
                        Libérer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
