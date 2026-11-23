import { describe, expect, it } from "vitest";
import { CONTRACTS, contractById, FOUR_PLAYERS, PHASE_ORDER, phasesFor } from "../../src/engine/index.js";

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
    ["begar-6", ["bidding", "raise", "declare", "buy", "rebuy", "fold", "defenceBuy", "play", "payment"]],
    ["begar-10", ["bidding", "declare", "buy", "rebuy", "fold", "defenceBuy", "play", "payment"]],
    ["vingel-7", ["bidding", "raise", "turnUp", "buy", "rebuy", "fold", "defenceBuy", "play", "payment"]],
    ["gask-2-trump", ["bidding", "raise", "buy", "chooseAfterBuy", "discard", "fold", "play", "payment"]],
    ["gask-3-misere", ["bidding", "raise", "buy", "chooseAfterBuy", "discard", "fold", "showHandBeforePlay", "play", "payment"]],
    ["gask-13-trump", ["bidding", "buy", "chooseAfterBuy", "discard", "fold", "play", "payment"]],
    ["kop-4", ["bidding", "raise", "buy", "rebuy", "discard", "fold", "defenceBuy", "play", "payment"]],
    ["kop-3", ["bidding", "raise", "buy", "rebuy", "fold", "defenceBuy", "play", "payment"]],
    ["tupp-3", ["bidding", "raise", "turnUp", "buy", "swap", "rebuy", "fold", "defenceBuy", "play", "payment"]],
    ["gokunge", ["bidding", "raise", "buy", "discard", "fold", "play", "payment"]],
    ["solo-7", ["bidding", "raise", "declare", "defenceBuy", "play", "payment"]],
    ["solo-misere-pf", ["bidding", "raise", "declare", "discardAfterBidding", "defenceBuy", "play", "payment"]],
    ["hope-solo-6", ["bidding", "raise", "declare", "showHandBeforeBuy", "defenceBuy", "play", "payment"]],
    ["solo-misere-gor", ["bidding", "declare", "showHandBeforeBuy", "defenceBuy", "play", "payment"]],
  ])("%s", (id, expected) => {
    expect(phases(id)).toEqual(expected);
  });
});
