/**
 * One glyph's outline as this package's own path, read out of a TrueType `glyf`
 * table.
 *
 * A `glyf` outline is a quadratic B-spline and every path here is cubic, and the
 * conversion is exact rather than a fit: a quadratic from P₀ through control Q to
 * P₂ is the cubic with controls P₀ + (2/3)(Q − P₀) and P₂ + (2/3)(Q − P₂). The
 * two are the same curve at every parameter, so a drawn letter spends only the
 * flattening tolerance the triangulation already spends.
 *
 * The coordinates are returned in font units with y counting up, which is how the
 * table writes them. A label turns them over and scales them, since a figure's y
 * counts down.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Font } from './font.js';
import type { Cubic, Path, Subpath } from './path.js';

/** A point of a contour, and whether the outline passes through it or bends
 * around it. */
interface Point {
  readonly at: Vec2;
  readonly on: boolean;
}

/** How many parts a composite glyph may be built from before the reader calls it
 * a loop. A composite points at other glyphs, and a font whose glyph points at
 * itself would otherwise be read forever. */
const NESTING = 8;

const ON_CURVE = 0x01;
const X_SHORT = 0x02;
const Y_SHORT = 0x04;
const REPEAT = 0x08;
const X_SAME_OR_POSITIVE = 0x10;
const Y_SAME_OR_POSITIVE = 0x20;

const ARGS_ARE_WORDS = 0x0001;
const ARGS_ARE_XY = 0x0002;
const HAS_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const HAS_XY_SCALE = 0x0040;
const HAS_TWO_BY_TWO = 0x0080;

/** The cubic that is the same curve as a quadratic through one control, which is
 * the conversion every glyph segment takes. */
function quadratic(from: Vec2, control: Vec2, to: Vec2): Cubic {
  return {
    control1: vec2.lerp(from, control, 2 / 3),
    control2: vec2.lerp(to, control, 2 / 3),
    to,
  };
}

/**
 * One contour's points as a closed subpath.
 *
 * A `glyf` contour alternates points the curve passes through with points it
 * bends around, and either kind may be left out: two control points in a row
 * imply a point halfway between them, which is where the two quadratics meet.
 * A contour of control points alone is a shape with no corner at all, which is
 * how a font writes an O.
 */
function contourOf(points: readonly Point[]): Subpath | null {
  if (points.length === 0) return null;

  // Where the outline passes through, taken as the first such point so the
  // subpath starts on the curve. A contour with none starts halfway between its
  // last control point and its first.
  const first = points.findIndex((point) => point.on);
  const start =
    first >= 0 ? points[first].at : vec2.lerp(points[points.length - 1].at, points[0].at, 0.5);
  const ordered = first >= 0 ? [...points.slice(first), ...points.slice(0, first)] : [...points];

  const curves: Cubic[] = [];
  let from = start;
  let control: Vec2 | null = null;
  for (let step = 1; step <= ordered.length; step += 1) {
    // The contour closes back onto its own start, which is the point the walk
    // ends on rather than a point the table writes.
    const point = step === ordered.length ? { at: start, on: true } : ordered[step];
    if (point.on) {
      curves.push(control ? quadratic(from, control, point.at) : quadratic(from, vec2.lerp(from, point.at, 0.5), point.at));
      from = point.at;
      control = null;
      continue;
    }
    if (control) {
      // Two control points in a row: the curve passes halfway between them.
      const between = vec2.lerp(control, point.at, 0.5);
      curves.push(quadratic(from, control, between));
      from = between;
    }
    control = point.at;
  }
  return curves.length > 0 ? { start, curves, closed: true } : null;
}

