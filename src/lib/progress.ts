import type { Curriculum, Level, Unit, Word } from '../content/types';
import { isDue, isMastered } from './srs';
import type { Progress } from './store';
import { todayKey } from './text';

export const LEVEL_PASS = 70; // % needed in a level challenge to open the next level
export const REVIEW_BATCH = 20;

export function isUnitDone(p: Progress, unit: Unit): boolean {
  const u = p.units[unit.id];
  return !!(u?.completedAt || u?.placedOut);
}

export function isLevelPassed(p: Progress, level: Level): boolean {
  if (level.units.every((u) => p.units[u.id]?.placedOut)) return true;
  return (p.levels[level.id]?.best ?? 0) >= LEVEL_PASS;
}

export function isLevelReady(p: Progress, level: Level): boolean {
  return level.units.every((u) => isUnitDone(p, u));
}

export function isUnitUnlocked(p: Progress, c: Curriculum, unit: Unit): boolean {
  if (p.settings.unlockAll || unit.globalIndex === 0 || isUnitDone(p, unit)) return true;
  const prev = c.units[unit.globalIndex - 1];
  if (!isUnitDone(p, prev)) return false;
  if (prev.levelId !== unit.levelId) return isLevelPassed(p, c.levelById.get(prev.levelId)!);
  return true;
}

export function nextUnit(p: Progress, c: Curriculum): Unit | undefined {
  return c.units.find((u) => !isUnitDone(p, u) && isUnitUnlocked(p, c, u));
}

/** A finished level whose challenge hasn't been passed yet — it blocks the path forward. */
export function pendingChallenge(p: Progress, c: Curriculum): Level | undefined {
  for (const w of c.worlds) {
    for (const l of w.levels) {
      if (isLevelReady(p, l) && !isLevelPassed(p, l)) return l;
    }
  }
  return undefined;
}

export function dueWords(p: Progress, c: Curriculum, now = Date.now()): Word[] {
  return Object.entries(p.cards)
    .filter(([, card]) => isDue(card, now))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => c.wordById.get(id))
    .filter((w): w is Word => !!w);
}

export type AdventureStep =
  | { kind: 'review'; count: number }
  | { kind: 'challenge'; level: Level }
  | { kind: 'unit'; unit: Unit }
  | { kind: 'done'; reason: 'daily-limit' | 'finished' };

/** What the big "Today's Adventure" button should do next. */
export function nextAdventureStep(p: Progress, c: Curriculum): AdventureStep {
  const due = dueWords(p, c).length;
  const today = p.days[todayKey()];
  // Reviews come first, but one round a day is enough to earn new words even with a backlog.
  if (due > 0 && (today?.reviewRounds ?? 0) === 0) return { kind: 'review', count: Math.min(due, REVIEW_BATCH) };
  const challenge = pendingChallenge(p, c);
  if (challenge && !p.settings.unlockAll) return { kind: 'challenge', level: challenge };
  const unit = nextUnit(p, c);
  if (!unit) return due > 0 ? { kind: 'review', count: Math.min(due, REVIEW_BATCH) } : { kind: 'done', reason: 'finished' };
  if ((today?.units ?? 0) >= p.settings.newUnitsPerDay) {
    return due > 0 ? { kind: 'review', count: Math.min(due, REVIEW_BATCH) } : { kind: 'done', reason: 'daily-limit' };
  }
  return { kind: 'unit', unit };
}

export interface Stats {
  learned: number; // words studied in the app
  mastered: number;
  placedOut: number; // words skipped because the placement test showed she knows them
  practicing: number;
  due: number;
  unitsDone: number;
}

export function computeStats(p: Progress, c: Curriculum): Stats {
  let mastered = 0;
  let learned = 0;
  for (const card of Object.values(p.cards)) {
    learned++;
    if (isMastered(card)) mastered++;
  }
  let placedOut = 0;
  let unitsDone = 0;
  for (const u of c.units) {
    const up = p.units[u.id];
    if (up?.placedOut) placedOut += u.words.filter((w) => !p.cards[w.id]).length;
    if (up?.completedAt || up?.placedOut) unitsDone++;
  }
  return { learned, mastered, placedOut, practicing: learned - mastered, due: dueWords(p, c).length, unitsDone };
}

/** Average new words per active day over the last two weeks, and when 5,000 would be reached at that pace. */
export function pace(p: Progress, total: number, known: number): { perWeek: number; etaDays: number | null } {
  let words = 0;
  for (let i = 0; i < 14; i++) words += p.days[todayKey(Date.now() - i * 86400000)]?.newWords ?? 0;
  const perDay = words / 14;
  const remaining = Math.max(0, total - known);
  return { perWeek: Math.round(perDay * 7), etaDays: perDay > 0 ? Math.ceil(remaining / perDay) : null };
}

export function troubleWords(p: Progress, c: Curriculum, n = 12): { word: Word; lapses: number; box: number }[] {
  return Object.entries(p.cards)
    .filter(([, card]) => card.lapses > 0)
    .sort((a, b) => b[1].lapses - a[1].lapses || a[1].box - b[1].box)
    .slice(0, n)
    .map(([id, card]) => ({ word: c.wordById.get(id)!, lapses: card.lapses, box: card.box }))
    .filter((t) => t.word);
}

export type DragonStage = { emoji: string; name: string; next: number | null };

export function dragonStage(known: number): DragonStage {
  if (known < 50) return { emoji: '🥚', name: 'Dragon Egg', next: 50 };
  if (known < 300) return { emoji: '🦎', name: 'Hatchling', next: 300 };
  if (known < 1000) return { emoji: '🐲', name: 'Young Dragon', next: 1000 };
  if (known < 2500) return { emoji: '🐉', name: 'Mighty Dragon', next: 2500 };
  if (known < 5000) return { emoji: '🐉', name: 'Sky Dragon', next: 5000 };
  return { emoji: '🐉', name: 'Word Wizard Dragon', next: null };
}
