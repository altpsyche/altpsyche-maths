import { describe, expect, it } from 'vitest';
import { byAspect, circle, colourFrom, easeIn, fadeIn, followView, frameView, group, linear, marksAt, mat3, moveView, shape, Timeline, vec2, viewAt, viewMatrix } from '@altpsyche/maths';
import type { Extent, Figure, ViewChange } from '@altpsyche/maths';

/**
 * A view move as a timeline entry.
 *
 * A view that moves used to be a function of the clock written on the figure, so
 * it sat outside the order everything else is written in and could not be told to
 * start after an entrance or to overlap it. As an entry it is in the same span
 * list as the animations, which is what `after` and `stagger` read.
 */

/** A view entry that walks the frame's middle across to a place, which is enough
 * arithmetic to read a fraction off. The named forms are their own step. */
const moveTo = (x: number): ViewChange => ({
  view: (extent, along) => ({ ...extent, centre: vec2((extent.centre?.x ?? 0) * (1 - along) + x * along, 0) }),
});

/** A view entry that scales the frame about its own middle, for the two-entry
 * case where the second has to see what the first left. */
const zoomBy = (factor: number): ViewChange => ({
  view: (extent, along) => {
    const scale = 1 + (factor - 1) * along;
    return { ...extent, width: extent.width * scale, height: extent.height * scale };
  },
});

const disc = shape('disc', circle(vec2(0, 0), 1), { fill: { colour: colourFrom('#000') } });

const figureWith = (timeline: Timeline | undefined, extent: Extent = { width: 10, height: 10 }): Figure => ({
  extent,
  scene: group('all', [disc]),
  timeline,
  still: 0,
});

/** Where the figure's own origin lands on the surface, which is the one number a
 * move of the frame's middle changes. */
const originAt = (figure: Figure, seconds: number) =>
  mat3.transformPoint(viewAt(figure, seconds, 200, 200), vec2(0, 0)).x;

describe('a figure with no view entry', () => {
  it('gets the extent it declares at every time', () => {
    const line = Timeline.empty().play(fadeIn('all/disc'), 2);
    const figure = figureWith(line);
    for (const seconds of [0, 0.5, 1, 2, 5]) expect(originAt(figure, seconds)).toBeCloseTo(100, 12);
  });

  it('gets the same matrix with a timeline as without one', () => {
    const line = Timeline.empty().play(fadeIn('all/disc'), 2);
    for (const seconds of [0, 1, 2, 3]) {
      const withLine = viewAt(figureWith(line), seconds, 200, 200);
      const without = viewAt(figureWith(undefined), seconds, 200, 200);
      expect(Array.from(withLine)).toEqual(Array.from(without));
    }
  });

  it('still chooses its extent from the shape of the surface', () => {
    // A declared extent given as a function is resolved before the view entries
    // are folded over it, so the shape of the surface still picks the extent.
    const shaped: Figure = {
      ...figureWith(Timeline.empty().play(moveTo(0), 1)),
      extent: byAspect({
        wide: { width: 20, height: 10 },
        square: { width: 10, height: 10 },
        tall: { width: 10, height: 20 },
      }),
    };
    expect(mat3.transformPoint(viewAt(shaped, 1, 400, 200), vec2(10, 0)).x).toBeCloseTo(400, 12);
    expect(mat3.transformPoint(viewAt(shaped, 1, 200, 200), vec2(5, 0)).x).toBeCloseTo(200, 12);
  });
});

