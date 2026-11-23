import { describe, expect, it } from "vitest";
import {
  activeSeats, BIDDING_TABLE, PACK_SIZE, RULESETS, rolesFor, rulesetFor, FIVE_PLAYERS, FOUR_PLAYERS, THREE_PLAYERS,
} from "../../src/engine/index.js";

describe("the ruleset for spel på fyra (SPEC.md §1–2, §4.1, §6)", () => {
  it("has four players, with the seat right of given resting", () => {
    expect(FOUR_PLAYERS.playerCount).toBe(4);
    expect(FOUR_PLAYERS.restingSeats).toEqual([-1]);
  });

  it("deals 4 cards each, then 3, until 13 remain for the talong", () => {
    expect(FOUR_PLAYERS.deal).toEqual({ firstPacket: 4, packet: 3, talonSize: 13 });
  });

  it("pays Högsta Färg ×4, Andra Färg ×2, Ofärg ×1 and misär ×3", () => {
    expect(FOUR_PLAYERS.paymentFactors).toEqual({ topSuit: 4, secondSuit: 2, offSuit: 1, misere: 3 });
  });

  it("has a bet of 36p, a pinne of 6p and böter of one bet", () => {
    expect(FOUR_PLAYERS.stake.betPoints).toBe(36);
    expect(FOUR_PLAYERS.pinPoints).toBe(6);
    expect(FOUR_PLAYERS.penalty.bets).toBe(1);
  });

  it("plays the house budtabell", () => {
    expect(FOUR_PLAYERS.biddingTable).toBe(BIDDING_TABLE);
  });
});

describe("all rulesets", () => {
  it("spel på tre, fyra and fem differ only in the player count and the vilande", () => {
    const shared = ["deal", "paymentFactors", "stake", "pinPoints", "penalty", "biddingTable"] as const;
    for (const key of shared) {
      expect(THREE_PLAYERS[key], key).toEqual(FOUR_PLAYERS[key]);
      expect(FIVE_PLAYERS[key], key).toEqual(FOUR_PLAYERS[key]);
    }
    expect(Object.keys(FOUR_PLAYERS).sort()).toEqual([...shared, "id", "name", "playerCount", "restingSeats"].sort());
    expect([THREE_PLAYERS.restingSeats, FIVE_PLAYERS.restingSeats]).toEqual([[], [-1, 1]]);
  });

  it.each(RULESETS)("$name leaves exactly three active seats for every given", (ruleset) => {
    for (let dealer = 0; dealer < ruleset.playerCount; dealer++) {
      const roles = rolesFor(dealer, ruleset);
      expect(new Set(activeSeats(roles)).size).toBe(3);
      expect(roles.restingSeats).toHaveLength(ruleset.playerCount - 3);
    }
  });

  it.each(RULESETS)("$name's packets add up to 13 cards each, with the rest for the talong", (ruleset) => {
    const { firstPacket, packet, talonSize } = ruleset.deal;
    const perSeat = (PACK_SIZE - talonSize) / 3;
    expect(Number.isInteger((perSeat - firstPacket) / packet)).toBe(true);
    expect(perSeat).toBe(13);
  });

  it("are found by player count", () => {
    expect(rulesetFor(4)).toBe(FOUR_PLAYERS);
    expect(rulesetFor(3)).toBe(THREE_PLAYERS);
    expect(rulesetFor(5)).toBe(FIVE_PLAYERS);
  });

  it("are plain data", () => {
    expect(JSON.parse(JSON.stringify(RULESETS))).toEqual(RULESETS);
  });
});
