---
name: next
description: >
  Pick up work where the last session left it and land the next item of this package.
  Reads docs/ROADMAP.md for state, plans an item before working it, and cuts a version
  only when its demos draw. Use at the start of a session, after a /clear, or whenever
  the user says "next", "continue", "carry on", "what's next", or invokes /next.
---

Session entry point for `@altpsyche/maths`. **[`docs/ROADMAP.md`](../../../docs/ROADMAP.md) is the
handover.** There is no separate handover file and you must not write one.

`CLAUDE.md` is already loaded and holds the rules, the gates and the release convention. This file is
the sequence only, so nothing here repeats it. **Where the two disagree, `CLAUDE.md` is the rule.**

## 0. Budget

```
node .claude/context-used.mjs
```

**CONTINUE** picks an item. **FINISH** lands what is in hand and stops. **HAND OVER** starts nothing.
Re-check after every landed commit, not at the end.

## 1. Read the state, do not trust memory

- **[`docs/ROADMAP.md`](../../../docs/ROADMAP.md)** in full. It is short.
- `git log --oneline -10`, and `git log -S'<symbol>'` when you need to know why a line is the way it
  is.
- **`git status --short` before anything else.** Output means a previous session left work
  uncommitted, and that is the first thing to resolve rather than build on.

Read as little as answers the question. Grep for the symbol, read the function, open a whole file
only when the whole file is the subject.

## 2. Pick one item

**The ladder's own order wins.** Each version in it is an item, and the lowest unreleased version is
the pick. If that item carries a step list, the pick is **its first unticked step**, not the item.

The two decisions at the top of the roadmap are answered and are not to be reopened by a session. A
call the roadmap leaves open goes to Siva by name.

State the pick in one line before touching anything: `[version] [what it is] [what it measures
today].`

## 3. Plan first, and the plan is the whole session

**When the chosen version has no step list under it, planning it is the entire session and no code is
touched.** Research it by reading the files it will change, then write into that entry:

- **An ordered list of steps, each one commit-sized**, each naming the measurement its commit will
  quote.
- **Which step the demos gain from.** A version is cut against its demos, so a step list that never
  touches one is a version nothing checks.
- **Done-criteria**, checkable line by line, so cutting the version is a verification rather than an
  opinion.

Present the plan and stop. **Nothing lands until Siva says go.**

## 4. Resume, do not re-plan

Take the first unticked step. Do not redesign the remainder because a different order occurred to
you. **When a step proves the plan wrong, stop**, rewrite the remaining steps in the roadmap, say so,
and continue from the corrected list.

## 5. Measure, work, land

The before-state is measured first and it is what the commit body quotes. One step, one finding; a
second defect goes in the roadmap rather than into this commit.

**There is no `/land` skill here and there does not need to be.** The gates are the three commands in
`CLAUDE.md`, every claim this package makes is testable without a browser, and the demos' own marks
are the measurement. Run them, commit, and tick the step with its measurement rather than a bare
tick.

## 6. Cut the version

When the last step of a version ticks:

- **The demos draw**, and their marks at named times are the reading that says so.
- Verify the done-criteria line by line, saying which number satisfies which line.
- Bump the version in that commit, since a feature is a minor bump here.
- **Publishing is public and cannot be taken back, so it is asked for rather than assumed.**
- Delete the entry once nothing is left of it. `git log` keeps what closed.

## 7. Boundary

Re-run the budget script and decide out loud. **FINISH or HAND OVER** hands over whatever is left and
never starts what it cannot land and record in the same session, because a half-landed finding stops
the roadmap describing the tree.

Handing over is three lines: what landed with its numbers, what the next item is, and `/clear` then
`/next`.

**Never invent work to keep the loop alive.** An empty roadmap is a real answer, and so is "the next
thing is Siva's call".
