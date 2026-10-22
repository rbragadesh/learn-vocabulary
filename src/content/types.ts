export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'other';

export interface Word {
  id: string; // the word itself, lower-case; unique across the curriculum
  word: string;
  emoji: string;
  pos: Pos;
  definition: string;
  /** Example sentence with the target form wrapped in [brackets]. */
  example: string;
  /** The exact form of the word used inside the example's brackets. */
  exampleForm: string;
  synonyms: string[];
  unitId: string;
  levelId: string;
  worldId: string;
  /** 0-based position in the whole curriculum; used for ordering. */
  order: number;
}

export interface StoryBlank {
  wordId: string;
  form: string;
}

export interface StoryPage {
  art: string;
  /** Text split into literal strings and blanks, in reading order. */
  parts: (string | StoryBlank)[];
}

export interface Story {
  title: string;
  theme: string;
  pages: StoryPage[];
}

export interface Unit {
  id: string;
  title: string;
  index: number; // 0-based within the world
  globalIndex: number; // 0-based across the whole curriculum
  worldId: string;
  levelId: string;
  words: Word[];
  story: Story;
}

export interface Level {
  id: string;
  index: number; // 0-based within the world
  worldId: string;
  title: string;
  units: Unit[];
}

export interface World {
  id: string;
  index: number;
  title: string;
  emoji: string;
  blurb: string;
  levels: Level[];
  units: Unit[];
}

export interface Curriculum {
  worlds: World[];
  units: Unit[];
  words: Word[];
  wordById: Map<string, Word>;
  unitById: Map<string, Unit>;
  levelById: Map<string, Level>;
  worldById: Map<string, World>;
}
