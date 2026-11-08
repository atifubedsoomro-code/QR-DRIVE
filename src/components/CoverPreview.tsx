import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CoverData, UploadedDocInfo } from '../types';
import { COVER_THEMES } from '../constants/themes';
import {
  ExternalLink,
  QrCode,
  Maximize2,
  Minimize2,
  Printer,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface CoverPreviewProps {
  coverData: CoverData;
  currentDoc: UploadedDocInfo | null;
  driveLink: string | null;
  qrDataUrl: string | null;
  onPrint?: () => void;
  isDriveUploaded: boolean;
}

// The paper is always laid out at this fixed "design" size and then scaled to fit,
// so the whole page is visible at any screen size and the text never reflows.
const PAPER_W = 500;
const paperHeightFor = (size: CoverData['paperSize']) =>
  size === 'letter' ? Math.round((PAPER_W * 792) / 612) : Math.round((PAPER_W * 841.89) / 595.28);

interface FitPageProps {
  width: number;
  height: number;
  /** contain: fit inside the parent box (width AND height). width: fit parent width, height follows. */
  mode: 'contain' | 'width';
  children: React.ReactNode;
}

const FitPage: React.FC<FitPageProps> = ({ width, height, mode, children }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      const byWidth = rect.width / width;
      const next =
        mode === 'width' ? byWidth : rect.height > 0 ? Math.min(byWidth, rect.height / height) * 0.97 : byWidth;
      setScale(Math.max(0.05, next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, mode]);

  return (
    <div
      ref={hostRef}
      className={
        mode === 'contain'
          ? 'w-full h-full flex items-center justify-center overflow-hidden'
          : 'w-full flex justify-center'
      }
    >
      <div className="fit-wrapper flex-shrink-0" style={{ width: width * scale, height: height * scale }}>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
};

export const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverData,
  currentDoc,
  driveLink,
  qrDataUrl,
  onPrint,
  isDriveUploaded,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState<number>(0); // 0 = Cover Page, 1..N = Original Document Pages
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  const theme = COVER_THEMES.find((t) => t.id === coverData.themeId) || COVER_THEMES[0];
  const paperH = paperHeightFor(coverData.paperSize);

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

  const isDarkModeTheme = !!theme.isDark;
  const isCentered = theme.layoutStyle === 'plain-centered';
  const isLeftBar = theme.layoutStyle === 'plain-left-bar';

  const effectiveTitleColor = coverData.titleColor || (isDarkModeTheme ? '#ffffff' : coverData.primaryColor);
  const effectiveSubtitleColor = coverData.subtitleColor || coverData.accentColor;
  const effectiveTextColor = coverData.textColor || (isDarkModeTheme ? '#cbd5e1' : '#334155');

  // Total pages calculation: 1 Cover Page + Original Document Pages
  const originalPagesCount = currentDoc?.pageCount || (currentDoc?.renderedPagePreviews?.length ?? (currentDoc ? 1 : 0));
  const totalPages = 1 + (currentDoc ? originalPagesCount : 0);

  // Keep the selected page valid when the document changes
  useEffect(() => {
    if (activePageIndex > totalPages - 1) setActivePageIndex(0);
  }, [totalPages, activePageIndex]);

  const renderCoverPage = (withId = true) => (
    <div
      id={withId ? 'printable-cover-sheet' : undefined}
      className={`rounded-xl shadow-2xl border border-zinc-800 relative overflow-hidden flex flex-col justify-between ${getFontFamily()}`}
      style={{
        width: PAPER_W,
        height: paperH,
        backgroundColor: theme.backgroundColor,
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

      {/* Banner Top / Split Vertical Layout */}
      {(theme.layoutStyle === 'banner-top' || theme.layoutStyle === 'split-vertical') && !coverData.backgroundImageUrl && (
        <div className="relative z-10">
          <div className="relative w-full h-40 overflow-hidden" style={{ backgroundColor: coverData.primaryColor }}>
            {coverData.imageUrl && (
              <img src={coverData.imageUrl} alt="Cover Banner" className="w-full h-full object-cover opacity-90" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

            {(coverData.documentId || coverData.organization) && (
              <div className="absolute top-4 inset-x-6 flex items-center justify-between text-white text-[11px] font-medium tracking-wider">
                {coverData.documentId ? <span className="font-mono opacity-90">{coverData.documentId}</span> : <span />}
                {coverData.organization && (
                  <span className="font-semibold uppercase tracking-wider">{coverData.organization}</span>
                )}
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 h-1.5" style={{ backgroundColor: coverData.accentColor }} />
          </div>
        </div>
      )}

      {/* Bordered Formal Layout */}
      {theme.layoutStyle === 'bordered-formal' && (
        <div
          className="absolute inset-3 border-2 pointer-events-none rounded z-10"
          style={{ borderColor: coverData.primaryColor }}
        >
          <div className="absolute inset-1.5 border pointer-events-none" style={{ borderColor: coverData.accentColor }} />
        </div>
      )}

      {/* Minimal Frame Layout */}
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

      {/* Geometric / Cyber Grid Layout */}
      {theme.layoutStyle === 'geometric-grid' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="h-1.5 w-full" style={{ backgroundColor: coverData.accentColor }} />
          <div className="w-1.5 h-full absolute left-6 top-0" style={{ backgroundColor: `${coverData.accentColor}44` }} />
        </div>
      )}

      {/* Card Centered Layout */}
      {theme.layoutStyle === 'card-centered' && (
        <div
          className="absolute inset-x-8 top-12 bottom-12 rounded-xl border pointer-events-none z-0"
          style={{ borderColor: `${coverData.accentColor}33`, backgroundColor: isDarkModeTheme ? '#18181b' : '#fafafa' }}
        />
      )}

      {/* Bottom Accent Layout */}
      {theme.layoutStyle === 'bottom-accent' && (
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none z-0 opacity-15" style={{ backgroundColor: coverData.primaryColor }} />
      )}

      {/* Plain layouts: rules and bars only, never pictures */}
      {theme.layoutStyle === 'plain-rule' && (
        <>
          <div className="absolute top-8 inset-x-10 h-0.5 pointer-events-none z-10" style={{ backgroundColor: coverData.primaryColor }} />
          <div className="absolute bottom-6 inset-x-10 h-px pointer-events-none z-10" style={{ backgroundColor: coverData.accentColor }} />
        </>
      )}
      {isLeftBar && (
        <>
          <div className="absolute left-0 inset-y-0 w-3 pointer-events-none z-10" style={{ backgroundColor: coverData.primaryColor }} />
          <div className="absolute left-5 inset-y-0 w-px pointer-events-none z-10" style={{ backgroundColor: `${coverData.accentColor}66` }} />
        </>
      )}

      {/* Main Content Area */}
      <div className={`p-10 flex-1 flex flex-col justify-between z-10 relative ${isLeftBar ? 'pl-14' : ''}`}>
        <div className={isCentered ? 'flex-1 flex flex-col justify-center' : ''}>
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

          {/* Header meta (ONLY rendered if provided) */}
          {(coverData.documentId || coverData.organization) &&
            ((theme.layoutStyle !== 'banner-top' && theme.layoutStyle !== 'split-vertical') || coverData.backgroundImageUrl) && (
              <div
                className={`flex items-center text-[11px] mb-6 pb-2 border-b border-slate-200/50 ${
                  isCentered ? 'justify-center gap-4' : 'justify-between'
                }`}
              >
                {coverData.documentId ? (
                  <span className="font-mono font-semibold" style={{ color: coverData.accentColor }}>
                    {coverData.documentId}
                  </span>
                ) : (
                  !isCentered && <span />
                )}
                {coverData.organization && (
                  <span className="font-bold uppercase tracking-wider text-xs">{coverData.organization}</span>
                )}
              </div>
            )}

          {/* Title & Subtitle */}
          <div className={`mt-2 space-y-2.5 ${isCentered ? 'text-center' : ''}`}>
            <h1
              className="text-3xl font-extrabold leading-tight tracking-tight break-words"
              style={{ color: effectiveTitleColor }}
            >
              {coverData.title || currentDoc?.extractedTitle || currentDoc?.name || 'Document Title'}
            </h1>

            {coverData.subtitle && (
              <p className="text-sm font-medium leading-normal opacity-90 break-words" style={{ color: effectiveSubtitleColor }}>
                {coverData.subtitle}
              </p>
            )}

            <div
              className={`w-12 h-1 rounded-full my-3 ${isCentered ? 'mx-auto' : ''}`}
              style={{ backgroundColor: coverData.accentColor }}
            />
          </div>

          {coverData.summary && (
            <div className={`mt-4 ${isCentered ? 'text-center' : ''}`}>
              <p className="text-xs leading-relaxed line-clamp-4" style={{ color: effectiveTextColor }}>
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
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Prepared By</span>
                <span className="font-semibold">{coverData.preparedBy}</span>
              </div>
            )}

            {coverData.date && (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Date</span>
                <span className="font-medium opacity-85">{coverData.date}</span>
              </div>
            )}

            <div className="pt-2 text-[9px] opacity-50 font-mono">Official Soft Copy • Google Drive</div>
          </div>

          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="p-2 rounded-xl border shadow-md flex flex-col items-center"
              style={{ backgroundColor: coverData.qrBgColor || '#ffffff', borderColor: '#cbd5e1' }}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Drive Document QR Code" className="w-28 h-28 object-contain rounded-md" />
              ) : (
                <div className="w-28 h-28 bg-slate-100 rounded-md flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <QrCode className="w-8 h-8 mb-1 animate-pulse" />
                  <span className="text-[9px]">Generating QR...</span>
                </div>
              )}

              <span className="text-[8px] font-bold tracking-wider mt-1.5 uppercase text-center" style={{ color: '#0f172a' }}>
                Scan For Drive Copy
              </span>
            </div>

            <p className="text-[9px] text-center max-w-[130px] mt-1.5 opacity-70 leading-tight">
              {coverData.qrCallToAction || 'Scan with phone camera to view full soft copy on Google Drive.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Document pages (Page 2, 3, 4...)
  const renderDocumentPage = (pageIndex: number) => {
    const origIndex = pageIndex - 1;
    const previewImg = currentDoc?.renderedPagePreviews?.[origIndex];

    if (previewImg) {
      return (
        <div
          className="bg-white rounded-xl shadow-2xl border border-zinc-800 overflow-hidden relative"
          style={{ width: PAPER_W, height: paperH }}
        >
          <img src={previewImg} alt={`Page ${pageIndex + 1}`} className="w-full h-full object-contain" />
          <div className="absolute bottom-3 right-4 px-2 py-0.5 rounded bg-black/75 text-white font-mono text-[10px]">
            Page {pageIndex + 1} of {totalPages}
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-white text-slate-900 rounded-xl shadow-2xl border border-zinc-800 p-10 flex flex-col justify-between"
        style={{ width: PAPER_W, height: paperH }}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-mono">
            <span className="truncate max-w-[200px]">{currentDoc?.name || 'Document'}</span>
            <span>Page {pageIndex + 1}</span>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {origIndex === 0 ? 'Document Content' : `Section ${origIndex + 1}`}
            </h3>

            {currentDoc?.extractedText ? (
              <p className="text-xs text-slate-700 leading-relaxed font-sans">{currentDoc.extractedText}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Content from your uploaded file ({currentDoc?.name}). The QR code on Page 1 links directly to this full
                original document on Google Drive.
              </p>
            )}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 mt-6 text-xs text-slate-600">
              <div>
                File: <span className="font-semibold text-slate-800">{currentDoc?.name}</span>
              </div>
              <div>
                Format: <span className="font-semibold uppercase text-slate-800">{currentDoc?.extension}</span>
              </div>
              <div>
                Soft Copy: <span className="font-semibold text-emerald-600">Drive Cloud Linked</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{coverData.organization || 'Document'}</span>
          <span>
            Page {pageIndex + 1} of {totalPages}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black/95 p-4 sm:p-8 backdrop-blur-md flex flex-col'
          : 'relative flex flex-col h-full min-h-0'
      }
    >
      {/* Top Preview Controls Bar */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Live Preview
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
            {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'single' && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs text-zinc-300">
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-yellow-300 text-[11px] whitespace-nowrap">
                {activePageIndex === 0 ? 'Page 1 (Cover)' : `Page ${activePageIndex + 1} of ${totalPages}`}
              </span>
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={activePageIndex >= totalPages - 1}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

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
            <span className="hidden sm:inline">{viewMode === 'grid' ? 'Single' : `All ${totalPages}`}</span>
          </button>

          {driveLink && (
            <a
              href={driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-900/60 transition-colors"
              title="Test the Google Drive link that opens when scanning this QR"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drive Link</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Page stage: fills the space that is left and scales the paper to fit it */}
      <div
        className={`min-h-0 ${viewMode === 'grid' ? 'overflow-y-auto pr-1' : ''} ${
          isFullscreen ? 'flex-1' : 'h-[68vh] lg:h-auto lg:flex-1'
        }`}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                Page 1 • Cover & QR
              </span>
              <FitPage width={PAPER_W} height={paperH} mode="width">
                {renderCoverPage(false)}
              </FitPage>
            </div>

            {Array.from({ length: totalPages - 1 }, (_, i) => i + 1).map((pNum) => (
              <div key={pNum} className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Page {pNum + 1} of {totalPages} • Original
                </span>
                <FitPage width={PAPER_W} height={paperH} mode="width">
                  {renderDocumentPage(pNum)}
                </FitPage>
              </div>
            ))}
          </div>
        ) : (
          <FitPage width={PAPER_W} height={paperH} mode="contain">
            {activePageIndex === 0 ? renderCoverPage(true) : renderDocumentPage(activePageIndex)}
          </FitPage>
        )}
      </div>

      {/* Filmstrip / Page Navigation */}
      {totalPages > 1 && viewMode === 'single' && (
        <div className="flex-shrink-0 mt-3 py-1 px-1 flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: totalPages }, (_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActivePageIndex(idx)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                activePageIndex === idx
                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {idx === 0 ? <QrCode className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{idx === 0 ? 'Cover + QR' : `Page ${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex-shrink-0 mt-2 flex items-center justify-between text-xs px-2 py-1 text-zinc-400">
        <span className="flex items-center gap-1.5">
          {isDriveUploaded ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">QR Linked to Public Google Drive File</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Drive QR Ready (Upload in Step 4)</span>
            </>
          )}
        </span>

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="text-zinc-400 hover:text-yellow-400 flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <Printer className="w-3 h-3" />
            <span>Print View</span>
          </button>
        )}
      </div>
    </div>
  );
};
