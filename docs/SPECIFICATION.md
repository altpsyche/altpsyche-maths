# The AltPsyche figure format, version 0

**A figure format is a declarative description of a picture over time.** It carries nodes, a timeline,
value types and expressions, and a program reads one rather than running it.

**This is a stub.** The specification is not written. What is below is what it has to contain, taken
from the planning in [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md), which is the design and the reason.

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

## What has to be specified

- **Nineteen node kinds**, each with its parameters.
- **Five path producers**, and whether a figure stores their output as cubics or names them with
  parameters. That choice is open.
- **Fifteen animation kinds**, each with its parameters.
- **The timeline**, which is a sequence of entries each carrying animations, a duration, an `after`
  offset that may be negative so two runs overlap, and a `gap` for a stagger.
- **The extent**, including a view that follows something, which is a function of the clock today.
- **Nine value types**: `Coords`, `Scale`, `Interval`, `Extent`, `Camera3`, `Mat3`, `Style` with its
  `Stroke` and `Fill`, `Equation`, and a `Track`.
- **The expression form**: a literal, a track reference, a bound variable, arithmetic, a comparison
  with a choice, a member of a value, or a call into a named and versioned function vocabulary.
- **The standing refusals**, in the first section rather than an appendix: no loops, no recursion, no
  user-defined functions, no assignment, and not Turing-complete. A reader deciding whether to write
  a renderer needs the bound before the vocabulary.
- **The version field**, what a renderer does with a version it does not know, and what a major means.
- **Conformance**: two renderers agree if they draw the same marks at the same times, compared by
  tolerance and never by hash. That covers a flat figure and covers nothing a depth buffer does.

## The inventory it is written from

[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) carries the inventory with every kind and its parameters, which
surfaces refactor in which repository, and what is deliberately left out.
