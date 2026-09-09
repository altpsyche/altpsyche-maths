# The AltPsyche figure format, version 0

**A figure format is a declarative description of a picture over time.** It carries nodes, a timeline,
value types and expressions, and a program reads one rather than running it.

**This document is the whole format.** The refusals come first, then the version and the file, then
the value types and the expression form every kind is written in terms of, then the paths, the nodes,
the animations, the timeline and the extent, and conformance last. A renderer is written from this
page and needs nothing else.

**Five counts say how large the format is.** Twenty-eight node kinds, fifteen animation kinds,
sixteen forms of path in eighteen kinds, eleven value types, and thirty-seven functions an expression
may call.

## Standing refusals

**These come before the vocabulary, because a reader deciding whether to write a renderer needs the
bound first.** They are the boundary, and they are rules rather than a name: calling this a language
was tried and dropped, since a bigger word invites a bigger thing while Lottie and glTF are both
called formats and both have implementers on several platforms.

- **No loops and no recursion.** An expression evaluates in bounded time or it is not one.
- **No user-defined functions.** The callable vocabulary is named in this document and versioned with
  it.
- **No assignment and no variables.** A bound variable is the sampling parameter and nothing else
  binds.
- **Not Turing-complete, on purpose.** A figure that needs computation the format refuses is written
  by a program that emits a figure.

## Where this lives, and when it moves

**This document is in the package that implements it, and that is deliberate rather than permanent.**
A specification lives apart from its implementation when several implementers with different owners
read it, which is why glTF and Lottie do it and why this does not yet: there is one implementation
and one author.

**The discipline does not need the split and it holds here instead: this document changes before the
code does.** A specification written after the fact is a description of whatever got built.

**It moves out when a second implementation exists**, or when a tool wants the types and the validator
without the whole figures library. That is also when `@altpsyche/figure-format` becomes a package
carrying the types, a validator and the conformance fixtures. Nothing needs those today, since the one
consumer already has them.

## The version is its own

A figure declares which version of the format it is written in. A renderer declares which versions it
reads. Neither number is this package's.

**The version is one whole number and it is 0 today.** A renderer refuses a version it does not read
and names both numbers, its own and the file's. A field added to a kind that leaves what every
existing figure means alone keeps the version. A change to what a field means, a field removed and a
kind removed are each a new version.

## The file

**A file is a JSON document carrying two fields.** `format` is the version of this specification the
figure is written in, and `figure` is the figure.

**A figure carries nine fields and three of them are required.** `extent` is how much of the world
the figure shows in its own units, `scene` is the tree of nodes, and `still` is the one time a reader
who asked for reduced motion is shown. The other six are optional: `fit` is how the extent meets a
frame of a different shape, `tracks` is every value over time by name, `timeline` is the spans,
`duration` is how long the figure runs where that is past the end of its last span, `loop` says the
figure ends where it began, and `insets` is the second views drawn into rectangles of the figure's
own frame.

**A reader takes the fields of an object in any order.** The writer in this package sorts them, so
the bytes of a file are a function of the figure rather than of the order its fields were built in,
which is what lets a byte gate hold a figure at all.

**A refusal names the path of the field, from the figure down**, with the index of a list wherever
one is crossed: `scene.children.2.at.x` rather than `x`. A file is refused before it is drawn rather
than part way through drawing it, since a picture stopped half way says nothing about which field
was wrong.

**A renderer that does not carry a kind a file names refuses the file and names the kind.** A figure
drawn with a piece left out is a wrong picture with nothing to say it went wrong.

**A field a kind does not carry is refused rather than ignored.** A renderer that ignored one would
draw a figure another renderer draws differently with nothing to say the two disagreed, and the
version above is what a new field arrives with instead.

## The value types

**A value type is a record a kind's field holds, and every one of them is JSON.** Eleven of them
carry the whole format, and a kind's field is one of these, an expression over them, or a choice
between named forms.

**A colour is one of them and it sits inside `Style`.** The list was written before a colour stopped
being text, so the count is unchanged and the definition is under `Style` beside `Stroke` and `Fill`.

### `Interval`

Two numbers, `from` and `to`, both required. An interval given either way round reaches the same
width, so a renderer takes the difference without a sign.

### `Scale`

How a run of numbers lands in the figure's own units. `graph` is the `Interval` the axis counts
through and `units` is the `Interval` those numbers land in, both required. A number in the graph
domain becomes a number in figure units by the affine map between the two intervals.

