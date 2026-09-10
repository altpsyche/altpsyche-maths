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

**This is built and shipped as 2.0.0, so this document is the reasoning rather than the plan.**
[`SPECIFICATION.md`](SPECIFICATION.md) is the format itself, stated for a renderer written in another
language, and nothing here is needed to read a figure. What is here is why each answer is the one it
is: the decisions Siva took on 2026-09-08, what the reading of the flat demo found, the inventory the
work was built from, and the scope. The forty-one steps and the nine done-criteria they were verified
against are in `git log`, which is where a closed plan belongs.

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
| `transformPath` | a path and a `Transform2D` | the resolver, on a group's transform |
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
`Transform2D`, `Style` with its `Stroke`, its `Fill` and the `Bounds` it carries as a clip, `Equation`, a
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

**Realistic shape: forty commits over the vocabulary and the surfaces, plus the
site.** Against evenings and weekends that is months rather than weeks. The plan is still worth doing
and the reasons in this document are unchanged. What was wrong was the size written next to them.

## Conformance

**Two renderers conform if they draw the same marks at the same times, compared by tolerance.** That
is a gate this repository already runs, and it is the oracle the format gets for free.

It covers a flat figure. It covers nothing a depth buffer does, because a renderer using depth does
not go through marks. The second half needs an answer of its own, and it is a question for the
planning session rather than a thing to solve now.

The comparison is by tolerance and never by hash, for the reason `CLAUDE.md` already gives:
`Math.sin`, `Math.cos` and `Math.pow` are not specified to the last bit and differ between engines.

## What the frame kind is read against, and why it is the declared extent

**A figure whose marks are placed against the frame is what the consumer found first.** Both figures
`altpsyche.dev` draws place every mark as a fraction of the frame, and the format as it was frozen
could not describe either. `marksAt` took one number, a record's scene was a static tree, and the
frame reached nothing. The site got what it needed by calling `build(palette, aspect)` outside the
package, which is the one thing a file cannot do.

**The kind reads the extent the figure declares, resolved at the aspect being drawn.** It does not
read the extent a view move or a follow has left. A view that follows a mark resolves its extent from
the marks, so a mark reading that extent would ask for the list that is being built, and the loop has
no fixed point a renderer could be held to. Reading the declared extent makes the circularity
impossible rather than merely avoided, and it costs a figure nothing it can currently express.

**What would change the answer** is a figure whose marks have to sit against the frame after a follow
has moved it. There is no such picture, and the second question would need one before it is worth a
form.

**A kind added leaves every existing figure meaning what it meant.** A reader that does not carry the
kind refuses the file and names the kind, which is what keeps the format at version 0 by its own
rule. The alternative weighed against it was a placement field on every kind that places something,
and it answers half the case: a figure fitting glyphs to a box needs its scale to move with the
aspect as well as its places, and a field naming a place cannot say that. Every node field is already
an expression, so one kind answers both.

## Why an implicit curve's count of places is not fixed, and one form in this format is not a morph source

**Every other path form fixes its count of places from the figure rather than from the function.**
`plot` and `parametric` take a resolution and hand back that many samples whatever the function does,
which is what makes a morph possible at all: a morph walks one path into another by pairing their
points in order, so a path that resampled itself between frames would pair points that do not
correspond and the drawn shape would swim.

**An implicit curve cannot do this and the reason is the technique rather than the writing.** Marching
squares hands back one place per cell edge the level crosses, so the count is how many cells the curve
passes through, which the function decides. Fixing it would mean resampling the run afterwards, and a
resampled run is no longer a curve whose places are on the level: every one of them would sit on a
chord instead, at an error the cell size sets rather than the bisection.

**So the specification states the count is not fixed and states the consequence.** An implicit curve is
not a morph's source. The alternative weighed against it was leaving the count unstated, which reads as
an oversight to a renderer written in another language and would have each of them guess differently.

**What would change the answer** is a use for a morph between two implicit curves. There is none, and
the picture that wanted one would need a pairing rule of its own before the count could be fixed for it.

## Why a curve on a solid is an entry of a scene rather than a node over one

**A scene sorts its entries whole.** So a curve handed to one as a single piece takes the depth of its
middle, and a helix round a cylinder is painted entirely in front of the cylinder or entirely behind
it, neither of which is what the curve looks like. Drawing the curve as a node beside the scene has the
same fault by another route: the whole curve is painted in front, so its far half shows through the
solid.

**The answer the format already carries is smaller pieces.** A surface is not one entry of a scene, it
is a grid of cells, because two pieces that pass through each other have no one order and no comparison
of depths finds one. A curve that wraps a solid is that case, so `curvePieces3` cuts it into one entry
per step of its run. This is a kind added rather than a value type changed, which is a minor of the
format and a file an older reader refuses by name.

**A standoff is part of using it and is not in the format.** A curve drawn at the solid's own radius
shares a depth with the cells under it and the sort falls to the order they were given, so the curve
comes out broken. Standing the curve off the solid is arithmetic in the figure's own parametrisation,
and putting a standoff field in the format would name a distance that only a renderer's own sort could
interpret.

