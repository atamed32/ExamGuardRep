import { Language } from '../types';

export interface Translations {
  appName: string;
  appSubtitle: string;
  
  // Navigation & Ribbon
  dashboard: string;
  teachers: string;
  exams: string;
  rooms: string;
  promotions: string;
  subjects: string;
  timetable: string;
  constraints: string;
  generator: string;
  convocations: string;
  substitutions: string;
  attendance: string;
  utilities: string;
  settings: string;
  verification: string;
  sessionWizard: string;
  
  // Ribbon Tabs
  ribbonFile: string;
  ribbonData: string;
  ribbonSpecifications: string;
  ribbonConstraints: string;
  ribbonTimetable: string;
  ribbonGenerator: string;
  ribbonVerification: string;
  ribbonPrint: string;
  ribbonHelp: string;
  ribbonTools: string;
  
  // Timetable Views
  viewGlobal: string;
  viewByTeacher: string;
  viewByRoom: string;
  viewByPromotion: string;
  viewByModule: string;
  unplacedExamsPool: string;
  dragDropHint: string;
  
  // Quick stats
  totalExams: string;
  totalTeachers: string;
  totalRooms: string;
  totalPromotions: string;
  totalSupervisions: string;
  activeConflicts: string;
  noConflictsFound: string;
  conflictDetected: string;
  conflictsAlertBanner: string;
  
  // Common Actions
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  search: string;
  filter: string;
  all: string;
  print: string;
  exportPDF: string;
  exportImage: string;
  sendEmail: string;
  printAll: string;
  exportJSON: string;
  importData: string;
  resetDemoData: string;
  confirm: string;
  details: string;
  status: string;
  actions: string;
  viewConvocation: string;
  autoGenerateBtn: string;
  
  // Teacher
  teacherName: string;
  grade: string;
  department: string;
  specialty: string;
  workload: string;
  quotaTarget: string;
  phone: string;
  email: string;
  assignedSlots: string;
  hoursCount: string;
  timeOff: string;
  
  // Exam
  module: string;
  moduleCode: string;
  responsibleTeacher: string;
  date: string;
  timeSlot: string;
  semester: string;
  session: string;
  level: string;
  assignedRooms: string;
  supervisors: string;
  examTimeSlot: string;
  quickTimePresets: string;
  startTime: string;
  endTime: string;
  modifySlot: string;
  customTimes: string;
  duration: string;
  
  // Promotions
  promotionName: string;
  field: string;
  cycle: string;
  studentsCount: string;
  colorTag: string;
  newPromotion: string;
  editPromotion: string;
  deletePromotion: string;
  confirmDeletePromo: string;
  
  // Subjects
  newSubject: string;
  editSubject: string;
  deleteSubject: string;
  multiPromotionsSelect: string;
  selectMultiplePromosHint: string;
  selectAllPromos: string;
  clearAllPromos: string;
  durationMinutes: string;
  coefficient: string;
  assignedResponsible: string;
  
  // Rooms
  room: string;
  capacity: string;
  roomType: string;
  building: string;
  available: string;
  occupancyMatrix: string;
  
  // Convocations
  officialConvocation: string;
  individualSchedule: string;
  deliveryDate: string;
  location: string;
  officialInstructions: string;
  departmentHeadSeal: string;
  mandatoryAttendance: string;
  role: string;
  
  // Substitutions
  substitutionTitle: string;
  requestingTeacher: string;
  substituteTeacher: string;
  reason: string;
  pending: string;
  approved: string;
  rejected: string;
  approveAndSwap: string;
  newSubstitution: string;
  
  // Attendance
  attendanceTitle: string;
  present: string;
  late: string;
  absent: string;
  justified: string;
  generatePV: string;
  
  // Settings & Constraints
  institutionHeader: string;
  institutionHeaderSubtitle: string;
  republic: string;
  ministry: string;
  university: string;
  facultyInstitute: string;
  academicYear: string;
  headOfDepartment: string;
  signatureStamp: string;
  language: string;
  timeOffTitle: string;
  availableSlot: string;
  undesiredSlot: string;
  unavailableSlot: string;
  saveSettingsBtn: string;
  settingsSavedSuccess: string;
  stampSignatureUpload: string;
  removeStampImage: string;
  addInstructionBtn: string;
  addInstructionPlaceholder: string;
  
