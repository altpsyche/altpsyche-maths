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

A timeline is a sequence of entries built by `play`, `together`, `stagger` and `wait`. Each entry
carries its animations, its duration, an `after` offset that may be negative so two runs overlap, and
for a stagger a `gap`. The flat demo's entrance is eleven such entries and five of them carry a
negative offset.

**This was missing from the first inventory entirely.** It is not a node and not an animation, and it
has to serialise before any figure does.

### The extent, which is a function of the clock

`ExtentChoice` is `Extent | ((aspect: number, seconds: number) => Extent)`. The flat demo's is a
function: the view follows the dot across, holding it within 1.2 figure units of the middle.

**This was missed when the flat demo was written out as data**, which is worth recording as a warning
about the exercise rather than only as an omission. Reading a figure and believing it has been
understood is not the same as writing every one of its parameters down.

### The value types, nine of them

A parameter is often not a number. `Coords`, `Scale`, `Interval`, `Extent`, `Camera3Choice`,
`Mat3`, `Style` with its `Stroke` and `Fill`, `Equation`, and a `Track`. Each needs a written form,
and each is small, and there are nine of them. The choice is in this list rather than the `Camera3` it
builds, because the built one carries closures.

### What the inventory changes about the plan

**Sixteen names at the door carry a function and eleven shapes of function exist among them.** A
curve of one number, a flat field of a place, a space field of a place, a surface of two numbers, a
magnitude to a length, a magnitude to a colour, an amount to a fill, a number to a string, an aspect
with a clock to an extent, a point to a projected point, and a clock with its track values to a tree.
Every other builder and every other animation is already a record of values wearing a function call's
clothing.

`countTo` is the smallest and it is worth naming because it is not a curve at all. Its writer is
`(value) => labelFor(value, 0.01)` in every use, so the parameter becomes how a number is written:
a precision, and later a choice of forms if a figure ever needs one.

**So the vocabulary is twenty-one node kinds, two item producers, eleven path producers, two point
producers, fifteen animation kinds, one timeline structure and nine value types**, which is sixty-one
things.

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

**A path needs a written form before anything that takes a path does.** Four producers work in the
graph domain: `plot`, `areaUnder`, `tangentAt` and `bracePath`. Six more are shapes in
`figure/path.ts`: `arc`, `circle`, `line`, `polygon`, `polyline` and `rect`, with `straight` beside
them returning one `Cubic`. `pathFromData` reads a path out of SVG path data, which is a written form
the format can carry as it stands. `streamlineOf` and `sectionOf` produce points rather than paths,
`Vec2[]` and `Vec3[][]`, and were uncounted too.

**Sixteen names at the door take a function, and eleven shapes of function exist among them rather
than three.** The tables marked the parameters that are a curve or a surface and missed the rest.
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

**Eleven names at the door are drawn by no demo**, so a version cut against demos leaves them
unchecked. They are `numberLine`, `callout`, `riemannBars`, `dot3`, `text3`, `arrow3`, `surface3` and
`vectorField3`, and the animations `fadeTo`, `moveAlong` and `scale`. Each gets a test comparing the
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

**Four surfaces have to be rewritten and none was counted.** The four demos are 1,610 lines and every
one becomes a file. The guide is 544 lines and teaches the API that is changing. The reference is 805
lines and names every parameter that is being renamed. The website's figures move from modules to
files, which its own document describes and does not scope.

**This is almost certainly 2.0.0 rather than a minor.** `plot` returns a `Path` today and would
return a record. A consumer calling it breaks. The door was frozen at 1.0.0 five commits ago and a
frozen door is what a major exists for, so either the old calls keep working beside the new ones,
which means two APIs and two things to test, or the version goes to two. **That is Siva's call and
this plan assumed a minor without asking.**

**Realistic shape: at least twenty-eight commits over the vocabulary and the surfaces, plus the
site.** Against evenings and weekends that is months rather than weeks. The plan is still worth doing
and the reasons in this document are unchanged. What was wrong was the size written next to them.

## The steps

Each is commit-sized and names what its commit will measure. **The measurement is the same throughout
and it is the reason this plan is checkable: a figure as data draws mark for mark what the TypeScript
figure draws, compared by tolerance.** The demos are already the conformance suite.

