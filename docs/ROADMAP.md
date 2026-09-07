# Roadmap

**This file is the only queue.** If a piece of work is not written below, nobody is tracking it.
[DESIGN.md](../DESIGN.md) is the design and queues nothing.

## The goal, stated by Siva

**Anyone who installs this package should be able to make mathematical animations of the quality
3Blue1Brown publishes.** Manim is the reference, and the two ideas already taken from it are that a
picture is a timeline of animations over named objects and that those objects are measured in the
picture's own units. The goal now is the rest of the vocabulary.

**What that does not mean.** Manim is roughly a decade of work and tens of thousands of lines. The
quality of those videos is also substantially the writing and the pacing, which no library supplies.
What is queued here is the part a library can be held to: whether a picture that channel would draw
can be expressed at all.

**What decides the order.** A package is real when it has a consumer that ships, which is the
argument [DESIGN.md](../DESIGN.md) makes about timing moving in here before a single figure existed. So
an item earns its place by a picture something is waiting to draw, and the two demos below are what
is waiting until the website has a chapter that is.

**The website waits.** Its own roadmap has one open item and nothing there needs anything from this
page, so this package is worked to 1.0.0 first and the site is picked up after.

## The two decisions are answered

Both were Siva's and both are made. They are recorded here because they shape every item below, and
DESIGN.md is corrected to match.

**The typesetter goes behind the one door.** MathJax becomes a runtime dependency of this package
rather than sitting behind a second entry point. The reason is that nobody installs a figures package
without needing to label a picture with mathematics, so a consumer paying for MathJax and never
typesetting is a consumer who does not exist. It runs at build time, so what a reader downloads does
not change. **What would change this answer** is a consumer who draws figures and typesets nothing,
which would make a second door worth its test.

**A figure stops being flat.** Surfaces and vectors in space are a large share of the pictures this
package is meant to be able to draw, so refusing them refuses the goal. The camera is a figure's own
and never the engine's, which is the rule DESIGN.md keeps. **Which version it lands in was left to
the session and the answer is 0.9.0**, last of the feature versions, because everything before it is
reusable in three dimensions and nothing in three dimensions is reusable in two. **What would change
that** is a chapter needing a surface sooner.

## The version ladder

**Every item gets its own minor version, then 1.0.0 is the polish.** Siva's plan, and the release
convention this repository already follows makes each one a minor bump. A version is cut when its
demos draw, not when its code compiles. A version that is cut leaves this table and its item goes
with it, because `git log` is what keeps a closed plan.

| version | what lands |
| --- | --- |
| 0.6.0 | Equations: the typesetter behind the one door |
| 0.7.0 | One equation morphing into the next |
| 0.8.0 | Braces, a number that counts, boolean operations on paths |
| 0.9.0 | Three dimensions, and a camera that moves |
| 0.10.0 | Vector fields and streamlines |
| 0.11.0 | Frames out, with no website around it |
| 1.0.0 | The two demos complete, the README, the surface frozen |

**The order is not arbitrary and two places in it are worth defending.** Equations sit at 0.6.0
rather than first because the website already has a working copy of them, so nothing here is blocked
meanwhile, and because the morphing at 0.7.0 needs them. Three dimensions sit at 0.9.0 for the reason
above. A camera that moves rides with 0.9.0 because a figure's camera is one piece of work whether it
is orbiting a surface or panning across a plane, and splitting it would build the same matrix twice.

## The two demos, which are what a version is cut against

**One demo in two dimensions and one in three, and every feature reaches both.** Siva's ask, and it
is also the test DESIGN.md sets for whether a feature is real: a package is real when it has a
consumer that ships, and until the website has a chapter waiting on axes these two are that consumer.

They are written before the feature they need, as the target the work is built to compile. That is
the order rather than a preference: a demo written afterwards checks that the code runs, where a demo
written first says what the code has to be able to say.

