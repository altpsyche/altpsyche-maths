import { describe, expect, it } from 'vitest';
import { alignPaths, circle, colourFrom, draw, durationOf, fadeIn, fadeOut, fadeTo, flatten, group, isLoop, lerpPath, line, linear, marksAt, morph, moveBy, pointCount, polygon, sameMarks, shape, text, Timeline, trimPath, vec2 } from '@altpsyche/maths';
import type { Figure, Mark, PathMark } from '@altpsyche/maths';

/**
 * The clock half. What every case here is really checking is that a time gives
 * one answer: a span not yet reached is applied at nothing and one already
 * finished is applied in full, so nothing depends on how the clock arrived.
 */

const pen = { colour: colourFrom('#fff'), width: 1 };
const ink = { colour: colourFrom('#fff') };
const only = (marks: readonly Mark[]) => marks[0] as PathMark;

const oneLine = (name = 'l') => group('g', [shape(name, line(vec2(0, 0), vec2(10, 0)), { stroke: pen })]);

describe('trimPath', () => {
  it('gives the path back untouched once it is whole', () => {
    const path = circle(vec2(0, 0), 1);
    expect(trimPath(path, 1)).toBe(path);
    expect(trimPath(path, 2)).toBe(path);
  });

  it('has nothing at all before it starts', () => {
    expect(trimPath(circle(vec2(0, 0), 1), 0)).toEqual([]);
  });

  it('cuts a straight line at the fraction of its length', () => {
    const half = trimPath(line(vec2(0, 0), vec2(10, 0)), 0.5);
    expect(half[0].curves[half[0].curves.length - 1].to.x).toBeCloseTo(5, 6);
  });

  it('cuts by length rather than by segment, so an uneven shape draws evenly', () => {
    // A long side then a short one. At three quarters the pen is still on the
    // long side, which counting segments would have finished long before.
    const path = polygon([vec2(0, 0), vec2(100, 0), vec2(100, 1)]);
    const drawn = trimPath(path, 0.4);
    expect(drawn[0].curves).toHaveLength(1);
    expect(drawn[0].curves[0].to.x).toBeGreaterThan(70);
  });

  it('opens a closed shape it has not finished', () => {
    expect(trimPath(circle(vec2(0, 0), 1), 0.5)[0].closed).toBe(false);
    expect(trimPath(circle(vec2(0, 0), 1), 1)[0].closed).toBe(true);
  });
});

describe('alignPaths and lerpPath', () => {
  it('gives two paths the same number of points without changing either shape', () => {
    const [a, b] = alignPaths(line(vec2(0, 0), vec2(1, 0)), circle(vec2(0, 0), 1));
    expect(pointCount(a)).toBe(pointCount(b));
    expect(a[0].start).toEqual({ x: 0, y: 0 });
  });

  it('lands exactly on each end', () => {
    const from = line(vec2(0, 0), vec2(1, 0));
    const to = line(vec2(5, 5), vec2(6, 5));
    expect(lerpPath(from, to, 0)[0].start).toEqual({ x: 0, y: 0 });
    expect(lerpPath(from, to, 1)[0].start).toEqual({ x: 5, y: 5 });
  });

  it('walks halfway to halfway', () => {
    const middle = lerpPath(line(vec2(0, 0), vec2(1, 0)), line(vec2(10, 0), vec2(11, 0)), 0.5);
    expect(middle[0].start.x).toBeCloseTo(5, 10);
  });

  it('grows a shape out of a point where the other side has fewer subpaths', () => {
    const two = [...line(vec2(0, 0), vec2(1, 0)), ...line(vec2(2, 0), vec2(3, 0))];
    const [a, b] = alignPaths(line(vec2(0, 0), vec2(1, 0)), two);
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
    expect(a[1].curves.every((curve) => curve.to.x === 0 && curve.to.y === 0)).toBe(true);
  });
});

