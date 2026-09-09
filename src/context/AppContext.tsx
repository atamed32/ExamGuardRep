import React, { createContext, useContext, useReducer, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  Teacher,
  Room,
  Exam,
  PromotionGroup,
  SubjectModule,
  TimeSlot,
  TimeOffEntry,
  SessionConfig,
  GlobalConstraints,
  Substitution,
  ExamAttendance,
  InstitutionSettings,
  Language,
  ConflictAlert,
  ResolvedExam,
  Group,
  Subject
} from '../types';
import { StorageService } from '../services/storage';
import { ConflictEngine } from '../services/conflictEngine';
import { ToastMessage } from '../components/common/Toast';
import { sanitizeAndLinkExamsWithSubjects } from '../utils/dataLinkUtils';

// ============================================================================
// Types & Cascade Impact Data Contracts
// ============================================================================

export interface ImpactedSlotDetail {
  examId: string;
  moduleCode: string;
  moduleName: string;
  promotion: string;
  date: string;
  creneau: string; // e.g. "08:30 - 10:00"
  salle?: string;
  impactDescription: string;
}

export interface CascadeImpactAlert {
  id: string;
  entityType: 'room' | 'teacher' | 'promotion' | 'subject' | 'timeslot';
  entityId: string;
  entityName: string;
  action: 'delete' | 'update';
  timestamp: number;
  title: string;
  summary: string;
  impactedSlots: ImpactedSlotDetail[];
}

export interface AppState {
  // Master Normalized Stores (Single Source of Truth keyed by inalterable ID)
  teachersById: Record<string, Teacher>;
  roomsById: Record<string, Room>;
  subjectsById: Record<string, SubjectModule>;
  groupsById: Record<string, PromotionGroup>;

  teachers: Teacher[];
  rooms: Room[];
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  exams: Exam[];
  sessionConfig: SessionConfig;
  timeOffConstraints: TimeOffEntry[];
  globalConstraints: GlobalConstraints;
  substitutions: Substitution[];
  attendances: ExamAttendance[];
  settings: InstitutionSettings;
  language: Language;
  toasts: ToastMessage[];
  cascadeAlert: CascadeImpactAlert | null;
  lastAutoSaveTrigger: number;
}

// Action Types for Reducer
export type AppAction =
  | { type: 'SET_INITIAL_DATA'; payload: Partial<AppState> }
  | { type: 'SAVE_TEACHER'; payload: Teacher }
  | { type: 'DELETE_TEACHER'; payload: { teacherId: string } }
  | { type: 'SAVE_ROOM'; payload: Room }
  | { type: 'DELETE_ROOM'; payload: { roomId: string } }
  | { type: 'SAVE_PROMOTION'; payload: PromotionGroup }
  | { type: 'UPDATE_PROMOTIONS'; payload: PromotionGroup[] }
  | { type: 'DELETE_PROMOTION'; payload: { promoId: string } }
  | { type: 'SAVE_SUBJECT'; payload: SubjectModule }
  | { type: 'UPDATE_SUBJECTS'; payload: SubjectModule[] }
  | { type: 'DELETE_SUBJECT'; payload: { subjectId: string } }
  | { type: 'DELETE_SUBJECT_GROUP'; payload: { code: string; nom: string; promotions: string[]; subjectIds: string[] } }
  | { type: 'SAVE_EXAM'; payload: Exam }
  | { type: 'UPDATE_EXAMS'; payload: Exam[] }
  | { type: 'DELETE_EXAM'; payload: { examId: string } }
  | { type: 'SAVE_TIME_SLOT'; payload: TimeSlot }
  | { type: 'DELETE_TIME_SLOT'; payload: { slotId: string } }
  | { type: 'UPDATE_SESSION_CONFIG'; payload: SessionConfig }
  | { type: 'UPDATE_TIMEOFF'; payload: TimeOffEntry[] }
  | { type: 'UPDATE_GLOBAL_CONSTRAINTS'; payload: GlobalConstraints }
  | { type: 'UPDATE_SUBSTITUTIONS'; payload: Substitution[] }
  | { type: 'UPDATE_ATTENDANCES'; payload: ExamAttendance[] }
  | { type: 'UPDATE_SETTINGS'; payload: InstitutionSettings }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: { id: string } }
  | { type: 'SET_CASCADE_ALERT'; payload: CascadeImpactAlert | null }
  | { type: 'DISMISS_CASCADE_ALERT' }
  | { type: 'RELOAD_FROM_STORAGE' };

// ============================================================================
// Helper Utilities for Unique IDs & Formatting
// ============================================================================

