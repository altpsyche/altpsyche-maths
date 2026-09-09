/**
 * Several times of one figure laid out together, as one list of marks.
 *
 * It is marks rather than a tree because each frame is the figure with its own
 * timeline applied, and a timeline answers a time rather than a place in a tree.
 * Each frame's marks are carried into its own slot and renamed, so no two frames
 * share an id.
 *
 * The frames go in rows rather than in one line, because a figure several panels
 * wide repeated four times across is many times wider than it is tall, and at the
 * width a page gives it each panel comes out too small to read.
 */
import { interval, marksAt, moveBy, vec2, type Extent, type Figure, type Mark, type Vec2 } from '../index.js';

/** How much wider and taller each frame's slot is than the figure, so a sheet of
 * them has white between the frames rather than one picture running into the
 * next. */
export interface Slot {
  readonly across: number;
  readonly down: number;
}

export interface Strip {
  readonly marks: readonly Mark[];
  readonly extent: Extent;
}

/**
 * The frames of one figure over the times given, `columns` of them to a row.
 *
 * A frame whose view has moved is carried by that move as well as into its slot,
 * which is what `seenAt` answers: the middle the figure's own view reached at
 * that time. Without it a frame sits off its slot by however far the view had
 * travelled.
 *
 * A clip stays where the figure declared it while a mark moves through it, which
 * is the rule an animation wants and the wrong one here: a slot is a second frame
 * rather than a place inside one, so an inset's window travels with the marks it
 * holds or it would cut every frame but the middle away.
 */
export function stripOf(
  figure: Figure,
  root: string,
  times: readonly number[],
  columns: number,
  slot: Slot,
  seenAt: (seconds: number) => Vec2 = () => vec2(0, 0)
): Strip {
  const rows = Math.ceil(times.length / columns);
  const marks = times.flatMap((seconds, frame) => {
    const across = ((frame % columns) - (columns - 1) / 2) * slot.across;
    const up = ((rows - 1) / 2 - Math.floor(frame / columns)) * slot.down;
    const seen = seenAt(seconds);
    const by = vec2(across - seen.x, up - seen.y);
    return moveBy(root, by)(marksAt(figure, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
      clip: mark.clip
        ? {
            x: interval(mark.clip.x.from + by.x, mark.clip.x.to + by.x),
            y: interval(mark.clip.y.from + by.y, mark.clip.y.to + by.y),
          }
        : undefined,
    }));
  });
  return { marks, extent: { width: slot.across * columns, height: slot.down * rows } };
}