  // Theme & Appearance
  themeAppearance: string;
  themeDescription: string;
  themeSystem: string;
  themeSystemDesc: string;
  themeLight: string;
  themeLightDesc: string;
  themeDark: string;
  themeDarkDesc: string;
  themeAcademic: string;
  themeAcademicDesc: string;
  accentColor: string;
  contrastMode: string;
  contrastNormal: string;
  contrastHigh: string;
  switchTheme: string;
}

const frTranslations: Translations = {
  appName: 'ExamGuard',
  appSubtitle: 'Système d\'Élaboration & d\'Optimisation des Emplois du Temps d\'Examens',
  
  // Navigation & Ribbon
  dashboard: 'Vue Globale',
  teachers: 'Enseignants',
  exams: 'Épreuves & Examens',
  rooms: 'Salles & Locaux',
  promotions: 'Promotions & Filières',
  subjects: 'Matières & Modules',
  timetable: 'Affichage',
  constraints: 'Temps Libre & Contraintes',
  generator: 'Génération Automatique',
  convocations: 'Convocations Officielles',
  substitutions: 'Remplacements & Permutations',
  attendance: 'Pointage & PV d\'Examens',
  utilities: 'Sauvegarde & Transfert',
  settings: 'Configuration Établissement',
  verification: 'Diagnostic & Vérification',
  sessionWizard: 'Nouveau',
  
  // Ribbon Tabs
  ribbonFile: 'Fichier',
  ribbonData: 'Édition',
  ribbonSpecifications: 'Spécification',
  ribbonConstraints: 'Contraintes et vœux',
  ribbonTimetable: 'Affichage',
  ribbonGenerator: 'Génération Auto',
  ribbonVerification: 'Vérification',
  ribbonPrint: 'Impression & export',
  ribbonHelp: 'Aide',
  ribbonTools: 'Outils',
  
  // Timetable Views
  viewGlobal: 'Vue Globale (Session Complète)',
  viewByTeacher: 'Vue Enseignants (Surveillances)',
  viewByRoom: 'Vue Salles / Amphis (Locaux)',
  viewByPromotion: 'Vue Promotions (Étudiants)',
  viewByModule: 'Vue Matières / Modules',
  unplacedExamsPool: 'Réserve des Épreuves Non Placées',
  dragDropHint: 'Glissez-déposez une épreuve depuis la réserve ou déplacez les cartes sur la grille.',
  
  // Quick stats
  totalExams: 'Épreuves Totales',
  totalTeachers: 'Enseignants Inscrits',
  totalRooms: 'Salles & Amphis',
  totalPromotions: 'Promotions / Niveaux',
  totalSupervisions: 'Surveillances Assignées',
  activeConflicts: 'Conflits Détectés',
  noConflictsFound: 'Aucun conflit de salle, d\'enseignant ou de promotion. Le planning est optimal.',
  conflictDetected: 'Attention : Conflits ou surcharges détectés !',
  conflictsAlertBanner: 'Conflits & Diagnostics Actifs',
  
  // Common Actions
  add: 'Ajouter',
  edit: 'Modifier',
  delete: 'Supprimer',
  save: 'Enregistrer',
  cancel: 'Annuler',
  search: 'Rechercher...',
  filter: 'Filtrer',
  all: 'Tous',
  print: 'Imprimer (A4)',
  exportPDF: 'Exporter en PDF',
  exportImage: 'Exporter Image',
  sendEmail: 'Envoyer par e-mail',
  printAll: 'Imprimer toutes les fiches',
  exportJSON: 'Exporter sauvegarde (JSON)',
  importData: 'Importer fichier JSON',
  resetDemoData: 'Réinitialiser aux données démo',
  confirm: 'Confirmer',
  details: 'Détails',
  status: 'Statut',
  actions: 'Actions',
  viewConvocation: 'Afficher Convocation',
  autoGenerateBtn: 'Optimiser & Générer',
  
  // Teacher
  teacherName: 'Nom et Prénom',
  grade: 'Grade académique',
  department: 'Département',
  specialty: 'Spécialité',
  workload: 'Charge de surveillance',
  quotaTarget: 'Quota souhaité',
  phone: 'Téléphone',
  email: 'Email professionnel',
  assignedSlots: 'Séances affectées',
  hoursCount: 'Volume horaire',
  timeOff: 'Temps libre & Veto',
  
  // Exam
  module: 'Matière / Module',
  moduleCode: 'Code Module',
  responsibleTeacher: 'Enseignant Responsable de Matière',
  date: 'Date de l\'épreuve',
  timeSlot: 'Créneau horaire',
  semester: 'Semestre',
  session: 'Session',
  level: 'Niveau / Promotion',
  assignedRooms: 'Salles & Locaux assignés',
  supervisors: 'Enseignants Surveillants',
  examTimeSlot: 'Créneau & Horaires de l\'examen',
  quickTimePresets: 'Créneaux horaires standards prédéfinis',
  startTime: 'Heure Début',
  endTime: 'Heure Fin',
  modifySlot: 'Modifier le créneau horaire',
  customTimes: 'Horaires personnalisés',
  duration: 'Durée de l\'examen',
  
  // Promotions
  promotionName: 'Code / Nom de la promotion',
  field: 'Filière / Spécialité',
  cycle: 'Cycle d\'études',
  studentsCount: 'Effectif Étudiants',
  colorTag: 'Couleur d\'identification',
  newPromotion: 'Nouvelle Promotion',
  editPromotion: 'Modifier la Promotion',
  deletePromotion: 'Supprimer la Promotion',
  confirmDeletePromo: 'Voulez-vous vraiment supprimer cette promotion ?',
  
  // Subjects
  newSubject: 'Ajouter une Matière',
  editSubject: 'Modifier la Matière',
  deleteSubject: 'Supprimer la Matière',
  multiPromotionsSelect: 'Promotions / Groupes concernés (sélection multiple)',
  selectMultiplePromosHint: 'Cochez une ou plusieurs promotions pour leur associer ce module d\'examen :',
  selectAllPromos: 'Tout sélectionner',
  clearAllPromos: 'Tout désélectionner',
  durationMinutes: 'Durée (Minutes)',
  coefficient: 'Coefficient',
  assignedResponsible: 'Enseignant Responsable',
  
  // Rooms
  room: 'Salle / Amphi',
  capacity: 'Capacité d\'examen',
  roomType: 'Type de local',
  building: 'Bâtiment / Étage',
  available: 'Disponible',
  occupancyMatrix: 'Occupation des salles',
  
  // Convocations
  officialConvocation: 'Convocation Officielle de Surveillance',
  individualSchedule: 'Planning Individuel de Surveillance',
  deliveryDate: 'Date d\'émission',
  location: 'Fait à',
  officialInstructions: 'Consignes & Instructions Réglementaires',
  departmentHeadSeal: 'Le Chef de Département (Signature & Cachet)',
  mandatoryAttendance: 'Présence obligatoire 15 minutes avant le début de chaque épreuve.',
  role: 'Rôle dans l\'épreuve',
  
  // Substitutions
  substitutionTitle: 'Gestion des Remplacements & Permutations',
  requestingTeacher: 'Enseignant Demandeur (Absent)',
  substituteTeacher: 'Enseignant Remplaçant',
  reason: 'Motif du remplacement',
  pending: 'En attente',
  approved: 'Validé par le Chef de Dépt',
  rejected: 'Refusé',
  approveAndSwap: 'Valider & Permuter l\'affectation',
  newSubstitution: 'Nouvelle demande de remplacement',
  
  // Attendance
  attendanceTitle: 'Pointage de Présence & PV de Déroulement',
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent non justifié',
  justified: 'Absent justifié',
  generatePV: 'Générer Procès-Verbal (PV)',
  
  // Settings & Constraints
  institutionHeader: 'Paramètres & En-tête Administratif Officiel',
  institutionHeaderSubtitle: 'Personnalisez les coordonnées institutionnelles, la session active et les mentions légales des convocations.',
  republic: 'République / Pays',
  ministry: 'Ministère de tutelle',
  university: 'Université / Centre Universitaire',
  facultyInstitute: 'Faculté / Institut',
  academicYear: 'Année Universitaire',
  headOfDepartment: 'Nom & Prénom du Chef de Département',
  signatureStamp: 'Image du Cachet / Signature Officielle',
  language: 'Langue de l\'interface',
  timeOffTitle: 'Contraintes et vœux',
  availableSlot: 'Disponible (Vert)',
  undesiredSlot: 'Non souhaité (Orange)',
  unavailableSlot: 'Indisponible / Veto (Rouge)',
  saveSettingsBtn: 'Enregistrer tous les paramètres',
  settingsSavedSuccess: 'Paramètres administratifs enregistrés avec succès !',
  stampSignatureUpload: 'Télécharger image du cachet (Optionnel)',
  removeStampImage: 'Supprimer l\'image du cachet',
  addInstructionBtn: 'Ajouter consigne',
  addInstructionPlaceholder: 'Ajouter une consigne réglementaire...',
  
  // Theme & Appearance
  themeAppearance: 'Thème d\'affichage & Personnalisation Visuelle',
  themeDescription: 'Choisissez le style visuel de l\'application selon vos préférences d\'ergonomie et de luminosité.',
  themeSystem: 'Automatique (Système)',
  themeSystemDesc: 'Adaptation automatique selon les préférences de votre système d\'exploitation',
  themeLight: 'Clair Moderne (Light)',
  themeLightDesc: 'Fond blanc épuré, contraste élevé et lisibilité optimale pour le travail de jour',
  themeDark: 'Sombre aSc (Dark)',
  themeDarkDesc: 'Palette foncée contrastée réduisant la fatigue oculaire pour le travail prolongé',
  themeAcademic: 'Académique (Bleu Nuit)',
  themeAcademicDesc: 'Bleu nuit universitaire et vert institutionnel pour un rendu élégant',
  accentColor: 'Couleur d\'accentuation principale',
  contrastMode: 'Niveau de contraste visuel',
  contrastNormal: 'Contraste standard équilibré (WCAG AA)',
  contrastHigh: 'Contraste renforcé (haute accessibilité)',
  switchTheme: 'Changer de thème'
};

