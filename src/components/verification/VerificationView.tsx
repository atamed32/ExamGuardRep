import React, { useState, useEffect, useMemo } from 'react';
import { 
  ConflictAlert, 
  Exam, 
  Teacher, 
  Room, 
  TeacherLoadStats,
  SubjectModule,
  PromotionGroup
} from '../../types';
import { Translations } from '../../services/i18n';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Users, 
  Calendar, 
  Clock, 
  DoorClosed, 
  ArrowRight,
  Printer,
  BarChart3,
  Layers,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  SlidersHorizontal,
  Check,
  Sparkles
} from 'lucide-react';
import { ConflictEngine } from '../../services/conflictEngine';
import { StorageService } from '../../services/storage';
import { CascadeImpactAlert, ImpactedSlotDetail } from '../../context/AppContext';

interface VerificationViewProps {
  conflicts: ConflictAlert[];
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  subjects?: SubjectModule[];
  promotions?: PromotionGroup[];
  t: Translations;
  onSelectExam: (examId: string) => void;
  onOpenCascadeModal?: (alert: CascadeImpactAlert) => void;
  onTriggerCascadeSync?: () => void;
  onClearAllReports?: () => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  conflicts,
  exams,
  teachers,
  rooms,
  subjects = [],
  promotions = [],
  t,
  onSelectExam,
  onOpenCascadeModal,
  onTriggerCascadeSync,
  onClearAllReports
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'conflicts' | 'workload' | 'cascade'>('conflicts');
  const [cascadeSearchQuery, setCascadeSearchQuery] = useState('');
  
  // Persistent or active cascade report
  const [cascadeReport, setCascadeReport] = useState<CascadeImpactAlert | null>(() => {
    return StorageService.getCascadeReport();
  });

  // Keep cascade report in sync with storage
  useEffect(() => {
    const report = StorageService.getCascadeReport();
    if (report) {
      setCascadeReport(report);
    }
  }, [exams, subjects]);

  // Compute live orphan exams against configured subjects and promotions
  const liveOrphans = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    
    // Map of normalized subject codes and names to their authorized promotions
    const allowedPromosByCode = new Map<string, Set<string>>();
    const allowedPromosByName = new Map<string, Set<string>>();

    subjects.forEach(s => {
      const code = (s.code || s.codeModule || '').toUpperCase().trim();
      const nom = (s.nom || s.nomModule || '').toLowerCase().trim();
      const promo = (s.promotion || '').toLowerCase().trim();

      if (code) {
        if (!allowedPromosByCode.has(code)) allowedPromosByCode.set(code, new Set());
        if (promo) allowedPromosByCode.get(code)!.add(promo);
        if (s.sharedPromotions) {
          s.sharedPromotions.forEach(p => allowedPromosByCode.get(code)!.add(p.toLowerCase().trim()));
        }
      }
      if (nom) {
        if (!allowedPromosByName.has(nom)) allowedPromosByName.set(nom, new Set());
        if (promo) allowedPromosByName.get(nom)!.add(promo);
        if (s.sharedPromotions) {
          s.sharedPromotions.forEach(p => allowedPromosByName.get(nom)!.add(p.toLowerCase().trim()));
        }
      }
    });

    const orphans: ImpactedSlotDetail[] = [];
    exams.forEach(ex => {
      const eCode = (ex.codeModule || '').toUpperCase().trim();
      const eNom = (ex.nomModule || '').toLowerCase().trim();
      const ePromo = (ex.niveau || ex.promotion || '').toLowerCase().trim();

      const codePromos = eCode ? allowedPromosByCode.get(eCode) : undefined;
      const nomPromos = eNom ? allowedPromosByName.get(eNom) : undefined;

      const hasMatch = (codePromos && codePromos.has(ePromo)) || (nomPromos && nomPromos.has(ePromo));

      if (!hasMatch && (allowedPromosByCode.size > 0 || allowedPromosByName.size > 0)) {
        orphans.push({
          examId: ex.id,
          moduleCode: ex.codeModule || '',
          moduleName: ex.nomModule || '',
          promotion: ex.niveau || '',
          date: ex.date || 'Non planifié',
          creneau: ex.heureDebut ? `${ex.heureDebut} - ${ex.heureFin}` : 'Non défini',
          impactDescription: 'Épreuve non synchronisée avec les promotions cochées pour ce module'
        });
      }
    });

