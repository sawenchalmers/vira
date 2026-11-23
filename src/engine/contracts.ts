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
 * - tringel: Tringel 9. Like Vingel with three turned-up cards. Paid triple.
 * - gask: Minusgask, Gask på 0 … 6 and Vira (Gask på 13). Lomber keeps n givkort, takes the
 *   whole talong, then chooses trumf (7 + n tricks; 12 for Gask på 5 and 6, all 13 for Vira)
 *   or the level's misär. No defence köp.
 * - kopmisar: Köp 4 … Köp 1. A misär with a blind köp of at least N cards; Köp 4 and 3 allow
 *   one trick (Falsk), Köp 4 and 2 play with 12 cards (Petite).
 * - gok: Gökägg, Gökunge, Muntergök. A misär where lomber keeps 13 of givhand + talong;
 *   Gökunge's talong is open, Muntergök is played Ouverte. No defence köp.
 * - solo: Solo 6 … Solo Vira and the Solo misärer. Lomber doesn't buy and can't fold; the
 *   defence buys. Trumf Solos name trumf; the misärer run from Petite Falsk to Ouverte Royale.
 * - tupp: tRupp, tVupp, tTupp (Uppslagsmisär). A misär: 3/2/1 talong cards are turned up and
 *   can't be bought; lomber buys blind from the rest, then swaps in at least one turned-up
 *   card (bytkort) and may kasta handkort for it. Normally Petite. If the whole uppslag is
 *   swapped in and nothing is laid away, the giv becomes a Höna by itself (see Swap).
 * - hopeSolo: Hope Solo 6–13. A trumf Solo played Ouverte Royale (hand open before the köp,
 *   the defence may consult), paid as Ofärg.
 */
export type Family =
  | "begar" | "turne" | "vingel" | "tringel" | "gask" | "solo" | "hopeSolo" | "kopmisar" | "tupp" | "gok";

export type Goal =
  | { readonly kind: "tricks"; readonly min: number }
  /** Grande allows no trick, Falsk one; how many cards are played is `handSize`. */
  | { readonly kind: "misere"; readonly tricksAllowed: 0 | 1 };

/**
 * Where trumf comes from: `named` by lomber (Begär before the köp, Solo before the defence köp);
 * the suit of the one turned-up card (`turnUp`, Turné); `chooseFromTurnUp`, lomber chooses among
 * the turned-up suits before the köp (Vingel, Tringel); chosen `afterBuy` (Gask); or `none` (misär).
 */
export type TrumpSource = "named" | "turnUp" | "chooseFromTurnUp" | "afterBuy" | "none";

export type Buy =
  /** Solo: lomber doesn't buy. */
  | { readonly kind: "none" }
  /** Blind from the top, between min and max cards (the turned-up cards count). */
  | { readonly kind: "blind"; readonly min: number; readonly max: number }
  /** Gask: keep n givkort and take the whole talong (Minusgask: what is left after its nerslag). */
  | { readonly kind: "keepAndTakeTalon"; readonly keep: number }
  /** Gök: keep 13 of givhand + talong; Gökunge's talong is open and the cards taken from it are played open. */
  | { readonly kind: "pickFromHandAndTalon"; readonly openTalon: boolean };

/**
 * Talong cards laid out before the köp. Turné, Vingel and Tringel: turned up; they `must` be
 * bought (they count among the drawn cards, can't be kastade, and trumf comes from them). Tupp:
 * turned up; `never` bought, only swapped in after the köp (bytkort). Minusgask: its nerslag, the
 * top talong card laid aside face down, taken by lomber only `afterChoice` of the game.
 */
export type TurnUp = {
  readonly cards: number;
  readonly bought: "must" | "never" | "afterChoice";
  readonly faceDown: boolean;
} | null;

/**
 * The swap phase (Tupp), after the köp and before the defence köp and any Ombyte: lomber swaps
 * in at least `min` turned-up cards. Each swapped card allows kasting the next number of
 * handkort in `discardPerSwap` (2, then 1, then 0); lomber may kasta fewer. Rejected bytkort and
 * the kastade handkort lie open (the tuppstjärt).
 *
 * If the whole uppslag is swapped in and nothing is laid away (the tuppstjärt is empty), the giv
 * becomes `whenTailEmpty` by itself: the Höna, played with more cards and paid more. Lomber
 * doesn't choose or announce it.
 */
export type Swap = {
  readonly min: number;
  readonly discardPerSwap: readonly number[];
  readonly whenTailEmpty: { readonly name: string; readonly handSize: number; readonly multiplier: number };
} | null;

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
  readonly downTo: number;
  readonly mayKeepMore: boolean;
} | null;

