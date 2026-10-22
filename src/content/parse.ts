import type { Curriculum, Level, Pos, Story, StoryBlank, StoryPage, Unit, Word, World } from './types';

/*
 * Curriculum source format (one file per world):
 *
 *   # comment
 *   @world sprouts | Word Sprouts | 🌱 | Short words to read, spell and use
 *   @unit At Home
 *   nap | 😴 | noun | a short sleep during the day | Baby takes a [nap] after lunch. | snooze
 *   ... (exactly 10 word lines)
 *   @story Ziggy Needs a Nap | home
 *   🐉🥱 | Ziggy yawned. He needed a [nap].
 *   ... (one line per page)
 *
 * Word line fields: word | emoji | pos | definition | example | synonyms (optional, comma separated)
 * In examples and stories, [form] marks the target word. Use [form|word] when the
 * form is irregular (e.g. [ran|run]). {Name} is replaced with the child's name.
 */

export const UNIT_SIZE = 10;
export const UNITS_PER_LEVEL = 5;
export const POS_VALUES: Pos[] = ['noun', 'verb', 'adj', 'adv', 'other'];
export const THEMES = [
  'home', 'meadow', 'forest', 'ocean', 'beach', 'space', 'castle', 'city', 'snow', 'desert',
  'jungle', 'school', 'night', 'mountain', 'farm', 'cave', 'sky', 'garden', 'library', 'kitchen',
  'market', 'river', 'island', 'lab', 'museum', 'park', 'rain', 'volcano', 'underwater', 'camp',
] as const;

export interface ParseError {
  file: string;
  line: number;
  message: string;
}

const SUFFIXES = ['', 's', 'es', 'ed', 'd', 'ing', 'er', 'ers', 'est', 'ly', 'ily', 'ies', 'ied', 'ier', 'iest', "'s", 'n', 'en'];

/** Does `form` look like an inflection of `lemma` (enormous ← enormous, hopped ← hop, tried ← try)? */
export function formMatches(form: string, lemma: string): boolean {
  const f = form.toLowerCase();
  const l = lemma.toLowerCase();
  if (f === l || (f.startsWith(l) && SUFFIXES.includes(f.slice(l.length)))) return true;
  // Spelling changes before a suffix: bake → baked, try → tried, hop → hopped, picnic → picnicking.
  const stems = new Set<string>([l + l[l.length - 1]]);
  if (l.endsWith('e')) stems.add(l.slice(0, -1));
  if (l.endsWith('y')) stems.add(l.slice(0, -1) + 'i');
  if (l.endsWith('c')) stems.add(l + 'k');
  for (const s of stems) {
    const rest = f.slice(s.length);
    if (rest && f.startsWith(s) && SUFFIXES.includes(rest)) return true;
  }
  return l.endsWith('le') && f === l.slice(0, -1) + 'y'; // gentle → gently
}

interface Bracket {
  form: string;
  lemma?: string;
  start: number;
  end: number;
}

function findBrackets(text: string): Bracket[] {
  const out: Bracket[] = [];
  const re = /\[([^\]|]+)(?:\|([^\]]+))?\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ form: m[1].trim(), lemma: m[2]?.trim().toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function splitFields(line: string): string[] {
  return line.split('|').map((s) => s.trim());
}

interface RawUnit {
  title: string;
  line: number;
  words: { fields: string[]; line: number }[];
  story?: { title: string; theme: string; line: number; pages: { art: string; text: string; line: number }[] };
}

interface RawWorld {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  units: RawUnit[];
}

function readWorld(file: string, text: string, errors: ParseError[]): RawWorld | null {
  let world: RawWorld | null = null;
  let unit: RawUnit | null = null;
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const err = (message: string) => errors.push({ file, line: lineNo, message });

    if (line.startsWith('@world ')) {
      const [id, title, emoji, blurb] = splitFields(line.slice(7));
      if (!id || !title || !emoji) return err('@world needs: id | title | emoji | blurb');
      world = { id, title, emoji, blurb: blurb ?? '', units: [] };
      return;
    }
    if (!world) return err('content before @world');
    const w: RawWorld = world;
    if (line.startsWith('@unit ')) {
      unit = { title: line.slice(6).trim(), line: lineNo, words: [] };
      w.units.push(unit);
      return;
    }
    if (!unit) return err('content before @unit');
    const u: RawUnit = unit;
    if (line.startsWith('@story ')) {
      const [title, theme] = splitFields(line.slice(7));
      if (u.story) return err('unit already has a story');
      u.story = { title, theme: theme ?? 'meadow', line: lineNo, pages: [] };
      return;
    }
    if (u.story) {
      const bar = line.indexOf('|');
      if (bar < 0) return err('story line needs "art | text"');
      u.story.pages.push({ art: line.slice(0, bar).trim(), text: line.slice(bar + 1).trim(), line: lineNo });
      return;
    }
    u.words.push({ fields: splitFields(line), line: lineNo });
  });
  if (!world) errors.push({ file, line: 1, message: 'missing @world header' });
  return world;
}

