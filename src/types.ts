export type GradeType = 
  | 'Pr.' 
  | 'MCA' 
  | 'MCB' 
  | 'MAA' 
  | 'MAB' 
  | 'Doctorant / Vacataire'
  | 'Autre'
  | 'Professeur' 
  | 'Maître de Conférences A (MCA)' 
  | 'Maître de Conférences B (MCB)' 
  | 'Maître Assistant A (MAA)' 
  | 'Maître Assistant B (MAB)';

export type RoomType = 'Amphithéâtre' | 'Salle TD' | 'Salle TP' | 'Laboratoire';

export type SessionType = 'Ordinaire' | 'Normale' | 'Rattrapage' | 'Extraordinaire';
export type SemesterType = 'Semestre impair' | 'Semestre pair' | 'Semestre 1 (S1)' | 'Semestre 2 (S2)' | 'S1' | 'S2';

export type RoleInExam = 'Surveillant Principal' | 'Surveillant Adjoint' | 'Responsable de Matière' | 'principal' | 'adjoint';

export type SubstitutionStatus = 'En attente' | 'En Attente' | 'Validé par Chef Dept' | 'Rejeté';

export type AttendanceStatus = 'Présent' | 'En retard' | 'Remplacé' | 'Absent non justifié' | 'Absent justifié';

export interface Teacher {
  id: string;
  nom: string;
  prenom: string;
  titre?: string; // ex: 'Dr.', 'Pr.', 'M.', 'Mme.' — affiché dans les emplois du temps avant le nom
  email: string;
  telephone: string;
  grade: GradeType;
  departement: string;
  specialite: string;
  quotaSouhaite?: number; // target surveillance sessions (e.g. 8)
  notes?: string;
  actif: boolean;
}

export interface Room {
  id: string;
  nom: string; // e.g., "Amphi E", "Salle C10", "Salle C12"
  batiment: string;
  capacite?: number;
  capaciteExamen?: number;
  nbSurveillantsRequis?: number;
  type: RoomType;
  equipements?: string[];
  disponible: boolean;
}

export interface RoomSurveillant {
  teacherId: string;
  role: RoleInExam;
  isConfirmed?: boolean;
}

export interface RoomAssignment {
  roomId: string;
  surveillants: RoomSurveillant[];
  teacherIds?: string[]; // Convenient pointer list of all teacher IDs assigned in this room
}

export interface Exam {
  id: string; // Inalterable entity ID
  subjectId?: string; // Pointer ID to SubjectModule (Master record)
  promotionId?: string; // Pointer ID to PromotionGroup (Master record)
  sharedPromotionIds?: string[]; // Pointer IDs to PromotionGroups
  responsableId?: string; // Pointer ID to Teacher (Master record)
  codeModule: string; // Module code (live derived or cached)
  nomModule: string; // Module name (live derived or cached)
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:MM
  heureFin: string; // HH:MM
  semestre: SemesterType;
  session: SessionType;
  niveau: string; // e.g. "1ère Année ST (1ST)", "L3 Info"
  promotion?: string; // Optional promotion alias
  sharedPromotions?: string[]; // Promotions obligatorily scheduled at the same time slot
  commonGroupId?: string; // Group ID linking multi-promotion subjects created together
  nbEtudiants?: number;
  departement?: string;
  specialite?: string;
  salles: RoomAssignment[]; // Multiple rooms with assigned teachers (ID pointers)
  notes?: string;
  isCloture?: boolean;
}

export interface Substitution {
  id: string;
  demandeurId: string; // Teacher who cannot attend
  remplacantId: string; // Teacher who will replace
  examId: string;
  roomId: string;
  motif: string;
  dateDemande: string;
  statut: SubstitutionStatus;
  validePar?: string;
  dateValidation?: string;
}

export interface ExamAttendance {
  id: string;
  examId: string;
  roomId: string;
  teacherId: string;
  status: AttendanceStatus;
  heureArrivee?: string;
  remarques?: string;
}

