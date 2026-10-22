import type { Curriculum, Level, Unit, Word, World } from '../content/types';
import { pick, sample, shuffle, spread } from './random';
import { matchCase, splitExample } from './text';

export type QKind = 'meaning' | 'define' | 'blank' | 'listen' | 'spell' | 'picture' | 'synonym';

export interface Question {
  key: string;
  kind: QKind;
  word: Word;
  /** Multiple-choice options (absent for spelling). */
  options: string[];
  answer: string;
  /** For 'blank': the example sentence around the gap. */
  before?: string;
  after?: string;
  /** For 'spell': shuffled letter tiles. */
  letters?: string[];
  /** For 'synonym': the similar word being asked about. */
  synonym?: string;
}

let counter = 0;
const key = () => `q${++counter}`;

/** Other words to use as wrong answers: same unit first, then nearby words in the curriculum. */
function pool(word: Word, c: Curriculum): Word[] {
  const unit = c.unitById.get(word.unitId)!;
  const near = c.words.slice(Math.max(0, word.order - 60), word.order + 60);
  const seen = new Set<string>([word.id]);
  const out: Word[] = [];
  for (const w of [...shuffle(unit.words), ...shuffle(near)]) {
    if (!seen.has(w.id)) {
      seen.add(w.id);
      out.push(w);
    }
  }
  return out;
}

/** True when two words could both be right answers (one lists the other as a similar word). */
export function tooSimilar(a: Word, b: Word): boolean {
  const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());
  return lower(a.synonyms).includes(b.id) || lower(b.synonyms).includes(a.id) || lower(a.synonyms).some((s) => lower(b.synonyms).includes(s));
}

function distractors(word: Word, c: Curriculum, n: number, value: (w: Word) => string, samePos = true): string[] {
  const candidates = pool(word, c).filter((w) => !tooSimilar(word, w));
  const ordered = samePos
    ? [...candidates.filter((w) => w.pos === word.pos), ...candidates.filter((w) => w.pos !== word.pos)]
    : candidates;
  const answer = value(word).toLowerCase();
  const picked: string[] = [];
  for (const w of ordered) {
    const v = value(w);
    if (v.toLowerCase() !== answer && !picked.some((p) => p.toLowerCase() === v.toLowerCase())) picked.push(v);
    if (picked.length === n) break;
  }
  return picked;
}

function allowedKinds(word: Word, worldIndex: number): QKind[] {
  const kinds: QKind[] = ['meaning', 'define', 'blank'];
  if (word.synonyms.length) kinds.push('synonym');
  if (worldIndex <= 2) kinds.push('listen');
  if (worldIndex <= 2 && /^[a-z]+$/.test(word.id) && word.id.length <= 8) kinds.push('spell');
  if (worldIndex <= 1 && word.pos === 'noun') kinds.push('picture');
  return kinds;
}

export function makeQuestion(word: Word, kind: QKind, c: Curriculum): Question {
  switch (kind) {
    case 'define': {
      const opts = distractors(word, c, 3, (w) => w.definition, false);
      return { key: key(), kind, word, answer: word.definition, options: shuffle([word.definition, ...opts]) };
    }
    case 'blank': {
      const { before, form, after } = splitExample(word.example);
      const opts = distractors(word, c, 3, (w) => w.exampleForm).map((f) => matchCase(f, form));
      return { key: key(), kind, word, before, after, answer: form, options: shuffle([form, ...opts]) };
    }
    case 'synonym': {
      const synonym = pick(word.synonyms);
      const opts = distractors(word, c, 3, (w) => w.word).filter((o) => o.toLowerCase() !== synonym.toLowerCase());
      return { key: key(), kind, word, synonym, answer: word.word, options: shuffle([word.word, ...opts]) };
    }
    case 'spell': {
      const extra = 'aeioulnrst'.split('').filter((ch) => !word.id.includes(ch));
      const letters = shuffle([...word.id.split(''), ...(word.id.length > 4 ? sample(extra, 1) : [])]);
      return { key: key(), kind, word, answer: word.id, options: [], letters };
    }
    case 'meaning':
    case 'listen':
    case 'picture':
    default: {
      const opts = distractors(word, c, 3, (w) => w.word, kind !== 'listen');
      return { key: key(), kind, word, answer: word.word, options: shuffle([word.word, ...opts]) };
    }
  }
}

function worldIndexOf(word: Word, c: Curriculum): number {
  return c.worldById.get(word.worldId)?.index ?? 0;
}

/** One question per word with a good mix of question types. */
export function makeMixedQuiz(words: Word[], c: Curriculum, prefer?: QKind[]): Question[] {
  const used = new Map<QKind, number>();
  return shuffle(words).map((w) => {
    let kinds = allowedKinds(w, worldIndexOf(w, c));
    if (prefer) kinds = kinds.filter((k) => prefer.includes(k));
    if (!kinds.length) kinds = ['meaning'];
    // Pick the least-used allowed kind so a quiz isn't ten of the same thing.
    const min = Math.min(...kinds.map((k) => used.get(k) ?? 0));
    const kind = pick(kinds.filter((k) => (used.get(k) ?? 0) === min));
    used.set(kind, (used.get(kind) ?? 0) + 1);
    return makeQuestion(w, kind, c);
  });
}

export function unitQuiz(unit: Unit, c: Curriculum): Question[] {
  return makeMixedQuiz(unit.words, c);
}

export function reviewQuiz(words: Word[], c: Curriculum): Question[] {
  return makeMixedQuiz(words, c);
}

export const LEVEL_TEST_SIZE = 20;

export function levelTest(level: Level, c: Curriculum): Question[] {
  const words = level.units.flatMap((u) => u.words);
  return makeMixedQuiz(sample(words, LEVEL_TEST_SIZE), c, ['meaning', 'define', 'blank', 'synonym']);
}

export const PLACEMENT_PER_WORLD = 8;

export function placementQuestions(world: World, c: Curriculum): Question[] {
  return spread(world.units.flatMap((u) => u.words), PLACEMENT_PER_WORLD).map((w) => makeQuestion(w, 'define', c));
}
