import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  SessionConfig, 
  TimeSlot, 
  PromotionGroup, 
  SubjectModule, 
  Exam, 
  InstitutionSettings, 
  Teacher, 
  Room, 
  SemesterType, 
  SessionType,
  Language
} from '../../types';
import { Translations, translations } from '../../services/i18n';
import { 
  Calendar, 
  Clock, 
  Layers, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Plus, 
  Trash2,
  Sparkles,
  Building2,
  GraduationCap,
  CalendarRange,
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  Languages,
  CheckCircle2,
  Info
} from 'lucide-react';

interface SessionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SessionConfig;
  currentSettings?: InstitutionSettings;
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  teachers?: Teacher[];
  rooms?: Room[];
  t: Translations;
  currentLang?: Language;
  onLanguageToggle?: () => void;
  onComplete: (newConfig: SessionConfig, newSettings?: InstitutionSettings, generatedExams?: Exam[]) => void;
}

// Days of week definition
const WEEK_DAYS = [
  { index: 0, key: 'sun', fr: 'Dimanche', ar: 'الأحد', shortFr: 'Dim', shortAr: 'أحد' },
  { index: 1, key: 'mon', fr: 'Lundi', ar: 'الإثنين', shortFr: 'Lun', shortAr: 'إثن' },
  { index: 2, key: 'tue', fr: 'Mardi', ar: 'الثلاثاء', shortFr: 'Mar', shortAr: 'ثلا' },
  { index: 3, key: 'wed', fr: 'Mercredi', ar: 'الأربعاء', shortFr: 'Mer', shortAr: 'أرب' },
  { index: 4, key: 'thu', fr: 'Jeudi', ar: 'الخميس', shortFr: 'Jeu', shortAr: 'خمي' },
  { index: 5, key: 'fri', fr: 'Vendredi', ar: 'الجمعة', shortFr: 'Ven', shortAr: 'جمع' },
  { index: 6, key: 'sat', fr: 'Samedi', ar: 'السبت', shortFr: 'Sam', shortAr: 'سبت' },
];

