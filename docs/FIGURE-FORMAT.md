# The figure format

**This document is one of three.** The change it describes crosses three repositories, and each one
carries the half of it that repository does. This is the `@altpsyche/maths` half, and it is most of
the work.

- **This document** — what `@altpsyche/maths` refactors.
- [`@altpsyche/engine`](https://github.com/altpsyche/altpsyche-engine/blob/main/docs/FIGURE-FORMAT.md)
  — what the renderer refactors, which is almost nothing.
- [`altpsyche.dev`](https://github.com/altpsyche/altpsyche-dev/blob/master/docs/FIGURE-FORMAT.md) —
  what the website refactors.

**Nothing here is built.** [`ROADMAP.md`](ROADMAP.md) is the queue and this document is the shape the
queued work is built to. Siva took these decisions on 2026-09-08.

## What a figure format is

A figure format is a description of a picture over time that a program reads rather than runs. It
carries nodes, tracks and animations. Each of those is a named thing with parameters, and none of
them is a function.

## Why this is being done

**A figure today is a TypeScript program.** `scene` may be a function, every animation is a function,
and a builder takes functions as arguments:

```ts
export function plot(coords: Coords, of: (x: number) => number, options: PlotOptions = {}): Path
```

That `(x: number) => number` cannot be written to a file. So a figure cannot leave this language, and
four things are impossible because of it.

**A figure cannot be written by anything but a person typing TypeScript.** No editor, no page's
content, no generator.

**A figure cannot be drawn by anything but this package.** A renderer in another language has nothing
to read.

**A figure cannot cross a boundary.** Not to a worker, not to a file, not to a machine that renders
it offline.

**Two figures cannot be compared, and one cannot be costed before it is sampled.** The engine's frame
graph can do both, because a frame graph is data. This package claims the same philosophy and does
not keep it.

**What the format buys, stated as the things Siva asked for.** A renderer written in Rust reading a
figure and drawing it with no browser. A command that turns a figure into a video file for a channel.
An application that opens a figure, changes it and saves it. And a package another developer adopts,
because a format is a stronger thing to adopt than a library.

## The decisions this is built to

**The format is the product and this package is its reference implementation.** The builders stay as
the pleasant way to write a figure. What they produce is data, and the data is what other things
read.

**The format is closed.** An author uses the animations and the scene shapes the format names, with
parameters, and never an arbitrary function. A new kind of animation is a change to the format rather
than a function somebody writes. That is what makes a figure portable, checkable and generatable.

**Every scene shape becomes a named builder.** `plot`, `axes`, `tangentAt`, `areaUnder` and the rest
are nodes of the format with parameters, and a track value binds to a parameter.

**The format is versioned and stable, the way the door is.** An old figure keeps rendering and a
breaking change is a major.

**Native rendering happens through the format, not through this package.** A renderer in another
language reads a serialised figure and imports no TypeScript.

**The GPU painter and the recording stay here**, each behind a dynamic import, so one install still
gives a figure, a painter and a file at the end.

## What this repository refactors

The package is 9,507 lines of source, 133 exported values and 637 tests over 40 files. Twenty-one
builders return a node. This is a rewrite of the middle of the package.

### Every builder splits in two

`plot(coords, curve)` computes geometry and hands back a `Path`. After the change it returns a
description, and a resolver turns descriptions into marks. The twenty-one node builders all change
shape: `axes`, `plot`, `tangentAt`, `areaUnder`, `brace`, `numberPlane`, `vectorField`, `dot`,
`text`, `shape`, `group`, `axes3`, `surface3`, `polyline3`, `dot3`, `text3`, `arrow3`,
`fieldArrows3`, `vectorField3`, `scene3` and `sectionOf`.

The authoring call keeps its name and its arguments wherever it can, so a consumer writing a figure
sees as little change as the format allows. Whether that holds for every builder is one of the
questions the planning session answers rather than assumes.

### Animations become named things

`type Animation = (marks: readonly Mark[], along: number) => readonly Mark[]` becomes a record with a
kind and parameters, and a resolver for each kind. The kinds that exist are the ones the format
names.

### A scene stops being a function

`scene: Node | ((seconds: number, values: TrackValues) => Node)` loses its second half. What replaces
it is a parameter of a node naming a track, so a value that moves reaches the geometry without a
function in between.

### New machinery that does not exist today

A serialiser and a reader. A version field and what it promises. A validator that says why a figure
is not one. A conformance suite, which is described below.

### What does not change

**Marks do not change.** `PathMark` and `TextMark` stay as they are. Both painters stay as they are.
The seam this package was built on absorbs the whole change without moving, which is the strongest
evidence available that it was drawn in the right place.

## What expressing the flat demo as data found

`demos/tangent.ts` was written out as data by hand on 2026-09-08, before anything was designed. It
carries every hard case: a scene computed from a track, a curve passed as a function, a field
sampled from a function, a typeset rule that walks into another, a string built from a computed
number, and a view that follows a dot. What it found is that **"a function" is three different
problems wearing one word**, and only the smallest of the three needs the format to grow anything.

### Functions that make fixed geometry, which do not need to survive

`curve` is `(x: number) => x * x`. It reaches the picture only through `plot(coords, curve, over)`,
and what `plot` hands back is a path of cubics. `slopeField` reaches it only through `vectorField`,
which samples it on a grid and hands back arrows.

**Neither function has to serialise. The geometry it produced has to.** An author writes the function
in TypeScript, and the format carries cubics. What is lost is re-sampling at another resolution, and
a curve whose own shape is driven by a track. The flat demo needs neither.

### Functions that read fixed geometry, which should take geometry instead

`slopeOf(curve, x)`, `areaUnder(coords, curve, interval)` and `tangentAt(coords, curve, x)` each take
the curve as a function today and sample it. Every one of them can take the plotted path instead and
work from its own cubics, which is exact rather than sampled.

**That is a better design whether or not the format ever ships**, and it is the change that removes
functions from the middle of a figure. It is the bulk of the work and it can land on its own.

### Scalars a track drives, which are the only place an expression is needed

What is left in the flat demo after the first two tiers is small enough to list: `pointAlong` of a
path at a fraction, reading `.x` off a point, `clamp`, arithmetic, one comparison with a choice, and
`labelFor` to turn a number into a string.

So the format needs **a closed expression form and not a language**. A parameter is one of: a
literal, a reference to a track, a bound variable, an arithmetic combination, a comparison with a
choice, a member of a value, or a call to one of the pure functions this package publishes. The set
of callable functions is named and versioned the way the node set is, so every renderer implements a
fixed vocabulary rather than an interpreter for an open language.

### What each of the three hard problems turned out to be

**A function as a parameter is answered and it does not reach the format.** The first two tiers
remove every one of them.

**A scene that computes is answered by the expression form**, and it is a handful of operations
rather than arbitrary code. The flat demo's own defence still holds: the dot, the tangent and the
reading stay one number, because they read one track through one expression.

**Text metrics are half answered.** A typeset rule is already geometry, since MathJax hands back SVG
paths, so an equation bakes and no renderer needs MathJax to draw one. A plain text mark still
carries a string and a size, and where its glyphs land is the renderer's. The format should let a
text mark carry resolved outlines as well, so a figure that must look identical everywhere can say so.

## The scope, counted

**Twenty-two node builders** on the door and **twelve animation kinds**. Each becomes a named thing
with parameters. That count is the size of the vocabulary and it is the first honest number this plan
has had.

## The steps

Each is commit-sized and names what its commit will measure. **The measurement is the same throughout
and it is the reason this plan is checkable: a figure as data draws mark for mark what the TypeScript
figure draws, compared by tolerance.** The demos are already the conformance suite.

- [ ] **1. The readers take geometry rather than functions.** `slopeOf`, `areaUnder` and `tangentAt`
  work from a plotted path's own cubics. **Measures:** every demo's marks unchanged within tolerance
  at its named times; the slope read off a path against the closed-form derivative of `x²` at five
  places; the suite from 637.

- [ ] **2. The expression form, and the evaluator for it.** The closed vocabulary above, as a type
  and a function that evaluates one against a set of track values. **Measures:** each form evaluated
  against the TypeScript it replaces at ten inputs; a form naming an unknown function refused with a
  sentence that names it.

- [ ] **3. The node vocabulary.** All twenty-two builders described as records with parameters, and a
  resolver from a record to the nodes that exist now. The authoring calls keep their names and their
  arguments and return records. **Measures:** every demo built through records drawing the same marks
  as it draws today, within tolerance, at its named times.

- [ ] **4. The animation vocabulary.** All twelve kinds as records with parameters, and a resolver
  each. **Measures:** every demo's timeline through records drawing the same marks at the same times.

- [ ] **5. The file: a serialiser, a reader, a validator and a version.** **Measures:** each demo
  written out, read back, and drawing marks identical within tolerance; a figure of a later version
  refused; a malformed figure refused with the field named; the bytes of each demo as data.

- [ ] **6. The demos are the conformance suite.** The gate reads each figure from its file rather
  than from its module. **Measures:** the whole suite green with every demo loaded as data; the byte
  gate on all nine sheets unchanged.

#### Done-criteria

- Every demo is a file, and reading it draws marks identical within tolerance to the module it
  replaced, at every named time.
- No builder takes a function, and no figure holds a closure.
- The expression vocabulary is closed, published, and refuses a name it does not know.
- The format carries a version, an old figure keeps rendering, and a validator names the field that
  is wrong.
- The reference has an entry per name at the door and the gate holds them equal.
- `npm test`, `npm run type-check` and `npm run build` pass, and the lock file agrees with the
  manifest.

**What is not in these steps and is deliberately left out.** A curve whose shape a track drives, since
nothing draws one. Re-sampling geometry at another resolution, for the same reason. An editor, a
native renderer and video out, each of which reads the format and none of which is this work.

## Conformance

**Two renderers conform if they draw the same marks at the same times, compared by tolerance.** That
is a gate this repository already runs, and it is the oracle the format gets for free.

It covers a flat figure. It covers nothing a depth buffer does, because a renderer using depth does
not go through marks. The second half needs an answer of its own, and it is a question for the
planning session rather than a thing to solve now.

The comparison is by tolerance and never by hash, for the reason `CLAUDE.md` already gives:
`Math.sin`, `Math.cos` and `Math.pow` are not specified to the last bit and differ between engines.

## The precedent

**Lottie.** Vector animation as JSON, with independent renderers on the web, on two mobile platforms
and in Rust. It is the proof this shape works, and its known trouble is the trouble this format will
meet: renderers drifting apart on semantics the format left loose. Reading how Lottie's feature
matrix came to exist is worth an hour before the format is designed.

## What happens first

**A planning session, on paper, with no code touched.** Express `demos/tangent.ts` as data by hand.
It carries the computed scene, the arc-length track, the typeset rule that walks into another, the
brace and the counting number. A format that carries that one figure carries most of them, and a
format that cannot is answered in an afternoon rather than after six months of refactoring.

## What is frozen until then

The version ladder holds nothing. Four renderer versions were on it, and each would have been written
against an API this format reshapes. What was on it is recorded in [`ROADMAP.md`](ROADMAP.md) so it is
not rediscovered.

One item survives in another repository regardless of what happens here, and it is the engine's
stencil. That document says why.
