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
| 0.8.0 | Braces and a number that counts |
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
point and walks into `\frac{dy}{dx} = 2x` as the dot leaves it.

**How the walk is driven was Siva's call and the answer is the track.** The track drives a fraction of
the curve's length and the scene recovers the graph x from the point it lands on, so the dot, the
tangent and the reading are one number. Driving the dot with a `moveAlong` span while the tangent
stayed on an x track would have been two clocks free to disagree, since a span's eased fraction and a
track's value are unrelated. **What would change this answer** is an animation that can hand the
scene back what it did, which the seam refuses on purpose.

Every version after adds to that same figure: a brace measures the rise at 0.8.0, the view follows
the point at 0.10.0, and the curve's gradient becomes a field at 0.11.0.

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

**0.7.0 is cut and released, and 0.8.0 is next with its steps written under its item below.** A
session resumes at the first unticked step and does not redesign the ones after it. One thing in that
item is Siva's rather than a session's: whether the boolean operations on paths leave the version,
which is argued where they sit.

## The items

Each is a version above. What follows is what each one covers.

### Braces, a number that counts, boolean operations on paths, 0.8.0

`Brace`, a brace with a label on it, and a number that ticks from one value to another, all three
heavily used by the reference material against the `arrow`, `callout` and `dot` that exist.

**The brace measures the rise at the top of the curve, and its label counts.** The dot walks, flashes
at the top, and then a brace arrives along the right of the shaded region measuring how far the curve
climbed, with its number ticking from nothing up to that rise. The counting is on the clock rather
than on the walk's track, which is what makes it a counter rather than a reading: the dot has stopped
by then, so there is no second clock for it to disagree with. Every other number in this demo is a
value of the track and stays that way.

#### The steps

**1. Done. The brace itself.** A path spanning two points with a tip pushed out to one side, built from
cubics like everything else here. `annotate.ts` gains it beside `arrow` and `callout`, since a brace
is an annotation rather than a shape a figure plots, and the path builder is exported alongside the
group for a figure that wants the shape and no label.

*Measures:* the two ends sit exactly on the two points given, to within 1e-12. The tip sits the given
depth from the line between them, to within 1e-12. The two halves are mirror images about the middle,
measured as every point of one half being within 1e-12 of the reflection of its partner. Every point
of the path is inside the box the span and the depth describe. A brace spanning zero length draws
nothing rather than dividing by zero.

*Measured:* one open subpath of 6 pieces. The ends sit on the two points exactly. The tip stands
0.800000000000000 off a line at a depth of 0.8. The worst mirror error over every point of the path
is 2.22e-16. Walked at 17 places a piece, every point is inside the box the span and the depth
describe. A span of 0.2 asked for a depth of 1 still reaches 1, because the curl narrows rather than
the brace flattening. A brace between one point and itself is an empty path. The suite is 392 tests
in 907 ms, against 384 in 880 ms.

**2. A brace with a label on it.** A group of the brace and a text mark placed beyond the tip, on the
far side from the span, by a padding in figure units. The text is anchored and never measured,
because nothing about a figure's layout may depend on how wide some text is.

*Measures:* the label's anchor sits the padding beyond the tip along the same direction the tip was
pushed, to within 1e-12, at four rotations of the same brace. The group's ids are the brace and the
label under the name it was given.

**3. A number that counts.** An animation over a text mark, writing the value it has reached rather
than the value it will reach. It takes the two values and how to write one, so the rounding is the
caller's and this holds no opinion about decimal places. The scene writes the value the count ends
at, which is what the animation writes at the end of its span, so the two never disagree.

*Measures:* the text at 0, 0.5 and 1 is the start, the middle and the end written by the format given.
The mark count does not change. A mark that is not text is left alone. A count over a name that
matches nothing changes nothing.

**4. The flat demo braces the rise and counts it.** After the flash at the top of the curve, a brace
arrives along the right of the shaded region from the stationary point to the top, and its label
counts from 0 to the 9 the curve climbed. This is the step the demos gain from, and it is the only
number in this demo that the clock drives rather than the track.

*Measures:* the demo's mark count at every named time, which is 100 now. The label reads the bottom
of the count at the moment the brace arrives and 9.00 at the end. The brace's ends sit on the two
points the graph gives, to within 1e-12. The committed pictures' byte counts, which are 49,971 and
203,664 now. The suite's duration, 880 ms over 384 tests now.

**5. The cut.** The version goes to 0.8.0, the README gains the paragraph, and this entry is deleted,
with the boolean operations moved under the items if Siva agrees they leave.

#### Done when

- `npm test`, `npm run type-check` and `npm run build` all pass.
- A brace's ends sit on its two points and its tip at its depth, and its halves mirror, each to
  within 1e-12.
- A braced label sits beyond the tip at four rotations.
- A count writes the start, the middle and the end, and touches nothing that is not text.
- The flat demo braces the rise, its label counts to 9.00, and `npm run demos` leaves the committed
  files unchanged.
- `index.ts` exports the brace, the braced label, the count and their types, and nothing reaches a
  file inside this package by path.

### Boolean operations on paths, 0.9.0

Union, intersection and difference on paths, which Manim has and this has no way to express. **Siva's
call, made when 0.8.0 was planned: the package is to be feature full, so this is built rather than
parked until a chapter asks for it, and it is given a picture whose whole purpose is the operation.**

**It is a component rather than a feature.** Two cubics have to be intersected, which is Bézier
clipping or recursive subdivision and has to survive a touch at one point and a shared edge. Both
paths are split at every crossing. Each piece is then decided as inside or outside the other, by the
winding rule the mark already carries. What is kept is stitched back into subpaths by matching
endpoints within a tolerance. The failure is silent geometric wrongness rather than an error, which
is what its demo is built to catch.

**Its picture is the third demo**, described with the other two above. The moving disc walks through
no crossing, one crossing, two crossings and containment, so the demo's own marks at named times are
what says the operation survives the cases it is most likely to get wrong.

**Its steps are written when it is picked**, and writing them is a session on its own.

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
