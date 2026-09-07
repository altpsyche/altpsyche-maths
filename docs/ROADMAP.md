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
demos draw, not when its code compiles.

| version | what lands |
| --- | --- |
| 0.4.0 | Axes and plotting |
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

**The flat demo is a tangent sliding along a curve.** Axes with ticks and labels, a plotted function,
a point walking along it, the tangent at that point, and the slope shown as a number that changes. At
0.4.0 it is the axes and the curve. Every version after adds to the same figure: the point's walk
becomes a proper move-along-path at 0.5.0, the slope gains its equation at 0.6.0, that equation
morphs as the point crosses a stationary point at 0.7.0, a brace measures the rise at 0.8.0, the view
follows the point at 0.9.0, and the curve's gradient becomes a field at 0.10.0.

**The solid demo starts at 0.9.0**, because nothing before it can draw one, and it is a surface with
a plane cutting through it and the curve of the intersection drawn on both. What it then takes from
the versions before it is everything reusable in three dimensions: the axes become three, the
animations apply to marks in space, the equation of the surface is typeset beside it, and the camera
orbits.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Both demos are committed and both are in the README.** The image is SVG written by `svgMarkup`,
which needs no browser, so it is regenerated by a script and a gate compares the regenerated bytes
against the committed file. A picture in a README that nothing regenerates goes stale in silence. **A
moving image in a README needs a GIF and this package has no encoder**, so what the README carries is
a strip of frames in one SVG, which shows the motion in a still.

## Now

**0.4.0 is planned and step 1 is the pick.** Its steps are under its item below, each one a commit,
and a session resumes at the first unticked one. One naming call in that item is Siva's, and it is a
rename across the step list either way rather than a change to the plan.

## The items

Each is a version above. What follows is what each one covers.

### Axes and plotting, 0.4.0

`numberLine`, `axes`, `numberPlane`, ticks and their labels, a function plotted over a range, the area
under a curve, and a tangent that slides along one. **This is the most-used picture in the reference
material and the package has none of it.**

The sampler already gives the part that is usually hard. `scene` is a function of `(seconds, values)`
and `tracks` carries the values, so a curve that is genuinely a different curve each frame is what
this package already does rather than something to add.

**One call is Siva's, and it is a rename either way.** The plan is written to lower-case functions
handing back a `GroupNode`, which is what `arrow`, `callout` and `dot` already are. `NumberLine`,
`Axes` and `NumberPlane` are Manim's class names and were written into this file to say which pictures
were meant. Nothing in this package is a class, and three capitals among forty lower-case exports
would make a reader of `index.ts` look for a constructor that is not there. Say the word and the step
list takes the capitals instead.

**Three things the plan settles rather than asks.**

A curve is sampled at a fixed number of points and is never subdivided by curvature. Adaptive
subdivision hands back a different point count as the curve changes, and `morph` walks one path into
another by pairing their points, so a curve that resamples itself between frames cannot be morphed
into anything. The count is an option with a default, and step 7 measures what the default costs.

The mapping from graph units to figure units is a value the caller holds rather than something read
back out of a drawn group. `axes` draws the two lines and `plot` needs the mapping, so a plot over
axes that were never drawn has to work.

An interval goes below the line, in `values/`, because [DESIGN.md](../DESIGN.md) already lists
intervals there and none exists yet. Ticks and scales go above it, in `figure/`, because a tick
exists to be drawn.

**The demo is written first, as the target the steps compile to.** It is `demos/tangent.ts`, and this
is what it says at 0.4.0. The names in it are the public surface the steps have to produce.

```ts
const coords = coordsOf(
  scaleOf({ from: -1, to: 4 }, { from: -4.6, to: 4.6 }),
  scaleOf({ from: -1, to: 9 }, { from: -2.4, to: 2.4 })
);
const curve = (x: number) => x * x;

export const tangent: Figure = {
  extent: { width: 10.8, height: 6 },
  duration: 4,
  still: 2,
  tracks: { x: [{ time: 0, value: 0 }, { time: 4, value: 3, smooth: true }] },
  scene: (seconds, values) => {
    const x = values.x as number;
    const slope = slopeOf(curve, x);
    return group('tangent', [
      numberPlane('grid', coords, { stroke: faint, minors: 4 }),
      axes('axes', coords, { stroke: pen, fill: ink, size: 0.28 }),
      areaUnder('area', coords, curve, { from: 0, to: x }, { fill: wash }),
      shape('curve', plot(coords, curve, { samples: 96 }), { stroke: pen }),
      tangentAt('tangent', coords, curve, x, { stroke: accent, reach: 1.2 }),
      dot('point', pointOf(coords, x, curve(x)), 0.08, ink),
      text('reading', fractionOf(extent, 0.06, 0.9), `slope ${labelFor(slope, 0.01)}`, 0.32, { fill: ink }),
    ]);
  },
};
```

**The steps.** Each one is a commit, and each names the measurement its commit body quotes. A session
resumes at the first unticked one.

- [ ] **1. An interval.** `values/interval.ts`: `Interval` as `{ from, to }`, its length, whether it
      holds a value, and one interval remapped onto another over the existing `remap`. Measurement:
      the round trip through two remaps over a thousand samples, and what a reversed interval does
      where `from` is above `to`.
- [ ] **2. Ticks on an interval, and their labels.** `figure/ticks.ts`: the step size chosen by
      Heckbert's nice numbers, which is the published version of the one, two, five and ten rule; the
      tick values inside an interval; and each tick's own text, formatted from the number of decimals
      the step has. A tick comes back as its value and its text together, so a caller never re-derives
      the decimals. Measurement: how many of the labels over zero to one at a step of a fifth carry
      float noise when formatted the obvious way, against none after; the step and the count chosen
      for four ranges including one where `from` is above `to` and one of no width.
