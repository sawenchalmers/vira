import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "no-restricted-imports")
    .map((m) => m.message);
}

describe("engine boundary (lint)", () => {
  it.each([
    ["the agents", 'import "../agents/index.js";'],
    ["the CLI", 'import "../cli/index.js";'],
    ["the Claude API", 'import "@anthropic-ai/sdk";'],
    ["node: I/O modules", 'import "node:fs";'],
    ["bare I/O modules", 'import "readline";'],
  ])("rejects an engine import of %s", async (_name, code) => {
    expect(await boundaryErrors("src/engine/example.ts", code)).toHaveLength(1);
  });

  it("allows imports inside the engine", async () => {
    expect(await boundaryErrors("src/engine/example.ts", 'import "./index.js";')).toEqual([]);
  });

  it("allows the agents and the CLI to import the engine", async () => {
    expect(await boundaryErrors("src/agents/example.ts", 'import "../engine/index.js";')).toEqual([]);
    expect(await boundaryErrors("src/cli/example.ts", 'import "../engine/index.js";')).toEqual([]);
  });
});
