import { describe, expect, it } from "vitest";
import { parseDealArgs } from "../../src/cli/deal-args.js";

const randomSeed = () => 777;

describe("npm run deal arguments", () => {
  it("uses the defaults: a fresh seed, 4 players, given in seat 0", () => {
    expect(parseDealArgs([], randomSeed)).toEqual({ kind: "deal", seed: 777, players: 4, given: 0 });
  });

  it("reads seed, players and given", () => {
    expect(parseDealArgs(["2026", "5", "2"], randomSeed)).toEqual({ kind: "deal", seed: 2026, players: 5, given: 2 });
    expect(parseDealArgs(["4294967295"], randomSeed)).toMatchObject({ kind: "deal", seed: 4294967295 });
  });

  it.each([["--help"], ["-h"], ["1", "-h"]])("asks for help with %j", (...args) => {
    expect(parseDealArgs(args, randomSeed)).toEqual({ kind: "help" });
  });

  it.each([
    ["seed", [""]],
    ["seed", [" "]],
    ["seed", ["0x10"]],
    ["seed", ["1e3"]],
    ["seed", ["-0"]],
    ["seed", ["1.0"]],
    ["seed", ["-1"]],
    ["seed", ["4294967296"]],
    ["seed", ["abc"]],
    ["players", ["1", ""]],
    ["players", ["1", "4.0"]],
    ["players", ["1", "6"]],
    ["given", ["1", "4", ""]],
    ["given", ["1", "4", "0x1"]],
    ["given", ["1", "4", "4"]],
    ["given", ["1", "4", "-1"]],
    ["too many", ["1", "4", "0", "extra"]],
  ])("rejects a bad %s: %j", (_what, args) => {
    expect(parseDealArgs(args, randomSeed).kind).toBe("error");
  });
});
