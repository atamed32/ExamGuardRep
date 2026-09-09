import React, { useState } from 'react';
import { 
  CheckSquare, 
  BookOpen, 
  Building2, 
  User, 
  Clock, 
  FileCheck, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { 
  Exam, 
  Teacher, 
  Room, 
  ExamAttendance, 
  AttendanceStatus, 
  InstitutionSettings, 
  Language 
} from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { PVModal } from './PVModal';

interface AttendanceViewProps {
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  settings: InstitutionSettings;
  attendances: ExamAttendance[];
  onUpdateAttendance: (records: ExamAttendance[]) => void;
  language: Language;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  exams,
  teachers,
  rooms,
  settings,
  attendances,
  onUpdateAttendance,
  language
}) => {
  const t = translations[language];
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [isPVModalOpen, setIsPVModalOpen] = useState(false);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

  const currentExam = exams.find(e => e.id === selectedExamId) || exams[0];

  const handleStatusChange = (
    examId: string,
    roomId: string,
    teacherId: string,
    newStatus: AttendanceStatus
  ) => {
    const existingIndex = attendances.findIndex(
      a => a.examId === examId && a.roomId === roomId && a.teacherId === teacherId
    );

    const updated = [...attendances];
    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: newStatus
      };
    } else {
      updated.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        examId,
        roomId,
        teacherId,
        status: newStatus
      });
    }

    onUpdateAttendance(updated);
  };

  const getAttendanceStatus = (examId: string, roomId: string, teacherId: string): AttendanceStatus => {
    const record = attendances.find(
      a => a.examId === examId && a.roomId === roomId && a.teacherId === teacherId
    );
    return record ? record.status : 'Présent';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            Pointage & Déroulement des Épreuves
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des présences, retards et absences des surveillants en temps réel
          </p>
        </div>

        {currentExam && (
          <button
            onClick={() => setIsPVModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Générer PV de Surveillance</span>
          </button>
        )}
      </div>

      {/* Exam Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Sélectionner l'épreuve d'examen :
        </label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.date} ({ex.heureDebut}-{ex.heureFin}) — {ex.nomModule} [{ex.codeModule}] • {ex.niveau}
            </option>
          ))}
        </select>
      </div>

      {/* Current Exam Supervision Sheet */}
      {currentExam ? (
        <div className="space-y-4">
          {currentExam.salles.map((salleAssign) => {
            const roomObj = roomMap.get(salleAssign.roomId);
            const roomName = roomObj ? roomObj.nom : salleAssign.roomId;

            return (
              <div
                key={salleAssign.roomId}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Room Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">{roomName}</h3>
                    <Badge variant="outline" size="sm">
                      {roomObj?.type} • {roomObj?.capacite} places
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {salleAssign.surveillants.length} surveillants affectés
                  </span>
                </div>

                {/* Surveillants list */}
                <div className="divide-y divide-slate-100">
                  {salleAssign.surveillants.map((sv, idx) => {
                    const teacher = teacherMap.get(sv.teacherId);
                    const currentStatus = getAttendanceStatus(
                      currentExam.id,
                      salleAssign.roomId,
                      sv.teacherId
                    );

                    const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
                      { value: 'Présent', label: 'Présent', color: 'bg-emerald-600 text-white' },
                      { value: 'En retard', label: 'En retard', color: 'bg-amber-500 text-white' },
                      { value: 'Remplacé', label: 'Remplacé', color: 'bg-indigo-600 text-white' },
                      { value: 'Absent non justifié', label: 'Absent', color: 'bg-rose-600 text-white' }
                    ];

                    return (
                      <div
                        key={idx}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">
                              {teacher ? `${teacher.nom} ${teacher.prenom}` : sv.teacherId}
                            </span>
                            <Badge
                              variant={sv.role === 'Surveillant Principal' ? 'indigo' : 'default'}
                              size="sm"
                            >
                              {sv.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {teacher?.grade} • {teacher?.specialite}
                          </p>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {statusOptions.map((opt) => {
                            const isSelected = currentStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() =>
                                  handleStatusChange(
                                    currentExam.id,
                                    salleAssign.roomId,
                                    sv.teacherId,
                                    opt.value
                                  )
                                }
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                  isSelected
                                    ? opt.color + ' shadow-2xs font-bold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          Aucun examen disponible pour le pointage.
        </div>
      )}

      {/* Procès-Verbal Printable Modal */}
      {currentExam && isPVModalOpen && (
        <PVModal
          isOpen={isPVModalOpen}
          onClose={() => setIsPVModalOpen(false)}
          exam={currentExam}
          rooms={rooms}
          teachers={teachers}
          settings={settings}
          attendances={attendances}
        />
      )}
    </div>
  );
};
