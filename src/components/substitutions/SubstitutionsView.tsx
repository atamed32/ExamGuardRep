import React, { useState } from 'react';
import { 
  Repeat, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  User, 
  BookOpen, 
  Printer, 
  Calendar,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { Substitution, Teacher, Exam, Room, Language } from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ExportUtils } from '../../services/exportUtils';

interface SubstitutionsViewProps {
  substitutions: Substitution[];
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  language: Language;
  onAddSubstitution: () => void;
  onApproveSubstitution: (substitutionId: string) => void;
  onRejectSubstitution: (substitutionId: string) => void;
  onDeleteSubstitution: (substitutionId: string) => void;
}

export const SubstitutionsView: React.FC<SubstitutionsViewProps> = ({
  substitutions,
  teachers,
  exams,
  rooms,
  language,
  onAddSubstitution,
  onApproveSubstitution,
  onRejectSubstitution,
  onDeleteSubstitution
}) => {
  const t = translations[language];
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const examMap = new Map<string, Exam>(exams.map(e => [e.id, e]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

  const [selectedSubForPrint, setSelectedSubForPrint] = useState<Substitution | null>(null);

  const pendingCount = substitutions.filter(s => s.statut === 'En attente').length;
  const approvedCount = substitutions.filter(s => s.statut === 'Validé par Chef Dept').length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600" />
            Remplacements & Permutations de Surveillance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {substitutions.length} demandes au total • {pendingCount} en attente de validation par le Chef de Département
          </p>
        </div>

        <button
          onClick={onAddSubstitution}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Demande de Remplacement</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {substitutions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
            Aucune demande de remplacement pour le moment.
          </div>
        ) : (
          substitutions.map((sub) => {
            const demandeur = teacherMap.get(sub.demandeurId);
            const remplacant = teacherMap.get(sub.remplacantId);
            const exam = examMap.get(sub.examId);
            const room = roomMap.get(sub.roomId);

            const isPending = sub.statut === 'En attente';
            const isApproved = sub.statut === 'Validé par Chef Dept';

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Header: Status and Date */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isApproved ? 'success' : isPending ? 'warning' : 'error'}
                      size="sm"
                    >
                      {sub.statut}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Demandé le : <span className="font-mono text-slate-600 font-semibold">{sub.dateDemande}</span>
                    </span>
                  </div>

                  {sub.validePar && (
                    <span className="text-xs text-emerald-700 font-medium">
                      Validé par : {sub.validePar} ({sub.dateValidation})
                    </span>
                  )}
                </div>

                {/* Teachers exchange comparison */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Demandeur */}
                  <div className="md:col-span-5 p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block">
                      Enseignant Demandeur (Empêché)
                    </span>
                    <p className="font-bold text-slate-900 text-sm">
                      {demandeur ? `${demandeur.nom} ${demandeur.prenom}` : sub.demandeurId}
                    </p>
                    <p className="text-slate-500">{demandeur?.grade}</p>
                  </div>

                  {/* Arrow icon */}
                  <div className="md:col-span-2 text-center flex justify-center">
                    <div className="p-2 rounded-full bg-slate-100 text-slate-600">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Remplaçant */}
                  <div className="md:col-span-5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                      Enseignant Remplaçant (Volontaire)
                    </span>
                    <p className="font-bold text-slate-900 text-sm">
                      {remplacant ? `${remplacant.nom} ${remplacant.prenom}` : sub.remplacantId}
                    </p>
                    <p className="text-slate-500">{remplacant?.grade}</p>
                  </div>
                </div>

                {/* Exam Details & Reason */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Épreuve : {exam ? exam.nomModule : 'Module'}
                    </span>
                    {exam && (
                      <span className="text-slate-600 font-mono text-[11px]">
                        {exam.date} • {exam.heureDebut} - {exam.heureFin}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 pt-1">
                    <span className="font-semibold text-slate-700">Motif justifié : </span>
                    {sub.motif}
                  </p>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    {isApproved ? 'Affectation mise à jour dans le planning' : 'En attente de signature'}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => onRejectSubstitution(sub.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => onApproveSubstitution(sub.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valider & Permuter dans le Planning</span>
                        </button>
                      </>
                    )}
                    {isApproved && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Validé & Actif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
