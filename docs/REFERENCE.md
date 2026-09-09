# Reference

This page carries one entry for every name `index.ts` exports, stating what the name is and what
it takes. A test in the suite reads the door and this page and holds the two equal, so a name added
or renamed without an entry fails the build.

[docs/GUIDE.md](GUIDE.md) teaches the package in order. [DESIGN.md](../DESIGN.md) states why the
design is what it is.

## Terms

**Figure units** are the units a picture is measured in. A figure declares its extent in them, and
no quantity in a figure is expressed in pixels.

**Graph units** are the numbers an axis counts through. A scale maps an interval of graph units onto
an interval of figure units.

A **mark** is one drawn item: an outline with a fill, a stroke, or both, or a piece of text. A
**node** is one element of the tree a figure is written as, and flattening the tree yields the
marks.

A **path** is a sequence of subpaths. A subpath is a start point followed by **cubic Bézier
segments**, closed or open. A segment carries two control points and an endpoint, and not its start.

**Below the line** are values and timing, which change almost never. **Above the line** are figures
and painters. Nothing below the line imports anything above it.

## Numbers

These take and return plain numbers, so a vector, a colour channel and a uniform are interpolated
by the same four functions.

- `clamp(value, low, high)` — the value held inside the two bounds, whichever way round they are
  given.
- `lerp(from, to, along)` — the number `along` of the way from one to the other. An `along` outside
  0 to 1 reaches past that end rather than stopping there.
- `inverseLerp(from, to, value)` — how far along the span the value sits, which is `lerp` read
  backwards. A span of no width reports its start rather than dividing by zero.
- `remap(value, fromLow, fromHigh, toLow, toHigh)` — the same position in a second span as it held
  in the first.

## Colours

A colour in a figure is a string, which is what both painters accept. These three parse one back so
that two can be interpolated.

- `colourOf(colour)` — a colour read out of its text as `Rgba`, or nothing where the form is one
  this does not read. Hex takes three, four, six or eight digits. `rgb()` and `rgba()` take channels
  separated by commas or spaces, as numbers or percentages, and either name takes an alpha.
- `colourText(rgba)` — a colour written back out, as `rgb()` where it is opaque and `rgba()` where
  it is not. The channels are rounded, so the same colour reached two ways is the same string.
- `lerpColour(from, to, along)` — a colour `along` of the way from one to another, or nothing where
  either end is a form `colourOf` does not read. The walk is straight through each channel in sRGB,
  which is what CSS mixes in when nothing names a space.
- `Rgba` — a colour read out of its text.
  - `r`, `g`, `b` — each channel, nothing to 255.
  - `a` — the alpha, 0 to 1.

## Easing curves

Each curve takes how far through a span the clock is, from 0 to 1, so the caller fixes the values at
both ends and the curve fixes only the pace between them. Four of the six are monotone, which means
the value never turns back. `overshoot` passes 1 before settling on it and `thereAndBack` returns to
0, so those two are named rather than chosen from a pair of flat flags.

- `Curve` — a function from how far through a span the clock is to how far through the change the
  value is.
- `CurveName` — the name of any curve this package holds, which is the closed set a figure as data
  may name.
- `linear` — no easing: the value moves at one rate the whole way.
- `easeIn` — quadratic, flat at the start, so the value leaves from rest and arrives at speed.
- `easeOut` — quadratic, flat at the end, so the value leaves at speed and settles rather than
  stopping dead.
- `smoothstep` — the cubic that is flat at both ends, Ken Perlin.
- `overshoot` — the back ease out, Robert Penner: the value passes its destination and comes back to
  it, peaking at 1.100004 of the change 0.580103 of the way through.
- `thereAndBack` — a smoothstep over each half, so the value reaches its destination halfway through
  and is 0 at 1 rather than 1.
- `curveFor(fromFlat, toFlat)` — the curve for a span whose ends are flat or not. This is where the
  four monotone curves are chosen between, so a track and a timeline pace a change the same way.
- `curveNamed(name)` — the curve a `CurveName` stands for.
- `nameOfCurve(curve)` — the name of a curve, or `undefined` for one a caller wrote itself, which is
  what a writer checks before it claims a figure is expressible as data.

## Vectors

- `Vec2` — a point or a direction in the plane, `x` and `y`.
- `vec2(x, y)` — a `Vec2`, with the family of operations on the same name. The magnitude is not
  called `length`, because a function's own `length` is how many arguments it takes and cannot be
  written to.
  - `vec2.ZERO` — the vector at the origin.
  - `vec2.add(a, b)`, `vec2.sub(a, b)` — the two added, and the second taken from the first.
  - `vec2.scale(v, s)` — every component multiplied by a number.
  - `vec2.dot(a, b)` — the dot product.
  - `vec2.cross(a, b)` — the z of the three-dimensional cross product, which is the signed area of
    the parallelogram and says which side of `a` the vector `b` falls.
  - `vec2.magnitude(v)`, `vec2.distance(a, b)` — how long a vector is, and how far apart two points
    are.
  - `vec2.normalize(v)` — the same direction at length one. A zero-length vector comes back as zero
    rather than as not-a-number.
  - `vec2.perpendicular(v)` — turned a quarter turn anticlockwise, which is the direction an arrow
    head and a line's thickness are both measured along.
  - `vec2.rotate(v, radians)` — turned about the origin.
  - `vec2.angle(v)` — the direction it points, anticlockwise from the positive x axis, in radians
    between minus pi and pi.
  - `vec2.lerp(a, b, along)` — part of the way from one point to another.
- `Vec3` — a point or a direction in space, `x`, `y` and `z`.
- `vec3(x, y, z)` — a `Vec3`, with its own family on the same name.
  - `vec3.ZERO`, `vec3.add`, `vec3.sub`, `vec3.scale`, `vec3.dot`, `vec3.magnitude`,
    `vec3.normalize`, `vec3.lerp` — the same as their flat counterparts, in space.
  - `vec3.cross(a, b)` — the cross product, which is the direction at right angles to both.

## Intervals

An interval is the numbers from one bound to another. Either bound may be the larger.

- `Interval` — `from` and `to`, both readable and neither writable.
- `interval(from, to)` — an interval, with its family on the same name. The width is not called
  `length`, for the reason a vector's magnitude is not.
  - `interval.span(interval)` — how far it reaches, without a sign, so an interval given either way
    round reports the same width.
  - `interval.holds(interval, value)` — whether the value is inside, both bounds counting as inside.
  - `interval.ordered(interval)` — the same two bounds with the lower first, for anything that walks
    from one end to the other.
  - `interval.at(interval, along)` — a fraction of the way along, reaching past either bound when
    the fraction is outside 0 to 1.
  - `interval.clampTo(interval, value)` — the value held inside the two bounds.
  - `interval.remap(value, source, target)` — the place a value holds in one interval, read at the
    same place in another. A source of no width hands back the target's first bound.

## Matrices

- `Mat3` — nine numbers, column-major, which is the transform a group of marks carries and the one
  that maps figure units onto a surface. The entry at flat index `col * 3 + row` is the one in that
  column and row.
- `mat3` — the flat transform family.
  - `mat3.IDENTITY` — the transform that changes nothing.
  - `mat3.multiply(a, b)` — the product, applying `b` to a point first and then `a`, which is the
    order a group's transform sits outside its child's.
  - `mat3.translation(v)`, `mat3.scaling(v)`, `mat3.rotation(radians)` — a move, a scale, and a turn
    about the origin.
  - `mat3.transformPoint(m, v)` — the matrix applied to a point, taking the translation with it.
  - `mat3.transformDirection(m, v)` — the rotation and scale applied and the translation left out,
    which is what a direction wants: moving the picture must not move where an arrow points.
  - `mat3.scaleFactor(m)` — how much longer a length becomes under the transform. A transform
    scaling differently along each axis has no single answer, so this takes the mean of the two.
- `Mat4` — sixteen numbers, column-major, which is how a camera turns a place in the world into a
  place on the page. There is no inverse here, because a camera builds its view and its projection
  forwards and never undoes either.
- `mat4` — the space transform family.
  - `mat4.IDENTITY`, `mat4.multiply(a, b)`, `mat4.translation(v)`, `mat4.scaling(v)` — as their flat
    counterparts, in space.
  - `mat4.rotationX(radians)`, `mat4.rotationY(radians)`, `mat4.rotationZ(radians)` — a turn about
    each axis.
  - `mat4.lookAt(eye, target, up)` — the matrix that lines the world up with an eye.
  - `mat4.perspective({ fov, aspect, near, far })` — the projection that shrinks with distance.
  - `mat4.orthographic({ left, right, bottom, top, near, far })` — the projection that does not.
  - `mat4.transformPoint(m, v)`, `mat4.transformDirection(m, v)` — a point moved with the
    translation, and a direction moved without it.

## Tracks

A track is one value's keys over time. A control panel writes tracks and a figure reads them.

- `TrackValue` — what a key can hold: a number, a list of numbers, or a boolean. A boolean because a
  control can be a switch, and a list because a control can be a vector or a colour.
- `Key` — one keyed value.
  - `time` — seconds into the clip. A key past the clip's end is never reached.
  - `value` — the `TrackValue` held there.
  - `smooth` — whether the curve is flat here, which eases the segments either side.
  - `curve` — a `CurveName` the value leaves this key along, which overrides the pair of flat flags.
    It is a name and never a function, so a track stays data a file can hold.
