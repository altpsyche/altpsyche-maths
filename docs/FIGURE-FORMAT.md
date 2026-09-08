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

## The three hard problems

These are not details. Each one can change the size of the work by a large factor, and the planning
session answers them before anything is built.

### A function as a parameter

`plot` takes `(x: number) => number`. `vectorField` takes a function from a place to a vector.
`surface3` takes a function of two parameters. None of them serialises.

Three answers exist. The format carries sampled points, which is simple and large and cannot be
re-sampled at another resolution. The format names a family of functions with coefficients, which is
compact and covers polynomials and trigonometry and refuses everything else. Or the format carries a
small expression language, which covers everything and means every renderer implements an
interpreter.

**Nothing is decided here and this decides the size of everything.**

### A scene that computes

`demos/tangent.ts` walks a path by its own length, recovers the graph x from the point it lands on,
and builds the tree from that. The roadmap defends this as the right design, because it makes the
dot, the tangent and the reading one number rather than three clocks free to disagree.

The format admits no computation. So either a node takes a length fraction directly and does the
recovery itself, or that figure is expressed another way. **This is the case that decides whether the
format is workable**, which is why it is answered first and on paper.

### Where text's geometry is settled

A label's place depends on font metrics, and those differ between platforms. Two renderers disagree
about where a label sits unless the format pins the metrics or a figure carries text already
resolved. This is the failure Lottie has never fully closed, and it is worth reading how before
choosing.

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
