import React, { useState, useEffect, useMemo } from 'react';
import { 
  Teacher, 
  Exam, 
  Room, 
  Substitution, 
  ExamAttendance, 
  InstitutionSettings, 
  Language, 
  ToastMessage,
  PromotionGroup,
  SubjectModule,
  TimeOffEntry,
  GlobalConstraints,
  SessionConfig,
  GenerationResult,
  ThemeMode,
  ThemeSettings,
  AccentColor
} from './types';
import { StorageService } from './services/storage';
import { ConflictEngine } from './services/conflictEngine';
import { translations } from './services/i18n';
import { initialSubjects } from './data/demoData';
import { isElectron, getDesktopAPI } from './services/platform';

// Layout & Ribbon
import { Ribbon, RibbonTab } from './components/layout/Ribbon';
import { ToastContainer } from './components/common/Toast';
import { CommandPalette } from './components/common/CommandPalette';
import { CascadeImpactModal } from './components/common/CascadeImpactModal';
import { useAppStore } from './context/AppContext';

// Timetable & Views
import { TimetableView } from './components/timetable/TimetableView';
import { TimeOffView } from './components/constraints/TimeOffView';
import { GlobalConstraintsView } from './components/constraints/GlobalConstraintsView';
import { AutoGeneratorModal } from './components/generator/AutoGeneratorModal';
import { VerificationView } from './components/verification/VerificationView';
import { SessionWizard } from './components/settings/SessionWizard';

// Data Management Views
import { TeachersView } from './components/teachers/TeachersView';
import { TeacherModal } from './components/teachers/TeacherModal';
import { ExamsView } from './components/exams/ExamsView';
import { ExamModal } from './components/exams/ExamModal';
import { RoomsView } from './components/rooms/RoomsView';
import { RoomModal } from './components/rooms/RoomModal';
import { RoomAssignmentModal } from './components/rooms/RoomAssignmentModal';
import { PromotionsView } from './components/promotions/PromotionsView';
import { SubjectsView } from './components/subjects/SubjectsView';
import { AboutModal } from './components/common/AboutModal';

// Convocations & Operational Views
import { ConvocationView } from './components/convocations/ConvocationView';
import { BatchConvocationsModal } from './components/convocations/BatchConvocationsModal';
import { SubstitutionsView } from './components/substitutions/SubstitutionsView';
import { SubstitutionModal } from './components/substitutions/SubstitutionModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { UtilitiesView } from './components/utilities/UtilitiesView';
import { SettingsView } from './components/settings/SettingsView';