- `Track` — one value's keys, in the order the sampler reads them.
- `Tracks` — every track by name, keyed by whatever the caller keys.
- `SAME_TIME` — how close two times count as one instant, which is half a frame at sixty a second.
  Setting a key twice at one time replaces rather than stacks.
- `sampleTrack(track, seconds)` — what a track is worth at a time, or null where it has no keys.
  Outside the keys the nearest one holds, so a track never invents a value before its first key.
- `sampleTracks(tracks, seconds)` — every track's value at a time, leaving out a track with no keys.
- `withKey(track, key)` — the track with one key set, replacing the key at that time where there is
  one.
- `withoutKey(track, seconds)` — the track with the key at that time taken out.
- `keyAt(track, seconds)` — the key sitting at a time, which is what a control reads to draw its
  button as set rather than empty.

## Expressions

An expression is a parameter a figure computes rather than states, written as data. The vocabulary is
closed and published, so a renderer implements a fixed list rather than a language, and a form outside
it is refused with a sentence naming what was asked for. The tree is over numbers and over points,
which is what lets one vocabulary carry a curve of one number, a field of a place, a surface of two
numbers and a pointwise map of a shape.

- `Expression` — one node of the tree. A bare number, boolean or point is a literal; every other form
  is a record with a `kind`, which is what tells a literal place from the `point` form.
  - `track` — a track's value at the time being drawn, by `name`.
  - `variable` — a bound value by `name`: the x of a curve, the place a field is read at, the two
    numbers of a surface.
  - `point` — a place from its two members, `x` and `y`.
  - `member` — the `x` or the `y` of a place.
  - `arithmetic` — `+`, `-`, `*` or `/` over two numbers. Places are combined by the point calls
    instead, since dividing one place by another means nothing.
  - `compare` — `<`, `<=`, `>`, `>=`, `=` or `!=`, giving a true or false. Two places compare by both
    members.
  - `choice` — the `then` where `when` is true and the `otherwise` where it is false. Only the side
    taken is evaluated.
  - `call` — one of the published functions by `name`, with its `arguments`.
  - `path` — the geometry a `PathRecord` names, for the three calls that read a path. A path carries
    expressions of its own, so the parameters of the path are read at the same time as the expression
    around it.
  - `coords` — a pair of scales, which is what `slopeOf` reads a graph x against.
  - `camera` — the camera a `Camera3Record` names, built at the time the expression is read, which is
    what `project` places a point through.
- `ExpressionValue` — what an expression evaluates to: a number, a true or false, a place, a path, a
  pair of scales or a camera. A list-valued track has no form here and is named rather than read as its first
  number. A path and a pair of scales are values because the three calls that read geometry take them,
  and neither is arithmetic and neither is compared.
- `Variables` — the bound values by name.
- `Bindings` — what the names stand for: the `tracks` sampled at the time being drawn and the
  `variables` bound for the place being evaluated.
- `Arithmetic` — the four operators.
- `Comparison` — the six comparisons.
- `EXPRESSION_FUNCTIONS` — every function an expression may name, sorted, which is thirty-seven names.
  The set is versioned the way the node set is. `lengthOf`, `pointAlong` and `slopeOf` are the three
  that read geometry, and `pointAlong` given a path with no points in it is refused rather than read.
  `project(camera, x, y, z)` is the place in space put on the page, which is what a wash whose axis
  follows the eye is written with. It gives the place whether or not the eye can see it, the way the
  camera's own `project` hands back a point beside the depth it was at.
- `evaluate(expression, bindings)` — the value an expression has for a set of tracks and variables.
  Division by nothing is left as the infinity the arithmetic gives, so a field sampled at a pole reads
  as a pole.

## Paths

- `Path` — a list of subpaths.
- `Subpath` — `start`, a run of `curves`, and `closed`. A closed subpath joins its end back to its
  start, which decides whether a fill has a straight edge there and whether the stroke has ends.
- `Cubic` — one piece: `control1`, `control2` and `to`. A piece carries where it ends and not where
  it began, which is why several calls here take the point it starts from as well.
- `straight(from, to)` — a straight segment written as a cubic, with the controls at a third and two
  thirds, which is the placement that leaves the pace even.
- `line(from, to)` — an open path of one straight segment.
- `polyline(points)` — an open run of straight segments.
- `polygon(points)` — a closed run of straight segments.
- `rect(corner, width, height)` — an axis-aligned rectangle from its corner and its size.
- `circle(centre, radius)` — a circle as four cubic quarters, anticlockwise from the positive x
  axis.
- `arc(centre, radius, fromAngle, toAngle)` — an arc as a run of cubics, each covering at most a
  quarter turn. The sweep is cut into quarters because a single cubic drifts from a true arc as the
  angle it covers grows.
- `pointOn(from, curve, along)` — the point a parameter of the way along a cubic.
- `tangentOn(from, curve, along)` — which way a piece is heading at a parameter along it.
- `splitCurve(from, curve, along)` — one piece cut into two, both drawing what the whole drew, by de
  Casteljau's construction.
- `transformPath(path, m)` — every point of a path moved by a transform, which is how a group's
  transform reaches the geometry rather than being carried alongside it.
- `transformFill(fill, m)` — a fill through a transform, which is its gradient's axis and nothing
  else. A fill of one colour is handed back as it stands.
- `transformGradient(gradient, m)` — a gradient's two ends through a transform, its stops untouched,
  since a stop is a share of the axis rather than a place.
- `pointCount(path)` — how many points a path holds, which is what two paths have to agree on before
  one can be walked into the other.
- `pathFromData(d)` — the path an SVG `d` attribute describes. Both cases of every command are read,
  so a relative run is resolved against where the last one ended. A command letter followed by more
  numbers than it takes repeats.
- `TOLERANCE` — how close two things come before this package reads them as the same place, as a
  distance in figure units. Every call that takes a tolerance defaults to this one, so a crossing, a
  cut, a flattening and a stitch agree about what counts as one place.

## Boolean operations

- `areaOf(path)` — how much a path encloses, positive where it is wound anticlockwise. An open
  subpath is closed by the straight run back to its start. Every subpath is added, so a ring written
  as two loops wound opposite ways comes back as the difference between the two discs.
- `unionOf(first, second, options)` — everything either path covers.
- `intersectionOf(first, second, options)` — only what both paths cover.
- `differenceOf(first, second, options)` — the first path with the second taken out of it.
- `BooleanOptions` — what the three combining calls take.
  - `tolerance` — how close two things come before they count as the same place, in figure units. It
    decides where two paths are read as crossing and which ends are read as meeting.

## Containment and intersection

- `flattenPath(path, options)` — every subpath as a run of points, each loop closed.
- `FlattenOptions` — what a flattening takes.
  - `tolerance` — how far a straight run may sit from the curve it stands for, in figure units.
- `windingAt(loops, point)` — how many times the loops wind round a point, counted along the ray
  heading in the positive x direction.
- `nearestEdge(loops, point)` — which edge of a flattening a point sits nearest, and which way it
  runs. This tells a piece lying along another path's edge from one merely near it, which the
  winding count cannot answer.
- `FlatEdge` — `gap`, how far the point is from that edge, and `heading`, which way the edge runs.
- `containsPoint(path, point, options)` — whether a path holds a point, under the nonzero rule. The
  path is flattened again on every call, so asking about many points wants one flattening and
  `windingAt` taken against it.
- `curveCrossings(fromFirst, first, fromSecond, second, options)` — every place two cubics cross, as
  a parameter along each and the point. Two curves covering the same stretch answer with the two
  ends of that stretch.
- `Crossing` — `alongFirst`, `alongSecond` and the `point` where they meet.
- `CrossingOptions` — what a crossing search takes.
  - `tolerance` — how close two pieces come before they count as meeting, in figure units. It
    decides which meetings are told apart rather than how sharp one is, since Newton's method
    supplies the sharpness afterwards.
- `cutPath(path, cuts, options)` — a path with every cut put in, drawing what it drew and holding
  one more piece per cut. A cut naming a piece the path does not have is ignored.
- `Cut` — where one cut falls: the `subpath`, the `curve` in it, and how far `along` that piece.
- `CutOptions` — what cutting takes.
  - `tolerance` — how close two cuts, or a cut and the end of a piece, are before they count as the
    same place, in figure units. It is read against each piece's own length, so a cut is made only
    where the piece it would leave behind is long enough to see.

## Arc length, trimming and interpolation

- `lengthOf(path)` — how long a path is, in figure units, across every subpath. It reads a little
  short of the truth, by the chord error of its sampling.
- `pointAlong(path, fraction)` — the point a fraction of the way along a path, measured by length
  rather than by piece. A fraction outside 0 to 1 is held at the nearer end, and a path with
  no points hands back nothing.
- `trimPath(path, fraction)` — the path up to a fraction of its total length. A fraction at or past
  one is the path itself, untouched.
- `alignPaths(from, to)` — the two paths rewritten to the same shape of point list, each drawing
  exactly what it drew before.
- `lerpPath(from, to, along)` — part way from one path to another, point by point, after aligning
  them.

## The outline of a stroke

- `outlinePath(path, width, options)` — a path stroked at a width, as the filled outline of that
  stroke. An open subpath becomes one loop: the left side out, the cap, the right side back, and the
  cap at the start. A closed subpath becomes two loops wound against each other, which the nonzero
  rule reads as a ring. A width of nothing or less has no outline. The loop is built on a flattening,
  since the offset of a cubic is not a cubic.
