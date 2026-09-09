import React, { useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Plus, 
  Printer, 
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { 
  Teacher, 
  Exam, 
  Room, 
  ConflictAlert, 
  TeacherLoadStats, 
  InstitutionSettings, 
  ActiveTab, 
  Language 
} from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { calculateTeacherLoads } from '../../services/conflictEngine';

interface DashboardViewProps {
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  conflicts?: ConflictAlert[];
  teacherLoads?: TeacherLoadStats[];
  settings: InstitutionSettings;
  language: Language;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onSelectTeacherConvocation?: (teacherId: string) => void;
  onOpenNewExam?: () => void;
  onAddExam?: () => void;
  onOpenNewTeacher?: () => void;
  onAddTeacher?: () => void;
  onOpenPrintAll?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  teachers = [],
  exams = [],
  rooms = [],
  conflicts = [],
  teacherLoads: propTeacherLoads,
  settings,
  language,
  onSelectTab,
  onNavigate,
  onSelectTeacherConvocation = (_teacherId: string) => {},
  onOpenNewExam,
  onAddExam,
  onOpenNewTeacher,
  onAddTeacher,
  onOpenPrintAll = () => {}
}) => {
  const t = translations[language] || translations.fr;
  const handleTab = onSelectTab || onNavigate || (() => {});
  const handleNewExam = onOpenNewExam || onAddExam || (() => {});
  const handleNewTeacher = onOpenNewTeacher || onAddTeacher || (() => {});

  const teacherLoads = useMemo(() => {
    if (propTeacherLoads && Array.isArray(propTeacherLoads) && propTeacherLoads.length > 0) {
      return propTeacherLoads;
    }
    return calculateTeacherLoads(teachers, exams, conflicts);
  }, [propTeacherLoads, teachers, exams, conflicts]);

  // Calculate total supervised slots
  const totalSlotsCount = exams.reduce((acc, ex) => {
    return acc + (ex.salles || []).reduce((sAcc, s) => sAcc + (s.surveillants || []).length, 0);
  }, 0);

  // Sorted upcoming exams
  const sortedExams = [...exams].sort((a, b) => {
    const dComp = (a.date || '').localeCompare(b.date || '');
    if (dComp !== 0) return dComp;
    return (a.heureDebut || '').localeCompare(b.heureDebut || '');
  });

  const roomMap = new Map((rooms || []).map(r => [r.id, r.nom]));
  const teacherMap = new Map((teachers || []).map(t => [t.id, `${t.nom} ${t.prenom}`]));

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {settings.departement}
            </h2>
            <Badge variant="indigo" size="sm">
              {settings.anneeUniversitaire}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {settings.faculteInstitut} — {settings.universite}
          </p>
        </div>

        {/* Quick Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleNewExam}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Programmer un Examen</span>
          </button>

          <button
            onClick={handleNewTeacher}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Enseignant</span>
          </button>

          <button
            onClick={onOpenPrintAll}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-indigo-700 bg-white border border-slate-300 hover:border-indigo-300 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimer Convocations</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exams KPI */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.totalExams}</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{exams.length}</p>
          <p className="text-xs text-slate-400 mt-1">Session {settings.sessionActuelle}</p>
        </div>

        {/* Teachers KPI */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.totalTeachers}</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{teachers.length}</p>
          <p className="text-xs text-slate-400 mt-1">Disponibles pour surveillance</p>
        </div>

        {/* Supervisions KPI */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.totalSupervisions}</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalSlotsCount}</p>
          <p className="text-xs text-slate-400 mt-1">Affectations de créneaux</p>
        </div>

        {/* Conflicts KPI */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.activeConflicts}</span>
            <div className={`p-2 rounded-lg ${conflicts.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {conflicts.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${conflicts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {conflicts.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {conflicts.length > 0 ? 'À résoudre d\'urgence' : 'Planning vérifié à 100%'}
          </p>
        </div>
      </div>

      {/* Conflict Alerts Section if any exist */}
      {conflicts.length > 0 && (
        <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-rose-800">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Alertes de Conflits Détectés ({conflicts.length})
              </h3>
            </div>
            <button
              onClick={() => handleTab('exams')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
            >
              Modifier dans le Planning <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {conflicts.map(conf => (
              <div
                key={conf.id}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-rose-200/80 text-xs shadow-2xs"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{conf.titre}</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{conf.description}</p>
                </div>
                <Badge variant="error" size="sm">
                  {conf.creneau}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Section: Workload distribution + Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Teacher Workload Balance */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Charge de Surveillance par Enseignant
                </h3>
                <p className="text-xs text-slate-500">Équilibrage des quotas et nombre d'heures</p>
              </div>
              <button
                onClick={() => handleTab('teachers')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Gérer <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {teacherLoads.slice(0, 6).map(load => {
                const target = load.teacher?.quotaSouhaite || 8;
                const percentage = Math.min(100, Math.round((load.nbSurveillances / target) * 100));

                return (
                  <div key={load.teacherId} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectTeacherConvocation(load.teacherId)}
                          className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left"
                        >
                          {load.teacher?.nom} {load.teacher?.prenom}
                        </button>
                        <span className="text-[10px] text-slate-400">({(load.teacher?.grade || '').split('(')[0].trim()})</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-slate-600 font-semibold">{load.nbSurveillances} / {target} séances</span>
                        <span className="text-slate-400">({load.totalHeures}h)</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentage >= 100
                            ? 'bg-emerald-500'
                            : percentage >= 50
                            ? 'bg-indigo-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Quota standard recommandé : 4 créneaux / enseignant</span>
            <button
              onClick={() => handleTab('convocations')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Générer toutes les fiches →
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Exam Sessions */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Planning Global des Épreuves
                </h3>
                <p className="text-xs text-slate-500">Prochaines épreuves programmées</p>
              </div>
              <button
                onClick={() => handleTab('exams')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {sortedExams.slice(0, 5).map(exam => {
                const respName = teacherMap.get(exam.responsableId) || 'Non spécifié';

                return (
                  <div
                    key={exam.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {exam.codeModule}
                          </span>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{exam.nomModule}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Niveau : <span className="font-semibold text-slate-700">{exam.niveau}</span> • Responsable : {respName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant="default" size="sm">
                          {exam.date}
                        </Badge>
                        <p className="text-[11px] font-bold text-slate-700 mt-1">
                          {exam.heureDebut} - {exam.heureFin}
                        </p>
                      </div>
                    </div>

                    {/* Salles badges */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                      <span className="font-medium text-slate-400">Salles :</span>
                      {(exam.salles || []).map(s => (
                        <span key={s.roomId} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                          {roomMap.get(s.roomId) || s.roomId} ({(s.surveillants || []).length} surveillants)
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{exams.length} épreuves au total enregistrées</span>
            <button
              onClick={handleNewExam}
              className="text-indigo-600 font-semibold hover:underline"
            >
              + Ajouter un examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
