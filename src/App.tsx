/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  saveDocumentRecord,
  getSavedDocuments,
  setCachedToken,
} from './firebase';
import { Navbar } from './components/Navbar';
import { DocumentUploader } from './components/DocumentUploader';
import { ThemeSelector } from './components/ThemeSelector';
import { ColorCarousel } from './components/ColorCarousel';
import { CoverPreview } from './components/CoverPreview';
import { DriveSyncPanel } from './components/DriveSyncPanel';
import { ExportModal } from './components/ExportModal';
import { EmailShareModal } from './components/EmailShareModal';
import { HistoryDashboard } from './components/HistoryDashboard';
import { BatchProcessingPanel } from './components/BatchProcessingPanel';
import { TypewriterWelcome } from './components/TypewriterWelcome';
import { TypewriterButton } from './components/TypewriterButton';
import { AuthGateModal } from './components/AuthGateModal';
import { COVER_THEMES } from './constants/themes';
import {
  CoverData,
  CoverTheme,
  DriveUploadResult,
  SavedDocRecord,
  UploadedDocInfo,
  BatchItem,
} from './types';
import { generateQRCodeDataUrl } from './services/qrService';
import { uploadDocumentToDrive, extractDriveFileId, DriveUploadError } from './services/googleDrive';
import { generateCoverPagePdf, mergeCoverWithPdf } from './services/pdfService';
import confetti from 'canvas-confetti';
import {
  HardDrive,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Download,
  Printer,
  Mail,
  RotateCcw,
  Palette,
  Layout,
  UploadCloud,
  FileCheck2,
  Layers,
  AlertCircle,
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5;

interface FooterAction {
  text: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'dark' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'batch' | 'library'>('generator');

  // Linear 5-Step Workflow State:
  // Step 1: Upload File
  // Step 2: Choosing Theme
  // Step 3: Choosing Colour Carousel
  // Step 4: Uploading to Drive
  // Step 5: View & Download New Version
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Full-screen typewriter animation state: supports 'login', 'logout', and 'upload-success'
  const [typewriterConfig, setTypewriterConfig] = useState<{
    isOpen: boolean;
    mode: 'login' | 'logout' | 'upload-success';
    targetUrl?: string;
  }>({
    isOpen: false,
    mode: 'login',
  });

  // Mandatory Auth popup state
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [authGateAction, setAuthGateAction] = useState('Continue with Google Drive');
  const authPromptTimerRef = useRef<any>(null);
  // After a "Drive permission not granted" error, the next sign-in must re-show Google's consent screen
  const [forceConsent, setForceConsent] = useState(false);

  // Single Document state
  const [currentDoc, setCurrentDoc] = useState<UploadedDocInfo | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const initialTheme = COVER_THEMES[0];

  // Pristine Cover Data: NO fake/raw mock strings, all optional fields are empty by default
  const [coverData, setCoverData] = useState<CoverData>({
    title: '', // Empty by default; populated automatically from uploaded document
    subtitle: '', // Optional
    preparedBy: '', // Optional
    organization: '', // Optional
    documentId: '', // Optional
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    summary: '', // Optional
    qrCallToAction: 'Scan with phone camera to view full soft copy on Google Drive.',
    imageUrl: initialTheme.defaultImage,
    themeId: initialTheme.id,
    primaryColor: initialTheme.primaryColor,
    accentColor: '#facc15', // Vibrant Yellow Accent
    titleColor: undefined,
    subtitleColor: undefined,
    textColor: undefined,
    backgroundImageUrl: undefined,
    backgroundImageOpacity: 0.35,
    backgroundImageStyle: 'full',
    logoUrl: undefined,
    logoSize: 'medium',
    logoPosition: 'top-left',
    font: 'inter',
    paperSize: 'a4',
    qrPosition: 'bottom-right',
    qrColor: '#000000',
    qrBgColor: '#ffffff',
    showLogoInQR: false,
  });

  // Google Drive & QR state
  const [uploadResult, setUploadResult] = useState<DriveUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, status: '' });
  const [uploadError, setUploadError] = useState<{ code: string; message: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Direct downloading state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [downloadErrorMsg, setDownloadErrorMsg] = useState<string | null>(null);

  // Batch items state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailShareTarget, setEmailShareTarget] = useState<{
    title: string;
    link: string;
    qrUrl?: string;
  } | null>(null);

  // History state
  const [savedDocs, setSavedDocs] = useState<SavedDocRecord[]>([]);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser, accessToken) => {
        setUser(authenticatedUser);
        setToken(accessToken);
        if (authenticatedUser.displayName && !coverData.preparedBy) {
          setCoverData((prev) => ({
            ...prev,
            preparedBy: authenticatedUser.displayName || '',
          }));
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Remind unauthenticated user after working for 60 seconds
  useEffect(() => {
    if (!user) {
      authPromptTimerRef.current = setTimeout(() => {
        setAuthGateAction('Access Cloud Drive Features');
        setIsAuthGateOpen(true);
      }, 60000);
    } else {
      if (authPromptTimerRef.current) clearTimeout(authPromptTimerRef.current);
    }
    return () => {
      if (authPromptTimerRef.current) clearTimeout(authPromptTimerRef.current);
    };
  }, [user]);

  // Load document library
  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await getSavedDocuments(user?.email || undefined);
      setSavedDocs(docs);
    } catch (err) {
      console.warn('Could not load documents:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  // Generate QR code whenever the Drive Link or QR styling changes
  useEffect(() => {
    const targetUrl = uploadResult?.webViewLink || 'https://drive.google.com';

    generateQRCodeDataUrl({
      url: targetUrl,
      colorDark: coverData.qrColor,
      colorLight: coverData.qrBgColor,
      width: 480,
      logoUrl: coverData.showLogoInQR ? coverData.logoUrl : undefined,
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('QR generation failed:', err));
  }, [
    uploadResult?.webViewLink,
    coverData.qrColor,
    coverData.qrBgColor,
    coverData.showLogoInQR,
    coverData.logoUrl,
  ]);

  // Google Login Handler: Triggers Login Typewriter Animation
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn({ forceConsent });
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setIsAuthGateOpen(false);
        setForceConsent(false);
        setUploadError(null);

        if (res.user.displayName && !coverData.preparedBy) {
          setCoverData((prev) => ({
            ...prev,
            preparedBy: res.user.displayName || '',
          }));
        }

        // Trigger Full Screen Animated Typewriter Welcome
        setTypewriterConfig({
          isOpen: true,
          mode: 'login',
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert('Sign-in failed: ' + (err.message || 'Please enable popups to sign in with Google.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler: Triggers Logout Typewriter Animation
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setTypewriterConfig({
      isOpen: true,
      mode: 'logout',
    });
  };

  // Upload to Drive & Trigger Upload Success Animation + Public URL Redirection
  const handleUploadToDrive = async () => {
    if (!currentDoc) {
      setUploadError({ code: 'unknown', message: 'Please upload a document first in Step 1.' });
      setCurrentStep(1);
      return;
    }

    if (!token) {
      setAuthGateAction('Upload Document to Google Drive');
      setIsAuthGateOpen(true);
      return;
    }

    setUploadError(null);
    setUploadProgress({ percent: 0, status: 'Starting upload...' });
    setIsUploading(true);
    try {
      const result = await uploadDocumentToDrive(
        currentDoc.file,
        currentDoc.name,
        token,
        (percent, status) => {
          setUploadProgress({ percent, status });
        }
      );

      setUploadResult(result);

      // Save document record in Firebase Firestore
      const record: SavedDocRecord = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: coverData.title || currentDoc.name,
        fileName: currentDoc.name,
        fileSize: currentDoc.size,
        fileType: currentDoc.extension,
        driveFileId: result.fileId,
        driveLink: result.webViewLink,
        coverData,
        createdAt: Date.now(),
        userEmail: user?.email || 'user@example.com',
      };

      await saveDocumentRecord(record);
      refreshDocuments();

      // Trigger Typewriter Animation on Upload Success + Auto Redirect to public file URL
      setTypewriterConfig({
        isOpen: true,
        mode: 'upload-success',
        targetUrl: result.webViewLink,
      });

      setCurrentStep(5);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      const code = err instanceof DriveUploadError ? err.code : 'unknown';
      setUploadError({ code, message: err?.message || 'Failed to upload to Google Drive.' });

      // An expired token or missing Drive permission cannot be fixed by retrying: sign in again
      if (code === 'auth' || code === 'scope') {
        setCachedToken(null);
        setToken(null);
        if (code === 'scope') setForceConsent(true);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle manual link paste fallback
  const handleManualLinkSubmit = async (link: string) => {
    const fileId = extractDriveFileId(link) || 'manual';
    const result: DriveUploadResult = {
      fileId,
      name: currentDoc?.name || 'Document',
      webViewLink: link,
      publicPermissionGranted: true,
    };
    setUploadResult(result);

    if (currentDoc) {
      const record: SavedDocRecord = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: coverData.title || currentDoc.name,
        fileName: currentDoc.name,
        fileSize: currentDoc.size,
        fileType: currentDoc.extension,
        driveFileId: fileId,
        driveLink: link,
        coverData,
        createdAt: Date.now(),
        userEmail: user?.email || 'user@example.com',
      };
      await saveDocumentRecord(record);
      refreshDocuments();
    }

    // Trigger upload success animation with manual link redirect
    setTypewriterConfig({
      isOpen: true,
      mode: 'upload-success',
      targetUrl: link,
    });

    setCurrentStep(5);
  };

  // When a document is parsed, update form title without fake data
  const handleDocumentParsed = (doc: UploadedDocInfo) => {
    setCurrentDoc(doc);
    setUploadResult(null); // Reset upload for new document
    setUploadError(null);

    setCoverData((prev) => ({
      ...prev,
      title: doc.extractedTitle || doc.name,
      subtitle: '',
      organization: prev.organization || '',
      summary: '',
      documentId: '',
    }));

    // Move to Step 2: Choosing the Theme
    setCurrentStep(2);
  };

  // Theme selection handler
  const handleSelectTheme = (theme: CoverTheme) => {
    setCoverData((prev) => ({
      ...prev,
      themeId: theme.id,
      primaryColor: theme.primaryColor,
      accentColor: prev.accentColor || theme.accentColor,
      font: prev.font || theme.defaultFont,
      imageUrl: theme.defaultImage,
    }));
  };

  // Direct print trigger
  const handlePrint = () => {
    window.print();
  };

  // Instant Merged PDF Download directly from Step 5
  const handleDirectDownloadMergedPdf = async () => {
    if (!qrDataUrl) {
      alert('QR code is still being prepared. Please wait a moment.');
      return;
    }

    setIsDownloading(true);
    setDownloadErrorMsg(null);
    setDownloadSuccessMsg(null);

    try {
      let pdfBytes: Uint8Array;

      if (currentDoc?.pdfArrayBuffer) {
        // Merge Cover Page with uploaded original PDF
        pdfBytes = await mergeCoverWithPdf(currentDoc.pdfArrayBuffer, coverData, qrDataUrl);
      } else {
        // Generate standalone Cover Page PDF
        const coverPdf = await generateCoverPagePdf(coverData, qrDataUrl);
        pdfBytes = await coverPdf.save();
      }

      // Download file safely
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

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      setDownloadSuccessMsg('Document with QR Cover downloaded successfully!');
      setTimeout(() => setDownloadSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadErrorMsg(err.message || 'Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Select document from library
  const handleSelectFromLibrary = (docRecord: SavedDocRecord) => {
    setCoverData(docRecord.coverData);
    setUploadResult({
      fileId: docRecord.driveFileId,
      name: docRecord.fileName,
      webViewLink: docRecord.driveLink,
      publicPermissionGranted: true,
    });
    setActiveTab('generator');
    setCurrentStep(5);
  };

  // Reset to start over
  const handleStartOver = () => {
    setCurrentDoc(null);
    setUploadResult(null);
    setUploadError(null);
    setCoverData((prev) => ({
      ...prev,
      title: '',
      subtitle: '',
      organization: '',
      documentId: '',
      summary: '',
    }));
    setCurrentStep(1);
  };

  // Calculate total pages (1 Cover + N original pages)
  const originalPagesCount = currentDoc?.pageCount || (currentDoc?.renderedPagePreviews?.length ?? (currentDoc ? 1 : 0));
  const totalPages = 1 + (currentDoc ? originalPagesCount : 0);

  // Stepper definition
  const STEPS_NAV = [
    { num: 1, label: 'Upload File', icon: UploadCloud },
    { num: 2, label: 'Theme', icon: Layout },
    { num: 3, label: 'Colours', icon: Palette },
    { num: 4, label: 'Drive QR', icon: HardDrive },
    { num: 5, label: 'Download', icon: FileCheck2 },
  ];

  // Back / Next actions for the fixed bottom bar
  const goTo = (step: Step) => () => setCurrentStep(step);
  const nextIcon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;
  const backIcon = <ArrowLeft className="w-4 h-4" />;

  const footer: { back?: FooterAction; next?: FooterAction } = (() => {
    switch (currentStep) {
      case 1:
        return {
          next: {
            text: 'Step 2: Choose Theme',
            icon: nextIcon,
            onClick: goTo(2),
            variant: 'primary',
            disabled: !currentDoc,
          },
        };
      case 2:
        return {
          back: { text: 'Back: Step 1', icon: backIcon, onClick: goTo(1), variant: 'dark' },
          next: { text: 'Step 3: Colours', icon: nextIcon, onClick: goTo(3), variant: 'primary' },
        };
      case 3:
        return {
          back: { text: 'Back: Step 2', icon: backIcon, onClick: goTo(2), variant: 'dark' },
          next: { text: 'Step 4: Drive QR', icon: nextIcon, onClick: goTo(4), variant: 'primary' },
        };
      case 4:
        return {
          back: { text: 'Back: Step 3', icon: backIcon, onClick: goTo(3), variant: 'dark' },
          next: uploadResult
            ? { text: 'Step 5: Download', icon: nextIcon, onClick: goTo(5), variant: 'primary' }
            : {
                text: isUploading ? 'Uploading to Drive...' : 'Upload Now & Create Public QR',
                icon: <HardDrive className="w-4 h-4" />,
                onClick: handleUploadToDrive,
                variant: 'primary',
                disabled: isUploading || !currentDoc,
                loading: isUploading,
              },
        };
      case 5:
      default:
        return {
          back: { text: 'Edit Colors & Theme', icon: backIcon, onClick: goTo(3), variant: 'dark' },
          next: {
            text: 'Upload Another Document',
            icon: <RotateCcw className="w-3.5 h-3.5" />,
            onClick: handleStartOver,
            variant: 'secondary',
          },
        };
    }
  })();

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans antialiased selection:bg-yellow-400 selection:text-black">
      {/* ANIMATED TYPEWRITER OVERLAY (LOGIN, LOGOUT & UPLOAD SUCCESS + REDIRECT) */}
      {typewriterConfig.isOpen && (
        <TypewriterWelcome
          mode={typewriterConfig.mode}
          targetUrl={typewriterConfig.targetUrl}
          onComplete={() => setTypewriterConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* MANDATORY GOOGLE SIGN IN MODAL GATE */}
      <AuthGateModal
        isOpen={isAuthGateOpen}
        onClose={() => setIsAuthGateOpen(false)}
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        actionTitle={authGateAction}
      />

      {/* Top Navigation with Green / Red Connection Light */}
      <Navbar
        user={user}
        hasDriveAccess={!!token}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      {/* Main App Body (extra bottom padding so the fixed Back/Next bar never covers content) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {activeTab === 'batch' ? (
          /* BATCH PROCESSING STUDIO */
          <BatchProcessingPanel
            batchItems={batchItems}
            setBatchItems={setBatchItems}
            currentCoverTheme={coverData}
            accessToken={token}
            userEmail={user?.email || undefined}
            onRequireAuth={() => {
              setAuthGateAction('Process Batch Documents on Google Drive');
              setIsAuthGateOpen(true);
            }}
            onShareDoc={(title, link, qrUrl) => {
              setEmailShareTarget({ title, link, qrUrl });
              setIsEmailModalOpen(true);
            }}
          />
        ) : activeTab === 'library' ? (
          /* SAVED DOCUMENTS DASHBOARD */
          <HistoryDashboard
            documents={savedDocs}
            onSelectDocument={handleSelectFromLibrary}
            onRefresh={refreshDocuments}
            onOpenEmailShare={(doc) => {
              setEmailShareTarget({
                title: doc.title,
                link: doc.driveLink,
              });
              setIsEmailModalOpen(true);
            }}
          />
        ) : (
          /* TWO-COLUMN WORKFLOW: LEFT = STEPS | RIGHT = PREVIEW PINNED TO THE SCREEN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT SIDE: STEP INDICATOR + CURRENT STEP (7 COLS) */}
            <div className="lg:col-span-7 space-y-5 min-w-0">
              {/* STEP PROGRESS INDICATOR BAR */}
              <div className="bg-[#121215] border border-yellow-500/25 rounded-2xl p-3 shadow-lg">
                <div className="grid grid-cols-5 gap-2">
                  {STEPS_NAV.map((step) => {
                    const isActive = currentStep === step.num;
                    const isCompleted =
                      currentStep > step.num || (step.num === 1 && !!currentDoc) || (step.num === 4 && !!uploadResult);
                    const canOpen = step.num === 1 || !!currentDoc || isCompleted;

                    return (
                      <button
                        key={step.num}
                        type="button"
                        disabled={!canOpen}
                        onClick={() => setCurrentStep(step.num as Step)}
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer disabled:cursor-not-allowed ${
                          isActive
                            ? 'border-yellow-400 bg-yellow-400 text-black font-bold shadow-[0_0_20px_rgba(250,204,21,0.25)]'
                            : isCompleted
                            ? 'border-yellow-500/30 bg-zinc-900/90 text-yellow-300 hover:border-yellow-400/60'
                            : 'border-zinc-800 bg-zinc-950/60 text-zinc-500 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isActive
                              ? 'bg-black text-yellow-400'
                              : isCompleted
                              ? 'bg-yellow-400/20 text-yellow-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isCompleted && !isActive ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : step.num}
                        </div>
                        <div className="hidden sm:block truncate">
                          <p className="text-[10px] uppercase font-mono opacity-80 leading-none">Step {step.num}</p>
                          <p className="text-xs font-bold truncate leading-tight mt-0.5">{step.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 1: UPLOAD THE FILE */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <DocumentUploader
                    currentDoc={currentDoc}
                    onDocumentParsed={handleDocumentParsed}
                    isLoading={isLoadingDoc}
                    setIsLoading={setIsLoadingDoc}
                    onSwitchToBatch={() => setActiveTab('batch')}
                  />

                  {currentDoc && (
                    <div className="flex items-center gap-3 p-4 bg-[#121215] rounded-2xl border border-yellow-500/30">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white break-all">
                          Document Loaded: <span className="text-yellow-400">{currentDoc.name}</span>
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {currentDoc.pageCount || 1} pages detected. Ready to pick a cover theme.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: CHOOSING THE THEME */}
              {currentStep === 2 && (
                <ThemeSelector selectedThemeId={coverData.themeId} onSelectTheme={handleSelectTheme} />
              )}

              {/* STEP 3: CHOOSING THE COLOUR CAROUSEL */}
              {currentStep === 3 && <ColorCarousel coverData={coverData} onChange={setCoverData} />}

              {/* STEP 4: UPLOADING TO DRIVE */}
              {currentStep === 4 && (
                <DriveSyncPanel
                  uploadResult={uploadResult}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadError={uploadError}
                  onUploadClick={handleUploadToDrive}
                  canUpload={!!currentDoc && !isUploading}
                  needsAuth={!token}
                  onLoginClick={() => {
                    setAuthGateAction(
                      forceConsent
                        ? 'Reconnect Google Drive (allow Drive access)'
                        : 'Connect Google Drive to Upload Document'
                    );
                    setIsAuthGateOpen(true);
                  }}
                  onManualLinkSubmit={handleManualLinkSubmit}
                />
              )}

              {/* STEP 5: VIEW COMPLETE DOCUMENT & DOWNLOAD */}
              {currentStep === 5 && (
                <div className="bg-[#121215] rounded-2xl border border-yellow-500/40 p-5 shadow-lg space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
                        5
                      </span>
                      Download Merged Document & Distribute
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Page 1 contains your custom cover with the verified Google Drive QR code prepended to all original
                      pages.
                    </p>
                  </div>

                  {downloadSuccessMsg && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{downloadSuccessMsg}</span>
                    </div>
                  )}

                  {downloadErrorMsg && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{downloadErrorMsg}</span>
                    </div>
                  )}

                  <TypewriterButton
                    onClick={handleDirectDownloadMergedPdf}
                    disabled={isDownloading}
                    loading={isDownloading}
                    variant="primary"
                    size="lg"
                    className="w-full"
                    icon={<Download className="w-5 h-5 stroke-[2.5]" />}
                    text={`Download Merged Document (All ${totalPages} Pages PDF)`}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <TypewriterButton
                      onClick={handlePrint}
                      variant="dark"
                      icon={<Printer className="w-4 h-4 text-yellow-400" />}
                      text="Print All Pages"
                    />

                    <TypewriterButton
                      onClick={() => {
                        setEmailShareTarget({
                          title: coverData.title || currentDoc?.name || 'Document',
                          link: uploadResult?.webViewLink || 'https://drive.google.com',
                          qrUrl: qrDataUrl || undefined,
                        });
                        setIsEmailModalOpen(true);
                      }}
                      variant="dark"
                      icon={<Mail className="w-4 h-4 text-yellow-400" />}
                      text="Share via Email"
                    />

                    <TypewriterButton
                      onClick={() => setIsExportModalOpen(true)}
                      variant="dark"
                      icon={<Layers className="w-4 h-4 text-yellow-400" />}
                      text="More Export Options"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: PAPER PREVIEW. Pinned under the navbar and sized to the viewport so it
                never scrolls away and the whole page always fits. */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 lg:h-[calc(100vh-10rem)] min-w-0">
              <div className="h-full min-h-0 flex flex-col p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl">
                <CoverPreview
                  coverData={coverData}
                  currentDoc={currentDoc}
                  driveLink={uploadResult?.webViewLink || null}
                  qrDataUrl={qrDataUrl}
                  onPrint={handlePrint}
                  isDriveUploaded={!!uploadResult}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FIXED BACK / NEXT BAR: always on screen, whatever the scroll position */}
      {activeTab === 'generator' && (
        <div className="no-print fixed bottom-0 inset-x-0 z-40 border-t border-yellow-500/25 bg-[#09090b]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            {footer.back ? (
              <TypewriterButton
                onClick={footer.back.onClick}
                variant={footer.back.variant}
                icon={footer.back.icon}
                text={footer.back.text}
                disabled={footer.back.disabled}
              />
            ) : (
              <span />
            )}

            <span className="hidden sm:block text-[11px] font-mono text-zinc-500">Step {currentStep} of 5</span>

            {footer.next ? (
              <TypewriterButton
                onClick={footer.next.onClick}
                variant={footer.next.variant}
                icon={footer.next.icon}
                iconPosition={footer.next.icon === nextIcon ? 'right' : 'left'}
                text={footer.next.text}
                disabled={footer.next.disabled}
                loading={footer.next.loading}
              />
            ) : (
              <span />
            )}
          </div>
        </div>
      )}

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentDoc={currentDoc}
        coverData={coverData}
        qrDataUrl={qrDataUrl}
        driveLink={uploadResult?.webViewLink || null}
        onPrint={handlePrint}
      />

      {/* Email Share Modal with 1-Click Web Gmail Fallback */}
      <EmailShareModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        user={user}
        documentTitle={emailShareTarget?.title || coverData.title || currentDoc?.name || 'Document'}
        driveLink={emailShareTarget?.link || uploadResult?.webViewLink || null}
        qrDataUrl={emailShareTarget?.qrUrl || qrDataUrl}
        onEmailSentSuccess={() => {
          refreshDocuments();
        }}
      />
    </div>
  );
}