- `widthAt(width, along)` — the width a stroke has a fraction of the way along its length, which for
  one number is that number wherever it is read.
- `widestWidth(width)` — the widest a stroke gets, which is the number a caller that has to pick one
  reads. A tick standing on an axis is measured against the line it stands on.
- `outlinedMarks(marks)` — the marks a painter draws, with every tapered stroke turned into the
  filled outline it is drawn as. `marksAt` runs it after the timeline, so the outline is in the marks
  a gate reads rather than only in what a painter writes. A mark whose stroke is one width is handed back as it stands, so a
  list with no taper comes out unchanged and running it twice changes nothing. A shape carrying a
  fill as well leaves two marks, the fill under its own id and the outline under that id with
  `/stroke` on the end. Both painters run this over the marks they are given.
- `OutlineOptions` — what outlining takes. The caps, the joins and the miter limit are the SVG
  specification's, and so are the defaults.
  - `cap` — what the two ends of an open stroke are finished with: `butt`, `round` or `square`.
    Default `butt`.
  - `join` — what fills the wedge on the outside of a corner: `miter`, `round` or `bevel`. Default
    `miter`.
  - `miterLimit` — how far a miter may reach past its corner, as a multiple of the width, before the
    join is cut back to a bevel. Default 4.
  - `tolerance` — how far the outline may sit from the true offset, in figure units. Default a
    thousandth, which is a tenth of a pixel at the hundred pixels to the unit the demos draw at.

## Marks

A mark is what a painter draws. It may request only what both painters implement, so there are no
filters and no blend modes, and a clip is a rectangle and no other shape.

- `Colour` — a colour as text, which is any colour a CSS author can write.
- `Fill` — how an inside is painted.
  - `colour` — the one colour this fill has, which is what anything needing a single colour reads, a
    contrast reading included.
  - `gradient` — the stops this fill is painted with, where it is painted with more than one colour.
    A fill carrying one is drawn as the gradient rather than as the colour beside it.
  - `rule` — `nonzero` or `evenodd`, how a shape that crosses itself decides what is inside.
- `Gradient` — a run of colours along a straight axis. The axis is a pair of points rather than an
  angle and a length, because both painters take it that way, and it is in the mark's own units, which
  is what lets a group's transform carry it with the shape it fills.
  - `from`, `to` — the two ends of the axis.
  - `stops` — the colours, in the order they are painted.
- `Stop` — one colour of a gradient and where along the axis it sits.
  - `offset` — nothing at the start of the axis to one at its end.
  - `colour` — the colour.
- `Stroke` — how a line is painted.
  - `colour` — the colour.
  - `width` — one number in figure units, so a line reads the same weight at every size the figure is
    drawn at, or a `Taper`.
  - `cap` — `butt`, `round` or `square`, the shape of each end.
  - `join` — `miter`, `round` or `bevel`, the shape of each corner.
  - `dash` — lengths of the drawn and undrawn runs, in figure units.
  - `dashOffset` — how far into that pattern the line starts.
- `Taper` — a width that changes along the length of a stroke. The width leaves `from` for `to` along
  the named curve, read at the fraction of the whole path's length. A tapered stroke is drawn as the
  filled outline of its own path, since neither painter strokes at two widths.
  - `from`, `to` — the width where the path starts and where it ends, in figure units.
  - `curve` — the `CurveName` the width leaves `from` along. Default `linear`.
- `Width` — what a stroke's width may be: one number the whole way, or a `Taper`.
- `PathMark` — an outline to draw: its `path`, and a `fill`, a `stroke`, or both.
- `TextMark` — a piece of text to draw.
  - `at` — where its anchor sits.
  - `text` — the characters.
  - `size` — in figure units, like a stroke width.
  - `family`, `weight` — the font asked for.
  - `align` — `start`, `middle` or `end`, which end of the text sits at the anchor.
  - `baseline` — `alphabetic`, `middle` or `hanging`, where the anchor sits against the line of
    text.
  - `fill` — the colour the letters are painted.
- `Mark` — a `PathMark` or a `TextMark`. Every mark also carries the `id` it was named by, an
  `opacity`, and a `clip`.
  - `clip` — the `Bounds` the mark is drawn inside, in the figure's own units, with everything of it
    outside that rectangle cut away. It is in the figure's units rather than the mark's own, because a
    transform that turns takes a rectangle to a shape with corners off the axes and a path clip is
    what no card draws without counting a winding number. A shape whose whole reach falls outside its
    clip, half a stroke width included, is left out of the list rather than drawn invisibly. A text
    mark stays, since a text mark reaches only as far as its own anchor.

## The extent and the view

- `Extent` — how much of the world a figure shows, in its own units.
  - `width`, `height` — how many units across and up.
  - `centre` — where the middle of the frame sits, the origin unless named. A figure whose view
    follows something moves this rather than moving everything it draws.
- `ExtentChoice` — an extent, or a function of the surface's aspect and the time that returns one.
- `ViewAnimation` — the function a view entry holds: the extent the entries before it left and how
  far along, to the extent at that point.
- `ViewChange` — a view animation as a timeline entry, holding it under `view`. The wrapper is what
  lets one span list carry a change to the marks and a change to the view, since both are functions
  of two arguments and nothing at runtime tells them apart.
- `moveView(to)` — a move to an extent, from wherever the entries before it left the view. Fields the
  move does not name are left as they were, so a figure that only pans writes a `centre` and one that
  only zooms writes a `width` and a `height`.
- `followView(target, options)` — a view that follows a mark, holding it within a margin of the
  middle. The target is the middle of the named mark's own bounds, and a name that matches nothing
  leaves the view alone.
  - `within` — how far the target may sit from the middle before the view starts to follow it. The
    view holds still inside that margin and then pushes exactly as far as it must, so what a reader
    is looking at stays where they are looking.
  - `room` — how far the middle may travel from where it started, for a figure whose picture has its
    own edges.
  - `axis` — `x`, `y`, or both ways unless named.
- `frameView(targets, options)` — a view framing the named marks, grown to cover them rather than
  fitted to them, so the shape of the frame is the one it was handed and the picture does not stretch
  as the marks move.
  - `padding` — how many figure units of margin it leaves round them.
- `FollowOptions` — what a follow takes: `within`, `room` and `axis`, above.
- `FrameOptions` — what a framing takes: `padding`, above.
- `Fit` — `contain` fits the whole extent inside the surface; `cover` fills the surface and lets the
  extent run off the edges.
- `resolveExtent(choice, aspect, seconds)` — the extent a choice comes to at one shape of surface
  and one time.
- `byAspect({ wide, square, tall })` — an extent per shape of surface, for a figure whose
  composition does not survive being reframed. The two thresholds sit between sixteen by nine,
  square, and nine by sixteen.
- `matchingAspect(height)` — an extent that follows the shape of whatever it is drawn on. The height
  is fixed and the width follows the surface, so `contain` fits it exactly at any shape.
- `fractionOf(extent, across, up)` — a point given as a fraction of the frame rather than in figure
  units, with nothing at the bottom left and one at the top right. This is the only placement that
  is safe over something a figure cannot read, such as a shader.
- `viewMatrix(extent, fit, surfaceWidth, surfaceHeight)` — the one matrix taking figure units onto a
  surface, with the extent centred and the y axis flipped. A figure counts upward and both painters
  count downward from the top, and flipping here is what keeps the two from disagreeing.

## Bounds

- `Bounds` — a box, as an `x` interval and a `y` interval.
- `boundsOf(path)` — the box round a path, or nothing where it holds no points.
- `boundsOfMarks(marks)` — the box round a list of marks, or nothing where the list is empty. A text
  mark reaches only as far as its own anchor. How wide text is depends on which fonts the machine
  has, and nothing about a figure's layout may turn on that.
- `centreOf(bounds)` — the middle of a box, which is what a turn or a growth happens about when a
  figure names no other point.
- `overlapOf(one, other)` — the box both boxes hold, or nothing where they miss each other. Touching
  along an edge counts as meeting, so a box holds what sits exactly on its boundary.
- `grownBy(bounds, margin)` — the box reaching one margin further out on all four sides, which is
  what a stroke of a given width adds to the geometry it is drawn along.

## Graph coordinates

A scale is the mapping from the numbers on an axis to places in a figure. It is a value the caller
holds rather than something read back out of a drawn group, so a curve drawn over axes that were
never drawn works.

- `Scale` — `graph`, the numbers the axis counts through, and `units`, where those numbers land in
  figure units.
- `scaleOf(graph, units)` — a scale from those two intervals.
- `toUnits(scale, value)` — a number on the axis, as a place in figure units.
- `toGraph(scale, place)` — a place in figure units, as a number on the axis, which is what a reader
  pointing at the picture is asking for.
- `Coords` — an `x` scale and a `y` scale together.
- `coordsOf(x, y)` — the two scales as one value.
- `pointOf(coords, x, y)` — a pair of graph numbers as a point in figure units.

## Ticks

- `Tick` — `value`, in graph units and rounded to the decimals its own label shows, and `label`,
  what is written there.
- `tickStep(bounds, about)` — the gap between one tick and the next for an interval that wants about
  this many. An axis here keeps the bounds it was given, so the span is divided as it stands rather
  than rounded outward first.
- `ticksOn(bounds, about)` — every tick inside the interval, with the number each one shows.
- `labelFor(value, step)` — a tick's value written out, with as many decimals as its step needs and
  no more. The decimal count comes from the step rather than from the value, so every label along
  one axis is written to the same width.

## The tree

