/**
 * `npm run contract -- [seed] <contract>` (#49): walks through a contract from the slutbud
 * until the first trick. `--list` lists the contracts; `--help` (or -h) explains the parameters.
 */
import { dealCards, deriveSeed, FOUR_PLAYERS, SEED_LIMIT } from "../engine/index.js";
import { parseContractArgs } from "./contract-args.js";
import { walkThrough } from "./contract-walkthrough.js";
import { contractList, findContract } from "./find-contract.js";
import { terminalIo } from "./terminal-io.js";

const HELP = `npm run contract -- [seed] <contract>
npm run contract -- --list

Walks through a contract from the slutbud until the first trick: deals a giv (4 players, given
in seat 0) with you as lomber in förhand, then goes through the contract's phases and asks
each decision. The cards don't move yet; each phase says what happens.

  seed      the parti seed, a whole number from 0 to ${SEED_LIMIT - 1}, as for npm run deal;
            the same seed always gives the same giv. Default: a fresh random seed.
  contract  a contract's id or name, or a bid's name, e.g. Begär, gask-2-trump, Gask på 2.
            Quotes aren't needed: the words are joined. Case and å/ä/ö don't matter.
            --list shows every contract.

Examples:
  npm run contract -- Minusgask
  npm run contract -- 2026 Vingel 7     the same giv every time`;

const args = parseContractArgs(process.argv.slice(2), () => Math.floor(Math.random() * SEED_LIMIT));

if (args.kind === "help") {
  console.log(HELP);
} else if (args.kind === "list") {
  console.log(contractList(FOUR_PLAYERS).join("\n"));
} else if (args.kind === "error") {
  console.error(`${args.message}\nSee: npm run contract -- --help`);
  process.exitCode = 1;
} else {
  const found = findContract(args.query, FOUR_PLAYERS);
  if (found.kind === "notFound") {
    const hint = found.suggestions.length > 0 ? `Did you mean: ${found.suggestions.join(", ")}?` : "See: npm run contract -- --list";
    console.error(`No contract "${args.query}". ${hint}`);
    process.exitCode = 1;
  } else {
    const deal = dealCards(0, FOUR_PLAYERS, deriveSeed(args.seed, 0), deriveSeed(args.seed, 1));
    console.log(`Parti seed ${args.seed}, giv 0`);
    const io = terminalIo();
    try {
      await walkThrough(io, deal, FOUR_PLAYERS, found.contract);
    } catch (error) {
      console.error(`\n${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    } finally {
      io.close();
    }
  }
}
