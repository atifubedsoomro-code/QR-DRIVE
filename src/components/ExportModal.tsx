import React, { useState } from 'react';
import { CoverData, UploadedDocInfo } from '../types';
import { generateCoverPagePdf, mergeCoverWithPdf } from '../services/pdfService';
import confetti from 'canvas-confetti';
import {
  Download,
  Printer,
  X,
  Layers,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoc: UploadedDocInfo | null;
  coverData: CoverData;
  qrDataUrl: string | null;
  driveLink: string | null;
  onPrint: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentDoc,
  coverData,
  qrDataUrl,
  driveLink,
  onPrint,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
    });
  };

  const handleDownloadMergedPdf = async () => {
    if (!qrDataUrl) {
      alert('QR code is still being generated. Please wait a moment.');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportMessage('Generating combined document with Cover Page and QR code...');

    try {
      let pdfBytes: Uint8Array;

      if (currentDoc?.pdfArrayBuffer) {
        // Merge cover page with uploaded original PDF!
        pdfBytes = await mergeCoverWithPdf(currentDoc.pdfArrayBuffer, coverData, qrDataUrl);
      } else {
        // If Word doc or text file, generate the standalone Cover Page PDF
        const coverPdf = await generateCoverPagePdf(coverData, qrDataUrl);
        pdfBytes = await coverPdf.save();
      }

      // Download file safely using ArrayBuffer slice
      const safeBuffer = new Uint8Array(pdfBytes).slice().buffer;
      const blob = new Blob([safeBuffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeFilename = (coverData.title || currentDoc?.name || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeFilename}_with_QR_Cover.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      triggerCelebration();
      setExportMessage('Downloaded successfully!');
      setTimeout(() => {
        setIsExporting(false);
        setExportMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError('Failed to generate merged PDF: ' + (err.message || 'Unknown error'));
      setIsExporting(false);
      setExportMessage(null);
    }
  };

  const handleDownloadCoverOnlyPdf = async () => {
    if (!qrDataUrl) return;

    setIsExporting(true);
    setExportError(null);
    setExportMessage('Generating standalone Cover Page PDF...');

    try {
      const coverPdf = await generateCoverPagePdf(coverData, qrDataUrl);
      const pdfBytes = await coverPdf.save();

      const safeBuffer = new Uint8Array(pdfBytes).slice().buffer;
      const blob = new Blob([safeBuffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeFilename = (coverData.title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Cover_Page_${safeFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      triggerCelebration();
      setIsExporting(false);
      setExportMessage(null);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError('Failed to generate cover: ' + (err.message || 'Unknown error'));
      setIsExporting(false);
      setExportMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121215] border border-yellow-500/40 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(250,204,21,0.15)] overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-bold">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Download New Version</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                READY FOR PRINT & SCANNING
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {/* Main Option: Complete Merged PDF */}
          <button
            onClick={handleDownloadMergedPdf}
            disabled={isExporting}
            className="w-full text-left p-4 rounded-xl border-2 border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 transition-all flex items-start gap-3.5 group cursor-pointer disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-400 text-black flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-yellow-300">
                  {currentDoc?.extension === 'pdf'
                    ? 'Download Merged PDF (Cover + Complete Doc)'
                    : 'Download Complete PDF with Cover'}
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-yellow-400 text-black">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Combines the custom designed cover page with the active Google Drive QR code prepended as Page 1.
              </p>
            </div>
          </button>

          {/* Option 2: Standalone Cover Page */}
          <button
            onClick={handleDownloadCoverOnlyPdf}
            disabled={isExporting}
            className="w-full text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">
                Download Cover Page Only (PDF)
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Print separately to place in report binders, clear folders, or physical booklet covers.
              </p>
            </div>
          </button>

          {/* Option 3: Direct Print */}
          <button
            onClick={() => {
              onClose();
              onPrint();
            }}
            disabled={isExporting}
            className="w-full text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">
                Direct Printer Output
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Launches browser print dialog formatted with exact A4/Letter margins.
              </p>
            </div>
          </button>

          {/* Loading or status message */}
          {isExporting && (
            <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg flex items-center gap-2 text-xs text-yellow-300">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          {exportError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{exportError}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px]">QR-DRIVE Certified • Vector 300 DPI</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
