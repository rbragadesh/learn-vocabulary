import { useEffect, useState, type ReactNode } from 'react';
import { speak } from '../lib/speech';
import { sfx } from '../lib/sfx';

export function TopBar({ title, onBack, right }: { title?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
      ) : (
        <span className="icon-spacer" />
      )}
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">{right ?? <span className="icon-spacer" />}</div>
    </header>
  );
}

export function SpeakButton({ text, label = 'Hear it', small }: { text: string; label?: string; small?: boolean }) {
  return (
    <button
      className={small ? 'speak-btn small' : 'speak-btn'}
      onClick={(e) => {
        e.stopPropagation();
        void speak(text);
      }}
      aria-label={label}
    >
      🔊
    </button>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stars({ n, of = 3, big }: { n: number; of?: number; big?: boolean }) {
  return (
    <span className={big ? 'stars big' : 'stars'} aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

const CONFETTI = ['🎉', '⭐', '✨', '🌟', '🎈', '💫'];

export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      e: CONFETTI[i % CONFETTI.length],
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.6 + Math.random() * 1.2,
    })),
  );
  useEffect(() => sfx.fanfare(), []);
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          {p.e}
        </span>
      ))}
    </div>
  );
}

export function starsFor(pct: number): number {
  return pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
}
