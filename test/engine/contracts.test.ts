import { describe, expect, it } from "vitest";
import {
  BIDDING_TABLE, bidById, compareLevels, CONTRACTS, contractById, contractsOf, formatLevel, type Contract,
} from "../../src/engine/index.js";

describe("the contract records", () => {
  it("have unique ids", () => {
    expect(new Set(CONTRACTS.map((c) => c.id)).size).toBe(CONTRACTS.length);
    expect(new Set(BIDDING_TABLE.map((b) => b.id)).size).toBe(BIDDING_TABLE.length);
  });

  it("are each reached by exactly one bid, on the same level", () => {
    for (const contract of CONTRACTS) {
      const bids = BIDDING_TABLE.filter((bid) => bid.contracts.includes(contract.id));
      expect(bids, contract.id).toHaveLength(1);
      expect(compareLevels(bids[0]?.level ?? contract.level, contract.level), contract.id).toBe(0);
    }
  });

  it("are plain data", () => {
    expect(JSON.parse(JSON.stringify(CONTRACTS))).toEqual(CONTRACTS);
    expect(JSON.parse(JSON.stringify(BIDDING_TABLE))).toEqual(BIDDING_TABLE);
  });

  it("are consistent: misär has no trumf, a Petite plays 12 cards, a turn-up is bought", () => {
    for (const c of CONTRACTS) {
      if (c.goal.kind === "misere") expect(c.trump, c.id).toBe("none");
      else expect(c.trump, c.id).not.toBe("none");
      if (c.handSize === 12) expect(c.goal.kind, c.id).toBe("misere");
      if (c.turnUp?.bought === "must") expect(c.buy, c.id).toMatchObject({ kind: "blind", min: c.turnUp.cards });
      if (c.swap !== null) expect(c.turnUp?.bought, c.id).toBe("never");
      if (c.payment.factor === "misere") expect(c.goal.kind, c.id).toBe("misere");
      if (c.goal.kind === "misere") expect(["misere", "offSuit"], c.id).toContain(c.payment.factor);
      if (!["vingel", "tringel"].includes(c.family)) expect(c.payment.multiplier, c.id).toBe(1);
      // A Petite gets down to 12 in a discard phase, except a Tupp, which kastar as it swaps.
      if (c.handSize === 12 && c.swap === null) expect(c.discard?.downTo, c.id).toBe(12);
      if (c.discard?.mayKeepMore) expect(c.goal.kind, c.id).toBe("misere");
    }
  });
});

describe("the budtabell (SPEC.md §3)", () => {
  it("runs from the lowest level up", () => {
    for (let i = 1; i < BIDDING_TABLE.length; i++) {
      const [before, after] = [BIDDING_TABLE[i - 1], BIDDING_TABLE[i]];
      if (before && after) expect(compareLevels(before.level, after.level)).toBeLessThanOrEqual(0);
    }
  });

  it.each([
    ["gask--1", "−1", "hahalj"], ["begar-6", "0", "4h"], ["gask-0", "0", "haja"],
    ["vingel-6", "1", "3d"], ["turne-6", "1", "3h"], ["begar-7", "1", "3f"], ["gask-1", "1", "haj"],
    ["vingel-7", "2", "2dh"], ["turne-7", "2", "2h"], ["begar-8", "2", "2of"], ["gask-2", "2", "ha"], ["kop-4", "2", "2a"],
    ["vingel-8", "3", "d2h"], ["turne-8", "3", "h"], ["begar-9", "3", "2h"], ["gask-3", "3", "ha"],
    ["gask-4", "4", "ha"], ["kop-3", "4", "a"], ["tringel-9", "4", "3h"],
  ])("%s is on level %s with AK %s", (id, lvl, ak) => {
    const bid = bidById(id);
    expect(formatLevel(bid.level)).toBe(lvl);
    expect(bid.passingRequirement).toBe(ak);
  });

  it.each([
    ["gokagg", "0", "lala", "l"], ["gokunge", "4/3", "lal", "l"], ["muntergok", "3", "LL", "L"],
  ])("%s is on level %s with AK %s / %s", (id, lvl, first, second) => {
    const bid = bidById(id);
    expect(formatLevel(bid.level)).toBe(lvl);
    expect(bid.passingRequirement).toEqual({ first, second });
  });

  it.each([
    ["solo-6", "2"], ["solo-7", "4"], ["solo-8", "8"], ["solo-9", "16"], ["solo-10", "32"],
    ["solo-11", "64"], ["solo-12", "128"], ["solo-13", "256"], ["begar-10", "6"], ["gask-6", "6"], ["gask-5", "8"],
    ["kop-2", "6"], ["kop-1", "8"], ["gask-13", "12"],
  ])("%s is on level %s", (id, lvl) => {
    expect(formatLevel(bidById(id).level)).toBe(lvl);
  });
});

