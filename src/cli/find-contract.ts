/**
 * Finds the contract a person names for `npm run contract` (#49): a contract's id or name, a
 * bid's name, or a family's name, which means the family's lowest bid ("Tringel" is Tringel 9,
 * "Gask" is Minusgask). Case, spacing and å/ä/ö don't matter, so "gokagg" finds Gökägg.
 */
import { compareLevels, contractsOf, type Bid, type Contract, type Family, type Ruleset } from "../engine/index.js";
import { FAMILY_NAMES } from "./messages.js";

export type FoundContract =
  | { readonly kind: "found"; readonly contract: Contract }
  | { readonly kind: "notFound"; readonly suggestions: readonly string[] };

const MAX_SUGGESTIONS = 10;

const normalise = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** The bid in the ruleset's budtabell that leads to a contract. */
export const bidOf = (contract: Contract, ruleset: Ruleset): Bid => {
  const found = ruleset.biddingTable.find((b) => b.contracts.includes(contract.id));
  if (found === undefined) throw new Error(`No bid leads to "${contract.id}" in ${ruleset.name}`);
  return found;
};

/** The first contract of a bid; lomber chooses between a bid's contracts later. */
export const firstContract = (b: Bid): Contract => {
  const [first] = contractsOf(b);
  if (first === undefined) throw new Error(`Bid "${b.id}" has no contracts`);
  return first;
};

/**
 * A contract by id or name first, then a bid by id or name (its first contract), then a family
 * by name (its lowest contract); otherwise names that contain the query.
 */
export const findContract = (query: string, ruleset: Ruleset): FoundContract => {
  const wanted = normalise(query);
  const named = (item: Bid | Contract): boolean => normalise(item.id) === wanted || normalise(item.name) === wanted;
  const contracts = ruleset.biddingTable.flatMap(contractsOf);
  const contract = contracts.find(named);
  if (contract !== undefined) return { kind: "found", contract };
  const bid = ruleset.biddingTable.find(named);
  if (bid !== undefined) return { kind: "found", contract: firstContract(bid) };
  const family = (Object.keys(FAMILY_NAMES) as Family[]).find((f) => normalise(f) === wanted || normalise(FAMILY_NAMES[f]) === wanted);
  const lowest = contracts.filter((c) => c.family === family).sort((a, b) => compareLevels(a.level, b.level))[0];
  if (lowest !== undefined) return { kind: "found", contract: lowest };
  const names = [...ruleset.biddingTable, ...contracts].map((item) => item.name);
  const suggestions = [...new Set(names)].filter((name) => normalise(name).includes(wanted));
  return { kind: "notFound", suggestions: suggestions.slice(0, MAX_SUGGESTIONS) };
};

/** Every contract with its id, in the budtabell's order, for `--list`. */
export const contractList = (ruleset: Ruleset): string[] => {
  const contracts = ruleset.biddingTable.flatMap(contractsOf);
  const width = Math.max(...contracts.map((c) => c.id.length));
  return contracts.map((c) => `${c.id.padEnd(width)}  ${c.name}`);
};