- `Style` — what a node paints with: `fill`, `stroke`, `opacity`, `family`, `weight` and `clip`. A
  style set on a group is handed down to its children. A `clip` inside a `clip` is the box both of
  them hold, since a group cannot show what the group above it has already cut away, and two that
  miss each other leave nothing under them at all. A clip stays where it was declared rather than
  riding a transform below it.
- `ShapeNode` — a named path with a style.
- `TextNode` — named text at a point, with a size, an alignment and a baseline. Its `text` may hold
  several lines separated by a newline, and `leading` is how far apart their baselines sit, in the
  same units as the size. A mark never carries a newline: a node of several lines flattens into one
  text mark per line, named `0`, `1` and so on under the node's own name.
- `GroupNode` — a named list of children, with an optional `transform` and `style`.
- `Node` — a `ShapeNode`, a `TextNode` or a `GroupNode`.
- `TextOptions` — a style, plus the `align`, `baseline` and `leading` a text node takes.
- `shape(name, path, style)` — a shape node.
- `text(name, at, content, size, options)` — a text node. A newline in `content` starts another
  line under the first.
- `LEADING` — how far apart two baselines sit against the size, when a text node names no leading of
  its own, which is six fifths.
- `group(name, children, options)` — a group node, taking a `transform` and a `style`.
- `flatten(root, transform, style)` — the tree resolved into the list a painter draws. A shape with
  neither a fill nor a stroke is left out rather than emitted invisible. An invisible mark costs a
  painter an element and turns up in a comparison between two frames as a change.

## The tree as data

A node record is the tree written as data rather than as calls. A record is a kind, a name and its
parameters, and a group's children are records. `shape`, `text` and `group` are the three kinds the
tree itself has, so a resolved record is the `Node` that `flatten` already walks. A record carries no
functions, which is what lets the same tree survive being written to a file and read back.

- `ShapeRecord` — a `kind` of `shape`, a `name`, a `path` as a `PathRecord`, and a `style`.
- `TextRecord` — a `kind` of `text`, a `name`, an `at`, a `content`, a `size` and the `options` a text
  node takes.
- `GroupRecord` — a `kind` of `group`, a `name`, its `children` as records, and an optional
  `transform` and `style`.
- `DotRecord` — a `kind` of `dot`, a `name`, an `at`, a `radius` and a `fill`.
- `ArrowRecord` — a `kind` of `arrow`, a `name`, a `from`, a `to` and its `options`.
- `BraceRecord` — a `kind` of `brace`, a `name`, a `from`, a `to`, a `content` and its `options`.
- `CalloutRecord` — a `kind` of `callout`, a `name`, the `at` it names, the `to` its word sits at, a
  `content` and its `options`.
- `ArrowRecordOptions` — a `stroke`, an optional `fill`, and a `head` and `spread` as expressions.
- `BraceRecordOptions` — a `stroke`, a `fill`, a `size`, a `depth`, and an optional `curl`, `padding`,
  `align`, `baseline`, `family` and `weight`. The distances are expressions and the size is a plain
  number.
- `CalloutRecordOptions` — a `stroke`, a `fill`, a `size`, and an optional `marker`, `align`,
  `baseline`, `family` and `weight`. A marker of nothing leaves the disc out, which is what a callout
  pointing at a moving thing wants.
- `NumberLineRecord` — a `kind` of `numberLine`, a `name`, a `scale` and its `options`.
- `AxesRecord` — a `kind` of `axes`, a `name`, its `coords` and its `options`.
- `NumberPlaneRecord` — a `kind` of `numberPlane`, a `name`, its `coords` and its `options`.
- `RiemannBarsRecord` — a `kind` of `riemannBars`, a `name`, its `coords`, the curve as `of`, and its
  `options`. The curve is an expression of the bound variable `x`, the way a plot's is.
- `BarsRecordOptions` — what `riemannBars` takes, with `over` as an `IntervalRecord`, since a figure
  that walks the bars across a graph moves both ends of the run.
- `EquationRecord` — a `kind` of `equationNode`, a `name`, an `equation` and its `options`. The
  equation is resolved geometry, one path per glyph with the box round them, rather than the TeX it
  was typeset from, so a renderer draws the expression without MathJax and two machines draw the same
  glyphs.
- `EquationRecordOptions` — what `equationNode` takes, with `at` as an expression, since a figure may
  hang an expression off a frame that moves. The box it is fitted inside is layout.
- `VectorFieldRecord` — a `kind` of `vectorField`, a `name`, its `coords`, the field as `of`, and its
  `options`. The field is an expression of the bound variable `at`, which is the place being sampled,
  giving the vector there.
- `FieldRecordOptions` — what `vectorField` takes, with `lengthOf` as an expression of the bound
  variable `magnitude` and `colourFor` as a `ColourChoice`. The expression form already spells the
  three lengths a field wants: a constant is a literal, a saturating length is arithmetic, and a
  threshold is a choice on a comparison.
- `ColourChoice` — what colour a thing read off a magnitude takes. A bare colour is a constant. A
  `bands` choice is a `first` colour and a list of `then` entries, each an `above` threshold and the
  `colour` that holds above it, read in order so the last threshold a magnitude clears decides. It is
  a form of its own rather than an expression because the expression vocabulary has no colour.
- `Polyline3Record` — a `kind` of `polyline3`, a `name`, its `points` as `Point3Record`s, its `camera`
  and its `options`.
- `Dot3Record` — a `kind` of `dot3`, a `name`, an `at`, a `radius`, a `fill` and its `camera`.
- `Text3Record` — a `kind` of `text3`, a `name`, an `at`, a `content`, a `size`, its `camera` and its
  `options`.
- `Arrow3Record` — a `kind` of `arrow3`, a `name`, a `from`, a `to`, its `camera` and its `options`,
  which are an arrow's.
- `Scene3Record` — a `kind` of `scene3`, a `name`, its `items` as `SceneItemRecord`s and its
  `camera`.
- `SpaceItemRecord` — one piece of a scene in space: the `points` its depth is measured from, and the
  `node` drawn for it. A scene sorts its pieces by the mean of their own depths, so the points are
  what order a piece rather than anything the node carries.
- `Axes3Record` — a `kind` of `axes3`, a `name`, its `camera` and its `options`.
- `FillRecord` — a fill whose gradient runs between two places an expression gives. Every `Fill` is
  one already, since a fixed place is a literal expression. What it adds is a wash whose axis moves,
  which is what the solid demo's pane runs along the recession from the eye. A record carrying a fill
  of its own takes one where a figure moves it, and the rest stay plain fills until a demo asks.
- `ShadeRecord` — what colour a cell of a surface is filled with: a `ramp` of fills read as even steps
  from nothing to one, and the `band` of the amount that ramp is spread over. Every normal of a
  surface drawn over a plane has a positive z, so a light with a positive z reaches part of a ramp
  alone and a band spreads the whole of it over the part the surface uses. A ramp rather than a
  function is what a file can carry, since a fill is a colour written as text and nothing here parses
  one.
- `Surface3RecordOptions` — what a surface takes beyond its own places: its `shade` as a
  `ShadeRecord`, its `light` as a `Point3Record`, and the `over`, `resolution`, `cull` and `stroke`
  its own call takes.
- `Surface3Record` — a `kind` of `surface3`, a `name`, its `of` as a `Point3Record` read from the
  bound variables `u` and `v`, its `camera` and its `options`.
- `SurfaceCellsRecord` — a `kind` of `surfaceCells`, a `name`, its `of` and its `options`. It carries
  no camera and takes the scene's, so a surface sharing a depth sort with a second surface is written
  as a piece of that scene.
- `Field3RecordOptions` — what a field in space takes beyond its own vectors: its `lengthOf` as an
  expression of the bound variable `magnitude`, in the world's own units, and its `colourFor` as a
  `ColourChoice`.
- `FieldArrows3Record` — a `kind` of `fieldArrows3`, a `name`, its `of` as a `Point3Record` read from
  the bound variables `x`, `y` and `z`, and its `options`. It takes the scene's camera, the way a
  surface's cells take it.
- `VectorField3Record` — a `kind` of `vectorField3`, a `name`, its `of`, its `camera` and its
  `options`.
- `PlaneRecord` — a flat plane in space: a `point` it passes through and the `normal` it faces along.
- `SectionRecord` — the curve where a plane cuts a surface, as the `of` surface, the `plane` and the
  `options` `sectionOf` takes. What it describes is runs of places in space rather than a node.
- `Section3Record` — a `kind` of `section3`, a `name`, its `curve` as a `SectionRecord`, its `camera`,
  the `options` each run is drawn with and its `style`. It resolves to a group whose children are
  `run0` upwards, one per run of the curve.
- `StreamlineRecord` — a run through a flat field: its `of` field as an expression of the bound
  variable `at`, its `from` seed, and the `options` `streamlineOf` takes. The step and the cap are
  plain numbers, since a step that followed a track would hand back a different number of points at
  every time and a morph pairs two runs up by their points.
- `Streamline3Record` — a `kind` of `streamline3`, a `name`, its `runs`, the surface they stand `on`
  read from `u` and `v`, its `camera`, the `options` each run is drawn with and its `style`. A run
  drawn in a plane is that plane written as a surface, so there is no second form for one.
- `SceneItemRecord` — one entry of a scene: a `SpaceItemRecord` written out, a `SurfaceCellsRecord` or
  a `FieldArrows3Record`. A producer carries a kind and a written-out piece carries none, so a scene
  written before the producers existed still reads.
