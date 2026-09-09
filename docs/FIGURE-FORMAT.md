# The figure format

**A figure format is a declarative description of a picture over time.** It carries nodes, a
timeline, value types and expressions, and a program reads one rather than running it. The
specification is the product; `@altpsyche/maths` is its reference implementation.

**It evaluates, and it is still a format.** A parameter may be an expression: arithmetic, a comparison
with a choice, a bound variable, or a call into a named function vocabulary. That is roughly CSS
`calc()` with a ternary, and four standing refusals hold it at that size: no loops, no recursion, no
user-defined functions, no assignment, and not Turing-complete on purpose. A figure needing
computation the format refuses is written by a program that emits a figure.

**The refusals are rules rather than a name.** Calling it a language was considered and dropped:
Lottie is called a format and has renderers on four platforms, glTF is a transmission format and the
whole 3D industry implements it, so the word buys nothing, and a bigger word invites a bigger
thing.

**This document is one of three.** The change it describes crosses three repositories, and each one
carries the half of it that repository does. This is the `@altpsyche/maths` half, and it is most of
the work.

- **This document** — what `@altpsyche/maths` refactors.
- [`@altpsyche/engine`](https://github.com/altpsyche/altpsyche-engine/blob/main/docs/FIGURE-FORMAT.md)
  — what the renderer refactors, which is almost nothing.
- [`altpsyche.dev`](https://github.com/altpsyche/altpsyche-dev/blob/master/docs/FIGURE-FORMAT.md) —
  what the website refactors.

**Nothing here is built.** [`ROADMAP.md`](ROADMAP.md) is the queue and this document is the shape the
queued work is built to. It moves to the specification's own repository once that exists. Siva took these decisions on 2026-09-08.

## Three decisions about what this is

**It is a format with a specification, and the boundary is written as a refusal.** Siva's call on
2026-09-08. The name was carrying work a rule should do, so the four refusals above are in the
specification's first section and the name stays modest.

**The specification lives here, in the package that implements it, and that is deliberate rather than
permanent.** A fourth repository was made and then folded back on the same day: glTF and Lottie split
their specifications because several implementers with different owners read them, and there is one
implementation and one author here. [`SPECIFICATION.md`](SPECIFICATION.md) is that document, and the
discipline the split would have bought is a rule instead: **it changes before the code does.** It
moves out when a second implementation exists, or when a tool wants the types and a validator without
the whole library, which is also when `@altpsyche/figure-format` becomes a package.

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

The package is 8,316 lines of source across `values`, `timing`, `figure`, `paint` and the door, 166
exported values counted as a top-level `export const`, `function` or `class` in those directories, and
785 tests over 47 files. Twenty-one builders return a node. This is a rewrite of
the middle of the package.

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

**A drawn string is a template with holes rather than an expression that joins text.** The flat demo's
reading is `` `slope ${labelFor(slopeOf(curve, x), 0.01)}` ``, so its content is a fixed word beside a
formatted number. `labelFor` is a published function the vocabulary already calls, and joining its
answer to the word is the one string operation a demo asks for. A text node carrying `slope {0}` and
one expression per hole answers it, which keeps the expression form over numbers and points and gives
a renderer substitution rather than a string algebra to implement.

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

### Node kinds, twenty-one of them

A node kind is a named record with parameters. Three of them are the kinds of the tree itself and the
other eighteen are builders that resolve into a tree of those three, so a resolver hands back a `Node`
that `flatten` already walks.

**A camera counts as a function.** A built `Camera3` carries `project` and its `Projection` carries
`place`, so every kind taking one carries two closures, and what a figure stores is a `Camera3Choice`.

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
| `riemannBars` | coords, the curve, options | **yes**, the curve |
| `vectorField` | coords, the field, options | **yes**, the field and two options |
| `polyline3` | points, camera, options | **yes**, the camera |
| `dot3` | at, radius, fill, camera | **yes**, the camera |
| `text3` | at, content, size, camera | **yes**, the camera |
| `arrow3` | from, to, camera, options | **yes**, the camera |
| `axes3` | camera, options | **yes**, the camera |
| `scene3` | items, camera | **yes**, the camera |
| `surface3` | the surface, camera, options | **yes**, the surface, the camera and the shading |
| `vectorField3` | the field, camera, options | **yes**, the field, the camera and two options |

### Item producers, two of them

These return `SpaceItem[]`, the list `scene3` sorts by depth and draws. A figure uses one inside a
`scene3` beside its other items, which is what neither of them being a node is for.

| producer | parameters | carries a function |
| --- | --- | --- |
| `surfaceCells` | the surface, camera, options | **yes**, the surface, the camera and the shading |
| `fieldArrows3` | the field, camera, options | **yes**, the field, the camera and two options |

### Path producers, eleven of them

These return a `Path` rather than a node, so a figure uses one inside `shape`. In the format a path is
either written out as cubics or named as one of these with its parameters, and which of the two is a
choice per figure rather than a rule.

**Four work in the graph domain and seven are shapes.** The graph four carry a curve except
`bracePath`, the seven carry nothing, and `pathFromData` is the written form for a path that is none
of the ten named ones. `straight` is beside them and returns one `Cubic` rather than a path.

| producer | parameters | carries a function |
| --- | --- | --- |
| `plot` | coords, the curve, options | **yes**, the curve |
| `areaUnder` | coords, the curve, over, options | **yes**, the curve |
| `tangentAt` | coords, the curve, x, options | **yes**, the curve |
| `bracePath` | from, to, options | no |
| `line` | from, to | no |
| `polyline` | points | no |
| `polygon` | points | no |
| `rect` | corner, width, height | no |
| `circle` | centre, radius | no |
| `arc` | centre, radius, from angle, to angle | no |
| `pathFromData` | the path data of an SVG `d` attribute | no |
| `straight` | from, to, and it returns a `Cubic` | no |

### Path operations, ten of them

These take a path and hand one back, so no table above holds them and the inventory read from return
types missed all ten. **Three of them are named by a figure and the other seven are not.** The boolean
demo names `unionOf`, `intersectionOf` and `differenceOf`, and each of those is a real operation over
two paths rather than a shape with parameters: the answer's cubics are not the operands' cubics. The
other seven run inside an animation or inside the resolver, so a figure never carries one.

| operation | what it takes | who names it |
| --- | --- | --- |
| `unionOf` | two paths | a figure, in the boolean demo |
| `intersectionOf` | two paths | a figure, in the boolean demo |
| `differenceOf` | two paths | a figure, in the boolean demo |
| `trimPath` | a path and a fraction | `draw` |
| `lerpPath` | two paths and a fraction | `morph` |
| `alignPaths` | two paths, and it returns two | `morph` |
| `outlinePath` | a path and a width | the resolver, on every tapered stroke |
| `transformPath` | a path and a `Mat3` | the resolver, on a group's transform |
| `cutPath` | a path and a rectangle | `unionOf` and its two siblings |
| `splitCurve` | one `Cubic` and a fraction | `cutPath` and `alignPaths` |

### Point producers, two of them

These return points rather than a path, `Vec2[]` and `Vec3[][]`, and a figure passes what comes back
to `straight` or to `polyline3`.

| producer | parameters | carries a function |
| --- | --- | --- |
| `streamlineOf` | the field, from, options | **yes**, the field |
| `sectionOf` | the surface, plane, options | **yes**, the surface |

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

A timeline is a list of spans, and `figure/timeline.ts` compiles it from calls to `play`, `together`,
`stagger` and `wait`. **A `Span` is an entry, a `from`, a `to` and a `curve`**, and the timeline holds
its own duration beside the list. An `after` offset is folded into the next `from` when the call is
made and a stagger's `gap` into successive `from`s, so neither survives into the data. The `curve` is
a resolved function, defaulted to `curveFor(true, true)`.

The flat demo's timeline is thirty spans, twenty-three of them in its entrance, and the entrance is
eight builder calls of which six carry a negative offset.

**This was missing from the first inventory entirely.** It is not a node and not an animation, and it
has to serialise before any figure does.

### The extent, and the view entries folded over it

`ExtentChoice` is `Extent | ((aspect: number, seconds: number) => Extent)`, and a view that moves is
no longer either of those. 1.5.0 made it a timeline entry, so the flat demo declares a plain extent
and plays one `followView` over it, holding the dot within 2.14 figure units of the middle: its reach
is 1.2 and its room is 0.62, and the room binds at both ends of the walk.

**This was missed when the flat demo was written out as data**, which is worth recording as a warning
about the exercise rather than only as an omission. Reading a figure and believing it has been
understood is not the same as writing every one of its parameters down. It was missed a second time
in the same paragraph: 1.5.0 measured the bound at 2.14, corrected step 7 and left this saying 1.2.

### The value types, eleven of them

A parameter is often not a number. `Coords`, `Scale`, `Interval`, `Extent`, `Camera3Choice`,
`Mat3`, `Style` with its `Stroke`, its `Fill` and the `Bounds` it carries as a clip, `Equation`, a
`Track`, a `Curve`, and an `Inset`. Each needs a written form, and each is small, and there are eleven
of them. The choice is in this list rather than the `Camera3` it builds, because the built one carries
closures. `Bounds` is inside `Style` rather than beside it, since 1.6.0 put the clip there and the
written form for a style is what gains a field.

### What the inventory changes about the plan

**Nineteen names at the door take a function or a value carrying one, three more carry one in a field
of a type rather than a parameter, and twelve shapes of function exist among them.** A
curve of one number, a flat field of a place, a space field of a place, a surface of two numbers, a
magnitude to a length, a magnitude to a colour, an amount to a fill, a number to a string, an aspect
with a clock to an extent, a point to a projected point, a fraction to a fraction, and a clock with
its track values to a tree.
Every other builder and every other animation is already a record of values wearing a function call's
clothing.

`countTo` is the smallest and it is worth naming because it is not a curve at all. Its writer is
`(value) => labelFor(value, 0.01)` in its one use in a demo, so the parameter becomes how a number is
written: a precision, and later a choice of forms if a figure ever needs one. The suite passes it
three precisions, 1, 0.01 and 0.001, which is what says a precision is the parameter rather than the
one figure that draws it.

**So the vocabulary is twenty-one node kinds, two item producers, eleven path producers, two point
producers, fifteen animation kinds, one timeline structure and eleven value types**, which is
sixty-three things.

### What splitting steps 3 and 4 corrected in the inventory

**Three of the counts above were wrong**, because the tables were built from the names at the door
and splitting the two steps meant reading each builder's return type instead.

**There are twenty-one node kinds rather than nineteen, and two item producers nobody counted.**
`riemannBars` returns a `GroupNode` and was counted as a path producer. `vectorField3` returns one and
was missed. `surfaceCells` and `fieldArrows3` return `SpaceItem[]`, which is a third thing a figure is
made of: the list of items `scene3` sorts and draws, rather than a node or a path.

**Three of the twenty-one are the tree's own kinds and the other eighteen are builders over them.**
`figure/node.ts` publishes `shape`, `text` and `group`, and every other kind resolves into a tree of
those three. A resolver hands back a `Node` that `flatten` already walks, so nothing below the line
moves for any of the twenty.

**A path needs a written form before anything that takes a path does.** Ten operations take a path
and hand one back and no table held any of them, which the section above corrects. Four producers work
in the graph domain: `plot`, `areaUnder`, `tangentAt` and `bracePath`. Six more are shapes in
`figure/path.ts`: `arc`, `circle`, `line`, `polygon`, `polyline` and `rect`, with `straight` beside
them returning one `Cubic`. `pathFromData` reads a path out of SVG path data, which is a written form
the format can carry as it stands. `streamlineOf` and `sectionOf` produce points rather than paths,
`Vec2[]` and `Vec3[][]`, and were uncounted too.

**Nineteen names at the door take a function or a value carrying one, and twelve shapes of function
exist among them rather than three.** The tables above mark eighteen of the nineteen and `slopeOf` is
the one they miss, because it returns a number rather than a node, a path, an item, a point or an
animation, so none of the five tables has a row for it. **Three more carry a function in a field of a
type rather than in a parameter:** `PlayOptions.curve` is a `Curve`, `Figure.scene` may be a function
of the clock and its sampled values, and `ExtentChoice` is an `Extent` or a function of the aspect and
the clock. The earlier readings of sixteen and seventeen were both undercounts.
The tables marked the parameters that are a curve or a surface and missed the rest.
`Camera3` carries `project` and a `Projection` carries `place`, so a camera is a resolved value
holding two closures and what a figure stores is a `Camera3Choice`. `VectorFieldOptions` and
`VectorField3Options` each carry `lengthOf` and `colourFor`. `Surface3Options` carries `shade`. And
`Figure.scene` may be a function of the clock and the sampled values.

**The option functions need four named forms and no expression at all.** The two demos pass five of
them between them and each is one of four shapes: a constant, `() => flow.colour`; a threshold,
`(magnitude) => magnitude > 3 ? steep : gentle`; a saturating length,
`(magnitude) => 0.34 * magnitude / (0.6 + magnitude)`, which both demos use with a different
softness; and a ramp through a band, `shadeOf(interval.remap(amount, FACING, interval(0, 1)))`. So
`lengthOf`, `colourFor` and `shade` become a named form with parameters, which is a smaller answer
than the expression form.

**The solid demo's camera is a function of a track.** `eyeAt` puts the eye at `4.6·cos(2πt)`,
`4.6·sin(2πt)`, `2.6`, so either the expression form of step 2 carries a sine and a cosine of a scaled
track value or an orbit is a named camera form of its own. This is the second place after the flat
demo's arc-length walk where a demo asks the expression form for arithmetic, and it is the reason the
camera gets a step to itself.

**A seventeenth name carries a function and it is the pacing.** `PlayOptions.curve` is a `Curve`,
which is `(along: number) => number`, and `Timeline.play` defaults it to `curveFor(true, true)`. So a
timeline as data names a curve rather than carrying one, and the name it carries is the `CurveName`
1.2.0 closed the set of: six curves, with `curveNamed` reading a name and `nameOfCurve` writing one
back. A `Key` already names one, so step 6 has a written form for a track's pacing and needs one for
a timeline entry's.

**Eleven names at the door are drawn by no demo**, so a version cut against demos leaves them
unchecked. They are `numberLine`, `callout`, `riemannBars`, `dot3`, `text3`, `arrow3`, `surface3` and
`vectorField3`, and the animations `morph`, `moveAlong` and `scale`. `fadeTo` is not among them: the
solid demo plays two of them to walk its rule and its title away and back. Each gets a test comparing the
record's marks against the call's at one time, which is the same oracle a demo gives over a smaller
picture.

## The scope, told without flattering it

An earlier version of this document said thirty of thirty-nine are "a rename of arguments into
fields". That is true of the shape and false about the work, and it is worth correcting rather than
leaving.

**A rename is not free thirty times over.** Each kind needs a record type, a resolver, a test that
the record draws what the call drew, a reference entry, and a parameter name chosen to agree with the
other forty-nine. The last of those is a design running through all of them rather than a decision
taken once.

**Two of the eleven steps were not commit-sized and this file's own rule says they must be.** Step 3
covered the node kinds and the path producers in one bullet and step 4 covered fifteen animations.
Both are written out as fifteen commits between them, and writing them out is what corrected the
counts above.

**Four surfaces have to be rewritten and none was counted.** The four demos are 1,484 lines and every
one becomes a file. The guide is 709 lines and teaches the API that is changing. The reference is 976
lines and names every parameter that is being renamed. The website's figures move from modules to
files, which its own document describes and does not scope.

**This is almost certainly 2.0.0 rather than a minor.** `plot` returns a `Path` today and would
return a record. A consumer calling it breaks. The door was frozen at 1.0.0 five commits ago and a
frozen door is what a major exists for, so either the old calls keep working beside the new ones,
which means two APIs and two things to test, or the version goes to two. **That is Siva's call and
this plan assumed a minor without asking.**

**Realistic shape: forty-one commits over the vocabulary and the surfaces, plus the
site.** Against evenings and weekends that is months rather than weeks. The plan is still worth doing
and the reasons in this document are unchanged. What was wrong was the size written next to them.

## The steps

Each is commit-sized and names what its commit will measure. **The measurement is the same throughout
and it is the reason this plan is checkable: a figure as data draws mark for mark what the TypeScript
figure draws, compared by tolerance.** The demos are already the conformance suite.

**Steps 3 and 4 are written out, which is what the session of 2026-09-08 did.** Step 3 is thirteen
commits and step 4 is five, each named below with the demo whose marks measure it. Step 11 cuts the
version and there is no step between it and step 10. **Step 7.5 was added by the audit of the 1.x
band**, since 1.6.0 gave a figure insets and nothing here carried them.

**The honest count is forty-one commits rather than twelve to sixteen.** Seven of the thirteen steps
are one commit each. Step 3 is fourteen, step 4 is five, step 5 is eight and step 12 is two, the last
two written on 2026-09-09. Step 8 rewrites the three demos step 5.8 leaves and is three. Step 9
rewrites the guide and the reference and is two. **Step 12 is worked after step 5 rather than in its
written place**, and the numbers stay as they are because three steps name step 5 by number and
renumbering would leave those pointing at nothing. The site is not counted here at all, since it is a
release away and has a document of its own.

- [x] **1. The readers take geometry rather than functions.** `slopeOf(coords, curve, x)`,
  `areaUnder(coords, curve, options)` and `tangentAt(coords, curve, x, options)` all take the plotted
  path. **Measured:** the slope read off a path is the closed-form derivative of `x²` to twelve places
  at five x, and a sine to 1.57e-3, which is a tenth of the sample step squared; seven of the eight
  sheets are byte for byte as committed and the flat demo's strip moves one piece boundary of its
  frame-1 tangent, thinning that tapered stroke by a tenth of a pixel on the mean, which is the
  outliner's own instability and is filed; the suite from 785 to 787.

- [x] **2. The expression form, and the evaluator for it.** `Expression` is a literal, a track, a
  bound variable, a point, a member, arithmetic, a comparison, a choice or a call, and
  `evaluate(expression, bindings)` is what reads one. `EXPRESSION_FUNCTIONS` is the published set of
  thirty-four names. **It is an expression over a point and not only over a track value**, which is a
  requirement rather than a preference: the same vocabulary then carries a curve of one number, a
  parametric curve, a field of a place, a surface of two numbers and a pointwise map of a shape, where
  a form designed for a scalar first and widened afterwards is a major of the format's own version.
  **Measured:** all thirty-four functions and all four operators and all six comparisons answer what
  the TypeScript answers at ten inputs, the operators and comparisons over all hundred pairs of them;
  a complex square, a complex exponential and a Möbius map each read at ten places; an unknown name
  refused with the sentence naming it, and so are a wrong argument count, a place where a number
  belongs, a choice made on a number, a missing track, a missing variable and a list-valued track; the
  door from 266 names to 274 and the suite from 787 to 808.

  **What the set leaves out and where it arrives.** A call taking geometry is not in it: `pointAlong`,
  `lengthOf` and `slopeOf` all take a path. This said they would join the set with the written form
  for a path, and step 3.2 gave a path its form and left the set at thirty-four, because a call taking
  a path widens `ExpressionValue`. They arrive at step 3.12 instead. `labelFor` is not in it either and never will be, because a drawn string is a
  template with holes and a hole carries the precision it is written with, which leaves the
  vocabulary over numbers and points alone.

  **What the point form buys and what it still refuses.** Manim applies any Python function to every
  point of a shape, which is `Homotopy`, `PhaseFlow` and `ApplyPointwiseFunction`, and a closed
  format cannot. An expression over a point reaches the maps those are used for, a complex square, an
  exponential and a Möbius map among them, and a map outside the vocabulary is refused rather than
  drawn. That refusal is the price of the format being closed and it is the one place the price
  shows.

- [x] **3. The node vocabulary, which is fourteen commits.** Twenty-three node kinds, two item producers,
  eleven path producers and two point producers as records with parameters, and a resolver from a record to the nodes that exist now. The
  authoring calls keep their names and their arguments and return records. **The measurement every
  one of the fourteen quotes is the same:** the demo that draws the kinds of that commit gives the same
  marks at its own named times, within tolerance, built through records rather than calls, and the
  suite grows. A kind no demo draws is measured against its own call at one time instead.

  - [x] **3.1 The node record and the resolver, with the three kinds of the tree.** A record is a
    kind, a name and its parameters, and a group's children are records. `shape`, `text` and `group`
    are the three, and `resolveNode` walks a record into the `Node` that `flatten` already takes.
    **A text record's content is a template with numbered holes and one expression per hole**, since
    the flat demo's reading is a word beside a formatted number and nothing in the expression form
    joins text.
    **Measured:** the rotation demo built from records draws the same eight marks at each of the four
    times its strip draws, within a tolerance of 1e-6, and in the same order under the same ids; a
    group record with its style dropped falls its four text marks back to `sans-serif` and a
    translation of one unit on the root moves all eight, which is what says the comparison can fail;
    the flat demo's reading is `slope 0.00` at three of its named times, `slope 1.16` at the fourth
    and `slope 6.00` at the last three, written from the template `slope {0}` and one hole at a
    precision of 0.01; three precisions, 1, 0.01 and 0.001, write a third as `0`, `0.33` and `0.333`;
    a hole the list has no entry for and a hole given a place or a true or false are each refused with
    the sentence naming it; the suite from 808 to 822 and the door from 274 names to 283.
    **It is the rotation demo rather than the boolean one**, because the
    boolean demo's scene is a boolean operation over a track value and step 3.3 is what carries that.

  - [x] **3.2 A path as data.** `PathRecord` is `line`, `polyline`, `polygon`, `rect`, `circle`, `arc`,
    `data` for the path data of an SVG `d` attribute, or `cubics` for a path written out, and
    `resolvePath` reads one. **`straight` gets no form and the plan was wrong to name it**, since it
    hands back one `Cubic` rather than a path and a path written out as cubics already carries its
    controls, so the seven forms are the six shapes plus the SVG string rather than seven shapes.
    **A path written out needs no new shape either**, because a subpath is a point, a list of cubics
    and whether it closes, which is data already.
    **Measured:** each of the seven forms resolves to what its own call returns within a tolerance of
    1e-6, with the same subpath count, the same curve count per subpath and the same closure; a
    polygon against a polyline of the same points reads as different, which is what says the
    comparison can fail; a resolved arc of a whole turn at radius 2 and a resolved circle at radius 1
    each leave the true radius by 2.7252e-4 of it, inside the 2.6 to 2.8 the suite already holds
    `circle` to; the rotation demo's two panels are records top to bottom, their discs as `circle` and
    their Ls as `polygon`, and still draw the same eight marks at each of the four times its strip
    draws; a form the set has no entry for is refused with the sentence naming it; the suite from 822
    to 830 and the door from 283 names to 285.

  - [x] **3.3 The boolean operations as records.** `union`, `intersection` and `difference` are forms
    of `PathRecord` over two path records, since the answer's cubics are not the operands' and a
    walking disc changes the answer every frame. The other seven operations get no written form,
    because each runs inside an animation or inside the resolver and a figure never names one.
    **The walking disc is also what made every path parameter an expression**, which is the clause
    above read as the requirement it is: step 3.2 left the parameters as values, and a form written
    for a value and widened afterwards is the trap step 2 named. So a path parameter is an
    `Expression` and `resolvePath` takes bindings. **A bare point is now a literal place**, told from
    the `point` form by carrying no `kind`, which is what keeps a fixed parameter written as itself
    rather than as a record of two numbers. A boolean operation's tolerance stays a plain number,
    since nothing a figure animates changes how close two things come before they count as one place.
    **Measured:** the boolean demo's twelve marks at each of its seven named times, mark for mark
    within a tolerance of 1e-6, through records whose walking disc is a track read through an
    arithmetic expression; the three results alone at the four cases its walk takes the operation
    through, clear of each other, touching at one point, crossing at two, and one wholly inside the
    other; a union of two discs reading as two loops clear of a crossing and one loop crossing and
    contained; a radius spelled as one plus two against a radius of three, within tolerance; three
    refusals naming what was asked for, a place where a radius belongs, a number where a centre
    belongs, and a number among a polygon's points; the suite from 830 to 838 and the door unchanged
    at 285, since both names were already published at step 3.2.

  - [x] **3.4 The graph path producers.** `plot`, `areaUnder` and `tangentAt` are forms of
    `PathRecord` whose curve is an expression, and so is `bracePath`. Step 1 has already made the
    readers take geometry, so the curve is all that is left in these three. `riemannBars` is not
    here, because it returns a node. **A plotted curve's variable is `x` by a rule rather than by a
    field**, which keeps the form closed: a figure naming its own variable would be a renderer looking
    a name up rather than binding one. **A plot's `over` is an `IntervalRecord`**, since the flat
    demo's shaded region runs from nothing to the x its dot stands at, and a plain `Interval` is one
    already because a bare number is a literal.
    **Measured:** the flat demo's parabola from the expression `x * x`, its shaded region and its
    tangent, path for path within a tolerance of 1e-6, the region and the tangent at each of its
    seven named times with the x its dot stands at bound as a variable; a plot at a resolution of 8
    over -1 to 2 against its own call; a brace against `bracePath` with and without a curl; a region
    over a track at 1 and at 3 reading as different, which is what says the comparison can fail; two
    refusals naming what was asked for, a curve that reads as a place and a baseline that reads as
    one; the suite from 838 to 845 and the door from 285 names to 286.
    **The reading is taken where the tree is flattened rather than off the figure**, because a figure
    outlines a tapered stroke after its timeline has run and the tangent it hands back is the polygon
    round the line. What a path producer answers for is the geometry it makes.

  - [x] **3.5 The annotation nodes.** `dot`, `arrow`, `brace` and `callout` are forms of `NodeRecord`,
    each resolving through its own call rather than by rebuilding what the call builds, so a brace's
    curls and an arrow's head stay one piece of arithmetic with one set of gates over it.
    **No demo draws a bare `arrow` and the plan was wrong to say one does**, since the flat demo's
    arrows all come from `vectorField`, which is step 3.8, and its axis tips from `axes`, which is
    3.6. So `arrow` is measured against its call the way `callout` is.
    **Measured:** the flat demo's walking dot at each of its seven named times, mark for mark within
    a tolerance of 1e-6, with the place it stands bound as a variable, and reading as different
    between two of those times; its brace and the word on it, both marks, with the word `9.00` from a
    template at a precision of 0.01; the rotation demo's two pivots as `dot` records, still drawing
    the same eight marks at each of the four times its strip draws; `arrow` and `callout` against
    their calls, with a head of 0.4 and a spread of 0.9 carried through and reading as different from
    the defaults, and a callout marker of nothing leaving two marks rather than three; an arrow whose
    end follows a track reading as different at 1 and at 4; three refusals naming what was asked for,
    a number where a dot's place belongs, a place where its radius belongs, and a kind the vocabulary
    has no entry for; the suite from 845 to 856 and the door from 286 names to 293.

  - [x] **3.6 The graph frame nodes.** `numberLine`, `axes`, `numberPlane` and `riemannBars` are
    forms of `NodeRecord`, each resolving through its own call, so the tick list and the scale stay
    where they are. **The frame options are the values the calls already take rather than
    expressions**, because a frame is the furniture a figure draws its moving parts on, no demo
    animates a tick length, and widening a number to an expression later costs a minor rather than a
    major since a bare number is a literal already. `riemannBars` is the exception: its curve is an
    expression the way a plot's is, and its `over` is an `IntervalRecord`, since a figure that walks
    the bars across a graph moves both ends of the run.
    **The solid demo's axes are `axes3` and the plan was wrong to name them here**, so they arrive at
    step 3.10 with the rest of the space nodes.
    **Measured:** the flat demo's number plane, all 42 of its marks, and its axes, all 27 of theirs,
    mark for mark within a tolerance of 1e-6; a grid at four minors against one at two reading as
    different, which is what says the comparison can fail; the axes holding still at each of the
    flat demo's seven named times, since a frame does not follow a clock; `numberLine` and
    `riemannBars` against their calls, the bars from the expression `x * x` at six bars over 0 to 3
    read at the middle; a run of bars walked across the graph on a track reading as different at 0
    and at 2; a bars curve that reads as a place refused with the sentence naming it; the suite from
    856 to 865 and the door from 293 names to 298.

  - [x] **3.7 The equation node.** `equationNode` is a form of `NodeRecord`, and an `Equation` stays
    resolved geometry a figure carries rather than TeX a renderer typesets. That is the answer to
    where text's geometry is settled: a figure carries what MathJax produced, so a renderer draws the
    expression without MathJax and two machines draw the same glyphs. The place it is hung from is an
    expression, since the flat demo hangs both its rules off a frame that follows the dot, and the box
    it is fitted inside is layout.
    **Measured:** both of the flat demo's rules, glyph for glyph, at each of its seven named times,
    within a tolerance of 1e-6, with the corner of the frame bound as a variable; seven glyphs for
    `\frac{dy}{dx} = 0` and eight for `\frac{dy}{dx} = 2x`; the two rules reading as different
    between two of those times, which is what says the place is not fixed; the written form of the
    first equation is 32,936 bytes and the second 42,224, and neither carries the string `frac`; a
    place that reads as a number refused with the sentence naming it; the suite from 865 to 870 and
    the door from 298 names to 300.
    **The bytes are the price of the answer and they are worth stating.** A figure carrying two
    typeset rules carries 75 kilobytes of glyph outlines, where the TeX behind them is 34 characters.
    What buys it is that no renderer needs a typesetter and no two machines disagree about a glyph.

  - [x] **3.8 The field node.** `vectorField` is a form of `NodeRecord` whose field is an expression
    of the bound variable `at`, the place being sampled, giving the vector there.
    **`lengthOf` needs no named forms and the plan was wrong to give it any**, because the expression
    form already spells all three: a constant is a literal, a saturating length is arithmetic, and a
    threshold is a choice on a comparison. So it is an expression of the bound variable `magnitude`.
    **`colourFor` does need a form of its own**, since the expression vocabulary is over numbers and
    points and has no colour. `ColourChoice` is a bare colour or a `bands` choice, a first colour and
    a list of thresholds each with the colour above it, walked in order so the last threshold a
    magnitude clears is the one that decides.
    **Measured:** the flat demo's slope field, all 42 of its arrow marks at 7 by 3 samples, mark for
    mark within a tolerance of 1e-6, and every one of them the colour the demo gives it, which is two
    colours across the field; the saturating length against `0.34·m / (0.6 + m)` at ten magnitudes,
    each as a single arrow beside the same field built from the TypeScript closures; a bare colour
    giving one colour across the whole field; three bands read at 0.5, 3 and 9 giving the first, the
    second and the third; a field whose vector follows a track reading as different at 1 and at -1; a
    field that reads as a number refused with the sentence naming it; the suite from 870 to 877 and
    the door from 300 names to 303.

  - [x] **3.9 The camera as parameters rather than a closure.** A figure stores a `Camera3Record` and
    `resolveCamera` builds the `Camera3`, since the built one carries `project` and its `Projection`
    carries `place`. `ProjectionChoice` is `perspective` or `orthographic` with the parameters its
    own builder already takes, and `resolveProjection` reads one. The solid demo's orbit is where the
    expression form meets a track for the second time.
    **A place in space is three expressions rather than one**, because the expression form is over
    numbers and points on the page and has no value for a place in space. Three expressions write the
    orbit directly, since the eye is a cosine and a sine of one track, and widening the field later
    to accept a single expression as well costs a minor rather than a major, so this does not
    foreclose a 3-D value in the vocabulary. A plain `Vec3` is a `Point3Record` already.
    **Measured:** the solid demo's camera at each of the four times its strip draws and each of its
    four named times, placing five points spread through the box the saddle stands in, agreeing with
    the built camera to twelve places across, up and in depth, and on whether each point is in front;
    the eye at 4.6 and 0 across at the start of the orbit and 0 and 4.6 a quarter round; either
    projection built from its own parameters, an orthographic at a scale of 2 placing (1.5, -0.5, -9)
    at (3, -1) with its near plane at negative infinity; a projection the set has no entry for and a
    place in space whose x reads as a point each refused with the sentence naming it; the suite from
    877 to 884 and the door from 303 names to 309.

  - [x] **3.9b Composition and camera, which is a look rather than a vocabulary.** The solid demo's
    orbit stops once, at the face of the saddle, for a second and a half. **Siva's call on 2026-09-09:**
    a quarter round, which is the bearing the saddle faces along the axis it falls away on; a second
    and a half; and the figure lengthens by the beat rather than the turn going faster either side of
    it.
    **The push moves with the beat**, since it starts after the last frame the strip shows and that
    frame is past the quarter, so `PUSH_FROM` carries the beat and keeps the 0.04 seconds of slack it
    had.
    **The rate is the same either side and neither half eases**, so what a reader sees is the stop
    rather than a change of speed.
    **Measured:** the eye at a quarter at both ends of the beat and the whole picture, marks and all,
    identical across it, where a fifth of a second either side of it is not; a rate of an eighth of
    the turn a second before the beat and the same after it, to twelve places; the figure from 11.8
    seconds to 13.3 and its walk from 354 painted frames to 399; all eight sheets byte for byte after
    `npm run demos`, since the still is drawn before the beat and the strip is drawn from fractions of
    the turn rather than from times; the suite from 957 to 959.
    **Step 7 carried the other half**, which is the extent as data.

  - [x] **3.10 The space nodes.** `polyline3`, `dot3`, `text3`, `arrow3`, `scene3` and `axes3` are
    forms of `NodeRecord`, each carrying its places as `Point3Record`s and its own `Camera3Record`,
    the way its call takes one. A `SpaceItemRecord` is the points a piece's depth is measured from
    and the node drawn for it, so `scene3` still sorts by the mean of a piece's own depths.
    **A figure repeating one camera per space node is a cost step 5 should look at**, since a file has
    no way to share a value and the solid demo names six space nodes off one camera. In TypeScript the
    same record is passed to each, so the cost shows only when a figure is written out.
    **`scene3`'s items are written-out pieces alone until step 3.11**, which adds `surfaceCells` and
    `fieldArrows3` as producers of many items. Widening the list's element type then is
    reader-compatible, so nothing written against this stops reading.
    **Measured:** the solid demo's axes, all 22 of their marks, at each of the four times its strip
    draws, mark for mark within a tolerance of 1e-6; its three runs of descent and the two runs of its
    crossing curve at those same times; the axes reading as different a half-orbit apart, which is
    what says the camera turns; `dot3`, `text3`, `arrow3` and `scene3` against their calls, since no
    demo names one directly; a dot six times the eye's own place out, which is behind the eye, drawing
    nothing from both the record and the call; a label in space written from a template as `z = 0.30`;
    a scene of two pieces drawn furthest first rather than in the order written; a place in space
    whose z reads as a point refused with the sentence naming it; the suite from 884 to 894 and the
    door from 309 names to 316.

  - [x] **3.11 The surfaces and the space fields.** `surface3` and `vectorField3` are forms of
    `NodeRecord`, `surfaceCells` and `fieldArrows3` are forms a scene's item list widened to hold, and
    `section3` and `streamline3` are the nodes that draw what the two point producers hand back.
    `shade` is a ramp of fills spread over a band rather than a function, since a fill is a colour
    written as text and nothing here parses one. A producer inside a scene takes the scene's camera,
    so a surface and a field sorted together are seen from one place.
    **Measured:** the solid demo's saddle at 144 cells, its plane at 16 and its field at 48 marks, all
    208 of the body's marks at each of the four times its strip draws, mark for mark within a
    tolerance of 1e-6; the two branches of the crossing and the three runs of descent at those same
    times; `surface3` and `vectorField3` against their own calls, since no demo names one directly;
    the ramp spread over the band reaching all twelve of its washes where the raw amount reaches
    eight; an empty ramp and a piece the scene has no producer for each refused with the sentence
    naming it; the flat demo's field walked from a record, giving the same 561 points as its call and
    never leaving the drawn curve by more than 4.688e-10 of a figure unit; the suite from 894 to 903
    and the door from 316 names to 331.

  - [x] **3.12 The three calls that take geometry join the expression set.** `pointAlong`, `lengthOf`
    and `slopeOf` each take a path, so `ExpressionValue` widened past a number, a true or false and a
    point to carry a path and a pair of scales. `path` and `coords` are the two forms that write one:
    a `path` carries a `PathRecord` and resolves it with the bindings around it, so a path whose own
    parameters follow a track is read at the time the expression is.
    **The expression form and the path form name each other**, which is what mutually recursive data
    is, and neither reads the other while it is loading.
    **The set was thirty-three names rather than the thirty-four step 2 wrote**, and one commit ever
    touched it, so that number was miscounted rather than changed.
    **Measured:** `lengthOf`, `pointAlong` at ten fractions and `slopeOf` at ten x each against their
    own calls; a path whose end follows a track measuring shorter at half the walk; the flat demo's
    reading written from a record alone at each of its seven named times, giving the same seven
    strings step 3.1 measured, `slope 0.00` three times, `slope 1.16` and `slope 6.00` three times; a
    number where a path belongs, a path where a pair of scales belongs, a pair of scales where a
    number belongs and a path with no points in it each refused with the sentence naming it; the set
    from 33 names to 36 and the suite from 903 to 913.

  - [x] **3.13 The wash over a pane, which is a fill whose axis moves.** The solid demo's pane is
    filled with a gradient whose two ends are places in space put on the page by the camera, so the
    fill turns with the orbit and step 3.11 had to build it per time outside the record. Both answers
    it left open are taken, because each needs the other: `project(camera, x, y, z)` joins the
    expression set and `camera` is the form that writes one, so `ExpressionValue` carries a camera;
    and `FillRecord` is a fill whose gradient ends are expressions, which every `Fill` already is,
    since a fixed place is a literal. A `ShadeRecord`'s ramp takes those fills, and the rest of the
    fills a record carries stay plain until a demo asks.
    **Measured:** the solid demo's body, all 208 of its marks, from one record at each of the four
    times its strip draws rather than one record per time; the wash's two ends against the demo's own
    projection to twelve places at those times, and reading as different a half-orbit apart; ten
    places put on the page where the camera itself puts them, and a camera built from a track placing
    one point differently at two of its values; a number where a camera belongs and a camera where a
    number belongs each refused with the sentence naming it; the set from 36 names to 37, the door
    from 331 to 332 and the suite from 913 to 919.

- [x] **4. The animation vocabulary, which is five commits.** Fifteen kinds as records with
  parameters, and a resolver each from a record to the `Animation` the timeline already plays. **The
  measurement every one of the five quotes is the same:** the demo that plays the kinds of that
  commit gives the same marks at the same times, and a kind no demo plays is measured against its own
  call.

  - [x] **4.1 The animation record and the four kinds that change opacity.** A record is a kind, a
    target and its parameters, and `resolveAnimation` hands back the `Animation` the timeline already
    plays. A target stays an id or the front of one. `fadeIn`, `fadeOut`, `fadeTo` and `draw`.
    **A parameter here is a plain value rather than an expression**, since an animation is built once
    and then asked what the marks are at a fraction of its own span, so a parameter following a track
    would be read at the time the figure was built and never again. Widening one later costs a minor,
    because a bare number is a literal already.
    **Measured:** the boolean demo's nine fades, three parts of each of its three panels, at each of
    its seven named times; the solid demo's two `fadeTo` at nothing and at one, at each of its four
    named times; the flat demo's `draw` over both axis lines, its curve and its brace, at each of its
    seven named times; each at nothing, a quarter, a half, three quarters and the whole of its span,
    mark for mark against its own call; `fadeOut` against its call, since no demo plays one; a group
    named by its own name faded to nothing with every mark outside it unchanged; a kind the set has no
    animation for refused with the sentence naming it; the door from 332 names to 338 and the suite
    from 919 to 925.

  - [x] **4.2 The kinds that move marks.** `moveBy`, `moveAlong`, `rotate`, `scale` and `growFrom`.
    The point a turn or a growth happens about stays in the options those calls already take, and it
    is read off the marks as they arrive where a record names none, which is what keeps a turn of a
    whole circle ending where it began. `moveAlong` carries a `PathRecord`, so a figure carrying
    something along a curve it also draws names the same form twice rather than writing the curve out
    beside the one it draws, and `resolveAnimation` takes the bindings that path is read with.
    **The rotation demo's strip is four frames rather than the eight this plan wrote**, since
    `frameTimesOf` is asked for four, and its named times are five.
    **Measured:** both riders of the rotation demo turned a whole circle, one about its own middle and
    one about the pivot the demo names, at each of its four strip times and each of its five named
    times, at five fractions of the span, mark for mark against their own calls; the whole figure
    carried into a slot the way the strip carries it; a whole turn about the marks' own middle ending
    on the marks it started from; `moveAlong`, `scale` and `growFrom` against their calls, since no
    demo plays one, and a path whose end follows a track carrying further at three than at one; the
    door from 338 names to 343 and the suite from 925 to 931.

  - [x] **4.3 The kinds that put one shape in place of another.** `morph` carries a `PathRecord`, so a
    figure that morphs into a curve it also draws names that curve's own form. `morphEquation` names
    two targets and no geometry, since both expressions are already in the scene and the glyphs are
    paired at play time.
    **Measured:** the flat demo's rule walked from one typeset expression into the other at each of
    its seven named times and five fractions of the span, mark for mark against its own call; the
    glyphs of the leaving rule standing where they stood at the start of the span; `morph` against its
    own call with a circle whose radius follows a track, since no demo plays one; the door from 343
    names to 345 and the suite from 931 to 934.

  - [x] **4.4 The kinds that make marks rather than change them.** `indicate`, `flash` and
    `circumscribe`.
    **A record does not say how the marks it adds are named and the plan was wrong to want that**,
    because the calls already name them from the target: a ray is `<target>/flash/<n>` and a shape
    round something is `<target>/circumscribed`. A record naming them again would be a second place
    the same name is written.
    **Measured:** the flat demo's dot swelled and lit, its ten rays flashed and the shape round its
    reading, at each of its seven named times and five fractions of the span, mark for mark against
    their own calls; the ten rays this animation adds named `tangent/point/flash/0` upwards and the
    one shape it adds named `tangent/reading/circumscribed`, counted past the ones the demo's own
    timeline already drew; the door from 345 names to 348 and the suite from 934 to 937.

  - [x] **4.5 `countTo`, whose writer becomes a precision.** The record carries the step the number is
    rounded and padded to rather than the function that writes it, so no animation record carries a
    function and the vocabulary is closed.
    **The call keeps its writer**, since a count of a population wants a form no precision spells, and
    a figure that needs one writes the count as a text hole following a track instead.
    **Measured:** the flat demo's counting number at each of its seven named times and five fractions
    of the span, mark for mark against its own call; the number written as `0.00` at the start of the
    span and as the label of the rise at its end; the door from 348 names to 349 and the suite from
    937 to 939.

- [ ] **5. The file: a serialiser, a reader, a validator and a version, which is eight commits.**
  **This is worked after 7.5 rather than in its written place**, because a figure written out is a
  scene, a timeline and a view, and two of the three are still functions until steps 6 and 7 land: a
  `Span` carries an `Animation` and a `Curve`, and an `Entry` may be a `ViewChange` holding a
  `ViewAnimation`. A serialiser written first would carry the scene alone and be rewritten twice. The
  numbers stay as they are, since three steps above name step 5 by number and renumbering would leave
  those pointing at nothing.

  **A file is an envelope carrying the format's version and one figure.** Steps 3, 4, 6, 7 and 7.5
  wrote the scene, the animations, the spans, the extent and the insets as records, and a track is
  keys with a curve by name, so the whole vocabulary under a figure is already values. What is
  missing is the figure itself, the bytes, the version and the refusals.

  **The writer takes a `FigureRecord` rather than a `Figure`**, since a `Figure`'s scene may be a
  closure and no reading recovers a closure. `nameOfCurve` is the one exception and it stays: a
  `Timeline` compiled by calls carries curves that can be named again.

  **The plan was written on 2026-09-09 and it corrects this step in one place.** The measures below
  said each demo written out and read back, and a demo is a module of calls until step 8, so nothing
  at step 5 could satisfy that. The rotation demo moves here instead, because a serialiser measured
  against records assembled in a test is a serialiser no picture has been through: its scene is fixed,
  its extent is fixed and it draws eight marks, which is the smallest whole figure this package has.
  Step 8 carries the remaining three.

  - [x] **5.1 The specification's file section.** What a file is, what a renderer does with a version
    it does not read, and what a refusal names. It is first because the specification changes before
    the code does, and this is the part the code below decides nothing on its own.
    **Measured:** [`SPECIFICATION.md`](SPECIFICATION.md) from 67 lines to 108, with the envelope's
    two fields and the figure's nine named, three of the nine required; the version one whole number,
    0 today, and what keeps it against what makes a new one; a refusal naming the path of the field
    from the figure down. **Five stale facts corrected rather than the three the plan named**, since
    the counts were not the only thing steps 3, 6 and 7 moved: nineteen node kinds to twenty-three,
    five path producers to thirteen forms in fifteen kinds, nine value types to eleven, the timeline
    from entries with an `after` and a `gap` to the compiled spans, and the extent from a function of
    the clock to three records with three view moves. The door and the suite unchanged at 365 names
    and 959 tests.

  - [x] **5.2 The figure as data.** A `FigureRecord` is an `ExtentRecord`, a fit, a `NodeRecord`, its
    tracks, a `TimelineRecord`, a duration, a still time, a loop flag and its insets, and
    `resolveFigure` builds the `Figure` that `marksAt` already takes. The scene is rebuilt at each
    time with the sampled track values as its bindings, so a scene driven by a track stays a record
    rather than becoming a closure again.
    **An animation's own parameters are read once**, since a figure carries one timeline and every
    time reads that same one, so a track reaches a picture through the scene rather than through a
    span.
    **Measured:** the rotation demo as one record drawing its eight marks at each of the four times
    its strip draws and at its still time of 0.75, within a tolerance of 1e-6; the boolean demo as
    one record drawing its twelve marks at each of its seven named times, whose scene is a boolean
    operation over a track; the walking disc's three marks different at the clear, the crossing and
    the inside, which is what says the scene is read again rather than kept; a duration of 6, a still
    of 0.75 and the loop flag held by `isLoop`; a `byAspect` extent giving a width of 8 at an aspect
    of 2 and a height of 8 at 0.5; an inset carried, where the figure's eight marks become fourteen
    and the panel's six each carry the clip of its rectangle; the door from 365 names to 367 and the
    suite from 959 to 965.

  - [x] **5.3 The serialiser, and the format's version.** `writeFigure` turns a `FigureRecord` into
    the text of a file, and `FIGURE_FORMAT_VERSION` is the number the envelope carries.
    **The keys are written in sorted order**, so the bytes are a function of the record rather than of
    the order its fields were built in, which is what lets a byte gate hold a figure at all.
    **The two demos moved into a fixture module of their own**, since the writer, the reader and the
    validator all read the same two records and three copies of one record is three things to correct.
    **Measured:** the rotation demo's file 6,624 bytes over 253 lines, against the 208 lines of module
    it will replace, and the boolean demo's 12,159 bytes over 453; the envelope's two keys `format`
    and `figure` and nothing else; the same figure with its six fields named in the other order
    writing the same bytes; the figure's own keys written `duration`, `extent`, `loop`, `scene`,
    `still`, `timeline`, which is sorted at every depth rather than at the top; a field that is
    absent left out rather than written as null; a number that is not finite, a hole in a list, a
    null and a function each refused with the path of the field named, `timeline.spans.1` and
    `extent.centre` among them; the door from 367 names to 370 and the suite from 965 to 974.

  - [x] **5.4 The reader, and the round trip.** `readFigure` parses the text, reads the version,
    refuses one it does not read, and resolves the figure. **The version is read before anything
    else**, since a file written in a version this package does not know may use a field for
    something else entirely.
    **Measured:** the rotation demo written out and read back drawing its eight marks at each of the
    four times its strip draws and at its still time, and the boolean demo its twelve at each of its
    seven named times, both within a tolerance of 1e-6; a duration of 6, a still of 0.75 and the loop
    flag through the file; what the reader read written again to the same 6,624 bytes; a file
    declaring version 1 refused with both numbers, `this reads version 0 of the format and the file
    is written in version 1`; a file with no version, a file with no figure, text that is not a JSON
    document and a document that is a list each refused with what was found; the door from 370 names
    to 371 and the suite from 974 to 981.

  - [ ] **5.5 The validator, and the value types and expressions.** `checkFigure` walks a value
    against a description of the vocabulary and names the path of the field it refuses,
    `scene.children.2.at.x` rather than the field's own name, since a name alone does not say which of
    forty nodes carries it. **The vocabulary is described as a table rather than as a function per
    kind**, because sixty-one kinds hand-written are sixty-one places a field can be forgotten.
    **Measures:** the eleven value types and the seven expression forms each accepted out of the two
    demos' records; each refused with the path named for a missing field, a field of the wrong type
    and a kind the vocabulary does not carry; the suite from wherever 5.4 leaves it.

  - [ ] **5.6 The validator over the nodes, the paths, the points and the items.** Twenty-three node
    kinds, eleven path producers, two point producers and two item producers.
    **Measures:** every kind accepted where its own step's test already builds it; one refusal per
    kind naming the path of the field; a group whose children hold a kind that does not exist refused
    with the index of the child in the path.

  - [ ] **5.7 The validator over the animations, the timeline, the view, the insets and the figure.**
    Fifteen animation kinds, the spans, the two extent choices, the three view moves, the insets and
    the figure's own nine fields. **An expression naming a track the figure does not carry is refused
    here**, since a renderer reading a file wants that answer before it draws rather than at the first
    time the expression is reached.
    **Measures:** each of the fifteen kinds accepted and refused with the path named; a span whose
    `to` is before its `from` refused; a view move naming a mark no scene carries refused; an
    expression reading a track the figure has no keys for refused at read time, where the same figure
    draws for four seconds before the drawing refuses it today.

  - [ ] **5.8 The rotation demo is a file.** `demos/rotate.figure.json` is written once with
    `writeFigure` and committed, `demos/rotate.ts` reads it with `readFigure`, and `readFigure` runs
    the validator over what it parsed.
    **Measures:** `docs/rotate.svg` and `docs/rotate-strip.svg` byte for byte what is committed today
    after `npm run demos`; the file's bytes and its line count against the 208 lines of module it
    replaces; a field made wrong in each of four places in the committed file refused with its path.

  #### Done-criteria for step 5

  - `FigureRecord`, `resolveFigure`, `writeFigure`, `readFigure`, `checkFigure` and
    `FIGURE_FORMAT_VERSION` are at the door, each has an entry in [`REFERENCE.md`](REFERENCE.md), and
    the reference gate holds the door and the reference equal.
  - The rotation demo and the boolean demo each written out and read back draw the same marks as
    their own figures at every named time, within a tolerance of 1e-6.
  - Two records of one figure whose fields were built in different orders write the same bytes.
  - A file declaring a format version above the reader's is refused with both numbers in the
    sentence, and a file declaring the reader's own version is read.
  - A malformed figure is refused with the path of the field named, held at one place in each of a
    value, an expression, a node, a path, an animation, a span, a view move and an inset.
  - An expression naming a track the figure does not carry is refused when the file is read rather
    than when the figure is drawn.
  - [`SPECIFICATION.md`](SPECIFICATION.md) carries the file section, and its counts are the
    inventory's.
  - `demos/rotate.figure.json` is committed, `demos/rotate.ts` reads it, and both of that demo's
    sheets are byte for byte what is committed today.
  - `npm test`, `npm run type-check` and `npm run build` all pass.

  **Gap 8 is answered and it is step 12, worked after this step.** Siva's call of 2026-09-09: a
  colour is four channels and may carry the name of a custom property a page overrides, so every
  renderer has the numbers and the sheets keep their theming. It is a step of its own rather than a
  ninth commit here, because it changes `Colour` at the door, both painters and the demos' palette,
  and the file's eight commits stay measurable one at a time.

- [x] **6. The timeline as data, and it is the compiled spans rather than the calls that built
  them.** A `SpanRecord` is an entry, a `from`, a `to` and a `CurveName`, and a `TimelineRecord` is
  those spans and how long the figure runs. `Timeline.of` builds one from spans already compiled, and
  the duration is given rather than read off them, since a figure that waits at the end runs past the
  end of its last span. The `after` offset and a stagger's gap are not in the format, because a call
  folds each into the next `from` when it is made and neither can be read back out of the numbers.
  **Measured:** the boolean demo's nine spans read from numbers rather than built, giving the same
  marks at each of its seven named times and the same duration, which is past the end of its last
  span; the curve of each of those spans carried by name, `easeOut` for the three outlines and
  `smoothstep` for the six that follow; the flat demo's thirty spans, twenty-three of them its
  entrance, and six of them starting before the one before them ends, which is what a negative offset
  looks like once it is a number; a view entry whose span has no width applied in full; the door from
  360 names to 365 and the suite from 951 to 957.

- [x] **7. The extent as data.** An `ExtentRecord` is a fixed extent, a `byAspect` choice or a
  `matchingAspect` one, and `resolveExtentChoice` builds the function a figure is handed, which
  `resolveExtent` then reads at an aspect. A `ViewChangeRecord` is `moveView`, `followView` or
  `frameView` with the parameters those calls already take, since 1.5.0 landed them as parameters
  rather than as closures over the clock.
  **The 2.14 of this plan is the dot's own travel less the frame's, not the reach plus the room.**
  The dot reaches 2.76 from the middle of the picture and the room caps the frame's travel at 0.62,
  which leaves 2.14; the reach of 1.2 is the margin the view holds still inside, and the room binds
  before it does.
  **Measured:** the flat demo's follow from a record giving the extent its own call gives at each of
  the demo's seven named times; the dot held within 2.14 figure units of the middle of the frame over
  201 steps of the whole figure, where it travels 2.76 from the middle of the picture; a framing of
  the demo's brace and its reading holding both inside the frame at every named time it draws them,
  and equal to its own call there; `moveView` at three fractions of a span against its call; the two
  extent choices against theirs at five aspects; a view move and an extent the set has no form for
  each refused with the sentence naming it; the door from 349 names to 358 and the suite from 939 to
  948.

- [x] **7.5. The insets as data.** An `InsetRecord` is the extent it shows, the rectangle it draws
  into, a fit, one `ViewChangeRecord` applied in full, a name and the marks it hides, and
  `resolveInset` builds the view move. Every field is a value the steps above carry, so this added no
  vocabulary.
  **What holds a panel inside its rectangle is the clip on every mark rather than the geometry**,
  since a magnified curve runs well past the rectangle and is cut at paint time.
  **Measured:** the flat demo's inset built from a record giving the same marks as the demo's own at
  each of its seven named times, which is 32 to 40 marks against the 178 to 186 the whole figure draws
  there; every mark of the panel carrying a clip inside the rectangle at each of them; an inset with
  no view move of its own carried through unchanged; the door from 358 names to 360 and the suite from
  948 to 951.

- [ ] **8. The three demos step 5.8 leaves, rewritten as files**, 1,298 lines of module becoming
  descriptions. The rotation demo is a file already, since a serialiser measured against records
  assembled in a test is a serialiser no picture has been through.
  **Measures:** all eight sheets byte for byte as committed after `npm run demos`.

- [ ] **9. The guide and the reference rewritten.** 709 and 976 lines describing an API that changed.
  **Measures:** the guide's code blocks compiling in order; the reference's entries against the door
  with the gate holding them equal.

- [ ] **10. The demos are the conformance suite.** The gate reads each figure from its file rather
  than from its module. **Measures:** the whole suite green with every demo loaded as data; the byte
  gate on all eight sheets unchanged.

- [ ] **11. Cut 2.0.0.** The version bumped in this commit, `npm install --package-lock-only` in the
  same one, the done-criteria verified line by line with the number that satisfies each, and
  publishing asked for rather than assumed. It is a major because `areaUnder`, `plot`, `riemannBars`,
  `slopeOf` and `tangentAt` are all at the door and all change shape. **Measures:** the three gates;
  all eight sheets identical after `npm run demos`; the door and the suite from 266 names and 785
  tests; the specification's own version, which is separate from this one.

- [ ] **12. A colour is channels and a name, which is two commits and is worked after step 5.**
  Siva's call of 2026-09-09, and it is gap 8 of the GPU spike. A mark's colour is a CSS string today,
  the four demos paint every mark as `var(--name, #rrggbb)`, and a shader wants four numbers while a
  renderer in another language cannot read a custom property at all. **A colour becomes four channels
  and an optional name**, so a renderer reads the numbers, the SVG painter writes the `var()` it
  writes now, and the palette's two values per ground stay where they are, in the demos and in the
  sheet's own theme block. **The number is here rather than after step 8**, since a colour written
  into four demo files and changed afterwards is four files rewritten twice.

  - [ ] **12.1 The colour at the door and in both painters.** `Colour` is a record of `r`, `g`, `b`,
    `a` and an optional `name`, `values/colour.ts` reads the two text forms into one, and the SVG and
    canvas painters write from the record.
    **Measures:** all eight sheets byte for byte as committed after `npm run demos`; the flat demo's
    forty-three colours at its still time each carrying four channels and the name they are written
    to; the contrast readings against both grounds unchanged.

  - [ ] **12.2 The colour in the records and in the palette.** `ColourChoice`, `ShadeRecord` and a
    gradient's stops carry the record, and `demos/palette.ts` hands one out rather than a string.
    **Measures:** the vector field's two colours and the surface's shade ramp giving the same marks as
    their own calls within 1e-6; the sheets byte for byte; a colour that is neither a hex nor an
    `rgb()` refused with the text it was given.

#### Done-criteria

- Every demo is a file, and reading it draws marks identical within tolerance to the module it
  replaced, at every named time, the flat demo's inset included.
- None of the nineteen names at the door that take a function takes one, the three fields of a type
  that carry one carry a named form instead, no figure holds a closure, and a figure stores a
  `Camera3Choice` rather than a built `Camera3`.
- The vocabulary is twenty-one node kinds, two item producers, eleven path producers, two point
  producers and fifteen animation kinds, and the reference names each with its parameters.
- Every one of the eleven names no demo draws has a test comparing its record's marks against its
  call's.
- The expression vocabulary is closed, published, and refuses a name it does not know.
- The format carries a version, an old figure keeps rendering, and a validator names the field that
  is wrong.
- A colour is four channels and an optional name, no mark carries a CSS custom property, and every
  sheet is byte for byte what it is today.
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

Four renderer versions came off the ladder, because each would have been written against an API this
format reshapes, and they are recorded in [`ROADMAP.md`](ROADMAP.md) so they are not rediscovered.

**Six look-and-feel versions went on in front of this one**, and that is Siva's call rather than a
softening of the freeze. Each of the six changes a value type this format is about to freeze a
written form for: 1.1.0 the sizes and the font a `Style` carries, 1.2.0 the set of names a `Curve`
can be, 1.3.0 what a `Stroke`'s width may be, 1.4.0 what a `Fill` may be, 1.5.0 how a view that moves
is written down, and 1.6.0 the clip a `Style` carries and the inset a `Figure` does. Freezing before they
land costs a major of the format's own version to add them afterwards, since an old figure has to
keep rendering, and freezing after costs rewriting four demos' syntax in step 8, which is
mechanical.

One item survives in another repository regardless of what happens here, and it is the engine's
stencil. That document says why.
