import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Building2, 
  FileText, 
  Repeat, 
  CheckSquare, 
  Wrench, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { ActiveTab, Language, ConflictAlert } from '../../types';
import { translations } from '../../services/i18n';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  language: Language;
  conflicts?: ConflictAlert[];
  conflictsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  teachersCount?: number;
  examsCount?: number;
  substitutionsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  language,
  conflicts = [],
  conflictsCount,
  isMobileOpen = false,
  onCloseMobile = () => {},
  teachersCount,
  examsCount,
  substitutionsCount
}) => {
  const t = translations[language];
  const numConflicts = conflictsCount !== undefined ? conflictsCount : conflicts.length;

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeVariant?: 'default' | 'error' | 'warning' | 'indigo';
    group: 'main' | 'operations' | 'admin';
  }

  const navItems: NavItem[] = [
    // Main Group (Principal)
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      badge: numConflicts > 0 ? numConflicts : undefined,
      badgeVariant: 'error',
      group: 'main'
    },
    {
      id: 'teachers',
      label: t.teachers,
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: teachersCount,
      group: 'main'
    },
    {
      id: 'exams',
      label: t.exams,
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      badge: examsCount,
      group: 'main'
    },
    {
      id: 'rooms',
      label: t.rooms,
      icon: <Building2 className="w-4 h-4 shrink-0" />,
      group: 'main'
    },
    // Operations Group (Administration)
    {
      id: 'convocations',
      label: t.convocations,
      icon: <FileText className="w-4 h-4 shrink-0" />,
      group: 'operations'
    },
    {
      id: 'substitutions',
      label: t.substitutions,
      icon: <Repeat className="w-4 h-4 shrink-0" />,
      badge: substitutionsCount && substitutionsCount > 0 ? substitutionsCount : undefined,
      badgeVariant: 'warning',
      group: 'operations'
    },
    {
      id: 'attendance',
      label: t.attendance,
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      group: 'operations'
    },
    // Admin & Utilities Group (Système)
    {
      id: 'utilities',
      label: t.utilities,
      icon: <Wrench className="w-4 h-4 shrink-0" />,
      group: 'admin'
    },
    {
      id: 'settings',
      label: t.settings,
      icon: <Settings className="w-4 h-4 shrink-0" />,
      group: 'admin'
    }
  ];

  const groupLabels: Record<string, string> = {
    main: language === 'AR' || language === 'ar' ? 'الرئيسي' : 'Principal',
    operations: language === 'AR' || language === 'ar' ? 'الإدارة والتتبع' : 'Administration',
    admin: language === 'AR' || language === 'ar' ? 'النظام' : 'Système'
  };

  const renderNavList = () => {
    const groups: ('main' | 'operations' | 'admin')[] = ['main', 'operations', 'admin'];

    return (
      <div className="space-y-4">
        {groups.map(grp => {
          const itemsInGrp = navItems.filter(i => i.group === grp);
          return (
            <div key={grp} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-4 mb-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {groupLabels[grp]}
                </div>
              )}
              {itemsInGrp.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center px-4 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate text-left">{item.label}</span>
                      )}
                    </div>
                    {!isCollapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeVariant === 'error'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : item.badgeVariant === 'warning'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-base shadow-xs shrink-0">
            E
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-bold text-white text-base tracking-tight leading-none block">
                ExamGuard
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mt-0.5">
                Surveillance Univ
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle button for desktop */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {renderNavList()}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 text-center uppercase tracking-widest font-medium shrink-0">
        {!isCollapsed ? (
          <span>ExamGuard v1.2.0-LTS</span>
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" title="ExamGuard Online" />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 h-screen sticky top-0 no-print z-20 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs lg:hidden no-print"
          onClick={onCloseMobile}
        >
          <div
            className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

