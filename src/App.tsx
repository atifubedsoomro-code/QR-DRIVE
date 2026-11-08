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
import { uploadDocumentToDrive } from './services/googleDrive';
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
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'batch' | 'library'>('generator');

  // Linear 5-Step Workflow State requested by user:
  // Step 1: Upload File
  // Step 2: Choosing Theme
  // Step 3: Choosing Colour Carousel
  // Step 4: Uploading to Drive
  // Step 5: Getting same doc with new cover attached and QR of public link
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
  const [coverData, setCoverData] = useState<CoverData>({
    title: 'Enterprise Architecture & Cloud Strategy',
    subtitle: 'Official Technical Reference & Governance Guidelines',
    preparedBy: '',
    organization: 'Apex Global Enterprises',
    documentId: `DOC-${new Date().getFullYear()}-001`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    summary:
      'This document outlines standardized cloud architecture patterns, security compliance controls, and operational guidelines. Scan the embedded QR code to access the active soft copy on Google Drive.',
    qrCallToAction: 'Scan with phone camera to view full soft copy on Google Drive',
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
    // QR code is generated strictly from the verified public Drive link or fallback Drive URL
    const targetUrl =
      uploadResult?.webViewLink ||
      'https://drive.google.com/drive/my-drive';

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

  // Google Login Handler: Triggers the Typewriter Welcome Screen upon success
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
        title: coverData.title,
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
      }, 800);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      alert('Failed to upload to Google Drive: ' + (err.message || 'Check permissions.'));
    } finally {
      setIsUploading(false);
    }
  };

  // When a document is parsed, update form title, summary, etc.
  const handleDocumentParsed = (doc: UploadedDocInfo) => {
    setCurrentDoc(doc);
    setUploadResult(null); // Reset upload for new document

    setCoverData((prev) => ({
      ...prev,
      title: doc.extractedTitle || prev.title,
      summary: doc.extractedText || prev.summary,
      documentId: `DOC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    }));

    // Move to Step 2: Choosing the Theme
    setCurrentStep(2);
  };

  // Theme selection handler (preserves user custom colors/fonts/images)
  const handleSelectTheme = (theme: CoverTheme) => {
    setCoverData((prev) => ({
      ...prev,
      themeId: theme.id,
      primaryColor: theme.primaryColor,
      accentColor: prev.accentColor || theme.accentColor,
      font: prev.font || theme.defaultFont,
      imageUrl: prev.imageUrl || theme.defaultImage,
    }));
  };

  // Direct print trigger
  const handlePrint = () => {
    window.print();
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
    setCurrentStep(1);
  };

  // Calculate total pages (1 Cover + N original pages)
  const originalPagesCount = currentDoc?.pageCount || (currentDoc?.renderedPagePreviews?.length ?? (currentDoc ? 1 : 0));
  const totalPages = 1 + (currentDoc ? originalPagesCount : 0);

  // Steps definition for top Stepper
  const STEPS_NAV = [
    { num: 1, label: 'Upload File', icon: UploadCloud },
    { num: 2, label: 'Choose Theme', icon: Layout },
    { num: 3, label: 'Colour Carousel', icon: Palette },
    { num: 4, label: 'Upload to Drive', icon: HardDrive },
    { num: 5, label: 'View & Download', icon: FileCheck2 },
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
          /* STEP-BY-STEP WORKFLOW STUDIO (1 -> 2 -> 3 -> 4 -> 5) */
          <div className="space-y-6">
            {/* STEP PROGRESS INDICATOR BAR */}
            <div className="bg-[#121215] border border-yellow-500/25 rounded-2xl p-4 shadow-lg">
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
                        // Allow navigation if step is unlocked
                        if (step.num === 1 || currentDoc || isCompleted) {
                          setCurrentStep(step.num as any);
                        }
                      }}
                      className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
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

            {/* STEP 1: UPLOAD THE FILE */}
            {currentStep === 1 && (
              <div className="space-y-6">
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
                          {currentDoc.pageCount || 1} pages detected. Ready to design cover page.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                    >
                      <span>Continue to Step 2: Choose Theme</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CHOOSING THE THEME */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    <ThemeSelector
                      selectedThemeId={coverData.themeId}
                      onSelectTheme={handleSelectTheme}
                    />
                  </div>
                  <div className="lg:col-span-5 sticky top-20">
                    <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                          Theme Live Preview
                        </span>
                        <span className="text-[11px] text-zinc-400">Page 1 of {totalPages}</span>
                      </div>
                      <CoverPreview
                        coverData={coverData}
                        currentDoc={currentDoc}
                        driveLink={uploadResult?.webViewLink || null}
                        qrDataUrl={qrDataUrl}
                        onPrint={handlePrint}
                        onOpenExportModal={() => setIsExportModalOpen(true)}
                        onOpenEmailModal={() => setIsEmailModalOpen(true)}
                        isDriveUploaded={!!uploadResult}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 Navigation Footer */}
                <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Step 1: Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                  >
                    <span>Continue to Step 3: Colour Carousel</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSING THE COLOUR CAROUSEL */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    <ColorCarousel
                      coverData={coverData}
                      onChange={setCoverData}
                    />
                  </div>
                  <div className="lg:col-span-5 sticky top-20">
                    <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                          Real-Time Color & Font Preview
                        </span>
                        <span className="text-[11px] text-zinc-400">Page 1 of {totalPages}</span>
                      </div>
                      <CoverPreview
                        coverData={coverData}
                        currentDoc={currentDoc}
                        driveLink={uploadResult?.webViewLink || null}
                        qrDataUrl={qrDataUrl}
                        onPrint={handlePrint}
                        onOpenExportModal={() => setIsExportModalOpen(true)}
                        onOpenEmailModal={() => setIsEmailModalOpen(true)}
                        isDriveUploaded={!!uploadResult}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3 Navigation Footer */}
                <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Step 2: Theme</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                  >
                    <span>Continue to Step 4: Upload to Drive</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: UPLOADING TO DRIVE */}
            {currentStep === 4 && (
              <div className="space-y-6">
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
                />

                {/* Step 4 Navigation Footer */}
                <div className="flex items-center justify-between p-4 bg-[#121215] rounded-2xl border border-yellow-500/25">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Step 3: Colors</span>
                  </button>

                  {uploadResult ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
                    >
                      <span>Continue to Step 5: View & Download</span>
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
                      <span>{isUploading ? 'Uploading to Drive...' : 'Upload Now to Drive & Create QR'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: GETTING SAME DOC WITH NEW COVER ATTACHED AND QR OF PUBLIC LINK */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Result Overview Banner */}
                <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-[#121215] border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-400/30">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Document Merged with Active Google Drive QR Cover
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-400 text-black">
                          {totalPages} Pages Total
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-300">
                        {currentDoc ? (
                          <>
                            Page 1 = Custom Cover with scannable QR code. Pages 2 to {totalPages} = Original document.
                          </>
                        ) : (
                          'Ready to preview and download.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Merged PDF</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Page Full Document Preview Stage (Page 1 Cover + Pages 2..N) */}
                <div className="bg-[#121215] p-5 rounded-2xl border border-yellow-500/25">
                  <CoverPreview
                    coverData={coverData}
                    currentDoc={currentDoc}
                    driveLink={uploadResult?.webViewLink || null}
                    qrDataUrl={qrDataUrl}
                    onPrint={handlePrint}
                    onOpenExportModal={() => setIsExportModalOpen(true)}
                    onOpenEmailModal={() => {
                      setEmailShareTarget({
                        title: coverData.title,
                        link: uploadResult?.webViewLink || 'https://drive.google.com',
                        qrUrl: qrDataUrl || undefined,
                      });
                      setIsEmailModalOpen(true);
                    }}
                    isDriveUploaded={!!uploadResult}
                  />
                </div>

                {/* Step 5 Footer Controls: Start Over or Modify Details */}
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

      {/* Email Share Modal via Gmail API */}
      <EmailShareModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        user={user}
        documentTitle={emailShareTarget?.title || coverData.title}
        driveLink={emailShareTarget?.link || uploadResult?.webViewLink || null}
        qrDataUrl={emailShareTarget?.qrUrl || qrDataUrl}
        onEmailSentSuccess={() => {
          refreshDocuments();
        }}
      />
    </div>
  );
}
