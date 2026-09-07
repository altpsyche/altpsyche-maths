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
the session and the answer was 0.9.0**, last of the feature versions, because everything before it is
reusable in three dimensions and nothing in three dimensions is reusable in two. It is now 0.10.0,
moved down one when the boolean operations took a version of their own, and the reason for its place
is unchanged. **What would change that** is a chapter needing a surface sooner.

## The version ladder

**Every item gets its own minor version, then 1.0.0 is the polish.** Siva's plan, and the release
convention this repository already follows makes each one a minor bump. A version is cut when its
demos draw, not when its code compiles. A version that is cut leaves this table and its item goes
with it, because `git log` is what keeps a closed plan.

| version | what lands |
| --- | --- |
| 0.9.0 | Boolean operations on paths |
| 0.10.0 | Three dimensions, and a camera that moves |
| 0.11.0 | Vector fields and streamlines |
| 0.12.0 | Frames out, with no website around it |
| 1.0.0 | The two demos complete, the README, the surface frozen |

**The order is not arbitrary and two places in it are worth defending.** Three dimensions sit at
0.10.0 rather than 0.9.0, moved down by the boolean operations taking a version of their own. A
camera that moves rides with them because a figure's camera is one piece of work whether it is
orbiting a surface or panning across a plane, and splitting it would build the same matrix twice.

**The boolean operations sit before three dimensions rather than after**, because their picture is
flat and everything flat is easier to check before a camera exists to argue with. They took a version
of their own because they are a component rather than a feature: a brace is a handful of cubics and a
count is one animation over a text mark, where a union needs curve against curve intersection, a
split at every crossing, a decision per piece about which side it belongs on, and a stitch back into
subpaths. Riding along inside another version, half of it would be checked by nothing.

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
typeset rule it is a value of, and as of 0.7.0 that rule reads `\frac{dy}{dx} = 0` at the stationary
point and walks into `\frac{dy}{dx} = 2x` as the dot leaves it. As of 0.8.0 the walk ends with a
brace measuring how far the curve climbed and a number counting up to that rise.

**How the walk is driven was Siva's call and the answer is the track.** The track drives a fraction of
the curve's length and the scene recovers the graph x from the point it lands on, so the dot, the
tangent and the reading are one number. Driving the dot with a `moveAlong` span while the tangent
stayed on an x track would have been two clocks free to disagree, since a span's eased fraction and a
track's value are unrelated. **What would change this answer** is an animation that can hand the
scene back what it did, which the seam refuses on purpose.

Every version after adds to that same figure: the view follows the point at 0.10.0, and the curve's
gradient becomes a field at 0.11.0.

**The solid demo starts at 0.10.0**, because nothing before it can draw one, and it is a surface with
a plane cutting through it and the curve of the intersection drawn on both. What it then takes from
the versions before it is everything reusable in three dimensions: the axes become three, the
animations apply to marks in space, the equation of the surface is typeset beside it, and the camera
orbits.

**A third demo arrives at 0.9.0 and it is the boolean operations' own.** Siva's ask was one demo flat
and one solid, and this is the exception rather than a change to it: a union of two paths has no
picture in a graph of a function and none in a surface either, the way a rotation has none in a flat
graph. So the operation is given a picture whose whole purpose is the operation.

**It is two discs, drawn three times side by side: their union, their overlap, and the first with the
second taken out of it.** One disc is still and the other walks across it, from clear of it, through
touching it at one point, through overlapping it, to sitting wholly inside it, and out the far side.
That walk is what makes the demo a gate rather than an illustration: it takes the operation through
no crossing, one crossing, two crossings and containment, which are the four cases this kind of code
gets silently wrong.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Both demos are committed and both are in the README**, which the flat one is as of 0.4.0. The
image is SVG written by `svgMarkup`, which needs no browser, so `npm run demos` regenerates it and a
gate compares the regenerated bytes against the committed file. A picture in a README that nothing
regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still.

## Now

