/**
 * A change to some of the marks, over a span of time.
 *
 * An animation is a function rather than an object with a start and a stop,
 * because the picture at a time has to be the same whichever direction the clock
 * arrived from. Playing forward, dragging a scrub bar backwards and walking a
 * fixed step for a recording all ask the same question and must get the same
 * answer.
 *
 * Each one is given how far through its own span the clock is, already eased, and
 * hands back the marks as they stand at that fraction.
 */
import { mat3 } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { lerp } from '../values/scalar.js';
import { transformPath, type Path } from './path.js';
import { trimPath } from './trim.js';
import { lerpPath } from './morph.js';
import type { Mark } from './mark.js';

export type Animation = (marks: readonly Mark[], along: number) => readonly Mark[];

/**
 * Which marks an animation touches.
 *
 * A target is an id or the front of one, so naming a group reaches everything
 * inside it and naming a mark reaches only that mark. A name that matches
 * nothing changes nothing rather than failing, because a figure being written is
 * often a figure whose parts do not all exist yet.
 */
function touches(id: string, target: string): boolean {
  return id === target || id.startsWith(`${target}/`);
}

function over(target: string, change: (mark: Mark, along: number) => Mark): Animation {
  return (marks, along) => marks.map((mark) => (touches(mark.id, target) ? change(mark, along) : mark));
}

/** From nothing to whatever opacity the mark already had, so a mark that is
 * half faded by design does not become solid on the way in. */
export function fadeIn(target: string): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: (mark.opacity ?? 1) * along }));
}

export function fadeOut(target: string): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: (mark.opacity ?? 1) * (1 - along) }));
}

/** Moved by an offset in figure units, which reaches the geometry rather than
 * riding alongside it, the same way a group's transform does. */
export function moveBy(target: string, offset: Vec2): Animation {
  return over(target, (mark, along) => {
    const step = mat3.translation(vec2.scale(offset, along));
    if (mark.kind === 'text') return { ...mark, at: mat3.transformPoint(step, mark.at) };
    return { ...mark, path: transformPath(mark.path, step) };
  });
}

/**
 * Drawn on from one end rather than switched on.
 *
 * A text mark has no path to walk along, so it fades instead. That is a choice
 * rather than an oversight: drawing letters on stroke by stroke needs outlines,
 * and a text mark is deliberately a string a painter lays out.
 */
export function draw(target: string): Animation {
  return over(target, (mark, along) => {
    if (mark.kind === 'text') return { ...mark, opacity: (mark.opacity ?? 1) * along };
    return { ...mark, path: trimPath(mark.path, along) };
  });
}

/**
 * One shape becoming another, point by point.
 *
 * The two paths are aligned first, so the one with fewer segments is subdivided
 * until both hold the same points. A mark with no path is left alone.
 */
export function morph(target: string, into: Path): Animation {
  return over(target, (mark, along) => {
    if (mark.kind === 'text') return mark;
    return { ...mark, path: lerpPath(mark.path, into, along) };
  });
}

/** A mark's own opacity walked to a value, for a figure that wants a thing dimmed
 * rather than gone. */
export function fadeTo(target: string, opacity: number): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: lerp(mark.opacity ?? 1, opacity, along) }));
}
