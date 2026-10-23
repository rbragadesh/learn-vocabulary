import { useEffect, useRef, useState } from 'react';
import { useCurriculum, useName } from '../App';
import { ProgressBar, SpeakButton, TopBar } from '../components/ui';
import { makeQuestion, type Question } from '../lib/quiz';
import { shuffle } from '../lib/random';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { personalize, speakable } from '../lib/text';

export interface QuizResult {
  wordId: string;
  correct: boolean;
}

interface Props {
  title: string;
  questions: Question[];
  /** Ask missed words again at the end (practice mode). Tests and placement don't. */
  requeueWrong?: boolean;
  onAnswer?: (q: Question, correct: boolean) => void;
  onDone: (results: QuizResult[]) => void;
  onQuit: () => void;
}

export function QuizRunner({ title, questions, requeueWrong = true, onAnswer, onDone, onQuit }: Props) {
  const c = useCurriculum();
  const [queue, setQueue] = useState(questions);
  const [index, setIndex] = useState(0);
  const results = useRef<QuizResult[]>([]);
  const answered = useRef(new Set<string>());
  const requeued = useRef(new Set<string>());
  /** Keys of questions that are second tries, so the "try again" note shows on those only. */
  const retries = useRef(new Set<string>());
  const q = queue[index];

  function handleAnswer(correct: boolean) {
    if (!answered.current.has(q.word.id)) {
      answered.current.add(q.word.id);
      results.current.push({ wordId: q.word.id, correct });
      onAnswer?.(q, correct);
    }
    if (!correct && requeueWrong && !requeued.current.has(q.word.id)) {
      requeued.current.add(q.word.id);
      // Try the same word again later, with fresh options.
      const again = makeQuestion(q.word, q.kind, c);
      retries.current.add(again.key);
      setQueue((qs) => [...qs, again]);
    }
  }

  function next() {
    if (index + 1 >= queue.length) onDone(results.current);
    else setIndex(index + 1);
  }

  if (!q) return null;
  return (
    <div className="screen quiz-screen">
      <TopBar title={title} onBack={onQuit} right={<span className="pill">{Math.min(index + 1, queue.length)} / {queue.length}</span>} />
      <ProgressBar value={index} max={queue.length} />
      <QuestionView key={q.key} q={q} retry={retries.current.has(q.key)} onAnswer={handleAnswer} onNext={next} />
    </div>
  );
}

