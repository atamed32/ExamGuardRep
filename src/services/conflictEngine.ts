import { 
  Exam, 
  Teacher, 
  Room, 
  ConflictAlert, 
  TeacherLoadStats, 
  TimeOffEntry, 
  GlobalConstraints, 
  PromotionGroup,
  Subject
} from '../types';

/**
 * Checks if two time intervals on the same day overlap.
 * Format of time strings: "HH:MM" (e.g. "08:30", "10:30")
 */
export function doTimesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  const [hA1, mA1] = startA.split(':').map(Number);
  const [hA2, mA2] = endA.split(':').map(Number);
  const [hB1, mB1] = startB.split(':').map(Number);
  const [hB2, mB2] = endB.split(':').map(Number);

  const startMinutesA = hA1 * 60 + mA1;
  const endMinutesA = hA2 * 60 + mA2;
  const startMinutesB = hB1 * 60 + mB1;
  const endMinutesB = hB2 * 60 + mB2;

  return Math.max(startMinutesA, startMinutesB) < Math.min(endMinutesA, endMinutesB);
}

/**
 * Calculates duration in hours between two HH:MM strings.
 */
export function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, Number((minutes / 60).toFixed(1)));
}

/**
 * Comprehensive engine to detect all schedule conflicts and warnings:
 * - Room Double Bookings
 * - Teacher Double Bookings
 * - Promotion (Students) Overlaps & Daily Limits
 * - Time-off / Veto Violations
 * - Understaffed or Empty Rooms
 * - Teacher Quota Overages
 */
