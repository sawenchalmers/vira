// @ts-check
import { builtinModules } from "node:module";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * The rules engine is pure and deterministic (CLAUDE.md, SPEC.md): it must not import
 * src/agents or src/cli, call the Claude API, use Node built-ins or dynamic import(), or
 * touch I/O, the clock or Math.random (randomness, such as the shuffle, is passed in).
 * vira is one package with folders (#3), so these lint rules enforce the boundary.
 * Convention: don't name an engine subfolder `agents` or `cli`.
 */
const engine = {
  files: ["src/engine/**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
  rules: {
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/agents", "**/agents/**", "**/cli", "**/cli/**"],
            message: "The engine must not import from src/agents or src/cli.",
          },
          { group: ["@anthropic-ai/*"], message: "The engine must not call the Claude API." },
          {
            group: ["node:*", ...builtinModules.flatMap((m) => [m, `${m}/*`])],
            message: "The engine must not use Node built-ins; keep it pure.",
          },
        ],
      },
    ],
    "no-restricted-globals": [
      "error",
      ...["fetch", "process", "console", "crypto", "performance", "XMLHttpRequest", "WebSocket"].map(
        (name) => ({ name, message: `The engine must not use ${name}; keep it pure.` }),
      ),
    ],
    "no-restricted-properties": [
      "error",
      { object: "Math", property: "random", message: "Pass randomness into the engine." },
      { object: "Date", property: "now", message: "The engine must not read the clock." },
    ],
    "no-restricted-syntax": [
      "error",
      { selector: "ImportExpression", message: "The engine must not use dynamic import()." },
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: "The engine must not read the clock.",
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  // Functions are written as `const f = (…) => { … }`, not `function f(…) { … }`.
  { rules: { "func-style": ["error", "expression"] } },
  engine,
);