### `Coords`

A `Scale` in `x` and a `Scale` in `y`, both required. Everything a figure draws in the graph domain
takes one of these, and a place in the graph domain becomes a place in figure units by applying each
scale to its own member.

### `Extent`

How much of the world a figure shows, in its own units. `width` and `height` are required and
`centre` is a place, the origin unless named. A figure whose view follows something moves `centre`
rather than moving what it draws.

**An extent in a file is one of three forms.** A bare `Extent`, a `byAspect` choice carrying the
extents to use at each of several frame shapes, or a `matchingAspect` extent carrying the area it
covers and taking its shape from the frame.

### `Bounds`

An `Interval` in `x` and one in `y`, both required, which is a rectangle in the figure's own units. A
clip is one of these, and a clip inside a clip is the rectangle both of them hold, since a group
cannot show what the group above it has already cut away.

### `Mat3`

Nine numbers as a list, column-major, which is the order a group's transform sits outside its
child's: `multiply(a, b)` applies `b` to a point and then `a`.

### `Style`

What a mark is painted with. Every field is optional: `fill`, `stroke`, `opacity`, `family` for the
font, `weight` for it, and `clip` as a `Bounds`.

**A colour is four channels and, where its author gave it one, a name.** `r`, `g` and `b` run from
nothing to 255, `a` from nothing to one, and `name` is the name a page themes the colour under. A
renderer draws the channels. The SVG painter here writes `var(--name, #rrggbb)`, which is the one
painter the name reaches, and a colour with no name is a value a page cannot reach.

**A `Stroke` carries a `colour` and a `width`, both required**, and `cap`, `join`, `dash` and
`dashOffset` beside them. A cap is `butt`, `round` or `square` and a join is `miter`, `round` or
`bevel`. A dash is the lengths of the drawn and undrawn runs in figure units. A width is one number
the whole way or a `Taper`, which is a `from` width, a `to` width and the `curve` the width leaves
the first along. A stroke of two widths is drawn as the filled outline of its own path, since neither
painter here strokes at two widths.

**A `Fill` carries a `colour`**, and `gradient` and `rule` beside it. A fill carrying a gradient is
drawn as the gradient rather than as the colour beside it, and the colour is what anything needing
one colour reads. A gradient is `from` and `to` as places in the mark's own units and `stops` as a
list, each stop an `offset` from nothing to one and a `colour`. The rule is `nonzero` or `evenodd`,
which is how a shape crossing itself decides what is inside.

### `Camera3Choice`

An eye written as data. `eye` and `target` are places in space, `up` is one where it is named, and
`projection` is a choice between two named forms. The choice is a value type rather than the built
camera, because a built camera carries closures and a file carries none.

**A projection is `perspective` or `orthographic` by its `kind`.** A perspective one takes `fov` in
radians, `height` in figure units, `near` and `far`. A parallel one takes `scale`, which is how many
figure units across the frame one world unit becomes. Every field of both is optional and a renderer
supplies the same default the builder does.

### `Equation`

Typeset mathematics as geometry rather than as TeX. `marks` is the list of path marks the typesetter
produced and `box` is the box they were laid out in. A figure carries the geometry because a renderer
in another language has no typesetter, and the one here runs at authoring time.

### `Track`

One value over time, as a list of keys. A key carries a `time` in seconds and a `value`, which is a
number, a list of numbers or a boolean. `smooth` says the curve is flat at that key, which eases the
segments either side, and `curve` is a curve by name, which overrides those flags. A figure's
`tracks` is every track by the name an expression reaches it under.

**Two keys within a hundred and twentieth of a second are one key**, which is half a frame at sixty a
second, so setting a key twice replaces rather than stacks.

**A pair of values a sampler cannot walk between holds the earlier value until the later key's own
time.** A boolean has no half, and two lists of different lengths have no components to pair up.

### `Curve`

A curve by name, and the names are `easeIn`, `easeOut`, `linear`, `overshoot`, `smoothstep` and
`thereAndBack`. A curve is never a function in a file, and a name outside the six is refused.

### `Inset`

A second view drawn into a rectangle of the figure's own frame. `shows` is the `Extent` it shows and
`into` is the `Bounds` it is drawn into, both required. `fit` is how the two shapes meet, and `view`
is one view change its own extent is put through, applied in full at every time. There is no span and
no easing on that move, since an inset easing into a follow would show the wrong part of the picture
while it caught up.

