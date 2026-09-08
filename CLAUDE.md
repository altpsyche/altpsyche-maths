# @altpsyche/maths — house rules

The mathematics AltPsyche's figures are drawn from. TypeScript, ESM, published to npm. Ships from
`master`.

**One install is the goal, and every runtime dependency is loaded by the call that needs it.**
MathJax is loaded by the typesetting call, so a consumer who never typesets never loads it.
`@altpsyche/engine` is loaded by the GPU painter on the same pattern, so a consumer who draws to SVG
never loads a renderer. **The engine must never import this package**, which is what keeps the two
from forming a cycle.

**Where things are.** [`DESIGN.md`](DESIGN.md) is the design: what a figure is, the rule every part
of it follows, the line through the middle of the package, and the seam everything rests on.
[`docs/ROADMAP.md`](docs/ROADMAP.md) is the plan and the handover. This file is the rules.

**This package has a consumer.** `altpsyche.dev` at `/home/siva/dev/altpsyche-dev` draws every figure
through it, and a change here reaches that site through a release rather than through an edit over
there. A feature nothing is waiting to draw is a feature nobody has checked, which is the test
[`docs/ROADMAP.md`](docs/ROADMAP.md) orders its items by.

## Prose rules

**These govern every word written here**, in a commit body, a doc, a comment or a README line. Ten
of them, given by Siva.

1. **No metaphor as a substitute for the claim.** One image to illuminate a stated point is fine. An
   image standing in place of the point is not. If the metaphor were deleted, the sentence should
   still say something.
2. **No explaining what you just said.** Say it once. A follow-up sentence beginning "In other
   words" or "What this means is" means the first sentence failed. Fix the first sentence.
3. **No brochure language.** Cut "powerful", "seamless", "robust", "leverage", "unlock", "deep
   dive", "at its core". These describe nothing and survive only because they sound like writing.
4. **No synonym roulette.** Name a thing, then keep that name. Switching to "the tool", "the
   library", "the solution" to avoid repetition makes the reader check whether you changed subject.
   Repetition is clearer.
5. **Use "is" and "are".** Not "serves as", "functions as", "represents", "constitutes", "acts as".
   A fancy verb where a copula belongs adds syllables, not meaning.
6. **No "not just X, but Y".** Also "isn't merely", "more than just". The formula manufactures depth
   by denying a claim nobody made. State Y.
7. **No mechanical threes.** Three parallel items because three sounds complete is padding. Use the
   number of items that exist.
8. **No decorative dashes.** A dash marks a genuine break or aside. Used for rhythm, it becomes
   noise and every sentence starts to sound the same. Prefer a period or a colon.
9. **No robotic phrasing.** Cut "it is important to note", "it should be mentioned", "delve into",
   "navigate the complexities", "plays a crucial role in". If a sentence would read identically with
   the phrase removed, remove it.
10. **No sentences that are not sentences.** Every sentence gets a subject, a finite verb, and one
    idea. A phrase with no verb published as a sentence says nothing. A definition glued onto a noun
    with a comma makes the reader hold the first clause open while reading the second. Split it. A
    pronoun subject whose referent is more than one sentence back sends the reader hunting. Repeat
    the noun.

**Nothing here checks them mechanically.** The consumer repository has `npm run check:tells` and
`check:readability` over its own prose corpus, and neither reads this tree. So these are read by eye
or not at all.

## The voice brief — from Siva

**Simple language, and the what and the why both said plainly. Aim so a ten year old could follow
it. Simplicity is the only way.**

That is about the words, not the subject. A Lipschitz bound, a cubic Bézier and an affine map are all
allowed. What is not allowed is a sentence a reader has to decode, or a term used before it has been
given its plain meaning. **Every technical word gets its everyday explanation the first time it
appears**, and a forward reference is a defect.

**The register is a graphics-mathematics reference.** Siva named the model: Eric Lengyel, in
_Foundations of Game Engine Development_. Define the object, state its properties, give each number
with the expression it comes from, then name the function that does the work.

**Definition first.** A section opens by saying what the thing is, in one declarative sentence,
before it says anything the thing does. "A figure is a description of a picture over time."

**Third person, present tense.** "`marksAt` is a pure function of t", never "you get back a list of
things to draw". There is no **I**, no **we** and no **you** on these pages.

**The standard name for anything that has one.** Cubic Bézier, affine transform, column-major, de
Casteljau's construction, the painter's algorithm, fourth-order Runge-Kutta, the nonzero winding
rule. The name is the part a reader can look up, and a paraphrase costs them that.

**A number arrives with what produces it.** Not "close enough to a circle" but the control distance
(4/3)·tan(θ/4), the bound of 2.7 × 10⁻⁴ r it gives, and the interval the suite holds the drawn edge
inside.

**No process narration.** "Watch it from the start: the grid fades in, the axes draw themselves" is
a tour. State what the figure is at the time named, and what the code does.

**A heading names its subject.** The model, Geometry, Graphs, Space, Painters, Restrictions. Not
"What you can draw", not "In full".

**Where this meets the simplicity brief above:** plain words for ordinary things, the exact term for
a technical one, and every technical term defined where it first appears. Lengyel defines his terms
before he uses them, which is the same rule the brief already states.

## Style: caveman ultra

Pinned in `.caveman/config.json` (`defaultMode: "ultra"`), which the plugin's resolver reads above
user config, so every session in this repo starts ultra with no `/caveman` command. **That file is
the source of truth for the level; do not restate a level here.** Off only on "stop caveman" /
"normal mode". Never name the style.

