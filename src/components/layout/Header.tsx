import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Printer, 
  Globe, 
  Menu,
  Save
} from 'lucide-react';
import { InstitutionSettings, ConflictAlert, Language, ActiveTab } from '../../types';
import { translations } from '../../services/i18n';

interface HeaderProps {
  settings: InstitutionSettings;
  conflicts?: ConflictAlert[];
  conflictsCount?: number;
  activeTab?: ActiveTab;
  language: Language;
  onToggleLanguage: () => void;
  onOpenCommandPalette: () => void;
  onOpenPrintAll?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onToggleSidebarMobile?: () => void;
  onSave?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  conflicts = [],
  conflictsCount,
  activeTab = 'dashboard',
  language,
  onToggleLanguage,
  onOpenCommandPalette,
  onOpenPrintAll = () => {},
  onSelectTab = (_tab: ActiveTab) => {},
  onToggleSidebarMobile = () => {},
  onSave
}) => {
  const t = translations[language];
  const numConflicts = conflictsCount !== undefined ? conflictsCount : conflicts.length;
  const hasConflicts = numConflicts > 0;

  const tabLabels: Record<ActiveTab, string> = {
    timetable: t.timetable,
    dashboard: t.dashboard,
    teachers: t.teachers,
    exams: t.exams,
    rooms: t.rooms,
    promotions: t.promotions,
    subjects: t.subjects,
    constraints: t.constraints,
    generator: t.generator,
    verification: t.verification,
    convocations: t.convocations,
    substitutions: t.substitutions,
    attendance: t.attendance,
    utilities: t.utilities,
    settings: t.settings
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 no-print transition-all">
      {/* Left side: Mobile menu toggle + Save button + High-density Breadcrumb Title & Context */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {onSave && (
          <button
            id="header-save-btn"
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md font-semibold text-xs shadow-xs transition active:scale-95 border border-emerald-500/40 shrink-0"
            title="Enregistrer toutes les modifications (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="inline">{language === 'AR' || language === 'ar' ? 'حفظ' : 'Enregistrer'}</span>
          </button>
        )}

        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wide truncate">
            {tabLabels[activeTab] || 'ExamGuard'}
          </h2>
          <div className="hidden sm:block h-4 w-px bg-slate-300 shrink-0" />
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <span>Année Univ: {settings.anneeUniversitaire}</span>
            <span>•</span>
            <span>{settings.semestreActuel}</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">{settings.sessionActuelle}</span>
          </div>
        </div>
      </div>

      {/* Right side: Global actions (Search, Conflicts, Batch Print, Language) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick search shortcut */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors group"
          title="Recherche rapide (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          <span className="hidden lg:inline">{t.search}</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Conflict alert badge */}
        {hasConflicts ? (
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
            title={`${numConflicts} conflits détectés`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{numConflicts} {language === 'AR' || language === 'ar' ? 'تعارض' : 'Conflits'}</span>
          </button>
        ) : (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{language === 'AR' || language === 'ar' ? 'متطابق' : 'Conflits: 0'}</span>
          </div>
        )}

        {/* Batch Print All button */}
        <button
          onClick={onOpenPrintAll}
          className="px-3 sm:px-4 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded hover:bg-blue-800 flex items-center gap-1.5 shadow-xs transition-colors"
          title="Imprimer toutes les convocations en lot"
        >
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Imprimer en masse</span>
        </button>

        {/* Language switch */}
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
          title="Changer de langue (FR / AR)"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="uppercase">{language === 'FR' || language === 'fr' ? 'AR' : 'FR'}</span>
        </button>
      </div>
    </header>
  );
};

