# vira

A simulator for **Isbergsvira** (Nivåvira), a Swedish trick-taking card game for four at
the table: three play each deal and one rests, bidding by a table called the **budtabell** (colloquially **Isberget**).

The plan: you play one seat, the other three seats are AI players, and a coach suggests one
move at each of your decisions. The design keeps every AI player and the coach from knowing
more than their seat could know at the table: the full game state will live only in a
deterministic rules engine, and each player will see only its own view.

## Status

Planning. The goals for 1.0 are in [#1](https://github.com/sawenchalmers/vira/issues/1)
and the work plan in [#2](https://github.com/sawenchalmers/vira/issues/2).

- **1.0:** play in the terminal.
- **2.0:** a visual web interface on the same engine.

## Development

TypeScript on Node 24, in one package:

- `src/engine/`: the rules engine. Pure and deterministic: it must not import
  `src/agents/` or `src/cli/`, the Claude API or any Node built-in, nor use I/O globals,
  the clock or `Math.random` (randomness is passed in). ESLint enforces this (see
  `eslint.config.js`); don't name an engine subfolder `agents` or `cli`.
- `src/agents/`: the AI players and the coach.
- `src/cli/`: the terminal interface.

```sh
npm install
npm test           # Vitest
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # compile to dist/
```

## Documents

- [`SPEC.md`](SPEC.md): the rules engine and agent architecture specification.
- [`CLAUDE.md`](CLAUDE.md): how the game is presented and how work is done in this repo.
- [`agents/`](agents/): the AI players' and the coach's instructions (strategy and kutym).

## Use of AI

vira is developed with Claude (Anthropic). Issues and pull requests written with Claude
say so at the top.