**`name` is what every mark of the inset has its id begin with**, `inset` unless named, which is what
keeps the inset's copy of a mark from colliding with the mark itself. **`hides` is the marks the
inset leaves out**, named the way an animation names its target: the border and the ground behind an
inset are the figure's own marks, so an inset over the part of the picture they sit in would magnify
them and paint a picture of itself.

## The expression form

**An expression is a tree, and a figure's every driven number is one.** It evaluates against the
tracks at the time being drawn and the variables the geometry taking it binds. It has no loops, no
recursion, no assignment and no user-defined functions, which the refusals above state.

**A literal is written as itself.** A number, a boolean, or a place carrying `x` and `y`. A place is
told from the record forms by carrying no `kind`, so a fixed place is written the way every other
fixed place in a figure is.

**Every other form carries a `kind`**, and there are twelve:

| kind | fields | what it is |
| --- | --- | --- |
| `track` | `name` | the value of that track at the time being drawn |
| `variable` | `name` | the value the geometry taking the expression bound under that name |
| `frame` | `name` | the `width`, `height`, `aspect` or `centre` of the frame the figure is drawn in |
| `point` | `x`, `y` | a place whose members are themselves expressions |
| `member` | `of`, `name` | the `x` or the `y` of a place |
| `arithmetic` | `operator`, `left`, `right` | `+`, `-`, `*` or `/` over two numbers or two places |
| `compare` | `operator`, `left`, `right` | `<`, `<=`, `>`, `>=`, `=` or `!=`, which answers a boolean |
| `choice` | `when`, `then`, `otherwise` | one of two expressions, by a boolean |
| `call` | `name`, `arguments` | a call into the vocabulary below |
| `path` | `of` | a path record as a value, for the three functions that read geometry |
| `coords` | `of` | a `Coords` as a value, for `slopeOf` |
| `camera` | `of` | a `Camera3Record` as a value, for `project` |

**The frame a `frame` expression reads is the extent the figure declares, resolved at the aspect
being drawn.** It is never the extent a view change or a follow has moved: a follow resolves its
extent from the marks, so a mark reading that extent would ask for the marks that are being built.
`name` outside those four is refused with the name in the sentence, and so is a `frame` expression in
a figure drawn with no frame, which is a figure whose declared extent is a function read at no aspect.

**A value an expression may have is a number, a boolean, a place, a path, a `Coords` or a camera.**
The last three widen what a call may take rather than what arithmetic works over: neither is added
and neither is compared.

**Division by nothing is left as the infinity the arithmetic gives**, so a field sampled at a pole
reads as a pole rather than being refused.

## The functions an expression may call

**Thirty-seven names, and the set is versioned with this document.** A renderer implements a fixed
list rather than a language, and every one of them is in a standard library already. A name outside
the set is refused with the name in the sentence.

- **Over one number**: `abs`, `sign`, `floor`, `round`, `sqrt`, `exp`, `log`, `sin`, `cos`, `tan`,
  `asin`, `acos`, `atan`.
- **Over two numbers**: `pow`, `atan2`, `min`, `max`, `hypot`.
- **Over three numbers**: `clamp(value, low, high)` and `inverseLerp(from, to, value)`. Over five:
  `remap(value, fromLow, fromHigh, toLow, toHigh)`.
- **`lerp(from, to, along)`**, whose ends are both numbers or both places, since a fraction of the
  way from a number to a place is nothing.
- **Over two places**: `add`, `subtract`, `dot`, `cross`, `distance`.
- **Over one place**: `magnitude`, `normalize`, `perpendicular`, `angle`.
- **A place and a number**: `scale(place, by)` and `rotate(place, radians)`.
- **The four that read a value type**: `lengthOf(path)`, `pointAlong(path, fraction)`,
  `slopeOf(coords, path, x)` and `project(camera, x, y, z)`. `pointAlong` given a path with no points
  in it is refused rather than read, and `project` gives the place whether or not the eye can see it.

## The paths

**A path is a list of subpaths, and every subpath is a run of cubic Bézier pieces.** That is what a
renderer draws, and a figure names one of sixteen forms to say which path it means. Every form
carries a `kind` and the fields below. A form outside the set is refused with the kind in the
sentence.

**A figure may name a producer or write the cubics out, and which of the two is a choice per figure
rather than a rule.** A producer read at authoring time is one frame of a shape a track drives, so a
path a track moves is named and a path fixed for the life of the figure is either.