export interface InstitutionSettings {
  republique?: string;
  ministere?: string;
  universite: string;
  faculteInstitut: string;
  departement: string;
  lieu: string;
  anneeUniversitaire: string;
  semestreActuel: SemesterType;
  sessionActuelle: SessionType;
  nomChefDepartement: string;
  titreChefDepartement: string;
  signatureBase64?: string;
  cachetBase64?: string;
  sloganBase64?: string; // Figure PNG du slogan / logo de l'université
  instructionsOfficielles: string[];
}

export type ConflictType = 
  | 'TEACHER_DOUBLE_BOOKING' 
  | 'ROOM_DOUBLE_BOOKING' 
  | 'RESPONSABLE_CONFLICT'
  | 'PROMOTION_OVERLAP'
  | 'ROOM_CAPACITY_INSUFFICIENT'
  | 'TEACHER_OVER_QUOTA'
  | 'TIME_OFF_VIOLATION'
  | 'MISSING_SURVEILLANTS'
  | 'EXAM_UNASSIGNED';

export interface ConflictAlert {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning' | 'info';
  titre: string;
  description: string;
  date: string;
  creneau: string;
  examIds: string[];
  teacherId?: string;
  roomId?: string;
  promotion?: string;
}

export type TimeOffValue = 'AVAILABLE' | 'UNAVAILABLE' | 'UNDESIRED'; // 1 = Green, 0 = Red, 2 = Orange

export interface TimeSlot {
  id: string;
  label?: string;
  name?: string; // e.g. "Créneau 1 (08h30 - 10h00)"
  shortName?: string; // e.g. "S1"
  debut?: string; // "08:30"
  fin?: string; // "10:00"
  heureDebut?: string; // "08:30"
  heureFin?: string; // "10:00"
}

export interface TimeOffEntry {
  id?: string;
  entityId: string; // teacherId, roomId, promotionName
  entityType: 'teacher' | 'room' | 'promotion';
  dayIndex?: number; // 0 = Dimanche, 1 = Lundi ... or specific date
  date?: string; // YYYY-MM-DD
  timeSlotId?: string;
  slotId?: string;
  value: TimeOffValue;
}

export interface PromotionGroup {
  id: string;
  nom: string; // e.g. "1ère Année ST (1ST)"
  code?: string; // e.g. "1ST"
  filiere?: string;
  cycle?: 'Licence' | 'Master' | 'Doctorat' | 'Ingénieur' | string;
  departement?: string;
  effectif: number;
  annee: number | string; // e.g. "L1", "L2", "L3", "M1", "M2" or 1, 2, 3
  semestre?: string; // e.g. "S1", "S2", "S3", etc. Spécifique à la promotion
  couleur?: string; // aSc Timetable color code
  salleAssigneeId?: string;
  salleAssigneeNom?: string;
}

export type Group = PromotionGroup;

export interface SubjectModule {
  id: string;
  codeModule?: string;
  code?: string;
  nomModule?: string;
  nom?: string;
  responsableId?: string; // Pointer ID to Teacher
  enseignantResponsableId?: string;
  promotion: string; // Promotion display name
  promotionId?: string; // Pointer ID to PromotionGroup / Group
  sharedPromotions?: string[]; // The promotions checked together in "Ajouter une matière"
  sharedPromotionIds?: string[]; // Pointer IDs to PromotionGroups
  commonGroupId?: string; // Group ID linking subjects created together with multiple checked promotions
  semestre: SemesterType;
  dureeMinutes: number;
  coefficient?: number;
  nbSurveillantsRequis?: number;
  departement?: string;
  filiere?: string;
  couleur?: string;
}

export type Subject = SubjectModule;

export interface ResolvedExam {
  id: string;
  subject?: SubjectModule;
  promotion?: PromotionGroup;
  responsable?: Teacher;
  code: string;
  title: string;
  promotionName: string;
  responsableName: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  semestre: string;
  session: string;
  rooms: {
    room?: Room;
    roomId: string;
    roomName: string;
    surveillants: {
      teacher?: Teacher;
      teacherId: string;
      teacherName: string;
      role: RoleInExam;
    }[];
  }[];
}

