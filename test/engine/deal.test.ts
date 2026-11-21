import { describe, expect, it } from "vitest";
import {
  activeSeats, coloursFrom, createRng, dealCards, dealFromPack, formatCard, newPack, parseCard, rolesFor, suitFactor,
} from "../../src/engine/index.js";

describe("dealing a giv", () => {
  const deal = dealCards(0, 4, createRng(2026));

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
    const again = dealCards(0, 4, createRng(2026));
    expect(JSON.parse(JSON.stringify(again))).toEqual(JSON.parse(JSON.stringify(deal)));
    expect(again).toEqual(deal);
    expect(dealCards(0, 4, createRng(2027)).talon).not.toEqual(deal.talon);
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
  const roles = rolesFor(0, 4);
  const { dealtHands, talon } = dealFromPack(pack, roles);
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
});

describe("Färg", () => {
  it("♦E gives hf ♦, af ♥ and the black suits as Ofärg (SPEC §11 example)", () => {
    const colours = coloursFrom(parseCard("♦E"));
    expect(colours.topSuit).toBe("diamonds");
    expect(colours.secondSuit).toBe("hearts");
    expect([...colours.offSuits].sort()).toEqual(["clubs", "spades"]);
  });

  it("pays Ofärg ×1, Andra Färg ×2, Högsta Färg ×4", () => {
    const colours = coloursFrom(parseCard("♠7"));
    expect(suitFactor("spades", colours)).toBe(4);
    expect(suitFactor("clubs", colours)).toBe(2);
    expect(suitFactor("hearts", colours)).toBe(1);
    expect(suitFactor("diamonds", colours)).toBe(1);
  });
});
