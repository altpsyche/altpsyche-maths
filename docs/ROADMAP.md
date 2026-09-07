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
| 0.10.0 | Three dimensions, and a camera that moves |
| 0.11.0 | Vector fields and streamlines |
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

Every version after adds to that same figure: the view follows the point at 0.10.0, and the curve's
gradient becomes a field at 0.11.0.

**The solid demo starts at 0.10.0**, because nothing before it can draw one, and it is a surface with
a plane cutting through it and the curve of the intersection drawn on both. What it then takes from
the versions before it is everything reusable in three dimensions: the axes become three, the
animations apply to marks in space, the equation of the surface is typeset beside it, and the camera
orbits.

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

**0.10.0 is being worked, and steps 1 to 8 of its ten are landed.** `mat4` is below the line, and
`camera3`, `polyline3`, `dot3`, `text3`, `space`, `surface3`, `axes3`, `sectionOf` and `viewAt` are
above it. A camera is a value the
caller holds, a builder that works in space hands back the flat nodes the rest of the package already
draws, cut where they cross the near plane, `space` orders a list of pieces back to front, and a
surface is a grid of cells the author's own function shades. An extent carries a centre and may be a
function of the clock, and the flat demo's view follows its dot across. The suite went from 479 tests to
531.

**Step 9, the solid demo, is next.** A step is ticked by writing the number its commit measured into
that step rather than by a bare tick, so the first step carrying no measurement is where a session
resumes.

**What the 0.9.x audit found sound**, so that a later session does not go looking again. Sixty random
pairs of shapes with no coincident edges hold both `area(A) + area(B) = area(A or B) + area(A and B)`
and `difference = A less the overlap` to 1.776e-15. Two circles crossed at every scale from 1e-4 to
1e4 answer 4.11e-4 of the closed form, the same share at every one, so nothing there turns on the
tolerance being an absolute distance. Two 400-piece paths unite in 48ms, so the crossing search needs
no box test in front of it and the quadratic over piece pairs is not worth removing.

## The items

Each is a version above. What follows is what each one covers.

### Three dimensions and a camera that moves, 0.10.0

A figure's own camera with a projection, a depth sort, marks placed in space, and surfaces. `vec3`
and `Vec3` already exist and nothing above them uses either. `Extent` is fixed for the life of a
figure today, so nothing can zoom, pan or orbit, and an extent that is a function of time or a keyed
track is the same piece of work as the camera rather than a separate one.

**This is larger than everything else on this page put together**, and it is the one item where the
boundary DESIGN.md draws against the engine has to be restated rather than assumed. Ten steps, which
is several sessions. A later session takes the first unticked one.

#### The boundary, restated

**A camera is a value a caller holds, and a builder that works in space hands back the flat nodes the
rest of the package already draws.** Nothing in `mark.ts`, `node.ts`, `flatten` or either painter
changes anywhere in this item.

The reason is the seam. `at(figure, seconds)` gives back marks whose coordinates are in the figure's
own units, so a point in space has to become a point in those units before it is a mark at all. Put
the camera inside `flatten` instead and two things go wrong. Every animation would have to say whether
it acts on the shape in space or on the picture of it, which is a question `fadeIn` should never be
asked. And the figure would hold a camera that a caller could not read, where a `Scale` today is a
value the caller keeps and the axes never own.

**So the camera is driven by a track and never by an animation.** That is the same call the walk in the
flat demo already made, for the same reason: a span's eased fraction and a track's value are unrelated
numbers, and a camera on one with a surface on the other is two clocks free to disagree.

**Depth is decided where the points in space still exist**, which is inside the builder, so a group of
projected marks comes out already in the order it is painted. A flat list in order is what the seam
says a picture is.

#### The steps

