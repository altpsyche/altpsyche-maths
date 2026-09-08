# The figure language

**A figure language is a declarative language for describing a picture over time.** It carries nodes,
a timeline, value types and expressions, and a program reads one rather than running it. The
specification is the product; `@altpsyche/maths` is its reference implementation.

**It is a language and not a format**, because a parameter may be an expression: arithmetic, a
comparison with a choice, a bound variable, and a call into a named function vocabulary. A format has
fields. This evaluates.

**This document is one of three.** The change it describes crosses three repositories, and each one
carries the half of it that repository does. This is the `@altpsyche/maths` half, and it is most of
the work.

- **This document** — what `@altpsyche/maths` refactors.
- [`@altpsyche/engine`](https://github.com/altpsyche/altpsyche-engine/blob/main/docs/FIGURE-LANGUAGE.md)
  — what the renderer refactors, which is almost nothing.
- [`altpsyche.dev`](https://github.com/altpsyche/altpsyche-dev/blob/master/docs/FIGURE-LANGUAGE.md) —
  what the website refactors.

**Nothing here is built.** [`ROADMAP.md`](ROADMAP.md) is the queue and this document is the shape the
queued work is built to. It moves to the specification's own repository once that exists. Siva took these decisions on 2026-09-08.

## Three decisions about what this is

**It is a language with a specification, not a format.** Siva's call on 2026-09-08, taken because the
earlier name hid what is being built. A second implementer needs a thing they can name, and "a figure
language renderer" is a sentence somebody can say.

**The specification lives in its own repository.** Apart from every implementation, the way a language
standard does, carrying the specification, the conformance suite and its own version.
`@altpsyche/maths` becomes the reference implementation of it rather than the place it is defined. The
repository is made when there is a specification to put in it, and not before.

**The specification carries its own version.** A figure declares which version of the language it is
written in and a renderer declares which versions it reads. That number and the package's are
separate, which is what every format that outlived its first implementation did.

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

## The inventory

**Counted from the door on 2026-09-08.** The earlier reading of twenty-two builders and twelve
animations was wrong in both directions, and it was wrong because it counted one list where there are
three. What a figure is made of falls into node kinds, path producers and animation kinds, and the
three need different treatment.

### Node kinds, nineteen of them

A node kind is a named record with parameters. None of these carries a function today except the two
marked, so most are a rename of arguments into fields.

| kind | parameters beyond a name | carries a function |
| --- | --- | --- |
| `group` | children, transform, style | no |
| `shape` | path, style | no |
| `text` | at, content, size, options | no |
| `dot` | at, radius, fill | no |
| `arrow` | from, to, options | no |
| `brace` | from, to, content, options | no |
| `callout` | at, to, content, options | no |
| `numberLine` | scale, options | no |
| `axes` | coords, options | no |
| `numberPlane` | coords, options | no |
| `equationNode` | equation, options | no, the equation is geometry |
| `vectorField` | coords, the field, options | **yes**, the field and two options |
| `polyline3` | points, camera, options | no |
| `dot3` | at, radius, fill, camera | no |
| `text3` | at, content, size, camera | no |
| `arrow3` | from, to, camera, options | no |
| `axes3` | camera, options | no |
| `scene3` | items, camera | no |
| `surface3` | the surface, camera, options | **yes**, the surface |

### Path producers, five of them

These return a `Path` rather than a node, so a figure uses one inside `shape`. In the format a path is
either written out as cubics or named as one of these with its parameters, and which of the two is a
choice per figure rather than a rule.

| producer | parameters | carries a function |
| --- | --- | --- |
| `plot` | coords, the curve, options | **yes**, the curve |
| `areaUnder` | coords, the curve, over, options | **yes**, the curve |
| `tangentAt` | coords, the curve, x, options | **yes**, the curve |
| `riemannBars` | coords, the curve, options | **yes**, the curve |
| `bracePath` | from, to, options | no |

### Animation kinds, fifteen of them

| kind | parameters beyond a target | carries a function |
| --- | --- | --- |
| `fadeIn` | none | no |
| `fadeOut` | none | no |
| `fadeTo` | opacity | no |
| `draw` | none | no |
| `growFrom` | from | no |
| `moveBy` | offset | no |
| `moveAlong` | path | no |
| `morph` | into, a path | no |
| `morphEquation` | from and to, two targets | no |
| `rotate` | angle, about | no |
| `scale` | to, about | no |
| `indicate` | factor, colour | no |
| `flash` | stroke, rays | no |
| `circumscribe` | stroke, padding | no |
| `countTo` | from, to, **and how to write the number** | **yes**, the writer |

### The timeline, which is a structure rather than a kind

A timeline is a sequence of entries built by `play`, `together`, `stagger` and `wait`. Each entry
carries its animations, its duration, an `after` offset that may be negative so two runs overlap, and
for a stagger a `gap`. The flat demo's entrance is eleven such entries and five of them carry a
negative offset.

**This was missing from the first inventory entirely.** It is not a node and not an animation, and it
has to serialise before any figure does.

### The extent, which is the tenth function

`ExtentChoice` is `Extent | ((aspect: number, seconds: number) => Extent)`. The flat demo's is a
function: the view follows the dot across, holding it within 1.2 figure units of the middle.

**This was missed when the flat demo was written out as data**, which is worth recording as a warning
about the exercise rather than only as an omission. Reading a figure and believing it has been
understood is not the same as writing every one of its parameters down.

### The value types, nine of them

A parameter is often not a number. `Coords`, `Scale`, `Interval`, `Extent`, `Camera3`, `Mat3`,
`Style` with its `Stroke` and `Fill`, `Equation`, and a `Track`. Each needs a written form, and each
is small, and there are nine of them.

### What the inventory changes about the plan

**Nine of thirty-nine carry a function, and only three shapes of function exist among them.** A curve
of one number, a field or surface of a place, and `countTo`'s writer. Every other builder and every
other animation is already a record of values wearing a function call's clothing.

`countTo` is the smallest and it is worth naming because it is not a curve at all. Its writer is
`(value) => labelFor(value, 0.01)` in every use, so the parameter becomes how a number is written:
a precision, and later a choice of forms if a figure ever needs one.

**So the vocabulary is nineteen node kinds, five path producers, fifteen animation kinds, one timeline
structure and nine value types**, which is fifty things rather than thirty-nine, and **ten of them
carry a function** once the extent is counted.

## The scope, told without flattering it

An earlier version of this document said thirty of thirty-nine are "a rename of arguments into
fields". That is true of the shape and false about the work, and it is worth correcting rather than
leaving.

**A rename is not free thirty times over.** Each kind needs a record type, a resolver, a test that
the record draws what the call drew, a reference entry, and a parameter name chosen to agree with the
other forty-nine. The last of those is a design running through all of them rather than a decision
taken once.

**Two of the six steps are not commit-sized and this file's own rule says they must be.** Step 3
covers nineteen node kinds and five path producers in one bullet. Step 4 covers fifteen animations.
Each of those is a version's worth, not a commit's, and they are written out properly before any of
this is worked.

**Four surfaces have to be rewritten and none was counted.** The four demos are 1,610 lines and every
one becomes a file. The guide is 544 lines and teaches the API that is changing. The reference is 805
lines and names every parameter that is being renamed. The website's figures move from modules to
files, which its own document describes and does not scope.

**This is almost certainly 2.0.0 rather than a minor.** `plot` returns a `Path` today and would
return a record. A consumer calling it breaks. The door was frozen at 1.0.0 five commits ago and a
frozen door is what a major exists for, so either the old calls keep working beside the new ones,
which means two APIs and two things to test, or the version goes to two. **That is Siva's call and
this plan assumed a minor without asking.**

**Realistic shape: twelve to sixteen commits over the vocabulary, plus the four surfaces, plus the
site.** Against evenings and weekends that is months rather than weeks. The plan is still worth doing
and the reasons in this document are unchanged. What was wrong was the size written next to them.

## The steps

Each is commit-sized and names what its commit will measure. **The measurement is the same throughout
and it is the reason this plan is checkable: a figure as data draws mark for mark what the TypeScript
figure draws, compared by tolerance.** The demos are already the conformance suite.

**Steps 3 and 4 are each larger than a commit and are written out before they are worked**, which is
the rule this repository holds every item to. What is below is the shape of the work rather than its
final list, and the count is twelve to sixteen commits once those two are split.

- [ ] **1. The readers take geometry rather than functions.** `slopeOf`, `areaUnder` and `tangentAt`
  work from a plotted path's own cubics. **Measures:** every demo's marks unchanged within tolerance
  at its named times; the slope read off a path against the closed-form derivative of `x²` at five
  places; the suite from 637.

- [ ] **2. The expression form, and the evaluator for it.** The closed vocabulary above, as a type
  and a function that evaluates one against a set of track values. **Measures:** each form evaluated
  against the TypeScript it replaces at ten inputs; a form naming an unknown function refused with a
  sentence that names it.

- [ ] **3. The node vocabulary.** Nineteen node kinds and five path producers as records with
  parameters, and a resolver from a record to the nodes that exist now. The authoring calls keep
  their names and their arguments and return records. **Measures:** every demo built through records
  drawing the same marks as it draws today, within tolerance, at its named times; the count of kinds
  at the door against the count in the reference.

- [ ] **4. The animation vocabulary.** Fifteen kinds as records with parameters, and a resolver each.
  `countTo`'s writer becomes a precision rather than a function, which is the last function in an
  animation. **Measures:** every demo's timeline through records drawing the same marks at the same
  times; the counting number in the flat demo reading the same string at each of its named times.

- [ ] **5. The file: a serialiser, a reader, a validator and a version.** **Measures:** each demo
  written out, read back, and drawing marks identical within tolerance; a figure of a later version
  refused; a malformed figure refused with the field named; the bytes of each demo as data.

- [ ] **6. The timeline as data.** The sequence of entries, each with its animations, its duration,
  its `after` offset and a stagger's `gap`. **Measures:** the flat demo's eleven entrances, five of
  which carry a negative offset, producing the same marks at the same times.

- [ ] **7. The extent as data.** A view that follows something becomes a named form with parameters
  rather than a function of the clock. **Measures:** the flat demo's dot held within 1.2 figure units
  of the middle of the frame, which is the number that view already quotes.

- [ ] **8. The four demos rewritten as files**, 1,610 lines of module becoming descriptions.
  **Measures:** all nine sheets byte for byte as committed after `npm run demos`.

- [ ] **9. The guide and the reference rewritten.** 544 and 805 lines describing an API that changed.
  **Measures:** the guide's code blocks compiling in order; the reference's entries against the door
  with the gate holding them equal.

- [ ] **10. The demos are the conformance suite.** The gate reads each figure from its file rather
  than from its module. **Measures:** the whole suite green with every demo loaded as data; the byte
  gate on all nine sheets unchanged.

#### Done-criteria

- Every demo is a file, and reading it draws marks identical within tolerance to the module it
  replaced, at every named time.
- None of the nine builders that take a function takes one, and no figure holds a closure.
- The vocabulary is nineteen node kinds, five path producers and fifteen animation kinds, and the
  reference names each with its parameters.
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
