import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Teacher, Exam, Room, InstitutionSettings, SubjectModule, GradeType, SemesterType, SessionType } from '../types';
import { isElectron, getDesktopAPI } from './platform';

export class ExportUtils {
  /**
   * Generates a CSV file and triggers browser download.
   */
  static downloadCSV(filename: string, rows: string[][]): void {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export all teachers to CSV.
   */
  static exportTeachersCSV(teachers: Teacher[]): void {
    const headers = ['ID', 'Nom', 'Prénom', 'Grade', 'Département', 'Spécialité', 'Email', 'Téléphone', 'Quota Cible', 'Statut'];
    const rows = [
      headers,
      ...teachers.map(t => [
        t.id,
        t.nom,
        t.prenom,
        t.grade,
        t.departement,
        t.specialite,
        t.email,
        t.telephone,
        String(t.quotaSouhaite || 8),
        t.actif ? 'Actif' : 'Inactif'
      ])
    ];
    this.downloadCSV(`Enseignants_ExamGuard_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  /**
   * Export all rooms to CSV.
   */
  static exportRoomsCSV(rooms: Room[]): void {
    const headers = ['ID', 'Nom', 'Capacité Examen', 'Capacité Normale', 'Type', 'Bâtiment', 'Statut'];
    const rows = [
      headers,
      ...rooms.map(r => [
        r.id,
        r.nom,
        String(r.capaciteExamen || r.capacite || 40),
        String(r.capacite || 40),
        r.type || 'Salle TD',
        r.batiment || 'Standard',
        r.disponible !== false ? 'Disponible' : 'Indisponible'
      ])
    ];
    this.downloadCSV(`Salles_ExamGuard_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  /**
   * Universal CSV text parser supporting comma, semicolon, tab, and quotes.
   */
  static parseCSV(text: string): string[][] {
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const firstLine = cleanText.split('\n')[0] || '';
    
    // Auto-detect delimiter
    let delimiter = ',';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    if (semicolonCount > commaCount && semicolonCount >= tabCount) {
      delimiter = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = '\t';
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentVal.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    if (currentVal.length > 0 || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Import teachers from CSV string.
   */
  static importTeachersFromCSV(csvText: string, existingTeachers: Teacher[] = []): { success: boolean; teachers: Teacher[]; count: number; error?: string } {
    const rows = this.parseCSV(csvText);
    if (rows.length < 2) {
      return { success: false, teachers: [], count: 0, error: 'Le fichier CSV est vide ou ne contient pas de données.' };
    }

    const header = rows[0].map(h => h.toLowerCase().trim());
    const findIndex = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));

    const nomIdx = findIndex(['nom', 'name', 'last_name']);
    const prenomIdx = findIndex(['prénom', 'prenom', 'first_name']);
    const gradeIdx = findIndex(['grade', 'titre', 'rank']);
    const deptIdx = findIndex(['département', 'departement', 'dept']);
    const specIdx = findIndex(['spécialité', 'specialite', 'specialty']);
    const emailIdx = findIndex(['email', 'mail', 'courriel']);
    const telIdx = findIndex(['téléphone', 'telephone', 'phone', 'tel']);
    const quotaIdx = findIndex(['quota', 'cible', 'target']);

    if (nomIdx === -1) {
      return { success: false, teachers: [], count: 0, error: "La colonne 'Nom' est obligatoire dans le fichier CSV." };
    }

    const imported: Teacher[] = [];
    const seenNames = new Set(existingTeachers.map(t => `${t.nom.trim().toLowerCase()}_${t.prenom.trim().toLowerCase()}`));

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const nom = (row[nomIdx] || '').trim();
      if (!nom) continue;

      const prenom = prenomIdx !== -1 ? (row[prenomIdx] || '').trim() : '';
      const key = `${nom.toLowerCase()}_${prenom.toLowerCase()}`;
      if (seenNames.has(key)) continue;

      const gradeRaw = gradeIdx !== -1 ? (row[gradeIdx] || '').trim() : 'MAA';
      let grade: GradeType = 'Maître Assistant A (MAA)';
      const gLower = gradeRaw.toLowerCase();
      if (gLower.includes('prof') || gLower === 'pr' || gLower === 'pr.') grade = 'Professeur';
      else if (gLower.includes('mca') || gLower.includes('conférences a') || gLower.includes('conferences a')) grade = 'Maître de Conférences A (MCA)';
      else if (gLower.includes('mcb') || gLower.includes('conférences b') || gLower.includes('conferences b')) grade = 'Maître de Conférences B (MCB)';
      else if (gLower.includes('mab') || gLower.includes('assistant b')) grade = 'Maître Assistant B (MAB)';
      else if (gLower.includes('maa') || gLower.includes('assistant a')) grade = 'Maître Assistant A (MAA)';
      else if (gLower.includes('doct') || gLower.includes('vacat')) grade = 'Doctorant / Vacataire';

      const dept = deptIdx !== -1 ? (row[deptIdx] || 'Département de Technologie').trim() : 'Département de Technologie';
      const spec = specIdx !== -1 ? (row[specIdx] || '').trim() : '';
      const email = emailIdx !== -1 ? (row[emailIdx] || '').trim() : '';
      const tel = telIdx !== -1 ? (row[telIdx] || '').trim() : '';
      const quotaNum = quotaIdx !== -1 ? parseInt(row[quotaIdx] || '4', 10) : 4;

      const newTeacher: Teacher = {
        id: `t-import-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
        nom: nom.toUpperCase(),
        prenom,
        grade,
        departement: dept,
        specialite: spec,
        email,
        telephone: tel,
        quotaSouhaite: isNaN(quotaNum) ? 8 : quotaNum,
        actif: true
      };

      imported.push(newTeacher);
      seenNames.add(key);
    }

    return { success: true, teachers: imported, count: imported.length };
  }

  /**
   * Import subjects from CSV string.
   */
  static importSubjectsFromCSV(csvText: string, teachers: Teacher[] = [], existingSubjects: SubjectModule[] = []): { success: boolean; subjects: SubjectModule[]; count: number; error?: string } {
    const rows = this.parseCSV(csvText);
    if (rows.length < 2) {
      return { success: false, subjects: [], count: 0, error: 'Le fichier CSV est vide ou ne contient pas de données.' };
    }

    const header = rows[0].map(h => h.toLowerCase().trim());
    const findIndex = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));

    const codeIdx = findIndex(['code', 'code module', 'code_module']);
    const nomIdx = findIndex(['nom', 'module', 'nom du module', 'nom_module', 'matière', 'matiere']);
    const promoIdx = findIndex(['promotion', 'filière', 'filiere', 'niveau', 'promo']);
    const semIdx = findIndex(['semestre', 'sem']);
    const dureeIdx = findIndex(['durée', 'duree', 'minutes', 'duration']);
    const coefIdx = findIndex(['coefficient', 'coef']);
    const respIdx = findIndex(['responsable', 'enseignant responsable', 'resp']);

    if (nomIdx === -1 && codeIdx === -1) {
      return { success: false, subjects: [], count: 0, error: "Le fichier CSV doit contenir une colonne 'Code' ou 'Nom du Module'." };
    }

    const teacherMap = new Map<string, string>();
    teachers.forEach(t => {
      const full = `${t.nom.trim().toLowerCase()} ${t.prenom.trim().toLowerCase()}`;
      teacherMap.set(full, t.id);
      teacherMap.set(t.nom.trim().toLowerCase(), t.id);
      teacherMap.set(t.id, t.id);
    });

    const imported: SubjectModule[] = [];
    const seenCodes = new Set(existingSubjects.map(s => `${(s.code || s.codeModule || '').trim().toUpperCase()}_${(s.promotion || '').trim().toLowerCase()}`));

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const nom = nomIdx !== -1 ? (row[nomIdx] || '').trim() : '';
      const code = codeIdx !== -1 ? (row[codeIdx] || '').trim() : '';
      if (!nom && !code) continue;

      const promo = promoIdx !== -1 ? (row[promoIdx] || '1ère Année ST (1ST)').trim() : '1ère Année ST (1ST)';
      const key = `${(code || nom).toUpperCase()}_${promo.toLowerCase()}`;
      if (seenCodes.has(key)) continue;

      const semRaw = semIdx !== -1 ? (row[semIdx] || 'S1').trim().toUpperCase() : 'S1';
      const sem: SemesterType = semRaw.includes('2') || semRaw.includes('S2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)';
      const duree = dureeIdx !== -1 ? (parseInt(row[dureeIdx] || '90', 10) || 90) : 90;
      const coef = coefIdx !== -1 ? (parseFloat(row[coefIdx] || '2') || 2) : 2;

      let respId = '';
      if (respIdx !== -1) {
        const respText = (row[respIdx] || '').trim().toLowerCase();
        if (respText && respText !== 'non assigné' && respText !== 'non assigne') {
          respId = teacherMap.get(respText) || '';
          if (!respId) {
            for (const t of teachers) {
              if (respText.includes(t.nom.toLowerCase())) {
                respId = t.id;
                break;
              }
            }
          }
        }
      }

      const newSubject: SubjectModule = {
        id: `sub-import-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
        code: code || 'MOD',
        codeModule: code || 'MOD',
        nom: nom || code,
        nomModule: nom || code,
        promotion: promo,
        semestre: sem,
        dureeMinutes: duree,
        coefficient: coef,
        responsableId: respId,
        enseignantResponsableId: respId
      };

      imported.push(newSubject);
      seenCodes.add(key);
    }

    return { success: true, subjects: imported, count: imported.length };
  }

  /**
   * Import exams/planning from CSV string.
   */
  static importExamsFromCSV(csvText: string, teachers: Teacher[] = [], rooms: Room[] = [], existingExams: Exam[] = []): { success: boolean; exams: Exam[]; count: number; error?: string } {
    const rows = this.parseCSV(csvText);
    if (rows.length < 2) {
      return { success: false, exams: [], count: 0, error: 'Le fichier CSV est vide ou ne contient pas de données.' };
    }

    const header = rows[0].map(h => h.toLowerCase().trim());
    const findIndex = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));

    const codeIdx = findIndex(['code module', 'code', 'code_module']);
    const nomIdx = findIndex(['module', 'nom module', 'nom du module', 'nom_module', 'matière', 'matiere']);
    const dateIdx = findIndex(['date', 'jour']);
    const debutIdx = findIndex(['début', 'debut', 'heure debut', 'heure début', 'start']);
    const finIdx = findIndex(['fin', 'heure fin', 'end']);
    const semIdx = findIndex(['semestre', 'sem']);
    const sessIdx = findIndex(['session']);
    const niveauIdx = findIndex(['niveau', 'promotion', 'filière', 'promo']);
    const respIdx = findIndex(['responsable', 'resp']);

    if (nomIdx === -1 && codeIdx === -1) {
      return { success: false, exams: [], count: 0, error: "Le fichier CSV doit contenir une colonne 'Module' ou 'Code Module'." };
    }

    const teacherMap = new Map<string, string>();
    teachers.forEach(t => {
      const full = `${t.nom.trim().toLowerCase()} ${t.prenom.trim().toLowerCase()}`;
      teacherMap.set(full, t.id);
      teacherMap.set(t.nom.trim().toLowerCase(), t.id);
      teacherMap.set(t.id, t.id);
    });

    const imported: Exam[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const code = codeIdx !== -1 ? (row[codeIdx] || '').trim() : '';
      const nom = nomIdx !== -1 ? (row[nomIdx] || '').trim() : '';
      if (!code && !nom) continue;

      const date = dateIdx !== -1 ? (row[dateIdx] || '').trim() : '';
      const debut = debutIdx !== -1 ? (row[debutIdx] || '').trim() : '';
      const fin = finIdx !== -1 ? (row[finIdx] || '').trim() : '';
      const semRaw = semIdx !== -1 ? (row[semIdx] || 'S1').trim().toUpperCase() : 'S1';
      const sem: SemesterType = semRaw.includes('2') || semRaw.includes('S2') ? 'Semestre 2 (S2)' : 'Semestre 1 (S1)';
      const sessRaw = sessIdx !== -1 ? (row[sessIdx] || 'Ordinaire').trim() : 'Ordinaire';
      const session: SessionType = (sessRaw === 'Rattrapage' || sessRaw === 'Extraordinaire') ? sessRaw : 'Ordinaire';
      const niveau = niveauIdx !== -1 ? (row[niveauIdx] || '1ère Année ST (1ST)').trim() : '1ère Année ST (1ST)';

      let respId = '';
      if (respIdx !== -1) {
        const respText = (row[respIdx] || '').trim().toLowerCase();
        if (respText && respText !== 'non assigné' && respText !== 'non assigne') {
          respId = teacherMap.get(respText) || '';
          if (!respId) {
            for (const t of teachers) {
              if (respText.includes(t.nom.toLowerCase())) {
                respId = t.id;
                break;
              }
            }
          }
        }
      }

      const newExam: Exam = {
        id: `ex-import-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
        codeModule: code || 'MOD',
        nomModule: nom || code,
        date,
        heureDebut: debut,
        heureFin: fin,
        semestre: sem,
        session,
        niveau,
        responsableId: respId,
        salles: []
      };

      imported.push(newExam);
    }

    return { success: true, exams: imported, count: imported.length };
  }

  /**
   * Export exams planning to CSV.
   */
  static exportExamsCSV(exams: Exam[], teachers: Teacher[], rooms: Room[]): void {
    const teacherMap = new Map(teachers.map(t => [t.id, `${t.nom} ${t.prenom}`]));
    const roomMap = new Map(rooms.map(r => [r.id, r.nom]));

    const headers = ['Code Module', 'Module', 'Date', 'Début', 'Fin', 'Semestre', 'Session', 'Niveau', 'Responsable', 'Salles & Surveillants'];
    const rows = [
      headers,
      ...exams.map(ex => {
        const resp = teacherMap.get(ex.responsableId) || 'Non assigné';
        const sallesStr = ex.salles.map(s => {
          const roomName = roomMap.get(s.roomId) || s.roomId;
          const survs = s.surveillants.map(sv => `${teacherMap.get(sv.teacherId) || sv.teacherId} (${sv.role})`).join('; ');
          return `[${roomName}: ${survs}]`;
        }).join(' | ');

        return [
          ex.codeModule,
          ex.nomModule,
          ex.date,
          ex.heureDebut,
          ex.heureFin,
          ex.semestre,
          ex.session,
          ex.niveau,
          resp,
          sallesStr
        ];
      })
    ];
    this.downloadCSV(`Planning_Examens_ExamGuard_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  /**
   * Generates and downloads a complete, professional A4 landscape PDF of the full exams schedule.
   */
  static exportExamsSchedulePDF(
    exams: Exam[],
    teachers: Teacher[],
    rooms: Room[],
    settings?: InstitutionSettings,
    options?: {
      title?: string;
      sessionFilter?: string;
      dateFilter?: string;
      filename?: string;
    }
  ): void {
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const sortedExams = [...exams].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.heureDebut.localeCompare(b.heureDebut);
    });

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 12;
    const marginTop = 12;
    const marginBottom = 14;
    const contentWidth = pageWidth - marginX * 2; // 273mm

    // Column widths (sum = 273mm)
    const cols = [
      { id: 'datetime', header: 'Date & Horaire', width: 34 },
      { id: 'module', header: 'Module', width: 52 },
      { id: 'level', header: 'Niveau / Filière', width: 38 },
      { id: 'resp', header: 'Responsable de matière', width: 35 },
      { id: 'session', header: 'Session & Sem.', width: 28 },
      { id: 'surveillance', header: 'Locaux & Surveillants Assignés', width: 86 }
    ];

    const institution = settings || {
      republique: 'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
      ministere: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE",
      universite: 'UNIVERSITÉ DES SCIENCES ET DE LA TECHNOLOGIE',
      faculteInstitut: 'FACULTÉ DE GÉNIE ÉLECTRIQUE ET INFORMATIQUE',
      departement: 'DÉPARTEMENT DE TECHNOLOGIE',
      lieu: 'Alger',
      anneeUniversitaire: '2025/2026',
      semestreActuel: 'Semestre 1 (S1)',
      sessionActuelle: 'Ordinaire',
      nomChefDepartement: 'Pr. KHELIFA Abdelkrim',
      titreChefDepartement: 'Le Chef de Département',
      instructionsOfficielles: []
    };

    const drawHeader = (isFirstPage: boolean) => {
      let y = marginTop;

      if (isFirstPage) {
        // University Slogan Image if available
        if (institution.sloganBase64) {
          try {
            const imgWidth = 45;
            const imgHeight = 14;
            doc.addImage(institution.sloganBase64, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight, undefined, 'FAST');
            y += imgHeight + 2;
          } catch (e) {
            console.warn('Could not add slogan to PDF', e);
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(institution.universite.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.setFontSize(8);
        doc.text(institution.departement.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 3.5;
        doc.setFontSize(8);
        doc.text(institution.faculteInstitut.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 5;

        // Title box
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(marginX, y, contentWidth, 8, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        const titleText = options?.title || 'CALENDRIER OFFICIEL DES EXAMENS & PLANNING DE SURVEILLANCE';
        doc.text(titleText, pageWidth / 2, y + 5.5, { align: 'center' });
        y += 11;

        // Subtitle / metadata bar
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const dateStr = new Date().toLocaleDateString('fr-FR');
        const sessionInfo = options?.sessionFilter && options.sessionFilter !== 'ALL' 
          ? `Session : ${options.sessionFilter}` 
          : `Session : ${institution.sessionActuelle}`;
        const metaLeft = `Année Universitaire : ${institution.anneeUniversitaire}  |  ${institution.semestreActuel}  |  ${sessionInfo}`;
        const metaRight = `Total : ${sortedExams.length} épreuve(s)  |  Édité le : ${dateStr}`;
        doc.text(metaLeft, marginX, y);
        doc.text(metaRight, pageWidth - marginX, y, { align: 'right' });
        y += 4;
      } else {
        // Compact header on subsequent pages
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`${institution.universite} — ${institution.departement} | Planning des Examens (${institution.anneeUniversitaire})`, marginX, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Page suivante`, pageWidth - marginX, y, { align: 'right' });
        y += 5;
      }

      // Draw table header row
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginX, y, contentWidth, 7, 'F');
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, contentWidth, 7, 'S');

      let currentX = marginX;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      cols.forEach(col => {
        doc.text(col.header, currentX + 2, y + 4.8);
        currentX += col.width;
        if (currentX < marginX + contentWidth) {
          doc.line(currentX, y, currentX, y + 7);
        }
      });

      return y + 7;
    };

    let currentY = drawHeader(true);

    if (sortedExams.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Aucun examen programmé.', marginX + contentWidth / 2, currentY + 12, { align: 'center' });
    } else {
      sortedExams.forEach((exam, index) => {
        const resp = teacherMap.get(exam.responsableId);
        const respName = resp ? `${resp.nom} ${resp.prenom}` : 'Non assigné';

        // Prepare cell contents
        const dateLines = doc.splitTextToSize(`${exam.date}\n${exam.heureDebut} - ${exam.heureFin}`, cols[0].width - 4);
        const moduleLines = doc.splitTextToSize(exam.nomModule, cols[1].width - 4);
        const levelLines = doc.splitTextToSize(exam.niveau, cols[2].width - 4);
        const respLines = doc.splitTextToSize(respName, cols[3].width - 4);
        const sessionLines = doc.splitTextToSize(`${exam.session}\n${exam.semestre.split(' ')[0]}`, cols[4].width - 4);

        // Format rooms & surveillance string
        const survFormattedList: string[] = [];
        if (exam.salles.length === 0) {
          survFormattedList.push('Aucune salle affectée');
        } else {
          exam.salles.forEach(salle => {
            const roomObj = roomMap.get(salle.roomId);
            const rName = roomObj ? roomObj.nom : salle.roomId;
            const survsStr = salle.surveillants.map(sv => {
              const t = teacherMap.get(sv.teacherId);
              const name = t ? `${t.nom} ${t.prenom.charAt(0)}.` : sv.teacherId;
              const roleTag = sv.role === 'Surveillant Principal' ? '[P]' : sv.role === 'Responsable de Matière' ? '[Resp]' : '[Adj]';
              return `${name} ${roleTag}`;
            }).join(', ');
            survFormattedList.push(`${rName}: ${survsStr || 'Aucun surveillant'}`);
          });
        }
        const survText = survFormattedList.join('\n');
        const survLines = doc.splitTextToSize(survText, cols[5].width - 4);

        const lineCount = Math.max(
          dateLines.length,
          moduleLines.length,
          levelLines.length,
          sessionLines.length,
          respLines.length,
          survLines.length
        );

        const rowHeight = Math.max(7, lineCount * 3.6 + 3);

        // Check page overflow
        if (currentY + rowHeight > pageHeight - marginBottom - 12) {
          doc.addPage();
          currentY = drawHeader(false);
        }

        // Row background (zebra striping)
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
        }

        // Draw row border
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.rect(marginX, currentY, contentWidth, rowHeight, 'S');

        // Draw vertical column separators
        let colX = marginX;
        cols.forEach(col => {
          colX += col.width;
          if (colX < marginX + contentWidth) {
            doc.line(colX, currentY, colX, currentY + rowHeight);
          }
        });

        // Draw text inside cells
        let x = marginX;

        // 1. Date & Time
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(dateLines[0] || '', x + 2, currentY + 3.8);
        if (dateLines.length > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text(dateLines.slice(1), x + 2, currentY + 7.4);
        }
        x += cols[0].width;

        // 2. Module
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(moduleLines[0] || '', x + 2, currentY + 3.8);
        if (moduleLines.length > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(79, 70, 229); // indigo-600
          doc.text(moduleLines.slice(1), x + 2, currentY + 7.4);
        }
        x += cols[1].width;

        // 3. Niveau
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(51, 65, 85);
        doc.text(levelLines, x + 2, currentY + 3.8);
        x += cols[2].width;

        // 4. Responsable de matière
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(30, 41, 59);
        doc.text(respLines, x + 2, currentY + 3.8);
        x += cols[3].width;

        // 5. Session & Semestre
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(exam.session === 'Rattrapage' ? 180 : 30, exam.session === 'Rattrapage' ? 83 : 41, 59);
        doc.text(sessionLines[0] || '', x + 2, currentY + 3.8);
        if (sessionLines.length > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(100, 116, 139);
          doc.text(sessionLines.slice(1), x + 2, currentY + 7.4);
        }
        x += cols[4].width;

        // 6. Locaux & Surveillants
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 41, 59);
        doc.text(survLines, x + 2, currentY + 3.6);

        currentY += rowHeight;
      });
    }

    // Add Signature on the last page if space permits, else add page
    if (currentY + 22 > pageHeight - marginBottom) {
      doc.addPage();
      currentY = drawHeader(false);
    }

    currentY += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 4;

    // Left: Date aligned with signature block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`${institution.lieu ? `${institution.lieu}, ` : ''}le ${new Date().toLocaleDateString('fr-FR')}`, marginX, currentY);

    // Right: Signature Block
    const signX = pageWidth - marginX - 70;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(institution.titreChefDepartement, signX, currentY);
    currentY += 3.5;
    doc.setTextColor(30, 41, 59);
    doc.text(institution.nomChefDepartement, signX, currentY);
    currentY += 3;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Signature & Cachet Officiel)', signX, currentY);

    // Footers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Center
      doc.text('Document Administratif Officiel', pageWidth / 2, pageHeight - 6, { align: 'center' });

      // Right
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
    }

    const downloadName = options?.filename || `Planning_Examens_ExamGuard_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(downloadName);
  }

  /**
   * Helper to format teacher grade cleanly
   */
  private static formatGrade(grade?: string): string {
    if (!grade) return 'Dr.';
    const g = grade.trim();
    if (g === 'Professeur' || g === 'PR') return 'Pr.';
    if (g.startsWith('MCA') || g.includes('Maître de Conférences A')) return 'Dr. (MCA)';
    if (g.startsWith('MCB') || g.includes('Maître de Conférences B')) return 'Dr. (MCB)';
    if (g.startsWith('MAA') || g.includes('Maître Assistant A')) return 'M./Mme (MAA)';
    if (g.startsWith('MAB') || g.includes('Maître Assistant B')) return 'M./Mme (MAB)';
    if (g.startsWith('Doctorant')) return 'Doctorant';
    return g;
  }

  /**
   * Generates and downloads a high-precision, official A4 portrait PDF for an individual teacher's convocation.
   */
  static exportTeacherConvocationPDF(
    teacher: Teacher,
    exams: Exam[],
    rooms: Room[],
    settings?: InstitutionSettings,
    filename?: string,
    existingDoc?: jsPDF,
    teachers: Teacher[] = []
  ): jsPDF {
    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const teacherMap = new Map((teachers.length > 0 ? teachers : [teacher]).map(item => [item.id, item]));

    const formatResponsableName = (exam: Exam): string => {
      const fromId = exam.responsableId ? teacherMap.get(exam.responsableId) : undefined;
      if (fromId) {
        return `${fromId.nom} ${fromId.prenom}`.trim();
      }
      for (const salle of exam.salles || []) {
        const sv = (salle.surveillants || []).find(s => s.role === 'Responsable de Matière');
        if (sv) {
          const found = teacherMap.get(sv.teacherId);
          if (found) return `${found.nom} ${found.prenom}`.trim();
        }
      }
      return '';
    };
    const institution: InstitutionSettings = settings || {
      republique: 'RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE',
      ministere: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE",
      universite: 'UNIVERSITÉ DES SCIENCES ET DE LA TECHNOLOGIE',
      faculteInstitut: 'FACULTÉ DE GÉNIE ÉLECTRIQUE ET INFORMATIQUE',
      departement: 'DÉPARTEMENT DE TECHNOLOGIE',
      lieu: 'Alger',
      anneeUniversitaire: '2025/2026',
      semestreActuel: 'Semestre 1 (S1)',
      sessionActuelle: 'Ordinaire',
      nomChefDepartement: 'Pr. KHELIFA Abdelkrim',
      titreChefDepartement: 'Le Chef de Département',
      instructionsOfficielles: [
        'Présence obligatoire 15 minutes avant le début de l\'épreuve dans le local assigné.',
        'Vérification stricte de l\'identité des étudiants (Carte d\'étudiant valide obligatoire).',
        'Interdiction totale des téléphones portables et objets connectés dans les salles d\'examen.',
        'Émargement des feuilles de présence par tous les candidats présents avant la fin de l\'épreuve.',
        'Remise immédiate des copies et du procès-verbal au secrétariat du département à la clôture de l\'épreuve.'
      ]
    };

    // Extract all surveillances for this teacher
    interface TeacherSlot {
      exam: Exam;
      roomName: string;
      roomCapacity: number;
      role: string;
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

    // Sort by date, then start time
    assignedSlots.sort((a, b) => {
      const dComp = a.exam.date.localeCompare(b.exam.date);
      if (dComp !== 0) return dComp;
      return a.exam.heureDebut.localeCompare(b.exam.heureDebut);
    });

    const doc = existingDoc || new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2; // 182mm
    let y = 12;

    // 1. Administrative Top Header (University slogan if present)
    if (institution.sloganBase64) {
      try {
        const imgWidth = 45;
        const imgHeight = 14;
        doc.addImage(institution.sloganBase64, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight, undefined, 'FAST');
        y += imgHeight + 2;
      } catch (e) {
        console.warn('Could not add slogan to PDF', e);
      }
    }

    // Institution Banner Box — university, then department immediately below
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentWidth, 16, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text((institution.universite || '').toUpperCase(), pageWidth / 2, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text((institution.departement || '').toUpperCase(), pageWidth / 2, y + 9.5, { align: 'center' });

    if (institution.faculteInstitut) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(institution.faculteInstitut, pageWidth / 2, y + 13.5, { align: 'center' });
    }
    y += 20;

    // 2. Title Box: CONVOCATION OFFICIELLE
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(marginX, y, contentWidth, 9, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('CONVOCATION DE SURVEILLANCE DES EXAMENS', pageWidth / 2, y + 6.2, { align: 'center' });
    y += 12;

    // Subtitle / Session Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const sessionStr = `Session : ${institution.sessionActuelle || 'Ordinaire'} • ${institution.semestreActuel || 'S1'} — Année Universitaire : ${institution.anneeUniversitaire || '2025/2026'}`;
    doc.text(sessionStr, pageWidth / 2, y, { align: 'center' });
    y += 5;

    // 3. Teacher Information Card
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, y, contentWidth, 18, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const teacherTitle = `${this.formatGrade(teacher.grade)} ${teacher.nom.toUpperCase()} ${teacher.prenom}`;
    doc.text(`Enseignant(e) : ${teacherTitle}`, marginX + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Département : ${teacher.departement || institution.departement || 'Technologie'}`, marginX + 4, y + 10.5);
    doc.text(`Grade académique : ${teacher.grade || 'Enseignant'}`, marginX + 4, y + 15);

    const currentDateFormatted = new Date().toLocaleDateString('fr-FR');
    doc.text(`Édité le : ${currentDateFormatted}`, marginX + contentWidth - 4, y + 5.5, { align: 'right' });
    doc.text(`Email : ${teacher.email || 'Non renseigné'}`, marginX + contentWidth - 4, y + 10.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text(`Surveillances assignées : ${assignedSlots.length}`, marginX + contentWidth - 4, y + 15, { align: 'right' });
    y += 22;

    // 4. Assigned Slots Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PLANNING DÉTAILLÉ DES SURVEILLANCES ASSIGNÉES', marginX, y);
    y += 3;

    // Table Column Widths (Sum = 182mm) — same order as on-screen convocation
    const tCols = [
      { header: 'Date', width: 24, align: 'left' as const },
      { header: 'Horaire', width: 28, align: 'left' as const },
      { header: 'Salle / Amphi', width: 30, align: 'left' as const },
      { header: 'Module', width: 40, align: 'left' as const },
      { header: 'Niveau', width: 28, align: 'left' as const },
      { header: 'Responsable de matière', width: 32, align: 'left' as const }
    ];

    // Table Header
    const headerHeight = 10;
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(marginX, y, contentWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let curX = marginX;
    tCols.forEach(c => {
      const headerLines = doc.splitTextToSize(c.header, c.width - 3);
      doc.text(headerLines, curX + 1.5, y + 4);
      curX += c.width;
    });
    y += headerHeight;

    if (assignedSlots.length === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(marginX, y, contentWidth, 12, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Aucune surveillance programmée pour cette session.', pageWidth / 2, y + 7.5, { align: 'center' });
      y += 12;
    } else {
      assignedSlots.forEach((slot, index) => {
        const rowBg = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.25);
        doc.rect(marginX, y, contentWidth, 8, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);

        let rx = marginX;
        const clip = (text: string, maxChars: number) =>
          text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

        // 1. Date
        doc.setFont('helvetica', 'bold');
        doc.text(slot.exam.date || '', rx + 2, y + 5.2);
        rx += tCols[0].width;

        // 2. Horaire
        doc.setFont('helvetica', 'normal');
        doc.text(`${slot.exam.heureDebut} - ${slot.exam.heureFin}`, rx + 2, y + 5.2);
        rx += tCols[1].width;

        // 3. Salle / Amphi
        doc.setFont('helvetica', 'bold');
        doc.text(clip(slot.roomName || '', 18), rx + 2, y + 5.2);
        rx += tCols[2].width;

        // 4. Module (name only, no module code)
        doc.setFont('helvetica', 'bold');
        doc.text(clip(slot.exam.nomModule || '', 24), rx + 2, y + 5.2);
        rx += tCols[3].width;

        // 5. Niveau
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(clip(slot.exam.niveau || '', 16), rx + 2, y + 5.2);
        rx += tCols[4].width;

        // 6. Responsable de matière
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(clip(formatResponsableName(slot.exam), 18), rx + 2, y + 5.2);

        y += 8;
      });
    }
    y += 4;

    // 5. Official Regulatory Instructions Box
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(254, 240, 138); // amber-200
    doc.setLineWidth(0.3);
    const instructions = institution.instructionsOfficielles && institution.instructionsOfficielles.length > 0
      ? institution.instructionsOfficielles
      : [
        'Présence obligatoire 15 minutes avant le début de l\'épreuve dans le local assigné.',
        'Vérification stricte de l\'identité des étudiants (Carte d\'étudiant valide obligatoire).',
        'Interdiction totale des téléphones portables et objets connectés dans les salles d\'examen.',
        'Émargement des feuilles de présence par tous les candidats présents avant la fin de l\'épreuve.',
        'Remise immédiate des copies et du procès-verbal au secrétariat du département à la clôture de l\'épreuve.'
      ];

    const instrBoxHeight = Math.min(36, 8 + instructions.length * 4.2);
    doc.roundedRect(marginX, y, contentWidth, instrBoxHeight, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text('CONSIGNES & INSTRUCTIONS RÉGLEMENTAIRES IMPORTANTES :', marginX + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(69, 26, 3);
    let iy = y + 8.5;
    instructions.slice(0, 5).forEach((instr, idx) => {
      const line = `${idx + 1}. ${instr}`;
      const splitLines = doc.splitTextToSize(line, contentWidth - 6);
      doc.text(splitLines[0] || '', marginX + 3, iy);
      iy += 4.2;
    });
    y += instrBoxHeight + 6;

    // 6. Signatures & Stamp Block
    const signBoxY = Math.max(y, pageHeight - 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lieuDate = `Fait à ${institution.lieu || 'Alger'}, le ${currentDateFormatted}`;
    doc.text(lieuDate, marginX + contentWidth - 4, signBoxY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(institution.titreChefDepartement || 'Le Chef de Département :', marginX + contentWidth - 4, signBoxY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(institution.nomChefDepartement || 'Pr. KHELIFA Abdelkrim', marginX + contentWidth - 4, signBoxY + 11, { align: 'right' });

    // Cachet / Signature box outline
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX + contentWidth - 52, signBoxY + 14, 50, 18, 1, 1, 'S');

    if (institution.cachetBase64) {
      try {
        doc.addImage(institution.cachetBase64, 'PNG', marginX + contentWidth - 50, signBoxY + 15, 46, 16);
      } catch (e) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('[Cachet & Signature]', marginX + contentWidth - 27, signBoxY + 24, { align: 'center' });
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('[Cachet & Signature]', marginX + contentWidth - 27, signBoxY + 24, { align: 'center' });
    }

    // Teacher acknowledgement box on left
    doc.roundedRect(marginX + 2, signBoxY + 14, 52, 18, 1, 1, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Signature de l\'enseignant(e) :', marginX + 5, signBoxY + 18);
    doc.text('(Pour accusé de réception)', marginX + 5, signBoxY + 22);

    // Footer copyright / security hash
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ExamGuard • Système Universitaire de Gestion des Examens & Convocations', marginX, pageHeight - 6);
    doc.text('Document certifié conforme', marginX + contentWidth, pageHeight - 6, { align: 'right' });

    if (!existingDoc) {
      const defaultFilename = `Convocation_${teacher.nom}_${teacher.prenom}_${(institution.anneeUniversitaire || '2025-2026').replace(/[\s/]+/g, '_')}.pdf`;
      doc.save(filename || defaultFilename);
    }

    return doc;
  }

  /**
   * Generates a single multi-page PDF containing all teachers' convocations.
   */
  static exportAllTeacherConvocationsPDF(
    teachers: Teacher[],
    exams: Exam[],
    rooms: Room[],
    settings?: InstitutionSettings,
    filename?: string
  ): void {
    if (teachers.length === 0) return;

    let doc: jsPDF | null = null;

    teachers.forEach((teacher, idx) => {
      if (idx === 0) {
        doc = this.exportTeacherConvocationPDF(teacher, exams, rooms, settings, undefined, undefined, teachers);
      } else if (doc) {
        doc.addPage();
        this.exportTeacherConvocationPDF(teacher, exams, rooms, settings, undefined, doc, teachers);
      }
    });

    if (doc) {
      const fileDate = new Date().toISOString().slice(0, 10);
      const downloadName = filename || `Lot_Convocations_Complet_${fileDate}.pdf`;
      (doc as jsPDF).save(downloadName);
    }
  }

  /**
   * Capture an HTML element as PNG image.
   */
  static async exportElementAsImage(elementId: string, filename: string): Promise<{ success: boolean; message?: string }> {
    // Try to get the element with retries in case of timing issues
    let element = document.getElementById(elementId);
    let attempts = 0;
    const maxAttempts = 3;

    while (!element && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      element = document.getElementById(elementId);
      attempts++;
    }

    if (!element) {
      return { success: false, message: `Élément introuvable pour l'export d'image après ${maxAttempts} tentatives. ID: ${elementId}` };
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#0f172a';
          clonedEl.style.boxShadow = 'none';
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (err) {
      console.warn('html2canvas failed, attempting SVG canvas fallback', err);
      try {
        const rect = element.getBoundingClientRect();
        const width = Math.max(element.scrollWidth, Math.round(rect.width)) || 800;
        const height = Math.max(element.scrollHeight, Math.round(rect.height)) || 1100;

        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const cloned = element.cloneNode(true) as HTMLElement;
        cloned.style.backgroundColor = '#ffffff';
        cloned.style.color = '#0f172a';

        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${cloned.outerHTML}
            </div>
          </foreignObject>
        </svg>`;

        const img = new Image();
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
          };
          img.src = url;
        });

        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true };
      } catch (fallbackErr) {
        console.error('All image export approaches failed', fallbackErr);
        return { success: false, message: "Erreur lors de la capture d'image." };
      }
    }
  }

  /**
   * Export an HTML element as high resolution A4 PDF (Portrait or Landscape).
   */
  static async exportElementAsPDF(
    elementId: string, 
    filename: string, 
    orientation: 'portrait' | 'landscape' = 'landscape'
  ): Promise<{ success: boolean; message?: string }> {
    const element = document.getElementById(elementId);
    if (!element) {
      return { success: false, message: "Élément introuvable pour l'export PDF." };
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#000000';
          clonedEl.style.boxShadow = 'none';
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = orientation === 'landscape' ? 297 : 210;
      const pageHeight = orientation === 'landscape' ? 210 : 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      return { success: true };
    } catch (err) {
      console.error('Error generating PDF with html2canvas', err);
      return { success: false, message: 'Erreur lors de la génération du document PDF.' };
    }
  }

  /**
   * Generates email content structure and mailto URL for an individual teacher.
   */
  static getTeacherScheduleMailContent(
    teacher: Teacher,
    settings: InstitutionSettings,
    surveillances: { exam: Exam; roomName: string; role: string }[]
  ): { recipient: string; subject: string; body: string; mailtoUrl: string } {
    const subject = `[${settings.departement}] Convocation de surveillance - ${settings.sessionActuelle} ${settings.anneeUniversitaire}`;
    
    let body = `Bonjour Professeur / Dr. ${teacher.nom} ${teacher.prenom},\n\n`;
    body += `Veuillez trouver ci-dessous votre planning individuel de surveillance pour la session ${settings.sessionActuelle} (${settings.semestreActuel}) - Année ${settings.anneeUniversitaire} :\n\n`;
    
    if (surveillances.length === 0) {
      body += `Aucune surveillance programmée pour cette session.\n\n`;
    } else {
      surveillances.forEach((s, idx) => {
        body += `${idx + 1}. Date : ${s.exam.date} de ${s.exam.heureDebut} à ${s.exam.heureFin}\n`;
        body += `   Module : ${s.exam.nomModule} (${s.exam.niveau})\n`;
        body += `   Lieu : ${s.roomName} | Rôle : ${s.role}\n\n`;
      });
    }

    body += `Instructions officielles :\n`;
    (settings.instructionsOfficielles || []).forEach(instr => {
      body += `- ${instr}\n`;
    });
    body += `\nCordialement,\n${settings.titreChefDepartement}\n${settings.universite}`;

    const mailtoUrl = `mailto:${teacher.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return {
      recipient: teacher.email || '',
      subject,
      body,
      mailtoUrl
    };
  }

  /**
   * Generates a mailto: link for an individual teacher with their full schedule.
   */
  static sendTeacherScheduleMail(
    teacher: Teacher,
    settings: InstitutionSettings,
    surveillances: { exam: Exam; roomName: string; role: string }[]
  ): void {
    const { mailtoUrl } = this.getTeacherScheduleMailContent(teacher, settings, surveillances);
    try {
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.location.href = mailtoUrl;
    }
  }

  /**
   * Export all subjects to CSV.
   */
  static exportSubjectsCSV(subjects: any[], teacherMap: Map<string, any>): void {
    const headers = ['Code Module', 'Nom du Module', 'Promotion / Filière', 'Semestre', 'Durée (Min)', 'Coefficient', 'Enseignant Responsable'];
    const rows = [
      headers,
      ...subjects.map(s => {
        const resp = s.enseignantResponsableId ? teacherMap.get(s.enseignantResponsableId) : undefined;
        const respName = resp ? `${resp.nom} ${resp.prenom}` : 'Non assigné';
        return [
          s.code || s.codeModule || '',
          s.nom || s.nomModule || '',
          s.promotion || '',
          s.semestre || 'S1',
          String(s.dureeMinutes || 90),
          String(s.coefficient || 2),
          respName
        ];
      })
    ];
    this.downloadCSV(`Catalogue_Matieres_ExamGuard_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  /**
   * Export all subjects to JSON file.
   */
  static exportSubjectsJSON(subjects: any[]): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(subjects, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Catalogue_Matieres_ExamGuard_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Reliably prints the official exam timetable in A4 Landscape.
   * Isolates the document, applies temporary print rules, and falls back to PDF if window.print is restricted.
   */
  static async printOfficialPlanning(
    elementId: string = 'official-exam-timetable-document',
    title: string = 'Planning des Examens'
  ): Promise<{ success: boolean; fallbackUsed?: boolean }> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Élément #${elementId} non trouvé pour l'impression.`);
      return { success: false };
    }

    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    // 1. Inject temporary @page landscape style rule into document head
    const styleId = 'official-planning-print-page-style';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
      @page {
        size: A4 landscape !important;
        margin: 5mm 7mm 5mm 7mm !important;
      }
    `;

    document.body.classList.add('printing-official-planning');
    const prevTitle = document.title;
    document.title = title;

    let printFailed = false;

    const cleanup = () => {
      document.body.classList.remove('printing-official-planning');
      document.title = prevTitle;
      if (styleTag && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag);
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    try {
      window.print();
    } catch (err) {
      console.warn('window.print() a rencontré une restriction, basculement vers export PDF:', err);
      printFailed = true;
    }

    // Safety timeout cleanup if afterprint does not fire
    setTimeout(cleanup, 2000);

    // In sandboxed iframes (like AI Studio preview), window.print() is blocked by browser policies without throwing.
    // Exporting as official A4 PDF ensures users always get their complete, printable schedule without interruption.
    if (isInIframe || printFailed) {
      const cleanFilename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const pdfRes = await ExportUtils.exportElementAsPDF(elementId, cleanFilename, 'landscape');
      return { success: pdfRes.success, fallbackUsed: true };
    }

    return { success: true };
  }

  /**
   * Reliably prints a specific DOM element (like an official timetable or convocation)
   * by rendering it in an isolated print container to prevent parent application bleeding.
   */
  static printElement(elementId: string, title: string = 'Planning des Examens'): void {
    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return;
    }

    // Direct invocation with official landscape print helper if it's the official planning document
    if (elementId === 'official-exam-timetable-document') {
      ExportUtils.printOfficialPlanning(elementId, title);
      return;
    }

    try {
      window.print();
    } catch (err) {
      console.error('Print element failed, fallback to PDF', err);
      ExportUtils.exportElementAsPDF(elementId, `${title}.pdf`, 'landscape');
    }
  }

  /**
   * Generates and exports individual A4 PDF files for each teacher into a target folder (Desktop) or downloads in sequence.
   */
  static async batchExportIndividualConvocationsPDF(
    teachers: Teacher[],
    exams: Exam[],
    rooms: Room[],
    settings?: InstitutionSettings,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: boolean; savedCount: number; targetDir?: string; error?: string }> {
    if (teachers.length === 0) {
      return { success: false, savedCount: 0, error: 'Aucun enseignant sélectionné.' };
    }

    const convocationsData: Array<{ teacherName: string; filename: string; base64Pdf: string }> = [];

    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      if (onProgress) onProgress(i + 1, teachers.length);

      const cleanNom = (teacher.nom || '').trim().replace(/\s+/g, '_');
      const cleanPrenom = (teacher.prenom || '').trim().replace(/\s+/g, '_');
      const filename = `Convocation_${cleanNom}_${cleanPrenom}.pdf`;

      const doc = this.exportTeacherConvocationPDF(teacher, exams, rooms, settings, undefined, undefined, teachers);
      const dataUri = doc.output('datauristring');
      convocationsData.push({
        teacherName: `${teacher.nom} ${teacher.prenom}`,
        filename,
        base64Pdf: dataUri
      });
    }

    if (isElectron()) {
      const desktop = getDesktopAPI();
      if (desktop?.print?.batchExportConvocations) {
        return await desktop.print.batchExportConvocations(convocationsData);
      }
    }

    // Fallback in web browser: download the unified multi-page lot PDF
    this.exportAllTeacherConvocationsPDF(teachers, exams, rooms, settings);
    return { success: true, savedCount: teachers.length };
  }

  /**
   * Opens standard system print dialog or invokes native Electron printing.
   */
  static triggerPrint(): void {
    if (isElectron()) {
      const desktop = getDesktopAPI();
      if (desktop?.print?.print) {
        desktop.print.print({ silent: false, printBackground: true });
        return;
      }
    }
    window.print();
  }
}


