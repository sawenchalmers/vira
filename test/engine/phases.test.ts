import { describe, expect, it } from "vitest";
import {
  BIDDING_TABLE, bidById, bidPhases, CONTRACTS, contractById, FOUR_PLAYERS, PHASE_ORDER, phasesFor,
} from "../../src/engine/index.js";

const phases = (id: string) => phasesFor(contractById(id), FOUR_PLAYERS);

describe("the phases of a giv", () => {
  it("every contract starts with the bidding and ends with play and payment, in the fixed order", () => {
    for (const c of CONTRACTS) {
      const list = phasesFor(c, FOUR_PLAYERS);
      expect(list[0], c.id).toBe("bidding");
      expect(list.slice(-2), c.id).toEqual(["play", "payment"]);
      const positions = list.map((p) => PHASE_ORDER.indexOf(p));
      expect(positions, c.id).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it.each([
    ["begar-6", ["bidding", "raise", "declareTrump", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["begar-10", ["bidding", "declareTrump", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["turne-7", ["bidding", "raise", "turnUp", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["vingel-7", ["bidding", "raise", "turnUp", "declareTrump", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["tringel-9", ["bidding", "turnUp", "declareTrump", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["gask--1-trump", ["bidding", "raise", "turnUp", "buy", "chooseAfterBuy", "discard", "fold", "play", "payment"]],
    ["gask-2-trump", ["bidding", "raise", "buy", "chooseAfterBuy", "discard", "fold", "play", "payment"]],
    ["gask-3-misere", ["bidding", "raise", "buy", "chooseAfterBuy", "discard", "fold", "showHandBeforePlay", "play", "payment"]],
    ["gask-13-trump", ["bidding", "buy", "chooseAfterBuy", "discard", "fold", "play", "payment"]],
    ["kop-4", ["bidding", "raise", "buy", "rebuy", "discard", "defenceBuy", "fold", "play", "payment"]],
    ["kop-3", ["bidding", "raise", "buy", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["tupp-3", ["bidding", "raise", "turnUp", "buy", "swap", "rebuy", "defenceBuy", "fold", "play", "payment"]],
    ["gokunge", ["bidding", "raise", "buy", "discard", "fold", "play", "payment"]],
    ["muntergok", ["bidding", "buy", "discard", "fold", "showHandBeforePlay", "play", "payment"]],
    ["solo-7", ["bidding", "raise", "declareTrump", "defenceBuy", "play", "payment"]],
    ["solo-13", ["bidding", "raise", "declareTrump", "defenceBuy", "play", "payment"]],
    ["solo-misere-pf", ["bidding", "raise", "chooseContract", "discardAfterBidding", "defenceBuy", "play", "payment"]],
    ["hope-solo-6", ["bidding", "raise", "chooseContract", "declareTrump", "showHandBeforeBuy", "defenceBuy", "play", "payment"]],
    ["solo-misere-gor", ["bidding", "chooseContract", "showHandBeforeBuy", "defenceBuy", "play", "payment"]],
  ])("%s", (id, expected) => {
    expect(phases(id)).toEqual(expected);
  });
});

describe("raising (ta större) goes to any higher bid of the same family", () => {
  it("any Solo can be raised to a higher Solo cell, trumf, misär or Hope Solo, until the top", () => {
    expect(bidPhases(bidById("solo-13"), FOUR_PLAYERS)).toContain("raise");
    expect(bidPhases(bidById("solo-level-192"), FOUR_PLAYERS)).toContain("raise");
    expect(bidPhases(bidById("solo-level-384"), FOUR_PLAYERS)).not.toContain("raise");
  });

  it("the top bid of each family can't be raised", () => {
    for (const id of ["begar-10", "tringel-9", "gask-13", "kop-1", "muntergok"]) {
      expect(bidPhases(bidById(id), FOUR_PLAYERS), id).not.toContain("raise");
    }
  });

  it("is read from the ruleset's budtabell", () => {
    const onlyThisBid = { ...FOUR_PLAYERS, biddingTable: BIDDING_TABLE.filter((b) => b.id === "begar-6") };
    expect(bidPhases(bidById("begar-6"), onlyThisBid)).not.toContain("raise");
  });
});
