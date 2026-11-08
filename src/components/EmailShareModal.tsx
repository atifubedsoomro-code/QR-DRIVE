import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Mail, Send, X, ShieldAlert, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { sendEmailViaGmail } from '../services/gmail';
import { getAccessToken } from '../firebase';
import confetti from 'canvas-confetti';

interface EmailShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  documentTitle: string;
  driveLink: string | null;
  qrDataUrl: string | null;
  onEmailSentSuccess?: (recipient: string, subject: string) => void;
}

export const EmailShareModal: React.FC<EmailShareModalProps> = ({
  isOpen,
  onClose,
  user,
  documentTitle,
  driveLink,
  qrDataUrl,
  onEmailSentSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState(`Shared Document: ${documentTitle}`);
  const [customMessage, setCustomMessage] = useState(
    'Please review the soft copy of the attached document on Google Drive. You can also scan the QR code to open it directly on your phone.'
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidateAndProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient.trim())) {
      setErrorMessage('Please enter a valid recipient email address.');
      return;
    }

    if (!driveLink) {
      setErrorMessage('Google Drive link is missing. Please ensure document is uploaded to Drive.');
      return;
    }

    setIsConfirming(true);
  };

  const handleConfirmedSend = async () => {
    setIsSending(true);
    setErrorMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Access token unavailable. Please sign in with Google.');
      }

      await sendEmailViaGmail({
        to: recipient.trim(),
        subject: subject.trim(),
        documentTitle,
        documentUrl: driveLink!,
        qrDataUrl: qrDataUrl || undefined,
        customMessage: customMessage.trim() || undefined,
        userEmail: user?.email || '',
        userName: user?.displayName || undefined,
        accessToken: token,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSuccessMessage(`Email sent successfully to ${recipient.trim()}!`);
      onEmailSentSuccess?.(recipient.trim(), subject.trim());

      setTimeout(() => {
        setIsSending(false);
        setIsConfirming(false);
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Email send failed:', err);
      setErrorMessage(err.message || 'Failed to send email. Please check Gmail permissions.');
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121215] border border-yellow-500/40 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(250,204,21,0.15)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-bold">
              <Mail className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Share Document via Gmail
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                DISPATCH PUBLIC DRIVE LINK
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

        {/* Content Body */}
        <div className="p-5">
          {successMessage ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-white text-base">Dispatched via Gmail</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">{successMessage}</p>
            </div>
          ) : isConfirming ? (
            /* Explicit User Confirmation Step */
            <div className="space-y-4">
              <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-200 leading-relaxed">
                  <p className="font-bold text-yellow-300 mb-1">Confirm Email Transmission</p>
                  <p>
                    Are you sure you want to send this email from your account (
                    <strong className="text-white">{user?.email}</strong>) to <strong className="text-yellow-400">{recipient}</strong>?
                  </p>
                </div>
              </div>

              {/* Summary of what will be sent */}
              <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-400 block text-[10px] uppercase">
                    Subject
                  </span>
                  <span className="font-bold text-white">{subject}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 block text-[10px] uppercase">
                    Recipient
                  </span>
                  <span className="font-mono text-yellow-300">{recipient}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 block text-[10px] uppercase">
                    Soft Copy Link Included
                  </span>
                  <span className="font-mono text-emerald-400 truncate block">
                    {driveLink}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Confirmation Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  disabled={isSending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedSend}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending via Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Compose Form */
            <form onSubmit={handleValidateAndProceedToConfirm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="colleague@example.com, client@company.com"
                  className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Personal Message
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white"
                />
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Sender: {user?.email}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gmail Authorized
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review & Send Email</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
