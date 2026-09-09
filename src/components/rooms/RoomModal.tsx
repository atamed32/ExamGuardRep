import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Room, RoomType } from '../../types';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Room) => void;
  initialRoom?: Room | null;
}

const ROOM_TYPES: RoomType[] = ['Amphithéâtre', 'Salle TD', 'Salle TP', 'Laboratoire'];

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRoom
}) => {
  const [nom, setNom] = useState('');
  const [batiment, setBatiment] = useState('');
  const [capacite, setCapacite] = useState(45);
  const [type, setType] = useState<RoomType>('Salle TD');
  const [equipementsStr, setEquipementsStr] = useState('');
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    if (initialRoom) {
      setNom(initialRoom.nom);
      setBatiment(initialRoom.batiment);
      setCapacite(initialRoom.capacite);
      setType(initialRoom.type);
      setEquipementsStr((initialRoom.equipements || []).join(', '));
      setDisponible(initialRoom.disponible);
    } else {
      setNom('');
      setBatiment('Bloc Pédagogique');
      setCapacite(45);
      setType('Salle TD');
      setEquipementsStr('Tableau blanc');
      setDisponible(true);
    }
  }, [initialRoom, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      alert('Veuillez renseigner le nom de la salle ou de l\'amphi.');
      return;
    }

    const equipements = equipementsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newRoom: Room = {
      id: initialRoom ? initialRoom.id : `r-${Date.now()}`,
      nom: nom.trim(),
      batiment: batiment.trim(),
      capacite: Number(capacite) || 45,
      type,
      equipements,
      disponible
    };

    onSave(newRoom);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialRoom ? "Modifier le Local d'Examen" : "Ajouter une Salle / Amphi"}
      subtitle="Gestion de la capacité d'accueil et des équipements"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nom du local (ex: Amphi E, Salle C10) *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Amphi E"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type de local *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {ROOM_TYPES.map(t => (
                <option key={t} value={t} className="text-slate-900">{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Capacité (Places assises) *
            </label>
            <input
              type="number"
              min="5"
              max="1000"
              required
              value={capacite}
              onChange={(e) => setCapacite(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bâtiment / Étage / Localisation
          </label>
          <input
            type="text"
            placeholder="ex: Bâtiment C - 1er Étage"
            value={batiment}
            onChange={(e) => setBatiment(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Équipements disponibles (séparés par des virgules)
          </label>
          <input
            type="text"
            placeholder="ex: Vidéo-projecteur, Micro, Climatisation"
            value={equipementsStr}
            onChange={(e) => setEquipementsStr(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="disponibleCheckbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <label htmlFor="disponibleCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
            Salle disponible pour la programmation des examens
          </label>
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
            {initialRoom ? "Enregistrer" : "Ajouter le local"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