describe("the budtabell: what the tests above don't name", () => {
  it("only these bids have no AK: Gask på 6, 5 and Vira, 10-spel, Köp 2 and 1, and every Solo", () => {
    const withoutAk = BIDDING_TABLE.filter((b) => b.passingRequirement === undefined).map((b) => b.id);
    const expected = ["gask-6", "gask-5", "gask-13", "begar-10", "kop-2", "kop-1"];
    expect(withoutAk.filter((id) => !id.startsWith("solo")).sort()).toEqual(expected.sort());
    for (const b of BIDDING_TABLE.filter((b) => b.family === "solo")) expect(b.passingRequirement, b.id).toBeUndefined();
  });

  it.each([
    ["solo-level-3", "3", "PF", 6], ["solo-level-6", "6", "GF", 7], ["solo-level-12", "12", "P", 8],
    ["solo-level-24", "24", "G", 9], ["solo-level-48", "48", "PO", 10], ["solo-level-96", "96", "GO", 11],
    ["solo-level-192", "192", "POR", 12], ["solo-level-384", "384", "GOR", 13],
  ] as const)("%s is on level %s: Solo misär %s or Hope Solo %i", (id, lvl, size, tricks) => {
    const b = bidById(id);
    expect(formatLevel(b.level)).toBe(lvl);
    const [misereGame, hope] = contractsOf(b) as [Contract, Contract];
    expect(misereSize(misereGame)).toBe(size);
    expect(hope).toMatchObject({ family: "hopeSolo", goal: { kind: "tricks", min: tricks } });
  });

  it("a single-contract bid has its contract's id, name, family and level", () => {
    for (const b of BIDDING_TABLE.filter((b) => b.contracts.length === 1 && !b.id.startsWith("gask"))) {
      const c = contractById(b.id);
      expect([b.name, b.family, compareLevels(b.level, c.level)], b.id).toEqual([c.name, c.family, 0]);
    }
  });
});

