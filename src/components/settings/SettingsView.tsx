import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Building, 
  GraduationCap, 
  FileText, 
  Globe, 
  Upload, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Shield, 
  Palette, 
  Moon, 
  Sun, 
  Landmark, 
  Monitor,
  Clock,
  Calendar,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { 
  InstitutionSettings, 
  SemesterType, 
  SessionType, 
  Language, 
  ThemeMode, 
  ThemeSettings, 
  AccentColor, 
  SessionConfig, 
  TimeSlot 
} from '../../types';
import { translations } from '../../services/i18n';

interface SettingsViewProps {
  settings: InstitutionSettings;
  onSaveSettings: (settings: InstitutionSettings) => void;
  sessionConfig?: SessionConfig;
  onSaveSessionConfig?: (config: SessionConfig) => void;
  language: Language;
  onToggleLanguage: () => void;
  initialTab?: 'institution' | 'slots' | 'calendar' | 'theme';
  themeSettings?: ThemeSettings;
  onSelectThemeMode?: (mode: ThemeMode) => void;
  onSelectAccentColor?: (accent: AccentColor) => void;
}

const WEEK_DAYS = [
  { index: 0, label: 'Dimanche', short: 'Dim' },
  { index: 1, label: 'Lundi', short: 'Lun' },
  { index: 2, label: 'Mardi', short: 'Mar' },
  { index: 3, label: 'Mercredi', short: 'Mer' },
  { index: 4, label: 'Jeudi', short: 'Jeu' },
  { index: 5, label: 'Vendredi', short: 'Ven' },
  { index: 6, label: 'Samedi', short: 'Sam' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  sessionConfig,
  onSaveSessionConfig,
  language,
  onToggleLanguage,
  initialTab = 'institution',
  themeSettings,
  onSelectThemeMode,
  onSelectAccentColor
}) => {
  const t = translations[language];

  // Active Tab: 'institution' | 'slots' | 'calendar' | 'theme'
  const [activeTab, setActiveTab] = useState<'institution' | 'slots' | 'calendar' | 'theme'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form State: Institution Settings
  const [instFormData, setInstFormData] = useState<InstitutionSettings>({ ...settings });
  const [newInstruction, setNewInstruction] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form State: Session & Time Slots Configuration
  const [configFormData, setConfigFormData] = useState<SessionConfig>(() => {
    if (sessionConfig) {
      return { ...sessionConfig };
    }
    return {
      anneeUniversitaire: settings.anneeUniversitaire || '2025/2026',
      semestre: settings.semestreActuel || 'S1',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      workingDays: [0, 1, 2, 3, 4], // Dimanche à Jeudi
      timeSlots: [
        { id: 'ts-1', label: 'Créneau 1', debut: '08:30', fin: '10:00', heureDebut: '08:30', heureFin: '10:00' },
        { id: 'ts-2', label: 'Créneau 2', debut: '10:30', fin: '12:00', heureDebut: '10:30', heureFin: '12:00' },
        { id: 'ts-3', label: 'Créneau 3', debut: '13:30', fin: '15:00', heureDebut: '13:30', heureFin: '15:00' },
        { id: 'ts-4', label: 'Créneau 4', debut: '15:30', fin: '17:00', heureDebut: '15:30', heureFin: '17:00' }
      ]
    };
  });

  // Local helper states for slot generation
  const [dayStartTime, setDayStartTime] = useState<string>('08:30');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(90);
  const [pauseMinutes, setPauseMinutes] = useState<number>(30);
  const [lunchPauseMinutes, setLunchPauseMinutes] = useState<number>(90);
  const [slotCount, setSlotCount] = useState<number>(() => configFormData.timeSlots?.length || 4);

  // Sync when props change
  useEffect(() => {
    setInstFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    if (sessionConfig) {
      setConfigFormData({ ...sessionConfig });
      if (sessionConfig.timeSlots) {
        setSlotCount(sessionConfig.timeSlots.length);
      }
    }
  }, [sessionConfig]);

  // Handle Institution changes
  const handleInstChange = (field: keyof InstitutionSettings, value: any) => {
    setInstFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setInstFormData(prev => ({
      ...prev,
      instructionsOfficielles: [...prev.instructionsOfficielles, newInstruction.trim()]
    }));
    setNewInstruction('');
  };

  const handleRemoveInstruction = (index: number) => {
    setInstFormData(prev => ({
      ...prev,
      instructionsOfficielles: prev.instructionsOfficielles.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setInstFormData(prev => ({ ...prev, cachetBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSloganUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setInstFormData(prev => ({ ...prev, sloganBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Slot changes
  const handleSlotChange = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...(configFormData.timeSlots || [])];
    if (!updated[index]) return;
    updated[index] = {
      ...updated[index],
      [field]: value,
      ...(field === 'debut' ? { heureDebut: value } : {}),
      ...(field === 'fin' ? { heureFin: value } : {})
    };
    setConfigFormData(prev => ({ ...prev, timeSlots: updated, dailySlots: updated }));
  };

  const handleAddSlot = () => {
    const slots = configFormData.timeSlots || [];
    const newIndex = slots.length + 1;
    const newSlot: TimeSlot = {
      id: `ts-${Date.now()}-${newIndex}`,
      label: `Créneau ${newIndex}`,
      debut: '08:30',
      fin: '10:00',
      heureDebut: '08:30',
      heureFin: '10:00'
    };
    const updated = [...slots, newSlot];
    setConfigFormData(prev => ({ ...prev, timeSlots: updated, dailySlots: updated }));
    setSlotCount(updated.length);
  };

  const handleRemoveSlot = (index: number) => {
    const slots = configFormData.timeSlots || [];
    const updated = slots.filter((_, i) => i !== index);
    setConfigFormData(prev => ({ ...prev, timeSlots: updated, dailySlots: updated }));
    setSlotCount(updated.length);
  };

  // Helper to add minutes to "HH:MM"
  const addMinutesToTime = (timeStr: string, minsToAdd: number): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = (h || 0) * 60 + (m || 0) + minsToAdd;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Auto regenerate slots
  const handleAutoGenerateSlots = () => {
    const count = Math.max(1, Math.min(8, slotCount));
    const generated: TimeSlot[] = [];
    let currentTime = dayStartTime;

    for (let i = 1; i <= count; i++) {
      const startTime = currentTime;
      const endTime = addMinutesToTime(startTime, slotDurationMinutes);
      generated.push({
        id: `ts-${i}`,
        label: `Créneau ${i}`,
        name: `Créneau ${i} (${startTime} - ${endTime})`,
        shortName: `C${i}`,
        debut: startTime,
        fin: endTime,
        heureDebut: startTime,
        heureFin: endTime
      });

      // Pause before next slot
      if (i < count) {
        // Lunch pause between slots 2 and 3 if at least 4 slots
        const isLunchBreak = (i === 2 && count >= 3);
        const pause = isLunchBreak ? lunchPauseMinutes : pauseMinutes;
        currentTime = addMinutesToTime(endTime, pause);
      }
    }

    setConfigFormData(prev => ({ ...prev, timeSlots: generated, dailySlots: generated }));
  };

  // Handle Working Days toggle
  const handleToggleWorkingDay = (dayIndex: number) => {
    const current = configFormData.workingDays || [0, 1, 2, 3, 4];
    const exists = current.includes(dayIndex);
    const updated = exists ? current.filter(d => d !== dayIndex) : [...current, dayIndex].sort();
    setConfigFormData(prev => ({ ...prev, workingDays: updated }));
  };

  // Generate date list between dateDebut and dateFin
  const dateList = React.useMemo(() => {
    const dates: { dateStr: string; dayIndex: number; dayLabel: string; isWorkingDay: boolean; isActive: boolean }[] = [];
    if (!configFormData.dateDebut || !configFormData.dateFin) return dates;

    const start = new Date(configFormData.dateDebut);
    const end = new Date(configFormData.dateFin);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;

    const curr = new Date(start);
    const maxDays = 60;
    let count = 0;

    const activeList = configFormData.datesActives;
    const workingDays = configFormData.workingDays || [0, 1, 2, 3, 4];

    while (curr <= end && count < maxDays) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayIndex = curr.getDay();
      const isWorkingDay = workingDays.includes(dayIndex);
      const isActive = activeList !== undefined && activeList !== null
        ? activeList.includes(dateStr)
        : isWorkingDay;

      const dayObj = WEEK_DAYS.find(w => w.index === dayIndex);
      dates.push({
        dateStr,
        dayIndex,
        dayLabel: dayObj?.label || 'Jour',
        isWorkingDay,
        isActive
      });

      curr.setDate(curr.getDate() + 1);
      count++;
    }

    return dates;
  }, [configFormData.dateDebut, configFormData.dateFin, configFormData.workingDays, configFormData.datesActives]);

  // Toggle specific date active/inactive
  const handleToggleSpecificDate = (dateStr: string) => {
    const currentActives = dateList.filter(d => d.isActive).map(d => d.dateStr);
    const exists = currentActives.includes(dateStr);
    const updated = exists ? currentActives.filter(d => d !== dateStr) : [...currentActives, dateStr].sort();

    setConfigFormData(prev => ({ ...prev, datesActives: updated }));
  };

  // Helper actions for calendar days
  const handleSelectAllWorkingDays = () => {
    const actives = dateList.filter(d => d.isWorkingDay).map(d => d.dateStr);
    setConfigFormData(prev => ({ ...prev, datesActives: actives }));
  };

  const handleSelectAllDays = () => {
    const actives = dateList.map(d => d.dateStr);
    setConfigFormData(prev => ({ ...prev, datesActives: actives }));
  };

  const handleDeselectAllDays = () => {
    setConfigFormData(prev => ({ ...prev, datesActives: [] }));
  };

  // Save Handlers
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeDates = dateList.filter(d => d.isActive).map(d => d.dateStr);
    const updatedSlots = (configFormData.timeSlots || []).map((s, idx) => ({
      ...s,
      id: s.id || `ts-${idx + 1}`,
      label: s.label || `Créneau ${idx + 1}`,
      debut: s.debut || s.heureDebut || '08:30',
      fin: s.fin || s.heureFin || '10:00',
      heureDebut: s.heureDebut || s.debut || '08:30',
      heureFin: s.heureFin || s.fin || '10:00'
    }));

    const fullConfig: SessionConfig = {
      ...configFormData,
      datesActives: activeDates,
      timeSlots: updatedSlots,
      dailySlots: updatedSlots,
      anneeUniversitaire: instFormData.anneeUniversitaire || configFormData.anneeUniversitaire,
      semestre: instFormData.semestreActuel || configFormData.semestre
    };

    onSaveSettings(instFormData);
    if (onSaveSessionConfig) {
      onSaveSessionConfig(fullConfig);
    }
    setSuccessMessage('Toutes les configurations (Établissement, Horaires & Calendrier) ont été enregistrées et actualisées dans l\'emploi du temps !');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSaveInstitutionOnly = () => {
    onSaveSettings(instFormData);
    if (onSaveSessionConfig) {
      onSaveSessionConfig({
        ...configFormData,
        anneeUniversitaire: instFormData.anneeUniversitaire || configFormData.anneeUniversitaire,
        semestre: instFormData.semestreActuel || configFormData.semestre
      });
    }
    setSuccessMessage('Coordonnées de l\'établissement et en-tête enregistrés et appliqués.');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveSlotsOnly = () => {
    const updatedSlots = (configFormData.timeSlots || []).map((s, idx) => ({
      ...s,
      id: s.id || `ts-${idx + 1}`,
      label: s.label || `Créneau ${idx + 1}`,
      debut: s.debut || s.heureDebut || '08:30',
      fin: s.fin || s.heureFin || '10:00',
      heureDebut: s.heureDebut || s.debut || '08:30',
      heureFin: s.heureFin || s.fin || '10:00'
    }));

    const fullConfig: SessionConfig = {
      ...configFormData,
      timeSlots: updatedSlots,
      dailySlots: updatedSlots
    };

    if (onSaveSessionConfig) {
      onSaveSessionConfig(fullConfig);
    }
    setSuccessMessage('Configuration des horaires et créneaux actualisée dans l\'emploi du temps.');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveCalendarOnly = () => {
    const activeDates = dateList.filter(d => d.isActive).map(d => d.dateStr);

    const fullConfig: SessionConfig = {
      ...configFormData,
      datesActives: activeDates
    };
    if (onSaveSessionConfig) {
      onSaveSessionConfig(fullConfig);
    }
    setSuccessMessage('Calendrier et jours de session actualisés dans l\'emploi du temps.');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Centre de Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gérez l'établissement, les horaires de créneaux, le calendrier des sessions et l'apparence.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer tout</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('institution')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'institution'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Configuration de l'Établissement</span>
        </button>

        <button
          onClick={() => setActiveTab('slots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'slots'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horaires & Créneaux</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'calendar'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendrier des Jours</span>
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'theme'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Thème & Apparence</span>
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage || 'Paramètres enregistrés avec succès !'}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INSTITUTION & ADMINISTRATIVE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'institution' && (
        <div className="space-y-6">
          {/* Section 1: Institution Details */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3>Coordonnées de l'Établissement Universitaire</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveInstitutionOnly}
                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded text-xs font-semibold border border-indigo-200 dark:border-indigo-800"
              >
                Enregistrer la section
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Université / Centre Universitaire *
                </label>
                <input
                  type="text"
                  required
                  value={instFormData.universite}
                  onChange={(e) => handleInstChange('universite', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculté / Institut *
                </label>
                <input
                  type="text"
                  required
                  value={instFormData.faculteInstitut}
                  onChange={(e) => handleInstChange('faculteInstitut', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Département *
                </label>
                <input
                  type="text"
                  required
                  value={instFormData.departement}
                  onChange={(e) => handleInstChange('departement', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 dark:text-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lieu / Ville de délivrance
                </label>
                <input
                  type="text"
                  value={instFormData.lieu}
                  onChange={(e) => handleInstChange('lieu', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Slogan / Logo de l'Université (Figure PNG) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Slogan / Logo de l'Université (Figure PNG)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Importez la figure PNG du slogan ou logo de l'université. Cette figure sera automatiquement affichée dans les en-têtes officiels des visualisations et impressions.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="file"
                  accept="image/png, image/*"
                  onChange={handleSloganUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                />
                {instFormData.sloganBase64 && (
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                      <img
                        src={instFormData.sloganBase64}
                        alt="Slogan Université"
                        className="h-10 max-w-[140px] object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInstChange('sloganBase64', '')}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                    >
                      Supprimer la figure
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Session & Academic Year */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3>Année Universitaire & Session d'Examens Active</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Année Universitaire *
                </label>
                <input
                  type="text"
                  required
                  value={instFormData.anneeUniversitaire}
                  onChange={(e) => handleInstChange('anneeUniversitaire', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Semestre Actuel *
                </label>
                <select
                  value={instFormData.semestreActuel}
                  onChange={(e) => handleInstChange('semestreActuel', e.target.value as SemesterType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Semestre 1 (S1)">Semestre 1 (S1)</option>
                  <option value="Semestre 2 (S2)">Semestre 2 (S2)</option>
                  <option value="Semestre Annuel">Semestre Annuel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Active *
                </label>
                <select
                  value={instFormData.sessionActuelle}
                  onChange={(e) => handleInstChange('sessionActuelle', e.target.value as SessionType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ordinaire">Session Ordinaire</option>
                  <option value="Rattrapage">Session de Rattrapage</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Department Head & Signature */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3>Signature & Validation du Chef de Département</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom & Prénom du Chef de Département *
                </label>
                <input
                  type="text"
                  required
                  value={instFormData.nomChefDepartement}
                  onChange={(e) => handleInstChange('nomChefDepartement', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titre officiel
                </label>
                <input
                  type="text"
                  value={instFormData.titreChefDepartement}
                  onChange={(e) => handleInstChange('titreChefDepartement', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image du Cachet / Signature Officielle
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100"
                />
                {instFormData.cachetBase64 && (
                  <button
                    type="button"
                    onClick={() => handleInstChange('cachetBase64', '')}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Supprimer le cachet
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Official Instructions */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3>Consignes & Instructions Réglementaires (Convocations)</h3>
            </div>

            <div className="space-y-2">
              {instFormData.instructionsOfficielles.map((instr, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-400 w-5">{idx + 1}.</span>
                  <span className="flex-1 text-slate-800 dark:text-slate-200 font-medium">{instr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Ajouter une consigne réglementaire..."
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddInstruction}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HORAIRES & CRÉNEAUX */}
      {/* ========================================================================= */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {/* Slot generator settings */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3>Paramètres Généraux des Horaires & Créneaux</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveSlotsOnly}
                className="px-3 py-1 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 rounded text-xs font-semibold border border-cyan-200 dark:border-cyan-800"
              >
                Enregistrer les créneaux
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Heure de Début de Journée
                </label>
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Durée de l'Épreuve (min)
                </label>
                <input
                  type="number"
                  min="30"
                  max="240"
                  step="15"
                  value={slotDurationMinutes}
                  onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pause entre créneaux (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={pauseMinutes}
                  onChange={(e) => setPauseMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pause Déjeuner (min)
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  step="15"
                  value={lunchPauseMinutes}
                  onChange={(e) => setLunchPauseMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre de créneaux par jour :
                </span>
                <select
                  value={slotCount}
                  onChange={(e) => setSlotCount(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={2}>2 créneaux</option>
                  <option value={3}>3 créneaux</option>
                  <option value={4}>4 créneaux</option>
                  <option value={5}>5 créneaux</option>
                  <option value={6}>6 créneaux</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAutoGenerateSlots}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalculer automatiquement les créneaux</span>
              </button>
            </div>
          </div>

          {/* Slots Table / List */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Définition Précise des Créneaux Horaires ({configFormData.timeSlots?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 rounded text-xs font-semibold border border-cyan-200 dark:border-cyan-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un créneau</span>
              </button>
            </div>

            <div className="space-y-3">
              {(configFormData.timeSlots || []).map((slot, index) => (
                <div
                  key={slot.id || index}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-cyan-600 text-white font-extrabold text-xs">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={slot.label || `Créneau ${index + 1}`}
                      onChange={(e) => handleSlotChange(index, 'label', e.target.value)}
                      className="px-2 py-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs w-28"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">Début :</span>
                      <input
                        type="time"
                        value={slot.debut || slot.heureDebut || '08:30'}
                        onChange={(e) => handleSlotChange(index, 'debut', e.target.value)}
                        className="px-2 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <span className="text-slate-400">→</span>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">Fin :</span>
                      <input
                        type="time"
                        value={slot.fin || slot.heureFin || '10:00'}
                        onChange={(e) => handleSlotChange(index, 'fin', e.target.value)}
                        className="px-2 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition self-end sm:self-center"
                    title="Supprimer ce créneau"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CALENDRIER DES JOURS */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3>Période de la Session d'Examens & Jours Ouvrables</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveCalendarOnly}
                className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
              >
                Enregistrer le calendrier
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date de Début de la Session
                </label>
                <input
                  type="date"
                  value={configFormData.dateDebut || ''}
                  onChange={(e) => setConfigFormData(prev => ({ ...prev, dateDebut: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date de Fin de la Session
                </label>
                <input
                  type="date"
                  value={configFormData.dateFin || ''}
                  onChange={(e) => setConfigFormData(prev => ({ ...prev, dateFin: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Working days of week */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Jours d'Examens Habituels dans la Semaine (Régime Universitaire) :
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((w) => {
                  const isChecked = (configFormData.workingDays || [0, 1, 2, 3, 4]).includes(w.index);
                  return (
                    <button
                      key={w.index}
                      type="button"
                      onClick={() => handleToggleWorkingDay(w.index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {w.label} {isChecked ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Date Grid */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Grille Interactive des Jours d'Examens ({dateList.filter(d => d.isActive).length} jours actifs sur {dateList.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Cliquez sur un jour pour l'activer ou l'exclure (férié / repos). Les modifications s'appliquent immédiatement dans l'emploi du temps.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllWorkingDays}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition"
                >
                  Jours ouvrés uniquement
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllDays}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {dateList.map((d) => {
                const dateObj = new Date(d.dateStr);
                const dayNum = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('fr-FR', { month: 'short' });

                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => handleToggleSpecificDate(d.dateStr)}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[74px] ${
                      d.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {d.dayLabel}
                    </span>
                    <span className="text-base font-extrabold my-0.5">
                      {dayNum} {monthName}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      d.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {d.isActive ? 'Actif' : 'Exclu'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: THEME & VISUAL APPEARANCE */}
      {/* ========================================================================= */}
      {activeTab === 'theme' && onSelectThemeMode && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3>Thème d'affichage & Personnalisation Visuelle</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choisissez le style visuel de l'application selon vos préférences d'ergonomie et de luminosité :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { mode: 'dark' as ThemeMode, label: 'Sombre aSc', icon: Moon, desc: 'Palette foncée contrastée', bgClass: 'bg-slate-900 text-slate-100 border-slate-800' },
              { mode: 'academic' as ThemeMode, label: 'Académique', icon: Landmark, desc: 'Bleu nuit universitaire', bgClass: 'bg-[#0d1b38] text-slate-100 border-[#1e386a]' },
              { mode: 'light' as ThemeMode, label: 'Clair Moderne', icon: Sun, desc: 'Fond blanc haute luminosité', bgClass: 'bg-slate-50 text-slate-900 border-slate-300' },
              { mode: 'system' as ThemeMode, label: 'Système', icon: Monitor, desc: 'Synchronisation OS auto', bgClass: 'bg-slate-100 text-slate-800 border-slate-300' },
            ].map(opt => {
              const Icon = opt.icon;
              const isCurrent = (themeSettings?.mode || 'dark') === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => onSelectThemeMode(opt.mode)}
                  className={`p-3.5 rounded-xl border-2 text-left transition relative flex flex-col justify-between ${
                    isCurrent
                      ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/30 dark:bg-purple-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${opt.bgClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                        Actif
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {onSelectAccentColor && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Couleur d'accentuation principale :</div>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { key: 'emerald' as AccentColor, label: 'Émeraude (Classique)', bg: '#10b981' },
                  { key: 'indigo' as AccentColor, label: 'Indigo', bg: '#6366f1' },
                  { key: 'blue' as AccentColor, label: 'Bleu Royal', bg: '#2563eb' },
                  { key: 'amber' as AccentColor, label: 'Ambre Doré', bg: '#d97706' },
                  { key: 'rose' as AccentColor, label: 'Rose Rubis', bg: '#e11d48' },
                ].map(acc => {
                  const isAccCurrent = (themeSettings?.accent || 'emerald') === acc.key;
                  return (
                    <button
                      key={acc.key}
                      type="button"
                      onClick={() => onSelectAccentColor(acc.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
                        isAccCurrent
                          ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.bg }} />
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Bottom Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer toutes les configurations</span>
        </button>
      </div>
    </div>
  );
};
