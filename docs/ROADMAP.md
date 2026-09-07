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
frame where it used to cross 2.76. As of 0.11.0 the parabola sits on the field of its own tangents,
and the run integrated through that field from the origin never leaves the drawn curve by more than
4.689e-10 of a figure unit.

**The solid demo draws as of 0.10.0**, since nothing before it could draw one. It is `demos/surface.ts`:
a saddle with a level plane cutting through it, the two branches of the curve where they meet drawn on
both, three axes, the equation of the surface typeset beside it, and an eye that goes round once on a
track. What it takes from the versions before it is everything reusable in three dimensions: the axes
read the same tick list, the plane arrives with `fadeIn` and the curve is drawn on with `draw`. As of
0.11.0 three runs of steepest descent are drawn on the saddle, with the field they follow shown as
arrows across the plane.

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

**0.11.0 is cut, and this package draws fields.** `vectorField`, `streamlineOf`, `arrow3`,
`fieldArrows3` and `vectorField3` are the five calls it added. A field is a function from a place to a
vector and nothing here stores one: what the package holds is the sampling, the drawing and the
integration. An arrow's length is the author's, taken from the magnitude at its own sample, and it is
in figure units on a graph and in the world's own units in space. The streamline's step is a distance
rather than a time, which keeps the points evenly spaced, and halving it divides the error along the
curve by 15.1 and then 15.6. Both demos draw against it: the flat one carries the slope field its own
curve is a streamline of, and the solid one three runs of steepest descent down its saddle. The suite
went from 540 tests to 574.

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

**0.12.0 is next and its four steps are written under it.** A step is ticked by writing the number its
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

### Frames out, 0.12.0

A consumer gets marks and a canvas painter and no way to turn either into a file. The encode step is
in the website rather than here. What is missing is a headless call that walks a figure at a fixed
step and hands back frames.

Four steps. The rotate demo's strip gains the walk at step 3, and step 2 paints every frame of both
demos through both painters, so the version is drawn against before it is cut.

#### The picture waiting to be drawn

**The website already walks a figure frame by frame and it walks it wrong.** Its
`components/figure/record.ts` resolves the extent once, before the first frame, and paints every
frame of the clip through that one matrix. A figure whose view moves is recorded with its view frozen,
which is every figure written since 0.10.0. The site cannot fix that by calling `viewAt` in its own
loop either, because then it holds two calls that can be passed different times, which is the argument
`viewAt` itself was written from.

**So a frame carries its own view.** What comes back is the marks and the matrix that were read at one
time, together, and a consumer painting a frame cannot pass two times because it is only handed one
number. That is the whole reason this item is a call here rather than a loop over `at` written in the
website.

#### The three calls this rests on

**The walk hands frames back one at a time.** A ten second figure at sixty frames a second is six
hundred frames, and this package's own solid demo is 265 marks a frame, so a walk that hands back an
array holds a hundred and fifty thousand marks at once for a consumer that wanted one frame. A
recorder encodes a frame and throws it away.

**The count is known before the walk starts.** `frameTimes` answers the times up front, because a
recorder showing a reader how far along it is needs the total before it has drawn anything.

**The step is given as a rate or as a count, and the two are different questions.** A recorder knows
how fast the frames play and needs a step of exactly one over that, or the encoded video drifts from
the figure's own clock. A strip knows how many pictures fit across a page and wants them evenly spread
over the whole figure. Both walk a fixed step and neither can be written as the other.

**A walk stops strictly before the duration.** The frame at the duration of a figure that loops is its
own frame nothing, which a recording would show twice. `demos/rotate.ts` already leaves it off its
strip by hand, and step 3 is what turns that note into a rule the call holds.

#### The steps

**1. The walk. Done.** `figure/frames.ts` holding `Frame`, `frameTimes(figure, options)` and
`framesOf(figure, options)`, where a frame is its index, its time, its marks and its view, and the
options carry the width and height the view is built for plus either `fps` or `frames`.

*Measured:* the flat demo at 30 frames a second walks 308 frames, the first at 0 and the last 0.016667
short of its 10.25 seconds, with every gap 1/30 to 1e-12. The rotate demo, a loop of 6 seconds, walks
0, 1.5, 3 and 4.5 when asked for 4 frames: none of the three later ones draws its first frame again and
the frame at 6, which the walk leaves off, is the one `sameMarks` calls its own first. Every frame's
marks are `at` of the figure at that frame's own time exactly, and every frame's view is `viewAt` at
that same time to within 1e-12 of all nine parts of the matrix. The flat demo's view is carried 312 across
its own walk, in the units a 1080 by 600 surface counts in, where a walk resolving the extent once
would leave it still. A figure of no
duration walks one frame. Reading one frame of a 300 frame walk builds one scene. The suite went from
575 tests to 584.

**2. Every frame paints, through both painters. Done.** No new call. A test walks both demos at 30 frames a
second, paints each frame through `paintCanvas` into a counting context and through `svgMarkup`, and
holds what comes out. This is the claim the item makes, held without a browser.

*Measured:* the solid demo walks 354 frames at 30 a second and the flat one 308, and every frame of
both is painted through both painters. Each frame of the solid demo makes 205 fills, 69 strokes and 7
texts, which is 16 more calls than it has marks: those are the panes of glass, and a mark carrying
both a fill and a stroke is painted twice and written once. Each frame of the flat demo makes 71, 119
and 12, which is its 202 marks exactly. Every frame's markup holds one element per mark. The flat
demo's view is carried 312 across the walk over 78 distinct places, since it holds still while the dot
is inside its own reach of the middle of the frame. The two walks add 1.34 seconds to a suite that ran
in 2.42, which is the cost of the gate.

**3. The rotate demo's strip is a walk. Done.** `demos/rotate.ts` builds its strip from `frameTimes` at 4
frames rather than from four times written out by hand, and `demos/render.ts` reads it the same way.

*Measured:* `docs/rotate-strip.svg` is unchanged, byte for byte, at 8,096 bytes with the same checksum
before and after, since a walk of 4 frames over a 6 second turn lands on the same 0, 1.5, 3 and 4.5 the
demo named by hand. The gate holds all three claims: the strip's frames are the walk, the walk is the
quarters, and the whole turn is not among them while `sameMarks` calls it the first frame again. The
suite went from 588 tests to 589.

**4. The cut.** The version goes to 0.12.0, the README gains the paragraph, the lock file is written
with `npm install --package-lock-only`, and this entry is deleted.

#### Done-criteria

- `npm test`, `npm run type-check` and `npm run build` all pass.
- `npm run demos` regenerates the same eight sheets and the committed bytes match all eight, with
  `docs/rotate-strip.svg` unchanged from before the item started.
- `framesOf`, `frameTimes` and `Frame` are all exported from `index.ts`, and a test names each.
- A walk of a figure that loops never hands back a frame that `sameMarks` calls its own first frame.
- Every frame's marks and view are `at` and `viewAt` of the figure at that frame's own time, to 1e-12,
  held on a figure whose view moves.
- Both demos walk at 30 frames a second and every frame paints through both painters, held by a test.
- The walk hands frames back one at a time rather than as a list, which a test holds by walking a
  figure and reading one frame.
- `mark.ts`, `node.ts`, `flatten` and both painters are untouched across the whole item, which is the
  boundary 0.10.0 and 0.11.0 both held.

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
