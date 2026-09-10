/**
 * A second view of the same figure, drawn into a rectangle of the frame.
 *
 * An inset magnifies the part of a picture the reader should be looking at while
 * leaving the whole picture in place, which is what `ZoomedScene` is in Manim. It
 * reads the marks the figure has already built rather than building the tree
 * again, so what it shows is the picture at that time and not a second picture
 * that could disagree about it.
 *
 * The rectangle it draws into is in the figure's own units, so a figure places
 * its inset the way it places anything else. What draws the border and the ground
 * behind one is the figure's own marks, since a frame round a picture is a shape
 * and this package already has shapes.
 */
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import { carried, touches } from './animation.js';
import { boundsOf, centreOf, grownBy, overlapOf, type Bounds } from './bounds.js';
import { widestWidth } from './width.js';
import type { Extent, Fit, ViewChange } from './extent.js';
import type { Mark } from './mark.js';

export interface Inset {
  /** How much of the figure the inset shows, in the figure's own units, which is
   * the same kind of extent the figure itself declares. */
  shows: Extent;
  /** The rectangle of the frame the inset is drawn into, in the figure's own
   * units. */
  into: Bounds;
  /** Whether what the inset shows is held inside its rectangle, leaving margins
   * where the two shapes differ, or fills it and runs off two edges. */
  fit?: Fit;
  /**
   * One view move the inset's own extent is put through, applied in full at
   * every time.
   *
   * It is the same `ViewChange` a figure's timeline carries, so an inset follows
   * a mark or frames a group by the forms that already exist. There is no span
   * and no easing, because an inset that eased into following would show the
   * wrong part of the picture while it caught up.
   */
  view?: ViewChange;
  /** What every mark of the inset has its id begin with, which is what keeps the
   * inset's copy of a mark from colliding with the mark itself. `inset` unless
   * named. */
  name?: string;
  /**
   * The marks this inset leaves out, named the way an animation names its
   * target.
   *
   * What it is for is the panel an inset is drawn on: the border and the ground
   * behind one are the figure's own marks, so an inset over the part of the
   * picture they sit in magnifies them and paints a picture of itself.
   */
  hides?: readonly string[];
}

/**
 * The matrix taking what an inset shows onto the rectangle it draws into.
 *
 * There is no flip here, unlike the view matrix: both rectangles are in the
 * figure's own units and count upward the same way, so this is a scale about the
 * middle of what is shown followed by a move to the middle of the rectangle.
 */
export function insetMatrix(shows: Extent, into: Bounds, fit: Fit = 'contain'): Transform2D {
  const across = Math.abs(into.x.to - into.x.from);
  const up = Math.abs(into.y.to - into.y.from);
  const byWidth = across / shows.width;
  const byHeight = up / shows.height;
  const scale = fit === 'cover' ? Math.max(byWidth, byHeight) : Math.min(byWidth, byHeight);
  const seen = shows.centre ?? vec2(0, 0);
  const middle = mat3.translation(centreOf(into));
  const grow = mat3.scaling(vec2(scale, scale));
  const follow = mat3.translation(vec2(-seen.x, -seen.y));
  return mat3.multiply(mat3.multiply(middle, grow), follow);
}

/** A rectangle through a transform that keeps it one, which is every transform
 * an inset applies: the corners are taken lowest first afterwards, since a scale
 * of either sign is allowed and would otherwise give a box the wrong way round. */
function movedBounds(box: Bounds, through: Transform2D): Bounds {
  const one = mat3.transformPoint(through, vec2(box.x.from, box.y.from));
  const other = mat3.transformPoint(through, vec2(box.x.to, box.y.to));
  return {
    x: { from: Math.min(one.x, other.x), to: Math.max(one.x, other.x) },
    y: { from: Math.min(one.y, other.y), to: Math.max(one.y, other.y) },
  };
}

/** How far a mark reaches, which is its geometry and half its stroke width, or
 * nothing for a text mark whose width depends on the machine's fonts. */
function reachOf(mark: Mark): Bounds | null {
  if (mark.kind !== 'path') return null;
  const box = boundsOf(mark.path);
  if (!box) return null;
  return grownBy(box, mark.stroke ? widestWidth(mark.stroke.width) / 2 : 0);
}

/**
 * The marks of one inset, given the marks the figure draws.
 *
 * Every mark is magnified and clipped to the inset's rectangle, and one whose
 * whole reach falls outside that rectangle is left out, as is one the inset
 * hides. A mark already carrying a clip keeps it: its clip is magnified with it
 * and then cut down to the inset's rectangle, so a mark clipped in the figure is
 * clipped the same way in the inset.
 */
export function insetMarks(marks: readonly Mark[], inset: Inset): readonly Mark[] {
  const shows = inset.view ? inset.view.view(inset.shows, 1, () => marks) : inset.shows;
  const through = insetMatrix(shows, inset.into, inset.fit);
  const name = inset.name ?? 'inset';
  const drawn: Mark[] = [];
  for (const mark of marks) {
    if (inset.hides?.some((hidden) => touches(mark.id, hidden))) continue;
    const clip = mark.clip ? overlapOf(movedBounds(mark.clip, through), inset.into) : inset.into;
    if (!clip) continue;
    const moved = carried(mark, through);
    const reach = reachOf(moved);
    if (reach && !overlapOf(reach, clip)) continue;
    drawn.push({ ...moved, id: `${name}/${mark.id}`, clip });
  }
  return drawn;
}
