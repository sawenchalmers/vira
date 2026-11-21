/**
 * `npm run deal -- [seed] [players] [given]` (#46): deals giv 0 of a parti and prints it.
 * Defaults: a fresh seed (printed, so the giv can be dealt again), 4 players, given in seat 0.
 * `npm run deal -- --help` (or -h) explains the parameters.
 */
import { dealCards, deriveSeed, isSeed, SEED_LIMIT, type PlayerCount } from "../engine/index.js";
import { describeGiv } from "./describe-giv.js";

const HELP = `npm run deal -- [seed] [players] [given]

Deals giv 0 of a parti and prints the roles, the hands, the talong and the Färg card.

  seed     a whole number from 0 to ${SEED_LIMIT - 1}; the same seed always gives the same giv.
           Default: a fresh random seed, printed so the giv can be dealt again.
  players  3, 4 or 5 (spel på tre, fyra or fem). Default: 4.
  given    the seat of given (the dealer), 0 to players − 1. Seats are numbered
           medsols (clockwise). Default: 0.

Examples:
  npm run deal -- 2026          seed 2026, 4 players, given in seat 0
  npm run deal -- 2026 5 2      5 players, given in seat 2`;

function fail(message: string): never {
  console.error(`${message}\nSee: npm run deal -- --help`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

const [seedArg, playersArg, givenArg] = args;
const seed = seedArg === undefined ? Math.floor(Math.random() * SEED_LIMIT) : Number(seedArg);
if (!isSeed(seed)) fail(`The seed must be a whole number from 0 to ${SEED_LIMIT - 1}, not "${seedArg}".`);
const players = Number(playersArg ?? 4);
if (players !== 3 && players !== 4 && players !== 5) fail(`Players must be 3, 4 or 5, not "${playersArg}".`);
const given = Number(givenArg ?? 0);
if (!Number.isInteger(given) || given < 0 || given >= players) {
  fail(`Given's seat must be 0 to ${players - 1}, not "${givenArg}".`);
}

const deal = dealCards(given, players as PlayerCount, deriveSeed(seed, 0), deriveSeed(seed, 1));
console.log(`Parti seed ${seed}, giv 0`);
console.log(describeGiv(deal).join("\n"));
