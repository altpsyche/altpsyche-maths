import { describe, expect, it } from 'vitest';
import {
  byAspect,
  easeIn,
  fadeIn,
  group,
  linear,
  mat3,
  marksAt,
  shape,
  circle,
  vec2,
  viewAt,
  Timeline,
} from '@altpsyche/maths';
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

const disc = shape('disc', circle(vec2(0, 0), 1), { fill: { colour: '#000' } });

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