describe('a view entry over its own span', () => {
  it('holds the declared extent before it starts and what it reached after it ends', () => {
    const figure = figureWith(Timeline.empty().wait(1).play(moveTo(4), 2, { curve: linear }));
    expect(originAt(figure, 0)).toBeCloseTo(100, 12);
    expect(originAt(figure, 1)).toBeCloseTo(100, 12);
    // A finished span is applied in full, the rule every mark animation follows,
    // so the view stays where the move left it rather than snapping back.
    expect(originAt(figure, 3)).toBeCloseTo(20, 12);
    expect(originAt(figure, 30)).toBeCloseTo(20, 12);
  });

  it('walks the frame at the fraction its own curve gives', () => {
    const paced = figureWith(Timeline.empty().play(moveTo(4), 2, { curve: linear }));
    for (let step = 0; step <= 10; step += 1) {
      const along = step / 10;
      expect(originAt(paced, 2 * along)).toBeCloseTo(100 - 80 * along, 10);
    }
    // The curve is the entry's own, so an eased move reads behind a linear one at
    // the same fraction of its span.
    const eased = figureWith(Timeline.empty().play(moveTo(4), 2, { curve: easeIn }));
    expect(originAt(eased, 1)).toBeGreaterThan(originAt(paced, 1));
    expect(originAt(eased, 2)).toBeCloseTo(20, 12);
  });

  it('is folded in the order it was written, so the second sees what the first left', () => {
    const line = Timeline.empty().play(zoomBy(2), 1, { curve: linear }).play(moveTo(4), 1, { curve: linear });
    const figure = figureWith(line);
    // The zoom halves the pixels per unit, so the move that follows it walks the
    // origin half as far on the surface as it would have alone.
    expect(originAt(figure, 1)).toBeCloseTo(100, 12);
    expect(originAt(figure, 2)).toBeCloseTo(60, 12);
  });
});

describe('a view entry against the animations', () => {
  /**
   * A move overlapping the entrance by half its own length, which is the case a
   * view outside the timeline could not express at all.
   */
  const overlapping = () =>
    Timeline.empty()
      .play(fadeIn('all/disc'), 2, { curve: linear })
      .play(moveTo(4), 2, { curve: linear, after: -1 });

  it('starts where a negative wait puts it, and the marks keep their own pacing', () => {
    const line = overlapping();
    expect(line.spans.map((span) => [span.from, span.to])).toEqual([
      [0, 2],
      [1, 3],
    ]);
    expect(line.duration).toBeCloseTo(3, 12);
    const figure = figureWith(line);
    const opacityAt = (seconds: number) => marksAt(figure, seconds).find((mark) => mark.id === 'all/disc')!.opacity;
    for (let step = 0; step <= 10; step += 1) {
      const seconds = 1 + (2 * step) / 10;
      // The fade is read against its own span of 0 to 2 and the move against its
      // own of 1 to 3, so one entry's overlap does not shift the other's clock.
      expect(opacityAt(seconds)).toBeCloseTo(Math.min(1, seconds / 2), 10);
      expect(originAt(figure, seconds)).toBeCloseTo(100 - 80 * ((seconds - 1) / 2), 10);
    }
  });

  it('mixes with an animation under one span when they are played together', () => {
    const line = Timeline.empty().together([fadeIn('all/disc'), moveTo(4)], 2, { curve: linear });
    expect(line.spans.every((span) => span.from === 0 && span.to === 2)).toBe(true);
    expect(line.duration).toBeCloseTo(2, 12);
    const figure = figureWith(line);
    expect(marksAt(figure, 1).find((mark) => mark.id === 'all/disc')!.opacity).toBeCloseTo(0.5, 10);
    expect(originAt(figure, 1)).toBeCloseTo(60, 12);
  });

  it('leaves the marks alone, since a view entry changes no mark', () => {
    const moved = figureWith(Timeline.empty().play(moveTo(4), 2, { curve: linear }));
    const still = figureWith(undefined);
    for (const seconds of [0, 1, 2]) expect(marksAt(moved, seconds)).toEqual(marksAt(still, seconds));
  });
});

