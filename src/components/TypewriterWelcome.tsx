import React, { useEffect, useState, useRef } from 'react';
import { typewriterAudio } from '../services/soundEffects';
import { ArrowRight, Volume2, Sparkles, Terminal } from 'lucide-react';

interface TypewriterWelcomeProps {
  onComplete: () => void;
}

export const TypewriterWelcome: React.FC<TypewriterWelcomeProps> = ({ onComplete }) => {
  const line1Text = 'Welcome to the QR-DRIVE';
  const line2Text = 'Developed with Love by the Team Terminators from Pakistan';

  const [displayedLine1, setDisplayedLine1] = useState('');
  const [displayedLine2, setDisplayedLine2] = useState('');
  const [currentLine, setCurrentLine] = useState<1 | 2>(1);
  const [isFinished, setIsFinished] = useState(false);

  const audioTriggered = useRef(false);

  useEffect(() => {
    let index = 0;
    let timer: any;

    const typeLine1 = () => {
      if (index < line1Text.length) {
        const char = line1Text.charAt(index);
        setDisplayedLine1((prev) => prev + char);
        typewriterAudio.playKeyStroke();
        index++;
        timer = setTimeout(typeLine1, 55 + Math.random() * 25);
      } else {
        // Line 1 finished - ring carriage bell!
        typewriterAudio.playBell();
        timer = setTimeout(() => {
          setCurrentLine(2);
          index = 0;
          typeLine2();
        }, 450);
      }
    };

    const typeLine2 = () => {
      if (index < line2Text.length) {
        const char = line2Text.charAt(index);
        setDisplayedLine2((prev) => prev + char);
        typewriterAudio.playKeyStroke();
        index++;
        timer = setTimeout(typeLine2, 45 + Math.random() * 20);
      } else {
        // All finished
        typewriterAudio.playBell();
        setIsFinished(true);
      }
    };

    // Initial brief delay before typing begins
    timer = setTimeout(typeLine1, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between items-center p-6 sm:p-12 select-none font-mono">
      {/* Top Ambient Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-yellow-500/70 border-b border-yellow-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-yellow-400" />
          <span className="font-bold tracking-widest uppercase text-yellow-400">
            QR-DRIVE SYSTEM PROTOCOL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <Volume2 className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            Audio Synthesizer Active
          </span>
          <button
            onClick={onComplete}
            className="text-zinc-400 hover:text-yellow-400 text-xs px-2.5 py-1 rounded border border-zinc-800 hover:border-yellow-500/50 transition-colors cursor-pointer"
          >
            Skip [ESC]
          </button>
        </div>
      </div>

      {/* Center Cinematic Typewriter Stage */}
      <div className="w-full max-w-3xl my-auto text-left py-12 px-6 sm:px-12 bg-zinc-950/80 rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(250,204,21,0.08)] relative overflow-hidden">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#eab3080a_1px,transparent_1px),linear-gradient(to_bottom,#eab3080a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            <span>SESSION INITIALIZED</span>
          </div>

          {/* Line 1 */}
          <div className="min-h-[50px] sm:min-h-[64px] flex items-center">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {displayedLine1}
              {currentLine === 1 && (
                <span className="inline-block w-3 sm:w-4 h-7 sm:h-10 bg-yellow-400 ml-1.5 animate-pulse" />
              )}
            </h1>
          </div>

          {/* Line 2 */}
          <div className="min-h-[44px] sm:min-h-[56px] flex items-center pt-2">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-yellow-400 tracking-normal leading-relaxed">
              {displayedLine2}
              {currentLine === 2 && (
                <span className="inline-block w-2.5 sm:w-3.5 h-6 sm:h-8 bg-yellow-400 ml-1.5 animate-pulse" />
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="w-full max-w-4xl flex items-center justify-between pt-6 border-t border-yellow-500/20 text-xs">
        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Google Drive Cloud Integration Ready</span>
        </div>

        {isFinished ? (
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl text-xs sm:text-sm shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all cursor-pointer transform hover:scale-105"
          >
            <span>Enter QR-DRIVE Studio</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <span className="text-yellow-500/70 text-xs animate-pulse">
            Printing transmission...
          </span>
        )}
      </div>
    </div>
  );
};
