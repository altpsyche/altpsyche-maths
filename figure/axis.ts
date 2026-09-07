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
import { tickStep, ticksOn } from './ticks.js';
import type { Scale } from './scale.js';
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

  // The line stops where a head begins rather than running under it, because a
  // line drawn to the point shows through a head that is not fully opaque.
  const parts: Node[] = [shape('line', line(at(low + tip, 0), at(high - tip, 0)), { stroke: options.stroke })];

  if (tip > 0 && options.fill) {
    const spread = options.spread ?? 0.6;
    parts.push(
      group('tips', [
        shape('low', head(at(low, 0), at(low + tip, 0), spread), { fill: options.fill }),
        shape('high', head(at(high, 0), at(high - tip, 0), spread), { fill: options.fill }),
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
    const align = across ? 'middle' : 'end';
    const baseline = across ? 'hanging' : 'middle';
    const written = marked.filter((tick) => !(options.skipZero && tick.value === 0));
    parts.push(
      group(
        'labels',
        written.map((tick) => {
          const along = interval.remap(tick.value, scale.graph, scale.units);
          return text(tick.label, at(along, -(half + gap)), tick.label, size, {
            fill: options.fill,
            family: options.family,
            weight: options.weight,
            align,
            baseline,
          });
        })
      )
    );
  }

  return group(name, parts);
}
