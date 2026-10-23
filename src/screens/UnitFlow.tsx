import { useMemo, useState } from 'react';
import { useCurriculum, useName, useSettings } from '../App';
import { WordCard } from '../components/WordCard';
import { Confetti, Stars, TopBar, starsFor } from '../components/ui';
import type { Unit } from '../content/types';
import { unitQuiz } from '../lib/quiz';
import { sample } from '../lib/random';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { dayLog, getProgress, recordAnswer, touchStreak, update } from '../lib/store';
import { QuizRunner, type QuizResult } from './QuizRunner';
import { StoryPlayer } from './StoryPlayer';

type Step = 'learn' | 'story' | 'quiz' | 'done';

export function UnitFlow({ unit, onExit, onNext }: { unit: Unit; onExit: () => void; onNext: () => void }) {
  const c = useCurriculum();
  const initial = getProgress().units[unit.id];
  const [step, setStep] = useState<Step>(!initial?.learned || initial.completedAt ? 'learn' : initial.storyStars === undefined ? 'story' : 'quiz');
  const [result, setResult] = useState<{ pct: number; stars: number; missed: string[]; first: boolean } | null>(null);
  const questions = useMemo(() => (step === 'quiz' ? unitQuiz(unit, c) : []), [step, unit, c]);

  if (step === 'learn') {
    return (
      <LearnCards
        unit={unit}
        onQuit={onExit}
        onDone={() => {
          update((p) => {
            (p.units[unit.id] ??= {}).learned = true;
          });
          setStep('story');
        }}
      />
    );
  }

  if (step === 'story') {
    return (
      <StoryPlayer
        unit={unit}
        onQuit={onExit}
        onDone={(stars) => {
          update((p) => {
            const u = (p.units[unit.id] ??= {});
            u.storyStars = Math.max(u.storyStars ?? 0, stars);
          });
          setStep('quiz');
        }}
      />
    );
  }

  if (step === 'quiz') {
    return (
      <QuizRunner
        title={`Quiz: ${unit.title}`}
        questions={questions}
        onQuit={onExit}
        onAnswer={(q, correct) => update((p) => recordAnswer(p, q.word.id, correct, !!p.units[unit.id]?.completedAt, q.kind))}
        onDone={(results: QuizResult[]) => {
          const right = results.filter((r) => r.correct).length;
          const pct = Math.round((right / Math.max(1, results.length)) * 100);
          const stars = starsFor(pct);
          const first = !getProgress().units[unit.id]?.completedAt;
          update((p) => {
            const u = (p.units[unit.id] ??= {});
            const gained = Math.max(0, stars - (u.stars ?? 0));
            p.stars += gained + (first ? 1 : 0); // +1 bonus star for finishing a new unit
            u.stars = Math.max(u.stars ?? 0, stars);
            u.quizBest = Math.max(u.quizBest ?? 0, pct);
            if (first) {
              u.completedAt = Date.now();
              const log = dayLog(p);
              log.units++;
              log.newWords += unit.words.length;
            }
            touchStreak(p);
          });
          setResult({ pct, stars, missed: results.filter((r) => !r.correct).map((r) => r.wordId), first });
          setStep('done');
        }}
      />
    );
  }

  return (
    <div className="screen done-screen">
      <Confetti />
      <TopBar title={unit.title} onBack={onExit} />
      <div className="done-card">
        <div className="done-emoji">🏆</div>
        <h2>{result?.first ? 'Unit complete!' : 'Great practice!'}</h2>
        <Stars n={result?.stars ?? 1} big />
        <p className="done-score">You got {result?.pct}% on the quiz.</p>
        {!!result?.missed.length && (
          <div className="missed">
            <div>Words to keep practicing (they'll come back in your reviews):</div>
            <div className="word-chips">
              {result.missed.map((id) => {
                const w = c.wordById.get(id)!;
                return (
                  <button key={id} className="chip big" onClick={() => speak(`${w.word}. ${w.definition}`)}>
                    {w.emoji} {w.word}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <SayItYourWay unit={unit} />
        <div className="done-actions">
          <button className="btn soft big" onClick={onExit}>
            🏠 Home
          </button>
          <button className="btn primary big" onClick={onNext}>
            Keep going →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Making up her own sentence is the real test of understanding, and only a person can judge it,
 * so a grown-up listens and taps ✓.
 */
function SayItYourWay({ unit }: { unit: Unit }) {
  const name = useName();
  const [words] = useState(() => sample(unit.words, 3));
  const [done, setDone] = useState<string[]>([]);

  function confirm(id: string) {
    sfx.correct();
    setDone((d) => [...d, id]);
    update((p) => {
      p.ownSentences[id] = (p.ownSentences[id] ?? 0) + 1;
      p.stars += 1;
    });
  }

  return (
    <div className="say-it">
      <h3>🗣️ Say it your way</h3>
      <p>Make up your own sentence with each word and say it out loud to a grown-up.</p>
      <div className="say-rows">
        {words.map((w) => (
          <div key={w.id} className="say-row">
            <button className="chip big" onClick={() => speak(`${w.word}. ${w.definition}`)}>
              {w.emoji} {w.word}
            </button>
            <button className={`btn ${done.includes(w.id) ? 'good' : 'primary'}`} onClick={() => confirm(w.id)} disabled={done.includes(w.id)}>
              {done.includes(w.id) ? '⭐ Nice!' : '✓ Made sense'}
            </button>
          </div>
        ))}
      </div>
      <p className="say-it-note">Grown-up: tap ✓ only if {name}'s sentence shows she knows what the word means. Not sure? Ask, “What does that word mean?”</p>
    </div>
  );
}

function LearnCards({ unit, onDone, onQuit }: { unit: Unit; onDone: () => void; onQuit: () => void }) {
  const settings = useSettings();
  const [i, setI] = useState(0);
  const word = unit.words[i];

  function go(n: number) {
    const w = unit.words[n];
    if (settings.autoRead && w) void speak(w.word);
    setI(n);
  }

  return (
    <div className="screen learn-screen">
      <TopBar title={`New words: ${unit.title}`} onBack={onQuit} right={<span className="pill">{i + 1} / {unit.words.length}</span>} />
      <div className="dots">
        {unit.words.map((w, n) => (
          <button key={w.id} className={`dot ${n === i ? 'on' : n < i ? 'done' : ''}`} onClick={() => go(n)} aria-label={w.word} />
        ))}
      </div>
      <WordCard key={word.id} word={word} />
      <div className="learn-nav">
        <button className="btn soft big" onClick={() => go(i - 1)} disabled={i === 0}>
          ← Back
        </button>
        {i + 1 < unit.words.length ? (
          <button className="btn primary big" onClick={() => go(i + 1)}>
            Next word →
          </button>
        ) : (
          <button className="btn primary big" onClick={onDone}>
            Story time! 📖
          </button>
        )}
      </div>
    </div>
  );
}
