import { useEffect, useMemo, useState } from 'react';
import { useCurriculum } from '../App';
import { WordCard } from '../components/WordCard';
import { TopBar } from '../components/ui';
import { drawingIds } from '../lib/drawings';
import { INTERVAL_DAYS, isMastered } from '../lib/srs';
import { useProgress } from '../lib/store';

type Filter = 'all' | 'mastered' | 'practicing' | 'drawn';

export function Collection({ onBack }: { onBack: () => void }) {
  const c = useCurriculum();
  const p = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<Set<string>>(new Set());

  useEffect(() => {
    drawingIds().then((ids) => setDrawn(new Set(ids)));
  }, [openId]);

  const words = useMemo(() => {
    const q = query.trim().toLowerCase();
    return c.words.filter((w) => {
      const card = p.cards[w.id];
      if (!card) return false;
      if (q && !w.id.includes(q)) return false;
      if (filter === 'mastered') return isMastered(card);
      if (filter === 'practicing') return !isMastered(card);
      if (filter === 'drawn') return drawn.has(w.id);
      return true;
    });
  }, [c, p.cards, filter, query, drawn]);

  const open = openId ? c.wordById.get(openId) : undefined;
  const openCard = openId ? p.cards[openId] : undefined;

  return (
    <div className="screen">
      <TopBar title={`📚 My Words (${Object.keys(p.cards).length})`} onBack={onBack} />
      <div className="collection-controls">
        <input className="search" placeholder="Find a word…" value={query} onChange={(e) => setQuery(e.target.value)} autoCapitalize="none" autoCorrect="off" />
        <div className="segmented">
          {(['all', 'practicing', 'mastered', 'drawn'] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'practicing' ? 'Practicing' : f === 'mastered' ? '⭐ Mastered' : '🎨 Drawn'}
            </button>
          ))}
        </div>
      </div>
      {words.length === 0 ? (
        <p className="empty">{Object.keys(p.cards).length ? 'No words match.' : 'Words you learn will appear here. Start your first adventure!'}</p>
      ) : (
        <div className="collection-grid">
          {words.map((w) => {
            const card = p.cards[w.id];
            return (
              <button key={w.id} className={`collect-tile box-${card.box}`} onClick={() => setOpenId(w.id)}>
                <span className="collect-emoji">{w.emoji}</span>
                <span className="collect-word">{w.word}</span>
                <span className="mastery" style={{ ['--m' as string]: `${(card.box / (INTERVAL_DAYS.length - 1)) * 100}%` }} />
              </button>
            );
          })}
        </div>
      )}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpenId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={() => setOpenId(null)} aria-label="Close">
              ✕
            </button>
            <WordCard word={open} />
            {openCard && (
              <p className="muted word-stats">
                {isMastered(openCard) ? '⭐ Mastered' : `Memory level ${openCard.box} of ${INTERVAL_DAYS.length - 1}`} · answered right {openCard.correct} of {openCard.seen} times · next review{' '}
                {openCard.due <= Date.now() ? 'today' : new Date(openCard.due).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
