import React from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  Clock, 
  BookOpen, 
  Users, 
  Layers, 
  Check, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Modal } from './Modal';
import { CascadeImpactAlert } from '../../context/AppContext';

interface CascadeImpactModalProps {
  alert: CascadeImpactAlert | null;
  onClose: () => void;
  onNavigateToTimetable?: () => void;
  onClearReport?: () => void;
}

export const CascadeImpactModal: React.FC<CascadeImpactModalProps> = ({
  alert,
  onClose,
  onNavigateToTimetable,
  onClearReport
}) => {
  if (!alert) return null;

  const entityTypeLabels: Record<string, { label: string; bg: string; text: string }> = {
    room: { label: 'Salle / Amphithéâtre', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
    teacher: { label: 'Enseignant / Surveillant', bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400' },
    promotion: { label: 'Promotion / Filière', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
    subject: { label: 'Matière / Module', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
    timeslot: { label: 'Créneau horaire', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400' },
  };

  const typeConfig = entityTypeLabels[alert.entityType] || {
    label: alert.entityType,
    bg: 'bg-slate-700/30 border-slate-600',
    text: 'text-slate-300'
  };

  return (
    <Modal
      isOpen={!!alert}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2 text-rose-400">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <span className="font-bold text-base">Synchronisation en cascade : Nettoyage automatique</span>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Banner with Summary */}
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-slate-800/90 border border-rose-200 dark:border-rose-500/30 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${typeConfig.bg} ${typeConfig.text}`}>
                  {typeConfig.label}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {alert.entityName}
                </h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {alert.summary}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300">
                {alert.impactedSlots.length} créneau(x) impacté(s)
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Impacted Slots List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            <span>Détail des créneaux d'examens désaffectés</span>
            <span>{alert.impactedSlots.length} éléments libérés</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {alert.impactedSlots.map((slot, idx) => (
              <div
                key={`${slot.examId}-${idx}`}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                      {slot.moduleCode || 'MODULE'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {slot.moduleName}
                    </span>
                  </div>
                  {slot.promotion && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-medium">
                      <Users className="w-3 h-3 mr-1" />
                      {slot.promotion}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>{slot.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>{slot.creneau}</span>
                  </div>
                  {slot.salle && (
                    <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-300 font-medium">
                      <span>Salle : {slot.salle}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-rose-600 dark:text-rose-300/90 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span className="font-medium">{slot.impactDescription}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
          <div>
            {onClearReport && (
              <button
                type="button"
                onClick={() => {
                  onClearReport();
                  onClose();
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center space-x-1.5 transition-colors shadow-2xs"
                title="Effacer ce rapport d'anomalie"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer ce rapport</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {onNavigateToTimetable && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTimetable();
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>Vérifier dans le planning</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Fermer le récapitulatif
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
