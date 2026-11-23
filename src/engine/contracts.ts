/**
 * Contracts as data (#30, SPEC.md §3, §5–6). A contract is one playable game: what lomber must
 * achieve, where trump comes from, how lomber buys, what is open, what is allowed and how it
 * is paid. The engine runs one pipeline for every contract and reads these parameters; each
 * mechanism is built once. The bids that lead to contracts are in bidding-table.ts.
 */
import { level, type Level } from "./level.js";

/**
 * The contract families (SPEC.md §3, §5). Contract names are names, not translated (SPEC.md
 * §0); the family ids drop å/ä/ö.
 *
 * - begar: Begär (Sexspel) … Tiospel. A trumf game: lomber names trumf, buys blind from the
 *   talong (Omköp allowed), and must take at least as many tricks as the name says.
 * - turne: Turné 6–8. Like Begär, but the top talong card is turned up and its suit is trumf;
 *   the turned-up card must be bought.
 * - vingel: Vingel 6–8. Like Turné with two turned-up cards; lomber chooses trumf between
 *   their suits. Paid double.
 * - gask: Minusgask, Gask på 0 … 6. Lomber keeps n givkort, takes the whole talong, then
 *   chooses trumf (7 + n tricks) or the level's misär. No defence köp.
 * - kopmisar: Köp 4 … Köp 1. A misär with a blind köp of at least N cards; Köp 4 and 3 allow
 *   one trick (Falsk), Köp 4 and 2 play with 12 cards (Petite).
 * - gok: Gökägg, Gökunge, Muntergök. A misär where lomber keeps 13 of givhand + talong;
 *   Gökunge's talong is open, Muntergök is played Ouverte. No defence köp.
 * - solo: Solo 6 … Solo Vira and the Solo misärer. Lomber doesn't buy and can't fold; the
 *   defence buys. Trumf Solos name trumf; the misärer run from Petite Falsk to Ouverte Royale.
 * - hopeSolo: Hope Solo 6–13. A trumf Solo played Ouverte Royale (hand open before the köp,
 *   the defence may consult), paid as Ofärg.
 */
export type Family = "begar" | "turne" | "vingel" | "gask" | "solo" | "hopeSolo" | "kopmisar" | "gok";

export type Goal =
  | { readonly kind: "tricks"; readonly min: number }
  /** Grande allows no trick, Falsk one; how many cards are played is `handSize`. */
  | { readonly kind: "misere"; readonly tricksAllowed: 0 | 1 };

/**
 * Where trump comes from: named by lomber before the köp, the turned-up card(s), chosen after
 * the köp (Gask), or none (misär).
 */
export type TrumpSource = "beforeBuy" | "turnUp" | "afterBuy" | "none";

export type Buy =
  /** Solo: lomber doesn't buy. */
  | { readonly kind: "none" }
  /** Blind from the top, between min and max cards (the turned-up cards count). */
  | { readonly kind: "blind"; readonly min: number; readonly max: number }
  /** Gask: keep n givkort, take the whole talong; Minusgask first lays its top card aside (nerslag). */
  | { readonly kind: "keepAndTakeTalon"; readonly keep: number; readonly setAside: boolean }
  /** Gök: keep 13 of givhand + talong; Gökunge's talong is open and the cards taken from it are played open. */
  | { readonly kind: "pickFromHandAndTalon"; readonly openTalon: boolean };

/** Lomber's hand: hidden; face up for the play (Ouverte); or face up already before the köp (Royale). */
export type Visibility = "closed" | "ouverte" | "royale";

/**
 * Payment factor: by the trump suit (Ofärg ×1, Andra Färg ×2, Högsta Färg ×4), as misär (×3),
 * or as Ofärg whatever the trump (Hope Solo and Royale).
 */
export type PaymentFactor = "bySuit" | "misere" | "offSuit";

/**
 * The discard phase: lomber kastar down to `downTo` cards, at the point `after` says: after the
 * bidding (Solo Petite misär, which has no köp), after the (last) köp (Köpmisär Petite, Gök),
 * or after choosing the game (Gask). In misär lomber may kasta fewer and play with more cards
 * (`mayKeepMore`). Null when no discard is needed (a blind köp swaps card for card).
 */
