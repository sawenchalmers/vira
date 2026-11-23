/**
 * A giv: the deal and Färg (SPEC.md §1–2). The deal is plain data; later steps of the game
 * update it through moves, and seat views (#20) are derived from it.
 */
import { colourOf, newPack, PACK_SIZE, SUITS, type Card, type Suit } from "./cards.js";
import { createRng, shuffle } from "./random.js";
import type { Ruleset } from "./ruleset.js";
import { activeSeats, rolesFor, type Roles, type Seat } from "./table.js";

/** Högsta Färg, Andra Färg and the two Ofärger, set by the Färg card. */
export interface Colours {
  readonly colourCard: Card;
  readonly topSuit: Suit;
  readonly secondSuit: Suit;
  readonly offSuits: readonly [Suit, Suit];
}

export interface Deal {
  /** The seed of this giv's pack, so the giv can be replayed on its own. */
  readonly seed: number;
  /** The seed of the next giv's pack, whose bottom card is this giv's Färg card. */
  readonly nextSeed: number;
  readonly roles: Roles;
  /** The givhand of each active seat (plain data, so a deal can be stored and replayed). */
  readonly dealtHands: Readonly<Partial<Record<Seat, readonly Card[]>>>;
  /** The 13 cards not dealt, top card first. */
  readonly talon: readonly Card[];
  readonly colours: Colours;
}

export const coloursFrom = (colourCard: Card): Colours => {
  const topSuit = colourCard.suit;
  const sameColour = SUITS.filter((suit) => suit !== topSuit && colourOf(suit) === colourOf(topSuit));
  const others = SUITS.filter((suit) => colourOf(suit) !== colourOf(topSuit));
  const [secondSuit] = sameColour;
  const [offA, offB] = others;
  if (secondSuit === undefined || offA === undefined || offB === undefined) throw new Error("Unexpected suits");
  return { colourCard, topSuit, secondSuit, offSuits: [offA, offB] };
};

/** The payment factor for a trumf suit, from the ruleset: Högsta Färg, Andra Färg or Ofärg. */
export const suitFactor = (trump: Suit, colours: Colours, ruleset: Ruleset): number => {
  const factors = ruleset.paymentFactors;
  if (trump === colours.topSuit) return factors.topSuit;
  if (trump === colours.secondSuit) return factors.secondSuit;
  return factors.offSuit;
};

/**
 * Deals from a pack, top card first, as the ruleset says: `firstPacket` cards each to FH, MH
 * and EH, then `packet` each until `talonSize` cards remain, which form the talong (in order,
 * top card first). Spel på fyra: 4, then 3 each, until 13 remain.
 */
export const dealFromPack = (pack: readonly Card[], roles: Roles, ruleset: Ruleset): Pick<Deal, "dealtHands" | "talon"> => {
  const { firstPacket, packet: laterPacket, talonSize } = ruleset.deal;
  if (pack.length !== PACK_SIZE) throw new Error(`A pack has ${PACK_SIZE} cards, not ${pack.length}`);
  const order = activeSeats(roles);
  const hands = new Map<Seat, Card[]>(order.map((seat) => [seat, []]));
  let next = 0;
  let packet = firstPacket;
  while (pack.length - next > talonSize) {
    for (const seat of order) {
      hands.get(seat)?.push(...pack.slice(next, next + packet));
      next += packet;
    }
    packet = laterPacket;
  }
  return { dealtHands: Object.fromEntries(hands), talon: pack.slice(next) };
};

/** Lifts `lifted` cards (1 … pack size − 1) off the top and puts them underneath. */
export const cutPack = (pack: readonly Card[], lifted: number): Card[] => {
  if (!Number.isInteger(lifted) || lifted < 1 || lifted >= pack.length) {
    throw new Error(`Can't lift ${lifted} of ${pack.length} cards`);
  }
  return [...pack.slice(lifted), ...pack.slice(0, lifted)];
};

/**
 * A giv's pack from its own seed (see deriveSeed): shuffled by MH while it lies ready, then
 * cut by the player to the right of given just before the deal (SPEC.md §1–2).
 */
export const preparePack = (seed: number): { readonly shuffled: Card[]; readonly cut: Card[] } => {
  const rng = createRng(seed);
  const shuffled = shuffle(newPack(), rng);
  const lifted = 1 + Math.floor(rng() * (PACK_SIZE - 1));
  return { shuffled, cut: cutPack(shuffled, lifted) };
};

/**
 * Deals a giv from its cut pack (see dealFromPack). As at the table, the Färg card is the
 * bottom card of the next giv's pack as it lies ready, shuffled but not yet cut (SPEC.md §2).
 * The cut before the next deal moves it anywhere in the pack except the bottom.
 */
export const dealCards = (dealer: Seat, ruleset: Ruleset, seed: number, nextSeed: number): Deal => {
  const roles = rolesFor(dealer, ruleset);
  const { dealtHands, talon } = dealFromPack(preparePack(seed).cut, roles, ruleset);
  const colourCard = preparePack(nextSeed).shuffled.at(-1);
  if (colourCard === undefined) throw new Error("Empty pack");
  return { seed, nextSeed, roles, dealtHands, talon, colours: coloursFrom(colourCard) };
};
