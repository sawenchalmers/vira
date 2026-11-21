// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * The rules engine is pure and deterministic (CLAUDE.md, SPEC.md): it must not import
 * the agents or the CLI, call the Claude API, or do I/O. Because vira is one package
 * with folders (#3), this lint rule is what enforces the boundary.
 */
const engineBoundary = {
  files: ["src/engine/**/*.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/agents", "**/agents/**", "**/cli", "**/cli/**"],
            message: "The engine must not import from src/agents or src/cli.",
          },
          {
            group: ["@anthropic-ai/*"],
            message: "The engine must not call the Claude API.",
          },
          {
            group: ["node:*", "fs", "fs/*", "child_process", "http", "https", "net", "readline", "readline/*"],
            message: "The engine must not do I/O; keep it pure.",
          },
        ],
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  engineBoundary,
);