const arTranslations: Translations = {
  appName: 'ExamGuard',
  appSubtitle: 'نظام إعداد وتحسين جداول توقيت الامتحانات الجامعية والحراسة',
  
  // Navigation & Ribbon
  dashboard: 'لوحة التحكم العامة',
  teachers: 'الأساتذة وهيئة التدريس',
  exams: 'الامتحانات والمواد',
  rooms: 'القاعات والمدرجات',
  promotions: 'الدفعات والتخصصات',
  subjects: 'المقاييس والمواد',
  timetable: 'عرض',
  constraints: 'أوقات الفراغ والموانع',
  generator: 'التوليد والتحسين الآلي',
  convocations: 'الاستدعاءات الفردية الرسمية',
  substitutions: 'الاستبدال والتبادل',
  attendance: 'تسجيل الحضور ومحاضر السير',
  utilities: 'النسخ الاحتياطي والبيانات',
  settings: 'إعدادات المؤسسة والقسم',
  verification: 'فحص التعارضات والأخطاء',
  sessionWizard: 'جديد',
  
  // Ribbon Tabs
  ribbonFile: 'ملف',
  ribbonData: 'تحرير',
  ribbonSpecifications: 'المواصفات',
  ribbonConstraints: 'الشروط والموانع',
  ribbonTimetable: 'عرض',
  ribbonGenerator: 'التوليد الآلي',
  ribbonVerification: 'التدقيق والتشخيص',
  ribbonPrint: 'الطباعة والتصدير',
  ribbonHelp: 'مساعدة',
  ribbonTools: 'الأدوات الإضافية',
  
  // Timetable Views
  viewGlobal: 'جدول عام شامل للدفعة والامتحانات',
  viewByTeacher: 'حسب الأستاذ (الحراسة)',
  viewByRoom: 'حسب القاعة والمدرج',
  viewByPromotion: 'حسب الدفعة والتخصص',
  viewByModule: 'حسب المقاييس والمواد',
  unplacedExamsPool: 'احتياطي الامتحانات والمواد غير المبرمجة',
  dragDropHint: 'اسحب الامتحان من الاحتياطي أو حرك البطاقات مباشرة على الشبكة لتغيير التوقيت والقاعات.',
  
  // Quick stats
  totalExams: 'إجمالي الامتحانات',
  totalTeachers: 'الأساتذة المسجلين',
  totalRooms: 'القاعات والمدرجات',
  totalPromotions: 'الدفعات والسنوات',
  totalSupervisions: 'فترات الحراسة الموزعة',
  activeConflicts: 'التعارضات المكتشفة',
  noConflictsFound: 'لا يوجد أي تعارض في القاعات أو التوقيت أو الأساتذة. الجدول متناسق ومضبوط تماماً.',
  conflictDetected: 'تنبيه : تم اكتشاف تداخل أو تعارض في جدول الامتحانات !',
  conflictsAlertBanner: 'التعارضات وحالات التداخل النشطة',
  
  // Common Actions
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  save: 'حفظ',
  cancel: 'إلغاء',
  search: 'بحث سريع...',
  filter: 'تصفية',
  all: 'الكل',
  print: 'طباعة رسمية (A4)',
  exportPDF: 'تصدير كـ PDF',
  exportImage: 'تصدير كصورة',
  sendEmail: 'إرسال عبر البريد الإلكتروني',
  printAll: 'طباعة جميع الاستدعاءات الفردية',
  exportJSON: 'حفظ نسخة احتياطية كاملة (JSON)',
  importData: 'استيراد بيانات من ملف JSON',
  resetDemoData: 'استعادة البيانات النموذجية',
  confirm: 'تأكيد العملية',
  details: 'تفاصيل',
  status: 'الحالة',
  actions: 'إجراءات',
  viewConvocation: 'عرض الاستدعاء الرسمي',
  autoGenerateBtn: 'تحسين وتوليد الجدول آلياً',
  
  // Teacher
  teacherName: 'الاسم واللقب',
  grade: 'الرتبة العلمية',
  department: 'القسم',
  specialty: 'التخصص الدقيق',
  workload: 'عبء الحراسة الإجمالي',
  quotaTarget: 'الحصة المستهدفة (حصص)',
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني المهني',
  assignedSlots: 'الحصص المسندة',
  hoursCount: 'مجموع الساعات',
  timeOff: 'أوقات الفراغ والمانع',
  
  // Exam
  module: 'المقياس / المادة',
  moduleCode: 'رمز المقياس',
  responsibleTeacher: 'الأستاذ المسؤول عن المادة',
  date: 'تاريخ الامتحان',
  timeSlot: 'الفترة الزمنية (الكرينو)',
  semester: 'السداسي',
  session: 'الدورة',
  level: 'المستوى / التخصص',
  assignedRooms: 'القاعات والمدرجات المسندة',
  supervisors: 'الأساتذة الحراس',
  examTimeSlot: 'الفترة الزمنية وتوقيت الامتحان (الكرينو)',
  quickTimePresets: 'الفترات الزمنية المعيارية المحددة مسبقاً',
  startTime: 'وقت البداية',
  endTime: 'وقت النهاية',
  modifySlot: 'تعديل توقيت الامتحان (الكرينو)',
  customTimes: 'توقيت مخصص',
  duration: 'مدة الامتحان',
  
  // Promotions
  promotionName: 'رمز / اسم الدفعة',
  field: 'الشعبة / التخصص',
  cycle: 'الطور الدراسي',
  studentsCount: 'عدد الطلبة المسجلين',
  colorTag: 'لون التمييز في الجدول',
  newPromotion: 'إضافة دفعة جديدة',
  editPromotion: 'تعديل بيانات الدفعة',
  deletePromotion: 'حذف الدفعة',
  confirmDeletePromo: 'هل أنت متأكد من رغبتك في حذف هذه الدفعة نهائياً؟',
  
  // Subjects
  newSubject: 'إضافة مادة / مقياس جديد',
  editSubject: 'تعديل بيانات المادة',
  deleteSubject: 'حذف المادة',
  multiPromotionsSelect: 'الدفعات والسنوات المعنية (اختيار متعدد)',
  selectMultiplePromosHint: 'حدد دفعة واحدة أو عدة دفعات لربط المقياس بها في جدول الامتحانات (مثال: M1 Structure و M1 Hydraulique):',
  selectAllPromos: 'تحديد جميع الدفعات',
  clearAllPromos: 'إلغاء تحديد الكل',
  durationMinutes: 'المدة (بالدقائق)',
  coefficient: 'المعامل',
  assignedResponsible: 'الأستاذ المسؤول عن المقياس',
  
  // Rooms
  room: 'القاعة / المدرج',
  capacity: 'السعة في الامتحانات (المقاعد)',
  roomType: 'نوع القاعة',
  building: 'المبنى / الطابق',
  available: 'متاحة للاستعمال',
  occupancyMatrix: 'شبكة إشغال القاعات والمدرجات',
  
  // Convocations
  officialConvocation: 'استدعاء فردي رسمي لحراسة الامتحانات',
  individualSchedule: 'جدول الحراسة الفردي الرسمي',
  deliveryDate: 'تاريخ التسليم',
  location: 'حرر بـ',
  officialInstructions: 'التعليمات والتوجيهات التنظيمية والقانونية',
  departmentHeadSeal: 'رئيس القسم (التوقيع والختم الرسمي)',
  mandatoryAttendance: 'الحضور إجباري قبل 15 دقيقة من انطلاق كل إمتحان.',
  role: 'الصفة في الامتحان (حارس رئيسي / مساعد)',
  
  // Substitutions
  substitutionTitle: 'إدارة طلبات الاستبدال وتبادل الحراسة',
  requestingTeacher: 'الأستاذ المعني بالاستبدال (المعتذر)',
  substituteTeacher: 'الأستاذ البديل',
  reason: 'سبب طلب الاستبدال',
  pending: 'قيد المراجعة',
  approved: 'مقبول من طرف رئيس القسم',
  rejected: 'طلب مرفوض',
  approveAndSwap: 'الموافقة وتبديل التكليف فوراً',
  newSubstitution: 'تسجيل طلب تبادل جديد',
  
  // Attendance
  attendanceTitle: 'تسجيل الحضور ومحضر سير الامتحانات الرسمي',
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غائب بدون تبرير',
  justified: 'غائب بمبرر قانوني',
  generatePV: 'إنشاء وطباعة محضر سير الامتحان (PV)',
  
  // Settings & Constraints
  institutionHeader: 'الترويسة الإدارية الرسمية للمؤسسة',
  institutionHeaderSubtitle: 'تخصيص البيانات الإدارية، السنة الجامعية، الدورة الحالية والتعليمات الرسمية الواردة بالاستدعاءات.',
  republic: 'الجمهورية / الدولة',
  ministry: 'الوزارة الوصية',
  university: 'الجامعة / المركز الجامعي',
  facultyInstitute: 'الكلية / المعهد',
  academicYear: 'السنة الجامعية',
  headOfDepartment: 'اسم ولقب رئيس القسم',
  signatureStamp: 'صورة الختم والتوقيع الرسمي',
  language: 'لغة واجهة البرنامج',
  timeOffTitle: 'شبكة الأوقات الحرة والموانع (Time-Off)',
  availableSlot: 'متاح (أخضر)',
  undesiredSlot: 'غير مرغوب (برتقالي)',
  unavailableSlot: 'مانع / غير متاح إطلاقاً (أحمر)',
  saveSettingsBtn: 'حفظ جميع الإعدادات الإدارية',
  settingsSavedSuccess: 'تم حفظ وتحديث الإعدادات الإدارية بنجاح ومطابقتها على جميع الوثائق !',
  stampSignatureUpload: 'رفع صورة الختم الرسمي (اختياري)',
  removeStampImage: 'حذف صورة الختم',
  addInstructionBtn: 'إضافة تعليمة',
  addInstructionPlaceholder: 'أدخل تعليمة تنظيمية جديدة للاستدعاءات...',

  // Theme & Appearance
  themeAppearance: 'المظهر والسمة البصرية',
  themeDescription: 'تخصيص نمط العرض وسمات الألوان ومستوى التباين في واجهة البرنامج.',
  themeSystem: 'تلقائي (حسب نظام التشغيل)',
  themeSystemDesc: 'التوافق التلقائي مع إعدادات جهازك ونظام التشغيل',
  themeLight: 'النمط الفاتح الحديث (Light)',
  themeLightDesc: 'خلفية ناصعة مريحة للعمل النهاري ومطابقة تماماً لصفحات الطباعة',
  themeDark: 'النمط الداكن الاحترافي (Dark aSc)',
  themeDarkDesc: 'ألوان داكنة مريحة للعين أثناء العمل المطول في المساء',
  themeAcademic: 'النمط الأكاديمي (أزرق ليلي)',
  themeAcademicDesc: 'أزرق ليلي وأخضر مؤسساتي معتمد في الجامعات والمؤسسات الأكاديمية',
  accentColor: 'لون التمييز الأساسي',
  contrastMode: 'مستوى التباين البصري',
  contrastNormal: 'تباين قياسي متوازن (معايير WCAG AA)',
  contrastHigh: 'تباين عالٍ ووضوح فائق للنصوص',
  switchTheme: 'تبديل السمة والمظهر'
};