**Every field below is an expression unless it says otherwise**, so a track drives any of them.

| kind | fields | what it is |
| --- | --- | --- |
| `line` | `from`, `to` | one straight piece between two places |
| `polyline` | `points` | an open run through the places, in order |
| `polygon` | `points` | the same run closed back to its first place |
| `rect` | `corner`, `width`, `height` | a rectangle from the corner at the low end of both axes |
| `circle` | `centre`, `radius` | a closed circle as four cubic quarters |
| `arc` | `centre`, `radius`, `from`, `to` | part of a circle, the angles in radians anticlockwise |
| `plot` | `coords`, `of`, `resolution`, `over` | a curve sampled in the graph domain |
| `parametric` | `coords`, `of`, `resolution`, `over`, `closed` | a curve sampled over a parameter rather than over x |
| `polar` | `coords`, `of`, `resolution`, `over`, `closed` | a curve given as the radius at each angle |
| `implicit` | `coords`, `of`, `level`, `resolution`, `over` | the curve where a function of two numbers reaches a level |
| `areaUnder` | `coords`, `curve`, `baseline` | the region between a curve and a level |
| `tangentAt` | `coords`, `curve`, `x`, `reach` | the straight line touching a curve at one graph x |
| `bracePath` | `from`, `to`, `depth`, `curl` | a curly brace spanning two places |
| `data` | `d` | the path data of an SVG `d` attribute, as a string |
| `cubics` | `subpaths` | the path written out, which is the geometry itself |
| `union` | `first`, `second`, `tolerance` | one of the three boolean operations, by its kind |

**A cubic quarter of a circle is not a quarter circle exactly.** The control distance is
(4/3)·tan(θ/4), which leaves the drawn edge between 2.6 and 2.8 parts in ten thousand of the true
radius, and a renderer holding a circle tighter than that is holding it to something the form does
not say.

**`plot` reads its curve from the bound variable `x`.** The variable is named by this rule rather
than by a field, which keeps the form closed: a figure naming its own variable would make a renderer
look a name up rather than bind one. `resolution` is how many samples the curve is taken at and
`over` is the `Interval` of graph x it is taken across, each a plain number and a pair of expressions
respectively.

**`parametric` reads its curve from the bound variable `t`, `polar` from `angle`, and `implicit` from
`x` and `y` together.** The names are fixed by this rule for the reason `plot`'s is. `parametric`
hands back a place and `polar` a radius, each over the run `over` names, which is nothing to one for a
parameter and a whole turn for an angle. `closed` says the last place joins back to the first, which
is also what makes the direction at the seam read across the join. A negative radius places the point
opposite the angle rather than being refused.

**A parametric curve is cut where it leaves the graph across the width as well as the height**, since
a parameter carries a curve out either way, where a plotted curve is sampled across the width to begin
with. A closed curve that leaves the graph is open stretches, and the stretch the run of the parameter
cuts at its own end is one stretch rather than two.

**`implicit` is the one form whose count of places the figure does not fix.** `resolution` is how many
cells the grid has each way, one number or one per axis, and `over` is the region sampled as two plain
`Interval`s. The curve's places are the crossings the function's own level set makes with that grid,
which the function decides, so a renderer may hand back a different count as a track moves the level.
Every other form here holds its count fixed so that one path can be walked into another by pairing
their places, and a morph over an implicit curve pairs places that need not correspond.

**A crossing is found by halving a cell edge and the direction at it comes from the gradient.** The
curve crosses its own gradient at a right angle, and the region at or above the level is on the left of
the direction a run reads in. A place where the gradient vanishes takes the direction of the chord. A
corner whose value is not a number counts as below the level. A renderer holding a unit circle over a
graph four radii wide closer than 2.3e-7 of the radius at 64 cells is holding it to something this form
does not say, since the joining is the part a renderer may write its own way.

**`areaUnder` and `tangentAt` take the path rather than the function.** Both carry a `curve` as a
path record of its own, so the region and the tangent are read off the same geometry the curve draws
rather than off a second sampling of the function behind it. `baseline` is the graph y the region
closes at, nothing unless named, and `reach` is how far the tangent runs either side in graph units.