- `resolveSection(record, bindings)` — the runs of points where a plane cuts a surface, from the
  record naming both. A run whose two ends meet comes back with its first point repeated at the end.
- `resolveStreamline(record, bindings)` — the points a run through a flat field passes, from the
  record naming the field and the seed.
- `NodeRecord` — a `ShapeRecord`, a `TextRecord`, a `GroupRecord`, a `DotRecord`, an `ArrowRecord`, a
  `BraceRecord`, a `CalloutRecord`, a `NumberLineRecord`, an `AxesRecord`, a `NumberPlaneRecord`, a
  `RiemannBarsRecord`, an `EquationRecord`, a `VectorFieldRecord`, a `Polyline3Record`, a
  `Dot3Record`, a `Text3Record`, an `Arrow3Record`, a `Scene3Record`, an `Axes3Record`, a
  `Surface3Record`, a `VectorField3Record`, a `Section3Record` or a `Streamline3Record`. Each space
  kind carries its own camera, the way its call takes one. Every kind resolves through its own call, so a brace's curls, an arrow's head
  and an axis's tick list are each one piece of arithmetic with one set of gates over it. A graph
  frame's options are the values those calls already take rather than expressions: a frame is the
  furniture a figure draws its moving parts on, and widening a number to an expression later costs a
  minor rather than a major, since a bare number is a literal already.
- `TextContent` — what a text record draws: a plain string, or a `TextTemplate`.
- `TextTemplate` — a `template` string with numbered holes, `{0}` for the first and `{1}` for the
  second, and one `holes` entry per hole. `{{` writes one brace, which leaves a set in braces
  writable.
- `TextHole` — one number written into a template: its `value` as an expression, and the `precision`
  it is rounded and padded to. The precision is what keeps a hole following a track at one width as
  the number moves.
- `writeTemplate(content, bindings)` — the template with its holes filled, each hole written to its
  own precision. A hole naming an index the list has no entry for is refused, and so is a hole whose
  expression is a place or a true or false.
- `AnimationRecord` — one animation written as data: a `FadeInRecord`, a `FadeOutRecord`, a
  `FadeToRecord`, a `DrawRecord`, a `MoveByRecord`, a `MoveAlongRecord`, a `RotateRecord`, a
  `ScaleRecord`, a `GrowFromRecord`, a `MorphRecord`, a `MorphEquationRecord`, an `IndicateRecord`, a
  `FlashRecord` or a `CircumscribeRecord`. A parameter is a plain value rather than an expression, since
  an animation is built once and then asked what the marks are at a fraction of its own span. A path
  is the exception, since a path record is the only form a path has and its own parameters are
  expressions.
- `FadeInRecord` — a `kind` of `fadeIn` and the `target` it fades.
- `FadeOutRecord` — a `kind` of `fadeOut` and the `target` it fades.
- `FadeToRecord` — a `kind` of `fadeTo`, the `target` and the `opacity` it fades to.
- `DrawRecord` — a `kind` of `draw` and the `target` it draws.
- `MoveByRecord` — a `kind` of `moveBy`, the `target` and the `offset` it is carried by.
- `MoveAlongRecord` — a `kind` of `moveAlong`, the `target` and the `path` it is carried along, as a
  `PathRecord`. A figure carrying something along a curve it also draws names the same form twice
  rather than writing the curve out beside the one it draws.
- `RotateRecord` — a `kind` of `rotate`, the `target`, the `angle` and its `options`. The point the
  turn happens about is the middle of the box round the marks unless the options name one, and it is
  read off the marks as they arrive, so a turn of a whole circle ends where it began.
- `ScaleRecord` — a `kind` of `scale`, the `target`, the factor `to` and its `options`.
- `GrowFromRecord` — a `kind` of `growFrom`, the `target` and the point it grows `from`.
- `MorphRecord` — a `kind` of `morph`, the `target` and the `into` shape it becomes, as a
  `PathRecord`.
- `MorphEquationRecord` — a `kind` of `morphEquation` and the two targets `from` and `to`. It names no
  geometry, since both expressions are already in the scene and the glyphs are paired at play time.
- `IndicateRecord` — a `kind` of `indicate`, the `target` and its `options`.
- `FlashRecord` — a `kind` of `flash`, the `target` and its `options`.
- `CircumscribeRecord` — a `kind` of `circumscribe`, the `target` and its `options`. It names its
  target alone, the way a flash does: the marks each adds carry the target's own name in front of
  theirs, so a record naming them again would be a second place the same name is written.
- `resolveAnimation(record, bindings)` — the animation a record describes, as the `Animation` the timeline
  already plays. A kind outside the set is refused with a sentence naming it. A target stays an id or
  the front of one, so naming a group reaches everything inside it.
- `resolveNode(record, bindings)` — the record walked into the node it describes. The bindings reach
  every expression a record carries: the text holes, the parameters of every path, and the places and
  distances an annotation is built from. A kind outside the set is refused with a sentence naming it.
  A text size is a plain number rather than an expression, since a figure that grows a label does it
  with `scale` over the marks.
- `PathRecord` — one path written as data, either a named form with its parameters or its cubics. A
  figure chooses between the two per path rather than by a rule: a named form is shorter and says what
  the shape is, and cubics carry a shape no named form describes. Every parameter is an `Expression`,
  so a shape a track drives is the same form as a shape that stands still, and a bare number and a
  bare point are literals. `straight` has no form here, since it hands back one `Cubic` rather than a
  path.
  - `line` — `from` and `to`.
  - `polyline` — `points`, as an open run of straight segments.
  - `polygon` — `points`, closed.
  - `rect` — a `corner`, a `width` and a `height`.
  - `circle` — a `centre` and a `radius`.
  - `arc` — a `centre`, a `radius`, and `from` and `to` in radians, anticlockwise.
  - `data` — `d`, the path data of an SVG `d` attribute.
  - `cubics` — `subpaths`, the path itself, since a subpath is a point, a list of cubics and whether it
    closes and is already data.
  - `plot` — `coords`, the curve as `of`, an optional `resolution` and an optional `over`. The curve is
    an expression of the bound variable `x`, which is a rule rather than a field, since a figure naming
    its own variable would be a renderer looking a name up rather than binding one.
  - `areaUnder` — `coords`, the `curve` as a record, and an optional `baseline`.
  - `tangentAt` — `coords`, the `curve` as a record, the `x` it is read at, and an optional `reach`.
    The curve is the plotted path rather than the function behind it, so the region and the curve laid
    over it are one piece of geometry and cannot come to disagree.
  - `bracePath` — `from`, `to`, a `depth` and an optional `curl`.
  - `union`, `intersection` and `difference` — `first` and `second` as records, and a `tolerance`. The
    operation is a form here rather than geometry a figure carries, because the answer's cubics are
    none of the operands' and a disc walking through another changes the answer every frame. The
    tolerance is a plain number, since nothing a figure animates changes how close two things come
    before they count as one place.
- `IntervalRecord` — a run of numbers whose `from` and `to` may follow a track. A plain `Interval` is
  one already, since a bare number is a literal.
- `resolvePath(record, bindings)` — the geometry a path record names, with its parameters read against
  the tracks and variables. A form outside the set is refused with a sentence naming what was asked
  for, since a figure read from a file carries whatever the file says, and so is a place where a number
  belongs or a number where a place belongs.

## Text sizes

- `TextRole` — what a piece of text is doing: `title`, `note`, `label` or `tick`. A title says what
  the picture is, a note is a remark beside the picture, a label is a tag on a mark, and a tick is a
  number on an axis.
- `TextScale` — the four sizes, one per role, largest to smallest.
- `TEXT_RATIO` — the step between one role and the next, which is the square root of two, so a note
  is twice a tick and a title is twice a label.
- `textScale(tick, ratio)` — the four sizes built up from the size the ticks take. `ratio` defaults
  to `TEXT_RATIO`.

## Graphs

- `plot(coords, of, options)` — the curve of a function over a run of x, as one subpath per stretch
  of it that is on the graph. Each piece is a Hermite cubic carrying the sample's own slope, which
  is what makes the curve pass through both samples at both slopes.
- `PlotOptions` — what plotting takes.
  - `resolution` — how many pieces the curve is cut into.
  - `over` — the run of x the curve is drawn over, the whole width of the graph where it is left
    out.
- `areaUnder(coords, curve, options)` — the region between a plotted curve and a level line, closed,
  one subpath per subpath of the curve. The top is the path the caller drew rather than a second plot
  of the function behind it.
- `AreaOptions` — what a region takes.
  - `baseline` — the height the region is measured down to, the axis itself where it is left out. A
    height off the graph sits at the near edge instead.
- `riemannBars(name, coords, of, options)` — the bars under a curve, each named by its place in the
  run so a stagger can reach them one at a time. A bar whose top is off the graph is cut at the
  edge.
- `BarsOptions` — what the bars take.
  - `fill`, `stroke` — how they are painted. The style sits on the group, which is what lets the
    whole run fade as one thing.
  - `bars` — how many the run is cut into.
  - `over` — the run of x they cover, the whole width of the graph where it is left out.
  - `height` — `left`, `right` or `middle`, where in each bar its height is read.
  - `baseline` — the level the bars stand on.
- `slopeOf(coords, curve, x)` — the slope a plotted curve has at a graph x, read off the cubic that
  covers that x, and `NaN` where the curve does not reach it. A cubic written through samples of a
  quadratic carries that quadratic with nothing left over, so a parabola reads exactly.
