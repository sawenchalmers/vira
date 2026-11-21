/**
 * Cards, suits and ranks (SPEC.md §0 "Cards"). The engine uses English values; the
 * Swedish letters and suit symbols are only for display (see notation.ts).
 */

export const SUITS = ["clubs", "hearts", "spades", "diamonds"] as const;
export type Suit = (typeof SUITS)[number];

/** Ranks, highest first: E K D Kn 10 … 2. */
export const RANKS = ["ace", "king", "queen", "jack", "10", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export type CardColour = "black" | "red";

export function colourOf(suit: Suit): CardColour {
  return suit === "clubs" || suit === "spades" ? "black" : "red";
}

/** A rank's strength: 14 for the ace down to 2 for the two. */
export function rankValue(rank: Rank): number {
  return 14 - RANKS.indexOf(rank);
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** A full pack of 52 cards in a fixed order (by suit, then rank, highest first). */
export function newPack(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}
