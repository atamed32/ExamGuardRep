import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit3, 
  Trash2, 
  Download, 
  Phone, 
  Mail, 
  AlertTriangle,
  BookOpen,
  Eye,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Teacher, TeacherLoadStats, Exam, GradeType, Language, Subject } from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ExportUtils } from '../../services/exportUtils';
import { ConflictEngine } from '../../services/conflictEngine';
import { formatGrade } from '../../utils/gradeUtils';

export type TeacherSortField = 'nom' | 'prenom' | 'grade' | 'specialite' | 'surveillances';

interface TeachersViewProps {
  teachers: Teacher[];
  exams?: Exam[];
  subjects?: Subject[];
  teacherLoads?: TeacherLoadStats[];
  language: Language;
  onAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSelectTeacherConvocation?: (teacherId: string) => void;
  onSelectConvocation?: (teacherId: string) => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  exams = [],
  subjects = [],
  teacherLoads,
  language,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onSelectTeacherConvocation,
  onSelectConvocation
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<TeacherSortField>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSelectConv = onSelectConvocation || onSelectTeacherConvocation || (() => {});

  const calculatedLoads = useMemo(() => {
    if (teacherLoads) return teacherLoads;
    return ConflictEngine.calculateTeacherLoads(teachers, exams, [], subjects);
  }, [teacherLoads, teachers, exams, subjects]);

  const loadMap = new Map<string, TeacherLoadStats>(calculatedLoads.map(l => [l.teacherId, l]));

  // Filtering & Sorting
  const filteredTeachers = useMemo(() => {
    const list = teachers.filter(teacher => {
      const matchesSearch = 
        teacher.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.specialite.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const teacherGradeAbbr = formatGrade(teacher.grade);
      const matchesGrade = selectedGrade === 'ALL' || teacherGradeAbbr === selectedGrade || teacher.grade === selectedGrade;

      return matchesSearch && matchesGrade;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nom':
          comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
          break;
        case 'prenom':
          comparison = a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' });
          break;
        case 'grade':
          comparison = formatGrade(a.grade).localeCompare(formatGrade(b.grade), 'fr', { sensitivity: 'base' });
          break;
        case 'specialite':
          comparison = (a.specialite || '').localeCompare(b.specialite || '', 'fr', { sensitivity: 'base' });
          break;
        case 'surveillances': {
          const loadA = loadMap.get(a.id)?.nbSurveillances || 0;
          const loadB = loadMap.get(b.id)?.nbSurveillances || 0;
          comparison = loadA - loadB;
          break;
        }
        default:
          comparison = a.nom.localeCompare(b.nom);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [teachers, searchQuery, selectedGrade, sortField, sortDirection, loadMap]);

  const handleSort = (field: TeacherSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate totals
  const totalAssignedSlots = calculatedLoads.reduce((sum, l) => sum + l.nbSurveillances, 0);
  const totalHours = calculatedLoads.reduce((sum, l) => sum + l.totalHeures, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Corps Enseignant & Surveillance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {teachers.length} enseignants enregistrés • {totalAssignedSlots} créneaux surveillés ({totalHours.toFixed(1)}h)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ExportUtils.exportTeachersCSV(teachers)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Exporter la liste en CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={onAddTeacher}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Enseignant</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with A-Z Sorting */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, spécialité, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="ALL">Tous les grades</option>
            <option value="Pr.">Pr.</option>
            <option value="MCA">MCA</option>
            <option value="MCB">MCB</option>
            <option value="MAA">MAA</option>
            <option value="MAB">MAB</option>
            <option value="Doctorant">Doctorant / Vacataire</option>
          </select>
        </div>

        {/* Quick A-Z / Z-A Sorting Button */}
        <button
          type="button"
          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border border-slate-200 shadow-2xs transition"
          title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
        >
          <ArrowUpDown className="w-4 h-4 text-indigo-600" />
          <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
        </button>

        {/* Sort criteria */}
        <div className="sm:w-48">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as TeacherSortField)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            title="Critère de tri"
          >
            <option value="nom">Trier par : Nom</option>
            <option value="prenom">Trier par : Prénom</option>
            <option value="grade">Trier par : Grade</option>
            <option value="specialite">Trier par : Spécialité</option>
            <option value="surveillances">Trier par : Surveillances</option>
          </select>
        </div>
      </div>

      {/* Teachers Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th 
                  onClick={() => handleSort('nom')}
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Enseignant (Nom / Prénom)</span>
                    {sortField === 'nom' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grade')}
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Grade & Spécialité</span>
                    {sortField === 'grade' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('surveillances')}
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Charge de Surveillance</span>
                    {sortField === 'surveillances' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Responsabilités</th>
                <th className="py-3.5 px-4 text-center">Fiche Officielle</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                    Aucun enseignant trouvé correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const load = loadMap.get(teacher.id);
                  const nbSurv = load?.nbSurveillances || 0;
                  const totalHrs = load?.totalHeures || 0;
                  const target = teacher.quotaSouhaite || 8;
                  const percentage = Math.min(100, Math.round((nbSurv / target) * 100));
                  const hasConflict = load?.hasConflicts || false;

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Teacher Identity */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {teacher.nom} {teacher.prenom}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          {teacher.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {teacher.email}
                            </span>
                          )}
                          {teacher.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {teacher.telephone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Grade & Speciality */}
                      <td className="py-3.5 px-4">
                        <Badge variant="indigo" size="sm">
                          {formatGrade(teacher.grade)}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">{teacher.specialite || teacher.departement}</p>
                      </td>

                      {/* Workload Progress */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">
                            {nbSurv} / {target} créneaux
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {totalHrs}h
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              hasConflict
                                ? 'bg-rose-500'
                                : percentage >= 100
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        {hasConflict && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Conflit d'horaire !</span>
                          </div>
                        )}
                      </td>

                      {/* Module Responsibilities */}
                      <td className="py-3.5 px-4">
                        {load && load.modulesResponsable.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {load.modulesResponsable.map((mod, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                              >
                                <BookOpen className="w-3 h-3 text-amber-600" />
                                {mod}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Aucun module</span>
                        )}
                      </td>

                      {/* View Convocation Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleSelectConv(teacher.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                          title="Ouvrir la convocation individuelle officielle"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Convocation</span>
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditTeacher(teacher)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Modifier l'enseignant"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTeacherToDelete(teacher)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Supprimer l'enseignant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setTeacherToDelete(null)}
          onConfirm={() => {
            onDeleteTeacher(teacherToDelete.id);
            setTeacherToDelete(null);
          }}
          title="Supprimer l'Enseignant"
          message={`Êtes-vous sûr de vouloir supprimer l'enseignant "${teacherToDelete.nom} ${teacherToDelete.prenom}" ? Toutes ses affectations de surveillance devront être réassignées.`}
          confirmLabel="Supprimer définitivement"
          isDestructive={true}
        />
      )}
    </div>
  );
};