describe('animations', () => {
  it('fades in from nothing and out to nothing', () => {
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0 }, 0);
    expect(fadeIn('g/l')(marks, 0)[0].opacity).toBe(0);
    expect(fadeIn('g/l')(marks, 1)[0].opacity).toBe(1);
    expect(fadeOut('g/l')(marks, 1)[0].opacity).toBe(0);
  });

  it('keeps a mark already dimmed dim on the way in', () => {
    const dim = group('g', [shape('l', line(vec2(0, 0), vec2(1, 0)), { stroke: pen, opacity: 0.4 })]);
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: dim, still: 0 }, 0);
    expect(fadeIn('g/l')(marks, 1)[0].opacity).toBeCloseTo(0.4, 10);
  });

  it('reaches a whole group by naming it, and nothing outside it', () => {
    const tree = group('fig', [group('axes', [shape('x', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })]), shape('dot', circle(vec2(0, 0), 1), { fill: ink })]);
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: tree, still: 0 }, 0);
    const faded = fadeOut('fig/axes')(marks, 1);
    expect(faded[0].opacity).toBe(0);
    expect(faded[1].opacity).toBe(1);
  });

  it('changes nothing for a name that matches nothing', () => {
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0 }, 0);
    expect(fadeOut('nowhere')(marks, 1)).toEqual(marks);
  });

  it('moves the geometry rather than carrying an offset beside it', () => {
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0 }, 0);
    expect(only(moveBy('g/l', vec2(4, 0))(marks, 0.5)).path[0].start.x).toBeCloseTo(2, 10);
  });

  it('draws a path on and fades text, which has no path to walk', () => {
    const both = group('g', [shape('l', line(vec2(0, 0), vec2(10, 0)), { stroke: pen }), text('t', vec2(0, 0), 'hi', 1, { fill: ink })]);
    const marks = draw('g')(marksAt({ extent: { width: 1, height: 1 }, scene: both, still: 0 }, 0), 0.5);
    expect((marks[0] as PathMark).path[0].curves[0].to.x).toBeCloseTo(5, 6);
    expect(marks[1].opacity).toBeCloseTo(0.5, 10);
  });

  it('walks one shape into another and lands on it', () => {
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0 }, 0);
    const landed = only(morph('g/l', line(vec2(0, 5), vec2(10, 5)))(marks, 1));
    expect(landed.path[0].start.y).toBeCloseTo(5, 10);
  });

  it('dims to a value rather than to nothing', () => {
    const marks = marksAt({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0 }, 0);
    expect(fadeTo('g/l', 0.2)(marks, 1)[0].opacity).toBeCloseTo(0.2, 10);
  });
});

describe('Timeline', () => {
  const base = { extent: { width: 20, height: 10 }, scene: oneLine(), still: 0 };

  it('lays entries end to end and reports how long that is', () => {
    const line1 = Timeline.empty().play(fadeIn('g'), 1).wait(0.5).play(fadeOut('g'), 2);
    expect(line1.duration).toBe(3.5);
    expect(line1.spans.map((span) => [span.from, span.to])).toEqual([
      [0, 1],
      [1.5, 3.5],
    ]);
  });

  it('overlaps two changes asked to happen together', () => {
    const together = Timeline.empty().together([fadeIn('g'), moveBy('g', vec2(1, 0))], 2);
    expect(together.duration).toBe(2);
    expect(together.spans.every((span) => span.from === 0 && span.to === 2)).toBe(true);
  });

  it('hands back a new timeline rather than changing the one it was called on', () => {
    const empty = Timeline.empty();
    empty.play(fadeIn('g'), 1);
    expect(empty.spans).toHaveLength(0);
    expect(empty.duration).toBe(0);
  });

  it('holds a span at nothing before it starts and in full once it is done', () => {
    const figure: Figure = { ...base, timeline: Timeline.empty().wait(1).play(fadeIn('g'), 1) };
    expect(marksAt(figure, 0)[0].opacity).toBe(0);
    expect(marksAt(figure, 1.5)[0].opacity).toBeCloseTo(0.5, 10);
    expect(marksAt(figure, 5)[0].opacity).toBe(1);
  });

  it('gives one answer for a time however the clock reached it', () => {
    const figure: Figure = { ...base, timeline: Timeline.empty().play(moveBy('g', vec2(10, 0)), 2, { curve: linear }) };
    const forwards = marksAt(figure, 1);
    void marksAt(figure, 1.9);
    const backwards = marksAt(figure, 1);
    expect(sameMarks(forwards, backwards)).toBe(true);
  });

  it('eases still at both ends unless a figure says otherwise', () => {
    const smooth: Figure = { ...base, timeline: Timeline.empty().play(moveBy('g', vec2(10, 0)), 2) };
    const straight: Figure = { ...base, timeline: Timeline.empty().play(moveBy('g', vec2(10, 0)), 2, { curve: linear }) };
    expect(only(marksAt(smooth, 0.5)).path[0].start.x).toBeCloseTo(1.5625, 6);
    expect(only(marksAt(straight, 0.5)).path[0].start.x).toBeCloseTo(2.5, 6);
  });
});

