import { describe, expect, it } from "vitest";
import { colourOf, formatCard, newPack, parseCard, parseSuit, rankValue, sameCard } from "../../src/engine/index.js";

describe("cards", () => {
  it("has a pack of 52 different cards", () => {
    const pack = newPack();
    expect(pack).toHaveLength(52);
    expect(new Set(pack.map(formatCard)).size).toBe(52);
  });

  it("ranks the ace highest and the two lowest", () => {
    expect(rankValue("ace")).toBe(14);
    expect(rankValue("ace")).toBeGreaterThan(rankValue("king"));
    expect(rankValue("king")).toBeGreaterThan(rankValue("queen"));
    expect(rankValue("queen")).toBeGreaterThan(rankValue("jack"));
    expect(rankValue("jack")).toBeGreaterThan(rankValue("10"));
    expect(rankValue("10")).toBeGreaterThan(rankValue("9"));
    expect(rankValue("2")).toBe(2);
  });

  it("knows the colours", () => {
    expect([colourOf("clubs"), colourOf("spades")]).toEqual(["black", "black"]);
    expect([colourOf("hearts"), colourOf("diamonds")]).toEqual(["red", "red"]);
  });
});

describe("notation", () => {
  it.each([
    ["♠Kn", { suit: "spades", rank: "jack" }],
    ["♥E", { suit: "hearts", rank: "ace" }],
    ["♦D", { suit: "diamonds", rank: "queen" }],
    ["♣10", { suit: "clubs", rank: "10" }],
    ["♣2", { suit: "clubs", rank: "2" }],
  ] as const)("reads and writes %s", (text, card) => {
    expect(parseCard(text)).toEqual(card);
    expect(formatCard(card)).toBe(text);
  });

  it("round-trips every card", () => {
    for (const card of newPack()) expect(sameCard(parseCard(formatCard(card)), card)).toBe(true);
  });

  it.each([
    ["skn", { suit: "spades", rank: "jack" }],
    ["Sp D", { suit: "spades", rank: "queen" }],
    ["kk", { suit: "clubs", rank: "king" }],
    ["kkn", { suit: "clubs", rank: "jack" }],
    ["kl10", { suit: "clubs", rank: "10" }],
    ["hje", { suit: "hearts", rank: "ace" }],
    ["H 2", { suit: "hearts", rank: "2" }],
    ["r7", { suit: "diamonds", rank: "7" }],
    ["RU K", { suit: "diamonds", rank: "king" }],
    ["♠ kn", { suit: "spades", rank: "jack" }],
    ["♠️Kn", { suit: "spades", rank: "jack" }], // the emoji form of ♠
  ] as const)("accepts the alias %j", (text, card) => {
    expect(parseCard(text)).toEqual(card);
  });

  it.each(["", "♠", "Kn", "♠A", "♠1", "♠Knx", "kl", "x7", "spa", "kn", "♣1 0", "s p d"])("rejects %j", (text) => {
    expect(() => parseCard(text)).toThrow();
  });
});

describe("suit notation", () => {
  it.each([["♥", "hearts"], ["♥️", "hearts"], ["hj", "hearts"], ["H", "hearts"], [" kl ", "clubs"], ["s", "spades"], ["Ru", "diamonds"]])(
    "reads %j", (text, suit) => {
      expect(parseSuit(text)).toBe(suit);
    },
  );

  it.each([[""], ["x"], ["hjärter"], ["♥E"]])("rejects %j", (text) => {
    expect(() => parseSuit(text)).toThrow();
  });
});
