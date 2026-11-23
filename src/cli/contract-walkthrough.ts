/**
 * `npm run contract` (#49): walks lomber through a contract from the slutbud until the first
 * trick. It runs the phases the engine gives for the contract (`phasesFor`), in order, and asks
 * each decision a phase needs. The cards don't move yet; each phase says what happens, until
 * #10 and #31–#35 build the mechanisms in the engine. Lomber sees only their own view: the
 * talong stays hidden except for what the contract lays out face up.
 */
import {
  contractsOf, formatLevel, parseSuit, PHASE_ORDER, phasesFor, raiseOptions, SUITS, turnUpCards,
  type Bid, type Card, type Contract, type Deal, type Phase, type Ruleset, type Suit,
} from "../engine/index.js";
import { handText } from "./describe-giv.js";
import { bidOf, firstContract } from "./find-contract.js";
import { askUntil, type Io, type Parsed } from "./io.js";
import * as say from "./messages.js";

interface Walk {
  readonly io: Io;
  readonly deal: Deal;
  readonly ruleset: Ruleset;
  readonly hand: readonly Card[];
  contract: Contract;
  trump: Suit | undefined;
  folded: boolean;
}

type Step = (walk: Walk) => Promise<void> | void;

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = <T>(error: string): Parsed<T> => ({ ok: false, error });

/** One of the options by number; with `allowNone`, an empty answer chooses none. */
const chooseOne = async <T>(
  io: Io, question: string, options: readonly T[], label: (option: T) => string, allowNone = false,
): Promise<T | undefined> => {
  io.show(say.numbered(options.map(label)));
  return askUntil(io, question, (answer) => {
    if (allowNone && answer === "") return ok(undefined);
    const chosen = /^\d+$/.test(answer) ? options[Number(answer) - 1] : undefined;
    return chosen === undefined ? fail(say.chooseError(options.length)) : ok(chosen);
  });
};

/** A suit among the options; asks only when there is a choice. */
const chooseSuit = async (io: Io, options: readonly Suit[]): Promise<Suit> => {
  const [only] = options;
  if (only !== undefined && options.length === 1) return only;
  return askUntil(io, say.trumpQuestion(options), (answer) => {
    try {
      const suit = parseSuit(answer);
      return options.includes(suit) ? ok(suit) : fail(say.trumpError(options));
    } catch {
      return fail(say.trumpError(options));
    }
  });
};

const askNumber = (io: Io, question: string, min: number, max: number): Promise<number> =>
  askUntil(io, question, (answer) => {
    const n = /^\d+$/.test(answer) ? Number(answer) : Number.NaN;
    return n >= min && n <= max ? ok(n) : fail(say.numberError(min, max));
  });

/** j/ja or n/nej, or the two letters given. */
const askChoice = (io: Io, question: string, yes: readonly string[], no: readonly string[], error: string): Promise<boolean> =>
  askUntil(io, question, (answer) => {
    const a = answer.toLowerCase();
    return yes.includes(a) ? ok(true) : no.includes(a) ? ok(false) : fail(error);
  });

/** After a raise, keep the kind of game (trumf or misär) where the new bid has it; lomber may still choose later. */
const contractAfterRaise = (b: Bid, current: Contract): Contract =>
  contractsOf(b).find((c) => c.goal.kind === current.goal.kind) ?? firstContract(b);