export function App() {
  // 1. Primary Domain Store
  const store = useAppStore();
  const {
    teachers,
    exams,
    rooms,
    promotions,
    subjects,
    timeOffConstraints,
    globalConstraints,
    sessionConfig,
    substitutions,
    attendances,
    settings,
    language,
    toasts,
    cascadeAlert,
    conflicts,
    timetableDates,
    timetableSlots,
    saveTeacher,
    deleteTeacher,
    saveRoom,
    deleteRoom,
    savePromotion,
    updatePromotions,
    deletePromotion,
    saveSubject,
    updateSubjects,
    deleteSubject,
    deleteSubjectGroup,
    saveExam,
    updateExams,
    deleteExam,
    saveTimeSlot,
    deleteTimeSlot,
    updateSessionConfig,
    updateTimeOff,
    updateGlobalConstraints,
    updateSubstitutions,
    updateAttendances,
    updateSettings,
    setLanguage,
    addToast,
    removeToast,
    setCascadeAlert,
    dismissCascadeAlert,
    reloadFromStorage,
    clearAllReports,
    clearAllDataAndReportsAndSaveDefaults
  } = store;

  // Theme Mode & Visual Styling State (Default to Light)
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    try {
      const defaultLightInitialized = localStorage.getItem('asc_theme_default_light_v1');
      if (!defaultLightInitialized) {
        localStorage.setItem('asc_theme_default_light_v1', 'true');
        localStorage.setItem('asc_theme_settings', JSON.stringify({ mode: 'light', accent: 'emerald', contrast: 'normal' }));
        return { mode: 'light', accent: 'emerald', contrast: 'normal' };
      }
      const saved = localStorage.getItem('asc_theme_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { mode: 'light', accent: 'emerald', contrast: 'normal' };
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeSettings.mode);
    root.setAttribute('data-accent', themeSettings.accent);
    root.setAttribute('data-contrast', themeSettings.contrast);
    if (themeSettings.mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('asc_theme_settings', JSON.stringify(themeSettings));
    } catch (e) {}
  }, [themeSettings]);

  // Desktop Integration Effect (Electron)
  useEffect(() => {
    if (!isElectron()) return;

    // 1. Initialize Desktop Sync
    StorageService.initDesktopSync();

    // 2. Listen for files opened with ExamGuard (drag & drop / double click)
    const desktop = getDesktopAPI();
    if (desktop?.app?.onFileOpen) {
      const unsubscribe = desktop.app.onFileOpen((filePath, content) => {
        try {
          const success = StorageService.importFullBackupJSON(content);
          if (success) {
            reloadFromStorage();
            addToast('success', 'Projet Ouvert', `Fichier chargé avec succès : ${filePath}`);
          } else {
            addToast('error', 'Erreur Ouverture', 'Le fichier sélectionné est invalide ou corrompu.');
          }
        } catch (err) {
          addToast('error', 'Erreur', 'Impossible de lire le fichier de projet.');
        }
      });
      return () => {
        unsubscribe();
      };
    }

    // 3. Cleanup: Remove non-existent room C10 if present
    try {
      const roomsKey = 'examguard_rooms_v1';
      const roomsData = localStorage.getItem(roomsKey);
      if (roomsData) {
        const rooms = JSON.parse(roomsData);
        if (Array.isArray(rooms)) {
          const filteredRooms = rooms.filter(room => room.nom !== 'C10');
          if (filteredRooms.length !== rooms.length) {
            localStorage.setItem(roomsKey, JSON.stringify(filteredRooms));
            // Also sync to desktop if in Electron
            if (isElectron()) {
              const desktop = getDesktopAPI();
              desktop?.storage?.setItem(roomsKey, JSON.stringify(filteredRooms)).catch(e => {
                console.warn('Failed to mirror storage to desktop:', e);
              });
            }
            addToast('info', 'Nettoyage effectué', 'La salle C10 inexistante a été supprimée du stockage.');
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Error during room C10 cleanup:', cleanupError);
    }
  }, [reloadFromStorage, addToast]);

  // 2. Navigation & Ribbon Tabs
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>('timetable');
  const [activeView, setActiveView] = useState<string>('timetable-global');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Selected teacher for Convocation view
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => teachers[0]?.id || '');

  // Keep selected teacher valid if deleted
  useEffect(() => {
    if (teachers.length > 0 && !teachers.some(t => t.id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0]?.id || '');
    }
  }, [teachers, selectedTeacherId]);

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Partial<Exam> | Exam | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);

  const [isRoomAssignmentModalOpen, setIsRoomAssignmentModalOpen] = useState(false);
  const [roomAssignmentOptions, setRoomAssignmentOptions] = useState<{
    examId?: string;
    roomId?: string;
    promoName?: string;
    subjectCode?: string;
    subjectNom?: string;
    promoNames?: string[];
  }>({});

  const handleOpenRoomAssignment = (options?: {
    examId?: string;
    roomId?: string;
    promoName?: string;
    subjectCode?: string;
    subjectNom?: string;
    promoNames?: string[];
  }) => {
    setRoomAssignmentOptions(options || {});
    setIsRoomAssignmentModalOpen(true);
  };

  const handleSaveRoomAssignment = (updatedExams: Exam[]) => {
    handleUpdateExams(updatedExams);
    addToast('success', 'Affectation de salles enregistrée', `${updatedExams.length} examen(s) / promotion(s) programmés avec succès.`);
  };

  const handleOpenProject = async () => {
    if (isElectron()) {
      const res = await StorageService.openProjectNative();
      if (res.success) {
        reloadFromStorage();
        addToast('success', 'Projet Ouvert', 'Le projet a été importé avec succès.');
      } else if (res.error && res.error !== 'Ouverture annulée.' && res.error !== 'Annulé') {
        addToast('error', 'Erreur Ouverture', res.error);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.examguard,.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
              const success = StorageService.importFullBackupJSON(content);
              if (success) {
                reloadFromStorage();
                addToast('success', 'Projet Ouvert', `Fichier ${file.name} chargé avec succès.`);
              } else {
                addToast('error', 'Erreur', 'Fichier invalide ou corrompu.');
              }
            }
          };
          reader.readAsText(file);
        }
        document.body.removeChild(input);
      };
      input.click();
    }
  };

  const handleSaveAs = async () => {
    try {
      const res = await StorageService.saveProjectNative();
      if (res.success) {
        addToast('success', 'Enregistrement réussi', res.filePath ? `Projet enregistré sous : ${res.filePath}` : 'Projet téléchargé avec succès.');
      } else if (res.error && res.error !== 'Enregistrement annulé.' && res.error !== 'Annulé') {
        addToast('error', 'Erreur Enregistrement', res.error);
      }
    } catch (e: any) {
      addToast('error', 'Erreur Enregistrement', e.message || 'Impossible d\'enregistrer le fichier.');
    }
  };

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Localization Dictionary
  const t = translations[language] || translations.fr;

  // Theme Mode Switch Handlers (Strictly Sombre & Clair)
  const handleSelectThemeMode = (mode: ThemeMode) => {
    const validMode: ThemeMode = mode === 'light' ? 'light' : 'dark';
    setThemeSettings(prev => ({ ...prev, mode: validMode }));
    const modeLabels: Record<ThemeMode, string> = {
      dark: 'Sombre',
      light: 'Clair'
    };
    addToast('info', 'Thème d\'affichage', `Thème basculé sur "${modeLabels[validMode] || validMode}"`);
  };

  const handleSelectAccentColor = (accent: AccentColor) => {
    setThemeSettings(prev => ({ ...prev, accent }));
    addToast('info', 'Couleur d\'accentuation', `Couleur basculée sur "${accent}"`);
  };

  const handleCycleTheme = () => {
    const nextMode: ThemeMode = themeSettings.mode === 'dark' ? 'light' : 'dark';
    handleSelectThemeMode(nextMode);
  };

  // Keyboard Shortcuts (Ctrl+K = Command Palette, Ctrl+N = New Exam)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setExamToEdit(null);
        setIsExamModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update HTML dir attribute for RTL/LTR
  useEffect(() => {
    const isAr = language === "AR" || language === "ar";
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = isAr ? "ar" : "fr";
  }, [language]);

  // Primary Domain Handlers connected directly to Central Reactive Store
  const handleSaveTeacher = (teacher: Teacher) => {
    saveTeacher(teacher);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    deleteTeacher(teacherId);
  };

  const handleUpdateExams = (updatedExams: Exam[]) => {
    updateExams(updatedExams);
  };

  const handleSaveExam = (exam: Exam) => {
    saveExam(exam);
  };

  const handleDeleteExam = (examId: string) => {
    deleteExam(examId);
  };

  const handleSaveRoom = (room: Room) => {
    saveRoom(room);
  };

  const handleDeleteRoom = (roomId: string) => {
    deleteRoom(roomId);
  };

  const handleUpdatePromotions = (updated: PromotionGroup[]) => {
    updatePromotions(updated);
  };

  const handleSavePromotion = (promo: PromotionGroup) => {
    savePromotion(promo);
  };

  const handleDeletePromotion = (promoId: string) => {
    deletePromotion(promoId);
  };

  const handleUpdateSubjects = (updated: SubjectModule[]) => {
    updateSubjects(updated);
  };

  const handleDeleteSubject = (subjectId: string) => {
    deleteSubject(subjectId);
  };

  const handleDeleteSubjectGroup = (code: string, nom: string, promos: string[], subjectIds: string[]) => {
    deleteSubjectGroup(code, nom, promos, subjectIds);
  };

  const handleUpdateTimeOff = (updated: TimeOffEntry[]) => {
    updateTimeOff(updated);
  };

  const handleSaveGlobalConstraints = (updated: GlobalConstraints) => {
    updateGlobalConstraints(updated);
  };

  const handleSyncExamsWithSubjects = () => {
    updateSubjects([...subjects]);
    addToast('success', 'Planning synchronisé', 'Le nombre d\'épreuves a été réaligné avec les modules et promotions cochés.');
  };

  const handleApplyGenerationResult = (result: GenerationResult) => {
    updateExams(result.exams);
    addToast("success", "Planning généré & appliqué !", `${result.placedExamsCount} épreuves ont été positionnées.`);
    setRibbonTab("timetable");
    setActiveView("timetable-global");
  };

  const handleCompleteSessionWizard = (newConfig: SessionConfig, newSettings?: InstitutionSettings, generatedExams?: Exam[]) => {
    updateSessionConfig(newConfig);
    if (newSettings) {
      updateSettings(newSettings);
    }
    if (generatedExams && generatedExams.length > 0) {
      updateExams(generatedExams);
    }
    try {
      localStorage.setItem("examguard_wizard_completed", "true");
    } catch {}
    const isAr = language === "AR" || language === "ar";
    addToast(
      "success", 
      isAr ? "تم إنشاء الدورة بنجاح" : "Nouvelle session créée avec succès", 
      isAr 
        ? `تم ضبط ${newConfig.nom || "الدورة"} بنجاح وتحديث الشبكة الزمنية.`
        : `${newConfig.nom || "Session"} configurée avec succès et grille temporelle initialisée.`
    );
    setRibbonTab("timetable");
    setActiveView("timetable-global");
  };

  const handleSaveSubstitution = (sub: Substitution) => {
    updateSubstitutions([sub, ...substitutions]);
    addToast("success", "Demande enregistrée", "La demande de remplacement a été soumise.");
  };

  const handleApproveSubstitution = (subId: string) => {
    const targetSub = substitutions.find(s => s.id === subId);
    if (!targetSub) return;

    const updatedSubs = substitutions.map(s => {
      if (s.id === subId) {
        return {
          ...s,
          statut: "Validé par Chef Dept" as const,
          dateValidation: new Date().toISOString().slice(0, 10),
          validePar: settings.nomChefDepartement
        };
      }
      return s;
    });
    updateSubstitutions(updatedSubs);

    const updatedExams = exams.map(exam => {
      if (exam.id === targetSub.examId) {
        const updatedSalles = exam.salles.map(salle => {
          const updatedSurv = salle.surveillants.map(sv => {
            if (sv.teacherId === targetSub.demandeurId) {
              return { ...sv, teacherId: targetSub.remplacantId };
            }
            return sv;
          });
          return { ...salle, surveillants: updatedSurv };
        });
        return { ...exam, salles: updatedSalles };
      }
      return exam;
    });
    updateExams(updatedExams);
    addToast("success", "Remplacement Validé & Appliqué", "Le planning des examens a été mis à jour.");
  };

  const handleRejectSubstitution = (subId: string) => {
    const updatedSubs = substitutions.map(s => {
      if (s.id === subId) {
        return { ...s, statut: "Rejeté" as const };
      }
      return s;
    });
    updateSubstitutions(updatedSubs);
    addToast("warning", "Demande rejetée");
  };

  const handleDeleteSubstitution = (subId: string) => {
    const updated = substitutions.filter(s => s.id !== subId);
    updateSubstitutions(updated);
  };

  const handleUpdateAttendance = (records: ExamAttendance[]) => {
    updateAttendances(records);
    addToast("info", "Pointage actualisé", "Les présences ont été enregistrées.");
  };

  const handleSaveSettings = (newSettings: InstitutionSettings) => {
    updateSettings(newSettings);
  };

  const handleSaveSessionConfig = (newCfg: SessionConfig) => {
    updateSessionConfig(newCfg);
  };

  const handleToggleLanguage = () => {
    const newLang: Language = (language === "FR" || language === "fr") ? "AR" : "FR";
    setLanguage(newLang);
    StorageService.saveLanguage(newLang);
  };

  const handleSelectLanguage = (newLang: Language) => {
    setLanguage(newLang);
    StorageService.saveLanguage(newLang);
    const langNames: Record<string, string> = {
      fr: 'Français',
      FR: 'Français',
      ar: 'العربية',
      AR: 'العربية',
      en: 'English',
      EN: 'English'
    };
    addToast('info', 'Langue', `Langue changée en ${langNames[newLang] || newLang}`);
  };

  const handleGoToTeacherConvocation = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setRibbonTab("print");
    setActiveView("convocations");
  };

  const handleReloadAll = () => {
    reloadFromStorage();
    addToast("info", "Données actualisées", "Toutes les données ont été rechargées depuis le stockage central.");
  };

  const handleQuickSave = () => {
    StorageService.saveTeachers(teachers);
    StorageService.saveExams(exams);
    StorageService.saveRooms(rooms);
    StorageService.savePromotions(promotions);
    StorageService.saveSubjects(subjects);
    StorageService.saveTimeOff(timeOffConstraints);
    StorageService.saveGlobalConstraints(globalConstraints);
    StorageService.saveSessionConfig(sessionConfig);
    StorageService.saveSubstitutions(substitutions);
    StorageService.saveAttendances(attendances);
    StorageService.saveSettings(settings);
    StorageService.saveLanguage(language);
    
    const isAr = language === "AR" || language === "ar";
    addToast(
      "success",
      isAr ? "تم حفظ التعديلات" : "Modifications enregistrées",
      isAr ? "تم حفظ جميع البيانات والامتحانات بنجاح في التخزين المركزي." : "Toutes les données et plannings ont été sauvegardés avec succès."
    );
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans select-none antialiased ${
      themeSettings.mode === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Toast Alert Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Cascade Deletion Impact Confirmation Modal */}
      {cascadeAlert && (
        <CascadeImpactModal
          alert={cascadeAlert}
          onClose={dismissCascadeAlert}
          onClearReport={clearAllReports}
          onNavigateToTimetable={() => {
            dismissCascadeAlert();
            setActiveView('timetable-global');
          }}
        />
      )}

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        teachers={teachers}
        exams={exams}
        rooms={rooms}
        onSelectTeacher={handleGoToTeacherConvocation}
        onSelectExam={(exam) => {
          setExamToEdit(exam);
          setIsExamModalOpen(true);
        }}
        onSelectRoom={(room) => {
          setRoomToEdit(room);
          setIsRoomModalOpen(true);
        }}
        onSelectThemeMode={handleSelectThemeMode}
        onNavigate={(tab) => {
          if (tab === 'teachers') { setRibbonTab('data'); setActiveView('teachers'); }
          else if (tab === 'exams') { setRibbonTab('data'); setActiveView('exams'); }
          else if (tab === 'rooms') { setRibbonTab('data'); setActiveView('rooms'); }
          else if (tab === 'convocations') { setRibbonTab('print'); setActiveView('convocations'); }
          else if (tab === 'substitutions') { setRibbonTab('substitutions'); setActiveView('substitutions'); }
          else if (tab === 'attendance') { setRibbonTab('substitutions'); setActiveView('attendance'); }
          else if (tab === 'settings') { setRibbonTab('file'); setActiveView('settings'); }
        }}
      />

      {/* aSc TimeTables Ribbon Bar */}
      <Ribbon
        activeTab={ribbonTab}
        setActiveTab={setRibbonTab}
        activeView={activeView}
        setActiveView={setActiveView}
        t={t}
        currentLang={language}
        onLanguageToggle={handleToggleLanguage}
        onSelectLanguage={handleSelectLanguage}
        conflictCount={conflicts.length}
        onOpenWizard={() => setIsWizardModalOpen(true)}
        onOpenProject={handleOpenProject}
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
        onOpenRoomAssignment={() => handleOpenRoomAssignment()}
        onOpenExportJSON={() => { setRibbonTab('file'); setActiveView('file-export-excel'); }}
        onOpenImportJSON={() => { setRibbonTab('file'); setActiveView('file-backup-json'); }}
        onResetDemo={() => { setRibbonTab('file'); setActiveView('file-reset-demo'); }}
        onPrintAll={() => setIsBatchPrintModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onQuickSave={handleQuickSave}
        onSaveAs={handleSaveAs}
        themeSettings={themeSettings}
        onCycleTheme={handleCycleTheme}
        onSelectThemeMode={handleSelectThemeMode}
        onSelectAccentColor={handleSelectAccentColor}
      />

      {/* Main Workspace Area */}
      <main className={`flex-1 overflow-hidden flex flex-col ${
        themeSettings.mode === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}>
        {/* 1. TIMETABLE TAB (aSc Interactive Grid) */}
        {ribbonTab === 'timetable' && (
          <TimetableView
            viewMode={
              activeView === 'timetable-global' ? 'global' :
              activeView === 'timetable-rooms' ? 'rooms' :
              activeView === 'timetable-promotions' ? 'promotions' :
              activeView === 'timetable-modules' ? 'modules' : 'teachers'
            }
            exams={exams}
            teachers={teachers}
            rooms={rooms}
            promotions={promotions}
            subjects={subjects}
            timeSlots={timetableSlots}
            sessionDates={timetableDates}
            conflicts={conflicts}
            timeOffConstraints={timeOffConstraints}
            t={t}
            settings={settings}
            onUpdateExams={handleUpdateExams}
            onEditExam={(exam) => {
              setExamToEdit(exam);
              setIsExamModalOpen(true);
            }}
            onDeleteExam={handleDeleteExam}
            onAddExam={() => {
              setExamToEdit(null);
              setIsExamModalOpen(true);
            }}
            onOpenRoomAssignment={handleOpenRoomAssignment}
          />
        )}

        {/* 2. DATA TAB (Teachers, Rooms, Promotions, Subjects, Exams) */}
        {ribbonTab === 'data' && (
          <div className="flex-1 overflow-y-auto p-4">
            {activeView === 'teachers' && (
              <TeachersView
                teachers={teachers}
                exams={exams}
                subjects={subjects}
                language={language}
                onAddTeacher={() => {
                  setTeacherToEdit(null);
                  setIsTeacherModalOpen(true);
                }}
                onEditTeacher={(teacher) => {
                  setTeacherToEdit(teacher);
                  setIsTeacherModalOpen(true);
                }}
                onDeleteTeacher={handleDeleteTeacher}
                onSelectTeacherConvocation={handleGoToTeacherConvocation}
              />
            )}

            {activeView === 'rooms' && (
              <RoomsView
                rooms={rooms}
                exams={exams}
                teachers={teachers}
                language={language}
                onAddRoom={() => {
                  setRoomToEdit(null);
                  setIsRoomModalOpen(true);
                }}
                onEditRoom={(room) => {
                  setRoomToEdit(room);
                  setIsRoomModalOpen(true);
                }}
                onDeleteRoom={handleDeleteRoom}
                onOpenRoomAssignment={handleOpenRoomAssignment}
              />
            )}

            {activeView === 'promotions' && (
              <PromotionsView
                promotions={promotions}
                rooms={rooms}
                exams={exams}
                t={t}
                onUpdatePromotions={handleUpdatePromotions}
                onSavePromotion={handleSavePromotion}
                onDeletePromotion={handleDeletePromotion}
                onNotify={addToast}
                onOpenRoomAssignment={handleOpenRoomAssignment}
              />
            )}

            {activeView === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                promotions={promotions}
                teachers={teachers}
                exams={exams}
                rooms={rooms}
                t={t}
                onUpdateSubjects={handleUpdateSubjects}
                onUpdateExams={handleUpdateExams}
                onNotify={addToast}
                onOpenRoomAssignment={handleOpenRoomAssignment}
              />
            )}

            {activeView === 'exams' && (
              <ExamsView
                exams={exams}
                teachers={teachers}
                rooms={rooms}
                conflicts={conflicts}
                settings={settings}
                language={language}
                onAddExam={(prefillDate?: string) => {
                  setExamToEdit(prefillDate ? { date: prefillDate } : null);
                  setIsExamModalOpen(true);
                }}
                onEditExam={(exam) => {
                  setExamToEdit(exam);
                  setIsExamModalOpen(true);
                }}
                onDeleteExam={handleDeleteExam}
                onSelectTeacherConvocation={handleGoToTeacherConvocation}
                onSyncWithSubjects={handleSyncExamsWithSubjects}
                onOpenRoomAssignment={handleOpenRoomAssignment}
              />
            )}
          </div>
        )}

        {/* 2.5 SPÉCIFICATION TAB (Contraintes et Vœux, Génération Auto, Vérification, Remplacement et Permutation) */}
        {ribbonTab === 'specifications' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Configuration / Settings Views */}
            {(activeView === 'settings' || 
              activeView === 'settings-institution' || 
              activeView === 'settings-slots' || 
              activeView === 'settings-calendar') && (
              <div className="flex-1 overflow-y-auto p-4">
                <SettingsView
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  sessionConfig={sessionConfig}
                  onSaveSessionConfig={handleSaveSessionConfig}
                  initialTab={
                    activeView === 'settings-slots' ? 'slots' :
                    activeView === 'settings-calendar' ? 'calendar' :
                    'institution'
                  }
                  language={language}
                  onToggleLanguage={handleToggleLanguage}
                  themeSettings={themeSettings}
                  onSelectThemeMode={handleSelectThemeMode}
                  onSelectAccentColor={handleSelectAccentColor}
                />
              </div>
            )}

            {/* Contraintes et Vœux */}
            {activeView === 'constraints-timeoff' && (
              <TimeOffView
                teachers={teachers}
                rooms={rooms}
                promotions={promotions}
                timeSlots={timetableSlots}
                sessionDates={timetableDates}
                timeOffConstraints={timeOffConstraints}
                t={t}
                onUpdateTimeOff={handleUpdateTimeOff}
              />
            )}

            {/* Règles Globales */}
            {activeView === 'constraints-global' && (
              <GlobalConstraintsView
                constraints={globalConstraints}
                t={t}
                onSaveConstraints={handleSaveGlobalConstraints}
              />
            )}

            {/* Diagnostic / Vérification */}
            {(activeView === 'verification' || activeView === 'workload-stats') && (
              <VerificationView
                conflicts={conflicts}
                exams={exams}
                teachers={teachers}
                rooms={rooms}
                subjects={subjects}
                promotions={promotions}
                t={t}
                onSelectExam={(examId) => {
                  const ex = exams.find(e => e.id === examId);
                  if (ex) {
                    setExamToEdit(ex);
                    setIsExamModalOpen(true);
                  }
                }}
                onOpenCascadeModal={(alert) => {
                  setCascadeAlert(alert);
                }}
                onTriggerCascadeSync={handleSyncExamsWithSubjects}
                onClearAllReports={clearAllReports}
              />
            )}

            {/* Remplacement et Permutation */}
            {activeView === 'substitutions' && (
              <div className="flex-1 overflow-y-auto p-4">
                <SubstitutionsView
                  substitutions={substitutions}
                  teachers={teachers}
                  exams={exams}
                  rooms={rooms}
                  language={language}
                  onAddSubstitution={() => setIsSubModalOpen(true)}
                  onApproveSubstitution={handleApproveSubstitution}
                  onRejectSubstitution={handleRejectSubstitution}
                  onDeleteSubstitution={handleDeleteSubstitution}
                />
              </div>
            )}

            {/* Pointage */}
            {activeView === 'attendance' && (
              <div className="flex-1 overflow-y-auto p-4">
                <AttendanceView
                  exams={exams}
                  teachers={teachers}
                  rooms={rooms}
                  settings={settings}
                  attendances={attendances}
                  onUpdateAttendance={handleUpdateAttendance}
                  language={language}
                />
              </div>
            )}

            {/* Default or auto-generator view if activeView doesn't match above */}
            {activeView !== 'settings' &&
             activeView !== 'settings-institution' &&
             activeView !== 'settings-slots' &&
             activeView !== 'settings-calendar' &&
             activeView !== 'constraints-timeoff' && 
             activeView !== 'constraints-global' && 
             activeView !== 'verification' && 
             activeView !== 'workload-stats' && 
             activeView !== 'substitutions' && 
             activeView !== 'attendance' && (
              <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-xl w-full p-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5 shadow-xl dark:shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto ring-4 ring-teal-500/10">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Module Spécification
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Gestion centralisée de la configuration, des contraintes, de la génération automatique, de la vérification et des remplacements.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                    <button
                      onClick={() => setActiveView('settings-institution')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-xl transition"
                    >
                      <div className="text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                        <span>🏛️</span> Configuration Établissement
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">En-têtes, logos et paramètres d'établissement</div>
                    </button>

                    <button
                      onClick={() => setActiveView('constraints-timeoff')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-xl transition"
                    >
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                        <span>🗓️</span> Contraintes et vœux
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Indisponibilités et desiderata enseignants</div>
                    </button>

                    <button
                      onClick={() => setIsGeneratorModalOpen(true)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-amber-500 rounded-xl transition"
                    >
                      <div className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                        <span>⚡</span> Génération auto
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Moteur heuristique d'affectation automatique</div>
                    </button>

                    <button
                      onClick={() => setActiveView('verification')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-rose-500 rounded-xl transition"
                    >
                      <div className="text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                        <span>🛡️</span> Vérification
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Diagnostic des chevauchements & conflits</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CONSTRAINTS TAB */}
        {ribbonTab === 'constraints' && (
          <div className="flex-1 overflow-hidden">
            {activeView === 'constraints-timeoff' && (
              <TimeOffView
                teachers={teachers}
                rooms={rooms}
                promotions={promotions}
                timeSlots={timetableSlots}
                sessionDates={timetableDates}
                timeOffConstraints={timeOffConstraints}
                t={t}
                onUpdateTimeOff={handleUpdateTimeOff}
              />
            )}

            {activeView === 'constraints-global' && (
              <GlobalConstraintsView
                constraints={globalConstraints}
                t={t}
                onSaveConstraints={handleSaveGlobalConstraints}
              />
            )}
          </div>
        )}

        {/* 4. GENERATOR TAB */}
        {ribbonTab === 'generator' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full p-6 bg-slate-850 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                <span className="text-2xl font-bold">⚡</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">
                Générateur d'Emploi du Temps Automatique
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Le moteur heuristique va analyser {exams.length} épreuves, {teachers.length} enseignants et {rooms.length} salles pour produire une répartition sans conflit.
              </p>
              <button
                onClick={() => setIsGeneratorModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
              >
                Ouvrir l'Assistant de Génération
              </button>
            </div>
          </div>
        )}

        {/* 5. VERIFICATION TAB */}
        {ribbonTab === 'verification' && (
          <VerificationView
            conflicts={conflicts}
            exams={exams}
            teachers={teachers}
            rooms={rooms}
            subjects={subjects}
            promotions={promotions}
            t={t}
            onSelectExam={(examId) => {
              const ex = exams.find(e => e.id === examId);
              if (ex) {
                setExamToEdit(ex);
                setIsExamModalOpen(true);
              }
            }}
            onOpenCascadeModal={(alert) => {
              setCascadeAlert(alert);
            }}
            onTriggerCascadeSync={handleSyncExamsWithSubjects}
            onClearAllReports={clearAllReports}
          />
        )}

        {/* 6. SUBSTITUTIONS & ATTENDANCE */}
        {ribbonTab === 'substitutions' && (
          <div className="flex-1 overflow-y-auto p-4">
            {activeView === 'substitutions' && (
              <SubstitutionsView
                substitutions={substitutions}
                teachers={teachers}
                exams={exams}
                rooms={rooms}
                language={language}
                onAddSubstitution={() => setIsSubModalOpen(true)}
                onApproveSubstitution={handleApproveSubstitution}
                onRejectSubstitution={handleRejectSubstitution}
                onDeleteSubstitution={handleDeleteSubstitution}
              />
            )}

            {activeView === 'attendance' && (
              <AttendanceView
                exams={exams}
                teachers={teachers}
                rooms={rooms}
                settings={settings}
                attendances={attendances}
                onUpdateAttendance={handleUpdateAttendance}
                language={language}
              />
            )}
          </div>
        )}

        {/* 7. PRINT & CONVOCATIONS */}
        {ribbonTab === 'print' && (
          <div className="flex-1 overflow-y-auto p-4">
            <ConvocationView
              teachers={teachers}
              exams={exams}
              rooms={rooms}
              settings={settings}
              language={language}
              selectedTeacherId={selectedTeacherId || teachers[0]?.id}
              onSelectTeacherId={setSelectedTeacherId}
              onOpenPrintAll={() => setIsBatchPrintModalOpen(true)}
              onNotify={addToast}
            />
          </div>
        )}

        {/* 8. FILE / SETTINGS / UTILITIES */}
        {ribbonTab === 'file' && (
          <div className="flex-1 overflow-y-auto p-4">
            {(activeView === 'settings' || 
              activeView === 'settings-institution' || 
              activeView === 'settings-slots' || 
              activeView === 'settings-calendar') ? (
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                sessionConfig={sessionConfig}
                onSaveSessionConfig={handleSaveSessionConfig}
                initialTab={
                  activeView === 'settings-slots' ? 'slots' :
                  activeView === 'settings-calendar' ? 'calendar' :
                  'institution'
                }
                language={language}
                onToggleLanguage={handleToggleLanguage}
                themeSettings={themeSettings}
                onSelectThemeMode={handleSelectThemeMode}
                onSelectAccentColor={handleSelectAccentColor}
              />
            ) : (
              <UtilitiesView
                teachers={teachers}
                exams={exams}
                rooms={rooms}
                promotions={promotions}
                subjects={subjects}
                timeOffConstraints={timeOffConstraints}
                globalConstraints={globalConstraints}
                sessionConfig={sessionConfig}
                settings={settings}
                language={language}
                onDataReloaded={handleReloadAll}
                activeSubSection={activeView}
                onSelectSubSection={(sec) => setActiveView(sec)}
                onNotify={addToast}
              />
            )}
          </div>
        )}

        {/* 9. HELP TAB */}
        {ribbonTab === 'help' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <span className="text-2xl">🎓</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    ExamGuard — Guide & Aide
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Système de planification, d'affectation automatique et de surveillance des examens universitaires.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Démarrage rapide */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-base">🚀</span>
                  <span>Démarrage Rapide</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>1. Cliquez sur <strong>Nouveau</strong> pour créer une session.</p>
                  <p>2. Renseignez ou importez vos données dans <strong>Édition</strong> (Enseignants, Salles, Matières).</p>
                  <p>3. Définissez vos contraintes et lancez la <strong>Génération auto</strong> dans <strong>Spécification</strong>.</p>
                  <p>4. Ajustez le planning sur la grille interactive <strong>Affichage</strong>.</p>
                </div>
              </div>

              {/* Card 2: Raccourcis Clavier */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-base">⌨️</span>
                  <span>Raccourcis Clavier</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Recherche globale</span>
                    <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Ctrl+K</kbd>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Nouvel examen</span>
                    <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Sauvegarde rapide</span>
                    <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Imprimer document</span>
                    <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">Ctrl+P</kbd>
                  </div>
                </div>
              </div>

              {/* Card 3: Formats & Sauvegardes */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-base">💾</span>
                  <span>Sauvegarde & Formats</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>.examguard / .json</strong> : Fichiers complets de sauvegarde de session incluant l'ensemble des données, contraintes et grilles.</p>
                  <p><strong>.csv</strong> : Exports et imports compatibles avec Microsoft Excel, LibreOffice Calc et Google Sheets.</p>
                </div>
              </div>
            </div>

            {/* À propos Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span className="text-base">ℹ️</span>
                <span>À propos d'ExamGuard</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Session Wizard */}
      {isWizardModalOpen && (
        <SessionWizard
          isOpen={isWizardModalOpen}
          onClose={() => setIsWizardModalOpen(false)}
          currentConfig={sessionConfig}
          currentSettings={settings}
          promotions={promotions}
          subjects={subjects}
          teachers={teachers}
          rooms={rooms}
          t={t}
          currentLang={language}
          onLanguageToggle={handleToggleLanguage}
          onComplete={handleCompleteSessionWizard}
        />
      )}

      {/* 2. Auto Generator Modal */}
      {isGeneratorModalOpen && (
        <AutoGeneratorModal
          isOpen={isGeneratorModalOpen}
          onClose={() => setIsGeneratorModalOpen(false)}
          exams={exams}
          teachers={teachers}
          rooms={rooms}
          promotions={promotions}
          subjects={subjects}
          timeSlots={timetableSlots}
          sessionDates={timetableDates}
          timeOffConstraints={timeOffConstraints}
          globalConstraints={globalConstraints}
          t={t}
          onApplyResult={handleApplyGenerationResult}
        />
      )}

      {/* 3. Teacher Modal */}
      {isTeacherModalOpen && (
        <TeacherModal
          isOpen={isTeacherModalOpen}
          onClose={() => {
            setIsTeacherModalOpen(false);
            setTeacherToEdit(null);
          }}
          onSave={handleSaveTeacher}
          initialTeacher={teacherToEdit}
        />
      )}

      {/* 4. Exam Modal */}
      {isExamModalOpen && (
        <ExamModal
          isOpen={isExamModalOpen}
          onClose={() => {
            setIsExamModalOpen(false);
            setExamToEdit(null);
          }}
          onSave={handleSaveExam}
          initialExam={examToEdit}
          teachers={teachers}
          rooms={rooms}
          allExams={exams}
          subjects={subjects}
          promotions={promotions}
          t={t}
        />
      )}

      {/* 5. Room Modal */}
      {isRoomModalOpen && (
        <RoomModal
          isOpen={isRoomModalOpen}
          onClose={() => {
            setIsRoomModalOpen(false);
            setRoomToEdit(null);
          }}
          onSave={handleSaveRoom}
          initialRoom={roomToEdit}
        />
      )}

      {/* 6. Substitution Modal */}
      {isSubModalOpen && (
        <SubstitutionModal
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          onSave={handleSaveSubstitution}
          teachers={teachers}
          exams={exams}
          rooms={rooms}
        />
      )}

      {/* 7. Batch Convocations Print Modal */}
      {isBatchPrintModalOpen && (
        <BatchConvocationsModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          teachers={teachers}
          exams={exams}
          rooms={rooms}
          settings={settings}
          language={language}
        />
      )}

      {/* 8. Room Assignment Modal (Attribution de salles multi-promotions avec calcul de capacité) */}
      {isRoomAssignmentModalOpen && (
        <RoomAssignmentModal
          isOpen={isRoomAssignmentModalOpen}
          onClose={() => {
            setIsRoomAssignmentModalOpen(false);
            setRoomAssignmentOptions({});
          }}
          promotions={promotions}
          rooms={rooms}
          subjects={subjects}
          exams={exams}
          teachers={teachers}
          initialExamId={roomAssignmentOptions.examId}
          initialRoomId={roomAssignmentOptions.roomId}
          initialPromotionName={roomAssignmentOptions.promoName}
          onSave={handleSaveRoomAssignment}
        />
      )}

      {/* 9. About Modal */}
      {isAboutModalOpen && (
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
