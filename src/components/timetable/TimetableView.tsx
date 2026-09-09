import React, { useState, useMemo, useEffect } from 'react';
import { 
  Exam, 
  Teacher, 
  Room, 
  PromotionGroup, 
  SubjectModule, 
  TimeSlot, 
  ConflictAlert,
  TimeOffEntry,
  InstitutionSettings
} from '../../types';
import { Translations } from '../../services/i18n';
import { ExportUtils } from '../../services/exportUtils';
import { OfficialPlanningModal } from './OfficialPlanningModal';
import { 
  Users, 
  DoorClosed, 
  Layers, 
  BookOpen, 
  AlertTriangle, 
  Plus, 
  GripHorizontal, 
  Sparkles, 
  Trash2, 
  Check, 
  Move,
  Info,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  CalendarPlus,
  CheckCircle2,
  GraduationCap,
  RotateCcw,
  Undo2,
  ArrowDownToLine,
  ArrowUpDown,
  LayoutGrid,
  Filter,
  Minimize2,
  Maximize2,
  Search,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  Printer,
  Pencil
} from 'lucide-react';
import { doTimesOverlap } from '../../services/conflictEngine';
import { formatGrade, formatSemester, SEMESTER_OPTIONS } from '../../utils/gradeUtils';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { 
  isSubjectPlannedForPromotion, 
  getLinkedPromotionsForExam, 
  getLinkedPromotionsForSubject,
  isSamePromotion,
  getCanonicalPromotionName
} from '../../utils/dataLinkUtils';

export type TimetableViewMode = 'global' | 'teachers' | 'rooms' | 'promotions' | 'modules';

