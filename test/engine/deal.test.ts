import { describe, expect, it } from "vitest";
import {
  activeSeats, coloursFrom, cutPack, dealCards, deriveSeed, dealFromPack, formatCard, newPack, parseCard, rolesFor, rulesetFor,
  FOUR_PLAYERS, suitFactor,
} from "../../src/engine/index.js";

describe("dealing a giv", () => {
  const deal = dealCards(0, rulesetFor(4), 2026, 2027);

  it("gives 13 cards each to FH, MH and EH and 13 to the talong", () => {
    for (const seat of activeSeats(deal.roles)) expect(deal.dealtHands[seat]).toHaveLength(13);
    expect(deal.talon).toHaveLength(13);
    for (const seat of deal.roles.restingSeats) expect(deal.dealtHands[seat]).toBeUndefined();
    expect(Object.keys(deal.dealtHands)).toHaveLength(3);
  });

  it("uses every card exactly once", () => {
    const all = [...Object.values(deal.dealtHands).flatMap((hand) => hand ?? []), ...deal.talon].map(formatCard);
    expect(all).toHaveLength(52);
    expect(new Set(all).size).toBe(52);
  });

  it("is the same for the same seed and different for another", () => {
    expect(dealCards(0, rulesetFor(4), 2026, 2027)).toEqual(deal);
    expect(dealCards(0, rulesetFor(4), 2028, 2027)).not.toEqual(deal);
    expect([deal.seed, deal.nextSeed]).toEqual([2026, 2027]);
  });

  it("is plain data that survives JSON unchanged", () => {
    expect(JSON.parse(JSON.stringify(deal))).toEqual(deal);
  });

  it.each([3, 5] as const)("deals to the three active seats only, with %i players", (count) => {
    const other = dealCards(0, rulesetFor(count), 7, 8);
    for (const seat of activeSeats(other.roles)) expect(other.dealtHands[seat]).toHaveLength(13);
    for (const seat of other.roles.restingSeats) expect(other.dealtHands[seat]).toBeUndefined();
    expect(other.talon).toHaveLength(13);
  });

  it("takes the Färg card from the bottom of the next giv's pack, before that pack is cut", () => {
    for (let parti = 0; parti < 50; parti++) {
      const [s0, s1, s2] = [0, 1, 2].map((giv) => deriveSeed(parti, giv)) as [number, number, number];
      const colourCard = dealCards(0, rulesetFor(4), s0, s1).colours.colourCard;
      const next = dealCards(1, rulesetFor(4), s1, s2);
      const nextCards = [...Object.values(next.dealtHands).flatMap((hand) => hand ?? []), ...next.talon].map(formatCard);
      expect(nextCards).toContain(formatCard(colourCard)); // dealt in the next giv …
      expect(formatCard(next.talon.at(-1) ?? colourCard) === formatCard(colourCard)).toBe(false); // … but the cut moved it from the bottom
    }
  });

  it("sets the colours from a Färg card", () => {
    const { colourCard, topSuit, secondSuit, offSuits } = deal.colours;
    expect(topSuit).toBe(colourCard.suit);
    expect(new Set([topSuit, secondSuit, ...offSuits]).size).toBe(4);
  });
});

describe("the order of dealing", () => {
  // An unshuffled pack, so each card's position shows where it went.
  const pack = newPack();
  const roles = rolesFor(0, rulesetFor(4));
  const { dealtHands, talon } = dealFromPack(pack, roles, FOUR_PLAYERS);
  const positions = (cards: readonly unknown[] | undefined) => (cards ?? []).map((card) => pack.indexOf(card as never));
  const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

  it("deals 4 each to FH, MH and EH, then 3 each until 13 remain", () => {
    expect(positions(dealtHands[roles.forehand])).toEqual([...range(0, 4), ...range(12, 3), ...range(21, 3), ...range(30, 3)]);
    expect(positions(dealtHands[roles.middlehand])).toEqual([...range(4, 4), ...range(15, 3), ...range(24, 3), ...range(33, 3)]);
    expect(positions(dealtHands[roles.dealer])).toEqual([...range(8, 4), ...range(18, 3), ...range(27, 3), ...range(36, 3)]);
  });

  it("leaves the last 13 cards as the talong, top card first", () => {
    expect(positions(talon)).toEqual(range(39, 13));
  });

  it("cuts by putting the lifted top cards underneath", () => {
    const cut = cutPack(pack, 5);
    expect(positions(cut)).toEqual([...range(5, 47), ...range(0, 5)]);
    expect(() => cutPack(pack, 0)).toThrow();
    expect(() => cutPack(pack, 52)).toThrow();
  });

  it("only deals a full pack", () => {
    expect(() => dealFromPack(pack.slice(1), roles, FOUR_PLAYERS)).toThrow();
    expect(() => dealFromPack([...pack, pack[0] as never], roles, FOUR_PLAYERS)).toThrow();
  });
});

describe("Färg", () => {
  it("♦E gives hf ♦, af ♥ and the black suits as Ofärg (SPEC §11 example)", () => {
    const colours = coloursFrom(parseCard("♦E"));
    expect(colours.topSuit).toBe("diamonds");
    expect(colours.secondSuit).toBe("hearts");
    expect([...colours.offSuits].sort()).toEqual(["clubs", "spades"]);
  });

  it.each([
    ["♣9", "clubs", "spades", ["diamonds", "hearts"]],
    ["♥K", "hearts", "diamonds", ["clubs", "spades"]],
    ["♠2", "spades", "clubs", ["diamonds", "hearts"]],
  ])("%s gives hf %s and af %s", (card, top, second, off) => {
    const colours = coloursFrom(parseCard(card));
    expect([colours.topSuit, colours.secondSuit, [...colours.offSuits].sort()]).toEqual([top, second, off]);
  });

  it("pays Ofärg ×1, Andra Färg ×2, Högsta Färg ×4", () => {
    const colours = coloursFrom(parseCard("♠7"));
    expect(suitFactor("spades", colours, FOUR_PLAYERS)).toBe(4);
    expect(suitFactor("clubs", colours, FOUR_PLAYERS)).toBe(2);
    expect(suitFactor("hearts", colours, FOUR_PLAYERS)).toBe(1);
    expect(suitFactor("diamonds", colours, FOUR_PLAYERS)).toBe(1);
  });
});