**A boolean operation's `kind` is `union`, `intersection` or `difference`**, and `first` and `second`
are path records. `tolerance` is a plain number rather than an expression, since it says how close
two places come before they count as one and nothing a figure animates changes that. The operations
here agree to 1.776e-15 of a figure unit.

**A path in a file may be `data` or `cubics` and the two are not the same claim.** `data` is a string
a renderer parses, including the elliptical arc commands, and `cubics` is the geometry with nothing
left to read.

## The point producers

**A point producer hands back places rather than a path, and a node draws them.** There are three, and
each is a field of the node that draws it rather than a kind of its own.

### The section of a surface

`SectionRecord` is the curve where a plane cuts a surface. `of` is the surface as a place in space
read from the bound variables `u` and `v`, `plane` is a `point` and a `normal` as places in space,
and `options` carries `over` as the runs of the two parameters, `resolution` as one number or one per
parameter, and `tolerance` as how close two ends come before they are read as the same place.

**The runs come back as several rather than one**, since a plane cutting a saddle meets it in two
branches, and a renderer draws each run as its own subpath.

### The curve in space

`SpaceCurveRecord` is a curve in space read from one parameter. `of` is the curve as a place in space
read from the bound variable `t`, `resolution` is how many steps the run is cut into, and `over` is the
run of the parameter as a pair of expressions, nothing to one where it is left out.

**It hands back one step more places than the resolution**, since both ends of the run are included. A
curve that closes hands back its first place again at the end, because the function it reads is what
says so.

**`over` is expressions where a section's and a streamline's parameters are plain.** The count of places
is fixed by the resolution whichever way the run moves, so a curve that grows along itself is a track on
one end of it and the count of places does not change.

### The streamline of a field

`StreamlineRecord` is a run walked through a flat field from a seed. `of` is the field as a vector
read from the bound variable `at`, `from` is the seed, and `options` carries a required `step` in
graph units, `steps` as how many steps the run takes at most in each direction, `within` as the
region the run is held inside, `direction` as `forward`, `backward` or `both`, and `least` as the
magnitude below which the field is taken to have vanished.

**`step` and `steps` are plain numbers rather than expressions.** A step that followed a track would
hand back a different number of points at every time, and a morph pairs two runs up by their points.

**`both` puts the backward half first**, so the points read from one end of the curve to the other.

## The nodes

**A node is a named record with a `kind`, and every one of them carries a `name`.** Three kinds are
the tree itself and the other twenty-five resolve into a tree of those three, so a renderer implementing
`group`, `shape` and `text` and resolving the rest draws every figure there is.

**A name is what an animation and an inset reach a node by**, and a mark's id is the names of the
nodes above it joined by `/`. So a name is unique among its siblings and stable frame to frame.

### The tree's own three

| kind | fields |
| --- | --- |
| `group` | `children` as nodes, `transform` as a `Mat3`, `style` |
| `shape` | `path` as a path record, `style` |
| `text` | `at`, `content`, `size` as a plain number, `options` |

**A group's `style` is inherited by everything under it** and a child naming its own wins over it. A
group's `transform` applies outside its children's, which is the order the column-major product
gives.

**A text node's `content` is a string or a template.** A template carries `template`, the text with
numbered holes where `{0}` is the first and `{{` writes one brace, and `holes`, each a `value` as an
expression and a `precision` the number is rounded and padded to, so a hole a track drives keeps its
width as the number moves.

**A text node's `options` is a `Style` with `align`, `baseline` and `leading` beside it.** Leading is
how far apart two baselines sit against the size, and 1.2 is what a line of type is set at where
nothing asks for more air.

### The flat builders

| kind | fields beyond the name |
| --- | --- |
| `dot` | `at`, `radius`, `fill` |
| `arrow` | `from`, `to`, `options` |
| `brace` | `from`, `to`, `content`, `options` |
| `callout` | `at`, `to`, `content`, `options` |
| `numberLine` | `scale`, `options` |
| `axes` | `coords`, `options` |
| `numberPlane` | `coords`, `options` |
| `riemannBars` | `coords`, `of`, `options` |
| `equationNode` | `equation`, `options` |
| `vectorField` | `coords`, `of`, `options` |

**An arrow's `options` carries a required `stroke`, and `fill`, `head` and `spread` beside it.** The
head is how long the head is in figure units and the spread is how wide, both expressions.

**A brace's `options` carries `stroke`, `fill`, `size` and `depth`, and `curl`, `padding`, `align`,
`baseline`, `family` and `weight` beside them.** A callout's carries `stroke`, `fill` and `size`,
with `marker` as the radius of the disc it plants, and the same four text fields.

