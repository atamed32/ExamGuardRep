import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Teacher, GradeType } from '../../types';
import { GRADE_OPTIONS, formatGrade } from '../../utils/gradeUtils';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  initialTeacher?: Teacher | null;
  defaultDepartment: string;
}

const GRADES = GRADE_OPTIONS;

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTeacher,
  defaultDepartment
}) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [grade, setGrade] = useState<GradeType>('MAA');
  const [titre, setTitre] = useState('');
  const [departement, setDepartement] = useState(defaultDepartment);
  const [specialite, setSpecialite] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [quotaSouhaite, setQuotaSouhaite] = useState(8);
  const [notes, setNotes] = useState('');
  const [actif, setActif] = useState(true);

  useEffect(() => {
    if (initialTeacher) {
      setNom(initialTeacher.nom);
      setPrenom(initialTeacher.prenom);
      setGrade(formatGrade(initialTeacher.grade) as GradeType);
      setTitre(initialTeacher.titre || '');
      setDepartement(initialTeacher.departement || defaultDepartment);
      setSpecialite(initialTeacher.specialite || '');
      setEmail(initialTeacher.email || '');
      setTelephone(initialTeacher.telephone || '');
      setQuotaSouhaite(initialTeacher.quotaSouhaite || 8);
      setNotes(initialTeacher.notes || '');
      setActif(initialTeacher.actif !== false);
    } else {
      setNom('');
      setPrenom('');
      setGrade('MAA');
      setTitre('');
      setDepartement(defaultDepartment);
      setSpecialite('');
      setEmail('');
      setTelephone('');
      setQuotaSouhaite(8);
      setNotes('');
      setActif(true);
    }
  }, [initialTeacher, defaultDepartment, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim()) {
      alert('Veuillez renseigner le nom et le prénom de l\'enseignant.');
      return;
    }

    const newTeacher: Teacher = {
      id: initialTeacher ? initialTeacher.id : `t-${Date.now()}`,
      nom: nom.toUpperCase().trim(),
      prenom: prenom.trim(),
      grade,
      titre: titre.trim(),
      departement: departement.trim(),
      specialite: specialite.trim(),
      email: email.trim(),
      telephone: telephone.trim(),
      quotaSouhaite: Number(quotaSouhaite) || 8,
      notes: notes.trim(),
      actif
    };

    onSave(newTeacher);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTeacher ? "Modifier l'Enseignant" : "Ajouter un Nouvel Enseignant"}
      subtitle="Gestion des informations administratives et du quota de surveillance"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nom de famille *
            </label>
            <input
              type="text"
              required
              placeholder="ex: BENAMARA"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Prénom *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Mohamed"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Grade académique *
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as GradeType)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {GRADES.map((g) => (
                <option key={g} value={g} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Titre
            </label>
            <input
              type="text"
              placeholder="ex: Mr., Mme., Mlle."
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Département de rattachement
            </label>
            <input
              type="text"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Spécialité / Filière
            </label>
            <input
              type="text"
              placeholder="ex: Génie Mécanique / Énergétique"
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quota de surveillance cible (Séances)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={quotaSouhaite}
              onChange={(e) => setQuotaSouhaite(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Numéro de Téléphone
            </label>
            <input
              type="tel"
              placeholder="0550..."
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            E-mail professionnel
          </label>
          <input
            type="email"
            placeholder="enseignant@univ.dz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes & Responsabilités administratives
          </label>
          <textarea
            rows={2}
            placeholder="Responsable de filière, coordinateur pédagogique, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="actifCheckbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <label htmlFor="actifCheckbox" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Enseignant actif pour la session d'examens en cours
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            {initialTeacher ? "Enregistrer les modifications" : "Ajouter l'enseignant"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
