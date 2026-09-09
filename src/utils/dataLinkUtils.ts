import { Exam, SubjectModule, PromotionGroup } from '../types';

/**
 * Normalizes strings for case-insensitive and accent-tolerant matching
 */
export function normalizeString(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase();
}

export function normalizeCode(str?: string): string {
  if (!str) return '';
  return str.trim().toUpperCase();
}

/**
 * Checks if two promotion identifiers (name, code, or ID) refer to the exact same promotion.
 */
export function isSamePromotion(
  p1?: string,
  p2?: string,
  allPromotions?: PromotionGroup[]
): boolean {
  if (!p1 || !p2) return false;
  const s1 = p1.trim().toLowerCase();
  const s2 = p2.trim().toLowerCase();
  if (s1 === s2) return true;
  if (!allPromotions || allPromotions.length === 0) return false;

  const promo1 = allPromotions.find(p =>
    p.nom.trim().toLowerCase() === s1 ||
    (p.code && p.code.trim().toLowerCase() === s1) ||
    p.id === p1
  );
  const promo2 = allPromotions.find(p =>
    p.nom.trim().toLowerCase() === s2 ||
    (p.code && p.code.trim().toLowerCase() === s2) ||
    p.id === p2
  );

  if (promo1 && promo2) {
    return promo1.id === promo2.id || promo1.nom.trim().toLowerCase() === promo2.nom.trim().toLowerCase();
  }
  if (promo1) {
    return promo1.nom.trim().toLowerCase() === s2 || (promo1.code && promo1.code.trim().toLowerCase() === s2);
  }
  if (promo2) {
    return promo2.nom.trim().toLowerCase() === s1 || (promo2.code && promo2.code.trim().toLowerCase() === s1);
  }
  return false;
}

/**
 * Resolves a promotion string/code/id to its canonical display name.
 */
export function getCanonicalPromotionName(
  pName?: string,
  allPromotions?: PromotionGroup[]
): string {
  if (!pName) return '';
  const s = pName.trim().toLowerCase();
  if (!allPromotions || allPromotions.length === 0) return pName.trim();
  const found = allPromotions.find(p =>
    p.nom.trim().toLowerCase() === s ||
    (p.code && p.code.trim().toLowerCase() === s) ||
    p.id === pName
  );
  return found ? found.nom : pName.trim();
}

/**
 * Returns all promotions checked/planned for a given subject code or name in the subjects catalog
 */
export function getPlannedPromotionsForSubject(
  subjectCode: string | undefined,
  subjectNom: string | undefined,
  subjects: SubjectModule[]
): string[] {
  if (!subjects || subjects.length === 0) return [];
  const codeUp = normalizeCode(subjectCode);
  const nomLow = normalizeString(subjectNom);

  const matchedPromos = new Set<string>();
  subjects.forEach(s => {
    const sc = normalizeCode(s.code || s.codeModule);
    const sn = normalizeString(s.nom || s.nomModule);
    const isMatch = (codeUp && sc === codeUp) || (nomLow && sn === nomLow);
    if (isMatch) {
      if (s.promotion) {
        matchedPromos.add(s.promotion.trim());
      }
      if (s.sharedPromotions) {
        s.sharedPromotions.forEach(sp => {
          if (sp && sp.trim()) matchedPromos.add(sp.trim());
        });
      }
    }
  });

  return Array.from(matchedPromos);
}

/**
 * Checks if a subject is planned (checked) for a given promotion in base data (matières & modules)
 */
export function isSubjectPlannedForPromotion(
  promoName: string,
  subjectCode: string | undefined,
  subjectNom: string | undefined,
  subjects: SubjectModule[]
): boolean {
  if (!promoName) return false;
  if (!subjects || subjects.length === 0) return true;

  const targetPromo = normalizeString(promoName);
  const codeUp = normalizeCode(subjectCode);
  const nomLow = normalizeString(subjectNom);

  // Check if this module exists in the catalog at all
  let moduleExistsInCatalog = false;
  let isPlannedForTarget = false;

  for (const s of subjects) {
    const sc = normalizeCode(s.code || s.codeModule);
    const sn = normalizeString(s.nom || s.nomModule);
    const isModuleMatch = (codeUp && sc === codeUp) || (nomLow && sn === nomLow);

    if (isModuleMatch) {
      moduleExistsInCatalog = true;
      const sp = normalizeString(s.promotion);
      const isShared = s.sharedPromotions && s.sharedPromotions.some(shp => normalizeString(shp) === targetPromo);
      if (sp === targetPromo || isShared) {
        isPlannedForTarget = true;
        break;
      }
    }
  }

  // If the module is in the catalog, it MUST be explicitly planned (checked) for this promotion
  if (moduleExistsInCatalog) {
    return isPlannedForTarget;
  }

  // If the module is not in the catalog at all, do not plan it unless subjects catalog is empty
  return false;
}

