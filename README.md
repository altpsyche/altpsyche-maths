# @altpsyche/maths

The mathematics the figures on [altpsyche.dev](https://altpsyche.dev) are drawn from.

A **figure** is a picture that moves and explains itself. Asking one for a time gives back a
flat list of **marks**, and a **painter** turns marks into something a reader can see.

```ts
import { Timeline, at, circle, draw, group, shape, svgMarkup, vec2, viewMatrix } from '@altpsyche/maths';

const figure = {
  extent: { width: 16, height: 9 },
  still: 1,
  scene: group('fig', [shape('ring', circle(vec2(0, 0), 3), { stroke: { colour: '#fff', width: 0.05 } })]),
  timeline: Timeline.empty().play(draw('fig/ring'), 1),
};

svgMarkup(at(figure, 0.5), viewMatrix(figure.extent, 'contain', 640, 360), 640, 360);
```

## Axes and a plotted function

<img src="docs/tangent.svg" width="720" alt="A parabola on a labelled grid, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

The picture arrives rather than appearing. The grid fades, the axes draw on, their labels come in one
after another, the curve draws, the dot grows out of the origin, and the dot is pointed at where the
slope is nothing. Then it walks the curve at one speed and flashes at the top, and a brace measures
how far it climbed with its number counting up to the rise. The number in the corner is a value of
the typeset rule under it, and that rule reads no slope while the dot is held at the stationary point
and walks into the one that depends on x as the dot leaves.

```ts
import { axes, coordsOf, group, interval, numberPlane, plot, scaleOf, shape } from '@altpsyche/maths';

const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

group('graph', [
  numberPlane('grid', coords, { stroke: faint, minors: 4 }),
  axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 }),
  shape('curve', plot(coords, (x) => x * x), { stroke: drawn }),
]);
```

A **scale** is the run of numbers an axis counts through and where that run lands in figure units.
Two of them are a **coords**, and `pointOf` reads a pair of graph numbers as a point. The steps
between ticks are one, two or five times a power of ten, because those are the numbers a reader
adds up in their head.

`plot` samples a function at a fixed count and joins the samples with cubics that leave each one at
the slope the function has there. It cuts the curve where the curve leaves the graph, so a pole
breaks in two instead of drawing a line up the picture, and the cut end sits on the edge rather
than a sample short of it. The curve above is cut at x = 3, where the parabola meets the 9 its y
axis stops at.

`areaUnder` closes the region between a curve and a level line, `riemannBars` draws the bars the
region is the limit of at the left edge, the right edge or the middle of each one, and `tangentAt`
lays the tangent along the curve, cut where it leaves the graph. `slopeOf` reads the slope itself,
which is what the number in the corner is.

<img src="docs/tangent-strip.svg" width="960" alt="Four frames of the same figure side by side, the point walking up the curve, the shaded region growing behind it, the typeset rule in the corner changing from a slope of nothing to one that depends on x, and a brace measuring the rise in the last frame.">

Four times of one figure, side by side: the picture arrived, the beat at the stationary point, half
way up, and the top. A moving picture in a README needs a GIF and this package has no encoder, so the
strip shows the motion in a still.

## Equations

`equationFromTex` typesets an expression with MathJax and reads the SVG the typesetter wrote back as
marks, one per glyph. `equationNode` places those marks in a figure, fitted inside a box and centred
on a point. It fits the width as well as the height, because an expression six times wider than it is
tall runs off the sides of a figure the moment the height alone decides its size.

```ts
import { equationFromTex, equationNode, vec2 } from '@altpsyche/maths';

const rule = await equationFromTex('\\frac{dy}{dx} = 2x');

equationNode('rule', rule, {
  at: vec2(-4.27, 1.74),
  width: 1.2,
  height: 0.6,
  fill: { colour: '#1b1b1b' },
});
```

An equation is paths on the page as well as in a recording, which is what stops one expression having
two pictures free to disagree. A glyph is an outline rather than a letter, so no font has to be
installed anywhere and the LaTeX is the label the picture carries for a reader.

MathJax is the one runtime dependency and the typesetting call is what loads it. Importing the door
reaches none of it, so a consumer who draws figures and typesets nothing pays nothing. What that
costs is that typesetting answers with a promise.

`matchGlyphs` says which glyph of one expression is which glyph of the other, and `morphEquation`
walks one into the next: the shared sub-expressions stay put and only the difference moves. Two marks
match on the part of the leaf name after the first dash, which the typesetter's own naming gives, so
a glyph is `3-1D465` and a fraction bar is `4-rule`. The pairing is the longest common subsequence of
the two token sequences, which pairs each occurrence of a repeated glyph once and refuses a pair that
would cross another pair on the way over.

```ts
import { equationFromTex, equationNode, group, morphEquation, vec2 } from '@altpsyche/maths';

const box = { at: vec2(-4.86, 1.74), align: 'start', width: 1.2, height: 0.6, fill: { colour: '#1b1b1b' } } as const;

group('rule', [
  equationNode('at-rest', await equationFromTex('\\frac{dy}{dx} = 0'), box),
  equationNode('moving', await equationFromTex('\\frac{dy}{dx} = 2x'), box),
]);

morphEquation('rule/at-rest', 'rule/moving');
```

Both expressions are in the scene at every time and the animation moves one onto the other, because a
mark that arrived part way through a span would turn up in a comparison between two frames as
something that changed. A paired glyph is drawn once rather than cross-faded, so the glyph being left
carries the walk and its partner stays at nothing until it is being stood on exactly. Hang both
expressions from the same edge with `align`, or the part they share slides sideways as the difference
arrives.

Three things stop a typeset expression rather than being drawn, and each names what it found. A TeX
error carries the typesetter's own message. A character the font has no outline for arrives as text,
which would draw with whatever font a browser had and draw nothing at all in a recording. An
undefined macro is not an error at all, because MathJax draws the macro's own name in red, so a typo
would otherwise ship as a red word inside the picture.

## Braces and a number that counts

`bracePath` draws a curly brace from one point to another with its tip standing off the line between
them, and `brace` is that path with a word beyond the tip. It is one open subpath of six pieces: a
curl out of each end, a run along at the curl's own height, and two curls meeting at the tip. The tip
is a corner rather than a smooth turn, which is what a brace has and what says which point of it is
doing the pointing. The tip stands at the depth asked for whatever the span, and only the curl
narrows when the span is short, so two close points get a shallower brace rather than one whose
halves cross.

The label is anchored and never measured, because nothing about a figure's layout may depend on how
wide some text is.

`countTo` writes the value a count has reached into a text mark. How the value is written is the
caller's, so a count of a length and a count of a population can round differently and this holds no
opinion about either.

```ts
import { brace, countTo, labelFor, pointOf, vec2 } from '@altpsyche/maths';

brace('rise', pointOf(coords, 3, 9), pointOf(coords, 3, 0), labelFor(9, 0.01), {
  depth: 0.3,
  padding: 0.28,
  stroke: pen,
  fill: ink,
  size: 0.3,
});

countTo('rise/word', 0, 9, (value) => labelFor(value, 0.01));
```

A number driven by the clock is not the same as a reading driven by a track, and the difference
matters. The slope in the demo is a value of the walk, so it is worked out by the scene from the
track and cannot drift from the dot. The rise is counted by the clock, which is honest only because
the dot has stopped by the time it counts: two clocks running at once would be free to disagree.

## Two shapes combined

<img src="docs/boolean.svg" width="720" alt="Two discs drawn three times side by side: everything either one covers, only what both cover, and the first with the second taken out of it.">

`unionOf` is everything either path covers, `intersectionOf` is only what both cover, and
`differenceOf` is the first with the second taken out of it. Each input is closed loops that do not
cross themselves, and a loop left open is closed by a straight run back to where it started before
anything else happens.

```ts
import { circle, differenceOf, intersectionOf, unionOf, vec2 } from '@altpsyche/maths';

const first = circle(vec2(0, 0), 0.9);
const second = circle(vec2(-0.6, 0), 0.36);

unionOf(first, second);
intersectionOf(first, second);
differenceOf(first, second);
```

A result may have a hole even though an input may not. A disc with a smaller disc taken out of it is
a ring, which is an outer loop and an inner loop wound the opposite way, and the nonzero rule the
mark already carries leaves the middle empty.

The work happens in four steps, and each of them is a call of its own. `curveCrossings` says where
two cubics cross, by halving both curves and following only the halves whose boxes still overlap,
then sharpening what it finds by Newton's method. `cutPath` puts a cut wherever something crosses,
so that afterwards every piece is wholly inside the other path or wholly outside it. `containsPoint`
decides which of those a piece is, by counting how many times the other path winds round its middle.
`areaOf` says how much a path encloses, in closed form rather than by sampling, which is what every
claim above is checked against.

<img src="docs/boolean-strip.svg" width="960" alt="Four frames side by side, each showing the three panels, as the small disc walks from clear of the large one, through touching it at one point, through overlapping it, to sitting wholly inside it.">

Four times of one figure. A small disc walks across a larger one: clear of it, touching it at one
point, crossing it at two, and wholly inside it. Those are the four cases this kind of code gets
silently wrong, which is why the demo walks through all of them rather than drawing one.

Two edges that lie on top of each other for a stretch have no one answer, and what comes back for
them is decided by the tolerance rather than by the geometry.

## The animations

`fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `morphEquation`, `countTo`, `moveBy`, `rotate`,
`scale`, `growFrom`, `moveAlong`, `indicate`, `flash` and `circumscribe`. A `Timeline` plays them in order, plays several `together`, or
`stagger`s a row so its parts arrive one after another.

A turn and a growth happen about a point the marks decide for themselves, which is the middle of the
box round them. `boundsOf` is that box, worked out from where each piece of the curve turns back on
itself rather than from the points the curve is written from.

`moveAlong` carries a mark along a path at one speed, measured by the path's length. Even steps in a
curve's own parameter are uneven steps along the curve: a step covers more of it where the curve is
moving fast, which on a quarter circle is a 6.9% difference between the longest step and the shortest
and on the demo's own walk is 82%.

Both pictures are written by `svgMarkup`, which needs no browser, so `npm run demos` regenerates
them and a test compares the bytes against the committed files.

## What it is built on

**A figure at a time is data.** `at(figure, seconds)` is the whole public surface, and it is a
pure function: ask for four seconds and it gives the picture at four seconds whatever it gave
before. A page playing forward, a reader dragging a scrub bar backwards and a recorder walking
a fixed step are three consumers of one answer.

**Everything is a cubic**, a straight line included. That is what lets one shape be walked into
another point by point, with no case where a line has to become an arc.

**A mark may only ask for what both painters can do**, rather than the union of them. There are
no filters, no blend modes, no clipping and no gradients, because a figure reaching for
something only SVG has would look right on a page and lose it without a word in a recording.

**A figure never reads the page.** Colours arrive as a palette the caller hands in.

## The two painters

`svgMarkup` and `paintSvg` write SVG, which is what a figure on a page is: the text is text, CSS
reaches it, and the markup can be written with no browser at all. `paintCanvas` paints the same
marks onto a two-dimensional canvas, which is what a recording needs, because an encoder takes
one surface. A test holds the two to emitting the same geometry and the same style for every
mark.

## The way in

`pathFromData` reads an SVG `d` attribute as a path, which is the inverse of what the SVG painter
writes. Without it the only shapes that exist are the ones the builders here make, so a glyph from
a typesetter or an outline from a drawing program could not be trimmed, aligned or walked into
another shape, and those are the operations this package is for. Every command is read, elliptical
arcs included, and a command it does not know stops the read rather than being skipped.

## The line through the package

**Values and timing** are below it: vectors, a transform, the four curves a change can travel
along, and a value walked between keys. That half changes almost never. **Figures and painters**
are above it. Nothing below the line imports anything above it, and a test says so.

One door. MIT.
