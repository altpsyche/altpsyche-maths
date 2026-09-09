import { describe, expect, it } from 'vitest';
import { circle, colourFrom, flatten, group, hexOf, linear, marksAt, mat3, paintCanvas, rotate, scale, shape, svgMarkup, text, Timeline, transformFill, vec2 } from '@altpsyche/maths';
import type { Figure, Fill, Gradient, Mark } from '@altpsyche/maths';

/**
 * A fill painted with more than one colour.
 *
 * A gradient is stops along a straight axis, and the axis is two points in the
 * mark's own units. What that buys is the transform: a group that moves, turns
 * or scales its children carries the axis with the geometry, so the gradient
 * stays where it was drawn against the shape rather than against the page.
 */

const wash: Gradient = {
  from: vec2(0, 0),
  to: vec2(2, 0),
  stops: [
    { offset: 0, colour: colourFrom('#012') },
    { offset: 0.5, colour: colourFrom('#345') },
    { offset: 1, colour: colourFrom('#678') },
  ],
};

const washed: Fill = { colour: colourFrom('#345'), gradient: wash };

const gradientOf = (mark: Mark | undefined): Gradient => {
  const fill = mark?.kind === 'path' || mark?.kind === 'text' ? mark.fill : undefined;
  if (!fill?.gradient) throw new Error('the mark carries no gradient');
  return fill.gradient;
};

describe('a fill that is a gradient', () => {
  it('reads its stops back off a mark in the order they were given', () => {
    const marks = flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed }));
    const read = gradientOf(marks[0]);
    expect(read.stops.map((stop) => stop.offset)).toEqual([0, 0.5, 1]);
    expect(read.stops.map((stop) => hexOf(stop.colour))).toEqual(['#001122', '#334455', '#667788']);
  });

  it('keeps the one colour beside the stops, which is what a contrast reading takes', () => {
    const marks = flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed }));
    expect(marks[0].kind === 'path' && hexOf(marks[0].fill!.colour)).toBe('#334455');
  });

  it('hands back a fill of one colour untouched', () => {
    const flat: Fill = { colour: colourFrom('#111') };
    expect(transformFill(flat, mat3.scaling(vec2(3, 3)))).toBe(flat);
  });
});

