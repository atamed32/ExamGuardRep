import React, { useState } from 'react';
import { GlobalConstraints } from '../../types';
import { Translations } from '../../services/i18n';
import { 
  Save, 
  Sliders, 
  Check, 
  Users, 
  Layers, 
  ShieldCheck
} from 'lucide-react';

interface GlobalConstraintsViewProps {
  constraints: GlobalConstraints;
  t: Translations;
  onSaveConstraints: (updated: GlobalConstraints) => void;
}

export const GlobalConstraintsView: React.FC<GlobalConstraintsViewProps> = ({
  constraints,
  t,
  onSaveConstraints
}) => {
  const [formData, setFormData] = useState<GlobalConstraints>({ ...constraints });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: keyof GlobalConstraints, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConstraints(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto text-slate-800 dark:text-slate-100 overflow-y-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 rtl:space-x-reverse">
            <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Règles & Contraintes Globales d'Optimisation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Définissez les règles algorithmiques et seuils respectés par le moteur de génération aSc TimeTables.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-500/40 text-xs font-semibold animate-pulse shadow-2xs">
            <Check className="w-4 h-4" />
            <span>Contraintes enregistrées !</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Teacher Surveillance Rules */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-4">
            <Users className="w-4 h-4" />
            <span>Contraintes Enseignants & Surveillances</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Max surveillances par jour par enseignant :
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.maxSurveillancesPerDayPerTeacher}
                onChange={(e) => handleChange('maxSurveillancesPerDayPerTeacher', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Recommandé : 2 créneaux max/jour.</span>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Max créneaux consécutifs :
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={formData.maxConsecutiveSurveillances}
                onChange={(e) => handleChange('maxConsecutiveSurveillances', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Évite l'épuisement sans pause.</span>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Pause minimale entre surveillances (minutes) :
              </label>
              <input
                type="number"
                min="0"
                step="15"
                value={formData.minPauseBetweenSurveillancesMinutes}
                onChange={(e) => handleChange('minPauseBetweenSurveillancesMinutes', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quota global par défaut (séances/session) :
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxTotalSurveillancesPerTeacher}
                onChange={(e) => handleChange('maxTotalSurveillancesPerTeacher', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Promotion & Student Constraints */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-purple-700 dark:text-purple-400 font-bold text-sm mb-4">
            <Layers className="w-4 h-4" />
            <span>Contraintes Étudiants & Promotions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Max examens par jour par promotion :
              </label>
              <input
                type="number"
                min="1"
                max="3"
                value={formData.maxExamsPerDayPerPromotion}
                onChange={(e) => handleChange('maxExamsPerDayPerPromotion', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Généralement 1 examen par jour pour les étudiants.</span>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Jours de révision minimaux entre épreuves :
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={formData.minDaysBetweenExamsSamePromotion}
                onChange={(e) => handleChange('minDaysBetweenExamsSamePromotion', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Algorithmic Optimization Flags */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-700 dark:text-amber-400 font-bold text-sm mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Optimisations Avancées & Équité</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
              <input
                type="checkbox"
                checked={formData.avoidResponsibleSameExam}
                onChange={(e) => handleChange('avoidResponsibleSameExam', e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Libérer l'enseignant responsable de la surveillance de son propre module
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Permet à l'enseignant de circuler entre les salles ou d'assurer la permanence sans être bloqué dans une seule salle.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
              <input
                type="checkbox"
                checked={formData.allowSplittingAcrossRooms}
                onChange={(e) => handleChange('allowSplittingAcrossRooms', e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Autoriser la division des promotions sur plusieurs salles / amphis
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Si l'effectif dépasse la capacité d'une seule salle, répartir automatiquement sur plusieurs salles contiguës.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
              <input
                type="checkbox"
                checked={formData.allowSeparateRoomsForCommonModules ?? true}
                onChange={(e) => handleChange('allowSeparateRoomsForCommonModules', e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Salles distinctes pour modules communs multi-promotions (Recommandé)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pour les modules partagés entre plusieurs promotions (ex : Probabilités statistiques, Mécanique des fluides, Ondes et vibrations pour 2ème Licence Génie Civil et 2ème Licence Hydraulique), il n'est pas nécessaire de les regrouper dans la même salle si les promotions sont programmées dans des salles distinctes.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-2 rtl:space-x-reverse shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les Contraintes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
