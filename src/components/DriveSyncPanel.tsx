import React from 'react';
import { HardDrive, CheckCircle2, Globe2, Copy, Check, ExternalLink, ArrowUpRight, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { DriveUploadResult } from '../types';

interface DriveSyncPanelProps {
  uploadResult: DriveUploadResult | null;
  isUploading: boolean;
  uploadProgress: { percent: number; status: string };
  onUploadClick: () => void;
  canUpload: boolean;
  needsAuth: boolean;
  onLoginClick: () => void;
}

export const DriveSyncPanel: React.FC<DriveSyncPanelProps> = ({
  uploadResult,
  isUploading,
  uploadProgress,
  onUploadClick,
  canUpload,
  needsAuth,
  onLoginClick,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (uploadResult?.webViewLink) {
      navigator.clipboard.writeText(uploadResult.webViewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
              3
            </span>
            Google Drive & QR Cloud Sync
          </h3>
          <p className="text-xs text-zinc-400">
            QR code is derived strictly from the Public Viewer link of the uploaded file
          </p>
        </div>

        {uploadResult && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Public Viewer Live
          </span>
        )}
      </div>

      {isUploading ? (
        <div className="p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-300">
            <span>{uploadProgress.status}</span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-yellow-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400">
            Uploading original document to your Google Drive and setting Public Viewer permissions (`anyone with link can view`).
          </p>
        </div>
      ) : uploadResult ? (
        <div className="space-y-3">
          <div className="p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                Verified Public Drive Link (Encoded in QR)
              </span>
              <a
                href={uploadResult.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Verify Public Link</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={uploadResult.webViewLink}
                className="w-full px-3 py-2 text-xs bg-zinc-950 rounded-lg border border-zinc-700 font-mono text-zinc-200 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                title="Copy shareable link"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Permissions: Anyone with link can view (Public Viewer)
            </span>
            <button
              onClick={onUploadClick}
              className="text-zinc-400 hover:text-yellow-400 inline-flex items-center gap-1 font-semibold text-xs cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Re-upload to Drive
            </button>
          </div>
        </div>
      ) : needsAuth ? (
        <div className="p-4 bg-zinc-900 rounded-xl border border-yellow-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">
                Google Sign In Required for Cloud Drive & QR Link
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Sign in with Google to automatically upload your document, configure Public Viewer access, and generate the live QR code.
              </p>
            </div>
          </div>
          <button
            onClick={onLoginClick}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(250,204,21,0.2)] transition-all flex-shrink-0 cursor-pointer"
          >
            Connect Drive
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center border border-yellow-400/20">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Ready to Sync with Google Drive
              </p>
              <p className="text-[11px] text-zinc-400">
                Uploads document, configures public access, and attaches scannable QR code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            disabled={!canUpload}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(250,204,21,0.25)] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Upload to Drive & Generate QR
          </button>
        </div>
      )}
    </div>
  );
};
