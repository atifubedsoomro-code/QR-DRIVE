import React, { useState } from 'react';
import { COVER_THEMES } from '../constants/themes';
import { CoverTheme } from '../types';
import { Check, Palette, Sparkles } from 'lucide-react';

interface ThemeSelectorProps {
  selectedThemeId: string;
  onSelectTheme: (theme: CoverTheme) => void;
}

/** Thumbnail for picture-free themes: a mini page drawn from the theme's own colours. */
const PlainThumb: React.FC<{ theme: CoverTheme }> = ({ theme }) => {
  const ink = theme.isDark ? '#ffffff' : theme.primaryColor;
  const centered = theme.layoutStyle === 'plain-centered';
  const leftBar = theme.layoutStyle === 'plain-left-bar';

  return (
    <div className="absolute inset-0" style={{ backgroundColor: theme.backgroundColor }}>
      {theme.layoutStyle === 'plain-rule' && (
        <>
          <div className="absolute top-2 inset-x-3 h-0.5" style={{ backgroundColor: theme.primaryColor }} />
          <div className="absolute bottom-2 inset-x-3 h-px" style={{ backgroundColor: theme.accentColor }} />
        </>
      )}
      {leftBar && <div className="absolute left-0 inset-y-0 w-2" style={{ backgroundColor: theme.primaryColor }} />}

      <div
        className={`absolute top-7 flex flex-col gap-1.5 ${
          centered ? 'inset-x-4 items-center' : leftBar ? 'left-5 right-4 items-start' : 'inset-x-4 items-start'
        }`}
      >
        <div className="h-1.5 w-3/4 rounded-sm" style={{ backgroundColor: ink }} />
        <div className="h-1 w-1/2 rounded-sm" style={{ backgroundColor: theme.accentColor }} />
        <div className="h-0.5 w-6 rounded-full mt-0.5" style={{ backgroundColor: theme.accentColor }} />
      </div>

      <div
        className="absolute bottom-3.5 right-3 w-5 h-5 rounded-sm border"
        style={{ borderColor: ink, opacity: 0.5 }}
      />
      <span
        className="absolute bottom-3.5 left-4 text-[8px] font-bold uppercase tracking-wider"
        style={{ color: ink, opacity: 0.6 }}
      >
        No image
      </span>
    </div>
  );
};

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedThemeId,
  onSelectTheme,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'Plain', 'Corporate', 'Minimalist', 'Modern', 'Creative', 'Academic', 'Luxury', 'Editorial'];

  const filteredThemes =
    filterCategory === 'All'
      ? COVER_THEMES
      : COVER_THEMES.filter((t) => t.category === filterCategory);

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
              2
            </span>
            Cover Theme
            <span className="text-xs font-normal text-zinc-400">
              ({COVER_THEMES.length} Styles)
            </span>
          </h3>
          <p className="text-xs text-zinc-400">
            Pick a layout aesthetic; all custom fonts, colors, and pictures apply across any theme
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 text-xs rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-yellow-400 text-black font-bold shadow-xs'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of themes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredThemes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;
          return (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme)}
              className={`group text-left rounded-xl p-3 border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-yellow-400 ring-2 ring-yellow-400/40 bg-yellow-400/5 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
              }`}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Theme mini visual card */}
              <div
                className="w-full h-24 rounded-lg overflow-hidden relative mb-2.5 border border-zinc-800"
                style={{ backgroundColor: theme.backgroundColor }}
              >
                {theme.defaultImage ? (
                  <>
                    <img
                      src={theme.defaultImage}
                      alt={theme.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-80"
                    />
                    {/* Decorative header overlay banner mimicking theme layout */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-2 text-white">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-xs"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span className="text-[10px] font-bold tracking-tight text-white/95 uppercase truncate">
                          {theme.category}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <PlainThumb theme={theme} />
                )}
              </div>

              {/* Theme details */}
              <div>
                <h4 className="font-bold text-xs text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                  {theme.name}
                </h4>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                  {theme.description}
                </p>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-800">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black shadow-xs"
                  style={{ backgroundColor: theme.primaryColor }}
                  title="Primary Color"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black shadow-xs"
                  style={{ backgroundColor: theme.accentColor }}
                  title="Accent Color"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-zinc-700 shadow-xs"
                  style={{ backgroundColor: theme.backgroundColor }}
                  title="Background"
                />
                <span className="text-[9px] text-zinc-400 font-mono ml-auto uppercase">
                  {theme.defaultFont}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
