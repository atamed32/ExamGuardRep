import React, { useState, useMemo } from 'react';
import { SubjectModule, PromotionGroup, Teacher, Exam, Room } from '../../types';
import { Translations } from '../../services/i18n';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  X, 
  Users, 
  Clock, 
  Filter, 
  Download, 
  Table, 
  LayoutGrid, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  CheckSquare, 
  Square, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  Sparkles,
  Link2,
  DoorClosed
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ExportUtils } from '../../services/exportUtils';
import { formatGrade, formatSemester, SEMESTER_OPTIONS } from '../../utils/gradeUtils';

export interface GroupedSubjectItem {
  id: string; // Primary ID
  code: string;
  nom: string;
  promotions: string[];
  semestre: string;
  dureeMinutes: number;
  coefficient: number;
  enseignantResponsableId?: string;
  subjectIds: string[];
  originalSubjects: SubjectModule[];
  commonGroupId?: string;
}

export type SubjectSortField = 'nom' | 'code' | 'promotions' | 'responsable' | 'semestre' | 'duree' | 'coefficient';

interface SubjectsViewProps {
  subjects: SubjectModule[];
  promotions: PromotionGroup[];
  teachers: Teacher[];
  exams?: Exam[];
  rooms?: Room[];
  t: Translations;
  onUpdateSubjects: (updated: SubjectModule[]) => void;
  onUpdateExams?: (updated: Exam[]) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onDeleteSubjectGroup?: (code: string, nom: string, promotions: string[], subjectIds: string[]) => void;
  onNotify?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onOpenRoomAssignment?: (options?: { subjectCode?: string; subjectNom?: string; promoNames?: string[] }) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  promotions,
  teachers,
  exams = [],
  rooms = [],
  t,
  onUpdateSubjects,
  onUpdateExams,
  onDeleteSubject,
  onDeleteSubjectGroup,
  onNotify,
  onOpenRoomAssignment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromoFilter, setSelectedPromoFilter] = useState<string>('ALL');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState<string>('ALL');
  const [selectedRespFilter, setSelectedRespFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Sorting state
  const [sortField, setSortField] = useState<SubjectSortField>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selection for bulk operations (stores primary grouped ids)
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());

  // Edit / Add modal state
  const [editingGroup, setEditingGroup] = useState<GroupedSubjectItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deletion confirm modal state
  const [groupToDelete, setGroupToDelete] = useState<GroupedSubjectItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form states
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([]);
  const [semestre, setSemestre] = useState<string>('Semestre impair');
  const [dureeMinutes, setDureeMinutes] = useState(90);
  const [enseignantResponsableId, setEnseignantResponsableId] = useState('');
  const [coefficient, setCoefficient] = useState(2);

  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const promoMap = useMemo(() => new Map<string, PromotionGroup>(promotions.map(p => [p.nom, p])), [promotions]);

  // Helper to get assigned rooms for a subject group
  const getAssignedRoomsForGroup = (grp: GroupedSubjectItem): string | null => {
    if (!exams || exams.length === 0) return null;

    const grpCode = (grp.code || '').toUpperCase().trim();
    const grpNom = (grp.nom || '').toLowerCase().trim();
    const promoSet = new Set(grp.promotions.map(p => p.trim().toLowerCase()));

    const roomNames = new Set<string>();

    for (const ex of exams) {
      const exCode = (ex.codeModule || '').toUpperCase().trim();
      const exNom = (ex.nomModule || '').toLowerCase().trim();
      const exPromo = (ex.niveau || '').trim().toLowerCase();

      const matchesCode = Boolean(grpCode && exCode === grpCode);
      const matchesNom = Boolean(grpNom && exNom === grpNom);

      if ((matchesCode || matchesNom) && promoSet.has(exPromo)) {
        if (ex.salles && ex.salles.length > 0) {
          ex.salles.forEach(s => {
            if (s.roomId) {
              const room = rooms?.find(r => r.id === s.roomId);
              if (room) {
                roomNames.add(room.nom);
              }
            }
          });
        }
      }
    }

    return roomNames.size > 0 ? Array.from(roomNames).join(', ') : null;
  };

  // Alphabetically sorted promotions and teachers for modals and lists
  const sortedPromotions = useMemo(() => {
    return [...promotions].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [promotions]);

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [teachers]);

  // Helper to get planned exams for a specific subject group, strictly filtered by its assigned promotions
  const getPlannedExamsForGroup = useMemo(() => {
    return (grp: GroupedSubjectItem): Exam[] => {
      const grpCode = (grp.code || '').toUpperCase().trim();
      const grpNom = (grp.nom || '').toLowerCase().trim();
      const promoSet = new Set(grp.promotions.map(p => p.trim().toLowerCase()));

      // Find exams matching code/name AND belonging to one of grp.promotions
      // Deduplicate by promotion so each assigned promotion has at most 1 planned exam counted
      const matching: Exam[] = [];
      const seenPromos = new Set<string>();

      for (const ex of exams) {
        const exCode = (ex.codeModule || '').toUpperCase().trim();
        const exNom = (ex.nomModule || '').toLowerCase().trim();
        const exPromo = (ex.niveau || '').trim().toLowerCase();

        const matchesCode = Boolean(grpCode && exCode === grpCode);
        const matchesNom = Boolean(grpNom && exNom === grpNom);

        if ((matchesCode || matchesNom) && promoSet.has(exPromo)) {
          if (!seenPromos.has(exPromo)) {
            seenPromos.add(exPromo);
            matching.push(ex);
          }
        }
      }

      return matching;
    };
  }, [exams]);

  // Group identical subjects across promotions into single unified entries
  const groupedSubjects: GroupedSubjectItem[] = useMemo(() => {
    const groupsMap = new Map<string, GroupedSubjectItem>();

    subjects.forEach(s => {
      const sCode = (s.code || s.codeModule || '').toUpperCase().trim();
      const sNom = (s.nom || s.nomModule || '').trim();
      const sSemestre = formatSemester(s.semestre);
      const respId = s.enseignantResponsableId || s.responsableId || '';

      let promoName = s.promotion || '';
      const sPromoLower = promoName.toLowerCase();
      // Match against known promotions list
      const matchedPromo = promotions.find(p => 
        p.nom.toLowerCase() === sPromoLower || 
        (p.code && p.code.toLowerCase() === sPromoLower)
      );

      if (matchedPromo) {
        promoName = matchedPromo.nom;
      } else if ((sPromoLower.includes('l2') && sPromoLower.includes('hydraulique')) || sPromoLower.includes('licence hydraulique')) {
        promoName = '2ème Année Licence Hydraulique';
      } else if (
        !sPromoLower.includes('m2') && !sPromoLower.includes('master 2') && (
          (sPromoLower.includes('m1') && (sPromoLower.includes('ressource') || sPromoLower.includes('hydraulique'))) ||
          sPromoLower === 'ressources en eau'
        )
      ) {
        promoName = 'M1 Ressources en eau';
      } else if (!promoName) {
        // Fallback only if no promotion is specified at all
        if (['MDF', 'HG', 'HYDRO', 'RDM-HYD', 'TOPO', 'GEO', 'MATH3', 'TB', 'OV'].includes(sCode)) {
          promoName = '2ème Année Licence Hydraulique';
        } else if (['HA', 'AMH', 'OCF', 'EEC', 'SIG', 'EE', 'PYTHON'].includes(sCode)) {
          promoName = 'M1 Ressources en eau';
        }
      }
      
      // Grouping key:
      // 1. If s.commonGroupId is present, group by that exact shared group ID
      // 2. Else if s.sharedPromotions has > 1 promotions, group by that shared promotion set
      // 3. Otherwise, standalone subject entry keeps its own identity (so "probabilités et statistiques" for "2eme année Ing" is completely separate from "probabilités et statistiques" for L2)
      let groupKey = '';
      if (s.commonGroupId) {
        groupKey = `cgrp_${s.commonGroupId}`;
      } else if (s.sharedPromotions && s.sharedPromotions.length > 1) {
        const sortedPromos = [...s.sharedPromotions].map(p => p.trim().toLowerCase()).sort().join('___');
        groupKey = `shared_${sCode}___${sNom.toLowerCase()}___${sortedPromos}`;
      } else {
        groupKey = `single_${s.id || (sCode + '___' + sNom.toLowerCase() + '___' + (promoName || ''))}`;
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: s.id,
          code: sCode || 'MOD',
          nom: sNom || 'Matière',
          promotions: s.sharedPromotions && s.sharedPromotions.length > 1
            ? Array.from(new Set([...s.sharedPromotions, ...(promoName ? [promoName] : [])]))
            : (promoName ? [promoName] : []),
          semestre: sSemestre,
          dureeMinutes: s.dureeMinutes || 90,
          coefficient: s.coefficient || 2,
          enseignantResponsableId: respId || undefined,
          subjectIds: [s.id],
          originalSubjects: [s],
          commonGroupId: s.commonGroupId
        });
      } else {
        const grp = groupsMap.get(groupKey)!;
        if (promoName && !grp.promotions.includes(promoName)) {
          grp.promotions.push(promoName);
        }
        if (s.sharedPromotions) {
          s.sharedPromotions.forEach(p => {
            if (!grp.promotions.includes(p)) grp.promotions.push(p);
          });
        }
        if (!grp.subjectIds.includes(s.id)) {
          grp.subjectIds.push(s.id);
          grp.originalSubjects.push(s);
        }
        if (!grp.commonGroupId && s.commonGroupId) {
          grp.commonGroupId = s.commonGroupId;
        }
      }
    });

    return Array.from(groupsMap.values());
  }, [subjects, promotions]);

  // Filtering & Sorting
  const filteredAndSortedGroups = useMemo(() => {
    const filtered = groupedSubjects.filter(grp => {
      const sCode = grp.code.toLowerCase();
      const sNom = grp.nom.toLowerCase();
      const promosStr = grp.promotions.join(' ').toLowerCase();
      const resp = grp.enseignantResponsableId ? teacherMap.get(grp.enseignantResponsableId) : undefined;
      const respName = resp ? `${resp.nom} ${resp.prenom}`.toLowerCase() : '';
      const q = searchTerm.toLowerCase().trim();

      const matchesSearch = !q || sCode.includes(q) || sNom.includes(q) || promosStr.includes(q) || respName.includes(q);
      const matchesPromo = selectedPromoFilter === 'ALL' || grp.promotions.includes(selectedPromoFilter);
      const matchesSemestre = selectedSemestreFilter === 'ALL' || grp.semestre === selectedSemestreFilter;
      const matchesResp = 
        selectedRespFilter === 'ALL' || 
        (selectedRespFilter === 'WITH_RESP' && !!grp.enseignantResponsableId) ||
        (selectedRespFilter === 'NO_RESP' && !grp.enseignantResponsableId);

      return matchesSearch && matchesPromo && matchesSemestre && matchesResp;
    });

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nom':
          comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code, 'fr', { sensitivity: 'base' });
          break;
        case 'promotions':
          comparison = a.promotions.join(', ').localeCompare(b.promotions.join(', '), 'fr', { sensitivity: 'base' });
          break;
        case 'responsable': {
          const respA = a.enseignantResponsableId ? teacherMap.get(a.enseignantResponsableId) : undefined;
          const respB = b.enseignantResponsableId ? teacherMap.get(b.enseignantResponsableId) : undefined;
          const nameA = respA ? `${respA.nom} ${respA.prenom}` : '';
          const nameB = respB ? `${respB.nom} ${respB.prenom}` : '';
          comparison = nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
          break;
        }
        case 'semestre':
          comparison = a.semestre.localeCompare(b.semestre);
          break;
        case 'duree':
          comparison = a.dureeMinutes - b.dureeMinutes;
          break;
        case 'coefficient':
          comparison = a.coefficient - b.coefficient;
          break;
        default:
          comparison = a.nom.localeCompare(b.nom);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [groupedSubjects, searchTerm, selectedPromoFilter, selectedSemestreFilter, selectedRespFilter, sortField, sortDirection, teacherMap]);

  // Toggle sort direction or change field
  const handleSort = (field: SubjectSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Selection handlers
  const handleToggleSelect = (grpId: string) => {
    setSelectedGroupKeys(prev => {
      const next = new Set(prev);
      if (next.has(grpId)) next.delete(grpId);
      else next.add(grpId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGroupKeys.size === filteredAndSortedGroups.length) {
      setSelectedGroupKeys(new Set());
    } else {
      setSelectedGroupKeys(new Set(filteredAndSortedGroups.map(g => g.id)));
    }
  };

  const openNew = () => {
    setEditingGroup(null);
    setNom('');
    setCode('');
    setSelectedPromotions([]); // User requirement: No promotion selected by default
    setSemestre('Semestre impair');
    setDureeMinutes(90);
    setEnseignantResponsableId('');
    setCoefficient(2);
    setIsModalOpen(true);
  };

  const openEdit = (grp: GroupedSubjectItem) => {
    setEditingGroup(grp);
    setNom(grp.nom);
    setCode(grp.code);

    const grpCodeUpper = (grp.code || '').toUpperCase().trim();

    // Map existing promotions to canonical names
    let initialPromos = grp.promotions.map(pName => {
      const p = promotions.find(pr => 
        pr.nom === pName || 
        pr.nom.toLowerCase() === pName.toLowerCase() || 
        (pr.code && pr.code.toLowerCase() === pName.toLowerCase())
      );
      return p ? p.nom : pName;
    });

    // If no promotions are assigned at all to this group, fallback to default inferencing
    if (initialPromos.length === 0) {
      if (['MDF', 'HG', 'HYDRO', 'RDM-HYD', 'TOPO', 'GEO', 'MATH3', 'TB', 'OV'].includes(grpCodeUpper)) {
        initialPromos.push('2ème Année Licence Hydraulique');
      } else if (['HA', 'AMH', 'OCF', 'EEC', 'SIG', 'EE', 'PYTHON'].includes(grpCodeUpper)) {
        initialPromos.push('M1 Ressources en eau');
      }
    }

    setSelectedPromotions(Array.from(new Set(initialPromos)));
    setSemestre(grp.semestre || 'Semestre impair');
    setDureeMinutes(grp.dureeMinutes);
    setEnseignantResponsableId(grp.enseignantResponsableId || '');
    setCoefficient(grp.coefficient);
    setIsModalOpen(true);
  };

  // Toggle a promotion in multi-select
  const togglePromotionSelection = (promoName: string) => {
    setSelectedPromotions(prev => {
      const exists = prev.some(p => p === promoName || p.toLowerCase() === promoName.toLowerCase());
      if (exists) {
        return prev.filter(p => p !== promoName && p.toLowerCase() !== promoName.toLowerCase());
      } else {
        return [...prev, promoName];
      }
    });
  };

  const selectAllPromotions = () => {
    setSelectedPromotions(promotions.map(p => p.nom));
  };

  const clearAllPromotions = () => {
    setSelectedPromotions([]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !code.trim()) return;

    if (selectedPromotions.length === 0) {
      if (onNotify) {
        onNotify('warning', 'Promotion requise', 'Veuillez cocher au moins une promotion / filière pour cette matière.');
      } else {
        alert('Veuillez cocher au moins une promotion / filière pour cette matière.');
      }
      return;
    }

    const trimmedCode = code.toUpperCase().trim();
    const trimmedNom = nom.trim();
    const effectivePromotions: string[] = Array.from(new Set<string>(selectedPromotions.map(pName => {
      const matched = promotions.find(p => p.nom.toLowerCase() === pName.toLowerCase() || (p.code && p.code.toLowerCase() === pName.toLowerCase()));
      return matched ? matched.nom : pName;
    })));

    if (editingGroup) {
      // Remove all previous subject entries belonging to this group
      const remainingSubjects = subjects.filter(s => !editingGroup.subjectIds.includes(s.id));

      const commonGroupId = editingGroup.commonGroupId || (effectivePromotions.length > 1 ? `cgrp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : undefined);

      // Create updated entries for all selected promotions
      const updatedEntries: SubjectModule[] = effectivePromotions.map((pName, idx) => {
        const existing = editingGroup.originalSubjects.find(os => os.promotion === pName);
        return {
          id: existing ? existing.id : `sub-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          nom: trimmedNom,
          nomModule: trimmedNom,
          code: trimmedCode,
          codeModule: trimmedCode,
          promotion: pName,
          commonGroupId,
          sharedPromotions: effectivePromotions,
          semestre,
          dureeMinutes: Number(dureeMinutes) || 90,
          enseignantResponsableId,
          responsableId: enseignantResponsableId,
          coefficient: Number(coefficient) || 2
        };
      });

      // Synchronize exams across all checked promotions: exactly 1 planned exam per checked promotion
      if (onUpdateExams && exams) {
        const oldCodes = [editingGroup.code.toUpperCase(), ...editingGroup.originalSubjects.map(s => (s.code || s.codeModule || '').toUpperCase())];
        const oldNoms = [editingGroup.nom.toLowerCase(), ...editingGroup.originalSubjects.map(s => (s.nom || s.nomModule || '').toLowerCase())];
        const editingGroupPromosLower = new Set([
          ...editingGroup.promotions.map(p => p.toLowerCase().trim()),
          ...effectivePromotions.map(p => p.toLowerCase().trim())
        ]);

        const isMatchingModule = (e: Exam) => {
          const ec = (e.codeModule || '').toUpperCase().trim();
          const en = (e.nomModule || '').toLowerCase().trim();
          return (ec && (ec === trimmedCode || oldCodes.includes(ec))) ||
                 (en && (en === trimmedNom.toLowerCase() || oldNoms.includes(en)));
        };

        const matchingModuleExams = exams.filter(isMatchingModule);
        const otherExams = exams.filter(e => !isMatchingModule(e));

        const updatedModuleExams: Exam[] = [];
        const unusedExistingExams = [...matchingModuleExams];

        effectivePromotions.forEach((promoName, pIdx) => {
          const promoLower = promoName.trim().toLowerCase();
          const exactMatchIdx = unusedExistingExams.findIndex(
            e => (e.niveau || e.promotion || '').trim().toLowerCase() === promoLower
          );

          const promoObj = promoMap.get(promoName);

          if (exactMatchIdx !== -1) {
            const existing = unusedExistingExams.splice(exactMatchIdx, 1)[0];
            updatedModuleExams.push({
              ...existing,
              codeModule: trimmedCode,
              nomModule: trimmedNom,
              niveau: promoName,
              commonGroupId,
              sharedPromotions: effectivePromotions,
              responsableId: enseignantResponsableId || existing.responsableId,
              semestre: semestre.includes('2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)',
              specialite: promoObj?.filiere || existing.specialite || 'Générale',
              nbEtudiants: promoObj?.effectif || existing.nbEtudiants || 45
            });
          } else if (unusedExistingExams.length > 0) {
            // Reassign an exam from an obsolete / unchecked promotion (e.g. 1ère année Ing génie civil)
            const obsoleteExam = unusedExistingExams.shift()!;
            updatedModuleExams.push({
              ...obsoleteExam,
              codeModule: trimmedCode,
              nomModule: trimmedNom,
              niveau: promoName,
              commonGroupId,
              sharedPromotions: effectivePromotions,
              responsableId: enseignantResponsableId || obsoleteExam.responsableId,
              semestre: semestre.includes('2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)',
              specialite: promoObj?.filiere || 'Générale',
              nbEtudiants: promoObj?.effectif || obsoleteExam.nbEtudiants || 45
            });
          } else {
            // Create a new planned exam entry for this checked promotion
            updatedModuleExams.push({
              id: `ex-mod-${Date.now()}-${pIdx}-${Math.random().toString(36).substring(2, 6)}`,
              codeModule: trimmedCode,
              nomModule: trimmedNom,
              responsableId: enseignantResponsableId,
              date: '',
              heureDebut: '',
              heureFin: '',
              semestre: semestre.includes('2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)',
              session: 'Ordinaire',
              niveau: promoName,
              commonGroupId,
              sharedPromotions: effectivePromotions,
              departement: 'Département de Technologie',
              specialite: promoObj?.filiere || 'Générale',
              nbEtudiants: promoObj?.effectif || 45,
              salles: []
            });
          }
        });

        onUpdateExams([...otherExams, ...updatedModuleExams]);
      }

      onUpdateSubjects([...remainingSubjects, ...updatedEntries]);
      if (onNotify) {
        onNotify('success', t.editSubject, `La matière "${trimmedNom}" a été synchronisée : ${effectivePromotions.length} épreuve(s) planifiée(s) pour ${effectivePromotions.join(', ')}.`);
      }
    } else {
      // Creating new subject for all selected promotions
      const commonGroupId = effectivePromotions.length > 1 ? `cgrp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : undefined;
      const newItems: SubjectModule[] = effectivePromotions.map((pName, idx) => ({
        id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        nom: trimmedNom,
        nomModule: trimmedNom,
        code: trimmedCode,
        codeModule: trimmedCode,
        promotion: pName,
        commonGroupId,
        sharedPromotions: effectivePromotions,
        semestre,
        dureeMinutes: Number(dureeMinutes) || 90,
        enseignantResponsableId,
        responsableId: enseignantResponsableId,
        coefficient: Number(coefficient) || 2
      }));

      // Create planned exams for each checked promotion
      if (onUpdateExams && exams) {
        const promoLowerSet = new Set(effectivePromotions.map(p => p.trim().toLowerCase()));
        const otherExams = exams.filter(e => {
          const ec = (e.codeModule || '').toUpperCase().trim();
          const en = (e.nomModule || '').toLowerCase().trim();
          const ep = (e.niveau || e.promotion || '').trim().toLowerCase();
          const isSameModule = (ec && ec === trimmedCode) || (en && en === trimmedNom.toLowerCase());
          return !(isSameModule && promoLowerSet.has(ep));
        });

        const newExams: Exam[] = effectivePromotions.map((pName, pIdx) => {
          const promoObj = promoMap.get(pName);
          return {
            id: `ex-mod-${Date.now()}-${pIdx}-${Math.random().toString(36).substring(2, 6)}`,
            codeModule: trimmedCode,
            nomModule: trimmedNom,
            responsableId: enseignantResponsableId,
            date: '',
            heureDebut: '',
            heureFin: '',
            semestre: semestre.includes('2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)',
            session: 'Ordinaire',
            niveau: pName,
            commonGroupId,
            sharedPromotions: effectivePromotions,
            departement: 'Département de Technologie',
            specialite: promoObj?.filiere || 'Générale',
            nbEtudiants: promoObj?.effectif || 45,
            salles: []
          };
        });

        onUpdateExams([...otherExams, ...newExams]);
      }

      onUpdateSubjects([...subjects, ...newItems]);
      if (onNotify) {
        onNotify('success', t.newSubject, `Matière "${trimmedNom}" ajoutée : ${newItems.length} épreuve(s) planifiée(s) pour ${effectivePromotions.join(', ')}.`);
      }
    }

    setIsModalOpen(false);
  };

  const confirmDeleteGroup = (grp: GroupedSubjectItem) => {
    setGroupToDelete(grp);
  };

  const executeDeleteGroup = () => {
    if (!groupToDelete) return;
    if (onDeleteSubjectGroup) {
      onDeleteSubjectGroup(groupToDelete.code, groupToDelete.nom, groupToDelete.promotions, groupToDelete.subjectIds);
    } else {
      const toDeleteIds = new Set(groupToDelete.subjectIds);
      const updated = subjects.filter(s => !toDeleteIds.has(s.id));
      onUpdateSubjects(updated);

      if (onUpdateExams && exams.length > 0) {
        const grpCode = (groupToDelete.code || '').toUpperCase().trim();
        const grpNom = (groupToDelete.nom || '').toLowerCase().trim();
        const grpPromos = new Set(groupToDelete.promotions.map(p => p.toLowerCase().trim()));

        const remainingExams = exams.filter(e => {
          const eCode = (e.codeModule || '').toUpperCase().trim();
          const eNom = (e.nomModule || '').toLowerCase().trim();
          const ePromo = (e.niveau || '').toLowerCase().trim();
          const matchesModule = (grpCode && eCode === grpCode) || (grpNom && eNom === grpNom);
          if (matchesModule && (grpPromos.size === 0 || grpPromos.has(ePromo))) {
            return false;
          }
          return true;
        });
        if (remainingExams.length !== exams.length) {
          onUpdateExams(remainingExams);
        }
      }
      if (onNotify) {
        onNotify('info', t.deleteSubject, `La matière "${groupToDelete.nom}" (${groupToDelete.promotions.length} filière(s)) a été supprimée.`);
      }
    }

    setSelectedGroupKeys(prev => {
      const next = new Set(prev);
      next.delete(groupToDelete.id);
      return next;
    });
    setGroupToDelete(null);
  };

  const executeBulkDelete = () => {
    const selectedGrps = groupedSubjects.filter(g => selectedGroupKeys.has(g.id));
    const allIdsToDelete = new Set<string>();
    selectedGrps.forEach(g => g.subjectIds.forEach(id => allIdsToDelete.add(id)));

    const updated = subjects.filter(s => !allIdsToDelete.has(s.id));
    onUpdateSubjects(updated);

    if (onUpdateExams && exams.length > 0) {
      const remainingExams = exams.filter(e => {
        const eCode = (e.codeModule || '').toUpperCase().trim();
        const eNom = (e.nomModule || '').toLowerCase().trim();
        const ePromo = (e.niveau || '').toLowerCase().trim();

        const matchesAnyDeleted = selectedGrps.some(g => {
          const gCode = (g.code || '').toUpperCase().trim();
          const gNom = (g.nom || '').toLowerCase().trim();
          const gPromos = new Set(g.promotions.map(p => p.toLowerCase().trim()));
          const matches = (gCode && eCode === gCode) || (gNom && eNom === gNom);
          return matches && (gPromos.size === 0 || gPromos.has(ePromo));
        });

        return !matchesAnyDeleted;
      });
      if (remainingExams.length !== exams.length) {
        onUpdateExams(remainingExams);
      }
    }

    setSelectedGroupKeys(new Set());
    setIsBulkDeleteOpen(false);
    if (onNotify) {
      onNotify('info', t.delete, `${selectedGrps.length} matière(s) supprimée(s).`);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    ExportUtils.exportSubjectsCSV(subjects, teacherMap);
    if (onNotify) onNotify('success', 'Export CSV', 'Catalogue des matières exporté en CSV avec succès.');
  };

  const handleExportJSON = () => {
    ExportUtils.exportSubjectsJSON(subjects);
    if (onNotify) onNotify('success', 'Export JSON', 'Catalogue exporté en JSON avec succès.');
  };

  return (
    <div className="p-4 flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700/40">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2 rtl:space-x-reverse">
            <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>{t.subjects} ({filteredAndSortedGroups.length} matières uniques / {subjects.length} affectations)</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Catalogue unifié des matières : les promotions et filières associées à une même matière sont regroupées dans la même case.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 w-44 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 rtl:left-auto rtl:right-2.5" />
          </div>

          {/* Promotion Filter */}
          <select
            value={selectedPromoFilter}
            onChange={(e) => setSelectedPromoFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
          >
            <option value="ALL">Toutes les promotions ({promotions.length})</option>
            {sortedPromotions.map(p => (
              <option key={p.id} value={p.nom}>{p.nom} ({p.filiere})</option>
            ))}
          </select>

          {/* Semestre Filter */}
          <select
            value={selectedSemestreFilter}
            onChange={(e) => setSelectedSemestreFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
          >
            <option value="ALL">Tous les semestres</option>
            {SEMESTER_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Quick A-Z / Z-A Sorting Button */}
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-teal-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse border border-slate-300 transition shadow-2xs"
            title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" />
            <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
          </button>

          {/* Sort Field Selector */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SubjectSortField)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
            title="Critère de tri"
          >
            <option value="nom">Trier par : Nom de Matière</option>
            <option value="code">Trier par : Code Module</option>
            <option value="promotions">Trier par : Promotions / Filières</option>
            <option value="responsable">Trier par : Enseignant Responsable</option>
            <option value="semestre">Trier par : Semestre</option>
            <option value="duree">Trier par : Durée</option>
            <option value="coefficient">Trier par : Coefficient</option>
          </select>

          {/* Export Buttons */}
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse border border-slate-300 transition shadow-2xs"
              title="Exporter en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse border border-slate-300 transition shadow-2xs"
              title="Exporter en JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'table' ? 'bg-teal-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue Tableau"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'cards' ? 'bg-teal-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Attribuer une salle */}
          {onOpenRoomAssignment && (
            <button
              type="button"
              onClick={() => onOpenRoomAssignment()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition"
              title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
            >
              <DoorClosed className="w-4 h-4" />
              <span>Attribuer une salle</span>
            </button>
          )}

          {/* Add New Subject */}
          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newSubject}</span>
          </button>
        </div>
      </div>

      {/* Bulk actions banner if selected */}
      {selectedGroupKeys.size > 0 && (
        <div className="mb-3 px-4 py-2 bg-teal-950/40 border border-teal-500/40 rounded-xl flex items-center justify-between text-xs text-teal-200 animate-in fade-in">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="font-bold">{selectedGroupKeys.size} matière(s) sélectionnée(s)</span>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center space-x-1 rtl:space-x-reverse transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer la sélection</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroupKeys(new Set())}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Table or Grid Cards */}
      {viewMode === 'table' ? (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <table className="w-full text-xs text-left rtl:text-right text-[var(--text-primary)]">
            <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-[var(--text-muted)] border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {selectedGroupKeys.size === filteredAndSortedGroups.length && filteredAndSortedGroups.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                
                {/* Clickable sortable columns */}
                <th 
                  onClick={() => handleSort('code')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.moduleCode}</span>
                    {sortField === 'code' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('nom')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.module}</span>
                    {sortField === 'nom' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('promotions')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none min-w-[220px]"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Promotions & Filières concernées</span>
                    {sortField === 'promotions' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('semestre')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.semester}</span>
                    {sortField === 'semestre' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('duree')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.duration}</span>
                    {sortField === 'duree' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('coefficient')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Coeff</span>
                    {sortField === 'coefficient' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('responsable')}
                  className="px-4 py-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-300 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.assignedResponsible}</span>
                    {sortField === 'responsable' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </th>

                <th className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-400">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <DoorClosed className="w-3.5 h-3.5" />
                    <span>Salle(s)</span>
                  </div>
                </th>

                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredAndSortedGroups.map(grp => {
                const resp = grp.enseignantResponsableId ? teacherMap.get(grp.enseignantResponsableId) : undefined;
                const isSelected = selectedGroupKeys.has(grp.id);
                const plannedExams = getPlannedExamsForGroup(grp);
                const isPlanned = plannedExams.length > 0;
                const isMultiPromo = grp.promotions.length > 1;

                return (
                  <tr 
                    key={grp.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${isSelected ? 'bg-teal-50 dark:bg-teal-950/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(grp.id)}
                        className="text-slate-400 hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-300">
                      {grp.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5">
                        <span>{grp.nom}</span>
                        {isMultiPromo && (
                          <span 
                            className="p-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30" 
                            title="Matière commune à plusieurs promotions (programmée le même jour et à la même heure)"
                          >
                            <Link2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Single combined cell for all promotions & filières */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                        {grp.promotions.map(promoName => {
                          const promo = promoMap.get(promoName);
                          return (
                            <span 
                              key={promoName}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs"
                              style={{
                                backgroundColor: `${promo?.couleur || '#3b82f6'}18`,
                                color: promo?.couleur || '#2563eb',
                                borderColor: `${promo?.couleur || '#3b82f6'}40`
                              }}
                            >
                              <span 
                                className="w-1.5 h-1.5 rounded-full mr-1.5 rtl:mr-0 rtl:ml-1.5" 
                                style={{ backgroundColor: promo?.couleur || '#3b82f6' }} 
                              />
                              <span>{promoName}</span>
                              {promo?.filiere && (
                                <span className="text-[9px] opacity-80 ml-1 rtl:ml-0 rtl:mr-1">
                                  ({promo.filiere})
                                </span>
                              )}
                            </span>
                          );
                        })}
                        {isMultiPromo && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                            {grp.promotions.length} filières groupées
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                        {grp.semestre}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {grp.dureeMinutes} min
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                      {grp.coefficient}
                    </td>
                    <td className="px-4 py-3">
                      {resp ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {resp.nom} {resp.prenom}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400/80 italic text-[11px]">
                          Non assigné
                        </span>
                      )}
                    </td>

                    {/* Salle(s) assignée(s) */}
                    <td className="px-4 py-3">
                      {(() => {
                        const assignedRooms = getAssignedRoomsForGroup(grp);
                        if (assignedRooms) {
                          return (
                            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                              {assignedRooms}
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                              Pas de salle
                            </span>
                          );
                        }
                      })()}
                    </td>

                    <td className="px-4 py-3">
                      {isPlanned ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Planifié ({plannedExams.length})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left">
                      <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse">
                        {onOpenRoomAssignment && (
                          <button
                            type="button"
                            onClick={() => onOpenRoomAssignment({ subjectCode: grp.code, subjectNom: grp.nom, promoNames: grp.promotions })}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition shadow-2xs"
                            title="Attribuer une ou des salles à cette matière et ses promotions"
                          >
                            <DoorClosed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Salle</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(grp)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition shadow-2xs"
                          title={t.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteGroup(grp)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition shadow-2xs"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedGroups.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    Aucune matière ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {filteredAndSortedGroups.map(grp => {
            const resp = grp.enseignantResponsableId ? teacherMap.get(grp.enseignantResponsableId) : undefined;
            const isSelected = selectedGroupKeys.has(grp.id);
            const plannedExams = getPlannedExamsForGroup(grp);
            const isPlanned = plannedExams.length > 0;
            const isMultiPromo = grp.promotions.length > 1;

            return (
              <div
                key={grp.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between shadow-xs dark:shadow-md group relative ${
                  isSelected 
                    ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-500 ring-1 ring-teal-500/50' 
                    : 'bg-white dark:bg-slate-850/80 border-slate-200 dark:border-slate-700/60 hover:border-teal-500/50 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(grp.id)}
                        className="text-slate-400 hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400 transition"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className="text-[11px] px-2 py-0.5 bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 rounded font-mono font-bold">
                        {grp.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isMultiPromo && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 rounded font-bold flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          <span>{grp.promotions.length} filières</span>
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold border border-slate-200 dark:border-slate-700">
                        {grp.semestre}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{grp.nom}</span>
                  </h3>

                  <div className="text-xs text-[var(--text-muted)] mt-3 space-y-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {/* Promotions & Filières in same case */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Promotions & Filières concernées :</span>
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">{grp.promotions.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {grp.promotions.map(pName => {
                          const promo = promoMap.get(pName);
                          return (
                            <span 
                              key={pName}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                              style={{
                                backgroundColor: `${promo?.couleur || '#3b82f6'}20`,
                                color: promo?.couleur || '#2563eb',
                                borderColor: `${promo?.couleur || '#3b82f6'}40`
                              }}
                            >
                              {pName} {promo?.filiere ? `(${promo.filiere})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                      <span className="flex items-center space-x-1 rtl:space-x-reverse text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{t.duration} & Coeff :</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{grp.dureeMinutes} min (Coeff {grp.coefficient})</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t.assignedResponsible} :</span>
                      <span className={resp ? 'text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[140px]' : 'text-amber-600 dark:text-amber-400 italic text-[11px]'}>
                        {resp ? `${resp.nom} ${resp.prenom}` : 'Non assigné'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/40">
                  {isPlanned ? (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{plannedExams.length} épreuve(s)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Non planifié</span>
                  )}

                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => openEdit(grp)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition shadow-2xs"
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeleteGroup(grp)}
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition shadow-2xs"
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Group Delete */}
      <ConfirmDialog
        isOpen={!!groupToDelete}
        title={t.deleteSubject}
        message={`Voulez-vous vraiment supprimer la matière "${groupToDelete?.nom}" pour toutes les promotions concernées (${groupToDelete?.promotions.join(', ')}) ?`}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        isDangerous={true}
        onConfirm={executeDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
      />

      {/* Confirmation Dialog for Bulk Delete */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        title="Supprimer les matières sélectionnées"
        message={`Êtes-vous sûr de vouloir supprimer définitivement les ${selectedGroupKeys.size} matière(s) sélectionnée(s) ?`}
        confirmLabel="Tout supprimer"
        cancelLabel={t.cancel}
        isDangerous={true}
        onConfirm={executeBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />

      {/* Modal Add / Edit Subject with Multi-Promotion Selection */}
      <Modal
        isOpen={isModalOpen}
        title={editingGroup ? t.editSubject : t.newSubject}
        subtitle="Gestion des modules, durées, coefficients et filières associées"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {t.moduleCode} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex. INFO301, MATH101"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {t.module} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex. Algorithmique & Structures de Données"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Multiple Promotions Checkbox Selector */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-bold flex items-center space-x-1.5 rtl:space-x-reverse">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                <span>Promotions & Filières concernées ({selectedPromotions.length} sélectionnée(s))</span>
              </label>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={selectAllPromotions}
                  className="text-[11px] text-teal-600 hover:text-teal-700 underline font-semibold"
                >
                  Tout sélectionner
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={clearAllPromotions}
                  className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-teal-800">Règle de programmation :</span> Les promotions cochées ensemble ci-dessous partagent cette matière et seront <span className="font-semibold text-teal-800">obligatoirement programmées au même créneau</span> (même date et heure). Si vous souhaitez programmer cette matière à des dates différentes selon les promotions (ex: &quot;béton précontraint&quot; pour M2 structures et M2 matériaux à des dates distinctes), cochez une seule promotion et ajoutez une entrée distincte pour l&apos;autre.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-lg bg-white">
              {sortedPromotions.map(promo => {
                const isChecked = selectedPromotions.some(p => 
                  p === promo.nom || 
                  p.toLowerCase() === promo.nom.toLowerCase() ||
                  (promo.code && p.toLowerCase() === promo.code.toLowerCase())
                );
                return (
                  <label
                    key={promo.id}
                    onClick={() => togglePromotionSelection(promo.nom)}
                    className={`flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg transition border cursor-pointer ${
                      isChecked
                        ? 'bg-teal-50 border-teal-400 text-teal-900 shadow-2xs font-semibold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      isChecked
                        ? 'bg-teal-600 border-teal-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 truncate">
                          {promo.code && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200 shrink-0">
                              {promo.code}
                            </span>
                          )}
                          <span className="truncate">{promo.nom}</span>
                        </span>
                        <span 
                          className="w-2.5 h-2.5 rounded-full ml-1 shrink-0 border border-slate-200" 
                          style={{ backgroundColor: promo.couleur || '#3b82f6' }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {promo.filiere || 'Filière générale'} • {promo.effectif} étud.
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {t.semester}
              </label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {t.duration} (Minutes)
              </label>
              <input
                type="number"
                min="30"
                max="240"
                step="15"
                value={dureeMinutes}
                onChange={(e) => setDureeMinutes(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {t.coefficient}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={coefficient}
                onChange={(e) => setCoefficient(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {t.assignedResponsible}
            </label>
            <select
              value={enseignantResponsableId}
              onChange={(e) => setEnseignantResponsableId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="">-- Aucun enseignant assigné --</option>
              {sortedTeachers.map(tc => (
                <option key={tc.id} value={tc.id}>
                  {tc.nom} {tc.prenom} ({formatGrade(tc.grade)}{tc.specialite ? ` - ${tc.specialite}` : ''})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm transition"
            >
              {editingGroup ? t.save : t.add}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