**A number line's `options` carries a required `stroke`**, and `fill`, `size`, `at`, `direction`,
`ticks`, `tickLength`, `gap`, `tip`, `spread`, `family`, `weight`, `skipZero` and `crossedAt` beside
it. `direction` is `across` or `up`, `at` is where the line sits on the other axis, `ticks` is the
step between them in graph units, `crossedAt` is where the other axis crosses so a label there is
moved clear, and `skipZero` leaves the label at the crossing off.

**Axes take the same options without `at`, `direction` and `skipZero`**, since a pair of axes decides
those for each of its two lines.

**A number plane's `options` carries a required `stroke`**, with `minors` as how many minor lines
fall between two majors, `minorOpacity` and `minorWidth` as what those are drawn with, and `ticks` as
the major step.

**`riemannBars` reads its curve from the bound variable `x`**, the way `plot` does, and its
`options` carries `over` as the `Interval` of graph x the bars cover.

**An equation node's `options` carries `at`, an expression, so a typeset rule hangs off a frame that
moves.** The equation itself is geometry, since a renderer in another language has no typesetter.

**A vector field's `of` is the field, read from the bound variable `at`**, and its `options` carries
`lengthOf` and `colourFor`. `lengthOf` is an expression of the bound variable `magnitude`, which
spells a constant, a scaling and a clamped curve alike. `colourFor` is a `ColourChoice`: a colour, or
a `bands` form carrying `first` and `then`, where each entry is an `above` threshold and the `colour`
holding above it, read in order so the last threshold a magnitude clears decides.

### The space builders

**Every kind here carries a `camera` as a `Camera3Choice`**, and a place in space is a
`Point3Record`, which is `x`, `y` and `z` as expressions.

| kind | fields beyond the name |
| --- | --- |
| `polyline3` | `points`, `camera`, `options` |
| `dot3` | `at`, `radius`, `fill`, `camera` |
| `text3` | `at`, `content`, `size`, `camera`, `options` |
| `arrow3` | `from`, `to`, `camera`, `options` |
| `scene3` | `items`, `camera` |
| `axes3` | `camera`, `options` |
| `surface3` | `of`, `camera`, `options` |
| `curve3` | `curve`, `camera`, `options`, `style` |
| `sphere3` | `centre`, `radius`, `camera`, `options` |
| `cube3` | `centre`, `size`, `camera`, `options` |
| `cylinder3` | `centre`, `radius`, `height`, `camera`, `options` |
| `torus3` | `centre`, `ring`, `tube`, `camera`, `options` |
| `vectorField3` | `of`, `camera`, `options` |
| `section3` | `curve`, `camera`, `options`, `style` |
| `streamline3` | `runs`, `on`, `camera`, `options`, `style` |

**A run of points cut by the near plane comes back as several runs**, and `options` for a run is a
`Style` with `close` beside it. A run the near plane cut comes back open however `close` is set, since
closing it would draw an edge that is nowhere in the world.

**A dot in space keeps its `radius` in figure units and does not shrink with distance**, since a dot
marks where something is rather than how big it is. A label in space keeps its size and stays
upright for the same reason, and its `options` is a text node's with `offset` beside it, which is how
far the label stands off the point it names.

**`scene3` is what puts pieces in the right order.** Its `items` are entries sorted by depth and
drawn back to front, which is the painter's algorithm. An entry written out is a `points` list and
the `node` drawn for it; an entry that produces many carries a `kind` and is one of the six producers
below.

**Axes in space take `x`, `y` and `z` as the `Interval` each axis covers**, a required `stroke`, and
`fill`, `size`, `ticks`, `tickLength`, `gap`, `names` and the two font fields beside them. `names` is
what each axis is labelled, by `x`, `y` and `z`.

**A surface's `of` is the surface, read from the bound variables `u` and `v`**, and its `options`
carries `shade` and `light`. A `shade` is a `ramp`, which is a list of fills read as even steps from
nothing to one, and a `band`, the stretch of squareness-to-the-light the ramp is spread over. `light`
is the direction the light comes from, a place in space.

**A field in space reads the same way as a flat one**, so `vectorField3` and `fieldArrows3` each
carry `lengthOf` and `colourFor`.

