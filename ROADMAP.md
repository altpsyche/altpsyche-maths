# Roadmap

**This file is the only queue.** If a piece of work is not written below, nobody is tracking it.
[DESIGN.md](DESIGN.md) is the design and queues nothing.

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
argument [DESIGN.md](DESIGN.md) makes about timing moving in here before a single figure existed.
So an item earns its place by a picture something is waiting to publish, and the ordering below is a
recommendation until a chapter names one.

## Two decisions that gate the rest

Both are Siva's, and each changes what the items below are allowed to be.

### Where the typesetter goes

An equation is drawn by typesetting TeX, walking the SVG a typesetter emits into marks, and placing
the result. `pathFromData` is the one step of that this package does. Everything else exists, in the
website, as four files and about four hundred lines: the typesetter, the tree walk with its three
refusals, the placement, and a build step that writes one module per equation.

**If a consumer should get equations, MathJax belongs in this package**, and that collides with a
rule in DESIGN.md: one door, held by a test, and no runtime dependencies. The choices are a
dependency every consumer of `lerp` installs, or a second entry point so that only
`@altpsyche/maths/tex` reaches it, which means the one-door rule becomes a two-door rule with a test
that says so. **The recommendation is the second**, because the alternative is a stated goal with an
asterisk on it, and because MathJax runs at build time rather than in a browser, so the cost is an
install rather than bytes a reader downloads.

The three refusals are not optional and are the expensive part to rediscover. A TeX error carries
`data-mjx-error`. A character the font has no outline for arrives as a `<text>` element, which draws
with whatever font a browser has and draws nothing at all in a recording. And `AllPackages` carries
the `noundefined` extension, so an undefined macro is not an error: it comes back as glyph outlines
under `fill="red"`, indistinguishable from an expression that typeset, and a typo ships as a red word
inside the picture.

### Whether a figure stays flat

DESIGN.md says a figure is flat and that three dimensions belong to a renderer with a camera. A large
share of the reference material is not flat: surfaces, vectors in space, an orbiting camera. Keeping
the refusal is a defensible package with a ceiling on it. Lifting it means a camera, a projection and
a depth sort, and it is larger than everything else on this page put together.

## Now

Nothing is queued for work yet. The items below are the gap, ordered, and each one needs its steps
written before it is worked.

## Next

### Axes and plotting

`NumberLine`, `Axes`, `NumberPlane`, ticks and their labels, a function plotted over a range, the area
under a curve, and a tangent that slides along one. **This is the most-used picture in the reference
material and the package has none of it**, so it buys more than anything else here.

The sampler already gives the part that is usually hard. `scene` is a function of `(seconds, values)`
and `tracks` carries the values, so a curve that is genuinely a different curve each frame is what
this package already does rather than something to add.

### The animation vocabulary

Six animations exist: `fadeIn`, `fadeOut`, `fadeTo`, `draw`, `morph`, `moveBy`. Manim has around
forty. The ones whose absence is felt first are rotate, scale, move-along-path, indicate, flash,
circumscribe, grow-from-a-point, and a stagger. **`Timeline` can overlap two animations with a
negative `after` and cannot stagger a list**, so a row of things appearing one after another has to
be written out by hand, one `play` per item.

### One equation morphing into the next

The most recognisable single animation in the reference material: two expressions where the shared
sub-expressions stay put and only the difference moves. `alignPaths` and `lerpPath` are the mechanism
and what is missing is the matching, which needs a glyph to carry where in the expression it came
from. The website's ids already carry each glyph's own code point, which is half of it.

Waits on the typesetter decision.

### A camera that moves

`Extent` is fixed for the life of a figure, so nothing can zoom or pan. An extent that is a function
of time, or a keyed track, closes a whole class of shot for a small change.

### Braces, brackets and a number that counts

`Brace`, a brace with a label on it, and a number that ticks from one value to another. Cheap, and
heavily used by the reference material. `arrow`, `callout` and `dot` are the three that exist.

### Vector fields and streamlines

A field sampled over a region, and a streamline integrated through one. Flat, so nothing here
conflicts with the decision above.

### Boolean operations on paths

Union, intersection and difference. Manim has them and this has no way to express one.

### A renderer

A consumer gets marks and a canvas painter and no way to turn either into a file. The encode step is
in the website rather than here. What is missing is a headless call that walks a figure at a fixed
step and hands back frames.

## Someday

- **Gradients along a stroke or across a fill.** DESIGN.md refuses them under the rule that a mark
  may only ask for what both painters can do, and both painters can do gradients, so the refusal is
  worth re-reading rather than assumed.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
