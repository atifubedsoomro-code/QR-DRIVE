import React, { useRef, useState } from 'react';
import { CoverData, FontStyle } from '../types';
import {
  Palette,
  Type,
  Upload,
  Check,
  Building,
  User as UserIcon,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';

interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
  titleColor: string;
  subtitleColor: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'electric-yellow',
    name: 'Electric Yellow',
    primary: '#09090b',
    accent: '#facc15',
    titleColor: '#facc15',
    subtitleColor: '#fde047',
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    primary: '#0b1329',
    accent: '#06b6d4',
    titleColor: '#22d3ee',
    subtitleColor: '#67e8f9',
  },
  {
    id: 'imperial-crimson',
    name: 'Imperial Crimson',
    primary: '#18181b',
    accent: '#ef4444',
    titleColor: '#f87171',
    subtitleColor: '#fca5a5',
  },
  {
    id: 'emerald-eco',
    name: 'Emerald Forest',
    primary: '#064e3b',
    accent: '#10b981',
    titleColor: '#34d399',
    subtitleColor: '#6ee7b7',
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    primary: '#0f172a',
    accent: '#6366f1',
    titleColor: '#818cf8',
    subtitleColor: '#a5b4fc',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    primary: '#1c1917',
    accent: '#f97316',
    titleColor: '#fb923c',
    subtitleColor: '#fdba74',
  },
  {
    id: 'luxury-gold',
    name: 'Obsidian & Gold',
    primary: '#000000',
    accent: '#d97706',
    titleColor: '#fbbf24',
    subtitleColor: '#fde68a',
  },
  {
    id: 'neon-rose',
    name: 'Neon Magenta',
    primary: '#18181b',
    accent: '#ec4899',
    titleColor: '#f472b6',
    subtitleColor: '#fbcfe8',
  },
];

interface ColorCarouselProps {
  coverData: CoverData;
  onChange: (updated: CoverData) => void;
}

export const ColorCarousel: React.FC<ColorCarouselProps> = ({
  coverData,
  onChange,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('electric-yellow');
  const customLogoInputRef = useRef<HTMLInputElement>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);

  const applyPreset = (preset: ColorPreset) => {
    setSelectedPresetId(preset.id);
    onChange({
      ...coverData,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      titleColor: preset.titleColor,
      subtitleColor: preset.subtitleColor,
    });
  };

  const updateField = <K extends keyof CoverData>(field: K, value: CoverData[K]) => {
    onChange({
      ...coverData,
      [field]: value,
    });
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({
            ...coverData,
            logoUrl: event.target.result as string,
            logoSize: coverData.logoSize || 'medium',
            logoPosition: coverData.logoPosition || 'top-left',
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({
            ...coverData,
            backgroundImageUrl: event.target.result as string,
            backgroundImageOpacity: coverData.backgroundImageOpacity ?? 0.35,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fonts: { id: FontStyle; name: string }[] = [
    { id: 'inter', name: 'Inter (Clean Sans)' },
    { id: 'playfair', name: 'Playfair (Editorial Serif)' },
    { id: 'space', name: 'Space Grotesk (Tech)' },
    { id: 'mono', name: 'JetBrains Mono (Cyber)' },
    { id: 'merriweather', name: 'Merriweather (Academic)' },
    { id: 'montserrat', name: 'Montserrat (Bold)' },
    { id: 'oswald', name: 'Oswald (Headline)' },
  ];

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
            3
          </span>
          Colour Carousel & Document Details
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Choose a color palette from the carousel, customize text colors, fonts, and upload your personal logo
        </p>
      </div>

      {/* 1. COLOR PALETTE CAROUSEL */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Color Carousel Presets (Click to Apply)
        </label>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              coverData.accentColor === preset.accent &&
              coverData.titleColor === preset.titleColor;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`flex-shrink-0 p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between w-36 h-24 relative overflow-hidden ${
                  isSelected
                    ? 'border-yellow-400 ring-2 ring-yellow-400/30 bg-zinc-900 shadow-md scale-102'
                    : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                {/* Visual color bar preview */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full shadow-xs border border-white/20"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <span
                    className="w-4 h-4 rounded-full shadow-xs border border-white/20"
                    style={{ backgroundColor: preset.titleColor }}
                  />
                  <span
                    className="w-4 h-4 rounded-full shadow-xs border border-zinc-700"
                    style={{ backgroundColor: preset.primary }}
                  />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white truncate">
                    {preset.name}
                  </h4>
                  <span
                    className="text-[10px] font-mono font-semibold truncate block mt-0.5"
                    style={{ color: preset.accent }}
                  >
                    {preset.accent}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CUSTOM COLOR PICKERS */}
      <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Fine-Tune Individual Colors
          </span>
          <button
            type="button"
            onClick={() => {
              applyPreset(COLOR_PRESETS[0]);
            }}
            className="text-[11px] text-zinc-400 hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Colors
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-zinc-400 block mb-1">Title Color</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={coverData.titleColor || coverData.primaryColor}
                onChange={(e) => updateField('titleColor', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-white uppercase">
                {coverData.titleColor || coverData.primaryColor}
              </span>
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block mb-1">Accent Highlight</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={coverData.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-white uppercase">
                {coverData.accentColor}
              </span>
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block mb-1">Subtitle Color</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={coverData.subtitleColor || coverData.accentColor}
                onChange={(e) => updateField('subtitleColor', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-white uppercase">
                {coverData.subtitleColor || coverData.accentColor}
              </span>
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block mb-1">Body Text Color</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={coverData.textColor || '#334155'}
                onChange={(e) => updateField('textColor', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-white uppercase">
                {coverData.textColor || '#334155'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DOCUMENT METADATA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Document Title (On Cover)
          </label>
          <input
            type="text"
            value={coverData.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Subtitle / Tagline
          </label>
          <input
            type="text"
            value={coverData.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Author / Prepared By
          </label>
          <input
            type="text"
            value={coverData.preparedBy}
            onChange={(e) => updateField('preparedBy', e.target.value)}
            placeholder="e.g. Atif Soomro"
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Organization / Company
          </label>
          <input
            type="text"
            value={coverData.organization}
            onChange={(e) => updateField('organization', e.target.value)}
            placeholder="e.g. Apex Global"
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
          />
        </div>
      </div>

      {/* 4. FONT & LOGO PICKERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Font Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            Cover Typography Font
          </label>
          <select
            value={coverData.font}
            onChange={(e) => updateField('font', e.target.value as FontStyle)}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white font-medium focus:border-yellow-400 focus:outline-none cursor-pointer"
          >
            {fonts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Personal Logo Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Personal Logo (Optional)
            </span>
            {coverData.logoUrl && (
              <button
                type="button"
                onClick={() => updateField('logoUrl', undefined)}
                className="text-[10px] text-red-400 hover:underline cursor-pointer"
              >
                Remove
              </button>
            )}
          </label>

          <button
            type="button"
            onClick={() => customLogoInputRef.current?.click()}
            className="w-full py-1.5 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-yellow-400 text-xs text-zinc-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {coverData.logoUrl ? 'Change Logo Image' : 'Upload Logo (PNG, SVG, JPG)'}
          </button>
          <input
            ref={customLogoInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomLogoUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
