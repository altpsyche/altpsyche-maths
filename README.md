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

One door, no runtime dependencies. MIT.
