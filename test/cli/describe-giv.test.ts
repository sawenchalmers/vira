import { describe, expect, it } from "vitest";
import { describeGiv, handText } from "../../src/cli/describe-giv.js";
import { dealCards, formatCard, parseCard } from "../../src/engine/index.js";

describe("describing a giv", () => {
  it("groups a hand by suit, highest rank first, with – for a void", () => {
    const hand = ["♠2", "♣K", "♠E", "♣10", "♦Kn"].map(parseCard);
    expect(handText(hand)).toBe("♣ K 10  ♥ –  ♠ E 2  ♦ Kn");
  });

  it("lists every seat's role, the three hands, the talong and Färg", () => {
    const text = describeGiv(dealCards(0, 4, 1, 2)).join("\n");
    expect(text).toContain("seat 0  EH (given)");
    expect(text).toContain("seat 1  FH");
    expect(text).toContain("seat 2  MH");
    expect(text).toMatch(/^seat 3 {2}vilande$/m);
  });

  it("prints the talong in order and the Färg card with its colours", () => {
    const deal = dealCards(0, 4, 1, 2);
    const text = describeGiv(deal).join("\n");
    expect(text).toContain(`talong (top first): ${deal.talon.map(formatCard).join(" ")}`);
    expect(text).toContain(`Färg: ${formatCard(deal.colours.colourCard)}`);
  });

  it("shows two vilande at spel på fem, wherever given sits", () => {
    const text = describeGiv(dealCards(2, 5, 3, 4)).join("\n");
    expect(text).toContain("seat 2  EH (given)");
    expect(text).toMatch(/^seat 1 {2}vilande$/m);
    expect(text).toMatch(/^seat 3 {2}vilande$/m);
    expect(text).toContain("seat 4  FH");
    expect(text).toContain("seat 0  MH");
  });

  it("shows no vilande at spel på tre", () => {
    const text = describeGiv(dealCards(1, 3, 5, 6)).join("\n");
    expect(text).not.toContain("vilande");
    expect(text).toContain("seat 2  FH");
    expect(text).toContain("seat 0  MH");
  });
});
