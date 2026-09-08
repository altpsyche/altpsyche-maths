# Guide

This page teaches the package. It goes in the order a reader needs, and every technical word gets
its plain meaning where it first appears. [README.md](../README.md) says what the package is.
[REFERENCE.md](REFERENCE.md) has one entry per name at the door. [DESIGN.md](../DESIGN.md) says why
it is built this way.

## A figure, a mark, a painter

A **figure** is a picture that moves. You ask a figure for a time and it hands back a flat list of
**marks**. A mark is one thing to draw: an outline, filled or stroked, or a piece of text. A
**painter** turns marks into something a reader can see.

Nothing about that needs a browser. A figure at a time is a list, and a list can be counted in a
test.

```ts
import { circle, flatten, group, marksAt, shape, vec2 } from '@altpsyche/maths';

const figure = {
  extent: { width: 16, height: 9 },
  still: 0,
  scene: group('fig', [shape('ring', circle(vec2(0, 0), 3), { stroke: { colour: '#fff', width: 0.05 } })]),
};

marksAt(figure, 0);
```

`marksAt` is a pure function. Ask for four seconds and you get the picture at four seconds. Ask
again and you get the same thing. A page playing forward, a reader dragging a scrub bar backwards
and a recorder walking a fixed step all read one answer.

## Figure units and the extent

A figure is measured in its own units. The **extent** says how many units wide and tall the picture
is. Nothing in a figure is measured in pixels.

That is what lets one figure draw at 640 across in a chapter and at 3840 across in a recording. The
numbers in the figure do not change. Only the matrix that maps them onto a surface does.

```ts
import { viewMatrix } from '@altpsyche/maths';

const view = viewMatrix({ width: 16, height: 9 }, 'contain', 640, 360);
```

`contain` fits the whole extent inside the surface. `cover` fills the surface and lets the extent
run off the edges.

The **frame** is the rectangle a figure is drawn into. An extent may also carry a `centre`, which
is where the middle of the frame sits. It may be a function of the surface's shape and of the time,
so a view can follow a moving thing.

## Painting

`svgMarkup` writes one SVG document. It needs no browser, so a test can read the text it wrote.

```ts
import { marksAt, svgMarkup, viewAt } from '@altpsyche/maths';

svgMarkup(marksAt(figure, 0.5), viewAt(figure, 0.5, 640, 360), 640, 360);
```

`viewAt` reads the figure's own extent at that time, so a view that moves cannot be read at one
time and painted at another. `viewMatrix` takes an extent directly, for when you hold one yourself.

`paintSvg` paints into elements you supply, for a page that updates in place. `paintCanvas` paints
onto a two-dimensional canvas, which is what a recorder needs. A test holds all three to the same
geometry and the same style for every mark.

## Nodes and names

A figure's `scene` is a tree of **nodes**. `shape` is one outline, `text` is one piece of text,
and `group` holds children under a name. `flatten` walks the tree and hands back marks.

Every mark carries an id built from the names above it, joined by slashes. A change over time names
a node and reaches every mark under it.

```ts
import { group, shape, text, vec2 } from '@altpsyche/maths';

group('graph', [
  shape('curve', path, { stroke: pen }),
  group('labels', [text('x', vec2(4, 0), 'x', 0.3, { fill: ink })]),
]);
```

The curve above is `graph/curve` and the letter is `graph/labels/x`.

A group may carry a transform and a style. A style set on a group reaches its children unless a
child sets its own. A group that scales makes the lines inside it thicker, the way it makes
everything else bigger.

## Paths

A **path** is a list of **subpaths**, and a subpath is a start point and a list of **cubics**. A
cubic is a curve with two control points, which are the two handles that bend it.

Everything is a cubic here, a straight line included. That is what lets one shape be walked into
another point by point, with no case where a line has to turn into an arc.

