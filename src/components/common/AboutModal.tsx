import React from 'react';
import { Modal } from './Modal';
import { BookOpen, Mail, Building2, GraduationCap } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="À propos d'ExamGuard"
      subtitle="Système Universitaire de Gestion et Surveillance des Examens"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Logo/Icon Section */}
        <div className="flex items-center justify-center py-4">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Version */}
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Version 2027-0
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Système de Gestion des Examens
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-slate-200 dark:border-slate-700"></div>

        {/* Developer Information */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Développé par
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                Atallah M.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                E-mail
              </p>
              <a
                href="mailto:m.atallah@cu-elbayadh.dz"
                className="text-base text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium mt-1 inline-block transition-colors"
              >
                m.atallah@cu-elbayadh.dz
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Institution
              </p>
              <p className="text-base text-slate-900 dark:text-slate-100 font-medium mt-1 leading-relaxed">
                Département d'hydraulique et de génie civil
              </p>
              <p className="text-base text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                Centre Universitaire Nour Bachir d'El-Bayadh
              </p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-slate-200 dark:border-slate-700"></div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2027 ExamGuard - Tous droits réservés
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