**The flat demo is a tangent sliding along a curve**, and it draws as of 0.4.0. It is
`demos/tangent.ts`: the grid, both axes with ticks and labels, the plotted parabola, the region
shaded under it, a point walking along it, the tangent at that point, and the slope written as a
number that changes. As of 0.5.0 the picture arrives rather than appearing, and the walk is measured
along the curve's own length so the dot keeps one speed.

**How the walk is driven was Siva's call and the answer is the track.** The track drives a fraction of
the curve's length and the scene recovers the graph x from the point it lands on, so the dot, the
tangent and the reading are one number. Driving the dot with a `moveAlong` span while the tangent
stayed on an x track would have been two clocks free to disagree, since a span's eased fraction and a
track's value are unrelated. **What would change this answer** is an animation that can hand the
scene back what it did, which the seam refuses on purpose.

Every version after adds to that same figure: the slope gains its equation at 0.6.0, that equation
morphs as the point crosses a stationary point at 0.7.0, a brace measures the rise at 0.8.0, the view
follows the point at 0.9.0, and the curve's gradient becomes a field at 0.10.0.

**The solid demo starts at 0.9.0**, because nothing before it can draw one, and it is a surface with
a plane cutting through it and the curve of the intersection drawn on both. What it then takes from
the versions before it is everything reusable in three dimensions: the axes become three, the
animations apply to marks in space, the equation of the surface is typeset beside it, and the camera
orbits.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Both demos are committed and both are in the README**, which the flat one is as of 0.4.0. The
image is SVG written by `svgMarkup`, which needs no browser, so `npm run demos` regenerates it and a
gate compares the regenerated bytes against the committed file. A picture in a README that nothing
regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still.

## Now

**0.5.0 is cut and 0.6.0 is next, and its steps are written under its item below.** A session resumes
at the first unticked step and does not redesign the ones after it. Two things are queued below the
items rather than inside one and neither blocks 0.6.0: the colour reader is wanted by the morphing at
0.7.0, and spotting the red an undefined macro comes back as is a string comparison rather than a
parse.

## The items

Each is a version above. What follows is what each one covers.

### Equations, 0.6.0

The typesetter behind the one door, the walk from a typesetter's SVG into marks, and the placement of
an equation in a figure. About four hundred and seventy lines exist in the website across
`lib/equation-typeset.ts`, `lib/equation-marks.ts` and the part of `lib/equations.ts` that places one,
and they move here.

**Three refusals are not optional and are the expensive part to rediscover.** A TeX error carries
`data-mjx-error`. A character the font has no outline for arrives as a `<text>` element, which draws
with whatever font a browser has and draws nothing at all in a recording. And `AllPackages` carries
the `noundefined` extension, so an undefined macro is not an error: it comes back as glyph outlines
under `fill="red"`, indistinguishable from an expression that typeset, and a typo ships as a red word
inside the picture.

**What stays in the website.** The website writes each typeset equation to a JSON file at build time
so that no page loads MathJax, and that cache is the website's own concern. It needs nothing new here
to keep it: a path is written out with `pathData` and read back with `pathFromData`, and both are
already exported. So this version adds the typesetter, the walk and the placement, and adds no file
format.

#### The steps

**1. Done. The typesetter arrives and costs nothing until it is asked.** Add `mathjax-full` to
`dependencies`. Add `figure/typeset.ts` holding one function that takes TeX and hands back MathJax's
SVG tree in this package's own shape, with no walk over it yet. It reaches MathJax through a dynamic
import, which is an import written as a call in the middle of the function rather than as a line at
the top of the file, so nothing loads until somebody typesets something. The reason is that
`mathjax-full` 3.2.1 is 41 MB of CommonJS with no `sideEffects` declaration, so an import at the top
of the file would make every consumer load all of it to draw a circle. Correct the line in `CLAUDE.md`
that says this package has no runtime dependencies, and the line in `DESIGN.md` that says the
typesetter is coming.

*Measures:* importing the built door takes 9.5 ms and leaves 0 CommonJS modules in Node's cache
today. The commit quotes both again afterwards, and quotes what the first typeset call costs on top.