```ts
import { arc, circle, line, polygon, polyline, rect, vec2 } from '@altpsyche/maths';

line(vec2(0, 0), vec2(3, 4));
polyline([vec2(0, 0), vec2(1, 2), vec2(3, 1)]);
polygon([vec2(0, 0), vec2(1, 0), vec2(1, 1)]);
rect(vec2(0, 0), 4, 2);
circle(vec2(0, 0), 1);
arc(vec2(0, 0), 1, 0, Math.PI / 2);
```

A circle is four cubic quarters. Four cubics cannot be a circle exactly, and this is as close as
they get: the drawn edge stays within a few parts in ten thousand of the true radius.

`pathFromData` reads an SVG `d` attribute as a path. Every command is read, elliptical arcs
included. A command it does not know stops the read rather than being skipped. Without it the only
shapes that exist are the ones the builders here make.

`lengthOf` says how long a path is. `pointAlong` reads the point a fraction along it, measured by
length rather than by the curve's own parameter. `trimPath` cuts a path to a fraction of its length.

## Graphs

A **scale** is the run of numbers an axis counts through, and where that run lands in figure units.
Two scales are a **coords**.

```ts
import { coordsOf, interval, pointOf, scaleOf } from '@altpsyche/maths';

const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

pointOf(coords, 2, 4);
```

`pointOf` reads a pair of graph numbers as a point in figure units. `toUnits` and `toGraph` do one
axis at a time, in each direction.

<img src="tangent.svg" width="720" alt="A parabola on a labelled grid, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

`numberPlane` draws the grid, `axes` draws both axes with their arrow heads, and `numberLine` draws
one axis on its own. A **tick** is one mark along an axis with the number it stands for.

```ts
import { axes, numberPlane, plot, shape } from '@altpsyche/maths';

numberPlane('grid', coords, { stroke: faint, minors: 4 });
axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 });
shape('curve', plot(coords, (x) => x * x), { stroke: drawn });
```

`ticksOn` chooses the ticks. The step between them is one, two or five times a power of ten, because
those are the numbers a reader adds up in their head. `labelFor` writes a tick's value with as many
decimals as its step needs and no more.

`plot` samples a function and joins the samples with cubics. Each cubic leaves its sample at the
slope the function has there. `plot` cuts the curve where it leaves the graph, so a pole breaks in
two rather than drawing a line up the picture.

`areaUnder` closes the region between a curve and a level line. `riemannBars` draws the bars that
region is the limit of. `tangentAt` lays the tangent along the curve, and `slopeOf` reads the slope
itself as a number.

## Moving a picture

A **timeline** holds **spans**. A span is one **animation** over a stretch of time. An animation
takes the marks and a fraction, and hands back marks.

```ts
import { Timeline, draw, fadeIn, moveBy, vec2 } from '@altpsyche/maths';

const timeline = Timeline.empty()
  .play(fadeIn('graph/grid'), 0.6)
  .play(draw('graph/curve'), 1.2)
  .together([fadeIn('graph/axes'), moveBy('graph/dot', vec2(1, 0))], 0.8);
```

`play` runs one animation after the last. `together` runs several over one stretch. `stagger` runs a
row of them so the parts arrive one after another.

<img src="tangent-strip.svg" width="820" alt="Four frames of the same figure in two rows, the point walking up the curve over the field of slope arrows, the shaded region growing behind it, and a brace measuring the rise in the last frame.">

Four times of one figure. A moving picture needs a GIF and this package has no encoder. What shows
the motion in a still is a strip, which is several times of one figure laid out side by side. Every
strip on this page is drawn by the same walk a recorder uses.

An animation before its span has started applies at nothing. One already finished applies in full.
That is what makes a figure's answer depend on the time asked for and nothing else.

