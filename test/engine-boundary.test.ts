import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Lint from the repo root wherever the tests are started from.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

const boundaryRules = new Set([
  "@typescript-eslint/no-restricted-imports",
  "no-restricted-globals",
  "no-restricted-properties",
  "no-restricted-syntax",
]);

/** Lints `code` as if it were `file`, and returns the boundary errors. */
async function boundaryErrors(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(repoRoot, file) });
  if (!result) throw new Error("ESLint returned no result");
  // A parse error or an ignored file has no ruleId; fail rather than pass by accident.
  expect(result.fatalErrorCount).toBe(0);
  expect(result.messages.filter((m) => m.ruleId === null)).toEqual([]);
  return result.messages
    .filter((m) => m.ruleId !== null && boundaryRules.has(m.ruleId))
    .map((m) => m.message);
}

describe("engine boundary (lint)", () => {
  it.each([
    ["the agents", 'import "../agents/index.js";'],
    ["the agents, without an extension", 'import "../agents";'],
    ["the agents, from a nested folder", 'import "../../agents/index.js";'],
    ["the CLI", 'import "../cli/index.js";'],
    ["the CLI by a src/ path", 'import "src/cli/index.js";'],
    ["the agents by re-export", 'export * from "../agents/index.js";'],
    ["the agents by named re-export", 'export { x } from "../agents/index.js";'],
    ["the agents as a type", 'import type { X } from "../agents/index.js";'],
    ["the agents by import = require", 'import x = require("../agents/index.js");'],
    ["the Claude API", 'import "@anthropic-ai/sdk";'],
    ["a node: built-in", 'import "node:fs";'],
    ["a bare built-in", 'import "readline";'],
    ["a bare built-in subpath", 'import "fs/promises";'],
    ["a built-in that isn't I/O", 'import "crypto";'],
    ["createRequire's module", 'import "module";'],
    ["anything, dynamically", 'await import("./index.js");'],
  ])("rejects an engine import of %s", async (_name, code) => {
    // Files sit one or two folders deep so the relative paths reach src/agents and src/cli.
    const file = code.includes("../../") ? "src/engine/rules/example.ts" : "src/engine/example.ts";
    expect(await boundaryErrors(file, code)).toHaveLength(1);
  });

  it.each([
    ["fetch", 'fetch("https://example.com");'],
    ["console", 'console.log("x");'],
    ["process", "process.exit(0);"],
    ["Math.random", "Math.random();"],
    ["Date.now", "Date.now();"],
    ["new Date()", "new Date();"],
  ])("rejects engine use of %s", async (_name, code) => {
    expect(await boundaryErrors("src/engine/example.ts", code)).toHaveLength(1);
  });

  it.each(["mts", "js"])("applies to .%s files in the engine", async (ext) => {
    expect(await boundaryErrors(`src/engine/example.${ext}`, 'import "../agents/index.js";')).toHaveLength(1);
  });

  it.each([
    ["the engine itself", 'import "./index.js";'],
    ["a file whose name starts with agents", 'import "./agentsHelper.js";'],
    ["a dated value", "new Date(0);"],
  ])("allows the engine to use %s", async (_name, code) => {
    expect(await boundaryErrors("src/engine/example.ts", code)).toEqual([]);
  });

  it("allows the agents and the CLI to import the engine and use I/O", async () => {
    const code = 'import "../engine/index.js";\nimport "node:fs";\nconsole.log(Date.now());';
    expect(await boundaryErrors("src/agents/example.ts", code)).toEqual([]);
    expect(await boundaryErrors("src/cli/example.ts", code)).toEqual([]);
  });
});
