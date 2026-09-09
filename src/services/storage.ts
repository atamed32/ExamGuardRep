import { 
  Teacher, 
  Room, 
  Exam, 
  InstitutionSettings, 
  Substitution, 
  ExamAttendance,
  PromotionGroup,
  SubjectModule,
  TimeOffEntry,
  SessionConfig,
  GlobalConstraints,
  ThemeSettings,
  Language
} from '../types';
import { 
  initialSettings, 
  initialTeachers, 
  initialRooms, 
  initialExams, 
  initialSubstitutions,
  initialPromotions,
  initialSubjects,
  initialTimeOffConstraints,
  initialGlobalConstraints,
  initialSessionConfig
} from '../data/demoData';
import { isElectron, getDesktopAPI } from './platform';

const STORAGE_KEYS = {
  SETTINGS: 'examguard_settings_v1',
  TEACHERS: 'examguard_teachers_v1',
  ROOMS: 'examguard_rooms_v1',
  EXAMS: 'examguard_exams_v1',
  SUBSTITUTIONS: 'examguard_substitutions_v1',
  ATTENDANCE: 'examguard_attendance_v1',
  PROMOTIONS: 'examguard_promotions_v1',
  SUBJECTS: 'examguard_subjects_v1',
  TIMEOFF: 'examguard_timeoff_v1',
  GLOBAL_CONSTRAINTS: 'examguard_global_constraints_v1',
  SESSION_CONFIG: 'examguard_session_config_v1',
  LANGUAGE: 'examguard_lang_v1',
  THEME_SETTINGS: 'examguard_theme_settings_v1',
  CUSTOM_DEFAULTS: 'examguard_custom_defaults_v1',
  CASCADE_REPORT: 'examguard_cascade_report_v1',
  AUTO_SAVE: 'examguard_autosave_v1',
  CLEAN_INIT: 'examguard_clean_startup_v2'
};

export const defaultThemeSettings: ThemeSettings = {
  mode: 'light',
  accent: 'emerald',
  contrast: 'normal'
};

