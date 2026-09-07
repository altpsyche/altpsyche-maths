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

As of 0.10.0 the view follows the dot across, holding it within 1.2 figure units of the middle of the
frame where it used to cross 2.76. The curve's gradient becomes a field at 0.11.0.

**The solid demo draws as of 0.10.0**, since nothing before it could draw one. It is `demos/surface.ts`:
a saddle with a level plane cutting through it, the two branches of the curve where they meet drawn on
both, three axes, the equation of the surface typeset beside it, and an eye that goes round once on a
track. What it takes from the versions before it is everything reusable in three dimensions: the axes
read the same tick list, the plane arrives with `fadeIn` and the curve is drawn on with `draw`.

**A third demo arrived at 0.9.0 and it is the boolean operations' own.** Siva's ask was one demo flat
and one solid, and this is the exception rather than a change to it: a union of two paths has no
picture in a graph of a function and none in a surface either, the way a rotation has none in a flat
graph. So the operation was given a picture whose whole purpose is the operation.

**The same exception was used a second time at 0.9.5, and for the rotation it names.** `demos/rotate.ts`
turns one L a whole circle in two panels, about the middle of the box round it and about a point the
figure names, which is the only way `rotate` reaches a picture at all. It is also the first figure here
to declare itself a loop, so `loops` has a picture behind it too.

**It is `demos/boolean.ts`: two discs drawn three times side by side, as their union, their overlap,
and the first with the second taken out of it.** One disc stands still and the other walks across it,
from clear of it, through touching it at one point, through overlapping it, to sitting wholly inside
it, and out the far side. That walk is what makes the demo a gate rather than an illustration: it
takes the operation through no crossing, one crossing, two crossings and containment, which are the
four cases this kind of code gets silently wrong.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Every demo is committed and every one is in the README**, which the flat one is as of 0.4.0 and the
boolean one as of 0.9.0 and the rotation one as of 0.9.5. Each image is SVG written by `svgMarkup`,
which needs no browser, so `npm run demos` regenerates the six of them and a gate compares the
regenerated bytes against the committed files. A picture in a README that nothing regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still.

## Now

**0.10.0 is cut, and this package draws in space.** `mat4` is below the line, and `camera3`,
`polyline3`, `dot3`, `text3`, `space`, `surface3`, `surfaceCells`, `axes3`, `sectionOf` and `viewAt`
are above it. A camera is a value the caller holds, a builder that works in space hands back the flat
nodes the rest of the package already draws, and nothing in the marks, the tree, the flattening or
either painter was touched to make that work. `demos/surface.ts` is the solid demo Siva asked for: a
saddle, a plane cutting through it, the curve of the crossing, three axes, a typeset equation and an
orbiting eye. An extent carries a centre and may be a function of the clock, and the flat demo's view
follows its dot across. The suite went from 479 tests to 540 and the sheet list from six pictures to
eight.

**The lock file agrees with the manifest again**, and holding it there is one
`npm install --package-lock-only` in whichever commit bumps a version.

**0.11.0 is next and its six steps are written under it.** A step is ticked by writing the number its
commit measured into that step rather than by a bare tick, so the first step carrying no measurement is
where a session resumes.

**What the 0.9.x audit found sound**, so that a later session does not go looking again. Sixty random
pairs of shapes with no coincident edges hold both `area(A) + area(B) = area(A or B) + area(A and B)`
and `difference = A less the overlap` to 1.776e-15. Two circles crossed at every scale from 1e-4 to
1e4 answer 4.11e-4 of the closed form, the same share at every one, so nothing there turns on the
tolerance being an absolute distance. Two 400-piece paths unite in 48ms, so the crossing search needs
no box test in front of it and the quadratic over piece pairs is not worth removing.

## The items

Each is a version above. What follows is what each one covers.

### Vector fields and streamlines, 0.11.0

A field sampled over a region, and a streamline integrated through one. A field is a function from a
place to a vector, so nothing here stores one: what this package adds is the sampling, the drawing and
the integration.

Six steps. The flat demo gains the field at step 3 and the solid demo gains it at step 5, so both are
drawn against before the version is cut.

#### The two calls this rests on

**An author decides how long an arrow is and what colour it is, through a function of the vector's own
magnitude.** That is the call `shade` already made for a surface at 0.10.0, for the same reason: a
field drawn at its true lengths is unreadable the moment two samples differ by a factor of ten, and
choosing the scale needs numbers about the picture that this package does not have. **What would change
this** is a colour reader, which is the gap listed further down this page, and even then the length
would still be the author's.

