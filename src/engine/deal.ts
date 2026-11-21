/**
 * A giv: the deal and Färg (SPEC.md §1–2). The deal is plain data; later steps of the game
 * update it through moves, and seat views (#20) are derived from it.
 */
import { colourOf, newPack, SUITS, type Card, type Suit } from "./cards.js";
import { shuffle, type Rng } from "./random.js";
import { activeSeats, rolesFor, type PlayerCount, type Roles, type Seat } from "./table.js";

/** Högsta Färg, Andra Färg and the two Ofärger, set by the Färg card. */
export interface Colours {
  readonly colourCard: Card;
  readonly topSuit: Suit;
  readonly secondSuit: Suit;
  readonly offSuits: readonly [Suit, Suit];
}

export interface Deal {
  readonly roles: Roles;
  /** The givhand of each active seat (plain data, so a deal can be stored and replayed). */
  readonly dealtHands: Readonly<Partial<Record<Seat, readonly Card[]>>>;
  /** The 13 cards not dealt, top card first. */
  readonly talon: readonly Card[];
  readonly colours: Colours;
}

export function coloursFrom(colourCard: Card): Colours {
  const topSuit = colourCard.suit;
  const sameColour = SUITS.filter((suit) => suit !== topSuit && colourOf(suit) === colourOf(topSuit));
  const others = SUITS.filter((suit) => colourOf(suit) !== colourOf(topSuit));
  const [secondSuit] = sameColour;
  const [offA, offB] = others;
  if (secondSuit === undefined || offA === undefined || offB === undefined) throw new Error("Unexpected suits");
  return { colourCard, topSuit, secondSuit, offSuits: [offA, offB] };
}

/**
 * The payment factor for a trumf suit (SPEC.md §2). A table rule: it moves into the ruleset
 * record with the other table rules (#30).
 */
export const SUIT_FACTORS = { topSuit: 4, secondSuit: 2, offSuit: 1 } as const;
export type SuitFactor = (typeof SUIT_FACTORS)[keyof typeof SUIT_FACTORS];

export function suitFactor(trump: Suit, colours: Colours): SuitFactor {
  if (trump === colours.topSuit) return SUIT_FACTORS.topSuit;
  if (trump === colours.secondSuit) return SUIT_FACTORS.secondSuit;
  return SUIT_FACTORS.offSuit;
}

/** How the cards are dealt (SPEC.md §1): first this many to each active seat … */
export const FIRST_PACKET = 4;
/** … then this many each, round after round, until TALON_SIZE cards remain. */
export const PACKET = 3;
export const TALON_SIZE = 13;

/**
 * Deals from a pack, top card first: 4 cards each to FH, MH and EH, then 3 each until 13
 * cards remain, which form the talong (in order, top card first).
 */
export function dealFromPack(pack: readonly Card[], roles: Roles): Pick<Deal, "dealtHands" | "talon"> {
  const order = activeSeats(roles);
  const hands = new Map<Seat, Card[]>(order.map((seat) => [seat, []]));
  let next = 0;
  let packet = FIRST_PACKET;
  while (pack.length - next > TALON_SIZE) {
    for (const seat of order) {
      hands.get(seat)?.push(...pack.slice(next, next + packet));
      next += packet;
    }
    packet = PACKET;
  }
  return { dealtHands: Object.fromEntries(hands), talon: pack.slice(next) };
}

/**
 * Deals a giv from a shuffled pack (see dealFromPack). MH's Färg card is simulated as a
 * random card from a fresh pack.
 */
export function dealCards(dealer: Seat, playerCount: PlayerCount, rng: Rng): Deal {
  const roles = rolesFor(dealer, playerCount);
  const { dealtHands, talon } = dealFromPack(shuffle(newPack(), rng), roles);
  const colourCard = shuffle(newPack(), rng)[0];
  if (colourCard === undefined) throw new Error("Empty pack");
  return { roles, dealtHands, talon, colours: coloursFrom(colourCard) };
}
