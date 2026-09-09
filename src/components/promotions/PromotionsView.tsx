import React, { useState, useMemo } from 'react';
import { PromotionGroup, Room, Exam } from '../../types';
import { Translations } from '../../services/i18n';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  Search, 
  Save, 
  X, 
  LayoutGrid, 
  Table, 
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DoorClosed
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export type PromotionSortField = 'nom' | 'code' | 'filiere' | 'cycle' | 'effectif';

interface PromotionsViewProps {
  promotions: PromotionGroup[];
  rooms?: Room[];
  exams?: Exam[];
  t: Translations;
  onUpdatePromotions: (updated: PromotionGroup[]) => void;
  onSavePromotion?: (promo: PromotionGroup) => void;
  onDeletePromotion?: (promoId: string) => void;
  onNotify?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onOpenRoomAssignment?: (options?: { promoName?: string }) => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  promotions,
  rooms = [],
  exams = [],
  t,
  onUpdatePromotions,
  onSavePromotion,
  onDeletePromotion,
  onNotify,
  onOpenRoomAssignment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPromo, setEditingPromo] = useState<PromotionGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<PromotionGroup | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Sorting state
  const [sortField, setSortField] = useState<PromotionSortField>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [filiere, setFiliere] = useState('');
  const [semestre, setSemestre] = useState('S1');
  const [cycle, setCycle] = useState<'Licence' | 'Master' | 'Doctorat' | 'Ingénieur'>('Licence');
  const [annee, setAnnee] = useState(1);
  const [effectif, setEffectif] = useState(60);
  const [couleur, setCouleur] = useState('#3b82f6');

  // Helper pour trouver la salle assignée à une promotion
  const getAssignedRoomInfo = (p: PromotionGroup): string | null => {
    if (p.salleAssigneeNom) return p.salleAssigneeNom;
    if (p.salleAssigneeId && rooms.length > 0) {
      const found = rooms.find(r => r.id === p.salleAssigneeId);
      if (found) return found.nom;
    }
    if (exams && exams.length > 0) {
      const pNorm = p.nom.trim().toLowerCase();
      const ex = exams.find(e => {
        const ePromo = (e.niveau || e.promotion || '').trim().toLowerCase();
        return ePromo === pNorm && e.salles && e.salles.length > 0 && e.salles[0]?.roomId;
      });
      if (ex && ex.salles && ex.salles[0]?.roomId) {
        if (rooms.length > 0) {
          const found = rooms.find(r => r.id === ex.salles![0].roomId);
          if (found) return found.nom;
        }
        return ex.salles[0].roomId;
      }
    }
    return null;
  };

  // Filtering & Sorting
  const filtered = useMemo(() => {
    const list = promotions.filter(p =>
      `${p.nom} ${p.code || ''} ${p.filiere} ${p.cycle}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nom':
          comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
          break;
        case 'code':
          comparison = (a.code || '').localeCompare(b.code || '', 'fr', { sensitivity: 'base' });
          break;
        case 'filiere':
          comparison = (a.filiere || '').localeCompare(b.filiere || '', 'fr', { sensitivity: 'base' });
          break;
        case 'cycle':
          comparison = (a.cycle || '').localeCompare(b.cycle || '', 'fr', { sensitivity: 'base' });
          break;
        case 'effectif':
          comparison = (a.effectif || 0) - (b.effectif || 0);
          break;
        default:
          comparison = a.nom.localeCompare(b.nom);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [promotions, searchTerm, sortField, sortDirection]);

  const handleSort = (field: PromotionSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openNew = () => {
    setEditingPromo(null);
    setCode('');
    setNom('');
    setFiliere('Informatique');
    setSemestre('S1');
    setCycle('Licence');
    setAnnee(1);
    setEffectif(60);
    setCouleur('#3b82f6');
    setIsModalOpen(true);
  };

  const openEdit = (p: PromotionGroup) => {
    setEditingPromo(p);
    setCode(p.code || '');
    setNom(p.nom);
    setFiliere(p.filiere || '');
    setSemestre(p.semestre || 'S1');
    setCycle((p.cycle as any) || 'Licence');
    setAnnee(Number(p.annee) || 1);
    setEffectif(p.effectif || 60);
    setCouleur(p.couleur || '#3b82f6');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const trimmedCode = code.trim().toUpperCase() || (nom.trim().substring(0, 6).toUpperCase());
    const validSemestre = (semestre || 'S1').trim();

    if (editingPromo) {
      const updatedPromo: PromotionGroup = {
        ...editingPromo,
        code: trimmedCode,
        nom: nom.trim(),
        filiere: filiere.trim(),
        semestre: validSemestre,
        cycle,
        annee,
        effectif: Number(effectif) || 60,
        couleur
      };
      if (onSavePromotion) {
        onSavePromotion(updatedPromo);
      } else {
        const updated = promotions.map(p => p.id === editingPromo.id ? updatedPromo : p);
        onUpdatePromotions(updated);
      }
      if (onNotify) {
        onNotify('success', t.editPromotion, `La promotion "${nom}" (${validSemestre}) a été mise à jour avec succès.`);
      }
    } else {
      const newP: PromotionGroup = {
        id: `promo-${Date.now()}`,
        code: trimmedCode,
        nom: nom.trim(),
        filiere: filiere.trim(),
        semestre: validSemestre,
        cycle,
        annee,
        effectif: Number(effectif) || 60,
        couleur
      };
      if (onSavePromotion) {
        onSavePromotion(newP);
      } else {
        onUpdatePromotions([...promotions, newP]);
      }
      if (onNotify) {
        onNotify('success', t.newPromotion, `La promotion "${nom}" (${validSemestre}) a été ajoutée avec succès.`);
      }
    }
    setIsModalOpen(false);
  };

  const confirmDelete = (promo: PromotionGroup) => {
    setPromoToDelete(promo);
  };

  const executeDelete = () => {
    if (!promoToDelete) return;
    if (onDeletePromotion) {
      onDeletePromotion(promoToDelete.id);
    } else {
      const updated = promotions.filter(p => p.id !== promoToDelete.id);
      onUpdatePromotions(updated);
      if (onNotify) {
        onNotify('info', t.deletePromotion, `La promotion "${promoToDelete.nom}" a été supprimée.`);
      }
    }
    setPromoToDelete(null);
  };

  return (
    <div className="p-4 flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700/40">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2 rtl:space-x-reverse">
            <Layers className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            <span>{t.promotions} ({promotions.length})</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Groupes d'étudiants, effectifs et codes couleurs pour la planification aSc.
          </p>
        </div>

        <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse gap-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-300 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-[var(--text-primary)] focus:outline-none focus:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 rtl:left-auto rtl:right-2.5" />
          </div>

          {/* Quick A-Z / Z-A Sorting Button */}
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center space-x-1 rtl:space-x-reverse border border-purple-300 dark:border-purple-500/30 transition shadow-2xs"
            title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
          </button>

          {/* Sort criteria */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as PromotionSortField)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-300 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-[var(--text-primary)] focus:outline-none focus:border-purple-500 shadow-2xs"
            title="Critère de tri"
          >
            <option value="nom">Trier : Promotion</option>
            <option value="filiere">Trier : Filière</option>
            <option value="cycle">Trier : Cycle</option>
            <option value="effectif">Trier : Effectif</option>
          </select>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'cards' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Vue Tableau"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {onOpenRoomAssignment && (
            <button
              type="button"
              onClick={() => onOpenRoomAssignment()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition"
              title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
            >
              <DoorClosed className="w-4 h-4" />
              <span>Attribuer une salle</span>
            </button>
          )}

          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newPromotion}</span>
          </button>
        </div>
      </div>

      {/* Content View: Cards or Table */}
      {viewMode === 'cards' ? (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="p-4 bg-white dark:bg-slate-850/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-md hover:border-purple-500/50 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="w-4 h-4 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: p.couleur }} />
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">{p.nom}</h3>
                      {p.code && (
                        <span className="inline-block font-mono text-[11px] font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 mt-0.5">
                          {p.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded font-bold border border-indigo-200 dark:border-indigo-500/30 font-mono">
                      {p.semestre || 'S1'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded font-semibold border border-purple-200 dark:border-purple-500/30">
                      {p.cycle} {p.annee}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[var(--text-muted)] mt-3 space-y-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>{t.field} : <strong className="text-[var(--text-primary)]">{p.filiere}</strong></div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Semestre : <strong className="text-indigo-700 dark:text-indigo-300 font-mono">{p.semestre || 'S1'}</strong>
                    </span>
                  </div>

                  {/* Effectif étudiant et Salle d'examen appariés */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {/* Effectif étudiant (Bleu distinct et net) */}
                    <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/60 font-bold text-xs shadow-2xs">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{p.effectif} {t.studentsCount}</span>
                    </div>

                    {/* Salle d'examen assignée (Ambre distinct et harmonisé) */}
                    {onOpenRoomAssignment && (
                      getAssignedRoomInfo(p) ? (
                        <button
                          type="button"
                          onClick={() => onOpenRoomAssignment({ promoName: p.nom })}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-2xs"
                          title={`Salle attribuée : ${getAssignedRoomInfo(p)} (Cliquer pour modifier)`}
                        >
                          <DoorClosed className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Salle : {getAssignedRoomInfo(p)}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRoomAssignment({ promoName: p.nom })}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700/60 rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-2xs"
                          title="Attribuer une salle d'examen"
                        >
                          <DoorClosed className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                          <span>Pas de salle</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons with Delete Icon */}
              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/40">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition shadow-2xs"
                  title={t.edit}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {/* Delete Button with Trash Icon */}
                <button
                  type="button"
                  onClick={() => confirmDelete(p)}
                  className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition shadow-2xs"
                  title={t.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 text-sm">
              Aucune promotion trouvée pour "{searchTerm}".
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs pb-4">
          <table className="w-full text-xs text-left rtl:text-right text-[var(--text-primary)]">
            <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-[var(--text-muted)] border-b border-slate-200 dark:border-slate-700/60 sticky top-0 backdrop-blur-xs">
              <tr>
                <th 
                  onClick={() => handleSort('code')}
                  className="px-4 py-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition select-none w-24"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>Code</span>
                    {sortField === 'code' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nom')}
                  className="px-4 py-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.promotionName}</span>
                    {sortField === 'nom' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('filiere')}
                  className="px-4 py-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.field}</span>
                    {sortField === 'filiere' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('cycle')}
                  className="px-4 py-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.cycle}</span>
                    {sortField === 'cycle' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-purple-700 dark:text-purple-400 w-24">
                  Semestre
                </th>
                <th 
                  onClick={() => handleSort('effectif')}
                  className="px-4 py-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition select-none"
                >
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>{t.studentsCount}</span>
                    {sortField === 'effectif' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-400">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <DoorClosed className="w-3.5 h-3.5" />
                    <span>Salle d'examen</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-right rtl:text-left">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-400">
                    <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 rounded border border-purple-200 dark:border-purple-800/60 text-[11px]">
                      {p.code || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: p.couleur }} />
                    <span>{p.nom}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-[var(--text-muted)]">{p.filiere}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded text-[10px] font-semibold border border-purple-200 dark:border-purple-500/30">
                      {p.cycle} {p.annee}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold font-mono border border-indigo-200 dark:border-indigo-500/30">
                      {p.semestre || 'S1'}
                    </span>
                  </td>
                  {/* Effectif étudiant - Bleu distinct */}
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/60 font-bold font-mono text-xs">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{p.effectif}</span>
                    </div>
                  </td>
                  {/* Salle attribuée - Ambre distinct */}
                  <td className="px-4 py-3">
                    {onOpenRoomAssignment ? (
                      getAssignedRoomInfo(p) ? (
                        <button
                          type="button"
                          onClick={() => onOpenRoomAssignment({ promoName: p.nom })}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-2xs"
                          title={`Salle assignée : ${getAssignedRoomInfo(p)} (Cliquer pour changer)`}
                        >
                          <DoorClosed className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{getAssignedRoomInfo(p)}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRoomAssignment({ promoName: p.nom })}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700/60 rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-2xs"
                          title="Attribuer une salle d'examen"
                        >
                          <DoorClosed className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                          <span>Pas de salle</span>
                        </button>
                      )
                    ) : (
                      getAssignedRoomInfo(p) ? (
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{getAssignedRoomInfo(p)}</span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Pas de salle</span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left">
                    <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 rounded-lg transition"
                        title={t.edit}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(p)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/40 rounded-lg transition"
                        title={t.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!promoToDelete}
        title={t.deletePromotion}
        message={`${t.confirmDeletePromo} (${promoToDelete?.nom})`}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        isDangerous={true}
        onConfirm={executeDelete}
        onCancel={() => setPromoToDelete(null)}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromo ? t.editPromotion : t.newPromotion}
        subtitle="Groupes d'étudiants, effectifs et codes couleurs"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code de la promotion * :</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: 1ST, M1-RE"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold placeholder:text-slate-400 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.promotionName} * :</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: 1ère Année ST, M1 Ressources en eau"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.field} * :</label>
              <input
                type="text"
                required
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
                placeholder="Ex: Génie Logiciel, Hydraulique, Structure"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Semestre * :</label>
                <span className="text-[10px] text-purple-600 font-medium">Propre à la promotion</span>
              </div>
              <select
                value={['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(semestre) ? semestre : 'autre'}
                onChange={(e) => {
                  if (e.target.value !== 'autre') {
                    setSemestre(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold font-mono"
              >
                <option value="S1">Semestre 1 (S1)</option>
                <option value="S2">Semestre 2 (S2)</option>
                <option value="S3">Semestre 3 (S3)</option>
                <option value="S4">Semestre 4 (S4)</option>
                <option value="S5">Semestre 5 (S5)</option>
                <option value="S6">Semestre 6 (S6)</option>
                <option value="autre">Autre semestre spécifique...</option>
              </select>
              {!['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(semestre) && (
                <input
                  type="text"
                  required
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value.toUpperCase())}
                  placeholder="Ex: S1, S2, Rattrapage S1..."
                  className="mt-1.5 w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold uppercase"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.cycle} :</label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as any)}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="Licence" className="text-slate-900">Licence</option>
                <option value="Master" className="text-slate-900">Master</option>
                <option value="Ingénieur" className="text-slate-900">Ingénieur</option>
                <option value="Doctorat" className="text-slate-900">Doctorat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.studentsCount} :</label>
              <input
                type="number"
                min="1"
                required
                value={effectif}
                onChange={(e) => setEffectif(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.colorTag} :</label>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <input
                type="color"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="w-10 h-10 bg-transparent cursor-pointer rounded-lg border border-slate-300 p-1"
              />
              <span className="font-mono text-sm text-slate-700 font-semibold">{couleur}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              {t.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