export interface SessionConfig {
  id?: string;
  nom?: string;
  sessionName?: string;
  anneeUniversitaire: string;
  semestre: any;
  session?: any;
  type?: any;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string; // YYYY-MM-DD
  datesActives?: string[];
  workingDays?: number[]; // e.g. [0, 1, 2, 3, 4] for Dimanche..Jeudi or [1,2,3,4,5,6]
  timeSlots?: TimeSlot[];
  dailySlots?: TimeSlot[];
  maxExamsPerDayPerPromotion?: number;
  minRestBetweenExamsMinutes?: number;
  defaultSurveillantsPerRoom?: number;
  pauseBetweenSlotsMinutes?: number;
}

export interface GlobalConstraints {
  maxExamsPerDayPerPromotion?: number;
  minRestBetweenExamsMinutes?: number;
  minDaysBetweenExamsSamePromotion?: number;
  maxSurveillancesPerDayPerTeacher?: number;
  maxConsecutiveSurveillances?: number;
  minPauseBetweenSurveillancesMinutes?: number;
  maxTotalSurveillancesPerTeacher?: number;
  avoidConsecutiveSurveillances?: boolean;
  avoidResponsibleSameExam?: boolean;
  allowSplittingAcrossRooms?: boolean;
  respectTeacherTimeOff?: boolean;
  respectRoomCapacities?: boolean;
  sameDayExaminationsAllowed?: boolean;
  allowSeparateRoomsForCommonModules?: boolean;
}

export interface AutoGeneratorOptions {
  generateTimeslots?: boolean;
  generateRooms?: boolean;
  generateSurveillants?: boolean;
  preserveManualAssignments?: boolean;
  respectTimeOff?: boolean;
  balanceLoad?: boolean;
  prioritizeSeniority?: boolean;
  balanceLoadEvenly?: boolean;
  enforceTimeOff?: boolean;
  allowSplittingRooms?: boolean;
  allowSeparateRoomsForCommonModules?: boolean;
  maxSurveillancesPerTeacherPerDay?: number;
  randomSeed?: number;
}

export interface GenerationResult {
  exams: Exam[];
  conflicts: ConflictAlert[];
  placedExamsCount: number;
  unplacedExamsCount: number;
  score: number;
  logs: string[];
}

export interface AutoGeneratorStats {
  running: boolean;
  progress: number; // 0 to 100
  placedExams: number;
  totalExams: number;
  hardConflictsCount: number;
  softConflictsCount: number;
  fairnessScore: number; // 0 to 100%
  executionTimeMs: number;
  stepDescription: string;
  logs: string[];
}

export type TimetableViewMode = 
  | 'teacher'    // Individual teacher schedules
  | 'room'       // Room / amphitheater occupancy
  | 'promotion'  // Student level / specialization exam calendar
  | 'module'     // Subject / module distribution
  | 'matrix';    // Full combined grid

export type RibbonTab = 
  | 'file'
  | 'timetable'
  | 'data'
  | 'specifications'
  | 'constraints'
  | 'generator'
  | 'verification'
  | 'substitutions'
  | 'print'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface TeacherLoadStats {
  teacherId: string;
  teacher: Teacher;
  nbSurveillances: number;
  totalHeures: number;
  modulesResponsable: string[];
  nbResponsabilites: number;
  hasConflicts: boolean;
  conflits: ConflictAlert[];
}

export type ActiveTab = 
  | 'timetable'
  | 'dashboard'
  | 'teachers'
  | 'exams'
  | 'rooms'
  | 'promotions'
  | 'subjects'
  | 'constraints'
  | 'generator'
  | 'verification'
  | 'convocations'
  | 'substitutions'
  | 'attendance'
  | 'utilities'
  | 'settings';

export type Language = 'fr' | 'ar' | 'en' | 'FR' | 'AR' | 'EN';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'emerald' | 'indigo' | 'blue' | 'amber' | 'rose';
export type ContrastLevel = 'normal' | 'high';

export interface ThemeSettings {
  mode: ThemeMode;
  accent: AccentColor;
  contrast: ContrastLevel;
}