- `tangentAt(coords, curve, x, options)` — the tangent to a plotted curve at a graph x, as a straight
  line cut where it leaves the graph. Nothing where the curve does not reach that x.
- `TangentOptions` — what a tangent takes.
  - `reach` — how far the line reaches either side of the point, in graph units.

## Axes and grids

- `numberLine(name, scale, options)` — one axis as a group: the line, the ticks under `ticks`, the
  labels under `labels` and the tips under `tips`. Each tick and label is named after the number it
  shows, so an animation naming one follows that number when the axis is rebuilt over a different
  range.
- `NumberLineOptions` — what a number line takes.
  - `stroke` — the line, its ticks and the outline of its tips.
  - `fill`, `size` — the labels and the tips, and how big the labels are in figure units. Nothing is
    written where either is missing.
  - `at` — where the line sits on the other axis, in figure units.
  - `direction` — `across` or `up`.
  - `ticks` — about how many are wanted. The step is a round number, so the count is near this
    rather than equal to it.
  - `tickLength` — how far a tick reaches across the line in total, half either side.
  - `gap` — from the end of a tick to the label's own anchor.
  - `tip` — how long the head at each end is. Nothing is drawn where this is zero.
  - `spread` — how wide a head is across its base, against its length.
  - `family`, `weight` — the font the labels are asked for.
  - `skipZero` — leaves the label at zero out, which a second axis crossing here wants.
  - `crossedAt` — the number on this line another line crosses it at. The label there is written
    below and to the left of the crossing, since under it is where the other line already is.
- `axes(name, coords, options)` — two number lines under one group, named `x` and `y`, each crossing
  the other at that other's zero. Where zero is outside an interval the line sits at the near edge.
- `AxesOptions` — the number line's own options without `at`, `direction` and `skipZero`, which a
  pair of axes decides for itself.
- `numberPlane(name, coords, options)` — the grid behind a graph: a line standing on each tick of
  both axes, and fainter lines dividing the gaps between them.
- `NumberPlaneOptions` — what the grid takes.
  - `stroke` — the lines standing on the ticks, handed down from the group so the whole grid fades
    as one thing.
  - `minors` — how many gaps each step is divided into.
  - `minorOpacity` — how much of the stroke a minor line is drawn with. A grid a reader notices is a
    grid competing with the curve on top of it.
  - `minorWidth` — how wide a minor line is against a major one.
  - `ticks` — about how many ticks each axis wants.

## Fields on a graph

- `vectorField(name, coords, of, options)` — the arrows of a field over a graph, one group per
  sample. Each is named by its column and row, so a stagger can reach them one at a time. A sample
  sits at the middle of its cell rather than on the grid line.
- `VectorFieldOptions` — what a flat field takes.
  - `lengthOf` — how long an arrow is, in figure units, from the magnitude at its own sample. A
    length in graph units under two axes counting at different rates would draw arrows pointing one
    way several times shorter than arrows pointing the other at the same magnitude.
  - `colourFor` — what colour an arrow is, from that same magnitude.
  - `width` — how wide a shaft is, in figure units.
  - `resolution` — how many samples across and up. One number is both.
  - `over` — the runs of x and y sampled, each the whole of the graph that way where it is left out.
  - `head` — how long a head is, in figure units. Four times the shaft's width unless named.
  - `spread` — how wide a head is across its base, against its length.
- `streamlineOf(of, from, options)` — the streamline of a field through a seed point, in graph
  units. The run stops when it leaves the region, reaches its step cap, or stands where the field is
  too small to point anywhere.
- `StreamlineOptions` — what a streamline takes.
  - `step` — how far each step moves, in graph units. The step is a distance rather than a time,
    which is what keeps the points evenly spaced.
  - `steps` — how many steps the run takes at most, in each direction it is run.
  - `within` — the region the run is held inside, as an `x` and a `y` interval. It has no edges
    where this is left out.
  - `direction` — `forward`, `backward` or `both`. Both puts the backward half first, so the points
    read from one end of the curve to the other.
  - `least` — the magnitude below which the field is taken to have vanished, in graph units.

## The camera

- `Projection` — how a point in front of the eye becomes a place on the page. `near` is the plane in
  front of which nothing is drawn, and `place` does the mapping.
- `perspective(choice)` — an eye that sees things smaller the further off they are.
- `PerspectiveChoice` — what that eye takes.
  - `fov` — the angle the frame covers up and down, in radians.
  - `height` — how tall the frame is in figure units, so handing this the extent's own height makes
    the picture fill the frame.
  - `near`, `far` — the two planes the projection is built between.
- `orthographic(choice)` — an eye that sees everything at the size it is, however far off. Nothing
  shrinks with distance, so there is no divide, no clip box, and nothing is ever cut away.
- `OrthographicChoice` — what that eye takes.
  - `scale` — how many figure units across the frame one world unit becomes.
- `camera3(choice)` — an eye at a point looking at another, which a caller holds and hands to every
  builder that works in space.
- `Camera3Choice` — what a camera takes: `eye`, `target`, `up`, and a `projection`. An `up` lying
  along the line of sight has no sideways direction in it. That gives a camera placing every point
  at the middle of the frame, and it is a pose the caller has to avoid.
- `Camera3` — the camera itself: the choice it was built from, the `view` matrix kept so a caller
  with many points does not rebuild it per point, and `project`.
- `Projected` — where one point landed.
  - `at` — the place in figure units, measured from the middle of the frame.
  - `depth` — how far the point is from the eye along the way the camera looks. A depth sort orders
    by this rather than by the straight-line distance to the eye.
  - `inFront` — whether the point is further off than the near plane. A point that is not is still
    given a place, and that place is meaningless.
- `ProjectionChoice` — a projection written as data: a `kind` of `perspective` or `orthographic`, with
  the parameters its own builder takes. A built `Projection` carries `place`, which is a function, so a
  figure stores the choice.
- `resolveProjection(choice)` — the projection a choice names. A form outside the set is refused with
  a sentence naming it.
- `Point3Record` — a place in space whose `x`, `y` and `z` may each follow a track. A plain `Vec3` is
  one already, since a bare number is a literal. It is three expressions rather than one because the
  expression form is over numbers and points on the page and has no value for a place in space.
- `Camera3Record` — a camera written as data: an `eye`, a `target`, an optional `up` as
  `Point3Record`s, and an optional `projection` as a `ProjectionChoice`.
- `resolvePoint3(record, bindings, what)` — a place in space read out of its three expressions.
- `resolveCamera(record, bindings)` — the camera a record describes, built at the time its expressions
  are read for.

## Drawing in space

Every builder here hands back the flat nodes the rest of the package already draws, so the same
animations reach a picture in space and a picture on a graph.

- `SpaceItem` — one piece waiting to be sorted: the `points` it was built from and the `node` that
  draws it. A figure holding two surfaces that pass through each other sorts all of their pieces
  together.
- `scene3(name, items, camera)` — a group whose children are ordered back to front, which is the
  painter's algorithm. Two pieces that pass through each other, and three that overlap in a ring,
  have no one order at all, and the answer for those is smaller pieces.
- `polyline3(name, points, camera, options)` — a run of straight segments through points in space.
- `Polyline3Options` — a style, plus:
  - `close` — whether the last point joins back to the first. A run the near plane cut comes back
    open however this is set, since closing it would draw an edge that is nowhere in the world.
- `dot3(name, at, radius, fill, camera)` — a disc marking a point in space. Its radius is in figure
  units and does not shrink with distance, because a dot marks where something is rather than how
  big it is.
- `text3(name, at, content, size, camera, options)` — a label at a point in space. The letters stay
  upright and stay the size they are given, since a label is read rather than seen in perspective.
- `Text3Options` — the text options, plus:
  - `offset` — how far the label stands off the point it names, in figure units, applied after the
    point is placed.
- `arrow3(name, from, to, camera, options)` — a line between two points in space with a head at the
  far end. The head is a flat triangle at the projected tip, so it stays the size it was given
  however steeply the arrow points away. An arrow whose far end is behind the eye is cut at the near
  plane and drawn with no head.
- `Arrow3Options` — the same options a flat arrow takes.

## Fields, surfaces and axes in space

- `vectorField3(name, of, camera, options)` — a field of vectors in space, drawn as arrows ordered
  back to front.
- `fieldArrows3(name, of, camera, options)` — the same arrows as pieces waiting to be sorted, for a
  figure that mixes them with pieces of its own. A sample whose vector is nothing draws no arrow.
- `VectorField3Options` — the arrow options, plus:
  - `over` — the box the samples are taken in, 0 to 1 each way unless named.
  - `resolution` — how many samples each way. One number is all three.
  - `lengthOf` — how long an arrow is, in the world's own units rather than the figure's. A far
    arrow drawing shorter than a near one of the same magnitude is what says which is far. Its head
    is still in figure units, since the head is drawn on the page.
  - `colourFor` — what colour an arrow is, from that same magnitude.
- `surface3(name, of, camera, options)` — a surface given by a function of two parameters, drawn as
  a grid of four-cornered cells ordered back to front.
- `surfaceCells(name, of, camera, options)` — the same cells before they are put in an order. Each
  cell carries the name it was given ahead of its own place in the grid. An animation can then name
  a whole surface once its cells are mixed with another's.
