/**
 * `npm run deal -- [seed] [players] [given]` (#46): deals giv 0 of a parti and prints it.
 * `npm run deal -- --help` (or -h) explains the parameters.
 */
import { dealCards, deriveSeed, SEED_LIMIT } from "../engine/index.js";
import { parseDealArgs } from "./deal-args.js";
import { describeGiv } from "./describe-giv.js";

const HELP = `npm run deal -- [seed] [players] [given]

Deals giv 0 of a parti and prints the roles, the hands, the talong and the Färg card.

  seed     the parti seed, a whole number from 0 to ${SEED_LIMIT - 1}; the same seed always
           gives the same giv. To deal a giv again, pass the "Parti seed" from the first line
           of the output (not the pack seed). Default: a fresh random seed.
  players  3, 4 or 5 (spel på tre, fyra or fem). Default: 4.
  given    the seat of given (the dealer), 0 to players − 1. Seats are numbered
           medsols (clockwise). Default: 0.

Examples:
  npm run deal -- 2026          seed 2026, 4 players, given in seat 0
  npm run deal -- 2026 5 2      5 players, given in seat 2`;

const args = parseDealArgs(process.argv.slice(2), () => Math.floor(Math.random() * SEED_LIMIT));

if (args.kind === "help") {
  console.log(HELP);
} else if (args.kind === "error") {
  console.error(`${args.message}\nSee: npm run deal -- --help`);
  process.exitCode = 1;
} else {
  const deal = dealCards(args.given, args.players, deriveSeed(args.seed, 0), deriveSeed(args.seed, 1));
  console.log(`Parti seed ${args.seed}, giv 0`);
  console.log(describeGiv(deal).join("\n"));
}