export type Discard = {
  readonly after: "bidding" | "buy" | "choice";
  readonly downTo: 12 | 13;
  readonly mayKeepMore: boolean;
} | null;

export interface Contract {
  readonly id: string;
  readonly name: string;
  readonly family: Family;
  /** π, the level of the bid that leads to the contract. */
  readonly level: Level;
  readonly goal: Goal;
  /** 12 for Petite (one extra card is kastad), otherwise 13. */
  readonly handSize: 12 | 13;
  readonly trump: TrumpSource;
  /** Turned up before the köp (TURN_UP_CARDS); they must be bought and can't be kastade. */
  readonly turnUpCards: number;
  readonly buy: Buy;
  readonly discard: Discard;
  readonly visibility: Visibility;
  readonly allowed: {
    /** Omköp (Omturné, Omvingel): only while at least `rebuyMinTalon` cards remain. */
    readonly rebuy: boolean;
    readonly rebuyMinTalon: number;
    readonly fold: boolean;
    readonly defenceBuy: boolean;
  };
  readonly payment: {
    readonly factor: PaymentFactor;
    /** Vingel ×2 (PAYMENT_MULTIPLIERS); everything else ×1. */
    readonly multiplier: number;
    /** Minusgask: a betspel pays Pinnar (Fegpinnar) instead of Modpinnar. */
    readonly cowardPins: boolean;
  };
}

const NO_REBUY = { rebuy: false, rebuyMinTalon: 0 } as const;

/** Begär and N-spel: trumf named before a blind köp of 0–13 cards; Omköp and folding allowed. */
const begar = (tricks: number, lvl: Level): Contract => {
  return {
    id: `begar-${tricks}`, name: tricks === 6 ? "Begär" : `${tricks}-spel`, family: "begar", level: lvl,
    goal: { kind: "tricks", min: tricks }, handSize: 13, trump: "beforeBuy", turnUpCards: 0,
    buy: { kind: "blind", min: 0, max: 13 }, discard: null, visibility: "closed",
    allowed: { rebuy: true, rebuyMinTalon: 1, fold: true, defenceBuy: true },
    payment: { factor: "bySuit", multiplier: 1, cowardPins: false },
  };
};

/** How many talong cards each turn-up family turns up before the köp (Tringel's 3 come with #27). */
export const TURN_UP_CARDS = { turne: 1, vingel: 2 } as const;
export type TurnUpFamily = keyof typeof TURN_UP_CARDS;

/** Families paid more than once (Tringel's ×3 comes with #27). */
export const PAYMENT_MULTIPLIERS: Partial<Record<Family, number>> = { vingel: 2 };

const TURN_UP_NAMES: Record<TurnUpFamily, string> = { turne: "Turné", vingel: "Vingel" };

/** Turné and Vingel: trumf from the turned-up card(s), which count as bought. */
const turnUp = (family: TurnUpFamily, tricks: number, lvl: Level): Contract => {
  const cards = TURN_UP_CARDS[family];
  return {
    id: `${family}-${tricks}`, name: `${TURN_UP_NAMES[family]} ${tricks}`, family, level: lvl,
    goal: { kind: "tricks", min: tricks }, handSize: 13, trump: "turnUp", turnUpCards: cards,
    buy: { kind: "blind", min: cards, max: 13 }, discard: null, visibility: "closed",
    // A rebuy turns up as many again and needs one more card left: Omturné 2, Omvingel 3 (SPEC.md §5).
    allowed: { rebuy: true, rebuyMinTalon: cards + 1, fold: true, defenceBuy: true },
    payment: { factor: "bySuit", multiplier: PAYMENT_MULTIPLIERS[family] ?? 1, cowardPins: false },
  };
};

type MisereSize = "PF" | "GF" | "P" | "G" | "PO" | "GO" | "POR" | "GOR";