- `Surface3Options` — what a surface takes.
  - `over` — the runs of the two parameters, 0 to 1 each unless named.
  - `resolution` — how many cells each way.
  - `shade` — the fill a cell takes, given how squarely it faces the light. That amount is one
    facing the light head on, a half edge on, and nothing facing away. The author supplies this
    rather than naming two colours to mix, because a colour here is text.
  - `light` — which way the light comes from, over the shoulder of an eye on the positive z axis
    unless named.
  - `cull` — whether a cell facing away from the eye is left out. Off by default, because a count
    that changes as the camera turns is a count no gate can hold.
  - `stroke` — how the edge of each cell is drawn.
- `axes3(name, camera, options)` — the three axes as a group, one child per axis, each holding its
  line under `line`, its ticks under `ticks`, its labels under `labels` and, where it is named, its
  name under `name`.
- `Axes3Options` — what the axes take.
  - `x`, `y`, `z` — the run of each axis in world units, minus one to one unless named.
  - `stroke` — the lines and their ticks.
  - `fill`, `size` — the labels, and how big they are in figure units. Nothing is written where
    either is missing.
  - `ticks` — about how many are wanted on each axis.
  - `tickLength` — how far a tick reaches across its axis in world units, half either side.
  - `gap` — from the projected tick to the label's own anchor, in figure units.
  - `names` — what each axis is called, written past its far end under `name`. An axis this does not
    name carries no name.
  - `family`, `weight` — the font the labels are asked for.
- `sectionOf(of, plane, options)` — the runs of points where a plane cuts a surface, in space. A run
  whose two ends meet comes back with its first point repeated at the end, so drawing the points as
  they are given draws the loop closed.
- `Plane` — `point`, somewhere the plane passes through, and `normal`, which way it faces. The
  normal's length does not matter.
- `SectionOptions` — what a section takes.
  - `over` — the runs of the two parameters, 0 to 1 each unless named.
  - `resolution` — how many samples each way.
  - `tolerance` — how close two ends come before they are read as the same place.

## Animations

An animation takes the marks and a fraction of its span and hands back the marks as they stand at
that fraction. Every one of them is nothing at the beginning of its span. Every mark it adds is in
the list at every fraction, at zero opacity where it is not yet visible. A mark arriving part way
through would turn up in a comparison between two frames as something that changed.

The first argument of each is the name of what it changes, which reaches a mark and every mark under
a group of that name.

- `Animation` — the function itself: the marks and how far along, to the marks at that point.
- `fadeIn(target)` — from nothing to whatever opacity the mark already had, so a mark that is half
  faded by design does not become solid on the way in.
- `fadeOut(target)` — to nothing, from whatever opacity the mark had.
- `fadeTo(target, opacity)` — a mark's own opacity walked to a value, for a figure that wants a
  thing dimmed rather than gone.
- `draw(target)` — drawn on from one end rather than switched on. A text mark has no path to walk
  along, so it fades instead.
- `moveBy(target, offset)` — moved by an offset in figure units, which reaches the geometry rather
  than riding alongside it.
- `moveAlong(target, path)` — carried along a path at a steady pace, by length rather than by piece.
  What it moves is the offset from the path's own start, so a mark placed elsewhere travels the same
  shape from where it stands.
- `rotate(target, angle, options)` — turned about a point, by an angle in radians. A text mark's
  anchor moves and its words stay upright.
- `scale(target, to, options)` — grown or shrunk about a point, from one factor to another.
- `ScaleOptions` — `AboutOptions`, plus:
  - `from` — what it is scaled by at the start of the span, which is its own size.
- `growFrom(target, from)` — grown from nothing at a point. Left out, the point is the middle of the
  box round the marks. At the end of the span it is the marks themselves rather than the marks
  rebuilt through a transform, so a finished growth leaves the geometry the author wrote.
- `AboutOptions` — what a change happening about a point takes.
  - `pivot` — the point it happens about, the middle of the box round the marks unless named.
- `morph(target, into)` — one shape becoming another, point by point, the two paths aligned first. A
  mark with no path is left alone.
- `morphEquation(from, to)` — one typeset expression walked into another, the shared glyphs staying
  put and only the difference moving. A paired glyph is drawn once rather than cross-faded, since
  two copies of one letter at half opacity through the middle of a span is a ghost.
- `countTo(target, from, to, write)` — a number ticking from one value to another, written into a
  text mark. How the value is written is the caller's, so a count of a length and a count of a
  population can round differently.
- `indicate(target, options)` — swelled and settled, to point at something without moving it. Each
  of the mark's own colours is walked towards the colour named and back again.
- `IndicateOptions` — `AboutOptions`, plus:
  - `factor` — how big it gets at the middle of the span.
  - `colour` — the colour it is walked towards, reached at the middle of the span. A colour
    `colourOf` cannot read is held at the far end rather than mixed towards a guess.
- `flash(target, options)` — rays out from a point and gone, for a moment a figure wants a reader to
  look at.
- `FlashOptions` — what a flash takes.
  - `stroke` — how the rays are drawn.
  - `at` — where it flashes from, the middle of the box round the marks unless named.
  - `rays` — how many there are.
  - `reach` — how far the far end of a ray reaches at the widest, in figure units. Twice the
    distance from the middle of the box to its corner unless named, so the rays sit outside the
    thing they point at.
  - `inner` — where the near end of a ray sits, as a share of the reach.
- `circumscribe(target, options)` — a shape drawn round something and then let go. The first half of
  the span draws it on and the second half fades it, so one span is the whole gesture.
- `CircumscribeOptions` — what it takes.
  - `stroke` — how the shape is drawn.
  - `around` — `box`, or the `ellipse` through the same four sides.
  - `padding` — how far outside the box it sits, in figure units.

## The timeline

- `Timeline` — the animations a figure plays and when. Every method hands back a new timeline rather
  than changing this one.
  - `Timeline.empty()` — a timeline with nothing in it.
  - `play(entry, seconds, options)` — one change over a span of that length.
  - `together(entries, seconds, options)` — several changes over one span, which is how two
    things move at once.
  - `stagger(entries, seconds, options)` — a row of changes, each starting a gap after the one
    before and each running the same length.
  - `wait(seconds)` — a gap before the next entry.
  - `at(marks, seconds)` — the marks as every span leaves them at a time. A span that has not
    started is applied at 0 and one already finished is applied in full. That is what makes
    this a function of time rather than a record of what has been played. View entries are
    skipped, since they change no mark.
  - `extentAt(extent, seconds)` — the extent as every view entry leaves it at a time, starting from
    the one given. A timeline with no view entry hands back the extent it was given.
  - `spans` — the spans it holds. `duration` — how long the whole thing runs.
- `Entry` — what one entry changes: an `Animation` over the marks, or a `ViewChange` over the view.
- `Span` — one entry: its `entry`, the seconds it runs `from` and `to`, and the `curve` pacing
  it.
- `PlayOptions` — what playing one change takes.
  - `curve` — how the change is paced. Still at both ends unless a figure says otherwise, because a
    move that starts and stops abruptly reads as a jump.
  - `after` — seconds after the previous entry finished. A negative wait overlaps this animation
    with the one before it.
- `StaggerOptions` — `PlayOptions`, plus:
  - `gap` — seconds between one change starting and the next. A quarter of each change's own length
    unless a figure says otherwise, so a row overlaps rather than running one at a time.

## The figure

- `Figure` — the whole picture.
  - `extent` — how much of the world it shows, fixed or a function of the surface and the clock.
  - `fit` — `contain` or `cover`.
  - `scene` — the tree, either fixed or rebuilt from the clock and the sampled track values.
  - `tracks` — the keyed values the scene reads.
  - `timeline` — the animations it plays.
  - `duration` — overrides the timeline's own length, for a figure that should hold after its last
    animation finishes.
  - `still` — the one time a reader who asked for reduced motion is shown. Every figure names it,
    because a figure stopped at zero often explains nothing.
  - `loop` — whether it ends where it began, which a recording can loop without a jump. `isLoop` is
    what holds that rather than trust.
  - `insets` — the second views of the figure drawn into rectangles of its own frame.
- `TrackValues` — every sampled value by name, which is what a scene function is handed.
- `marksAt(figure, seconds)` — the marks a figure shows at a time. A tapered stroke is turned into
  its filled outline after the timeline has run, so an animation that trims a path trims the
  centreline and the outline follows it.
- `extentAt(figure, seconds, aspect)` — how much of the world a figure shows at a time, after its
  view entries. The extent a figure declares is the base those entries are folded over rather than
  the answer, so this is the call that says where the frame is. A scene placing a mark against the
  frame cannot read it from here, since a view that follows something reads the marks.
- `viewAt(figure, seconds, width, height)` — the matrix a painter needs at a time, in one call. A
  figure whose view moves has to be asked for its extent at the time its marks were asked for.
  Writing that as two calls has two chances to pass different times.
- `durationOf(figure)` — how long a figure runs, which is its own duration where it names one and
  its timeline's otherwise.
- `isLoop(figure, tolerance)` — whether a figure declaring itself a loop actually is one. The
  comparison is by tolerance, because the sine and cosine a figure is built from are not specified
  to the last bit and differ between engines.
- `sameMarks(one, two, tolerance)` — two lists holding the same marks in the same order, to a
  tolerance.

## Insets

An inset is a second view of the same figure, magnified and drawn into a rectangle of the frame,
which is what `ZoomedScene` is in Manim. It reads the marks the figure has already built rather than
building the tree again, so what it shows is the picture at that time and not a second picture that
could disagree about it. The border and the ground behind one are the figure's own marks, since a
frame round a picture is a shape.

