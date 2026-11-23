/**
 * Seeded randomness. The engine never uses Math.random: each giv is shuffled from its own
 * seed, so any giv can be replayed exactly and on its own (#40).
 */

/** Returns numbers in [0, 1). */
export type Rng = () => number;

/** Seeds are whole numbers from 0 to 2³² − 1, so two different seeds never give the same game. */
export const SEED_LIMIT = 2 ** 32;

export const isSeed = (value: number): boolean => {
  return Number.isInteger(value) && value >= 0 && value < SEED_LIMIT;
};

const checkSeed = (seed: number): void => {
  if (!isSeed(seed)) throw new Error(`A seed must be a whole number from 0 to 2^32 − 1, not ${seed}`);
};

/** A small, fast seeded generator (mulberry32). The same seed always gives the same sequence. */
export const createRng = (seed: number): Rng => {
  checkSeed(seed);
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / SEED_LIMIT;
  };
};

/**
 * The seed for giv number `index` (0, 1, 2 …) of a parti with seed `seed`, so each giv has its
 * own seed and can be replayed without the givar before it. The constants are the golden-ratio
 * step and murmur3's finalising mix, which spread nearby inputs far apart.
 */
export const deriveSeed = (seed: number, index: number): number => {
  checkSeed(seed);
  if (!Number.isInteger(index) || index < 0) throw new Error(`A giv index must be a whole number ≥ 0, not ${index}`);
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

/** A shuffled copy (Fisher–Yates); the input is left unchanged. */
export const shuffle = <T>(items: readonly T[], rng: Rng): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
};
