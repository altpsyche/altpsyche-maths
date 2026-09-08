/**
 * The view moves a figure can name.
 *
 * A view that moved used to be a function of the clock written on the figure, so
 * it could not be sequenced against anything. These are the forms the figure
 * format carries as parameters: a move to an extent, a follow with a margin, and
 * a framing of named marks. A fixed extent and a choice by the shape of the
 * surface are the other two the format names, and both are what a figure already
 * declares.
 *
 * Each is eased over its own span, so a follow that starts after an entrance
 * eases into following rather than snapping to it.
 */
import { clamp, lerp } from '../values/scalar.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { boundsOfMarks, centreOf } from './bounds.js';
import { touches } from './animation.js';
import type { Extent, ViewChange } from './extent.js';
import type { Mark } from './mark.js';

/** Where the middle of a frame sits, which is the origin for an extent that does
 * not name one. */
function middleOf(extent: Extent): Vec2 {
  return extent.centre ?? vec2(0, 0);
}

/** An extent between two, each field walked on its own. */
function between(from: Extent, to: Extent, along: number): Extent {
  const one = middleOf(from);
  const two = middleOf(to);
  return {
    width: lerp(from.width, to.width, along),
    height: lerp(from.height, to.height, along),
    centre: vec2(lerp(one.x, two.x, along), lerp(one.y, two.y, along)),
  };
}

/**
 * A move to an extent, from wherever the entries before it left the view.
 *
 * Fields the move does not name are left as they were, so a figure that only
 * pans writes a centre and a figure that only zooms writes a width and a height.
 */
export function moveView(to: Partial<Extent>): ViewChange {
  return {
    view: (extent, along) =>
      between(
        extent,
        {
          width: to.width ?? extent.width,
          height: to.height ?? extent.height,
          centre: to.centre ?? middleOf(extent),
        },
        along,
      ),
  };
}

export interface FollowOptions {
  /**
   * How far the target may sit from the middle of the frame before the view
   * starts to follow it, in figure units.
   *
   * The view holds still while the target is inside that margin and then pushes
   * exactly as far as it must to hold it there, so what a reader is looking at
   * stays where they are looking. Following exactly leaves the picture with
   * nothing that stands still.
   */
  within?: number;
  /** How far the middle of the frame may travel from where it started. A figure
   * whose picture has its own edges names this so the view stops where the
   * picture does. */
  room?: number;
  /** Which way the view follows. Both unless named. */
  axis?: 'x' | 'y' | 'both';
}

/** How far the middle has to move along one axis to hold a place inside the
 * margin, and no further. */
function pushed(place: number, from: number, within: number, room: number): number {
  const wanted = place - clamp(place - from, -within, within);
  return clamp(wanted, from - room, from + room);
}

/**
 * A view that follows a mark, holding it within a margin of the middle.
 *
 * The target is the middle of the named mark's own bounds, and a name that
 * matches nothing leaves the view alone rather than failing, which is the rule
 * every animation follows.
 */
export function followView(target: string, options: FollowOptions = {}): ViewChange {
  const { within = 0, room = Number.POSITIVE_INFINITY, axis = 'both' } = options;
  return {
    view: (extent, along, marks) => {
      const bounds = boundsOfMarks(marks().filter((mark) => touches(mark.id, target)));
      if (!bounds) return extent;
      const place = centreOf(bounds);
      const from = middleOf(extent);
      const to = vec2(
        axis === 'y' ? from.x : pushed(place.x, from.x, within, room),
        axis === 'x' ? from.y : pushed(place.y, from.y, within, room),
      );
      return between(extent, { ...extent, centre: to }, along);
    },
  };
}

export interface FrameOptions {
  /** How many figure units of margin the framing leaves round the marks. */
  padding?: number;
}

/**
 * A view framing the named marks, keeping the shape of the frame it was handed.
 *
 * The extent is grown to cover the marks rather than fitted to them, because an
 * extent fitted to their bounds would be a different shape at every time and the
 * picture would stretch as the marks moved.
 */
export function frameView(targets: readonly string[], options: FrameOptions = {}): ViewChange {
  const { padding = 0 } = options;
  return {
    view: (extent, along, marks) => {
      const named = marks().filter((mark: Mark) => targets.some((target) => touches(mark.id, target)));
      const bounds = boundsOfMarks(named);
      if (!bounds) return extent;
      const across = bounds.x.to - bounds.x.from + 2 * padding;
      const up = bounds.y.to - bounds.y.from + 2 * padding;
      const shape = extent.width / extent.height;
      const width = Math.max(across, up * shape);
      return between(
        extent,
        { width, height: width / shape, centre: centreOf(bounds) },
        along,
      );
    },
  };
}
