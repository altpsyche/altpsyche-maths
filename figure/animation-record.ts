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
 * and never again. A path is the exception, since a path record is the only form
 * a path has and its own parameters are expressions, so the bindings a figure is
 * built with reach it.
 *
 * The point a turn or a growth happens about stays in the options the calls
 * already take. It is read off the marks as they arrive where a record names
 * none, which is what keeps a turn of a whole circle ending where it began.
 */
import type { Vec2 } from '../values/vec2.js';
import {
  draw,
  fadeIn,
  fadeOut,
  fadeTo,
  growFrom,
  moveAlong,
  moveBy,
  rotate,
  scale,
  type AboutOptions,
  type Animation,
  type ScaleOptions,
} from './animation.js';
import { resolvePath, type PathRecord } from './path-record.js';
import type { Bindings } from './expression.js';

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

export interface MoveByRecord {
  readonly kind: 'moveBy';
  readonly target: string;
  readonly offset: Vec2;
}

/**
 * Marks carried along a path at a steady pace.
 *
 * The path is a record, so a figure carrying something along a curve it also
 * draws names the same form twice rather than writing the curve out as cubics
 * beside the one it draws.
 */
export interface MoveAlongRecord {
  readonly kind: 'moveAlong';
  readonly target: string;
  readonly path: PathRecord;
}

/** A turn about a point, which is the middle of the box round the marks unless
 * the record names one. */
export interface RotateRecord {
  readonly kind: 'rotate';
  readonly target: string;
  readonly angle: number;
  readonly options?: AboutOptions;
}

export interface ScaleRecord {
  readonly kind: 'scale';
  readonly target: string;
  readonly to: number;
  readonly options?: ScaleOptions;
}

export interface GrowFromRecord {
  readonly kind: 'growFrom';
  readonly target: string;
  readonly from?: Vec2;
}

export type AnimationRecord =
  | FadeInRecord
  | FadeOutRecord
  | FadeToRecord
  | DrawRecord
  | MoveByRecord
  | MoveAlongRecord
  | RotateRecord
  | ScaleRecord
  | GrowFromRecord;

/**
 * The animation a record describes.
 *
 * A kind outside the set is refused with a sentence naming what was asked for,
 * the way an expression refuses a function it has no entry for. A figure read
 * from a file carries whatever the file says, so the check is at run time rather
 * than in the types alone.
 */
export function resolveAnimation(record: AnimationRecord, bindings: Bindings = {}): Animation {
  switch (record.kind) {
    case 'fadeIn':
      return fadeIn(record.target);
    case 'fadeOut':
      return fadeOut(record.target);
    case 'fadeTo':
      return fadeTo(record.target, record.opacity);
    case 'draw':
      return draw(record.target);
    case 'moveBy':
      return moveBy(record.target, record.offset);
    case 'moveAlong':
      return moveAlong(record.target, resolvePath(record.path, bindings));
    case 'rotate':
      return rotate(record.target, record.angle, record.options);
    case 'scale':
      return scale(record.target, record.to, record.options);
    case 'growFrom':
      return growFrom(record.target, record.from);
  }
  throw new Error(`an animation has no kind called ${String((record as { kind?: unknown }).kind)}`);
}
