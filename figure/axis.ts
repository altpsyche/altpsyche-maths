/**
 * A drawn axis: the line, a tick at each of its numbers, and the numbers
 * written beside them.
 *
 * The line takes a direction rather than being rotated into place. A horizontal
 * axis turned on its side would turn its labels with it, and a reader cannot
 * read those, so the two directions place their labels differently and both
 * write them upright.
 */
import { interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { line, polygon } from './path.js';
import { group, shape, text, type GroupNode, type Node } from './node.js';
import { multiplesOn, tickStep, ticksOn } from './ticks.js';
import { scaled, type Coords, type Scale } from './scale.js';
import type { Fill, Stroke } from './mark.js';

export interface NumberLineOptions {
  /** The line, its ticks and the outline of its tips. */
  stroke: Stroke;
  /** The labels and the tips. Nothing is written where this is missing. */
  fill?: Fill;
  /** How big the labels are, in figure units. Nothing is written where this is
   * missing. */
  size?: number;
  /** Where the line sits on the other axis, in figure units. */
  at?: number;
  direction?: 'across' | 'up';
  /** About how many ticks are wanted. The step is a round number, so the count
   * that comes back is near this rather than equal to it. */
  ticks?: number;
  /** How far a tick reaches across the line in total, half of it either side. */
  tickLength?: number;
  /** From the end of a tick to the label's own anchor. */
  gap?: number;
  /** How long the head at each end is. Nothing is drawn where this is zero. */
  tip?: number;
  /** How wide a head is across its base, against its length. */
  spread?: number;
  family?: string;
  weight?: number;
  /** Leaves the label at zero out, which is what a second axis crossing here
   * wants, since both would otherwise write the same number in the same place. */
  skipZero?: boolean;
  /** The number on this line another line crosses it at. The label there is
   * written below and to the left of the crossing rather than under it, since
   * under it is where the other line and its head already are. */
  crossedAt?: number;
}

/** A head pointing along the line, apex at the end and base back along it. */
function head(apex: Vec2, back: Vec2, spread: number) {
  const along = vec2.normalize(vec2.sub(apex, back));
  const across = vec2.scale(vec2.perpendicular(along), (vec2.distance(apex, back) * spread) / 2);
  return polygon([apex, vec2.add(back, across), vec2.sub(back, across)]);
}

/**
 * One axis as a group: the line, the ticks under `ticks`, the labels under
 * `labels`, and the tips under `tips`.
 *
 * Each tick and each label is named after the number it shows rather than by its
 * position in the list. An animation naming a tick then follows that number when
 * the axis is rebuilt with a different range, where a position would quietly
 * follow whichever tick had moved into the slot.
 */
export function numberLine(name: string, scale: Scale, options: NumberLineOptions): GroupNode {
  const across = (options.direction ?? 'across') === 'across';
  const seat = options.at ?? 0;
  const tip = options.tip ?? 0;
  const tickLength = options.tickLength ?? options.stroke.width * 8;
  const size = options.size ?? 0;
  const gap = options.gap ?? size * 0.35;
  const { from: low, to: high } = interval.ordered(scale.units);
  const at = (along: number, off: number): Vec2 => (across ? vec2(along, seat + off) : vec2(seat + off, along));

  // Each head stands beyond the line's end, or the outermost tick stands under a head instead of on
  // the line. The line stops where a head begins, so a head that is not opaque shows nothing through.
  const parts: Node[] = [shape('line', line(at(low, 0), at(high, 0)), { stroke: options.stroke })];

  if (tip > 0 && options.fill) {
    const spread = options.spread ?? 0.6;
    parts.push(
      group('tips', [
        shape('low', head(at(low - tip, 0), at(low, 0), spread), { fill: options.fill }),
        shape('high', head(at(high + tip, 0), at(high, 0), spread), { fill: options.fill }),
      ])
    );
  }

  const step = tickStep(scale.graph, options.ticks);
  const marked = ticksOn(scale.graph, options.ticks);
  const half = tickLength / 2;
  parts.push(
    group(
      'ticks',
      marked.map((tick) => {
        const along = interval.remap(tick.value, scale.graph, scale.units);
        return shape(tick.label, line(at(along, -half), at(along, half)), { stroke: options.stroke });
      })
    )
  );

  if (options.fill && size > 0) {
    // Placed by an anchor and an alignment and never by how wide the text is,
    // so a long label moves nothing else in the figure.
    const written = marked.filter((tick) => !(options.skipZero && tick.value === 0));
    const off = half + gap;
    parts.push(
      group(
        'labels',
        written.map((tick) => {
          const along = interval.remap(tick.value, scale.graph, scale.units);
          const crossed = options.crossedAt !== undefined && tick.value === options.crossedAt;
          const anchor = crossed
            ? across
              ? vec2(along - off, seat - off)
              : vec2(seat - off, along - off)
            : at(along, -off);
          return text(tick.label, anchor, tick.label, size, {
            fill: options.fill,
            family: options.family,
            weight: options.weight,
            align: crossed || !across ? 'end' : 'middle',
            baseline: crossed || across ? 'hanging' : 'middle',
          });
        })
      )
    );
  }

  return group(name, parts);
}

/** Everything a pair of axes hands to each of its two lines. A figure wanting
 * the two to differ builds them as two number lines instead, which is what that
 * call is exported for. */
export type AxesOptions = Omit<NumberLineOptions, 'at' | 'direction' | 'skipZero'>;

/**
 * Two number lines under one group, named `x` and `y`, each crossing the other
 * at that other's zero.
 *
 * Where zero is outside an interval the line sits at the near edge of it instead.
 * An axis drawn at a zero the graph never reaches is an axis off the picture, and
 * a reader is left with labels along an edge that has no line on it.
 */
export function axes(name: string, coords: Coords, options: AxesOptions): GroupNode {
  const holdsOrigin = interval.holds(coords.x.graph, 0) && interval.holds(coords.y.graph, 0);
  const seat = (scale: Scale) => scaled(scale, interval.clampTo(scale.graph, 0));
  return group(name, [
    numberLine('x', coords.x, {
      ...options,
      at: seat(coords.y),
      direction: 'across',
      crossedAt: holdsOrigin ? 0 : undefined,
    }),
    numberLine('y', coords.y, { ...options, at: seat(coords.x), direction: 'up', skipZero: holdsOrigin }),
  ]);
}

export interface NumberPlaneOptions {
  /** The lines standing on the ticks. */
  stroke: Stroke;
  /** How many gaps each step is divided into, so one less than this many lines
   * sit between one tick and the next. Nothing extra is drawn below two. */
  minors?: number;
  /** How much of the stroke a minor line is drawn with, since a grid a reader
   * notices is a grid competing with the curve on top of it. */
  minorOpacity?: number;
  /** How wide a minor line is against a major one. A minor line that differs
   * only in how strong its ink is reads as the same line, so the grid comes out
   * flat and busy. */
  minorWidth?: number;
  ticks?: number;
}

/** Whether a value is a whole number of steps from zero, which is what tells a
 * minor line it is standing where a major one already is. */
function onStep(value: number, step: number): boolean {
  return Math.abs(value / step - Math.round(value / step)) < 1e-9;
}

/** Lines of constant x reaching the full height, and of constant y reaching the
 * full width, at every multiple of the step. */
function gridLines(coords: Coords, step: number, along: 'x' | 'y', skipping?: number): Node[] {
  const scale = along === 'x' ? coords.x : coords.y;
  const other = interval.ordered(along === 'x' ? coords.y.units : coords.x.units);
  const ends = (at: number): [Vec2, Vec2] =>
    along === 'x' ? [vec2(at, other.from), vec2(at, other.to)] : [vec2(other.from, at), vec2(other.to, at)];
  return multiplesOn(scale.graph, step)
    .filter((value) => !(skipping && onStep(value, skipping)))
    .map((value) => {
      const [from, to] = ends(scaled(scale, value));
      return shape(String(value), line(from, to), {});
    });
}

/**
 * The grid behind a graph: a line standing on each tick of both axes, and
 * fainter lines dividing the gaps between them.
 *
 * The minor lines are drawn first and the major ones over them, so a major line
 * a minor one lands on is the one a reader sees. The stroke is handed down from
 * the group rather than set on each line, which is what lets the whole grid fade
 * as one thing.
 */
export function numberPlane(name: string, coords: Coords, options: NumberPlaneOptions): GroupNode {
  const step = { x: tickStep(coords.x.graph, options.ticks), y: tickStep(coords.y.graph, options.ticks) };
  const minors = Math.max(1, Math.round(options.minors ?? 1));
  const parts: Node[] = [];

  if (minors > 1 && step.x > 0 && step.y > 0) {
    parts.push(
      group(
        'minors',
        [
          group('x', gridLines(coords, step.x / minors, 'x', step.x)),
          group('y', gridLines(coords, step.y / minors, 'y', step.y)),
        ],
        {
          style: {
            stroke: { ...options.stroke, width: options.stroke.width * (options.minorWidth ?? 0.6) },
            opacity: options.minorOpacity ?? 0.4,
          },
        }
      )
    );
  }

  parts.push(
    group('majors', [group('x', gridLines(coords, step.x, 'x')), group('y', gridLines(coords, step.y, 'y'))], {
      style: { stroke: options.stroke },
    })
  );

  return group(name, parts);
}
