import { describe, expect, it } from "vitest";
import {
  CONTRACTS, contractById, coloursFrom, FIVE_PLAYERS, FOUR_PLAYERS, parseCard, payment, rolesFor, THREE_PLAYERS, type Outcome,
  type Ruleset, type Suit,
} from "../../src/engine/index.js";

// SPEC.md §11: the Färg card ♦E makes ♦ Högsta Färg (hf), ♥ Andra Färg (af, "f"), ♣ ♠ Ofärger (of).
const colours = coloursFrom(parseCard("♦E"));
const OF: Suit = "clubs";
const AF: Suit = "hearts";
const HF: Suit = "diamonds";

/** Lomber in FH; förste försvarare is MH and andre EH (buying order medsols from lomber). */
const roles = rolesFor(0, FOUR_PLAYERS);
const order = [roles.forehand, roles.middlehand, roles.dealer, roles.restingSeats[0] ?? -1];

const pay = (id: string, trump: Suit | undefined, outcome: Outcome, rebuys = 0) =>
  payment({ roles, declarer: roles.forehand, contract: contractById(id), trump, colours, outcome, rebuys }, FOUR_PLAYERS);

/** Lomber, förste försvarare, andre försvarare, vilande. */
const inOrder = (points: Readonly<Record<number, number>>): number[] => order.map((seat) => points[seat] ?? Number.NaN);

describe("payment: the cases in SPEC.md §11", () => {
  it.each([
    ["Begär (Π0) hemgång", "begar-6", OF, "made", 0, [36, -12, -12, -12]],
    ["Begär betspel", "begar-6", OF, "defeated", 0, [-36, 12, 12, 12]],
    ["Begär kodilj", "begar-6", OF, "doubleDefeated", 0, [-72, 24, 24, 24]],
    ["Sjuspel af (Π1) hemgång", "begar-7", AF, "made", 0, [40, -14, -14, -12]],
    ["Sjuspel of kodilj", "begar-7", OF, "doubleDefeated", 0, [-74, 25, 25, 24]],
    ["8-spel f (Π2) hemgång", "begar-8", AF, "made", 0, [44, -16, -16, -12]],
    ["Vingel 6 of hemgång", "vingel-6", OF, "made", 0, [76, -26, -26, -24]],
    ["Vingel 6 af lagt spel", "vingel-6", AF, "folded", 0, [-80, 28, 28, 24]],
    ["Solo 7 of (Π4) hemgång", "solo-7", OF, "made", 0, [44, -16, -16, -12]],
    ["Solo 8 of (Π8) hemgång", "solo-8", OF, "made", 0, [52, -20, -20, -12]],
    ["Turné 6 hf hemgång after one Omköp", "turne-6", HF, "made", 1, [8, -4, -4, 0]],
    // §11 lists +56 −52 −4 0, with böter of one bet from förste försvarare for the tjuvpass; böter come with #14.
    ["Gökunge (Π4/3, misär ×3) hemgång, before böter", "gokunge", undefined, "made", 0, [44, -16, -16, -12]],
    ["Köp 4 betspel", "kop-4", undefined, "defeated", 0, [-36, 12, 12, 12]],
    ["Minusgask misär hemgång", "gask--1-misere", undefined, "made", 0, [30, -9, -9, -12]],
    ["Minusgask misär betspel (no Modpinnar)", "gask--1-misere", undefined, "defeated", 0, [-30, 9, 9, 12]],
    ["Minusgask misär kodilj", "gask--1-misere", undefined, "doubleDefeated", 0, [-66, 21, 21, 24]],
    ["Minusgask misär lagt spel (Fegpinnar)", "gask--1-misere", undefined, "folded", 0, [-36, 12, 12, 12]],
  ] as const)("%s", (_, id, trump, outcome, rebuys, expected) => {
    expect(inOrder(pay(id, trump, outcome, rebuys).total)).toEqual(expected);
  });

  it("gives the protocol's rows: Vingel 6 of hemgång (SPEC.md §9)", () => {
    const rows = pay("vingel-6", OF, "made");
    expect(inOrder(rows.pins)).toEqual([4, -2, -2, 0]);
    expect(inOrder(rows.rebuys)).toEqual([0, 0, 0, 0]);
    expect(inOrder(rows.bets)).toEqual([72, -24, -24, -24]);
  });

  it("each Omköp costs as many bets as a hemgång gives: ×2 in Vingel", () => {
    expect(inOrder(pay("begar-6", OF, "made", 2).rebuys)).toEqual([-72, 24, 24, 24]);
    expect(inOrder(pay("vingel-6", OF, "made", 1).rebuys)).toEqual([-72, 24, 24, 24]);
  });
});

describe("payment: every giv sums to zero", () => {
  const outcomes: Outcome[] = ["made", "defeated", "doubleDefeated", "folded"];
  it.each([THREE_PLAYERS, FOUR_PLAYERS, FIVE_PLAYERS])("$name: every contract, outcome and trumf", (ruleset: Ruleset) => {
    for (let dealer = 0; dealer < ruleset.playerCount; dealer++) {
      const r = rolesFor(dealer, ruleset);
      for (const contract of CONTRACTS) {
        const trumps: (Suit | undefined)[] = contract.goal.kind === "misere" ? [undefined] : [OF, AF, HF];
        for (const trump of trumps) {
          for (const outcome of outcomes) {
            const paid = payment({ roles: r, declarer: r.middlehand, contract, trump, colours, outcome, rebuys: 1 }, ruleset);
            const total = Object.values(paid.total);
            expect(total).toHaveLength(ruleset.playerCount);
            expect(total.reduce((a, b) => a + b, 0), `${contract.id} ${outcome}`).toBe(0);
            expect(total.every(Number.isInteger), `${contract.id} ${outcome}`).toBe(true);
          }
        }
      }
    }
  });

  it("a bet is shared by everyone but lomber: 18p each at spel på tre, 9p at fem", () => {
    const shares = [THREE_PLAYERS, FIVE_PLAYERS].map((ruleset) => {
      const r = rolesFor(0, ruleset);
      const paid = payment({ roles: r, declarer: r.forehand, contract: contractById("begar-6"), trump: OF, colours, outcome: "made", rebuys: 0 }, ruleset);
      return Object.values(paid.bets).filter((p) => p < 0);
    });
    expect(shares).toEqual([[-18, -18], [-9, -9, -9, -9]]);
  });
});

describe("payment: refused setups", () => {
  it("a trumf game without its trumf", () => {
    expect(() => pay("begar-6", undefined, "made")).toThrow(/has none/);
  });

  it("lomber not at the table, or a broken number of Omköp", () => {
    const contract = contractById("begar-6");
    const base = { roles, contract, trump: OF, colours, outcome: "made" as const };
    expect(() => payment({ ...base, declarer: roles.restingSeats[0] ?? -1, rebuys: 0 }, FOUR_PLAYERS)).toThrow(/active seat/);
    expect(() => payment({ ...base, declarer: roles.forehand, rebuys: -1 }, FOUR_PLAYERS)).toThrow(/Omköp/);
  });

  it("a price that doesn't give whole points", () => {
    expect(() =>
      payment({ roles, declarer: roles.forehand, contract: contractById("begar-6"), trump: OF, colours, outcome: "made", rebuys: 0, price: { num: 4, den: 3 } }, FOUR_PLAYERS),
    ).toThrow(/whole number/);
  });
});
