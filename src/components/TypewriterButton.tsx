import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
  /** Put the icon after the label (e.g. a "Next" arrow) */
  iconPosition?: 'left' | 'right';
}

const supportsHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: hover)').matches;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Icon-first button. At rest only the icon is visible; on hover (or keyboard focus) the
 * button widens and the label types itself out like a typewriter.
 *
 * Labels are always visible when there is no icon, while loading, and on touch devices
 * (no hover), so a button never turns into an unlabeled mystery icon.
 */
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
  iconPosition = 'left',
}) => {
  const [active, setActive] = useState(false);
  const [typed, setTyped] = useState('');
  const [canHover] = useState(supportsHover);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const alwaysShowText = !icon || !canHover || loading;
  const showLabel = alwaysShowText || (active && !disabled);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (alwaysShowText) {
      setTyped(text);
      return;
    }
    if (!active || disabled) {
      setTyped('');
      return;
    }
    if (prefersReducedMotion()) {
      setTyped(text);
      return;
    }

    typewriterAudio.playHoverTick();
    setTyped('');
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      setTyped(text.slice(0, idx));
      if (idx % 3 === 0) typewriterAudio.playHoverTick();
      if (idx >= text.length && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 28);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, alwaysShowText, disabled, text]);

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

  const iconNode = loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon;
  const isTyping = !alwaysShowText && active && typed.length < text.length;

  // Collapsed labels animate their width open so the button grows smoothly instead of jumping.
  const labelStyle: React.CSSProperties = alwaysShowText
    ? {}
    : { maxWidth: showLabel ? `calc(${text.length + 2}ch + 0.5rem)` : 0 };

  const label = (
    <span
      className={`inline-flex items-center font-bold tracking-tight ${
        alwaysShowText ? '' : 'overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out'
      }`}
      style={labelStyle}
      aria-hidden={!showLabel}
    >
      <span className={iconNode ? (iconPosition === 'right' ? 'pr-2' : 'pl-2') : ''}>
        {typed}
        {isTyping && <span className="inline-block w-1.5 h-3.5 align-middle bg-current ml-0.5 animate-pulse" />}
      </span>
    </span>
  );

  const iconEl = iconNode ? (
    <span className="flex-shrink-0 inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
      {iconNode}
    </span>
  ) : null;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      title={title ?? text}
      aria-label={text}
      className={`group relative inline-flex items-center justify-center rounded-xl border font-mono transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {iconPosition === 'right' ? (
        <>
          {label}
          {iconEl}
        </>
      ) : (
        <>
          {iconEl}
          {label}
        </>
      )}
    </button>
  );
};