    return orphans;
  }, [exams, subjects]);

  // Get active report or generate on-demand report
  const getOrGenerateReport = (): CascadeImpactAlert => {
    if (cascadeReport && cascadeReport.impactedSlots.length > 0) {
      return cascadeReport;
    }

    if (liveOrphans.length > 0) {
      return {
        id: `alert-cascade-${Date.now()}`,
        entityType: 'subject',
        entityId: 'batch',
        entityName: 'Matières synchronisées',
        action: 'update',
        timestamp: Date.now(),
        title: 'Synchronisation en cascade : Nettoyage automatique',
        summary: `${liveOrphans.length} créneau(x) d'épreuve orphelin(s) détecté(s).`,
        impactedSlots: liveOrphans
      };
    }

    // Default clean/fallback report
    return {
      id: `alert-cascade-${Date.now()}`,
      entityType: 'subject',
      entityId: 'batch',
      entityName: 'Matières synchronisées',
      action: 'update',
      timestamp: Date.now(),
      title: 'Synchronisation en cascade : Nettoyage automatique',
      summary: 'Toutes les épreuves sont parfaitement synchronisées avec les promotions et matières configurées.',
      impactedSlots: []
    };
  };

  const handleOpenModal = () => {
    const report = getOrGenerateReport();
    if (onOpenCascadeModal) {
      onOpenCascadeModal(report);
    }
  };

  const handleRunSync = () => {
    if (onTriggerCascadeSync) {
      onTriggerCascadeSync();
      setTimeout(() => {
        const rep = StorageService.getCascadeReport();
        setCascadeReport(rep);
      }, 150);
    }
  };

  const handleClearReport = () => {
    StorageService.saveCascadeReport(null);
    setCascadeReport(null);
    if (onClearAllReports) {
      onClearAllReports();
    }
  };

  const handleClearAllReports = () => {
    StorageService.clearAllReports();
    setCascadeReport(null);
    if (onClearAllReports) {
      onClearAllReports();
    }
  };

  const teacherLoads: TeacherLoadStats[] = ConflictEngine.calculateTeacherLoads(teachers, exams, conflicts);

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');
  const infos = conflicts.filter(c => c.severity === 'info');

  const filteredConflicts = conflicts.filter(c => {
    if (filterSeverity === 'all') return true;
    return c.severity === filterSeverity;
  });

  const activeImpactedSlots = (cascadeReport && cascadeReport.impactedSlots.length > 0) 
    ? cascadeReport.impactedSlots 
    : liveOrphans;

  const filteredCascadeSlots = activeImpactedSlots.filter(slot => {
    if (!cascadeSearchQuery) return true;
    const q = cascadeSearchQuery.toLowerCase();
    return (
      (slot.moduleCode || '').toLowerCase().includes(q) ||
      (slot.moduleName || '').toLowerCase().includes(q) ||
      (slot.promotion || '').toLowerCase().includes(q) ||
      (slot.impactDescription || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Top Header & Sub-Tab Bar */}
      <div className="p-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            <span>Diagnostic & Vérification du Planning (aSc Verifier)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Détection en temps réel des chevauchements, synchronisation en cascade et contrôle d'intégrité.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 rtl:space-x-reverse bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveSubTab('conflicts')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                activeSubTab === 'conflicts'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflits & Diagnostics ({conflicts.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('workload')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                activeSubTab === 'workload'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Équité & Charges ({teachers.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('cascade')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition ${
                activeSubTab === 'cascade'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Nettoyage en cascade ({activeImpactedSlots.length})</span>
            </button>
          </div>

          <button
            onClick={handleOpenModal}
            className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition shadow-xs"
            title="Ouvrir la fenêtre modale « Synchronisation en cascade : Nettoyage automatique »"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Fenêtre de nettoyage</span>
          </button>

          <button
            onClick={handleClearAllReports}
            className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition shadow-xs"
            title="Effacer tous les rapports et journaux de diagnostic"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Effacer les rapports</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: CONFLICTS */}
        {activeSubTab === 'conflicts' && (
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setFilterSeverity('error')}
                className={`p-3 rounded-xl border text-left rtl:text-right transition ${
                  filterSeverity === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500 ring-1 ring-rose-400 dark:ring-rose-500'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Erreurs Critiques</span>
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{errors.length}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Chevauchements stricts</div>
              </button>

              <button
                onClick={() => setFilterSeverity('warning')}
                className={`p-3 rounded-xl border text-left rtl:text-right transition ${
                  filterSeverity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500 ring-1 ring-amber-400 dark:ring-amber-500'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Avertissements</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{warnings.length}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capacités & souhaits</div>
              </button>

              <button
                onClick={() => setFilterSeverity('info')}
                className={`p-3 rounded-xl border text-left rtl:text-right transition ${
                  filterSeverity === 'info'
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 ring-1 ring-sky-400 dark:ring-sky-500'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Remarques & Infos</span>
                  <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{infos.length}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Équité des surveillances</div>
              </button>
            </div>

            {/* Banner for Cascade Cleaning Report if available */}
            {activeImpactedSlots.length > 0 && (
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Rapport de synchronisation en cascade disponible
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300/80">
                      {activeImpactedSlots.length} créneau(x) orphelin(s) ou impacté(s) par les changements de modules.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => setActiveSubTab('cascade')}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition shadow"
                  >
                    Examiner les créneaux
                  </button>
                  <button
                    onClick={handleOpenModal}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                  >
                    Ouvrir la fenêtre
                  </button>
                </div>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                <span className="text-slate-500 dark:text-slate-400">Filtrer par :</span>
                {(['all', 'error', 'warning', 'info'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2 py-0.5 rounded capitalize font-medium transition ${
                      filterSeverity === sev
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {sev === 'all' ? 'Tous' : sev}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {filteredConflicts.length} élément(s) affiché(s)
              </span>
            </div>

            {/* Conflict List */}
            {filteredConflicts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Aucun problème détecté</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Toutes les contraintes d'enseignants, de locaux et de promotions sont actuellement respectées pour cette sélection.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredConflicts.map(alert => {
                  const isError = alert.severity === 'error';
                  const isWarning = alert.severity === 'warning';

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border transition shadow-2xs ${
                        isError
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-600'
                          : isWarning
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-600'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 rtl:space-x-reverse">
                          <div className="mt-0.5">
                            {isError && <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                            {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                            {!isError && !isWarning && <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                {alert.titre || alert.type}
                              </span>
                              {(alert.examIds && alert.examIds.length > 0) && (
                                <>
                                  <span className="text-slate-400 dark:text-slate-500">•</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {alert.examIds.length} épreuve(s) liée(s)
                                  </span>
                                </>
                              )}
                              {alert.date && (
                                <>
                                  <span className="text-slate-400 dark:text-slate-500">•</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{alert.date}</span>
                                </>
                              )}
                              {alert.creneau && (
                                <span className="text-xs text-slate-500 font-mono">({alert.creneau})</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {alert.description}
                            </p>
                          </div>
                        </div>

                        {/* Jump to Exam Button */}
                        {alert.examIds && alert.examIds.length > 0 && (
                          <button
                            onClick={() => onSelectExam(alert.examIds[0])}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse transition border border-slate-200 dark:border-slate-700 shrink-0"
                          >
                            <span>Inspecter</span>
                            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKLOAD */}
        {activeSubTab === 'workload' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 rtl:space-x-reverse">
                  <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Répartition des Surveillances et Équité</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Contrôle des quotas contractuels et surveillance des surcharges par enseignant.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="p-2.5">Enseignant</th>
                      <th className="p-2.5">Grade / Département</th>
                      <th className="p-2.5 text-center">Quota Souhaité</th>
                      <th className="p-2.5 text-center">Séances Affectées</th>
                      <th className="p-2.5 text-center">Volume Horaire</th>
                      <th className="p-2.5 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherLoads.map(tl => {
                      const quota = tl.teacher?.quotaSouhaite || 8;
                      const isOver = tl.nbSurveillances > quota;

                      return (
                        <tr key={tl.teacherId} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-200">
                            {tl.teacher?.nom || ''} {tl.teacher?.prenom || ''}
                          </td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400">
                            {tl.teacher?.grade || ''} - {tl.teacher?.departement || ''}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {quota}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {tl.nbSurveillances}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                            {tl.totalHeures} h
                          </td>
                          <td className="p-2.5 text-center">
                            {isOver ? (
                              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded font-semibold text-[10px]">
                                Surcharge (+{tl.nbSurveillances - quota})
                              </span>
                            ) : tl.nbSurveillances === quota ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded font-semibold text-[10px]">
                                Quota Atteint
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px]">
                                {quota - tl.nbSurveillances} disponible(s)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CASCADE SYNCHRONIZATION & CLEANUP */}
        {activeSubTab === 'cascade' && (
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Top Command Banner */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 rtl:space-x-reverse">
                  <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <span>Synchronisation en cascade : Nettoyage automatique</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supervision des épreuves orphelines et réalignement avec les promotions cochées dans les matières.
                </p>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={handleOpenModal}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-2 rtl:space-x-reverse transition"
                  title="Afficher la fenêtre modale officielle"
                >
                  <ShieldAlert className="w-4 h-4 text-white" />
                  <span>Ouvrir la fenêtre modale</span>
                </button>

                <button
                  onClick={handleRunSync}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition"
                  title="Réaligner les épreuves avec les promotions cochées"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Lancer la synchronisation</span>
                </button>

                <button
                  onClick={handleClearAllReports}
                  className="px-3 py-2 text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
                  title="Effacer tous les rapports et vider les anomalies archivées"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Effacer les rapports</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Créneaux impactés / purgés</div>
                <div className={`text-2xl font-bold mt-1 ${activeImpactedSlots.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {activeImpactedSlots.length}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {activeImpactedSlots.length > 0 ? 'Désaffectations enregistrées' : 'Aucune anomalie'}
                </div>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Matières actives au catalogue</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-1">
                  {subjects.length}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Modules avec attributions promotions
                </div>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Épreuves au calendrier</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-1">
                  {exams.length}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Séances programmées
                </div>
              </div>
            </div>

            {/* Search Filter for Impacted Slots */}
            {activeImpactedSlots.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cascadeSearchQuery}
                  onChange={(e) => setCascadeSearchQuery(e.target.value)}
                  placeholder="Rechercher par code matière, intitulé ou promotion..."
                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            )}

            {/* List of Impacted Slots */}
            {activeImpactedSlots.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Planning parfaitement synchronisé</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
                    Toutes les épreuves correspondent rigoureusement aux promotions cochées dans les matières (« Données de base » → « Matières & Modules »). Aucun créneau orphelin n'a été détecté.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={handleOpenModal}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                  >
                    Voir l'aperçu de la fenêtre modale
                  </button>
                  <button
                    onClick={handleRunSync}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-xs"
                  >
                    Vérifier à nouveau
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    Détail des créneaux purgés ou retirés ({filteredCascadeSlots.length} sur {activeImpactedSlots.length}) :
                  </span>
                  <span>Mise à jour automatique en temps réel</span>
                </div>

                <div className="space-y-2">
                  {filteredCascadeSlots.map((slot, index) => (
                    <div
                      key={`${slot.examId || index}-${slot.moduleCode}`}
                      className="p-3.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl transition space-y-2 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                            {slot.moduleCode || 'N/A'}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                            {slot.moduleName}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs">
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-medium flex items-center">
                            <Users className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 text-amber-500 dark:text-amber-400" />
                            {slot.promotion}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <span className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.date}</span>
                          </span>
                          <span className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.creneau}</span>
                          </span>
                          {slot.salle && (
                            <span className="flex items-center space-x-1 rtl:space-x-reverse">
                              <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                              <span>{slot.salle}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1 rtl:space-x-reverse">
                          <span>⚠️ {slot.impactDescription}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
