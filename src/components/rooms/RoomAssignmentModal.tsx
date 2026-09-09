import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  DoorClosed, 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  CheckCircle2, 
  Check
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { 
  Exam, 
  Room, 
  PromotionGroup, 
  Teacher, 
  SubjectModule 
} from '../../types';
import { StorageService } from '../../services/storage';

interface RoomAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  promotions: PromotionGroup[];
  exams: Exam[];
  subjects?: SubjectModule[];
  teachers?: Teacher[];
  onSave?: (updatedExams: Exam[]) => void;
  onSaveAssignments?: (updatedExams: Exam[]) => void;
  initialExamId?: string;
  initialRoomId?: string;
  initialPromotionName?: string;
  initialPromoName?: string;
  initialDate?: string;
  initialSubjectCode?: string;
  initialSubjectNom?: string;
  initialPromoNames?: string[];
  onOpenRoomModal?: () => void;
}

export const RoomAssignmentModal: React.FC<RoomAssignmentModalProps> = ({
  isOpen,
  onClose,
  rooms = [],
  promotions = [],
  exams = [],
  onSave,
  onSaveAssignments,
  initialRoomId,
  initialPromotionName,
  initialPromoName
}) => {
  // Le choix de la promotion
  const [selectedPromoNom, setSelectedPromoNom] = useState<string>(
    initialPromotionName || initialPromoName || (promotions[0]?.nom || '')
  );

  // Le choix de la salle
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    initialRoomId || (rooms[0]?.id || '')
  );

  useEffect(() => {
    if (initialPromotionName || initialPromoName) {
      setSelectedPromoNom(initialPromotionName || initialPromoName || '');
    } else if (promotions.length > 0 && !selectedPromoNom) {
      setSelectedPromoNom(promotions[0].nom);
    }
  }, [initialPromotionName, initialPromoName, promotions]);

  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
    } else if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [initialRoomId, rooms]);

  // Informations promotion & salle sélectionnées
  const selectedPromo = useMemo(() => {
    return promotions.find(p => p.nom.trim().toLowerCase() === selectedPromoNom.trim().toLowerCase());
  }, [promotions, selectedPromoNom]);

  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const promoEffectif = selectedPromo?.effectif || 0;
  const roomCapacity = selectedRoom?.capaciteExamen || selectedRoom?.capacite || 0;
  const isCapacitySufficient = roomCapacity >= promoEffectif;
  const capacityDiff = Math.abs(roomCapacity - promoEffectif);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPromoNom) {
      alert('Veuillez choisir une promotion.');
      return;
    }
    if (!selectedRoomId) {
      alert('Veuillez choisir une salle.');
      return;
    }

    const saveCallback = onSave || onSaveAssignments;
    if (!saveCallback) {
      onClose();
      return;
    }

    // 1. Mettre à jour les examens existants pour cette promotion
    const updatedExams = [...exams];
    const targetPromoNorm = selectedPromoNom.trim().toLowerCase();
    let affectedCount = 0;

    for (let i = 0; i < updatedExams.length; i++) {
      const e = updatedExams[i];
      const ePromo = (e.niveau || e.promotion || '').trim().toLowerCase();
      if (ePromo === targetPromoNorm) {
        // Conserver les surveillants existants s'il y en a
        const existingSurveillants = e.salles?.[0]?.surveillants || [];
        updatedExams[i] = {
          ...e,
          salles: [
            {
              roomId: selectedRoomId,
              surveillants: existingSurveillants
            }
          ]
        };
        affectedCount++;
      }
    }

    // 2. Si la promotion n'a pas encore d'examen, créer une entrée d'épreuve pour qu'elle apparaisse dans le planning
    if (affectedCount === 0) {
      const defaultDate = exams.find(ex => ex.date)?.date || new Date().toISOString().split('T')[0];
      const newExam: Exam = {
        id: `ex-assign-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        codeModule: selectedPromo?.code || 'MOD',
        nomModule: `Épreuve ${selectedPromoNom}`,
        niveau: selectedPromoNom,
        promotion: selectedPromoNom,
        date: defaultDate,
        heureDebut: '08:30',
        heureFin: '10:00',
        semestre: 'S1',
        session: 'Ordinaire',
        salles: [
          {
            roomId: selectedRoomId,
            surveillants: []
          }
        ],
        nbEtudiants: promoEffectif,
        departement: selectedPromo?.departement || 'Département de rattachement'
      };
      updatedExams.push(newExam);
    }

    // 3. Mémoriser la salle par défaut sur la promotion
    try {
      const updatedPromotions = promotions.map(p => {
        if (p.nom.trim().toLowerCase() === targetPromoNorm) {
          return { ...p, salleParDefaut: selectedRoomId };
        }
        return p;
      });
      StorageService.savePromotions(updatedPromotions);
    } catch (err) {
      console.warn('Erreur sauvegarde promotion:', err);
    }

    saveCallback(updatedExams);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attribuer une salle"
      subtitle="Affectation d'une salle d'examen à une promotion"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. Choix de la promotion */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Promotion :</span>
          </label>
          <select
            id="room-assign-promo-select"
            value={selectedPromoNom}
            onChange={(e) => setSelectedPromoNom(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            required
          >
            {promotions.length === 0 && (
              <option value="">Aucune promotion disponible</option>
            )}
            {promotions.map((promo) => (
              <option key={promo.id || promo.nom} value={promo.nom}>
                {promo.nom} ({promo.effectif} étudiants)
              </option>
            ))}
          </select>
        </div>

        {/* 2. Choix de la salle */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
            <DoorClosed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Salle d'examen :</span>
          </label>
          <select
            id="room-assign-room-select"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            required
          >
            {rooms.length === 0 && (
              <option value="">Aucune salle disponible</option>
            )}
            {rooms.map((room) => {
              const cap = room.capaciteExamen || room.capacite || 50;
              return (
                <option key={room.id} value={room.id}>
                  {room.nom} — Capacité : {cap} places ({room.type || 'Salle'}{room.batiment ? ` - ${room.batiment}` : ''})
                </option>
              );
            })}
          </select>
        </div>

        {/* Indicateur de capacité et effectif */}
        {selectedPromo && selectedRoom && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
            isCapacitySufficient 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="shrink-0 mt-0.5">
              {isCapacitySufficient ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-bold flex items-center gap-2">
                <span>{selectedPromo.nom}</span>
                <span>➜</span>
                <span>{selectedRoom.nom}</span>
              </div>
              <p className="text-[11px] opacity-90">
                Effectif : <strong>{promoEffectif}</strong> étudiants • Capacité : <strong>{roomCapacity}</strong> places
              </p>
              {isCapacitySufficient ? (
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Capacité suffisante (+{capacityDiff} places de marge)
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  Attention : Capacité insuffisante (déficit de {capacityDiff} places)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!selectedPromoNom || !selectedRoomId}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Attribuer la salle</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
