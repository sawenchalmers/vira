/**
 * The phases of a giv as data (#30 step 3). Every giv runs through the same phases in the same
 * order; each contract uses the ones its record switches on. The engine will run a giv phase
 * by phase (#31, #10, #33–#35, #8, #9), each phase reading its parameters from the contract.
 */
import { compareLevels } from "./level.js";
import { CONTRACTS, type Contract } from "./contracts.js";
import type { Ruleset } from "./ruleset.js";

export type Phase =
  /** Every giv: the bidding ends in a slutbud. */
  | "bidding"
  /** Lomber may take the slutbud larger within its family (ta större, höja). */
  | "raise"
  /** After the bidding: choose between a bid's contracts (Solo misär or Hope Solo) and/or name trumf. */
  | "declare"
  /** A Solo Petite misär kastar its 13th card right after the bidding. */
  | "discardAfterBidding"
  /** Royale: lomber's hand face up before the köp (before the defence köp in Solo). */
  | "showHandBeforeBuy"
  /** Talong cards turned up: Turné, Vingel, Tringel (bought) or Tupp (bytkort). */
  | "turnUp"
  /** Lomber's köp. */
  | "buy"
  /** Tupp: swap in bytkort; an empty tuppstjärt makes a Höna. */
  | "swap"
  /** Omköp (Omturné, Omvingel, Omtringel, Ombyte): repeat the turn-up, köp and swap. */
  | "rebuy"
  /** Gask: choose trumf or misär and the trumf suit (only the suit for Gask på 5, 6 and Vira). */
  | "chooseAfterBuy"
  /** Lomber kastar down to the playing hand, after the (last) köp or after choosing. */
  | "discard"
  /** Lomber may fold (lägga spelet). */
  | "fold"
  /** The defence buys. */
  | "defenceBuy"
  /** Ouverte: lomber's hand face up for the play. */
  | "showHandBeforePlay"
  | "play"
  | "payment";

/** Which contracts use each phase, in the order the phases run. */
const PHASES: readonly { readonly phase: Phase; readonly uses: (c: Contract, ruleset: Ruleset) => boolean }[] = [
  { phase: "bidding", uses: () => true },
  { phase: "raise", uses: (c) => CONTRACTS.some((o) => o.family === c.family && compareLevels(o.level, c.level) > 0) },
  { phase: "declare", uses: (c, r) => c.trump === "beforeBuy" || bidOf(c, r)?.choice === "afterBidding" },
  { phase: "discardAfterBidding", uses: (c) => c.discard?.after === "bidding" },
  { phase: "showHandBeforeBuy", uses: (c) => c.visibility === "royale" },
  { phase: "turnUp", uses: (c) => c.turnUp !== null },
  { phase: "buy", uses: (c) => c.buy.kind !== "none" },
  { phase: "swap", uses: (c) => c.swap !== null },
  { phase: "rebuy", uses: (c) => c.allowed.rebuy },
  { phase: "chooseAfterBuy", uses: (c, r) => c.trump === "afterBuy" || bidOf(c, r)?.choice === "afterBuy" },
  { phase: "discard", uses: (c) => c.discard !== null && c.discard.after !== "bidding" },
  { phase: "fold", uses: (c) => c.allowed.fold },
  { phase: "defenceBuy", uses: (c) => c.allowed.defenceBuy },
  { phase: "showHandBeforePlay", uses: (c) => c.visibility === "ouverte" },
  { phase: "play", uses: () => true },
  { phase: "payment", uses: () => true },
];

/** The bid in the ruleset's budtabell that leads to the contract. */
const bidOf = (c: Contract, ruleset: Ruleset) => ruleset.biddingTable.find((bid) => bid.contracts.includes(c.id));

/** The phases a contract goes through, in order. */
export const phasesFor = (contract: Contract, ruleset: Ruleset): Phase[] =>
  PHASES.filter(({ uses }) => uses(contract, ruleset)).map(({ phase }) => phase);

/** Every phase, in the order they run. */
export const PHASE_ORDER: readonly Phase[] = PHASES.map(({ phase }) => phase);