describe('a move to an extent', () => {
  it('walks each field of the extent it was handed to the one it names', () => {
    const figure = figureWith(
      Timeline.empty().play(moveView({ width: 20, height: 5, centre: vec2(3, -1) }), 2, { curve: linear }),
      { width: 10, height: 10 }
    );
    for (let step = 0; step <= 10; step += 1) {
      const along = step / 10;
      const wanted: Extent = {
        width: 10 + 10 * along,
        height: 10 - 5 * along,
        centre: vec2(3 * along, -along),
      };
      const read = viewAt(figure, 2 * along, 200, 200);
      Array.from(viewMatrix(wanted, 'contain', 200, 200)).forEach((value, at) =>
        expect(Array.from(read)[at]).toBeCloseTo(value, 10)
      );
    }
  });

  it('leaves the fields it does not name as they were', () => {
    const panned = figureWith(Timeline.empty().play(moveView({ centre: vec2(4, 0) }), 1, { curve: linear }));
    // A pan changes where the frame's middle sits and not how much it shows, so
    // the pixels per unit are the same at both ends of the move.
    expect(Array.from(viewAt(panned, 0, 200, 200))[0]).toBeCloseTo(20, 12);
    expect(Array.from(viewAt(panned, 1, 200, 200))[0]).toBeCloseTo(20, 12);
    expect(originAt(panned, 0)).toBeCloseTo(100, 12);
    expect(originAt(panned, 1)).toBeCloseTo(20, 12);
  });
});

/** A dot walking across, so a follow has something whose place is a function of
 * the clock. */
const walking = (timeline: Timeline): Figure => ({
  extent: { width: 10, height: 10 },
  scene: (seconds) => group('all', [shape('dot', circle(vec2(seconds, 0), 0.1), { fill: { colour: colourFrom('#000') } })]),
  timeline,
  still: 0,
});

describe('a view that follows a mark', () => {
  const WITHIN = 1.2;

  it('holds the mark inside its margin of the middle and no closer', () => {
    const figure = walking(Timeline.empty().play(followView('all/dot', { within: WITHIN }), 0));
    for (let step = 0; step <= 10; step += 1) {
      const seconds = step / 2;
      const middle = mat3.transformPoint(viewAt(figure, seconds, 200, 200), vec2(0, 0));
      const dot = mat3.transformPoint(viewAt(figure, seconds, 200, 200), vec2(seconds, 0));
      // Twenty pixels to the figure unit at this extent, so the margin on the
      // surface is 24 pixels.
      expect(Math.abs(dot.x - 100)).toBeLessThanOrEqual(WITHIN * 20 + 1e-9);
      // The view stands still while the dot is inside the margin, which is what
      // leaves the picture something that does not move.
      if (seconds <= WITHIN) expect(middle.x).toBeCloseTo(100, 10);
      else expect(middle.x).toBeCloseTo(100 - (seconds - WITHIN) * 20, 10);
    }
  });

  it('stops where its room runs out', () => {
    const figure = walking(Timeline.empty().play(followView('all/dot', { within: WITHIN, room: 2 }), 0));
    // Past a middle of 2 the view holds and the dot walks out of the margin,
    // which is what a figure whose picture has its own edges asks for.
    expect(originAt(figure, 3)).toBeCloseTo(100 - 1.8 * 20, 10);
    expect(originAt(figure, 6)).toBeCloseTo(100 - 2 * 20, 10);
    expect(originAt(figure, 60)).toBeCloseTo(100 - 2 * 20, 10);
  });

  it('follows one way when it is given one axis', () => {
    const across = walking(Timeline.empty().play(followView('all/dot', { within: 0, axis: 'x' }), 0));
    const both = walking(Timeline.empty().play(followView('all/dot', { within: 0, axis: 'both' }), 0));
    const placeOf = (figure: Figure) => mat3.transformPoint(viewAt(figure, 3, 200, 200), vec2(0, 0));
    expect(placeOf(across).x).toBeCloseTo(40, 10);
    expect(placeOf(across).y).toBeCloseTo(100, 10);
    // The dot walks along y at nothing, so following both ways reads the same
    // here and the axis is what the test above separates.
    expect(placeOf(both).y).toBeCloseTo(100, 10);
  });

  it('eases into following over its own span', () => {
    const eased = walking(Timeline.empty().play(followView('all/dot', { within: 0 }), 2, { curve: linear }));
    for (let step = 0; step <= 10; step += 1) {
      const along = step / 10;
      const seconds = 2 * along;
      // The follow is the extent it was handed walked towards the followed one,
      // so at half a span it has closed half the distance.
      expect(originAt(eased, seconds)).toBeCloseTo(100 - seconds * along * 20, 10);
    }
  });

  it('leaves the view alone when its name matches nothing', () => {
    const missing = walking(Timeline.empty().play(followView('all/nothing', { within: 0 }), 0));
    for (const seconds of [0, 1, 3]) expect(originAt(missing, seconds)).toBeCloseTo(100, 12);
  });
});

