# @altpsyche/maths

The mathematics behind the figures on [altpsyche.dev](https://altpsyche.dev).

## The model

A **figure** is a description of a picture over time. It carries an **extent** and a **scene**. The
extent is a width and a height in the figure's own units. The scene is a tree of nodes holding
paths, text, transforms and styles. A figure has no canvas, no clock and no state.

Evaluating a figure at time t yields a flat array of **marks**. A mark is one drawn item: an outline
with a fill, a stroke, or both, or a piece of text. Its geometry is expressed in figure units with
every transform already applied, and its style is resolved rather than inherited. A mark holds no
reference to an output device.

```ts
marksAt(figure, t): readonly Mark[]
```

`marksAt` is a pure function of t. Two evaluations at one time produce identical arrays. A page
playing forward, a reader dragging a scrub bar backward and a recorder stepping at a fixed rate
therefore read one figure.

A **painter** consumes marks. `viewMatrix` builds the single affine transform taking figure units to
a surface of a given size. It inverts the y axis, since a figure counts upward and both painters
count downward from the top. No conversion to device units occurs anywhere else.

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/tangent.svg" width="720" alt="A parabola on a labelled grid over a field of small blue arrows, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

The figure above is evaluated at t = 7.86 s of a 10.25 s duration. Its extent is 10.8 by 6 units and
its marks number 181 there, counting the inset it draws.

A figure is also data. Every part of one has a written form: a node is a record of a kind and its
parameters, a parameter a track drives is an expression, and a timeline is its spans. `writeFigure`
hands the whole of it back as the text of a file and `readFigure` reads that text into a figure, so a
picture crosses a machine rather than a process. The four figures on this page are committed as
files beside their pictures, in `demos/tangent.figure.json`, `demos/boolean.figure.json`,
`demos/rotate.figure.json` and `demos/surface.figure.json`, and a gate reads each one back and holds
its marks against what the demo draws.

## Install

```sh
npm install @altpsyche/maths
```

Node 20 or newer, ESM, `sideEffects: false`. The single runtime dependency is MathJax, reached by a
dynamic import inside `typesetElement`, so a figure containing no equations never loads its 41 MB.

## A complete figure

```ts
import { Timeline, circle, colourFrom, draw, group, marksAt, shape, svgMarkup, vec2, viewAt } from '@altpsyche/maths';

const figure = {
  extent: { width: 16, height: 9 },
  still: 1,
  scene: group('fig', [shape('ring', circle(vec2(0, 0), 3), { stroke: { colour: colourFrom('#fff'), width: 0.05 } })]),
  timeline: Timeline.empty().play(draw('fig/ring'), 1),
};

svgMarkup(marksAt(figure, 0.5), viewAt(figure, 0.5, 640, 360), 640, 360);
```

At t = 0.5 the timeline has applied `draw` at half its span, and the mark carries half the ring's
arc length. `svgMarkup` returns a complete SVG document as a string, with a view box and no width or
height of its own.

## Geometry

All geometry is cubic Bézier. A **path** is a sequence of subpaths; a subpath is a start point
followed by cubic segments, closed or open. A segment stores its two control points and its endpoint
and not its start, which is why the functions evaluating one take that start as an argument.

`circle` and `arc` emit segments spanning at most a quarter turn. For a segment of angle θ the
control distance is (4/3)·tan(θ/4). That bounds the radial error at 2.7 × 10⁻⁴ times the radius, and
the suite holds the drawn edge between 2.6 × 10⁻⁴ and 2.8 × 10⁻⁴. `splitCurve` subdivides by de
Casteljau's construction and `pathFromData` reads the elliptical arc form of an SVG `d` attribute by
the conversion the specification itself gives.

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/boolean.svg" width="720" alt="Two discs drawn three times side by side: everything either one covers, only what both cover, and the first with the second taken out of it.">

`unionOf`, `intersectionOf` and `differenceOf` operate on closed loops of cubics. Crossings are
located per segment pair and refined by Newton's method, the surviving pieces are stitched, and the
result may contain a hole neither operand had. When the kept pieces fail to close, the call throws
and the message states the piece count and the distance between the two open ends. Proximity is a
distance in figure units, `TOLERANCE = 1e-6` by default, rather than a fraction of anything.

`areaOf` returns the signed area, positive for anticlockwise winding, summed over subpaths.
`containsPoint` flattens to polylines and applies the nonzero winding rule. `lengthOf` and
`pointAlong` measure by arc length, and `lengthOf` reads slightly short by the chord error of its
sampling.

## Graphs

A **scale** is a pair of intervals: the numbers an axis counts through, and where those numbers land
in figure units. `coordsOf` pairs two scales, and the mapping is a value the caller holds rather
than state read back out of a drawn group.

`plot` samples a function and emits one Hermite cubic per interval. The control points sit a third
of the way along in x and carry the sample's own slope, so the curve passes through both samples at
both slopes. `slopeOf` reads the slope off that curve's own cubics, which carry a quadratic with
nothing left over, so a parabola reads exactly rather than to a difference's O(h²). `tangentAt`
clips the tangent line to the graph analytically rather than by sampling, since a line crosses each
edge once.

`streamlineOf` integrates a field by fourth-order Runge-Kutta with a step in arc length rather than
in time, which keeps the points evenly spaced. Halving the step divides the error along the curve by
15.1 and then 15.6, against the factor of 16 the order predicts.

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/portrait.svg" width="640" alt="A phase portrait on a square grid: blue and amber arrows show the flow turning about the origin, two green curves cross where the flow stands still, and two blue spirals wind in from inside and outside onto an orange circle of radius one.">

Three forms draw what no function of x describes. `parametric` samples a function of one parameter
and joins the samples by the same Hermite construction, cut where the curve leaves the graph across
the width as well as the height; a unit circle at 96 samples reads within 4.3 × 10⁻⁷ of the true
radius, where the four cubic quarters `circle` writes leave it 2.7 × 10⁻⁴ out. `polar` is that call
under the map from a radius and an angle to a place. `implicit` finds the curve where a function of
two numbers reaches a level, by marching squares: crossings are bisected on the cell edge rather than
interpolated along it, an ambiguous cell is resolved by the value at its middle, and each place leaves
along the gradient turned a quarter turn, which holds a unit circle within 2.3 × 10⁻⁷ of the true
radius at 64 cells. An implicit curve is the one curve here whose count of places the figure does not
fix, so it cannot be a morph's source.

## Space

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it at one height and the two branches of the curve where they meet drawn in orange along the surface. Blue arrows across the pane show the way the saddle falls and three green runs of steepest descent are drawn on it.">

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/solids.svg" width="640" alt="Four panels: a shaded sphere, a shaded cube, a cylinder with an orange helix wound three times round it, and a torus with a blue trefoil knot wound through its hole. Each curve passes behind its solid on the far side and in front of it on the near side.">

`sphere3`, `cube3`, `cylinder3` and `torus3` are cells over a parametrisation run in the order that
faces every cell away from the solid, each also available as cells for a scene to sort among its own.
A flat cell falls inside a sphere's true radius by 417.5, 106.4 and 26.7 parts in ten thousand at 12,
24 and 48 steps. `curveOf3` reads a curve in space from one parameter, which is the third point
producer beside `sectionOf` and `streamlineOf`. `curvePieces3` cuts that curve into one entry per
step, so a helix round a cylinder is sorted against the cylinder's own cells: all 300 of them stand
between the first piece of the helix and the last, where a curve sorted whole is one mark at one depth
and is painted entirely in front of the solid or entirely behind it.

`camera3` holds an eye, a target, an up vector, a view matrix and a projection. `perspective` and
`orthographic` supply the projection; the orthographic case is a scale rather than a divide and
therefore has no near plane. Every builder that works in space projects to figure units and returns
the same node types a graph returns, so one animation reaches both.

`scene3` orders children back to front by the depth of their sample points, which is the painter's
algorithm. Mutually piercing pieces and cyclic overlaps admit no correct order. The answer is
smaller pieces: `surface3` cuts a surface into four-cornered cells, so two surfaces sort against
each other rather than as two groups. The sort is stable, so pieces at equal depth hold the order
the author gave and a picture does not flicker between frames. `sectionOf` returns the runs of
points where a plane cuts a parametric surface, closing a run whose ends meet.

## Time and motion

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/rotate.svg" width="720" alt="Two panels side by side, each an L-shaped block turned part way round with a dot marking the point it turns about. In the left panel the dot sits at the middle of the block's own box. In the right it sits off to one side, so the block swings round it.">

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/matrix.svg" width="720" alt="A square panel of grid lines sheared over by a linear map, with the two axes through the origin carried with them and the unit square drawn as a filled parallelogram. Beside the panel the map is written as a two by two matrix in brackets, its four numbers at the values the grid has reached.">

An **animation** maps marks and a fraction of a span to marks. Sixteen of them are supplied, among
them `draw`, `fadeIn`, `moveAlong`, `rotate`, `applyMatrix`, `morph` and `morphEquation`, which pairs
the glyphs of two typeset expressions and moves only the difference. Every animation is the identity at the start
of its span. Every mark it introduces exists at every fraction, at zero opacity where it is not yet
visible, so a frame-to-frame comparison never reports an arrival.

`Timeline` sequences animations by `play`, `together` and `stagger`, each span carrying its own
easing curve. `Timeline.at` applies a finished span in full and an unstarted one at zero, making the
timeline a function of time rather than a record of what has played. Tracks are the second source of
values: `sampleTrack` reads a keyed value at a time, holding the nearest key outside the keyed
range.

`framesOf` walks a figure at a fixed rate or count and yields one frame at a time. A frame carries
its index, its time, its marks and the view matrix built at that same time. The walk stops strictly
before the duration, so a looping figure never emits its first frame twice.

## Painters

`svgMarkup` returns a document as a string and `svgElements` returns the elements as data.
`paintSvg` replaces the children of an element already in a document, and `paintCanvas` draws into a
two-dimensional context. Coordinates are written to three decimal places. That is finer than any
screen or encoder resolves, and coarse enough that the last bits of a double never reach the output.
One test paints a single mark list both ways and holds the two to the same geometry within a
thousandth of a pixel, and to the same style exactly.

## Restrictions

A mark may request only what both painters implement: no filters and no blend modes. A figure using
an SVG filter would render correctly on a page and lose the effect silently in a recording.

A clip is a rectangle and no other shape, and that exclusion is not the rule above. Both painters
clip, with `clip-path` and with `clip()`. An arbitrary path clip needs a winding number counted,
which is a stencil on a card, where a box is the scissor test every device already has.

A fill carries one colour and a gradient beside it. SVG names a gradient with an element carrying a
document-unique identifier and a canvas with an object built from the context, and the one colour
stays because a contrast reading and anything else needing a single colour has to have one.

A stroke's width is one number or a taper between two numbers along a named curve, drawn as the
filled outline of its own path, since neither painter strokes at two widths. A width per point is not
something a figure can name. A colour is four channels and, where its author gave it one, the name a
page themes it under, so the SVG painter writes `var(--name, #rrggbb)` and every other painter reads
the numbers: a renderer in another language cannot resolve a custom property and a shader takes
numbers. `colourFrom` builds one from `'#1b1b1b'` or `'rgb(27, 27, 27)'` and throws on every other
form rather than guessing. Nothing reads the page, and `getComputedStyle` appears nowhere in the
tree.

No screenshot gates this package. Every assertion reads a mark list or a number, so the suite of
1,065 tests over 67 files runs in Node without a browser. Comparisons are by tolerance rather than by hash, because
`Math.sin`, `Math.cos` and `Math.pow` are not specified to the last bit and differ between engines.

## Moving from 1.6.0

1.6.0 was the version before this one on npm, and 2.0.0 is the figure format: a figure is a JSON
document a program reads, `readFigure` and `writeFigure` are the two calls that carry it either way,
and [docs/SPECIFICATION.md](docs/SPECIFICATION.md) states the whole of it for a renderer written in
another language.

**The door is additive.** It went from 266 names to 375 and no name was removed or renamed.

**A colour changes shape, and it is the change that reaches every caller.** A `Colour` was any CSS
colour written as text and is now four channels with an optional name, so every `Fill`, `Stroke` and
`Stop` a caller builds moves with it.

```ts
// at 1.6.0
shape('disc', circle(vec2(0, 0), 1), { fill: { colour: 'var(--accent, #fb923c)' } });
// at 2.0.0
shape('disc', circle(vec2(0, 0), 1), { fill: { colour: colourFrom('#fb923c', 'accent') } });
```

`colourFrom` reads a hex or an `rgb()` and takes the name a page themes the colour under, `colourOf`
reads the channels alone, and `hexOf` and `colourText` write one back out. A form neither reads is
refused rather than painted as nothing: a named colour or an `hsl()` read as black is a wrong picture
with nothing to say it went wrong. The SVG painter still writes `var(--name, #rrggbb)`, from the
channels the colour holds, so a page themes a figure exactly as it did.

**Three readers take the drawn path rather than the function behind it.**

| call | at 1.6.0 | at 2.0.0 |
| --- | --- | --- |
| `slopeOf` | `(of, x, step?)` | `(coords, curve, x)` |
| `areaUnder` | `(coords, of, over, options?)` | `(coords, curve, options?)` |
| `tangentAt` | `(coords, of, x, options?)` | `(coords, curve, x, options?)` |

**What that buys is a tangent that touches the curve a reader can see.** A slope read by a central
difference on the function differs from the slope of the cubic the curve is drawn as, and the two
parted by 1.06e-11 at a parabola's stationary point. Reading the drawn path makes the tangent exact
there. `AreaOptions` no longer extends `PlotOptions`, since the sampling belongs to the `plot` that
made the curve, and `TangentOptions` loses `step`, since nothing is differenced any more.

**`plot`, `riemannBars`, `vectorField`, `surface3`, `sectionOf` and `streamlineOf` still take a
function** and always will. A function making fixed geometry never had to serialise, and a figure
that stores geometry stores what the function produced.

**Nothing else a caller reads or implements changed shape.** `CanvasLike`, `PaintNode`, `Mark`,
`Span` and `Stroke` are what 1.6.0 published.

## Further reading

[docs/GUIDE.md](docs/GUIDE.md) teaches the package in order. [docs/REFERENCE.md](docs/REFERENCE.md)
carries one entry for each of the 375 names at the door. [DESIGN.md](DESIGN.md) states why the
design is what it is and what it will not become.

`index.ts` is the entire public surface, and nothing outside the package reaches a file inside it by
path. A line divides the package: values and timing below it, figures and painters above, and
nothing below the line imports anything above it. A test holds each of those.

MIT.