/** Every point of a simple glyph, with each contour's own run of them. */
function simpleGlyph(view: DataView, at: number): Path {
  const contours = view.getInt16(at);
  if (contours <= 0) return [];

  const ends: number[] = [];
  for (let index = 0; index < contours; index += 1) ends.push(view.getUint16(at + 10 + index * 2));
  const count = ends[ends.length - 1] + 1;

  // The hinting instructions sit between the contour ends and the flags, and
  // nothing here rasterises, so their length is read only to step over them.
  let read = at + 10 + contours * 2;
  read += 2 + view.getUint16(read);

  const flags: number[] = [];
  while (flags.length < count) {
    const flag = view.getUint8(read);
    read += 1;
    flags.push(flag);
    if (flag & REPEAT) {
      const again = view.getUint8(read);
      read += 1;
      for (let index = 0; index < again; index += 1) flags.push(flag);
    }
  }

  // Each coordinate is a delta from the one before it, written in one byte, two
  // bytes, or not at all where it repeats the last.
  const readAxis = (shortBit: number, sameBit: number): number[] => {
    const values: number[] = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & shortBit) {
        const step = view.getUint8(read);
        read += 1;
        value += flag & sameBit ? step : -step;
      } else if (!(flag & sameBit)) {
        value += view.getInt16(read);
        read += 2;
      }
      values.push(value);
    }
    return values;
  };
  const xs = readAxis(X_SHORT, X_SAME_OR_POSITIVE);
  const ys = readAxis(Y_SHORT, Y_SAME_OR_POSITIVE);

  const path: Subpath[] = [];
  let from = 0;
  for (const end of ends) {
    const points: Point[] = [];
    for (let index = from; index <= end; index += 1) {
      points.push({ at: vec2(xs[index], ys[index]), on: (flags[index] & ON_CURVE) !== 0 });
    }
    const subpath = contourOf(points);
    if (subpath) path.push(subpath);
    from = end + 1;
  }
  return path;
}

/** A point under a composite component's own two-by-two transform and offset. */
function placed(at: Vec2, transform: readonly [number, number, number, number], offset: Vec2): Vec2 {
  return vec2(
    transform[0] * at.x + transform[2] * at.y + offset.x,
    transform[1] * at.x + transform[3] * at.y + offset.y
  );
}

/** A whole path under one component's transform, which is what places a part of a
 * composite glyph. */
function transformed(path: Path, transform: readonly [number, number, number, number], offset: Vec2): Path {
  return path.map((subpath) => ({
    start: placed(subpath.start, transform, offset),
    curves: subpath.curves.map((curve) => ({
      control1: placed(curve.control1, transform, offset),
      control2: placed(curve.control2, transform, offset),
      to: placed(curve.to, transform, offset),
    })),
    closed: subpath.closed,
  }));
}

/** Every component of a composite glyph, each read and placed under its own
 * transform. */
function compositeGlyph(font: Font, view: DataView, at: number, depth: number): Path {
  const path: Subpath[] = [];
  let read = at + 10;
  let more = true;
  while (more) {
    const flags = view.getUint16(read);
    const glyph = view.getUint16(read + 2);
    read += 4;
    more = (flags & MORE_COMPONENTS) !== 0;

    let offset = vec2(0, 0);
    if (flags & ARGS_ARE_WORDS) {
      // The arguments are two point numbers rather than an offset where the xy
      // bit is clear, which nothing in a text font uses and this reader places at
      // the origin rather than guessing.
      if (flags & ARGS_ARE_XY) offset = vec2(view.getInt16(read), view.getInt16(read + 2));
      read += 4;
    } else {
      if (flags & ARGS_ARE_XY) offset = vec2(view.getInt8(read), view.getInt8(read + 1));
      read += 2;
    }

    let transform: [number, number, number, number] = [1, 0, 0, 1];
    if (flags & HAS_SCALE) {
      const scale = view.getInt16(read) / 16384;
      transform = [scale, 0, 0, scale];
      read += 2;
    } else if (flags & HAS_XY_SCALE) {
      transform = [view.getInt16(read) / 16384, 0, 0, view.getInt16(read + 2) / 16384];
      read += 4;
    } else if (flags & HAS_TWO_BY_TWO) {
      transform = [
        view.getInt16(read) / 16384,
        view.getInt16(read + 2) / 16384,
        view.getInt16(read + 4) / 16384,
        view.getInt16(read + 6) / 16384,
      ];
      read += 8;
    }

    path.push(...transformed(glyphPath(font, glyph, depth + 1), transform, offset));
  }
  return path;
}

/**
 * A glyph's outline in font units, with y counting up the way the table writes
 * it.
 *
 * A glyph with no outline gives an empty path, which is what a space is. A glyph
 * index past the end of the font gives one too, rather than a refusal, since a
 * code point the font does not cover already maps to the missing-glyph box.
 */
export function glyphPath(font: Font, glyph: number, depth = 0): Path {
  if (glyph < 0 || glyph >= font.glyphCount || depth > NESTING) return [];
  const at = font.outlines[glyph];
  const end = font.outlines[glyph + 1];
  if (end <= at) return [];

  const view = new DataView(font.bytes.buffer, font.bytes.byteOffset, font.bytes.byteLength);
  return view.getInt16(at) < 0 ? compositeGlyph(font, view, at, depth) : simpleGlyph(view, at);
}
