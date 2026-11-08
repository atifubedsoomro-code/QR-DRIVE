import React from 'react';
import { User } from 'firebase/auth';
import { QrCode, HardDrive, Mail, FolderArchive, Sparkles, LogOut, Files, ShieldCheck, AlertCircle } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface NavbarProps {
  user: User | null;
  hasDriveAccess: boolean;
  activeTab: 'generator' | 'batch' | 'library';
  onTabChange: (tab: 'generator' | 'batch' | 'library') => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  hasDriveAccess,
  activeTab,
  onTabChange,
  onLogin,
  onLogout,
  isLoggingIn,
}) => {
  const isConnected = !!user && hasDriveAccess;

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-yellow-500/25 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-[0_0_20px_rgba(250,204,21,0.35)] ring-1 ring-yellow-300">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                  QR<span className="text-yellow-400">-DRIVE</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 rounded-md">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Smart Document Cover Pages & Soft-Copy QR Access
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => onTabChange('generator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-yellow-400 text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cover Studio</span>
            </button>
            <button
              onClick={() => onTabChange('batch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-yellow-400 text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              <span>Batch Processor</span>
            </button>
            <button
              onClick={() => onTabChange('library')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-yellow-400 text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>My QR Docs</span>
            </button>
          </div>

          {/* Right Action: Connection Button with Green / Red Light & Auth */}
          <div className="flex items-center gap-3">
            {/* CONNECTION BUTTON WITH GREEN / RED LIGHT */}
            <button
              onClick={isConnected ? undefined : onLogin}
              disabled={isLoggingIn}
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-default'
                  : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer'
              }`}
              title={
                isConnected
                  ? 'Google Drive is connected and active for public QR codes'
                  : 'Click to connect Google Drive'
              }
            >
              {/* Pulsing Light Indicator */}
              <span className="relative flex h-2.5 w-2.5">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                  </>
                )}
              </span>

              <span>
                {isConnected ? 'DRIVE CONNECTED' : isLoggingIn ? 'CONNECTING...' : 'CONNECT DRIVE'}
              </span>
            </button>

            {/* User profile / Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-yellow-400/40 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-xs font-black">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">
                    {user.displayName || 'Google User'}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate max-w-[120px] font-mono">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile subtabs */}
      <div className="md:hidden flex items-center justify-around border-t border-zinc-800 bg-zinc-950 px-2 py-1.5">
        <button
          onClick={() => onTabChange('generator')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg ${
            activeTab === 'generator' ? 'bg-yellow-400 text-black font-bold' : 'text-zinc-400'
          }`}
        >
          Cover Studio
        </button>
        <button
          onClick={() => onTabChange('batch')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg ${
            activeTab === 'batch' ? 'bg-yellow-400 text-black font-bold' : 'text-zinc-400'
          }`}
        >
          Batch Files
        </button>
        <button
          onClick={() => onTabChange('library')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg ${
            activeTab === 'library' ? 'bg-yellow-400 text-black font-bold' : 'text-zinc-400'
          }`}
        >
          My Docs
        </button>
      </div>
    </header>
  );
};
