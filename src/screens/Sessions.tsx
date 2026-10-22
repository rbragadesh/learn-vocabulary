import { useMemo, useState } from 'react';
import { useCurriculum } from '../App';
import { Confetti, Stars, TopBar, starsFor } from '../components/ui';
import type { Level } from '../content/types';
import { LEVEL_PASS, dueWords, REVIEW_BATCH } from '../lib/progress';
import { PLACEMENT_PER_WORLD, levelTest, placementQuestions, reviewQuiz } from '../lib/quiz';
import { sample } from '../lib/random';
import { speak } from '../lib/speech';
import { dayLog, getProgress, recordAnswer, touchStreak, update } from '../lib/store';
import { QuizRunner, type QuizResult } from './QuizRunner';

function ResultCard({ emoji, title, pct, missed, onHome, onNext, nextLabel, children }: {
  emoji: string;
  title: string;
  pct: number;
  missed: string[];
  onHome: () => void;
  onNext?: () => void;
  nextLabel?: string;
  children?: React.ReactNode;
}) {
  const c = useCurriculum();
  return (
    <div className="screen done-screen">
      {pct >= LEVEL_PASS && <Confetti />}
      <TopBar title={title} onBack={onHome} />
      <div className="done-card">
        <div className="done-emoji">{emoji}</div>
        <h2>{title}</h2>
        <Stars n={starsFor(pct)} big />
        <p className="done-score">You got {pct}% right.</p>
        {children}
        {missed.length > 0 && (
          <div className="missed">
            <div>Words to practice:</div>
            <div className="word-chips">
              {missed.map((id) => {
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
        <div className="done-actions">
          <button className="btn soft big" onClick={onHome}>
            🏠 Home
          </button>
          {onNext && (
            <button className="btn primary big" onClick={onNext}>
              {nextLabel ?? 'Keep going →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const pctOf = (r: QuizResult[]) => Math.round((r.filter((x) => x.correct).length / Math.max(1, r.length)) * 100);
const missedOf = (r: QuizResult[]) => r.filter((x) => !x.correct).map((x) => x.wordId);

export function ReviewSession({ onExit, onNext }: { onExit: () => void; onNext: () => void }) {
  const c = useCurriculum();
  const questions = useMemo(() => reviewQuiz(dueWords(getProgress(), c).slice(0, REVIEW_BATCH), c), [c]);
  const [results, setResults] = useState<QuizResult[] | null>(null);

  if (!questions.length) {
    return (
      <ResultCard emoji="✅" title="No reviews due" pct={100} missed={[]} onHome={onExit} onNext={onNext}>
        <p>All your words are fresh in your memory. Nice!</p>
      </ResultCard>
    );
  }
  if (results) {
    return (
      <ResultCard emoji="🧠" title="Review done!" pct={pctOf(results)} missed={missedOf(results)} onHome={onExit} onNext={onNext}>
        <p>Every review makes the words stick longer.</p>
      </ResultCard>
    );
  }
  return (
    <QuizRunner
      title="Review time"
      questions={questions}
      onQuit={onExit}
      onAnswer={(q, ok) => update((p) => recordAnswer(p, q.word.id, ok, true))}
      onDone={(r) => {
        update((p) => {
          dayLog(p).reviewRounds++;
          p.stars += 1;
          touchStreak(p);
        });
        setResults(r);
      }}
    />
  );
}

function trophy(pct: number): { emoji: string; name: string } {
  if (pct >= 95) return { emoji: '🥇', name: 'Gold trophy' };
  if (pct >= 80) return { emoji: '🥈', name: 'Silver trophy' };
  if (pct >= LEVEL_PASS) return { emoji: '🥉', name: 'Bronze trophy' };
  return { emoji: '💪', name: 'Almost there' };
}

export function LevelChallenge({ level, onExit, onNext }: { level: Level; onExit: () => void; onNext: () => void }) {
  const c = useCurriculum();
  const world = c.worldById.get(level.worldId)!;
  const [questions, setQuestions] = useState(() => levelTest(level, c));
  const [results, setResults] = useState<QuizResult[] | null>(null);

  if (results) {
    const pct = pctOf(results);
    const t = trophy(pct);
    return (
      <ResultCard
        emoji={t.emoji}
        title={pct >= LEVEL_PASS ? `${t.name}!` : 'So close!'}
        pct={pct}
        missed={missedOf(results)}
        onHome={onExit}
        onNext={
          pct >= LEVEL_PASS
            ? onNext
            : () => {
                setQuestions(levelTest(level, c));
                setResults(null);
              }
        }
        nextLabel={pct >= LEVEL_PASS ? 'Next level →' : 'Try again 🔁'}
      >
        <p>
          {pct >= LEVEL_PASS
            ? `You beat ${world.title} ${level.title}! The next level is open.`
            : `You need ${LEVEL_PASS}% to open the next level. The missed words will show up in your reviews — you've got this!`}
        </p>
      </ResultCard>
    );
  }
  return (
    <QuizRunner
      key={questions[0]?.key}
      title={`${world.emoji} ${level.title} Challenge`}
      questions={questions}
      requeueWrong={false}
      onQuit={onExit}
      onAnswer={(q, ok) => update((p) => recordAnswer(p, q.word.id, ok, true))}
      onDone={(r) => {
        const pct = pctOf(r);
        update((p) => {
          const l = (p.levels[level.id] ??= { best: 0, attempts: 0 });
          const firstPass = pct >= LEVEL_PASS && !l.passedAt;
          l.best = Math.max(l.best, pct);
          l.attempts++;
          if (firstPass) {
            l.passedAt = Date.now();
            p.stars += 5;
          }
          touchStreak(p);
        });
        setResults(r);
      }}
    />
  );
}

export function QuickTest({ onExit }: { onExit: () => void }) {
  const c = useCurriculum();
  const [questions, setQuestions] = useState(() => {
    const ids = Object.keys(getProgress().cards);
    return reviewQuiz(sample(ids, 10).map((id) => c.wordById.get(id)!).filter(Boolean), c);
  });
  const [results, setResults] = useState<QuizResult[] | null>(null);

  if (!questions.length) {
    return (
      <ResultCard emoji="📚" title="Learn some words first" pct={0} missed={[]} onHome={onExit}>
        <p>Finish your first unit and then come back to test yourself.</p>
      </ResultCard>
    );
  }
  if (results) {
    return (
      <ResultCard
        emoji="🎯"
        title="Test complete!"
        pct={pctOf(results)}
        missed={missedOf(results)}
        onHome={onExit}
        onNext={() => {
          const ids = Object.keys(getProgress().cards);
          setQuestions(reviewQuiz(sample(ids, 10).map((id) => c.wordById.get(id)!).filter(Boolean), c));
          setResults(null);
        }}
        nextLabel="Another test 🔁"
      />
    );
  }
  return (
    <QuizRunner
      key={questions[0]?.key}
      title="Quick test"
      questions={questions}
      requeueWrong={false}
      onQuit={onExit}
      onAnswer={(q, ok) => update((p) => recordAnswer(p, q.word.id, ok, true))}
      onDone={(r) => {
        update(touchStreak);
        setResults(r);
      }}
    />
  );
}

export const PLACEMENT_PASS = PLACEMENT_PER_WORLD - 1; // 7 of 8 right = she already knows this world

export function Placement({ onExit, onDone }: { onExit: () => void; onDone: () => void }) {
  const c = useCurriculum();
  const [started, setStarted] = useState(false);
  const [worldIdx, setWorldIdx] = useState(0);
  const [questions, setQuestions] = useState(() => placementQuestions(c.worlds[0], c));
  const [placed, setPlaced] = useState<number | null>(null);

  function finish(startIdx: number) {
    update((p) => {
      p.placementDone = true;
      p.placementResult = { worldIndex: startIdx, at: Date.now() };
      for (const u of c.units) {
        const w = c.worldById.get(u.worldId)!;
        const up = (p.units[u.id] ??= {});
        if (w.index < startIdx) up.placedOut = true;
        else delete up.placedOut;
      }
    });
    setPlaced(startIdx);
  }

  if (!c.worlds.length) return null;

  if (!started) {
    return (
      <div className="screen center-screen">
        <TopBar title="Word check" onBack={onExit} />
        <div className="done-card">
          <div className="done-emoji">🧭</div>
          <h2>Let's find your starting place!</h2>
          <p>
            I'll ask what some words mean. The words get harder as you go. It's totally fine not to know them — that just
            shows where your adventure should begin.
          </p>
          <p className="muted">Grown-ups: please don't help — a true answer puts her at the right level. Tap 🔊 to hear any answer read aloud.</p>
          <button className="btn primary big" onClick={() => setStarted(true)}>
            Start the word check →
          </button>
        </div>
      </div>
    );
  }

  if (placed !== null) {
    const w = c.worlds[placed];
    return (
      <div className="screen center-screen">
        <Confetti />
        <div className="done-card">
          <div className="done-emoji">{w.emoji}</div>
          <h2>You're starting in {w.title}!</h2>
          <p>
            {placed === 0
              ? "We'll start at the very beginning and build up from there."
              : `You already know lots of words, so we skipped ${placed === 1 ? 'the first world' : `the first ${placed} worlds`}. You can still visit them any time.`}
          </p>
          <button className="btn primary big" onClick={onDone}>
            Let's go! →
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      key={worldIdx}
      title={`Word check · ${c.worlds[worldIdx].emoji} ${c.worlds[worldIdx].title}`}
      questions={questions}
      requeueWrong={false}
      onQuit={onExit}
      onDone={(r) => {
        const right = r.filter((x) => x.correct).length;
        const passed = right >= PLACEMENT_PASS;
        if (passed && worldIdx + 1 < c.worlds.length) {
          setWorldIdx(worldIdx + 1);
          setQuestions(placementQuestions(c.worlds[worldIdx + 1], c));
        } else {
          // Start in the first world she didn't pass (or the last world if she passed them all).
          finish(worldIdx);
        }
      }}
    />
  );
}
