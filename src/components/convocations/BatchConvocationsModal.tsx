import React, { useState } from 'react';
import { Printer, Download, X, Layers, FolderDown, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Teacher, Exam, Room, InstitutionSettings, Language } from '../../types';
import { OfficialDocumentCard } from './OfficialDocumentCard';
import { ExportUtils } from '../../services/exportUtils';
import { isElectron } from '../../services/platform';

interface BatchConvocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  settings: InstitutionSettings;
  language: Language;
}

export const BatchConvocationsModal: React.FC<BatchConvocationsModalProps> = ({
  isOpen,
  onClose,
  teachers,
  exams,
  rooms,
  settings,
  language
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleExportIndividualPDFs = async () => {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const res = await ExportUtils.batchExportIndividualConvocationsPDF(teachers, exams, rooms, settings);
      if (res.success) {
        setExportFeedback(`${res.savedCount} convocations exportées avec succès !`);
        setTimeout(() => setExportFeedback(null), 4000);
      } else if (res.error && res.error !== 'Opération annulée par l\'utilisateur.') {
        alert(`Erreur d'export: ${res.error}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-xs flex flex-col">
      {/* Sticky top action bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-md no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Impression en Masse — {teachers.length} Convocations Individuelles</span>
              {exportFeedback && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {exportFeedback}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chaque enseignant sera imprimé sur une page A4 séparée conforme au format officiel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportIndividualPDFs}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700/60 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Exporter chaque convocation sous forme de fichier PDF individuel dans un dossier"
          >
            <FolderDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? 'Exportation...' : `Dossier PDF Individuels (${teachers.length})`}</span>
          </button>

          <button
            onClick={() => ExportUtils.exportAllTeacherConvocationsPDF(teachers, exams, rooms, settings)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
            title="Télécharger le fichier PDF multipage complet"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Télécharger Tout en 1 PDF ({teachers.length})</span>
          </button>

          <button
            onClick={() => ExportUtils.triggerPrint()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Tout le Lot (A4)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable documents stack */}
      <div className="flex-1 p-6 sm:p-10 space-y-8 max-w-5xl mx-auto w-full">
        {teachers.map((teacher, idx) => (
          <div key={teacher.id} className="relative">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 no-print flex items-center justify-between">
              <span>Fiche {idx + 1} / {teachers.length} : {teacher.nom} {teacher.prenom}</span>
              <span className="text-[11px] font-normal text-slate-500">{teacher.grade}</span>
            </div>
            
            <OfficialDocumentCard
              teacher={teacher}
              exams={exams}
              rooms={rooms}
              settings={settings}
              language={language}
              documentId={`batch-card-${teacher.id}`}
              isPrintOnly={false}
              teachers={teachers}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
