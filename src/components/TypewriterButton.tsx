import React, { useState, useRef, useEffect } from 'react';
import { typewriterAudio } from '../services/soundEffects';

interface TypewriterButtonProps {
  icon?: React.ReactNode;
  text: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const TypewriterButton: React.FC<TypewriterButtonProps> = ({
  icon,
  text,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  title,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);

  // Keep displayText in sync if text prop updates
  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text);
    }
  }, [text, isHovered]);

  const handleMouseEnter = () => {
    if (disabled || loading) return;
    setIsHovered(true);

    // Play subtle hover mechanical tick
    typewriterAudio.playHoverTick();

    if (timerRef.current) clearInterval(timerRef.current);

    // Icon First Animation: clear text and type in letter-by-letter rapidly
    setDisplayText('');
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      if (idx <= text.length) {
        setDisplayText(text.slice(0, idx));
        if (idx % 2 === 0) {
          typewriterAudio.playHoverTick();
        }
      } else {
        clearInterval(timerRef.current);
      }
    }, 25);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsHovered(false);
    setDisplayText(text);
  };

  // Variant styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-yellow-400 hover:bg-yellow-300 text-black border-yellow-400 font-extrabold shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:shadow-[0_0_30px_rgba(250,204,21,0.45)]';
      case 'secondary':
        return 'bg-zinc-900 hover:bg-zinc-800 text-yellow-300 hover:text-yellow-200 border-yellow-500/40 hover:border-yellow-400 shadow-sm';
      case 'dark':
        return 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-zinc-700';
      case 'outline':
        return 'bg-transparent hover:bg-yellow-400/10 text-yellow-400 border-yellow-500/30 hover:border-yellow-400';
      case 'danger':
        return 'bg-red-950/60 hover:bg-red-900/70 text-red-300 border-red-500/40';
      default:
        return 'bg-yellow-400 text-black border-yellow-400';
    }
  };

  // Size styling
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs';
      case 'lg':
        return 'px-6 py-3.5 text-sm';
      case 'md':
      default:
        return 'px-4 py-2 text-xs sm:text-sm';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-xl border font-mono transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {/* Icon First Animation: animated scale, bounce, and yellow glow */}
      {icon && (
        <span
          className={`flex-shrink-0 transition-transform duration-300 ${
            isHovered ? 'scale-120 rotate-6 text-current' : 'scale-100 group-hover:scale-110'
          }`}
        >
          {icon}
        </span>
      )}

      {/* Typewriter Styled Text */}
      <span className="font-bold tracking-tight inline-flex items-center">
        <span>{displayText}</span>
        {isHovered && (
          <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse" />
        )}
      </span>
    </button>
  );
};
