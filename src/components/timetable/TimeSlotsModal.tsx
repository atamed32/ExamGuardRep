import React, { useState } from 'react';
import { TimeSlot, SessionConfig } from '../../types';
import { X, Clock, Plus, Trash2, Check, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';

interface TimeSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeSlots: TimeSlot[];
  sessionConfig: SessionConfig;
  onSaveTimeSlots: (newSlots: TimeSlot[], pauseMinutes: number) => void;
  isAr?: boolean;
}

export const TimeSlotsModal: React.FC<TimeSlotsModalProps> = ({
  isOpen,
  onClose,
  timeSlots: initialSlots,
  sessionConfig,
  onSaveTimeSlots,
  isAr = false
}) => {
  if (!isOpen) return null;

  // Local state for slots
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    return initialSlots.map((s, idx) => ({
      id: s.id || `slot-${idx + 1}`,
      name: s.name || s.label || `Créneau ${idx + 1}`,
      shortName: s.shortName || `S${idx + 1}`,
      label: s.label || s.name || `Créneau ${idx + 1}`,
      heureDebut: s.debut || s.heureDebut || '08:30',
      heureFin: s.fin || s.heureFin || '10:00',
      debut: s.debut || s.heureDebut || '08:30',
      fin: s.fin || s.heureFin || '10:00'
    }));
  });

  // Pause duration in minutes
  const [pauseMinutes, setPauseMinutes] = useState<number>(() => {
    return sessionConfig.pauseBetweenSlotsMinutes ?? 30;
  });

  // Generator presets
  const [genStartTime, setGenStartTime] = useState('08:30');
  const [genDuration, setGenDuration] = useState(90);
  const [genCount, setGenCount] = useState(4);
  const [genPause, setGenPause] = useState(30);

  // Time utilities
  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToTime = (min: number): string => {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Add a slot
  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    let newStart = '08:30';
    let newEnd = '10:00';

    if (lastSlot) {
      const lastEndMin = timeToMinutes(lastSlot.heureFin || lastSlot.fin || '10:00');
      const startMin = lastEndMin + pauseMinutes;
      newStart = minutesToTime(startMin);
      newEnd = minutesToTime(startMin + 90);
    }

    const nextIdx = slots.length + 1;
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}-${nextIdx}`,
      name: `Créneau ${nextIdx} (${newStart} - ${newEnd})`,
      shortName: `S${nextIdx}`,
      label: `Créneau ${nextIdx}`,
      heureDebut: newStart,
      heureFin: newEnd,
      debut: newStart,
      fin: newEnd
    };

    setSlots(prev => [...prev, newSlot]);
  };

  // Update a single slot
  const handleUpdateSlot = (index: number, field: 'name' | 'shortName' | 'heureDebut' | 'heureFin', value: string) => {
    setSlots(prev => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === 'heureDebut') {
        target.debut = value;
      }
      if (field === 'heureFin') {
        target.fin = value;
      }
      if (field === 'heureDebut' || field === 'heureFin') {
        const hStart = field === 'heureDebut' ? value : target.heureDebut;
        const hFin = field === 'heureFin' ? value : target.heureFin;
        target.name = `${target.shortName || `Créneau ${index + 1}`} (${hStart} - ${hFin})`;
      }
      next[index] = target;
      return next;
    });
  };

  // Remove a slot
  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  // Auto generate slots with duration and pause
  const handleGenerateSequence = () => {
    let curMin = timeToMinutes(genStartTime);
    const newSlots: TimeSlot[] = [];

    for (let i = 1; i <= genCount; i++) {
      const sStart = minutesToTime(curMin);
      const sEnd = minutesToTime(curMin + genDuration);

      newSlots.push({
        id: `slot-${i}`,
        name: `Créneau ${i} (${sStart} - ${sEnd})`,
        shortName: `S${i}`,
        label: `Créneau ${i}`,
        heureDebut: sStart,
        heureFin: sEnd,
        debut: sStart,
        fin: sEnd
      });

      curMin = curMin + genDuration + genPause;
    }

    setSlots(newSlots);
    setPauseMinutes(genPause);
  };

  // Reset to default university slots
  const handleResetDefaults = () => {
    setSlots([
      { id: 'slot-1', name: 'Créneau 1 (08h30 - 10h00)', shortName: 'S1', label: 'Créneau 1', heureDebut: '08:30', heureFin: '10:00', debut: '08:30', fin: '10:00' },
      { id: 'slot-2', name: 'Créneau 2 (10h30 - 12h00)', shortName: 'S2', label: 'Créneau 2', heureDebut: '10:30', heureFin: '12:00', debut: '10:30', fin: '12:00' },
      { id: 'slot-3', name: 'Créneau 3 (13h00 - 14h30)', shortName: 'S3', label: 'Créneau 3', heureDebut: '13:00', heureFin: '14:30', debut: '13:00', fin: '14:30' },
      { id: 'slot-4', name: 'Créneau 4 (15h00 - 16h30)', shortName: 'S4', label: 'Créneau 4', heureDebut: '15:00', heureFin: '16:30', debut: '15:00', fin: '16:30' }
    ]);
    setPauseMinutes(30);
  };

  // Save changes
  const handleSave = () => {
    const formatted: TimeSlot[] = slots.map((s, idx) => ({
      id: s.id || `slot-${idx + 1}`,
      name: s.name || `Créneau ${idx + 1} (${s.heureDebut || s.debut} - ${s.heureFin || s.fin})`,
      shortName: s.shortName || `S${idx + 1}`,
      label: s.label || s.name || `Créneau ${idx + 1}`,
      heureDebut: s.heureDebut || s.debut || '08:30',
      heureFin: s.heureFin || s.fin || '10:00',
      debut: s.heureDebut || s.debut || '08:30',
      fin: s.heureFin || s.fin || '10:00'
    }));

    onSaveTimeSlots(formatted, pauseMinutes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-2 bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'تعديل الفترات الزمنية وفترة الاستراحة' : 'Configuration des créneaux horaires & de la pause'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr 
                  ? 'تخصيص أوقات بداية ونهاية كل حصة، الاستراحة بين الحصص وعدد الفترات اليومية.'
                  : 'Personnalisez les heures des épreuves, la durée de pause et le nombre de créneaux quotidiens.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Generator Box */}
          <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{isAr ? 'توليد تسلسلي تلقائي للشبكة :' : 'Générateur rapide de créneaux avec pause :'}</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateSequence}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition"
              >
                {isAr ? 'تطبيق التسلسل' : 'Appliquer la séquence'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'بداية اليوم :' : 'Début du 1er créneau :'}
                </label>
                <input
                  type="time"
                  value={genStartTime}
                  onChange={(e) => setGenStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'مدة الامتحان (د) :' : 'Durée créneau (min) :'}
                </label>
                <select
                  value={genDuration}
                  onChange={(e) => setGenDuration(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  <option value={60}>60 min (1h00)</option>
                  <option value={90}>90 min (1h30)</option>
                  <option value={120}>120 min (2h00)</option>
                  <option value={150}>150 min (2h30)</option>
                  <option value={180}>180 min (3h00)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'مدة الاستراحة (د) :' : 'Pause entre créneaux :'}
                </label>
                <select
                  value={genPause}
                  onChange={(e) => setGenPause(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min (1h00)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'عدد الحصص :' : 'Nombre de créneaux :'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={genCount}
                  onChange={(e) => setGenCount(Math.max(1, Math.min(6, Number(e.target.value))))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Pause Settings Field */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {isAr ? 'الاستراحة القياسية بين الحصص (دقيقة) :' : 'Pause standard entre créneaux consécutifs (minutes) :'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'تُستخدم لحساب الفترات الزمنية وتجنب التداخل' : 'Prise en compte par le moteur d\'emploi du temps et les contrôles de conflit.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pauseMinutes}
                onChange={(e) => setPauseMinutes(Number(e.target.value))}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>

          {/* Slots List Customizer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{isAr ? 'قائمة الحصص الزمنية المفعلة' : 'Liste détaillée des créneaux de la grille :'}</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-[10px]">
                  {slots.length}
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-semibold flex items-center gap-1 transition"
                  title="Réinitialiser la configuration standard (4 créneaux de 90 min)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? 'إعادة ضبط' : 'Par défaut'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة فترة' : 'Ajouter un créneau'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {slots.map((s, idx) => (
                <div 
                  key={s.id || idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xs hover:border-slate-400 dark:hover:border-slate-700 transition"
                >
                  <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </span>

                  {/* Code / Short name */}
                  <div className="w-16 shrink-0">
                    <input
                      type="text"
                      value={s.shortName || `S${idx + 1}`}
                      onChange={(e) => handleUpdateSlot(idx, 'shortName', e.target.value)}
                      placeholder="Code"
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center font-bold text-slate-800 dark:text-slate-100 font-mono"
                      title="Code court (ex: S1, S2, C1...)"
                    />
                  </div>

                  {/* Name / Label */}
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={s.name || `Créneau ${idx + 1}`}
                      onChange={(e) => handleUpdateSlot(idx, 'name', e.target.value)}
                      placeholder="Libellé du créneau"
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  {/* Start time */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">De</span>
                    <input
                      type="time"
                      value={s.heureDebut || s.debut || '08:30'}
                      onChange={(e) => handleUpdateSlot(idx, 'heureDebut', e.target.value)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* End time */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">à</span>
                    <input
                      type="time"
                      value={s.heureFin || s.fin || '10:00'}
                      onChange={(e) => handleUpdateSlot(idx, 'heureFin', e.target.value)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    disabled={slots.length <= 1}
                    onClick={() => handleRemoveSlot(idx)}
                    className={`p-1.5 rounded-lg transition shrink-0 ${
                      slots.length <= 1 
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                        : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                    title="Supprimer ce créneau"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Les modifications s'appliqueront immédiatement à la grille et aux plannings.</span>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-medium transition"
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? 'حفظ التعديلات' : 'Enregistrer les créneaux'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
