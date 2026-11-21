# vira

A simulator for **Isbergsvira** (Nivåvira), a Swedish trick-taking card game for four at
the table: three play each deal and one rests, bidding on a ladder called **Isberget**.

You play one seat. The other three seats are AI players, and a coach suggests one move at
each of your decisions. No AI player or coach ever knows more than its seat could know at
the table: the full game state lives only in a deterministic rules engine, and each player
sees only its own view.

## Status

Planning. The goals for 1.0 are in [#1](https://github.com/sawenchalmers/vira/issues/1)
and the work plan in [#2](https://github.com/sawenchalmers/vira/issues/2).

- **1.0:** play in the terminal.
- **2.0:** a visual web interface on the same engine.

## Documents

- [`SPEC.md`](SPEC.md): the rules engine and agent architecture specification.
- [`CLAUDE.md`](CLAUDE.md): how the game is presented, how the AI players behave, and how
  work is done in this repo.

## Use of AI

vira is developed with Claude (Anthropic). Issues and pull requests written with Claude
say so at the top.
