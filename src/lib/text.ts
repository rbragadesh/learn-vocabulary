export function personalize(text: string, name: string): string {
  return text.replace(/\{Name\}/g, name || 'Maya');
}

/** Plain text for speech: drop [brackets] and personalize. */
export function speakable(text: string, name: string): string {
  return personalize(text, name).replace(/\[([^\]|]+)(?:\|[^\]]+)?\]/g, '$1');
}

/** Split "The whale was [enormous]." into the parts around the bracketed word. */
export function splitExample(example: string): { before: string; form: string; after: string } {
  const m = /\[([^\]|]+)(?:\|[^\]]+)?\]/.exec(example);
  if (!m) return { before: example, form: '', after: '' };
  return { before: example.slice(0, m.index), form: m[1], after: example.slice(m.index + m[0].length) };
}

export function matchCase(form: string, like: string): string {
  if (!like) return form;
  return like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase()
    ? form[0].toUpperCase() + form.slice(1)
    : form[0].toLowerCase() + form.slice(1);
}

export const POS_LABEL: Record<string, string> = {
  noun: 'naming word',
  verb: 'action word',
  adj: 'describing word',
  adv: 'how word',
  other: 'helper word',
};

export function todayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
