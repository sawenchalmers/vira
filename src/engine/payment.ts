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

/**
 * Which way the Pinnar go: 1, each defender pays lomber; −1, lomber pays each defender; 0, none.
 * A played bet gets the kinder of paying the Pinnar or not, a fold the harsher: with Π > 0 a
 * played bet pays none (Modpinnar) and a fold pays them. Below zero (Minusgask) paying them is a
 * gain for lomber, so a played bet pays them and a fold pays none (Fegpinnar).
 */
const pinDirection = (outcome: Outcome, price: Level): number => {
  if (outcome === "made") return 1;
  if (outcome === "doubleDefeated") return -1;
  const pays = outcome === "defeated" ? price.num < 0 : price.num > 0;
  return pays ? -1 : 0;
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

/** `amount` from lomber to each seat in `to`, or the other way when it's negative. */
const fromDeclarer = (roles: Roles, declarer: Seat, to: readonly Seat[], amount: number): Points => {
  const points: Record<Seat, number> = Object.fromEntries(seatsAt(roles).map((seat) => [seat, 0]));
  // `+ 0` turns −0 into 0, so a row of no payment reads as zeros.
  for (const seat of to) points[seat] = amount + 0;
  points[declarer] = -amount * to.length + 0;
  return points;
};

const sum = (points: Points): number => Object.values(points).reduce((a, b) => a + b, 0);

/** The payment for a giv. Throws if it doesn't sum to zero. */
export const payment = (setup: PaymentSetup, ruleset: Ruleset): Payment => {
  const { roles, declarer, contract, outcome } = setup;
  const { multiplier } = contract.payment;
  if (!activeSeats(roles).includes(declarer)) throw new Error(`Lomber (seat ${declarer}) isn't an active seat`);
  if (!Number.isInteger(setup.rebuys) || setup.rebuys < 0) throw new Error(`Not a number of Omköp: ${setup.rebuys}`);

  const defenders = activeSeats(roles).filter((seat) => seat !== declarer);
  const others = seatsAt(roles).filter((seat) => seat !== declarer);
  const price = setup.price ?? contract.level;
  const pinsEach = whole(price.num * factorOf(setup, ruleset) * multiplier, price.den);
  const direction = pinDirection(outcome, price);
  // A bet is shared equally by everyone but lomber, the resting players too.
  const betShare = whole(ruleset.stake.betPoints, others.length);
  const betCount = ruleset.bets[outcome === "folded" ? "defeated" : outcome] * multiplier;
  const rebuyCount = setup.rebuys * ruleset.bets.rebuy * multiplier;

  // fromDeclarer takes what lomber pays; a negative amount is what lomber receives.
  const pins = fromDeclarer(roles, declarer, defenders, -direction * pinsEach);
  const rebuys = fromDeclarer(roles, declarer, others, rebuyCount * betShare);
  const bets = fromDeclarer(roles, declarer, others, -BET_DIRECTION[outcome] * betCount * betShare);
  const total = Object.fromEntries(seatsAt(roles).map((seat) => [seat, (pins[seat] ?? 0) + (rebuys[seat] ?? 0) + (bets[seat] ?? 0)]));
  for (const [row, points] of Object.entries({ pins, rebuys, bets, total })) {
    if (sum(points) !== 0) throw new Error(`The ${row} of a giv don't sum to zero`);
  }
  return { pins, rebuys, bets, total };
};
