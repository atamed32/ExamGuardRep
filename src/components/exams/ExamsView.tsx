import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Download, 
  FileText, 
  FileDown, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  ChevronDown, 
  CheckCircle2,
  List,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  DoorClosed
} from 'lucide-react';
import { Exam, Teacher, Room, ConflictAlert, Language, InstitutionSettings } from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ExportUtils } from '../../services/exportUtils';
import { ExamCalendarView } from './ExamCalendarView';

export type ExamSortField = 'date' | 'nomModule' | 'codeModule' | 'niveau';

interface ExamsViewProps {
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  conflicts: ConflictAlert[];
  language: Language;
  settings?: InstitutionSettings;
  onAddExam: (prefillDate?: string) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
  onSelectTeacherConvocation: (teacherId: string) => void;
  onSyncWithSubjects?: () => void;
  onOpenRoomAssignment?: (options?: { examId?: string }) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  teachers,
  rooms,
  conflicts,
  language,
  settings,
  onAddExam,
  onEditExam,
  onDeleteExam,
  onSelectTeacherConvocation,
  onSyncWithSubjects,
  onOpenRoomAssignment
}) => {
  const t = translations[language];
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('ALL');
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showPDFDropdown, setShowPDFDropdown] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<ExamSortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPDFDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique dates and promotions for filters
  const uniqueDates = Array.from(new Set(exams.map(e => e.date))).sort();
  const uniquePromotions = Array.from(new Set(exams.map(e => e.niveau).filter(Boolean))).sort();

  // Filtered & Sorted exams
  const filteredExams = useMemo(() => {
    const list = exams.filter(exam => {
      const matchesSearch =
        exam.nomModule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.codeModule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.niveau.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSession = selectedSession === 'ALL' || exam.session === selectedSession;
      const matchesDate = selectedDate === 'ALL' || exam.date === selectedDate;
      const matchesPromotion = selectedPromotion === 'ALL' || exam.niveau === selectedPromotion;

      return matchesSearch && matchesSession && matchesDate && matchesPromotion;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': {
          const d = a.date.localeCompare(b.date);
          if (d !== 0) comparison = d;
          else comparison = a.heureDebut.localeCompare(b.heureDebut);
          break;
        }
        case 'nomModule':
          comparison = a.nomModule.localeCompare(b.nomModule, 'fr', { sensitivity: 'base' });
          break;
        case 'codeModule':
          comparison = a.codeModule.localeCompare(b.codeModule, 'fr', { sensitivity: 'base' });
          break;
        case 'niveau':
          comparison = a.niveau.localeCompare(b.niveau, 'fr', { sensitivity: 'base' });
          break;
        default:
          comparison = a.date.localeCompare(b.date);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [exams, searchQuery, selectedSession, selectedDate, selectedPromotion, sortField, sortDirection]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedSession !== 'ALL' || selectedDate !== 'ALL' || selectedPromotion !== 'ALL';

  const handleExportPDF = (exportAll = false) => {
    setIsExportingPDF(true);
    setShowPDFDropdown(false);

    try {
      const targetExams = exportAll ? exams : filteredExams;
      const count = targetExams.length;
      
      let customTitle = 'CALENDRIER GÉNÉRAL & PLANNING DES EXAMENS';
      if (!exportAll && selectedSession !== 'ALL') {
        customTitle = `PLANNING DES EXAMENS — SESSION ${selectedSession.toUpperCase()}`;
      } else if (!exportAll && selectedDate !== 'ALL') {
        customTitle = `PLANNING DES EXAMENS DU ${selectedDate}`;
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const filename = exportAll || !hasActiveFilters
        ? `Planning_Complet_Examens_${fileDate}.pdf`
        : `Planning_Examens_Filtre_${fileDate}.pdf`;

      ExportUtils.exportExamsSchedulePDF(targetExams, teachers, rooms, settings, {
        title: customTitle,
        sessionFilter: selectedSession,
        dateFilter: selectedDate,
        filename
      });

      setExportSuccessMessage(`Document PDF téléchargé avec succès (${count} épreuves) !`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Erreur lors de la génération du PDF des examens', err);
      alert('Une erreur est survenue lors de la création du document PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Success Notification Banner */}
      {exportSuccessMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Planning des Examens & Sessions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {exams.length} épreuves d'examens programmées
            {hasActiveFilters && ` • ${filteredExams.length} affichée(s) selon vos filtres`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: List vs Calendar */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Afficher en vue liste détaillée"
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Afficher en calendrier par jour (grille)"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendrier</span>
            </button>
          </div>

          {/* PDF Export Button with Dropdown Options */}
          <div className="relative" ref={dropdownRef}>
            <div className="inline-flex rounded-lg shadow-2xs">
              <button
                onClick={() => handleExportPDF(false)}
                disabled={isExportingPDF || exams.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-l-lg transition-colors"
                title="Générer et télécharger le calendrier officiel en PDF A4 Paysage"
              >
                {isExportingPDF ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 text-indigo-100" />
                )}
                <span>{isExportingPDF ? 'Génération...' : 'Exporter en PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPDFDropdown(prev => !prev)}
                disabled={isExportingPDF || exams.length === 0}
                className="px-2 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 border-l border-indigo-500 rounded-r-lg transition-colors"
                title="Options d'exportation PDF"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showPDFDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Options d'exportation PDF
                </div>

                <button
                  onClick={() => handleExportPDF(false)}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-semibold block">
                        {hasActiveFilters ? 'Planning filtré actuel' : 'Calendrier complet'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {filteredExams.length} épreuve(s) sélectionnée(s)
                      </span>
                    </div>
                  </div>
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={() => handleExportPDF(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 flex items-center justify-between transition-colors border-t border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-600" />
                      <div>
                        <span className="font-semibold block">Calendrier complet (Tous)</span>
                        <span className="text-[10px] text-slate-500">
                          Toutes les {exams.length} épreuves du système
                        </span>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={() => ExportUtils.exportExamsCSV(hasActiveFilters ? filteredExams : exams, teachers, rooms)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Exporter le planning en CSV (Excel)"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>

          {/* Sync with Subjects Button */}
          {onSyncWithSubjects && (
            <button
              onClick={onSyncWithSubjects}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 shadow-2xs"
              title="Synchroniser et réajuster les épreuves selon les modules et promotions cochés"
            >
              <RefreshCw className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Synchroniser avec matières</span>
            </button>
          )}

          {onOpenRoomAssignment && (
            <button
              onClick={() => onOpenRoomAssignment()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
              title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
            >
              <DoorClosed className="w-4 h-4" />
              <span>Attribuer une salle</span>
            </button>
          )}

          {/* Add Exam Button */}
          <button
            onClick={onAddExam}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Programmer un Examen</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with A-Z Sorting */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher module, code, niveau..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="ALL">Toutes les sessions</option>
            <option value="Ordinaire">Session Ordinaire</option>
            <option value="Rattrapage">Session Rattrapage</option>
          </select>
        </div>

        <div className="sm:w-56">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="ALL">Toutes les dates</option>
            {uniqueDates.map(d => (
              <option key={d} value={d}>
                Date : {d}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-56">
          <select
            value={selectedPromotion}
            onChange={(e) => setSelectedPromotion(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="ALL">Toutes les promotions</option>
            {uniquePromotions.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Quick A-Z / Z-A Sorting Button */}
        <button
          type="button"
          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border border-slate-200 shadow-2xs transition shrink-0"
          title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
        >
          <ArrowUpDown className="w-4 h-4 text-indigo-600" />
          <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
        </button>

        {/* Sort criteria */}
        <div className="sm:w-48">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as ExamSortField)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            title="Critère de tri"
          >
            <option value="date">Trier : Date & Heure</option>
            <option value="nomModule">Trier : Nom du Module</option>
            <option value="codeModule">Trier : Code du Module</option>
            <option value="niveau">Trier : Promotion / Niveau</option>
          </select>
        </div>
      </div>

      {/* View Content: Calendar Grid vs List Cards */}
      {viewMode === 'calendar' ? (
        <ExamCalendarView
          exams={filteredExams}
          teachers={teachers}
          rooms={rooms}
          conflicts={conflicts}
          language={language}
          onAddExam={onAddExam}
          onEditExam={onEditExam}
          onDeleteExam={(examId) => {
            const exam = exams.find(e => e.id === examId);
            if (exam) setExamToDelete(exam);
            else onDeleteExam(examId);
          }}
          onSelectTeacherConvocation={onSelectTeacherConvocation}
        />
      ) : (
        /* Exam Cards Grid / List */
        <div className="space-y-3">
          {filteredExams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
              Aucun examen ne correspond à votre filtre.
            </div>
          ) : (
            filteredExams.map((exam) => {
              const resp = teacherMap.get(exam.responsableId);
              const respName = resp ? `${resp.nom} ${resp.prenom}` : 'Non défini';
              
              // Check if this exam has conflicts
              const examConflicts = conflicts.filter(c => c.examIds.includes(exam.id));
              const hasConflict = examConflicts.length > 0;

              const totalSurveillants = exam.salles.reduce((acc, s) => acc + s.surveillants.length, 0);

              return (
                <div
                  key={exam.id}
                  className={`bg-white rounded-xl border p-5 shadow-2xs transition-all hover:border-slate-300 ${
                    hasConflict ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                  }`}
                >
                  {/* Header row: Module code, title, Date & Time, Actions */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 mt-0.5">
                        {exam.codeModule}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900">{exam.nomModule}</h3>
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

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 justify-end">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{exam.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 justify-end mt-0.5 font-mono font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{exam.heureDebut} - {exam.heureFin}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
                        {onOpenRoomAssignment && (
                          <button
                            onClick={() => onOpenRoomAssignment({ examId: exam.id })}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1"
                            title="Attribuer une ou des salles à cet examen et ses promotions"
                          >
                            <DoorClosed className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Salles</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEditExam(exam)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Modifier l'examen et les affectations"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExamToDelete(exam)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Supprimer l'examen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Conflict Banner for this exam if any */}
                  {hasConflict && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">
                        {examConflicts.map(c => c.titre).join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* Salles & Surveillants detailed distribution */}
                  <div className="mt-3 pt-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Locaux d'examen & Équipe de surveillance ({totalSurveillants} surveillants) :
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {exam.salles.map((salleAssign) => {
                        const roomObj = roomMap.get(salleAssign.roomId);
                        const roomName = roomObj ? roomObj.nom : salleAssign.roomId;
                        const roomCapacity = roomObj ? `${roomObj.capacite} places` : '';

                        return (
                          <div
                            key={salleAssign.roomId}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                {roomName}
                              </span>
                              <span className="text-[10px] font-normal text-slate-500">{roomCapacity}</span>
                            </div>

                            <div className="space-y-1 pt-0.5">
                              {salleAssign.surveillants.length === 0 ? (
                                <p className="text-[11px] text-amber-600 italic">Aucun surveillant</p>
                              ) : (
                                salleAssign.surveillants.map((sv, idx) => {
                                  const teacherObj = teacherMap.get(sv.teacherId);
                                  const tName = teacherObj ? `${teacherObj.nom} ${teacherObj.prenom}` : sv.teacherId;
                                  const isResp = sv.role === 'Responsable de Matière';

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-[11px] py-0.5"
                                    >
                                      <button
                                        onClick={() => onSelectTeacherConvocation(sv.teacherId)}
                                        className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors text-left truncate max-w-[140px]"
                                        title="Voir convocation de l'enseignant"
                                      >
                                        {tName}
                                      </button>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                          isResp
                                            ? 'bg-amber-100 text-amber-800'
                                            : sv.role === 'Surveillant Principal'
                                            ? 'bg-indigo-100 text-indigo-800 font-semibold'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
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
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setExamToDelete(null)}
          onConfirm={() => {
            onDeleteExam(examToDelete.id);
            setExamToDelete(null);
          }}
          title="Supprimer l'Épreuve d'Examen"
          message={`Êtes-vous sûr de vouloir supprimer l'épreuve "${examToDelete.nomModule}" programmée le ${examToDelete.date} ? Toutes les affectations de surveillants correspondantes seront libérées.`}
          confirmLabel="Supprimer définitivement"
          isDestructive={true}
        />
      )}
    </div>
  );
};
