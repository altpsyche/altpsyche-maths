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

## Space

<img src="https://raw.githubusercontent.com/altpsyche/altpsyche-maths/master/docs/surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it at one height and the two branches of the curve where they meet drawn in orange along the surface. Blue arrows across the pane show the way the saddle falls and three green runs of steepest descent are drawn on it.">

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

An **animation** maps marks and a fraction of a span to marks. Fifteen of them are supplied, among
them `draw`, `fadeIn`, `moveAlong`, `rotate`, `morph` and `morphEquation`, which pairs the glyphs of
two typeset expressions and moves only the difference. Every animation is the identity at the start
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
1,046 tests over 66 files runs in Node without a browser. Comparisons are by tolerance rather than by hash, because
`Math.sin`, `Math.cos` and `Math.pow` are not specified to the last bit and differ between engines.

## Moving from 1.0.0

1.0.0 was the version before this one on npm, and 1.6.0 arrives with the whole 1.x band behind it:
the typography, the pacing, the variable-width stroke, the gradient, the view as a timeline entry,
and the rectangular clip with the inset it makes possible.

**The door is additive.** It went from 230 names to 266 and no name was removed or renamed.

**Four types a caller may read or implement changed shape**, so this is a minor version carrying
changes a major usually announces.

| type | at 1.0.0 | at 1.6.0 |
| --- | --- | --- |
| `Span` | `animation: Animation` | `entry: Entry`, which is an `Animation` or a `ViewChange` |
| `CanvasLike` | neither `rect` nor `clip` | both, required |
| `PaintNode` | no `append` | required |
| `Stroke.width` | `number` | `number \| Taper` |

`rect`, `clip` and `append` are required rather than optional because a context that skipped a clip
would paint the marks a figure asked to have cut away, and a `<clipPath>` holding no `<rect>` clips
away everything that references it. A real `CanvasRenderingContext2D` and a real element in a
document each satisfy them, so what this reaches is a hand-written stand-in.

**Two new optional fields change what a painter has to honour.** `Fill.gradient` and `Mark.clip` are
each read by the two painters here. A caller painting marks with a painter of its own draws the wrong
picture rather than an error where it ignores them: a washed fill comes out flat, and a clipped mark
comes out whole.

## Further reading

[docs/GUIDE.md](docs/GUIDE.md) teaches the package in order. [docs/REFERENCE.md](docs/REFERENCE.md)
carries one entry for each of the 375 names at the door. [DESIGN.md](DESIGN.md) states why the
design is what it is and what it will not become.

`index.ts` is the entire public surface, and nothing outside the package reaches a file inside it by
path. A line divides the package: values and timing below it, figures and painters above, and
nothing below the line imports anything above it. A test holds each of those.

MIT.
