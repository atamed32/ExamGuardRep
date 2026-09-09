import React from 'react';
import { Sun, Moon, Monitor, Landmark, Check, Sparkles } from 'lucide-react';
import { ThemeMode, AccentColor, ContrastLevel, ThemeSettings } from '../../types';
import { Translations } from '../../services/i18n';

interface ThemeSelectorProps {
  themeSettings: ThemeSettings;
  onChangeTheme: (newSettings: Partial<ThemeSettings>) => void;
  t: Translations;
  compact?: boolean;
  showAccentPicker?: boolean;
  showContrastPicker?: boolean;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themeSettings,
  onChangeTheme,
  t,
  compact = false,
  showAccentPicker = true,
  showContrastPicker = true,
  className = ''
}) => {
  const modes: {
    id: ThemeMode;
    label: string;
    description: string;
    icon: React.ReactNode;
    previewBg: string;
    previewCard: string;
    previewAccent: string;
    previewText: string;
  }[] = [
    {
      id: 'dark',
      label: t.themeDark || 'Sombre',
      description: t.themeDarkDesc || 'Interface sombre moderne et reposante',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      previewBg: 'bg-slate-950',
      previewCard: 'bg-slate-900',
      previewAccent: 'bg-emerald-400',
      previewText: 'text-slate-100'
    },
    {
      id: 'light',
      label: t.themeLight || 'Clair',
      description: t.themeLightDesc || 'Fond clair classique haute lisibilité',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      previewBg: 'bg-slate-100',
      previewCard: 'bg-white',
      previewAccent: 'bg-emerald-600',
      previewText: 'text-slate-900'
    }
  ];

  const accents: { id: AccentColor; label: string; colorClass: string; ringClass: string }[] = [
    { id: 'emerald', label: 'Émeraude / أخضر زمردي', colorClass: 'bg-emerald-500', ringClass: 'ring-emerald-500' },
    { id: 'indigo', label: 'Indigo / نيلي', colorClass: 'bg-indigo-500', ringClass: 'ring-indigo-500' },
    { id: 'blue', label: 'Bleu Royal / أزرق ملكي', colorClass: 'bg-blue-500', ringClass: 'ring-blue-500' },
    { id: 'amber', label: 'Or / Ambre / ذهبي كهرماني', colorClass: 'bg-amber-500', ringClass: 'ring-amber-500' },
    { id: 'rose', label: 'Rubis / وردي ياقوتي', colorClass: 'bg-rose-500', ringClass: 'ring-rose-500' }
  ];

  if (compact) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`}>
        {modes.map((m) => {
          const isActive = themeSettings.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChangeTheme({ mode: m.id })}
              className={`p-2.5 rounded-xl border text-start transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500 shadow-xs'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  {m.icon}
                  <span className="font-bold text-xs">{m.label.split('(')[0]}</span>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </div>

              {/* Miniature preview canvas */}
              <div className={`h-4 w-full rounded-md ${m.previewBg} p-0.5 flex items-center gap-1 border border-slate-700/50 overflow-hidden`}>
                <div className={`h-2.5 flex-1 rounded-xs ${m.previewCard}`} />
                <div className={`h-2.5 w-2 rounded-xs ${m.previewAccent}`} />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modes.map((m) => {
          const isActive = themeSettings.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              id={`theme-option-${m.id}`}
              onClick={() => onChangeTheme({ mode: m.id })}
              className={`p-3.5 rounded-xl border text-start transition-all relative flex flex-col justify-between group cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 shadow-md'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700">
                    {m.icon}
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                      <Check className="w-3 h-3" />
                      <span>Actif</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
                      Sélectionner
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs sm:text-sm text-slate-100 mb-1">
                  {m.label}
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed min-h-[32px]">
                  {m.description}
                </div>
              </div>

              {/* Visual Mockup Preview */}
              <div className={`mt-3 h-10 w-full rounded-lg ${m.previewBg} p-1.5 flex flex-col justify-between border border-slate-700/60 overflow-hidden shadow-inner`}>
                <div className="flex items-center justify-between">
                  <div className={`h-2 w-8 rounded-xs ${m.previewAccent}`} />
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded-xs ${m.previewAccent}`} />
                  <div className={`h-3 flex-1 rounded-xs ${m.previewCard} border border-slate-600/30`} />
                  <div className={`h-3 flex-1 rounded-xs ${m.previewCard} border border-slate-600/30`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional Accent & Contrast row */}
      {(showAccentPicker || showContrastPicker) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
          {showAccentPicker && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.accentColor}</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {accents.map((acc) => {
                  const isSelected = themeSettings.accent === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onChangeTheme({ accent: acc.id })}
                      className={`w-7 h-7 rounded-full ${acc.colorClass} flex items-center justify-center transition-transform ${
                        isSelected 
                          ? `ring-2 ring-white scale-110 shadow-md` 
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={acc.label}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showContrastPicker && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {t.contrastMode}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeTheme({ contrast: 'normal' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    themeSettings.contrast === 'normal'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.contrastNormal}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTheme({ contrast: 'high' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    themeSettings.contrast === 'high'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.contrastHigh}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