describe('a gradient written as SVG', () => {
  const disc = (name: string) => shape(name, circle(vec2(0, 0), 1), { fill: washed });
  const drawn = (name: string, prefix?: string) =>
    svgMarkup(flatten(disc(name)), mat3.IDENTITY, 10, 10, prefix === undefined ? {} : { prefix });

  it('names the stops in one element inside a defs, in the order they were given', () => {
    const markup = drawn('disc');
    expect(markup).toContain('<defs>');
    expect(markup).toContain('<linearGradient id="disc" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2" y2="0">');
    const stops = [...markup.matchAll(/<stop offset="([^"]*)" stop-color="([^"]*)"\/>/g)];
    expect(stops.map((stop) => stop[1])).toEqual(['0', '0.5', '1']);
    expect(stops.map((stop) => stop[2])).toEqual(['#001122', '#334455', '#667788']);
  });

  it('points the mark at that element rather than at a colour', () => {
    expect(drawn('disc')).toContain('fill="url(#disc)"');
  });

  it('writes the defs in front of the marks that name it', () => {
    const markup = drawn('disc');
    expect(markup.indexOf('<defs>')).toBeLessThan(markup.indexOf('<path'));
  });

  it('writes no defs at all for a sheet with no gradient in it', () => {
    const flat = svgMarkup(flatten(shape('disc', circle(vec2(0, 0), 1), { fill: { colour: colourFrom('#111') } })), mat3.IDENTITY, 10, 10);
    expect(flat).not.toContain('<defs>');
    expect(flat).toContain('fill="#111111"');
  });

  it('gives two figures in one document no repeated id, once each names its own prefix', () => {
    const page = drawn('disc', 'one-') + drawn('disc', 'two-');
    const ids = [...page.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    expect(ids).toEqual(['one-disc', 'two-disc']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('writes every character an id may not carry as its own code point', () => {
    // A mark id is names joined with a slash, and a repeated name gains a hash,
    // neither of which an id may hold. Nothing is dropped and nothing is folded
    // together, so two ids that differ cannot arrive at one.
    const marks = flatten(group('fig', [disc('a/b'), disc('a-b')]));
    const ids = [...svgMarkup(marks, mat3.IDENTITY, 10, 10).matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    expect(ids).toEqual(['fig-2f-a-2f-b', 'fig-2f-a-2d-b']);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('a gradient painted onto a canvas', () => {
  /** A context that writes down the gradients it was asked to build and the
   * stops they were given, since a claim about what a device draws needs a
   * device and this claim is about what the painter asked for. */
  class Recorder {
    readonly built: Array<{ axis: number[]; stops: Array<[number, string]> }> = [];
    fillStyle: unknown = '';
    strokeStyle: unknown = '';
    globalAlpha = 1;
    lineWidth = 1;
    lineCap = 'butt' as const;
    lineJoin = 'miter' as const;
    lineDashOffset = 0;
    font = '';
    textAlign = 'start' as const;
    textBaseline = 'alphabetic' as const;
    filled: unknown[] = [];
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
      const made = { axis: [x0, y0, x1, y1], stops: [] as Array<[number, string]> };
      this.built.push(made);
      return { addColorStop: (offset: number, colour: string) => made.stops.push([offset, colour]) };
    }
    save() {}
    restore() {}
    beginPath() {}
    rect() {}
    clip() {}
    moveTo() {}
    bezierCurveTo() {}
    closePath() {}
    fill() {
      this.filled.push(this.fillStyle);
    }
    stroke() {}
    fillText() {}
    setLineDash() {}
  }

  const painted = () => {
    const recorder = new Recorder();
    paintCanvas(recorder, flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed })), mat3.IDENTITY);
    return recorder;
  };

  it('builds one gradient and gives it the mark’s stops in the order they were given', () => {
    const recorder = painted();
    expect(recorder.built).toHaveLength(1);
    expect(recorder.built[0].stops).toEqual([
      [0, '#001122'],
      [0.5, '#334455'],
      [1, '#667788'],
    ]);
  });

  it('places its axis where the view puts the geometry', () => {
    expect(painted().built[0].axis).toEqual([0, 0, 2, 0]);
  });

  it('fills with the gradient it built rather than with the colour beside it', () => {
    const recorder = painted();
    expect(recorder.filled).toHaveLength(1);
    expect(recorder.filled[0]).not.toBe('#334455');
  });

  it('paints the one colour where a context cannot build a gradient at all', () => {
    class Older extends Recorder {
      // A stand-in written before gradients existed, which is what the optional
      // call on the context is there for.
      override createLinearGradient = undefined as unknown as Recorder['createLinearGradient'];
    }
    const older = new Older();
    paintCanvas(older, flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed })), mat3.IDENTITY);
    expect(older.filled).toEqual(['#334455']);
    expect(older.built).toEqual([]);
  });
});

describe('the axis of a gradient under a transform', () => {
  it('is carried by a group the way the geometry is', () => {
    const inside = shape('disc', circle(vec2(0, 0), 1), { fill: washed });
    const moved = mat3.multiply(mat3.translation(vec2(5, 1)), mat3.scaling(vec2(3, 3)));
    const read = gradientOf(flatten(group('all', [inside], { transform: moved }))[0]);
    expect(read.from).toEqual(vec2(5, 1));
    expect(read.to).toEqual(vec2(11, 1));
  });

  it('is carried under a text mark as well, since text takes a fill too', () => {
    const written = text('word', vec2(0, 0), 'x', 0.3, { fill: washed });
    const read = gradientOf(flatten(group('all', [written], { transform: mat3.scaling(vec2(2, 2)) }))[0]);
    expect(read.to).toEqual(vec2(4, 0));
  });

  it('leaves the stops alone, since a stop is a share of the axis rather than a place', () => {
    const inside = shape('disc', circle(vec2(0, 0), 1), { fill: washed });
    const read = gradientOf(flatten(group('all', [inside], { transform: mat3.scaling(vec2(3, 3)) }))[0]);
    expect(read.stops).toEqual(wash.stops);
  });

  it('turns with a mark an animation turns', () => {
    const figure: Figure = {
      extent: { width: 8, height: 8 },
      still: 1,
      scene: shape('disc', circle(vec2(0, 0), 1), { fill: washed }),
      timeline: Timeline.empty().play(rotate('disc', Math.PI / 2), 1, { curve: linear }),
    };
    const read = gradientOf(marksAt(figure, 1)[0]);
    // A quarter turn about the shape's own middle takes the axis from lying
    // along x to lying along y.
    expect(read.to.x).toBeCloseTo(0, 12);
    expect(read.to.y).toBeCloseTo(2, 12);
  });

  it('grows with a mark an animation scales', () => {
    const figure: Figure = {
      extent: { width: 8, height: 8 },
      still: 1,
      scene: shape('disc', circle(vec2(0, 0), 1), { fill: washed }),
      timeline: Timeline.empty().play(scale('disc', 2), 1, { curve: linear }),
    };
    const read = gradientOf(marksAt(figure, 1)[0]);
    // The disc is scaled about its own middle, which is where the axis begins,
    // so that end holds still and the far end goes twice as far out.
    expect(read.from.x).toBeCloseTo(0, 12);
    expect(read.to.x).toBeCloseTo(4, 12);
  });
});