**1. Done. `mat4`, below the line.** Sixteen numbers, column-major, matching the engine's layout the way
`mat3` already does, so the two can be merged later without either side converting. Identity, multiply,
translation, scaling, rotation about each axis, `lookAt`, `perspective`, `orthographic`, a point
transform that divides by w and a direction transform that does not. No inverse until something needs
one, and the reason there is none is written where a reader looks for it.

*Measures:* `multiply` is associative over 100 random triples to 1e-12. A point through a translation
and then its opposite comes back to itself to 1e-12. For affine matrices, a point through
`multiply(a, b)` equals the same point through `b` and then through `a`, to 1e-12, and the doc comment
says why the perspective matrix is excluded from that claim. `lookAt` puts the target on the negative z
axis of view space at the distance between the eye and the target, to 1e-12.

*Measured:* `multiply` is associative over 100 random triples to 8.882e-16. A point through a
translation and then its opposite comes back to itself exactly, over 100 random points. A point
through `multiply(multiply(grow, turn), move)` matches the same point through the three in turn to
1.776e-15, over 100 random points. `lookAt` puts a target 7.348 units off on the negative z axis of
view space to 3.331e-16. The suite went from 479 tests to 488 and the door from 19 values below the line
to 20.

**2. Done. The camera.** `camera3({ eye, target, up, projection })`, with `orthographic({ scale })` and
`perspective({ fov, height })`. It gives `project(point)`, answering where that point lands in the
figure's own units, how far it is from the eye along the way the camera looks, and whether it is in
front of the eye at all. `height` is in figure units, so an author hands the camera the same height as
the extent and the picture fills the frame.

*Measures:* the eight corners of a unit cube at a named pose land at coordinates worked out by hand, to
1e-12. Under an orthographic camera looking down the negative z axis with a scale of one, a point's
figure coordinates are its world x and y, to 1e-12. Under a perspective camera, a point twice as far
away lands half as far from the middle of the frame, to 1e-12. A point behind the eye is reported as
behind rather than folded to the front, which is the defect that puts a line on the wrong side of the
frame as it passes the camera.

*Measured:* the eight corners of a unit cube land at their own x and y from an eye five units down the
z axis, and at minus their z and their own y from an eye five units down the x axis, both exactly and
both at the right depth. A point at (1, 1, 0) seen through a ninety-degree eye five units back in a
frame ten units tall lands at (1, 1) to 2.2e-16, and the same point five units further off lands at
(0.5, 0.5), which is half, exactly. `lookAt`'s target lands in the middle of the frame at a depth of
7.348 to 3.331e-16. A point one unit behind the eye is reported behind, and the place it would
otherwise have been given is 14.14 figure units from the place its mirror in front is given, on a
frame ten units tall. The suite went from 488 tests to 496 and the door from 93 values above the line
to 96.

**3. Done. Marks in space.** `polyline3`, `dot3` and `text3`, each taking points in space and a camera and
handing back a flat node. A segment with one end behind the eye is cut where it crosses the near plane,
and a segment wholly behind is left out. A builder with nothing in front of the camera hands back a
group with no children, which flattens to no marks rather than to a mark of nothing.

*Measures:* a square in space at a named pose draws a path whose four corners are the camera's
projection of its four points, to 1e-12. A polyline running from in front of the camera to behind it is
cut, its last point lies on the near plane to 1e-12, and without the cut that point lands a measured
distance on the wrong side of the frame. A polyline wholly behind the camera draws no marks.

*Measured:* a square two units across, seen through a ninety-degree eye five units back, draws a closed
path whose four corners are the camera's own answer for its four points, exactly. A line running from
in front of that eye to nine units behind it is cut at a depth of 1, which is the near plane's own, to
0, and the drawn end is the camera's answer for the point at that depth, to 0. The point the line
actually ends at lands 8.84 figure units from the cut, on the far side of the middle of a frame ten
units tall, which is what the cut is for. A line wholly behind the eye draws no marks, and a line that
passes the eye and comes back draws two. The suite went from 496 tests to 505 and the door from 96
values above the line to 99.


