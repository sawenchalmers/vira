/**
 * Trick play and the result of a giv (SPEC.md §6, #8). The play is plain data: each card played
 * gives a new Play, so a giv can be replayed card by card (#40).
 *
 * EH leads to the first trick, whoever is lomber; the winner of a trick leads to the next. Play
 * goes medsols among the three active seats and skips the resting ones. It lasts until either
 * side runs out of cards (the defenders always hold 13, so lomber's Petite plays 12 tricks), and
 * stops as soon as the result is certain. Claims (lägga upp) come later.
 */
import { rankValue, sameCard, type Card, type Suit } from "./cards.js";
import type { Goal } from "./contracts.js";
import { activeSeats, type Roles, type Seat } from "./table.js";

/** Hemgång, bet (one trick short) or kodilj (two or more short; the kalvar beyond aren't counted). */
export type Result = "made" | "defeated" | "doubleDefeated";

/** How many tricks short a bet and a kodilj are. */
const DEFEATED_BY = 1;
const DOUBLE_DEFEATED_BY = 2;

export interface PlayedCard {
  readonly seat: Seat;
  readonly card: Card;
}

export interface Trick {
  /** Who leads (utspel). */
  readonly leader: Seat;
  /** In the order played, the lead first. */
  readonly cards: readonly PlayedCard[];
}

export interface TakenTrick extends Trick {
  readonly winner: Seat;
}

export interface Play {
  readonly roles: Roles;
  readonly lomber: Seat;
  /** Undefined in misär, which has no trumf. */
  readonly trump: Suit | undefined;
  readonly goal: Goal;
  /** The cards each active seat still holds. */
  readonly hands: Readonly<Partial<Record<Seat, readonly Card[]>>>;
  readonly taken: readonly TakenTrick[];
  /** The trick being played; no cards yet when a trick is to be led. */
  readonly current: Trick;
  /** How many tricks the giv has: until the side with the fewest cards runs out. */
  readonly tricksInGiv: number;
}

const handOf = (play: Play, seat: Seat): readonly Card[] => play.hands[seat] ?? [];

/** Starts the play: EH leads to the first trick. */
export const startPlay = (setup: Pick<Play, "roles" | "lomber" | "trump" | "goal" | "hands">): Play => {
  const seats = activeSeats(setup.roles);
  if (!seats.includes(setup.lomber)) throw new Error(`Lomber (seat ${setup.lomber}) isn't an active seat`);
  const sizes = seats.map((seat) => setup.hands[seat]?.length ?? 0);
  const tricksInGiv = Math.min(...sizes);
  if (tricksInGiv === 0) throw new Error("Every active seat needs cards to play");
  return { ...setup, taken: [], current: { leader: setup.roles.dealer, cards: [] }, tricksInGiv };
};

/** The card that takes the trick: the highest trumf, otherwise the highest card of the led suit. */
export const trickWinner = (cards: readonly PlayedCard[], trump: Suit | undefined): PlayedCard => {
  const [lead, ...rest] = cards;
  if (lead === undefined) throw new Error("An empty trick has no winner");
  const beats = (a: Card, b: Card): boolean =>
    a.suit === b.suit ? rankValue(a.rank) > rankValue(b.rank) : a.suit === trump;
  return rest.reduce((best, next) => (beats(next.card, best.card) ? next : best), lead);
};

/** How many tricks lomber and the defence have taken (Ställning). */
export const trickCount = (play: Play): { readonly lomber: number; readonly defence: number } => {
  const lomber = play.taken.filter((t) => t.winner === play.lomber).length;
  return { lomber, defence: play.taken.length - lomber };
};

/** The result once lomber has taken `lomberTricks` tricks. */
export const resultOf = (goal: Goal, lomberTricks: number): Result => {
  const short = goal.kind === "tricks" ? goal.min - lomberTricks : lomberTricks - goal.tricksAllowed;
  if (short >= DOUBLE_DEFEATED_BY) return "doubleDefeated";
  return short >= DEFEATED_BY ? "defeated" : "made";
};

/**
 * The result, once it's certain: when the tricks still to come can't change it. That is when
 * hemgång or kodilj is clear, as the rules say; a bet is only certain when the last trick is played.
 */
export const outcome = (play: Play): Result | undefined => {
  const { lomber } = trickCount(play);
  const left = play.tricksInGiv - play.taken.length;
  const worst = resultOf(play.goal, play.goal.kind === "tricks" ? lomber : lomber + left);
  const best = resultOf(play.goal, play.goal.kind === "tricks" ? lomber + left : lomber);
  return worst === best ? worst : undefined;
};

/** The seat to play next, or undefined once the play is over. */
export const toPlay = (play: Play): Seat | undefined => {
  if (outcome(play) !== undefined) return undefined;
  const order = activeSeats(play.roles);
  const start = order.indexOf(play.current.leader);
  return order[(start + play.current.cards.length) % order.length];
};

/** The cards `seat` may play: those of the led suit if it has any (bekänna), otherwise any. */
export const legalCards = (play: Play, seat: Seat): readonly Card[] => {
  const hand = handOf(play, seat);
  const led = play.current.cards[0]?.card.suit;
  const following = hand.filter((card) => card.suit === led);
  return following.length > 0 ? following : hand;
};

/** The seat to play plays `card`; a full trick goes to its winner, who leads to the next. */
export const playCard = (play: Play, card: Card): Play => {
  const seat = toPlay(play);
  if (seat === undefined) throw new Error("The play is over");
  if (!legalCards(play, seat).some((c) => sameCard(c, card))) {
    throw new Error(`Seat ${seat} can't play ${card.rank} of ${card.suit}`);
  }
  const hands = { ...play.hands, [seat]: handOf(play, seat).filter((c) => !sameCard(c, card)) };
  const cards = [...play.current.cards, { seat, card }];
  if (cards.length < activeSeats(play.roles).length) return { ...play, hands, current: { ...play.current, cards } };
  const winner = trickWinner(cards, play.trump).seat;
  return { ...play, hands, taken: [...play.taken, { ...play.current, cards, winner }], current: { leader: winner, cards: [] } };
};
