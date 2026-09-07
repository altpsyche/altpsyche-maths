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
| 0.7.0 | One equation morphing into the next |
| 0.8.0 | Braces, a number that counts, boolean operations on paths |
| 0.9.0 | Three dimensions, and a camera that moves |
| 0.10.0 | Vector fields and streamlines |
| 0.11.0 | Frames out, with no website around it |
| 1.0.0 | The two demos complete, the README, the surface frozen |

**The order is not arbitrary and one place in it is worth defending.** Three dimensions sit at 0.9.0
for the reason above. A camera that moves rides with 0.9.0 because a figure's camera is one piece of
work whether it is orbiting a surface or panning across a plane, and splitting it would build the
same matrix twice.

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
along the curve's own length so the dot keeps one speed. As of 0.6.0 the number sits under the
typeset rule it is a value of, which is `\frac{dy}{dx} = 2x`.

**How the walk is driven was Siva's call and the answer is the track.** The track drives a fraction of
the curve's length and the scene recovers the graph x from the point it lands on, so the dot, the
tangent and the reading are one number. Driving the dot with a `moveAlong` span while the tangent
stayed on an x track would have been two clocks free to disagree, since a span's eased fraction and a
track's value are unrelated. **What would change this answer** is an animation that can hand the
scene back what it did, which the seam refuses on purpose.

Every version after adds to that same figure: the equation morphs as the point crosses a stationary
point at 0.7.0, a brace measures the rise at 0.8.0, the view follows the point at 0.9.0, and the
curve's gradient becomes a field at 0.10.0.

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

**0.6.0 is cut and released, the website draws through it, and 0.7.0 is next with its steps written
under its item below.** A session resumes at the first unticked step and does not redesign the ones
after it. The colour reader queued below the items is not wanted by the morphing, so nothing above it
is waiting on it.

## The items

Each is a version above. What follows is what each one covers.

### One equation morphing into the next, 0.7.0

The most recognisable single animation in the reference material: two expressions where the shared
sub-expressions stay put and only the difference moves. `alignPaths` and `lerpPath` are the mechanism
and what is missing is the matching, which is the question of which glyph of one expression is which
glyph of the other.

**The matching is on the id, and the id already carries what it needs.** A glyph is named
`3-1D465`, which is its place in the expression and the code point the typesetter wrote on it, and a
fraction bar is named `4-rule`. So the thing two glyphs match on is the part of the id after the
first dash, which needs no parsing and treats a rule as a token of its own. Matched by that token,
`\frac{dy}{dx} = 0` and `\frac{dy}{dx} = 2x` share `1D451 1D466 1D451 1D465 rule 3D`, which is the
six marks that stay put, and differ by the `0` that leaves and the `32 1D465` that arrives.

**Why the id rather than a field on the mark.** A consumer stores a typeset equation rather than
typesetting it again, and the website stores each mark as its id and its path data alone. A code
point kept beside the mark would have to be stored beside it too, so every consumer's cache would
have to change or the matching would fail on everything read back from one. The id survives a cache
because the id is what a mark is. **What would change this answer** is a consumer that renames the
marks it stores, which would break the read and want the code point given separately.

**Two equations are both in the scene and the animation moves one onto the other.** A mark that
arrives part way through a span turns up in a frame-to-frame comparison as something that changed,
which is what `flash` and `circumscribe` are written around, so the expression being left and the
expression being arrived at are both in the list at every time. The animation is handed the whole
flat list, so it can find both by name.

**The colour reader queued below the items is not wanted by this.** A glyph with no partner leaves by
its opacity, and a glyph with one keeps its own colour the whole way, so nothing here walks between
two colours. It stays queued for whatever asks for it first.

#### The steps

**1. Done. Which glyph of one expression is which glyph of the other.** A pure function over two lists of
marks that hands back the pairs and the two lists of what is left over. The pairing is the longest
common subsequence of the two token sequences, which is the published algorithm for the longest run
of items that appears in both lists in the same order. It is exact rather than a heuristic, and
matching in order is what stops the `x` of a numerator pairing with the `x` of a right-hand side.