**0.8.0 is cut and released, and 0.9.0 is next with its steps written under its item below.** A
session resumes at the first unticked step and does not redesign the ones after it. That item carries
a note on which of its steps is most likely to prove the plan wrong, and what to do when it does.

## The items

Each is a version above. What follows is what each one covers.

### Boolean operations on paths, 0.9.0

Union, intersection and difference on paths, which Manim has and this has no way to express. **Siva's
call, made when 0.8.0 was planned: the package is to be feature full, so this is built rather than
parked until a chapter asks for it, and it is given a picture whose whole purpose is the operation.**

**It is a component rather than a feature.** Two cubics have to be intersected. Both paths are split
at every crossing. Each piece is then decided as inside or outside the other. What is kept is
stitched back into subpaths. The failure is silent geometric wrongness rather than an error, which is
what its demo and its areas are built to catch.

#### What it does and does not take

**Each input is closed loops that do not cross themselves.** A loop that crosses itself has no one
answer for what is inside it without a fill rule chosen first, and choosing one here would make the
operation disagree with the mark the result is drawn as. An input that is open is closed by a
straight piece before anything else happens, and that is said in the doc comment rather than
guessed at by a reader.

**A result may have a hole even though an input may not.** A disc with a smaller disc taken out of it
is a ring, which is an outer loop and an inner loop wound the opposite way, drawn under the nonzero
rule the mark already carries. The demo walks one disc all the way inside the other, so the ring is
drawn rather than described.

**Where two edges lie on top of each other for a stretch, the answer is decided by the tolerance.**
Two circles at exactly the distance where they touch at one point are the same case. The demo walks
through that moment, and what it is held to there is that the picture stays whole, not that the shape
at that instant is one thing rather than another.

#### The steps

**1. Where two cubics cross.** Done. `curveCrossings` in `figure/intersect.ts`, exported.

*Measured:* two straight cubics crossing at (1, 1) and at (1, 0) land on the fraction along each
piece exactly, 0.5 and 0.25, so the crossing agrees to 1e-12 with room to spare. Two circles of
radius 1 whose centres are 1 apart cross 1.924e-4 from the two points the closed form gives, inside
the 2.8e-4 the cubic circle carries. Circles 5 apart give none, one inside another gives none, and
two circles 1e-4 apart whose boxes overlap give none. A touch at one point comes back as one
crossing 6.6e-7 from it, and a tangency in the middle of a piece as one crossing at the tangent
point itself, where the search found 13954 hits.

*Two things the plan did not say.* A box holds more than the curve inside it, so a pair small enough
to answer is kept only when the straight runs across the two pieces come within the tolerance, and
without that a tangency answered 113 crossings instead of one. Clustering is by which stretches of
the two curves touch rather than by how close two hits are, since a hit is only as placed as the
tolerance. The tolerance is 1e-6 rather than something finer because Newton's method on the pair
supplies the sharpness, so a finer search buys nothing and costs a tangency 30 times the work.

**2. A path cut at those crossings.** Done. `cutPath` in `figure/cut.ts`, exported, with de
Casteljau's construction moved out of `morph.ts` into `splitCurve` so the cutting and the walking
between two paths share one.

*Measured:* a circle cut in four places, a circle with three cuts in one piece, and two subpaths cut
together all walk through the points they walked through, sampled at 200 places per piece, the worst
of them 5.0e-16 out. Each holds one more piece per cut. A path handed no cuts comes back as itself,
and so does a path handed a cut naming a subpath it does not have.

*One thing the plan did not say.* A cut at an end, or a second cut where one has already been made,
is dropped rather than made, since a piece of nothing is a piece the stitch in step 5 would have to
know to skip.

**3. Inside or outside.** A point against a path, by counting the crossings of a ray from it. The
count is taken on a flattening of the path at a stated tolerance rather than on the cubics, because
a ray against a cubic is a cubic to solve and the answer is wanted as a yes or a no rather than as a
place. The geometry kept by the operation stays the exact cubics; only this decision is taken on the
flattening.

