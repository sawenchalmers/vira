/**
 * Levels in the budtabell (π, SPEC.md §3) as exact fractions, so Gökunge's 4/3 stays exact.
 */

export interface Level {
  readonly num: number;
  readonly den: number;
}

export const level = (num: number, den = 1): Level => {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den <= 0) throw new Error(`Not a level: ${num}/${den}`);
  return { num, den };
};

/** Negative if a is lower than b, 0 if equal, positive if higher. */
export const compareLevels = (a: Level, b: Level): number => {
  return a.num * b.den - b.num * a.den;
};

/** "−1", "0", "4/3", "12" … */
export const formatLevel = (l: Level): string => {
  const sign = l.num < 0 ? "−" : "";
  const num = Math.abs(l.num);
  return l.den === 1 ? `${sign}${num}` : `${sign}${num}/${l.den}`;
};