export class StorageService {
  /**
   * Initializes clean startup data on fresh launch if clean init has not been performed.
   */
  static checkAndInitCleanStartup(): void {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.CLEAN_INIT)) {
        localStorage.setItem(STORAGE_KEYS.CLEAN_INIT, 'true');
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.TIMEOFF, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SUBSTITUTIONS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
        localStorage.removeItem(STORAGE_KEYS.CASCADE_REPORT);
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_DEFAULTS);
        localStorage.removeItem('asc_cascade_impact_report');
        localStorage.removeItem('asc_diagnostic_logs');
      }
    } catch (e) {
      console.warn('Could not initialize clean startup storage', e);
    }
  }

  static getSettings(): InstitutionSettings {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data !== null) return JSON.parse(data);
      
      const custom = this.getCustomDefaultsRaw();
      if (custom?.settings) {
        this.saveSettings(custom.settings);
        return custom.settings;
      }
    } catch (e) {
      console.warn('Could not read settings from storage', e);
    }
    return initialSettings;
  }

  static saveSettings(settings: InstitutionSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Could not save settings', e);
    }
  }

  static getTeachers(): Teacher[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.teachers && Array.isArray(custom.teachers)) {
        this.saveTeachers(custom.teachers);
        return custom.teachers;
      }
    } catch (e) {
      console.warn('Could not read teachers from storage', e);
    }
    return [];
  }

  static saveTeachers(teachers: Teacher[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    } catch (e) {
      console.error('Could not save teachers', e);
    }
  }

  static getRooms(): Room[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.rooms && Array.isArray(custom.rooms)) {
        this.saveRooms(custom.rooms);
        return custom.rooms;
      }
    } catch (e) {
      console.warn('Could not read rooms from storage', e);
    }
    return [];
  }

  static saveRooms(rooms: Room[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch (e) {
      console.error('Could not save rooms', e);
    }
  }

  static getExams(): Exam[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
      if (data !== null) {
        const parsed: Exam[] = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.exams && Array.isArray(custom.exams)) {
        this.saveExams(custom.exams);
        return custom.exams;
      }
    } catch (e) {
      console.warn('Could not read exams from storage', e);
    }
    return [];
  }

  static saveExams(exams: Exam[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    } catch (e) {
      console.error('Could not save exams', e);
    }
  }

  static getPromotions(): PromotionGroup[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.promotions && Array.isArray(custom.promotions)) {
        return custom.promotions;
      }
    } catch (e) {
      console.warn('Could not read promotions from storage', e);
    }
    return [];
  }

  static savePromotions(promotions: PromotionGroup[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promotions));
    } catch (e) {
      console.error('Could not save promotions', e);
    }
  }

  static getSubjects(): SubjectModule[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.subjects && Array.isArray(custom.subjects)) {
        return custom.subjects;
      }
    } catch (e) {
      console.warn('Could not read subjects from storage', e);
    }
    return [];
  }

  static saveSubjects(subjects: SubjectModule[]): void {
    try {
      const normalized = subjects.map(s => ({
        ...s,
        nom: s.nom || s.nomModule || 'Matière sans nom',
        nomModule: s.nomModule || s.nom || 'Matière sans nom',
        code: s.code || s.codeModule || 'CODE',
        codeModule: s.codeModule || s.code || 'CODE',
        responsableId: s.responsableId || s.enseignantResponsableId || '',
        enseignantResponsableId: s.enseignantResponsableId || s.responsableId || ''
      }));
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(normalized));
    } catch (e) {
      console.error('Could not save subjects', e);
    }
  }

  static getTimeOffConstraints(): TimeOffEntry[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIMEOFF);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      const custom = this.getCustomDefaultsRaw();
      if (custom?.timeOffConstraints && Array.isArray(custom.timeOffConstraints)) {
        return custom.timeOffConstraints;
      }
    } catch (e) {
      console.warn('Could not read time off constraints', e);
    }
    return [];
  }

  static getTimeOff(): TimeOffEntry[] {
    return this.getTimeOffConstraints();
  }

  static saveTimeOffConstraints(timeOff: TimeOffEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMEOFF, JSON.stringify(timeOff));
    } catch (e) {
      console.error('Could not save time off constraints', e);
    }
  }

  static saveTimeOff(timeOff: TimeOffEntry[]): void {
    this.saveTimeOffConstraints(timeOff);
  }

  static getGlobalConstraints(): GlobalConstraints {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GLOBAL_CONSTRAINTS);
      if (data !== null) return JSON.parse(data);
      const custom = this.getCustomDefaultsRaw();
      if (custom?.globalConstraints) {
        return custom.globalConstraints;
      }
    } catch (e) {
      console.warn('Could not read global constraints', e);
    }
    return initialGlobalConstraints;
  }

  static saveGlobalConstraints(constraints: GlobalConstraints): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_CONSTRAINTS, JSON.stringify(constraints));
    } catch (e) {
      console.error('Could not save global constraints', e);
    }
  }

  static getSessionConfig(): SessionConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION_CONFIG);
      if (data !== null) return JSON.parse(data);
      const custom = this.getCustomDefaultsRaw();
      if (custom?.sessionConfig) {
        return custom.sessionConfig;
      }
    } catch (e) {
      console.warn('Could not read session config', e);
    }
    return initialSessionConfig;
  }

  static saveSessionConfig(config: SessionConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Could not save session config', e);
    }
  }

  static getSubstitutions(): Substitution[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBSTITUTIONS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read substitutions', e);
    }
    return [];
  }

  static saveSubstitutions(subs: Substitution[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSTITUTIONS, JSON.stringify(subs));
    } catch (e) {
      console.error('Could not save substitutions', e);
    }
  }

  static getAttendance(): ExamAttendance[] {
    this.checkAndInitCleanStartup();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read attendance', e);
    }
    return [];
  }

  static getAttendances(): ExamAttendance[] {
    return this.getAttendance();
  }

  static saveAttendance(att: ExamAttendance[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(att));
    } catch (e) {
      console.error('Could not save attendance', e);
    }
  }

  static saveAttendances(att: ExamAttendance[]): void {
    this.saveAttendance(att);
  }

  static getLanguage(): Language {
    try {
      const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as any;
      if (lang === 'ar' || lang === 'fr' || lang === 'en' || lang === 'FR' || lang === 'AR' || lang === 'EN') return lang;
    } catch (e) {
      console.warn('Could not read language preference', e);
    }
    return 'FR';
  }

  static saveLanguage(lang: Language): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.error('Could not save language', e);
    }
  }

  static getThemeSettings(): ThemeSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.THEME_SETTINGS);
      if (data) {
        return { ...defaultThemeSettings, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Could not read theme settings from storage', e);
    }
    return defaultThemeSettings;
  }

  static saveThemeSettings(settings: ThemeSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Could not save theme settings', e);
    }
  }

  // --- CUSTOM DEFAULTS MANAGEMENT ---
  private static getCustomDefaultsRaw(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_DEFAULTS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static hasCustomDefaults(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.CUSTOM_DEFAULTS);
  }

  /**
   * Atomically saves all current working models to storage and updates the default snapshot.
   */
  static saveCurrentWorkingState(data: {
    settings?: InstitutionSettings;
    sessionConfig?: SessionConfig;
    teachers?: Teacher[];
    rooms?: Room[];
    exams?: Exam[];
    promotions?: PromotionGroup[];
    subjects?: SubjectModule[];
    timeOffConstraints?: TimeOffEntry[];
    globalConstraints?: GlobalConstraints;
    substitutions?: Substitution[];
    attendance?: ExamAttendance[];
  }): void {
    try {
      if (data.settings) this.saveSettings(data.settings);
      if (data.sessionConfig) this.saveSessionConfig(data.sessionConfig);
      if (data.teachers) this.saveTeachers(data.teachers);
      if (data.rooms) this.saveRooms(data.rooms);
      if (data.exams) this.saveExams(data.exams);
      if (data.promotions) this.savePromotions(data.promotions);
      if (data.subjects) this.saveSubjects(data.subjects);
      if (data.timeOffConstraints) this.saveTimeOffConstraints(data.timeOffConstraints);
      if (data.globalConstraints) this.saveGlobalConstraints(data.globalConstraints);
      if (data.substitutions) this.saveSubstitutions(data.substitutions);
      if (data.attendance) this.saveAttendance(data.attendance);

      this.saveCurrentAsDefaults();
    } catch (e) {
      console.error('Failed to save current working state', e);
    }
  }

  /**
   * Saves current working state as the permanent default template.
   */
  static saveCurrentAsDefaults(): void {
    try {
      const snapshot = {
        savedAt: new Date().toISOString(),
        settings: this.getSettings(),
        teachers: this.getTeachers(),
        rooms: this.getRooms(),
        exams: this.getExams(),
        promotions: this.getPromotions(),
        subjects: this.getSubjects(),
        timeOffConstraints: this.getTimeOffConstraints(),
        globalConstraints: this.getGlobalConstraints(),
        sessionConfig: this.getSessionConfig(),
        substitutions: this.getSubstitutions(),
        attendance: this.getAttendance()
      };
      localStorage.setItem(STORAGE_KEYS.CUSTOM_DEFAULTS, JSON.stringify(snapshot));
    } catch (e) {
      console.error('Failed to save current state as custom defaults', e);
    }
  }

  /**
   * Restores from custom defaults if set, or clears to empty defaults.
   */
  static resetToDefaults(): void {
    const custom = this.getCustomDefaultsRaw();
    if (custom) {
      if (custom.settings) this.saveSettings(custom.settings);
      if (Array.isArray(custom.teachers)) this.saveTeachers(custom.teachers);
      if (Array.isArray(custom.rooms)) this.saveRooms(custom.rooms);
      if (Array.isArray(custom.exams)) this.saveExams(custom.exams);
      if (Array.isArray(custom.promotions)) this.savePromotions(custom.promotions);
      if (Array.isArray(custom.subjects)) this.saveSubjects(custom.subjects);
      if (Array.isArray(custom.timeOffConstraints)) this.saveTimeOffConstraints(custom.timeOffConstraints);
      if (custom.globalConstraints) this.saveGlobalConstraints(custom.globalConstraints);
      if (custom.sessionConfig) this.saveSessionConfig(custom.sessionConfig);
      if (Array.isArray(custom.substitutions)) this.saveSubstitutions(custom.substitutions);
      if (Array.isArray(custom.attendance)) this.saveAttendance(custom.attendance);
    } else {
      this.clearAllDataAndReportsAndSaveDefaults();
    }
  }

  /**
   * Resets explicitly to clean/empty initial state.
   */
  static resetToDemoData(): void {
    this.clearAllDataAndReportsAndSaveDefaults();
  }

  static clearAllData(): void {
    this.saveSettings(initialSettings);
    this.saveTeachers([]);
    this.saveRooms([]);
    this.saveExams([]);
    this.savePromotions([]);
    this.saveSubjects([]);
    this.saveTimeOffConstraints([]);
    this.saveSubstitutions([]);
    this.saveAttendance([]);
    this.clearAllReports();
  }

  /**
   * Purges any cached cascade or diagnostic reports from persistent storage.
   */
  static clearAllReports(): void {
    this.saveCascadeReport(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CASCADE_REPORT);
      localStorage.removeItem('asc_cascade_impact_report');
      localStorage.removeItem('asc_diagnostic_logs');
    } catch (e) {
      console.warn('Could not clear reports', e);
    }
  }

  /**
   * Completely clears all data (teachers, rooms, exams, promotions, subjects,
   * constraints, substitutions, attendances) and all reports, then immediately
   * commits this clean/empty state as the permanent custom Defaults template.
   */
  static clearAllDataAndReportsAndSaveDefaults(): void {
    this.saveSettings(initialSettings);
    this.saveTeachers([]);
    this.saveRooms([]);
    this.saveExams([]);
    this.savePromotions([]);
    this.saveSubjects([]);
    this.saveTimeOffConstraints([]);
    this.saveGlobalConstraints(initialGlobalConstraints);
    this.saveSubstitutions([]);
    this.saveAttendance([]);
    this.clearAllReports();
    this.saveCurrentAsDefaults();
  }

  static getCascadeReport(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASCADE_REPORT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static saveCascadeReport(report: any | null): void {
    try {
      if (report) {
        localStorage.setItem(STORAGE_KEYS.CASCADE_REPORT, JSON.stringify(report));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CASCADE_REPORT);
      }
    } catch (e) {
      console.error('Could not save cascade report', e);
    }
  }

  static exportFullBackupJSON(): string {
    const data = {
      version: '2.0.0',
      software: 'ExamGuard aSc TimeTables Edition',
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      teachers: this.getTeachers(),
      rooms: this.getRooms(),
      exams: this.getExams(),
      promotions: this.getPromotions(),
      subjects: this.getSubjects(),
      timeOffConstraints: this.getTimeOffConstraints(),
      globalConstraints: this.getGlobalConstraints(),
      sessionConfig: this.getSessionConfig(),
      substitutions: this.getSubstitutions(),
      attendance: this.getAttendance()
    };
    return JSON.stringify(data, null, 2);
  }

  static importFullBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.settings) this.saveSettings(parsed.settings);
      if (Array.isArray(parsed.teachers)) this.saveTeachers(parsed.teachers);
      if (Array.isArray(parsed.rooms)) this.saveRooms(parsed.rooms);
      if (Array.isArray(parsed.exams)) this.saveExams(parsed.exams);
      if (Array.isArray(parsed.promotions)) this.savePromotions(parsed.promotions);
      if (Array.isArray(parsed.subjects)) this.saveSubjects(parsed.subjects);
      if (Array.isArray(parsed.timeOffConstraints)) this.saveTimeOffConstraints(parsed.timeOffConstraints);
      if (parsed.globalConstraints) this.saveGlobalConstraints(parsed.globalConstraints);
      if (parsed.sessionConfig) this.saveSessionConfig(parsed.sessionConfig);
      if (Array.isArray(parsed.substitutions)) this.saveSubstitutions(parsed.substitutions);
      if (Array.isArray(parsed.attendance)) this.saveAttendance(parsed.attendance);
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON', e);
      return false;
    }
  }

  static loadAutoSave(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Could not read auto-save from storage', e);
      return null;
    }
  }

  static saveAutoSave(data: {
    settings?: InstitutionSettings;
    sessionConfig?: SessionConfig;
    teachers?: Teacher[];
    rooms?: Room[];
    exams?: Exam[];
    promotions?: PromotionGroup[];
    subjects?: SubjectModule[];
    timeOffConstraints?: TimeOffEntry[];
    globalConstraints?: GlobalConstraints;
    substitutions?: Substitution[];
    attendance?: ExamAttendance[];
  }): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, JSON.stringify(data));
      this.syncKeyToDesktop(STORAGE_KEYS.AUTO_SAVE, JSON.stringify(data));
    } catch (e) {
      console.error('Could not save auto-save', e);
    }
  }

  /**
   * Mirrors an updated key to Electron desktop disk storage if running in Electron.
   */
  static syncKeyToDesktop(key: string, value: string): void {
    if (isElectron()) {
      const desktop = getDesktopAPI();
      desktop?.storage?.setItem(key, value).catch(e => {
        console.warn('Failed to mirror storage to desktop:', e);
      });
    }
  }

  /**
   * Initializes desktop storage synchronization on app startup.
   */
  static async initDesktopSync(): Promise<void> {
    if (!isElectron()) return;
    try {
      const desktop = getDesktopAPI();
      if (!desktop?.storage) return;

      const allData = await desktop.storage.getAll();
      if (allData && Object.keys(allData).length > 0) {
        for (const [k, v] of Object.entries(allData)) {
          if (v && !localStorage.getItem(k)) {
            localStorage.setItem(k, v);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to initialize desktop storage sync:', err);
    }
  }

  /**
   * Native Electron Save Project Dialog (.examguard / .json)
   */
  static async saveProjectNative(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const jsonStr = this.exportFullBackupJSON();
    if (!isElectron()) {
      // Browser fallback
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExamGuard_Session_${new Date().toISOString().slice(0, 10)}.examguard`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    try {
      const desktop = getDesktopAPI();
      if (!desktop) return { success: false, error: 'Desktop API non disponible' };

      const defaultFilename = `ExamGuard_Session_${new Date().toISOString().slice(0, 10)}.examguard`;
      const saveRes = await desktop.dialog.showSaveDialog({
        title: 'Enregistrer le Projet ExamGuard',
        defaultPath: defaultFilename,
        filters: [
          { name: 'Projet ExamGuard (*.examguard)', extensions: ['examguard'] },
          { name: 'Fichier JSON (*.json)', extensions: ['json'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      });

      if (saveRes.canceled || !saveRes.filePath) {
        return { success: false, error: 'Enregistrement annulé.' };
      }

      const writeRes = await desktop.files.writeFile(saveRes.filePath, jsonStr);
      if (writeRes.success) {
        return { success: true, filePath: saveRes.filePath };
      } else {
        return { success: false, error: writeRes.error || 'Erreur lors de l\'écriture du fichier.' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Native Electron Open Project Dialog (.examguard / .json)
   */
  static async openProjectNative(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (!isElectron()) {
      return { success: false, error: 'Fonction disponible en mode Desktop uniquement.' };
    }

    try {
      const desktop = getDesktopAPI();
      if (!desktop) return { success: false, error: 'Desktop API non disponible' };

      const openRes = await desktop.dialog.showOpenDialog({
        title: 'Ouvrir un Projet ExamGuard',
        filters: [
          { name: 'Projets ExamGuard (*.examguard, *.json)', extensions: ['examguard', 'json'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (openRes.canceled || openRes.filePaths.length === 0) {
        return { success: false, error: 'Ouverture annulée.' };
      }

      const filePath = openRes.filePaths[0];
      const readRes = await desktop.files.readFile(filePath);
      if (!readRes.success || !readRes.data) {
        return { success: false, error: readRes.error || 'Erreur de lecture du fichier.' };
      }

      const imported = this.importFullBackupJSON(readRes.data);
      if (imported) {
        return { success: true, filePath };
      } else {
        return { success: false, error: 'Le format du fichier est invalide.' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
