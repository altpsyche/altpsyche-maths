/**
 * Cutting a path short, which is how a shape is drawn on rather than switched on.
 *
 * The cut is by length rather than by segment, so a path whose segments differ in
 * size is drawn at one steady pace. Parameterising by segment instead is cheaper
 * and reads wrong: a long side would be crossed in the same time as a short one
 * and the pen would visibly speed up and slow down. The length inside a segment
 * is read off that segment's own table for the same reason.
 */
import { measurePath, parameterAt } from './length.js';
import { splitCurve, type Cubic, type Path, type Subpath } from './path.js';

/** A fraction held inside nothing to one, so a window given a run wider than the
 * path is the path rather than nothing. */
function held(fraction: number): number {
  return fraction <= 0 ? 0 : fraction >= 1 ? 1 : fraction;
}

/**
 * The piece of a path between two fractions of its own length.
 *
 * Both ends are cut where they fall inside a segment, and a segment the window
 * does not reach is left out entirely. A window covering the whole path is the
 * path itself, untouched, so a finished drawing is the geometry the author wrote
 * rather than a rebuilt copy of it.
 *
 * The far end is cut before the near one, and the near cut is then measured
 * against what the far cut left rather than against the segment it started as,
 * because de Casteljau's construction rescales the parameter of the half it
 * keeps.
 */
export function pathWindow(path: Path, from: number, to: number): Path {
  const near = held(from);
  const far = held(to);
  if (far <= near) return [];
  if (near <= 0 && far >= 1) return path;
  const { per, total } = measurePath(path);
  if (total === 0) return path;

  const opens = total * near;
  const closes = total * far;
  let walked = 0;
  const kept: Subpath[] = [];
  let done = false;

  for (let at = 0; at < path.length && !done; at++) {
    const subpath = path[at];
    const curves: Cubic[] = [];
    let from = subpath.start;
    let head = subpath.start;
    let cut = false;

    for (let piece = 0; piece < subpath.curves.length; piece++) {
      const curve = subpath.curves[piece];
      const measured = per[at][piece];
      const opensAt = walked;
      const closesAt = walked + measured.total;
      walked = closesAt;

      if (closesAt <= opens) {
        from = curve.to;
        continue;
      }
      if (opensAt >= closes) {
        done = true;
        break;
      }

      const beyond = closesAt > closes ? parameterAt(measured, closes - opensAt) : 1;
      const before = opensAt < opens ? parameterAt(measured, opens - opensAt) : 0;
      let start = from;
      let piecewise = beyond < 1 ? splitCurve(start, curve, beyond)[0] : curve;
      if (before > 0) {
        const [dropped, after] = splitCurve(start, piecewise, beyond < 1 ? before / beyond : before);
        start = dropped.to;
        piecewise = after;
        cut = true;
      }
      if (beyond < 1) cut = true;
      if (curves.length === 0) head = start;
      curves.push(piecewise);
      from = curve.to;
    }

    // A subpath the window cuts stops being closed, because the join back to its
    // start is one of the parts the window leaves out.
    const whole = !cut && curves.length === subpath.curves.length;
    if (curves.length > 0) kept.push({ start: head, curves, closed: whole ? subpath.closed : false });
  }

  return kept;
}

/**
 * The path up to a fraction of its total length.
 *
 * A fraction at or past one is the path itself and a fraction at or below
 * nothing is no path at all, which are the two ends the window already holds.
 */
export function trimPath(path: Path, fraction: number): Path {
  return pathWindow(path, 0, fraction);
}
