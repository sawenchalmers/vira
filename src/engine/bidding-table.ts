/**
 * The budtabell (colloquially Isberget, SPEC.md §3) as data: one record per bid. A bid leads
 * to one contract, or gives lomber a choice: Gask's trumf or misär after the köp, and Solo's
 * misär or Hope Solo after the bidding (and any ta större), before the defence köp. A bid's
 * name, family and level come from its contracts, so they are written down once.
 */
import { CONTRACTS, contractById, gaskName, MINUSGASK, type Contract, type Family, type TuppSize } from "./contracts.js";
import { compareLevels, formatLevel, type Level } from "./level.js";

/** What a passer is expected to hold (AK); Gök has one requirement per passer. */
export type PassingRequirement = string | { readonly first: string; readonly second: string };

/** When lomber chooses between a bid's contracts. */
export type ContractChoice = "none" | "afterBidding" | "afterBuy";

export interface Bid {
  readonly id: string;
  readonly name: string;
  readonly family: Family;
  readonly level: Level;
  readonly passingRequirement?: PassingRequirement;
  readonly contracts: readonly string[];
  readonly choice: ContractChoice;
}

/** A bid over the given contracts; its level is theirs, which must agree. */
const bid = (
  id: string, name: string, contracts: readonly Contract[], choice: ContractChoice, passingRequirement?: PassingRequirement,
): Bid => {
  const [first] = contracts;
  if (first === undefined) throw new Error(`Bid "${id}" has no contracts`);
  if (contracts.some((c) => compareLevels(c.level, first.level) !== 0)) throw new Error(`Bid "${id}" mixes levels`);
  return {
    id, name, family: first.family, level: first.level, contracts: contracts.map((c) => c.id), choice,
    ...(passingRequirement ? { passingRequirement } : {}),
  };
};

/** A bid that leads to exactly one contract, with the contract's id and name. */
const single = (contractId: string, passingRequirement?: PassingRequirement): Bid => {
  const contract = contractById(contractId);
  return bid(contract.id, contract.name, [contract], "none", passingRequirement);
};

/** Gask på n: its trumf contract and, up to Gask på 4, its misär; lomber chooses after the köp. */
const gaskBid = (n: number, passingRequirement?: string): Bid => {
  const contracts = CONTRACTS.filter((c) => c.id.startsWith(`gask-${n}-`));
  return bid(`gask-${n}`, gaskName(n), contracts, contracts.length > 1 ? "afterBuy" : "none", passingRequirement);
};

/** A Tupp bid: one contract, which becomes a Höna by itself if the tuppstjärt stays empty. */
const tuppBid = (n: TuppSize, passingRequirement: string): Bid => single(`tupp-${n}`, passingRequirement);

/** A Solo cell holding a misär and a Hope Solo: lomber chooses after the bidding. */
const soloChoice = (misereId: string, hopeSoloTricks: number): Bid => {
  const contracts = [contractById(misereId), contractById(`hope-solo-${hopeSoloTricks}`)];
  const lvl = formatLevel((contracts[0] as Contract).level);
  return bid(`solo-level-${lvl}`, `Solo (${contracts.map((c) => c.name).join(" / ")})`, contracts, "afterBidding");
};

export const BIDDING_TABLE: readonly Bid[] = [
  gaskBid(MINUSGASK, "hahalj"),
  single("begar-6", "4h"),
  gaskBid(0, "haja"),
  single("gokagg", { first: "lala", second: "l" }),
  single("vingel-6", "3d"),
  single("turne-6", "3h"),
  single("begar-7", "3f"),
  gaskBid(1, "haj"),
  tuppBid(3, "4a"),
  single("gokunge", { first: "lal", second: "l" }),
  single("vingel-7", "2dh"),
  single("turne-7", "2h"),
  single("begar-8", "2of"),
  gaskBid(2, "ha"),
  single("solo-6"),
  single("kop-4", "2a"),
  tuppBid(2, "3a"),
  single("vingel-8", "d2h"),
  single("turne-8", "h"),
  single("begar-9", "2h"),
  gaskBid(3, "ha"),
  soloChoice("solo-misere-pf", 6),
  single("muntergok", { first: "LL", second: "L" }),
  single("tringel-9", "3h"),
  gaskBid(4, "ha"),
  single("solo-7"),
  single("kop-3", "a"),
  tuppBid(1, "2a"),
  single("begar-10"),
  gaskBid(6),
  soloChoice("solo-misere-gf", 7),
  single("kop-2"),
  gaskBid(5),
  single("solo-8"),
  single("kop-1"),
  gaskBid(13),
  soloChoice("solo-misere-p", 8),
  single("solo-9"),
  soloChoice("solo-misere-g", 9),
  single("solo-10"),
  soloChoice("solo-misere-po", 10),
  single("solo-11"),
  soloChoice("solo-misere-go", 11),
  single("solo-12"),
  soloChoice("solo-misere-por", 12),
  single("solo-13"),
  soloChoice("solo-misere-gor", 13),
];

export const bidById = (id: string): Bid => {
  const found = BIDDING_TABLE.find((b) => b.id === id);
  if (found === undefined) throw new Error(`No bid "${id}"`);
  return found;
};

/** The contracts a bid can become. */
export const contractsOf = (b: Bid): Contract[] => {
  return b.contracts.map(contractById);
};

/** The bids on one level, in the budtabell's order. */
export const bidsAtLevel = (lvl: Level): Bid[] => {
  return BIDDING_TABLE.filter((b) => compareLevels(b.level, lvl) === 0);
};