**4. Done. The depth sort.** `space(name, items, camera)`, a group whose children are ordered back to front
so the near piece is painted over the far one. This is the painter's algorithm, named in the comment
because the name is what a reader can look up, along with what it cannot do: two pieces that pass
through each other have no one order, and the answer for those is smaller pieces rather than a cleverer
sort.

*Measures:* two quads at named depths come out far first at one camera and near first at a camera on the
other side of them. A quad and a polyline order against each other by the same rule. Sorting 4,000
pieces costs a measured number of milliseconds, quoted so a later session knows whether it grew.

*Measured:* two quads four units apart come out far first from an eye five units in front of them and
near first from an eye eight units behind them. A line two units in front of a face orders after it and
a line two units behind it orders before it. Two pieces at the same depth keep the order the author
gave them. Sorting 4,000 quads costs 0.32 ms, the median of seven runs after three warm ones. The suite
went from 505 tests to 509 and the door from 99 values above the line to 100.


**5. Done. Surfaces.** `surface3(name, of, camera, options)`, where `of(u, v)` gives a point in space, `u` and
`v` run over intervals, and a resolution says how many cells each way. Each cell is a quad, filled with
a colour the author's own `shade(amount)` supplies from the cell's facing against a light direction.
Handing in `shade` rather than mixing two colours here is what keeps this off the colour parser that
does not exist, which is the gap listed further down this page. Dropping a cell that faces away is an
option and it is off by default, because a count that changes as the camera turns is a count no gate can
hold.

*Measures:* a sphere at 24 by 24 draws 576 quads with the option off, and a measured count with it on.
The widest span of the drawn outline matches the sphere's diameter in figure units to a measured share
of it. The shades run between the darkest and lightest the author's function gives.

*Measured:* a sphere of radius one at 24 by 24 draws 576 quads with the option off and 188 with it on,
which is fewer than half because an eye five radii off sees less than a hemisphere. The widest span of
the outline is the diameter exactly at 24 by 24, where the grid lands on the widest points of the ball,
and 5.908e-3 of the diameter short of it at 25 by 25, where it does not. The shades run from 0.00532 to
0.99468, which is the full range less the half cell the grid leaves at each end. The suite went from
509 tests to 514 and the door from 100 values above the line to 101.


**6. Done. Three axes.** `axes3`, three number lines in space with their ticks and their labels, reading
`ticksOn` and `labelFor` the flat axes already read. A label is flat text at a projected point.

*Measures:* the tick count on each of the three axes is the count `ticksOn` gives. Every tick's drawn
position is the camera's projection of its point in space, to 1e-12. At a pose where one axis points
almost straight at the camera the counts are unchanged, which is the case that tempts a builder to drop
what it cannot draw well.

*Measured:* over a range of minus two to two asked for about five ticks, `ticksOn` gives 5 and each of
the three axes draws 5. Every tick's two ends are the camera's own answer for its two points in space,
exactly, over all fifteen ticks. From an eye a thousandth off the z axis, where the z line points almost
straight at it, the counts are still 5, 5 and 5 and the marks still 31. The number at the crossing is
written once rather than three times. The suite went from 514 tests to 519 and the door from 101 values
above the line to 102.


**7. Done. The curve where a plane cuts a surface.** Marching squares over the grid the surface is already
sampled on, with the plane's signed distance as the value at each grid point, and the segments joined
into runs. The curve is drawn as a polyline in space, so it sits on the surface and on the plane both.

*Measures:* a sphere of radius 1 cut by the plane at z = 0.5 gives a curve whose points lie on the true
circle of radius 0.866 to a measured share of that radius at a stated resolution, and that share falls
by about four when the resolution doubles, which is what a method built on straight cuts through square
cells gives. The curve closes: its two ends meet within the tolerance.

