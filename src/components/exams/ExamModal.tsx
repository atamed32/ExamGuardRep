import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle, Building2, UserPlus, UserCheck, BookOpen, Clock, Sparkles, Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { 
  Exam, 
  Teacher, 
  Room, 
  SemesterType, 
  SessionType, 
  RoleInExam, 
  RoomAssignment,
  SubjectModule,
  PromotionGroup
} from '../../types';
import { doTimesOverlap } from '../../services/conflictEngine';
import { Translations } from '../../services/i18n';
import { formatGrade, formatSemester, SEMESTER_OPTIONS } from '../../utils/gradeUtils';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: Exam) => void;
  initialExam?: Partial<Exam> | Exam | null;
  teachers: Teacher[];
  rooms: Room[];
  existingExams?: Exam[];
  allExams?: Exam[];
  subjects?: SubjectModule[];
  promotions?: PromotionGroup[];
  defaultDepartment?: string;
  defaultSemester?: SemesterType;
  defaultSession?: SessionType;
  t?: Translations;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExam,
  teachers = [],
  rooms = [],
  existingExams,
  allExams,
  subjects = [],
  promotions = [],
  defaultDepartment = 'Département de Technologie',
  defaultSemester = 'S1',
  defaultSession = 'Ordinaire',
  t
}) => {
  const safeExams = existingExams || allExams || [];
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [codeModule, setCodeModule] = useState('');
  const [nomModule, setNomModule] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [isRespAlsoSurveillant, setIsRespAlsoSurveillant] = useState(false);
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('08:30');
  const [heureFin, setHeureFin] = useState('10:00');
  const [semestre, setSemestre] = useState<SemesterType>(defaultSemester);
  const [session, setSession] = useState<SessionType>(defaultSession);
  const [niveau, setNiveau] = useState('');
  const [departement, setDepartement] = useState(defaultDepartment);
  const [notes, setNotes] = useState('');
  const [salles, setSalles] = useState<RoomAssignment[]>([]);

  // Alphabetically sorted collections for dropdowns
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => 
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    );
  }, [teachers]);

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort((a, b) => 
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    );
  }, [promotions]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => 
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    );
  }, [rooms]);

  // Determine whether this is edit mode or add mode
  const isEditMode = Boolean(initialExam && 'id' in initialExam && initialExam.id);
  const isSubjectSelected = Boolean(selectedSubjectId);
  // All fields can now be freely edited by the user in both edit mode and add mode
  const areFixedFieldsDisabled = false;

  useEffect(() => {
    if (!isOpen) return;

    if (initialExam && 'id' in initialExam && initialExam.id) {
      // Edit mode: find if matching subject exists in catalog
      const matchedSub = subjects.find(s => 
        (s.code || s.codeModule || '').toUpperCase().trim() === (initialExam.codeModule || '').toUpperCase().trim() &&
        (!initialExam.niveau || (s.promotion || '').trim().toLowerCase() === (initialExam.niveau || '').trim().toLowerCase())
      ) || subjects.find(s => 
        (s.code || s.codeModule || '').toUpperCase().trim() === (initialExam.codeModule || '').toUpperCase().trim()
      );
      setSelectedSubjectId(matchedSub ? matchedSub.id : '');

      setCodeModule(initialExam.codeModule || '');
      setNomModule(initialExam.nomModule || '');
      const resp = initialExam.responsableId || '';
      setResponsableId(resp);
      setDate(initialExam.date || new Date().toISOString().slice(0, 10));
      setHeureDebut(initialExam.heureDebut || '08:30');
      setHeureFin(initialExam.heureFin || '10:00');
      setSemestre((initialExam.semestre as SemesterType) || defaultSemester);
      setSession(initialExam.session || defaultSession);
      setNiveau(initialExam.niveau || (sortedPromotions[0]?.nom || '1ère Année ST (1ST)'));
      setDepartement(initialExam.departement || defaultDepartment);
      setNotes(initialExam.notes || '');
      const loadedSalles: RoomAssignment[] = JSON.parse(JSON.stringify(initialExam.salles || []));
      setSalles(loadedSalles);
      const isRespSurv = Boolean(resp && loadedSalles.some(s => s.surveillants?.some(sv => sv.teacherId === resp)));
      setIsRespAlsoSurveillant(isRespSurv);
    } else {
      // Add mode
      setDate(initialExam?.date || new Date().toISOString().slice(0, 10));
      setHeureDebut(initialExam?.heureDebut || '08:30');
      setHeureFin(initialExam?.heureFin || '10:00');
      setSession(initialExam?.session || defaultSession);
      setDepartement(initialExam?.departement || defaultDepartment);
      setNotes(initialExam?.notes || '');

      // Check if initialExam was passed with prefill subject/module code
      if (initialExam?.codeModule) {
        const matchingSub = subjects.find(s => 
          (s.code || s.codeModule || '').toUpperCase().trim() === (initialExam.codeModule || '').toUpperCase().trim()
        );
        if (matchingSub) {
          setSelectedSubjectId(matchingSub.id);
          setCodeModule(matchingSub.code || matchingSub.codeModule || '');
          setNomModule(matchingSub.nom || matchingSub.nomModule || '');
          const subResp = matchingSub.enseignantResponsableId || matchingSub.responsableId || '';
          setResponsableId(subResp);
          if (matchingSub.promotion) setNiveau(matchingSub.promotion);
          if (matchingSub.departement) setDepartement(matchingSub.departement);
          if (matchingSub.semestre) {
            const sem = (matchingSub.semestre === 'S1' || matchingSub.semestre === 'Semestre 1 (S1)') ? 'Semestre 1 (S1)' : 'Semestre 2 (S2)';
            setSemestre(sem as SemesterType);
          }
        } else {
          setSelectedSubjectId('');
          setCodeModule(initialExam.codeModule || '');
          setNomModule(initialExam.nomModule || '');
          setResponsableId(initialExam.responsableId || sortedTeachers[0]?.id || '');
          setSemestre((initialExam.semestre as SemesterType) || defaultSemester);
          setNiveau(initialExam.niveau || (sortedPromotions[0]?.nom || '1ère Année ST (1ST)'));
        }
      } else {
        setSelectedSubjectId('');
        setCodeModule('');
        setNomModule('');
        setResponsableId(sortedTeachers[0]?.id || '');
        setSemestre(defaultSemester);
        setNiveau(sortedPromotions[0]?.nom || '1ère Année ST (1ST)');
      }

      // Rooms and supervisors defaults
      if (initialExam?.salles && initialExam.salles.length > 0) {
        const loadedSalles: RoomAssignment[] = JSON.parse(JSON.stringify(initialExam.salles));
        setSalles(loadedSalles);
        const currentResp = initialExam?.responsableId || sortedTeachers[0]?.id || '';
        const isRespSurv = Boolean(currentResp && loadedSalles.some(s => s.surveillants?.some(sv => sv.teacherId === currentResp)));
        setIsRespAlsoSurveillant(isRespSurv);
      } else if (sortedRooms.length > 0) {
        setSalles([
          {
            roomId: sortedRooms[0].id,
            surveillants: []
          }
        ]);
        setIsRespAlsoSurveillant(false);
      } else {
        setSalles([]);
        setIsRespAlsoSurveillant(false);
      }
    }
  }, [initialExam, sortedTeachers, sortedRooms, sortedPromotions, defaultDepartment, defaultSemester, defaultSession, isOpen, subjects]);

  // Duration calculation
  const getCalculatedDuration = () => {
    if (!heureDebut || !heureFin) return '';
    const [h1, m1] = heureDebut.split(':').map(Number);
    const [h2, m2] = heureFin.split(':').map(Number);
    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMinutes <= 0) return 'Invalide';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}min` : ''}`.trim() || '0min';
  };

  // Handle selecting a subject from the catalog
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (!subjectId) return;

    const sub = subjects.find(s => s.id === subjectId);
    if (sub) {
      const subNom = sub.nom || sub.nomModule || '';
      const subCode = sub.code || sub.codeModule || '';
      const subResp = sub.enseignantResponsableId || sub.responsableId || '';

      setCodeModule(subCode);
      setNomModule(subNom);
      if (subResp) {
        handleResponsableChange(subResp);
      }
      if (sub.promotion) setNiveau(sub.promotion);
      if (sub.departement) setDepartement(sub.departement);
      if (sub.semestre) {
        const sem = (sub.semestre === 'S1' || sub.semestre === 'Semestre 1 (S1)') ? 'Semestre 1 (S1)' : 'Semestre 2 (S2)';
        setSemestre(sem as SemesterType);
      }

      // Compute end time based on duration (minutes)
      const duration = sub.dureeMinutes || 90;
      if (heureDebut) {
        const [h, m] = heureDebut.split(':').map(Number);
        const totalMinutes = h * 60 + m + duration;
        const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const endM = String(totalMinutes % 60).padStart(2, '0');
        setHeureFin(`${endH}:${endM}`);
      }
    }
  };

  // Toggle whether the responsible teacher is also an exam supervisor
  const handleToggleRespAlsoSurveillant = (checked: boolean) => {
    setIsRespAlsoSurveillant(checked);
    if (checked && responsableId) {
      setSalles(prevSalles => {
        let updated = [...prevSalles];
        if (updated.length === 0 && sortedRooms.length > 0) {
          updated = [{ roomId: sortedRooms[0].id, surveillants: [] }];
        }
        if (updated.length > 0) {
          const alreadyInRoom0 = updated[0].surveillants.some(s => s.teacherId === responsableId);
          if (!alreadyInRoom0) {
            updated[0] = {
              ...updated[0],
              surveillants: [
                { teacherId: responsableId, role: 'Surveillant Principal' },
                ...updated[0].surveillants
              ]
            };
          }
        }
        return updated;
      });
    } else if (!checked && responsableId) {
      setSalles(prevSalles =>
        prevSalles.map(s => ({
          ...s,
          surveillants: s.surveillants.filter(sv => sv.teacherId !== responsableId)
        }))
      );
    }
  };

  // When changing the responsible teacher
  const handleResponsableChange = (newRespId: string) => {
    const oldRespId = responsableId;
    setResponsableId(newRespId);
    if (isRespAlsoSurveillant && newRespId) {
      setSalles(prevSalles => {
        let updated = [...prevSalles];
        if (updated.length === 0 && sortedRooms.length > 0) {
          updated = [{ roomId: sortedRooms[0].id, surveillants: [{ teacherId: newRespId, role: 'Surveillant Principal' }] }];
          return updated;
        }
        return updated.map((s, idx) => {
          if (idx === 0 && !s.surveillants.some(sv => sv.teacherId === oldRespId || sv.teacherId === newRespId)) {
            return {
              ...s,
              surveillants: [{ teacherId: newRespId, role: 'Surveillant Principal' }, ...s.surveillants]
            };
          }
          return {
            ...s,
            surveillants: s.surveillants.map(sv =>
              sv.teacherId === oldRespId ? { ...sv, teacherId: newRespId } : sv
            )
          };
        });
      });
    }
  };

  // Live Conflict Checking helper for this form
  const getLiveConflicts = () => {
    const warnings: string[] = [];
    if (!date || !heureDebut || !heureFin || !safeExams) return warnings;

    const currentExamId = (initialExam && 'id' in initialExam && initialExam.id != null) ? String(initialExam.id) : null;
    const otherExams = safeExams.filter(e => !currentExamId || String(e.id) !== currentExamId);

    // 0. Check Promotion Overlap (Double booking students)
    if (niveau) {
      const promoNorm = niveau.trim().toLowerCase();
      otherExams.forEach(other => {
        if (other.date === date && (other.niveau || '').trim().toLowerCase() === promoNorm) {
          if (doTimesOverlap(heureDebut, heureFin, other.heureDebut, other.heureFin)) {
            warnings.push(`Interdit : La promotion "${niveau}" a déjà l'épreuve "${other.nomModule}" programmée à ce créneau (${other.heureDebut}-${other.heureFin}).`);
          }
        }
      });
    }

    // 1. Check assigned rooms capacity and multi-promotion sharing
    salles.forEach(sa => {
      const roomObj = rooms.find(r => r.id === sa.roomId);
      const roomName = roomObj ? roomObj.nom : 'Salle';
      const roomCap = roomObj?.capaciteExamen || roomObj?.capacite || 50;
      const currentPromoEff = promotions.find(p => p.nom.toLowerCase().trim() === (niveau || '').toLowerCase().trim())?.effectif || (initialExam as Exam)?.nbEtudiants || 45;

      let combinedStudentsInRoom = currentPromoEff;
      const otherPromosInRoom: string[] = [];

      otherExams.forEach(other => {
        if (other.date === date && doTimesOverlap(heureDebut, heureFin, other.heureDebut, other.heureFin)) {
          if (other.salles && other.salles.some(s => s.roomId === sa.roomId)) {
            const otherEff = other.nbEtudiants || 45;
            combinedStudentsInRoom += otherEff;
            otherPromosInRoom.push(`${other.niveau} (${otherEff} étud.)`);
          }
        }
      });

      if (otherPromosInRoom.length > 0) {
        if (combinedStudentsInRoom > roomCap) {
          warnings.push(`⚠️ Capacité Dépassée : La salle "${roomName}" (max: ${roomCap} places) accueille simultanément "${niveau}" et ${otherPromosInRoom.join(', ')} pour un total de ${combinedStudentsInRoom} étudiants (+${combinedStudentsInRoom - roomCap} places manquantes).`);
        }
      } else if (currentPromoEff > roomCap) {
        warnings.push(`⚠️ Capacité Dépassée : L'effectif de "${niveau}" (${currentPromoEff} étudiants) dépasse la capacité de la salle "${roomName}" (${roomCap} places).`);
      }

      // 2. Check if assigned teachers are supervising in ANOTHER room
      sa.surveillants.forEach(sv => {
        const teacherObj = teachers.find(t => t.id === sv.teacherId);
        const tName = teacherObj ? `${teacherObj.nom} ${teacherObj.prenom}` : 'Enseignant';

        otherExams.forEach(other => {
          if (other.date === date && doTimesOverlap(heureDebut, heureFin, other.heureDebut, other.heureFin)) {
            // Only conflict if teacher is in a DIFFERENT room
            const isAssignedDifferentRoom = other.salles && other.salles.some(s => s.roomId !== sa.roomId && s.surveillants.some(x => x.teacherId === sv.teacherId));
            if (isAssignedDifferentRoom) {
              warnings.push(`L'enseignant(e) ${tName} est déjà en surveillance dans une autre salle sur "${other.nomModule}" (${other.heureDebut}-${other.heureFin}).`);
            }
          }
        });
      });
    });

    return warnings;
  };

  const liveWarnings = getLiveConflicts();

  // Add Room Assignment
  const handleAddRoom = () => {
    const availableRoom = rooms.find(r => !salles.some(s => s.roomId === r.id)) || rooms[0];
    if (!availableRoom) return;
    setSalles([...salles, { roomId: availableRoom.id, surveillants: [] }]);
  };

  // Remove Room Assignment
  const handleRemoveRoom = (index: number) => {
    setSalles(salles.filter((_, idx) => idx !== index));
  };

  // Update Room ID
  const handleRoomChange = (index: number, newRoomId: string) => {
    const updated = [...salles];
    updated[index].roomId = newRoomId;
    setSalles(updated);
  };

  // Add Surveillant to Room
  const handleAddSurveillant = (roomIndex: number) => {
    const updated = [...salles];
    const firstTeacherId = teachers[0]?.id || '';
    updated[roomIndex].surveillants.push({
      teacherId: firstTeacherId,
      role: 'Surveillant Adjoint'
    });
    setSalles(updated);
  };

  // Remove Surveillant from Room
  const handleRemoveSurveillant = (roomIndex: number, survIndex: number) => {
    const updated = [...salles];
    updated[roomIndex].surveillants.splice(survIndex, 1);
    setSalles(updated);
  };

  // Update Surveillant Info
  const handleSurveillantChange = (
    roomIndex: number,
    survIndex: number,
    field: 'teacherId' | 'role',
    value: string
  ) => {
    const updated = [...salles];
    if (field === 'teacherId') {
      updated[roomIndex].surveillants[survIndex].teacherId = value;
    } else {
      updated[roomIndex].surveillants[survIndex].role = value as RoleInExam;
    }
    setSalles(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeModule.trim() || !nomModule.trim() || !date) {
      alert('Veuillez renseigner le code du module, le nom et la date de l\'examen.');
      return;
    }

    const currentExamId = (initialExam && 'id' in initialExam && initialExam.id != null) ? String(initialExam.id) : null;
    const otherExams = safeExams.filter(ex => !currentExamId || String(ex.id) !== currentExamId);
    const promoNorm = (niveau || '').trim().toLowerCase();
    const conflictingExam = otherExams.find(ex => 
      ex.date === date && 
      (ex.niveau || '').trim().toLowerCase() === promoNorm && 
      doTimesOverlap(heureDebut, heureFin, ex.heureDebut, ex.heureFin)
    );

    if (conflictingExam) {
      alert(`Interdit de programmer deux examens au même créneau : La promotion "${niveau}" a déjà l'épreuve "${conflictingExam.nomModule}" programmée le ${date} de ${conflictingExam.heureDebut} à ${conflictingExam.heureFin}.`);
      return;
    }

    const newExam: Exam = {
      id: currentExamId || `ex-${Date.now()}`,
      subjectId: (initialExam && 'subjectId' in initialExam) ? initialExam.subjectId : selectedSubjectId || undefined,
      codeModule: codeModule.toUpperCase().trim(),
      nomModule: nomModule.trim(),
      responsableId,
      date,
      heureDebut,
      heureFin,
      semestre,
      session,
      niveau: (niveau || '1ère Année ST (1ST)').trim(),
      departement: (departement || defaultDepartment).trim(),
      specialite: (() => {
        const selectedPromo = promotions.find(p => p.nom === (niveau || '').trim());
        if (selectedPromo?.filiere) return selectedPromo.filiere;
        if (niveau?.toLowerCase().includes('ressource')) return 'Hydraulique';
        if (niveau?.toLowerCase().includes('hydraulique')) return 'Hydraulique';
        return (initialExam && 'specialite' in initialExam && initialExam.specialite) ? initialExam.specialite : 'Tronc Commun';
      })(),
      notes: notes.trim(),
      salles,
      sharedPromotions: (initialExam && 'sharedPromotions' in initialExam) ? initialExam.sharedPromotions : undefined,
      commonGroupId: (initialExam && 'commonGroupId' in initialExam) ? initialExam.commonGroupId : undefined,
      nbEtudiants: (initialExam && 'nbEtudiants' in initialExam) ? initialExam.nbEtudiants : undefined
    };

    onSave(newExam);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={(initialExam && 'id' in initialExam && initialExam.id) ? "Modifier l'Épreuve d'Examen" : "Programmer une Nouvelle Épreuve"}
      subtitle="Configuration de la session, créneau horaire, salles et surveillants"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick subject selector from catalog */}
        {subjects.length > 0 && !(initialExam && 'id' in initialExam && initialExam.id) && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <label className="block text-xs font-bold text-teal-900 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>Sélectionner une Matière du Catalogue (Remplissage Automatique) :</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSelectSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-teal-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="">-- Choisir une matière pour pré-remplir les champs --</option>
              {subjects.map(s => {
                const sNom = s.nom || s.nomModule || '';
                const sCode = s.code || s.codeModule || '';
                return (
                  <option key={s.id} value={s.id}>
                    [{sCode}] {sNom} — {s.promotion} ({s.dureeMinutes || 90} min)
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Live Conflicts Warning Box */}
        {liveWarnings.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Conflits détectés en temps réel avec le planning actuel :</span>
            </div>
            <ul className="text-xs text-rose-700 list-disc list-inside space-y-0.5 pt-1">
              {liveWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Banner when fields are fixed/disabled */}
        {areFixedFieldsDisabled && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Champs du module verrouillés :</strong> Le code, le nom du module, l'enseignant responsable, le niveau et le semestre ne peuvent pas être modifiés {isEditMode ? "en mode modification de l'épreuve" : "lorsqu'une matière du catalogue est sélectionnée"}.
            </span>
          </div>
        )}

        {/* Section 1: Module & Subject Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Code Module *
              </label>
              {areFixedFieldsDisabled && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Verrouillé
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={areFixedFieldsDisabled}
              placeholder="ex: ST101, HA, AMH"
              value={codeModule}
              onChange={(e) => setCodeModule(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nom du Module / Matière *
              </label>
              {areFixedFieldsDisabled && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Verrouillé
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={areFixedFieldsDisabled}
              placeholder="ex: Hydraulique appliquée"
              value={nomModule}
              onChange={(e) => setNomModule(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enseignant Responsable *
              </label>
              <label 
                className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-teal-700 dark:text-teal-300 hover:text-teal-800 select-none bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/80 dark:border-teal-800 transition"
                title="Cocher pour affecter automatiquement l'enseignant responsable comme surveillant principal de cet examen"
              >
                <input
                  type="checkbox"
                  checked={isRespAlsoSurveillant}
                  onChange={(e) => handleToggleRespAlsoSurveillant(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                />
                <span>Est surveillant</span>
              </label>
            </div>
            <select
              value={responsableId}
              disabled={areFixedFieldsDisabled}
              onChange={(e) => handleResponsableChange(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
            >
              <option value="" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">-- Non assigné --</option>
              {sortedTeachers.map((t) => (
                <option key={t.id} value={t.id} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                  {t.nom} {t.prenom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Niveau / Promotion *
              </label>
              {areFixedFieldsDisabled && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Verrouillé
                </span>
              )}
            </div>
            {sortedPromotions.length > 0 ? (
              <select
                value={niveau}
                disabled={areFixedFieldsDisabled}
                onChange={(e) => setNiveau(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
              >
                {sortedPromotions.map(p => (
                  <option key={p.id} value={p.nom} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                    {p.nom} {p.filiere ? `(${p.filiere})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                disabled={areFixedFieldsDisabled}
                placeholder="ex: 1ère Année ST (1ST), M1 hydraulique..."
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Semestre *
              </label>
              {areFixedFieldsDisabled && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Verrouillé
                </span>
              )}
            </div>
            <select
              value={semestre}
              disabled={areFixedFieldsDisabled}
              onChange={(e) => setSemestre(e.target.value as SemesterType)}
              className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:cursor-not-allowed"
            >
              {SEMESTER_OPTIONS.map(s => (
                <option key={s} value={s} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: CRÉNEAU HORAIRE */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Date & Créneau Horaire de l'Épreuve :</span>
            </label>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <span>Durée :</span>
              <strong className="font-mono">{getCalculatedDuration()}</strong>
            </span>
          </div>

          {/* Manual inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date de l'épreuve *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Heure Début *
              </label>
              <input
                type="time"
                required
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Heure Fin *
              </label>
              <input
                type="time"
                required
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Session
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as SessionType)}
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="Ordinaire" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">Ordinaire</option>
                <option value="Rattrapage" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">Rattrapage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Room & Supervisors Allocation */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Affectation des Salles & Surveillants
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ajoutez les salles requises et désignez les surveillants pour chacune.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRoom}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une Salle</span>
            </button>
          </div>

          {salles.length === 0 ? (
            <div className="p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500">
              Aucune salle assignée. Cliquez sur "Ajouter une Salle".
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {salles.map((salleAssign, rIdx) => (
                <div
                  key={rIdx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                >
                  {/* Room selector header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <select
                        value={salleAssign.roomId}
                        onChange={(e) => handleRoomChange(rIdx, e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {sortedRooms.map((r) => (
                          <option key={r.id} value={r.id} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                            {r.nom} ({r.type} - {r.capacite} places)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddSurveillant(rIdx)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-md transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Surveillant</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(rIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                        title="Retirer cette salle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Surveillants list inside this room */}
                  {salleAssign.surveillants.length === 0 ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 italic bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded border border-amber-200/60 dark:border-amber-800/60">
                      Aucun surveillant n'est encore affecté à cette salle.
                    </p>
                  ) : (
                    <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                      {salleAssign.surveillants.map((surv, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <select
                            value={surv.teacherId}
                            onChange={(e) =>
                              handleSurveillantChange(rIdx, sIdx, 'teacherId', e.target.value)
                            }
                            className="flex-1 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            {sortedTeachers.map((t) => (
                              <option key={t.id} value={t.id} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                                {t.nom} {t.prenom}
                              </option>
                            ))}
                          </select>

                          <select
                            value={surv.role}
                            onChange={(e) =>
                              handleSurveillantChange(rIdx, sIdx, 'role', e.target.value)
                            }
                            className="w-44 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            <option value="Surveillant Principal" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">Surveillant Principal</option>
                            <option value="Surveillant Adjoint" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">Surveillant Adjoint</option>
                            <option value="Responsable de Matière" className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">Responsable de Matière</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSurveillant(rIdx, sIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                            title="Retirer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
            {initialExam && 'id' in initialExam && initialExam.id ? "Enregistrer les modifications" : "Programmer l'examen"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
