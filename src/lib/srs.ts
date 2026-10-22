// Leitner-style spaced repetition. Each word sits in a box; a correct answer moves it up a box
// (longer wait before the next review), a wrong answer drops it back to box 1 (review tomorrow).

export const DAY = 24 * 60 * 60 * 1000;
/** Days to wait before reviewing a word in each box. Box 0 = due immediately. */
export const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 35, 90];
export const MAX_BOX = INTERVAL_DAYS.length - 1;
/** A word counts as mastered once it has been recalled correctly after an 8+ day gap. */
export const MASTERED_BOX = 5;

export interface SrsCard {
  box: number;
  due: number; // epoch ms
  seen: number;
  correct: number;
  lapses: number;
  last: number;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueAfter(box: number, now: number): number {
  // Schedule at the start of the target day so a review is "due today" all day long.
  return box === 0 ? now : startOfDay(now) + INTERVAL_DAYS[box] * DAY;
}

export function newCard(correct: boolean, now: number): SrsCard {
  const box = correct ? 1 : 0;
  return { box, due: dueAfter(box, now), seen: 1, correct: correct ? 1 : 0, lapses: 0, last: now };
}

export function review(card: SrsCard, correct: boolean, now: number): SrsCard {
  // Answering early (e.g. in a level challenge) shouldn't promote a word faster than its schedule.
  const wasDue = card.due <= now;
  const box = correct ? (wasDue ? Math.min(card.box + 1, MAX_BOX) : Math.max(card.box, 1)) : 1;
  return {
    box,
    due: correct && !wasDue ? card.due : dueAfter(box, now),
    seen: card.seen + 1,
    correct: card.correct + (correct ? 1 : 0),
    lapses: card.lapses + (correct ? 0 : 1),
    last: now,
  };
}

export function isDue(card: SrsCard, now: number): boolean {
  return card.due <= now;
}

export function isMastered(card: SrsCard | undefined): boolean {
  return !!card && card.box >= MASTERED_BOX;
}
