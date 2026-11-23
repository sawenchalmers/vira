/**
 * The arguments of `npm run contract -- [seed] <contract>` (#49), as a pure function so they
 * can be tested apart from the command. The seed is positional, as for `npm run deal`: from
 * PowerShell, npm takes options such as `--seed` for itself even after `--`.
 */
import { isSeed, SEED_LIMIT } from "../engine/index.js";
import { parseWhole } from "./deal-args.js";

export type ContractArgs =
  | { readonly kind: "help" }
  | { readonly kind: "list" }
  | { readonly kind: "walk"; readonly query: string; readonly seed: number }
  | { readonly kind: "error"; readonly message: string };

/**
 * A first argument of only digits is the seed (no contract name is a plain number); the rest
 * is the contract, which may be several words ("Gask på 2").
 */
export const parseContractArgs = (args: readonly string[], randomSeed: () => number): ContractArgs => {
  if (args.includes("--help") || args.includes("-h")) return { kind: "help" };
  if (args.includes("--list")) return { kind: "list" };
  const option = args.find((arg) => arg.startsWith("-"));
  if (option !== undefined) return { kind: "error", message: `Unknown option "${option}".` };
  // On Windows, npm escapes an argument with spaces for cmd ("^Vingel^ 7^"), and inside quotes
  // the carets stay; no contract name has one, so drop them.
  const words = args.map((arg) => arg.replaceAll("^", "").trim()).filter((word) => word !== "");
  const [first, ...rest] = words;
  const seedGiven = first !== undefined && /^\d+$/.test(first);
  const seed = seedGiven ? parseWhole(first) : randomSeed();
  if (seed === undefined || !isSeed(seed)) {
    return { kind: "error", message: `The seed must be a whole number from 0 to ${SEED_LIMIT - 1}, not "${first}".` };
  }
  const query = (seedGiven ? rest : words).join(" ");
  if (query === "") return { kind: "error", message: "Name a contract, e.g. Gask på 2." };
  return { kind: "walk", query, seed };
};