/** The misär parameters for the budtabell's letters: P/G = Petite/Grande, F = Falsk, O = Ouverte, R = Royale. */
const misere = (size: MisereSize, discardAfter: "bidding" | "buy" = "buy"): Pick<Contract, "goal" | "handSize" | "discard" | "visibility"> => {
  const petite = size.startsWith("P");
  return {
    goal: { kind: "misere", tricksAllowed: size.includes("F") ? 1 : 0 },
    handSize: petite ? 12 : 13,
    // A Petite kastar one more card: after the (last) köp, or after the bidding in Solo; misär may keep it.
    discard: petite ? { after: discardAfter, downTo: 12, mayKeepMore: true } : null,
    visibility: size.includes("R") ? "royale" : size.includes("O") ? "ouverte" : "closed",
  };
};

/**
 * Gask på n: two contracts, trumf and misär, between which lomber chooses after the köp (only
 * trumf for Gask på 5 and 6). Keep n givkort, take the whole talong, choose, then kasta.
 */
const gask = (n: number, lvl: Level, misereSize?: MisereSize): Contract[] => {
  const tricks = n >= 5 ? 12 : 7 + n; // Gask på 5 and 6 need 12 tricks (SPEC.md §5)
  const name = n === -1 ? "Minusgask" : `Gask på ${n}`;
  const common = {
    family: "gask" as const, level: lvl, turnUpCards: 0 as const,
    buy: { kind: "keepAndTakeTalon" as const, keep: Math.max(n, 0), setAside: n === -1 },
    allowed: { ...NO_REBUY, fold: true, defenceBuy: false },
  };
  const trumpGame: Contract = {
    ...common, id: `gask-${n}-trump`, name: `${name} (trumf)`, goal: { kind: "tricks", min: tricks }, handSize: 13,
    discard: { after: "choice", downTo: 13, mayKeepMore: false }, trump: "afterBuy", visibility: "closed", payment: { factor: "bySuit", multiplier: 1, cowardPins: n === -1 },
  };
  if (misereSize === undefined) return [trumpGame];
  const misereGame: Contract = {
    ...common, ...misere(misereSize), id: `gask-${n}-misere`, name: `${name} (misär)`, trump: "none",
    // After choosing misär, kasta down to 13 (12 for a Petite), or fewer: misär may play with more.
    discard: { after: "choice", downTo: misere(misereSize).handSize, mayKeepMore: true },
    payment: { factor: "misere", multiplier: 1, cowardPins: n === -1 },
  };
  return [trumpGame, misereGame];
};

/** Köpmisär (Köp N): a misär with a blind köp of at least N cards; Omköp needs N cards left. */
const kopmisar = (n: number, lvl: Level, size: MisereSize): Contract => {
  return {
    id: `kop-${n}`, name: `Köp ${n}`, family: "kopmisar", level: lvl, ...misere(size), trump: "none", turnUpCards: 0,
    buy: { kind: "blind", min: n, max: 13 },
    allowed: { rebuy: true, rebuyMinTalon: n, fold: true, defenceBuy: true },
    payment: { factor: "misere", multiplier: 1, cowardPins: false },
  };
};

/** Gök: a misär where lomber has givhand + talong and kastar (at most) 13; no defence köp. */
const gok = (id: string, name: string, lvl: Level, size: MisereSize, openTalon: boolean): Contract => {
  return {
    id, name, family: "gok", level: lvl, ...misere(size), trump: "none", turnUpCards: 0,
    buy: { kind: "pickFromHandAndTalon", openTalon },
    // "efter Köpet kastas (högst) tretton kort": at most 13, so lomber may play with more.
    discard: { after: "buy", downTo: 13, mayKeepMore: true },
    allowed: { ...NO_REBUY, fold: true, defenceBuy: false },
    payment: { factor: "misere", multiplier: 1, cowardPins: false },
  };
};

const SOLO_COMMON = {
  turnUpCards: 0 as const, buy: { kind: "none" as const },
  allowed: { ...NO_REBUY, fold: false, defenceBuy: true },
};

