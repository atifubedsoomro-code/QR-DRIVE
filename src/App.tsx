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
import { uploadDocumentToDrive, extractDriveFileId } from './services/googleDrive';
import { generateCoverPagePdf, mergeCoverWithPdf } from './services/pdfService';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  HardDrive,
  QrCode,
  Files,
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
  Eye,
  Loader2,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Full-screen typewriter welcome state
  const [showTypewriterWelcome, setShowTypewriterWelcome] = useState(false);

  // Mandatory Auth popup state
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [authGateAction, setAuthGateAction] = useState('Continue with Google Drive');
  const authPromptTimerRef = useRef<any>(null);

  // Single Document state
  const [currentDoc, setCurrentDoc] = useState<UploadedDocInfo | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const initialTheme = COVER_THEMES[0];

  // Pristine Cover Data: NO fake/raw mock strings, all optional fields are empty by default!
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

  // Mobile preview toggle
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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
    // Verified public Drive link or base Drive URL
    const targetUrl =
      uploadResult?.webViewLink ||
      'https://drive.google.com';

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

  // Google Login Handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setIsAuthGateOpen(false);

        if (res.user.displayName && !coverData.preparedBy) {
          setCoverData((prev) => ({
            ...prev,
            preparedBy: res.user.displayName || '',
          }));
        }

        // Trigger Full Screen Animated Typewriter Welcome
        setShowTypewriterWelcome(true);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert('Sign-in failed: ' + (err.message || 'Please enable popups to sign in with Google.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  // Upload to Drive & Generate Real Public Viewer Link
  const handleUploadToDrive = async () => {
    if (!currentDoc) {
      alert('Please upload a document first in Step 1.');
      setCurrentStep(1);
      return;
    }

    if (!token) {
      setAuthGateAction('Upload Document to Google Drive');
      setIsAuthGateOpen(true);
      return;
    }

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

      // Automatically transition to Step 5: Getting same doc with cover and QR!
      setTimeout(() => {
        setCurrentStep(5);
      }, 700);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      alert(err.message || 'Failed to upload to Google Drive.');
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

    setCurrentStep(5);
  };

  // When a document is parsed, update form title without fake data
  const handleDocumentParsed = (doc: UploadedDocInfo) => {
    setCurrentDoc(doc);
    setUploadResult(null); // Reset upload for new document

    setCoverData((prev) => ({
      ...prev,
      title: doc.extractedTitle || doc.name,
      // Leave optional fields empty instead of injecting fake corporate data!
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

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans antialiased selection:bg-yellow-400 selection:text-black">
      {/* FULL SCREEN ANIMATED TYPEWRITER WELCOME (TRIGGERED ON GOOGLE SIGN IN) */}
      {showTypewriterWelcome && (
        <TypewriterWelcome onComplete={() => setShowTypewriterWelcome(false)} />
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

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          /* CONSTANT TWO-COLUMN WORKFLOW: LEFT SIDE EDIT & MANAGE | RIGHT SIDE CONSTANT DOCUMENT VIEW */
          <div className="space-y-5">
            {/* STEP PROGRESS INDICATOR BAR */}
            <div className="bg-[#121215] border border-yellow-500/25 rounded-2xl p-3 shadow-lg">
              <div className="grid grid-cols-5 gap-2">
                {STEPS_NAV.map((step) => {
                  const isActive = currentStep === step.num;
                  const isCompleted = currentStep > step.num || (step.num === 1 && !!currentDoc) || (step.num === 4 && !!uploadResult);
                  const Icon = step.icon;

                  return (
                    <button
                      key={step.num}
                      type="button"
                      onClick={() => {
                        // Allow navigation if step is unlocked or doc is uploaded
                        if (step.num === 1 || currentDoc || isCompleted) {
                          setCurrentStep(step.num as any);
                        }
                      }}
                      className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                        isActive
                          ? 'border-yellow-400 bg-yellow-400 text-black font-bold shadow-[0_0_20px_rgba(250,204,21,0.25)]'
                          : isCompleted
                          ? 'border-yellow-500/30 bg-zinc-900/90 text-yellow-300 hover:border-yellow-400/60'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-500 cursor-not-allowed opacity-60'
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
                        {isCompleted && !isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          step.num
                        )}
                      </div>
                      <div className="hidden sm:block truncate">
                        <p className="text-[10px] uppercase font-mono opacity-80 leading-none">
                          Step {step.num}
                        </p>
                        <p className="text-xs font-bold truncate leading-tight mt-0.5">
                          {step.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONSTANT VIEWPORT SPLIT: LEFT SIDE EDIT & RIGHT SIDE DOCUMENT VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT SIDE: STEP-BY-STEP EDIT & MANAGEMENT (7 COLS) */}
              <div className="lg:col-span-7 space-y-5">
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
                      <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                          <div>
                            <p className="text-xs font-bold text-white">
                              Document Loaded: <span className="text-yellow-400">{currentDoc.name}</span>
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {currentDoc.pageCount || 1} pages detected. Ready to pick cover theme.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                        >
                          <span>Step 2: Choose Theme</span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: CHOOSING THE THEME */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <ThemeSelector
                      selectedThemeId={coverData.themeId}
                      onSelectTheme={handleSelectTheme}
                    />

                    <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back: Step 1</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                      >
                        <span>Step 3: Colour Carousel</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: CHOOSING THE COLOUR CAROUSEL */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <ColorCarousel
                      coverData={coverData}
                      onChange={setCoverData}
                    />

                    <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back: Step 2</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                      >
                        <span>Step 4: Upload to Drive</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UPLOADING TO DRIVE */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <DriveSyncPanel
                      uploadResult={uploadResult}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onUploadClick={handleUploadToDrive}
                      canUpload={!!currentDoc && !isUploading}
                      needsAuth={!token}
                      onLoginClick={() => {
                        setAuthGateAction('Connect Google Drive to Upload Document');
                        setIsAuthGateOpen(true);
                      }}
                      onManualLinkSubmit={handleManualLinkSubmit}
                    />

                    <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back: Step 3</span>
                      </button>

                      {uploadResult ? (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(5)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                        >
                          <span>Step 5: View & Download</span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleUploadToDrive}
                          disabled={isUploading || !currentDoc}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                        >
                          <HardDrive className="w-4 h-4" />
                          <span>{isUploading ? 'Uploading to Drive...' : 'Upload Now & Create Public QR'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 5: VIEW COMPLETE DOCUMENT & DOWNLOAD */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    {/* Primary Output Actions */}
                    <div className="bg-[#121215] rounded-2xl border border-yellow-500/40 p-5 shadow-lg space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
                            5
                          </span>
                          Download Merged Document & Distribute
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Page 1 contains your custom cover with the verified Google Drive QR code prepended to all original pages.
                        </p>
                      </div>

                      {/* Download Status Notification */}
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

                      {/* 1-Click Primary Download Button */}
                      <button
                        type="button"
                        onClick={handleDirectDownloadMergedPdf}
                        disabled={isDownloading}
                        className="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm rounded-xl shadow-[0_0_25px_rgba(250,204,21,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Merging Cover & Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5 stroke-[2.5]" />
                            <span>Download Merged Document (All {totalPages} Pages PDF)</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Action Grid: Print, Share via Email, Standalone Cover */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Printer className="w-4 h-4 text-yellow-400" />
                          <span>Print All Pages</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailShareTarget({
                              title: coverData.title || currentDoc?.name || 'Document',
                              link: uploadResult?.webViewLink || 'https://drive.google.com',
                              qrUrl: qrDataUrl || undefined,
                            });
                            setIsEmailModalOpen(true);
                          }}
                          className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Mail className="w-4 h-4 text-yellow-400" />
                          <span>Share via Email</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsExportModalOpen(true)}
                          className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Layers className="w-4 h-4 text-yellow-400" />
                          <span>More Export Options</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 5 Navigation Footer */}
                    <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Edit Colors & Theme</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartOver}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Upload Another Document</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: CONSTANT STICKY DOCUMENT VIEW (5 COLS) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
                <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl space-y-3">
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
          </div>
        )}
      </main>

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