- `Inset` — one such view.
  - `shows` — how much of the figure it shows, in the figure's own units, which is the same kind of
    `Extent` the figure itself declares.
  - `into` — the `Bounds` of the frame it is drawn into, in the figure's own units.
  - `fit` — `contain` or `cover`, whether what it shows is held inside that rectangle or fills it.
  - `view` — one `ViewChange` its own extent is put through, applied in full at every time, so an
    inset follows a mark or frames a group by the forms a timeline already carries. There is no span
    and no easing, because an inset that eased into following would show the wrong part of the
    picture while it caught up.
  - `name` — what every mark of the inset has its id begin with, which is what keeps the inset's copy
    of a mark from colliding with the mark itself. `inset` unless named.
  - `hides` — the marks the inset leaves out, named the way an animation names its target. What it is
    for is the panel an inset is drawn on: an inset over the part of the picture its own border and
    ground sit in would magnify them and paint a picture of itself.
- `insetMarks(marks, inset)` — the marks of one inset, given the marks a figure draws. Each one is
  magnified and clipped to the inset's rectangle, and one whose whole reach falls outside it is left
  out. A mark already carrying a clip keeps it, magnified and then cut down to the rectangle.
- `insetMatrix(shows, into, fit)` — the matrix taking what an inset shows onto the rectangle it draws
  into. There is no flip here, unlike `viewMatrix`: both rectangles are in the figure's own units and
  count upward the same way.

## Frames

- `FrameStep` — how far apart the frames are: `fps`, a rate, or `frames`, a count spread over the
  whole figure. A recorder knows the rate it plays at; a strip knows how many pictures fit across a
  page.
- `FramesOptions` — a `FrameStep`, plus the `width` and `height` of the surface the view is built
  for.
- `frameTimesOf(figure, step)` — the times a walk reads, which a recorder needs before it has drawn
  anything to say how far along it is. A walk stops strictly before the duration, so a figure that
  loops never hands back its own first frame twice.
- `framesOf(figure, options)` — a figure walked at a fixed step, a frame at a time. Frames come back
  one at a time, since ten seconds at sixty a second is six hundred frames of every mark a figure
  draws.
- `Frame` — one moment read whole: its `index` in the walk, the `seconds` it was read at, its
  `marks`, and the `view` built at that same time.

## Painters

Both painters read the same list of marks and the same view matrix, so a picture on a page and a
picture in a recording are the same picture.

- `svgMarkup(marks, view, width, height, options?)` — a whole `<svg>` as text, for a page that has
  not run any script yet. It carries no width or height of its own and only a view box, so the
  element around it decides how big it is.
- `SvgMarkupOptions` — what else `svgMarkup` and `paintSvg` take: a `theme`, a `ground`, a
  `minTextSize`, and a `prefix`. Every text size is multiplied by the one factor that brings the
  smallest of them to that size, so the sizes stay in the ratios the figure gave them. The `ground` is
  painted behind the marks as the `background` of the sheet, so the colours land on the ground they
  were measured against wherever the sheet is shown. The `prefix` begins every id written, since an
  id is unique across a document rather than inside one figure, and two figures in one document want
  different prefixes. A gradient is named by the mark that carries it and a clip by its own four
  numbers, since every mark of an inset is cut to the one rectangle and naming that per mark would
  write it once for each of them.
- `SvgTheme` — a `light` and a `dark` colour for each CSS custom property, written into the markup as
  a `<style>` element. A mark painted `var(--ink, #1b1b1b)` takes the value of the ground it is read
  on, and falls back to the colour inside the `var()` where the element is absent.
- `SvgColour` — one colour for each of the two grounds a sheet is read on: a `light` and a `dark`.
  Every entry of an `SvgTheme` is one, and so is the `ground` of `SvgMarkupOptions`.
- `svgElements(marks, view)` — every mark described as an element, in the order they are drawn.
- `SvgElement` — one of those: its `tag`, its `attributes`, the `text` a text element carries, and the
  `children` inside it. A mark is a `path` or a `text`, and the gradients a sheet names are a `defs`
  in front of them holding a `linearGradient` of `stop`s each.
- `paintSvg(into, marks, view, maker, options?)` — the marks put into an element that is already on the page.
  Every child is replaced rather than matched up and patched, since a figure rebuilds its geometry
  every frame and almost every attribute would be rewritten anyway.
- `PaintTarget` — what `paintSvg` draws into: anything with `replaceChildren`.
- `ElementMaker` — what it builds elements with: anything with `createElementNS`.
- `PaintNode` — what those two hand back and take: anything with `setAttribute`, `textContent` and
  `append`. A gradient's stops and a clip's rectangle each go inside the element naming them, and
  `append` is required rather than optional because a clip path holding no rectangle clips away
  everything that references it: a target that could not hold a child would lose every clipped mark
  rather than lose an effect on one.
- `pathToData(path, view)` — the `d` attribute for a path: a move to the start, a cubic per segment,
  and a close where the subpath joins back.
- `paintCanvas(context, marks, view)` — every mark painted onto a canvas context, in order. Each is
  wrapped in a save and a restore, so a mark that sets an opacity or a dash cannot leak it into the
  mark after it.
- `CanvasLike` — the part of a canvas context this package uses, so a recorder can hand in its own. Its
  `createLinearGradient` is optional, and a context without one paints every mark in its single
  colour.
- `CanvasGradientLike` — what a canvas hands back for a gradient: anything with `addColorStop`. A
  canvas takes a gradient as an object built from the context rather than as a value written out.

## Annotations

- `arrow(name, from, to, options)` — a line with a head at the far end. The shaft stops where the
  head begins rather than running under it, because a shaft drawn to the point shows through a head
  that is not fully opaque.
- `ArrowOptions` — what an arrow takes.
  - `stroke` — the shaft.
  - `fill` — the head, filled with the shaft's own colour unless a figure asks for another.
  - `head` — how long the head is, in figure units. Four times the shaft's width by default, which
    keeps a head in proportion to its line at any size.
  - `spread` — how wide the head is across its base, against its length.
- `dot(name, at, radius, fill)` — a filled disc, which is what marks a place a line is pointing at.
- `bracePath(from, to, options)` — a curly brace from one point to the other, as one open subpath of
  six pieces. The tip is a corner rather than a smooth turn, which is what says which point of it is
  being pointed at.
- `BraceOptions` — what a brace takes.
  - `depth` — how far the tip stands off the line between the two points, in figure units. A
    negative depth puts the brace on the other side of that line.
  - `curl` — how wide the curl at each end and at the tip is, in figure units. Half the depth unless
    named, and never more than a quarter of the span, since two curls wider than that would cross.
- `brace(name, from, to, content, options)` — a brace with a word on it, placed beyond the tip on
  the far side from the two points. The label is anchored and never measured, because a box sized to
  fit text would be a different box on two machines.
- `BracedOptions` — `BraceOptions`, plus a `stroke`, `fill` and `size` for the label, and its
  `align`, `baseline`, `family` and `weight`.
  - `padding` — how far beyond the tip the label's anchor sits, in figure units.
- `callout(name, at, to, content, options)` — a word attached to a place: a disc on the place, a
  line out to where there is room, and the word at the end of it. The words sit away from what they
  name because a label on top of the picture hides the thing the reader was told to look at.
- `CalloutOptions` — the `stroke`, `fill` and `size` it is drawn with, and its `align`, `baseline`,
  `family` and `weight`.
  - `marker` — the disc left on the thing being named. Nothing is drawn where this is zero, which is
    what a callout pointing at a moving thing wants.

## Equations

Typesetting is the one call that loads MathJax, so a figure with no equations in it never reaches
that code. It runs at build time, and what a reader downloads is the outlines it wrote.

- `typesetElement(tex)` — one expression typeset, as the tree the typesetter wrote it.
- `EquationElement` — one node of that tree: its `tag`, its `attributes`, its `children`, and the
  `text` a text element carries.
- `equationOf(root)` — that tree read into the marks and the box a figure can place.
- `equationFromTex(tex)` — the two calls above in the order they are always used in.
- `Equation` — the `marks`, one per glyph, and the `box` they were typeset inside.
- `EquationBox` — `x`, `y`, `width` and `height`, in the typesetter's own units.
- `equationNode(name, equation, options)` — a typeset expression placed in a figure: one shape per
  glyph, fitted inside a box and centred on a point. It fits inside both measurements rather than
  being sized by the height alone. An expression twice as wide as it is tall would otherwise run off
  the sides of a narrow figure.
- `EquationOptions` — what placing an expression takes.
  - `at` — the point it is placed against, in figure units.
  - `align` — `start`, `middle` or `end`, which edge of the expression sits on that point across.
    Two expressions placed at one point by their start keep the part they share in the same place.
  - `width`, `height` — the box it is fitted inside, in figure units.
  - `fill` — the colour the glyphs are painted.
- `glyphToken(id)` — what a mark matches on: its leaf name after the first dash. A mark whose leaf
  carries no dash is not a glyph a typesetter wrote, and it pairs with nothing.
- `matchGlyphs(from, to)` — two typeset expressions paired glyph by glyph, with what neither answers
  kept apart. Marks that are not paths are left out, since a glyph is an outline.
- `GlyphMatch` — what that pairing found.
  - `pairs` — each glyph of the first expression beside the glyph of the second it becomes.
  - `leaving` — glyphs of the first expression that no glyph of the second matches.
  - `arriving` — glyphs of the second expression that no glyph of the first matches.
