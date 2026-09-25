/**
 * A figure written as data, and the call that builds the figure it describes.
 *
 * Every part under a figure is already a record: the scene from step 3, the
 * animations from step 4, the spans from step 6, the extent and the view moves
 * from step 7 and the insets from step 7.5, and a track is keys with a curve by
 * name. What this adds is the figure itself.
 *
 * The scene is read again at each time with the sampled track values as its
 * bindings, so a scene a track drives stays a record rather than becoming a
 * closure again: the boolean demo's answer has different cubics every frame and
 * the record that describes it is the same record throughout.
 */
import { resolveNode, type NodeRecord } from './node-record.js';
import { resolveTimeline, type TimelineRecord } from './timeline-record.js';
import { resolveExtentChoice, resolveInset, type ExtentRecord, type InsetRecord } from './view-record.js';
import { resolvePath, type PathRecord } from './path-record.js';
import type { Fit } from './extent.js';
import type { Figure, PainterName } from './figure.js';
import type { Input, Motion } from './input.js';
import type { Tracks } from '../timing/track.js';
import type { Vec2 } from '../values/vec2.js';

/** A motion as data, which is `Motion` with the path of `along` written as the
 * record that describes it. */
export type MotionRecord =
  | { readonly kind: 'along'; readonly path: PathRecord }
  | { readonly kind: 'drag'; readonly rate: number; readonly across?: Vec2 }
  | { readonly kind: 'around'; readonly rate: number; readonly centre: Vec2 };

/** An input as data. */
export interface InputRecord {
  readonly track: string;
  readonly mark: string;
  readonly motion: MotionRecord;
  readonly reach?: number;
}

/** A whole figure as data, which is the eleven fields `Figure` has with each
 * function of the clock written as the record that describes it. */
export interface FigureRecord {
  readonly extent: ExtentRecord;
  readonly fit?: Fit;
  readonly scene: NodeRecord;
  readonly tracks?: Tracks;
  readonly timeline?: TimelineRecord;
  readonly duration?: number;
  readonly still: number;
  readonly loop?: boolean;
  readonly insets?: readonly InsetRecord[];
  readonly painters?: readonly PainterName[];
  readonly inputs?: readonly InputRecord[];
}

/**
 * The figure a record describes, which `marksAt` then reads at a time.
 *
 * An animation's own parameters are read once here rather than at each time,
 * because a figure has one timeline and every time reads that same one. A
 * shape driven by a track reaches a picture through the scene instead, which is
 * where a track belongs: an animation moves marks the scene has already made.
 */
export function resolveFigure(record: FigureRecord): Figure {
  return {
    extent: resolveExtentChoice(record.extent),
    fit: record.fit,
    scene: (_seconds, values, frame) => resolveNode(record.scene, { tracks: values, frame }),
    tracks: record.tracks,
    timeline: record.timeline ? resolveTimeline(record.timeline) : undefined,
    duration: record.duration,
    still: record.still,
    loop: record.loop,
    insets: record.insets?.map(resolveInset),
    painters: record.painters,
    inputs: record.inputs?.map(resolveInput),
  };
}

/** The input a record describes. The path of `along` is read with no track
 * values, since a path moving with the track it gives would move under the pointer. */
function resolveInput(record: InputRecord): Input {
  const { motion } = record;
  const resolved: Motion = motion.kind === 'along' ? { kind: 'along', path: resolvePath(motion.path) } : motion;
  return { track: record.track, mark: record.mark, motion: resolved, reach: record.reach };
}
