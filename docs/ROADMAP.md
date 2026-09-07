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
| 0.9.x | The polish cycle, four fixes over what 0.9.0 left |
| 0.10.0 | Three dimensions, and a camera that moves |
| 0.11.0 | Vector fields and streamlines |
| 0.12.0 | Frames out, with no website around it |
| 1.0.0 | The two demos complete, the README, the surface frozen |

**One place in the order is worth defending.** A camera that moves rides with three dimensions
because a figure's camera is one piece of work whether it is orbiting a surface or panning across a
plane, and splitting it would build the same matrix twice.

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

**A third demo arrived at 0.9.0 and it is the boolean operations' own.** Siva's ask was one demo flat
and one solid, and this is the exception rather than a change to it: a union of two paths has no
picture in a graph of a function and none in a surface either, the way a rotation has none in a flat
graph. So the operation was given a picture whose whole purpose is the operation.

**It is `demos/boolean.ts`: two discs drawn three times side by side, as their union, their overlap,
and the first with the second taken out of it.** One disc stands still and the other walks across it,
from clear of it, through touching it at one point, through overlapping it, to sitting wholly inside
it, and out the far side. That walk is what makes the demo a gate rather than an illustration: it
takes the operation through no crossing, one crossing, two crossings and containment, which are the
four cases this kind of code gets silently wrong.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Every demo is committed and every one is in the README**, which the flat one is as of 0.4.0 and the
boolean one as of 0.9.0. Each image is SVG written by `svgMarkup`, which needs no browser, so
`npm run demos` regenerates the four of them and a gate compares the regenerated bytes against the
committed files. A picture in a README that nothing regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still.

## Now

**0.9.0 is cut, and the 0.9.x cycle polishes what is here before three dimensions start.** Siva's
call, made after an audit of the whole tree. The four items are written below in the order they are
worked, each one a patch bump because each one is a fix. Three dimensions wait until the cycle
closes, and 0.10.0 still has no steps written under it.

## The items

Each is a version above. What follows is what each one covers.

### The 0.9.x polish cycle

**Found by auditing the whole tree after 0.9.0 was cut.** What the audit found is one severe defect,
one thing that hides defects, a handful of small gaps, and a picture that reads as poor quality. Each
is a patch bump, worked in the order below. 0.9.1 is cut: two pieces covering the same stretch are
answered by its two ends, and a shared edge is kept by which way the two paths run over it.

**What the audit found sound**, so that a later session does not go looking again. Sixty random pairs
of shapes with no coincident edges hold both `area(A) + area(B) = area(A or B) + area(A and B)` and
`difference = A less the overlap` to 1.8e-15. Two circles crossed at every scale from 1e-4 to 1e4
answer 4.11e-4 of the closed form, the same share at every one, so nothing there turns on the
tolerance being an absolute distance. Two 400-piece paths unite in 48ms, so the crossing search needs
no box test in front of it and the quadratic over piece pairs is not worth removing.

#### 0.9.2, the stitch says when it gave up

**A run of pieces that never closes is handed back as a closed loop, so a caller cannot tell.** The
union of two rectangles sharing an edge comes back as a subpath whose two ends are 2.0 apart, marked
closed. That is what turns any failure of the geometry into silence, and it is worth fixing whether or
not 0.9.1 removes the failure that shows it today.

*Measures:* a stitch that cannot close a run says so rather than answering a shape. The wrong answers
0.9.1 removes are shown to be caught by this on the tree as it stands before 0.9.1 lands.

#### 0.9.3, the small gaps

Seven of them, together, since each is a line or two.

- The tolerance is written four times, in `intersect.ts`, `cut.ts`, `inside.ts` and `boolean.ts`, at
  two different values, with nothing saying how they relate.
- `splitCurve` and `windingAt` are on the door and no test names either. `SAME_TIME` has been in the
  same state since before this cycle.
- A crossing's point is read off the first curve alone, so at a tangency the fraction along the second
  curve lands up to the tolerance away from it. Nothing says so.
- `containsPoint` flattens the path again on every call, which is 0.31ms each on a 99-piece path.
  `windingAt` over one flattening is the way round it and nothing points to it.
- The README says a coincident stretch is decided by the tolerance. It is not decided, it is wrong,
  and the line is corrected when 0.9.1 makes it true.
- Two comments name an identifier, in `animation.ts` and `equation.ts`, against the rule in
  CLAUDE.md.

*Measures:* one stated tolerance, three exports named by a test, and the four doc lines corrected.

#### 0.9.4, the pictures

**Siva's call, from the published README: the pictures read as poor quality.** The audit found why,
and none of it is the painter. The figure declares an extent of 10.8 by 6 and the graph fills 9.2 by
4.8 of it, so there is a margin of 0.8 across and 0.6 up. Nothing uses that margin. Every piece of
text sits inside the graph or straddles its edge, and the grid is drawn in the same ink as the curve.

*What is wrong, measured on the still at its own still time.*

- **The x axis label for 0 sits on the y axis.** It is anchored at -2.760 across, which is exactly
  where the y axis line stands, and its body runs down into the y axis arrowhead, which spans -2.400
  to -2.220 up at that same place.
- **The typeset rule is drawn over the grid.** Its box runs from -4.860 to -3.660 across and 1.440 to
  2.040 up, where the graph runs from -4.600 to 4.600 and -2.400 to 2.400. So 0.940 of its 1.200
  width lies over live grid lines.
- **The reading straddles the top edge.** It is anchored at 2.400 up, which is the top of the graph
  exactly, so it sits half in and half out.
- **The grid's major and minor lines differ in ink alone.** Both are 0.012 wide and both are the ink
  the curve is drawn in, one at full strength and one at a quarter. A grid drawn as dark as the data
  competes with it.
- **The axis line stops 0.180 short of its own outermost ticks**, which leaves those ticks standing
  under the arrowhead rather than on the line.
- **The brace's number sits inside the graph**, anchored at 3.340 across and 0.240 up.

*What is a default of this package and what is the demo's own.* The label on the origin, the axis line
falling short of its ticks, and the weights a grid is drawn at are this package's. Where the rule, the
reading and the brace's number sit are the demo's. Both are fixed here, and the package's half is
fixed first so the demo's half is laid out against the corrected defaults.

*How it is gated without a browser.* Text is never measured here and that rule does not change, so
none of these are checked by measuring a word. Each is checked on an anchor or on a style, which are
numbers already in the mark list. No tick label is anchored within a stated distance of the other
axis. Every text mark of the demo is anchored outside the graph's own rectangle. An axis line reaches
its outermost tick. A grid's minor lines are thinner than its major ones rather than only fainter.

*Measures:* the six numbers above, each with what it becomes. The committed pictures are regenerated
and the byte comparison passes on the new files.

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
