import React, { useState } from 'react';
import {
  HardDrive,
  CheckCircle2,
  Globe2,
  Copy,
  Check,
  ExternalLink,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { DriveUploadResult } from '../types';
import { TypewriterButton } from './TypewriterButton';

interface DriveSyncPanelProps {
  uploadResult: DriveUploadResult | null;
  isUploading: boolean;
  uploadProgress: { percent: number; status: string };
  onUploadClick: () => void;
  canUpload: boolean;
  needsAuth: boolean;
  onLoginClick: () => void;
  onManualLinkSubmit?: (link: string) => void;
  uploadError?: { code: string; message: string } | null;
}

export const DriveSyncPanel: React.FC<DriveSyncPanelProps> = ({
  uploadResult,
  isUploading,
  uploadProgress,
  onUploadClick,
  canUpload,
  needsAuth,
  onLoginClick,
  onManualLinkSubmit,
  uploadError,
}) => {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualUrl, setManualUrl] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleCopyLink = () => {
    if (uploadResult?.webViewLink) {
      navigator.clipboard.writeText(uploadResult.webViewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyManualLink = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualUrl.trim();

    if (!trimmed.startsWith('https://drive.google.com') && !trimmed.startsWith('http://drive.google.com')) {
      setManualError('Please enter a valid Google Drive share URL (starting with https://drive.google.com)');
      return;
    }

    if (onManualLinkSubmit) {
      onManualLinkSubmit(trimmed);
    }
  };

  return (
    <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg space-y-4">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
              4
            </span>
            Google Drive & QR Cloud Sync
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            QR code is derived strictly from the Public Viewer link of your document on Google Drive
          </p>
        </div>

        {uploadResult && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Public Viewer Live
          </span>
        )}
      </div>

      {/* Mode Switcher Pills: Automatic 1-Click Upload vs Paste Share Link */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            mode === 'auto'
              ? 'bg-yellow-400 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Automatic Drive Upload (Recommended)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-yellow-400 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Or Paste Existing Drive Link</span>
        </button>
      </div>

      {/* Real reason the last upload failed (never swallowed or hidden in an alert) */}
      {uploadError && mode === 'auto' && !isUploading && (
        <div
          role="alert"
          className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-red-300">Upload to Google Drive failed</p>
            <p className="break-words leading-relaxed">{uploadError.message}</p>
          </div>
        </div>
      )}

      {/* AUTO MODE */}
      {mode === 'auto' ? (
        isUploading ? (
          <div className="p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/30 space-y-2.5">
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
            {uploadResult.permissionWarning && (
              <div
                role="alert"
                className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-200"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-amber-300">File uploaded, but it is not public yet</p>
                  <p className="break-words leading-relaxed">{uploadResult.permissionWarning}</p>
                </div>
              </div>
            )}
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
              <span
                className={`flex items-center gap-1.5 font-semibold ${
                  uploadResult.publicPermissionGranted ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {uploadResult.publicPermissionGranted
                  ? 'Permissions: Public Viewer (Anyone with link can view)'
                  : 'Permissions: not public yet (see warning above)'}
              </span>
              <button
                type="button"
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
            <TypewriterButton
              onClick={onLoginClick}
              variant="primary"
              size="sm"
              icon={<HardDrive className="w-3.5 h-3.5" />}
              text="Connect Drive"
            />
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

            <TypewriterButton
              onClick={onUploadClick}
              disabled={!canUpload}
              variant="primary"
              icon={<HardDrive className="w-4 h-4" />}
              text="Upload to Drive & Generate QR"
            />
          </div>
        )
      ) : (
        /* MANUAL LINK MODE: Paste direct Google Drive URL */
        <form onSubmit={handleApplyManualLink} className="space-y-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">
              Paste Google Drive Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                required
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                className="w-full px-3 py-2 text-xs bg-zinc-950 rounded-lg border border-zinc-700 font-mono text-zinc-200 focus:border-yellow-400 focus:outline-none"
              />
              <TypewriterButton
                type="submit"
                variant="primary"
                size="sm"
                icon={<Link2 className="w-3.5 h-3.5" />}
                text="Apply Link & QR"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Make sure the file in your Google Drive has "Anyone with the link can view" permission enabled.
            </p>
          </div>

          {manualError && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{manualError}</span>
            </div>
          )}
        </form>
      )}

      {/* GCP Drive API Guidance note if disabled */}
      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <span className="text-[11px]">
          Target Google Cloud Project: <strong className="text-white">245248622910</strong> (qr-drive-325f8)
        </span>
        <a
          href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=245248622910"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-zinc-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
        >
          <span>Enable Drive API in GCP</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
