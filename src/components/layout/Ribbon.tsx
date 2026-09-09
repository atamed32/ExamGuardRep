import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  Calendar,
  Users,
  Layers,
  DoorClosed,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Printer,
  FileText,
  Sliders,
  ShieldAlert,
  Download,
  Upload,
  RotateCcw,
  UserCheck,
  FileSpreadsheet,
  Settings,
  Search,
  CheckCircle2,
  Wand2,
  Lock,
  PlusCircle,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  Landmark,
  Palette,
  LayoutGrid,
  Building,
  Clock,
  Save,
  ChevronDown,
  Languages,
  FolderOpen,
  FileDown
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { StorageService } from '../../services/storage';
import { Translations } from '../../services/i18n';
import { Language, ThemeMode, ThemeSettings, AccentColor } from '../../types';
import { isElectron } from '../../services/platform';

export type RibbonTab = 'file' | 'data' | 'constraints' | 'timetable' | 'generator' | 'verification' | 'print' | 'substitutions' | 'specifications' | 'help';

interface RibbonProps {
  activeTab: RibbonTab;
  setActiveTab: (tab: RibbonTab) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  t: Translations;
  currentLang: Language;
  onLanguageToggle: () => void;
  onSelectLanguage?: (lang: Language) => void;
  conflictCount: number;
  onOpenWizard: () => void;
  onOpenProject?: () => void;
  onOpenGenerator: () => void;
  onOpenExportJSON: () => void;
  onOpenImportJSON: () => void;
  onResetDemo: () => void;
  onPrintAll: () => void;
  onOpenCommandPalette: () => void;
  onQuickSave?: () => void;
  onSaveAs?: () => void;
  onOpenRoomAssignment?: () => void;
  themeSettings?: ThemeSettings;
  onCycleTheme?: () => void;
  onSelectThemeMode?: (mode: ThemeMode) => void;
  onSelectAccentColor?: (accent: AccentColor) => void;
  onOpenOfficialPlanning?: (type: 'global' | 'promotion') => void;
  onOpenAbout?: () => void;
}