describe('figure', () => {
  it('rebuilds the geometry from a keyed value rather than only moving it', () => {
    const figure: Figure = {
      extent: { width: 10, height: 10 },
      still: 0,
      duration: 2,
      tracks: { radius: [{ time: 0, value: 1 }, { time: 2, value: 3 }] },
      scene: (_seconds, values) => group('g', [shape('c', circle(vec2(0, 0), values.radius as number), { stroke: pen })]),
    };
    expect(only(marksAt(figure, 0)).path[0].start.x).toBeCloseTo(1, 10);
    expect(only(marksAt(figure, 1)).path[0].start.x).toBeCloseTo(2, 10);
    expect(only(marksAt(figure, 2)).path[0].start.x).toBeCloseTo(3, 10);
  });

  it('takes its length from the timeline unless it was given one', () => {
    const timeline = Timeline.empty().play(fadeIn('g'), 3);
    expect(durationOf({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0, timeline })).toBe(3);
    expect(durationOf({ extent: { width: 1, height: 1 }, scene: oneLine(), still: 0, timeline, duration: 8 })).toBe(8);
  });

  it('knows whether a figure declaring itself a loop actually is one', () => {
    const shut: Figure = {
      extent: { width: 10, height: 10 },
      still: 0,
      duration: 2,
      tracks: { turn: [{ time: 0, value: 0 }, { time: 2, value: Math.PI * 2 }] },
      scene: (_s, values) => group('g', [shape('d', circle(vec2(Math.cos(values.turn as number), Math.sin(values.turn as number)), 1), { stroke: pen })]),
    };
    const open: Figure = { ...shut, timeline: Timeline.empty().play(moveBy('g', vec2(5, 0)), 2) };
    expect(isLoop(shut)).toBe(true);
    expect(isLoop(open)).toBe(false);
  });
});

describe('a row of changes staggered', () => {
  const six = Array.from({ length: 6 }, (_, at) => fadeIn(`fig/part${at}`));

  it('starts each one a gap after the one before', () => {
    const line = Timeline.empty().stagger(six, 0.8, { gap: 0.2 });
    // Each start is the one before plus the gap, so the row carries play's own
    // accumulation and lands within a nanosecond rather than exactly.
    line.spans.forEach((span, at) => expect(span.from).toBeCloseTo(0.2 * at, 12));
    expect(line.duration).toBeCloseTo(1.8, 12);
  });

  it('runs as long as one change plus the gaps between them', () => {
    // Five gaps between six changes, and the last one still runs its own length.
    const line = Timeline.empty().stagger(six, 0.8, { gap: 0.2 });
    expect(line.duration).toBeCloseTo(0.8 + 0.2 * 5, 12);
  });

  it('is the same list of spans as writing it out by hand', () => {
    const staggered = Timeline.empty().stagger(six, 0.8, { gap: 0.2 });
    let byHand = Timeline.empty();
    six.forEach((animation, at) => {
      byHand = byHand.play(animation, 0.8, at === 0 ? {} : { after: 0.2 - 0.8 });
    });
    expect(staggered.spans.map((span) => span.from)).toEqual(byHand.spans.map((span) => span.from));
    expect(staggered.spans.map((span) => span.to)).toEqual(byHand.spans.map((span) => span.to));
    expect(staggered.duration).toBe(byHand.duration);
  });

  it('leaves a quarter of each change between them where no gap is named', () => {
    const line = Timeline.empty().stagger(six, 0.8);
    expect(line.spans[1].from).toBeCloseTo(0.2, 12);
    expect(line.duration).toBeCloseTo(0.8 + 0.2 * 5, 12);
  });

  it('is every change at once at no gap at all', () => {
    const line = Timeline.empty().stagger(six, 0.8, { gap: 0 });
    expect(new Set(line.spans.map((span) => span.from))).toEqual(new Set([0]));
    expect(line.duration).toBeCloseTo(0.8, 12);
  });

  it('never runs a change before the one before it', () => {
    const line = Timeline.empty().stagger(six, 0.8, { gap: -1 });
    expect(new Set(line.spans.map((span) => span.from))).toEqual(new Set([0]));
  });

  it('starts the whole row after a wait a figure asks for', () => {
    const line = Timeline.empty().play(fadeIn('fig/first'), 0.5).stagger(six, 0.8, { gap: 0.2, after: 0.3 });
    expect(line.spans[1].from).toBeCloseTo(0.8, 12);
    expect(line.spans[2].from).toBeCloseTo(1, 12);
  });

  it('shows each part arriving in turn', () => {
    const tree = group(
      'fig',
      Array.from({ length: 6 }, (_, at) => shape(`part${at}`, circle(vec2(at, 0), 0.2), { fill: { colour: colourFrom('#222') } }))
    );
    const line = Timeline.empty().stagger(six, 0.8, { gap: 0.2 });
    const shown = line.at(flatten(tree), 0.5).map((mark) => (mark.opacity ?? 1) > 0.01);
    expect(shown).toEqual([true, true, true, false, false, false]);
  });
});
