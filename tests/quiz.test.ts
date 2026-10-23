import { describe, expect, it } from 'vitest';
import { curriculum as c } from '../src/content/curriculum';
import { contextsFor, makeQuestion } from '../src/lib/quiz';
import { splitExample } from '../src/lib/text';

describe('quiz', () => {
  it('splits examples that use an irregular form', () => {
    expect(splitExample('The coach [strode|stride] onto the field.')).toEqual({ before: 'The coach ', form: 'strode', after: ' onto the field.' });
  });

  it('builds a fill-the-gap question for every word', () => {
    for (const w of c.words) {
      const q = makeQuestion(w, 'blank', c);
      expect(q.answer, w.id).toBeTruthy();
      expect(q.options, w.id).toContain(q.answer);
    }
  });

  it('gives every word at least one correct sentence', () => {
    for (const w of c.words) {
      const ctx = contextsFor(w, c);
      expect(ctx.length, w.id).toBeGreaterThan(0);
      for (const s of ctx) expect(s, w.id).toMatch(/\[[^\]|]+\]/);
    }
  });

  it('asks "which sentence uses it right" with one right and two wrong sentences', () => {
    const nounsAndVerbs = c.words.filter((w) => w.worldId !== c.worlds[0].id && (w.pos === 'noun' || w.pos === 'verb'));
    let built = 0;
    for (const w of nounsAndVerbs) {
      const q = makeQuestion(w, 'usage', c);
      if (q.kind !== 'usage') continue; // falls back to fill-the-gap when there aren't enough sentences
      built++;
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(3);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      for (const o of q.options) expect(o).toMatch(/\[[^\]]+\]/);
    }
    // Nearly every noun and verb should get a real sentence question.
    expect(built / nounsAndVerbs.length).toBeGreaterThan(0.95);
  });
});
