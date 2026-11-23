/**
 * The arguments of `npm run deal -- [seed] [players] [given]` (#46), as a pure function so
 * they can be tested apart from the command.
 */
import { isSeed, SEED_LIMIT, type PlayerCount } from "../engine/index.js";

export type DealArgs =
  | { readonly kind: "help" }
  | { readonly kind: "deal"; readonly seed: number; readonly players: PlayerCount; readonly given: number }
  | { readonly kind: "error"; readonly message: string };

const DEFAULT_PLAYERS = 4;
const DEFAULT_GIVEN = 0;

/** Only plain digits count as a whole number: no signs, spaces, decimals, exponents or hex. */
const parseWhole = (text: string): number | undefined => {
  return /^\d+$/.test(text) ? Number(text) : undefined;
};

/** `randomSeed` gives the seed when none is passed. */
export const parseDealArgs = (args: readonly string[], randomSeed: () => number): DealArgs => {
  if (args.includes("--help") || args.includes("-h")) return { kind: "help" };
  if (args.length > 3) return { kind: "error", message: `Too many arguments: "${args.slice(3).join(" ")}".` };
  const [seedArg, playersArg, givenArg] = args;

  const seed = seedArg === undefined ? randomSeed() : parseWhole(seedArg);
  if (seed === undefined || !isSeed(seed)) {
    return { kind: "error", message: `The seed must be a whole number from 0 to ${SEED_LIMIT - 1}, not "${seedArg}".` };
  }
  const players = playersArg === undefined ? DEFAULT_PLAYERS : parseWhole(playersArg);
  if (players !== 3 && players !== 4 && players !== 5) {
    return { kind: "error", message: `Players must be 3, 4 or 5, not "${playersArg}".` };
  }
  const given = givenArg === undefined ? DEFAULT_GIVEN : parseWhole(givenArg);
  if (given === undefined || given >= players) {
    return { kind: "error", message: `Given's seat must be 0 to ${players - 1}, not "${givenArg}".` };
  }
  return { kind: "deal", seed, players, given };
};