**What would change the answer** is a curve whose own pieces cannot be sorted against each other, which
per-piece depth cannot fix. That is what depth per pixel is for, and it changes what a `Mark` may ask
for rather than what a scene may hold.

## Why a column width is given rather than measured, and why a map is reached entry by entry

**Nothing in this tree measures a string.** A text mark carries a string, a size and an anchor, and
the painter lays the glyphs out, so how wide a word comes out depends on which fonts the machine has.
A table sizing its columns to fit its cells would be a different table on two machines, and a figure
is meant to draw the same picture wherever it is read. So `columns` is a list of widths the figure
gives and a cell is placed against its own column edge. A matrix does the same by a share of its box.
This is the rule `brace` already holds its label to, written down for the two kinds that make a reader
expect otherwise.

**What would change the answer** is glyph outlines for plain text, and 2.4.0 refused them rather
than adding them. Outlines mean a font file inside the figure and a parser to read it, which is a
new value type in the format, where that version adds a kind an old figure survives. So a write
sweeps a rectangle across a label and takes how far it runs as a number the figure gives, which is
the same answer a column width takes and for the same reason. A figure holding the outlines would
hold the width with them, and a column measured from outlines would measure the same on every
machine.

**A map is reached entry by entry, and that is not a turn.** `applyMatrix` interpolates from the
identity entry by entry, so the numbers a figure writes beside a mapped grid are the numbers the
picture is at. The determinant halfway to a turn by an angle is `(1 + cos angle) / 2`: 0.500000 at a
quarter turn, 0.250000 at 120 degrees, and 0.000000 at a half turn, where every point lands on one
line. A figure that wants the turn asks `rotate`, which interpolates the angle and holds the area at
1. Writing the two as one kind would mean a renderer deciding which of them a matrix meant, and the
two answers differ everywhere except the ends of the span.

**Its pivot is the origin rather than the middle of the box round the marks**, which is what `rotate`
and `scale` take. A linear map is defined about the origin, and a grid whose box centre sits elsewhere
would be mapped about the wrong point and slide across the frame as it deformed.

## Why a group morph pairs by name rather than by shape

**Manim pairs two groups of shapes by a key built from their points.** A Manim submobject carries no
name, so a key from the geometry is the only key there is: two shapes whose rounded point lists hash
alike are taken to be the same shape and are matched.

**Every mark in this format carries a name already.** An id is built from the names on the way down
the tree, which hit testing needs and which comparing one frame against another needs, so the part of
a mark's id after the target it sits under is a key that costs nothing to read. Two panels a figure
builds by one function carry the same names under different parents, and that is the case a group
morph exists for.

**A key from points would be a hash of floating point numbers.** `Math.sin`, `Math.cos` and
`Math.pow` are not specified to the last bit in JavaScript and differ between engines, so a hash of
what they produce pairs one way on one machine and another way on the next, with nothing in the
picture to say why. Every comparison in this repository is by tolerance for that reason.

**And over the picture this landed against, a shape key pairs the wrong marks.** The boolean demo's
three panels each draw the same two discs and a different answer over them. A shape key pairs the
outlined discs, which are identical in all three, and leaves the three answers unpaired, since a
union, an intersection and a difference of one pair of discs are three different shapes. The answer is
the mark a reader is watching.

**What the name rule costs** is a pair of groups written by two different hands, whose marks carry
unrelated names. Those pair by the order they stand in, which is the second rule, and a figure that
wants a particular pairing gets it by naming the marks alike.

## The precedent

**Lottie.** Vector animation as JSON, with independent renderers on the web, on two mobile platforms
and in Rust. It is the proof this shape works, and its known trouble is the trouble this format will
meet: renderers drifting apart on semantics the format left loose. Reading how Lottie's feature
matrix came to exist is worth an hour before the format is designed.

## What ran first, and what was frozen while it did

**A planning session on paper, with no code touched**, which expressed `demos/tangent.ts` as data by
hand. That one figure carries the computed scene, the arc-length track, the typeset rule that walks
into another, the brace and the counting number, so a format carrying it carries most of them. What
the reading found is the section above, and it changed the plan before a line was written.

**Four renderer versions came off the ladder while the format ran**, because each would have been
written against an API this format reshaped, and they are on [`ROADMAP.md`](ROADMAP.md) so they were
not rediscovered.

**Six look-and-feel versions went on in front of it**, which was Siva's call rather than a softening
of the freeze. Each of the six changed a value type the format was about to freeze a written form
for: 1.1.0 the sizes and the font a `Style` carries, 1.2.0 the set of names a `Curve` can be, 1.3.0
what a `Stroke`'s width may be, 1.4.0 what a `Fill` may be, 1.5.0 how a view that moves is written
down, and 1.6.0 the clip a `Style` carries and the inset a `Figure` does. Freezing before they landed
would have cost a major of the format's own version to add them afterwards, since an old figure has to
keep rendering. Freezing after cost rewriting four demos' syntax, which was mechanical.

One item survives in another repository regardless of what happens here, and it is the engine's
stencil. That document says why.