The animations are `fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `morphEquation`, `countTo`,
`moveBy`, `rotate`, `scale`, `growFrom`, `moveAlong`, `indicate`, `flash` and `circumscribe`.

An **easing curve** shapes how a span's fraction runs. `linear`, `easeIn`, `easeOut` and
`smoothstep` are the four, and `curveFor` picks one from whether each end should be still.

`moveAlong` carries a mark along a path at one speed, measured by the path's length. Even steps in a
curve's own parameter are uneven steps along the curve, because a step covers more of the curve
where the curve is moving fast.

`rotate` turns the marks a name reaches. The point it turns about is the middle of the box round
those marks unless a figure names one. It is read off the marks as they arrive, not after the turn
has moved them.

<img src="rotate.svg" width="720" alt="Two panels side by side, each an L-shaped block turned part way round with a dot marking the point it turns about.">

A turn does not thicken a line. A stroke's width is multiplied by how much the transform stretches a
length, and a rotation stretches nothing.

<img src="rotate-strip.svg" width="820" alt="Four frames in two rows, each showing both panels, at nothing, a quarter, a half and three quarters of the way round.">

The quarters of the turn. The whole turn is left off, because it draws the picture that nothing
draws: this figure declares itself a loop, so its last frame is its first.

## Tracks

A **track** is a value walked between **keys**. A key is a time and a value. `sampleTrack` reads the
value at a time.

A figure's `scene` may be a function of the time and of the track values. That is how a picture
whose shape depends on a number is drawn: the scene works the shape out from the number.

```ts
import { sampleTrack } from '@altpsyche/maths';

const spin = [
  { time: 0, value: 0, smooth: true },
  { time: 2, value: 1, smooth: true },
];

sampleTrack(spin, 1);
```

A key marked `smooth` is flat there, which eases the walk either side of it. A key left plain runs
straight into the next one.

A track and a span are different clocks. A span's eased fraction and a track's value are unrelated
numbers, so a picture driven by both is free to disagree with itself. Drive one thing with one of
them.

## A view that follows

`viewAt(figure, seconds, width, height)` hands a painter its matrix at a time, in one call. A figure
whose extent moves cannot then be asked for its extent at one time and its marks at another.

`fractionOf` reads a place off the extent it is handed, as a fraction across and up. A label placed
that way stays where it is on the surface while the picture slides under it.

## Annotations

An annotation is composed from marks rather than being a mark of its own. Each one hands back a
group, so an animation naming it reaches every part.

```ts
import { arrow, brace, callout, countTo, dot, labelFor, vec2 } from '@altpsyche/maths';

arrow('pointer', vec2(0, 0), vec2(2, 1), { stroke: pen });
dot('here', vec2(2, 1), 0.08, ink);
brace('rise', vec2(3, 9), vec2(3, 0), '9.00', { depth: 0.3, padding: 0.28, stroke: pen, fill: ink, size: 0.3 });
countTo('rise/word', 0, 9, (value) => labelFor(value, 0.01));
```

An arrow is a shaft and a head. One path cannot be both stroked along its length and filled at its
tip, so an arrow is two marks under one name.

A brace is one open subpath of six pieces. Its tip is a corner rather than a smooth turn, which is
what says which point it is pointing at. The tip stands at the depth asked for whatever the span,
and only the curl narrows when the span is short.

`countTo` writes the value a count has reached into a text mark. How the value is written is yours,
so a count of a length and a count of a population can round differently.

A label is anchored and never measured. Nothing about a figure's layout may depend on how wide some
text turns out to be.

## Equations

A **glyph** is one drawn character. `equationFromTex` typesets an expression with MathJax, and
reads the SVG the typesetter wrote back as marks, one per glyph.

```ts
import { equationFromTex, equationNode, vec2 } from '@altpsyche/maths';

const rule = await equationFromTex('\\frac{dy}{dx} = 2x');

equationNode('rule', rule, { at: vec2(-4.27, 1.74), width: 1.2, height: 0.6, fill: ink });
```

`equationNode` places those marks in a figure, fitted inside a box. It fits the width as well as the
height, because an expression six times wider than it is tall would run off the sides.

A glyph is an outline rather than a letter. No font has to be installed anywhere, and the same
expression draws the same on a page and in a recording.

MathJax is the one runtime dependency, and the typesetting call is what loads it. Importing the door
reaches none of it. What that costs is that typesetting answers with a promise.

`morphEquation` walks one expression into another. The shared parts stay put and only the difference
moves. `matchGlyphs` says which glyph of one is which glyph of the other.

```ts
import { equationFromTex, equationNode, group, morphEquation, vec2 } from '@altpsyche/maths';

