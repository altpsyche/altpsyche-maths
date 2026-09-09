/**
 * The view a figure declares and the view moves it plays, written as data.
 *
 * A figure's extent is either a fixed one or a choice made from the shape of the
 * surface, and the choice is a function today. What a record carries is which
 * choice and the extents it picks between, so `resolveExtent` builds the function
 * a figure is handed.
 *
 * A view move is one of three forms and each is already parameters rather than a
 * closure over the clock, so this step carries them rather than writing them.
 */
import { byAspect, matchingAspect, type Extent, type ExtentChoice, type ViewChange } from './extent.js';
import { followView, frameView, moveView, type FollowOptions, type FrameOptions } from './view.js';

/** An extent per shape, for a figure whose composition does not survive being
 * reframed. */
export interface ByAspectRecord {
  readonly kind: 'byAspect';
  readonly wide: Extent;
  readonly square: Extent;
  readonly tall: Extent;
}

/** An extent that takes the shape of whatever it is drawn on, at a fixed
 * height. */
export interface MatchingAspectRecord {
  readonly kind: 'matchingAspect';
  readonly height?: number;
}

/** What a figure declares its extent as. A fixed extent carries no kind, the way
 * a fixed place in an expression carries none. */
export type ExtentRecord = Extent | ByAspectRecord | MatchingAspectRecord;

export interface MoveViewRecord {
  readonly kind: 'moveView';
  readonly to: Partial<Extent>;
}

export interface FollowViewRecord {
  readonly kind: 'followView';
  readonly target: string;
  readonly options?: FollowOptions;
}

export interface FrameViewRecord {
  readonly kind: 'frameView';
  readonly targets: readonly string[];
  readonly options?: FrameOptions;
}

export type ViewChangeRecord = MoveViewRecord | FollowViewRecord | FrameViewRecord;

/**
 * The choice a record describes: the fixed extent itself, or the function that
 * picks one from the shape of the surface. `resolveExtent` is what then reads a
 * choice at an aspect.
 *
 * A kind outside the set is refused with a sentence naming what was asked for.
 */
export function resolveExtentChoice(record: ExtentRecord): ExtentChoice {
  if (!('kind' in record)) return record;
  if (record.kind === 'byAspect') return byAspect({ wide: record.wide, square: record.square, tall: record.tall });
  if (record.kind === 'matchingAspect') return matchingAspect(record.height);
  throw new Error(`an extent has no kind called ${String((record as { kind?: unknown }).kind)}`);
}

/** The view move a record describes, as the timeline entry it is played as. */
export function resolveViewChange(record: ViewChangeRecord): ViewChange {
  switch (record.kind) {
    case 'moveView':
      return moveView(record.to);
    case 'followView':
      return followView(record.target, record.options);
    case 'frameView':
      return frameView(record.targets, record.options);
  }
  throw new Error(`a view move has no kind called ${String((record as { kind?: unknown }).kind)}`);
}
