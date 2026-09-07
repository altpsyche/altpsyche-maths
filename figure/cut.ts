/**
 * A path cut where something crosses it.
 *
 * Each cut names a piece and how far along it the cut falls, and the pieces
 * that come back draw exactly what the pieces they replace drew, because de
 * Casteljau's construction gives both halves of a cubic as cubics. Several cuts
 * in one piece are taken in order, and each one after the first is measured
 * against what is left rather than against the piece it started as.
 */
import { splitCurve, type Cubic, type Path, type Subpath } from './path.js';
import { measurePath } from './length.js';
import type { Vec2 } from '../values/vec2.js';
import { TOLERANCE } from './tolerance.js';

/** Where one cut falls: which subpath, which piece of it, and how far along
 * that piece. */
export interface Cut {
  readonly subpath: number;
  readonly curve: number;
  readonly along: number;
}

export interface CutOptions {
  /** How close two cuts, or a cut and the end of a piece, are before they count
   * as the same place, in the picture's own units. */
  readonly tolerance?: number;
}


/** The fractions for one piece, in order, with the ones that would leave a
 * piece of nothing dropped. */
function wanted(fractions: readonly number[], tolerance: number): number[] {
  const kept: number[] = [];
  for (const fraction of [...fractions].sort((a, b) => a - b)) {
    if (fraction <= tolerance || fraction >= 1 - tolerance) continue;
    if (kept.length > 0 && fraction - kept[kept.length - 1] <= tolerance) continue;
    kept.push(fraction);
  }
  return kept;
}

/** One piece as the run of pieces the cuts leave, each cut measured against
 * what is left of the piece rather than against the whole of it. */
function cutCurve(from: Vec2, curve: Cubic, fractions: readonly number[]): Cubic[] {
  const pieces: Cubic[] = [];
  let rest = curve;
  let restFrom = from;
  let taken = 0;
  for (const fraction of fractions) {
    const [head, tail] = splitCurve(restFrom, rest, (fraction - taken) / (1 - taken));
    pieces.push(head);
    restFrom = head.to;
    rest = tail;
    taken = fraction;
  }
  pieces.push(rest);
  return pieces;
}

/**
 * A path with every cut put in, drawing what it drew and holding one more piece
 * for each cut.
 *
 * The tolerance is a distance rather than a fraction, so it is read against
 * each piece's own length: a cut is worth making only where the piece it would
 * leave behind is long enough to see, and a piece of nothing is one the stitch
 * that follows would have to know to skip.
 *
 * A cut naming a piece the path does not have is ignored, since a caller that
 * has already thrown one subpath away should not have to renumber the cuts it
 * gathered before it did.
 */
export function cutPath(path: Path, cuts: readonly Cut[], options: CutOptions = {}): Path {
  const tolerance = options.tolerance ?? TOLERANCE;
  if (cuts.length === 0) return path;

  const gathered = new Map<string, number[]>();
  for (const cut of cuts) {
    const key = `${cut.subpath}:${cut.curve}`;
    const already = gathered.get(key);
    if (already) already.push(cut.along);
    else gathered.set(key, [cut.along]);
  }

  const measured = measurePath(path);
  return path.map((subpath, at): Subpath => {
    let from = subpath.start;
    const curves: Cubic[] = [];
    for (let piece = 0; piece < subpath.curves.length; piece++) {
      const curve = subpath.curves[piece];
      const span = measured.per[at][piece].total;
      const asFraction = span > 0 ? Math.min(tolerance / span, 0.5) : 1;
      const fractions = wanted(gathered.get(`${at}:${piece}`) ?? [], asFraction);
      curves.push(...cutCurve(from, curve, fractions));
      from = curve.to;
    }
    return { start: subpath.start, curves, closed: subpath.closed };
  });
}