export function detectAllConflicts(
  exams: Exam[],
  teachers: Teacher[],
  rooms: Room[],
  timeOffConstraints: TimeOffEntry[] = [],
  globalConstraints?: GlobalConstraints,
  promotions: PromotionGroup[] = []
): ConflictAlert[] {
  const conflicts: ConflictAlert[] = [];
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const promoMap = new Map((promotions || []).map(p => [p.nom.toLowerCase().trim(), p]));

  // Track daily exams per promotion for max exams per day rule
  const promoDailyExamCounts: Record<string, Record<string, string[]>> = {};

  // 1. Pairwise Exam Comparisons
  for (let i = 0; i < exams.length; i++) {
    const exam1 = exams[i];
    if (!exam1.date || !exam1.heureDebut) continue;

    // Track for promo daily limit
    if (exam1.niveau) {
      if (!promoDailyExamCounts[exam1.niveau]) promoDailyExamCounts[exam1.niveau] = {};
      if (!promoDailyExamCounts[exam1.niveau][exam1.date]) promoDailyExamCounts[exam1.niveau][exam1.date] = [];
      promoDailyExamCounts[exam1.niveau][exam1.date].push(exam1.id);
    }

    // Check understaffed rooms & single exam capacity
    exam1.salles.forEach(salleAssign => {
      const room = roomMap.get(salleAssign.roomId);
      const rName = room ? room.nom : salleAssign.roomId;
      const roomCap = room?.capaciteExamen || room?.capacite || 50;

      if (salleAssign.surveillants.length === 0) {
        conflicts.push({
          id: `conflict-empty-room-${exam1.id}-${salleAssign.roomId}`,
          type: 'MISSING_SURVEILLANTS',
          severity: 'warning',
          titre: `Salle sans surveillant : ${rName}`,
          description: `La salle "${rName}" pour l'épreuve "${exam1.nomModule}" (${exam1.date}) n'a aucun surveillant affecté.`,
          date: exam1.date,
          creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
          examIds: [exam1.id],
          roomId: salleAssign.roomId
        });
      }

      // Check if this single exam already exceeds room capacity (when not split across multiple rooms)
      const examStudents = exam1.nbEtudiants || (exam1.niveau ? promoMap.get(exam1.niveau.toLowerCase().trim())?.effectif : null) || 45;
      if (exam1.salles.length === 1 && examStudents > roomCap) {
        conflicts.push({
          id: `conflict-room-single-cap-${exam1.id}-${salleAssign.roomId}`,
          type: 'ROOM_CAPACITY_INSUFFICIENT',
          severity: 'warning',
          titre: `Capacité de salle dépassée : ${rName} (${examStudents}/${roomCap} pl.)`,
          description: `La salle "${rName}" (capacité : ${roomCap} places) accueille l'épreuve "${exam1.nomModule}" de la promotion "${exam1.niveau}" (${examStudents} étudiants). Dépassement de +${examStudents - roomCap} places.`,
          date: exam1.date,
          creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
          examIds: [exam1.id],
          roomId: salleAssign.roomId
        });
      }
    });

    // Check Time-Off violations for teachers in this exam
    if (timeOffConstraints && timeOffConstraints.length > 0) {
      exam1.salles.forEach(salleAssign => {
        salleAssign.surveillants.forEach(sv => {
          const tConstraints = timeOffConstraints.filter(
            c => c.entityId === sv.teacherId && c.entityType === 'teacher' && (c.date === exam1.date)
          );
          tConstraints.forEach(tc => {
            if (tc.slotId) {
              const slotTimeMap: Record<string, { start: string; end: string }> = {
                'slot-1': { start: '08:30', end: '10:00' },
                'slot-2': { start: '10:30', end: '12:00' },
                'slot-3': { start: '13:00', end: '14:30' },
                'slot-4': { start: '15:00', end: '16:30' }
              };
              const slotTime = slotTimeMap[tc.slotId];
              if (slotTime && !doTimesOverlap(exam1.heureDebut, exam1.heureFin, slotTime.start, slotTime.end)) {
                return;
              }
            }

            if (tc.value === 'UNAVAILABLE') {
              const teacher = teacherMap.get(sv.teacherId);
              const teacherName = teacher ? `${teacher.nom} ${teacher.prenom}` : sv.teacherId;
              conflicts.push({
                id: `conflict-timeoff-${exam1.id}-${sv.teacherId}-${exam1.date}`,
                type: 'TIME_OFF_VIOLATION',
                severity: 'error',
                titre: `Indisponibilité Enseignant : ${teacherName}`,
                description: `${teacherName} est affecté(e) le ${exam1.date} à "${exam1.nomModule}" malgré son indisponibilité (Temps Libre / Veto).`,
                date: exam1.date,
                creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
                examIds: [exam1.id],
                teacherId: sv.teacherId
              });
            } else if (tc.value === 'UNDESIRED') {
              const teacher = teacherMap.get(sv.teacherId);
              const teacherName = teacher ? `${teacher.nom} ${teacher.prenom}` : sv.teacherId;
              conflicts.push({
                id: `conflict-timeoff-warn-${exam1.id}-${sv.teacherId}-${exam1.date}`,
                type: 'TIME_OFF_VIOLATION',
                severity: 'warning',
                titre: `Créneau non souhaité : ${teacherName}`,
                description: `${teacherName} a signalé un souhait de ne pas surveiller le ${exam1.date} sur cette période.`,
                date: exam1.date,
                creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
                examIds: [exam1.id],
                teacherId: sv.teacherId
              });
            }
          });
        });
      });
    }

    // Compare with other exams
    for (let j = i + 1; j < exams.length; j++) {
      const exam2 = exams[j];
      if (!exam2.date || !exam2.heureDebut) continue;

      if (exam1.date === exam2.date && doTimesOverlap(exam1.heureDebut, exam1.heureFin, exam2.heureDebut, exam2.heureFin)) {
        
        // 1. Room Sharing & Capacity Check
        // Note: Multiple promotions in the same room at the same slot are allowed!
        // We check whether capacity is exceeded across the sharing promotions.
        for (const rAssign1 of exam1.salles) {
          for (const rAssign2 of exam2.salles) {
            if (rAssign1.roomId === rAssign2.roomId) {
              const room = roomMap.get(rAssign1.roomId);
              const roomName = room ? room.nom : `Salle (${rAssign1.roomId})`;
              const roomCap = room?.capaciteExamen || room?.capacite || 50;

              const promo1Eff = exam1.nbEtudiants || (exam1.niveau ? promoMap.get(exam1.niveau.toLowerCase().trim())?.effectif : null) || 45;
              const promo2Eff = exam2.nbEtudiants || (exam2.niveau ? promoMap.get(exam2.niveau.toLowerCase().trim())?.effectif : null) || 45;
              const combinedStudents = promo1Eff + promo2Eff;

              if (combinedStudents > roomCap) {
                conflicts.push({
                  id: `conflict-room-cap-${exam1.id}-${exam2.id}-${rAssign1.roomId}`,
                  type: 'ROOM_CAPACITY_INSUFFICIENT',
                  severity: 'warning',
                  titre: `Capacité de salle dépassée : ${roomName} (${combinedStudents}/${roomCap} pl.)`,
                  description: `La salle "${roomName}" (capacité : ${roomCap} places) accueille simultanément les promotions "${exam1.niveau}" (${promo1Eff} étud.) et "${exam2.niveau}" (${promo2Eff} étud.) pour un total de ${combinedStudents} étudiants. Dépassement de +${combinedStudents - roomCap} places.`,
                  date: exam1.date,
                  creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
                  examIds: [exam1.id, exam2.id],
                  roomId: rAssign1.roomId
                });
              }
            }
          }
        }

        // 2. Teacher Double Booking (only if teachers are assigned to DIFFERENT rooms at the same time)
        const teachers1 = new Set<string>();
        exam1.salles.forEach(s => s.surveillants.forEach(sv => teachers1.add(sv.teacherId)));

        const teachers2 = new Set<string>();
        exam2.salles.forEach(s => s.surveillants.forEach(sv => teachers2.add(sv.teacherId)));

        for (const tId of teachers1) {
          if (teachers2.has(tId)) {
            // Check if teacher is simply supervising the SAME physical room shared by both promotions
            const isSameRoom = exam1.salles.some(s1 => 
              exam2.salles.some(s2 => s1.roomId === s2.roomId && 
                s1.surveillants.some(sv => sv.teacherId === tId) && 
                s2.surveillants.some(sv => sv.teacherId === tId)
              )
            );

            if (!isSameRoom) {
              // Check if teacher is listed as academic coordinator ("Responsable de Matière") across the separate rooms of the same common module
              const isCoord1 = exam1.responsableId === tId || exam1.salles.some(s1 => s1.surveillants.some(sv => sv.teacherId === tId && sv.role === 'Responsable de Matière'));
              const isCoord2 = exam2.responsableId === tId || exam2.salles.some(s2 => s2.surveillants.some(sv => sv.teacherId === tId && sv.role === 'Responsable de Matière'));
              const isCommonModule = Boolean(
                (exam1.commonGroupId && exam1.commonGroupId === exam2.commonGroupId) ||
                (exam1.codeModule && exam1.codeModule === exam2.codeModule) ||
                (exam1.nomModule && exam1.nomModule.trim().toLowerCase() === exam2.nomModule.trim().toLowerCase())
              );

              if (isCoord1 && isCoord2 && isCommonModule) {
                // The teacher is the module coordinator circulating between the separate exam rooms for this shared subject
                continue;
              }

              const teacher = teacherMap.get(tId);
              const teacherName = teacher ? `${teacher.nom} ${teacher.prenom}` : `Enseignant (${tId})`;
              conflicts.push({
                id: `conflict-teacher-${exam1.id}-${exam2.id}-${tId}`,
                type: 'TEACHER_DOUBLE_BOOKING',
                severity: 'error',
                titre: `Chevauchement Enseignant : ${teacherName}`,
                description: `L'enseignant(e) ${teacherName} est programmé(e) sur deux surveillances dans des salles distinctes le ${exam1.date} aux mêmes horaires ("${exam1.nomModule}" et "${exam2.nomModule}").`,
                date: exam1.date,
                creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
                examIds: [exam1.id, exam2.id],
                teacherId: tId
              });
            }
          }
        }

        // 3. Promotion Double Booking (Students cannot pass 2 exams at same time!)
        if (exam1.niveau && exam2.niveau && exam1.niveau === exam2.niveau) {
          conflicts.push({
            id: `conflict-promo-overlap-${exam1.id}-${exam2.id}-${exam1.niveau}`,
            type: 'PROMOTION_OVERLAP',
            severity: 'error',
            titre: `Collision Promotion : ${exam1.niveau}`,
            description: `Les étudiants de la promotion "${exam1.niveau}" ont 2 épreuves programmées au même moment le ${exam1.date} ("${exam1.nomModule}" et "${exam2.nomModule}").`,
            date: exam1.date,
            creneau: `${exam1.heureDebut} - ${exam1.heureFin}`,
            examIds: [exam1.id, exam2.id],
            promotion: exam1.niveau
          });
        }
      }

      // 4. Multi-Promotion Shared Subject Synchronization Check
      // Only for exams that were explicitly linked during subject entry (shared commonGroupId or sharedPromotions).
      // Independent modules (e.g. 2eme année Ing vs L2) are not forced to be synchronized.
      if (
        exam1.date && exam2.date &&
        exam1.niveau !== exam2.niveau
      ) {
        const areLinkedMultiPromo = Boolean(
          (exam1.commonGroupId && exam2.commonGroupId && exam1.commonGroupId === exam2.commonGroupId) ||
          (
            exam1.sharedPromotions && exam1.sharedPromotions.length > 1 &&
            exam2.sharedPromotions && exam2.sharedPromotions.length > 1 &&
            exam1.sharedPromotions.some(p => p.toLowerCase().trim() === (exam2.niveau || '').toLowerCase().trim()) &&
            exam2.sharedPromotions.some(p => p.toLowerCase().trim() === (exam1.niveau || '').toLowerCase().trim())
          )
        );

        if (areLinkedMultiPromo) {
          if (exam1.date !== exam2.date || exam1.heureDebut !== exam2.heureDebut) {
            const respTeacher = exam1.responsableId ? teacherMap.get(exam1.responsableId) : undefined;
            const teacherName = respTeacher ? `${respTeacher.nom} ${respTeacher.prenom}` : 'Enseignant responsable';
            conflicts.push({
              id: `conflict-sync-subject-${exam1.id}-${exam2.id}`,
              type: 'RESPONSABLE_CONFLICT',
              severity: 'warning',
              titre: `Matière commune non synchronisée : ${exam1.nomModule}`,
              description: `Pour ${teacherName}, la matière partagée "${exam1.nomModule}" (${exam1.sharedPromotions?.join(', ') || 'promotions liées'}) est programmée à des dates/heures différentes pour "${exam1.niveau}" (${exam1.date} à ${exam1.heureDebut}) et "${exam2.niveau}" (${exam2.date} à ${exam2.heureDebut}). Les promotions cochées ensemble doivent être programmées le même jour et au même créneau.`,
              date: `${exam1.date} / ${exam2.date}`,
              creneau: `${exam1.heureDebut} vs ${exam2.heureDebut}`,
              examIds: [exam1.id, exam2.id],
              teacherId: exam1.responsableId
            });
          }
        }
      }
    }
  }

  // 2. Check Promotion Daily Limit (> maxExamsPerDayPerPromotion)
  const maxPerDay = globalConstraints?.maxExamsPerDayPerPromotion || 1;
  Object.entries(promoDailyExamCounts).forEach(([promoName, datesObj]) => {
    Object.entries(datesObj).forEach(([dateStr, examIds]) => {
      if (examIds.length > maxPerDay) {
        conflicts.push({
          id: `conflict-promo-daily-${promoName}-${dateStr}`,
          type: 'PROMOTION_OVERLAP',
          severity: 'warning',
          titre: `Promotion surchargée : ${promoName}`,
          description: `La promotion "${promoName}" a ${examIds.length} examens prévus le ${dateStr} (limite recommandée : ${maxPerDay}/jour).`,
          date: dateStr,
          creneau: 'Journée entière',
          examIds: examIds,
          promotion: promoName
        });
      }
    });
  });

  // 3. Check Teacher Quota Overages
  teachers.forEach(t => {
    const quota = t.quotaSouhaite || globalConstraints?.maxTotalSurveillancesPerTeacher || 8;
    let totalAssigned = 0;
    const teacherExams: string[] = [];

    exams.forEach(ex => {
      let inExam = false;
      ex.salles.forEach(s => {
        if (s.surveillants.some(sv => sv.teacherId === t.id)) {
          inExam = true;
        }
      });
      if (inExam) {
        totalAssigned++;
        teacherExams.push(ex.id);
      }
    });

    if (totalAssigned > quota) {
      conflicts.push({
        id: `conflict-quota-${t.id}`,
        type: 'TEACHER_OVER_QUOTA',
        severity: 'info',
        titre: `Dépassement Quota : ${t.nom} ${t.prenom}`,
        description: `${t.nom} ${t.prenom} a ${totalAssigned} séances affectées (quota max souhaité : ${quota}).`,
        date: 'Global',
        creneau: 'Session',
        examIds: teacherExams,
        teacherId: t.id
      });
    }
  });

  return conflicts;
}