- [ ] **3. A scale, and the pair of them.** `figure/scale.ts`: `Scale` as a graph interval onto a
      figure-unit interval, `scaled` and `unscaled`, then `Coords` as the two scales together with
      `pointOf(coords, x, y)`. Measurement: where the demo's coords put graph `(0, 0)`, `(4, 9)` and
      one point outside both intervals, and the round trip through `unscaled` over a thousand samples.
- [ ] **4. `numberLine`.** One drawn axis: the line, a tick at each value, a label under each tick,
      and an optional tip at each end. Measurement: the mark count and the id list for the demo's x
      interval; and the geometry of every mark with a label forty characters long against the same
      figure with a label one character long, which is DESIGN.md's rule that nothing about a figure's
      layout may depend on how wide some text is.
- [ ] **5. `axes`.** Two number lines under one group, crossing at zero, and at the near edge of the
      interval where zero is outside it. Measurement: the mark count; and where the horizontal line
      sits for a y interval of minus one to nine against one of two to nine, where zero is off the
      picture and an axis drawn at zero would be invisible.
- [ ] **6. `numberPlane`.** The grid: a line at each tick and a fainter line at each division
      between them. Measurement: the line count for the demo's coords at four divisions, the count
      with the divisions off, and how many lines fall outside the coords' own intervals, which is
      none.
- [ ] **7. `plot`.** A function of one number sampled over an interval into a path, at a fixed count.
      Measurement: the largest distance from the sampled path to the true curve, taken at the midpoint
      of every segment, for the demo's curve and for a sine over two turns, at sixteen, sixty-four and
      two hundred and fifty-six samples. The default is the count that reading those three makes
      obvious rather than a guess.
- [ ] **8. A plotted curve stays inside its own axes.** A sample that is not finite ends the subpath,
      and so does a sample outside the y interval, with the next sample that is back inside starting
      a new one. Measurement: the subpath count for one over x across zero, for tangent over two
      turns, and for the square root from below zero, against what step 7 gives for each; and the
      number of points left outside the y interval, which is none.
- [ ] **9. The demo draws, first cut.** `demos/tangent.ts` carrying the grid, the axes and the curve;
      `npm run demos` writing `docs/tangent.svg` through `svgMarkup`; a gate comparing the regenerated
      bytes against the committed file; and the README carrying the image. Measurement: the demo's
      mark count and id list at zero seconds and at its still time, and the byte length of the
      committed SVG. **This is the first step the demo gains from.**
- [ ] **10. `areaUnder`.** The closed region between a plotted curve and a horizontal line, over an
      interval. Measurement: the region's own area, worked out from its cubics by Green's theorem,
      against the exact integral of the demo's curve over zero to two, which is eight thirds; quoted
      as parts in ten thousand at the sample count step 7 settled.
- [ ] **11. `riemannBars`.** The bars under a curve, with the height taken at each bar's left edge,
      right edge or middle. Measurement: the summed area at four, sixteen and sixty-four bars for
      each of the three placements against eight thirds, which shows the left sum below and the right
      sum above at every count.
- [ ] **12. `tangentAt` and `slopeOf`.** The slope of a function at a point by the central difference,
      and the tangent line through that point drawn a stated reach either side. Measurement: the slope
      at three x values on the demo's curve against the exact derivative, and the same on a sine,
      quoting the error and the step size `h` that produced it; and the distance from the tangent's
      midpoint to the curve, which is zero to within that error.
- [ ] **13. The demo complete, and 0.4.0 cut.** The demo gains the walking point, the sliding tangent,
      the shaded area and the slope as a number that changes, all driven by the `x` track; the README
      carries a strip of frames in one SVG, because a moving image needs a GIF and this package has no
      encoder. Bump to 0.4.0 in this commit. Measurement: the demo's mark count and the slope text at
      zero, one, two and four seconds, and the byte length of both committed SVGs. **This is the
      second step the demo gains from.**

**Done criteria, line by line.**

- `npm test`, `npm run type-check` and `npm run build` all pass on a clean tree.
- `index.ts` exports `Interval`, the interval calls, `Tick`, the tick calls, `Scale`, `Coords`,
  `scaleOf`, `coordsOf`, `scaled`, `unscaled`, `pointOf`, `labelFor`, `numberLine`, `axes`,
  `numberPlane`, `plot`, `areaUnder`, `riemannBars`, `tangentAt` and `slopeOf`, and no file under
  `demos/` reaches into the package by any path other than the door.
- `at(tangent, seconds)` gives the mark counts step 13 quotes, at all four times.
- `npm run demos` leaves the working tree clean, which is the gate saying the committed SVGs are what
  the code now produces.
- The README carries the still and the strip of frames.
- No label's position changes when its text gets forty characters longer.
- No plotted point sits outside its coords' y interval, for all three functions of step 8.
- The area under the demo's curve over zero to two is eight thirds to within the bound step 10 quotes.
- The slope from `slopeOf` matches the exact derivative to within the error step 12 quotes, at three
  points on each of two functions.
- `package.json` says `0.4.0`.

### The animation vocabulary, 0.5.0

Six animations exist: `fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `moveBy`. Manim has around
forty. The ones whose absence is felt first are rotate, scale, move-along-path, indicate, flash,
circumscribe, grow-from-a-point, and a stagger. **`Timeline` can overlap two animations with a
negative `after` and cannot stagger a list**, so a row of things appearing one after another has to
be written out by hand, one `play` per item.

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

## Someday

- **Gradients along a stroke or across a fill.** DESIGN.md refuses them under the rule that a mark
  may only ask for what both painters can do, and both painters can do gradients, so the refusal is
  worth re-reading rather than assumed.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