*The risk worth naming:* the published build compiles under `NodeNext`, and `mathjax-full` is
CommonJS with no `exports` map. If a named import out of it is refused there, this is the step that
finds out.

*Measured:* importing the built door takes 9.6 ms and leaves 0 CommonJS modules in Node's cache,
against 9.5 ms and 0 before. The first typeset call costs 73 ms and loads 287 CommonJS modules, and
every call after it costs 1.6 ms. The build under `NodeNext` took the named imports without
complaint, since they are written as a call rather than as a line at the top.

**2. Done. The walk from a typesetter's SVG into marks.** Add `figure/equation.ts`. It walks MathJax's
nested groups, carries the transform down them, and turns the whole expression over on the way in
because SVG counts y downward and a figure counts it upward. A glyph outline becomes a path, a
fraction bar becomes a rectangle, and the `viewBox` becomes the box the typesetter measured the
expression into. A mark comes back with no fill, because the palette arrives when the equation is
placed. Its id carries the glyph's own code point, which is what the matching at 0.7.0 needs.

*Measures:* five expressions and their mark and rule counts, which are MathJax 3.2.1's own numbers
and hold it to a layout rather than to a total: 11 marks and 1 rule, 7 and 2, 5 and 0, 7 and 0, 14
and 2. Plus the numerator of `\frac{a}{b}` sitting above the baseline, which is the reading that says
the expression was turned over.

*Measured:* the five expressions read as 11 marks and 1 rule, 7 and 2, 5 and 0, 7 and 0, and 14 and
2. The numerator of `\frac{a}{b}` sits above the baseline and the denominator below it, and the box
holds the baseline inside it. A single `x` is named `0-1D465`, which is its place and its code point.
The suite is 356 tests in 584 ms, against 349 in 552 ms.

**3. Done. The three refusals.** Each of the three above throws, and the message names what was found
rather than reporting that something was wrong.

*Measures:* three expressions, one per refusal, each throwing. The undefined macro's message carries
the macro's own name, read off the code points of the glyphs the typesetter drew in red.

*Measured:* `\nosuchmacro` came back as 12 glyph outlines with no error on any of them and now throws
naming itself. `\frac{1}`, `x^` and `\mbox{ü}` are each one text element, all three of which stopped
the walk with the same word before, and each now names what it found. The five expressions that typeset still do. The
suite is 360 tests in 547 ms, against 356 in 584 ms.

**4. Done. An equation placed in a figure.** A builder that takes a typeset equation and returns a group,
alongside `dot`, `arrow` and `callout`. It fits the equation inside a width and a height together
rather than sizing it by the height alone, because an equation twice as wide as it is tall runs off
the sides of a narrow figure the moment the height decides its size. The group carries the transform
and the glyphs keep the typesetter's own numbers, so moving an equation is one matrix. The colour is
given here.

*Measures:* an equation wider than it is tall, asked into a box narrower than it is wide, has every
point of every mark inside that box. Its centre sits where it was asked for to within 1e-12.

*Measured:* `d = \sqrt{x^2 + y^2} - r` is measured into a box 6.11 times wider than it is tall. Asked
into a box 2 by 2, it draws 1.99 by 0.31 and every point is inside. Scaled by the height alone it
would have been 12.23 wide against a box 2 wide. The same equation placed at two points has children
that compare equal and transforms that do not, which is what says the glyphs keep the typesetter's
own numbers. The suite is 364 tests in 541 ms, against 360 in 547 ms.

**5. The flat demo gains its equation.** `demos/tangent.ts` draws the slope's equation beside the
number it already reads, which is `\frac{dy}{dx} = 2x` for the parabola it plots. The equation fades
in with the rest of the picture, and the committed SVG files are regenerated. This is the step the
demos gain from, and it is the expression 0.7.0 morphs at the stationary point.

*Measures:* the demo's mark count at every named time, which is 85 now and 85 plus the equation's
glyphs afterwards, since nothing may arrive or leave part way through. The committed pictures' byte
counts before and after. And the suite's own duration, 541 ms over 343 tests today, because the demo
typesets when it loads.

