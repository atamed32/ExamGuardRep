import React, { useState, useEffect } from 'react';
import { Search, User, BookOpen, MapPin, FileText, Settings, ShieldAlert, ArrowRight, X, Building2, Repeat, CheckSquare, Wrench, Palette, Moon, Sun, Landmark, Monitor } from 'lucide-react';
import { Teacher, Exam, Room, ActiveTab, ThemeMode } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  onSelectTeacher?: (teacherId: string) => void;
  onSelectTeacherConvocation?: (teacherId: string) => void;
  onSelectExam?: (exam: Exam) => void;
  onSelectRoom?: (room: Room) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onSelectThemeMode?: (mode: ThemeMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  teachers,
  exams,
  rooms,
  onSelectTeacher,
  onSelectTeacherConvocation,
  onSelectExam,
  onSelectRoom,
  onNavigate,
  onSelectTab,
  onSelectThemeMode
}) => {
  const [query, setQuery] = useState('');

  const handleTeacherClick = onSelectTeacher || onSelectTeacherConvocation;
  const handleTabClick = onNavigate || onSelectTab;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Filtered teachers
  const filteredTeachers = (teachers || []).filter(t => 
    (t.nom || '').toLowerCase().includes(cleanQuery) || 
    (t.prenom || '').toLowerCase().includes(cleanQuery) ||
    (t.specialite || '').toLowerCase().includes(cleanQuery) ||
    (t.grade || '').toLowerCase().includes(cleanQuery)
  ).slice(0, 4);

  // Filtered exams
  const filteredExams = (exams || []).filter(e => 
    (e.nomModule || '').toLowerCase().includes(cleanQuery) || 
    (e.codeModule || '').toLowerCase().includes(cleanQuery) ||
    (e.niveau || '').toLowerCase().includes(cleanQuery)
  ).slice(0, 4);

  // Filtered rooms
  const filteredRooms = (rooms || []).filter(r => 
    (r.nom || '').toLowerCase().includes(cleanQuery) || 
    (r.type || '').toLowerCase().includes(cleanQuery) ||
    (r.batiment || '').toLowerCase().includes(cleanQuery)
  ).slice(0, 3);

  // Quick navigation items
  const allNavItems: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'dashboard', label: 'Tableau de bord & Statistiques', icon: <ShieldAlert className="w-4 h-4 text-indigo-500" /> },
    { tab: 'teachers', label: 'Gestion des Enseignants & Quotas', icon: <User className="w-4 h-4 text-sky-500" /> },
    { tab: 'exams', label: 'Planning des Examens & Sessions', icon: <BookOpen className="w-4 h-4 text-amber-500" /> },
    { tab: 'rooms', label: 'Occupation & Grille des Salles', icon: <Building2 className="w-4 h-4 text-emerald-500" /> },
    { tab: 'convocations', label: 'Convocations Individuelles Officielles', icon: <FileText className="w-4 h-4 text-purple-500" /> },
    { tab: 'substitutions', label: 'Remplacements & Permutations', icon: <Repeat className="w-4 h-4 text-orange-500" /> },
    { tab: 'attendance', label: 'Pointage & PV de Surveillance', icon: <CheckSquare className="w-4 h-4 text-teal-500" /> },
    { tab: 'utilities', label: 'Utilitaires & Sauvegardes', icon: <Wrench className="w-4 h-4 text-blue-500" /> },
    { tab: 'settings', label: 'Paramètres & En-tête de l\'établissement', icon: <Settings className="w-4 h-4 text-slate-500" /> }
  ];

  const navItems = allNavItems.filter(item => item.label.toLowerCase().includes(cleanQuery));

  const themeCommands: { mode: ThemeMode; label: string; icon: React.ReactNode; keywords: string }[] = [
    { mode: 'dark', label: 'Basculer sur le Thème Sombre', icon: <Moon className="w-4 h-4 text-purple-400" />, keywords: 'theme sombre dark noir nuit palette' },
    { mode: 'light', label: 'Basculer sur le Thème Clair', icon: <Sun className="w-4 h-4 text-amber-400" />, keywords: 'theme clair light blanc jour palette' },
  ];

  const filteredThemes = onSelectThemeMode
    ? themeCommands.filter(t => t.label.toLowerCase().includes(cleanQuery) || t.keywords.includes(cleanQuery))
    : [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in-0 zoom-in-95">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Rechercher un enseignant, un examen, une salle ou une vue..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Teachers */}
          {filteredTeachers.length > 0 && (
            <div className="py-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Enseignants & Convocations</p>
              {filteredTeachers.map(teacher => (
                <button
                  key={teacher.id}
                  onClick={() => {
                    if (handleTeacherClick) handleTeacherClick(teacher.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-900 dark:hover:text-indigo-200 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-900 dark:group-hover:text-indigo-300">
                        {teacher.nom} {teacher.prenom}
                      </p>
                      <p className="text-xs text-slate-500">{teacher.grade} • {teacher.specialite}</p>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    Convocation <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Exams */}
          {filteredExams.length > 0 && (
            <div className="py-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Examens & Modules</p>
              {filteredExams.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => {
                    if (onSelectExam) onSelectExam(exam);
                    else if (handleTabClick) handleTabClick('exams');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-900 dark:group-hover:text-amber-300">
                        {exam.nomModule} <span className="text-xs font-normal text-slate-400">({exam.codeModule})</span>
                      </p>
                      <p className="text-xs text-slate-500">{exam.date} • {exam.heureDebut}-{exam.heureFin} • {exam.niveau}</p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    Gérer <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Rooms */}
          {filteredRooms.length > 0 && (
            <div className="py-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Salles & Amphis</p>
              {filteredRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    if (onSelectRoom) onSelectRoom(room);
                    else if (handleTabClick) handleTabClick('rooms');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-300">
                        {room.nom} ({room.capacite} places)
                      </p>
                      <p className="text-xs text-slate-500">{room.type} • {room.batiment}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    Voir <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {navItems.length > 0 && (
            <div className="py-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vues de l'Application</p>
              {navItems.map(item => (
                <button
                  key={item.tab}
                  onClick={() => {
                    if (handleTabClick) handleTabClick(item.tab);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 group transition-colors"
                >
                  {item.icon}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Theme Commands */}
          {filteredThemes.length > 0 && (
            <div className="py-2">
              <p className="px-3 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Thèmes d'affichage</span>
              </p>
              {filteredThemes.map(tc => (
                <button
                  key={tc.mode}
                  onClick={() => {
                    onSelectThemeMode?.(tc.mode);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {tc.icon}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-purple-900 dark:group-hover:text-purple-300">{tc.label}</span>
                  </div>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    Appliquer <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredTeachers.length === 0 && filteredExams.length === 0 && filteredRooms.length === 0 && navItems.length === 0 && filteredThemes.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              Aucun résultat correspondant à "{query}"
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Navigation rapide ExamGuard</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono">ESC</kbd> pour fermer</span>
        </div>
      </div>
    </div>
  );
};
