import { describe, expect, it } from "vitest";
import { contractById, parseCard, turnUpCards } from "../../src/engine/index.js";

const talon = ["♥K", "♠7", "♦E", "♣2"].map(parseCard);

describe("the cards laid out before the köp", () => {
  it.each([
    ["turne-7", ["♥K"]],
    ["vingel-7", ["♥K", "♠7"]],
    ["tringel-9", ["♥K", "♠7", "♦E"]],
    ["tupp-2", ["♥K", "♠7"]],
    ["gask--1-trump", ["♥K"]],
    ["begar-6", []],
    ["gask-0-trump", []],
  ])("%s lays out the top cards %j", (id, expected) => {
    expect(turnUpCards(talon, contractById(id))).toEqual(expected.map(parseCard));
  });
});
