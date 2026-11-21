import { describe, expect, it } from "vitest";
import { activeSeats, createRng, drawSeating, nextDealer, rolesFor, shuffle } from "../../src/engine/index.js";

describe("seeded randomness", () => {
  it("gives the same shuffle for the same seed", () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    expect(shuffle(items, createRng(42))).toEqual(shuffle(items, createRng(42)));
    expect(shuffle(items, createRng(42))).not.toEqual(shuffle(items, createRng(43)));
  });

  it("shuffles into a permutation and leaves the input alone", () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = shuffle(items, createRng(7));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(items[0]).toBe(0);
  });

  it("draws the seating from the seed", () => {
    const players = ["Andersson", "Bengtsson", "Carlsson", "Toivo"];
    const seating = drawSeating(players, createRng(1));
    expect([...seating].sort()).toEqual([...players].sort());
    expect(drawSeating(players, createRng(1))).toEqual(seating);
  });
});

describe("roles", () => {
  // Seats are numbered medsols: the seat to a player's left is the next number.
  it("at spel på fyra: FH left of given, MH left of FH, the seat right of given rests", () => {
    expect(rolesFor(0, 4)).toEqual({ dealer: 0, forehand: 1, middlehand: 2, restingSeats: [3] });
    expect(rolesFor(3, 4)).toEqual({ dealer: 3, forehand: 0, middlehand: 1, restingSeats: [2] });
  });

  it("at spel på tre: nobody rests", () => {
    expect(rolesFor(1, 3)).toEqual({ dealer: 1, forehand: 2, middlehand: 0, restingSeats: [] });
  });

  it("at spel på fem: both players next to given rest", () => {
    const roles = rolesFor(0, 5);
    expect([...roles.restingSeats].sort()).toEqual([1, 4]);
    expect(activeSeats(roles)).toEqual([2, 3, 0]);
  });

  it.each([3, 4, 5] as const)("rotates so that everyone deals once per rond (%i players)", (count) => {
    let dealer = 0;
    const dealers: number[] = [];
    for (let giv = 0; giv < count; giv++) {
      dealers.push(dealer);
      dealer = nextDealer(dealer, count);
    }
    expect([...dealers].sort()).toEqual(Array.from({ length: count }, (_, i) => i));
    expect(dealer).toBe(0);
  });

  it("at spel på fem, the next given is the player who just rested on given's left", () => {
    const roles = rolesFor(0, 5);
    expect(roles.restingSeats).toContain(nextDealer(0, 5));
  });
});
