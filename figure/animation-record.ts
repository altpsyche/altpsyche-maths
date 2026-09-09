/**
 * An animation written as data rather than as a call.
 *
 * A record is a kind, the target it changes and its parameters, and
 * `resolveAnimation` hands back the `Animation` the timeline already plays, so
 * nothing below that line moves. A target stays an id or the front of one, which
 * is what lets one name reach a whole group.
 *
 * A parameter here is a plain value rather than an expression. An animation is
 * built once and then asked what the marks are at a fraction of its own span, so
 * a parameter following a track would be read at the time the figure was built
 * and never again.
 */
import { draw, fadeIn, fadeOut, fadeTo, type Animation } from './animation.js';

export interface FadeInRecord {
  readonly kind: 'fadeIn';
  readonly target: string;
}

export interface FadeOutRecord {
  readonly kind: 'fadeOut';
  readonly target: string;
}

/** A fade to an opacity rather than from one, which is what a figure dims a part
 * of itself with. */
export interface FadeToRecord {
  readonly kind: 'fadeTo';
  readonly target: string;
  readonly opacity: number;
}

export interface DrawRecord {
  readonly kind: 'draw';
  readonly target: string;
}

export type AnimationRecord = FadeInRecord | FadeOutRecord | FadeToRecord | DrawRecord;

/**
 * The animation a record describes.
 *
 * A kind outside the set is refused with a sentence naming what was asked for,
 * the way an expression refuses a function it has no entry for. A figure read
 * from a file carries whatever the file says, so the check is at run time rather
 * than in the types alone.
 */
export function resolveAnimation(record: AnimationRecord): Animation {
  switch (record.kind) {
    case 'fadeIn':
      return fadeIn(record.target);
    case 'fadeOut':
      return fadeOut(record.target);
    case 'fadeTo':
      return fadeTo(record.target, record.opacity);
    case 'draw':
      return draw(record.target);
  }
  throw new Error(`an animation has no kind called ${String((record as { kind?: unknown }).kind)}`);
}
