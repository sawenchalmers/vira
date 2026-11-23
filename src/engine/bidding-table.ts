/**
 * The budtabell (colloquially Isberget, SPEC.md §3) as data: one record per bid. A bid leads
 * to one contract, or gives lomber a choice: Gask's trumf or misär after the köp, and Solo's
 * misär or Hope Solo after the bidding (and any ta större), before the defence köp.
 */
import { contractById, TUPP_NAMES, VIRA, type Contract, type Family, type TuppSize } from "./contracts.js";
import { compareLevels, level, type Level } from "./level.js";

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

const single = (id: string, name: string, family: Family, lvl: Level, passingRequirement?: PassingRequirement): Bid => {
  return { id, name, family, level: lvl, contracts: [id], choice: "none", ...(passingRequirement ? { passingRequirement } : {}) };
};

const gaskBid = (n: number, lvl: Level, passingRequirement?: string): Bid => {
  const name = n === -1 ? "Minusgask" : n === VIRA ? "Vira" : `Gask på ${n}`;
  const contracts = n >= 5 ? [`gask-${n}-trump`] : [`gask-${n}-trump`, `gask-${n}-misere`];
  return {
    id: `gask-${n}`, name, family: "gask", level: lvl, contracts, choice: contracts.length > 1 ? "afterBuy" : "none",
    ...(passingRequirement ? { passingRequirement } : {}),
  };
};

/** A Tupp bid becomes its Tupp or its Höna, decided by the swap in the köp. */
const tuppBid = (n: TuppSize, lvl: Level, passingRequirement: string): Bid => ({
  id: `tupp-${n}`, name: TUPP_NAMES[n], family: "tupp", level: lvl, passingRequirement,
  contracts: [`tupp-${n}`, `hona-${n}`], choice: "afterBuy",
});

/** A Solo cell holding a misär and a Hope Solo: lomber chooses after the bidding. */
const soloChoice = (lvl: Level, misereId: string, hopeSoloTricks: number): Bid => {
  return {
    id: `solo-level-${lvl.num}`, name: `Solo (${contractById(misereId).name} / Hope Solo ${hopeSoloTricks})`, family: "solo",
    level: lvl, contracts: [misereId, `hope-solo-${hopeSoloTricks}`], choice: "afterBidding",
  };
};

export const BIDDING_TABLE: readonly Bid[] = [
  gaskBid(-1, level(-1), "hahalj"),
  single("begar-6", "Begär", "begar", level(0), "4h"),
  gaskBid(0, level(0), "haja"),
  single("gokagg", "Gökägg", "gok", level(0), { first: "lala", second: "l" }),
  single("vingel-6", "Vingel 6", "vingel", level(1), "3d"),
  single("turne-6", "Turné 6", "turne", level(1), "3h"),
  single("begar-7", "7-spel", "begar", level(1), "3f"),
  gaskBid(1, level(1), "haj"),
  tuppBid(3, level(1), "4a"),
  single("gokunge", "Gökunge", "gok", level(4, 3), { first: "lal", second: "l" }),
  single("vingel-7", "Vingel 7", "vingel", level(2), "2dh"),
  single("turne-7", "Turné 7", "turne", level(2), "2h"),
  single("begar-8", "8-spel", "begar", level(2), "2of"),
  gaskBid(2, level(2), "ha"),
  single("solo-6", "Solo 6", "solo", level(2)),
  single("kop-4", "Köp 4", "kopmisar", level(2), "2a"),
  tuppBid(2, level(2), "3a"),
  single("vingel-8", "Vingel 8", "vingel", level(3), "d2h"),
  single("turne-8", "Turné 8", "turne", level(3), "h"),
  single("begar-9", "9-spel", "begar", level(3), "2h"),
  gaskBid(3, level(3), "ha"),
  soloChoice(level(3), "solo-misere-pf", 6),
  single("muntergok", "Muntergök", "gok", level(3), { first: "LL", second: "L" }),
  single("tringel-9", "Tringel 9", "tringel", level(4), "3h"),
  gaskBid(4, level(4), "ha"),
  single("solo-7", "Solo 7", "solo", level(4)),
  single("kop-3", "Köp 3", "kopmisar", level(4), "a"),
  tuppBid(1, level(4), "2a"),
  single("begar-10", "10-spel", "begar", level(6)),
  gaskBid(6, level(6)),
  soloChoice(level(6), "solo-misere-gf", 7),
  single("kop-2", "Köp 2", "kopmisar", level(6)),
  gaskBid(5, level(8)),
  single("solo-8", "Solo 8", "solo", level(8)),
  single("kop-1", "Köp 1", "kopmisar", level(8)),
  gaskBid(VIRA, level(12)),
  soloChoice(level(12), "solo-misere-p", 8),
  single("solo-9", "Solo 9", "solo", level(16)),
  soloChoice(level(24), "solo-misere-g", 9),
  single("solo-10", "Solo 10", "solo", level(32)),
  soloChoice(level(48), "solo-misere-po", 10),
  single("solo-11", "Solo 11", "solo", level(64)),
  soloChoice(level(96), "solo-misere-go", 11),
  single("solo-12", "Solo 12", "solo", level(128)),
  soloChoice(level(192), "solo-misere-por", 12),
  single("solo-13", "Solo Vira", "solo", level(256)),
  soloChoice(level(384), "solo-misere-gor", 13),
];

export const bidById = (id: string): Bid => {
  const bid = BIDDING_TABLE.find((b) => b.id === id);
  if (bid === undefined) throw new Error(`No bid "${id}"`);
  return bid;
};

/** The contracts a bid can become. */
export const contractsOf = (bid: Bid): Contract[] => {
  return bid.contracts.map(contractById);
};

/** The bids on one level, in the budtabell's order. */
export const bidsAtLevel = (lvl: Level): Bid[] => {
  return BIDDING_TABLE.filter((bid) => compareLevels(bid.level, lvl) === 0);
};
