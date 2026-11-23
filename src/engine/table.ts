/**
 * The table: seating, roles and rotation (SPEC.md §1, §0 "Table and roles").
 *
 * Seats are numbered 0 … playerCount − 1 medsols (clockwise), so the seat to a player's left
 * is the next number. Who rests comes from the ruleset (spel på tre, fyra or fem).
 */
import { shuffle, type Rng } from "./random.js";
import type { Ruleset } from "./ruleset.js";

export type PlayerCount = 3 | 4 | 5;
export type Seat = number;

/** The roles in one giv. EH is given, the dealer. */
export interface Roles {
  readonly playerCount: PlayerCount;
  readonly dealer: Seat;
  readonly forehand: Seat;
  readonly middlehand: Seat;
  /** None at spel på tre, the seat right of given at fyra, both seats next to given at fem. */
  readonly restingSeats: readonly Seat[];
}

/** The seat `steps` places medsols (to the left) of `seat`. */
export const leftOf = (seat: Seat, playerCount: PlayerCount, steps = 1): Seat => {
  return (((seat + steps) % playerCount) + playerCount) % playerCount;
};

export const rolesFor = (dealer: Seat, ruleset: Ruleset): Roles => {
  const { playerCount } = ruleset;
  if (!Number.isInteger(dealer) || dealer < 0 || dealer >= playerCount) {
    throw new Error(`No seat ${dealer} at a table of ${playerCount}`);
  }
  const restingSeats = ruleset.restingSeats.map((offset) => leftOf(dealer, playerCount, offset));
  const active: Seat[] = [];
  for (let step = 1; step < playerCount; step++) {
    const seat = leftOf(dealer, playerCount, step);
    if (!restingSeats.includes(seat)) active.push(seat);
  }
  const [forehand, middlehand, ...extra] = active;
  if (forehand === undefined || middlehand === undefined || extra.length > 0) {
    throw new Error("A giv needs exactly three active seats");
  }
  return { playerCount, dealer, forehand, middlehand, restingSeats };
};

/** The three active seats in order: FH, MH and EH (given). The order of dealing and bidding. */
export const activeSeats = (roles: Roles): [Seat, Seat, Seat] => {
  return [roles.forehand, roles.middlehand, roles.dealer];
};

/** The next given is the player to the left of the current one. */
export const nextDealer = (dealer: Seat, ruleset: Ruleset): Seat => {
  return leftOf(dealer, ruleset.playerCount, 1);
};

/**
 * Seating drawn by lot at the start of a parti: the players in medsols order. The first in
 * the drawn order deals first.
 */
export const drawSeating = <T>(players: readonly T[], rng: Rng): T[] => {
  return shuffle(players, rng);
};