**Steps 3 and 4 are written out, which is what the session of 2026-09-08 did.** Step 3 is ten
commits and step 4 is five, each named below with the demo whose marks measure it. Step 11 cuts the
version and there is no step between it and step 10.

**The honest count is at least twenty-eight commits rather than twelve to sixteen.** Seven of the
eleven steps are one commit each. Step 3 is ten and step 4 is five. Step 8 rewrites four demos and is
four. Step 9 rewrites the guide and the reference and is two. The site is not counted here at all,
since it is a release away and has a document of its own.

- [ ] **1. The readers take geometry rather than functions.** `slopeOf`, `areaUnder` and `tangentAt`
  work from a plotted path's own cubics. **Measures:** every demo's marks unchanged within tolerance
  at its named times; the slope read off a path against the closed-form derivative of `x²` at five
  places; the suite from 637.

- [ ] **2. The expression form, and the evaluator for it.** The closed vocabulary above, as a type
  and a function that evaluates one against a set of track values. **Measures:** each form evaluated
  against the TypeScript it replaces at ten inputs; a form naming an unknown function refused with a
  sentence that names it.

- [ ] **3. The node vocabulary, which is ten commits.** Twenty-one node kinds, two item producers,
  eleven path producers and two point producers as records with parameters, and a resolver from a record to the nodes that exist now. The
  authoring calls keep their names and their arguments and return records. **The measurement every
  one of the ten quotes is the same:** the demo that draws the kinds of that commit gives the same
  marks at its own named times, within tolerance, built through records rather than calls, and the
  suite grows. A kind no demo draws is measured against its own call at one time instead.

  - [ ] **3.1 The node record and the resolver, with the three kinds of the tree.** A record is a
    kind, a name and its parameters, and a group's children are records. `shape`, `text` and `group`
    are the three, and `resolveNode` walks a record into the `Node` that `flatten` already takes.
    **Measures:** the boolean demo, which draws the fewest kinds of the four, mark for mark at its
    named times; the suite from 637.

  - [ ] **3.2 A path as data.** `arc`, `circle`, `line`, `polygon`, `polyline`, `rect` and `straight`
    as records, `pathFromData` as the written form for anything else, and the rule that a path is
    either a named form with parameters or its cubics written out. **Measures:** each of the seven
    against its own call within tolerance; the arc held between 2.6 and 2.8 parts in ten thousand of
    the true radius, which is the bound the suite already holds; the rotation demo's two panels.

  - [ ] **3.3 The graph path producers.** `plot`, `areaUnder` and `tangentAt` as records whose curve
    is an expression, and `bracePath`. Step 1 has already made the readers take geometry, so the
    curve is all that is left in these three. `riemannBars` is not here, because it returns a node.
    **Measures:** the flat demo's parabola, its shaded region and its tangent, mark for mark at its
    named times.

  - [ ] **3.4 The annotation nodes.** `dot`, `arrow`, `brace` and `callout`. **Measures:** the flat
    demo's dots, arrows and braces at its named times; `callout` against its call, since no demo
    draws one.

  - [ ] **3.5 The graph frame nodes.** `numberLine`, `axes`, `numberPlane` and `riemannBars`, which
    share the tick list and the scale. **Measures:** the flat demo's axes and number planes and the
    solid demo's axes at their named times; `numberLine` and `riemannBars` against their calls, since
    no demo draws either.

  - [ ] **3.6 The equation node.** `equationNode`, and an `Equation` stays resolved geometry a figure
    carries rather than TeX a renderer typesets, which is the answer to where text's geometry is
    settled. **Measures:** the flat demo's typeset rule, glyph for glyph at its named times; the
    bytes of that equation written out.

  - [ ] **3.7 The field node.** `vectorField`, whose field is an expression of a place, with
    `lengthOf` and `colourFor` as named forms: a constant, a threshold and a saturating length.
    **Measures:** the flat demo's slope field, arrow for arrow within tolerance; the saturating form
    against `0.34·m / (0.6 + m)` at ten magnitudes.

  - [ ] **3.8 The camera as parameters rather than a closure.** A figure stores a `Camera3Choice` and
    the resolver builds the `Camera3`, since the built one carries `project` and its `Projection`
    carries `place`. The solid demo's orbit is where the expression form meets a track for the second
    time. **Measures:** the solid demo's marks at each of the four times its strip draws, through a
    stored choice rather than a built camera.

  - [ ] **3.9 The space nodes.** `polyline3`, `dot3`, `text3`, `arrow3`, `scene3` and `axes3`.
    **Measures:** the solid demo's axes and polylines at its named times; `dot3`, `text3` and
    `arrow3` against their calls, since no demo draws one.

  - [ ] **3.10 The surfaces and the space fields.** `surface3`, `surfaceCells`, `fieldArrows3` and
    `vectorField3`, with `shade` as a ramp through a band, and `sectionOf` and `streamlineOf` as the
    point producers they are. **Measures:** the solid demo's saddle, its plane, the curve of the
    crossing and its three runs of descent at its named times; the streamline's own bound, which the
    suite holds at 4.689e-10 of a figure unit.