*Measures:* points at known places inside and outside a circle of radius 1, at 0.99 and 1.01 of the
radius, are decided the right way. A point inside the hole of a ring is outside it. The answer for a
ray leaving a point exactly through a corner between two pieces is the same as for a ray leaving it
at any other angle, checked at 16 angles.

**4. How much a path encloses.** Green's theorem on cubics, which is a closed form rather than a
sampling, and it is the ground truth every operation below is checked against.

*Measures:* a circle of radius 1 encloses within 6 parts in ten thousand of pi, which is twice the
error the cubic circle carries. A square of side 2 encloses 4 to within 1e-12. A ring encloses the
difference of its two discs. A loop wound the other way encloses the same amount with the opposite
sign, which is what makes a hole subtract.

**5. The three operations.** Split both paths at their crossings, keep the pieces each operation
wants, and stitch what is kept into loops by joining ends that meet within the tolerance.

*Measures:* two discs of radius 1 whose centres are 1 apart. The lens where they overlap has a closed
form, which is 1.22836 to five places. The overlap encloses that, the union encloses two pi less
that, and the first less the second encloses pi less that, each to within the error the cubic circle
carries. Two discs that miss: the union is both, the overlap is empty, the difference is the first.
One disc inside the other: the union is the outer, the overlap is the inner, and the difference is a
ring enclosing the difference of the two.

**6. The third demo.** `demos/boolean.ts`: two discs drawn three times side by side as their union,
their overlap, and the first with the second taken out of it, with one disc walking across the other
from clear of it to wholly inside it and out the far side. Committed as a still and a strip like the
flat demo, and in the README.

*Measures:* the mark count is the same at every time, since a panel whose result is empty draws an
empty path rather than no mark. At four named times the three panels enclose what the closed form
says they should. The walk passes through the moment the two touch at one point without the mark
count moving.

**7. The cut.** The version goes to 0.9.0, the README gains the paragraph and the third demo's
picture, and this entry is deleted.

#### Done when

- `npm test`, `npm run type-check` and `npm run build` all pass.
- Crossings agree with the closed form for lines to 1e-12 and for circles to the cubic circle's own
  error, and a touch at one point is one crossing.
- A cut path draws what it drew, sampled at 200 places, to within 1e-12.
- A point at 0.99 and at 1.01 of a radius is decided the right way, and a ray through a corner
  answers what every other ray answers.
- The area of a circle, a square, a ring and a loop wound backwards are all what they should be.
- The three operations enclose what the lens formula says, at three distances apart.
- The third demo draws, its mark count holds still through the touch, and `npm run demos` leaves the
  committed files unchanged.
- `index.ts` exports the three operations, the area and their types, and nothing reaches a file
  inside this package by path.

#### What this plan is most likely to get wrong

**The stitch.** Splitting and classifying are local and testable one piece at a time, where the
stitch is the one part that has to be right about the whole. If a session finds the pieces correct
and the loops wrong, the plan's steps are not wrong and step 5 is bigger than one commit, which is
the moment to rewrite it into its own list rather than to keep going.

### Three dimensions and a camera that moves, 0.10.0

A figure's own camera with a projection, a depth sort, marks placed in space, and surfaces. `vec3`
and `Vec3` already exist and nothing above them uses either. `Extent` is fixed for the life of a
figure today, so nothing can zoom, pan or orbit, and an extent that is a function of time or a keyed
track is the same piece of work as the camera rather than a separate one.

**A rotation still has no picture in either demo.** Nothing in a flat graph turns, so `rotate` is
held by its own tests until a surface arrives here for it to orbit. That is the one place Siva's ask
that every feature reach both demos is outstanding.

**This is larger than everything else on this page put together**, and it is the one item where the
boundary DESIGN.md draws against the engine has to be restated rather than assumed.

### Vector fields and streamlines, 0.11.0

A field sampled over a region, and a streamline integrated through one.

### Frames out, 0.12.0

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
