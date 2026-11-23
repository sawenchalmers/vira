/**
 * The phases of a giv as data (#30 step 3). Every giv runs through the same phases in the same
 * order; each one is switched on by the bid or by the contract's record. The bid phases come
 * first, while the contract may still be open (a Gask's contract is only known after the köp);
 * the contract phases follow. The engine will run a giv phase by phase (#12, #13, #31, #10,
 * #33–#35, #8, #9), each phase reading its parameters from the bid or the contract.
 */
import type { Bid } from "./bidding-table.js";
import { type Contract } from "./contracts.js";
import { compareLevels } from "./level.js";
import type { Ruleset } from "./ruleset.js";

export type BidPhase =
  /** Every giv: the bidding ends in a slutbud. */
  | "bidding"
  /** Lomber may take the slutbud larger within its family (ta större, höja). */
  | "raise"
  /** Lomber chooses between the bid's contracts right after the bidding (Solo misär or Hope Solo). */
  | "chooseContract";

export type ContractPhase =
  /** Talong cards laid out: turned up (Turné, Vingel, Tringel, Tupp) or Minusgask's nerslag. */
  | "turnUp"
  /** Lomber names trumf (Begär, Solo) or chooses it among the turned-up suits (Vingel, Tringel). */
  | "declareTrump"
  /** A Solo Petite misär kastar its 13th card right after the bidding. */
  | "discardAfterBidding"
  /** Royale: lomber's hand face up before the köp (before the defence köp in Solo). */
  | "showHandBeforeBuy"
  /** Lomber's köp. */
  | "buy"
  /** Tupp: swap in bytkort; an empty tuppstjärt makes a Höna. */
  | "swap"
  /** Omköp (Omturné, Omvingel, Omtringel, Ombyte). */
  | "rebuy"
  /** Gask: choose trumf or misär and the trumf suit (only the suit for Gask på 5, 6 and Vira). A choice only; no cards move. */
  | "chooseAfterBuy"
  /**
   * Lomber kastar down to the playing hand, after the (last) köp or after choosing. Minusgask
   * first takes its nerslag into the hand.
   */
  | "discard"
  /** The defence buys. */
  | "defenceBuy"
  /** Lomber may fold (lägga spelet), after seeing the defence köp. */
  | "fold"
  /** Ouverte: lomber's hand face up for the play. */
  | "showHandBeforePlay"
  | "play"
  | "payment";

export type Phase = BidPhase | ContractPhase;

/**
 * Lomber may raise to any higher bid of the same family in the ruleset's budtabell: Gask på 0 →
 * Gask på 2, Begär → Sjuspel, Solo 7 → any higher Solo cell (trumf, misär or Hope Solo).
 */
const canRaise = (b: Bid, ruleset: Ruleset): boolean =>
  ruleset.biddingTable.some((other) => other.family === b.family && compareLevels(other.level, b.level) > 0);

/** Which bids use each bid phase, in the order they run. */
const BID_PHASES: readonly { readonly phase: BidPhase; readonly uses: (b: Bid, ruleset: Ruleset) => boolean }[] = [
  { phase: "bidding", uses: () => true },
  { phase: "raise", uses: canRaise },
  { phase: "chooseContract", uses: (b) => b.choice === "afterBidding" },
];

/** Which contracts use each contract phase, in the order they run. */
const CONTRACT_PHASES: readonly { readonly phase: ContractPhase; readonly uses: (c: Contract) => boolean }[] = [
  { phase: "turnUp", uses: (c) => c.turnUp !== null },
  { phase: "declareTrump", uses: (c) => c.trump === "named" || c.trump === "chooseFromTurnUp" },
  { phase: "discardAfterBidding", uses: (c) => c.discard?.after === "bidding" },
  { phase: "showHandBeforeBuy", uses: (c) => c.visibility === "royale" },
  { phase: "buy", uses: (c) => c.buy.kind !== "none" },
  { phase: "swap", uses: (c) => c.swap !== null },
  { phase: "rebuy", uses: (c) => c.allowed.rebuy },
  { phase: "chooseAfterBuy", uses: (c) => c.trump === "afterBuy" || (c.family === "gask" && c.goal.kind === "misere") },
  { phase: "discard", uses: (c) => c.discard !== null && c.discard.after !== "bidding" },
  { phase: "defenceBuy", uses: (c) => c.allowed.defenceBuy },
  { phase: "fold", uses: (c) => c.allowed.fold },
  { phase: "showHandBeforePlay", uses: (c) => c.visibility === "ouverte" },
  { phase: "play", uses: () => true },
  { phase: "payment", uses: () => true },
];

/** The bid phases of a bid, in order. */
export const bidPhases = (b: Bid, ruleset: Ruleset): BidPhase[] =>
  BID_PHASES.filter(({ uses }) => uses(b, ruleset)).map(({ phase }) => phase);

/** The contract phases of a contract, in order. */
export const contractPhases = (c: Contract): ContractPhase[] =>
  CONTRACT_PHASES.filter(({ uses }) => uses(c)).map(({ phase }) => phase);

/** All phases of a giv that ends in this contract: its bid's phases, then its own. */
export const phasesFor = (c: Contract, ruleset: Ruleset): Phase[] => {
  const b = ruleset.biddingTable.find((other) => other.contracts.includes(c.id));
  if (b === undefined) throw new Error(`No bid leads to "${c.id}" in ${ruleset.name}`);
  return [...bidPhases(b, ruleset), ...contractPhases(c)];
};

/** Every phase, in the order they run. */
export const PHASE_ORDER: readonly Phase[] = [...BID_PHASES, ...CONTRACT_PHASES].map(({ phase }) => phase);
