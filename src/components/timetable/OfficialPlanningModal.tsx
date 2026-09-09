import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Calendar, 
  Maximize2, 
  Minimize2, 
  Layers,
  LayoutGrid,
  ListFilter,
  CheckCircle2, 
  AlertCircle,
  Building2,
  GraduationCap,
  Info
} from 'lucide-react';
import { Exam, Teacher, Room, PromotionGroup, TimeSlot, InstitutionSettings } from '../../types';
import { ExportUtils } from '../../services/exportUtils';

export interface OfficialPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowId: string;
  rowLabel: string;
  rowType: 'global' | 'promotion' | 'teacher' | 'room' | 'module';
  autoPrint?: boolean;
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  promotions: PromotionGroup[];
  timeSlots: TimeSlot[];
  sessionDates: string[];
  settings?: InstitutionSettings;
}

interface SlotInterval {
  key: string;
  label: string;
  heureDebut: string;
  heureFin: string;
}

export const OfficialPlanningModal: React.FC<OfficialPlanningModalProps> = ({
  isOpen,
  onClose,
  rowId,
  rowLabel,
  rowType,
  autoPrint = false,
  exams,
  teachers,
  rooms,
  promotions,
  timeSlots,
  sessionDates,
  settings
}) => {
  // --- States ---
  const [currentType, setCurrentType] = useState<'global' | 'promotion' | 'teacher' | 'room' | 'module'>(rowType);
  const [activePromoId, setActivePromoId] = useState<string>(rowId);
  const [globalViewMode, setGlobalViewMode] = useState<'synoptic' | 'by_promotion' | 'chronological'>('synoptic');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dateScope, setDateScope] = useState<'session' | 'exams'>('session');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const autoPrintTriggeredRef = useRef(false);

  const documentId = 'official-exam-timetable-document';

  // Synchronize initial state when modal opens or rowId/rowType changes
  useEffect(() => {
    if (isOpen) {
      setCurrentType(rowType);
      setActivePromoId(rowId);
      setStatusNotification(null);
    }
  }, [isOpen, rowId, rowType]);

  // Entity lookup maps
  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);
  const promoMap = useMemo(() => new Map<string, PromotionGroup>(promotions.map(p => [p.id, p])), [promotions]);

  // Find active promotion object safely
  const currentPromo = useMemo(() => {
    const target = (activePromoId || rowId || '').toLowerCase().trim();
    const targetLabel = (rowLabel || '').toLowerCase().trim();

    return promotions.find(p => {
      const pId = (p.id || '').toLowerCase().trim();
      const pNom = (p.nom || '').toLowerCase().trim();
      const pCode = (p.code || '').toLowerCase().trim();

      return (
        (pId && pId === target) ||
        (pNom && (pNom === target || pNom === targetLabel)) ||
        (pCode && (pCode === target || pCode === targetLabel)) ||
        (pNom && target && (pNom.includes(target) || target.includes(pNom)))
      );
    }) || promotions[0];
  }, [activePromoId, rowId, rowLabel, promotions]);

  // Find active teacher safely
  const currentTeacher = useMemo(() => {
    const target = (rowId || '').toLowerCase().trim();
    const targetLabel = (rowLabel || '').toLowerCase().trim();

    return teachers.find(t => {
      const tId = (t.id || '').toLowerCase().trim();
      const tNom = (t.nom || '').toLowerCase().trim();
      const fullName = `${t.nom} ${t.prenom || ''}`.toLowerCase().trim();
      return (
        tId === target ||
        tNom === targetLabel ||
        fullName === targetLabel ||
        targetLabel.includes(tNom)
      );
    });
  }, [rowId, rowLabel, teachers]);

  // Find active room safely
  const currentRoom = useMemo(() => {
    const target = (rowId || '').toLowerCase().trim();
    const targetLabel = (rowLabel || '').toLowerCase().trim();

    return rooms.find(r => {
      const rId = (r.id || '').toLowerCase().trim();
      const rNom = (r.nom || '').toLowerCase().trim();
      return rId === target || rNom === target || rNom === targetLabel;
    });
  }, [rowId, rowLabel, rooms]);

  // Match exam to a specific promotion
  const matchPromotionExam = useCallback((e: Exam, promo?: PromotionGroup, targetId?: string, targetLabel?: string) => {
    const tId = (targetId || '').toLowerCase().trim();
    const tLabel = (targetLabel || '').toLowerCase().trim();
    const eNiveau = (e.niveau || '').toLowerCase().trim();
    const ePromo = (e.promotion || '').toLowerCase().trim();
    const ePromoId = ((e as any).promotionId || '').toLowerCase().trim();

    // 1. Direct equality
    if (tId && (eNiveau === tId || ePromo === tId || ePromoId === tId)) return true;
    if (tLabel && (eNiveau === tLabel || ePromo === tLabel || ePromoId === tLabel)) return true;

    // 2. Promo object matches
    if (promo) {
      const pNom = (promo.nom || '').toLowerCase().trim();
      const pCode = (promo.code || '').toLowerCase().trim();
      const pId = (promo.id || '').toLowerCase().trim();

      if (pNom && (eNiveau === pNom || ePromo === pNom)) return true;
      if (pId && (ePromoId === pId || eNiveau === pId)) return true;
      if (pCode && (eNiveau === pCode || ePromo === pCode)) return true;
      if (pCode && eNiveau.includes(pCode)) return true;
      if (pNom && (eNiveau.includes(pNom) || pNom.includes(eNiveau))) return true;
    }

    // 3. Shared promotions
    if (e.sharedPromotions && Array.isArray(e.sharedPromotions) && e.sharedPromotions.length > 0) {
      return e.sharedPromotions.some(sp => {
        const spLower = (sp || '').toLowerCase().trim();
        if (!spLower) return false;
        if (tId && spLower === tId) return true;
        if (tLabel && spLower === tLabel) return true;
        if (promo) {
          const pNom = (promo.nom || '').toLowerCase().trim();
          const pCode = (promo.code || '').toLowerCase().trim();
          if (pNom && (spLower === pNom || spLower.includes(pNom) || pNom.includes(spLower))) return true;
          if (pCode && (spLower === pCode || spLower.includes(pCode))) return true;
        }
        return false;
      });
    }

    return false;
  }, []);

  // Filter exams strictly according to active type
  const rowExams = useMemo(() => {
    if (currentType === 'global') {
      return exams;
    }

    if (currentType === 'promotion') {
      return exams.filter(e => matchPromotionExam(e, currentPromo, activePromoId, rowLabel));
    }

    if (currentType === 'teacher') {
      const targetTeacherId = currentTeacher?.id || rowId;
      return exams.filter(e => 
        e.responsableId === targetTeacherId || 
        e.responsableId === rowId ||
        e.salles?.some(s => s.surveillants?.some(sv => sv.teacherId === targetTeacherId || sv.teacherId === rowId))
      );
    }

    if (currentType === 'room') {
      const targetRoomId = currentRoom?.id || rowId;
      return exams.filter(e => 
        e.salles?.some(s => s.roomId === targetRoomId || s.roomId === rowId)
      );
    }

    // rowType === 'module'
    const target = (rowId || '').toLowerCase().trim();
    const targetLabel = (rowLabel || '').toLowerCase().trim();
    return exams.filter(e => {
      const cMod = (e.codeModule || '').toLowerCase().trim();
      const nMod = (e.nomModule || '').toLowerCase().trim();
      return (
        e.id === rowId ||
        (cMod && cMod === target) ||
        (nMod && nMod === target) ||
        (cMod && targetLabel.includes(cMod)) ||
        (nMod && targetLabel.includes(nMod))
      );
    });
  }, [currentType, exams, currentPromo, activePromoId, rowLabel, currentTeacher, rowId, currentRoom, matchPromotionExam]);

  // Filter only exams that are scheduled (have date and start time)
  const scheduledExams = useMemo(() => {
    return rowExams.filter(e => e.date && e.heureDebut);
  }, [rowExams]);

  // Distinct dates calculation with dynamic trimming (hide days at beginning or end if empty)
  const distinctDates = useMemo(() => {
    const examDatesSet = new Set<string>();
    scheduledExams.forEach(e => {
      if (e.date) examDatesSet.add(e.date);
    });

    const baseDates = (sessionDates && sessionDates.length > 0)
      ? [...sessionDates]
      : (examDatesSet.size > 0 ? Array.from(examDatesSet) : ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10']);

    const sorted = baseDates.sort((a, b) => a.localeCompare(b));

    if (dateScope === 'exams' && examDatesSet.size > 0) {
      return Array.from(examDatesSet).sort((a, b) => a.localeCompare(b));
    }

    // Dynamic trimming: hide days at the start and end of the session if empty
    if (examDatesSet.size > 0) {
      let startIdx = 0;
      while (startIdx < sorted.length && !examDatesSet.has(sorted[startIdx])) {
        startIdx++;
      }

      let endIdx = sorted.length - 1;
      while (endIdx >= 0 && !examDatesSet.has(sorted[endIdx])) {
        endIdx--;
      }

      if (startIdx <= endIdx) {
        return sorted.slice(startIdx, endIdx + 1);
      }
    }

    return sorted;
  }, [scheduledExams, dateScope, sessionDates]);

  // Build slot intervals map chronologically
  const distinctSlots = useMemo(() => {
    const slotIntervalsMap = new Map<string, SlotInterval>();

    // 1. Gather slots from scheduled exams
    scheduledExams.forEach(ex => {
      const debut = (ex.heureDebut || '08:30').trim();
      const fin = (ex.heureFin || '10:00').trim();
      const key = `${debut}-${fin}`;
      if (!slotIntervalsMap.has(key)) {
        slotIntervalsMap.set(key, {
          key,
          label: `${debut} - ${fin}`,
          heureDebut: debut,
          heureFin: fin
        });
      }
    });

    // 2. Add from configured timeSlots to ensure standard grid
    if (timeSlots && timeSlots.length > 0) {
      timeSlots.forEach(ts => {
        const debut = (ts.heureDebut || '08:30').trim();
        const fin = (ts.heureFin || '10:00').trim();
        const key = `${debut}-${fin}`;
        if (!slotIntervalsMap.has(key)) {
          slotIntervalsMap.set(key, {
            key,
            label: `${debut} - ${fin}`,
            heureDebut: debut,
            heureFin: fin
          });
        }
      });
    }

    // 3. Standard fallback if empty
    if (slotIntervalsMap.size === 0) {
      slotIntervalsMap.set('08:30-10:00', { key: '08:30-10:00', label: '08:30 - 10:00', heureDebut: '08:30', heureFin: '10:00' });
      slotIntervalsMap.set('10:30-12:00', { key: '10:30-12:00', label: '10:30 - 12:00', heureDebut: '10:30', heureFin: '12:00' });
      slotIntervalsMap.set('13:00-14:30', { key: '13:00-14:30', label: '13:00 - 14:30', heureDebut: '13:00', heureFin: '14:30' });
    }

    return Array.from(slotIntervalsMap.values()).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  }, [scheduledExams, timeSlots]);

  // Assigned rooms list for promotion
  const assignedRoomNames = useMemo(() => {
    return Array.from(new Set(
      scheduledExams.flatMap(e => (e.salles || []).map(s => {
        const r = roomMap.get(s.roomId);
        return r ? r.nom : s.roomId;
      }))
    )).filter(Boolean);
  }, [scheduledExams, roomMap]);

  // Format Teacher Name with official title prefix
  const formatTeacherOfficialName = useCallback((teacherId?: string): string => {
    if (!teacherId) return '';
    const teacher = teacherMap.get(teacherId);
    if (!teacher) return '';

    let prefix = teacher.titre?.trim();
    if (!prefix) {
      const grade = (teacher.grade || '').toLowerCase();
      if (grade.includes('prof') || grade.includes('pr')) {
        prefix = 'Pr.';
      } else if (grade.includes('doc') || grade.includes('mca') || grade.includes('mcb')) {
        prefix = 'Dr.';
      } else if (
        teacher.prenom && (
          teacher.prenom.toLowerCase().endsWith('a') ||
          teacher.prenom.toLowerCase().includes('fatima') ||
          teacher.prenom.toLowerCase().includes('samira') ||
          teacher.prenom.toLowerCase().includes('souad') ||
          teacher.prenom.toLowerCase().includes('amina')
        )
      ) {
        prefix = 'Mme.';
      } else {
        prefix = 'M.';
      }
    }

    const prenomInitial = teacher.prenom ? ` ${teacher.prenom.trim().charAt(0).toUpperCase()}.` : '';
    return `${prefix} ${teacher.nom}${prenomInitial}`.trim();
  }, [teacherMap]);

  // Format date header: French day name + DD/MM/YYYY
  const formatDateHeader = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        const dayName = d.toLocaleDateString('fr-FR', { weekday: 'long' });
        const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        return {
          dayName,
          dateFormatted: formattedDate
        };
      }
      return { dayName: 'Jour', dateFormatted: dateStr };
    } catch {
      return { dayName: 'Jour', dateFormatted: dateStr };
    }
  };

  // Find exam for a specific (slot, date) in individual views
  const getExamForSlotAndDate = useCallback((slot: SlotInterval, dateStr: string): Exam | undefined => {
    return scheduledExams.find(e => {
      if (e.date !== dateStr) return false;
      const exDebut = (e.heureDebut || '').trim();
      const exFin = (e.heureFin || '').trim();
      if (`${exDebut}-${exFin}` === slot.key) return true;
      return (exDebut && slot.heureDebut && exDebut === slot.heureDebut);
    });
  }, [scheduledExams]);

  // Find exam for a specific promotion, slot and date in global view
  const getExamForPromoSlotAndDate = useCallback((promo: PromotionGroup, slot: SlotInterval, dateStr: string): Exam | undefined => {
    return exams.find(e => {
      if (e.date !== dateStr) return false;
      const exDebut = (e.heureDebut || '').trim();
      const exFin = (e.heureFin || '').trim();
      const slotMatches = (`${exDebut}-${exFin}` === slot.key) || (exDebut && slot.heureDebut && exDebut === slot.heureDebut);
      if (!slotMatches) return false;

      return matchPromotionExam(e, promo, promo.id, promo.nom);
    });
  }, [exams, matchPromotionExam]);

  // Handlers for printing and PDF export
  const handlePrint = async () => {
    setIsPrinting(true);
    setStatusNotification(null);
    const targetTitle = currentType === 'global'
      ? 'Planning_General_Examens_Session_Complete'
      : `Planning_Examens_${(currentPromo?.nom || rowLabel).replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const res = await ExportUtils.printOfficialPlanning(documentId, targetTitle);
      if (res.fallbackUsed) {
        setStatusNotification({
          type: 'info',
          message: "L'impression directe étant restreinte dans ce cadre, le document a été automatiquement généré en PDF A4 Paysage."
        });
      }
    } catch (err) {
      console.warn('Erreur print direct, export PDF de secours', err);
      await handleDownloadPDF();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    setStatusNotification(null);
    const targetTitle = currentType === 'global'
      ? 'Planning_General_Examens_Session_Complete'
      : `Planning_Examens_${(currentPromo?.nom || rowLabel).replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      await ExportUtils.exportElementAsPDF(documentId, `${targetTitle}.pdf`, 'landscape');
      setStatusNotification({
        type: 'success',
        message: "Fichier PDF officiel A4 Paysage téléchargé avec succès."
      });
    } catch (err) {
      console.error('Erreur export PDF', err);
      setStatusNotification({
        type: 'error',
        message: "Échec de l'export PDF. Veuillez réessayer."
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Auto-print effect
  useEffect(() => {
    if (isOpen && autoPrint && !autoPrintTriggeredRef.current) {
      autoPrintTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      autoPrintTriggeredRef.current = false;
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  // Compute subtitles & labels
  const isGlobal = currentType === 'global';
  const promoSemestre = currentPromo?.semestre || (currentPromo?.annee && String(currentPromo.annee).includes('M2') ? 'S3' : (settings?.semestreActuel || 'S1'));
  const promoFiliere = currentPromo?.filiere || currentPromo?.specialite || '';
  const displayPromoName = isGlobal ? "Toutes les promotions" : (currentPromo?.nom || rowLabel);
  const displayFiliere = isGlobal ? "Toutes les filières" : (promoFiliere || '—');
  const displayRooms = isGlobal 
    ? "Toutes les salles" 
    : currentType === 'room'
    ? (currentRoom?.nom || rowLabel)
    : (assignedRoomNames.length > 0 ? assignedRoomNames.join(', ') : '—');
  const displaySemestre = currentType === 'promotion'
    ? (currentPromo?.semestre || promoSemestre || 'S1')
    : (settings?.semestreActuel || 'S1');

  // Format with the 1st letter of each word in uppercase and the rest in lowercase
  const formatPromotionName = (val: string): string => {
    if (!val) return '';
    const formatWord = (w: string): string => {
      if (!w) return '';
      const prefixMatch = w.match(/^([(\[{«"']+)(.*)$/);
      if (prefixMatch) {
        return prefixMatch[1] + formatWord(prefixMatch[2]);
      }
      if (w.includes('-')) {
        return w.split('-').map(formatWord).join('-');
      }
      if (w.includes("'")) {
        return w.split("'").map(formatWord).join("'");
      }
      if (w.includes("’")) {
        return w.split("’").map(formatWord).join("’");
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    };

    return val
      .trim()
      .split(/\s+/)
      .map(formatWord)
      .join(' ');
  };

  return (
    <div 
      className="official-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className={`official-modal-dialog bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-7xl max-h-[96vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isGlobal 
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            }`}>
              {isGlobal ? <LayoutGrid className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>{isGlobal ? "Planning Général de la Session Complète" : `Planning Officiel : ${currentPromo?.nom || rowLabel}`}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  scheduledExams.length > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {scheduledExams.length} épreuve(s)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Document officiel conforme pour affichage universitaire et archives réglementaires (Format A4 Paysage)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switcher: Global vs Promotion */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setCurrentType('global')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  currentType === 'global'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Afficher la vue globale complète de toutes les promotions de la session"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Vue Globale Session</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentType('promotion')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  currentType === 'promotion'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Afficher l'emploi du temps par promotion étudiante"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Par Promotion</span>
              </button>
            </div>

            {/* Promotion Selector Dropdown when in promotion mode or by_promotion mode */}
            {currentType === 'promotion' && promotions.length > 0 && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <select
                  value={currentPromo?.id || activePromoId}
                  onChange={(e) => {
                    const selected = promotions.find(p => p.id === e.target.value);
                    if (selected) {
                      setActivePromoId(selected.id);
                    }
                  }}
                  className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900 text-black dark:text-white">
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Global View Sub-mode Selector when in Global Mode */}
            {currentType === 'global' && (
              <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGlobalViewMode('synoptic')}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    globalViewMode === 'synoptic'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Grille synoptique matricielle (Promotions x Créneaux)"
                >
                  Grille Synoptique
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalViewMode('by_promotion')}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    globalViewMode === 'by_promotion'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Aperçu fiche individuelle avec sélecteur"
                >
                  Fiches Promotions
                </button>
              </div>
            )}

            {/* Date Scope Filter */}
            {sessionDates.length > 0 && scheduledExams.length > 0 && (
              <button
                type="button"
                onClick={() => setDateScope(dateScope === 'session' ? 'exams' : 'session')}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 transition"
                title="Basculer entre l'affichage de toute la session ou uniquement les jours avec épreuves"
              >
                {dateScope === 'session' ? `Session (${distinctDates.length}j)` : `Épreuves (${distinctDates.length}j)`}
              </button>
            )}

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-300 dark:border-slate-700 shadow-2xs"
              title="Télécharger le document officiel en PDF A4 Paysage"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{isExportingPDF ? 'Génération...' : 'PDF A4 Paysage'}</span>
            </button>

            {/* Reliable Print Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Lancer l'impression officielle (A4 Paysage)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Impression...' : 'Imprimer'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusNotification && (
          <div className={`px-5 py-2 text-xs flex items-center justify-between no-print ${
            statusNotification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800' 
              : statusNotification.type === 'error'
              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800'
              : 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-b border-sky-200 dark:border-sky-800'
          }`}>
            <span>{statusNotification.message}</span>
            <button 
              onClick={() => setStatusNotification(null)}
              className="text-xs font-semibold underline hover:opacity-80 ml-4"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Scrollable Workspace with printable A4 sheet */}
        <div className="p-4 sm:p-6 overflow-auto flex-1 bg-slate-100/60 dark:bg-slate-950/40 flex justify-center">
          <div
            id={documentId}
            className="w-full max-w-[1240px] bg-white text-black p-6 sm:p-8 rounded-xl shadow-lg border border-slate-300 official-planning-card official-document-print transition-all"
            style={{
              fontFamily: "'Times New Roman', Times, serif"
            }}
          >
            {/* 1. Official Administrative Header — strictly using configured institution settings */}
            <div className="border-b-2 border-slate-900 pb-3 mb-3">
              {/* Institution Credentials Bar with Slogan in Center */}
              <div className="flex items-center justify-between gap-4 text-xs">
                {/* Left Column: Academic Entity */}
                <div className="w-5/12 text-left space-y-0.5">
                  <p className="font-extrabold text-[13px] text-black tracking-tight uppercase">
                    {settings?.universite || "Établissement Universitaire"}
                  </p>
                  {settings?.departement && (
                    <p className="text-[11px] font-bold text-slate-800">
                      {settings.departement}
                    </p>
                  )}
                  {settings?.faculteInstitut && (
                    <p className="text-[11px] font-semibold text-slate-700">
                      {settings.faculteInstitut}
                    </p>
                  )}
                </div>

                {/* Center Column: Slogan / Logo de l'Université */}
                <div className="w-3/12 flex flex-col items-center justify-center text-center px-2 shrink-0">
                  {settings?.sloganBase64 ? (
                    <img
                      src={settings.sloganBase64}
                      alt="Slogan / Logo de l'Université"
                      className="max-h-16 sm:max-h-20 max-w-[220px] object-contain print:max-h-16"
                    />
                  ) : ((settings as any)?.slogan ? (
                    <p className="text-xs font-serif italic font-bold text-slate-900 text-center">
                      {(settings as any).slogan}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-0.5" title="Slogan / Logo de l'Université">
                      <svg className="w-12 h-12 text-slate-500 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                  ))}
                </div>

                {/* Right Column: Academic Year & Session */}
                <div className="w-4/12 text-right space-y-1">
                  <p className="text-[12px] font-bold text-black">
                    Année Universitaire : {settings?.anneeUniversitaire || '2025/2026'}
                  </p>
                  <p className="text-[12px] font-bold text-black">
                    Session : {settings?.sessionActuelle || 'Ordinaire'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Official Academic Banner */}
            <div className="w-full py-2 px-4 bg-slate-900 text-white text-center my-2 shadow-xs rounded-xs official-banner">
              <h1 className="text-base sm:text-lg font-bold tracking-wider uppercase text-white" style={{ fontFamily: "'Times New Roman', serif" }}>
                {isGlobal
                  ? "Planning Général des Examens — Session Complète"
                  : currentType === 'room'
                  ? "Planning Officiel des Salles"
                  : currentType === 'teacher'
                  ? "Planning Officiel des Enseignants"
                  : currentType === 'module'
                  ? "Planning Officiel des Matières"
                  : "Planning Officiel des Examens"}
              </h1>
            </div>

            {/* 3. Academic Details (Au-dessous du planning officiel des examens) */}
            <div className="my-2.5 px-1 flex items-start justify-between text-xs sm:text-[13px] text-black" style={{ fontFamily: "'Times New Roman', serif" }}>
              {/* Left Column: Promotion & Filière OU Salle/Enseignant/Matière */}
              <div className="text-left space-y-1">
                {currentType === 'room' ? (
                  <div>
                    <span className="font-bold">Salle : </span>
                    <span className="font-semibold text-black">
                      {currentRoom?.nom || rowLabel}
                    </span>
                  </div>
                ) : currentType === 'teacher' ? (
                  <div>
                    <span className="font-bold">Enseignant : </span>
                    <span className="font-semibold text-black">
                      {currentTeacher ? `${currentTeacher.nom} ${currentTeacher.prenom}` : rowLabel}
                    </span>
                  </div>
                ) : currentType === 'module' ? (
                  <div>
                    <span className="font-bold">Matière : </span>
                    <span className="font-semibold text-black">
                      {rowLabel}
                    </span>
                  </div>
                ) : isGlobal ? (
                  <>
                    <div>
                      <span className="font-bold">Promotion : </span>
                      <span className="font-semibold text-black">
                        {formatPromotionName(displayPromoName)}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Filière : </span>
                      <span className="font-semibold">
                        {displayFiliere}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-bold">Promotion : </span>
                      <span className="font-semibold text-black">
                        {formatPromotionName(displayPromoName)}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Filière : </span>
                      <span className="font-semibold">
                        {displayFiliere}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Salle & Semestre OU rien pour vues spécifiques */}
              {!isGlobal && (currentType === 'room' || currentType === 'teacher' || currentType === 'module') ? (
                <div className="text-right space-y-1">
                  {/* Rien à afficher pour les vues Salles/Enseignants/Matières */}
                </div>
              ) : (
                <div className="text-right space-y-1">
                  <div>
                    <span className="font-bold">Salle : </span>
                    <span className="font-extrabold">
                      {displayRooms}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">Semestre : </span>
                    <span className="font-semibold">
                      {displaySemestre}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notice if 0 scheduled exams in this selection */}
            {scheduledExams.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-center gap-2.5 text-xs">
                <Info className="w-4 h-4 shrink-0 text-amber-700" />
                <div>
                  <span className="font-bold">Information : </span>
                  <span>Aucun examen n'est encore programmé pour cet élément sur les dates sélectionnées. Utilisez Données de base ou l'Auto-générateur pour planifier les épreuves.</span>
                </div>
              </div>
            )}

            {/* 5. TABLE LAYOUT */}
            {/* VIEW A: GLOBAL SYNOPTIC MATRIX (Promotions x Dates & Slots) */}
            {isGlobal && globalViewMode === 'synoptic' ? (
              <div className="w-full overflow-x-auto">
                <table 
                  className="w-full border-collapse border-2 border-black text-xs text-black"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  <thead>
                    {/* Row 1: Dates as major headers */}
                    <tr>
                      <th 
                        rowSpan={2}
                        className="border border-black p-2 bg-slate-100 text-center font-bold text-black min-w-[180px] max-w-[260px] print:min-w-[170px] print:max-w-[240px] align-middle"
                      >
                        Promotions Étudiantes
                      </th>
                      {distinctDates.map((dateStr) => {
                        const { dayName, dateFormatted } = formatDateHeader(dateStr);
                        return (
                          <th
                            key={dateStr}
                            colSpan={distinctSlots.length}
                            className="border border-black p-1 text-center font-bold bg-slate-50 text-black"
                          >
                            <div className="text-xs capitalize font-bold leading-tight">
                              {dayName}
                            </div>
                            <div className="text-[10px] font-normal mt-0.5">
                              {dateFormatted}
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    {/* Row 2: Time Slots under each Date */}
                    <tr>
                      {distinctDates.map((dateStr) => (
                        distinctSlots.map((slot) => (
                          <th
                            key={`${dateStr}-${slot.key}`}
                            className="border border-black p-1 text-center text-[10px] font-bold bg-white text-black min-w-[95px]"
                          >
                            {slot.label}
                          </th>
                        ))
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {promotions.map((promo) => {
                      return (
                        <tr key={promo.id || promo.nom} className="hover:bg-slate-50">
                          {/* Left sticky promotion title */}
                          <td 
                            onClick={() => {
                              setCurrentType('promotion');
                              setActivePromoId(promo.id);
                            }}
                            className="border border-black p-2 font-bold text-left align-middle bg-slate-50 text-black cursor-pointer hover:bg-teal-50 group transition select-none min-w-[180px] max-w-[260px] print:min-w-[170px] print:max-w-[240px]"
                            title="Cliquer pour afficher et imprimer l'emploi du temps détaillé de cette promotion (avec nom complet des matières)"
                          >
                            <div className="flex items-start gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30 mt-0.5 print:border-black" 
                                style={{ backgroundColor: promo.couleur || '#8b5cf6' }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] sm:text-xs font-bold leading-tight text-black group-hover:text-teal-800 group-hover:underline break-words whitespace-normal" title={promo.nom}>
                                  {promo.nom}
                                </div>
                                {(promo.semestre || promo.filiere) && (
                                  <div className="text-[9px] sm:text-[10px] text-slate-800 mt-0.5 leading-snug break-words whitespace-normal" title={promo.nom}>
                                    {[promo.semestre, promo.filiere].filter(Boolean).join(' • ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Matrix cells */}
                          {distinctDates.map((dateStr) => (
                            distinctSlots.map((slot) => {
                              const exam = getExamForPromoSlotAndDate(promo, slot, dateStr);

                              if (!exam) {
                                return (
                                  <td
                                    key={`${promo.id}-${dateStr}-${slot.key}`}
                                    className="border border-black p-1 text-center align-top bg-white h-16 min-h-[60px]"
                                  >
                                    <div className="h-full min-h-[50px]" />
                                  </td>
                                );
                              }

                              const teacherName = exam.responsableId ? formatTeacherOfficialName(exam.responsableId) : '';

                              return (
                                <td
                                  key={`${promo.id}-${dateStr}-${slot.key}`}
                                  className="border border-black p-1 text-center align-top bg-white h-16 min-h-[60px]"
                                >
                                  <div className="flex flex-col justify-between h-full min-h-[50px] text-[10px] p-0.5">
                                    <div>
                                      {/* Code de la matière dans la vue globale (session complète) */}
                                      <div 
                                        className="font-bold text-black leading-tight font-mono text-[11px]"
                                        title={`${exam.codeModule ? `${exam.codeModule} - ` : ''}${exam.nomModule || ''}`}
                                      >
                                        {exam.codeModule || exam.nomModule}
                                      </div>
                                    </div>
                                    {teacherName && (
                                      <div className="mt-1 text-[8.5px] text-black font-medium italic">
                                        {teacherName}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* VIEW B: INDIVIDUAL STANDARD GRID (Horaires x Jours) for Promotion / Teacher / Room / Module */
              <div className="w-full overflow-x-auto">
                <table 
                  className="w-full border-collapse border-2 border-black text-xs text-black"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  <thead>
                    <tr>
                      {/* Top-Left Diagonal Slash Cell separating "Horaire" and "Jour" */}
                      <th className="relative p-0 w-24 sm:w-28 h-12 border border-black bg-white select-none">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" strokeWidth="1.5" />
                        </svg>
                        <div className="absolute top-1 right-2 text-[10px] sm:text-[11px] font-bold text-black capitalize">
                          Jour
                        </div>
                        <div className="absolute bottom-1 left-2 text-[10px] sm:text-[11px] font-bold text-black capitalize">
                          Horaire
                        </div>
                      </th>

                      {/* Horizontal Date Columns */}
                      {distinctDates.map((dateStr) => {
                        const { dayName, dateFormatted } = formatDateHeader(dateStr);
                        return (
                          <th 
                            key={dateStr}
                            className="border border-black p-1.5 text-center font-bold align-middle bg-white min-w-[105px] sm:min-w-[125px]"
                          >
                            <div className="text-xs sm:text-[13px] capitalize font-bold leading-tight text-black">
                              {dayName}
                            </div>
                            <div className="text-[11px] font-normal text-black mt-0.5 leading-tight">
                              {dateFormatted}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {distinctSlots.map((slot) => (
                      <tr key={slot.key}>
                        {/* Left Column: Time Slot */}
                        <td className="border border-black p-2 font-bold text-center align-middle whitespace-nowrap bg-white text-[11px] sm:text-xs text-black">
                          {slot.label}
                        </td>

                        {/* Content Cells */}
                        {distinctDates.map((dateStr) => {
                          const exam = getExamForSlotAndDate(slot, dateStr);

                          if (!exam) {
                            return (
                              <td 
                                key={`${slot.key}-${dateStr}`}
                                className="border border-black p-2 align-top text-center bg-white h-24 min-h-[90px]"
                              >
                                <div className="h-full min-h-[75px]" />
                              </td>
                            );
                          }

                          const teacherName = exam.responsableId ? formatTeacherOfficialName(exam.responsableId) : '';
                          const isResp = currentTeacher && exam.responsableId === currentTeacher.id;
                          let teacherAssignedRoom = '';
                          let teacherRole = isResp ? 'Responsable' : '';
                          if (currentTeacher) {
                            exam.salles?.forEach(s => {
                              const sv = s.surveillants?.find(v => v.teacherId === currentTeacher.id);
                              if (sv) {
                                const r = roomMap.get(s.roomId);
                                teacherAssignedRoom = r ? r.nom : s.roomId;
                                if (!teacherRole) teacherRole = sv.role || 'Surveillant';
                              }
                            });
                          }

                          const roomSurveillants = currentRoom 
                            ? exam.salles?.find(s => s.roomId === currentRoom.id)?.surveillants?.map(sv => {
                                const t = teacherMap.get(sv.teacherId);
                                const titlePrefix = t?.titre?.trim() ? `${t.titre.trim()} ` : '';
                                return t ? `${titlePrefix}${t.nom} ${t.prenom?.charAt(0) || ''}.`.trim() : sv.teacherId;
                              }).join(', ')
                            : '';

                          const examRoomNames = (exam.salles || []).map(s => {
                            const r = roomMap.get(s.roomId);
                            return r ? r.nom : s.roomId;
                          }).filter(Boolean);

                          return (
                            <td 
                              key={`${slot.key}-${dateStr}`}
                              className="border border-black p-2 align-top text-center bg-white h-24 min-h-[90px]"
                            >
                              <div className="flex flex-col justify-between h-full min-h-[75px]">
                                <div>
                                  <div className="text-[11px] sm:text-xs font-bold text-black leading-snug">
                                    {exam.nomModule || exam.codeModule}
                                  </div>
                                </div>

                                {currentType === 'teacher' ? (
                                  <div className="mt-1 space-y-0.5 text-[10px] text-black">
                                    {exam.niveau && (
                                      <div className="font-semibold text-slate-800">
                                        {exam.niveau}
                                      </div>
                                    )}
                                    {teacherAssignedRoom && (
                                      <div className="font-bold text-teal-800">
                                        Salle : {teacherAssignedRoom}
                                      </div>
                                    )}
                                    {teacherRole && (
                                      <div className="inline-block px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-medium">
                                        {teacherRole}
                                      </div>
                                    )}
                                  </div>
                                ) : currentType === 'room' ? (
                                  <div className="mt-1 space-y-0.5 text-[10px] text-black">
                                    {exam.niveau && (
                                      <div className="font-semibold text-slate-800">
                                        {exam.niveau}
                                      </div>
                                    )}
                                    {roomSurveillants && (
                                      <div className="text-[9px] text-slate-700">
                                        Surv : {roomSurveillants}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Promotion or Module: Only Subject Name and Teacher */
                                  <div className="mt-1 space-y-0.5 text-[10px] text-black">
                                    {teacherName && (
                                      <div className="font-medium text-black italic">
                                        {teacherName}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. Official Footer & Administrative Signature Block */}
            <div className="mt-8 pt-4 flex items-start justify-between text-xs text-black border-t border-slate-300" style={{ fontFamily: "'Times New Roman', serif" }}>
              {/* Left Column: Date on the same line to the left of the Chef de Département */}
              <div className="text-left pt-1">
                <p className="text-xs sm:text-[13px] font-bold text-black">
                  {settings?.lieu ? `${settings.lieu}, ` : ''}le {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Right Column: Chef de Département Block (kept at the bottom) */}
              <div className="text-right pr-6">
                <p className="font-bold text-xs uppercase text-black">
                  {settings?.titreChefDepartement || 'Le Chef de Département'}
                </p>
                <div className="h-12 flex items-center justify-end">
                  {settings?.signatureBase64 ? (
                    <img src={settings.signatureBase64} alt="Signature" className="h-10 object-contain" />
                  ) : (
                    <span className="text-[10px] italic text-slate-400">(Signature & Cachet Officiel)</span>
                  )}
                </div>
                {settings?.nomChefDepartement && (
                  <p className="font-semibold text-xs text-black">
                    {settings.nomChefDepartement}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 no-print">
          <div className="flex items-center gap-2">
            <span>Aperçu réglementaire A4 Paysage</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{isGlobal ? "Vue Globale (Session Complète)" : `Promotion : ${currentPromo?.nom || rowLabel}`}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