Drop articles, filler, pleasantries, hedging. Fragments fine. No tool-call narration, no decorative
tables, no emoji, no long raw log dumps. Quote the shortest decisive line. Technical terms, error
strings and API names exact.

**Write normal prose in:** commit messages, PR bodies, code comments, `DESIGN.md`, `docs/ROADMAP.md`, the
README, and any multi-step sequence where dropped conjunctions would make the order ambiguous.

## Comments

**A comment explains the code. That is the whole rule.** Siva's words: _"I dont want plumbing
comments, gate comments. any alphabet based gate. I dont want comments talking like LLM conveying
message to me. Comment should be explaing the code, that's it"_

**Never write an identifier into a comment**, no finding number and no link out to a doc. The reason
a line is written that way is said in the comment or not at all.

**Never write plumbing or gates:** which caller wires this, which test fails if it drifts. State the
invariant instead.

**Never address a reader.** No "Siva's call", no "this cost a session to find", no "which is the
whole finding". Those belong in the commit body or the roadmap.

**Do write** what the code does that reading it does not tell you, and what it has to survive: a
specification behaviour, a reason a correct-looking alternative fails, a defect it prevents, an
invariant two places share. **A named published technique is the highest-value comment here**,
because the name is the only part a reader can look up. The elliptical arc conversion in
`figure/path-data.ts` is the SVG specification's own, and saying so is what lets a reader check it.

**A label in front of the explanation is wanted**: `// Label: what the line does that reading it does
not tell you`. What the label has to earn is the clause after the colon.

**A comment is one line, and two is the most any of them gets.** Where a paragraph feels necessary,
what it is carrying is a measurement, which belongs in the commit body where a number can be dated,
or a rule, which belongs in this file.

## The work

**[`docs/ROADMAP.md`](docs/ROADMAP.md) is the plan and the handover. Read it first.** Nothing else queues work.
There is no separate handover file and you must not write one.

**A design call is made in the commit that needs it, and the reasoning goes in that commit's body.**
What was decided, why, and the one thing that would change the answer. There is no decision file and
no index: `git log` is the only archive there is.

**A rule in this file is the rule**, so a rule that looks worth changing is changed rather than
checked against a second document that would then disagree with it.

**An item bigger than one commit gets its steps written before it is worked**, each naming the
measurement it will quote, plus done-criteria checkable line by line. Writing that plan is a session
on its own and no code is touched in it. Later sessions resume at the first unticked step.

**Two decisions at the top of the roadmap gate most of it**, and both are Siva's rather than a
session's. Where the typesetter lives, and whether a figure stays flat. Work around them; do not
answer them.

**Keep a session under half the context window.** `node .claude/context-used.mjs` reads the real
number out of the session's own transcript and returns CONTINUE / FINISH / HAND OVER. Check it at
session start and after every landed commit, not at the end. Above 40%, land what is in hand and
hand over; above 50%, hand over without starting anything.

## Gates

```
npm test          vitest, the whole suite
npm run type-check tsc --noEmit
npm run build     tsc -p tsconfig.build.json, which is what prepack runs
```

**There is no `land` skill and there does not need to be.** Three commands are the whole gate, and a
skill wrapping them would be a second place the list is written. `/next` is here because a sequence
is worth stating once; a gate this short is not.

**Every claim about geometry and timing is testable without a browser**, which is the point of the
seam: values and timing are pure functions, and a figure at a time is a list of marks. `npm test`
holds all of it and always will.

**A claim about what a device draws needs a device**, and those are the GPU painter's alone. They are
gated separately, the way `@altpsyche/engine` already gates its own: a browser gate and a gate on a
real card, neither of them part of `npm test`. **A claim that could have been made about marks is
made about marks**, so a pixel gate covers what only a pixel can show and nothing else.

**The comparison between two lists of marks is by tolerance and never by hash.** `Math.sin`,
`Math.cos` and `Math.pow` are not specified to the last bit in JavaScript and differ between engines,
so an exact match is a gate that passes on one machine and fails on another for no reason a reader
could see.

**A cubic cannot be a quarter arc exactly.** `circle` and the arc read out of path data are both held
to between 2.6 and 2.8 parts in ten thousand of the true radius, which is the error the control
distance leaves. A tighter bound is a test that will fail for being right.

## Commits

Conventional commits. **Subjects lower-case.** One finding per commit, with measured before and after
numbers in the body, which is the house style; see `git log`. **No identifier trailers.**

Commit or push only when asked. Temporary files never go in the repo.

## Releases

**A feature is a minor bump and a fix is a patch**, which is what `git log` already shows: the
annotation pieces landed at 0.2.0, the painter fix as 0.2.1, and the path reader at 0.3.0 because a
new export is a feature. Under 0.x that convention is the only thing keeping a consumer able to read
a version number.

**One door.** `index.ts` is the entire public surface and nothing outside reaches a file inside by
path. The consumer holds itself to that with a test of its own.

**The version is bumped in the commit that earns it**, and the release is `npm publish` from a clean
tree. Publishing is public and cannot be taken back, so it is asked for rather than assumed, and the
version goes to Siva when it is not obvious which half of the convention applies.

**The consumer moves after the release, never before.** To see an unreleased change on the site,
`npm pack` here and `npm install --no-save` the tarball there, and never commit the site with that
installed: its manifest would name a version that is not what the gates measured.