*Measures:* `\frac{dy}{dx} = 0` against `\frac{dy}{dx} = 2x` gives 6 pairs, 1 left over on the left
and 2 on the right. An expression against itself pairs every mark and leaves none. Two expressions
with no token in common give no pairs. An expression against one with a repeated glyph pairs each
occurrence once rather than pairing both to the same partner.

*Measured:* `\frac{dy}{dx} = 0` against `\frac{dy}{dx} = 2x` gives 6 pairs on `1D451 1D466 1D451
1D465 rule 3D`, leaves `30` behind and brings `32 1D465`. `e^{i\pi} + 1 = 0` against itself pairs all
7 and leaves none. Two expressions sharing no token give none. `x + x` against `x` gives one pair and
leaves the other `x` behind. Three tokens against the same three moved gives 2 pairs, since pairing
the third would cross another pair. The suite is 372 tests in 741 ms, against 364 in 745 ms.

**2. Done. The animation that walks one expression into the other.** It takes the name of the expression
being left and the name of the one being arrived at. Both expressions are in the list at every
fraction, so the count does not move.

**A paired glyph is drawn once rather than cross-faded**, which is a correction to the line this step
replaced. Cross-fading a pair draws both of them through the whole middle of the span, and two copies
of one letter sitting on each other at half opacity is a ghost rather than a letter. So the glyph
from the expression being left carries the walk and keeps its own opacity, and its partner stays at
nothing the whole way. At the end of the span it is standing exactly on its partner, so the picture
is the expression being arrived at and no swap has to happen at any moment.

An unpaired mark on the left fades out and one on the right fades in, by multiplying the opacity it
already has rather than by setting one, so an equation that is still fading in when a morph starts
does not jump to solid.

*Measures:* the mark count is the same at every fraction of the span and at both ends. At 0 the
expression being left is at the opacity it was written with and every mark of the other is at
nothing. At 1 the paired glyphs are the ones from the left carrying the right's shapes, the marks
only the left has are at nothing, and the marks only the right has are at full. A paired glyph at 0.5
starts half way between the two starts, to within 1e-12.

*Measured:* 15 marks at every fraction of the span and at both ends. At 0 all 7 marks of the
expression being left are at full and all 8 of the other are at nothing. At 1 each of the 6 paired
glyphs stands on its partner to within 1e-12, the 1 mark only the left has is at nothing and the 2
only the right has are at full. At 0.5 a paired glyph starts half way between the two starts to
within 1e-12, and no mark of the expression being arrived at is drawn at full. A scene already at 0.4
opacity arrives at 0.4 rather than at 1. The suite is 379 tests in 740 ms, against 372 in 741 ms.

**3. The flat demo morphs at the stationary point.** The reading currently draws
`\frac{dy}{dx} = 2x` at every time. It becomes `\frac{dy}{dx} = 0` while the walk is held at the
stationary point, and morphs into `\frac{dy}{dx} = 2x` as the dot leaves it. This is the step the
demos gain from, and the expression pair is the one measured above.

*Measures:* the demo's mark count at every named time, which is 93 now and 93 plus the second
expression's 7 afterwards. The committed pictures' byte counts, which are 37,265 and 147,624 now.
The suite's duration, 745 ms over 364 tests now.

**4. The cut.** The version goes to 0.7.0, the README gains the paragraph, and this entry is deleted.
The website moves after the release rather than before it, and its cached geometry needs no rebuild,
because the ids it already stores are what the matching reads.

#### Done when

- `npm test`, `npm run type-check` and `npm run build` all pass.
- The matching gives the pair counts above, and pairs each occurrence of a repeated glyph once.
- The morph holds the mark count still across its whole span.
- A paired glyph is half way between its two places at half way through, and is drawn once rather
  than as two copies at half opacity.
- The flat demo morphs at the stationary point, and `npm run demos` leaves the committed files
  unchanged.
- `index.ts` exports the matching, the animation and their types, and nothing reaches a file inside
  this package by path.

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
  `rgb()`, and a refusal for the rest rather than a wrong answer. Found while planning 0.5.0. The
  typesetter's own red is spotted by comparing the string and needs none of this.

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
