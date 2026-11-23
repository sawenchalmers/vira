import { describe, expect, it } from "vitest";
import { parseContractArgs } from "../../src/cli/contract-args.js";

const randomSeed = () => 777;

describe("npm run contract arguments", () => {
  it("reads a contract of several words, with a fresh seed by default", () => {
    expect(parseContractArgs(["Gask", "på", "2"], randomSeed)).toEqual({ kind: "walk", query: "Gask på 2", seed: 777 });
    expect(parseContractArgs(["10-spel"], randomSeed)).toEqual({ kind: "walk", query: "10-spel", seed: 777 });
  });

  it("reads a first argument of only digits as the seed", () => {
    expect(parseContractArgs(["2026", "Begär"], randomSeed)).toEqual({ kind: "walk", query: "Begär", seed: 2026 });
    expect(parseContractArgs(["0", "Vingel", "7"], randomSeed)).toEqual({ kind: "walk", query: "Vingel 7", seed: 0 });
  });

  it("drops the carets npm adds on Windows to an argument with spaces", () => {
    expect(parseContractArgs(["^Vingel^ 7^"], randomSeed)).toEqual({ kind: "walk", query: "Vingel 7", seed: 777 });
    expect(parseContractArgs(["2026", "^Gask^ på^ 2^"], randomSeed)).toEqual({ kind: "walk", query: "Gask på 2", seed: 2026 });
  });

  it.each([[["--help"]], [["-h"]], [["Begär", "--help"]]])("asks for help with %j", (args) => {
    expect(parseContractArgs(args, randomSeed)).toEqual({ kind: "help" });
  });

  it("lists the contracts with --list", () => {
    expect(parseContractArgs(["--list"], randomSeed)).toEqual({ kind: "list" });
  });

  it.each([
    [[]],
    [["  "]],
    [["2026"]],
    [["4294967296", "Begär"]],
    [["Begär", "--seed", "1"]],
    [["-1", "Begär"]],
  ])("rejects %j", (args) => {
    expect(parseContractArgs(args, randomSeed).kind).toBe("error");
  });
});
