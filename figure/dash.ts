/**
 * A dashed path cut into the runs it draws.
 *
 * The other two painters hand a dash to the platform under them: the SVG painter
 * writes `stroke-dasharray` and the canvas painter calls `setLineDash`. A card
 * has neither, so the cutting is done here, and each run comes back as an
 * ordinary open subpath that widens and caps like any other.
 *
 * The rule is the SVG specification's. A pattern of odd length is repeated to
 * make it even, so `[1]` and `[1, 1]` draw the same runs. A pattern that is
 * empty, holds a value below nothing, or sums to nothing draws the path solid.
 * The pattern restarts at the beginning of each subpath, so two subpaths of
 * different lengths both open with a whole first dash.
 */
import { measurePath } from './length.js';
import { pathWindow } from './trim.js';
import type { Path, Subpath } from './path.js';

/**
 * How many runs one subpath may be cut into.
 *
 * A pattern finer than this leaves runs shorter than a pixel at the hundred
 * pixels to the unit a figure is drawn at, which reads as a solid line of
 * lighter ink, and cutting it costs a window and an outline per run. The subpath
 * is drawn solid past this count rather than cut into runs nothing resolves.
 */
const MOST_RUNS = 10_000;

/** The pattern a dash array stands for, which is an odd-length one written
 * twice so its runs alternate rather than repeat. */
function evened(dash: readonly number[]): readonly number[] {
  return dash.length % 2 === 0 ? dash : [...dash, ...dash];
}

/** Whether a pattern leaves the path solid, which is what an empty list, a value
 * below nothing, a value that is not a number, and a list summing to nothing all
 * do. */
function drawsSolid(dash: readonly number[]): boolean {
  if (dash.length === 0) return true;
  let sum = 0;
  for (const run of dash) {
    if (!(run >= 0) || !Number.isFinite(run)) return true;
    sum += run;
  }
  return sum <= 0;
}

/**
 * Where each drawn run begins and ends along one subpath, in the picture's own
 * units.
 *
 * The offset moves the pattern back under the path, so an offset above nothing
 * opens the subpath partway into the pattern and an offset of a whole period
 * draws what an offset of nothing draws. Runs that meet are handed back as one,
 * which is what makes a pattern holding a gap of nothing draw as an unbroken
 * line the way both other painters draw it.
 */
function runsAlong(
  pattern: readonly number[],
  period: number,
  length: number,
  offset: number
): [number, number][] {
  const runs: [number, number][] = [];
  let at = -(((offset % period) + period) % period);
  let index = 0;
  while (at < length) {
    const ends = at + pattern[index % pattern.length];
    if (index % 2 === 0 && ends > 0) {
      const from = Math.max(at, 0);
      const to = Math.min(ends, length);
      const last = runs[runs.length - 1];
      if (to > from) {
        if (last && from <= last[1]) last[1] = to;
        else runs.push([from, to]);
      }
    }
    at = ends;
    index += 1;
  }
  return runs;
}

/**
 * A path cut into the runs a dash pattern draws, one subpath per run.
 *
 * A closed subpath whose first run opens at its start and whose last run closes
 * at its end is cut across that seam rather than at it, because a closed subpath
 * has a join there where an open one has two ends, and cutting at the seam would
 * put two caps where the other painters draw a join.
 */
export function dashPath(path: Path, dash: readonly number[], dashOffset = 0): Path {
  if (drawsSolid(dash)) return path;
  const pattern = evened(dash);
  let period = 0;
  for (const run of pattern) period += run;

  const cut: Subpath[] = [];
  // A subpath no run cuts is pushed as it stands, and a path none of whose
  // subpaths were cut is the path itself rather than a rebuilt copy of it.
  let untouched = 0;
  for (const subpath of path) {
    const one: Path = [subpath];
    const length = measurePath(one).total;
    if (!(length > 0) || (length / period) * (pattern.length / 2) > MOST_RUNS) {
      cut.push(subpath);
      untouched += 1;
      continue;
    }

    const runs = runsAlong(pattern, period, length, dashOffset);
    if (runs.length === 1 && runs[0][0] <= 0 && runs[0][1] >= length) {
      cut.push(subpath);
      untouched += 1;
      continue;
    }

    const seam = subpath.closed && runs.length > 1 && runs[0][0] <= 0 && runs[runs.length - 1][1] >= length;
    for (let at = seam ? 1 : 0; at < runs.length - (seam ? 1 : 0); at += 1) {
      for (const piece of pathWindow(one, runs[at][0] / length, runs[at][1] / length)) cut.push(piece);
    }
    if (seam) {
      const tail = pathWindow(one, runs[runs.length - 1][0] / length, 1);
      const head = pathWindow(one, 0, runs[0][1] / length);
      const joined = [...tail.flatMap((piece) => piece.curves), ...head.flatMap((piece) => piece.curves)];
      if (tail.length > 0 && joined.length > 0) cut.push({ start: tail[0].start, curves: joined, closed: false });
    }
  }
  return untouched === path.length ? path : cut;
}
