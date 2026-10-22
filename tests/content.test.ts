import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UNIT_SIZE, buildCurriculum, formMatches } from '../src/content/parse';

const dir = join(__dirname, '../src/content/worlds');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));
const { curriculum, errors } = buildCurriculum(files);

describe('curriculum', () => {
  it('parses with no errors', () => {
    expect(errors.map((e) => `${e.file}:${e.line} ${e.message}`)).toEqual([]);
  });

  it('has full units only', () => {
    for (const u of curriculum.units) expect(u.words.length, u.id).toBe(UNIT_SIZE);
  });

  it('has no duplicate words', () => {
    const ids = curriculum.words.map((w) => w.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('gives every unit an interactive story that uses each word once', () => {
    for (const u of curriculum.units) {
      const blanks = u.story.pages.flatMap((p) => p.parts.filter((x) => typeof x !== 'string'));
      expect(blanks.length, u.id).toBe(u.words.length);
    }
  });

  it('reports size', () => {
    const perWorld = curriculum.worlds.map((w) => `${w.title}: ${w.units.length * UNIT_SIZE}`);
    console.log(`${curriculum.words.length} words in ${curriculum.units.length} units\n  ${perWorld.join('\n  ')}`);
    expect(curriculum.words.length).toBeGreaterThan(0);
  });
});

describe('formMatches', () => {
  it.each([
    ['hopped', 'hop'],
    ['tried', 'try'],
    ['gently', 'gentle'],
    ['baked', 'bake'],
    ['enormous', 'enormous'],
    ['puppies', 'puppy'],
    ['happier', 'happy'],
  ])('%s ← %s', (form, lemma) => expect(formMatches(form, lemma)).toBe(true));

  it('rejects other words', () => {
    expect(formMatches('huge', 'hug')).toBe(false);
    expect(formMatches('cart', 'car')).toBe(false);
  });
});