export interface Contract {
  readonly id: string;
  readonly name: string;
  readonly family: Family;
  /** π, the level of the bid that leads to the contract. */
  readonly level: Level;
  readonly goal: Goal;
  /**
   * 12 for Petite (one extra card is kastad), 13 for Grande. In misär lomber may keep more (see
   * discard and swap), so for a Tupp this is the nominal Petite size; a Höna's is in its swap.
   */
  readonly handSize: number;
  readonly trump: TrumpSource;
  readonly turnUp: TurnUp;
  readonly buy: Buy;
  readonly swap: Swap;
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
    /**
     * Vingel ×2, Tringel ×3 (PAYMENT_MULTIPLIERS), everything else ×1; a Höna's is in its swap.
     * It multiplies both the Pinnar and the Betar (SPEC.md §6).
     */
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
    goal: { kind: "tricks", min: tricks }, handSize: 13, trump: "named", turnUp: null, swap: null,
    buy: { kind: "blind", min: 0, max: 13 }, discard: null, visibility: "closed",
    allowed: { rebuy: true, rebuyMinTalon: 1, fold: true, defenceBuy: true },
    payment: { factor: "bySuit", multiplier: 1, cowardPins: false },
  };
};

/** How many talong cards each turn-up family turns up before the köp. */
export const TURN_UP_CARDS = { turne: 1, vingel: 2, tringel: 3 } as const;
export type TurnUpFamily = keyof typeof TURN_UP_CARDS;

/** Families paid more than once; everything else ×1. */
export const PAYMENT_MULTIPLIERS: Partial<Record<Family, number>> = { vingel: 2, tringel: 3 };

const TURN_UP_NAMES: Record<TurnUpFamily, string> = { turne: "Turné", vingel: "Vingel", tringel: "Tringel" };

/**
 * Turné, Vingel and Tringel: trumf from the turned-up card(s), which count as bought. With one
 * card (Turné) its suit is trumf; with more, lomber chooses among their suits before the köp.
 */
