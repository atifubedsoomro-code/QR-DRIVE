import React, { useRef, useState } from 'react';
import { UploadedDocInfo, CoverData, BatchItem } from '../types';
import { parseUploadedDocument } from '../services/documentParser';
import { uploadDocumentToDrive } from '../services/googleDrive';
import { generateQRCodeDataUrl } from '../services/qrService';
import { mergeCoverWithPdf, generateCoverPagePdf } from '../services/pdfService';
import { saveDocumentRecord } from '../firebase';
import confetti from 'canvas-confetti';
import {
  Upload,
  Files,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface BatchProcessingPanelProps {
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  currentCoverTheme: CoverData;
  accessToken: string | null;
  userEmail?: string;
  onRequireAuth: () => void;
  onShareDoc: (title: string, link: string, qrUrl?: string) => void;
}

export const BatchProcessingPanel: React.FC<BatchProcessingPanelProps> = ({
  batchItems,
  setBatchItems,
  currentCoverTheme,
  accessToken,
  userEmail,
  onRequireAuth,
  onShareDoc,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<{ current: number; total: number } | null>(null);

  const handleMultipleFiles = async (files: FileList | File[]) => {
    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseUploadedDocument(file);
        const itemCoverData: CoverData = {
          ...currentCoverTheme,
          title: parsed.extractedTitle || file.name.replace(/\.[^/.]+$/, ''),
          summary: parsed.extractedText || currentCoverTheme.summary,
          documentId: `DOC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        };

        newItems.push({
          id: `batch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          docInfo: parsed,
          coverData: itemCoverData,
          status: 'idle',
        });
      } catch (err) {
        console.error('Error parsing file:', file.name, err);
      }
    }

    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Upload single item to Google Drive & generate its QR from public URL
  const processSingleItem = async (item: BatchItem): Promise<BatchItem> => {
    if (!accessToken) {
      onRequireAuth();
      throw new Error('Sign in with Google is required');
    }

    try {
      // 1. Upload to Google Drive with public permissions
      const driveResult = await uploadDocumentToDrive(
        item.docInfo.file,
        item.docInfo.name,
        accessToken
      );

      // 2. Generate QR code strictly from the verified public Drive link
      const qrDataUrl = await generateQRCodeDataUrl({
        url: driveResult.webViewLink,
        colorDark: item.coverData.qrColor,
        colorLight: item.coverData.qrBgColor,
        width: 480,
      });

      // 3. Persist record in Firestore
      await saveDocumentRecord({
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.coverData.title,
        fileName: item.docInfo.name,
        fileSize: item.docInfo.size,
        fileType: item.docInfo.extension,
        driveFileId: driveResult.fileId,
        driveLink: driveResult.webViewLink,
        coverData: item.coverData,
        createdAt: Date.now(),
        userEmail: userEmail || 'user@example.com',
      });

      return {
        ...item,
        status: 'synced',
        driveResult,
        qrDataUrl,
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        errorMessage: err.message || 'Upload failed',
      };
    }
  };

  // Process all items in batch
  const handleProcessAll = async () => {
    if (!accessToken) {
      onRequireAuth();
      return;
    }

    if (batchItems.length === 0) return;

    setIsProcessingAll(true);
    setGlobalProgress({ current: 0, total: batchItems.length });

    const updated = [...batchItems];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'synced') continue;

      updated[i] = { ...updated[i], status: 'uploading' };
      setBatchItems([...updated]);
      setGlobalProgress({ current: i + 1, total: updated.length });

      const processed = await processSingleItem(updated[i]);
      updated[i] = processed;
      setBatchItems([...updated]);
    }

    setIsProcessingAll(false);
    setGlobalProgress(null);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  };

  // Download merged PDF for a single item
  const handleDownloadItem = async (item: BatchItem) => {
    if (!item.qrDataUrl) {
      alert('Please upload to Google Drive first to derive the active public QR code.');
      return;
    }

    try {
      let pdfBytes: Uint8Array;
      if (item.docInfo.pdfArrayBuffer) {
        pdfBytes = await mergeCoverWithPdf(
          item.docInfo.pdfArrayBuffer,
          item.coverData,
          item.qrDataUrl
        );
      } else {
        const coverPdf = await generateCoverPagePdf(item.coverData, item.qrDataUrl);
        pdfBytes = await coverPdf.save();
      }

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.coverData.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_QR_Cover.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to generate merged PDF: ' + err.message);
    }
  };

  // Download all synced items
  const handleDownloadAll = async () => {
    const readyItems = batchItems.filter((item) => item.status === 'synced');
    if (readyItems.length === 0) {
      alert('No processed documents ready for download. Please process them first.');
      return;
    }

    setIsDownloadingAll(true);
    for (const item of readyItems) {
      await handleDownloadItem(item);
      // Small pause between downloads to prevent browser throttling
      await new Promise((r) => setTimeout(r, 600));
    }
    setIsDownloadingAll(false);
  };

  // Sync current active theme across all batch items
  const handleApplyThemeToAll = () => {
    setBatchItems((prev) =>
      prev.map((item) => ({
        ...item,
        coverData: {
          ...currentCoverTheme,
          title: item.coverData.title, // Keep document specific title
          documentId: item.coverData.documentId,
        },
      }))
    );
    alert('Active cover theme and styling applied to all documents in batch!');
  };

  return (
    <div className="space-y-5">
      {/* Batch Header Bar */}
      <div className="bg-[#121215] border border-yellow-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-yellow-400 text-black font-bold flex items-center justify-center text-xs">
              <Files className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Batch Document Processor
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              {batchItems.length} Files Queued
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Simultaneously process multiple PDF, DOC, DOCX files, generate public Google Drive QR codes, and merge cover pages.
          </p>
        </div>

        {/* Global Batch Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {batchItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleApplyThemeToAll}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Apply Active Theme to All
              </button>
              <button
                type="button"
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing {globalProgress?.current}/{globalProgress?.total}...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Upload & QR All to Drive</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Merged</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add More Files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={(e) => {
              if (e.target.files) handleMultipleFiles(e.target.files);
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Multi-file Dropzone if empty */}
      {batchItems.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-yellow-500/50 bg-[#121215]/60 hover:bg-[#121215] rounded-2xl p-12 text-center cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mx-auto mb-3 border border-yellow-400/20">
            <Files className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            Select Multiple Documents Simultaneously
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            Drag and drop 5, 10, or 20+ PDF, DOC, DOCX files here. QR-DRIVE will automatically attach cover pages, create public viewer links, and generate individual QR codes.
          </p>
          <span className="inline-block mt-4 px-4 py-2 bg-yellow-400 text-black text-xs font-bold rounded-xl shadow-md">
            Browse Files from Computer
          </span>
        </div>
      ) : (
        /* Batch Queue List */
        <div className="space-y-3">
          {batchItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-[#121215] border border-zinc-800 hover:border-yellow-500/30 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-zinc-800 text-yellow-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.coverData.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? { ...it, coverData: { ...it.coverData, title: val } }
                              : it
                          )
                        );
                      }}
                      className="text-sm font-bold text-white bg-transparent border-b border-zinc-800 focus:border-yellow-400 focus:outline-none w-full max-w-md"
                    />
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-zinc-800 text-yellow-400">
                      {item.docInfo.extension}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    <span>{item.docInfo.name}</span>
                    <span>•</span>
                    <span>{(item.docInfo.size / 1024 / 1024).toFixed(2)} MB</span>
                    {item.docInfo.pageCount && (
                      <>
                        <span>•</span>
                        <span>{item.docInfo.pageCount} Pages</span>
                      </>
                    )}
                  </div>

                  {/* Public link status */}
                  {item.driveResult?.webViewLink && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Public Drive Link Live:
                      </span>
                      <a
                        href={item.driveResult.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline truncate max-w-xs font-mono text-[11px]"
                      >
                        {item.driveResult.webViewLink}
                      </a>
                    </div>
                  )}

                  {item.errorMessage && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.errorMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* QR preview */}
                {item.qrDataUrl ? (
                  <div className="w-12 h-12 bg-white p-1 rounded-lg border border-zinc-700 flex-shrink-0">
                    <img
                      src={item.qrDataUrl}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-[9px] text-zinc-500 text-center flex-shrink-0">
                    No QR
                  </div>
                )}

                {/* Status Badge */}
                <div>
                  {item.status === 'uploading' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </span>
                  )}
                  {item.status === 'synced' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready
                    </span>
                  )}
                  {item.status === 'idle' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const processed = await processSingleItem(item);
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === item.id ? processed : it))
                        );
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                    >
                      Upload to Drive
                    </button>
                  )}
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadItem(item)}
                  disabled={item.status !== 'synced'}
                  className="p-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black transition-colors cursor-pointer"
                  title="Download Merged Document PDF with QR Cover"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Remove from batch */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove from batch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
