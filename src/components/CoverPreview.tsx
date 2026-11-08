import React, { useState } from 'react';
import { CoverData, CoverTheme, UploadedDocInfo } from '../types';
import { COVER_THEMES } from '../constants/themes';
import {
  ExternalLink,
  QrCode,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Mail,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CoverPreviewProps {
  coverData: CoverData;
  currentDoc: UploadedDocInfo | null;
  driveLink: string | null;
  qrDataUrl: string | null;
  onPrint: () => void;
  onOpenExportModal: () => void;
  onOpenEmailModal: () => void;
  isDriveUploaded: boolean;
}

export const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverData,
  currentDoc,
  driveLink,
  qrDataUrl,
  onPrint,
  onOpenExportModal,
  onOpenEmailModal,
  isDriveUploaded,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState<number>(0); // 0 = Cover Page, 1..N = Original Document Pages
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  const theme = COVER_THEMES.find((t) => t.id === coverData.themeId) || COVER_THEMES[0];

  // Font styling class mapping
  const getFontFamily = () => {
    switch (coverData.font) {
      case 'playfair':
        return 'font-serif';
      case 'space':
        return 'font-sans tracking-tight';
      case 'mono':
        return 'font-mono';
      case 'merriweather':
        return 'font-serif';
      case 'montserrat':
        return 'font-sans font-medium';
      case 'oswald':
        return 'font-sans tracking-tight uppercase';
      case 'inter':
      default:
        return 'font-sans';
    }
  };

  const isDarkModeTheme = theme.id === 'cyber-slate' || theme.id === 'imperial-gold';

  // Effective colors
  const effectiveTitleColor = coverData.titleColor || (isDarkModeTheme ? '#ffffff' : coverData.primaryColor);
  const effectiveSubtitleColor = coverData.subtitleColor || coverData.accentColor;
  const effectiveTextColor = coverData.textColor || (isDarkModeTheme ? '#e2e8f0' : '#334155');

  // Total pages calculation: 1 Cover Page + Original Document Pages
  const originalPagesCount = currentDoc?.pageCount || (currentDoc?.renderedPagePreviews?.length ?? (currentDoc ? 1 : 0));
  const totalPages = 1 + (currentDoc ? originalPagesCount : 0);

  // Render Cover Page element
  const renderCoverPage = (scale = 'normal') => (
    <div
      id="printable-cover-sheet"
      className={`w-full max-w-[540px] aspect-[1/1.414] bg-white rounded-xl shadow-2xl border border-zinc-800 relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${getFontFamily()} ${
        scale === 'thumbnail' ? 'pointer-events-none select-none text-[8px]' : ''
      }`}
      style={{
        backgroundColor: isDarkModeTheme ? theme.backgroundColor : '#ffffff',
        color: isDarkModeTheme ? '#f8fafc' : '#0f172a',
      }}
    >
      {/* Custom Full Background Image Overlay */}
      {coverData.backgroundImageUrl && (
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center z-0"
          style={{
            backgroundImage: `url(${coverData.backgroundImageUrl})`,
            opacity: coverData.backgroundImageOpacity ?? 0.35,
          }}
        />
      )}

      {/* 1. Banner Top / Split Vertical style */}
      {(theme.layoutStyle === 'banner-top' || theme.layoutStyle === 'split-vertical') && !coverData.backgroundImageUrl && (
        <div className="relative z-10">
          <div
            className="relative w-full h-44 overflow-hidden"
            style={{ backgroundColor: coverData.primaryColor }}
          >
            {coverData.imageUrl && (
              <img
                src={coverData.imageUrl}
                alt="Cover Banner"
                className="w-full h-full object-cover opacity-90"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

            <div className="absolute top-4 inset-x-6 flex items-center justify-between text-white text-[11px] font-medium tracking-wider">
              <span className="font-mono opacity-90">{coverData.documentId}</span>
              <span className="font-semibold uppercase tracking-wider">{coverData.organization}</span>
            </div>

            <div
              className="absolute bottom-0 inset-x-0 h-1.5"
              style={{ backgroundColor: coverData.accentColor }}
            />
          </div>
        </div>
      )}

      {/* 2. Bordered Formal / Academic style */}
      {theme.layoutStyle === 'bordered-formal' && (
        <div
          className="absolute inset-3 border-2 pointer-events-none rounded z-10"
          style={{ borderColor: coverData.primaryColor }}
        >
          <div
            className="absolute inset-1.5 border pointer-events-none"
            style={{ borderColor: coverData.accentColor }}
          />
        </div>
      )}

      {/* 3. Minimal Frame style */}
      {theme.layoutStyle === 'minimal-frame' && (
        <div
          className="absolute inset-4 border pointer-events-none z-10"
          style={{ borderColor: `${coverData.accentColor}55` }}
        >
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: coverData.accentColor }} />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: coverData.accentColor }} />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: coverData.accentColor }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: coverData.accentColor }} />
        </div>
      )}

      {/* 4. Geometric / Cyber Grid style */}
      {theme.layoutStyle === 'geometric-grid' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="h-1.5 w-full" style={{ backgroundColor: coverData.accentColor }} />
          <div className="w-1.5 h-full absolute left-6 top-0" style={{ backgroundColor: `${coverData.accentColor}33` }} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between z-10 relative">
        <div>
          {/* Optional Org Logo */}
          {coverData.logoUrl && coverData.logoPosition !== 'qr-center' && (
            <div
              className={`mb-4 flex ${
                coverData.logoPosition === 'top-center'
                  ? 'justify-center'
                  : coverData.logoPosition === 'top-right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <img
                src={coverData.logoUrl}
                alt="Logo"
                className={`object-contain ${
                  coverData.logoSize === 'large'
                    ? 'h-14 max-w-[200px]'
                    : coverData.logoSize === 'small'
                    ? 'h-8 max-w-[120px]'
                    : 'h-10 max-w-[160px]'
                }`}
              />
            </div>
          )}

          {/* Header meta if not in banner top */}
          {((theme.layoutStyle !== 'banner-top' && theme.layoutStyle !== 'split-vertical') || coverData.backgroundImageUrl) && (
            <div className="flex items-center justify-between text-[11px] mb-6 pb-2 border-b border-slate-200/50">
              <span className="font-mono font-semibold" style={{ color: coverData.accentColor }}>
                {coverData.documentId || 'REF: UNASSIGNED'}
              </span>
              <span className="font-bold uppercase tracking-wider text-xs">
                {coverData.organization}
              </span>
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="mt-2 space-y-2.5">
            <h1
              className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight break-words"
              style={{ color: effectiveTitleColor }}
            >
              {coverData.title || 'Untitled Document'}
            </h1>

            {coverData.subtitle && (
              <p
                className="text-sm font-medium leading-normal opacity-90 break-words"
                style={{ color: effectiveSubtitleColor }}
              >
                {coverData.subtitle}
              </p>
            )}

            <div
              className="w-12 h-1 rounded-full my-3"
              style={{ backgroundColor: coverData.accentColor }}
            />
          </div>

          {/* Summary / Notes Paragraph */}
          {coverData.summary && (
            <div className="mt-4">
              <p
                className="text-xs leading-relaxed line-clamp-4"
                style={{ color: effectiveTextColor }}
              >
                {coverData.summary}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Meta & QR Code Section */}
        <div className="pt-6 border-t border-slate-200/60 flex items-end justify-between gap-4">
          <div className="space-y-2 text-xs" style={{ color: effectiveTextColor }}>
            {coverData.preparedBy && (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                  Prepared By
                </span>
                <span className="font-semibold">{coverData.preparedBy}</span>
              </div>
            )}

            {coverData.date && (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                  Date & Version
                </span>
                <span className="font-medium opacity-85">{coverData.date}</span>
              </div>
            )}

            <div className="pt-2 text-[9px] opacity-50 font-mono">
              Official Soft Copy • Certified on Google Drive
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="p-2 rounded-xl border shadow-md flex flex-col items-center"
              style={{
                backgroundColor: coverData.qrBgColor || '#ffffff',
                borderColor: '#cbd5e1',
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Drive Document QR Code"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-md"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 rounded-md flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <QrCode className="w-8 h-8 mb-1 animate-pulse" />
                  <span className="text-[9px]">Generating QR...</span>
                </div>
              )}

              <span
                className="text-[8px] font-bold tracking-wider mt-1.5 uppercase text-center"
                style={{ color: '#0f172a' }}
              >
                Scan For Drive Copy
              </span>
            </div>

            <p className="text-[9px] text-center max-w-[130px] mt-1.5 opacity-70 leading-tight">
              {coverData.qrCallToAction || 'Scan with phone camera to view and download soft copy.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Document Page (Page 2, 3, 4...)
  const renderDocumentPage = (pageIndex: number) => {
    // 0 is Cover, so original page is pageIndex - 1
    const origIndex = pageIndex - 1;
    const previewImg = currentDoc?.renderedPagePreviews?.[origIndex];

    if (previewImg) {
      return (
        <div className="w-full max-w-[540px] aspect-[1/1.414] bg-white rounded-xl shadow-2xl border border-zinc-800 overflow-hidden relative">
          <img
            src={previewImg}
            alt={`Page ${pageIndex + 1}`}
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-3 right-4 px-2 py-0.5 rounded bg-black/70 text-white font-mono text-[10px]">
            Page {pageIndex + 1} of {totalPages}
          </div>
        </div>
      );
    }

    // Fallback visual document facsimile for Word documents / text files
    return (
      <div className="w-full max-w-[540px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl border border-zinc-800 p-8 sm:p-10 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-mono">
            <span>{currentDoc?.name || 'Document'}</span>
            <span>SECTION {origIndex + 1}</span>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              {origIndex === 0 ? 'Document Content & Executive Overview' : `Chapter ${origIndex + 1}: Detailed Analysis`}
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed">
              {currentDoc?.extractedText ||
                'This section contains verified document data, body paragraphs, and appendices preserved from your original uploaded file. The accompanying QR code on Page 1 links directly to this soft copy stored on Google Drive.'}
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Original Document Metadata
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div>File Type: <span className="font-semibold uppercase">{currentDoc?.extension}</span></div>
                <div>Size: <span className="font-semibold">{((currentDoc?.size || 0) / 1024).toFixed(1)} KB</span></div>
                <div>Word Count: <span className="font-semibold">{currentDoc?.wordCount || '~450'} words</span></div>
                <div>Soft Copy: <span className="font-semibold text-emerald-600">Google Drive Linked</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{coverData.organization || 'Apex Global'}</span>
          <span>Page {pageIndex + 1} of {totalPages}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black/95 p-4 sm:p-8 backdrop-blur-md overflow-y-auto' : ''}`}>
      {/* Top Preview Controls Bar with Multi-Page Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Print Document Preview
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-400 text-black">
            {totalPages} Pages Total
          </span>
        </div>

        {/* Multi-Page View Mode & Page Navigator */}
        <div className="flex items-center gap-2">
          {viewMode === 'single' ? (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs text-zinc-300">
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-yellow-300 text-[11px]">
                {activePageIndex === 0 ? 'Page 1 (Cover)' : `Page ${activePageIndex + 1} of ${totalPages}`}
              </span>
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={activePageIndex === totalPages - 1}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* Grid / Single toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'grid'
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
            }`}
            title="Toggle between single page and all pages view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === 'grid' ? 'Single' : `All ${totalPages} Pages`}</span>
          </button>

          {driveLink && (
            <a
              href={driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-900/60 transition-colors"
              title="Test the Google Drive link that will open when someone scans this QR"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drive Link</span>
            </a>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Page Stage */}
      <div className="flex-1 flex justify-center items-start">
        {viewMode === 'grid' ? (
          /* ALL PAGES GRID VIEW: Displays Cover Page (Page 1) + All Original Pages */
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[750px] overflow-y-auto pr-1">
            {/* Page 1: Cover Page */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                Page 1 • Custom Cover & QR
              </span>
              {renderCoverPage()}
            </div>

            {/* Remaining Pages: Document Content Pages */}
            {Array.from({ length: totalPages - 1 }, (_, i) => i + 1).map((pNum) => (
              <div key={pNum} className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Page {pNum + 1} of {totalPages} • Original Document
                </span>
                {renderDocumentPage(pNum)}
              </div>
            ))}
          </div>
        ) : (
          /* SINGLE PAGE VIEW: Focused on active page */
          <div className="w-full flex justify-center">
            {activePageIndex === 0 ? renderCoverPage() : renderDocumentPage(activePageIndex)}
          </div>
        )}
      </div>

      {/* Filmstrip / Page Thumbnail Picker */}
      {totalPages > 1 && viewMode === 'single' && (
        <div className="mt-3 py-2 px-1 flex items-center justify-center gap-2 overflow-x-auto scrollbar-none">
          {Array.from({ length: totalPages }, (_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActivePageIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                activePageIndex === idx
                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {idx === 0 ? <QrCode className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{idx === 0 ? 'Page 1 (Cover + QR)' : `Page ${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons Below Preview */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#121215] p-3.5 rounded-2xl border border-yellow-500/25">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isDriveUploaded ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'
            }`}
          />
          <span className="text-xs font-bold text-white">
            {isDriveUploaded ? 'Drive Link Active • Public Viewer QR' : 'Local Preview (Upload to Drive for QR)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print All {totalPages} Pages
          </button>
          <button
            onClick={onOpenEmailModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 border border-yellow-400/30 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            Share Email
          </button>
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Download New Version ({totalPages} Pages)
          </button>
        </div>
      </div>
    </div>
  );
};
