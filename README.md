# @altpsyche/maths

The mathematics the figures on [altpsyche.dev](https://altpsyche.dev) are drawn from.

You describe a picture in its own units, say what moves and when, and ask for a time. Back comes a
flat list of things to draw. What draws them is up to you: this package writes SVG for a page and
paints a canvas for a recorder, and both read the same list.

<img src="docs/tangent.svg" width="720" alt="A parabola on a labelled grid over a field of small blue arrows, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

That picture is one figure at one moment. It arrives rather than appearing. The grid fades in, the
axes draw on, and the curve draws. Then a dot walks up it at one speed, and the number in the corner
reads the slope under it. Nothing in the figure was measured in pixels.

## Install

```sh
npm install @altpsyche/maths
```

Node 20 or newer. One runtime dependency, MathJax, and the typesetting call is what loads it, so a
figure with no equations in it never reaches that code.

## In full

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

Half a second in, that draws half a ring. Ask for the same time again and you get the same half
ring, because `marksAt` is a pure function of the time you hand it.

## What it draws

Graphs and the calculus you read off them. Axes with their ticks and numbers, and a plotted
function cut where it leaves the frame. The region under it, the tangent at a point, a brace
measuring a rise, and a number counting up to it.

<img src="docs/boolean.svg" width="720" alt="Two discs drawn three times side by side: everything either one covers, only what both cover, and the first with the second taken out of it.">

Shapes combined. Union, overlap and difference, over closed loops of cubics, with a hole in the
answer where the inputs had none. When the pieces will not join into a loop, the call stops and says
how far apart the ends it had are.

<img src="docs/surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it at one height and the two branches of the curve where they meet drawn in orange along the surface. Blue arrows across the pane show the way the saddle falls and three green runs of steepest descent are drawn on it.">

Surfaces and vectors in space. A camera you hold, a surface as a grid of cells sorted back to front,
the curve where a plane cuts it, three axes, and a field of arrows. Every builder in space hands
back the same flat marks a graph does, so the same animations reach both.

<img src="docs/rotate.svg" width="720" alt="Two panels side by side, each an L-shaped block turned part way round with a dot marking the point it turns about. In the left panel the dot sits at the middle of the block's own box. In the right it sits off to one side, so the block swings round it.">

Motion. Fifteen animations over a timeline that plays them in order, together, or staggered down a
row. Typeset mathematics from LaTeX, walked glyph by glyph from one expression into the next. A view
that follows a moving thing. And a walk that hands out a figure a frame at a time for a recorder.

## What it refuses, and why

**A mark may only ask for what both painters can do.** No filters, no blend modes, no clipping and
no gradients. A figure reaching for something only SVG has would look right on a page and lose it
without a word in a recording.

**A figure never reads the page.** Colours arrive as text you hand in. Nothing here holds a palette
or asks a browser for a computed style.

**A stroke has one width along its whole length.** A tapering line needs a renderer of its own, and
neither painter here is one.

**No screenshots gate this package.** Every claim it makes is a list of marks or a number, so the
whole suite runs without a browser. A claim that needs one is a claim about a consumer.

## Where to go next

[docs/GUIDE.md](docs/GUIDE.md) teaches the package: what a figure is, how to draw and move one, and
what each part is for. Start there.

[docs/REFERENCE.md](docs/REFERENCE.md) has one entry per name, for looking up what a call takes once
you know which call you want.

[DESIGN.md](DESIGN.md) says why it is built this way, and what it will not become.

`index.ts` is the whole public surface. Nothing outside the package reaches a file inside it by
path, and a test holds that.

There is a line through the middle. Values and timing are below it: vectors, a transform, the four
easing curves, and a value walked between keys. Figures and painters are above it. Nothing below the
line imports anything above it, and a test says so.

MIT.
