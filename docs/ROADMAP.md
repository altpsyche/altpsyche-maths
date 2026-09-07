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
| 0.5.0 | The animation vocabulary, stagger included |
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
number that changes. Every version after adds to that same figure: the point's walk becomes a proper
move-along-path at 0.5.0, the slope gains its equation at 0.6.0, that equation morphs as the point
crosses a stationary point at 0.7.0, a brace measures the rise at 0.8.0, the view follows the point
at 0.9.0, and the curve's gradient becomes a field at 0.10.0.

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

**0.5.0 is planned and step 1 is the pick.** Its steps are under its item below, each one a commit,
and a session resumes at the first unticked one. One call in that item is Siva's and it decides step
11, so the ten steps before it are workable while it is open.

## The items

Each is a version above. What follows is what each one covers.

### The animation vocabulary, 0.5.0

Six animations exist: `fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `moveBy`. Manim has around
forty. The ones whose absence is felt first are rotate, scale, move-along-path, indicate, flash,
circumscribe, grow-from-a-point, and a stagger. **`Timeline` can overlap two animations with a
negative `after` and cannot stagger a list**, so a row of things appearing one after another has to
be written out by hand, one `play` per item.

**One call is Siva's, and it decides step 11.** This file says the point's walk becomes a proper
move-along-path at 0.5.0. Moving along a path means moving at a steady pace along its length, and the
demo's tangent and its reading both need the graph x the point stands at, which a place measured
along the length does not hand over. Two ways to settle it.

The one the plan is written to: **the demo's track drives length along the curve instead of x**, the
scene reads the point off the curve by length and recovers x from that point with `unscaled`, so the
point moves at a steady pace and the point, the tangent and the reading are all one number. The
`moveAlong` animation still lands with its own tests, and the demo exercises it on the dot's entrance
rather than on the walk.

The other: **the point is moved by a `moveAlong` span while the tangent and the reading stay on the
x track.** That is the animation doing the walk, which is what this file's line says, at the cost of
two clocks for one motion: the span's eased fraction and the track's value are free to disagree, and
the tangent would sit somewhere the point is not.

**A second thing is worth saying rather than deciding.** Every feature reaching both demos is the ask,
and a rotation has no picture in a flat graph. Rotate lands with tests here and its picture arrives
with the solid demo at 0.9.0. Nothing else in the eight is homeless: the entrance uses the stagger,
`growFrom` and `draw`, and the beat at the stationary point uses `indicate` and `circumscribe`.

**Three things the plan settles rather than asks.**

A turn moves a text mark's anchor and leaves its words upright. A mark carries no rotation and adding
one is a change to what both painters must do, and a label that stays readable while the thing it
names turns is what a figure wants anyway, which is the same reason `numberLine` takes a direction
rather than being turned on its side. A growth does reach a text mark, moving its anchor and its
size, because both of those are numbers a mark already carries.

An animation that adds marks emits them at every fraction of its span, with nothing showing at either
end, rather than appending them part way through. A mark that arrives between one frame and the next
turns up in a comparison as something that changed, which is the same call the bars of no height and
the region of no width already made.

`indicate` swaps a colour for the length of its span rather than walking to it. A colour is any CSS
colour written as text, and walking between two of them needs a parser for every form one can take.
That parser is its own item and is queued below.

**The steps.** Each one is a commit, and each names the measurement its commit body quotes.

- [x] **1. A path's own bounds.** `figure/bounds.ts`: `boundsOf` for a path and `boundsOfMarks` for a
      list, each two intervals, and nothing where there are no points. A text mark contributes its
      anchor alone. **Landed.** The box round a circle is exactly its centre plus and minus its
      radius, at three radii, with no error at all rather than the 2.7 parts in ten thousand the plan
      allowed for: the four cubics meet at the points furthest out along each axis, so those are
      segment ends and the cubics' own error sits at the corners inside the box. The circle turned
      out not to separate the exact answer from the box round the control points, so the case that
      does is one cubic whose controls stand off the curve: exact 0.75 against a hull of 1, which is
      a third too tall. The demo's curve reads -4.6 to 2.76 across and -1.92 to 2.4 up, which is the
      graph cut at x = 3.
- [x] **2. The length table comes out of `trim`, and a cut is even inside a segment.** The private
      per-segment measurement in `figure/trim.ts` is now `figure/length.ts`, which keeps the length
      reached at each of the sixteen samples rather than only the total, so a length can be read back
      as a parameter. **Landed.** Twenty cuts at even fractions, worst gap as a share of the whole
      length, before then after: a quarter circle as one piece, 4.7e-3 then 1.4e-4; a whole circle
      as four, 1.2e-3 then 9.6e-6; the demo's curve as ninety-six, 2.9e-5 then 9.4e-8. Many short
      pieces hid the defect and one long piece exposed it, which is why both are measured.
- [x] **3. A path's length, and the point a fraction along it.** `lengthOf` and `pointAlong` on the
      table from step 2, named for the fraction they take rather than for a length, since that is
      what `trimPath` takes and what an animation's own progress is. **Landed.** A straight line reads
      exactly its own length. Twenty steps along a quarter circle vary in size by 6.9% taken at even
      fractions of parameter and by 0.36% taken at even fractions of length, and by 0.07% along the
      demo's curve. The sample count's own claim was wrong and is corrected: sixteen chords read a
      quarter circle 4 parts in ten thousand short of the truth, not better than one part, and the
      count is chosen for the evenness of a walk rather than for the total, which is a ratio the
      shortfall largely cancels out of.
- [x] **4. `rotate` and `scale`.** About a pivot, which is the box centre of the marks the animation
      touches unless a figure names one, read off the marks as they arrive so it is the same point at
      every fraction. **Landed.** An L turned a whole circle lands 5.4e-16 from where it began, and
      one of its corners keeps its distance from the pivot to 1.3e-15 of 2.5 across a hundred and one
      fractions of the span. The plan claimed a pivot read back after the turn would drift and that
      was not measurable: eight eighth-turns each about a recomputed centre returned to 3.3e-15,
      because a right angle's symmetry cancels it. What is measurable is that the centre moves at
      all: an L's box centre goes from (1.5, 2) to (1.5, 1.293) over an eighth turn, so a pivot read
      back is a different point. A growth by two doubles the box, keeps its centre, and carries a
      stroke of 0.1 to 0.2 and a word of 0.5 to 1. Both hand back the very marks they were given at
      a fraction of nothing.
- [x] **5. `moveAlong`.** A mark carried along a path at a steady pace, by length rather than by
      piece. What it moves is the offset from the path's own start, so a mark placed at that start
      travels the path and one placed elsewhere travels the same shape from where it stands, which
      is what makes it nothing at the beginning of its span like every other change here.
      **Landed.** Twenty steps along the demo's curve vary in size by 0.07%, and the mark lands on
      the far end exactly. A stroke and a word keep the size they had, since a translation scales
      nothing.
- [x] **6. `growFrom`.** Scaled up from nothing at a point, which is `scale` from zero with a pivot,
      and out of its own middle where no point is named. **Landed.** The box at the beginning of the
      span is the point to 1e-12 on all four sides; half way through it is half the width with a
      stroke of 0.05 against 0.1; and at the end it is the very marks it was given rather than the
      marks rebuilt through a transform of one.
- [x] **7. `indicate`.** Swelled and settled with a colour swapped for the span, each half of the
      swell being the smoothstep the tracks already pace with. **Landed.** A ring two across at a
      factor of 1.5 reads 2, 2.5, 3, 2.5, 2 at nothing, a quarter, half, three quarters and one, so
      the peak is exact and the two halves match. It leaves from rest: the first twentieth of the
      span moves it 2.8e-2 against 1.48e-1 for the twentieth a quarter of the way in. The colour is
      the given one across the span and the mark's own at both ends, on fill and stroke and on a
      word. Both ends hand back the very marks they were given.
- [x] **8. `flash`.** Rays out from a point and gone, named under the thing they point at.
      **Landed.** Thirteen marks at nothing, a quarter, half, three quarters and one alike, for a
      figure of one mark and twelve rays, so nothing arrives or leaves part way through. The rays are
      at an opacity of nothing at both ends and one in the middle, and they reach 0, 2 and 4 figure
      units across at those three fractions for a reach of 2.
- [ ] **9. `circumscribe`.** A box or an ellipse round a thing's bounds, drawn on and faded.
      Measurement: the shape's own bounds against the target's plus the padding asked for, to 1e-12,
      and the mark count the same at every fraction.
- [ ] **10. `Timeline.stagger`.** A list of changes, each starting a gap after the one before, each
      running the same length. Measurement: the six spans' start times and the timeline's duration
      against the hand arithmetic, and the same row written out by hand with `after` giving spans
      that match to 1e-12.
- [ ] **11. The demo gains an entrance and a beat, and 0.5.0 is cut.** The grid fades in, the axes
      draw on, the labels arrive in a stagger, the dot grows from the origin, the curve draws, and
      the dot is indicated as it crosses the stationary point with the reading circumscribed beside
      it. Bump to 0.5.0 in this commit. Measurement: the demo's mark count and its reading at the
      four frame times, the entrance's own duration, and the byte length of both committed SVGs.
      **This is the step the demo gains from.**

**Done criteria, line by line.**

- `npm test`, `npm run type-check` and `npm run build` all pass on a clean tree.
- `index.ts` exports `boundsOf`, `boundsOfMarks`, `Bounds`, `lengthOf`, `pointAlong`, `rotate`,
  `scale`,
  `moveAlong`, `growFrom`, `indicate`, `flash`, `circumscribe`, and `Timeline.stagger` is on the
  class.
- The eight animations each hand back the marks they were given, to 1e-12, at a fraction of nothing
  and at a fraction of one, except the two that mean to leave something changed.
- Every animation that adds marks gives the same count at every fraction of its span.
- No animation touches the words a text mark says, since a number that counts is 0.8.0.
- `at(tangent, seconds)` gives the mark counts step 11 quotes, at all four times.
- `npm run demos` leaves the working tree clean.
- The turn test on an L-shape closes to 1e-12.
- Twenty points at even fractions of length are evenly spaced to the bound step 3 quotes.
- `package.json` says `0.5.0`.

### Equations, 0.6.0

The typesetter behind the one door, the walk from a typesetter's SVG into marks, and the placement of
an equation in a figure. About four hundred lines exist in the website and move here.

**Three refusals are not optional and are the expensive part to rediscover.** A TeX error carries
`data-mjx-error`. A character the font has no outline for arrives as a `<text>` element, which draws
with whatever font a browser has and draws nothing at all in a recording. And `AllPackages` carries
the `noundefined` extension, so an undefined macro is not an error: it comes back as glyph outlines
under `fill="red"`, indistinguishable from an expression that typeset, and a typo ships as a red word
inside the picture.

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
