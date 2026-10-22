import { useMemo, useState } from 'react';
import { useCurriculum, useName, useSettings } from '../App';
import { Scene } from '../components/Scene';
import { ProgressBar, SpeakButton, Stars, TopBar, starsFor } from '../components/ui';
import type { StoryBlank, Unit } from '../content/types';
import { tooSimilar } from '../lib/quiz';
import { shuffle } from '../lib/random';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { matchCase, personalize } from '../lib/text';

interface Props {
  unit: Unit;
  onDone: (stars: number) => void;
  onQuit: () => void;
}

const isBlank = (p: string | StoryBlank): p is StoryBlank => typeof p !== 'string';

export function StoryPlayer({ unit, onDone, onQuit }: Props) {
  const c = useCurriculum();
  const name = useName();
  const settings = useSettings();
  const story = unit.story;
  const [page, setPage] = useState(0);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const finished = page >= story.pages.length;

  const allBlanks = useMemo(
    () => story.pages.flatMap((p, pi) => p.parts.map((part, i) => ({ part, key: `${pi}-${i}` })).filter((b) => isBlank(b.part))) as { part: StoryBlank; key: string }[],
    [story],
  );

  // Choices for each gap: the right word, one other word of the same kind (noun, verb…) and one of a
  // different kind, all from this story. Near-synonyms are never offered as wrong answers.
  const choices = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of allBlanks) {
      const word = c.wordById.get(b.part.wordId)!;
      const others = shuffle(allBlanks.filter((o) => o.part.wordId !== b.part.wordId && !tooSimilar(word, c.wordById.get(o.part.wordId)!)));
      const same = others.filter((o) => c.wordById.get(o.part.wordId)!.pos === word.pos);
      const diff = others.filter((o) => c.wordById.get(o.part.wordId)!.pos !== word.pos);
      const forms = [b.part.form];
      for (const o of [same[0], diff[0], ...others]) {
        if (!o || forms.length === 3) continue;
        const f = matchCase(o.part.form, b.part.form);
        if (!forms.some((x) => x.toLowerCase() === f.toLowerCase())) forms.push(f);
      }
      map.set(b.key, shuffle(forms));
    }
    return map;
  }, [allBlanks, c]);

  if (finished) {
    const firstTry = allBlanks.length - missed.size;
    const stars = starsFor((firstTry / Math.max(1, allBlanks.length)) * 100);
    return (
      <div className="screen story-screen">
        <TopBar title={story.title} onBack={onQuit} />
        <div className="story-body">
        <Scene theme={story.theme} className="story-scene end">
          <div className="story-art">📖✨</div>
        </Scene>
        <div className="story-panel center">
          <h2>The End!</h2>
          <Stars n={stars} big />
          <p>
            You used all {unit.words.length} words in the story. {firstTry === allBlanks.length ? 'Every one on the first try!' : ''}
          </p>
          <div className="word-chips">
            {unit.words.map((w) => (
              <span key={w.id} className="chip big">
                {w.emoji} {w.word}
              </span>
            ))}
          </div>
          <button className="btn primary big" onClick={() => onDone(stars)}>
            Next: Word Quiz →
          </button>
        </div>
        </div>
      </div>
    );
  }

  const current = story.pages[page];
  const pageBlanks = current.parts.map((part, i) => ({ part, key: `${page}-${i}` })).filter((b) => isBlank(b.part));
  const active = pageBlanks.find((b) => !filled.has(b.key));
  const pageDone = !active;

  function pageText(withBlanks: Set<string>) {
    return current.parts
      .map((part, i) => (isBlank(part) ? (withBlanks.has(`${page}-${i}`) ? part.form : 'blank') : part))
      .join('');
  }

  function choose(option: string) {
    if (!active) return;
    const blank = active.part as StoryBlank;
    if (option.toLowerCase() === blank.form.toLowerCase()) {
      sfx.correct();
      const next = new Set(filled).add(active.key);
      setFilled(next);
      setHint(null);
      const remaining = pageBlanks.filter((b) => !next.has(b.key));
      if (!remaining.length && settings.autoRead) void speak(personalize(pageText(next), name));
    } else {
      sfx.wrong();
      setMissed(new Set(missed).add(active.key));
      setShake(option);
      window.setTimeout(() => setShake(null), 500);
      const w = c.wordById.get(blank.wordId)!;
      setHint(`Hint: we need a word that means “${w.definition}”.`);
    }
  }

  function goNext() {
    setHint(null);
    const next = story.pages[page + 1];
    // Pages without gaps are read straight away; pages with gaps are read once they're filled.
    if (next && settings.autoRead && !next.parts.some(isBlank)) void speak(personalize(next.parts.join(''), name));
    setPage(page + 1);
  }

  return (
    <div className="screen story-screen">
      <TopBar title={story.title} onBack={onQuit} right={<span className="pill">Page {page + 1} / {story.pages.length}</span>} />
      <ProgressBar value={page} max={story.pages.length} />
      <div className="story-body">
      <Scene theme={story.theme} className="story-scene">
        <div className="story-art" key={page}>
          {current.art}
        </div>
      </Scene>
      <div className="story-panel">
        <p className="story-text">
          {current.parts.map((part, i) => {
            const k = `${page}-${i}`;
            if (!isBlank(part)) return <span key={k}>{personalize(part, name)}</span>;
            if (filled.has(k)) {
              const w = c.wordById.get(part.wordId)!;
              return (
                <button key={k} className="story-word" onClick={() => speak(`${w.word}. ${w.definition}`)} title={w.definition}>
                  {part.form}
                </button>
              );
            }
            return (
              <span key={k} className={`story-blank ${active?.key === k ? 'active' : ''}`}>
                ?
              </span>
            );
          })}
          <SpeakButton text={personalize(pageText(filled), name)} small />
        </p>
        {active ? (
          <>
            <div className="story-choices">
              {choices.get(active.key)!.map((o) => (
                <button key={o} className={`option chip-option ${shake === o ? 'shake' : ''}`} onClick={() => choose(o)}>
                  {o}
                </button>
              ))}
            </div>
            {hint && <div className="hint">{hint}</div>}
          </>
        ) : (
          <div className="story-nav">
            <button className="btn primary big" onClick={goNext} disabled={!pageDone}>
              {page + 1 === story.pages.length ? 'Finish the story ✓' : 'Next page →'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
