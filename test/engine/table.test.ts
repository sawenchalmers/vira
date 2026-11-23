import { describe, expect, it } from "vitest";
import {
  activeSeats, createRng, deriveSeed, drawSeating, nextDealer, rolesFor, rulesetFor, SEED_LIMIT, shuffle,
} from "../../src/engine/index.js";

describe("seeded randomness", () => {
  it("gives the same shuffle for the same seed", () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    expect(shuffle(items, createRng(42))).toEqual(shuffle(items, createRng(42)));
    expect(shuffle(items, createRng(42))).not.toEqual(shuffle(items, createRng(43)));
  });

  it("gives numbers from 0 up to but not including 1", () => {
    const rng = createRng(5);
    for (let i = 0; i < 10_000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("can produce every order, including the unchanged one", () => {
    const rng = createRng(9);
    const orders = new Set(Array.from({ length: 200 }, () => shuffle([0, 1, 2], rng).join("")));
    expect(orders.size).toBe(6);
  });

  it.each([1.5, -1, SEED_LIMIT, Number.NaN])("rejects the seed %s", (seed) => {
    expect(() => createRng(seed)).toThrow();
  });

  it("accepts seeds from 0 to 2^32 − 1", () => {
    expect(() => createRng(0)).not.toThrow();
    expect(() => createRng(SEED_LIMIT - 1)).not.toThrow();
  });

  it("derives a different, valid seed for each giv", () => {
    const seeds = Array.from({ length: 100 }, (_, giv) => deriveSeed(2026, giv));
    expect(new Set(seeds).size).toBe(100);
    for (const seed of seeds) expect(Number.isInteger(seed) && seed >= 0 && seed < SEED_LIMIT).toBe(true);
    expect(deriveSeed(2026, 7)).toBe(seeds[7]);
    expect(() => deriveSeed(2026, -1)).toThrow();
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
    expect(rolesFor(0, rulesetFor(4))).toEqual({ playerCount: 4, dealer: 0, forehand: 1, middlehand: 2, restingSeats: [3] });
    expect(rolesFor(3, rulesetFor(4))).toEqual({ playerCount: 4, dealer: 3, forehand: 0, middlehand: 1, restingSeats: [2] });
  });

  it("at spel på tre: nobody rests", () => {
    expect(rolesFor(1, rulesetFor(3))).toEqual({ playerCount: 3, dealer: 1, forehand: 2, middlehand: 0, restingSeats: [] });
  });

  it("at spel på fem: both players next to given rest", () => {
    const roles = rolesFor(0, rulesetFor(5));
    expect([...roles.restingSeats].sort()).toEqual([1, 4]);
    expect(activeSeats(roles)).toEqual([2, 3, 0]);
  });

  it("at spel på fem, also when given's neighbours wrap around the table", () => {
    const roles = rolesFor(4, rulesetFor(5));
    expect([...roles.restingSeats].sort()).toEqual([0, 3]);
    expect(activeSeats(roles)).toEqual([1, 2, 4]);
  });

  it.each([[4, 4], [-1, 4], [1.5, 4], [5, 5]])("rejects dealer seat %s at a table of %s", (dealer, count) => {
    expect(() => rolesFor(dealer, rulesetFor(count as 4 | 5))).toThrow();
  });

  it.each([3, 4, 5] as const)("rotates so that everyone deals once per rond (%i players)", (count) => {
    let dealer = 0;
    const dealers: number[] = [];
    for (let giv = 0; giv < count; giv++) {
      dealers.push(dealer);
      dealer = nextDealer(dealer, rulesetFor(count));
    }
    expect([...dealers].sort()).toEqual(Array.from({ length: count }, (_, i) => i));
    expect(dealer).toBe(0);
  });

  it("at spel på fem, the next given is the player who just rested on given's left", () => {
    const roles = rolesFor(0, rulesetFor(5));
    expect(roles.restingSeats).toContain(nextDealer(0, rulesetFor(5)));
  });
});