/**
 * Sanitizes exams by:
 * 1. Removing orphan exams (exams for promotions where the module is not checked/planned)
 * 2. Deduplicating multiple exams for the exact same module and promotion
 */
export function sanitizeAndLinkExamsWithSubjects(
  exams: Exam[],
  subjects: SubjectModule[]
): Exam[] {
  if (!exams || exams.length === 0) return [];
  if (!subjects || subjects.length === 0) {
    // Just deduplicate exact duplicate records
    const seen = new Set<string>();
    return exams.filter(e => {
      const key = `${normalizeCode(e.codeModule)}|${normalizeString(e.niveau || e.promotion)}|${e.date || ''}|${e.heureDebut || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Build lookup map for fast checking
  const plannedMap = new Map<string, Set<string>>();
  subjects.forEach(s => {
    const sc = normalizeCode(s.code || s.codeModule);
    const sn = normalizeString(s.nom || s.nomModule);
    const sp = normalizeString(s.promotion);
    if (sp) {
      if (sc) {
        if (!plannedMap.has(`code:${sc}`)) plannedMap.set(`code:${sc}`, new Set());
        plannedMap.get(`code:${sc}`)!.add(sp);
      }
      if (sn) {
        if (!plannedMap.has(`nom:${sn}`)) plannedMap.set(`nom:${sn}`, new Set());
        plannedMap.get(`nom:${sn}`)!.add(sp);
      }
    }
    // Also include all shared promotions
    if (s.sharedPromotions) {
      s.sharedPromotions.forEach(shp => {
        const shpNorm = normalizeString(shp);
        if (shpNorm) {
          if (sc) {
            if (!plannedMap.has(`code:${sc}`)) plannedMap.set(`code:${sc}`, new Set());
            plannedMap.get(`code:${sc}`)!.add(shpNorm);
          }
          if (sn) {
            if (!plannedMap.has(`nom:${sn}`)) plannedMap.set(`nom:${sn}`, new Set());
            plannedMap.get(`nom:${sn}`)!.add(shpNorm);
          }
        }
      });
    }
  });

  const seenPromoModule = new Set<string>();
  const sanitized: Exam[] = [];

  for (const ex of exams) {
    const sc = normalizeCode(ex.codeModule);
    const sn = normalizeString(ex.nomModule);
    const ep = normalizeString(ex.niveau || ex.promotion);

    // Direct subject pointer check
    const directSubject = ex.subjectId ? subjects.find(s => s.id === ex.subjectId) : undefined;

    const allowedByCode = sc && plannedMap.has(`code:${sc}`) ? plannedMap.get(`code:${sc}`) : null;
    const allowedByNom = sn && plannedMap.has(`nom:${sn}`) ? plannedMap.get(`nom:${sn}`) : null;
    const isModuleInCatalog = Boolean(directSubject || allowedByCode || allowedByNom);

    // If module is defined in catalog, verify that this promotion was checked
    if (isModuleInCatalog && !directSubject) {
      if (!ep) {
        // Discard exams with no promotion
        continue;
      }
      const isAllowed = (allowedByCode && allowedByCode.has(ep)) || (allowedByNom && allowedByNom.has(ep));
      if (!isAllowed) {
        // Exam is for a promotion where this module is NOT checked! Purge it.
        continue;
      }
    }

    // Deduplicate: A subject must appear only once for the same promotion
    // If multiple exams exist for the same module and promotion, keep the one that is placed, or the first one
    const dedupeKey = `${sc || sn}|${ep}`;
    if (sc || sn) {
      if (seenPromoModule.has(dedupeKey)) {
        // Already retained an exam for this module and promotion
        continue;
      }
      seenPromoModule.add(dedupeKey);
    }

    // Link ID pointers for normalized reactive architecture
    const matchedSubject = directSubject || subjects.find(s => {
      if (ex.subjectId && s.id === ex.subjectId) return true;
      const samePromo = !ep || normalizeString(s.promotion) === ep || (s.sharedPromotions && s.sharedPromotions.some(shp => normalizeString(shp) === ep));
      const scMatch = sc && normalizeCode(s.code || s.codeModule) === sc;
      const snMatch = sn && normalizeString(s.nom || s.nomModule) === sn;
      return samePromo && (scMatch || snMatch);
    }) || subjects.find(s => {
      const scMatch = sc && normalizeCode(s.code || s.codeModule) === sc;
      const snMatch = sn && normalizeString(s.nom || s.nomModule) === sn;
      return scMatch || snMatch;
    });

    const subjectId = matchedSubject?.id || ex.subjectId;
    const salles = (ex.salles || []).map(s => ({
      ...s,
      teacherIds: s.teacherIds || (s.surveillants || []).map(sv => sv.teacherId)
    }));

    sanitized.push({
      ...ex,
      subjectId,
      codeModule: matchedSubject?.code || matchedSubject?.codeModule || ex.codeModule,
      nomModule: matchedSubject?.nom || matchedSubject?.nomModule || ex.nomModule,
      responsableId: matchedSubject?.enseignantResponsableId || matchedSubject?.responsableId || ex.responsableId,
      salles
    });
  }

  return sanitized;
}

/**
 * Returns the promotions that are strictly linked (scheduled together) for an exam.
 * Only promotions explicitly checked together during data entry (sharing commonGroupId or sharedPromotions)
 * will be linked. Independent entries remain strictly independent.
 */
export function getLinkedPromotionsForExam(
  exam: Exam,
  allExams: Exam[],
  allSubjects: SubjectModule[],
  allPromotions?: PromotionGroup[]
): string[] {
  const examPromo = (exam.niveau || exam.promotion || '').trim();
  const examCode = (exam.codeModule || '').toUpperCase().trim();
  const examNom = (exam.nomModule || '').toLowerCase().trim();

  const collected = new Set<string>();

  // If exam.niveau itself lists multiple promotions (e.g. "L2 Hydraulique, L2 Génie Civil")
  if (examPromo.includes(',') || examPromo.includes(' / ') || examPromo.includes(' & ')) {
    const splitPromos = examPromo.split(/,|\/|&/).map(p => p.trim()).filter(Boolean);
    splitPromos.forEach(p => collected.add(p));
  }

  // 1. If exam has explicit sharedPromotions
  if (exam.sharedPromotions && Array.isArray(exam.sharedPromotions)) {
    exam.sharedPromotions.forEach(p => {
      if (p && p.trim()) collected.add(p.trim());
    });
  }

  // 2. If commonGroupId exists on exam
  if (exam.commonGroupId) {
    allSubjects
      .filter(s => s.commonGroupId === exam.commonGroupId)
      .forEach(s => {
        if (s.promotion) collected.add(s.promotion.trim());
        if (s.sharedPromotions) s.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
      });

    allExams
      .filter(e => e.commonGroupId === exam.commonGroupId)
      .forEach(e => {
        const ep = (e.niveau || e.promotion || '').trim();
        if (ep) collected.add(ep);
        if (e.sharedPromotions) e.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
      });
  }

  // 3. Find matching subjects in catalog
  const matchingSubs = allSubjects.filter(s => {
    const sc = (s.code || s.codeModule || '').toUpperCase().trim();
    const sn = (s.nom || s.nomModule || '').toLowerCase().trim();
    const matchesModule = (examCode && sc === examCode) || (examNom && sn === examNom);
    if (!matchesModule) return false;

    // Check if subject is for this exam's promotion or linked to it
    const sp = (s.promotion || '').trim();
    if (examPromo && isSamePromotion(sp, examPromo, allPromotions)) return true;
    if (s.sharedPromotions && examPromo && s.sharedPromotions.some(p => isSamePromotion(p, examPromo, allPromotions))) return true;
    if (exam.commonGroupId && s.commonGroupId === exam.commonGroupId) return true;
    return false;
  });

  matchingSubs.forEach(sub => {
    if (sub.promotion) collected.add(sub.promotion.trim());
    if (sub.sharedPromotions) sub.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
    if (sub.commonGroupId) {
      allSubjects
        .filter(s => s.commonGroupId === sub.commonGroupId)
        .forEach(s => {
          if (s.promotion) collected.add(s.promotion.trim());
          if (s.sharedPromotions) s.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
        });
    }
  });

  // Always include exam's own promotion
  if (examPromo) {
    collected.add(examPromo);
  }

  // Canonicalize with allPromotions if available
  const result: string[] = [];
  const seenCanonical = new Set<string>();

  collected.forEach(pStr => {
    const canon = getCanonicalPromotionName(pStr, allPromotions);
    const key = canon.toLowerCase().trim();
    if (key && !seenCanonical.has(key)) {
      seenCanonical.add(key);
      result.push(canon);
    }
  });

  return result.length > 0 ? result : (examPromo ? [getCanonicalPromotionName(examPromo, allPromotions)] : []);
}

/**
 * Returns the promotions that are strictly linked (scheduled together) for a subject dragged from reserve.
 */
export function getLinkedPromotionsForSubject(
  sub: { id?: string; code?: string; nom?: string; promo?: string; commonGroupId?: string; sharedPromotions?: string[] },
  allSubjects: SubjectModule[],
  allExams?: Exam[],
  allPromotions?: PromotionGroup[]
): string[] {
  const subPromo = (sub.promo || '').trim();
  const subCode = (sub.code || '').toUpperCase().trim();
  const subNom = (sub.nom || '').toLowerCase().trim();

  const collected = new Set<string>();

  // 1. Explicit sharedPromotions on dragged subject
  if (sub.sharedPromotions && Array.isArray(sub.sharedPromotions)) {
    sub.sharedPromotions.forEach(p => p && p.trim() && collected.add(p.trim()));
  }

  // 2. commonGroupId on dragged subject
  if (sub.commonGroupId) {
    allSubjects
      .filter(s => s.commonGroupId === sub.commonGroupId)
      .forEach(s => {
        if (s.promotion) collected.add(s.promotion.trim());
        if (s.sharedPromotions) s.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
      });

    if (allExams) {
      allExams
        .filter(e => e.commonGroupId === sub.commonGroupId)
        .forEach(e => {
          const ep = (e.niveau || e.promotion || '').trim();
          if (ep) collected.add(ep);
          if (e.sharedPromotions) e.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
        });
    }
  }

  // 3. Find matching subjects in catalog
  const matchingSubs = allSubjects.filter(s => {
    if (sub.id && s.id === sub.id) return true;
    const sc = (s.code || s.codeModule || '').toUpperCase().trim();
    const sn = (s.nom || s.nomModule || '').toLowerCase().trim();
    const matchesModule = (subCode && sc === subCode) || (subNom && sn === subNom);
    if (!matchesModule) return false;

    const sp = (s.promotion || '').trim();
    if (subPromo && isSamePromotion(sp, subPromo, allPromotions)) return true;
    if (s.sharedPromotions && subPromo && s.sharedPromotions.some(p => isSamePromotion(p, subPromo, allPromotions))) return true;
    return false;
  });

  matchingSubs.forEach(s => {
    if (s.promotion) collected.add(s.promotion.trim());
    if (s.sharedPromotions) s.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
    if (s.commonGroupId) {
      allSubjects
        .filter(os => os.commonGroupId === s.commonGroupId)
        .forEach(os => {
          if (os.promotion) collected.add(os.promotion.trim());
          if (os.sharedPromotions) os.sharedPromotions.forEach(sp => sp && collected.add(sp.trim()));
        });
    }
  });

  // Always include sub's own promo
  if (subPromo) {
    collected.add(subPromo);
  }

  // Canonicalize
  const result: string[] = [];
  const seenCanonical = new Set<string>();

  collected.forEach(pStr => {
    const canon = getCanonicalPromotionName(pStr, allPromotions);
    const key = canon.toLowerCase().trim();
    if (key && !seenCanonical.has(key)) {
      seenCanonical.add(key);
      result.push(canon);
    }
  });

  return result.length > 0 ? result : (subPromo ? [getCanonicalPromotionName(subPromo, allPromotions)] : []);
}
