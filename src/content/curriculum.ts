import { buildCurriculum } from './parse';

const files = import.meta.glob('./worlds/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const result = buildCurriculum(
  Object.keys(files)
    .sort()
    .map((file) => ({ file, text: files[file] })),
);

if (result.errors.length && import.meta.env.DEV) console.warn('Curriculum problems:', result.errors);

export const curriculum = result.curriculum;
export const TOTAL_WORDS = curriculum.words.length;