function containsWord(haystack: string, word: string): boolean {
  return (haystack.toLowerCase().match(/[a-z']+/g) ?? []).some((t) => formMatches(t, word));
}

export function buildCurriculum(files: { file: string; text: string }[]): { curriculum: Curriculum; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const worlds: World[] = [];
  const allUnits: Unit[] = [];
  const allWords: Word[] = [];
  const wordById = new Map<string, Word>();
  const firstSeen = new Map<string, string>();

  for (const { file, text } of files) {
    const raw = readWorld(file, text, errors);
    if (!raw) continue;
    const world: World = { id: raw.id, index: worlds.length, title: raw.title, emoji: raw.emoji, blurb: raw.blurb, levels: [], units: [] };

    raw.units.forEach((ru, ui) => {
      const err = (line: number, message: string) => errors.push({ file, line, message });
      const levelIndex = Math.floor(ui / UNITS_PER_LEVEL);
      const levelId = `${world.id}-L${levelIndex + 1}`;
      const unitId = `${world.id}-${ui + 1}`;
      if (ru.words.length !== UNIT_SIZE) err(ru.line, `unit "${ru.title}" has ${ru.words.length} words, expected ${UNIT_SIZE}`);

      const words: Word[] = [];
      for (const { fields, line } of ru.words) {
        const [word, emoji, pos, definition, example, synonyms] = fields;
        if (fields.length < 5 || fields.length > 6) { err(line, `word line needs 5 or 6 fields, got ${fields.length}`); continue; }
        if (!word || !emoji || !definition || !example) { err(line, 'empty field'); continue; }
        if (!POS_VALUES.includes(pos as Pos)) err(line, `bad part of speech "${pos}"`);
        const id = word.toLowerCase();
        if (firstSeen.has(id)) err(line, `duplicate word "${word}" (first in ${firstSeen.get(id)})`);
        else firstSeen.set(id, `${file}:${line}`);
        if (containsWord(definition, id)) err(line, `definition of "${word}" gives the word away`);
        const brackets = findBrackets(example);
        if (brackets.length !== 1) err(line, `example must contain exactly one [word], found ${brackets.length}`);
        const b = brackets[0];
        if (b && !(b.lemma ? b.lemma === id : formMatches(b.form, id))) err(line, `example bracket "[${b.form}]" doesn't match "${word}"`);
        const w: Word = {
          id,
          word,
          emoji,
          pos: pos as Pos,
          definition,
          example: example.replace(/\[([^\]|]+)\|[^\]]+\]/g, '[$1]'),
          exampleForm: b?.form ?? word,
          synonyms: synonyms ? synonyms.split(',').map((s) => s.trim()).filter(Boolean) : [],
          unitId,
          levelId,
          worldId: world.id,
          order: allWords.length,
        };
        words.push(w);
        allWords.push(w);
        if (!wordById.has(id)) wordById.set(id, w);
      }

      let story: Story = { title: ru.title, theme: 'meadow', pages: [] };
      if (!ru.story) err(ru.line, `unit "${ru.title}" has no @story`);
      else {
        const rs = ru.story;
        if (!(THEMES as readonly string[]).includes(rs.theme)) err(rs.line, `unknown theme "${rs.theme}"`);
        if (rs.pages.length < 4) err(rs.line, `story "${rs.title}" has only ${rs.pages.length} pages`);
        const used = new Map<string, number>();
        const pages: StoryPage[] = rs.pages.map((p) => {
          const parts: (string | StoryBlank)[] = [];
          let pos = 0;
          for (const b of findBrackets(p.text)) {
            if (b.start > pos) parts.push(p.text.slice(pos, b.start));
            pos = b.end;
            const candidates = b.lemma ? words.filter((w) => w.id === b.lemma) : words.filter((w) => formMatches(b.form, w.id));
            if (candidates.length !== 1) {
              err(p.line, candidates.length ? `"[${b.form}]" is ambiguous` : `"[${b.form}]" isn't one of this unit's words`);
              parts.push(b.form);
              continue;
            }
            const wordId = candidates[0].id;
            used.set(wordId, (used.get(wordId) ?? 0) + 1);
            parts.push({ wordId, form: b.form });
          }
          if (pos < p.text.length) parts.push(p.text.slice(pos));
          return { art: p.art, parts };
        });
        for (const w of words) {
          const n = used.get(w.id) ?? 0;
          if (n !== 1) err(rs.line, `story "${rs.title}" uses "${w.id}" ${n} times (needs exactly 1)`);
        }
        story = { title: rs.title, theme: rs.theme, pages };
      }

      const unit: Unit = { id: unitId, title: ru.title, index: ui, globalIndex: allUnits.length, worldId: world.id, levelId, words, story };
      if (!world.levels[levelIndex]) {
        world.levels[levelIndex] = { id: levelId, index: levelIndex, worldId: world.id, title: `Level ${levelIndex + 1}`, units: [] };
      }
      world.levels[levelIndex].units.push(unit);
      world.units.push(unit);
      allUnits.push(unit);
    });
    worlds.push(world);
  }

  const curriculum: Curriculum = {
    worlds,
    units: allUnits,
    words: allWords,
    wordById,
    unitById: new Map(allUnits.map((u) => [u.id, u])),
    levelById: new Map(worlds.flatMap((w) => w.levels).map((l): [string, Level] => [l.id, l])),
    worldById: new Map(worlds.map((w) => [w.id, w])),
  };
  return { curriculum, errors };
}
