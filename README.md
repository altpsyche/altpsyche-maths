# @altpsyche/maths

This is the maths behind the figures on [altpsyche.dev](https://altpsyche.dev).

You give a picture a size in units you choose, 16 across and 9 up say. Everything goes in those
units: a circle of radius 3, a line 0.05 units thick. You say what moves and when, then you ask for
a time. At 0.5 seconds you get back a list of **marks**: each mark is an outline to fill or stroke,
or a piece of text, with its place already worked out.

You choose what draws that list. `svgMarkup` writes an SVG document for a page and `paintCanvas`
paints a canvas for a recorder, and both read the same marks.

<img src="docs/tangent.svg" width="720" alt="A parabola on a labelled grid over a field of small blue arrows, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

That is one figure at 7.86 seconds of its 10.25 second run, and it measures 10.8 units by 6. Watch
it from the start: the grid fades in, the axes draw themselves, then the curve draws. A dot walks up
the curve at a steady pace while the number in the corner reads the slope underneath it. Because
every size in it is in the figure's own units, the same code draws it 640 pixels across in a chapter
and 2160 by 3840 in a reel.

## Install

```sh
npm install @altpsyche/maths
```

You need Node 20 or newer. The one runtime dependency is MathJax, and only the typesetting call
loads it, so a figure with no equations in it never reaches that code.

## A whole figure

```ts
import { Timeline, circle, draw, group, marksAt, shape, svgMarkup, vec2, viewAt } from '@altpsyche/maths';

const figure = {
  extent: { width: 16, height: 9 },
  still: 1,
  scene: group('fig', [shape('ring', circle(vec2(0, 0), 3), { stroke: { colour: '#fff', width: 0.05 } })]),
  timeline: Timeline.empty().play(draw('fig/ring'), 1),
};

svgMarkup(marksAt(figure, 0.5), viewAt(figure, 0.5, 640, 360), 640, 360);
```

Ask for half a second and you get half a ring, as a string of SVG you can write straight to a file.
Ask for that time again and you get the same half ring, because `marksAt` is a pure function of the
time you hand it. No browser ran, and nothing here touched a screen.

## What you can draw

**Graphs, and the calculus you read off them.** `axes` gives you both axes with their ticks and
numbers. `plot` draws a function over a run of x and cuts the curve where it leaves the frame.
`areaUnder` shades the region beneath it, `tangentAt` draws the tangent at a point, `brace` measures
a rise, and `countTo` ticks a number up to it.

<img src="docs/boolean.svg" width="720" alt="Two discs drawn three times side by side: everything either one covers, only what both cover, and the first with the second taken out of it.">

**Shapes combined.** `unionOf`, `intersectionOf` and `differenceOf` work over closed loops of
cubics, and the answer can carry a hole where neither input had one. When the pieces it kept will
not join into a loop, the call throws. The message names how many pieces it had and how far apart
their two ends sit.

<img src="docs/surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it at one height and the two branches of the curve where they meet drawn in orange along the surface. Blue arrows across the pane show the way the saddle falls and three green runs of steepest descent are drawn on it.">

**Surfaces and vectors in space.** `camera3` builds the camera, and you hand it to every builder
that works in space. `surface3` draws a surface as a grid of cells sorted back to front, and
`sectionOf` finds the curve where a plane cuts through it. `axes3` draws three axes, and
`vectorField3` a field of arrows. All of them hand back the same marks a graph does, so one
animation reaches both.

<img src="docs/rotate.svg" width="720" alt="Two panels side by side, each an L-shaped block turned part way round with a dot marking the point it turns about. In the left panel the dot sits at the middle of the block's own box. In the right it sits off to one side, so the block swings round it.">

**Motion.** Fifteen animations play over a `Timeline`, in order, together, or staggered down a row.
`draw` draws a shape on from one end, `fadeIn` fades it in, `moveAlong` carries it down a path, and
`morphEquation` walks one typeset expression into the next glyph by glyph. The view can follow a
moving thing across the picture, and `framesOf` hands you the figure one frame at a time for a
recorder.

## What you can't do, and why

**A mark asks only for what both painters can do.** You get no filters, no blend modes and no
clipping. A figure that used an SVG filter would look right on the page and lose it without a word
in the recording.

**A colour is flat.** You get no gradients, and this one is not the rule above. Both painters draw a
gradient, but each names one its own way, and a colour here is text that both take as it stands.

**A figure never reads the page.** You hand colours in as text, `'#1b1b1b'` or `'rgb(27, 27, 27)'`.
The package holds no palette of its own and never calls `getComputedStyle`.

**A stroke keeps one width along its whole length.** A tapering line needs a renderer of its own,
and neither painter here is one.

**No screenshot gates this package.** Every test reads a list of marks or a number, so the whole
suite runs in Node with no browser anywhere. A claim that needs a browser is the website's to test.

## Where to go next

Read [docs/GUIDE.md](docs/GUIDE.md) first. It teaches the package: what a figure is, how to draw one
and move it, and what each part is for.

[docs/REFERENCE.md](docs/REFERENCE.md) gives you one entry per name, for looking up what a call
takes once you know which call you want.

[DESIGN.md](DESIGN.md) tells you why the package is built this way, and what it will not become.

`index.ts` is the whole public surface, 227 names. Nothing outside the package reaches a file inside
it by path, and a test holds that.

A line runs through the middle of the package. Below it sit values and timing: `vec2`, `mat3`, the
four easing curves, and a value walked between keys. Above it sit figures and painters. Nothing
below the line imports anything above it, and a test says so.

MIT.
