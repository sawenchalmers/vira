/**
 * Payment for a giv (SPEC.md §6, #9): the Pinnar, the Omköp and the Betar, from the contract
 * record and the ruleset. Every giv sums to zero, and this is checked each time.
 *
 * Not yet: μ above havsytan and the jackpott (#27), a Höna's multiplier (#27) and böter (#14).
 */
import type { Suit } from "./cards.js";
import type { Contract } from "./contracts.js";
import { suitFactor, type Colours } from "./deal.js";
import type { Level } from "./level.js";
import type { Result } from "./play.js";
import type { Ruleset } from "./ruleset.js";
import { activeSeats, type Roles, type Seat } from "./table.js";

/** How a giv ended: played to a result, or folded (lagt spel). */
export type Outcome = Result | "folded";

/** Which way the Pinnar go: 1, each defender pays lomber; −1, lomber pays each defender; 0, none (Modpinnar). */
const PIN_DIRECTION: Record<Outcome, number> = { made: 1, defeated: 0, doubleDefeated: -1, folded: -1 };

/**
 * A played bet gets the kinder of paying the Pinnar or not, a fold the harsher (SPEC.md §6). Below
 * zero (Minusgask) the Pinnar are negative and paying them is a gain for lomber, so a played bet and
 * a fold swap: the bet pays them and the fold pays none (Fegpinnar).
 */
const pinDirection = (outcome: Outcome, price: Level): number => {
  const swapped = outcome === "defeated" ? "folded" : outcome === "folded" ? "defeated" : outcome;
  return PIN_DIRECTION[price.num < 0 ? swapped : outcome];
};

/** Betar: lomber lifts bets from the pulla at hemgång and puts them in otherwise. */
const BET_DIRECTION: Record<Outcome, number> = { made: 1, defeated: -1, doubleDefeated: -1, folded: -1 };

export interface PaymentSetup {
  readonly roles: Roles;
  readonly declarer: Seat;
  readonly contract: Contract;
  /** Undefined in misär. */
  readonly trump: Suit | undefined;
  readonly colours: Colours;
  readonly outcome: Outcome;
  /** How many Omköp lomber made. */
  readonly rebuys: number;
  /** Π, the price of the game; the contract's level until μ comes (#27). */
  readonly price?: Level;
}

/** Points per seat: + receives, − pays. Every seat at the table is in it, the resting ones too. */
export type Points = Readonly<Record<Seat, number>>;

/** The rows of the protocol (SPEC.md §9) and their sum. */
export interface Payment {
  readonly pins: Points;
  readonly rebuys: Points;
  readonly bets: Points;
  readonly total: Points;
}

/** Whole points from a fraction; the budtabell's fractions (Gökunge's 4/3) always come out whole. */
const whole = (num: number, den: number): number => {
  if (num % den !== 0) throw new Error(`${num}/${den} isn't a whole number of points`);
  return num / den;
};

const factorOf = (setup: PaymentSetup, ruleset: Ruleset): number => {
  const { factor } = setup.contract.payment;
  if (factor === "misere") return ruleset.paymentFactors.misere;
  if (factor === "offSuit") return ruleset.paymentFactors.offSuit;
  if (setup.trump === undefined) throw new Error(`${setup.contract.name} is paid by its trumf, but has none`);
  return suitFactor(setup.trump, setup.colours, ruleset);
};

const seatsAt = (roles: Roles): Seat[] => Array.from({ length: roles.playerCount }, (_, seat) => seat);

/**
 * One row: lomber gets `declarerGets` and each of `payers` pays `eachPays` (negative amounts go
 * the other way). The two sides are given separately, so the zero-sum check below can fail.
 */
const row = (roles: Roles, declarer: Seat, declarerGets: number, payers: readonly Seat[], eachPays: number): Points => {
  const points: Record<Seat, number> = Object.fromEntries(seatsAt(roles).map((seat) => [seat, 0]));
  // `+ 0` turns −0 into 0, so a row of no payment reads as zeros.
  for (const seat of payers) points[seat] = -eachPays + 0;
  points[declarer] = declarerGets + 0;
  return points;
};

const sum = (points: Points): number => Object.values(points).reduce((a, b) => a + b, 0);

/** The payment for a giv. Throws if it doesn't sum to zero. Whether the outcome was allowed is checked where the moves are made. */
export const payment = (setup: PaymentSetup, ruleset: Ruleset): Payment => {
  const { roles, declarer, contract, outcome } = setup;
  const { multiplier } = contract.payment;
  const { betPoints } = ruleset.stake;

  const defenders = activeSeats(roles).filter((seat) => seat !== declarer);
  const others = seatsAt(roles).filter((seat) => seat !== declarer);
  const price = setup.price ?? contract.level;
  const pinsEach = pinDirection(outcome, price) * whole(price.num * factorOf(setup, ruleset) * multiplier, price.den);
  // A bet is worth betPoints to lomber and is shared equally by everyone else, the resting players too.
  const betShare = whole(betPoints, others.length);
  const bets = BET_DIRECTION[outcome] * ruleset.bets[outcome === "folded" ? "defeated" : outcome] * multiplier;
  const rebuys = -setup.rebuys * ruleset.bets.rebuy * multiplier;

  const rows = {
    pins: row(roles, declarer, pinsEach * defenders.length, defenders, pinsEach),
    rebuys: row(roles, declarer, rebuys * betPoints, others, rebuys * betShare),
    bets: row(roles, declarer, bets * betPoints, others, bets * betShare),
  };
  const total = Object.fromEntries(seatsAt(roles).map((seat) => [seat, (rows.pins[seat] ?? 0) + (rows.rebuys[seat] ?? 0) + (rows.bets[seat] ?? 0)]));
  for (const [name, points] of Object.entries({ ...rows, total })) {
    if (sum(points) !== 0) throw new Error(`The ${name} of a giv don't sum to zero`);
  }
  return { ...rows, total };
};
