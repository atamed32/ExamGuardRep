import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Building2, 
  User, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Layers,
  Sparkles,
  CalendarDays,
  ArrowRight,
  Info
} from 'lucide-react';
import { Exam, Teacher, Room, ConflictAlert, Language } from '../../types';
import { Badge } from '../common/Badge';

interface ExamCalendarViewProps {
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  conflicts: ConflictAlert[];
  language: Language;
  onAddExam: (prefillDate?: string) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
  onSelectTeacherConvocation: (teacherId: string) => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_NAMES_AR = [
  'جانفي (يناير)', 'فيفري (فبراير)', 'مارس', 'أفريل (أبريل)', 'ماي', 'جوان (يونيو)',
  'جويلية (يوليو)', 'أوت (أغسطس)', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const DAYS_OF_WEEK_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_OF_WEEK_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

export const ExamCalendarView: React.FC<ExamCalendarViewProps> = ({
  exams,
  teachers,
  rooms,
  conflicts,
  language,
  onAddExam,
  onEditExam,
  onDeleteExam,
  onSelectTeacherConvocation
}) => {
  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);

  // Determine initial month from earliest exam or today
  const initialDate = useMemo(() => {
    if (exams.length > 0) {
      const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = new Date(sorted[0].date);
      if (!isNaN(firstDate.getTime())) {
        return { year: firstDate.getFullYear(), month: firstDate.getMonth() };
      }
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [exams]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.month); // 0-indexed

  // List of distinct months where exams exist for quick jump
  const examMonths = useMemo(() => {
    const set = new Set<string>();
    exams.forEach(e => {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().map(ym => {
      const [yStr, mStr] = ym.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const count = exams.filter(e => e.date.startsWith(ym)).length;
      return { year: y, month: m, label: `${MONTH_NAMES_FR[m]} ${y}`, count };
    });
  }, [exams]);

  // Selected date for day inspector (default to today or first exam date in this month)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(() => {
    if (exams.length > 0) {
      return exams[0].date;
    }
    return new Date().toISOString().slice(0, 10);
  });

  // Group filtered exams by date string 'YYYY-MM-DD'
  const examsByDate = useMemo(() => {
    const map = new Map<string, Exam[]>();
    exams.forEach(exam => {
      const list = map.get(exam.date) || [];
      list.push(exam);
      map.set(exam.date, list);
    });
    // Sort exams within each day by start time
    map.forEach((list) => {
      list.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    });
    return map;
  }, [exams]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDayDate(today.toISOString().slice(0, 10));
  };

  // Calendar cells calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // In JS, getDay() returns 0 for Sunday. We want Monday to be 0 ... Sunday = 6.
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
      exams: Exam[];
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Pad previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = (days.length) % 7;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6, // Friday, Saturday, Sunday
        exams: examsByDate.get(dateStr) || []
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = (days.length) % 7;
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6,
        exams: examsByDate.get(dateStr) || []
      });
    }

    // Next month filler days to complete 5 or 6 rows (multiple of 7, at least 35)
    const remainingDays = (7 - (days.length % 7)) % 7;
    const targetLength = days.length + remainingDays < 35 ? days.length + remainingDays + 7 : days.length + remainingDays;
    const daysToAdd = targetLength - days.length;

