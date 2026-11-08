import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Files } from 'lucide-react';
import { parseUploadedDocument } from '../services/documentParser';
import { UploadedDocInfo } from '../types';

interface DocumentUploaderProps {
  currentDoc: UploadedDocInfo | null;
  onDocumentParsed: (doc: UploadedDocInfo) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  onSwitchToBatch?: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  currentDoc,
  onDocumentParsed,
  isLoading,
  setIsLoading,
  onSwitchToBatch,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParseError(null);
    setIsLoading(true);

    try {
      const parsed = await parseUploadedDocument(file);
      onDocumentParsed(parsed);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(err.message || 'Failed to parse document. Please check file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFile(selected);
    }
  };

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
              1
            </span>
            Document Source
          </h3>
          <p className="text-xs text-zinc-400">
            Upload PDF, Word (.docx, .doc), or text file to sync to Google Drive
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToBatch && (
            <button
              type="button"
              onClick={onSwitchToBatch}
              className="inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold px-2.5 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 cursor-pointer"
            >
              <Files className="w-3.5 h-3.5" />
              Batch Multi-File Mode
            </button>
          )}

          {currentDoc && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Change File
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.rtf,.md"
        onChange={handleInputChange}
        className="hidden"
      />

      {currentDoc ? (
        <div className="bg-zinc-900/90 border border-yellow-500/30 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-yellow-400 text-black flex items-center justify-center shadow-md flex-shrink-0 font-bold">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm leading-tight break-all">
                  {currentDoc.name}
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  {currentDoc.extension}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                <span>{(currentDoc.size / 1024 / 1024).toFixed(2)} MB</span>
                {currentDoc.pageCount && (
                  <>
                    <span>•</span>
                    <span>{currentDoc.pageCount} Pages</span>
                  </>
                )}
                {currentDoc.wordCount && (
                  <>
                    <span>•</span>
                    <span>{currentDoc.wordCount.toLocaleString()} Words</span>
                  </>
                )}
              </div>
              <p className="text-xs text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Parsed & ready for Drive QR sync
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-yellow-400 bg-yellow-400/10 scale-[1.01]'
              : 'border-zinc-800 hover:border-yellow-500/50 hover:bg-zinc-900/50'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mx-auto mb-3 border border-yellow-400/20">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">
            {isLoading ? 'Analyzing & parsing document...' : 'Click to upload or drag & drop single file'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Supports PDF, Microsoft Word (.docx, .doc), and text documents up to 50MB
          </p>

          <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-zinc-400">
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-yellow-400 font-mono">PDF</span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-yellow-400 font-mono">DOCX</span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-yellow-400 font-mono">DOC</span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-yellow-400 font-mono">TXT</span>
          </div>
        </div>
      )}

      {parseError && (
        <div className="mt-3 p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  );
};
