# Isbergsvira (Nivåvira) – agent-based simulator

This project builds a simulator for **Isbergsvira**, a Swedish trick-taking card game for
three active players (four at the table, one resting each deal), played on a bidding
ladder called **Isberget**. The user plays one seat; the other three seats are AI player
agents. A coach agent gives the user suggestions.

Read `SPEC.md` for the full rules-engine specification and architecture.

## Source material (local only, not in the repo)

The repo is public, so these stay on the user's machine and are ignored by git (#5).
Read them locally when settling rules; never commit them or quote them at length in
issues, PRs or code. Everything the code needs must be in SPEC.md.

- `docs/hvad är wira.rtf` – the user's rule document (Swedish). Authoritative for rules,
  except where this file or SPEC.md records a correction or house rule.
- `docs/2023isberg.jpg` – photo of the handwritten Isberget table (Bilaga B). It is missing
  from the rtf text; SPEC.md contains a transcription.

When the rtf and SPEC.md disagree, SPEC.md wins (it contains the user's corrections).
When something is unclear, ask the user – do not guess rules.

## Core design principle: no information leaks

The whole point of the agent architecture is that **no agent may know more than its seat
can know at the table**.

- The full game state lives only in the rules engine (deterministic code).
- Each player agent receives only its *view* (see SPEC.md §7) and returns only a move.
  Player agents must **not** return their reasoning to the orchestrator.
- The coach sees only the user's view. It must never state anything the user cannot know
  (other players' holdings, voids, where unseen cards are).
- Do not infer that a player holding equivalent cards (e.g. K D after the ace has gone)
  always plays the higher one.

## How the user wants the game presented (coach / orchestrator)

In vira these rules are built into the CLI (and later the web interface), the game loop in
`src/game/` (to be added in #25) and the coach's instructions; when Claude is asked to run a game in a chat, they
apply to Claude directly.

- Language with the user: **Swedish** for game play (card names E K D Kn 10 … 2,
  suits ♣ ♥ ♠ ♦). Code and docs may be English.
- At the user's turn: **do not list all options.** Give **one suggestion** of what you
  would do, with a short reason based only on the user's view.
- **Do not** show cost/payment tables before decisions.
- Before playing a card for the user, check whether they must follow suit. Only
  auto-play a card when it is the user's *only* legal card.
- After the slutbud the user as lomber must be offered, in order:
  1. taking the bid larger within its type (e.g. Gask på 0 → Gask på 1, Sjuspel → 8-spel)
     **before** any talong card is revealed;
  2. the köp;
  3. after the köp and after **each** Omköp: buy again (Omköp) or not;
  4. play or **lay** (lägga spelet).
- The user may look at their own discards (kastkort) until they play to the first trick.
- Show each trick in a table: Stick | Utspel | (seats in play order) | Tar | score.
- Protocol format: see SPEC.md §9. Always in a code block.

## Simulated player behaviour (tuning the user has asked for)

- Follow the avpassningskonventioner (AK) most of the time, but **tjuvpass slightly less
  often** than a naive bot would – outbid a bit more often instead of passing without
  meeting the AK. Avoid a stream of easy hemgångar.
- Lomber should consider **laying** after the köp when hemgång looks unlikely.
- Köp in Trumfspel: generally keep only trumps plus side-suit aces (lomber and defenders).
- Defence köp kutym (Trumfspel): förste försvarare buys all if it holds ≥3 trumps, trump K
  singleton or trump D doubleton, otherwise nothing; andre försvarare buys as much as
  possible but never kastar
  aces or trumps.
- Defence köp against misär (e.g. Köpmisär): the main goal is a **renons**, so kasta
  all cards in the shortest suit. But don't kasta promising low cards such as a 2
  or a 3. With a singleton 2 or 3, it is fine to buy deeper to protect it.
- Defence köp against Trumfsolo: aim to get the whole talong bought. First buyer discards
  9–10 if possible; if that would mean discarding trumps or aces, buy only 3–4 instead.
- Defence play:
  - Don't lead trumps as defender unless lomber is close to running out of trumps.
  - When partner leads an honour and lomber plays last, take with the side ace rather than
    ducking; take side aces early in Trumfspel.
  - Don't ruff a trick partner is already winning with the highest remaining card.
  - Don't ruff unnecessarily when partner, playing after you, may win the trick.
  - Remember that partner's honour may sit "andra" (doubleton) and fall.
- Ågren discard signals (defence, read after two discards) – see SPEC.md §8.

## Decisions (2026-11-21, see issue #1)

- **TypeScript throughout**, in one package: `src/engine/` (pure rules), `src/game/` (the
  orchestrator, to be added in #25), `src/agents/` (AI players and coach), `src/cli/`. The
  engine imports nothing from the others, and `src/game/` doesn't import `src/cli/`. Lint
  enforces the engine's boundary with `src/agents/` and `src/cli/` now; the rules for
  `src/game/` come with the folder (#25).
- **The orchestrator is code, not an agent** (#25): the game loop in `src/game/` will ask the
  engine who is to act and pass that seat's view to its controller, an AI player or a
  human through a small `ask`/`show` interface that the CLI implements. No seat is special,
  so 2.0 and 3.0 reuse the loop.
- **1.0 is played in the terminal (CLI).** 2.0 adds a Vite web interface on the same engine
  (#28), desktop-first and easy to port to phones; the game runs on a server and the
  browser gets only its seat's view. 3.0 adds multiplayer with several human players (#39).
- **AI players and the coach are single Claude API calls** (Anthropic TypeScript SDK) that
  return a JSON move or one suggestion, validated against a schema; no agent framework.
  Where SPEC.md §7 says "subagent", read it as one API call per decision.
- **Contracts are data, not code per family.** A contract is a record of parameters (goal,
  trump source, exchange, visibility, constraints, what's allowed, payment, AK) and the
  Isberget ladder is a table of records; the engine runs one pipeline and builds each
  mechanism once (#30). This replaces the per-family build order in SPEC.md §10.
  The table rules (players, rotation, Färg, böter, payment units) are a ruleset record too.
- **A game is its ruleset, seed and move log** (#40): saving, resuming, replays, undo in
  single-player and AI-only runs all replay the log.
- **Keep API cost down** (#22–#24): call the model only for real decisions (forced and
  obvious moves are code), cache the fixed instructions, keep views compact, choose the
  model and effort per kind of decision, and run the coach only when it helps.
- **Player-facing text lives in one message module**, Swedish now; the engine produces
  events, never text.

## Working conventions for this repo

- Rules engine: plain, deterministic, fully unit-tested code. No LLM calls inside it.
- Every deal's payments must sum to zero – assert this.
- Prefer small, reviewable steps. Build in the order of the workstreams in #1 and the work
  plan in #2 (contracts as data, #30), not the per-family order in SPEC.md §10.

## Working method (as in sawenchalmers/heath.js)

- **Planning:** #1 holds the goals and workstreams for 1.0; #2 is the work plan (every open
  issue, in order). Keep #2 up to date when issues are added, finished or reordered.
- **Issue first.** Each piece of work has an issue. Issues written by Claude start with a
  note that they were generated by Claude (AI), then Summary, Steps, To decide.
- **One branch per issue**, named `<issue#>-<short-slug>` (e.g. `7-deal`). Never commit
  to `main`; it only accepts pull requests.
- **Commits:** Conventional Commits with a scope, imperative and lowercase
  (`feat(engine): deal the talong in order`).
- **Reviewing a change before committing:**
  1. **The handover:** the assistant stops with the change uncommitted and gives a short
     list of the changed files, as links to the changed places, plus test steps where the
     change affects behaviour. No pasted diffs, and no explanations unless asked.
  2. **The review:** in VS Code's Source Control panel, clicking a changed file opens the
     red/green diff against the last commit, shown inline
     (`"diffEditor.renderSideBySide": false`).
  3. **The test:** following the given steps.
  4. **The go-ahead:** the developer says when to commit, and whether the assistant may
     choose the split. Fixes from the independent review go through the same loop.
- **Every pull request bumps the version** (`npm version patch --no-git-tag-version`, or
  minor for features), in a `chore(release): bump version to X.Y.Z` commit. From #4 on,
  CI checks it.
- **Pull request body:** a note that it was written with Claude (AI) and checked by
  sawenchalmers; `Closes #N`; then **Contents**, **Testing** (tests run, an independent
  review and its fixes, checks to do after the merge) and **Later** (follow-ups as issues).
- **Merged with a merge commit** by sawenchalmers after checking; each merge is a release
  tagged `vX.Y.Z`.