**The four solids are cells over a parametrisation the format names rather than carries.** Each takes
a `centre` as a place in space, its own measurements as expressions, and `options`, which is a
surface's own without `over`, since a solid fixes the runs of its two parameters itself. A sphere
takes a `radius`, a cube a `size` as the length of one edge, a cylinder a `radius` and a `height`, and
a torus a `ring` as how far the middle of the tube stands from the axis and a `tube` as how thick it
is. A cylinder stands on the axis through its centre and a torus lies about it.

**A solid's cells face away from it.** A sphere is one patch, a torus is one, a cylinder is a side and
then the cap above and the cap below, and a cube is six faces named `right`, `left`, `far`, `near`,
`top` and `bottom` in that order. A renderer writing its own parametrisation has to run the two
parameters in the order that faces the cells out, or the solid is shaded as though lit from inside.

**A sphere's poles and a cylinder's cap centres are places a whole edge of the grid collapses to.**
Those cells are drawn rather than dropped, and a renderer reading a cell's direction by crossing two
of its edges gets nothing for them. The direction is the sum over every edge, which is Newell's
method.

**`curve3` draws one run from a curve in space**, taking its places from the producer above rather than
from a list written out, and its `options` is a run in space's own.

**`section3` draws the curve a plane cuts in a surface** and `streamline3` draws `runs` walked
through a flat field and lifted onto the surface named by `on`. Both take their points from a
producer above rather than from a path.

### The six item producers

**These are entries of a `scene3` rather than nodes**, since what each hands back is many pieces the
scene then sorts by depth.

| kind | fields beyond the name | what it is |
| --- | --- | --- |
| `surfaceCells` | `of`, `options` | the surface as a grid of four-cornered cells, each shaded |
| `fieldArrows3` | `of`, `options` | an arrow at each sample of a field in space |
| `sphereCells` | `centre`, `radius`, `options` | a sphere's cells |
| `cubeCells` | `centre`, `size`, `options` | a cube's cells, six faces of them |
| `cylinderCells` | `centre`, `radius`, `height`, `options` | a cylinder's cells, a side and two caps |
| `torusCells` | `centre`, `ring`, `tube`, `options` | a torus's cells |

**Neither carries a camera.** The scene holding them has one, and a producer taking a second could
disagree with it.

## The animations

**An animation names what it moves and how, and the timeline says when.** Every one carries a `kind`
and a `target`, which is the id of a mark or the prefix every mark of a group shares, so one
animation reaches a whole group.

**An animation's numbers are plain numbers rather than expressions.** A track drives the scene and an
animation moves marks the scene has already made, so a figure whose shape follows a value writes that
value into the scene and not into a span.

| kind | fields beyond the target | what it does |
| --- | --- | --- |
| `fadeIn` | none | nothing to fully opaque |
| `fadeOut` | none | fully opaque to nothing |
| `fadeTo` | `opacity` | to the opacity named |
| `draw` | none | the path drawn on from its start to its end |
| `moveBy` | `offset` | shifted by a place |
| `moveAlong` | `path` | placed along a path record, by length rather than by parameter |
| `rotate` | `angle`, `options` | turned by radians, about the middle of its own box unless a `pivot` is named |
| `scale` | `to`, `options` | scaled to a factor, `from` one unless named |
| `growFrom` | `from` | grown out of a place, the middle of its own box unless named |
| `morph` | `into` | walked point by point into another path |
| `morphEquation` | `from`, `to` | one typeset rule walked into another, glyph by glyph |
| `indicate` | `options` | swelled and returned, by a `factor` and to a `colour` |
| `flash` | `options` | rays thrown out and drawn back, by `rays`, `reach` and `inner` |
| `circumscribe` | `options` | a box or an ellipse drawn round it, by `around` and `padding` |
| `countTo` | `from`, `to`, `precision` | a number counted up, written to the precision named |

**`morphEquation` carries `from` and `to` rather than a target**, since what it walks is one node
into another and the pair is the animation.

**A flash's `options` carries a required `stroke`** and `at`, `rays`, `reach` and `inner` beside it,
where `at` is where the rays are thrown from and the two lengths are how far out and how far in they
reach. A circumscribe's carries a required `stroke` with `around` and `padding`.

**A fade is an opacity and never a removal.** A mark faded out is in the list with an opacity of
nothing, so the list of marks at a time has the same ids whichever way the clock came.

## The timeline