**The step is fixed and never adaptive.** An adaptive step gives a point count that changes with the
field, which is a count no gate can hold, and the same argument kept back-face culling off by default
at 0.10.0. The order is measurable instead: halving the step divides the error by about sixteen, and a
step list that quotes that number is a step list that knows the integrator is the one it named.

**The integrator sits above the line beside `sectionOf`.** Both are ways of finding a curve for a
figure to draw, and a rule that put one below the line and the other above is a rule nobody could
apply.

#### The steps

**1. The field, sampled and drawn flat.** `figure/field.ts` holding `vectorField(name, coords, of,
options)`, where `of(at)` gives a vector in graph units at a point in graph units. It samples a grid
over the graph's own range and draws an arrow at each sample, taking `lengthOf(magnitude)` and
`colourFor(magnitude)` from the author. The count is fixed by the resolution and never by the field, so
a gate can hold it.

*Measures:* a field over a 9 by 5 grid draws 45 arrows and 90 marks, the same count at every time. Each
arrow's tip is `pointOf` of its sample plus its own scaled vector, to 1e-12. The longest and shortest
arrow are the lengths the author's own function gives, to 1e-12. A field whose vector is nothing
somewhere draws no arrow there rather than an arrow of no length, and the count says which.

**2. The streamline.** `streamlineOf(of, from, options)`, walking Runge-Kutta 4 through the field from
a seed point and handing back the points in graph units, the way `sectionOf` hands back points in
space. It stops on three rules, each stated where a reader looks for it: the run leaves the region, the
step count reaches its cap, or the vector is too small to move.

*Measures:* in the field that turns a point about the origin, the streamline is a circle, and its
radius holds to a measured share of the true one at a stated step. Halving the step divides that error
by about sixteen, which is what says the integrator is the fourth-order one it is named after and not
a slip back to Euler. A streamline started outside the region comes back with one point. A streamline
in a field that is nothing everywhere stops on the third rule rather than running to its cap.

**3. The flat demo gains the field.** `demos/tangent.ts` draws the slope field of its own curve behind
the parabola, arriving with `fadeIn` and sitting under the curve and over the grid. The parabola is the
streamline of that field through the origin, which is the check this demo is the right one to carry:
the drawn curve and the integrated one are two answers to the same question.

*Measures:* the streamline through the origin matches `plot`'s own curve to a measured share of a
figure unit over the whole run. The mark count goes from 102 to a stated number and holds at every
named time. `docs/tangent.svg` and `docs/tangent-strip.svg` grow to stated sizes, and the grid is
chosen so the strip stays near the 282 kB the solid strip already costs rather than doubling it.

**4. Arrows and fields in space.** `arrow3(name, from, to, camera, options)` in `figure/space.ts`, a
shaft that is a `polyline3` and a head that is a flat triangle at the projected tip, and
`vectorField3(name, of, camera, options)` sampling a grid in space and putting the arrows through the
depth sort.

*Measures:* an arrow in space has its tip at the camera's projection of its far point, to 1e-12. A
field over a 4 by 4 by 3 grid draws 48 arrows, the same count at every pose. An arrow behind the eye
draws no marks, which is the rule `polyline3` already holds and the head has to hold too.

**5. The solid demo gains streamlines.** `demos/surface.ts` draws three runs of steepest descent down
the saddle, each a streamline of the gradient field integrated across the surface and drawn as a
`polyline3` lying on it, with the field itself shown as arrows on the plane the demo already carries.

*Measures:* every point of every run lies on the surface to a measured tolerance, and the height falls
at every step of a run, which is what steepest descent means and what a sign slip would break. The mark
count goes from 190 to a stated number and holds at every quarter of the orbit.

**6. The cut.** The version goes to 0.11.0, the README gains the paragraph and the two demos' pictures
are regenerated, the lock file is written with `npm install --package-lock-only`, and this entry is
deleted.

#### Done-criteria

- `npm test`, `npm run type-check` and `npm run build` all pass.
- `npm run demos` regenerates the same eight sheets and the committed bytes match all eight.
- The flat demo draws a field and a streamline, and a test names each by its mark id.
- The streamline through the origin of the slope field matches the plotted parabola, by the measurement
  in step 3.
- The solid demo draws streamlines running down the saddle, every point on the surface by the
  measurement in step 5.
- Halving the step divides the streamline's error by about sixteen, and a test holds it.
- `vectorField`, `streamlineOf`, `arrow3` and `vectorField3` are all exported from `index.ts`, and a
  test names each.
- `mark.ts`, `node.ts`, `flatten` and both painters are untouched across the whole item, which is the
  same boundary 0.10.0 held.

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