export const SessionWizard: React.FC<SessionWizardProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentSettings,
  promotions,
  subjects,
  teachers = [],
  rooms = [],
  t,
  currentLang = 'fr',
  onLanguageToggle,
  onComplete
}) => {
  // Step state (1, 2, 3)
  const [step, setStep] = useState<number>(1);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState<boolean>(false);
  const [hasModified, setHasModified] = useState<boolean>(false);

  // Local Language State (allows on-the-fly toggle inside wizard)
  const [wizardLang, setWizardLang] = useState<Language>(currentLang);

  // Step 1: Institution & Session Info
  const [universite, setUniversite] = useState<string>(
    currentSettings?.universite || 'Centre Universitaire Noor El Bachir - El Bayadh'
  );
  const [faculteInstitut, setFaculteInstitut] = useState<string>(
    currentSettings?.faculteInstitut || 'Institut des Sciences'
  );
  const [departement, setDepartement] = useState<string>(
    currentSettings?.departement || 'Département de Technologie'
  );
  const [anneeUniversitaire, setAnneeUniversitaire] = useState<string>(
    currentConfig.anneeUniversitaire || currentSettings?.anneeUniversitaire || '2025/2026'
  );
  const [semestre, setSemestre] = useState<string>(
    currentConfig.semestre || currentSettings?.semestreActuel || 'Semestre impair'
  );
  const [typeSession, setTypeSession] = useState<string>(
    currentConfig.type || currentConfig.session || currentSettings?.sessionActuelle || 'Normale'
  );
  const [sessionName, setSessionName] = useState<string>(
    currentConfig.nom || `Examens ${semestre} - Session ${typeSession}`
  );

  // Step 2: Time and Slot Configuration
  const [dayStartTime, setDayStartTime] = useState<string>('08:30');
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(90);
  const [pauseMinutes, setPauseMinutes] = useState<number>(30);
  const [dailySlotCount, setDailySlotCount] = useState<number>(4);
  const [hasLunchBreak, setHasLunchBreak] = useState<boolean>(true);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState<number>(90);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    if (currentConfig.timeSlots && currentConfig.timeSlots.length > 0) {
      return currentConfig.timeSlots;
    }
    return [
      { id: 'ts-1', label: 'Créneau 1', debut: '08:30', fin: '10:00', heureDebut: '08:30', heureFin: '10:00' },
      { id: 'ts-2', label: 'Créneau 2', debut: '10:30', fin: '12:00', heureDebut: '10:30', heureFin: '12:00' },
      { id: 'ts-3', label: 'Créneau 3', debut: '13:30', fin: '15:00', heureDebut: '13:30', heureFin: '15:00' },
      { id: 'ts-4', label: 'Créneau 4', debut: '15:30', fin: '17:00', heureDebut: '15:30', heureFin: '17:00' }
    ];
  });

  // Step 3: Weekdays & Dates
  // Default Algerian university work days: Dimanche to Jeudi (0, 1, 2, 3, 4)
  const [workingDays, setWorkingDays] = useState<number[]>(
    currentConfig.workingDays || [0, 1, 2, 3, 4]
  );

  // Dates defaults: Next week or from current config
  const [dateDebut, setDateDebut] = useState<string>(() => {
    if (currentConfig.dateDebut) return currentConfig.dateDebut;
    const now = new Date();
    // Round to next Sunday
    const day = now.getDay();
    const diff = (7 - day) % 7;
    const nextSun = new Date(now);
    nextSun.setDate(now.getDate() + (diff === 0 ? 7 : diff));
    return nextSun.toISOString().slice(0, 10);
  });

  const [dateFin, setDateFin] = useState<string>(() => {
    if (currentConfig.dateFin) return currentConfig.dateFin;
    const now = new Date();
    const day = now.getDay();
    const diff = (7 - day) % 7;
    const nextThu = new Date(now);
    nextThu.setDate(now.getDate() + (diff === 0 ? 7 : diff) + 11); // ~2 weeks
    return nextThu.toISOString().slice(0, 10);
  });

  // Active dates exception list (all dates selected in period)
  const [selectedDates, setSelectedDates] = useState<string[]>(
    currentConfig.datesActives || []
  );

  // Auto create exams option
  const [autoCreateExams, setAutoCreateExams] = useState<boolean>(true);

  // Sync session name automatically when semester or type changes
  useEffect(() => {
    const semLabel = semestre === 'Annuel' ? 'Annuel' : semestre;
    const typeLabel = typeSession === 'Rattrapage' ? 'Rattrapage' : typeSession === 'Extraordinaire' ? 'Extraordinaire' : 'Ordinaire';
    const arSemLabel = semestre === 'Annuel' ? 'السنوي' : semestre;
    const arTypeLabel = typeSession === 'Rattrapage' ? 'الاستدراكية' : typeSession === 'Extraordinaire' ? 'الاستثنائية' : 'العادية';

    if (wizardLang === 'ar' || wizardLang === 'AR') {
      setSessionName(`امتحانات السداسي ${arSemLabel} - الدورة ${arTypeLabel} (${anneeUniversitaire})`);
    } else {
      setSessionName(`Examens ${semLabel} - Session ${typeLabel} (${anneeUniversitaire})`);
    }
  }, [semestre, typeSession, anneeUniversitaire, wizardLang]);

  // Generate date list between dateDebut and dateFin
  const allPeriodDates = useMemo(() => {
    if (!dateDebut || !dateFin) return [];
    try {
      const start = new Date(dateDebut);
      const end = new Date(dateFin);
      if (start > end) return [];

      const list: { dateStr: string; dayIndex: number; dayObj: Date }[] = [];
      const current = new Date(start);
      // Limit to max 60 days to prevent runaway loops
      let count = 0;
      while (current <= end && count < 60) {
        list.push({
          dateStr: current.toISOString().slice(0, 10),
          dayIndex: current.getDay(),
          dayObj: new Date(current)
        });
        current.setDate(current.getDate() + 1);
        count++;
      }
      return list;
    } catch {
      return [];
    }
  }, [dateDebut, dateFin]);

  // Initialize selectedDates based on working days when date range or workingDays change
  useEffect(() => {
    if (allPeriodDates.length > 0) {
      // Auto-filter by workingDays if empty or first load
      const defaultActive = allPeriodDates
        .filter(d => workingDays.includes(d.dayIndex))
        .map(d => d.dateStr);
      
      setSelectedDates(prev => {
        if (prev.length === 0) return defaultActive;
        // Keep valid previously selected dates that are still within period
        const validPrev = prev.filter(p => allPeriodDates.some(ap => ap.dateStr === p));
        return validPrev.length > 0 ? validPrev : defaultActive;
      });
    }
  }, [allPeriodDates, workingDays]);

  // Helper to calculate minutes to HH:MM string
  const minutesToTimeStr = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeStrToMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Automatic Slot Generator Algorithm
  const handleAutoGenerateSlots = useCallback(() => {
    setHasModified(true);
    let currentMin = timeStrToMinutes(dayStartTime || '08:30');
    const generated: TimeSlot[] = [];

    for (let i = 1; i <= Math.max(1, dailySlotCount); i++) {
      const startStr = minutesToTimeStr(currentMin);
      const endMin = currentMin + examDurationMinutes;
      const endStr = minutesToTimeStr(endMin);

      generated.push({
        id: `ts-${i}`,
        label: (wizardLang === 'ar' || wizardLang === 'AR') ? `الفترة ${i}` : `Créneau ${i}`,
        debut: startStr,
        fin: endStr,
        heureDebut: startStr,
        heureFin: endStr
      });

      // Advance by duration + pause
      currentMin = endMin + pauseMinutes;

      // If lunch break is enabled and we just finished slot 2, add extra lunch break
      if (hasLunchBreak && i === 2 && dailySlotCount > 2) {
        currentMin = endMin + lunchBreakMinutes;
      }
    }

    setTimeSlots(generated);
  }, [dayStartTime, dailySlotCount, examDurationMinutes, pauseMinutes, hasLunchBreak, lunchBreakMinutes, wizardLang]);

  // Add individual slot
  const handleAddSlot = () => {
    setHasModified(true);
    const lastSlot = timeSlots[timeSlots.length - 1];
    let startMin = 8 * 60 + 30;
    if (lastSlot) {
      startMin = timeStrToMinutes(lastSlot.fin || lastSlot.heureFin || '17:00') + 30;
    }
    const endMin = startMin + 90;
    const newId = `ts-${Date.now()}`;
    const newLabel = (wizardLang === 'ar' || wizardLang === 'AR') 
      ? `الفترة ${timeSlots.length + 1}` 
      : `Créneau ${timeSlots.length + 1}`;

    setTimeSlots([
      ...timeSlots,
      {
        id: newId,
        label: newLabel,
        debut: minutesToTimeStr(startMin),
        fin: minutesToTimeStr(endMin),
        heureDebut: minutesToTimeStr(startMin),
        heureFin: minutesToTimeStr(endMin)
      }
    ]);
  };

  // Remove individual slot
  const handleRemoveSlot = (id: string) => {
    if (timeSlots.length <= 1) return;
    setHasModified(true);
    setTimeSlots(timeSlots.filter(s => s.id !== id));
  };

  // Update slot property
  const handleUpdateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setHasModified(true);
    const updated = [...timeSlots];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    // Sync alias fields
    if (field === 'debut') updated[index].heureDebut = value;
    if (field === 'fin') updated[index].heureFin = value;
    setTimeSlots(updated);
  };

  // Toggle Weekday
  const handleToggleWorkingDay = (dayIndex: number) => {
    setHasModified(true);
    setWorkingDays(prev => {
      const next = prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort();
      return next;
    });
  };

  // Toggle single date
  const handleToggleDate = (dateStr: string) => {
    setHasModified(true);
    setSelectedDates(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr].sort()
    );
  };

  // Presets for working days
  const handleApplyDayPreset = (preset: 'standard' | 'all' | 'sixdays') => {
    setHasModified(true);
    if (preset === 'standard') {
      setWorkingDays([0, 1, 2, 3, 4]); // Dimanche -> Jeudi
    } else if (preset === 'sixdays') {
      setWorkingDays([6, 0, 1, 2, 3, 4]); // Samedi -> Jeudi
    } else {
      setWorkingDays([0, 1, 2, 3, 4, 5, 6]); // Tous
    }
  };

  // Presets for dates
  const handleSelectAllWorkingDates = () => {
    setHasModified(true);
    const active = allPeriodDates.filter(d => workingDays.includes(d.dayIndex)).map(d => d.dateStr);
    setSelectedDates(active);
  };

  const handleSelectAllDates = () => {
    setHasModified(true);
    setSelectedDates(allPeriodDates.map(d => d.dateStr));
  };

  const handleClearAllDates = () => {
    setHasModified(true);
    setSelectedDates([]);
  };

  // Validation Rules
  const step1Valid = useMemo(() => {
    return (
      universite.trim().length > 0 &&
      departement.trim().length > 0 &&
      anneeUniversitaire.trim().length > 0 &&
      sessionName.trim().length > 0
    );
  }, [universite, departement, anneeUniversitaire, sessionName]);

  const slotValidation = useMemo(() => {
    if (timeSlots.length === 0) {
      return { valid: false, error: 'Au moins un créneau horaire est requis.' };
    }

    // Check valid start < end for each slot
    for (let i = 0; i < timeSlots.length; i++) {
      const s = timeSlots[i];
      const start = s.debut || s.heureDebut || '';
      const end = s.fin || s.heureFin || '';
      if (!start || !end) {
        return { valid: false, error: `Le créneau ${i + 1} a une heure incomplète.` };
      }
      if (timeStrToMinutes(start) >= timeStrToMinutes(end)) {
        return { valid: false, error: `Le créneau ${i + 1} (${s.label}) a une heure de début supérieure ou égale à l'heure de fin.` };
      }
    }

    // Check overlaps
    for (let i = 0; i < timeSlots.length; i++) {
      const s1 = timeSlots[i];
      const start1 = timeStrToMinutes(s1.debut || s1.heureDebut || '');
      const end1 = timeStrToMinutes(s1.fin || s1.heureFin || '');

      for (let j = i + 1; j < timeSlots.length; j++) {
        const s2 = timeSlots[j];
        const start2 = timeStrToMinutes(s2.debut || s2.heureDebut || '');
        const end2 = timeStrToMinutes(s2.fin || s2.heureFin || '');

        if (start1 < end2 && start2 < end1) {
          return {
            valid: false,
            error: `Chevauchement horaire détecté entre "${s1.label}" (${s1.debut}-${s1.fin}) et "${s2.label}" (${s2.debut}-${s2.fin}).`
          };
        }
      }
    }

    return { valid: true, error: null };
  }, [timeSlots]);

  const step2Valid = slotValidation.valid;

  const step3Valid = useMemo(() => {
    if (!dateDebut || !dateFin) return false;
    if (dateDebut > dateFin) return false;
    return selectedDates.length > 0;
  }, [dateDebut, dateFin, selectedDates]);

  // Secure Close Handler
  const handleRequestClose = () => {
    if (hasModified) {
      setIsConfirmCloseOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setIsConfirmCloseOpen(false);
    onClose();
  };

  // Keyboard navigation: Esc = close, Enter = next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasModified]);

  // Language switch handler
  const handleToggleLang = () => {
    const nextLang: Language = (wizardLang === 'fr' || wizardLang === 'FR') ? 'ar' : 'fr';
    setWizardLang(nextLang);
    if (onLanguageToggle) {
      onLanguageToggle();
    }
  };

  // Current localized dict
  const activeT = translations[wizardLang] || translations.fr;
  const isRTL = wizardLang === 'ar' || wizardLang === 'AR';

  // Finish and Save
  const handleFinishWizard = () => {
    if (!step1Valid || !step2Valid || !step3Valid) return;

    // Build finalized SessionConfig
    const updatedConfig: SessionConfig = {
      id: currentConfig.id || `session-${Date.now()}`,
      nom: sessionName,
      sessionName,
      anneeUniversitaire,
      semestre: semestre as SemesterType,
      session: typeSession as SessionType,
      type: typeSession,
      dateDebut,
      dateFin,
      datesActives: selectedDates,
      workingDays,
      timeSlots,
      dailySlots: timeSlots,
      pauseBetweenSlotsMinutes: pauseMinutes
    };

    // Build updated InstitutionSettings
    const updatedSettings: InstitutionSettings = {
      republique: currentSettings?.republique || 'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
      ministere: currentSettings?.ministere || 'MINISTÈRE DE L\'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE',
      universite,
      faculteInstitut,
      departement,
      lieu: currentSettings?.lieu || 'El Bayadh',
      anneeUniversitaire,
      semestreActuel: semestre as SemesterType,
      sessionActuelle: typeSession as SessionType,
      nomChefDepartement: currentSettings?.nomChefDepartement || 'Dr. Atallah',
      titreChefDepartement: currentSettings?.titreChefDepartement || 'Chef de Département',
      signatureBase64: currentSettings?.signatureBase64,
      cachetBase64: currentSettings?.cachetBase64,
      sloganBase64: currentSettings?.sloganBase64,
      instructionsOfficielles: currentSettings?.instructionsOfficielles || [
        'Présence obligatoire 15 minutes avant le début de l\'épreuve.',
        'La vérification de l\'identité des étudiants est requise à l\'entrée.',
        'Signer le procès-verbal de déroulement de l\'examen à la fin de la séance.'
      ]
    };

    // Optional Exam generation from subjects
    let generatedExams: Exam[] | undefined;
    if (autoCreateExams && subjects.length > 0) {
      generatedExams = subjects.map((sub, idx) => {
        const promo = promotions.find(p => p.nom === sub.promotion) || promotions[0];
        return {
          id: `exam-wiz-${Date.now()}-${idx}`,
          nomModule: sub.nom || sub.nomModule || `Module ${idx + 1}`,
          codeModule: sub.code || sub.codeModule || `MOD${idx + 1}`,
          date: '', // left unplaced for the auto-generator!
          heureDebut: '',
          heureFin: '',
          semestre: (sub.semestre as SemesterType) || (semestre as SemesterType),
          session: typeSession as SessionType,
          niveau: sub.promotion,
          nbEtudiants: promo ? promo.effectif : 40,
          salles: []
        };
      });
    }

    onComplete(updatedConfig, updatedSettings, generatedExams);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 select-none"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div 
        id="session-wizard-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
      >
        {/* TOP HEADER */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl ring-1 ring-emerald-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>
                  {isRTL 
                    ? 'معالج إعداد دورة الامتحانات (aSc Wizard)' 
                    : 'Assistant de Création de Session d\'Examens'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  aSc Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1 && (isRTL ? 'الخطوة 1 من 3 : معلومات المؤسسة والدورة' : 'Étape 1 sur 3 : Établissement & Session')}
                {step === 2 && (isRTL ? 'الخطوة 2 من 3 : أوقات وفترات اليوم' : 'Étape 2 sur 3 : Horaires & Créneaux journaliers')}
                {step === 3 && (isRTL ? 'الخطوة 3 من 3 : أيام العمل والتقويم' : 'Étape 3 sur 3 : Jours de la semaine & Calendrier')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Bilingual Switcher */}
            <button
              id="wizard-lang-toggle"
              type="button"
              onClick={handleToggleLang}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 text-xs font-bold transition"
              title="Changer de langue / تغيير اللغة"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{isRTL ? 'Français' : 'العربية'}</span>
            </button>

            {/* Close Button */}
            <button
              id="wizard-close-btn"
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Fermer / إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEPPER PROGRESS BAR */}
        <div className="bg-slate-50/70 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
            {/* Step 1 Pill */}
            <div 
              onClick={() => step > 1 && setStep(1)}
              className={`flex items-center space-x-2 rtl:space-x-reverse cursor-pointer transition ${
                step === 1 
                  ? 'text-emerald-700 font-bold' 
                  : step > 1 
                    ? 'text-slate-700 hover:text-slate-900' 
                    : 'text-slate-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > 1 
                  ? 'bg-emerald-600 text-white' 
                  : step === 1 
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600' 
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </span>
              <span className="text-xs hidden sm:inline">
                {isRTL ? 'المؤسسة والدورة' : '1. Établissement'}
              </span>
            </div>

            {/* Separator Line */}
            <div className={`flex-1 h-0.5 rounded transition ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 2 Pill */}
            <div 
              onClick={() => (step > 2 || (step === 1 && step1Valid)) && setStep(2)}
              className={`flex items-center space-x-2 rtl:space-x-reverse transition ${
                step === 2 
                  ? 'text-emerald-700 font-bold' 
                  : step > 2 
                    ? 'text-slate-700 hover:text-slate-900 cursor-pointer' 
                    : 'text-slate-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > 2 
                  ? 'bg-emerald-600 text-white' 
                  : step === 2 
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600' 
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {step > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
              </span>
              <span className="text-xs hidden sm:inline">
                {isRTL ? 'الأوقات والفترات' : '2. Horaires & Créneaux'}
              </span>
            </div>

            {/* Separator Line */}
            <div className={`flex-1 h-0.5 rounded transition ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 3 Pill */}
            <div 
              onClick={() => step >= 3 && setStep(3)}
              className={`flex items-center space-x-2 rtl:space-x-reverse transition ${
                step === 3 
                  ? 'text-emerald-700 font-bold' 
                  : 'text-slate-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 
                  ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                3
              </span>
              <span className="text-xs hidden sm:inline">
                {isRTL ? 'التقويم والأيام' : '3. Calendrier & Jours'}
              </span>
            </div>
          </div>
        </div>

        {/* STEP CONTENT BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm space-y-5">
          
          {/* ======================================================== */}
          {/* STEP 1: INFORMATIONS ÉTABLISSEMENT & SESSION            */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start space-x-2.5 rtl:space-x-reverse">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">
                  {isRTL 
                    ? 'يرجى إدخال الترويسة الإدارية الرسمية للجامعة أو المركز الجامعي وتحديد معالم الدورة الامتحانية الحالية.'
                    : 'Renseignez l\'en-tête administratif officiel de l\'établissement et définissez les paramètres de la session d\'examens.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Établissement */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isRTL ? 'اسم الجامعة / المركز الجامعي :' : 'Nom de l\'Établissement / Université :'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="wiz-univ-input"
                    type="text"
                    value={universite}
                    onChange={(e) => {
                      setUniversite(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                    placeholder="Ex: Centre Universitaire Noor El Bachir - El Bayadh"
                  />
                </div>

                {/* Faculté / Institut */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isRTL ? 'الكلية / المعهد / الملحقة :' : 'Faculté / Institut / MNS :'}</span>
                  </label>
                  <input
                    id="wiz-fac-input"
                    type="text"
                    value={faculteInstitut}
                    onChange={(e) => {
                      setFaculteInstitut(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                    placeholder="Ex: Institut des Sciences"
                  />
                </div>

                {/* Département */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isRTL ? 'القسم الأكاديمي :' : 'Département :'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="wiz-dept-input"
                    type="text"
                    value={departement}
                    onChange={(e) => {
                      setDepartement(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                    placeholder="Ex: Département de Technologie"
                  />
                </div>

                {/* Année Universitaire */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isRTL ? 'السنة الجامعية :' : 'Année Universitaire :'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="wiz-year-input"
                    type="text"
                    value={anneeUniversitaire}
                    onChange={(e) => {
                      setAnneeUniversitaire(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-mono font-bold"
                    placeholder="2025/2026"
                  />
                </div>

                {/* Semestre */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isRTL ? 'السداسي المعني :' : 'Semestre concerné :'}
                  </label>
                  <select
                    id="wiz-semestre-select"
                    value={semestre}
                    onChange={(e) => {
                      setSemestre(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                  >
                    <option value="Semestre impair">{isRTL ? 'السداسي الفردي (Semestre impair)' : 'Semestre impair'}</option>
                    <option value="Semestre pair">{isRTL ? 'السداسي الزوجي (Semestre pair)' : 'Semestre pair'}</option>
                  </select>
                </div>

                {/* Type de session (Radio cards) */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-2">
                    {isRTL ? 'طبيعة الدورة الامتحانية :' : 'Type de Session :'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTypeSession('Normale');
                        setHasModified(true);
                      }}
                      className={`p-3 rounded-xl border text-start transition flex flex-col justify-between ${
                        typeSession === 'Normale'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {isRTL ? 'الدورة العادية' : 'Session Ordinaire / Normale'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {isRTL ? 'امتحانات نهاية السداسي الرئيسية' : 'Examens finaux principaux'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTypeSession('Rattrapage');
                        setHasModified(true);
                      }}
                      className={`p-3 rounded-xl border text-start transition flex flex-col justify-between ${
                        typeSession === 'Rattrapage'
                          ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {isRTL ? 'دورة الاستدراك' : 'Session de Rattrapage'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {isRTL ? 'امتحانات إعادة التقييم' : 'Épreuves de seconde chance'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTypeSession('Extraordinaire');
                        setHasModified(true);
                      }}
                      className={`p-3 rounded-xl border text-start transition flex flex-col justify-between ${
                        typeSession === 'Extraordinaire'
                          ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-400 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {isRTL ? 'دورة استثنائية' : 'Session Extraordinaire'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {isRTL ? 'جلسات خاصة أو بديلة' : 'Sessions spéciales / décalées'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Nom personnalisé de la session */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isRTL ? 'تسمية الدورة في الوثائق والاستدعاءات :' : 'Libellé de la session (sur les convocations et PV) :'}
                  </label>
                  <input
                    id="wiz-session-name-input"
                    type="text"
                    value={sessionName}
                    onChange={(e) => {
                      setSessionName(e.target.value);
                      setHasModified(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: HORAIRES ET CRÉNEAUX DE LA JOURNÉE               */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Rhythm Configuration Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-emerald-700 font-bold text-xs sm:text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{isRTL ? 'محددات النمط الزمني لليوم' : 'Paramétrage du Rythme Journalier'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoGenerateSlots}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'إعادة حساب وتوليد الفترات' : 'Recalculer les Créneaux'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Heure de début */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                      {isRTL ? 'انطلاق اليوم :' : 'Début de journée :'}
                    </label>
                    <input
                      type="time"
                      value={dayStartTime}
                      onChange={(e) => {
                        setDayStartTime(e.target.value);
                        setHasModified(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Durée standard */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                      {isRTL ? 'مدة الامتحان (دقيقة) :' : 'Durée créneau (min) :'}
                    </label>
                    <select
                      value={examDurationMinutes}
                      onChange={(e) => {
                        setExamDurationMinutes(Number(e.target.value));
                        setHasModified(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={60}>60 min (1h00)</option>
                      <option value={90}>90 min (1h30)</option>
                      <option value={120}>120 min (2h00)</option>
                      <option value={150}>150 min (2h30)</option>
                      <option value={180}>180 min (3h00)</option>
                    </select>
                  </div>

                  {/* Pause entre créneaux */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                      {isRTL ? 'الاستراحة بين الحصص :' : 'Pause minimale :'}
                    </label>
                    <select
                      value={pauseMinutes}
                      onChange={(e) => {
                        setPauseMinutes(Number(e.target.value));
                        setHasModified(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>

                  {/* Nombre de créneaux */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                      {isRTL ? 'عدد فترات اليوم :' : 'Nb créneaux / jour :'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={dailySlotCount}
                      onChange={(e) => {
                        setDailySlotCount(Math.max(1, Number(e.target.value)));
                        setHasModified(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Lunch break option */}
                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasLunchBreak}
                      onChange={(e) => {
                        setHasLunchBreak(e.target.checked);
                        setHasModified(true);
                      }}
                      className="w-4 h-4 text-emerald-600 rounded bg-white border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-slate-800 font-medium">
                      {isRTL ? 'إدراج فاصل منتصف النهار (استراحة الغداء بعد الفترة الثانية)' : 'Inclure une pause déjeuner / midi après le 2ème créneau'}
                    </span>
                  </label>

                  {hasLunchBreak && (
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <span className="text-slate-600 text-[11px] font-semibold">{isRTL ? 'المدة :' : 'Durée :'}</span>
                      <select
                        value={lunchBreakMinutes}
                        onChange={(e) => {
                          setLunchBreakMinutes(Number(e.target.value));
                          setHasModified(true);
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs font-medium"
                      >
                        <option value={60}>60 min (1h00)</option>
                        <option value={90}>90 min (1h30)</option>
                        <option value={120}>120 min (2h00)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic TimeSlots Table */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>{isRTL ? 'قائمة الفترات الزمنية المعتمدة في الجدول :' : 'Créneaux horaires de la journée :'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-mono font-bold">
                      {timeSlots.length}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 rtl:space-x-reverse transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'إضافة فترة يدوية' : 'Ajouter un créneau'}</span>
                  </button>
                </div>

                {/* Overlap Error Warning */}
                {!slotValidation.valid && (
                  <div className="p-3 mb-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center space-x-2 rtl:space-x-reverse font-medium animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{slotValidation.error}</span>
                  </div>
                )}

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {timeSlots.map((slot, index) => {
                    const startMin = timeStrToMinutes(slot.debut || slot.heureDebut || '00:00');
                    const endMin = timeStrToMinutes(slot.fin || slot.heureFin || '00:00');
                    const duration = Math.max(0, endMin - startMin);

                    return (
                      <div 
                        key={slot.id || index}
                        className="flex items-center space-x-2 rtl:space-x-reverse bg-slate-50 hover:bg-slate-100/80 p-2 rounded-xl border border-slate-200 transition"
                      >
                        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {index + 1}
                        </span>

                        {/* Label */}
                        <input
                          type="text"
                          value={slot.label || ''}
                          onChange={(e) => handleUpdateSlot(index, 'label', e.target.value)}
                          className="w-28 sm:w-36 px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-900 text-xs font-medium"
                          placeholder="Libellé"
                        />

                        {/* Start Time */}
                        <input
                          type="time"
                          value={slot.debut || slot.heureDebut || '08:30'}
                          onChange={(e) => handleUpdateSlot(index, 'debut', e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-900 text-xs font-mono font-bold"
                        />

                        <span className="text-slate-400 font-bold">→</span>

                        {/* End Time */}
                        <input
                          type="time"
                          value={slot.fin || slot.heureFin || '10:00'}
                          onChange={(e) => handleUpdateSlot(index, 'fin', e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-900 text-xs font-mono font-bold"
                        />

                        {/* Duration badge */}
                        <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-semibold">
                          {Math.floor(duration / 60)}h{(duration % 60).toString().padStart(2, '0')}
                        </span>

                        {/* Remove button */}
                        {timeSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ml-auto"
                            title="Supprimer ce créneau"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: JOURS DE LA SEMAINE & CALENDRIER                 */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Section 1: Working Days of Week */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>{isRTL ? 'أيام العمل الأسبوعية المعتمدة :' : 'Jours de travail hebdomadaires :'}</span>
                  </span>

                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('standard')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] border border-slate-300 font-medium"
                    >
                      {isRTL ? 'أحد - خميس (افتراضي)' : 'Dim - Jeu (Standard)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('sixdays')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] border border-slate-300 font-medium"
                    >
                      {isRTL ? 'سبت - خميس' : 'Sam - Jeu (6j)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('all')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] border border-slate-300 font-medium"
                    >
                      {isRTL ? 'الكل (7 أيام)' : 'Tous les 7 jours'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((wd) => {
                    const isChecked = workingDays.includes(wd.index);
                    const isWeekendDz = wd.index === 5; // Vendredi

                    return (
                      <button
                        key={wd.key}
                        type="button"
                        onClick={() => handleToggleWorkingDay(wd.index)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs">{isRTL ? wd.ar : wd.fr}</span>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isChecked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '—'}
                        </span>
                        {isWeekendDz && (
                          <span className="text-[9px] text-amber-700 font-semibold">
                            {isRTL ? 'عطلة' : 'Repos'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Date Range */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">
                  {isRTL ? 'فترة الدورة الامتحانية (تاريخ البداية والنهاية) :' : 'Plage de dates globale de la session :'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                      <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isRTL ? 'تاريخ انطلاق الامتحانات :' : 'Date de début :'}</span>
                    </label>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => {
                        setDateDebut(e.target.value);
                        setHasModified(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                      <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isRTL ? 'تاريخ اختتام الامتحانات :' : 'Date de fin :'}</span>
                    </label>
                    <input
                      type="date"
                      value={dateFin}
                      onChange={(e) => {
                        setDateFin(e.target.value);
                        setHasModified(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Dynamic Effective Dates & Exceptions (Holidays) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-slate-800">
                      {isRTL ? 'الأيام الفعلية للاختبارات (استثناء العطل والمناسبات) :' : 'Jours effectifs d\'épreuves (Gestion des exceptions & fériés) :'}
                    </span>
                    <p className="text-[11px] text-slate-600">
                      {isRTL 
                        ? `${selectedDates.length} يوم مبرمج من أصل ${allPeriodDates.length} في الفترة`
                        : `${selectedDates.length} journées actives retenues sur ${allPeriodDates.length} jours`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={handleSelectAllWorkingDates}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-300 rounded text-xs font-semibold"
                    >
                      {isRTL ? 'تحديد أيام العمل فقط' : 'Jours ouvrables'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllDates}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-medium"
                    >
                      {isRTL ? 'تحديد الكل' : 'Tout cocher'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllDates}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 rounded text-xs font-medium"
                    >
                      {isRTL ? 'إلغاء الكل' : 'Tout décocher'}
                    </button>
                  </div>
                </div>

                {/* Dates grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {allPeriodDates.map((item) => {
                    const isSelected = selectedDates.includes(item.dateStr);
                    const dayMeta = WEEK_DAYS.find(w => w.index === item.dayIndex);
                    const dayName = isRTL ? (dayMeta?.ar || '') : (dayMeta?.fr || '');

                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => handleToggleDate(item.dateStr)}
                        className={`p-2 rounded-lg border text-start flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-2xs'
                            : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-150 line-through opacity-70'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="font-bold text-xs truncate">
                            {dayName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {item.dateStr}
                          </div>
                        </div>

                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-300 text-slate-600'
                        }`}>
                          {isSelected ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '✕'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Initial pool option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateExams}
                    onChange={(e) => setAutoCreateExams(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded bg-white border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-slate-800 font-bold">
                    {isRTL
                      ? `إنشاء بطاقات الامتحانات غير المبرمجة تلقائياً من قائمة المقاييس (${subjects.length} مقياس)`
                      : `Pré-générer automatiquement la réserve d'épreuves à partir des modules/matières existants (${subjects.length} matières)`}
                  </span>
                </label>

                <div className="text-[11px] text-slate-600 ps-6 rtl:ps-0 rtl:pe-6">
                  {isRTL
                    ? `سيتم إدراج الامتحانات في قائمة الانتظار السفلية لـ aSc TimeTables لتكون جاهزة للمولد التلقائي أو السحب والإفلات.`
                    : `Les épreuves seront déposées dans la réserve inférieure aSc TimeTables, prêtes pour la génération automatique heuristique.`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {/* Left / Back Button */}
          <div>
            {step > 1 ? (
              <button
                id="wiz-prev-btn"
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center space-x-1.5 rtl:space-x-reverse border border-slate-300 text-xs sm:text-sm transition"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{isRTL ? 'السابق' : 'Précédent'}</span>
              </button>
            ) : (
              <button
                id="wiz-cancel-btn"
                type="button"
                onClick={handleRequestClose}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                {isRTL ? 'إلغاء' : 'Annuler'}
              </button>
            )}
          </div>

          {/* Right / Next or Finish Button */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {step < 3 ? (
              <button
                id="wiz-next-btn"
                type="button"
                disabled={step === 1 ? !step1Valid : !step2Valid}
                onClick={() => setStep(step + 1)}
                className={`px-5 py-2 rounded-xl font-bold flex items-center space-x-1.5 rtl:space-x-reverse text-xs sm:text-sm shadow transition ${
                  (step === 1 ? step1Valid : step2Valid)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <span>{isRTL ? 'التالي' : 'Suivant'}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                id="wiz-finish-btn"
                type="button"
                disabled={!step3Valid}
                onClick={handleFinishWizard}
                className={`px-6 py-2 rounded-xl font-bold flex items-center space-x-2 rtl:space-x-reverse text-xs sm:text-sm shadow-md transition ${
                  step3Valid
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer ring-2 ring-emerald-400'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRTL ? 'إتمام وتهيئة الدورة' : 'Initialiser la Session'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION CLOSE DIALOG */}
      {isConfirmCloseOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>{isRTL ? 'تأكيد إلغاء المساعد' : 'Annuler la configuration ?'}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isRTL 
                ? 'هل أنت متأكد من رغبتك في إغلاق المساعد؟ ستفقد التعديلات التي قمت بإدخالها ولم يتم حفظها بعد.'
                : 'Voulez-vous vraiment quitter l\'assistant ? Les modifications en cours ne seront pas enregistrées.'}
            </p>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmCloseOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                {isRTL ? 'متابعة الإعداد' : 'Poursuivre la saisie'}
              </button>

              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
              >
                {isRTL ? 'تأكيد الخروج' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