**A timeline is its spans and how long the figure runs, and both are data.** `spans` is the list and
`duration` is optional, the last span's own end unless named, which is what holds a figure after its
last animation finishes.

**A span carries an `entry`, a `from` and a `to` in seconds, and a `curve` by name.** The entry is an
animation or a view change, told apart by its kind.

**The offset a call takes and a stagger's gap are not in the format.** A call folds each into the next
span's `from` when it is made, so what a file carries is where every span actually starts.

**A span is read at every time rather than played.** A figure at a time is the marks the scene makes
put through every span that covers that time, which is why a figure scrubs backwards as well as
forwards and why nothing in the format is a step from the frame before.

## The extent and the view

**An extent is one of three forms.** A bare `Extent`, which is a fixed `width`, `height` and
`centre`. A `byAspect` choice, which carries a `wide`, a `square` and a `tall` extent and picks by
the shape of the frame. Or a `matchingAspect` extent, which carries a `height` and takes its width
from the frame, so the area it covers is the frame's own shape.

**A view change is one of three forms, told apart by its `kind`, and each is a span's entry the way
an animation is.** An extent choice carries a `kind` too, and a bare `Extent` carries none, which is
what tells a fixed extent from a choice.

| kind | fields | what it does |
| --- | --- | --- |
| `moveView` | `to` | to another extent, any of whose fields may be left out |
| `followView` | `target`, `options` | the view keeps a named mark near the middle |
| `frameView` | `targets`, `options` | the view opens far enough to hold several marks |

**A follow's `options` carries `within`, `room` and `axis`.** `within` is how far from the middle the
mark may drift before the view moves, `room` is how much of the extent the view may give up to follow
it, and `axis` is `x`, `y` or `both`. A frame's carries `padding`, which is the margin left round what
it holds.

**A view change is a timeline entry rather than a function of the clock.** So a figure's extent at a
time is read the same way its marks are, and an inset carries one view change applied in full at
every time rather than a span.

## The figure

**A figure carries nine fields and three of them are required**, which the file section above states.
`extent`, `scene` and `still` are required; `fit`, `tracks`, `timeline`, `duration`, `loop` and
`insets` are not.

**`scene` is a node and never a function.** A figure whose shape follows a value reaches it through an
expression in that node, which is what keeps a figure a file.

**`still` is the one time a reader who asked for reduced motion is shown**, and `loop` says the
figure ends where it began. A renderer holding a figure to its `loop` compares the marks at nothing
and at the duration by tolerance.

## Conformance

**Two renderers agree if they draw the same marks at the same times.** A mark carries an id, a kind
and the geometry and style it is drawn with, so agreement is a comparison of two lists rather than of
two pictures, and it needs no screen.

**The comparison is by tolerance and never by hash.** `sin`, `cos` and `pow` are not specified to the
last bit in every language, so two renderers computing the same circle differ in the last places of
its control points. A hash makes that a failure with nothing to say what moved.

**What conformance covers is a flat figure.** A figure in space is drawn in the order its scene sorts,
which is the painter's algorithm, and two renderers agreeing on the marks agree on the order. What it
does not cover is anything a depth buffer would decide, since the format has none.

**A cubic quarter of a circle is the one place a tolerance is named rather than chosen.** The control
distance leaves the drawn edge between 2.6 and 2.8 parts in ten thousand of the true radius, so a
renderer is conformant inside that band and wrong outside it in either direction.

## The fixtures

**Five figures are the conformance suite, and each is a file in this repository.**

| file | bytes | what it exercises |
| --- | --- | --- |
| `demos/tangent.figure.json` | 394,881 | the graph domain, a moving view, an inset, two typeset rules, a brace and a field |
| `demos/surface.figure.json` | 266,174 | a surface, a plane, a section, streamlines, axes in space and an orbiting camera |
| `demos/boolean.figure.json` | 13,914 | the three boolean operations through no crossing, one, two and containment |
| `demos/rotate.figure.json` | 8,244 | a rotation about a box's middle and about a named place, and a loop |
| `demos/frame.figure.json` | 6,360 | a mark placed against the frame beside one placed in the figure's own units |

**Each carries `format` 0 and reads with no renderer at all.** A reader in another language that draws
the same marks at these figures' named times, inside the tolerances above, is conformant.

## The design behind it

[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) is the reasoning: which surfaces refactored in which
repository, what was deliberately left out, and why each answer is the one it is. It is history rather
than specification, and nothing in it is needed to read a figure.
