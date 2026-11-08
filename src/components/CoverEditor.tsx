import React, { useRef, useState } from 'react';
import { CoverData, FontStyle, PaperSize, QRPosition } from '../types';
import { PRESET_IMAGES } from '../constants/themes';
import {
  Type,
  Image as ImageIcon,
  QrCode,
  Upload,
  Calendar,
  Building,
  User as UserIcon,
  FileCode,
  AlignLeft,
  Palette,
  Check,
  Sliders,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface CoverEditorProps {
  coverData: CoverData;
  onChange: (updated: CoverData) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({ coverData, onChange }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'visuals' | 'colors' | 'qr'>('content');
  const [showPresetGallery, setShowPresetGallery] = useState(false);
  const customImageInputRef = useRef<HTMLInputElement>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);
  const customLogoInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof CoverData>(field: K, value: CoverData[K]) => {
    onChange({
      ...coverData,
      [field]: value,
    });
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateField('imageUrl', event.target.result as string);
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

  const fonts: { id: FontStyle; name: string; desc: string }[] = [
    { id: 'inter', name: 'Inter', desc: 'Modern & Clean Sans' },
    { id: 'playfair', name: 'Playfair Display', desc: 'Editorial Serif Elegance' },
    { id: 'space', name: 'Space Grotesk', desc: 'Tech Neo Geometric' },
    { id: 'mono', name: 'JetBrains Mono', desc: 'Technical Cyber Monospace' },
    { id: 'merriweather', name: 'Merriweather', desc: 'Academic Book Authority' },
    { id: 'montserrat', name: 'Montserrat', desc: 'Contemporary Bold Sans' },
    { id: 'oswald', name: 'Oswald', desc: 'Punchy Industrial Headline' },
  ];

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 shadow-lg overflow-hidden">
      {/* Editor Sub-tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/80 p-2 gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'content'
              ? 'bg-yellow-400 text-black shadow-xs'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Content</span>
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'colors'
              ? 'bg-yellow-400 text-black shadow-xs'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Fonts & Colors</span>
        </button>
        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'visuals'
              ? 'bg-yellow-400 text-black shadow-xs'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photos & Logo</span>
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'qr'
              ? 'bg-yellow-400 text-black shadow-xs'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Customizer</span>
        </button>
      </div>

      <div className="p-5">
        {/* TAB 1: Document Content */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={coverData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Enterprise Security Architecture Review"
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Subtitle / Tagline
              </label>
              <input
                type="text"
                value={coverData.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
                placeholder="e.g. Comprehensive Annual Audit & Mitigation Roadmap"
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-yellow-400" />
                  Prepared By / Author
                </label>
                <input
                  type="text"
                  value={coverData.preparedBy}
                  onChange={(e) => updateField('preparedBy', e.target.value)}
                  placeholder="e.g. Jane Doe, Lead Architect"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-yellow-400" />
                  Organization / Company
                </label>
                <input
                  type="text"
                  value={coverData.organization}
                  onChange={(e) => updateField('organization', e.target.value)}
                  placeholder="e.g. Apex Global Systems Inc."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                  Date / Edition
                </label>
                <input
                  type="text"
                  value={coverData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  placeholder="e.g. November 2026 • Rev 2.1"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                  Document ID / Ref Number
                </label>
                <input
                  type="text"
                  value={coverData.documentId}
                  onChange={(e) => updateField('documentId', e.target.value)}
                  placeholder="e.g. DOC-2026-X89"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none font-mono text-yellow-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-yellow-400" />
                Executive Summary / Description
              </label>
              <textarea
                rows={3}
                value={coverData.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Brief synopsis printed on the cover page detailing core findings..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Custom Fonts & Text Colors */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            {/* Typography Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">
                Document Typography
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fonts.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateField('font', f.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      coverData.font === f.id
                        ? 'border-yellow-400 bg-yellow-400/10 ring-1 ring-yellow-400/30'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{f.name}</span>
                      {coverData.font === f.id && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Text Colors */}
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                  Custom Text Colors
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      ...coverData,
                      titleColor: undefined,
                      subtitleColor: undefined,
                      textColor: undefined,
                    });
                  }}
                  className="text-[11px] text-zinc-400 hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Theme Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Title Color */}
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Title Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coverData.titleColor || coverData.primaryColor}
                      onChange={(e) => updateField('titleColor', e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={coverData.titleColor || coverData.primaryColor}
                      onChange={(e) => updateField('titleColor', e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </div>

                {/* Subtitle Color */}
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Subtitle Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coverData.subtitleColor || coverData.accentColor}
                      onChange={(e) => updateField('subtitleColor', e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={coverData.subtitleColor || coverData.accentColor}
                      onChange={(e) => updateField('subtitleColor', e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </div>

                {/* Body/Metadata Color */}
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Body & Meta Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coverData.textColor || '#334155'}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={coverData.textColor || '#334155'}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Accent & Primary Colors */}
            <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Primary Theme Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={coverData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Highlight Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverData.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={coverData.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Visuals, Logo & Background Image */}
        {activeTab === 'visuals' && (
          <div className="space-y-4">
            {/* Personal Logo Upload */}
            <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Personal / Organization Logo
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    PNG, SVG, or JPG logo displayed on cover and in QR code
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {coverData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('logoUrl', undefined)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => customLogoInputRef.current?.click()}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {coverData.logoUrl ? 'Replace Logo' : 'Upload Logo'}
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

              {coverData.logoUrl && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-4">
                  <div className="w-14 h-14 bg-white p-1 rounded-lg border border-zinc-700 flex items-center justify-center">
                    <img
                      src={coverData.logoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Logo Size
                      </span>
                      <select
                        value={coverData.logoSize || 'medium'}
                        onChange={(e) => updateField('logoSize', e.target.value as any)}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded text-white"
                      >
                        <option value="small">Small (32px)</option>
                        <option value="medium">Medium (48px)</option>
                        <option value="large">Large (64px)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Position
                      </span>
                      <select
                        value={coverData.logoPosition || 'top-left'}
                        onChange={(e) => updateField('logoPosition', e.target.value as any)}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded text-white"
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                        <option value="qr-center">QR Center Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Background Image Upload */}
            <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Custom Background Image
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Apply full wallpaper or custom watermark image behind cover
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {coverData.backgroundImageUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('backgroundImageUrl', undefined)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => customBgInputRef.current?.click()}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {coverData.backgroundImageUrl ? 'Change Background' : 'Upload Background'}
                  </button>
                  <input
                    ref={customBgInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomBgUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {coverData.backgroundImageUrl && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Background Opacity:</span>
                    <span className="font-mono text-yellow-400">
                      {Math.round((coverData.backgroundImageOpacity ?? 0.35) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={coverData.backgroundImageOpacity ?? 0.35}
                    onChange={(e) => updateField('backgroundImageOpacity', parseFloat(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Banner / Header Photo Preset Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Preset Header Photo
                </span>
                <button
                  type="button"
                  onClick={() => customImageInputRef.current?.click()}
                  className="text-xs text-yellow-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-semibold"
                >
                  <Upload className="w-3 h-3" />
                  Upload Header Image
                </button>
                <input
                  ref={customImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {PRESET_IMAGES.slice(0, 8).map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => updateField('imageUrl', img.url)}
                    className={`relative rounded-lg overflow-hidden h-14 border transition-all cursor-pointer ${
                      coverData.imageUrl === img.url
                        ? 'ring-2 ring-yellow-400 border-transparent'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[8px] px-1 truncate">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QR Code Customizer */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">
                Printed QR Call-To-Action Text
              </label>
              <input
                type="text"
                value={coverData.qrCallToAction}
                onChange={(e) => updateField('qrCallToAction', e.target.value)}
                placeholder="e.g. Scan with your phone camera to view full soft copy on Google Drive"
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  QR Position
                </label>
                <select
                  value={coverData.qrPosition}
                  onChange={(e) => updateField('qrPosition', e.target.value as QRPosition)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white"
                >
                  <option value="bottom-right">Bottom Right Corner (Standard)</option>
                  <option value="bottom-center">Bottom Center (Symmetric)</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="sidebar">Sidebar Column</option>
                  <option value="hero">Featured Center Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Logo Inside QR
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coverData.showLogoInQR}
                    onChange={(e) => updateField('showLogoInQR', e.target.checked)}
                    className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
                  />
                  <span className="text-xs text-zinc-300">
                    Embed Logo in QR Center
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  QR Pattern Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverData.qrColor}
                    onChange={(e) => updateField('qrColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={coverData.qrColor}
                    onChange={(e) => updateField('qrColor', e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  QR Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverData.qrBgColor}
                    onChange={(e) => updateField('qrBgColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={coverData.qrBgColor}
                    onChange={(e) => updateField('qrBgColor', e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono uppercase rounded bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