function QuestionView({ q, retry, onAnswer, onNext }: { q: Question; retry: boolean; onAnswer: (correct: boolean) => void; onNext: () => void }) {
  const name = useName();
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<'ask' | 'right' | 'wrong'>('ask');
  const timer = useRef<number>(undefined);

  useEffect(() => {
    if (q.kind === 'listen' || q.kind === 'spell') void speak(q.word.word);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  function choose(option: string) {
    if (status !== 'ask') return;
    const correct = option === q.answer;
    setPicked(option);
    setStatus(correct ? 'right' : 'wrong');
    onAnswer(correct);
    if (correct) {
      sfx.correct();
      timer.current = window.setTimeout(onNext, 1000);
    } else {
      sfx.wrong();
    }
  }

  const sentence = q.before !== undefined ? personalize(`${q.before}____${q.after}`, name) : '';

  return (
    <div className="question">
      {retry && <div className="retry-note">Let's try this one again!</div>}
      <div className="prompt-card">
        {q.kind === 'meaning' && (
          <>
            <div className="prompt-label">Which word means…</div>
            <div className="prompt-main">
              “{q.word.definition}” <SpeakButton text={q.word.definition} small />
            </div>
          </>
        )}
        {q.kind === 'define' && (
          <>
            <div className="prompt-label">What does this word mean?</div>
            <div className="prompt-word">
              {q.word.word} <SpeakButton text={q.word.word} small />
            </div>
          </>
        )}
        {q.kind === 'blank' && (
          <>
            <div className="prompt-label">Which word fits in the gap?</div>
            <div className="prompt-main sentence">
              {sentence} <SpeakButton text={speakable(sentence.replace('____', 'blank'), name)} small />
            </div>
          </>
        )}
        {q.kind === 'usage' && (
          <>
            <div className="prompt-label">Which sentence fits this word best?</div>
            <div className="prompt-word">
              {q.word.word} <SpeakButton text={q.word.word} small />
            </div>
          </>
        )}
        {q.kind === 'synonym' && (
          <>
            <div className="prompt-label">Which word means almost the same as…</div>
            <div className="prompt-word">
              {q.synonym} <SpeakButton text={q.synonym ?? ''} small />
            </div>
          </>
        )}
        {q.kind === 'listen' && (
          <>
            <div className="prompt-label">Listen, then tap the word you hear</div>
            <button className="big-speaker" onClick={() => speak(q.word.word)} aria-label="Play the word">
              🔊
            </button>
          </>
        )}
        {q.kind === 'picture' && (
          <>
            <div className="prompt-label">Which word goes with the picture?</div>
            <div className="prompt-emoji">{q.word.emoji}</div>
          </>
        )}
        {q.kind === 'spell' && (
          <>
            <div className="prompt-label">Spell the word you hear</div>
            <button className="big-speaker" onClick={() => speak(q.word.word)} aria-label="Play the word">
              🔊
            </button>
            <div className="prompt-hint">Hint: {q.word.definition}</div>
          </>
        )}
      </div>

      {q.kind === 'spell' ? (
        <SpellTiles q={q} status={status} onSubmit={(attempt) => choose(attempt)} />
      ) : (
        <div className={q.kind === 'define' || q.kind === 'usage' ? 'options list' : 'options grid'}>
          {q.options.map((o) => {
            const cls =
              status === 'ask' ? '' : o === q.answer ? 'right' : o === picked ? 'wrong' : 'dim';
            return (
              <button key={o} className={`option ${cls}`} onClick={() => choose(o)} disabled={status !== 'ask'}>
                {q.kind === 'usage' ? <Marked text={personalize(o, name)} /> : <span>{o}</span>}
                {q.kind === 'define' && <SpeakButton text={o} small />}
                {q.kind === 'usage' && <SpeakButton text={speakable(o, name)} small />}
              </button>
            );
          })}
        </div>
      )}

      {status === 'right' && <div className="feedback good">🎉 Yes! Great job!</div>}
      {status === 'wrong' && (
        <div className="feedback bad">
          <div>
            <strong>{q.word.word}</strong> means {q.word.definition}.
          </div>
          <div className="feedback-example">“{speakable(q.word.example, name)}”</div>
          <button className="btn primary" onClick={onNext}>
            Got it →
          </button>
        </div>
      )}
    </div>
  );
}

/** A sentence with its [bracketed] word highlighted. */
function Marked({ text }: { text: string }) {
  return (
    <span className="sentence">
      {text.split(/\[([^\]]+)\]/).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </span>
  );
}

function SpellTiles({ q, status, onSubmit }: { q: Question; status: string; onSubmit: (attempt: string) => void }) {
  const letters = q.letters ?? [];
  const [typed, setTyped] = useState<number[]>([]);
  const [tiles] = useState(() => shuffle(letters.map((l, i) => ({ l, i }))));
  const attempt = typed.map((i) => letters[i]).join('');

  function tap(i: number) {
    if (status !== 'ask' || typed.includes(i)) return;
    sfx.tap();
    const next = [...typed, i];
    setTyped(next);
    if (next.length === q.answer.length) onSubmit(next.map((j) => letters[j]).join(''));
  }

  return (
    <div className="spell">
      <div className={`spell-slots ${status}`}>
        {Array.from({ length: q.answer.length }, (_, i) => (
          <span key={i} className="slot">
            {status === 'wrong' ? q.answer[i] : attempt[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="spell-tiles">
        {tiles.map(({ l, i }) => (
          <button key={i} className={`tile ${typed.includes(i) ? 'used' : ''}`} onClick={() => tap(i)} disabled={status !== 'ask'}>
            {l}
          </button>
        ))}
        <button className="tile back" onClick={() => setTyped(typed.slice(0, -1))} disabled={status !== 'ask' || !typed.length} aria-label="Undo">
          ⌫
        </button>
      </div>
    </div>
  );
}