const enTranslations: Translations = {
  appName: 'ExamGuard',
  appSubtitle: 'University Exam Timetable & Supervision Planning System',
  
  // Navigation & Ribbon
  dashboard: 'Overview',
  teachers: 'Faculty & Teachers',
  exams: 'Exams & Modules',
  rooms: 'Rooms & Halls',
  promotions: 'Promotions & Cohorts',
  subjects: 'Subjects & Modules',
  timetable: 'View',
  constraints: 'Time-Off & Constraints',
  generator: 'Automatic Generation',
  convocations: 'Official Convocations',
  substitutions: 'Substitutions & Swaps',
  attendance: 'Attendance & Reports',
  utilities: 'Backup & Data',
  settings: 'Department Settings',
  verification: 'Diagnostics & Conflicts',
  sessionWizard: 'New',
  
  // Ribbon Tabs
  ribbonFile: 'File',
  ribbonData: 'Edit',
  ribbonSpecifications: 'Specification',
  ribbonConstraints: 'Constraints & Desires',
  ribbonTimetable: 'View',
  ribbonGenerator: 'Auto Generation',
  ribbonVerification: 'Verification',
  ribbonPrint: 'Print & Export',
  ribbonHelp: 'Help',
  ribbonTools: 'Tools',
  
  // Timetable Views
  viewGlobal: 'Global Overview (Full Session)',
  viewByTeacher: 'By Teacher (Supervisions)',
  viewByRoom: 'By Room / Amphitheater',
  viewByPromotion: 'By Promotion (Students)',
  viewByModule: 'By Subject / Module',
  unplacedExamsPool: 'Unplaced Exams Pool',
  dragDropHint: 'Drag and drop an exam from pool or move cards directly on the grid.',
  
  // Quick stats
  totalExams: 'Total Exams',
  totalTeachers: 'Registered Teachers',
  totalRooms: 'Rooms & Halls',
  totalPromotions: 'Promotions / Levels',
  totalSupervisions: 'Assigned Supervisions',
  activeConflicts: 'Active Conflicts',
  noConflictsFound: 'No room, teacher, or cohort conflicts. Timetable is optimal.',
  conflictDetected: 'Warning: Schedule conflicts or overload detected!',
  conflictsAlertBanner: 'Active Conflicts & Diagnostics',
  
  // Common Actions
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  search: 'Search...',
  filter: 'Filter',
  all: 'All',
  print: 'Print (A4)',
  exportPDF: 'Export to PDF',
  exportImage: 'Export Image',
  sendEmail: 'Send by Email',
  printAll: 'Print All Forms',
  exportJSON: 'Export Backup (JSON)',
  importData: 'Import JSON File',
  resetDemoData: 'Reset to Demo Data',
  confirm: 'Confirm',
  details: 'Details',
  status: 'Status',
  actions: 'Actions',
  viewConvocation: 'View Convocation',
  autoGenerateBtn: 'Optimize & Generate',
  
  // Teacher
  teacherName: 'Full Name',
  grade: 'Academic Rank',
  department: 'Department',
  specialty: 'Specialty',
  workload: 'Supervision Load',
  quotaTarget: 'Target Quota',
  phone: 'Phone',
  email: 'Email',
  assignedSlots: 'Assigned Slots',
  hoursCount: 'Total Hours',
  timeOff: 'Time-Off & Constraints',
  
  // Exam
  module: 'Subject / Module',
  moduleCode: 'Module Code',
  responsibleTeacher: 'Course Coordinator',
  date: 'Exam Date',
  timeSlot: 'Time Slot',
  semester: 'Semester',
  session: 'Session',
  level: 'Level / Promotion',
  assignedRooms: 'Assigned Rooms',
  supervisors: 'Supervisors',
  examTimeSlot: 'Exam Time Slot',
  quickTimePresets: 'Standard Preset Time Slots',
  startTime: 'Start Time',
  endTime: 'End Time',
  modifySlot: 'Edit Time Slot',
  customTimes: 'Custom Times',
  duration: 'Duration',
  
  // Promotions
  promotionName: 'Promotion / Level Name',
  field: 'Field / Major',
  cycle: 'Degree Cycle',
  studentsCount: 'Student Headcount',
  colorTag: 'Color Tag',
  newPromotion: 'New Promotion',
  editPromotion: 'Edit Promotion',
  deletePromotion: 'Delete Promotion',
  confirmDeletePromo: 'Are you sure you want to permanently delete this promotion?',
  
  // Subjects
  newSubject: 'New Subject / Module',
  editSubject: 'Edit Subject',
  deleteSubject: 'Delete Subject',
  multiPromotionsSelect: 'Target Promotions (Multi-select)',
  selectMultiplePromosHint: 'Select one or more promotions to bind this exam:',
  selectAllPromos: 'Select All',
  clearAllPromos: 'Clear All',
  durationMinutes: 'Duration (minutes)',
  coefficient: 'Coefficient',
  assignedResponsible: 'Course Coordinator',
  
  // Rooms
  room: 'Room / Amphitheater',
  capacity: 'Exam Seating Capacity',
  roomType: 'Room Type',
  building: 'Building / Floor',
  available: 'Available',
  occupancyMatrix: 'Room Occupancy Matrix',
  
  // Convocations
  officialConvocation: 'Official Supervision Convocation',
  individualSchedule: 'Individual Supervision Schedule',
  deliveryDate: 'Issue Date',
  location: 'Issued at',
  officialInstructions: 'Official Regulations & Instructions',
  departmentHeadSeal: 'Department Head (Signature & Stamp)',
  mandatoryAttendance: 'Mandatory presence 15 minutes before each exam.',
  role: 'Role in Exam',
  
  // Substitutions
  substitutionTitle: 'Supervision Substitutions & Swaps',
  requestingTeacher: 'Requesting Teacher',
  substituteTeacher: 'Substitute Teacher',
  reason: 'Reason for Swap',
  pending: 'Pending',
  approved: 'Approved by Dept Head',
  rejected: 'Rejected',
  approveAndSwap: 'Approve & Swap Assignment',
  newSubstitution: 'New Substitution Request',
  
  // Attendance
  attendanceTitle: 'Supervision Attendance & Official Report',
  present: 'Present',
  late: 'Late',
  absent: 'Unexcused Absence',
  justified: 'Excused Absence',
  generatePV: 'Generate Official Report (PV)',
  
  // Settings & Constraints
  institutionHeader: 'Official Institutional Header & Settings',
  institutionHeaderSubtitle: 'Customize institutional info, active session, and official instructions.',
  republic: 'Republic / Country',
  ministry: 'Ministry',
  university: 'University / Center',
  facultyInstitute: 'Faculty / Institute',
  academicYear: 'Academic Year',
  headOfDepartment: 'Department Head Name',
  signatureStamp: 'Official Seal / Signature Stamp',
  language: 'Interface Language',
  timeOffTitle: 'Availability Grid (Time-Off & Veto)',
  availableSlot: 'Available (Green)',
  undesiredSlot: 'Undesired (Orange)',
  unavailableSlot: 'Unavailable / Veto (Red)',
  saveSettingsBtn: 'Save All Settings',
  settingsSavedSuccess: 'Institutional settings saved successfully!',
  stampSignatureUpload: 'Upload Stamp Image (Optional)',
  removeStampImage: 'Remove Stamp Image',
  addInstructionBtn: 'Add Instruction',
  addInstructionPlaceholder: 'Add a new regulation note...',
  
  // Theme & Appearance
  themeAppearance: 'Theme & Visual Styling',
  themeDescription: 'Choose between dark and light themes for optimal ergonomics and readability.',
  themeSystem: 'System Default',
  themeSystemDesc: 'Matches your operating system settings',
  themeLight: 'Light Theme',
  themeLightDesc: 'Clean bright background with high contrast for daytime readability',
  themeDark: 'Dark Theme',
  themeDarkDesc: 'High contrast dark palette reducing eye fatigue',
  themeAcademic: 'Academic Blue',
  themeAcademicDesc: 'Institutional navy blue styling',
  accentColor: 'Accent Color',
  contrastMode: 'Contrast Level',
  contrastNormal: 'Standard Balanced Contrast (WCAG AA)',
  contrastHigh: 'High Contrast (Enhanced Readability)',
  switchTheme: 'Switch Theme'
};

export const translations: Record<Language, Translations> = {
  fr: frTranslations,
  ar: arTranslations,
  en: enTranslations,
  FR: frTranslations,
  AR: arTranslations,
  EN: enTranslations
};