interface TimetableViewProps {
  viewMode: TimetableViewMode | 'teachers' | 'rooms' | 'promotions' | 'modules';
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  timeSlots: TimeSlot[];
  sessionDates: string[];
  conflicts: ConflictAlert[];
  timeOffConstraints: TimeOffEntry[];
  t: Translations;
  settings?: InstitutionSettings;
  onUpdateExams: (updated: Exam[]) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam?: (examId: string) => void;
  onAddExam: () => void;
  onOpenRoomAssignment?: (options?: { examId?: string; roomId?: string; promoName?: string }) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  viewMode: propViewMode,
  exams,
  teachers,
  rooms,
  promotions,
  subjects,
  timeSlots,
  sessionDates,
  conflicts,
  timeOffConstraints,
  t,
  settings,
  onUpdateExams,
  onEditExam,
  onDeleteExam,
  onAddExam,
  onOpenRoomAssignment
}) => {
  // Deletion confirmation state
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Current view mode state, synchronized with prop (promotions mode is merged into global)
  const [currentMode, setCurrentMode] = useState<TimetableViewMode>(
    propViewMode === 'promotions' ? 'global' : ((propViewMode as TimetableViewMode) || 'global')
  );

  useEffect(() => {
    if (propViewMode) {
      setCurrentMode(propViewMode === 'promotions' ? 'global' : (propViewMode as TimetableViewMode));
    }
  }, [propViewMode]);

  // Display all session dates in the window
  const effectiveDates = useMemo(() => {
    if (!sessionDates || sessionDates.length === 0) return [];
    return [...sessionDates].sort((a, b) => a.localeCompare(b));
  }, [sessionDates]);

  // Filtering and view state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedPromoFilter, setSelectedPromoFilter] = useState<string>('all');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState<string>('all');
  const [isCompact, setIsCompact] = useState(false);

  // Row blocking state (blocked line IDs where cards cannot be moved)
  const [blockedRows, setBlockedRows] = useState<Set<string>>(new Set());

  // Context Menu state for timetable row headers
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    rowId: string;
    rowLabel: string;
    rowType: 'global' | 'promotion' | 'teacher' | 'room' | 'module';
  } | null>(null);

  // Row preview modal state
  const [previewPlanningModal, setPreviewPlanningModal] = useState<{
    isOpen: boolean;
    rowId: string;
    rowLabel: string;
    rowType: 'global' | 'promotion' | 'teacher' | 'room' | 'module';
    autoPrint?: boolean;
  } | null>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Don't close if right mouse button triggered this click event
      if (e.button === 2) return;
      if (contextMenu) setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        if (previewPlanningModal) setPreviewPlanningModal(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, previewPlanningModal]);

  // Drag and drop & Reserve state
  const [draggedExamId, setDraggedExamId] = useState<string | null>(null);
  const [selectedPromoForSubjects, setSelectedPromoForSubjects] = useState<string | null>(null);
  const [hoveredReserveItem, setHoveredReserveItem] = useState<any>(null);
  const [selectedReserveItem, setSelectedReserveItem] = useState<any>(null);
  const [previewCardModalItem, setPreviewCardModalItem] = useState<any | null>(null);
  const [hoveredExamCard, setHoveredExamCard] = useState<Exam | null>(null);
  const [selectedExamCard, setSelectedExamCard] = useState<Exam | null>(null);
  const [dropAlert, setDropAlert] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);
  const [isDragOverReserve, setIsDragOverReserve] = useState(false);
  const [draggedSubject, setDraggedSubject] = useState<{
    id: string;
    code: string;
    nom: string;
    promo: string;
    teacherId?: string;
    semestre?: string;
    duree?: number;
    coeff?: number;
    effectif?: number;
  } | null>(null);

  // Auto-dismiss drop alerts after 5 seconds
  useEffect(() => {
    if (dropAlert) {
      const timer = setTimeout(() => setDropAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [dropAlert]);

  // Fast entity maps
  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);
  const promoMap = useMemo(() => new Map<string, PromotionGroup>(promotions.map(p => [p.nom, p])), [promotions]);
  const subjectMap = useMemo(() => new Map<string, SubjectModule>(subjects.map(s => [s.code || s.codeModule || s.id, s])), [subjects]);

  // Map of conflicts by exam ID
  const conflictsByExamId = useMemo(() => {
    const map = new Map<string, ConflictAlert[]>();
    conflicts.forEach(c => {
      (c.examIds || []).forEach(eId => {
        const list = map.get(eId) || [];
        list.push(c);
        map.set(eId, list);
      });
    });
    return map;
  }, [conflicts]);

  // Strictly use promotions from base data (onglet données de base), ignoring any auto-generated duplicates
  const allPromotions = useMemo(() => {
    return promotions.filter(p => !p.id?.startsWith('promo-auto'));
  }, [promotions]);

  // Alphabetically sorted lists for filter dropdowns
  const sortedTeachersList = useMemo(() => {
    return [...teachers].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [teachers]);

  const sortedRoomsList = useMemo(() => {
    return [...rooms].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [rooms]);

  const sortedPromotionsList = useMemo(() => {
    return [...allPromotions].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [allPromotions]);

  // Determine all promotion names concerned by whatever is currently being dragged
  const activeDraggingConcernedPromos = useMemo(() => {
    if (draggedSubject) {
      return getLinkedPromotionsForSubject(draggedSubject, subjects, exams, allPromotions);
    }
    if (draggedExamId) {
      const exam = exams.find(e => e.id === draggedExamId);
      if (!exam) return [];
      return getLinkedPromotionsForExam(exam, exams, subjects, allPromotions);
    }
    return [];
  }, [draggedSubject, draggedExamId, exams, subjects, allPromotions]);

  // Active promotion for the reserve tray
  const activePromoName = useMemo(() => {
    if (selectedPromoForSubjects) return selectedPromoForSubjects;
    if (selectedPromoFilter !== 'all') return selectedPromoFilter;
    if (currentMode === 'promotions' && sortedPromotionsList.length > 0) return sortedPromotionsList[0]?.nom || null;
    return allPromotions[0]?.nom || null;
  }, [selectedPromoForSubjects, selectedPromoFilter, currentMode, sortedPromotionsList, allPromotions]);

  const activePromoMeta = useMemo(() => {
    if (!activePromoName) return null;
    return promoMap.get(activePromoName) || allPromotions.find(p => p.nom.toLowerCase() === activePromoName.toLowerCase()) || null;
  }, [activePromoName, promoMap, allPromotions]);

  // Filtered lists for the table rows based on active mode and selected dropdown filters
  const filteredTeachers = useMemo(() => {
    let list = teachers.filter(t => {
      if (selectedTeacherFilter !== 'all' && t.id !== selectedTeacherFilter) return false;
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      const gradeStr = formatGrade(t.grade);
      return `${t.nom} ${t.prenom} ${t.departement || ''} ${gradeStr}`.toLowerCase().includes(term);
    });
    list.sort((a, b) => {
      const cmp = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [teachers, selectedTeacherFilter, searchTerm, sortDirection]);

  const filteredRooms = useMemo(() => {
    let list = rooms.filter(r => {
      if (selectedRoomFilter !== 'all' && r.id !== selectedRoomFilter) return false;
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      return `${r.nom} ${r.type || ''} ${r.batiment || ''}`.toLowerCase().includes(term);
    });
    list.sort((a, b) => {
      const cmp = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rooms, selectedRoomFilter, searchTerm, sortDirection]);

  const filteredPromotions = useMemo(() => {
    let list = allPromotions.filter(p => {
      if (selectedPromoFilter !== 'all' && p.nom !== selectedPromoFilter) return false;
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      return `${p.nom} ${p.code || ''}`.toLowerCase().includes(term);
    });
    list.sort((a, b) => {
      const cmp = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allPromotions, selectedPromoFilter, searchTerm, sortDirection]);

  const filteredSubjects = useMemo(() => {
    let list = subjects.filter(s => {
      if (selectedPromoFilter !== 'all' && s.promotion !== selectedPromoFilter) return false;
      if (selectedTeacherFilter !== 'all' && s.enseignantResponsableId !== selectedTeacherFilter && s.responsableId !== selectedTeacherFilter) return false;
      if (selectedSemestreFilter !== 'all' && formatSemester(s.semestre) !== selectedSemestreFilter) return false;
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      const sNom = s.nom || s.nomModule || '';
      const sCode = s.code || s.codeModule || '';
      const sPromo = s.promotion || '';
      return `${sNom} ${sCode} ${sPromo}`.toLowerCase().includes(term);
    });
    list.sort((a, b) => {
      const nomA = a.nom || a.nomModule || '';
      const nomB = b.nom || b.nomModule || '';
      const cmp = nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [subjects, selectedPromoFilter, selectedTeacherFilter, selectedSemestreFilter, searchTerm, sortDirection]);

  // Filter exams according to semester filter and search query
  const matchesExamFilter = (ex: Exam) => {
    if (selectedSemestreFilter !== 'all' && formatSemester(ex.semestre) !== selectedSemestreFilter) {
      return false;
    }
    if (selectedTeacherFilter !== 'all') {
      const isResp = ex.responsableId === selectedTeacherFilter;
      const isSurv = ex.salles && ex.salles.some(s => s.surveillants && s.surveillants.some(sv => sv.teacherId === selectedTeacherFilter));
      if (!isResp && !isSurv) return false;
    }
    if (selectedRoomFilter !== 'all') {
      const isInRoom = ex.salles && ex.salles.some(s => s.roomId === selectedRoomFilter);
      if (!isInRoom) return false;
    }
    if (selectedPromoFilter !== 'all') {
      if (ex.niveau && ex.niveau.toLowerCase() !== selectedPromoFilter.toLowerCase()) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchModule = (ex.nomModule || '').toLowerCase().includes(term) || (ex.codeModule || '').toLowerCase().includes(term);
      const matchPromo = (ex.niveau || '').toLowerCase().includes(term);
      if (!matchModule && !matchPromo) return false;
    }
    return true;
  };

  // Helper to find exams for a teacher slot
  const getExamsForTeacherSlot = (teacherId: string, date: string, slot: TimeSlot) => {
    const sStart = slot.debut || slot.heureDebut || '08:30';
    const sEnd = slot.fin || slot.heureFin || '10:30';
    return exams.filter(ex => {
      if (ex.date !== date) return false;
      if (!doTimesOverlap(ex.heureDebut, ex.heureFin, sStart, sEnd)) return false;
      if (!matchesExamFilter(ex)) return false;

      const isResp = ex.responsableId === teacherId;
      const isSurv = ex.salles && ex.salles.some(s => s.surveillants && s.surveillants.some(sv => sv.teacherId === teacherId));
      return isResp || isSurv;
    });
  };

  // Check if teacher is marked unavailable at this slot
  const isTeacherUnavailable = (teacherId: string, date: string, slot: TimeSlot) => {
    return timeOffConstraints.some(
      c => c.targetId === teacherId &&
        c.date === date &&
        (c.timeSlotId === slot.id || !c.timeSlotId) &&
        c.timeOffValue === 'UNAVAILABLE'
    );
  };

  // Helper to find exams for a room slot
  const getExamsForRoomSlot = (roomId: string, date: string, slot: TimeSlot) => {
    const sStart = slot.debut || slot.heureDebut || '08:30';
    const sEnd = slot.fin || slot.heureFin || '10:30';
    return exams.filter(ex => {
      if (ex.date !== date) return false;
      if (!doTimesOverlap(ex.heureDebut, ex.heureFin, sStart, sEnd)) return false;
      if (!matchesExamFilter(ex)) return false;
      return ex.salles && ex.salles.some(s => s.roomId === roomId);
    });
  };

  // Helper to find exams for a promo slot
  const getExamsForPromoSlot = (promoName: string, date: string, slot: TimeSlot) => {
    const sStart = slot.debut || slot.heureDebut || '08:30';
    const sEnd = slot.fin || slot.heureFin || '10:30';

    const matching = exams.filter(ex => {
      if (ex.date !== date) return false;
      if (!doTimesOverlap(ex.heureDebut, ex.heureFin, sStart, sEnd)) return false;
      if (!matchesExamFilter(ex)) return false;

      // 1. Match promotion: directly OR via sharedPromotions / multi-promo string
      const exPromo = (ex.niveau || ex.promotion || '').trim();
      const directMatch = isSamePromotion(exPromo, promoName, allPromotions);
      const sharedMatch = Boolean(
        ex.sharedPromotions && ex.sharedPromotions.some(sp => isSamePromotion(sp, promoName, allPromotions))
      );
      const commaMatch = exPromo.includes(',') && exPromo.split(',').some(p => isSamePromotion(p.trim(), promoName, allPromotions));

      if (!directMatch && !sharedMatch && !commaMatch) {
        return false;
      }

      // 2. Data link constraint: module MUST be planned (checked) for this promotion
      if (!isSubjectPlannedForPromotion(promoName, ex.codeModule, ex.nomModule, subjects)) {
        return false;
      }

      return true;
    });

    // 3. Subject uniqueness: each subject appears at most once for this promotion in this slot
    // If both an exam directly for this promo and a shared exam exist, prefer the direct one
    const seenSubjects = new Set<string>();
    const deduplicated: Exam[] = [];
    for (const ex of matching) {
      const codeKey = (ex.codeModule || '').toUpperCase().trim();
      const nomKey = (ex.nomModule || '').toLowerCase().trim();
      const grpKey = ex.commonGroupId ? `grp:${ex.commonGroupId}` : '';
      const key = grpKey || codeKey || nomKey || ex.id;
      if (!seenSubjects.has(key)) {
        seenSubjects.add(key);
        deduplicated.push(ex);
      } else {
        const exPromo = (ex.niveau || ex.promotion || '').trim();
        if (isSamePromotion(exPromo, promoName, allPromotions)) {
          const idx = deduplicated.findIndex(e => {
            const k = (e.commonGroupId ? `grp:${e.commonGroupId}` : '') || (e.codeModule || '').toUpperCase().trim() || (e.nomModule || '').toLowerCase().trim() || e.id;
            return k === key;
          });
          if (idx !== -1) {
            deduplicated[idx] = ex;
          }
        }
      }
    }
    return deduplicated;
  };

  // Helper to find exams for a module row
  const getExamsForModuleSlot = (moduleCode: string, moduleNom: string, date: string, slot: TimeSlot) => {
    const sStart = slot.debut || slot.heureDebut || '08:30';
    const sEnd = slot.fin || slot.heureFin || '10:30';
    const codeUp = (moduleCode || '').toUpperCase().trim();
    const nomLow = (moduleNom || '').toLowerCase().trim();

    const matching = exams.filter(ex => {
      if (ex.date !== date) return false;
      if (!doTimesOverlap(ex.heureDebut, ex.heureFin, sStart, sEnd)) return false;
      if (!matchesExamFilter(ex)) return false;

      const exCode = (ex.codeModule || '').toUpperCase().trim();
      const exNom = (ex.nomModule || '').toLowerCase().trim();
      const isMatch = (codeUp && exCode === codeUp) || (nomLow && exNom === nomLow);
      if (!isMatch) return false;

      // Data link constraint: module MUST be planned for this promotion
      const exPromo = ex.niveau || ex.promotion || '';
      if (exPromo && !isSubjectPlannedForPromotion(exPromo, ex.codeModule, ex.nomModule, subjects)) {
        return false;
      }

      return true;
    });

    // Deduplicate by promotion so each promotion appears at most once per slot
    const seenPromos = new Set<string>();
    const deduplicated: Exam[] = [];
    for (const ex of matching) {
      const p = (ex.niveau || ex.promotion || '').toLowerCase().trim();
      if (!p || !seenPromos.has(p)) {
        if (p) seenPromos.add(p);
        deduplicated.push(ex);
      }
    }
    return deduplicated;
  };

  // Color palette for subjects in reserve
  const SUBJECT_COLORS = useMemo(() => [
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#84cc16', // Lime
    '#a855f7', // Violet
    '#0ea5e9'  // Sky
  ], []);

  const getSubjectColor = (code: string, id: string, customColor?: string) => {
    if (customColor && customColor !== '#000000') return customColor;
    let hash = 0;
    const str = (code || id || 'MOD');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SUBJECT_COLORS.length;
    return SUBJECT_COLORS[index];
  };

  // Reserve items computation
  const promoSubjectsList = useMemo(() => {
    if (!activePromoName) return [];
    const pNorm = activePromoName.trim().toLowerCase();
    const promoObj = promoMap.get(activePromoName) || allPromotions.find(p => p.nom.trim().toLowerCase() === pNorm || p.code?.trim().toLowerCase() === pNorm);
    const promoCode = promoObj?.code?.trim().toLowerCase();
    const promoId = promoObj?.id;

    return subjects.filter(s => {
      const sPromo = (s.promotion || '').trim().toLowerCase();
      if (sPromo === pNorm) return true;
      if (promoCode && sPromo === promoCode) return true;
      if (promoId && s.promotionId === promoId) return true;
      if (s.sharedPromotions && s.sharedPromotions.some(p => {
        const pStr = p.trim().toLowerCase();
        return pStr === pNorm || (promoCode && pStr === promoCode);
      })) return true;
      if (promoId && s.sharedPromotionIds && s.sharedPromotionIds.includes(promoId)) return true;
      return false;
    });
  }, [activePromoName, subjects, promoMap, allPromotions]);

  const reserveItems = useMemo(() => {
    if (!activePromoName) {
      return exams
        .filter(e => {
          if (e.date && e.heureDebut) return false;
          if (subjects.length === 0) return true;
          const eCode = (e.codeModule || '').toUpperCase().trim();
          const eNom = (e.nomModule || '').toLowerCase().trim();
          return subjects.some(s => 
            (eCode && (s.code || s.codeModule || '').toUpperCase().trim() === eCode) ||
            (eNom && (s.nom || s.nomModule || '').toLowerCase().trim() === eNom)
          );
        })
        .map(e => ({
          id: e.id,
          code: e.codeModule,
          nom: e.nomModule,
          promo: e.niveau || 'Tronc Commun',
          teacherId: e.responsableId,
          teacherName: (() => {
            if (!e.responsableId) return '';
            const t = teacherMap.get(e.responsableId);
            if (!t) return '';
            const tTitle = t.titre?.trim() ? `${t.titre.trim()} ` : '';
            return `${tTitle}${t.nom} ${t.prenom || ''}`.trim();
          })(),
          semestre: e.semestre,
          effectif: e.nbEtudiants || 45,
          couleur: getSubjectColor(e.codeModule || '', e.id),
          isPlaced: false,
          exam: e
        }));
    }

    const pNorm = activePromoName.trim().toLowerCase();
    const promoObj = promoMap.get(activePromoName) || allPromotions.find(p => p.nom.trim().toLowerCase() === pNorm || p.code?.trim().toLowerCase() === pNorm);
    const promoCode = promoObj?.code?.trim().toLowerCase();

    // 1. Group matched subjects by common module (commonGroupId OR matching code / nom)
    // This strictly ensures that a shared module appears as UNE SEULE CARTE in the reserve
    const groupedSubjects: SubjectModule[][] = [];

    promoSubjectsList.forEach(sub => {
      const sCode = (sub.code || sub.codeModule || '').trim().toUpperCase();
      const sNom = (sub.nom || sub.nomModule || '').trim().toLowerCase();
      const sGrp = sub.commonGroupId;

      const existingGroup = groupedSubjects.find(grp => {
        return grp.some(member => {
          if (sGrp && member.commonGroupId && sGrp === member.commonGroupId) return true;
          const mCode = (member.code || member.codeModule || '').trim().toUpperCase();
          const mNom = (member.nom || member.nomModule || '').trim().toLowerCase();
          if (sCode && mCode && sCode === mCode) return true;
          if (sNom && mNom && sNom === mNom) return true;
          return false;
        });
      });

      if (existingGroup) {
        existingGroup.push(sub);
      } else {
        groupedSubjects.push([sub]);
      }
    });

    const fromSubjects = groupedSubjects.map(grp => {
      // Pick the primary representative subject (prefer the one directly matching activePromoName)
      const chosenSub = grp.find(s => isSamePromotion(s.promotion, activePromoName, allPromotions)) || grp[0];

      const subNom = (chosenSub.nom || chosenSub.nomModule || '').trim().toLowerCase();
      const subCode = (chosenSub.code || chosenSub.codeModule || '').trim().toUpperCase();
      const commonGroupId = chosenSub.commonGroupId || grp.find(s => s.commonGroupId)?.commonGroupId;

      // Collect all linked promotions for this common module
      const allLinkedPromos = getLinkedPromotionsForSubject(
        { ...chosenSub, commonGroupId },
        subjects,
        exams,
        allPromotions
      );
      // Ensure activePromoName is included in linked promos
      if (!allLinkedPromos.some(p => isSamePromotion(p, activePromoName, allPromotions))) {
        allLinkedPromos.unshift(activePromoName);
      }

      // Check if this module is already placed in the timetable
      // An exam is placed if it belongs to this group/module and has date + heureDebut
      const placedExam = exams.find(e => {
        if (!e.date || !e.heureDebut) return false;
        if (commonGroupId && e.commonGroupId && e.commonGroupId === commonGroupId) return true;
        const eCode = (e.codeModule || '').toUpperCase().trim();
        const eNom = (e.nomModule || '').toLowerCase().trim();
        const matchesSubject = (subCode && eCode === subCode) || (subNom && eNom === subNom);
        if (!matchesSubject) return false;
        const ePromo = (e.niveau || e.promotion || '').trim();
        return allLinkedPromos.some(lp => isSamePromotion(lp, ePromo, allPromotions)) ||
          (e.sharedPromotions && e.sharedPromotions.some(sp => allLinkedPromos.some(lp => isSamePromotion(lp, sp, allPromotions))));
      });

      const respTeacher = (chosenSub.enseignantResponsableId || chosenSub.responsableId) 
        ? teacherMap.get(chosenSub.enseignantResponsableId || chosenSub.responsableId || '') 
        : undefined;

      const roomNames = (placedExam?.salles || [])
        .map(s => {
          const rm = roomMap.get(s.roomId);
          return rm ? rm.nom : s.roomId;
        })
        .filter(Boolean)
        .join(', ');

      const placedTeacher = placedExam?.responsableId ? teacherMap.get(placedExam.responsableId) : respTeacher;

      return {
        id: chosenSub.id,
        code: chosenSub.code || chosenSub.codeModule || '',
        nom: chosenSub.nom || chosenSub.nomModule || '',
        promo: activePromoName,
        commonGroupId: commonGroupId || (allLinkedPromos.length > 1 ? `cgrp-sub-${chosenSub.id}` : undefined),
        sharedPromotions: allLinkedPromos,
        isShared: allLinkedPromos.length > 1,
        teacherId: placedExam?.responsableId || chosenSub.enseignantResponsableId || chosenSub.responsableId,
        teacherName: placedTeacher ? `${placedTeacher.titre?.trim() ? `${placedTeacher.titre.trim()} ` : ''}${placedTeacher.nom} ${placedTeacher.prenom || ''}`.trim() : undefined,
        semestre: chosenSub.semestre || 'S1',
        duree: chosenSub.dureeMinutes || 90,
        coeff: chosenSub.coefficient || 1,
        effectif: activePromoMeta?.effectif || 45,
        couleur: chosenSub.couleur || getSubjectColor(chosenSub.code || chosenSub.codeModule || '', chosenSub.id),
        isPlaced: !!placedExam,
        placedDate: placedExam?.date,
        placedTime: placedExam ? `${placedExam.heureDebut}-${placedExam.heureFin}` : undefined,
        salles: roomNames,
        exam: placedExam
      };
    });

    // 2. Also check if there are scheduled exams belonging to this promo that don't have a distinct subject record
    const coveredCodes = new Set(fromSubjects.map(i => (i.code || '').toUpperCase().trim()).filter(Boolean));
    const coveredNoms = new Set(fromSubjects.map(i => (i.nom || '').toLowerCase().trim()).filter(Boolean));
    const coveredGroups = new Set(fromSubjects.map(i => i.commonGroupId).filter(Boolean));

    // Group extra exams by module/group so each extra module appears at most ONCE
    const extraExamsList: Exam[] = [];
    exams.forEach(e => {
      const ePromo = (e.niveau || e.promotion || '').trim();
      const matchesPromo = isSamePromotion(ePromo, activePromoName, allPromotions) ||
        (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, activePromoName, allPromotions)));
      if (!matchesPromo) return;

      const eCode = (e.codeModule || '').toUpperCase().trim();
      const eNom = (e.nomModule || '').toLowerCase().trim();
      const eGrp = e.commonGroupId;

      if (eGrp && coveredGroups.has(eGrp)) return;
      if (eCode && coveredCodes.has(eCode)) return;
      if (eNom && coveredNoms.has(eNom)) return;

      // Deduplicate among extra exams
      const alreadyInExtra = extraExamsList.some(ex => {
        if (eGrp && ex.commonGroupId && eGrp === ex.commonGroupId) return true;
        const exCode = (ex.codeModule || '').toUpperCase().trim();
        const exNom = (ex.nomModule || '').toLowerCase().trim();
        if (eCode && exCode && eCode === exCode) return true;
        if (eNom && exNom && eNom === exNom) return true;
        return false;
      });

      if (!alreadyInExtra) {
        extraExamsList.push(e);
      }
    });

    const extraExams = extraExamsList.map(e => {
      const respTeacher = e.responsableId ? teacherMap.get(e.responsableId) : undefined;
      const roomNames = (e.salles || [])
        .map(s => {
          const rm = roomMap.get(s.roomId);
          return rm ? rm.nom : s.roomId;
        })
        .filter(Boolean)
        .join(', ');

      const linkedPromos = getLinkedPromotionsForExam(e, exams, subjects, allPromotions);
      if (!linkedPromos.some(p => isSamePromotion(p, activePromoName, allPromotions))) {
        linkedPromos.unshift(activePromoName);
      }

      return {
        id: e.id,
        code: e.codeModule || 'MOD',
        nom: e.nomModule || 'Module',
        promo: activePromoName,
        commonGroupId: e.commonGroupId,
        sharedPromotions: linkedPromos,
        isShared: linkedPromos.length > 1,
        teacherId: e.responsableId,
        teacherName: respTeacher ? `${respTeacher.titre?.trim() ? `${respTeacher.titre.trim()} ` : ''}${respTeacher.nom} ${respTeacher.prenom || ''}`.trim() : undefined,
        semestre: e.semestre || 'S1',
        duree: 90,
        coeff: 1,
        effectif: e.nbEtudiants || activePromoMeta?.effectif || 45,
        couleur: getSubjectColor(e.codeModule || '', e.id),
        isPlaced: !!(e.date && e.heureDebut),
        placedDate: e.date,
        placedTime: e.heureDebut ? `${e.heureDebut}-${e.heureFin}` : undefined,
        salles: roomNames,
        exam: e
      };
    });

    return [...fromSubjects, ...extraExams];
  }, [activePromoName, promoSubjectsList, exams, subjects, teacherMap, roomMap, activePromoMeta, SUBJECT_COLORS, promoMap, allPromotions]);

  // Convert hovered table exam card into active preview item structure
  const examPreviewItem = useMemo(() => {
    const targetExam = hoveredExamCard;
    if (!targetExam) return null;
    const ex = targetExam;
    const respTeacher = ex.responsableId ? teacherMap.get(ex.responsableId) : undefined;
    const promoObj = promoMap.get(ex.niveau || ex.promotion || '') ||
      allPromotions.find(p => 
        p.nom.toLowerCase().trim() === (ex.niveau || ex.promotion || '').toLowerCase().trim() ||
        p.code.toLowerCase().trim() === (ex.niveau || ex.promotion || '').toLowerCase().trim()
      );
    const matchedSubject = subjects.find(s => 
      (s.code && s.code.toUpperCase().trim() === (ex.codeModule || '').toUpperCase().trim()) || 
      (s.nom && s.nom.toLowerCase().trim() === (ex.nomModule || '').toLowerCase().trim())
    );

    let calcDuree = matchedSubject?.dureeMinutes || 90;
    if (ex.heureDebut && ex.heureFin) {
      const [sh, sm] = ex.heureDebut.split(':').map(Number);
      const [eh, em] = ex.heureFin.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) calcDuree = diff;
      }
    }

    const roomNames = (ex.salles || [])
      .map(s => {
        const rm = roomMap.get(s.roomId);
        return rm ? rm.nom : s.roomId;
      })
      .filter(Boolean)
      .join(', ');

    return {
      id: ex.id,
      code: ex.codeModule || matchedSubject?.code || 'CODE',
      nom: ex.nomModule || matchedSubject?.nom || 'Matière',
      promo: promoObj?.nom || ex.niveau || ex.promotion || 'Non spécifiée',
      teacherId: ex.responsableId,
      teacherName: respTeacher 
        ? `${respTeacher.titre?.trim() ? `${respTeacher.titre.trim()} ` : ''}${respTeacher.nom} ${respTeacher.prenom}`.trim()
        : (matchedSubject?.responsableId ? `${teacherMap.get(matchedSubject.responsableId)?.titre?.trim() ? `${teacherMap.get(matchedSubject.responsableId)?.titre?.trim()} ` : ''}${teacherMap.get(matchedSubject.responsableId)?.nom || ''} ${teacherMap.get(matchedSubject.responsableId)?.prenom || ''}`.trim() : 'Non assigné'),
      semestre: ex.semestre || matchedSubject?.semestre || 'S1',
      duree: calcDuree,
      coeff: matchedSubject?.coefficient || 1,
      effectif: ex.nbEtudiants || promoObj?.effectif || 45,
      couleur: promoObj?.couleur || matchedSubject?.couleur || getSubjectColor(ex.codeModule || '', ex.id),
      isPlaced: true,
      placedDate: ex.date,
      placedTime: ex.heureDebut ? `${ex.heureDebut}-${ex.heureFin}` : undefined,
      salles: roomNames,
      exam: ex
    };
  }, [hoveredExamCard, teacherMap, promoMap, allPromotions, subjects, roomMap, SUBJECT_COLORS]);

  // Active item to display in the bottom left preview panel:
  // ONLY populated when the cursor hovers over a card (in the timetable grid or reserve tray).
  // When cursor does not hover over any card, it remains completely empty (aucune information).
  const activePreviewItem = useMemo(() => {
    if (hoveredReserveItem) return hoveredReserveItem;
    if (hoveredExamCard) return examPreviewItem;
    return null;
  }, [hoveredReserveItem, hoveredExamCard, examPreviewItem]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, examId: string, sourceRowId?: string) => {
    // Check if source row is blocked
    if (sourceRowId && blockedRows.has(sourceRowId)) {
      e.preventDefault();
      setDropAlert({
        type: 'warning',
        message: 'Cette ligne est verrouillée. Impossible de déplacer cette épreuve.'
      });
      return;
    }
    setDraggedExamId(examId);
    setDraggedSubject(null);
    e.dataTransfer.setData('text/plain', examId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartItem = (e: React.DragEvent, item: any) => {
    if (item.exam && item.exam.id) {
      setDraggedExamId(item.exam.id);
      setDraggedSubject(null);
      e.dataTransfer.setData('text/plain', item.exam.id);
    } else {
      setDraggedExamId(null);
      setDraggedSubject({
        id: item.id,
        code: item.code,
        nom: item.nom,
        promo: item.promo,
        teacherId: item.teacherId,
        semestre: item.semestre,
        duree: item.duree,
        coeff: item.coeff,
        effectif: item.effectif
      });
      e.dataTransfer.setData('text/plain', `sub:${item.id}`);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOverPromoSlot = (e: React.DragEvent, targetPromoName: string) => {
    if (blockedRows.has(targetPromoName)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    if (activeDraggingConcernedPromos.length > 0) {
      const isConcerned = activeDraggingConcernedPromos.some(p => p.toLowerCase().trim() === targetPromoName.toLowerCase().trim());
      if (!isConcerned) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = (targetDate: string, targetSlot: TimeSlot, targetEntityId?: string) => {
    // If target line is blocked, reject drop
    if (targetEntityId && blockedRows.has(targetEntityId)) {
      setDropAlert({
        type: 'warning',
        message: 'Cette ligne est verrouillée. Impossible d\'y déposer ou déplacer une épreuve.'
      });
      setDraggedSubject(null);
      setDraggedExamId(null);
      return;
    }

    const sStart = targetSlot.debut || targetSlot.heureDebut || '08:30';
    const sEnd = targetSlot.fin || targetSlot.heureFin || '10:30';

    if (draggedSubject) {
      const sub = draggedSubject;

      // Reject if target row promotion is not planned for this subject
      if ((currentMode === 'promotions' || currentMode === 'global') && targetEntityId) {
        if (!isSubjectPlannedForPromotion(targetEntityId, sub.code, sub.nom, subjects)) {
          setDropAlert({
            type: 'warning',
            message: `Le module ${sub.code || sub.nom} n'est pas planifié (coché) pour la promotion "${targetEntityId}" dans Données de base > Matières & Modules.`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
      }

      const duration = sub.duree || 90;
      const [h, m] = sStart.split(':').map(Number);
      const totalMinutes = (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 30 : m) + duration;
      const computedEndH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const computedEndM = String(totalMinutes % 60).padStart(2, '0');
      const actualEnd = (currentMode === 'promotions' || currentMode === 'global') ? `${computedEndH}:${computedEndM}` : sEnd;

      const subCode = (sub.code || '').toUpperCase().trim();
      const subNom = (sub.nom || '').toLowerCase().trim();

      // Find ONLY the promotions linked to THIS specific subject entry
      const targetPromosList = getLinkedPromotionsForSubject(sub, subjects, exams, allPromotions);
      if ((currentMode === 'promotions' || currentMode === 'global') && targetEntityId) {
        if (!targetPromosList.some(p => isSamePromotion(p, targetEntityId, allPromotions))) {
          targetPromosList.push(getCanonicalPromotionName(targetEntityId, allPromotions));
        }
      }

      let respTeacherId = sub.teacherId || '';
      if (currentMode === 'teachers' && targetEntityId) {
        respTeacherId = targetEntityId;
      }

      let roomAssigns = rooms.length > 0 ? [{ roomId: rooms[0].id, surveillants: [] }] : [];
      if (currentMode === 'rooms' && targetEntityId) {
        roomAssigns = [{ roomId: targetEntityId, surveillants: [] }];
      }

      const fullSub = subjects.find(s => s.id === sub.id) || subjects.find(s => {
        const sc = (s.code || s.codeModule || '').toUpperCase().trim();
        const sn = (s.nom || s.nomModule || '').toLowerCase().trim();
        const sp = (s.promotion || '').trim();
        return ((subCode && sc === subCode) || (subNom && sn === subNom)) && isSamePromotion(sp, sub.promo, allPromotions);
      });

      const commonGroupId = (sub as any).commonGroupId || fullSub?.commonGroupId || (targetPromosList.length > 1 ? `cgrp-${Date.now()}` : undefined);

      // Existing exams strictly matching this linked group
      const isRelatedExam = (e: Exam) => {
        if (commonGroupId && e.commonGroupId && e.commonGroupId === commonGroupId) {
          return true;
        }
        if (fullSub?.commonGroupId && e.commonGroupId && e.commonGroupId === fullSub.commonGroupId) {
          return true;
        }
        const ec = (e.codeModule || '').toUpperCase().trim();
        const en = (e.nomModule || '').toLowerCase().trim();
        const matchesModule = (subCode && ec === subCode) || (subNom && en === subNom);
        if (!matchesModule) return false;

        const ep = (e.niveau || e.promotion || '').trim();
        if (targetPromosList.some(tp => isSamePromotion(tp, ep, allPromotions))) {
          return true;
        }
        if (e.sharedPromotions && e.sharedPromotions.some(sp => targetPromosList.some(tp => isSamePromotion(tp, sp, allPromotions)))) {
          return true;
        }
        return false;
      };

      const existingGroupExams = exams.filter(isRelatedExam);
      const otherExams = exams.filter(e => !isRelatedExam(e));

      // Collision Prevention: forbid placing a card where another card already exists in this slot
      if (currentMode === 'promotions' || currentMode === 'global') {
        const occupiedPromo = targetPromosList.find(pName => {
          return otherExams.some(e => {
            if (e.date !== targetDate) return false;
            if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
            const ePromo = (e.niveau || e.promotion || '').trim();
            return isSamePromotion(ePromo, pName, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, pName, allPromotions)));
          });
        });

        if (occupiedPromo) {
          const conflictingExam = otherExams.find(e => {
            if (e.date !== targetDate) return false;
            if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
            const ePromo = (e.niveau || e.promotion || '').trim();
            return isSamePromotion(ePromo, occupiedPromo, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, occupiedPromo, allPromotions)));
          });
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ce créneau est déjà occupé par l'épreuve "${conflictingExam?.nomModule || conflictingExam?.codeModule || 'Examen'}" pour la promotion "${occupiedPromo}".`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
      } else if (currentMode === 'teachers' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const isResp = e.responsableId === targetEntityId;
          const isSurv = (e.salles || []).some(s => (s.surveillants || []).some(sv => sv.teacherId === targetEntityId));
          return isResp || isSurv;
        });

        if (conflictingExam) {
          const teacherObj = teacherMap.get(targetEntityId);
          const tName = teacherObj ? `${teacherObj.nom} ${teacherObj.prenom || ''}`.trim() : 'Cet enseignant';
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ${tName} est déjà affecté(e) à l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" sur ce créneau.`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
      } else if (currentMode === 'rooms' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          return (e.salles || []).some(s => s.roomId === targetEntityId);
        });

        if (conflictingExam) {
          const roomObj = roomMap.get(targetEntityId);
          const rName = roomObj ? roomObj.nom : 'Cette salle';
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : la salle "${rName}" est déjà occupée par l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" sur ce créneau.`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
      } else if (currentMode === 'modules' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          return (e.subjectId === targetEntityId) ||
            ((e.codeModule || '').toUpperCase().trim() === subCode) ||
            ((e.nomModule || '').toLowerCase().trim() === subNom);
        });

        if (conflictingExam) {
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ce module a déjà l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" programmée sur ce créneau.`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
      }

      // In all modes: ensure the subject's promotions don't collide with existing exams for those promotions
      const anyPromoConflict = targetPromosList.find(pName => {
        return otherExams.some(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const ePromo = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ePromo, pName, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, pName, allPromotions)));
        });
      });

      if (anyPromoConflict) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const ePromo = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ePromo, anyPromoConflict, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, anyPromoConflict, allPromotions)));
        });
        setDropAlert({
          type: 'warning',
          message: `Impossible de poser la carte : la promotion "${anyPromoConflict}" a déjà l'épreuve "${conflictingExam?.nomModule || conflictingExam?.codeModule || 'Examen'}" sur ce créneau.`
        });
        setDraggedSubject(null);
        setDraggedExamId(null);
        return;
      }

      const newOrUpdatedExams: Exam[] = [];

      targetPromosList.forEach((promoName, pIdx) => {
        const existingExamForPromo = existingGroupExams.find(e => {
          const ep = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ep, promoName, allPromotions);
        });
        const promoObj = promoMap.get(promoName) || allPromotions.find(p => isSamePromotion(p.nom, promoName, allPromotions));

        if (existingExamForPromo) {
          newOrUpdatedExams.push({
            ...existingExamForPromo,
            date: targetDate,
            heureDebut: sStart,
            heureFin: actualEnd,
            commonGroupId: existingExamForPromo.commonGroupId || commonGroupId,
            sharedPromotions: targetPromosList,
            responsableId: respTeacherId || existingExamForPromo.responsableId,
            salles: roomAssigns.length > 0 ? roomAssigns : existingExamForPromo.salles
          });
        } else {
          newOrUpdatedExams.push({
            id: `ex-${Date.now()}-${pIdx}-${Math.random().toString(36).substr(2, 4)}`,
            codeModule: sub.code,
            nomModule: sub.nom,
            niveau: promoName,
            promotion: promoName,
            commonGroupId,
            sharedPromotions: targetPromosList,
            responsableId: respTeacherId,
            date: targetDate,
            heureDebut: sStart,
            heureFin: actualEnd,
            semestre: (sub.semestre as any) || 'Semestre impair',
            session: 'Ordinaire',
            nbEtudiants: promoObj?.effectif || sub.effectif || 45,
            salles: roomAssigns
          });
        }
      });

      onUpdateExams([...otherExams, ...newOrUpdatedExams]);

      if (targetPromosList.length > 1) {
        setDropAlert({
          type: 'info',
          message: `Programmation groupée automatique : Le module commun "${sub.nom || sub.code}" est synchronisé sur le créneau du ${targetDate} (${sStart} - ${actualEnd}) pour les ${targetPromosList.length} promotions (${targetPromosList.join(', ')}).`
        });
      }

      setDraggedSubject(null);
      setDraggedExamId(null);
      return;
    }

    if (draggedExamId) {
      const exam = exams.find(e => e.id === draggedExamId);
      if (!exam) return;

      const examCode = (exam.codeModule || '').toUpperCase().trim();
      const examNom = (exam.nomModule || '').toLowerCase().trim();

      // Find ALL promotions linked to THIS specific exam entry
      const targetPromosList = getLinkedPromotionsForExam(exam, exams, subjects, allPromotions);
      const isTargetInLinked = targetEntityId && targetPromosList.some(tp => isSamePromotion(tp, targetEntityId, allPromotions));

      // Reject if target row promotion is not planned for this exam's module
      if ((currentMode === 'promotions' || currentMode === 'global') && targetEntityId && !isTargetInLinked) {
        if (!isSubjectPlannedForPromotion(targetEntityId, exam.codeModule, exam.nomModule, subjects)) {
          setDropAlert({
            type: 'warning',
            message: `Le module ${exam.codeModule || exam.nomModule} n'est pas planifié (coché) pour la promotion "${targetEntityId}" dans Données de base > Matières & Modules.`
          });
          setDraggedSubject(null);
          setDraggedExamId(null);
          return;
        }
        targetPromosList.push(getCanonicalPromotionName(targetEntityId, allPromotions));
      }

      // Calculate exact end time respecting subject duration
      let examDuration = 90;
      const subForDuration = subjects.find(s => 
        (exam.codeModule && (s.code || s.codeModule || '').toUpperCase().trim() === exam.codeModule.toUpperCase().trim()) ||
        (exam.nomModule && (s.nom || s.nomModule || '').trim().toLowerCase() === exam.nomModule.trim().toLowerCase())
      );
      if (subForDuration?.dureeMinutes) {
        examDuration = subForDuration.dureeMinutes;
      } else if (exam.heureDebut && exam.heureFin) {
        const [eh1, em1] = exam.heureDebut.split(':').map(Number);
        const [eh2, em2] = exam.heureFin.split(':').map(Number);
        const diff = (eh2 * 60 + em2) - (eh1 * 60 + em1);
        if (diff > 0) examDuration = diff;
      }
      const [h, m] = sStart.split(':').map(Number);
      const totalMinutes = (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 30 : m) + examDuration;
      const computedEndH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const computedEndM = String(totalMinutes % 60).padStart(2, '0');
      const actualEnd = (currentMode === 'promotions' || currentMode === 'global') ? `${computedEndH}:${computedEndM}` : sEnd;

      let respTeacherId = exam.responsableId;
      if (currentMode === 'teachers' && targetEntityId) {
        respTeacherId = targetEntityId;
      }

      let roomAssigns = exam.salles;
      if (currentMode === 'rooms' && targetEntityId) {
        roomAssigns = [{ roomId: targetEntityId, surveillants: [] }];
      }

      const commonGroupId = exam.commonGroupId || (targetPromosList.length > 1 ? `cgrp-${Date.now()}` : undefined);

      const isRelatedExam = (e: Exam) => {
        if (e.id === exam.id) return true;
        if (commonGroupId && e.commonGroupId && e.commonGroupId === commonGroupId) {
          return true;
        }
        if (exam.commonGroupId && e.commonGroupId && e.commonGroupId === exam.commonGroupId) {
          return true;
        }
        const ec = (e.codeModule || '').toUpperCase().trim();
        const en = (e.nomModule || '').toLowerCase().trim();
        const matchesModule = (examCode && ec === examCode) || (examNom && en === examNom);
        if (!matchesModule) return false;

        const ep = (e.niveau || e.promotion || '').trim();
        if (targetPromosList.some(tp => isSamePromotion(tp, ep, allPromotions))) {
          return true;
        }
        if (e.sharedPromotions && e.sharedPromotions.some(sp => targetPromosList.some(tp => isSamePromotion(tp, sp, allPromotions)))) {
          return true;
        }
        return false;
      };

      const otherExams = exams.filter(e => !isRelatedExam(e));
      const relatedExams = exams.filter(isRelatedExam);

      // Collision Prevention: forbid placing this exam where another card already exists in this slot
      if (currentMode === 'promotions' || currentMode === 'global') {
        const occupiedPromo = targetPromosList.find(pName => {
          return otherExams.some(e => {
            if (e.date !== targetDate) return false;
            if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
            const ePromo = (e.niveau || e.promotion || '').trim();
            return isSamePromotion(ePromo, pName, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, pName, allPromotions)));
          });
        });

        if (occupiedPromo) {
          const conflictingExam = otherExams.find(e => {
            if (e.date !== targetDate) return false;
            if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
            const ePromo = (e.niveau || e.promotion || '').trim();
            return isSamePromotion(ePromo, occupiedPromo, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, occupiedPromo, allPromotions)));
          });
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ce créneau est déjà occupé par l'épreuve "${conflictingExam?.nomModule || conflictingExam?.codeModule || 'Examen'}" pour la promotion "${occupiedPromo}".`
          });
          setDraggedExamId(null);
          setDraggedSubject(null);
          return;
        }
      } else if (currentMode === 'teachers' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const isResp = e.responsableId === targetEntityId;
          const isSurv = (e.salles || []).some(s => (s.surveillants || []).some(sv => sv.teacherId === targetEntityId));
          return isResp || isSurv;
        });

        if (conflictingExam) {
          const teacherObj = teacherMap.get(targetEntityId);
          const tName = teacherObj ? `${teacherObj.nom} ${teacherObj.prenom || ''}`.trim() : 'Cet enseignant';
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ${tName} est déjà affecté(e) à l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" sur ce créneau.`
          });
          setDraggedExamId(null);
          setDraggedSubject(null);
          return;
        }
      } else if (currentMode === 'rooms' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          return (e.salles || []).some(s => s.roomId === targetEntityId);
        });

        if (conflictingExam) {
          const roomObj = roomMap.get(targetEntityId);
          const rName = roomObj ? roomObj.nom : 'Cette salle';
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : la salle "${rName}" est déjà occupée par l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" sur ce créneau.`
          });
          setDraggedExamId(null);
          setDraggedSubject(null);
          return;
        }
      } else if (currentMode === 'modules' && targetEntityId) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          return (e.subjectId === targetEntityId) ||
            ((e.codeModule || '').toUpperCase().trim() === examCode) ||
            ((e.nomModule || '').toLowerCase().trim() === examNom);
        });

        if (conflictingExam) {
          setDropAlert({
            type: 'warning',
            message: `Impossible de poser la carte : ce module a déjà l'épreuve "${conflictingExam.nomModule || conflictingExam.codeModule}" programmée sur ce créneau.`
          });
          setDraggedExamId(null);
          setDraggedSubject(null);
          return;
        }
      }

      // In all modes: ensure the exam's promotions don't collide with other existing exams for those promotions
      const anyPromoConflict = targetPromosList.find(pName => {
        return otherExams.some(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const ePromo = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ePromo, pName, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, pName, allPromotions)));
        });
      });

      if (anyPromoConflict) {
        const conflictingExam = otherExams.find(e => {
          if (e.date !== targetDate) return false;
          if (!doTimesOverlap(e.heureDebut, e.heureFin, sStart, actualEnd)) return false;
          const ePromo = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ePromo, anyPromoConflict, allPromotions) || (e.sharedPromotions && e.sharedPromotions.some(p => isSamePromotion(p, anyPromoConflict, allPromotions)));
        });
        setDropAlert({
          type: 'warning',
          message: `Impossible de poser la carte : la promotion "${anyPromoConflict}" a déjà l'épreuve "${conflictingExam?.nomModule || conflictingExam?.codeModule || 'Examen'}" sur ce créneau.`
        });
        setDraggedExamId(null);
        setDraggedSubject(null);
        return;
      }

      const updatedRelatedExams: Exam[] = [];

      // Automatically schedule ALL linked promotions on the exact same time slot
      targetPromosList.forEach((promoName, pIdx) => {
        const existingExam = relatedExams.find(e => {
          const ep = (e.niveau || e.promotion || '').trim();
          return isSamePromotion(ep, promoName, allPromotions);
        });
        const promoObj = promoMap.get(promoName) || allPromotions.find(p => isSamePromotion(p.nom, promoName, allPromotions));

        if (existingExam) {
          updatedRelatedExams.push({
            ...existingExam,
            date: targetDate,
            heureDebut: sStart,
            heureFin: actualEnd,
            commonGroupId: existingExam.commonGroupId || commonGroupId,
            sharedPromotions: targetPromosList,
            responsableId: respTeacherId || existingExam.responsableId,
            salles: roomAssigns && roomAssigns.length > 0 ? roomAssigns : existingExam.salles
          });
        } else {
          updatedRelatedExams.push({
            id: `ex-rel-${Date.now()}-${pIdx}-${Math.random().toString(36).substr(2, 4)}`,
            codeModule: exam.codeModule,
            nomModule: exam.nomModule,
            niveau: promoName,
            promotion: promoName,
            commonGroupId,
            sharedPromotions: targetPromosList,
            responsableId: respTeacherId,
            date: targetDate,
            heureDebut: sStart,
            heureFin: actualEnd,
            semestre: exam.semestre,
            session: exam.session,
            nbEtudiants: promoObj?.effectif || exam.nbEtudiants || 45,
            salles: roomAssigns || []
          });
        }
      });

      onUpdateExams([...otherExams, ...updatedRelatedExams]);

      if (targetPromosList.length > 1) {
        setDropAlert({
          type: 'info',
          message: `Programmation groupée automatique : Le module commun "${exam.nomModule}" est synchronisé sur le créneau ${targetDate} (${sStart} - ${actualEnd}) pour les ${targetPromosList.length} promotions (${targetPromosList.join(', ')}).`
        });
      }

      setDraggedExamId(null);
      setDraggedSubject(null);
      return;
    }
  };

  const handleDropOnReserve = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverReserve(false);
    if (draggedExamId) {
      handleUnassignExam(draggedExamId);
      setDraggedExamId(null);
    }
    setDraggedSubject(null);
  };

  const handleUnassignExam = (examId: string) => {
    const targetExam = exams.find(e => e.id === examId);
    if (!targetExam) return;

    // Check if the exam's row is blocked
    const rowId = (currentMode === 'promotions' || currentMode === 'global')
      ? (targetExam.niveau || targetExam.promotion || '')
      : currentMode === 'teachers'
      ? (targetExam.responsableId || '')
      : currentMode === 'rooms'
      ? (targetExam.salles?.[0]?.roomId || '')
      : (targetExam.codeModule || '');

    if (rowId && blockedRows.has(rowId)) {
      setDropAlert({
        type: 'warning',
        message: 'Cette ligne est verrouillée. Impossible de retirer cette épreuve.'
      });
      return;
    }

    const examCode = (targetExam.codeModule || '').toUpperCase().trim();
    const examNom = (targetExam.nomModule || '').toLowerCase().trim();

    // Find ONLY promotions strictly linked to this exam entry
    const targetPromosList = getLinkedPromotionsForExam(targetExam, exams, subjects, allPromotions);

    const isRelated = (e: Exam) => {
      if (e.id === targetExam.id) return true;
      if (targetExam.commonGroupId && e.commonGroupId && targetExam.commonGroupId === e.commonGroupId) {
        return true;
      }
      const ec = (e.codeModule || '').toUpperCase().trim();
      const en = (e.nomModule || '').toLowerCase().trim();
      const matchesModule = (examCode && ec === examCode) || (examNom && en === examNom);
      if (!matchesModule) return false;

      const ep = (e.niveau || e.promotion || '').trim();
      if (targetPromosList.some(tp => isSamePromotion(tp, ep, allPromotions))) {
        return true;
      }
      if (e.sharedPromotions && e.sharedPromotions.some(sp => targetPromosList.some(tp => isSamePromotion(tp, sp, allPromotions)))) {
        return true;
      }
      return false;
    };

    const updated = exams.map(e => {
      if (isRelated(e)) {
        return { ...e, date: '', heureDebut: '', heureFin: '' };
      }
      return e;
    });
    onUpdateExams(updated);
  };

  const getPromoColor = (promoName?: string) => {
    const promo = promoName ? promoMap.get(promoName) : undefined;
    return promo?.couleur || '#8b5cf6';
  };

  const hasActiveFilters = selectedTeacherFilter !== 'all' || selectedRoomFilter !== 'all' || selectedPromoFilter !== 'all' || selectedSemestreFilter !== 'all' || searchTerm !== '';

  const clearAllFilters = () => {
    setSelectedTeacherFilter('all');
    setSelectedRoomFilter('all');
    setSelectedPromoFilter('all');
    setSelectedSemestreFilter('all');
    setSearchTerm('');
  };

  // Quick statistics
  const scheduledExamsCount = exams.filter(e => e.date && e.heureDebut).length;
  const unplacedExamsCount = exams.filter(e => !e.date || !e.heureDebut).length;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Top Filter and View Switcher Bar with Light Background */}
      <div className="p-3 bg-slate-100 border-b border-slate-300 text-slate-900 flex flex-col gap-2.5 shadow-sm">
        {/* Row 1: View Modes Switcher & Quick Action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* View Buttons */}
          <div className="flex items-center bg-white/90 p-1 rounded-lg border border-slate-300 gap-1 shadow-2xs">
            <button
              onClick={() => setCurrentMode('global')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                currentMode === 'global'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.viewGlobal}</span>
            </button>

            <button
              onClick={() => setCurrentMode('teachers')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                currentMode === 'teachers'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.viewByTeacher}</span>
            </button>

            <button
              onClick={() => setCurrentMode('rooms')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                currentMode === 'rooms'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>{t.viewByRoom}</span>
            </button>

            <button
              onClick={() => setCurrentMode('modules')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                currentMode === 'modules'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.viewByModule}</span>
            </button>
          </div>

          {/* Quick Metrics & New Exam */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <strong className="font-bold text-slate-900">{scheduledExamsCount}</strong> épreuves placées
            </span>

            <button
              onClick={onAddExam}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Épreuve</span>
            </button>
          </div>
        </div>

        {/* Row 2: Interactive Filter Controls with Light Background */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1 text-xs text-slate-700 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Filtres :</span>
          </div>

          {/* Filter: Enseignant */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none transition shadow-2xs font-medium ${
              selectedTeacherFilter !== 'all'
                ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
            title="Filtrer par enseignant / surveillant"
          >
            <option value="all">Tous les enseignants ({teachers.length})</option>
            {sortedTeachersList.map(t => (
              <option key={t.id} value={t.id}>
                {t.nom} {t.prenom}
              </option>
            ))}
          </select>

          {/* Filter: Salle */}
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none transition shadow-2xs font-medium ${
              selectedRoomFilter !== 'all'
                ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
            title="Filtrer par salle d'examen"
          >
            <option value="all">Toutes les salles ({rooms.length})</option>
            {sortedRoomsList.map(r => (
              <option key={r.id} value={r.id}>
                {r.nom} ({r.capacite || 40} pl. - {r.type})
              </option>
            ))}
          </select>

          {/* Filter: Promotion */}
          <select
            value={selectedPromoFilter}
            onChange={(e) => setSelectedPromoFilter(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none transition shadow-2xs font-medium ${
              selectedPromoFilter !== 'all'
                ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold'
                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
            title="Filtrer par promotion / filière"
          >
            <option value="all">Toutes les promotions ({allPromotions.length})</option>
            {sortedPromotionsList.map(p => (
              <option key={p.id || p.nom} value={p.nom}>
                {p.nom}
              </option>
            ))}
          </select>

          {/* Filter: Semestre */}
          <select
            value={selectedSemestreFilter}
            onChange={(e) => setSelectedSemestreFilter(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none transition shadow-2xs font-medium ${
              selectedSemestreFilter !== 'all'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
            title="Filtrer par semestre"
          >
            <option value="all">Tous les semestres</option>
            {SEMESTER_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher module, prof..."
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 transition shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Direction Toggle */}
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-700 shadow-2xs transition"
            title={`Tri : ${sortDirection === 'asc' ? 'A à Z (croissant)' : 'Z à A (décroissant)'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Compact View Toggle */}
          <button
            onClick={() => setIsCompact(prev => !prev)}
            className={`p-1.5 rounded-lg border transition shadow-2xs ${
              isCompact 
                ? 'bg-teal-50 border-teal-400 text-teal-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
            title={isCompact ? 'Vue aérée' : 'Vue compacte'}
          >
            {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Attribuer une salle */}
          {onOpenRoomAssignment && (
            <button
              onClick={() => onOpenRoomAssignment()}
              className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs flex items-center gap-1.5 shrink-0"
              title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
            >
              <DoorClosed className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Attribuer salle</span>
            </button>
          )}

          {/* Visualiser / Imprimer l'Emploi du Temps Officiel */}
          <button
            onClick={() => {
              if (currentMode === 'global') {
                setPreviewPlanningModal({
                  isOpen: true,
                  rowId: 'global',
                  rowLabel: 'Session Complète (Toutes Promotions)',
                  rowType: 'global'
                });
              } else if (currentMode === 'promotions') {
                const activePromoName = selectedPromoForSubjects || (filteredPromotions[0]?.nom) || (allPromotions[0]?.nom) || '1ère Année ST (1ST)';
                setPreviewPlanningModal({
                  isOpen: true,
                  rowId: activePromoName,
                  rowLabel: activePromoName,
                  rowType: 'promotion'
                });
              } else if (currentMode === 'teachers') {
                const teacher = teachers[0];
                setPreviewPlanningModal({
                  isOpen: true,
                  rowId: teacher?.id || '',
                  rowLabel: teacher ? `${teacher.nom} ${teacher.prenom || ''}`.trim() : 'Enseignants',
                  rowType: 'teacher'
                });
              } else if (currentMode === 'rooms') {
                const room = rooms[0];
                setPreviewPlanningModal({
                  isOpen: true,
                  rowId: room?.id || '',
                  rowLabel: room?.nom || 'Salles',
                  rowType: 'room'
                });
              } else {
                const exam = exams[0];
                setPreviewPlanningModal({
                  isOpen: true,
                  rowId: exam?.nomModule || exam?.codeModule || '',
                  rowLabel: exam?.nomModule || exam?.codeModule || 'Matières',
                  rowType: 'module'
                });
              }
            }}
            className="px-2.5 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition shadow-2xs flex items-center gap-1.5 shrink-0"
            title="Visualiser et imprimer l'emploi du temps officiel au format réglementaire (A4 Paysage)"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">
              {currentMode === 'global' ? 'Planning Session Complète' : currentMode === 'promotions' ? 'Planning Promotions' : 'Planning Officiel'}
            </span>
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition shadow-2xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Alert / Notification Banner */}
      {dropAlert && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between border-b transition-all ${
          dropAlert.type === 'error'
            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
            : dropAlert.type === 'warning'
            ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
            : 'bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{dropAlert.message}</span>
          </div>
          <button onClick={() => setDropAlert(null)} className="hover:opacity-75 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid View Container */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <table className="w-full min-w-full border-collapse text-left table-fixed">
          <colgroup>
            <col className="w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px]" style={{ width: '135px' }} />
            {effectiveDates.map((date) =>
              timeSlots.map((slot) => (
                <col key={`${date}-${slot.id}`} className="min-w-[42px]" />
              ))
            )}
          </colgroup>
          {/* Table Header: Dates and TimeSlots */}
          <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 shadow-xs dark:shadow-md">
            {/* Row 1: Session Dates */}
            <tr>
              <th 
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                    rowId: currentMode === 'global' ? 'global' : (filteredPromotions[0]?.nom || 'Promotions'),
                    rowLabel: currentMode === 'global' ? 'Session Complète (Toutes Promotions)' : 'Promotions Étudiantes',
                    rowType: currentMode === 'global' ? 'global' : 'promotion'
                  });
                }}
                className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 p-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border-r-2 border-b border-slate-300 dark:border-slate-700 w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] select-none"
              >
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 truncate font-extrabold">
                    {currentMode === 'teachers' && 'Enseignants'}
                    {currentMode === 'rooms' && 'Salles'}
                    {currentMode === 'promotions' && 'Promotions'}
                    {currentMode === 'modules' && 'Matières'}
                    {currentMode === 'global' && 'Promotions'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentMode === 'global') {
                          setPreviewPlanningModal({
                            isOpen: true,
                            rowId: 'global',
                            rowLabel: 'Session Complète (Toutes Promotions)',
                            rowType: 'global'
                          });
                        } else {
                          const promoName = selectedPromoForSubjects || filteredPromotions[0]?.nom || allPromotions[0]?.nom || '1ère Année ST (1ST)';
                          setPreviewPlanningModal({
                            isOpen: true,
                            rowId: promoName,
                            rowLabel: promoName,
                            rowType: 'promotion'
                          });
                        }
                      }}
                      className="p-1 rounded text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                      title={currentMode === 'global' ? "Visualiser et imprimer le planning général de la session" : "Visualiser et imprimer le planning des promotions"}
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono shrink-0 font-bold">
                      {effectiveDates.length}j
                    </span>
                  </div>
                </div>
              </th>

              {effectiveDates.map((date, dateIndex) => {
                const dateObj = new Date(date);
                const dayShort = isNaN(dateObj.getTime())
                  ? date
                  : dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                const dayFull = isNaN(dateObj.getTime())
                  ? date
                  : dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const isEvenDay = dateIndex % 2 === 0;

                return (
                  <th
                    key={date}
                    colSpan={timeSlots.length}
                    title={dayFull}
                    className={`p-1 text-center text-xs font-bold border-b border-b-slate-300 dark:border-b-slate-700 border-r-4 border-r-slate-400 dark:border-r-slate-600 shadow-xs ${
                      isEvenDay
                        ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                        : 'bg-slate-200/70 dark:bg-slate-950 text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="capitalize font-bold text-[10.5px] sm:text-[11px] truncate">
                        {dayShort}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Row 2: Time Slot Numbers (1, 2, 3, 4...) per Date */}
            <tr>
              <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 p-1 text-xs font-semibold text-slate-600 dark:text-slate-400 border-r-2 border-slate-300 dark:border-slate-700 w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px]">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Créneaux</span>
                </div>
              </th>

              {effectiveDates.map((date, dateIndex) =>
                timeSlots.map((slot, slotIndex) => {
                  const slotNumber = slotIndex + 1;
                  const isLastSlotOfDay = slotIndex === timeSlots.length - 1;
                  const isEvenDay = dateIndex % 2 === 0;

                  return (
                    <th
                      key={`${date}-${slot.id}`}
                      className={`p-0.5 text-center min-w-[38px] sm:min-w-[42px] ${
                        isEvenDay
                          ? 'bg-slate-50 dark:bg-slate-850/95'
                          : 'bg-slate-100/80 dark:bg-slate-900/90'
                      } ${
                        isLastSlotOfDay
                          ? 'border-r-4 border-slate-400 dark:border-slate-600'
                          : 'border-r border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <span 
                          className="inline-flex items-center justify-center w-4 h-4 rounded bg-teal-100 dark:bg-teal-500/15 border border-teal-400 dark:border-teal-500/35 text-teal-800 dark:text-teal-300 font-extrabold text-[9px] shadow-2xs"
                          title={`Créneau ${slotNumber} (${slot.debut || '08:30'} - ${slot.fin || '10:30'})`}
                        >
                          {slotNumber}
                        </span>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          {/* Table Body: Render Rows depending on currentMode */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {/* MODE: GLOBAL OR PROMOTIONS */}
            {(currentMode === 'global' || currentMode === 'promotions') && (
              filteredPromotions.map((promo) => {
                const promoColor = promo.couleur || '#8b5cf6';
                const isPromoSelected = activePromoName === promo.nom;
                const isRowBlocked = blockedRows.has(promo.nom);

                return (
                  <tr key={promo.id || promo.nom} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition">
                    {/* Sticky Row Header: Click to view promotion modules in the bottom reserve tray */}
                    <td
                      onClick={() => {
                        setSelectedPromoForSubjects(promo.nom);
                        setSelectedReserveItem(null);
                        setHoveredReserveItem(null);
                        setHoveredExamCard(null);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          isOpen: true,
                          x: e.clientX,
                          y: e.clientY,
                          rowId: promo.nom,
                          rowLabel: promo.nom,
                          rowType: 'promotion'
                        });
                      }}
                      className={`group sticky left-0 z-10 p-1.5 border-r-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 select-none text-slate-900 dark:text-slate-100 w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] cursor-pointer hover:bg-teal-50/70 dark:hover:bg-teal-950/30 transition-all ${
                        isPromoSelected ? 'ring-2 ring-inset ring-teal-500 bg-teal-50/90 dark:bg-teal-950/60 shadow-xs' : ''
                      } ${isRowBlocked ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''}`}
                      title={`Cliquer pour charger les matières de ${promo.nom} dans la réserve`}
                    >
                      <div className="flex items-start justify-between gap-1 min-w-0">
                        <div className="flex items-start gap-1 min-w-0 flex-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs mt-1 transition-transform ${isPromoSelected ? 'scale-125 ring-2 ring-teal-400' : ''}`}
                            style={{ backgroundColor: promoColor }}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`text-[11px] font-bold break-words whitespace-normal leading-tight transition ${isPromoSelected ? 'text-teal-700 dark:text-teal-300 font-black' : 'text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400'}`} title={promo.nom}>
                                {promo.nom}
                              </span>
                              {promo.semestre && (
                                <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono border border-indigo-200 dark:border-indigo-800 shrink-0">
                                  {promo.semestre}
                                </span>
                              )}
                            </div>
                            {promo.filiere && (
                              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 break-words whitespace-normal leading-tight" title={promo.filiere}>
                                {promo.filiere}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 ml-0.5">
                          {/* Bouton rapide d'impression/visualisation du planning officiel */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPlanningModal({
                                isOpen: true,
                                rowId: promo.nom,
                                rowLabel: promo.nom,
                                rowType: 'promotion'
                              });
                            }}
                            className="p-1 rounded text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 opacity-80 group-hover:opacity-100 transition"
                            title="Visualiser et imprimer l'emploi du temps officiel (A4 Paysage)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isRowBlocked && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title="Ligne verrouillée - cartes protégées" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Matrix Cells */}
                    {effectiveDates.map((date, dateIndex) =>
                      timeSlots.map((slot, slotIndex) => {
                        const cellExams = getExamsForPromoSlot(promo.nom, date, slot);
                        const isLastSlot = slotIndex === timeSlots.length - 1;
                        const isEvenDay = dateIndex % 2 === 0;
                        const isCellOccupied = cellExams.some(ex => {
                          if (draggedExamId && ex.id === draggedExamId) return false;
                          if (draggedExamId) {
                            const draggedEx = exams.find(e => e.id === draggedExamId);
                            if (draggedEx?.commonGroupId && ex.commonGroupId === draggedEx.commonGroupId) return false;
                          }
                          return true;
                        });

                        return (
                          <td
                            key={`${promo.nom}-${date}-${slot.id}`}
                            onDragOver={(e) => {
                              if (isCellOccupied) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'none';
                                return;
                              }
                              handleDragOverPromoSlot(e, promo.nom);
                            }}
                            onDrop={() => {
                              if (isCellOccupied) {
                                setDropAlert({
                                  type: 'warning',
                                  message: `Interdit : Ce créneau est déjà occupé par une autre épreuve pour la promotion "${promo.nom}". Impossible de poser une carte ici.`
                                });
                                setDraggedSubject(null);
                                setDraggedExamId(null);
                                return;
                              }
                              handleDropOnSlot(date, slot, promo.nom);
                            }}
                            className={`p-0.5 align-top transition min-w-[38px] sm:min-w-[42px] ${
                              isEvenDay ? 'bg-white dark:bg-slate-950/60' : 'bg-slate-50/70 dark:bg-slate-900/40'
                            } ${
                              isLastSlot ? 'border-r-4 border-slate-300 dark:border-slate-600' : 'border-r border-slate-200 dark:border-slate-850/80'
                            } hover:bg-teal-50/60 dark:hover:bg-teal-950/20`}
                          >
                            <div className="flex flex-col gap-0.5 min-h-[34px] py-0.5">
                              {cellExams.map((ex) => {
                                const exConflicts = conflictsByExamId.get(ex.id) || [];
                                const hasConflicts = exConflicts.length > 0;
                                const promoObj = allPromotions.find(p => p.nom === ex.promotion || p.nom === promo.nom);

                                return (
                                  <div
                                    key={ex.id}
                                    draggable={!isRowBlocked}
                                    onDragStart={(e) => handleDragStart(e, ex.id, promo.nom)}
                                    onMouseEnter={() => setHoveredExamCard(ex)}
                                    onMouseLeave={() => setHoveredExamCard(null)}
                                    onClick={() => {
                                      setHoveredExamCard(ex);
                                      setSelectedReserveItem(null);
                                    }}
                                    onDoubleClick={() => onEditExam(ex)}
                                    title={`${ex.nomModule || ex.codeModule || ''}${isRowBlocked ? ' (Ligne bloquée)' : ''}`}
                                    className={`group relative rounded border px-1 py-0.5 text-[9.5px] transition shadow-2xs flex flex-col justify-between gap-0.5 min-h-[30px] ${
                                      isRowBlocked
                                        ? 'cursor-not-allowed opacity-90'
                                        : 'cursor-grab active:cursor-grabbing'
                                      } ${
                                      hasConflicts
                                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100'
                                        : 'bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className="flex flex-col gap-0.5 w-full min-w-0">
                                      <div className="flex items-center justify-between gap-0.5 w-full">
                                        <span 
                                          className={`font-bold text-[9.5px] tracking-tight truncate leading-tight ${currentMode === 'global' ? 'font-mono' : ''}`}
                                          style={{ color: hasConflicts ? '#e11d48' : (promoObj?.couleur || '#0d9488') }}
                                          title={`${ex.codeModule ? `[${ex.codeModule}] ` : ''}${ex.nomModule || ''}`}
                                        >
                                          {currentMode === 'global' ? (ex.codeModule || ex.nomModule) : (ex.nomModule || ex.codeModule)}
                                        </span>
                                        {isRowBlocked && (
                                          <Lock className="w-2 h-2 text-amber-500 dark:text-amber-400/90 shrink-0" />
                                        )}
                                      </div>
                                      {ex.responsableId && (
                                        <span className="text-[8px] text-slate-500 dark:text-slate-400 italic truncate leading-none" title={teachers.find(t => t.id === ex.responsableId)?.nom || ex.responsableId}>
                                          {teachers.find(t => t.id === ex.responsableId)?.nom || ex.responsableId}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-700/50 w-full text-[8px] text-slate-500 dark:text-slate-400 leading-none">
                                      <span className="truncate font-mono font-medium">
                                        {ex.heureDebut || '08:30'}
                                      </span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {hasConflicts && (
                                          <AlertCircle
                                            className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0"
                                            title={exConflicts.map(c => c.titre).join('\n')}
                                          />
                                        )}
                                        {!isRowBlocked && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnassignExam(ex.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Renvoyer à la réserve"
                                            >
                                              <Undo2 className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditExam(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-teal-600 dark:hover:text-teal-400 transition"
                                              title="Modifier l'épreuve"
                                            >
                                              <Eye className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExamToDelete(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Supprimer définitivement l'épreuve"
                                            >
                                              <Trash2 className="w-2 h-2" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })
            )}

            {/* MODE: TEACHERS (Surveillance) */}
            {currentMode === 'teachers' && (
              filteredTeachers.map((teacher) => {
                const teacherInitial = teacher.prenom ? `${teacher.prenom.trim().charAt(0).toUpperCase()}.` : '';
                const teacherTitlePrefix = teacher.titre?.trim() ? `${teacher.titre.trim()} ` : '';
                const teacherFullName = `${teacherTitlePrefix}${teacher.nom.trim()} ${teacher.prenom?.trim() || ''}`.trim();
                const teacherNameQuota = `${teacherTitlePrefix}${teacher.nom.trim().toUpperCase()} ${teacherInitial} (${teacher.quotaSouhaite ?? 8})`.replace(/\s+/g, ' ').trim();
                const isRowBlocked = blockedRows.has(teacher.id);

                return (
                  <tr key={teacher.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition">
                    {/* Sticky Teacher Header - Format: ALAMI M. (4) on a single line */}
                    <td
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          isOpen: true,
                          x: e.clientX,
                          y: e.clientY,
                          rowId: teacher.id,
                          rowLabel: teacherFullName || teacherNameQuota,
                          rowType: 'teacher'
                        });
                      }}
                      className={`group sticky left-0 z-10 p-1.5 border-r-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 whitespace-nowrap w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] select-none text-slate-900 dark:text-slate-100 ${
                        isRowBlocked ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0" title={`${teacher.nom} ${teacher.prenom} - Quota: ${teacher.quotaSouhaite ?? 8}`}>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate flex-1">
                          {teacherNameQuota}
                        </span>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPlanningModal({
                                isOpen: true,
                                rowId: teacher.id,
                                rowLabel: `${teacherTitlePrefix}${teacher.nom} ${teacher.prenom || ''}`.trim(),
                                rowType: 'teacher'
                              });
                            }}
                            className="p-1 rounded text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 opacity-80 group-hover:opacity-100 transition"
                            title="Visualiser et imprimer l'emploi du temps officiel de cet enseignant"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isRowBlocked && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title="Ligne verrouillée - cartes protégées" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Matrix Cells */}
                    {effectiveDates.map((date, dateIndex) =>
                      timeSlots.map((slot, slotIndex) => {
                        const cellExams = getExamsForTeacherSlot(teacher.id, date, slot);
                        const isUnavailable = isTeacherUnavailable(teacher.id, date, slot);
                        const isLastSlot = slotIndex === timeSlots.length - 1;
                        const isEvenDay = dateIndex % 2 === 0;
                        const isCellOccupied = cellExams.some(ex => {
                          if (draggedExamId && ex.id === draggedExamId) return false;
                          if (draggedExamId) {
                            const draggedEx = exams.find(e => e.id === draggedExamId);
                            if (draggedEx?.commonGroupId && ex.commonGroupId === draggedEx.commonGroupId) return false;
                          }
                          return true;
                        });

                        return (
                          <td
                            key={`${teacher.id}-${date}-${slot.id}`}
                            onDragOver={(e) => {
                              if (isCellOccupied) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'none';
                                return;
                              }
                              handleDragOver(e);
                            }}
                            onDrop={() => {
                              if (isCellOccupied) {
                                setDropAlert({
                                  type: 'warning',
                                  message: `Interdit : Cet enseignant a déjà une épreuve programmée sur ce créneau. Impossible de poser une carte ici.`
                                });
                                setDraggedSubject(null);
                                setDraggedExamId(null);
                                return;
                              }
                              handleDropOnSlot(date, slot, teacher.id);
                            }}
                            className={`p-0.5 align-top transition min-w-[38px] sm:min-w-[42px] ${
                              isUnavailable
                                ? 'bg-rose-100/50 dark:bg-rose-950/25'
                                : (isEvenDay ? 'bg-white dark:bg-slate-950/60' : 'bg-slate-50/70 dark:bg-slate-900/40')
                            } ${
                              isLastSlot ? 'border-r-4 border-slate-300 dark:border-slate-600' : 'border-r border-slate-200 dark:border-slate-850/80'
                            } hover:bg-teal-50/60 dark:hover:bg-teal-950/20`}
                          >
                            <div className="flex flex-col gap-0.5 min-h-[34px] py-0.5">
                              {isUnavailable && cellExams.length === 0 && (
                                <div className="p-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-[8.5px] text-rose-800 dark:text-rose-300 text-center font-medium">
                                  Indispo
                                </div>
                              )}

                              {cellExams.map((ex) => {
                                const isResp = ex.responsableId === teacher.id;
                                const exConflicts = conflictsByExamId.get(ex.id) || [];
                                const hasConflicts = exConflicts.length > 0;
                                const promoObj = promoMap.get(ex.niveau || ex.promotion || '') ||
                                  allPromotions.find(p => 
                                    p.nom.toLowerCase().trim() === (ex.niveau || ex.promotion || '').toLowerCase().trim() ||
                                    p.code.toLowerCase().trim() === (ex.niveau || ex.promotion || '').toLowerCase().trim()
                                  );
                                const promoCode = promoObj?.code || ex.niveau || ex.promotion || 'PROMO';

                                return (
                                  <div
                                    key={ex.id}
                                    draggable={!isRowBlocked}
                                    onDragStart={(e) => handleDragStart(e, ex.id, teacher.id)}
                                    onMouseEnter={() => setHoveredExamCard(ex)}
                                    onMouseLeave={() => setHoveredExamCard(null)}
                                    onClick={() => {
                                      setHoveredExamCard(ex);
                                      setSelectedReserveItem(null);
                                    }}
                                    onDoubleClick={() => onEditExam(ex)}
                                    title={`Promotion: ${promoObj?.nom || promoCode} | Matière: ${ex.codeModule || 'CODE'} - ${ex.nomModule || ''}${isRowBlocked ? ' (Ligne bloquée)' : ''}`}
                                    className={`group relative rounded border px-1 py-0.5 text-[9.5px] transition shadow-2xs flex flex-col justify-between gap-0.5 min-h-[30px] ${
                                      isRowBlocked
                                        ? 'cursor-not-allowed opacity-90'
                                        : 'cursor-grab active:cursor-grabbing'
                                    } ${
                                      hasConflicts
                                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100'
                                        : isResp
                                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-600 text-teal-900 dark:text-teal-100 hover:border-teal-500'
                                        : 'bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-0.5 w-full">
                                      <span 
                                        className="font-black font-mono text-[9.5px] tracking-tight truncate leading-tight"
                                        style={{ color: hasConflicts ? '#e11d48' : (promoObj?.couleur || '#0d9488') }}
                                      >
                                        {promoCode}
                                      </span>
                                      {isRowBlocked && (
                                        <Lock className="w-2 h-2 text-amber-500 dark:text-amber-400/90 shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-700/50 w-full text-[8px] text-slate-500 dark:text-slate-400 leading-none">
                                      <span className="truncate font-mono font-medium">
                                        {ex.heureDebut || '08:30'}
                                      </span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {hasConflicts && (
                                          <AlertCircle
                                            className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0"
                                            title={exConflicts.map(c => c.titre).join('\n')}
                                          />
                                        )}
                                        {!isRowBlocked && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnassignExam(ex.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Renvoyer à la réserve"
                                            >
                                              <Undo2 className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditExam(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-teal-600 dark:hover:text-teal-400 transition"
                                              title="Modifier l'épreuve"
                                            >
                                              <Eye className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExamToDelete(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Supprimer définitivement l'épreuve"
                                            >
                                              <Trash2 className="w-2 h-2" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })
            )}

            {/* MODE: ROOMS */}
            {currentMode === 'rooms' && (
              filteredRooms.map((room) => {
                const isRowBlocked = blockedRows.has(room.id);
                return (
                  <tr key={room.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition">
                    {/* Sticky Room Header */}
                    <td
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          isOpen: true,
                          x: e.clientX,
                          y: e.clientY,
                          rowId: room.id,
                          rowLabel: room.nom,
                          rowType: 'room'
                        });
                      }}
                      className={`group sticky left-0 z-10 p-1.5 border-r-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] select-none text-slate-900 dark:text-slate-100 ${
                        isRowBlocked ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate" title={room.nom}>
                            {room.nom}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {room.capacite || 40} pl. • {room.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPlanningModal({
                                isOpen: true,
                                rowId: room.id,
                                rowLabel: room.nom,
                                rowType: 'room'
                              });
                            }}
                            className="p-1 rounded text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 opacity-80 group-hover:opacity-100 transition"
                            title="Visualiser et imprimer l'occupation de cette salle au format officiel"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isRowBlocked && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title="Ligne verrouillée - cartes protégées" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Matrix Cells */}
                    {effectiveDates.map((date, dateIndex) =>
                      timeSlots.map((slot, slotIndex) => {
                        const cellExams = getExamsForRoomSlot(room.id, date, slot);
                        const isLastSlot = slotIndex === timeSlots.length - 1;
                        const isEvenDay = dateIndex % 2 === 0;
                        const isCellOccupied = cellExams.some(ex => {
                          if (draggedExamId && ex.id === draggedExamId) return false;
                          if (draggedExamId) {
                            const draggedEx = exams.find(e => e.id === draggedExamId);
                            if (draggedEx?.commonGroupId && ex.commonGroupId === draggedEx.commonGroupId) return false;
                          }
                          return true;
                        });

                        return (
                          <td
                            key={`${room.id}-${date}-${slot.id}`}
                            onDragOver={(e) => {
                              if (isCellOccupied) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'none';
                                return;
                              }
                              handleDragOver(e);
                            }}
                            onDrop={() => {
                              if (isCellOccupied) {
                                setDropAlert({
                                  type: 'warning',
                                  message: `Interdit : Cette salle est déjà occupée sur ce créneau. Impossible de poser une carte ici.`
                                });
                                setDraggedSubject(null);
                                setDraggedExamId(null);
                                return;
                              }
                              handleDropOnSlot(date, slot, room.id);
                            }}
                            className={`p-0.5 align-top transition min-w-[38px] sm:min-w-[42px] ${
                              isEvenDay ? 'bg-white dark:bg-slate-950/60' : 'bg-slate-50/70 dark:bg-slate-900/40'
                            } ${
                              isLastSlot ? 'border-r-4 border-slate-300 dark:border-slate-600' : 'border-r border-slate-200 dark:border-slate-850/80'
                            } hover:bg-teal-50/60 dark:hover:bg-teal-950/20`}
                          >
                            <div className="flex flex-col gap-0.5 min-h-[34px] py-0.5">
                              {cellExams.map((ex) => {
                                const exConflicts = conflictsByExamId.get(ex.id) || [];
                                const hasConflicts = exConflicts.length > 0;

                                return (
                                  <div
                                    key={ex.id}
                                    draggable={!isRowBlocked}
                                    onDragStart={(e) => handleDragStart(e, ex.id, room.id)}
                                    onMouseEnter={() => setHoveredExamCard(ex)}
                                    onMouseLeave={() => setHoveredExamCard(null)}
                                    onClick={() => {
                                      setHoveredExamCard(ex);
                                      setSelectedReserveItem(null);
                                    }}
                                    onDoubleClick={() => onEditExam(ex)}
                                    title={`${ex.codeModule || 'CODE'} - ${ex.nomModule || ''}${isRowBlocked ? ' (Ligne bloquée)' : ''}`}
                                    className={`group relative rounded border px-1 py-0.5 text-[9.5px] transition shadow-2xs flex flex-col justify-between gap-0.5 min-h-[30px] ${
                                      isRowBlocked
                                        ? 'cursor-not-allowed opacity-90'
                                        : 'cursor-grab active:cursor-grabbing'
                                    } ${
                                      hasConflicts
                                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100'
                                        : 'bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-0.5 w-full">
                                      <span className="font-black font-mono text-[9.5px] text-teal-700 dark:text-teal-300 truncate leading-tight">
                                        {ex.codeModule || 'CODE'}
                                      </span>
                                      {isRowBlocked && (
                                        <Lock className="w-2 h-2 text-amber-500 dark:text-amber-400/90 shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-700/50 w-full text-[8px] text-slate-500 dark:text-slate-400 leading-none">
                                      <span className="truncate font-mono font-medium">
                                        {ex.heureDebut || '08:30'}
                                      </span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {hasConflicts && (
                                          <AlertCircle
                                            className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0"
                                            title={exConflicts.map(c => c.titre).join('\n')}
                                          />
                                        )}
                                        {!isRowBlocked && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnassignExam(ex.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Renvoyer à la réserve"
                                            >
                                              <Undo2 className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditExam(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-teal-600 dark:hover:text-teal-400 transition"
                                              title="Modifier l'épreuve"
                                            >
                                              <Eye className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExamToDelete(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Supprimer définitivement l'épreuve"
                                            >
                                              <Trash2 className="w-2 h-2" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })
            )}

            {/* MODE: MODULES */}
            {currentMode === 'modules' && (
              filteredSubjects.map((sub) => {
                const subNom = sub.nom || sub.nomModule || '';
                const subCode = sub.code || sub.codeModule || '';
                const isRowBlocked = blockedRows.has(sub.id) || blockedRows.has(subCode);

                return (
                  <tr key={sub.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition">
                    {/* Sticky Subject Header */}
                    <td
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          isOpen: true,
                          x: e.clientX,
                          y: e.clientY,
                          rowId: sub.id,
                          rowLabel: `${subCode} - ${subNom}`,
                          rowType: 'module'
                        });
                      }}
                      className={`group sticky left-0 z-10 p-1.5 border-r-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 w-[130px] min-w-[130px] max-w-[130px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] select-none text-slate-900 dark:text-slate-100 ${
                        isRowBlocked ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate" title={`${subCode} - ${subNom}`}>
                            {subCode} - {subNom}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {sub.promotion} • {sub.dureeMinutes || 90}m
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPlanningModal({
                                isOpen: true,
                                rowId: sub.id,
                                rowLabel: `${subCode} - ${subNom}`,
                                rowType: 'module'
                              });
                            }}
                            className="p-1 rounded text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 opacity-80 group-hover:opacity-100 transition"
                            title="Visualiser et imprimer la planification de ce module"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isRowBlocked && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title="Ligne verrouillée - cartes protégées" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Matrix Cells */}
                    {effectiveDates.map((date, dateIndex) =>
                      timeSlots.map((slot, slotIndex) => {
                        const cellExams = getExamsForModuleSlot(subCode, subNom, date, slot);
                        const isLastSlot = slotIndex === timeSlots.length - 1;
                        const isEvenDay = dateIndex % 2 === 0;
                        const isCellOccupied = cellExams.some(ex => {
                          if (draggedExamId && ex.id === draggedExamId) return false;
                          if (draggedExamId) {
                            const draggedEx = exams.find(e => e.id === draggedExamId);
                            if (draggedEx?.commonGroupId && ex.commonGroupId === draggedEx.commonGroupId) return false;
                          }
                          return true;
                        });

                        return (
                          <td
                            key={`${sub.id}-${date}-${slot.id}`}
                            onDragOver={(e) => {
                              if (isCellOccupied) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'none';
                                return;
                              }
                              handleDragOver(e);
                            }}
                            onDrop={() => {
                              if (isCellOccupied) {
                                setDropAlert({
                                  type: 'warning',
                                  message: `Interdit : Ce module a déjà une épreuve programmée sur ce créneau. Impossible de poser une carte ici.`
                                });
                                setDraggedSubject(null);
                                setDraggedExamId(null);
                                return;
                              }
                              handleDropOnSlot(date, slot, sub.id);
                            }}
                            className={`p-0.5 align-top transition min-w-[38px] sm:min-w-[42px] ${
                              isEvenDay ? 'bg-white dark:bg-slate-950/60' : 'bg-slate-50/70 dark:bg-slate-900/40'
                            } ${
                              isLastSlot ? 'border-r-4 border-slate-300 dark:border-slate-600' : 'border-r border-slate-200 dark:border-slate-850/80'
                            } hover:bg-teal-50/60 dark:hover:bg-teal-950/20`}
                          >
                            <div className="flex flex-col gap-0.5 min-h-[34px] py-0.5">
                              {cellExams.map((ex) => {
                                const respTeacher = ex.responsableId 
                                  ? teacherMap.get(ex.responsableId) 
                                  : (ex.salles?.[0]?.surveillants?.[0] ? teacherMap.get(ex.salles[0].surveillants[0].teacherId) : undefined);

                                const teacherInitial = respTeacher?.prenom ? `${respTeacher.prenom.trim().charAt(0).toUpperCase()}.` : '';
                                const teacherTitlePrefix = respTeacher?.titre?.trim() ? `${respTeacher.titre.trim()} ` : '';
                                const teacherDisplayName = respTeacher 
                                  ? `${teacherTitlePrefix}${respTeacher.nom.trim().toUpperCase()} ${teacherInitial}`.trim()
                                  : (ex.responsableId || (typeof sub.enseignantResponsable === 'string' ? sub.enseignantResponsable : '') || 'ALLAMI M.');

                                const exConflicts = conflictsByExamId.get(ex.id) || [];
                                const hasConflicts = exConflicts.length > 0;

                                return (
                                  <div
                                    key={ex.id}
                                    draggable={!isRowBlocked}
                                    onDragStart={(e) => handleDragStart(e, ex.id, sub.id)}
                                    onMouseEnter={() => setHoveredExamCard(ex)}
                                    onMouseLeave={() => setHoveredExamCard(null)}
                                    onClick={() => {
                                      setHoveredExamCard(ex);
                                      setSelectedReserveItem(null);
                                    }}
                                    onDoubleClick={() => onEditExam(ex)}
                                    title={`Enseignant: ${teacherDisplayName} (${ex.heureDebut} - ${ex.heureFin})${isRowBlocked ? ' (Ligne bloquée)' : ''}`}
                                    className={`group relative rounded border px-1 py-0.5 text-[9.5px] shadow-2xs transition-all flex flex-col justify-between gap-0.5 min-h-[30px] ${
                                      isRowBlocked
                                        ? 'cursor-not-allowed opacity-90'
                                        : 'cursor-grab active:cursor-grabbing'
                                    } ${
                                      hasConflicts
                                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100'
                                        : 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-500/80 text-amber-900 dark:text-amber-200 hover:border-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-900/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-0.5 w-full">
                                      <span className="font-bold text-[9.5px] tracking-tight text-amber-900 dark:text-amber-300 truncate leading-tight">
                                        {teacherDisplayName}
                                      </span>
                                      {isRowBlocked && (
                                        <Lock className="w-2 h-2 text-amber-500 dark:text-amber-400/90 shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-0.5 pt-0.5 border-t border-amber-200 dark:border-amber-800/40 w-full text-[8px] text-amber-800/80 dark:text-amber-300/80 leading-none">
                                      <span className="truncate font-mono font-medium">
                                        {ex.heureDebut || '08:30'}
                                      </span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {hasConflicts && (
                                          <AlertCircle
                                            className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0"
                                            title={exConflicts.map(c => c.titre).join('\n')}
                                          />
                                        )}
                                        {!isRowBlocked && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnassignExam(ex.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 text-amber-800 dark:text-amber-200 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Renvoyer à la réserve"
                                            >
                                              <Undo2 className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditExam(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-teal-600 dark:hover:text-teal-400 transition"
                                              title="Modifier l'épreuve"
                                            >
                                              <Eye className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExamToDelete(ex);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                              title="Supprimer définitivement l'épreuve"
                                            >
                                              <Trash2 className="w-2 h-2" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Docked Tray: Réserve des Matières & Épreuves */}
      <div 
        onDragOver={(e) => {
          handleDragOver(e);
          setIsDragOverReserve(true);
        }}
        onDragLeave={() => setIsDragOverReserve(false)}
        onDrop={handleDropOnReserve}
        className={`border-t transition-colors ${
          isDragOverReserve 
            ? 'border-rose-500 bg-rose-100/60 dark:bg-rose-950/40' 
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
        }`}
      >
        {/* Tray Header & Promotion Tabs */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
              Réserve des modules & épreuves
            </span>
            {activePromoName && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span>Promotion : {activePromoName}</span>
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {reserveItems.filter(i => !i.isPlaced).length} à placer / {reserveItems.length} total
            </span>
          </div>

          {/* Promo Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl py-0.5">
            {allPromotions.map((p) => {
              const isSelected = activePromoName === p.nom;
              return (
                <button
                  key={p.id || p.nom}
                  onClick={() => {
                    setSelectedPromoForSubjects(p.nom);
                    setSelectedReserveItem(null);
                    setHoveredReserveItem(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.couleur || '#8b5cf6' }}
                  />
                  <span>{p.nom}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Content Area: Preview Zone on the Left + Subject Code Only Cards on the Right */}
        <div className="p-3 flex flex-col md:flex-row items-stretch gap-3.5">
          {/* Left Preview Zone */}
          <div className="w-full md:w-80 lg:w-96 shrink-0 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-200">
                  <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Détails du module</span>
                </div>
                {activePreviewItem && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewCardModalItem(activePreviewItem)}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 hover:bg-teal-600 text-slate-700 dark:text-slate-300 hover:text-white transition text-[10px] font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-800"
                      title="Ouvrir la fiche de prévisualisation grand format"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Aperçu</span>
                    </button>
                    <span
                      className="text-[11px] font-black font-mono px-2 py-0.5 rounded shadow-2xs"
                      style={{
                        backgroundColor: `${activePreviewItem.couleur || '#06b6d4'}25`,
                        color: activePreviewItem.couleur || '#06b6d4',
                        border: `1px solid ${activePreviewItem.couleur || '#06b6d4'}60`
                      }}
                    >
                      {activePreviewItem.code}
                    </span>
                  </div>
                )}
              </div>

              {activePreviewItem ? (
                <div className="pt-2 space-y-2 text-xs">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Intitulé de la matière
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mt-0.5 line-clamp-2" title={activePreviewItem.nom}>
                      {activePreviewItem.nom}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-white dark:bg-slate-900/90 rounded-lg p-2 border border-slate-200 dark:border-slate-800/90">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>Promotion</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate mt-0.5" title={activePreviewItem.promo}>
                        {activePreviewItem.promo || 'Non spécifiée'}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/90 rounded-lg p-2 border border-slate-200 dark:border-slate-800/90">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>Responsable</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate mt-0.5" title={activePreviewItem.teacherName || 'Non assigné'}>
                        {activePreviewItem.teacherName || 'Non assigné'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900/80 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-teal-700 dark:text-teal-300">{activePreviewItem.semestre || 'S1'}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{activePreviewItem.duree || 90} min</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>Coeff. {activePreviewItem.coeff || 2}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{activePreviewItem.effectif || 45} étud.</span>
                  </div>

                  {activePreviewItem.salles && (
                    <div className="bg-white dark:bg-slate-900/90 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-800/90 text-xs flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <DoorClosed className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>Salles</span>
                      </div>
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 truncate max-w-[180px]" title={activePreviewItem.salles}>
                        {activePreviewItem.salles}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center min-h-[160px]">
                  <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                  <span className="font-bold text-slate-600 dark:text-slate-400 text-sm">Aucune information</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[210px] leading-relaxed">
                    Survolez une carte avec le curseur pour afficher ses détails
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Status inside preview */}
            {activePreviewItem && (
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                {activePreviewItem.isPlaced ? (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/70 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Programmé</span>
                      </span>
                      <span className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
                        {activePreviewItem.placedDate} {activePreviewItem.placedTime && `(${activePreviewItem.placedTime})`}
                      </span>
                    </div>
                    {activePreviewItem.salles && (
                      <div className="mt-1 pt-1 border-t border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800/90 dark:text-emerald-200/90 flex items-center justify-between">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Salles assignées :</span>
                        <span className="font-mono truncate max-w-[170px]">{activePreviewItem.salles}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <GripHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Non programmé</span>
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400/90 font-medium">
                      Glisser sur le tableau
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewCardModalItem(activePreviewItem)}
                    className="flex-1 py-1 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white dark:bg-teal-600/30 dark:hover:bg-teal-600 dark:text-teal-200 dark:hover:text-white border border-teal-300 dark:border-teal-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                    title="Prévisualiser la carte en grand format"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Aperçu de la carte</span>
                  </button>
                  {activePreviewItem.isPlaced && activePreviewItem.exam && (
                    <button
                      type="button"
                      onClick={() => onEditExam(activePreviewItem.exam)}
                      className="py-1 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium border border-slate-300 dark:border-slate-700 transition"
                      title="Modifier les détails de cette épreuve (salles, surveillants)"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Subject Code Only Cards */}
          <div className="flex-1 overflow-x-auto min-h-[140px] flex items-center">
            {reserveItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 w-full">
                Aucun module trouvé pour la promotion sélectionnée.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 py-1">
                {reserveItems.map((item) => {
                  const isHovered = hoveredReserveItem?.id === item.id;
                  const isSelected = selectedReserveItem?.id === item.id;
                  const itemColor = item.couleur || '#06b6d4';

                  return (
                    <div
                      key={item.id}
                      draggable={!item.isPlaced}
                      onDragStart={(e) => handleDragStartItem(e, item)}
                      onMouseEnter={() => setHoveredReserveItem(item)}
                      onMouseLeave={() => setHoveredReserveItem(null)}
                      onClick={() => {
                        setSelectedReserveItem(item);
                        setSelectedExamCard(null);
                      }}
                      onDoubleClick={() => setPreviewCardModalItem(item)}
                      className={`group shrink-0 min-w-[95px] px-3 py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all select-none ${
                        item.isPlaced
                          ? 'opacity-85 hover:opacity-100 cursor-pointer bg-slate-100/90 dark:bg-slate-900/90'
                          : 'cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-lg'
                      } ${
                        isSelected || isHovered
                          ? 'ring-2 ring-teal-500 dark:ring-white/80 scale-105 z-10'
                          : ''
                      }`}
                      style={{
                        backgroundColor: `${itemColor}15`,
                        borderColor: isSelected || isHovered ? itemColor : `${itemColor}60`,
                        boxShadow: isSelected || isHovered ? `0 0 16px ${itemColor}40` : undefined
                      }}
                      title={`${item.code} - ${item.nom} (Cliquer pour prévisualiser, double-cliquer pour agrandir)`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span 
                          className="font-black text-sm tracking-wider font-mono drop-shadow-xs text-center flex-1 truncate"
                          style={{ color: itemColor }}
                        >
                          {item.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReserveItem(item);
                            setSelectedExamCard(null);
                            setPreviewCardModalItem(item);
                          }}
                          className="p-1 rounded bg-white dark:bg-slate-950/80 hover:bg-teal-600 text-slate-500 dark:text-slate-400 hover:text-white transition shadow-xs"
                          title="Prévisualiser les détails de cette carte"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>

                      {item.isPlaced ? (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[9px] text-emerald-800 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Placé</span>
                          </span>
                          {item.placedTime && (
                            <span className="text-[9px] font-mono text-slate-700 dark:text-slate-300 font-medium truncate max-w-[85px]">
                              {item.placedTime}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300 font-semibold">
                          <GripHorizontal className="w-2.5 h-2.5 text-slate-400" />
                          <span>À glisser</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row Header Right-Click Context Menu */}
      {contextMenu && contextMenu.isOpen && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 220),
            left: Math.min(contextMenu.x, window.innerWidth - 250)
          }}
          className="fixed z-50 min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            {contextMenu.rowLabel}
          </div>

          {/* VUE GLOBALE ACTIONS */}
          {currentMode === 'global' ? (
            <>
              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: 'global',
                    rowLabel: 'Session Complète (Toutes Promotions)',
                    rowType: 'global',
                    autoPrint: false
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-2.5 transition font-semibold"
              >
                <LayoutGrid className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Visualiser Planning Global (Session Complète)</span>
              </button>

              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: 'global',
                    rowLabel: 'Session Complète (Toutes Promotions)',
                    rowType: 'global',
                    autoPrint: true
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-2.5 transition font-semibold"
              >
                <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Imprimer Planning Global (A4 Paysage)</span>
              </button>

              {contextMenu.rowId !== 'global' && (
                <>
                  <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                  <button
                    onClick={() => {
                      setPreviewPlanningModal({
                        isOpen: true,
                        rowId: contextMenu.rowId,
                        rowLabel: contextMenu.rowLabel,
                        rowType: 'promotion',
                        autoPrint: false
                      });
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Fiche Promotion : {contextMenu.rowLabel}</span>
                  </button>

                  <button
                    onClick={() => {
                      setPreviewPlanningModal({
                        isOpen: true,
                        rowId: contextMenu.rowId,
                        rowLabel: contextMenu.rowLabel,
                        rowType: 'promotion',
                        autoPrint: true
                      });
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Imprimer la promotion : {contextMenu.rowLabel}</span>
                  </button>
                </>
              )}
            </>
          ) : currentMode === 'promotions' ? (
            /* VUE PROMOTIONS ÉTUDIANTES ACTIONS */
            <>
              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: contextMenu.rowId,
                    rowLabel: contextMenu.rowLabel,
                    rowType: 'promotion',
                    autoPrint: false
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-300 flex items-center gap-2.5 transition font-semibold"
              >
                <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Visualiser l'emploi du temps : {contextMenu.rowLabel}</span>
              </button>

              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: contextMenu.rowId,
                    rowLabel: contextMenu.rowLabel,
                    rowType: 'promotion',
                    autoPrint: true
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2.5 transition font-semibold"
              >
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Imprimer le planning officiel (A4 Paysage)</span>
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: 'global',
                    rowLabel: 'Session Complète (Toutes Promotions)',
                    rowType: 'global',
                    autoPrint: false
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Visualiser le Planning Global (Session Complète)</span>
              </button>
            </>
          ) : (
            /* OTHER VIEWS (TEACHERS, ROOMS, MODULES) */
            <>
              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: contextMenu.rowId,
                    rowLabel: contextMenu.rowLabel,
                    rowType: contextMenu.rowType,
                    autoPrint: false
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-300 flex items-center gap-2.5 transition"
              >
                <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Visualiser l'emploi du temps (Format Officiel)</span>
              </button>

              <button
                onClick={() => {
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: contextMenu.rowId,
                    rowLabel: contextMenu.rowLabel,
                    rowType: contextMenu.rowType,
                    autoPrint: true
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2.5 transition font-medium"
              >
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Imprimer le planning (A4 Paysage)</span>
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

              <button
                onClick={() => {
                  const globalLabel = currentMode === 'rooms'
                    ? 'Planning global des salles'
                    : currentMode === 'teachers'
                    ? 'Planning global des enseignants'
                    : 'Planning global des matières';
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: 'global',
                    rowLabel: globalLabel,
                    rowType: 'global',
                    autoPrint: false
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-2.5 transition font-semibold"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Visualiser planning global {currentMode === 'rooms' ? 'des salles' : currentMode === 'teachers' ? 'des enseignants' : 'des matières'}</span>
              </button>

              <button
                onClick={() => {
                  const globalLabel = currentMode === 'rooms'
                    ? 'Planning global des salles'
                    : currentMode === 'teachers'
                    ? 'Planning global des enseignants'
                    : 'Planning global des matières';
                  setPreviewPlanningModal({
                    isOpen: true,
                    rowId: 'global',
                    rowLabel: globalLabel,
                    rowType: 'global',
                    autoPrint: true
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2.5 transition font-semibold"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Imprimer planning global {currentMode === 'rooms' ? 'des salles' : currentMode === 'teachers' ? 'des enseignants' : 'des matières'}</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

          {blockedRows.has(contextMenu.rowId) ? (
            <button
              onClick={() => {
                const next = new Set(blockedRows);
                next.delete(contextMenu.rowId);
                setBlockedRows(next);
                setContextMenu(null);
                setDropAlert({
                  type: 'warning',
                  message: `Ligne "${contextMenu.rowLabel}" débloquée. Les cartes peuvent à nouveau être déplacées.`
                });
              }}
              className="w-full text-left px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition font-medium"
            >
              <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Débloquer la ligne</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const next = new Set(blockedRows);
                next.add(contextMenu.rowId);
                setBlockedRows(next);
                setContextMenu(null);
                setDropAlert({
                  type: 'warning',
                  message: `Ligne "${contextMenu.rowLabel}" bloquée. Les cartes de cette ligne ne peuvent plus être déplacées.`
                });
              }}
              className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition font-medium"
            >
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Bloquer la ligne (verrouiller)</span>
            </button>
          )}
        </div>
      )}

      {/* Modal: Prévisualiser le planning officiel de la ligne conforme au modèle d'affichage */}
      {previewPlanningModal && previewPlanningModal.isOpen && (
        <OfficialPlanningModal
          isOpen={previewPlanningModal.isOpen}
          onClose={() => setPreviewPlanningModal(null)}
          rowId={previewPlanningModal.rowId}
          rowLabel={previewPlanningModal.rowLabel}
          rowType={previewPlanningModal.rowType}
          autoPrint={previewPlanningModal.autoPrint}
          exams={exams}
          teachers={teachers}
          rooms={rooms}
          promotions={allPromotions}
          timeSlots={timeSlots}
          sessionDates={effectiveDates}
          settings={settings}
        />
      )}

      {/* Detailed Card Preview Modal */}
      {previewCardModalItem && (
        <Modal
          isOpen={!!previewCardModalItem}
          onClose={() => setPreviewCardModalItem(null)}
          title={`Aperçu de la carte : ${previewCardModalItem.code}`}
          subtitle={previewCardModalItem.nom}
          maxWidth="lg"
        >
          <div className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
            {/* Header info badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-lg text-lg font-black font-mono shadow-sm"
                  style={{
                    backgroundColor: `${previewCardModalItem.couleur || '#06b6d4'}25`,
                    color: previewCardModalItem.couleur || '#06b6d4',
                    border: `1px solid ${previewCardModalItem.couleur || '#06b6d4'}60`
                  }}
                >
                  {previewCardModalItem.code}
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{previewCardModalItem.nom}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Promotion : {previewCardModalItem.promo || 'Non spécifiée'}</p>
                </div>
              </div>
              {previewCardModalItem.isPlaced ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Programmé</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <GripHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>En réserve</span>
                </span>
              )}
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Enseignant responsable</div>
                <div className="font-semibold text-slate-900 dark:text-slate-200 mt-0.5 truncate">{previewCardModalItem.teacherName || 'Non assigné'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Semestre & Durée</div>
                <div className="font-semibold text-slate-900 dark:text-slate-200 mt-0.5">{previewCardModalItem.semestre || 'S1'} • {previewCardModalItem.duree || 90} min</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Effectif & Coefficient</div>
                <div className="font-semibold text-slate-900 dark:text-slate-200 mt-0.5">{previewCardModalItem.effectif || 45} étudiants • Coeff. {previewCardModalItem.coeff || 1}</div>
              </div>
            </div>

            {/* Placed Exam specifics */}
            {previewCardModalItem.isPlaced ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Date : {previewCardModalItem.placedDate}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Horaire : {previewCardModalItem.placedTime}</span>
                  </span>
                </div>
                {previewCardModalItem.salles && (
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <DoorClosed className="w-4 h-4" />
                      <span>Salles assignées :</span>
                    </span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 font-mono">{previewCardModalItem.salles}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Cette matière est actuellement en réserve pour la promotion {previewCardModalItem.promo}. Glissez sa carte sur un créneau du tableau pour la programmer.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {previewCardModalItem.isPlaced && previewCardModalItem.exam && (
                <button
                  type="button"
                  onClick={() => {
                    const ex = previewCardModalItem.exam;
                    setPreviewCardModalItem(null);
                    onEditExam(ex);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Modifier l'épreuve</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewCardModalItem(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <ConfirmDialog
          isOpen={!!examToDelete}
          onClose={() => setExamToDelete(null)}
          onConfirm={() => {
            if (examToDelete) {
              if (onDeleteExam) {
                onDeleteExam(examToDelete.id);
              } else {
                onUpdateExams(exams.filter(e => e.id !== examToDelete.id));
              }
              setExamToDelete(null);
            }
          }}
          title="Supprimer définitivement l'épreuve"
          message={`Êtes-vous sûr de vouloir supprimer définitivement l'épreuve "${examToDelete.nomModule}" (${examToDelete.niveau || examToDelete.codeModule}) ? Les données supprimées ne réapparaîtront plus nulle part.`}
          confirmLabel="Supprimer définitivement"
          cancelLabel="Annuler"
          isDestructive={true}
        />
      )}
    </div>
  );
};
