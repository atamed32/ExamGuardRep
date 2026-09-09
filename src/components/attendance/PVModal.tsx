import React from 'react';
import { Printer, X, FileCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Exam, Teacher, Room, InstitutionSettings, ExamAttendance } from '../../types';
import { ExportUtils } from '../../services/exportUtils';

interface PVModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  rooms: Room[];
  teachers: Teacher[];
  settings: InstitutionSettings;
  attendances: ExamAttendance[];
}

export const PVModal: React.FC<PVModalProps> = ({
  isOpen,
  onClose,
  exam,
  rooms,
  teachers,
  settings,
  attendances
}) => {
  if (!isOpen) return null;

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const respTeacher = teacherMap.get(exam.responsableId);

  const documentId = `pv-exam-${exam.id}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Procès-Verbal (PV) Officiel de Surveillance"
      subtitle={`Épreuve : ${exam.nomModule} (${exam.date})`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top actions */}
        <div className="flex items-center justify-end gap-2 no-print">
          <button
            onClick={() => ExportUtils.triggerPrint()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Procès-Verbal (A4)</span>
          </button>
        </div>

        {/* Printable Document Paper */}
        <div
          id={documentId}
          className="bg-white p-6 sm:p-8 rounded-xl border border-slate-300 text-slate-900 text-xs official-document-print space-y-5"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-slate-900 keep-together">
            {settings.sloganBase64 && (
              <div className="flex justify-center items-center pb-2 mb-2">
                <img
                  src={settings.sloganBase64}
                  alt="Slogan / Logo de l'Université"
                  className="max-h-16 max-w-[320px] object-contain"
                />
              </div>
            )}
            <p className="font-bold uppercase text-[12px]">{settings.universite} — {settings.faculteInstitut}</p>
            <p className="font-semibold text-[11px]">{settings.departement}</p>
          </div>

          {/* PV Title */}
          <div className="text-center keep-together">
            <h2 className="text-sm font-extrabold uppercase border-2 border-slate-900 inline-block px-6 py-1.5 bg-slate-100 rounded">
              PROCÈS-VERBAL DE SURVEILLANCE DES EXAMENS
            </h2>
            <p className="text-[10px] text-slate-600 mt-1 font-mono">
              Année Universitaire : {settings.anneeUniversitaire} • Semestre : {exam.semestre || settings.semestreActuel} • Session : {exam.session}
            </p>
          </div>

          {/* Exam Details Grid */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg grid grid-cols-2 gap-2 text-xs keep-together">
            <div>
              <span className="text-slate-500 font-medium">Module / Matière : </span>
              <span className="font-bold text-slate-900">{exam.nomModule} ({exam.codeModule})</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Date & Horaires : </span>
              <span className="font-bold text-slate-900">{exam.date} de {exam.heureDebut} à {exam.heureFin}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Niveau & Filière : </span>
              <span className="font-bold text-slate-900">{exam.niveau}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Responsable de Matière : </span>
              <span className="font-bold text-slate-900">
                {respTeacher ? `${respTeacher.nom} ${respTeacher.prenom}` : 'Non spécifié'}
              </span>
            </div>
          </div>

          {/* Surveillants Attendance Table */}
          <div className="keep-together">
            <h4 className="font-bold uppercase text-[11px] mb-2 text-slate-900">
              I. État de Présence & Émargement des Enseignants Surveillants :
            </h4>
            <div className="border border-slate-900 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-900 font-bold text-[11px]">
                    <th className="p-2 border-r border-slate-400">Salle / Amphi</th>
                    <th className="p-2 border-r border-slate-400">Nom & Prénom de l'Enseignant</th>
                    <th className="p-2 border-r border-slate-400">Rôle</th>
                    <th className="p-2 border-r border-slate-400 text-center">Pointage / Statut</th>
                    <th className="p-2 text-center w-32">Émargement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {exam.salles.flatMap((salle) =>
                    salle.surveillants.map((sv, idx) => {
                      const tObj = teacherMap.get(sv.teacherId);
                      const tName = tObj ? `${tObj.nom} ${tObj.prenom}` : sv.teacherId;
                      const roomObj = roomMap.get(salle.roomId);
                      const roomName = roomObj ? roomObj.nom : salle.roomId;

                      const att = attendances.find(
                        a => a.examId === exam.id && a.teacherId === sv.teacherId && a.roomId === salle.roomId
                      );
                      const status = att ? att.status : 'Présent';

                      return (
                        <tr key={`${salle.roomId}-${sv.teacherId}-${idx}`}>
                          <td className="p-2 border-r border-slate-300 font-bold">{roomName}</td>
                          <td className="p-2 border-r border-slate-300 font-semibold">{tName}</td>
                          <td className="p-2 border-r border-slate-300">{sv.role}</td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold">
                            <span className={status === 'Présent' ? 'text-emerald-700' : 'text-rose-700'}>
                              {status}
                            </span>
                          </td>
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                            ....................
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observations & Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-4 keep-together">
            <div className="p-3 border border-slate-300 rounded bg-slate-50 min-h-[90px]">
              <p className="font-bold text-[11px] uppercase mb-1">Observations / Incidents éventuels :</p>
              <p className="text-[10px] text-slate-500 italic">R.A.S — Déroulement normal de l'épreuve.</p>
            </div>

            <div className="text-right p-3 border border-slate-300 rounded bg-slate-50 flex flex-col justify-between">
              <div>
                <p className="font-bold text-[11px] uppercase">Le Responsable de Matière & Surveillant Principal</p>
                <p className="text-[10px] text-slate-500">Signature et visa :</p>
              </div>
              <div className="pt-6 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                Remis au Secrétariat du Département
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