*Measured:* a sphere of radius 1 cut by the plane at z = 0.5 gives one run of 45 points at 24 by 24,
whose furthest point is 8.005e-3 of the radius off the true circle of 0.866. At 48 by 48 that share is
2.294e-3 and at 96 by 96 it is 6.401e-4, so doubling the resolution divides the error by 3.49 and then
by 3.58. Every point of the curve lies on the plane exactly rather than to a tolerance, because the
signed distance changes evenly along the cell edge the point is found on. The curve closes: its two
ends are the same point. A plane cutting a surface that runs off the grid gives two open runs instead.
The suite went from 519 tests to 525 and the door from 102 values above the line to 103.


**8. Done. The view moves, and the flat demo gains it.** `Extent` gains a `centre`, which is where the middle
of the frame sits in figure units and which defaults to the origin. `ExtentChoice` gains the clock, so an
extent may be a function of the shape of the surface and of the time. `viewAt(figure, seconds, width,
height)` gives a painter its matrix at a time in one call, sampling the figure's tracks, resolving the
extent and centring it, which is the two-call sequence every consumer writes today. `fractionOf` reads
the centre off the extent it is already handed, or every mark the flat demo places against the frame
slides away with the world.

*Measures:* the flat demo's dot stays within a measured number of figure units of the middle of the
frame through the whole walk, where today it crosses a measured distance. The typeset rule and the
reading, both placed by `fractionOf`, sit at the same place on the surface at every time, to 1e-12. An
extent with no centre gives the matrix it gives today, to 1e-12, so nothing already drawn moves.

*Measured:* the flat demo's dot stays within 1.2 figure units across of the middle of the frame and
2.449 units of it in all, where today it crosses 2.76 across and 3.489 in all. The typeset rule and the
reading drift 1.137e-13 pixels on a surface 1080 across, which is 1.14e-15 figure units. An extent with
no centre gives the matrix it gave before, to 1e-12, entry by entry. The suite went from 525 tests to
531 and the door from 103 values above the line to 104.

*The call the step needed:* the view follows across and not up and down. The reading and the rule are
placed against the frame and the graph is not, so a view that dropped to follow the dot at the
stationary point would carry that band down over the top of the grid. **What would change this** is a
demo whose writing sits beside the graph rather than above it. The still moved from 0.6 of the walk to
0.85, since at 0.6 the dot is still inside the reach and the picture shows nothing of the following.


**9. The solid demo.** `demos/surface.ts`: a surface with a plane cutting through it, the curve of the
intersection drawn on both, three axes, the equation of the surface typeset beside it, and a camera that
orbits on a track. The animations reach it with no change to any of them, which the demo shows by
drawing the curve on with `draw` and bringing the plane in with `fadeIn`. Committed as a still and a
strip like the three demos before it.

*Measures:* the mark count is the same at every named time. At four named times every point of the
intersection curve lies on the surface and on the plane, each to a measured tolerance. The orbit returns
the camera to where it started, so `loops` holds on the figure.

**10. The cut.** The version goes to 0.10.0, the README gains the paragraph and the solid demo's two
pictures, the sheet list goes from six to eight, and this entry is deleted.

#### Done-criteria

- `npm test`, `npm run type-check` and `npm run build` all pass.
- `npm run demos` regenerates eight sheets and the committed bytes match all eight.
- The solid demo draws a surface, a plane, the intersection curve, three axes, a typeset equation and an
  orbiting camera, and a test names each one by its mark id.
- The flat demo's view follows the dot, by the measurement in step 8.
- `mat4`, `camera3`, `polyline3`, `dot3`, `text3`, `space`, `surface3`, `axes3` and `viewAt` are all
  exported from `index.ts`, and a test names each.
- `values/mat4.ts` imports nothing above the line, which is the rule DESIGN.md sets for that half.
- `mark.ts`, `node.ts`, `flatten` and both painters are untouched across the whole item, which is what
  the restated boundary above claims.

### Vector fields and streamlines, 0.11.0

A field sampled over a region, and a streamline integrated through one.

### Frames out, 0.12.0

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
