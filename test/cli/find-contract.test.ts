import { describe, expect, it } from "vitest";
import { contractList, findContract } from "../../src/cli/find-contract.js";
import { CONTRACTS, FOUR_PLAYERS } from "../../src/engine/index.js";

const foundId = (query: string): string | undefined => {
  const found = findContract(query, FOUR_PLAYERS);
  return found.kind === "found" ? found.contract.id : undefined;
};

describe("finding the contract for npm run contract", () => {
  it.each([
    ["Begär", "begar-6"],
    ["begar-6", "begar-6"],
    ["BEGAR", "begar-6"],
    ["gokagg", "gokagg"],
    ["  vingel   7 ", "vingel-7"],
    ["Gask på 2 (misär)", "gask-2-misere"],
    ["Gask på 2", "gask-2-trump"],
    ["gask-2", "gask-2-trump"],
    ["Minusgask", "gask--1-trump"],
    ["Solo (Solo Petite Falsk Misär / Hope Solo 6)", "solo-misere-pf"],
    ["Hope Solo 6", "hope-solo-6"],
    ["tRupp", "tupp-3"],
  ])("finds %j", (query, id) => {
    expect(foundId(query)).toBe(id);
  });

  it("suggests names that contain the query", () => {
    const found = findContract("vingel", FOUR_PLAYERS);
    expect(found).toEqual({ kind: "notFound", suggestions: ["Vingel 6", "Vingel 7", "Vingel 8"] });
    expect(findContract("xyz", FOUR_PLAYERS)).toEqual({ kind: "notFound", suggestions: [] });
  });

  it("lists every contract with its id", () => {
    const list = contractList(FOUR_PLAYERS);
    expect(list).toHaveLength(CONTRACTS.length);
    expect(list[0]).toMatch(/^gask--1-trump\s+Minusgask \(trumf\)$/);
  });
});