const turnUp = (family: TurnUpFamily, tricks: number, lvl: Level): Contract => {
  const cards = TURN_UP_CARDS[family];
  return {
    id: `${family}-${tricks}`, name: `${TURN_UP_NAMES[family]} ${tricks}`, family, level: lvl,
    goal: { kind: "tricks", min: tricks }, handSize: 13, trump: cards === 1 ? "turnUp" : "chooseFromTurnUp",
    turnUp: { cards, bought: "must", faceDown: false }, swap: null,
    buy: { kind: "blind", min: cards, max: 13 }, discard: null, visibility: "closed",
    // A rebuy turns up as many again and needs one more card left: Omturné 2, Omvingel 3, Omtringel 4.
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

/** Vira is Gask på 13: keep the whole givhand, take the whole talong, kasta 13. */
export const VIRA = 13;

/** Minusgask is Gask på −1. */
export const MINUSGASK = -1;

/** The name of Gask på n, shared by its bid and contracts. */
export const gaskName = (n: number): string => (n === MINUSGASK ? "Minusgask" : n === VIRA ? "Vira" : `Gask på ${n}`);

/**
 * Gask på n: two contracts, trumf and misär, between which lomber chooses after the köp (only
 * trumf for Gask på 5 and 6). Keep n givkort, take the whole talong, choose, then kasta.
 */
const gask = (n: number, lvl: Level, misereSize?: MisereSize): Contract[] => {
  // Gask på 5 and 6 need 12 tricks, Vira (Gask på 13) all 13 (SPEC.md §5).
  const tricks = n === VIRA ? 13 : n >= 5 ? 12 : 7 + n;
  const name = gaskName(n);
  const common = {
    family: "gask" as const, level: lvl, swap: null,
    // Minusgask's nerslag: the top talong card laid aside face down, taken after choosing the game.
    turnUp: n === MINUSGASK ? { cards: 1, bought: "afterChoice" as const, faceDown: true } : null,
    buy: { kind: "keepAndTakeTalon" as const, keep: Math.max(n, 0) },
    allowed: { ...NO_REBUY, fold: true, defenceBuy: false },
  };
  const trumpGame: Contract = {
    ...common, id: `gask-${n}-trump`, name: `${name} (trumf)`, goal: { kind: "tricks", min: tricks }, handSize: 13,
    discard: { after: "choice", downTo: 13, mayKeepMore: false }, trump: "afterBuy", visibility: "closed", payment: { factor: "bySuit", multiplier: 1, cowardPins: n === MINUSGASK },
  };
  if (misereSize === undefined) return [trumpGame];
  const misereGame: Contract = {
    ...common, ...misere(misereSize), id: `gask-${n}-misere`, name: `${name} (misär)`, trump: "none",
    // After choosing misär, kasta down to 13 (12 for a Petite), or fewer: misär may play with more.
    discard: { after: "choice", downTo: misere(misereSize).handSize, mayKeepMore: true },
    payment: { factor: "misere", multiplier: 1, cowardPins: n === MINUSGASK },
  };
  return [trumpGame, misereGame];
};

/** Köpmisär (Köp N): a misär with a blind köp of at least N cards; Omköp needs N cards left. */
const kopmisar = (n: number, lvl: Level, size: MisereSize): Contract => {
  return {
    id: `kop-${n}`, name: `Köp ${n}`, family: "kopmisar", level: lvl, ...misere(size), trump: "none", turnUp: null, swap: null,
    buy: { kind: "blind", min: n, max: 13 },
    allowed: { rebuy: true, rebuyMinTalon: n, fold: true, defenceBuy: true },
    payment: { factor: "misere", multiplier: 1, cowardPins: false },
  };
};

/** The Tupp family: how many cards each turns up (SPEC.md §3: tRupp, tVupp, tTupp). */
export const TUPP_NAMES = { 3: "tRupp", 2: "tVupp", 1: "tTupp" } as const;
export type TuppSize = keyof typeof TUPP_NAMES;

/** For each swapped bytkort, how many handkort lomber may kasta: 2 for the first, 1, then 0. */
const DISCARD_PER_SWAP = [2, 1, 0] as const;

/** A Höna is paid double (SPEC.md §5). */
const HONA_MULTIPLIER = 2;

/**
 * Tupp (Uppslagsmisär), with its Höna as a variant decided by the swap. The Tupp is normally
 * Petite; taking the whole uppslag without laying anything away makes it a Höna, played with
 * 13 + n cards (the play ends with n cards left) and paid double. Ombyte needs one card more
 * than the uppslag left.
 */
const tupp = (n: TuppSize, lvl: Level): Contract => {
  const common = {
    level: lvl, goal: { kind: "misere" as const, tricksAllowed: 0 as const }, trump: "none" as const,
    // Turn up n bytkort, buy blind from the other 13 − n cards, then swap in at least one.
    turnUp: { cards: n, bought: "never" as const, faceDown: false }, buy: { kind: "blind" as const, min: 0, max: 13 - n },
    discard: null, visibility: "closed" as const,
    allowed: { rebuy: true, rebuyMinTalon: n + 1, fold: true, defenceBuy: true },
  };
  return {
    ...common, id: `tupp-${n}`, name: TUPP_NAMES[n], family: "tupp", handSize: 12,
    swap: {
      min: 1, discardPerSwap: DISCARD_PER_SWAP,
      whenTailEmpty: { name: `Höna (${TUPP_NAMES[n]})`, handSize: 13 + n, multiplier: HONA_MULTIPLIER },
    },
    payment: { factor: "misere", multiplier: 1, cowardPins: false },
  };
};

/** Gök: a misär where lomber has givhand + talong and kastar (at most) 13; no defence köp. */
const gok = (id: string, name: string, lvl: Level, size: MisereSize, openTalon: boolean): Contract => {
  return {
    id, name, family: "gok", level: lvl, ...misere(size), trump: "none", turnUp: null, swap: null,
    buy: { kind: "pickFromHandAndTalon", openTalon },
    // "efter Köpet kastas (högst) tretton kort": at most 13, so lomber may play with more.
    discard: { after: "buy", downTo: 13, mayKeepMore: true },
    allowed: { ...NO_REBUY, fold: true, defenceBuy: false },
    payment: { factor: "misere", multiplier: 1, cowardPins: false },
  };
};

const SOLO_COMMON = {
  turnUp: null, buy: { kind: "none" as const }, swap: null,
  allowed: { ...NO_REBUY, fold: false, defenceBuy: true },
};

/** Trumf Solo: no köp for lomber, trumf named before the defence köp, can't be folded. */
const solo = (tricks: number, lvl: Level): Contract => {
  return {
    ...SOLO_COMMON, id: `solo-${tricks}`, name: tricks === 13 ? "Solo Vira" : `Solo ${tricks}`, family: "solo",
    level: lvl, goal: { kind: "tricks", min: tricks }, handSize: 13, discard: null, trump: "named",
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
    goal: { kind: "tricks", min: tricks }, handSize: 13, discard: null, trump: "named", visibility: "royale",
    payment: { factor: "offSuit", multiplier: 1, cowardPins: false },
  };
};

/**
 * Every contract in the budtabell. Contracts above havsytan count μ as 0 until #27.
 */
export const CONTRACTS: readonly Contract[] = [
  begar(6, level(0)), begar(7, level(1)), begar(8, level(2)), begar(9, level(3)), begar(10, level(6)),
  turnUp("turne", 6, level(1)), turnUp("turne", 7, level(2)), turnUp("turne", 8, level(3)),
  turnUp("vingel", 6, level(1)), turnUp("vingel", 7, level(2)), turnUp("vingel", 8, level(3)),
  turnUp("tringel", 9, level(4)),
  ...gask(MINUSGASK, level(-1), "PF"), ...gask(0, level(0), "GF"), ...gask(1, level(1), "P"), ...gask(2, level(2), "G"),
  ...gask(3, level(3), "PO"), ...gask(4, level(4), "GO"), ...gask(6, level(6)), ...gask(5, level(8)),
  ...gask(VIRA, level(12)),
  kopmisar(4, level(2), "PF"), kopmisar(3, level(4), "GF"), kopmisar(2, level(6), "P"), kopmisar(1, level(8), "G"),
  tupp(3, level(1)), tupp(2, level(2)), tupp(1, level(4)),
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