export function generateEntityId(prefix: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${randomStr}`;
}

// Initial State Provider with Full Normalization
function getInitialState(overrideData?: Partial<{
  settings: InstitutionSettings;
  sessionConfig: SessionConfig;
  teachers: Teacher[];
  rooms: Room[];
  exams: Exam[];
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  timeOffConstraints: TimeOffEntry[];
  globalConstraints: GlobalConstraints;
  substitutions: Substitution[];
  attendance: ExamAttendance[];
  language?: Language;
}>): AppState {
  const rawTeachers = overrideData && overrideData.teachers !== undefined ? overrideData.teachers : StorageService.getTeachers();
  const rawRooms = overrideData && overrideData.rooms !== undefined ? overrideData.rooms : StorageService.getRooms();
  const rawPromotions = overrideData && overrideData.promotions !== undefined ? overrideData.promotions : StorageService.getPromotions();
  const rawSubjects = overrideData && overrideData.subjects !== undefined ? overrideData.subjects : StorageService.getSubjects();
  const rawExams = overrideData && overrideData.exams !== undefined ? overrideData.exams : StorageService.getExams();

  // Normalize Teachers with inalterable IDs
  const teachers = rawTeachers.map(t => ({ ...t, id: t.id || generateEntityId('t') }));
  const rooms = rawRooms.map(r => ({ ...r, id: r.id || generateEntityId('r') }));
  const promotions = rawPromotions.map(p => ({ ...p, id: p.id || generateEntityId('promo') }));

  const promoNameToId = new Map(promotions.map(p => [p.nom.trim().toLowerCase(), p.id]));
  const promoCodeToId = new Map(promotions.filter(p => p.code).map(p => [p.code!.trim().toLowerCase(), p.id]));
  const groupsById: Record<string, PromotionGroup> = Object.fromEntries(promotions.map(p => [p.id, p]));

  // Normalize Subjects with pointer to promotionId & canonical promotion names
  const subjects = rawSubjects.map(s => {
    const validId = s.id || generateEntityId('sub');
    let pId = s.promotionId;
    if (!pId && s.promotion) {
      const pNomLow = s.promotion.trim().toLowerCase();
      pId = promoNameToId.get(pNomLow) || promoCodeToId.get(pNomLow);
    }
    const canonicalNom = (pId && groupsById[pId]) ? groupsById[pId].nom : s.promotion;

    // Canonicalize sharedPromotions
    let updatedShared = s.sharedPromotions;
    if (s.sharedPromotions && s.sharedPromotions.length > 0) {
      updatedShared = s.sharedPromotions.map(sp => {
        const spLow = sp.trim().toLowerCase();
        const matchedPId = promoNameToId.get(spLow) || promoCodeToId.get(spLow);
        return (matchedPId && groupsById[matchedPId]) ? groupsById[matchedPId].nom : sp;
      });
    }

    return {
      ...s,
      id: validId,
      promotionId: pId,
      promotion: canonicalNom,
      sharedPromotions: updatedShared
    };
  });

  const subjectCodeMap = new Map(subjects.map(s => [(s.code || s.codeModule || '').trim().toUpperCase(), s]));
  const subjectNomMap = new Map(subjects.map(s => [(s.nom || s.nomModule || '').trim().toLowerCase(), s]));
  const subjectsById: Record<string, SubjectModule> = Object.fromEntries(subjects.map(s => [s.id, s]));

  // Normalize Exams: link subjectId, promotionId, room teacherIds, and keep synchronized
  const normalizedExams = rawExams.map(ex => {
    const validId = ex.id || generateEntityId('ex');
    let subId = ex.subjectId;
    if (!subId) {
      const codeUp = (ex.codeModule || '').trim().toUpperCase();
      const nomLow = (ex.nomModule || '').trim().toLowerCase();
      const matched = (codeUp && subjectCodeMap.get(codeUp)) || (nomLow && subjectNomMap.get(nomLow));
      if (matched) subId = matched.id;
    }
    let pId = ex.promotionId;
    if (!pId) {
      const pName = (ex.niveau || ex.promotion || '').trim().toLowerCase();
      if (pName) {
        pId = promoNameToId.get(pName) || promoCodeToId.get(pName);
      }
    }

    const canonicalPromoNom = (pId && groupsById[pId]) ? groupsById[pId].nom : (ex.niveau || ex.promotion);

    // Canonicalize sharedPromotions on exam
    let updatedShared = ex.sharedPromotions;
    if (ex.sharedPromotions && ex.sharedPromotions.length > 0) {
      updatedShared = ex.sharedPromotions.map(sp => {
        const spLow = sp.trim().toLowerCase();
        const matchedPId = promoNameToId.get(spLow) || promoCodeToId.get(spLow);
        return (matchedPId && groupsById[matchedPId]) ? groupsById[matchedPId].nom : sp;
      });
    }

    let codeModule = ex.codeModule;
    let nomModule = ex.nomModule;
    let responsableId = ex.responsableId;
    if (subId && subjectsById[subId]) {
      const sub = subjectsById[subId];
      codeModule = sub.code || sub.codeModule || codeModule;
      nomModule = sub.nom || sub.nomModule || nomModule;
      responsableId = sub.enseignantResponsableId || sub.responsableId || responsableId;
    }

    const salles = (ex.salles || []).map(s => ({
      ...s,
      teacherIds: s.teacherIds || (s.surveillants || []).map(sv => sv.teacherId)
    }));

    return {
      ...ex,
      id: validId,
      subjectId: subId,
      promotionId: pId,
      niveau: canonicalPromoNom,
      promotion: canonicalPromoNom,
      codeModule,
      nomModule,
      responsableId,
      sharedPromotions: updatedShared,
      salles
    };
  });

  const exams = sanitizeAndLinkExamsWithSubjects(normalizedExams, subjects);
  if (exams.length !== rawExams.length) {
    StorageService.saveExams(exams);
  }

  // Master Normalization Tables: { [id: string]: Entity }
  const teachersById: Record<string, Teacher> = Object.fromEntries(teachers.map(t => [t.id, t]));
  const roomsById: Record<string, Room> = Object.fromEntries(rooms.map(r => [r.id, r]));

  return {
    teachersById,
    roomsById,
    subjectsById,
    groupsById,
    teachers,
    rooms,
    promotions,
    subjects,
    exams,
    sessionConfig: overrideData && overrideData.sessionConfig !== undefined ? overrideData.sessionConfig : StorageService.getSessionConfig(),
    timeOffConstraints: overrideData && overrideData.timeOffConstraints !== undefined ? overrideData.timeOffConstraints : StorageService.getTimeOff(),
    globalConstraints: overrideData && overrideData.globalConstraints !== undefined ? overrideData.globalConstraints : StorageService.getGlobalConstraints(),
    substitutions: overrideData && overrideData.substitutions !== undefined ? overrideData.substitutions : StorageService.getSubstitutions(),
    attendances: overrideData && overrideData.attendance !== undefined ? overrideData.attendance : StorageService.getAttendances(),
    settings: overrideData && overrideData.settings !== undefined ? overrideData.settings : StorageService.getSettings(),
    language: overrideData && overrideData.language !== undefined ? overrideData.language : StorageService.getLanguage(),
    toasts: [],
    cascadeAlert: null,
    lastAutoSaveTrigger: 0,
  };
}

// ============================================================================
// Reducer with Reactive Updates & Cascade Deletion Logic
// ============================================================================

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ------------------------------------------------------------------------
    // TEACHERS
    // ------------------------------------------------------------------------
    // TEACHERS
    // ------------------------------------------------------------------------
    case 'SAVE_TEACHER': {
      const teacher = action.payload;
      const validId = teacher.id || generateEntityId('t');
      const normalizedTeacher = { ...teacher, id: validId };
      const exists = state.teachers.some(t => t.id === validId);

      const updatedTeachers = exists
        ? state.teachers.map(t => (t.id === validId ? normalizedTeacher : t))
        : [...state.teachers, normalizedTeacher];

      const newTeachersById: Record<string, Teacher> = {
        ...state.teachersById,
        [validId]: normalizedTeacher
      };

      StorageService.saveTeachers(updatedTeachers);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Enseignant modifié' : 'Enseignant ajouté',
        message: `${normalizedTeacher.nom} ${normalizedTeacher.prenom} est immédiatement disponible dans toutes les vues et sélecteurs.`
      };

      return {
        ...state,
        teachers: updatedTeachers,
        teachersById: newTeachersById,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_TEACHER': {
      const { teacherId } = action.payload;
      const targetTeacher = state.teachers.find(t => t.id === teacherId);
      const teacherDisplayName = targetTeacher ? `${targetTeacher.nom} ${targetTeacher.prenom}` : teacherId;

      // 1. Compile all impacted slots & roles before deletion
      const impactedSlots: ImpactedSlotDetail[] = [];
      const roomMap = new Map<string, Room>(state.rooms.map(r => [r.id, r]));

      state.exams.forEach(ex => {
        const isResp = ex.responsableId === teacherId;
        const matchingSurvInRooms: { roomNom: string; role: string }[] = [];

        (ex.salles || []).forEach(s => {
          (s.surveillants || []).forEach(sv => {
            if (sv.teacherId === teacherId) {
              const rNom = roomMap.get(s.roomId)?.nom || s.roomId;
              matchingSurvInRooms.push({ roomNom: rNom, role: sv.role || 'Surveillant' });
            }
          });
        });

        if (isResp || matchingSurvInRooms.length > 0) {
          const impactParts: string[] = [];
          if (isResp) impactParts.push('Responsable retiré');
          if (matchingSurvInRooms.length > 0) {
            matchingSurvInRooms.forEach(m => {
              impactParts.push(`${m.role} retiré de ${m.roomNom}`);
            });
          }

          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: ex.niveau || ex.promotion || '',
            date: ex.date || 'Non planifié',
            creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
            impactDescription: impactParts.join(' • ')
          });
        }
      });

      // 2. Cascade cleanup in Exams (pointers cleaned)
      const updatedExams = state.exams.map(ex => ({
        ...ex,
        responsableId: ex.responsableId === teacherId ? '' : ex.responsableId,
        salles: (ex.salles || []).map(s => {
          const survs = (s.surveillants || []).filter(sv => sv.teacherId !== teacherId);
          return {
            ...s,
            surveillants: survs,
            teacherIds: (s.teacherIds || []).filter(tid => tid !== teacherId)
          };
        })
      }));

      // 3. Cascade cleanup in Subjects catalog
      const updatedSubjects = state.subjects.map(s => ({
        ...s,
        responsableId: s.responsableId === teacherId ? '' : s.responsableId,
        enseignantResponsableId: s.enseignantResponsableId === teacherId ? '' : s.enseignantResponsableId
      }));

      // 4. Cascade cleanup in Substitutions & Attendances
      const updatedSubs = state.substitutions.filter(s => s.demandeurId !== teacherId && s.remplacantId !== teacherId);
      const updatedAtt = state.attendances.filter(a => a.teacherId !== teacherId);
      const updatedTimeOff = state.timeOffConstraints.filter(to => !(to.entityId === teacherId && to.entityType === 'teacher'));

      // 5. Remove teacher
      const updatedTeachers = state.teachers.filter(t => t.id !== teacherId);
      const newTeachersById = { ...state.teachersById };
      delete newTeachersById[teacherId];

      // Persist to storage
      StorageService.saveTeachers(updatedTeachers);
      StorageService.saveExams(updatedExams);
      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveSubstitutions(updatedSubs);
      StorageService.saveAttendances(updatedAtt);
      StorageService.saveTimeOff(updatedTimeOff);

      // Build Cascade Alert
      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'teacher',
        entityId: teacherId,
        entityName: teacherDisplayName,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Enseignant « ${teacherDisplayName} »`,
        summary: `${impactedSlots.length} créneau(x) d'épreuve impacté(s). Toutes les surveillances et responsabilités ont été automatiquement libérées.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: impactedSlots.length > 0 ? 'warning' : 'info',
        title: 'Enseignant supprimé en cascade',
        message: impactedSlots.length > 0
          ? `${teacherDisplayName} a été retiré. ${impactedSlots.length} créneau(x) d'examen ont été immédiatement libérés.`
          : `${teacherDisplayName} a été retiré du système.`
      };

      return {
        ...state,
        teachers: updatedTeachers,
        teachersById: newTeachersById,
        exams: updatedExams,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        substitutions: updatedSubs,
        attendances: updatedAtt,
        timeOffConstraints: updatedTimeOff,
        cascadeAlert: null,
        toasts: [...state.toasts, toast]
      };
    }

    // ------------------------------------------------------------------------
    // ROOMS
    // ------------------------------------------------------------------------
    case 'SAVE_ROOM': {
      const room = action.payload;
      const validId = room.id || generateEntityId('r');
      const normalizedRoom = { ...room, id: validId };
      const exists = state.rooms.some(r => r.id === validId);

      const updatedRooms = exists
        ? state.rooms.map(r => (r.id === validId ? normalizedRoom : r))
        : [...state.rooms, normalizedRoom];

      const newRoomsById: Record<string, Room> = {
        ...state.roomsById,
        [validId]: normalizedRoom
      };

      StorageService.saveRooms(updatedRooms);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Salle modifiée' : 'Salle ajoutée',
        message: `${normalizedRoom.nom} (${normalizedRoom.type}) est immédiatement disponible dans les affectations et le planning.`
      };

      return {
        ...state,
        rooms: updatedRooms,
        roomsById: newRoomsById,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_ROOM': {
      const { roomId } = action.payload;
      const targetRoom = state.rooms.find(r => r.id === roomId);
      const roomDisplayName = targetRoom ? targetRoom.nom : roomId;

      // 1. Compile all impacted slots where this room was assigned
      const impactedSlots: ImpactedSlotDetail[] = [];

      state.exams.forEach(ex => {
        const roomAssignment = (ex.salles || []).find(s => s.roomId === roomId);
        if (roomAssignment) {
          const survCount = (roomAssignment.surveillants || []).length;
          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: ex.niveau || ex.promotion || '',
            date: ex.date || 'Non planifié',
            creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
            salle: roomDisplayName,
            impactDescription: `Local libéré (${survCount} surveillant(s) réassignable(s))`
          });
        }
      });

      // 2. Cascade cleanup in Exams (strip room from exam.salles)
      const updatedExams = state.exams.map(ex => ({
        ...ex,
        salles: (ex.salles || []).filter(s => s.roomId !== roomId)
      }));

      // 3. Cascade cleanup in Substitutions & Attendances
      const updatedSubs = state.substitutions.filter(s => s.roomId !== roomId);
      const updatedAtt = state.attendances.filter(a => a.roomId !== roomId);
      const updatedTimeOff = state.timeOffConstraints.filter(to => !(to.entityId === roomId && to.entityType === 'room'));

      // 4. Remove room
      const updatedRooms = state.rooms.filter(r => r.id !== roomId);
      const newRoomsById = { ...state.roomsById };
      delete newRoomsById[roomId];

      // Persist to storage
      StorageService.saveRooms(updatedRooms);
      StorageService.saveExams(updatedExams);
      StorageService.saveSubstitutions(updatedSubs);
      StorageService.saveAttendances(updatedAtt);
      StorageService.saveTimeOff(updatedTimeOff);

      // Build Cascade Alert
      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'room',
        entityId: roomId,
        entityName: roomDisplayName,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Salle « ${roomDisplayName} »`,
        summary: `${impactedSlots.length} créneau(x) d'épreuve libéré(s). Le local a été retiré de toutes les grilles et modales d'affectation.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: impactedSlots.length > 0 ? 'warning' : 'info',
        title: 'Salle supprimée en cascade',
        message: impactedSlots.length > 0
          ? `Local « ${roomDisplayName} » supprimé. ${impactedSlots.length} créneau(x) d'épreuve désaffecté(s).`
          : `Local « ${roomDisplayName} » supprimé.`
      };

      return {
        ...state,
        rooms: updatedRooms,
        roomsById: newRoomsById,
        exams: updatedExams,
        substitutions: updatedSubs,
        attendances: updatedAtt,
        timeOffConstraints: updatedTimeOff,
        cascadeAlert: null,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    // ------------------------------------------------------------------------
    // PROMOTIONS
    // ------------------------------------------------------------------------
    case 'SAVE_PROMOTION': {
      const promo = action.payload;
      const validId = promo.id || generateEntityId('promo');
      const normalizedPromo = { ...promo, id: validId };
      const existingPromo = state.promotions.find(p => p.id === validId);
      const exists = Boolean(existingPromo);
      const oldNom = existingPromo?.nom || '';
      const oldCode = existingPromo?.code || '';
      const oldNomLower = oldNom.trim().toLowerCase();
      const oldCodeUpper = oldCode.trim().toUpperCase();

      const updatedPromotions = exists
        ? state.promotions.map(p => (p.id === validId ? normalizedPromo : p))
        : [...state.promotions, normalizedPromo];

      const newGroupsById: Record<string, PromotionGroup> = {
        ...state.groupsById,
        [validId]: normalizedPromo
      };

      // Cascade update to subjects if name, code, or any field changed
      let updatedSubjects = state.subjects;
      if (exists && (oldNom !== normalizedPromo.nom || oldCode !== normalizedPromo.code)) {
        updatedSubjects = state.subjects.map(s => {
          const isTargetPromo = s.promotionId === validId || 
            (s.promotion && s.promotion.trim().toLowerCase() === oldNomLower) ||
            (oldCodeUpper && s.promotion && s.promotion.trim().toUpperCase() === oldCodeUpper);
            
          let updatedShared = s.sharedPromotions;
          if (s.sharedPromotions && s.sharedPromotions.length > 0) {
            updatedShared = s.sharedPromotions.map(sp => 
              sp.trim().toLowerCase() === oldNomLower ? normalizedPromo.nom : sp
            );
          }

          if (isTargetPromo || (updatedShared && JSON.stringify(updatedShared) !== JSON.stringify(s.sharedPromotions))) {
            return {
              ...s,
              promotionId: isTargetPromo ? validId : s.promotionId,
              promotion: isTargetPromo ? normalizedPromo.nom : s.promotion,
              sharedPromotions: updatedShared || s.sharedPromotions
            };
          }
          return s;
        });
        StorageService.saveSubjects(updatedSubjects);
      }

      // Cascade update to exams if name, code, filiere, or effectif changed
      let updatedExams = state.exams;
      if (exists && (oldNom !== normalizedPromo.nom || oldCode !== normalizedPromo.code || existingPromo.filiere !== normalizedPromo.filiere || existingPromo.effectif !== normalizedPromo.effectif)) {
        updatedExams = state.exams.map(e => {
          const isTargetPromo = e.promotionId === validId || 
            (e.niveau && e.niveau.trim().toLowerCase() === oldNomLower) || 
            (e.promotion && e.promotion.trim().toLowerCase() === oldNomLower) ||
            (oldCodeUpper && e.niveau && e.niveau.trim().toUpperCase() === oldCodeUpper);

          let updatedShared = e.sharedPromotions;
          if (e.sharedPromotions && e.sharedPromotions.length > 0) {
            updatedShared = e.sharedPromotions.map(sp => 
              sp.trim().toLowerCase() === oldNomLower ? normalizedPromo.nom : sp
            );
          }

          if (isTargetPromo || (updatedShared && JSON.stringify(updatedShared) !== JSON.stringify(e.sharedPromotions))) {
            return {
              ...e,
              promotionId: isTargetPromo ? validId : e.promotionId,
              niveau: isTargetPromo ? normalizedPromo.nom : e.niveau,
              promotion: isTargetPromo ? normalizedPromo.nom : (e.promotion || normalizedPromo.nom),
              sharedPromotions: updatedShared || e.sharedPromotions,
              specialite: (isTargetPromo && normalizedPromo.filiere) ? normalizedPromo.filiere : e.specialite,
              nbEtudiants: (isTargetPromo && normalizedPromo.effectif) ? normalizedPromo.effectif : e.nbEtudiants
            };
          }
          return e;
        });
        StorageService.saveExams(updatedExams);
      }

      // Cascade update to timeOffConstraints
      let updatedTimeOff = state.timeOffConstraints;
      if (exists && oldNom !== normalizedPromo.nom) {
        updatedTimeOff = state.timeOffConstraints.map(to => {
          if (to.entityType === 'promotion' && (to.entityId === validId || to.entityId.trim().toLowerCase() === oldNomLower)) {
            return {
              ...to,
              entityId: validId
            };
          }
          return to;
        });
        StorageService.saveTimeOff(updatedTimeOff);
      }

      StorageService.savePromotions(updatedPromotions);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Promotion modifiée' : 'Promotion créée',
        message: `La promotion "${normalizedPromo.nom}" a été actualisée en temps réel dans toutes les matières et épreuves.`
      };

      return {
        ...state,
        promotions: updatedPromotions,
        groupsById: newGroupsById,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        exams: updatedExams,
        timeOffConstraints: updatedTimeOff,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'UPDATE_PROMOTIONS': {
      const updatedPromos = action.payload.map(p => ({
        ...p,
        id: p.id || generateEntityId('promo')
      }));
      const newGroupsById: Record<string, PromotionGroup> = Object.fromEntries(updatedPromos.map(p => [p.id, p]));
      const oldPromosById = new Map<string, PromotionGroup>(state.promotions.map(p => [p.id, p]));

      // Track renames: oldLowerName -> newName and oldUpperCode -> newCode
      const renameMap = new Map<string, string>();
      const codeRenameMap = new Map<string, string>();
      const promoIdToNewPromo = new Map<string, PromotionGroup>();

      updatedPromos.forEach(newP => {
        promoIdToNewPromo.set(newP.id, newP);
        const oldP = oldPromosById.get(newP.id);
        if (oldP) {
          if (oldP.nom.trim().toLowerCase() !== newP.nom.trim().toLowerCase()) {
            renameMap.set(oldP.nom.trim().toLowerCase(), newP.nom.trim());
          }
          if (oldP.code && newP.code && oldP.code.trim().toUpperCase() !== newP.code.trim().toUpperCase()) {
            codeRenameMap.set(oldP.code.trim().toUpperCase(), newP.code.trim().toUpperCase());
          }
        }
      });

      // Cascade update to subjects
      const updatedSubjects = state.subjects.map(s => {
        let currentPromoNom = s.promotion || '';
        let currentPromoId = s.promotionId;
        let modified = false;

        // 1. By ID
        if (currentPromoId && promoIdToNewPromo.has(currentPromoId)) {
          const np = promoIdToNewPromo.get(currentPromoId)!;
          if (currentPromoNom !== np.nom) {
            currentPromoNom = np.nom;
            modified = true;
          }
        } else if (currentPromoNom) {
          // 2. By renamed name
          const low = currentPromoNom.trim().toLowerCase();
          if (renameMap.has(low)) {
            currentPromoNom = renameMap.get(low)!;
            const np = updatedPromos.find(p => p.nom.trim().toLowerCase() === currentPromoNom.toLowerCase());
            if (np) currentPromoId = np.id;
            modified = true;
          } else {
            // Check direct match
            const direct = updatedPromos.find(p => p.nom.trim().toLowerCase() === low);
            if (direct && !currentPromoId) {
              currentPromoId = direct.id;
              modified = true;
            }
          }
        }

        // Shared promotions
        let updatedShared = s.sharedPromotions;
        if (s.sharedPromotions && s.sharedPromotions.length > 0) {
          const newShared = s.sharedPromotions.map(sp => {
            const spLow = sp.trim().toLowerCase();
            return renameMap.has(spLow) ? renameMap.get(spLow)! : sp;
          });
          if (JSON.stringify(newShared) !== JSON.stringify(s.sharedPromotions)) {
            updatedShared = newShared;
            modified = true;
          }
        }

        if (modified) {
          return {
            ...s,
            promotion: currentPromoNom,
            promotionId: currentPromoId,
            sharedPromotions: updatedShared
          };
        }
        return s;
      });

      // Cascade update to exams
      const updatedExams = state.exams.map(e => {
        let currentNiveau = e.niveau || e.promotion || '';
        let currentPromotion = e.promotion || e.niveau || '';
        let currentPromoId = e.promotionId;
        let specialite = e.specialite;
        let nbEtudiants = e.nbEtudiants;
        let modified = false;

        if (currentPromoId && promoIdToNewPromo.has(currentPromoId)) {
          const np = promoIdToNewPromo.get(currentPromoId)!;
          if (currentNiveau !== np.nom || currentPromotion !== np.nom) {
            currentNiveau = np.nom;
            currentPromotion = np.nom;
            modified = true;
          }
          if (np.filiere && (!specialite || specialite === 'Générale')) {
            specialite = np.filiere;
            modified = true;
          }
          if (np.effectif && (!nbEtudiants || nbEtudiants === 45)) {
            nbEtudiants = np.effectif;
            modified = true;
          }
        } else {
          const low = (e.niveau || e.promotion || '').trim().toLowerCase();
          if (renameMap.has(low)) {
            const newNom = renameMap.get(low)!;
            currentNiveau = newNom;
            currentPromotion = newNom;
            const np = updatedPromos.find(p => p.nom.trim().toLowerCase() === newNom.toLowerCase());
            if (np) {
              currentPromoId = np.id;
              if (np.filiere) specialite = np.filiere;
              if (np.effectif) nbEtudiants = np.effectif;
            }
            modified = true;
          } else {
            const direct = updatedPromos.find(p => p.nom.trim().toLowerCase() === low);
            if (direct && !currentPromoId) {
              currentPromoId = direct.id;
              modified = true;
            }
          }
        }

        // Shared promotions
        let updatedShared = e.sharedPromotions;
        if (e.sharedPromotions && e.sharedPromotions.length > 0) {
          const newShared = e.sharedPromotions.map(sp => {
            const spLow = sp.trim().toLowerCase();
            return renameMap.has(spLow) ? renameMap.get(spLow)! : sp;
          });
          if (JSON.stringify(newShared) !== JSON.stringify(e.sharedPromotions)) {
            updatedShared = newShared;
            modified = true;
          }
        }

        if (modified) {
          return {
            ...e,
            niveau: currentNiveau,
            promotion: currentPromotion,
            promotionId: currentPromoId,
            sharedPromotions: updatedShared,
            specialite,
            nbEtudiants
          };
        }
        return e;
      });

      // Cascade update to timeOffConstraints
      const updatedTimeOff = state.timeOffConstraints.map(to => {
        if (to.entityType === 'promotion') {
          const low = to.entityId.trim().toLowerCase();
          if (renameMap.has(low)) {
            return {
              ...to,
              entityId: renameMap.get(low)!
            };
          }
        }
        return to;
      });

      StorageService.savePromotions(updatedPromos);
      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveExams(updatedExams);
      StorageService.saveTimeOff(updatedTimeOff);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: 'Promotions synchronisées',
        message: 'Toutes les promotions, matières et épreuves associées ont été mises à jour.'
      };

      return {
        ...state,
        promotions: updatedPromos,
        groupsById: newGroupsById,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        exams: updatedExams,
        timeOffConstraints: updatedTimeOff,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_PROMOTION': {
      const { promoId } = action.payload;
      const targetPromo = state.promotions.find(p => p.id === promoId || p.nom === promoId);
      const promoName = targetPromo ? targetPromo.nom : promoId;
      const promoNameNorm = promoName.toLowerCase().trim();

      // 1. Identify all impacted subjects and exams
      const impactedSlots: ImpactedSlotDetail[] = [];

      state.exams.forEach(ex => {
        const exPromo = (ex.niveau || ex.promotion || '').toLowerCase().trim();
        const isTargetExam = ex.promotionId === promoId || (targetPromo && ex.promotionId === targetPromo.id) || exPromo === promoNameNorm;
        if (isTargetExam) {
          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: promoName,
            date: ex.date || 'Non planifié',
            creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
            impactDescription: 'Épreuve supprimée en cascade suite à la suppression de la promotion'
          });
        }
      });

      // 2. Cascade delete or detach subjects for this promotion
      const updatedSubjects = state.subjects.reduce<SubjectModule[]>((acc, s) => {
        const isDirect = s.promotionId === promoId || (targetPromo && s.promotionId === targetPromo.id) || (s.promotion || '').toLowerCase().trim() === promoNameNorm;
        const hasShared = s.sharedPromotions && s.sharedPromotions.some(sp => sp.toLowerCase().trim() === promoNameNorm);

        if (hasShared) {
          const remainingShared = s.sharedPromotions!.filter(sp => sp.toLowerCase().trim() !== promoNameNorm);
          if (remainingShared.length > 0) {
            acc.push({
              ...s,
              promotion: remainingShared[0],
              sharedPromotions: remainingShared
            });
            return acc;
          }
        }

        if (!isDirect) {
          acc.push(s);
        }
        return acc;
      }, []);

      // 3. Cascade delete exams for this promotion
      const updatedExams = state.exams.filter(ex => {
        const isTargetExam = ex.promotionId === promoId || (targetPromo && ex.promotionId === targetPromo.id) || (ex.niveau || ex.promotion || '').toLowerCase().trim() === promoNameNorm;
        return !isTargetExam;
      });

      // 4. Clean timeOff constraints
      const updatedTimeOff = state.timeOffConstraints.filter(
        to => !(to.entityType === 'promotion' && (to.entityId === promoId || to.entityId === promoName || to.entityId.toLowerCase().trim() === promoNameNorm))
      );

      // 5. Remove promotion
      const updatedPromotions = state.promotions.filter(
        p => p.id !== promoId && p.nom !== promoName && (!targetPromo || p.id !== targetPromo.id)
      );

      const newGroupsById = { ...state.groupsById };
      delete newGroupsById[promoId];
      if (targetPromo) delete newGroupsById[targetPromo.id];

      // Persist to storage
      StorageService.savePromotions(updatedPromotions);
      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveExams(updatedExams);
      StorageService.saveTimeOff(updatedTimeOff);

      // Build Cascade Alert
      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'promotion',
        entityId: promoId,
        entityName: promoName,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Promotion « ${promoName} »`,
        summary: `La promotion a été supprimée avec ${impactedSlots.length} épreuve(s) planifiée(s) purgée(s) du calendrier.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'warning',
        title: 'Promotion supprimée en cascade',
        message: `Promotion "${promoName}" supprimée. ${impactedSlots.length} épreuve(s) nettoyée(s).`
      };

      return {
        ...state,
        promotions: updatedPromotions,
        groupsById: newGroupsById,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        exams: updatedExams,
        timeOffConstraints: updatedTimeOff,
        cascadeAlert: null,
        toasts: [...state.toasts, toast]
      };
    }

    // ------------------------------------------------------------------------
    // SUBJECTS / MODULES
    // ------------------------------------------------------------------------
    case 'SAVE_SUBJECT': {
      const subject = action.payload;
      const validId = subject.id || generateEntityId('sub');
      const normalizedSub = { ...subject, id: validId };
      const existingSub = state.subjects.find(s => s.id === validId);
      const exists = Boolean(existingSub);

      const oldCode = (existingSub?.code || existingSub?.codeModule || '').toUpperCase().trim();
      const oldNom = (existingSub?.nom || existingSub?.nomModule || '').toLowerCase().trim();
      const oldPromo = (existingSub?.promotion || '').toLowerCase().trim();

      const updatedSubjects = exists
        ? state.subjects.map(s => (s.id === validId ? normalizedSub : s))
        : [...state.subjects, normalizedSub];

      const newSubjectsById: Record<string, SubjectModule> = {
        ...state.subjectsById,
        [validId]: normalizedSub
      };

      // Cascade update to exams pointing to this subject
      const subCode = (normalizedSub.code || normalizedSub.codeModule || '').toUpperCase().trim();
      const subNom = (normalizedSub.nom || normalizedSub.nomModule || '').trim();
      const subNomLower = subNom.toLowerCase();
      const subRespId = normalizedSub.enseignantResponsableId || normalizedSub.responsableId || '';
      const subPromo = (normalizedSub.promotion || '').trim();
      const subPromoLower = subPromo.toLowerCase();

      const updatedExams = state.exams.map(e => {
        const eCode = (e.codeModule || '').toUpperCase().trim();
        const eNom = (e.nomModule || '').toLowerCase().trim();
        const ePromo = (e.niveau || e.promotion || '').toLowerCase().trim();

        const isExactId = e.subjectId === validId;
        const isCodeMatch = subCode && eCode === subCode;
        const isNomMatch = subNomLower && eNom === subNomLower;
        const isOldCodeMatch = oldCode && eCode === oldCode;
        const isOldNomMatch = oldNom && eNom === oldNom;
        const isPromoMatch = !subPromoLower || !ePromo || ePromo === subPromoLower || (oldPromo && ePromo === oldPromo);

        if (isExactId || ((isCodeMatch || isNomMatch || isOldCodeMatch || isOldNomMatch) && isPromoMatch)) {
          const sem: 'Semestre 1 (S1)' | 'Semestre 2 (S2)' = (normalizedSub.semestre && normalizedSub.semestre.includes('2')) ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)';
          return {
            ...e,
            subjectId: validId,
            codeModule: subCode || e.codeModule,
            nomModule: subNom || e.nomModule,
            responsableId: subRespId || e.responsableId,
            semestre: sem
          };
        }
        return e;
      });

      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveExams(updatedExams);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Matière modifiée' : 'Matière ajoutée',
        message: `${subNom || subCode} a été mise à jour en temps réel dans toutes les épreuves et vues.`
      };

      return {
        ...state,
        subjects: updatedSubjects,
        subjectsById: newSubjectsById,
        exams: updatedExams,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'UPDATE_SUBJECTS': {
      const updated = action.payload;
      StorageService.saveSubjects(updated);

      // Group subjects to know the assigned promotions for each module
      const subjectGroupMap = new Map<string, { code: string; nom: string; respId: string; semestre: string; duree: number; promotions: Set<string> }>();
      const allowedMap = new Map<string, Set<string>>();

      updated.forEach(sub => {
        const sc = (sub.code || sub.codeModule || '').toUpperCase().trim();
        const sn = (sub.nom || sub.nomModule || '').trim();
        const sp = (sub.promotion || '').trim();
        const pLower = sp.toLowerCase();
        if (sc) {
          if (!allowedMap.has(`code:${sc}`)) allowedMap.set(`code:${sc}`, new Set());
          if (pLower) allowedMap.get(`code:${sc}`)!.add(pLower);
        }
        if (sn) {
          if (!allowedMap.has(`nom:${sn.toLowerCase()}`)) allowedMap.set(`nom:${sn.toLowerCase()}`, new Set());
          if (pLower) allowedMap.get(`nom:${sn.toLowerCase()}`)!.add(pLower);
        }
        if (!sp) return;
        const key = sc ? `code:${sc}` : `nom:${sn.toLowerCase()}`;
        if (!subjectGroupMap.has(key)) {
          subjectGroupMap.set(key, {
            code: sc,
            nom: sn,
            respId: sub.enseignantResponsableId || sub.responsableId || '',
            semestre: sub.semestre || 'S1',
            duree: sub.dureeMinutes || 90,
            promotions: new Set()
          });
        }
        subjectGroupMap.get(key)!.promotions.add(sp);
      });

      const impactedSlots: ImpactedSlotDetail[] = [];
      const updatedExamsList: Exam[] = [];
      const matchedExamIds = new Set<string>();

      // For each subject group, ensure an exam exists for every checked promotion
      subjectGroupMap.forEach((grp) => {
        const grpPromos = Array.from(grp.promotions);
        const grpCode = grp.code.toUpperCase();
        const grpNom = grp.nom.toLowerCase();

        // Find candidate exams in state.exams matching this group
        const candidateExams = state.exams.filter(e => {
          if (matchedExamIds.has(e.id)) return false;
          const ec = (e.codeModule || '').toUpperCase().trim();
          const en = (e.nomModule || '').toLowerCase().trim();
          return (grpCode && ec === grpCode) || (grpNom && en === grpNom);
        });

        const unusedCandidates = [...candidateExams];

        grpPromos.forEach((promoName, pIdx) => {
          const pLower = promoName.toLowerCase();
          // Find an exact match for this promotion
          const exactIdx = unusedCandidates.findIndex(
            e => (e.niveau || e.promotion || '').trim().toLowerCase() === pLower
          );

          if (exactIdx !== -1) {
            const matched = unusedCandidates.splice(exactIdx, 1)[0];
            matchedExamIds.add(matched.id);
            updatedExamsList.push({
              ...matched,
              codeModule: grp.code,
              nomModule: grp.nom,
              niveau: promoName,
              responsableId: grp.respId || matched.responsableId
            });
          } else if (unusedCandidates.length > 0) {
            // Reassign candidate with obsolete / unchecked promotion (e.g. 1ère année Ing génie civil)
            const obsoleteExam = unusedCandidates.shift()!;
            matchedExamIds.add(obsoleteExam.id);
            updatedExamsList.push({
              ...obsoleteExam,
              codeModule: grp.code,
              nomModule: grp.nom,
              niveau: promoName,
              responsableId: grp.respId || obsoleteExam.responsableId
            });
          } else {
            // Create a new planned exam entry for this checked promotion
            const newExamId = `exam-sync-${Date.now()}-${pIdx}-${Math.random().toString(36).substring(2, 6)}`;
            matchedExamIds.add(newExamId);
            updatedExamsList.push({
              id: newExamId,
              codeModule: grp.code,
              nomModule: grp.nom,
              responsableId: grp.respId,
              date: '',
              heureDebut: '',
              heureFin: '',
              semestre: grp.semestre.includes('2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)',
              session: 'Ordinaire',
              niveau: promoName,
              departement: 'Département de Technologie',
              specialite: promoName.includes('Hydraulique') || promoName.includes('hydraulique') ? 'Hydraulique' : 'Génie Civil',
              nbEtudiants: 45,
              salles: []
            });
          }
        });

        // Any leftover exams for this module that were assigned to promotions no longer checked are purged
        unusedCandidates.forEach(e => {
          matchedExamIds.add(e.id);
          impactedSlots.push({
            examId: e.id,
            moduleCode: e.codeModule || '',
            moduleName: e.nomModule || '',
            promotion: e.niveau || '',
            date: e.date || 'Non planifié',
            creneau: e.heureDebut ? `${e.heureDebut} - ${e.heureFin}` : 'Non défini',
            impactDescription: 'Épreuve retirée car la promotion a été désaffectée de cette matière'
          });
        });
      });

      // Keep exams belonging to other modules if they still exist in allowedMap
      state.exams.forEach(e => {
        if (!matchedExamIds.has(e.id)) {
          const ec = (e.codeModule || '').toUpperCase().trim();
          const en = (e.nomModule || '').toLowerCase().trim();
          const hasCodeMatch = ec && allowedMap.has(`code:${ec}`);
          const hasNomMatch = en && allowedMap.has(`nom:${en}`);

          if (!hasCodeMatch && !hasNomMatch) {
            impactedSlots.push({
              examId: e.id,
              moduleCode: e.codeModule || '',
              moduleName: e.nomModule || '',
              promotion: e.niveau || '',
              date: e.date || 'Non planifié',
              creneau: e.heureDebut ? `${e.heureDebut} - ${e.heureFin}` : 'Non défini',
              impactDescription: 'Épreuve purgée car le module a été supprimé de la banque de données'
            });
          } else {
            updatedExamsList.push(e);
          }
        }
      });

      const sanitizedExams = sanitizeAndLinkExamsWithSubjects(updatedExamsList, updated);
      StorageService.saveExams(sanitizedExams);

      if (impactedSlots.length > 0) {
        const cascadeReport: CascadeImpactAlert = {
          id: generateEntityId('alert'),
          entityType: 'subject',
          entityId: 'batch',
          entityName: 'Matières synchronisées',
          action: 'update',
          timestamp: Date.now(),
          title: 'Synchronisation en cascade des matières',
          summary: `${impactedSlots.length} épreuve(s) orpheline(s) purgée(s) du calendrier.`,
          impactedSlots
        };
        StorageService.saveCascadeReport(cascadeReport);
      }

      return {
        ...state,
        subjects: updated,
        subjectsById: Object.fromEntries(updated.map(s => [s.id, s])),
        exams: sanitizedExams,
        cascadeAlert: null,
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_SUBJECT': {
      const { subjectId } = action.payload;
      const targetSub = state.subjects.find(s => s.id === subjectId);
      const subCode = (targetSub?.code || targetSub?.codeModule || '').toUpperCase().trim();
      const subNom = (targetSub?.nom || targetSub?.nomModule || '').toLowerCase().trim();
      const subPromo = (targetSub?.promotion || '').toLowerCase().trim();

      const updatedSubjects = state.subjects.filter(s => s.id !== subjectId);

      // Cascade remove corresponding exams
      const impactedSlots: ImpactedSlotDetail[] = [];
      const updatedExams = state.exams.filter(ex => {
        const eCode = (ex.codeModule || '').toUpperCase().trim();
        const eNom = (ex.nomModule || '').toLowerCase().trim();
        const ePromo = (ex.niveau || ex.promotion || '').toLowerCase().trim();

        const matchesModule = ex.subjectId === subjectId || (subCode && eCode === subCode) || (subNom && eNom === subNom);
        const matchesPromo = !subPromo || ePromo === subPromo;

        if (matchesModule && matchesPromo) {
          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: ex.niveau || '',
            date: ex.date || 'Non planifié',
            creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
            impactDescription: 'Épreuve supprimée suite à la suppression de la matière'
          });
          return false;
        }
        return true;
      });

      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveExams(updatedExams);

      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'subject',
        entityId: subjectId,
        entityName: targetSub?.nom || targetSub?.code || subjectId,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Matière « ${targetSub?.nom || targetSub?.code} »`,
        summary: `${impactedSlots.length} épreuve(s) planifiée(s) supprimée(s) en temps réel.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'info',
        title: 'Matière supprimée',
        message: `Matière "${targetSub?.nom || targetSub?.code}" supprimée. ${impactedSlots.length} épreuve(s) nettoyée(s).`
      };

      return {
        ...state,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        exams: updatedExams,
        cascadeAlert: null,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_SUBJECT_GROUP': {
      const { code, nom, promotions, subjectIds } = action.payload;
      const targetIds = new Set(subjectIds);
      const codeUpper = (code || '').toUpperCase().trim();
      const nomLower = (nom || '').toLowerCase().trim();
      const promoSet = new Set(promotions.map(p => p.toLowerCase().trim()));

      const updatedSubjects = state.subjects.filter(s => !targetIds.has(s.id));

      const impactedSlots: ImpactedSlotDetail[] = [];
      const updatedExams = state.exams.filter(ex => {
        const eCode = (ex.codeModule || '').toUpperCase().trim();
        const eNom = (ex.nomModule || '').toLowerCase().trim();
        const ePromo = (ex.niveau || ex.promotion || '').toLowerCase().trim();

        const matchesModule = (ex.subjectId && targetIds.has(ex.subjectId)) || (codeUpper && eCode === codeUpper) || (nomLower && eNom === nomLower);
        const matchesPromo = promoSet.size === 0 || promoSet.has(ePromo);

        if (matchesModule && matchesPromo) {
          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: ex.niveau || '',
            date: ex.date || 'Non planifié',
            creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
            impactDescription: 'Épreuve supprimée suite à la suppression du groupe de matière'
          });
          return false;
        }
        return true;
      });

      StorageService.saveSubjects(updatedSubjects);
      StorageService.saveExams(updatedExams);

      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'subject',
        entityId: code || nom,
        entityName: nom || code,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Matière « ${nom || code} »`,
        summary: `${impactedSlots.length} épreuve(s) planifiée(s) purgée(s) du calendrier.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'info',
        title: 'Matière supprimée en cascade',
        message: `Matière "${nom || code}" supprimée. ${impactedSlots.length} épreuve(s) retirée(s).`
      };

      return {
        ...state,
        subjects: updatedSubjects,
        subjectsById: Object.fromEntries(updatedSubjects.map(s => [s.id, s])),
        exams: updatedExams,
        cascadeAlert: null,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    // ------------------------------------------------------------------------
    // EXAMS
    // ------------------------------------------------------------------------
    case 'SAVE_EXAM': {
      const exam = action.payload;
      const validId = exam.id || generateEntityId('ex');
      const normalizedExam = { ...exam, id: validId };
      
      // Safely link with subjects if possible, but never drop the user's exam
      let linkedExam = normalizedExam;
      try {
        const linked = sanitizeAndLinkExamsWithSubjects([normalizedExam], state.subjects);
        if (linked && linked.length > 0 && linked[0]) {
          linkedExam = linked[0];
        }
      } catch (err) {
        console.warn('Error linking exam with subjects:', err);
      }

      if (!linkedExam.nomModule) {
        linkedExam = { ...normalizedExam, nomModule: normalizedExam.nomModule || normalizedExam.codeModule || 'Épreuve' };
      }

      const exists = state.exams.some(e => String(e.id) === String(validId));

      const updatedExams = exists
        ? state.exams.map(e => (String(e.id) === String(validId) ? linkedExam : e))
        : [...state.exams, linkedExam];

      StorageService.saveExams(updatedExams);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Examen mis à jour' : 'Examen programmé',
        message: `L'épreuve "${linkedExam.nomModule}" est synchronisée sur toutes les vues d'emploi du temps.`
      };

      return {
        ...state,
        exams: updatedExams,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'UPDATE_EXAMS': {
      const updated = sanitizeAndLinkExamsWithSubjects(action.payload, state.subjects);
      StorageService.saveExams(updated);
      return {
        ...state,
        exams: updated,
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_EXAM': {
      const { examId } = action.payload;
      const targetExam = state.exams.find(e => e.id === examId);
      const updatedExams = state.exams.filter(e => e.id !== examId);
      const updatedSubs = state.substitutions.filter(s => s.examId !== examId);
      const updatedAtt = state.attendances.filter(a => a.examId !== examId);

      StorageService.saveExams(updatedExams);
      StorageService.saveSubstitutions(updatedSubs);
      StorageService.saveAttendances(updatedAtt);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'info',
        title: 'Épreuve supprimée',
        message: targetExam
          ? `L'épreuve "${targetExam.nomModule}" (${targetExam.niveau}) a été supprimée du planning.`
          : "L'épreuve a été supprimée."
      };

      return {
        ...state,
        exams: updatedExams,
        substitutions: updatedSubs,
        attendances: updatedAtt,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    // ------------------------------------------------------------------------
    // TIME SLOTS
    // ------------------------------------------------------------------------
    case 'SAVE_TIME_SLOT': {
      const slot = action.payload;
      const validId = slot.id || generateEntityId('ts');
      const normalizedSlot = { ...slot, id: validId, heureDebut: slot.debut, heureFin: slot.fin };

      const existingSlots = state.sessionConfig.timeSlots || [];
      const exists = existingSlots.some(s => s.id === validId);

      const updatedSlots = exists
        ? existingSlots.map(s => (s.id === validId ? normalizedSlot : s))
        : [...existingSlots, normalizedSlot];

      const updatedConfig: SessionConfig = {
        ...state.sessionConfig,
        timeSlots: updatedSlots,
        dailySlots: updatedSlots
      };

      StorageService.saveSessionConfig(updatedConfig);

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: 'success',
        title: exists ? 'Créneau horaire modifié' : 'Créneau horaire ajouté',
        message: `${normalizedSlot.label || normalizedSlot.name || 'Créneau'} (${normalizedSlot.debut} - ${normalizedSlot.fin}) synchronisé.`
      };

      return {
        ...state,
        sessionConfig: updatedConfig,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    case 'DELETE_TIME_SLOT': {
      const { slotId } = action.payload;
      const existingSlots = state.sessionConfig.timeSlots || [];
      const targetSlot = existingSlots.find(s => s.id === slotId);

      if (!targetSlot) return state;

      const slotDebut = targetSlot.debut || targetSlot.heureDebut || '';
      const slotFin = targetSlot.fin || targetSlot.heureFin || '';

      // Check if any exams were placed on this exact slot
      const impactedSlots: ImpactedSlotDetail[] = [];
      const updatedExams = state.exams.map(ex => {
        if (ex.heureDebut === slotDebut && ex.heureFin === slotFin) {
          impactedSlots.push({
            examId: ex.id,
            moduleCode: ex.codeModule || '',
            moduleName: ex.nomModule || '',
            promotion: ex.niveau || '',
            date: ex.date || 'Non planifié',
            creneau: `${slotDebut} - ${slotFin}`,
            impactDescription: 'Créneau supprimé : horaire d\'épreuve libéré (renvoyé à la réserve)'
          });
          return { ...ex, date: '', heureDebut: '', heureFin: '' };
        }
        return ex;
      });

      const updatedSlots = existingSlots.filter(s => s.id !== slotId);
      const updatedConfig: SessionConfig = {
        ...state.sessionConfig,
        timeSlots: updatedSlots,
        dailySlots: updatedSlots
      };

      const updatedTimeOff = state.timeOffConstraints.filter(
        to => to.timeSlotId !== slotId && to.slotId !== slotId
      );

      StorageService.saveSessionConfig(updatedConfig);
      StorageService.saveExams(updatedExams);
      StorageService.saveTimeOff(updatedTimeOff);

      const cascadeAlert: CascadeImpactAlert | null = impactedSlots.length > 0 ? {
        id: generateEntityId('alert'),
        entityType: 'timeslot',
        entityId: slotId,
        entityName: targetSlot.label || `${slotDebut} - ${slotFin}`,
        action: 'delete',
        timestamp: Date.now(),
        title: `Suppression en cascade : Créneau « ${slotDebut} - ${slotFin} »`,
        summary: `${impactedSlots.length} épreuve(s) qui étaient sur ce créneau ont été automatiquement renvoyées à la réserve.`,
        impactedSlots
      } : null;

      if (cascadeAlert) {
        StorageService.saveCascadeReport(cascadeAlert);
      }

      const toast: ToastMessage = {
        id: generateEntityId('toast'),
        type: impactedSlots.length > 0 ? 'warning' : 'info',
        title: 'Créneau supprimé en cascade',
        message: `Créneau ${slotDebut}-${slotFin} supprimé. ${impactedSlots.length} épreuve(s) impactée(s).`
      };

      return {
        ...state,
        sessionConfig: updatedConfig,
        exams: updatedExams,
        timeOffConstraints: updatedTimeOff,
        cascadeAlert: null,
        toasts: [...state.toasts, toast],
        lastAutoSaveTrigger: Date.now()
      };
    }

    // ------------------------------------------------------------------------
    // SESSION CONFIG & CONSTRAINTS
    // ------------------------------------------------------------------------
    case 'UPDATE_SESSION_CONFIG': {
      StorageService.saveSessionConfig(action.payload);
      return { ...state, sessionConfig: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'UPDATE_TIMEOFF': {
      StorageService.saveTimeOff(action.payload);
      return { ...state, timeOffConstraints: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'UPDATE_GLOBAL_CONSTRAINTS': {
      StorageService.saveGlobalConstraints(action.payload);
      return { ...state, globalConstraints: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'UPDATE_SUBSTITUTIONS': {
      StorageService.saveSubstitutions(action.payload);
      return { ...state, substitutions: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'UPDATE_ATTENDANCES': {
      StorageService.saveAttendances(action.payload);
      return { ...state, attendances: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'UPDATE_SETTINGS': {
      StorageService.saveSettings(action.payload);
      return { ...state, settings: action.payload };
    }

    case 'SET_LANGUAGE': {
      StorageService.saveLanguage(action.payload);
      return { ...state, language: action.payload };
    }

    // ------------------------------------------------------------------------
    // TOASTS & ALERTS
    // ------------------------------------------------------------------------
    case 'ADD_TOAST': {
      return { ...state, toasts: [...state.toasts, action.payload], lastAutoSaveTrigger: Date.now() };
    }

    case 'REMOVE_TOAST': {
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload.id) };
    }

    case 'SET_CASCADE_ALERT': {
      return { ...state, cascadeAlert: action.payload, lastAutoSaveTrigger: Date.now() };
    }

    case 'DISMISS_CASCADE_ALERT': {
      return { ...state, cascadeAlert: null, lastAutoSaveTrigger: Date.now() };
    }

    case 'RELOAD_FROM_STORAGE': {
      return getInitialState();
    }

    default:
      return state;
  }
}

// ============================================================================
// React Context Definition & Store Hook
// ============================================================================

export interface AppContextValue extends AppState {
  dispatch: React.Dispatch<AppAction>;
  // Entity Handlers
  saveTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;
  saveRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
  savePromotion: (promo: PromotionGroup) => void;
  updatePromotions: (promos: PromotionGroup[]) => void;
  deletePromotion: (promoId: string) => void;
  saveSubject: (subject: SubjectModule) => void;
  updateSubjects: (subjects: SubjectModule[]) => void;
  deleteSubject: (subjectId: string) => void;
  deleteSubjectGroup: (code: string, nom: string, promotions: string[], subjectIds: string[]) => void;
  saveExam: (exam: Exam) => void;
  updateExams: (exams: Exam[]) => void;
  deleteExam: (examId: string) => void;
  saveTimeSlot: (slot: TimeSlot) => void;
  deleteTimeSlot: (slotId: string) => void;
  updateSessionConfig: (config: SessionConfig) => void;
  updateTimeOff: (timeOff: TimeOffEntry[]) => void;
  updateGlobalConstraints: (constraints: GlobalConstraints) => void;
  updateSubstitutions: (substitutions: Substitution[]) => void;
  updateAttendances: (attendances: ExamAttendance[]) => void;
  updateSettings: (settings: InstitutionSettings) => void;
  setLanguage: (lang: Language) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  setCascadeAlert: (alert: CascadeImpactAlert | null) => void;
  dismissCascadeAlert: () => void;
  reloadFromStorage: () => void;
  clearAllReports: () => void;
  clearAllDataAndReportsAndSaveDefaults: () => void;
  // Computed State
  conflicts: ConflictAlert[];
  timetableDates: string[];
  timetableSlots: TimeSlot[];
  teacherMap: Map<string, Teacher>;
  roomMap: Map<string, Room>;
  promoMap: Map<string, PromotionGroup>;
  subjectMap: Map<string, SubjectModule>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const autoSave = StorageService.loadAutoSave();
    return getInitialState(autoSave ? {
      settings: autoSave.settings,
      sessionConfig: autoSave.sessionConfig,
      teachers: autoSave.teachers,
      rooms: autoSave.rooms,
      exams: autoSave.exams,
      promotions: autoSave.promotions,
      subjects: autoSave.subjects,
      timeOffConstraints: autoSave.timeOffConstraints,
      globalConstraints: autoSave.globalConstraints,
      substitutions: autoSave.substitutions,
      attendance: autoSave.attendance
    } : undefined);
  });

  // 1. Reactive Conflicts Diagnostics Engine
  const conflicts = useMemo(() => {
    return ConflictEngine.detectAllConflicts(
      state.exams,
      state.teachers,
      state.rooms,
      state.timeOffConstraints,
      state.globalConstraints,
      state.promotions
    );
  }, [state.exams, state.teachers, state.rooms, state.timeOffConstraints, state.globalConstraints, state.promotions]);

  // 2. Computed Active Timetable Dates
  const timetableDates = useMemo(() => {
    const config = state.sessionConfig;
    if (config.datesActives && config.datesActives.length > 0) {
      return config.datesActives;
    }
    if (config.dateDebut && config.dateFin) {
      const start = new Date(config.dateDebut);
      const end = new Date(config.dateFin);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const dates: string[] = [];
        const curr = new Date(start);
        const workingDays = config.workingDays || [0, 1, 2, 3, 4];
        let count = 0;
        while (curr <= end && count < 60) {
          if (workingDays.includes(curr.getDay())) {
            dates.push(curr.toISOString().slice(0, 10));
          }
          curr.setDate(curr.getDate() + 1);
          count++;
        }
        if (dates.length > 0) return dates;
      }
    }
    return ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
  }, [state.sessionConfig.datesActives, state.sessionConfig.dateDebut, state.sessionConfig.dateFin, state.sessionConfig.workingDays]);

  // 3. Computed Active Timetable Slots
  const timetableSlots = useMemo(() => {
    const config = state.sessionConfig;
    if (config.timeSlots && config.timeSlots.length > 0) {
      return config.timeSlots;
    }
    return [
      { id: 'ts-1', label: 'Créneau 1', debut: '08:30', fin: '10:00', heureDebut: '08:30', heureFin: '10:00' },
      { id: 'ts-2', label: 'Créneau 2', debut: '10:30', fin: '12:00', heureDebut: '10:30', heureFin: '12:00' },
      { id: 'ts-3', label: 'Créneau 3', debut: '13:30', fin: '15:00', heureDebut: '13:30', heureFin: '15:00' },
      { id: 'ts-4', label: 'Créneau 4', debut: '15:30', fin: '17:00', heureDebut: '15:30', heureFin: '17:00' }
    ];
  }, [state.sessionConfig.timeSlots]);

  // 4. Fast O(1) Lookup Maps
  const teacherMap = useMemo(() => new Map<string, Teacher>(state.teachers.map(t => [t.id, t])), [state.teachers]);
  const roomMap = useMemo(() => new Map<string, Room>(state.rooms.map(r => [r.id, r])), [state.rooms]);
  const promoMap = useMemo(() => new Map<string, PromotionGroup>(state.promotions.map(p => [p.nom, p])), [state.promotions]);
  const subjectMap = useMemo(() => new Map<string, SubjectModule>(state.subjects.map(s => [s.code || s.codeModule || s.id, s])), [state.subjects]);

  // 6. Auto-save persistence
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (state.lastAutoSaveTrigger === 0) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        StorageService.saveAutoSave({
          settings: state.settings,
          sessionConfig: state.sessionConfig,
          teachers: state.teachers,
          rooms: state.rooms,
          exams: state.exams,
          promotions: state.promotions,
          subjects: state.subjects,
          timeOffConstraints: state.timeOffConstraints,
          globalConstraints: state.globalConstraints,
          substitutions: state.substitutions,
          attendance: state.attendances
        });
        // Optional: log for debugging
        // console.log('Auto-save triggered');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 500);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [state.lastAutoSaveTrigger]);

  // Toast Helper
  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: generateEntityId('toast'),
      type,
      title,
      message
    };
    dispatch({ type: 'ADD_TOAST', payload: newToast });
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: { id } });
  };

  // Dispatch Action Wrappers
  const saveTeacher = (teacher: Teacher) => dispatch({ type: 'SAVE_TEACHER', payload: teacher });
  const deleteTeacher = (teacherId: string) => dispatch({ type: 'DELETE_TEACHER', payload: { teacherId } });
  const saveRoom = (room: Room) => dispatch({ type: 'SAVE_ROOM', payload: room });
  const deleteRoom = (roomId: string) => dispatch({ type: 'DELETE_ROOM', payload: { roomId } });
  const savePromotion = (promo: PromotionGroup) => dispatch({ type: 'SAVE_PROMOTION', payload: promo });
  const updatePromotions = (promos: PromotionGroup[]) => dispatch({ type: 'UPDATE_PROMOTIONS', payload: promos });
  const deletePromotion = (promoId: string) => dispatch({ type: 'DELETE_PROMOTION', payload: { promoId } });
  const saveSubject = (subject: SubjectModule) => dispatch({ type: 'SAVE_SUBJECT', payload: subject });
  const updateSubjects = (subjects: SubjectModule[]) => dispatch({ type: 'UPDATE_SUBJECTS', payload: subjects });
  const deleteSubject = (subjectId: string) => dispatch({ type: 'DELETE_SUBJECT', payload: { subjectId } });
  const deleteSubjectGroup = (code: string, nom: string, promotions: string[], subjectIds: string[]) =>
    dispatch({ type: 'DELETE_SUBJECT_GROUP', payload: { code, nom, promotions, subjectIds } });
  const saveExam = (exam: Exam) => dispatch({ type: 'SAVE_EXAM', payload: exam });
  const updateExams = (exams: Exam[]) => dispatch({ type: 'UPDATE_EXAMS', payload: exams });
  const deleteExam = (examId: string) => dispatch({ type: 'DELETE_EXAM', payload: { examId } });
  const saveTimeSlot = (slot: TimeSlot) => dispatch({ type: 'SAVE_TIME_SLOT', payload: slot });
  const deleteTimeSlot = (slotId: string) => dispatch({ type: 'DELETE_TIME_SLOT', payload: { slotId } });
  const updateSessionConfig = (config: SessionConfig) => dispatch({ type: 'UPDATE_SESSION_CONFIG', payload: config });
  const updateTimeOff = (timeOff: TimeOffEntry[]) => dispatch({ type: 'UPDATE_TIMEOFF', payload: timeOff });
  const updateGlobalConstraints = (constraints: GlobalConstraints) => dispatch({ type: 'UPDATE_GLOBAL_CONSTRAINTS', payload: constraints });
  const updateSubstitutions = (substitutions: Substitution[]) => dispatch({ type: 'UPDATE_SUBSTITUTIONS', payload: substitutions });
  const updateAttendances = (attendances: ExamAttendance[]) => dispatch({ type: 'UPDATE_ATTENDANCES', payload: attendances });
  const updateSettings = (settings: InstitutionSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  const setLanguage = (lang: Language) => dispatch({ type: 'SET_LANGUAGE', payload: lang });
  const setCascadeAlert = (alert: CascadeImpactAlert | null) => dispatch({ type: 'SET_CASCADE_ALERT', payload: alert });
  const dismissCascadeAlert = () => dispatch({ type: 'DISMISS_CASCADE_ALERT' });
  const reloadFromStorage = () => dispatch({ type: 'RELOAD_FROM_STORAGE' });

  const clearAllReports = () => {
    StorageService.clearAllReports();
    dispatch({ type: 'DISMISS_CASCADE_ALERT' });
    addToast('info', 'Rapports effacés', 'Tous les rapports et journaux de diagnostic ont été effacés.');
  };

  const clearAllDataAndReportsAndSaveDefaults = () => {
    StorageService.clearAllDataAndReportsAndSaveDefaults();
    dispatch({ type: 'DISMISS_CASCADE_ALERT' });
    dispatch({ type: 'RELOAD_FROM_STORAGE' });
    addToast('success', 'Données et Rapports Effacés', 'Toutes les données ont été effacées et enregistrées comme nouveaux Défauts.');
  };

  const value: AppContextValue = {
    ...state,
    dispatch,
    saveTeacher,
    deleteTeacher,
    saveRoom,
    deleteRoom,
    savePromotion,
    updatePromotions,
    deletePromotion,
    saveSubject,
    updateSubjects,
    deleteSubject,
    deleteSubjectGroup,
    saveExam,
    updateExams,
    deleteExam,
    saveTimeSlot,
    deleteTimeSlot,
    updateSessionConfig,
    updateTimeOff,
    updateGlobalConstraints,
    updateSubstitutions,
    updateAttendances,
    updateSettings,
    setLanguage,
    addToast,
    removeToast,
    setCascadeAlert,
    dismissCascadeAlert,
    reloadFromStorage,
    clearAllReports,
    clearAllDataAndReportsAndSaveDefaults,
    conflicts,
    timetableDates,
    timetableSlots,
    teacherMap,
    roomMap,
    promoMap,
    subjectMap
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom Hook
export function useAppStore(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
