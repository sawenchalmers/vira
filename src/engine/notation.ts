/**
 * Card notation: suit symbol + Swedish rank letter, e.g. "♠Kn" (SPEC.md §0). It is the fixed
 * exchange format for moves and prompts, and for now also the display. The display and the
 * input aliases move to the message module in #25; the exchange format stays as it is.
 */
import { RANKS, SUITS, type Card, type Rank, type Suit } from "./cards.js";

const SUIT_SYMBOLS: Record<Suit, string> = { clubs: "♣", hearts: "♥", spades: "♠", diamonds: "♦" };

/** What a player may type for a suit: the symbol, or the Swedish name's first one or two letters. */
const SUIT_ALIASES: Record<Suit, readonly string[]> = {
  clubs: ["♣", "kl", "k"],
  hearts: ["♥", "hj", "h"],
  spades: ["♠", "sp", "s"],
  diamonds: ["♦", "ru", "r"],
};

const RANK_LETTERS: Record<Rank, string> = {
  ace: "E", king: "K", queen: "D", jack: "Kn",
  "10": "10", "9": "9", "8": "8", "7": "7", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2",
};

/** Every suit alias with its suit, longest first, so "kl" is tried before "k". */
const ALIAS_LIST = SUITS.flatMap((suit) => SUIT_ALIASES[suit].map((alias) => ({ alias, suit }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

export const formatSuit = (suit: Suit): string => {
  return SUIT_SYMBOLS[suit];
};

export const formatRank = (rank: Rank): string => {
  return RANK_LETTERS[rank];
};

export const formatCard = (card: Card): string => {
  return SUIT_SYMBOLS[card.suit] + RANK_LETTERS[card.rank];
};

/**
 * Parses a card: the suit (symbol or alias) followed by the rank, in any case, with spaces
 * allowed only between suit and rank, e.g. "♠Kn", "skn", "Sp D", "k10". The emoji form of a
 * suit symbol ("♠️") is accepted too. Throws on anything else.
 */
export const parseCard = (text: string): Card => {
  const input = text.replace(/\uFE0F/g, "").trim().toLowerCase();
  for (const { alias, suit } of ALIAS_LIST) {
    if (!input.startsWith(alias)) continue;
    const rest = input.slice(alias.length).trimStart();
    if (/\s/.test(rest)) continue;
    const rank = RANKS.find((r) => RANK_LETTERS[r].toLowerCase() === rest);
    if (rank !== undefined) return { suit, rank };
  }
  throw new Error(`Not a card: "${text}"`);
};