describe("Gask", () => {
  it.each([
    [-1, 6, "PF"], [0, 7, "GF"], [1, 8, "P"], [2, 9, "G"], [3, 10, "PO"], [4, 11, "GO"],
  ])("Gask på %i: %i tricks in trumf, or misär %s, chosen after the köp", (n, tricks, size) => {
    const bid = bidById(`gask-${n}`);
    expect(bid.choice).toBe("afterBuy");
    const [trumpGame, misereGame] = contractsOf(bid) as [Contract, Contract];
    expect(trumpGame.goal).toEqual({ kind: "tricks", min: tricks });
    expect(trumpGame.trump).toBe("afterBuy");
    expect(misereSize(misereGame)).toBe(size);
  });

  it("Vira is Gask på 13: keep the whole givhand, trumf only, all 13 tricks", () => {
    const [vira, ...rest] = contractsOf(bidById("gask-13"));
    expect(rest).toHaveLength(0);
    expect(vira).toMatchObject({ name: "Vira (trumf)", goal: { kind: "tricks", min: 13 }, buy: { kind: "keepAndTakeTalon", keep: 13 } });
  });

  it("Gask på 6 and Gask på 5 are trumf only, 12 tricks", () => {
    for (const n of [6, 5]) {
      const contracts = contractsOf(bidById(`gask-${n}`));
      expect(contracts).toHaveLength(1);
      expect(contracts[0]?.goal).toEqual({ kind: "tricks", min: 12 });
    }
  });

  it("keeps n givkort and takes the whole talong; Minusgask lays its top card aside first", () => {
    expect(contractById("gask-0-misere").buy).toEqual({ kind: "keepAndTakeTalon", keep: 0 });
    expect(contractById("gask-5-trump").buy).toEqual({ kind: "keepAndTakeTalon", keep: 5 });
    for (const id of ["gask--1-trump", "gask--1-misere"]) {
      expect(contractById(id).turnUp, id).toEqual({ cards: 1, bought: "afterChoice", faceDown: true });
    }
    expect(contractById("gask-0-trump").turnUp).toBeNull();
  });

  it("kastar down to 13 after choosing trumf; misär may keep more, a Petite goes down to 12", () => {
    expect(contractById("gask-2-trump").discard).toEqual({ after: "choice", downTo: 13, mayKeepMore: false });
    expect(contractById("gask-2-misere").discard).toEqual({ after: "choice", downTo: 13, mayKeepMore: true });
    expect(contractById("gask-1-misere").discard).toEqual({ after: "choice", downTo: 12, mayKeepMore: true });
  });

  it("has no defence köp or Omköp, and only Minusgask is below zero (so only it has Fegpinnar)", () => {
    for (const c of CONTRACTS) expect(c.level.num < 0, c.id).toBe(c.id.startsWith("gask--1"));
    for (const c of CONTRACTS.filter((c) => c.family === "gask")) {
      expect(c.allowed.defenceBuy, c.id).toBe(false);
      expect(c.allowed.rebuy, c.id).toBe(false);
    }
  });
});