*If the suite grows past about two seconds*, the demo commits its geometry the way the website does
and only `npm run demos` typesets. The measurement decides it rather than a preference.

**6. The cut.** The version goes to 0.6.0, the README gains the paragraph and the still that shows an
equation, and this entry is deleted. The website drops its three files and calls this package
instead, after the release rather than before it.

#### Done when

- `npm test`, `npm run type-check` and `npm run build` all pass.
- Importing the door still loads no MathJax: 0 CommonJS modules in Node's cache, and an import time
  within a millisecond of the 9.5 ms it takes today.
- The five expressions typeset to the mark and rule counts above.
- Each of the three refusals throws, and each message names what it found.
- An equation placed in a box has every point inside that box.
- The flat demo draws its equation, and `npm run demos` leaves the committed files unchanged.
- `index.ts` exports the typeset call, the walk, the placement and their types, and nothing reaches a
  file inside this package by path.
- `CLAUDE.md` and `DESIGN.md` no longer say this package has no runtime dependencies.

### One equation morphing into the next, 0.7.0

The most recognisable single animation in the reference material: two expressions where the shared
sub-expressions stay put and only the difference moves. `alignPaths` and `lerpPath` are the mechanism
and what is missing is the matching, which needs a glyph to carry where in the expression it came
from. The website's ids already carry each glyph's own code point, which is half of it.

### Braces, a number that counts, boolean operations on paths, 0.8.0

`Brace`, a brace with a label on it, and a number that ticks from one value to another, all three
heavily used by the reference material against the `arrow`, `callout` and `dot` that exist. Union,
intersection and difference on paths, which Manim has and this has no way to express.

### Three dimensions and a camera that moves, 0.9.0

A figure's own camera with a projection, a depth sort, marks placed in space, and surfaces. `vec3`
and `Vec3` already exist and nothing above them uses either. `Extent` is fixed for the life of a
figure today, so nothing can zoom, pan or orbit, and an extent that is a function of time or a keyed
track is the same piece of work as the camera rather than a separate one.

**A rotation still has no picture in either demo.** Nothing in a flat graph turns, so `rotate` is
held by its own tests until a surface arrives here for it to orbit. That is the one place Siva's ask
that every feature reach both demos is outstanding.

**This is larger than everything else on this page put together**, and it is the one item where the
boundary DESIGN.md draws against the engine has to be restated rather than assumed.

### Vector fields and streamlines, 0.10.0

A field sampled over a region, and a streamline integrated through one.

### Frames out, 0.11.0

A consumer gets marks and a canvas painter and no way to turn either into a file. The encode step is
in the website rather than here. What is missing is a headless call that walks a figure at a fixed
step and hands back frames.

### The polish, 1.0.0

Both demos complete, the README carrying both, and the public surface frozen. A 1.0.0 is a promise
about `index.ts` not changing under a consumer, so what it needs beyond the features is a read of the
whole door with that promise in mind.

## Found while working, not yet queued

- **Two colours cannot be walked between.** A colour is any CSS colour written as text, and there is
  no parser here, so `indicate` swaps a colour rather than easing into one and nothing can cross-fade
  a palette. What it needs is a reader for the forms a figure is actually handed, which is hex and
  `rgb()`, and a refusal for the rest rather than a wrong answer. Found while planning 0.5.0.

- **The picture gate is engine-dependent at a rounding boundary.** A coordinate is written to three
  decimal places, so the sine and cosine differences between engines are invisible in the bytes,
  which is what lets the committed pictures be compared byte for byte at all. A value landing exactly
  on a half in the fourth place would still round two ways. Nothing has hit it, and the fix if
  anything ever does is a picture gate that compares marks by tolerance rather than bytes, which
  costs the gate its ability to say the committed file is stale. Found while planning step 8 of
  0.5.0.

## Someday

- **Gradients along a stroke or across a fill.** DESIGN.md refuses them under the rule that a mark
  may only ask for what both painters can do, and both painters can do gradients, so the refusal is
  worth re-reading rather than assumed.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
