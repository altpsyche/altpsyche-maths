/**
 * A value over the length of a clip, read at a time.
 *
 * Something sets a value at one moment and another value later, and everything
 * that draws asks this file what the value is at a given second. A picture on
 * screen and a picture being recorded used to be two answers to that question in
 * two places, which is how a preview and a recording drift apart.
 *
 * A key is flat where it is marked smooth, so two keys give four curves. A key
 * naming a curve gets that one instead, which is how a value overshoots or comes
 * back: neither shape can be deduced from a pair of flat flags. The rest of this
 * file is holding the keys in the order the sampler reads them.
 */
import { curveFor, curveNamed, type Curve, type CurveName } from '../values/ease.js';

/** What a key can hold. A boolean is here because a control can be a switch,
 * and a list because a control can be a vector or a colour. */
export type TrackValue = number | readonly number[] | boolean;

export interface Key {
  /** Seconds into the clip. A key past the clip's end is never reached. */
  time: number;
  value: TrackValue;
  /** Whether the curve is flat here, which eases the segments either side. */
  smooth?: boolean;
  /** The curve the value leaves this key along, which overrides the pair of flat
   * flags. It is a name and never a function, so a track stays data a file can
   * hold. */
  curve?: CurveName;
}

/** One value's keys, in the order the sampler reads them, which is the order
 * `withKey` keeps them in. */
export type Track = readonly Key[];

/** Every track by name, which is whatever the caller keys: a uniform, or a
 * property of a mark. */
export type Tracks = Record<string, Track>;

/** Two keys at the same instant are one key, so a time this close counts as the
 * same time and setting a key twice replaces rather than stacks. Half a frame at
 * sixty a second. */
export const SAME_TIME = 1 / 120;

/**
 * The value part way between two keys.
 *
 * A pair this cannot walk between holds the earlier value until the later key's
 * own time: a boolean has no half, and two lists of different lengths have no
 * component to pair up.
 */
function walked(from: TrackValue, to: TrackValue, along: number): TrackValue {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * along;
  if (Array.isArray(from) && Array.isArray(to) && from.length === to.length) {
    return from.map((part: number, at: number) => part + (to[at] - part) * along);
  }
  return from;
}

/**
 * The curve a segment is walked along.
 *
 * The name on the earlier key wins, since a curve describes how the value leaves
 * a key rather than how it arrives, so one key can be left along one shape and
 * arrived at along another.
 */
function curveOf(from: Key, to: Key): Curve {
  if (from.curve !== undefined) return curveNamed(from.curve);
  return curveFor(from.smooth === true, to.smooth === true);
}

/**
 * What a track is worth at a time, or null where it has no keys.
 *
 * Outside the keys the nearest one holds, so a track never invents a value
 * before its first key or carries on past its last.
 */
export function sampleTrack(track: Track, seconds: number): TrackValue | null {
  if (track.length === 0) return null;
  const first = track[0];
  if (seconds <= first.time) return first.value;
  const last = track[track.length - 1];
  if (seconds >= last.time) return last.value;

  for (let at = 0; at < track.length - 1; at++) {
    const from = track[at];
    const to = track[at + 1];
    if (seconds > to.time) continue;
    const span = to.time - from.time;
    if (span <= 0) return to.value;
    const along = curveOf(from, to)((seconds - from.time) / span);
    return walked(from.value, to.value, along);
  }
  return last.value;
}

/** Every track's value at a time, leaving out a track with no keys. */
export function sampleTracks(tracks: Tracks, seconds: number): Record<string, TrackValue> {
  const values: Record<string, TrackValue> = {};
  for (const [name, track] of Object.entries(tracks)) {
    const value = sampleTrack(track, seconds);
    if (value !== null) values[name] = value;
  }
  return values;
}

/** The track with one key set, replacing the key at that time where there is
 * one, and in the order the sampler reads. */
export function withKey(track: Track, key: Key): Track {
  const kept = track.filter((held) => Math.abs(held.time - key.time) > SAME_TIME);
  return [...kept, key].sort((one, two) => one.time - two.time);
}

/** The track with the key at that time taken out. */
export function withoutKey(track: Track, seconds: number): Track {
  return track.filter((held) => Math.abs(held.time - seconds) > SAME_TIME);
}

/** The key sitting at a time, which is what a control reads to draw its button
 * as set rather than empty. */
export function keyAt(track: Track, seconds: number): Key | undefined {
  return track.find((held) => Math.abs(held.time - seconds) <= SAME_TIME);
}