describe("the other families", () => {
  it("Köp 4 and Köp 2 (Petite) may kasta one more card after the last köp; Köp 3 and 1 don't", () => {
    for (const n of [4, 2]) expect(contractById(`kop-${n}`).discard).toEqual({ after: "buy", downTo: 12, mayKeepMore: true });
    for (const n of [3, 1]) expect(contractById(`kop-${n}`).discard).toBeNull();
  });

  it("Gök kastar (at most) 13 after taking the talong", () => {
    for (const id of ["gokagg", "gokunge", "muntergok"]) {
      expect(contractById(id).discard).toEqual({ after: "buy", downTo: 13, mayKeepMore: true });
    }
  });

  it("a blind köp in a trumf game swaps card for card: nothing to kasta afterwards", () => {
    for (const id of ["begar-6", "turne-7", "vingel-8"]) expect(contractById(id).discard).toBeNull();
  });

  it("a Solo Petite misär kastar its 13th card right after the bidding", () => {
    for (const id of ["solo-misere-pf", "solo-misere-p", "solo-misere-po", "solo-misere-por"]) {
      expect(contractById(id).discard, id).toEqual({ after: "bidding", downTo: 12, mayKeepMore: true });
    }
  });

  it("Köp N: buy at least N cards blind; misär PF, GF, P, G", () => {
    for (const [n, size] of [[4, "PF"], [3, "GF"], [2, "P"], [1, "G"]] as const) {
      const c = contractById(`kop-${n}`);
      expect(c.buy).toEqual({ kind: "blind", min: n, max: 13 });
      expect(c.allowed.rebuyMinTalon).toBe(n);
      expect(misereSize(c)).toBe(size);
    }
  });

  it("Turné turns up one card, Vingel two and pays double", () => {
    expect(contractById("turne-7")).toMatchObject({ trump: "turnUp", turnUp: { cards: 1, bought: "must", faceDown: false }, payment: { multiplier: 1 } });
    expect(contractById("vingel-7")).toMatchObject({ trump: "chooseFromTurnUp", turnUp: { cards: 2, bought: "must" }, payment: { multiplier: 2 } });
    expect(contractById("vingel-7").allowed.rebuyMinTalon).toBe(3);
    expect(contractById("tringel-9")).toMatchObject({
      trump: "chooseFromTurnUp", turnUp: { cards: 3, bought: "must" }, goal: { kind: "tricks", min: 9 }, payment: { multiplier: 3 }, allowed: { rebuyMinTalon: 4 },
    });
  });

  it.each([[3, "tRupp", "1", "4a"], [2, "tVupp", "2", "3a"], [1, "tTupp", "4", "2a"]] as const)(
    "%i turned up: %s on level %s, AK %s, one contract with a Höna variant", (n, name, lvl, ak) => {
      const bid = bidById(`tupp-${n}`);
      expect([bid.name, formatLevel(bid.level), bid.passingRequirement, bid.choice]).toEqual([name, lvl, ak, "none"]);
      const [tupp, ...others] = contractsOf(bid) as [Contract];
      expect(others).toHaveLength(0);
      // Turn up n bytkort (never bought), buy blind from the rest, then swap in at least one.
      expect(tupp.turnUp).toEqual({ cards: n, bought: "never", faceDown: false });
      expect(tupp.buy).toEqual({ kind: "blind", min: 0, max: 13 - n });
      // If the tuppstjärt stays empty, the giv becomes a Höna by itself: 13 + n cards, paid double.
      expect(tupp.swap).toEqual({
        min: 1, discardPerSwap: [2, 1, 0], whenTailEmpty: { name: `Höna (${name})`, handSize: 13 + n, multiplier: 2 },
      });
      expect(tupp).toMatchObject({ handSize: 12, goal: { kind: "misere", tricksAllowed: 0 }, payment: { multiplier: 1 } });
      expect(tupp.allowed).toEqual({ rebuy: true, rebuyMinTalon: n + 1, fold: true, defenceBuy: true });
    });

  it("Gök: pick 13 of 26; Gökunge's talong is open; Muntergök is Ouverte", () => {
    expect(contractById("gokagg").buy).toEqual({ kind: "pickFromHandAndTalon", openTalon: false });
    expect(contractById("gokunge").buy).toEqual({ kind: "pickFromHandAndTalon", openTalon: true });
    expect(misereSize(contractById("gokunge"))).toBe("G");
    expect(misereSize(contractById("muntergok"))).toBe("GO");
  });

  it("Solo: no köp for lomber, can't be folded, the defence buys", () => {
    for (const c of CONTRACTS.filter((c) => c.family === "solo" || c.family === "hopeSolo")) {
      expect(c.buy, c.id).toEqual({ kind: "none" });
      expect(c.allowed.fold, c.id).toBe(false);
      expect(c.allowed.defenceBuy, c.id).toBe(true);
    }
  });

  it("a Solo cell with a misär and a Hope Solo lets lomber choose after the bidding", () => {
    const bid = bidById("solo-level-3");
    expect(bid.choice).toBe("afterBidding");
    expect(bid.contracts).toEqual(["solo-misere-pf", "hope-solo-6"]);
  });

  it("Hope Solo and the Royale misärer are paid as Ofärg and played face up before the köp", () => {
    for (const id of ["hope-solo-6", "hope-solo-13", "solo-misere-por", "solo-misere-gor"]) {
      expect(contractById(id), id).toMatchObject({ visibility: "royale", payment: { factor: "offSuit" } });
    }
    expect(contractById("solo-misere-go").payment.factor).toBe("misere");
  });
});

/** The budtabell's letters for a misär contract: P/G, F, O, R. */
const misereSize = (c: Contract): string => {
  if (c.goal.kind !== "misere") return "not misär";
  return (c.handSize === 12 ? "P" : "G") + (c.goal.tricksAllowed === 1 ? "F" : "")
    + (c.visibility === "closed" ? "" : "O") + (c.visibility === "royale" ? "R" : "");
};
