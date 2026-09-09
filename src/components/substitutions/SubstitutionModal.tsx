import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Substitution, Teacher, Exam, Room } from '../../types';

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (substitution: Substitution) => void;
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teachers,
  exams,
  rooms
}) => {
  const [demandeurId, setDemandeurId] = useState(teachers[0]?.id || '');
  const [remplacantId, setRemplacantId] = useState(teachers[1]?.id || teachers[0]?.id || '');
  const [examId, setExamId] = useState(exams[0]?.id || '');
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [motif, setMotif] = useState('');

  // When exam is chosen, update available rooms for that exam
  const selectedExam = exams.find(e => e.id === examId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demandeurId === remplacantId) {
      alert("L'enseignant demandeur et le remplaçant doivent être deux personnes différentes.");
      return;
    }
    if (!motif.trim()) {
      alert("Veuillez renseigner le motif officiel de la demande de remplacement.");
      return;
    }

    const newSub: Substitution = {
      id: `sub-${Date.now()}`,
      demandeurId,
      remplacantId,
      examId,
      roomId: selectedExam?.salles[0]?.roomId || roomId,
      motif: motif.trim(),
      dateDemande: new Date().toISOString().slice(0, 10),
      statut: 'En attente'
    };

    onSave(newSub);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle Demande de Remplacement / Permutation"
      subtitle="Formulaire officiel d'échange de surveillance d'examen"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Enseignant Demandeur (Empêché) *
          </label>
          <select
            value={demandeurId}
            onChange={(e) => setDemandeurId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.nom} {t.prenom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Enseignant Remplaçant (Volontaire) *
          </label>
          <select
            value={remplacantId}
            onChange={(e) => setRemplacantId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.nom} {t.prenom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Épreuve d'examen concernée *
          </label>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>
                {e.nomModule} ({e.date} de {e.heureDebut} à {e.heureFin} - {e.niveau})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Motif officiel de l'empêchement *
          </label>
          <textarea
            required
            rows={3}
            placeholder="ex: Soutenance de thèse, mission officielle, raison médicale justifiée..."
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
          <p className="font-semibold">Procédure réglementaire :</p>
          <p className="mt-0.5">
            Toute demande doit être validée par le Chef de Département. Dès validation, le planning et les convocations individuelles seront automatiquement mis à jour.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Soumettre la demande
          </button>
        </div>
      </form>
    </Modal>
  );
};
