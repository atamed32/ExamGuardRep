import { GradeType } from '../types';

export const GRADE_OPTIONS: GradeType[] = [
  'Pr.',
  'MCA',
  'MCB',
  'MAA',
  'MAB',
  'Doctorant / Vacataire',
  'Autre'
];

export const SEMESTER_OPTIONS: string[] = [
  'Semestre impair',
  'Semestre pair'
];

/**
 * Returns the exact standardized abbreviation for any teacher grade string:
 * - Professeur -> Pr.
 * - Maître de conférences A (MCA) -> MCA
 * - Maître de conférences B (MCB) -> MCB
 * - Maître assistant A (MAA) -> MAA
 * - Maître assistant B (MAB) -> MAB
 */
export function formatGrade(grade?: string | null): string {
  if (!grade) return 'Autre';
  const g = grade.trim();

  if (g.startsWith('Pr.') || g.startsWith('Pr') || g.toLowerCase().includes('professeur')) {
    return 'Pr.';
  }
  if (g.includes('MCA') || g.toLowerCase().includes('conférences a') || g.toLowerCase().includes('conferences a')) {
    return 'MCA';
  }
  if (g.includes('MCB') || g.toLowerCase().includes('conférences b') || g.toLowerCase().includes('conferences b')) {
    return 'MCB';
  }
  if (g.includes('MAA') || g.toLowerCase().includes('assistant a')) {
    return 'MAA';
  }
  if (g.includes('MAB') || g.toLowerCase().includes('assistant b')) {
    return 'MAB';
  }
  if (g.toLowerCase().includes('doctorant') || g.toLowerCase().includes('vacataire')) {
    return 'Doctorant';
  }
  return g;
}

/**
 * Standardize semester string into 'Semestre impair' or 'Semestre pair'
 */
export function formatSemester(semester?: string | null): string {
  if (!semester) return 'Semestre impair';
  const s = semester.trim();
  const lower = s.toLowerCase();
  if (
    lower.includes('impair') || 
    s === 'S1' || 
    s === 'S3' || 
    s === 'S5' || 
    lower === 'semestre 1' || 
    lower === 'semestre 3' || 
    lower === 'semestre 5' ||
    lower.includes('s1') ||
    lower.includes('s3') ||
    lower.includes('s5')
  ) {
    return 'Semestre impair';
  }
  if (
    lower.includes('pair') || 
    s === 'S2' || 
    s === 'S4' || 
    s === 'S6' || 
    lower === 'semestre 2' || 
    lower === 'semestre 4' || 
    lower === 'semestre 6' ||
    lower.includes('s2') ||
    lower.includes('s4') ||
    lower.includes('s6')
  ) {
    return 'Semestre pair';
  }
  return 'Semestre impair';
}

/**
 * Returns the teacher's name formatted specifically for timetables,
 * prepending their custom "titre" (e.g. Dr., Pr., M., Mme.) before the name if defined.
 */
export function formatTeacherForTimetable(
  teacher?: { nom: string; prenom?: string; titre?: string } | null,
  options?: { showInitial?: boolean; uppercaseNom?: boolean }
): string {
  if (!teacher) return '';
  const nom = options?.uppercaseNom ? teacher.nom.trim().toUpperCase() : teacher.nom.trim();
  const prenomStr = options?.showInitial
    ? (teacher.prenom ? ` ${teacher.prenom.trim().charAt(0).toUpperCase()}.` : '')
    : (teacher.prenom ? ` ${teacher.prenom.trim()}` : '');
  const titlePrefix = teacher.titre?.trim() ? `${teacher.titre.trim()} ` : '';
  return `${titlePrefix}${nom}${prenomStr}`.trim();
}