/** What each phase does, until the first trick. */
const STEPS: Record<Exclude<Phase, "bidding" | "play" | "payment">, Step> = {
  raise: async (w) => {
    w.io.show(say.raiseOffer);
    const options = raiseOptions(bidOf(w.contract, w.ruleset), w.ruleset);
    const chosen = await chooseOne(w.io, say.raiseQuestion, options, (b) => `${b.name} (π ${formatLevel(b.level)})`, true);
    if (chosen === undefined) return;
    w.contract = contractAfterRaise(chosen, w.contract);
    w.io.show(say.raised(chosen.name));
  },
  chooseContract: async (w) => {
    w.io.show(say.chooseContract);
    const options = contractsOf(bidOf(w.contract, w.ruleset));
    w.contract = (await chooseOne(w.io, say.chooseQuestion(options.length), options, (c) => c.name)) ?? w.contract;
  },
  turnUp: (w) => {
    const { turnUp } = w.contract;
    if (turnUp === null) return;
    const laidOut = turnUpCards(w.deal.talon, w.contract);
    if (turnUp.bought === "afterChoice") {
      w.io.show(say.nerslag);
      return;
    }
    w.io.show(say.turnedUp(laidOut, turnUp.bought));
    const [card] = laidOut;
    if (w.contract.trump === "turnUp" && card !== undefined) {
      w.trump = card.suit;
      w.io.show(say.trumpIs(card.suit));
    }
  },
  declareTrump: async (w) => {
    const fromTurnUp = w.contract.trump === "chooseFromTurnUp";
    const options = fromTurnUp ? [...new Set(turnUpCards(w.deal.talon, w.contract).map((c) => c.suit))] : [...SUITS];
    w.trump = await chooseSuit(w.io, options);
    w.io.show(say.trumpIs(w.trump));
  },
  discardAfterBidding: (w) => {
    if (w.contract.discard !== null) w.io.show(`${say.discard(w.contract.discard)} ${say.notBuilt()}`);
  },
  showHandBeforeBuy: (w) => {
    w.io.show(say.royale);
    w.io.show(say.hand(handText(w.hand)));
  },
  buy: async (w) => {
    const { buy, turnUp } = w.contract;
    if (buy.kind === "blind") {
      const count = await askNumber(w.io, say.buyQuestion(buy.min, buy.max), buy.min, buy.max);
      w.io.show(`${say.blindBuy(count)} ${say.notBuilt(10)}`);
    } else if (buy.kind === "keepAndTakeTalon") {
      w.io.show(`${say.keepAndTake(buy.keep, turnUp !== null)} ${say.notBuilt(33)}`);
    } else if (buy.kind === "pickFromHandAndTalon") {
      w.io.show(`${say.pickFromHandAndTalon(buy.openTalon)} ${say.notBuilt(34)}`);
    }
  },
  swap: (w) => {
    if (w.contract.swap !== null) w.io.show(`${say.swap(w.contract.swap)} ${say.notBuilt(27)}`);
  },
  rebuy: async (w) => {
    const yes = await askChoice(w.io, say.rebuyQuestion(w.contract.allowed.rebuyMinTalon), ["j", "ja"], ["n", "nej"], say.yesNoError);
    if (yes) w.io.show(`${say.rebuy} ${say.notBuilt(10)}`);
  },
  chooseAfterBuy: async (w) => {
    const options = contractsOf(bidOf(w.contract, w.ruleset));
    if (options.length > 1) {
      w.io.show(say.chooseContract);
      w.contract = (await chooseOne(w.io, say.chooseQuestion(options.length), options, (c) => c.name)) ?? w.contract;
    }
    if (w.contract.trump === "afterBuy") {
      w.trump = await chooseSuit(w.io, SUITS);
      w.io.show(say.trumpIs(w.trump));
    }
  },
  discard: (w) => {
    const [nerslag] = turnUpCards(w.deal.talon, w.contract);
    if (w.contract.turnUp?.bought === "afterChoice" && nerslag !== undefined) w.io.show(say.takeNerslag(nerslag));
    if (w.contract.discard !== null) w.io.show(`${say.discard(w.contract.discard)} ${say.notBuilt()}`);
  },
  defenceBuy: (w) => {
    w.io.show(`${say.defenceBuy} ${say.notBuilt(35)}`);
  },
  fold: async (w) => {
    w.folded = await askChoice(w.io, say.foldQuestion, ["l"], ["s"], say.foldError);
  },
  showHandBeforePlay: (w) => {
    w.io.show(say.ouverte);
    w.io.show(say.hand(handText(w.hand)));
  },
};

/** Walks lomber (förhand) through `start` and the phases it leads to; stops before the first trick or on a fold. */
export const walkThrough = async (io: Io, deal: Deal, ruleset: Ruleset, start: Contract): Promise<void> => {
  const hand = deal.dealtHands[deal.roles.forehand] ?? [];
  const walk: Walk = { io, deal, ruleset, hand, contract: start, trump: undefined, folded: false };
  for (const line of say.intro(start, deal.colours, handText(hand))) io.show(line);
  for (const phase of PHASE_ORDER) {
    if (phase === "play" || phase === "payment") break;
    // Recomputed each time: a raise or a choice can change the contract and so the phases still to come.
    if (phase === "bidding" || !phasesFor(walk.contract, ruleset).includes(phase)) continue;
    await STEPS[phase](walk);
    if (walk.folded) {
      io.show(say.folded(walk.contract.name));
      return;
    }
  }
  io.show(say.ready(walk.contract, walk.trump));
};
