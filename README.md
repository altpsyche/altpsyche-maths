# @altpsyche/maths

The mathematics the figures on [altpsyche.dev](https://altpsyche.dev) are drawn from.

A **figure** is a picture that moves and explains itself. Asking one for a time gives back a
flat list of **marks**, and a **painter** turns marks into something a reader can see.

```ts
import { Timeline, circle, draw, group, marksAt, shape, svgMarkup, vec2, viewMatrix } from '@altpsyche/maths';

const figure = {
  extent: { width: 16, height: 9 },
  still: 1,
  scene: group('fig', [shape('ring', circle(vec2(0, 0), 3), { stroke: { colour: '#fff', width: 0.05 } })]),
  timeline: Timeline.empty().play(draw('fig/ring'), 1),
};

svgMarkup(marksAt(figure, 0.5), viewMatrix(figure.extent, 'contain', 640, 360), 640, 360);
```

## Axes and a plotted function

<img src="docs/tangent.svg" width="720" alt="A parabola on a labelled grid over a field of small blue arrows, the region under it shaded to a point on the curve, the tangent at that point drawn, and the slope written as a number under the typeset rule it comes from.">

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

<img src="docs/tangent-strip.svg" width="960" alt="Four frames of the same figure side by side, the point walking up the curve over the field of slope arrows, the shaded region growing behind it, the typeset rule in the corner changing from a slope of nothing to one that depends on x, and a brace measuring the rise in the last frame.">

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

<img src="docs/boolean-strip.svg" width="820" alt="Four moments in two rows, each showing the three panels, as the small disc walks from clear of the large one, through touching it at one point, through overlapping it, to sitting wholly inside it.">

Four times of one figure, in two rows. A small disc walks across a larger one: clear of it, touching
it at one point, crossing it at two, and wholly inside it. Those are the four cases this kind of code
gets silently wrong, which is why the demo walks through all of them rather than drawing one.

Two shapes that share an edge are combined by which way each of them runs over it. Two paths walking
a shared stretch the same way have their solid on the same side of it, so the stretch is on the edge
of a union and of an overlap and is kept once. Walking it opposite ways puts their solids on opposite
sides, so the stretch is inside a union and outside an overlap, and a difference keeps the first
path's copy of it. Two rectangles sharing an edge unite into one rectangle, and a shape combined with
itself gives itself back.

When the pieces kept will not join into a loop, the operation stops and says how far apart the two
ends of the run it had are. That happens when an input crosses itself, which these do not take. A
shape drawn with a gap in it and nothing said about it is the one failure a caller cannot see.

## A turn about a point

<img src="docs/rotate.svg" width="720" alt="Two panels side by side, each an L-shaped block turned part way round with a dot marking the point it turns about. In the left panel the dot sits at the middle of the block's own box. In the right it sits off to one side, so the block swings round it. A word rides with the block in both panels and stays upright.">

`rotate(target, angle)` turns the marks a name reaches, over a span of the timeline. The point it
turns about is the middle of the box round those marks unless a figure names one, and it is read off
them as they arrive rather than after the turn has moved them. The box round a turned shape is not the
turned box, so reading it back afterwards would let the pivot drift and the turn would stop being a
turn.

The left panel takes that default and spins where it stands. The right panel is given a point off to
one side, so the same shape swings round it instead. The furthest corner of the left shape stays 1.00
figure units from its pivot at every time and the right one's stays 2.34, which is what makes the two
read as different motions rather than as the same one twice.

A word rides with the shape in both panels and stays upright the whole way round. A mark carries no
rotation of its own, so turning the words would be work in both painters for a label that is easier to
read left as it is, which is the same reason a number line takes a direction rather than being turned
on its side.

A turn does not thicken a line. A stroke's width is multiplied by how much the transform stretches a
length, and a rotation stretches nothing, where `scale` stretches by the factor it grew by.

<img src="docs/rotate-strip.svg" width="820" alt="Four frames in two rows, each showing both panels, at nothing, a quarter, a half and three quarters of the way round.">

The quarters of the turn. The whole turn is left off the strip because it draws the picture that
nothing draws: this is the first figure here to declare itself a loop, and `isLoop(figure)` is the gate
behind that flag, comparing the marks at the duration against the marks at zero.

## A surface in space

<img src="docs/surface.svg" width="720" alt="A saddle-shaped surface drawn as a grid of shaded cells, with a flat pane cutting through it at one height and the two branches of the curve where they meet drawn in orange along the surface. Blue arrows across the pane show the way the saddle falls and three green runs of steepest descent are drawn on it. Three axes with their numbers stand behind it and the equation of the surface is typeset in the top left.">

A figure's camera is a value the caller holds. `camera3({ eye, target, up, projection })` answers
where a point in space lands in the figure's own units, how far off it is along the way the camera
looks, and whether it is in front of the eye at all. `polyline3`, `dot3`, `text3` and `surface3` take
points in space and hand back the same flat nodes everything else here draws, so `fadeIn` and `draw`
reach a mark in space with no change to either of them. Nothing in the marks, the tree, the flattening
or the two painters knows that space exists.

`scene3(name, items, camera)` puts the pieces in the order they are painted, near over far. That is
the painter's algorithm, and what it cannot do is worth knowing before it is used: two pieces that
pass through each other have no one order at all. The answer for those is smaller pieces, which is why
`surfaceCells` cuts a surface into a grid and why the saddle and the pane above are sorted together
rather than one after the other.

`sectionOf` finds the curve where a plane cuts a surface, by marching squares over the grid the
surface is already drawn from. Every point it finds lies on the plane exactly, because signed distance
to a plane changes evenly along a straight line. What it does not lie on exactly is the surface: it
sits on the chord between two samples of it, 4.870e-4 of a unit off at the resolution the demo uses,
and halving the cell size quarters that.

The camera is driven by a track and never by an animation, which is the call the flat demo's walk
already made: a span's eased fraction and a track's value are unrelated numbers, and a camera on one
with a surface on the other would be two clocks free to disagree.

<img src="docs/surface-strip.svg" width="820" alt="Four frames in two rows, showing the same saddle, pane, field arrows and runs of descent from four points around one orbit of the eye.">

The quarters of one orbit. The eye comes back to where it started, which the gate holds by comparing
the marks at the end of the entrance against the marks one orbit later, mark for mark by name.

## Fields and streamlines

`vectorField(name, coords, of, options)` samples a grid over a graph and draws an arrow at each
sample. A field is a function from a place to a vector, so nothing here stores one. How long an arrow
is and what colour it is are both the author's, taken from the magnitude of the vector at that
sample: a field drawn at its true lengths is unreadable the moment two samples differ by a factor of
ten. The count is fixed by the resolution and never by the field, so a gate can hold it. An arrow's
length is in figure units, like the width of its shaft, and only its direction comes from the
mapping of its own vector. The flat demo's own axes count at 1.84 and 0.415 figure units to the graph
unit, and a length in graph units would draw a level arrow there 4.43 times longer than an upright one
beside it.

The arrows above are the slope field of the curve they sit under, read from the curve itself with
`slopeOf`. `streamlineOf(of, from, options)` walks Runge-Kutta 4 through a field and hands back the
points, and the run through the origin of that field never leaves the plotted parabola by more than
4.689e-10 of a figure unit. Two answers to one question.

The step is a distance rather than a time: the field is read as a direction and its magnitude decides
nothing about how far a step moves, which keeps the points evenly spaced in a field whose strength
changes across the picture. It is fixed and never adaptive, because an adaptive step hands back a
different number of points as the field changes, and one path is walked into another by pairing their
points. Three rules stop a run and each has a measurement: a seed outside the region comes back as one
point, a field that is nothing everywhere stops at one point rather than at its cap, and a run leaving
its region stops at the last point inside it. In the field that turns a point about the origin,
halving the step divides the error along the curve by 15.1 and then 15.6, which is the fourth order
the integrator is named for.

`arrow3` and `fieldArrows3` do the same in space. An arrow there is measured in the world's own units
rather than the figure's, since a far arrow drawing shorter than a near one of the same magnitude is
what says which is far, and its head is a flat triangle at the projected tip so it stays readable
however steeply the arrow points away. The solid demo runs three streamlines of steepest descent down
its saddle: each is walked in the plane the surface is drawn over and lifted onto it, so every point
lies on the surface exactly and the height falls at every step.

## A view that follows

`Extent` carries a `centre`, which is where the middle of the frame sits in figure units, and an
extent may be a function of the shape of the surface and of the time. `viewAt(figure, seconds, width,
height)` hands a painter its matrix at a time in one call, so a figure whose extent moves cannot be
asked for its extent at one time and its marks at another.

The flat demo's view follows its dot across. The dot stays within 1.2 figure units of the middle of
the frame, where before it crossed 2.76. `fractionOf` reads the centre off the extent it is handed, so
the reading and the typeset rule stay where they are on the surface while the grid slides under them:
they drift 1.14e-15 figure units over the whole walk.

## The animations

`fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `morphEquation`, `countTo`, `moveBy`, `rotate`,
`scale`, `growFrom`, `moveAlong`, `indicate`, `flash` and `circumscribe`. A `Timeline` plays them in order, plays several `together`, or
`stagger`s a row so its parts arrive one after another.

`boundsOf` is the box a turn and a growth are worked about, found from where each piece of the curve
turns back on itself rather than from the points the curve is written from.

`moveAlong` carries a mark along a path at one speed, measured by the path's length. Even steps in a
curve's own parameter are uneven steps along the curve: a step covers more of it where the curve is
moving fast, which on a quarter circle is a 6.9% difference between the longest step and the shortest
and on the demo's own walk is 82%.

Every picture here is written by `svgMarkup`, which needs no browser, so `npm run demos` regenerates
all eight and a test compares the bytes against the committed files.

## What it is built on

**A figure at a time is data.** `marksAt(figure, seconds)` is the whole public surface, and it is a
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

## Frames out

`framesOf(figure, options)` walks a figure at a fixed step and hands back a frame at a time. A frame
is its index, its time, its marks and the view those marks are painted through, read together at one
moment. A consumer that asks for the marks and the view in two calls has two chances to pass different
times, and a figure whose view moves then paints its marks through the matrix of some other moment:
the flat demo's view is carried 312 across its own walk, in the units a 1080 by 600 surface counts in.

Frames come back one at a time rather than as a list. Ten seconds at sixty frames a second is six
hundred frames of every mark a figure draws, and a recorder encodes a frame and throws it away.
`frameTimesOf` answers the times up front, since a recorder showing a reader how far along it is needs
the total before it has drawn anything.

The step is given as a rate or as a count, and the two are different questions. A recorder knows how
fast the frames play and needs a step of exactly one over that, or the encoded video drifts from the
figure's own clock. A strip knows how many pictures fit across a page and wants them spread over the
whole figure. A walk stops strictly before the duration either way: the frame at the duration of a
figure that loops is its own first frame, and a recording would show it twice. The rotation strip
above is a walk of four frames over a six second turn, and it draws the same bytes as the four times
that were written out by hand before it.

Nothing here writes a file. Every frame of both demos is painted through `paintCanvas` and written by
`svgMarkup` in the suite, which is the whole claim and needs no browser, and what a consumer does with
a painted frame is the consumer's own.

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