- [ ] **4. The animation vocabulary, which is five commits.** Fifteen kinds as records with
  parameters, and a resolver each from a record to the `Animation` the timeline already plays. **The
  measurement every one of the five quotes is the same:** the demo that plays the kinds of that
  commit gives the same marks at the same times, and a kind no demo plays is measured against its own
  call.

  - [ ] **4.1 The animation record and the four kinds that change opacity.** A record is a kind, a
    target and its parameters, and a target stays an id or the front of one. `fadeIn`, `fadeOut`,
    `fadeTo` and `draw`. **Measures:** the boolean demo's fades and the cover sheet's draw at their
    named times; `fadeTo` against its call, since no demo plays one.

  - [ ] **4.2 The kinds that move marks.** `moveBy`, `moveAlong`, `rotate`, `scale` and `growFrom`.
    `about` is a point or the centre of the marks' own bounds, read at play time rather than stored,
    and `moveAlong` carries a path, so it takes the written form of step 3.2. **Measures:** the
    rotation demo's turns and moves at each of the eight times its strip draws; `moveAlong` and
    `scale` against their calls, since no demo plays either.

  - [ ] **4.3 The kinds that put one shape in place of another.** `morph`, which carries a path, and
    `morphEquation`, which names two targets and leaves glyph matching where it is. **Measures:** the
    flat demo's rule walking from `\frac{dy}{dx} = 0` into `\frac{dy}{dx} = 2x`, glyph for glyph at
    its named times.

  - [ ] **4.4 The kinds that make marks rather than change them.** `indicate`, `flash` and
    `circumscribe`. Each adds marks, so a record says how the marks it adds are named, which is the
    one thing this group needs that the others do not. **Measures:** the flat demo's marks by id and
    within tolerance at the times each of the three plays.

  - [ ] **4.5 `countTo`, whose writer becomes a precision.** The writer is
    `(value) => labelFor(value, 0.01)` in both of its uses, so the parameter is a precision and the
    last function in an animation is gone. **Measures:** the flat demo's counting number reading the
    same string at each of its named times.

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

- [ ] **11. Cut 2.0.0.** The version bumped in this commit, `npm install --package-lock-only` in the
  same one, the done-criteria verified line by line with the number that satisfies each, and
  publishing asked for rather than assumed. It is a major because `areaUnder`, `plot`, `riemannBars`,
  `slopeOf` and `tangentAt` are all at the door and all change shape. **Measures:** the three gates;
  all nine sheets identical after `npm run demos`; the door and the suite from 230 names and 637
  tests; the specification's own version, which is separate from this one.

#### Done-criteria

- Every demo is a file, and reading it draws marks identical within tolerance to the module it
  replaced, at every named time.
- None of the sixteen names at the door that take a function takes one, no figure holds a closure,
  and a figure stores a `Camera3Choice` rather than a built `Camera3`.
- The vocabulary is twenty-one node kinds, two item producers, eleven path producers, two point
  producers and fifteen animation kinds, and the reference names each with its parameters.
- Every one of the eleven names no demo draws has a test comparing its record's marks against its
  call's.
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