describe('a view framing named marks', () => {
  const framed = (padding: number) =>
    ({
      extent: { width: 10, height: 5 },
      scene: group('all', [
        shape('left', circle(vec2(-2, 0), 0.5), { fill: { colour: colourFrom('#000') } }),
        shape('right', circle(vec2(2, 1), 0.5), { fill: { colour: colourFrom('#000') } }),
        shape('far', circle(vec2(20, 0), 0.5), { fill: { colour: colourFrom('#000') } }),
      ]),
      timeline: Timeline.empty().play(frameView(['all/left', 'all/right'], { padding }), 1, { curve: linear }),
      still: 0,
    }) satisfies Figure;

  it('covers the named marks and keeps the shape of the frame it was handed', () => {
    const figure = framed(0);
    // The two named discs reach from -2.5 to 2.5 across and -0.5 to 1.5 up, so
    // five across and two up, and a frame of two to one covers that at five.
    const wanted: Extent = { width: 5, height: 2.5, centre: vec2(0, 0.5) };
    Array.from(viewAt(figure, 1, 200, 100)).forEach((value, at) =>
      expect(value).toBeCloseTo(Array.from(viewMatrix(wanted, 'contain', 200, 100))[at], 10)
    );
    for (let step = 0; step <= 10; step += 1) {
      const along = step / 10;
      const between: Extent = {
        width: 10 - 5 * along,
        height: 5 - 2.5 * along,
        centre: vec2(0, 0.5 * along),
      };
      Array.from(viewAt(figure, along, 200, 100)).forEach((value, at) =>
        expect(value).toBeCloseTo(Array.from(viewMatrix(between, 'contain', 200, 100))[at], 10)
      );
    }
  });

  it('grows by its padding on every side, and the taller side may be what drives it', () => {
    // Padded by one the marks reach seven across and four up, and four up at two
    // to one wants eight across, so the height is what sets the width here.
    const wanted: Extent = { width: 8, height: 4, centre: vec2(0, 0.5) };
    Array.from(viewAt(framed(1), 1, 200, 100)).forEach((value, at) =>
      expect(value).toBeCloseTo(Array.from(viewMatrix(wanted, 'contain', 200, 100))[at], 10)
    );
  });

  it('leaves out the marks it does not name', () => {
    // The third disc sits at 20 across, so a framing that reached it would be
    // more than twenty units wide.
    expect(Array.from(viewAt(framed(0), 1, 200, 100))[0]).toBeCloseTo(40, 10);
  });
});

describe('the marks a view reads', () => {
  /** A figure counting how many times its own scene is built, which is what says
   * whether the matrix and the marks are two builds or one. */
  const counted = (timeline: Timeline) => {
    let built = 0;
    const figure: Figure = {
      extent: { width: 10, height: 10 },
      scene: (seconds) => {
        built += 1;
        return group('all', [shape('dot', circle(vec2(seconds, 0), 0.1), { fill: { colour: colourFrom('#000') } })]);
      },
      timeline,
      still: 0,
    };
    return { figure, count: () => built };
  };

  it('is not built at all for a view that reads no mark', () => {
    const { figure, count } = counted(Timeline.empty().play(moveView({ centre: vec2(1, 0) }), 1));
    viewAt(figure, 0.5, 200, 200);
    expect(count()).toBe(0);
  });

  it('is built once however many entries read it', () => {
    const { figure, count } = counted(
      Timeline.empty().together([followView('all/dot', { within: 1 }), frameView(['all/dot'])], 1)
    );
    viewAt(figure, 0.5, 200, 200);
    expect(count()).toBe(1);
  });
});
