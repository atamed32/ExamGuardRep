import React from 'react';
import { 
  Teacher, 
  Exam, 
  Room, 
  InstitutionSettings, 
  Language, 
  RoleInExam 
} from '../../types';
import { translations } from '../../services/i18n';

interface OfficialDocumentCardProps {
  teacher: Teacher;
  exams: Exam[];
  rooms: Room[];
  settings: InstitutionSettings;
  language: Language;
  documentId?: string;
  isPrintOnly?: boolean;
}

export const OfficialDocumentCard: React.FC<OfficialDocumentCardProps> = ({
  teacher,
  exams,
  rooms,
  settings,
  language,
  documentId = `convocation-doc-${teacher.id}`,
  isPrintOnly = false
}) => {
  const t = translations[language];
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

  // Extract all surveillance slots for this teacher
  interface TeacherSlot {
    exam: Exam;
    roomName: string;
    roomCapacity: number;
    role: RoleInExam;
  }

  const assignedSlots: TeacherSlot[] = [];

  exams.forEach(exam => {
    exam.salles.forEach(salle => {
      const surv = salle.surveillants.find(s => s.teacherId === teacher.id);
      if (surv) {
        const room = roomMap.get(salle.roomId);
        assignedSlots.push({
          exam,
          roomName: room ? room.nom : salle.roomId,
          roomCapacity: room ? room.capacite : 0,
          role: surv.role
        });
      }
    });
  });

  // Sort slots by date, then time
  assignedSlots.sort((a, b) => {
    const dComp = a.exam.date.localeCompare(b.exam.date);
    if (dComp !== 0) return dComp;
    return a.exam.heureDebut.localeCompare(b.exam.heureDebut);
  });

  const currentDateFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div
      id={documentId}
      className={`bg-white text-slate-900 mx-auto transition-all official-document-print ${
        isPrintOnly ? 'page-break-after-always' : 'p-6 sm:p-7 rounded border border-slate-300 shadow-md max-w-3xl'
      }`}
      style={{
        minHeight: isPrintOnly ? 'auto' : '297mm',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* 1. Official Administrative Header */}
      <div className="text-center pb-3.5 border-b border-slate-300 keep-together">
        {settings.sloganBase64 && (
          <div className="flex justify-center items-center pb-2 mb-2">
            <img
              src={settings.sloganBase64}
              alt="Slogan / Logo de l'Université"
              className="max-h-16 max-w-[320px] object-contain"
            />
          </div>
        )}
        
        <div className="my-1.5 border-y border-double border-slate-300 py-1 inline-block px-4">
          <span className="text-xs font-bold font-serif text-slate-900 tracking-wide">
            {settings.universite.toUpperCase()} — {settings.departement.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-left text-[11px] font-medium text-slate-700 px-2 mt-1">
          <div>
            <p className="font-bold text-slate-800">{settings.faculteInstitut}</p>
          </div>

          <div className="text-right mt-1 sm:mt-0 font-mono text-[10px] text-slate-600">
            <span className="font-bold text-slate-800">Année : {settings.anneeUniversitaire}</span> • <span>{settings.semestreActuel}</span> • <span className="font-bold text-blue-900">{settings.sessionActuelle}</span>
          </div>
        </div>

        <h3 className="mt-3 font-bold text-base uppercase tracking-widest text-blue-900 underline underline-offset-4 decoration-1">
          Ordre de Convocation Individuelle
        </h3>
      </div>

      {/* 2. Teacher Identity Block */}
      <div className="my-3.5 px-4 py-2.5 bg-slate-50/80 rounded border border-slate-200 keep-together">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Nom & Prénom : </span>
            <span className="font-bold text-slate-900 uppercase">
              {teacher.nom} {teacher.prenom}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium">Grade : </span>
            <span className="font-semibold text-slate-800">{teacher.grade}</span>
          </div>

          <div>
            <span className="text-slate-500 font-medium">Département : </span>
            <span className="font-semibold text-slate-800">{teacher.departement}</span>
          </div>

          <div>
            <span className="text-slate-500 font-medium">Spécialité : </span>
            <span className="font-semibold text-slate-800">{teacher.specialite || 'Sciences & Technologies'}</span>
          </div>
        </div>
      </div>

      {/* 3. Structured Surveillance Schedule Table */}
      <div className="my-3.5 keep-together">
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 font-bold text-slate-800">
            <tr>
              <th className="border border-slate-400 p-2 text-left w-24">Date</th>
              <th className="border border-slate-400 p-2 text-left w-28">Horaire</th>
              <th className="border border-slate-400 p-2 text-left w-28">Salle / Amphi</th>
              <th className="border border-slate-400 p-2 text-left">Module / Responsable</th>
              <th className="border border-slate-400 p-2 text-left w-28">Niveau</th>
              <th className="border border-slate-400 p-2 text-center w-24">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {assignedSlots.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-400 p-6 text-center text-slate-500 italic">
                  Aucune séance de surveillance assignée pour cette session.
                </td>
              </tr>
            ) : (
              assignedSlots.map((slot, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="border border-slate-400 p-2 font-mono font-semibold">
                    {slot.exam.date}
                  </td>
                  <td className="border border-slate-400 p-2 font-mono font-semibold text-slate-900">
                    {slot.exam.heureDebut} - {slot.exam.heureFin}
                  </td>
                  <td className="border border-slate-400 p-2 font-bold text-slate-900">
                    {slot.roomName}
                  </td>
                  <td className="border border-slate-400 p-2">
                    <span className="font-bold text-slate-900">{slot.exam.nomModule}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">({slot.exam.codeModule})</span>
                  </td>
                  <td className="border border-slate-400 p-2 text-slate-700">
                    {slot.exam.niveau}
                  </td>
                  <td className="border border-slate-400 p-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        slot.role === 'Surveillant Principal'
                          ? 'bg-slate-800 text-white'
                          : slot.role === 'Responsable de Matière'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {slot.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-semibold px-1">
          <span>Nombre total de créneaux : {assignedSlots.length}</span>
          <span>Charge totale estimée : {assignedSlots.reduce((acc) => acc + 2, 0)}h</span>
        </div>
      </div>

      {/* 4. Official Instructions & Administrative Remarks */}
      <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded text-[10px] leading-relaxed text-slate-600 keep-together">
        <p className="font-bold text-slate-800 mb-1">CONSIGNES ET REMARQUES IMPORTANTES :</p>
        <ul className="list-disc ml-4 space-y-0.5">
          {settings.instructionsOfficielles.map((instruction, idx) => (
            <li key={idx}>
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5. Validation Block: Signature Section */}
      <div className="pt-4 mt-auto border-t border-slate-200 flex justify-between items-end keep-together">
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-700 text-[11px]">Émargement de l'enseignant :</p>
          <p className="text-[9px] text-slate-400 mt-0.5">« Lu et pris connaissance »</p>
          <div className="mt-8 border-b border-dashed border-slate-400 w-36" />
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-medium">
            Fait à {settings.lieu}, le {currentDateFormatted}
          </p>
          <div className="text-[10px] uppercase font-bold text-slate-700 mt-1">
            {settings.titreChefDepartement}
          </div>
          <div className="text-xs font-bold text-blue-900 mt-0.5">
            {settings.nomChefDepartement}
          </div>

          <div className="mt-2 font-serif italic text-xs border-t border-slate-300 pt-1 px-4 inline-block text-slate-600">
            Cachet et Signature
          </div>
        </div>
      </div>
    </div>
  );
};

