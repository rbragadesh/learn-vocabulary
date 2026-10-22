import { useSyncExternalStore } from 'react';
import { newCard, review, type SrsCard } from './srs';
import { todayKey } from './text';

export interface Settings {
  childName: string;
  newUnitsPerDay: number;
  voiceURI: string | null;
  rate: number;
  autoRead: boolean;
  sound: boolean;
  unlockAll: boolean;
}

export interface UnitProgress {
  learned?: boolean;
  storyStars?: number;
  quizBest?: number;
  stars?: number;
  completedAt?: number;
  placedOut?: boolean;
}

export interface LevelProgress {
  best: number;
  attempts: number;
  passedAt?: number;
}

export interface DayLog {
  newWords: number;
  units: number;
  reviews: number;
  reviewRounds: number;
  answered: number;
  correct: number;
}

export interface Progress {
  version: 1;
  createdAt: number;
  onboarded: boolean;
  placementDone: boolean;
  placementResult?: { worldIndex: number; at: number };
  settings: Settings;
  units: Record<string, UnitProgress>;
  levels: Record<string, LevelProgress>;
  cards: Record<string, SrsCard>;
  days: Record<string, DayLog>;
  stars: number;
  streak: { count: number; last: string | null };
}

const KEY = 'wordquest:v1';

export const DEFAULT_SETTINGS: Settings = {
  childName: '',
  newUnitsPerDay: 1,
  voiceURI: null,
  rate: 0.9,
  autoRead: true,
  sound: true,
  unlockAll: false,
};

export function freshProgress(): Progress {
  return {
    version: 1,
    createdAt: Date.now(),
    onboarded: false,
    placementDone: false,
    settings: { ...DEFAULT_SETTINGS },
    units: {},
    levels: {},
    cards: {},
    days: {},
    stars: 0,
    streak: { count: 0, last: null },
  };
}

function normalize(raw: unknown): Progress {
  const base = freshProgress();
  if (!raw || typeof raw !== 'object' || (raw as Progress).version !== 1) return base;
  const p = raw as Progress;
  return { ...base, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings }, streak: { ...base.streak, ...p.streak } };
}

function load(): Progress {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalize(JSON.parse(s)) : freshProgress();
  } catch {
    return freshProgress();
  }
}

let state: Progress = typeof localStorage === 'undefined' ? freshProgress() : load();
const listeners = new Set<() => void>();
let saveFailed = false;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch {
    saveFailed = true;
  }
}

export function getProgress(): Progress {
  return state;
}

export function didSaveFail(): boolean {
  return saveFailed;
}

/** Apply a change. The updater gets a deep copy it may mutate freely. */
export function update(fn: (draft: Progress) => void): void {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  save();
  listeners.forEach((l) => l());
}

export function replaceProgress(next: Progress): void {
  state = normalize(next);
  save();
  listeners.forEach((l) => l());
}

export function resetProgress(): void {
  replaceProgress(freshProgress());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ---- helpers used inside update() ----

export function dayLog(p: Progress, key = todayKey()): DayLog {
  return (p.days[key] ??= { newWords: 0, units: 0, reviews: 0, reviewRounds: 0, answered: 0, correct: 0 });
}

export function touchStreak(p: Progress): void {
  const today = todayKey();
  if (p.streak.last === today) return;
  const yesterday = todayKey(Date.now() - 24 * 60 * 60 * 1000);
  p.streak.count = p.streak.last === yesterday ? p.streak.count + 1 : 1;
  p.streak.last = today;
}

/** Record one answer for a word. New words enter the review schedule; known ones move boxes. */
export function recordAnswer(p: Progress, wordId: string, correct: boolean, countAsReview: boolean): void {
  const now = Date.now();
  const card = p.cards[wordId];
  p.cards[wordId] = card ? review(card, correct, now) : newCard(correct, now);
  const log = dayLog(p);
  log.answered++;
  if (correct) log.correct++;
  if (countAsReview) log.reviews++;
}

export function exportProgress(): string {
  return JSON.stringify({ app: 'word-quest', exportedAt: new Date().toISOString(), progress: state }, null, 1);
}

export function parseBackup(text: string): Progress {
  const data = JSON.parse(text);
  const p = data?.progress ?? data;
  if (!p || p.version !== 1 || typeof p.cards !== 'object') throw new Error('This file is not a Word Quest backup.');
  return normalize(p);
}

/** Ask the browser not to evict our data (Safari otherwise may clear it after weeks of no use). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
