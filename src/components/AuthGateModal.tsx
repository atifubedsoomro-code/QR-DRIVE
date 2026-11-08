import React, { useState } from 'react';
import { HardDrive, ShieldCheck, QrCode, X, Copy, Check, ExternalLink, Zap, HelpCircle } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onDevLogin?: () => void;
  isLoggingIn: boolean;
  actionTitle?: string;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onDevLogin,
  isLoggingIn,
  actionTitle = 'Continue with QR-DRIVE',
}) => {
  const [copied, setCopied] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  if (!isOpen) return null;

  const currentDomain = window.location.hostname;

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#121215] border border-yellow-500/40 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(250,204,21,0.2)] overflow-hidden my-8">
        {/* Header Bar */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Google Drive Connection</h3>
              <p className="text-[11px] text-yellow-400 font-mono">
                PROJECT: QR-DRIVE-325F8
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

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Active project card */}
          <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-white">Target Firebase Project: qr-drive-325f8</p>
                <p className="text-[10px] text-zinc-400">Switched from tayzara-pos to your dedicated QR-DRIVE project</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Active
            </span>
          </div>

          <div className="text-xs text-zinc-300 leading-relaxed">
            <p>
              Sign in with your Google account to connect Google Drive for <strong className="text-yellow-400">{actionTitle}</strong>.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <GoogleSignInButton
              onClick={onLogin}
              loading={isLoggingIn}
              disabled={isLoggingIn}
            />
          </div>

          {/* Authorized domain guidance toggle */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowDomainHelp(!showDomainHelp)}
              className="text-[11px] text-zinc-400 hover:text-yellow-400 flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
              <span>If popup hangs on /__/auth/handler, click here for 1-click domain setup</span>
            </button>

            {showDomainHelp && (
              <div className="mt-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <p className="text-[11px] text-zinc-400">
                  In your open Firebase tab (<strong>QR-DRIVE</strong>), go to:
                  <br />
                  <span className="text-white font-medium">Authentication &gt; Settings &gt; Authorized domains &gt; Add domain</span>
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentDomain}
                    className="w-full px-2.5 py-1 text-xs bg-zinc-900 rounded border border-zinc-700 font-mono text-yellow-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={copyDomain}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