export const Ribbon: React.FC<RibbonProps> = ({
  activeTab,
  setActiveTab,
  activeView,
  setActiveView,
  t,
  currentLang,
  onLanguageToggle,
  onSelectLanguage,
  conflictCount,
  onOpenWizard,
  onOpenProject,
  onOpenGenerator,
  onOpenRoomAssignment,
  onOpenExportJSON,
  onOpenImportJSON,
  onResetDemo,
  onPrintAll,
  onOpenCommandPalette,
  onQuickSave,
  onSaveAs,
  themeSettings = { mode: 'dark', accent: 'emerald', contrast: 'normal' },
  onCycleTheme,
  onSelectThemeMode,
  onSelectAccentColor,
  onOpenOfficialPlanning,
  onOpenAbout
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const { teachers, rooms, exams, promotions, subjects, sessionConfig, timeOffConstraints, globalConstraints, substitutions, attendances, settings, addToast } = useContext(AppContext);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = themeSettings?.mode === 'light';

  const handleOpenClick = async () => {
    if (onOpenProject) {
      onOpenProject();
      return;
    }
    if (isElectron()) {
      const res = await StorageService.openProjectNative();
      if (res.success) {
        addToast('success', 'Projet Ouvert', `Le projet a été importé avec succès depuis ${res.filePath || ''}.`);
        window.location.reload();
      } else if (res.error && res.error !== 'Ouverture annulée.') {
        addToast('error', 'Erreur Ouverture', res.error);
      }
    } else {
      openFileInputRef.current?.click();
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importFullBackupJSON(content);
      if (success) {
        addToast('success', 'Import Réussi', "L'intégralité des données a été restaurée avec succès !");
        window.location.reload();
      } else {
        addToast('error', 'Erreur Import', 'Le fichier est invalide ou corrompu.');
      }
    };
    reader.readAsText(file);
    if (openFileInputRef.current) openFileInputRef.current.value = '';
  };

  const handleSave = () => {
    try {
      if (onQuickSave) {
        onQuickSave();
        return;
      }
      StorageService.saveCurrentWorkingState({
        settings,
        sessionConfig,
        teachers,
        rooms,
        exams,
        promotions,
        subjects,
        timeOffConstraints,
        globalConstraints,
        substitutions,
        attendance: attendances
      });
      addToast('success', 'Enregistrement réussi', 'Toutes les données ont été enregistrées avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      addToast('error', 'Erreur d\'enregistrement', 'Une erreur est survenue lors de l\'enregistrement des données.');
    }
  };

  const handleSaveAs = async () => {
    if (onSaveAs) {
      onSaveAs();
      return;
    }
    try {
      const res = await StorageService.saveProjectNative();
      if (res.success) {
        addToast('success', 'Enregistrement réussi', res.filePath ? `Projet enregistré sous : ${res.filePath}` : 'Projet téléchargé avec succès.');
      } else if (res.error && res.error !== 'Enregistrement annulé.' && res.error !== 'Annulé') {
        addToast('error', 'Erreur Enregistrement', res.error);
      }
    } catch (e: any) {
      addToast('error', 'Erreur Enregistrement', e.message || 'Impossible d\'enregistrer le fichier.');
    }
  };

  return (
    <header className={`${isLight ? 'bg-white text-slate-900 border-b border-slate-200 shadow-2xs' : 'bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md'} select-none print:hidden relative z-30`}>
      {/* Hidden file input for opening .examguard / .json */}
      <input
        ref={openFileInputRef}
        type="file"
        accept=".examguard,.json"
        className="hidden"
        onChange={handleImportBackupFile}
      />

      {/* Ribbon Tabs Navigation - Order: Fichier, Édition, Affichage, Spécification, Impression & export, Aide */}
      <div className={`flex items-center space-x-1 rtl:space-x-reverse px-3 pt-1 border-b overflow-x-auto text-xs ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* 1. Fichier */}
        <button
          onClick={() => setActiveTab('file')}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'file'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          {t.ribbonFile}
        </button>

        {/* 2. Données de base: Édition */}
        <button
          onClick={() => setActiveTab('data')}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'data'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          {t.ribbonData}
        </button>

        {/* 3. Emploi du temps: Affichage */}
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'timetable'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          {t.ribbonTimetable}
        </button>

        {/* 4. Spécification */}
        <button
          onClick={() => {
            setActiveTab('specifications');
            if (
              activeView !== 'constraints-timeoff' && 
              activeView !== 'constraints-global' && 
              activeView !== 'verification' && 
              activeView !== 'workload-stats' && 
              activeView !== 'substitutions' && 
              activeView !== 'attendance'
            ) {
              setActiveView('verification');
            }
          }}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'specifications'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          <span>{t.ribbonSpecifications || 'Spécification'}</span>
        </button>

        {/* 5. Impression & export */}
        <button
          onClick={() => setActiveTab('print')}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'print'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          {t.ribbonPrint}
        </button>

        {/* 6. Aide */}
        <button
          onClick={() => setActiveTab('help')}
          className={`px-3.5 py-1.5 font-semibold rounded-t-md transition border-t border-x ${
            activeTab === 'help'
              ? isLight
                ? 'bg-white text-emerald-700 border-slate-300 border-b-transparent shadow-xs font-bold'
                : 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
          }`}
        >
          {t.ribbonHelp || 'Aide'}
        </button>
      </div>

      {/* Ribbon Action Toolbar Panel (Hidden when on timetable/Affichage tab because all controls are directly integrated in TimetableView) */}
      {activeTab !== 'timetable' && (
        <div className={`p-2 flex flex-wrap items-center gap-2 text-xs border-b overflow-visible min-h-[52px] relative z-20 ${
          isLight ? 'bg-slate-100/90 border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/60 text-slate-100'
        }`}>
          {/* DATA TAB CONTROLS */}
          {activeTab === 'data' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('teachers')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'teachers'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200/60 hover:text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{t.teachers}</span>
            </button>

            <button
              onClick={() => setActiveView('rooms')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'rooms'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200/60 hover:text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{t.rooms}</span>
            </button>

            <button
              onClick={() => setActiveView('promotions')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'promotions'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200/60 hover:text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span>{t.promotions}</span>
            </button>

            <button
              onClick={() => setActiveView('subjects')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'subjects'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200/60 hover:text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>{t.subjects}</span>
            </button>

            <button
              onClick={() => setActiveView('exams')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'exams'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200/60 hover:text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>{t.exams}</span>
            </button>

            <div className={`h-6 w-px mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />

            {/* Bouton Attribuer une salle dans Données de base */}
            {onOpenRoomAssignment && (
              <button
                onClick={onOpenRoomAssignment}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow transition"
                title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
              >
                <DoorClosed className="w-3.5 h-3.5" />
                <span>Attribuer une salle</span>
              </button>
            )}
          </div>
        )}

        {/* SPECIFICATIONS TAB CONTROLS */}
        {activeTab === 'specifications' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. CONFIGURATION GROUP (Établissement, Horaires & Créneaux, Calendrier des Jours) - Première place */}
            <div className={`flex items-center p-1 rounded-lg border shadow-xs space-x-1 rtl:space-x-reverse ${
              isLight ? 'bg-white border-purple-200 shadow-2xs' : 'bg-slate-900/90 border-purple-800/50'
            }`}>
              <span className={`text-[10px] font-extrabold px-2 uppercase tracking-wider flex items-center gap-1 ${
                isLight ? 'text-purple-700' : 'text-purple-400'
              }`}>
                <Settings className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                <span>Configuration</span>
              </span>

              <button
                onClick={() => setActiveView('settings-institution')}
                className={`px-2.5 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse text-xs transition ${
                  activeView === 'settings' || activeView === 'settings-institution'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : isLight
                      ? 'text-slate-700 hover:bg-purple-50 hover:text-purple-900'
                      : 'text-slate-200 hover:bg-slate-800'
                }`}
                title="Configuration de l'établissement (Nom, faculté, département, logo, en-tête)"
              >
                <Building className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                <span>Établissement</span>
              </button>

              <button
                onClick={() => setActiveView('settings-slots')}
                className={`px-2.5 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse text-xs transition ${
                  activeView === 'settings-slots'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : isLight
                      ? 'text-slate-700 hover:bg-purple-50 hover:text-purple-900'
                      : 'text-slate-200 hover:bg-slate-800'
                }`}
                title="Configuration de l'horaire et créneaux journaliers"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300" />
                <span>Horaires & Créneaux</span>
              </button>

              <button
                onClick={() => setActiveView('settings-calendar')}
                className={`px-2.5 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse text-xs transition ${
                  activeView === 'settings-calendar'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : isLight
                      ? 'text-slate-700 hover:bg-purple-50 hover:text-purple-900'
                      : 'text-slate-200 hover:bg-slate-800'
                }`}
                title="Configuration du calendrier des jours de session"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                <span>Calendrier des Jours</span>
              </button>
            </div>

            <div className={`h-6 w-px mx-0.5 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-700/50'}`} />

            {/* 2. THÈME: Deux options seulement (Sombre et Clair) */}
            <div className={`flex items-center space-x-1 rtl:space-x-reverse p-1 rounded-lg border ${
              isLight ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-900 border-slate-750'
            }`}>
              <span className={`text-[11px] font-bold px-1.5 flex items-center space-x-1 rtl:space-x-reverse ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}>
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold">Thème :</span>
              </span>

              <button
                type="button"
                onClick={() => onSelectThemeMode?.('dark')}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                  themeSettings?.mode === 'dark'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Activer le thème Sombre"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Sombre</span>
                {themeSettings?.mode === 'dark' && <span className="text-[10px] ml-0.5 font-black">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => onSelectThemeMode?.('light')}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                  themeSettings?.mode === 'light'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Activer le thème Clair"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Clair</span>
                {themeSettings?.mode === 'light' && <span className="text-[10px] ml-0.5 font-black">✓</span>}
              </button>
            </div>

            {/* 3. LANGUE: Bouton permettant de choisir entre 3 langues (Arabe, Français, Anglais) - Au premier plan */}
            <div className="relative z-50" ref={langMenuRef}>
              <button
                type="button"
                id="ribbon-spec-lang-btn"
                onClick={() => setIsLangMenuOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-750'
                }`}
                title="Choisir la langue de l'application (Arabe, Français, Anglais)"
              >
                <Languages className="w-3.5 h-3.5 text-amber-500" />
                <span>Langue :</span>
                <span className={`px-1.5 py-0.5 rounded font-extrabold text-[11px] ${
                  isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-200'
                }`}>
                  {(currentLang === 'ar' || currentLang === 'AR') ? 'العربية (AR)' :
                   (currentLang === 'en' || currentLang === 'EN') ? 'English (EN)' : 'Français (FR)'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {isLangMenuOpen && (
                <div className={`absolute left-0 rtl:right-0 rtl:left-auto top-full mt-1.5 w-52 rounded-lg shadow-2xl z-[100] p-1.5 text-xs border ${
                  isLight ? 'bg-white border-slate-300 shadow-2xl ring-1 ring-black/5' : 'bg-slate-900 border-slate-700 shadow-2xl ring-1 ring-slate-700'
                }`}>
                  <div className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider border-b mb-1 ${
                    isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800'
                  }`}>
                    Langue / Language
                  </div>

                  {/* Français */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLanguage ? onSelectLanguage('fr') : onLanguageToggle();
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left rtl:text-right font-medium transition ${
                      (currentLang === 'fr' || currentLang === 'FR')
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                        : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">FR</span>
                      <span>Français</span>
                    </span>
                    {(currentLang === 'fr' || currentLang === 'FR') && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                  </button>

                  {/* Arabe */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLanguage ? onSelectLanguage('ar') : onLanguageToggle();
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left rtl:text-right font-medium transition ${
                      (currentLang === 'ar' || currentLang === 'AR')
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                        : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">AR</span>
                      <span dir="rtl" className="font-bold">العربية</span>
                    </span>
                    {(currentLang === 'ar' || currentLang === 'AR') && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                  </button>

                  {/* Anglais */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLanguage ? onSelectLanguage('en') : onLanguageToggle();
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left rtl:text-right font-medium transition ${
                      (currentLang === 'en' || currentLang === 'EN')
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                        : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">EN</span>
                      <span>English</span>
                    </span>
                    {(currentLang === 'en' || currentLang === 'EN') && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                  </button>
                </div>
              )}
            </div>

            <div className={`h-6 w-px mx-0.5 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-700/50'}`} />

            {/* 4. Contraintes et Vœux */}
            <div className={`flex items-center rounded-lg p-0.5 border ${
              isLight ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-900 border-slate-750'
            }`}>
              <button
                onClick={() => setActiveView('constraints-timeoff')}
                className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                  activeView === 'constraints-timeoff'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : isLight
                      ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Vœux et indisponibilités enseignants"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Contraintes et vœux</span>
              </button>
              <button
                onClick={() => setActiveView('constraints-global')}
                className={`px-2 py-1.5 rounded text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse transition ${
                  activeView === 'constraints-global'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Règles globales"
              >
                <Settings className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                <span>Règles</span>
              </button>
            </div>

            {/* 5. Génération Auto */}
            <button
              onClick={onOpenGenerator}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow transition"
              title="Lancer l'assistant de génération automatique"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Génération auto</span>
            </button>

            {/* 6. Vérification */}
            <button
              onClick={() => setActiveView('verification')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition shadow-xs ${
                activeView === 'verification'
                  ? 'bg-rose-600 text-white border-rose-500 font-bold'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
              title="Vérification et diagnostic des conflits"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Vérification</span>
              {conflictCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {conflictCount}
                </span>
              )}
            </button>

            {/* 7. Remplacement et Permutation */}
            <div className={`flex items-center rounded-lg p-0.5 border ${
              isLight ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-900 border-slate-750'
            }`}>
              <button
                onClick={() => setActiveView('substitutions')}
                className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                  activeView === 'substitutions'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : isLight
                      ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Gestion des demandes de remplacement et de permutation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Remplacement et Permutation</span>
              </button>
              <button
                onClick={() => setActiveView('attendance')}
                className={`px-2 py-1.5 rounded text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse transition ${
                  activeView === 'attendance'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Pointage et PV de présence"
              >
                <UserCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span>Pointage</span>
              </button>
            </div>
          </div>
        )}

        {/* CONSTRAINTS TAB CONTROLS */}
        {activeTab === 'constraints' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('constraints-timeoff')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'constraints-timeoff'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{t.timeOffTitle}</span>
            </button>

            <button
              onClick={() => setActiveView('constraints-global')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'constraints-global'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Règles & Quotas Globaux</span>
            </button>
          </div>
        )}

        {/* GENERATOR TAB CONTROLS */}
        {activeTab === 'generator' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenGenerator}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow transition"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Lancer le Générateur Automatique</span>
            </button>

            <button
              onClick={() => setActiveView('timetable-teachers')}
              className={`px-3 py-1.5 rounded border flex items-center space-x-1.5 rtl:space-x-reverse ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-750 text-slate-300 border-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Inspecter la Grille</span>
            </button>
          </div>
        )}

        {/* VERIFICATION TAB CONTROLS */}
        {activeTab === 'verification' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('verification')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse shadow"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Diagnostic Complet & Conflits ({conflictCount})</span>
            </button>

            <button
              onClick={() => setActiveView('workload-stats')}
              className={`px-3 py-1.5 rounded border flex items-center space-x-1.5 rtl:space-x-reverse ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-750 text-slate-300 border-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Équilibrage des Charges Enseignants</span>
            </button>
          </div>
        )}

        {/* SUBSTITUTIONS & ATTENDANCE */}
        {activeTab === 'substitutions' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('substitutions')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'substitutions'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{t.substitutions}</span>
            </button>

            <button
              onClick={() => setActiveView('attendance')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'attendance'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{t.attendance}</span>
            </button>
          </div>
        )}

        {/* PRINT & CONVOCATIONS */}
        {activeTab === 'print' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (onOpenOfficialPlanning) {
                  onOpenOfficialPlanning('global');
                } else {
                  setActiveTab('timetable');
                  setActiveView('timetable-global');
                }
              }}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-xs transition"
              title="Visualiser et imprimer le planning officiel de la session complète (toutes promotions)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
              <span>Planning Session Complète</span>
            </button>

            <button
              onClick={() => {
                if (onOpenOfficialPlanning) {
                  onOpenOfficialPlanning('promotion');
                } else {
                  setActiveTab('timetable');
                  setActiveView('timetable-global');
                }
              }}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-xs transition"
              title="Visualiser et imprimer l'emploi du temps officiel par promotion étudiante"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Planning Par Promotion</span>
            </button>

            <div className={`h-6 w-px mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />

            <button
              onClick={() => setActiveView('convocations')}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                activeView === 'convocations'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{t.convocations}</span>
            </button>

            <button
              onClick={onPrintAll}
              className={`px-3 py-1.5 rounded border flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{t.printAll}</span>
            </button>
          </div>
        )}

        {/* FILE / BACKUP / WIZARD */}
        {activeTab === 'file' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* SESSION WIZARD BUTTON (NOUVEAU) */}
            <button
              onClick={onOpenWizard}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse shadow text-xs"
              title="Créer une nouvelle session d'examens"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouveau</span>
            </button>

            {/* OPEN BACKUP PROJECT */}
            <button
              onClick={handleOpenClick}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse shadow text-xs"
              title="Ouvrir un fichier de sauvegarde (*.examguard, *.json)"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Ouvrir</span>
            </button>

            {/* ENREGISTRER (SAVE) */}
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse shadow text-xs"
              title="Enregistrer toutes les modifications"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>

            {/* ENREGISTRER SOUS (SAVE AS) */}
            <button
              onClick={handleSaveAs}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse shadow text-xs"
              title="Enregistrer le projet sous un nouveau fichier (*.examguard, *.json)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Enregistrer sous</span>
            </button>

            <button
              onClick={onOpenExportJSON}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border text-xs transition ${
                activeView === 'file-export-excel'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                    : 'bg-slate-900 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Exporter</span>
            </button>

            <button
              onClick={onOpenImportJSON}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border text-xs transition ${
                activeView === 'file-backup-json'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                    : 'bg-slate-900 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Importer</span>
            </button>

            <button
              onClick={onResetDemo}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border text-xs transition ${
                activeView === 'file-reset-demo'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : isLight
                    ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                    : 'bg-slate-900 hover:bg-slate-750 text-rose-300 border-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Réinitialiser</span>
            </button>
          </div>
        )}

        {/* HELP TAB CONTROLS */}
        {activeTab === 'help' && (
          <div className="flex items-center gap-2 flex-wrap py-1">
            <button
              onClick={() => {
                if (onOpenAbout) {
                  onOpenAbout();
                }
              }}
              className={`px-3 py-1.5 rounded font-medium flex items-center space-x-1.5 rtl:space-x-reverse border transition ${
                isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                  : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-750'
              }`}
              title="Informations sur ExamGuard, version et auteur"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>À propos</span>
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
              Guide d'utilisation et aide pour ExamGuard
            </span>
          </div>
        )}
      </div>
      )}
    </header>
  );
};
