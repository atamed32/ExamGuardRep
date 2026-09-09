import { 
  Exam, 
  Teacher, 
  Room, 
  TimeSlot, 
  TimeOffEntry, 
  GlobalConstraints, 
  PromotionGroup, 
  SubjectModule, 
  AutoGeneratorOptions,
  GenerationResult,
  RoomAssignment
} from '../types';
import { doTimesOverlap, detectAllConflicts } from './conflictEngine';

export class AutoSchedulerService {
  /**
   * Generates a feasible, conflict-free timetable and surveillance assignments
   * using a constraint-satisfaction heuristic similar to aSc TimeTables.
   */
  static runAutoGeneration(
    currentExams: Exam[],
    teachers: Teacher[],
    rooms: Room[],
    promotions: PromotionGroup[],
    subjects: SubjectModule[],
    timeSlots: TimeSlot[],
    sessionDates: string[],
    timeOffConstraints: TimeOffEntry[],
    globalConstraints: GlobalConstraints,
    options: AutoGeneratorOptions
  ): GenerationResult {
    const startTime = performance.now();
    const logs: string[] = [];
    logs.push(`[Générateur aSc] Démarrage de l'optimisation automatique...`);
    logs.push(`Paramètres : ${teachers.length} enseignants, ${rooms.length} salles, ${sessionDates.length} jours, ${timeSlots.length} créneaux/jour.`);

    // Clone exams to avoid direct mutation
    let workingExams: Exam[] = JSON.parse(JSON.stringify(currentExams));

    // Ensure exams strictly correspond to the promotions/filières assigned in "données de base > matières et modules"
    if (subjects && subjects.length > 0) {
      // Build a map of subject keys -> Set of assigned promotions
      // and map of (subjectKey, promotionNorm) -> SubjectModule
      const allowedPromosBySubject = new Map<string, Set<string>>();
      const subjectDefinitions = new Map<string, SubjectModule>();

      subjects.forEach(sub => {
        const sCode = (sub.code || sub.codeModule || '').toUpperCase().trim();
        const sNom = (sub.nom || sub.nomModule || '').trim().toLowerCase();
        const promoNorm = (sub.promotion || '').trim().toLowerCase();

        if (sCode) {
          if (!allowedPromosBySubject.has(`code:${sCode}`)) allowedPromosBySubject.set(`code:${sCode}`, new Set());
          if (promoNorm) allowedPromosBySubject.get(`code:${sCode}`)!.add(promoNorm);
        }
        if (sNom) {
          if (!allowedPromosBySubject.has(`nom:${sNom}`)) allowedPromosBySubject.set(`nom:${sNom}`, new Set());
          if (promoNorm) allowedPromosBySubject.get(`nom:${sNom}`)!.add(promoNorm);
        }

        const key = `${sCode || sNom}___${promoNorm}`;
        if (!subjectDefinitions.has(key)) {
          subjectDefinitions.set(key, sub);
        }
      });

      // 1. Filter out exams that belong to a known subject but for a promotion NOT assigned to that subject!
      // Also deduplicate exams for the same (subject, promotion) pair.
      const seenSubjectPromo = new Set<string>();
      const validExams: Exam[] = [];

      for (const ex of workingExams) {
        const exCode = (ex.codeModule || '').toUpperCase().trim();
        const exNom = (ex.nomModule || '').trim().toLowerCase();
        const exPromoNorm = (ex.niveau || '').trim().toLowerCase();

        const isKnownSubject = (exCode && allowedPromosBySubject.has(`code:${exCode}`)) ||
                               (exNom && allowedPromosBySubject.has(`nom:${exNom}`));

        if (isKnownSubject) {
          const allowedForCode = exCode ? allowedPromosBySubject.get(`code:${exCode}`) : null;
          const allowedForNom = exNom ? allowedPromosBySubject.get(`nom:${exNom}`) : null;
          const isAllowedPromo = (allowedForCode && allowedForCode.has(exPromoNorm)) ||
                                 (allowedForNom && allowedForNom.has(exPromoNorm));

          if (!isAllowedPromo) {
            // This subject is NOT affected to this promotion in the subjects catalog!
            logs.push(`[Filtrage] Épreuve ${ex.nomModule || exCode} ignorée pour ${ex.niveau} car non affectée à cette promotion dans les matières.`);
            continue;
          }

          // Deduplicate: if an exam already exists for this (subject, promotion), keep the first one
          const dedupKey = `${exCode || exNom}___${exPromoNorm}`;
          if (seenSubjectPromo.has(dedupKey)) {
            logs.push(`[Dédoublonnage] Épreuve en double ignorée pour ${ex.nomModule || exCode} (${ex.niveau}).`);
            continue;
          }
          seenSubjectPromo.add(dedupKey);
        }

        validExams.push(ex);
      }

      // 2. Ensure each (subject, promotion) assigned in the catalog has an exam in workingExams
      subjectDefinitions.forEach((sub) => {
        const sCode = (sub.code || sub.codeModule || '').toUpperCase().trim();
        const sNom = (sub.nom || sub.nomModule || '').trim();
        const promoNorm = (sub.promotion || '').trim().toLowerCase();
        const dedupKey = `${sCode || sNom.toLowerCase()}___${promoNorm}`;

        if (!seenSubjectPromo.has(dedupKey)) {
          const respId = sub.enseignantResponsableId || sub.responsableId || '';
          validExams.push({
            id: `ex-auto-${sub.id || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            codeModule: sCode || 'MOD',
            nomModule: sNom || 'Matière',
            responsableId: respId,
            date: '',
            heureDebut: '',
            heureFin: '',
            semestre: (sub.semestre === 'S1' || sub.semestre === 'Semestre 1 (S1)') ? 'Semestre 1 (S1)' : 'Semestre 2 (S2)',
            session: 'Ordinaire',
            niveau: sub.promotion || 'Tronc Commun',
            departement: sub.departement || 'Département de Technologie',
            specialite: sub.filiere || 'Générale',
            salles: []
          });
          seenSubjectPromo.add(dedupKey);
          logs.push(`[Création] Épreuve créée pour ${sNom} affectée à la promotion ${sub.promotion}.`);
        }
      });

      workingExams = validExams;
    }

    // If preserveManualAssignments is false, clear unpinned or all dates/rooms/surveillants
    if (!options.preserveManualAssignments) {
      workingExams = workingExams.map(ex => ({
        ...ex,
        date: '',
        heureDebut: '',
        heureFin: '',
        salles: ex.salles.map(s => ({
          ...s,
          surveillants: []
        }))
      }));
      logs.push(`Réinitialisation des créneaux non verrouillés effectuée.`);
    }

    // Step 1: Schedule Dates & Timeslots if requested
    if (options.generateTimeslots) {
      logs.push(`Étape 1 : Placement temporel des épreuves (Promotion & Modules)...`);
      workingExams = this.scheduleExamsIntoSlots(
        workingExams,
        promotions,
        subjects,
        timeSlots,
        sessionDates,
        globalConstraints,
        logs
      );
    }

    // Step 2: Assign Rooms if requested
    if (options.generateRooms) {
      logs.push(`Étape 2 : Affectation des salles selon effectifs et capacités...`);
      workingExams = this.assignRoomsToExams(
        workingExams,
        rooms,
        globalConstraints,
        logs,
        promotions
      );
    }

    // Step 3: Assign Surveillants if requested
    if (options.generateSurveillants) {
      logs.push(`Étape 3 : Distribution équitable des surveillances et respect des vœux...`);
      workingExams = this.assignSurveillantsToExams(
        workingExams,
        teachers,
        timeOffConstraints,
        globalConstraints,
        options,
        logs
      );
    }

    // Final evaluation
    const allConflicts = detectAllConflicts(
      workingExams,
      teachers,
      rooms,
      timeOffConstraints,
      globalConstraints,
      promotions
    );

    const placedCount = workingExams.filter(e => e.date && e.heureDebut && e.salles.length > 0).length;
    const unplacedCount = workingExams.length - placedCount;
    const hardConflicts = allConflicts.filter(c => c.severity === 'error').length;
    const softConflicts = allConflicts.filter(c => c.severity === 'warning').length;

    const baseScore = Math.max(0, 100 - (hardConflicts * 25) - (softConflicts * 5) - (unplacedCount * 15));
    const endTime = performance.now();

    logs.push(`Génération terminée en ${Math.round(endTime - startTime)}ms.`);
    logs.push(`Résultat : ${placedCount}/${workingExams.length} épreuves placées. Score de satisfaction : ${baseScore}%.`);
    if (hardConflicts > 0) {
      logs.push(`⚠️ ${hardConflicts} conflits majeurs détectés nécessitant un arbitrage.`);
    }

    return {
      exams: workingExams,
      conflicts: allConflicts,
      placedExamsCount: placedCount,
      unplacedExamsCount: unplacedCount,
      score: baseScore,
      logs
    };
  }

  /**
   * Helper to schedule exams into time slots avoiding student overlap
   * and synchronizing multi-promotion exams taught by the same teacher.
   */
  private static scheduleExamsIntoSlots(
    exams: Exam[],
    promotions: PromotionGroup[],
    subjects: SubjectModule[],
    timeSlots: TimeSlot[],
    sessionDates: string[],
    globalConstraints: GlobalConstraints,
    logs: string[]
  ): Exam[] {
    const updated = [...exams];
    const maxDaily = globalConstraints.maxExamsPerDayPerPromotion || 1;

    // Track assigned slots per promotion: promoName -> { date -> count }
    const promoDailyCounts: Record<string, Record<string, number>> = {};
    const promoOccupancy: Record<string, { date: string; start: string; end: string }[]> = {};

    // Available (date, slot) list
    const availableSlots: { date: string; slot: TimeSlot }[] = [];
    for (const date of sessionDates) {
      for (const slot of timeSlots) {
        availableSlots.push({ date, slot });
      }
    }

    // First, register all fixed / pre-assigned exams
    for (const exam of updated) {
      if (exam.date && exam.heureDebut) {
        const p = exam.niveau;
        if (p) {
          if (!promoOccupancy[p]) promoOccupancy[p] = [];
          promoOccupancy[p].push({ date: exam.date, start: exam.heureDebut, end: exam.heureFin });
          if (!promoDailyCounts[p]) promoDailyCounts[p] = {};
          promoDailyCounts[p][exam.date] = (promoDailyCounts[p][exam.date] || 0) + 1;
        }
      }
    }

    // Group exams into clusters:
    // Only multi-promotion exams explicitly linked during subject entry (shared commonGroupId or sharedPromotions) MUST be scheduled together.
    // Standalone exams for other promotions remain independent entities.
    const getSubjectClusterKey = (ex: Exam) => {
      if (ex.commonGroupId) {
        return `cgrp_${ex.commonGroupId}`;
      }
      if (ex.sharedPromotions && ex.sharedPromotions.length > 1) {
        const sortedPromos = [...ex.sharedPromotions].map(p => p.trim().toLowerCase()).sort().join('___');
        const codeOrNom = (ex.codeModule || ex.nomModule || '').trim().toUpperCase();
        return `shared_${codeOrNom}___${sortedPromos}`;
      }
      // Standalone exam for its own promotion:
      const promo = (ex.niveau || ex.promotion || '').trim().toLowerCase();
      const codeOrNom = (ex.codeModule || ex.nomModule || '').trim().toUpperCase();
      return `standalone_${ex.id || `${codeOrNom}___${promo}`}`;
    };

    const clustersMap = new Map<string, Exam[]>();
    for (const exam of updated) {
      const key = getSubjectClusterKey(exam);
      if (!clustersMap.has(key)) {
        clustersMap.set(key, []);
      }
      clustersMap.get(key)!.push(exam);
    }

    // Sort clusters: multi-promo or larger student groups first
    const clusters = Array.from(clustersMap.values()).sort((a, b) => {
      const totalStudentsA = a.reduce((sum, e) => sum + (e.nbEtudiants || 45), 0);
      const totalStudentsB = b.reduce((sum, e) => sum + (e.nbEtudiants || 45), 0);
      return totalStudentsB - totalStudentsA;
    });

    for (const cluster of clusters) {
      // Check if any exam in this cluster is already fixed to a date/time
      const fixedExam = cluster.find(e => e.date && e.heureDebut);

      if (fixedExam) {
        // Synchronize all other exams in this cluster to the same date and time!
        const targetDate = fixedExam.date;
        const targetStart = fixedExam.heureDebut;
        const targetEnd = fixedExam.heureFin;

        for (const exam of cluster) {
          if (!exam.date || !exam.heureDebut) {
            exam.date = targetDate;
            exam.heureDebut = targetStart;
            exam.heureFin = targetEnd;

            const p = exam.niveau;
            if (p) {
              if (!promoOccupancy[p]) promoOccupancy[p] = [];
              promoOccupancy[p].push({ date: targetDate, start: targetStart, end: targetEnd });
              if (!promoDailyCounts[p]) promoDailyCounts[p] = {};
              promoDailyCounts[p][targetDate] = (promoDailyCounts[p][targetDate] || 0) + 1;
            }
          }
        }
        continue;
      }

      // Find a slot that is valid for ALL promotions in this cluster simultaneously
      const unplacedExamsInCluster = cluster.filter(e => !e.date || !e.heureDebut);
      if (unplacedExamsInCluster.length === 0) continue;

      let placed = false;
      for (const slotObj of availableSlots) {
        const { date, slot } = slotObj;
        const slotStart = slot.debut || slot.heureDebut || '08:30';
        const slotEnd = slot.fin || slot.heureFin || '10:30';

        // Check compatibility for all exams/promotions in this cluster
        let isSlotValidForAll = true;
        for (const exam of unplacedExamsInCluster) {
          const promoName = exam.niveau;
          if (promoName) {
            const countToday = promoDailyCounts[promoName]?.[date] || 0;
            if (countToday >= maxDaily) {
              isSlotValidForAll = false;
              break;
            }

            const overlaps = promoOccupancy[promoName]?.some(occ => 
              occ.date === date && doTimesOverlap(occ.start, occ.end, slotStart, slotEnd)
            );
            if (overlaps) {
              isSlotValidForAll = false;
              break;
            }
          }
        }

        if (isSlotValidForAll) {
          // Assign this exact date and time slot to all exams in the cluster
          for (const exam of unplacedExamsInCluster) {
            exam.date = date;
            exam.heureDebut = slotStart;
            exam.heureFin = slotEnd;

            const promoName = exam.niveau;
            if (promoName) {
              if (!promoOccupancy[promoName]) promoOccupancy[promoName] = [];
              promoOccupancy[promoName].push({ date, start: slotStart, end: slotEnd });

              if (!promoDailyCounts[promoName]) promoDailyCounts[promoName] = {};
              promoDailyCounts[promoName][date] = (promoDailyCounts[promoName][date] || 0) + 1;
            }
          }

          if (unplacedExamsInCluster.length > 1) {
            logs.push(`Synchronisation multi-promotions : "${unplacedExamsInCluster[0].nomModule}" planifiée pour ${unplacedExamsInCluster.map(e => e.niveau).join(', ')} le ${date} à ${slotStart}.`);
          }

          placed = true;
          break;
        }
      }

      if (!placed) {
        for (const exam of unplacedExamsInCluster) {
          logs.push(`Épreuve non placée (manque de créneaux compatibles) : ${exam.nomModule} (${exam.niveau})`);
        }
      }
    }

    return updated;
  }

  /**
   * Assigns physical rooms to scheduled exams according to student count & availability
   */
  private static assignRoomsToExams(
    exams: Exam[],
    rooms: Room[],
    globalConstraints: GlobalConstraints,
    logs: string[],
    promotions?: PromotionGroup[]
  ): Exam[] {
    const updated = [...exams];
    const sortedRooms = [...rooms].sort((a, b) => (b.capaciteExamen || b.capacite || 40) - (a.capaciteExamen || a.capacite || 40));

    // Map promotion name/id to designated room if any
    const promoRoomMap = new Map<string, Room>();
    if (promotions && promotions.length > 0) {
      for (const p of promotions) {
        if (p.salleAssigneeId) {
          const r = rooms.find(room => room.id === p.salleAssigneeId);
          if (r) {
            promoRoomMap.set(p.nom.toLowerCase().trim(), r);
            promoRoomMap.set(p.id, r);
            if (p.code) promoRoomMap.set(p.code.toLowerCase().trim(), r);
          }
        } else if (p.salleAssigneeNom) {
          const r = rooms.find(room => room.nom.toLowerCase().trim() === p.salleAssigneeNom!.toLowerCase().trim());
          if (r) {
            promoRoomMap.set(p.nom.toLowerCase().trim(), r);
            promoRoomMap.set(p.id, r);
            if (p.code) promoRoomMap.set(p.code.toLowerCase().trim(), r);
          }
        }
      }
    }

    // Track room usage per (date + time range)
    const roomUsage: { roomId: string; date: string; start: string; end: string }[] = [];

    for (const exam of updated) {
      if (!exam.date || !exam.heureDebut) continue;

      // Check which rooms are already occupied at this time
      const busyRoomIds = new Set<string>();
      roomUsage.forEach(u => {
        if (u.date === exam.date && doTimesOverlap(u.start, u.end, exam.heureDebut, exam.heureFin)) {
          busyRoomIds.add(u.roomId);
        }
      });

      const neededStudents = exam.nbEtudiants || 40;
      let currentCapacity = 0;
      const validCurrentAssignments: RoomAssignment[] = [];

      // Priority 1: Check if the exam's promotion has a designated room (e.g. L2 GC in Salle C10, L2 Hydr in Salle C14)
      const examPromoKey = (exam.niveau || exam.promotion || '').toLowerCase().trim();
      const designatedRoom = promoRoomMap.get(examPromoKey);

      if (designatedRoom && !busyRoomIds.has(designatedRoom.id)) {
        validCurrentAssignments.push({
          roomId: designatedRoom.id,
          surveillants: []
        });
        currentCapacity += (designatedRoom.capaciteExamen || designatedRoom.capacite || 40);
        busyRoomIds.add(designatedRoom.id);
        roomUsage.push({ roomId: designatedRoom.id, date: exam.date, start: exam.heureDebut, end: exam.heureFin });

        if (exam.sharedPromotions && exam.sharedPromotions.length > 1) {
          logs.push(`Module partagé "${exam.nomModule}" : Salle attribuée à ${exam.niveau} -> ${designatedRoom.nom}.`);
        }
      }

      // Priority 2: If exam already has valid rooms that aren't conflicting, retain them
      if (currentCapacity < neededStudents) {
        for (const s of exam.salles) {
          if (!busyRoomIds.has(s.roomId)) {
            const rObj = rooms.find(r => r.id === s.roomId);
            if (rObj) {
              validCurrentAssignments.push(s);
              currentCapacity += (rObj.capaciteExamen || rObj.capacite || 40);
              busyRoomIds.add(s.roomId);
              roomUsage.push({ roomId: s.roomId, date: exam.date, start: exam.heureDebut, end: exam.heureFin });
              if (currentCapacity >= neededStudents) break;
            }
          }
        }
      }

      // Priority 3: If we still need more capacity, pick available rooms (ensuring separate rooms if needed)
      if (currentCapacity < neededStudents) {
        for (const candidateRoom of sortedRooms) {
          if (!busyRoomIds.has(candidateRoom.id)) {
            validCurrentAssignments.push({
              roomId: candidateRoom.id,
              surveillants: []
            });
            currentCapacity += (candidateRoom.capaciteExamen || candidateRoom.capacite || 40);
            busyRoomIds.add(candidateRoom.id);
            roomUsage.push({ roomId: candidateRoom.id, date: exam.date, start: exam.heureDebut, end: exam.heureFin });

            if (currentCapacity >= neededStudents) {
              break;
            }
          }
        }
      }

      if (validCurrentAssignments.length > 0) {
        exam.salles = validCurrentAssignments;
      } else {
        logs.push(`Attention : Aucune salle libre trouvée pour ${exam.nomModule} (${exam.niveau}) le ${exam.date} ${exam.heureDebut}`);
      }
    }

    return updated;
  }

  /**
   * Distributes teacher surveillance duties equitably respecting time-off constraints & quotas
   */
  private static assignSurveillantsToExams(
    exams: Exam[],
    teachers: Teacher[],
    timeOffConstraints: TimeOffEntry[],
    globalConstraints: GlobalConstraints,
    options: AutoGeneratorOptions,
    logs: string[]
  ): Exam[] {
    const updated = [...exams];

    // Track teacher assignments count and schedule
    const teacherSurvCounts: Record<string, number> = {};
    const teacherSchedule: Record<string, { date: string; start: string; end: string }[]> = {};
    const teacherDailyCounts: Record<string, Record<string, number>> = {};

    teachers.forEach(t => {
      teacherSurvCounts[t.id] = 0;
      teacherSchedule[t.id] = [];
      teacherDailyCounts[t.id] = {};
    });

    // Populate existing locked surveillants
    updated.forEach(ex => {
      if (!ex.date || !ex.heureDebut) return;
      ex.salles.forEach(s => {
        s.surveillants.forEach(sv => {
          if (teacherSurvCounts[sv.teacherId] !== undefined) {
            teacherSurvCounts[sv.teacherId]++;
            teacherSchedule[sv.teacherId].push({ date: ex.date, start: ex.heureDebut, end: ex.heureFin });
            if (!teacherDailyCounts[sv.teacherId][ex.date]) teacherDailyCounts[sv.teacherId][ex.date] = 0;
            teacherDailyCounts[sv.teacherId][ex.date]++;
          }
        });
      });
    });

    const maxDailyPerTeacher = globalConstraints.maxSurveillancesPerDayPerTeacher || 2;

    // Iterate through all exams and rooms needing surveillants
    for (const exam of updated) {
      if (!exam.date || !exam.heureDebut) continue;

      for (const salleAssign of exam.salles) {
        const currentCount = salleAssign.surveillants.length;
        const requiredCount = Math.max(1, salleAssign.surveillants.length > 0 ? salleAssign.surveillants.length : 2);
        const needed = requiredCount - currentCount;

        if (needed <= 0) continue;

        // Rank available teachers for this slot
        const candidates = teachers.filter(t => {
          // 0. Exclude the module responsible teacher
          if (exam.responsableId && t.id === exam.responsableId) return false;

          // 1. Not already assigned at this exact time
          const hasTimeConflict = teacherSchedule[t.id]?.some(sc =>
            sc.date === exam.date && doTimesOverlap(sc.start, sc.end, exam.heureDebut, exam.heureFin)
          );
          if (hasTimeConflict) return false;

          // 2. Not exceeding daily limit
          const todayCount = teacherDailyCounts[t.id]?.[exam.date] || 0;
          if (todayCount >= maxDailyPerTeacher) return false;

          // 3. Time-off veto check
          if (options.respectTimeOff) {
            const veto = timeOffConstraints.find(
              c => c.entityId === t.id && c.entityType === 'teacher' && c.date === exam.date && c.value === 'UNAVAILABLE'
            );
            if (veto) return false;
          }

          // 4. Quota check
          const quota = t.quotaSouhaite || globalConstraints.maxTotalSurveillancesPerTeacher || 8;
          if (teacherSurvCounts[t.id] >= quota) return false;

          return true;
        });

        // Sort candidates by:
        // 1. Least total surveillances (fair distribution)
        // 2. No undesired preference
        candidates.sort((a, b) => {
          // Check undesired
          const aUndesired = timeOffConstraints.some(
            c => c.entityId === a.id && c.entityType === 'teacher' && c.date === exam.date && c.value === 'UNDESIRED'
          );
          const bUndesired = timeOffConstraints.some(
            c => c.entityId === b.id && c.entityType === 'teacher' && c.date === exam.date && c.value === 'UNDESIRED'
          );
          if (aUndesired !== bUndesired) return aUndesired ? 1 : -1;

          // Fair load
          const loadDiff = (teacherSurvCounts[a.id] || 0) - (teacherSurvCounts[b.id] || 0);
          if (loadDiff !== 0) return loadDiff;

          return 0;
        });

        // Pick top candidates
        const toAssign = candidates.slice(0, needed);
        for (let i = 0; i < toAssign.length; i++) {
          const chosen = toAssign[i];
          const isPrincipal = salleAssign.surveillants.length === 0;

          salleAssign.surveillants.push({
            teacherId: chosen.id,
            role: isPrincipal ? 'Surveillant Principal' : 'Surveillant Adjoint',
            isConfirmed: true
          });

          teacherSurvCounts[chosen.id]++;
          teacherSchedule[chosen.id].push({ date: exam.date, start: exam.heureDebut, end: exam.heureFin });
          if (!teacherDailyCounts[chosen.id][exam.date]) teacherDailyCounts[chosen.id][exam.date] = 0;
          teacherDailyCounts[chosen.id][exam.date]++;
        }
      }
    }

    return updated;
  }
}
