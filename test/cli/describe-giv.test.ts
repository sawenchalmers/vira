import { describe, expect, it } from "vitest";
import { describeGiv, handText } from "../../src/cli/describe-giv.js";
import { dealCards, parseCard } from "../../src/engine/index.js";

describe("describing a giv", () => {
  it("groups a hand by suit, highest rank first, with – for a void", () => {
    const hand = ["♠2", "♣K", "♠E", "♣10", "♦Kn"].map(parseCard);
    expect(handText(hand)).toBe("♣ K 10  ♥ –  ♠ E 2  ♦ Kn");
  });

  it("lists every seat's role, the three hands, the talong and Färg", () => {
    const lines = describeGiv(dealCards(0, 4, 1, 2));
    const text = lines.join("\n");
    expect(text).toContain("seat 0  EH (given)");
    expect(text).toContain("seat 1  FH");
    expect(text).toContain("seat 2  MH");
    expect(text).toContain("seat 3  vilande");
    expect(text).toMatch(/^Färg: /m);
    expect(text).toMatch(/^talong \(top first\): (\S+ ){12}\S+$/m);
  });
});
