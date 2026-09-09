import React, { useRef, useState } from 'react';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  FileSpreadsheet, 
  Database, 
  Save, 
  CheckCircle2, 
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Teacher, Exam, Room, InstitutionSettings, Language, PromotionGroup, SubjectModule, TimeOffEntry, GlobalConstraints, SessionConfig } from '../../types';
import { translations } from '../../services/i18n';
import { StorageService } from '../../services/storage';
import { ExportUtils } from '../../services/exportUtils';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { isElectron } from '../../services/platform';

interface UtilitiesViewProps {
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  timeOffConstraints?: TimeOffEntry[];
  globalConstraints?: GlobalConstraints;
  sessionConfig?: SessionConfig;
  settings: InstitutionSettings;
  language: Language;
  onDataReloaded: () => void;
  activeSubSection?: string; // 'file-export-excel' | 'file-backup-json' | 'file-reset-demo'
  onSelectSubSection?: (section: string) => void;
  onNotify?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export const UtilitiesView: React.FC<UtilitiesViewProps> = ({
  teachers,
  exams,
  rooms,
  promotions,
  subjects,
  settings,
  language,
  onDataReloaded,
  activeSubSection = 'file-export-excel',
  onSelectSubSection,
  onNotify
}) => {
  const t = translations[language] || translations.fr;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teacherCSVInputRef = useRef<HTMLInputElement>(null);
  const examsCSVInputRef = useRef<HTMLInputElement>(null);
  const subjectsCSVInputRef = useRef<HTMLInputElement>(null);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [isDefaultRestoreConfirmOpen, setIsDefaultRestoreConfirmOpen] = useState(false);
  const [isClearAndSaveDefaultsConfirmOpen, setIsClearAndSaveDefaultsConfirmOpen] = useState(false);

  const currentSection = activeSubSection === 'file-backup-json' 
    ? 'backup-json' 
    : activeSubSection === 'file-reset-demo' 
    ? 'reset-demo' 
    : 'export-excel';

  // Backup JSON / Project export
  const handleExportBackup = async () => {
    if (isElectron()) {
      const res = await StorageService.saveProjectNative();
      if (res.success) {
        if (onNotify) {
          onNotify('success', 'Projet Enregistré', `Le projet a été sauvegardé avec succès${res.filePath ? ` dans : ${res.filePath}` : ''}.`);
        }
      } else if (res.error && res.error !== 'Enregistrement annulé.') {
        if (onNotify) onNotify('error', 'Erreur Sauvegarde', res.error);
      }
      return;
    }

    const jsonStr = StorageService.exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExamGuard_Backup_${new Date().toISOString().slice(0, 10)}.examguard`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotify) {
      onNotify('success', 'Sauvegarde Exportée', 'Le fichier de projet a été téléchargé.');
    }
  };

  // Backup JSON / Project import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importFullBackupJSON(content);
      if (success) {
        if (onNotify) {
          onNotify('success', 'Import Réussi', 'L\'intégralité des données a été restaurée avec succès !');
        } else {
          alert('Sauvegarde importée avec succès !');
        }
        onDataReloaded();
      } else {
        if (onNotify) {
          onNotify('error', 'Erreur Import', 'Le fichier est invalide ou corrompu.');
        } else {
          alert('Erreur lors du décodage du fichier de sauvegarde.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Import Teachers CSV
  const handleImportTeachersCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = ExportUtils.importTeachersFromCSV(content, teachers);
      if (res.success && res.teachers.length > 0) {
        const merged = [...teachers, ...res.teachers];
        StorageService.saveTeachers(merged);
        onDataReloaded();
        if (onNotify) {
          onNotify('success', 'Import Enseignants Réussi', `${res.count} enseignant(s) importé(s) avec succès.`);
        }
      } else if (res.success && res.count === 0) {
        if (onNotify) onNotify('info', 'Import Enseignants', 'Aucun nouvel enseignant à importer (doublons ignorés).');
      } else {
        if (onNotify) onNotify('error', 'Erreur Import Enseignants', res.error || 'Erreur de lecture du fichier CSV.');
      }
    };
    reader.readAsText(file);
    if (teacherCSVInputRef.current) teacherCSVInputRef.current.value = '';
  };

  // Import Planning CSV
  const handleImportExamsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = ExportUtils.importExamsFromCSV(content, teachers, rooms, exams);
      if (res.success && res.exams.length > 0) {
        const merged = [...exams, ...res.exams];
        StorageService.saveExams(merged);
        onDataReloaded();
        if (onNotify) {
          onNotify('success', 'Import Planning Réussi', `${res.count} épreuve(s) importée(s) avec succès.`);
        }
      } else if (res.success && res.count === 0) {
        if (onNotify) onNotify('info', 'Import Planning', 'Aucun examen valide trouvé dans le fichier.');
      } else {
        if (onNotify) onNotify('error', 'Erreur Import Planning', res.error || 'Erreur de lecture du fichier CSV.');
      }
    };
    reader.readAsText(file);
    if (examsCSVInputRef.current) examsCSVInputRef.current.value = '';
  };

  // Import Subjects CSV
  const handleImportSubjectsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = ExportUtils.importSubjectsFromCSV(content, teachers, subjects);
      if (res.success && res.subjects.length > 0) {
        const merged = [...subjects, ...res.subjects];
        StorageService.saveSubjects(merged);
        onDataReloaded();
        if (onNotify) {
          onNotify('success', 'Import Matières Réussi', `${res.count} matière(s) / module(s) importée(s) avec succès.`);
        }
      } else if (res.success && res.count === 0) {
        if (onNotify) onNotify('info', 'Import Matières', 'Aucune nouvelle matière à importer (doublons ignorés).');
      } else {
        if (onNotify) onNotify('error', 'Erreur Import Matières', res.error || 'Erreur de lecture du fichier CSV.');
      }
    };
    reader.readAsText(file);
    if (subjectsCSVInputRef.current) subjectsCSVInputRef.current.value = '';
  };

  const handleNativeOpenClick = async () => {
    if (isElectron()) {
      const res = await StorageService.openProjectNative();
      if (res.success) {
        if (onNotify) {
          onNotify('success', 'Projet Ouvert', `Le projet a été importé avec succès depuis ${res.filePath || ''}.`);
        }
        onDataReloaded();
      } else if (res.error && res.error !== 'Ouverture annulée.') {
        if (onNotify) onNotify('error', 'Erreur Ouverture', res.error);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Save current data as defaults
  const handleSaveAsDefaults = () => {
    StorageService.saveCurrentAsDefaults();
    if (onNotify) {
      onNotify('success', 'Données par Défaut Enregistrées', 'Les données actuelles (matières, promotions, enseignants, examens, salles) sont désormais enregistrées comme données par défaut.');
    } else {
      alert('Les données actuelles ont été enregistrées comme données par défaut.');
    }
  };

  // Restore custom defaults
  const executeRestoreDefaults = () => {
    StorageService.resetToDefaults();
    onDataReloaded();
    if (onNotify) {
      onNotify('info', 'Données par Défaut Restaurées', 'Les données par défaut ont été rechargées.');
    }
    setIsDefaultRestoreConfirmOpen(false);
  };

  // Restore official factory demo
  const executeResetDemo = () => {
    StorageService.resetToDemoData();
    onDataReloaded();
    if (onNotify) {
      onNotify('info', 'Données Démo Restaurées', 'Le jeu de données de démonstration officiel a été restauré.');
    }
    setIsDemoConfirmOpen(false);
  };

  // Clear all data
  const executeClearAll = () => {
    StorageService.clearAllData();
    onDataReloaded();
    if (onNotify) {
      onNotify('warning', 'Données Effacées', 'Toutes les données ont été effacées.');
    }
    setIsClearConfirmOpen(false);
  };

  // Clear all data, all reports, and save as defaults
  const executeClearAllAndSaveDefaults = () => {
    StorageService.clearAllDataAndReportsAndSaveDefaults();
    onDataReloaded();
    if (onNotify) {
      onNotify('success', 'Défauts Vierge Enregistrés', 'Toutes les données et rapports ont été effacés et enregistrés comme nouveaux Défauts.');
    }
    setIsClearAndSaveDefaultsConfirmOpen(false);
  };

  const hasDefaults = StorageService.hasCustomDefaults();
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm overflow-x-auto">
        <button
          onClick={() => onSelectSubSection?.('file-export-excel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentSection === 'export-excel'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          <span>Exporter</span>
        </button>

        <button
          onClick={() => onSelectSubSection?.('file-backup-json')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentSection === 'backup-json'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-indigo-300" />
          <span>Importer</span>
        </button>

        <button
          onClick={() => onSelectSubSection?.('file-reset-demo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentSection === 'reset-demo'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-rose-300" />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* SECTION 1: EXPORTER */}
      {currentSection === 'export-excel' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Exporter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Générez et téléchargez des rapports au format CSV compatible Microsoft Excel, LibreOffice et Google Sheets.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 hidden sm:inline-block">
              {teachers.length} Enseignants • {exams.length} Examens • {subjects.length} Matières • {rooms.length} Salles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Teachers */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Liste des Enseignants</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Noms, grades, départements, spécialités, contacts et quotas de surveillance.
                </p>
              </div>
              <button
                onClick={() => ExportUtils.exportTeachersCSV(teachers)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exporter Enseignants (.CSV)</span>
              </button>
            </div>

            {/* Export Schedule CSV */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Planning des Examens (Tableur)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Dates, créneaux, modules, promotions, responsables et salles avec surveillants.
                </p>
              </div>
              <button
                onClick={() => ExportUtils.exportExamsCSV(exams, teachers, rooms)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Exporter Planning (.CSV)</span>
              </button>
            </div>

            {/* Export Subjects */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Catalogue Matières & Modules</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Modules, codes, promotions, coefficients, durées et enseignants responsables.
                </p>
              </div>
              <button
                onClick={() => ExportUtils.exportSubjectsCSV(subjects, teacherMap)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Exporter Matières & Modules (.CSV)</span>
              </button>
            </div>

            {/* Export Rooms */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Liste des Salles & Locaux</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Noms, capacités d'examen et normales, types et bâtiments des salles.
                </p>
              </div>
              <button
                onClick={() => ExportUtils.exportRoomsCSV(rooms)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Exporter Salles (.CSV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: IMPORTER */}
      {currentSection === 'backup-json' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Importer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Importez vos données depuis des fichiers CSV ou restaurez une sauvegarde complète du système (.JSON / .ExamGuard).
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50">
              CSV & JSON
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import Teachers CSV */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Importer Enseignants (.CSV)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Importez la liste des enseignants depuis un fichier CSV (Nom, Prénom, Grade, Département, Spécialité, Quota).
                </p>
              </div>
              <button
                onClick={() => teacherCSVInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Importer Enseignants (.CSV)</span>
              </button>
              <input
                ref={teacherCSVInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportTeachersCSV}
              />
            </div>

            {/* Import Planning CSV */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Importer Planning (.CSV)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Importez les épreuves et créneaux horaires d'un planning depuis un fichier CSV.
                </p>
              </div>
              <button
                onClick={() => examsCSVInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Importer Planning (.CSV)</span>
              </button>
              <input
                ref={examsCSVInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportExamsCSV}
              />
            </div>

            {/* Import Subjects CSV */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Importer Matières & Modules (.CSV)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Importez le catalogue des modules, coefficients et promotions depuis un fichier CSV.
                </p>
              </div>
              <button
                onClick={() => subjectsCSVInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Importer Matières & Modules (.CSV)</span>
              </button>
              <input
                ref={subjectsCSVInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportSubjectsCSV}
              />
            </div>

            {/* Import Full Project Backup */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-900/50 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Restaurer Sauvegarde Complète</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Chargez une sauvegarde intégrale du système (.JSON ou .ExamGuard) pour restaurer toutes les données.
                </p>
              </div>
              <button
                onClick={handleNativeOpenClick}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition"
              >
                <Upload className="w-4 h-4" />
                <span>Choisir Fichier (.JSON / .ExamGuard)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.examguard"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {/* Database Summary Info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Résumé de la base de données actuelle :
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enseignants</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{teachers.length}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Examens</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{exams.length}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Matières & Modules</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{subjects.length}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Promotions</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{promotions.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: REINITIALISER */}
      {currentSection === 'reset-demo' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-lg">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Réinitialiser
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sauvegardez vos propres données comme standard par défaut, restaurez-les à tout moment ou remettez à zéro.
                </p>
              </div>
            </div>
            {hasDefaults && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Données par défaut personnalisées actives</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature: Sauvegarder comme defaults */}
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs">
                  <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4>Sauvegarder ces Données comme Défauts</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Enregistre l'ensemble de vos données actuelles (sans les éléments supprimés) comme nouveau jeu par défaut permanent.
                </p>
              </div>
              <button
                onClick={handleSaveAsDefaults}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
              >
                <Save className="w-4 h-4" />
                <span>Définir comme Données par Défaut</span>
              </button>
            </div>

            {/* Feature: Restaurer Defaults */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <h4>Restaurer les Données par Défaut</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Recharge vos données par défaut enregistrées ci-contre (ou la démo d'usine si aucune n'a été définie).
                </p>
              </div>
              <button
                onClick={() => setIsDefaultRestoreConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Restaurer Données par Défaut</span>
              </button>
            </div>

            {/* Feature: Restaurer Démo Usine */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h4>Restaurer Démo Usine (aSc Original)</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Réinitialise l'application avec le jeu de données initial officiel du Département de Technologie.
                </p>
              </div>
              <button
                onClick={() => setIsDemoConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Restaurer Démo Usine aSc</span>
              </button>
            </div>

            {/* Feature: Effacer toutes les données */}
            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h4>Supprimer toutes les données</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Efface complètement tous les tableaux pour démarrer une nouvelle session sur une base totalement vierge.
                </p>
              </div>
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/50 border border-rose-300 dark:border-rose-700 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Effacer Toutes les Données</span>
              </button>
            </div>

            {/* Feature: Effacer toutes les données, tous les rapports et sauvegarder comme Défauts */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-800/60 space-y-3 flex flex-col justify-between md:col-span-2">
              <div>
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <Save className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4>Effacer toutes les données, tous les rapports et sauvegarder comme « Défauts »</h4>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Efface l'intégralité des données (enseignants, examens, salles, promotions, matières, contraintes, affectations) ainsi que tous les rapports et journaux de synchronisation, puis sauvegarde immédiatement cet état vierge comme la nouvelle configuration par défaut.
                </p>
              </div>
              <button
                onClick={() => setIsClearAndSaveDefaultsConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition"
              >
                <Trash2 className="w-4 h-4 text-amber-100" />
                <span>Effacer toutes les données, tous les rapports et sauvegarder comme « Défauts »</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={isClearAndSaveDefaultsConfirmOpen}
        title="Effacer données, rapports et sauvegarder comme Défauts"
        message="Êtes-vous certain de vouloir effacer toutes les données, purger tous les rapports et sauvegarder cet état vierge comme nouveaux Défauts ?"
        confirmLabel="Oui, effacer et sauvegarder comme Défauts"
        cancelLabel="Annuler"
        type="danger"
        onConfirm={executeClearAllAndSaveDefaults}
        onCancel={() => setIsClearAndSaveDefaultsConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={isDefaultRestoreConfirmOpen}
        title="Restaurer les données par défaut"
        message="Voulez-vous recharger le jeu de données par défaut ? Vos modifications non sauvegardées comme défauts seront écrasées."
        confirmLabel="Restaurer"
        cancelLabel="Annuler"
        type="warning"
        onConfirm={executeRestoreDefaults}
        onCancel={() => setIsDefaultRestoreConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isDemoConfirmOpen}
        title="Restaurer la démo usine"
        message="Voulez-vous restaurer le jeu de données de test officiel aSc ? Toutes vos modifications actuelles seront réinitialisées."
        confirmLabel="Restaurer Démo"
        cancelLabel="Annuler"
        type="warning"
        onConfirm={executeResetDemo}
        onCancel={() => setIsDemoConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Effacer toutes les données"
        message="Attention : Cette opération va effacer l'intégralité des enseignants, examens, salles, promotions et matières enregistrés dans l'application. Cette action est irréversible."
        confirmLabel="Oui, tout effacer"
        cancelLabel="Annuler"
        type="danger"
        onConfirm={executeClearAll}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
};

