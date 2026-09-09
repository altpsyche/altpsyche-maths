# The AltPsyche figure format, version 0

**A figure format is a declarative description of a picture over time.** It carries nodes, a timeline,
value types and expressions, and a program reads one rather than running it.

**Three sections are written and the vocabulary is not.** The standing refusals, the version and the
file are below in full. Every kind and its parameters is still a list of what has to be specified,
taken from the planning in [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md), which is the design and the
reason.

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
- **Eleven value types**: `Coords`, `Scale`, `Interval`, `Extent`, `Camera3Choice`, `Mat3`, `Style`
  with its `Stroke`, its `Fill` and the `Bounds` it carries as a clip, `Equation`, a `Track`, a
  `Curve` and an `Inset`. The choice is in this list rather than the `Camera3` it builds, because the
  built one carries closures.
- **The expression form**: a literal, a track reference, a bound variable, arithmetic, a comparison
  with a choice, a member of a value, or a call into a named and versioned function vocabulary.
- **The standing refusals**, in the first section rather than an appendix: no loops, no recursion, no
  user-defined functions, no assignment, and not Turing-complete. A reader deciding whether to write
  a renderer needs the bound before the vocabulary.
- **The version field**, which the section above answers.
- **Conformance**: two renderers agree if they draw the same marks at the same times, compared by
  tolerance and never by hash. That covers a flat figure and covers nothing a depth buffer does.

## The inventory it is written from

[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) carries the inventory with every kind and its parameters, which
surfaces refactor in which repository, and what is deliberately left out.
