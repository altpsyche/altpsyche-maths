# The AltPsyche figure format, version 0

**A figure format is a declarative description of a picture over time.** It carries nodes, a timeline,
value types and expressions, and a program reads one rather than running it.

**The refusals, the version, the file, the value types and the expression form are written.** Every
kind and its parameters is still a list of what has to be specified, taken from the planning in
[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md), which is the design and the reason.

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

**Every other form carries a `kind`**, and there are ten:

| kind | fields | what it is |
| --- | --- | --- |
| `track` | `name` | the value of that track at the time being drawn |
| `variable` | `name` | the value the geometry taking the expression bound under that name |
| `point` | `x`, `y` | a place whose members are themselves expressions |
| `member` | `of`, `name` | the `x` or the `y` of a place |
| `arithmetic` | `operator`, `left`, `right` | `+`, `-`, `*` or `/` over two numbers or two places |
| `compare` | `operator`, `left`, `right` | `<`, `<=`, `>`, `>=`, `=` or `!=`, which answers a boolean |
| `choice` | `when`, `then`, `otherwise` | one of two expressions, by a boolean |
| `call` | `name`, `arguments` | a call into the vocabulary below |
| `path` | `of` | a path record as a value, for the three functions that read geometry |
| `coords` | `of` | a `Coords` as a value, for `slopeOf` |
| `camera` | `of` | a `Camera3Record` as a value, for `project` |

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

## What has to be specified

- **Twenty-three node kinds**, each with its parameters, and the two item producers a `scene3`
  holds beside its nodes.
- **Thirteen forms of path in fifteen kinds**: the ten producers a figure names with their
  parameters, a path written out as cubics, the path data of an SVG `d` attribute, and one form
  carrying the three boolean operations. A figure names a producer and stores cubics both, since a
  producer read at authoring time is one frame of a shape a track drives. And **two point
  producers**, which hand back the points a path is then drawn through.
- **Fifteen animation kinds**, each with its parameters.
- **The timeline**, which is the compiled spans and how long the figure runs. A span is an entry, a
  `from`, a `to` and a curve by name. The `after` offset a call takes and a stagger's gap are not in
  the format, since a call folds each into the next span's `from` when it is made.
- **The extent**, which is a fixed extent, a choice on the frame's aspect or one matching an aspect,
  and the three view moves folded over it: a move to another extent, a follow of a named mark, and a
  framing of several.
- **The standing refusals**, in the first section rather than an appendix: no loops, no recursion, no
  user-defined functions, no assignment, and not Turing-complete. A reader deciding whether to write
  a renderer needs the bound before the vocabulary.
- **The version field**, which the section above answers.
- **Conformance**: two renderers agree if they draw the same marks at the same times, compared by
  tolerance and never by hash. That covers a flat figure and covers nothing a depth buffer does.

## The inventory it is written from

[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) carries the inventory with every kind and its parameters, which
surfaces refactor in which repository, and what is deliberately left out.
