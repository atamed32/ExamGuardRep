import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Mail,
  Layers,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Copy,
  Check,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { Teacher, Exam, Room, InstitutionSettings, Language } from '../../types';
import { translations } from '../../services/i18n';
import { OfficialDocumentCard } from './OfficialDocumentCard';
import { ExportUtils } from '../../services/exportUtils';
import { ConflictEngine } from '../../services/conflictEngine';

interface ConvocationViewProps {
  teachers: Teacher[];
  exams: Exam[];
  rooms: Room[];
  settings: InstitutionSettings;
  language: Language;
  selectedTeacherId: string;
  onSelectTeacherId: (id: string) => void;
  onOpenPrintAll: () => void;
  onNotify?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export const ConvocationView: React.FC<ConvocationViewProps> = ({
  teachers,
  exams,
  rooms,
  settings,
  language,
  selectedTeacherId,
  onSelectTeacherId,
  onOpenPrintAll,
  onNotify
}) => {
  const t = translations[language];
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Calculate surveillances count & conflicts per teacher
  const teacherStats = useMemo(() => {
    const counts = new Map<string, number>();
    exams.forEach(ex => {
      ex.salles.forEach(s => {
        s.surveillants.forEach(sv => {
          counts.set(sv.teacherId, (counts.get(sv.teacherId) || 0) + 1);
        });
      });
    });
    return counts;
  }, [exams]);

  const conflicts = useMemo(() => {
    return ConflictEngine.detectAllConflicts(exams, teachers, rooms);
  }, [exams, teachers, rooms]);

  const teacherConflictSet = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach(c => {
      if (c.teacherId) set.add(c.teacherId);
    });
    return set;
  }, [conflicts]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = teachers.filter(t => {
      if (!q) return true;
      return (
        t.nom.toLowerCase().includes(q) ||
        t.prenom.toLowerCase().includes(q) ||
        t.grade.toLowerCase().includes(q) ||
        t.departement.toLowerCase().includes(q) ||
        t.specialite.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      const cmp = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [teachers, searchQuery, sortDirection]);

  const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || filteredTeachers[0] || teachers[0];
  const currentIndex = teachers.findIndex(t => t.id === currentTeacher?.id);

  const documentElementId = `official-convocation-${currentTeacher?.id}`;

  const currentTeacherSlots = useMemo(() => {
    if (!currentTeacher) return [];
    const roomMap = new Map(rooms.map(r => [r.id, r.nom]));
    const slots: { exam: Exam; roomName: string; role: string }[] = [];

    exams.forEach(ex => {
      ex.salles.forEach(s => {
        const found = s.surveillants.find(sv => sv.teacherId === currentTeacher.id);
        if (found) {
          slots.push({
            exam: ex,
            roomName: roomMap.get(s.roomId) || s.roomId,
            role: found.role
          });
        }
      });
    });
    return slots;
  }, [exams, rooms, currentTeacher]);

  const mailContent = useMemo(() => {
    if (!currentTeacher) return null;
    return ExportUtils.getTeacherScheduleMailContent(currentTeacher, settings, currentTeacherSlots);
  }, [currentTeacher, settings, currentTeacherSlots]);

  const handleExportPDF = async () => {
    if (!currentTeacher) return;
    setIsExportingPDF(true);
    const filename = `Convocation_${currentTeacher.nom}_${currentTeacher.prenom}_${(settings.anneeUniversitaire || '2025-2026').replace(/[\s/]+/g, '_')}.pdf`;
    
    try {
      ExportUtils.exportTeacherConvocationPDF(currentTeacher, exams, rooms, settings, filename);
      if (onNotify) {
        onNotify('success', 'Export PDF Réussi', `La convocation de ${currentTeacher.nom} ${currentTeacher.prenom} a été téléchargée au format A4.`);
      }
    } catch (err) {
      console.warn('Direct PDF export failed, trying element capture fallback', err);
      const res = await ExportUtils.exportElementAsPDF(documentElementId, filename);
      if (res.success) {
        if (onNotify) {
          onNotify('success', 'Export PDF Réussi', `La convocation de ${currentTeacher.nom} ${currentTeacher.prenom} a été téléchargée.`);
        }
      } else {
        if (onNotify) {
          onNotify('error', 'Erreur Export PDF', res.message || 'Impossible de générer le fichier PDF.');
        } else {
          alert(res.message || 'Erreur lors de la génération du PDF.');
        }
      }
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleOpenEmailDialog = () => {
    if (!currentTeacher) return;
    setIsEmailModalOpen(true);
    setCopiedEmail(false);
  };

  const handleCopyEmailText = async () => {
    if (!mailContent) return;
    try {
      await navigator.clipboard.writeText(`${mailContent.subject}\n\n${mailContent.body}`);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
      if (onNotify) {
        onNotify('success', 'Texte Copié', 'Le message de convocation a été copié dans votre presse-papier.');
      }
    } catch (e) {
      if (onNotify) {
        onNotify('info', 'Presse-papier', 'Sélectionnez et copiez le texte ci-dessous.');
      }
    }
  };

  const handleTriggerMailto = () => {
    if (!currentTeacher || !mailContent) return;
    ExportUtils.sendTeacherScheduleMail(currentTeacher, settings, currentTeacherSlots);
    if (onNotify) {
      onNotify('info', 'Client Mail', `Ouverture de votre messagerie pour ${currentTeacher.email || currentTeacher.nom}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* 1. LEFT SIDEBAR: TEACHERS HIGH-DENSITY LIST */}
      <div className="w-full lg:w-72 xl:w-80 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shrink-0 no-print shadow-xs">
        {/* Search header */}
        <div className="p-2.5 border-b border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher enseignant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 text-blue-700 rounded text-xs font-bold flex items-center gap-1 border border-slate-300 shadow-2xs transition shrink-0"
              title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
            <span>{filteredTeachers.length} enseignant(s)</span>
            <span>Total : {teachers.length}</span>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
          {filteredTeachers.map(teacher => {
            const isSelected = teacher.id === currentTeacher?.id;
            const count = teacherStats.get(teacher.id) || 0;
            const hasConflict = teacherConflictSet.has(teacher.id);

            return (
              <div
                key={teacher.id}
                onClick={() => onSelectTeacherId(teacher.id)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                      {teacher.grade.startsWith('Pr') ? 'PR. ' : teacher.grade.includes('Doc') ? 'DR. ' : ''}
                      {teacher.nom} {teacher.prenom}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase block truncate">
                      {teacher.grade.split('(')[0].trim()}
                    </span>
                  </div>
                  {hasConflict && (
                    <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold shrink-0">
                      Conflit
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[9px]">
                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                    count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count} {count > 1 ? 'Surveillances' : 'Surveillance'}
                  </span>
                  <span className="text-slate-400 truncate max-w-[120px]">
                    {teacher.departement || 'Technologie'}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredTeachers.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Aucun enseignant trouvé pour "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT AREA: CONVOCATION PREVIEW & ACTION TOOLBAR */}
      <div className="flex-1 w-full min-w-0 space-y-3">
        {/* Action Toolbar */}
        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs no-print flex flex-wrap items-center justify-between gap-2">
          {/* Quick switcher */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => currentIndex > 0 && onSelectTeacherId(teachers[currentIndex - 1].id)}
              disabled={currentIndex <= 0}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded border border-slate-200 hover:bg-slate-50 transition"
              title="Précédent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-600 font-semibold px-2">
              {currentIndex + 1} / {teachers.length}
            </span>
            <button
              onClick={() => currentIndex < teachers.length - 1 && onSelectTeacherId(teachers[currentIndex + 1].id)}
              disabled={currentIndex >= teachers.length - 1}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded border border-slate-200 hover:bg-slate-50 transition"
              title="Suivant"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Print A4 */}
            <button
              onClick={() => ExportUtils.triggerPrint()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs transition-colors"
              title="Imprimer au format A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.print}</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors disabled:opacity-50"
              title="Télécharger PDF"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isExportingPDF ? 'Génération...' : t.exportPDF}</span>
            </button>

            {/* Send Mail */}
            <button
              onClick={handleOpenEmailDialog}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
              title="Notifier par Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t.sendEmail}</span>
            </button>

            {/* Batch Print All */}
            <button
              onClick={onOpenPrintAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
              title="Imprimer toutes les fiches"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Imprimer en masse ({teachers.length})</span>
            </button>
          </div>
        </div>

        {/* Document Render Container */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-2 sm:p-4 overflow-x-auto">
          {currentTeacher ? (
            <OfficialDocumentCard
              teacher={currentTeacher}
              exams={exams}
              rooms={rooms}
              settings={settings}
              language={language}
              documentId={documentElementId}
            />
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Veuillez sélectionner un enseignant dans la liste.
            </div>
          )}
        </div>
      </div>

      {/* EMAIL NOTIFICATION & PREVIEW MODAL */}
      {isEmailModalOpen && currentTeacher && mailContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Convocation par Email
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentTeacher.nom} {currentTeacher.prenom} ({currentTeacher.email || 'Email non renseigné'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destinataire :
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentTeacher.email || 'Aucune adresse renseignée (modifier dans Enseignants)'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Objet du message :
                </label>
                <input
                  type="text"
                  readOnly
                  value={mailContent.subject}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contenu du message (Texte Officiel) :
                </label>
                <textarea
                  readOnly
                  rows={9}
                  value={mailContent.body}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleCopyEmailText}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xs transition"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400">Texte copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copier le texte complet</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Fermer
                </button>
                <button
                  onClick={handleTriggerMailto}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ouvrir client Mail (mailto)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