const box = { at: vec2(-4.86, 1.74), align: 'start', width: 1.2, height: 0.6, fill: ink } as const;

group('rule', [
  equationNode('at-rest', await equationFromTex('\\frac{dy}{dx} = 0'), box),
  equationNode('moving', await equationFromTex('\\frac{dy}{dx} = 2x'), box),
]);

morphEquation('rule/at-rest', 'rule/moving');
```

Hang both expressions from the same edge with `align`. Otherwise the part they share slides sideways
as the difference arrives.

Three things stop a typeset expression, and each says what it found. A TeX error carries the
typesetter's own message. A character with no outline arrives as text, which would draw with
whatever font a browser had. An undefined macro is not an error to MathJax at all: it draws the
macro's name in red, so a typo would otherwise ship inside the picture.

## Combining shapes

<img src="boolean.svg" width="720" alt="Two discs drawn three times side by side: everything either one covers, only what both cover, and the first with the second taken out of it.">

```ts
import { circle, differenceOf, intersectionOf, unionOf, vec2 } from '@altpsyche/maths';

const first = circle(vec2(0, 0), 0.9);
const second = circle(vec2(-0.6, 0), 0.36);

unionOf(first, second);
intersectionOf(first, second);
differenceOf(first, second);
```

`unionOf` is everything either path covers. `intersectionOf` is only what both cover. `differenceOf`
is the first with the second taken out of it.

Each input is closed loops that do not cross themselves. A loop left open is closed by a straight
run back to its start before anything else happens.

A result may have a hole even though an input may not. A disc with a smaller disc taken out is a
ring: an outer loop and an inner loop wound the opposite way.

Four calls do the work and each is public. `curveCrossings` says where two cubics cross. `cutPath`
puts a cut at every crossing, so every piece afterwards is wholly inside the other path or wholly
outside it. `containsPoint` decides which, by counting how many times the other path winds round the
piece's middle. `areaOf` says how much a path encloses, in closed form.

When the pieces kept will not join into a loop, the operation stops. It says how far apart the two
ends of the run it had are. A shape drawn with a gap in it and nothing said about it is the one
failure a caller cannot see.

<img src="boolean-strip.svg" width="820" alt="Four moments in two rows, each showing the three panels, as the small disc walks from clear of the large one, through touching it at one point, through overlapping it, to sitting wholly inside it.">

A small disc walks across a larger one: clear of it, touching it at one point, crossing it at two,
and wholly inside it. Those are the four cases this kind of code gets silently wrong.

## Fields

A **field** is a function from a place to a vector. Nothing here stores one. What the package holds
is the sampling, the drawing and the walking.

```ts
import { streamlineOf, vec2, vectorField } from '@altpsyche/maths';

vectorField('slopes', coords, (at) => vec2(1, 2 * at.x), {
  lengthOf: (magnitude) => 0.3 / (1 + magnitude),
  colourFor: () => '#0369a1',
  width: 0.012,
  resolution: 12,
});

streamlineOf((at) => vec2(1, 2 * at.x), vec2(0, 0), { step: 0.02, steps: 400 });
```

How long an arrow is and what colour it is are both yours, taken from the magnitude at that arrow's
own sample. A field drawn at its true lengths is unreadable the moment two samples differ by a
factor of ten.

An arrow's length is in figure units and only its direction comes from the field. A length in graph
units would draw a level arrow several times longer than an upright one beside it, wherever the two
axes count at different rates.

`streamlineOf` walks Runge-Kutta 4 through a field and hands back the points. Its step is a distance
rather than a time, which keeps the points evenly spaced. The step is fixed and never adaptive. An
adaptive step hands back a different number of points as the field changes, and one path is walked
into another by pairing their points.

## Space

<img src="surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it and the curve where they meet drawn along the surface.">

A figure's **camera** is a value you hold. `camera3` answers where a point in space lands in the
figure's own units, how far off it is, and whether it is in front of the eye at all.

```ts
import { camera3, dot3, interval, perspective, polyline3, surface3, vec3 } from '@altpsyche/maths';

