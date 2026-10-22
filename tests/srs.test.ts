import { describe, expect, it } from 'vitest';
import { DAY, MASTERED_BOX, isMastered, newCard, review, startOfDay } from '../src/lib/srs';

const now = new Date(2026, 0, 10, 15, 0).getTime();

describe('srs', () => {
  it('schedules a correctly answered new word for tomorrow', () => {
    const c = newCard(true, now);
    expect(c.box).toBe(1);
    expect(c.due).toBe(startOfDay(now) + DAY);
  });

  it('keeps a missed new word due right away', () => {
    expect(newCard(false, now).due).toBe(now);
  });

  it('climbs boxes on correct answers and falls back on a miss', () => {
    let c = newCard(true, now);
    let t = now;
    for (let i = 0; i < 5; i++) {
      t = c.due + 1000;
      c = review(c, true, t);
    }
    expect(c.box).toBe(6);
    expect(isMastered(c)).toBe(true);
    c = review(c, false, c.due + 1000);
    expect(c.box).toBe(1);
    expect(c.lapses).toBe(1);
    expect(c.box).toBeLessThan(MASTERED_BOX);
  });

  it('does not promote words answered before they are due', () => {
    const c = newCard(true, now);
    const early = review(c, true, now + 60_000);
    expect(early.box).toBe(1);
    expect(early.due).toBe(c.due);
  });
});