/** Trumf Solo: no köp for lomber, trumf named before the defence köp, can't be folded. */
const solo = (tricks: number, lvl: Level): Contract => {
  return {
    ...SOLO_COMMON, id: `solo-${tricks}`, name: tricks === 13 ? "Solo Vira" : `Solo ${tricks}`, family: "solo",
    level: lvl, goal: { kind: "tricks", min: tricks }, handSize: 13, discard: null, trump: "beforeBuy",
    visibility: "closed", payment: { factor: "bySuit", multiplier: 1, cowardPins: false },
  };
};

/** Solo misär: no köp for lomber; a Petite kastar right after the bidding; Royale is paid as Ofärg. */
const soloMisere = (size: MisereSize, name: string, lvl: Level): Contract => {
  const params = misere(size, "bidding");
  return {
    ...SOLO_COMMON, ...params, id: `solo-misere-${size.toLowerCase()}`, name, family: "solo", level: lvl, trump: "none",
    payment: { factor: params.visibility === "royale" ? "offSuit" : "misere", multiplier: 1, cowardPins: false },
  };
};

/** Hope Solo: a trumf Solo played Ouverte Royale, paid as Ofärg. */
const hopeSolo = (tricks: number, lvl: Level): Contract => {
  return {
    ...SOLO_COMMON, id: `hope-solo-${tricks}`, name: `Hope Solo ${tricks}`, family: "hopeSolo", level: lvl,
    goal: { kind: "tricks", min: tricks }, handSize: 13, discard: null, trump: "beforeBuy", visibility: "royale",
    payment: { factor: "offSuit", multiplier: 1, cowardPins: false },
  };
};

/**
 * Every contract in 1.0, plus all Solo contracts (μ is 0 until a later issue, #27). Tringel,
 * Tupp and Vira come with #27.
 */
export const CONTRACTS: readonly Contract[] = [
  begar(6, level(0)), begar(7, level(1)), begar(8, level(2)), begar(9, level(3)), begar(10, level(6)),
  turnUp("turne", 6, level(1)), turnUp("turne", 7, level(2)), turnUp("turne", 8, level(3)),
  turnUp("vingel", 6, level(1)), turnUp("vingel", 7, level(2)), turnUp("vingel", 8, level(3)),
  ...gask(-1, level(-1), "PF"), ...gask(0, level(0), "GF"), ...gask(1, level(1), "P"), ...gask(2, level(2), "G"),
  ...gask(3, level(3), "PO"), ...gask(4, level(4), "GO"), ...gask(6, level(6)), ...gask(5, level(8)),
  kopmisar(4, level(2), "PF"), kopmisar(3, level(4), "GF"), kopmisar(2, level(6), "P"), kopmisar(1, level(8), "G"),
  gok("gokagg", "Gökägg", level(0), "G", false),
  gok("gokunge", "Gökunge", level(4, 3), "G", true),
  gok("muntergok", "Muntergök", level(3), "GO", false),
  solo(6, level(2)), solo(7, level(4)), solo(8, level(8)), solo(9, level(16)), solo(10, level(32)),
  solo(11, level(64)), solo(12, level(128)), solo(13, level(256)),
  soloMisere("PF", "Solo Petite Falsk Misär", level(3)), soloMisere("GF", "Solo Grande Falsk Misär", level(6)),
  soloMisere("P", "Solo Petite Misär", level(12)), soloMisere("G", "Solo Grande Misär", level(24)),
  soloMisere("PO", "Solo Petite Misär Ouverte", level(48)), soloMisere("GO", "Solo Grande Misär Ouverte", level(96)),
  soloMisere("POR", "Solo Petite Misär Ouverte Royale", level(192)),
  soloMisere("GOR", "Solo Grande Misär Ouverte Royale", level(384)),
  hopeSolo(6, level(3)), hopeSolo(7, level(6)), hopeSolo(8, level(12)), hopeSolo(9, level(24)),
  hopeSolo(10, level(48)), hopeSolo(11, level(96)), hopeSolo(12, level(192)), hopeSolo(13, level(384)),
];

export const contractById = (id: string): Contract => {
  const contract = CONTRACTS.find((c) => c.id === id);
  if (contract === undefined) throw new Error(`No contract "${id}"`);
  return contract;
};