const camera = camera3({ eye: vec3(4, 4, 4), target: vec3(0, 0, 0), projection: perspective() });

polyline3('edge', [vec3(0, 0, 0), vec3(1, 1, 1)], camera, { stroke: pen });
dot3('corner', vec3(1, 1, 1), 0.05, ink, camera);
surface3('saddle', (u, v) => vec3(u, v, u * u - v * v), camera, {
  over: { u: interval(-1, 1), v: interval(-1, 1) },
  resolution: 12,
  shade: (amount) => ({ colour: `rgb(${Math.round(150 + 90 * amount)}, 0, 0)` }),
});
```

Every builder in space hands back the same flat nodes everything else draws. So `fadeIn` and `draw`
reach a mark in space with no change to either of them. Nothing in the marks, the tree or the
painters knows that space exists.

`scene3` puts pieces in the order they are painted, near over far. That is the painter's algorithm.
What it cannot do is worth knowing first: two pieces that pass through each other have no one order
at all. The answer is smaller pieces, which is why `surfaceCells` cuts a surface into a grid.

A **cell** is one four-cornered piece of that grid, small enough to be flat.

`sectionOf` finds the curve where a plane cuts a surface, by marching squares over the grid the
surface is drawn from. Every point it finds lies on the plane exactly. What it does not lie on
exactly is the surface: it sits on the chord between two samples, and halving the cell size quarters
that error.

`axes3` draws three axes with their numbers. `arrow3` and `fieldArrows3` draw a field in space. An
arrow there is measured in the world's own units, since a far arrow drawing shorter than a near one
of the same magnitude is what says which is far.

Drive a camera with a track and never with an animation. They are two clocks, for the reason tracks
give above.

<img src="surface-strip.svg" width="820" alt="Four frames in two rows, showing the same saddle, pane, field arrows and runs of descent from four points around one orbit of the eye.">

The quarters of one orbit. The eye comes back to where it started. A test holds that by comparing
the marks at the end of the entrance against the marks one orbit later, mark for mark by name.

## Frames out

`framesOf` walks a figure at a fixed step and hands back one moment of the walk at a time. Such a
moment carries its index, its time, its marks, and the view those marks are painted through, read
together. It is not the frame a picture is drawn into, which is the rectangle above.

```ts
import { frameTimesOf, framesOf, paintCanvas } from '@altpsyche/maths';

frameTimesOf(figure, { fps: 30 });

for (const frame of framesOf(figure, { fps: 30, width: 1920, height: 1080 })) {
  paintCanvas(context, frame.marks, frame.view);
}
```

A consumer asking for the marks and the view in two calls has two chances to pass different times. A
figure whose view moves would then paint its marks through the matrix of some other moment.

Frames come back one at a time rather than as a list. Ten seconds at sixty frames a second is six
hundred frames of every mark a figure draws, and a recorder encodes a frame and throws it away.

The step is a rate or a count, and those are different questions. A recorder knows how fast the
frames play and needs a step of exactly one over that. A strip knows how many pictures fit across a
page and wants them spread over the whole figure.

A walk stops strictly before the duration. The frame at the duration of a figure that loops is its
own first frame, and a recording would show it twice. `isLoop` is the call that says whether a
figure loops, comparing its marks at the duration against its marks at zero.

Nothing here writes a file. What a consumer does with a painted frame is the consumer's own.

## What this refuses

**A mark may only ask for what both painters can do.** There are no filters, no blend modes, no
clipping and no gradients. A figure reaching for something only SVG has would look right on a page
and lose it without a word in a recording.

**A figure never reads the page.** Colours arrive as text you hand in. `colourOf` reads hex and
`rgb()` back when something needs to walk between two of them, and refuses every other form rather
than guessing.

**A stroke has one width along its whole length.** A tapering line is what a renderer of its own
would give, and neither painter here offers one.

**Nothing below the line imports anything above it.** Values and timing are below: vectors, a
transform, the easing curves, a value walked between keys. Figures and painters are above. A test
says so.