/**
 * Calculates teacher workload statistics and individual schedules.
 */
export function calculateTeacherLoads(
  teachers: Teacher[],
  exams: Exam[],
  allConflicts: ConflictAlert[],
  subjects?: Subject[]
): TeacherLoadStats[] {
  return teachers.map(teacher => {
    let nbSurveillances = 0;
    let totalHeures = 0;
    const modulesResponsableSet = new Set<string>();

    exams.forEach(exam => {
      if (exam.responsableId === teacher.id && exam.nomModule) {
        modulesResponsableSet.add(exam.nomModule);
      }

      let isTeacherInExam = false;
      exam.salles?.forEach(salle => {
        const found = salle.surveillants?.find(s => s.teacherId === teacher.id);
        if (found) {
          isTeacherInExam = true;
        }
      });

      if (isTeacherInExam) {
        nbSurveillances += 1;
        totalHeures += calculateDurationHours(exam.heureDebut, exam.heureFin);
      }
    });

    if (subjects && subjects.length > 0) {
      subjects.forEach(sub => {
        if (sub.enseignantResponsableId === teacher.id || sub.responsableId === teacher.id) {
          const modName = sub.nom || sub.nomModule;
          if (modName) modulesResponsableSet.add(modName);
        }
      });
    }

    const modulesResponsable = Array.from(modulesResponsableSet);
    const teacherConflicts = allConflicts.filter(c => c.teacherId === teacher.id);

    return {
      teacherId: teacher.id,
      teacher,
      nbSurveillances,
      totalHeures: Number(totalHeures.toFixed(1)),
      modulesResponsable,
      nbResponsabilites: modulesResponsable.length,
      hasConflicts: teacherConflicts.length > 0,
      conflits: teacherConflicts
    };
  });
}

export const ConflictEngine = {
  detectAllConflicts,
  calculateTeacherLoads,
  doTimesOverlap,
  calculateDurationHours
};

