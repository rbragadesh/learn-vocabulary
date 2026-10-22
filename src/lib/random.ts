export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, n);
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Evenly spread `n` picks across `items` (keeps placement samples from bunching in one unit). */
export function spread<T>(items: readonly T[], n: number): T[] {
  if (items.length <= n) return shuffle(items);
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step + Math.random() * step)]);
}
