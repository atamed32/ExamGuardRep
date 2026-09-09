import React, { useState } from 'react';
import { 
  Exam, 
  Teacher, 
  Room, 
  PromotionGroup, 
  SubjectModule, 
  TimeSlot, 
  TimeOffEntry, 
  GlobalConstraints, 
  AutoGeneratorOptions, 
  GenerationResult 
} from '../../types';
import { AutoSchedulerService } from '../../services/autoGenerator';
import { Translations } from '../../services/i18n';
import { 
  Wand2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Play, 
  Sliders, 
  Check, 
  Clock, 
  FileText,
  RotateCcw
} from 'lucide-react';

interface AutoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  promotions: PromotionGroup[];
  subjects: SubjectModule[];
  timeSlots: TimeSlot[];
  sessionDates: string[];
  timeOffConstraints: TimeOffEntry[];
  globalConstraints: GlobalConstraints;
  t: Translations;
  onApplyResult: (result: GenerationResult) => void;
}

export const AutoGeneratorModal: React.FC<AutoGeneratorModalProps> = ({
  isOpen,
  onClose,
  exams,
  teachers,
  rooms,
  promotions,
  subjects,
  timeSlots,
  sessionDates,
  timeOffConstraints,
  globalConstraints,
  t,
  onApplyResult
}) => {
  const [options, setOptions] = useState<AutoGeneratorOptions>({
    generateTimeslots: true,
    generateRooms: true,
    generateSurveillants: true,
    preserveManualAssignments: true,
    respectTimeOff: true,
    balanceLoad: true
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  if (!isOpen) return null;

  const handleRunGenerator = () => {
    setIsRunning(true);
    setResult(null);

    setTimeout(() => {
      const res = AutoSchedulerService.runAutoGeneration(
        exams,
        teachers,
        rooms,
        promotions,
        subjects,
        timeSlots,
        sessionDates,
        timeOffConstraints,
        globalConstraints,
        options
      );

      setResult(res);
      setIsRunning(false);
    }, 600);
  };

  const handleConfirmApply = () => {
    if (result) {
      onApplyResult(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl text-slate-800 dark:text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <Wand2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Générateur Automatique des Emplois du Temps (aSc Engine)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optimisation heuristique et résolution des contraintes d'examens et de surveillances.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Options Configuration */}
          {!result && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2 rtl:space-x-reverse">
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Modules de génération à exécuter :</span>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.generateTimeslots}
                      onChange={(e) => setOptions({ ...options, generateTimeslots: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">Placer les épreuves dans les créneaux</strong> (Dates & Heures sans chevauchement de promotion)
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.generateRooms}
                      onChange={(e) => setOptions({ ...options, generateRooms: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">Affecter les salles</strong> (Respect des capacités d'accueil par promotion)
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.generateSurveillants}
                      onChange={(e) => setOptions({ ...options, generateSurveillants: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">Distribuer les surveillances</strong> (Équilibrage des quotas enseignants)
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2 rtl:space-x-reverse">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Conditions & Préservation :</span>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.preserveManualAssignments}
                      onChange={(e) => setOptions({ ...options, preserveManualAssignments: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      Conserver les épreuves et surveillances déjà positionnées manuellement
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.respectTimeOff}
                      onChange={(e) => setOptions({ ...options, respectTimeOff: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      Respecter rigoureusement les indisponibilités / temps libre (Veto)
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox"
                      checked={options.allowSeparateRoomsForCommonModules ?? true}
                      onChange={(e) => setOptions({ ...options, allowSeparateRoomsForCommonModules: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">Salles distinctes pour modules communs</strong> (Autoriser des locaux séparés pour L2 Génie Civil, L2 Hydraulique, etc.)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Running Spinner */}
          {isRunning && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 animate-pulse">
                Calcul des permutations et affectations optimales en cours...
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Application des vœux, contraintes de salles et de quotas.
              </div>
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="space-y-4">
              {/* Score card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-600 dark:text-slate-400 font-medium">Score de conformité du planning :</div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {result.score}%
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ {result.placedExamsCount} épreuves positionnées
                  </div>
                  {result.unplacedExamsCount > 0 ? (
                    <div className="text-amber-700 dark:text-amber-400 font-bold">
                      ⚠ {result.unplacedExamsCount} non placées (manque de place)
                    </div>
                  ) : (
                    <div className="text-slate-600 dark:text-slate-400 font-medium">
                      0 épreuve restante
                    </div>
                  )}
                </div>
              </div>

              {/* Log messages */}
              <div className="bg-slate-900 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 text-slate-200">
                {result.logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>

              {/* Conflicts if any */}
              {result.conflicts.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center space-x-1.5 rtl:space-x-reverse mb-1 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{result.conflicts.length} alerte(s) ou avertissement(s) résiduel(s)</span>
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300/90">
                    Consultez l'onglet Diagnostic & Vérification après application pour voir les détails.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
          >
            Fermer
          </button>

          {!result ? (
            <button
              onClick={handleRunGenerator}
              disabled={isRunning}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-2 rtl:space-x-reverse shadow-md transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Démarrer l'Optimisation</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setResult(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Relancer
              </button>

              <button
                onClick={handleConfirmApply}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-2 rtl:space-x-reverse shadow-md transition"
              >
                <Check className="w-4 h-4" />
                <span>Appliquer le Nouveau Planning</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