    for (let day = 1; day <= daysToAdd; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = (days.length) % 7;
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6,
        exams: examsByDate.get(dateStr) || []
      });
    }

    return days;
  }, [currentYear, currentMonth, examsByDate]);

  // Exams for the currently selected day
  const selectedDayExams = useMemo(() => {
    if (!selectedDayDate) return [];
    return examsByDate.get(selectedDayDate) || [];
  }, [selectedDayDate, examsByDate]);

  // Stats for the currently displayed month
  const currentMonthExamCount = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return exams.filter(e => e.date.startsWith(prefix)).length;
  }, [currentYear, currentMonth, exams]);

  const monthName = language === 'AR' ? MONTH_NAMES_AR[currentMonth] : MONTH_NAMES_FR[currentMonth];
  const daysOfWeek = language === 'AR' ? DAYS_OF_WEEK_AR : DAYS_OF_WEEK_FR;

  return (
    <div className="space-y-6">
      {/* Calendar Navigation & Month Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Month & Year Title + Navigation Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors shadow-2xs"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors shadow-2xs"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600 shrink-0" />
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {monthName} {currentYear}
              </h3>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {currentMonthExamCount} épreuve{currentMonthExamCount > 1 ? 's' : ''} ce mois
              </span>
            </div>
          </div>

          {/* Quick jump to months with scheduled exams & Legend */}
          <div className="flex flex-wrap items-center gap-3">
            {examMonths.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium hidden sm:inline">Périodes d'examens :</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {examMonths.map(em => (
                    <button
                      key={`${em.year}-${em.month}`}
                      onClick={() => {
                        setCurrentYear(em.year);
                        setCurrentMonth(em.month);
                        const match = exams.find(e => e.date.startsWith(`${em.year}-${String(em.month + 1).padStart(2, '0')}`));
                        if (match) setSelectedDayDate(match.date);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        em.year === currentYear && em.month === currentMonth
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {em.label} ({em.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>Ordinaire</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Rattrapage</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Conflit</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
          {daysOfWeek.map((day, idx) => {
            const isWeekend = idx === 4 || idx === 5 || idx === 6;
            return (
              <div 
                key={day} 
                className={`py-2.5 text-xs font-bold uppercase tracking-wider ${
                  isWeekend ? 'text-slate-400 bg-slate-100/50' : 'text-slate-700'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* 7-Column Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-100">
          {calendarDays.map((cell) => {
            const isSelected = selectedDayDate === cell.dateStr;
            const hasExams = cell.exams.length > 0;

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDayDate(cell.dateStr)}
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors relative group cursor-pointer ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/70 text-slate-400'
                    : isSelected
                    ? 'bg-indigo-50/70 ring-2 ring-indigo-500 ring-inset z-10'
                    : cell.isToday
                    ? 'bg-amber-50/40 text-slate-800'
                    : cell.isWeekend
                    ? 'bg-slate-50/40 text-slate-700'
                    : 'bg-white text-slate-800 hover:bg-slate-50/90'
                }`}
              >
                {/* Cell Header: Day Number + Exam Count + Quick Add Button */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : isSelected
                          ? 'bg-indigo-700 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasExams && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                        {cell.exams.length}
                      </span>
                    )}
                  </div>

                  {/* Quick Add Exam on this Day */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddExam(cell.dateStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/80 rounded transition-opacity"
                    title={`Programmer un examen le ${cell.dateStr}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Exams List in Day Cell */}
                <div className="space-y-1 overflow-hidden flex-1">
                  {cell.exams.slice(0, 3).map((exam) => {
                    const isRattrapage = exam.session === 'Rattrapage';
                    const examConflicts = conflicts.filter(c => c.examIds.includes(exam.id));
                    const hasConflict = examConflicts.length > 0;
                    const firstRoom = exam.salles[0] ? roomMap.get(exam.salles[0].roomId)?.nom || exam.salles[0].roomId : '';

                    return (
                      <div
                        key={exam.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayDate(cell.dateStr);
                        }}
                        className={`px-1.5 py-1 rounded text-[11px] font-medium border leading-tight transition-all truncate group/item ${
                          hasConflict
                            ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100 ring-1 ring-rose-300'
                            : isRattrapage
                            ? 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
                            : 'bg-indigo-50/90 border-indigo-200/80 text-indigo-950 hover:bg-indigo-100'
                        }`}
                        title={`${exam.heureDebut}-${exam.heureFin} : ${exam.codeModule} - ${exam.nomModule}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-[10px] shrink-0 text-slate-700">
                            {exam.heureDebut}
                          </span>
                          {hasConflict && (
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          )}
                        </div>

                        <div className="truncate font-semibold text-slate-900">
                          {exam.codeModule} • {exam.nomModule}
                        </div>

                        {firstRoom && (
                          <div className="text-[9.5px] text-slate-500 truncate flex items-center gap-0.5">
                            <span>{firstRoom}</span>
                            {exam.salles.length > 1 && (
                              <span className="text-slate-400">+{exam.salles.length - 1}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {cell.exams.length > 3 && (
                    <div className="text-[10px] text-indigo-700 font-bold text-center py-0.5 bg-indigo-50/50 rounded border border-indigo-100/50">
                      +{cell.exams.length - 3} autre{cell.exams.length - 3 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Subtle indicator bar for selected state */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-b" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector Panel */}
      {selectedDayDate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Détail de la journée : <span className="text-indigo-600">{selectedDayDate}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDayExams.length === 0 
                  ? "Aucune épreuve d'examen programmée à cette date."
                  : `${selectedDayExams.length} épreuve(s) d'examen programmée(s) pour cette journée.`
                }
              </p>
            </div>

            <button
              onClick={() => onAddExam(selectedDayDate)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Programmer une épreuve le {selectedDayDate}</span>
            </button>
          </div>

          {selectedDayExams.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>Journée libre sans examens programmés.</p>
              <button
                onClick={() => onAddExam(selectedDayDate)}
                className="mt-2 text-indigo-600 font-semibold hover:underline"
              >
                + Ajouter un premier examen sur cette date
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {selectedDayExams.map((exam) => {
                const resp = teacherMap.get(exam.responsableId);
                const respName = resp ? `${resp.nom} ${resp.prenom}` : 'Non assigné';
                const examConflicts = conflicts.filter(c => c.examIds.includes(exam.id));
                const hasConflict = examConflicts.length > 0;
                const totalSurveillants = exam.salles.reduce((acc, s) => acc + s.surveillants.length, 0);

                return (
                  <div key={exam.id} className="py-4 first:pt-3 last:pb-1 space-y-3">
                    {/* Top line of exam */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-center shrink-0">
                          <div className="text-[10px] uppercase font-bold text-indigo-500">Horaire</div>
                          <div className="text-xs font-mono font-bold text-indigo-900">{exam.heureDebut}</div>
                          <div className="text-[10px] font-mono text-slate-400">{exam.heureFin}</div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {exam.codeModule}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{exam.nomModule}</h4>
                            <Badge variant={exam.session === 'Rattrapage' ? 'warning' : 'indigo'} size="sm">
                              {exam.session}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {exam.semestre}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Niveau : <span className="font-semibold text-slate-700">{exam.niveau}</span> • Responsable : <span className="font-semibold text-slate-800">{respName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end md:self-start">
                        <button
                          onClick={() => onEditExam(exam)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => onDeleteExam(exam.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                          title="Supprimer l'épreuve"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Conflict notification if applicable */}
                    {hasConflict && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">{examConflicts.map(c => c.titre).join(' • ')}</span>
                      </div>
                    )}

                    {/* Rooms & Invigilators breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {exam.salles.map((salleAssign) => {
                        const roomObj = roomMap.get(salleAssign.roomId);
                        const roomName = roomObj ? roomObj.nom : salleAssign.roomId;

                        return (
                          <div
                            key={salleAssign.roomId}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                {roomName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {salleAssign.surveillants.length} surveillant(s)
                              </span>
                            </div>

                            <div className="space-y-1 pt-0.5">
                              {salleAssign.surveillants.length === 0 ? (
                                <p className="text-[10px] text-amber-600 italic">Aucun surveillant assigné</p>
                              ) : (
                                salleAssign.surveillants.map((sv, idx) => {
                                  const tObj = teacherMap.get(sv.teacherId);
                                  const tName = tObj ? `${tObj.nom} ${tObj.prenom}` : sv.teacherId;

                                  return (
                                    <div key={idx} className="flex items-center justify-between text-[11px]">
                                      <button
                                        onClick={() => onSelectTeacherConvocation(sv.teacherId)}
                                        className="font-medium text-slate-800 hover:text-indigo-600 truncate max-w-[130px]"
                                        title="Voir convocation"
                                      >
                                        {tName}
                                      </button>
                                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded ${
                                        sv.role === 'Surveillant Principal'
                                          ? 'bg-indigo-100 text-indigo-800 font-semibold'
                                          : sv.role === 'Responsable de Matière'
                                          ? 'bg-amber-100 text-amber-800 font-semibold'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}>
                                        {sv.role === 'Surveillant Principal' ? 'Principal' : sv.role === 'Responsable de Matière' ? 'Resp.' : 'Adjoint'}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
