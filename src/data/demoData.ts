import { 
  Teacher, 
  Room, 
  Exam, 
  InstitutionSettings, 
  Substitution, 
  PromotionGroup, 
  SubjectModule, 
  TimeSlot, 
  TimeOffEntry, 
  SessionConfig, 
  GlobalConstraints 
} from '../types';

export const initialSettings: InstitutionSettings = {
  republique: '',
  ministere: '',
  universite: '',
  faculteInstitut: '',
  departement: '',
  lieu: '',
  anneeUniversitaire: '2025 / 2026',
  semestreActuel: 'Semestre 1 (S1)',
  sessionActuelle: 'Ordinaire',
  nomChefDepartement: '',
  titreChefDepartement: '',
  signatureBase64: '',
  cachetBase64: '',
  instructionsOfficielles: []
};

export const initialTimeSlots: TimeSlot[] = [
  { id: 'slot-1', name: 'Créneau 1 (08h30 - 10h00)', shortName: 'S1', heureDebut: '08:30', heureFin: '10:00' },
  { id: 'slot-2', name: 'Créneau 2 (10h30 - 12h00)', shortName: 'S2', heureDebut: '10:30', heureFin: '12:00' },
  { id: 'slot-3', name: 'Créneau 3 (13h00 - 14h30)', shortName: 'S3', heureDebut: '13:00', heureFin: '14:30' },
  { id: 'slot-4', name: 'Créneau 4 (15h00 - 16h30)', shortName: 'S4', heureDebut: '15:00', heureFin: '16:30' }
];

export const initialPromotions: PromotionGroup[] = [];

export const initialTeachers: Teacher[] = [];

export const initialRooms: Room[] = [];

export const initialSubjects: SubjectModule[] = [];

export const initialExams: Exam[] = [];

export const initialTimeOffConstraints: TimeOffEntry[] = [];

export const initialGlobalConstraints: GlobalConstraints = {
  maxExamsPerDayPerPromotion: 1,
  minRestBetweenExamsMinutes: 60,
  maxSurveillancesPerDayPerTeacher: 2,
  maxTotalSurveillancesPerTeacher: 5,
  avoidConsecutiveSurveillances: true,
  respectTeacherTimeOff: true,
  respectRoomCapacities: true,
  sameDayExaminationsAllowed: false,
  allowSeparateRoomsForCommonModules: true
};

export const initialSessionConfig: SessionConfig = {
  sessionName: 'Session Ordinaire - Semestre 1',
  anneeUniversitaire: '2025 / 2026',
  semestre: 'Semestre 1 (S1)',
  session: 'Ordinaire',
  dateDebut: '2026-09-06',
  dateFin: '2026-09-17',
  workingDays: [0, 1, 2, 3, 4], // Dimanche..Jeudi (Standard universitaire)
  dailySlots: initialTimeSlots,
  maxExamsPerDayPerPromotion: 1,
  minRestBetweenExamsMinutes: 60,
  defaultSurveillantsPerRoom: 2,
  pauseBetweenSlotsMinutes: 30
};

export const initialSubstitutions: Substitution[] = [];
