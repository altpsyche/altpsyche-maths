/**
 * An SVG path string read as geometry, which is the way in to everything above.
 *
 * `pathData` writes a path out and this reads one back. Without it the only
 * paths that exist are the ones the builders beside this file make, so a glyph
 * from a typesetter, an icon from a designer or anything else a drawing program
 * exported cannot be trimmed, aligned or walked into another shape, and those
 * are the operations this package is for.
 *
 * Everything becomes a cubic, the way it does everywhere here. A straight run
 * takes the controls a third and two thirds along, a quadratic elevates exactly,
 * and an elliptical arc is cut into pieces of at most a quarter turn each. So no
 * segment read here is an approximation of the one the string described, apart
 * from the arc, which no Bézier can be exactly.
 *
 * A command it does not know stops the read rather than being skipped. Skipping
 * leaves a shape with a piece missing, and a piece missing from a letter or an
 * outline reads as a mistake in the drawing rather than in the reading of it.
 */

import { vec2, type Vec2 } from '../values/vec2.js';
import { mat3 } from '../values/mat3.js';
import { straight, type Cubic, type Path, type Subpath } from './path.js';

/** Every command in the path grammar. */
const DRAWN = 'MLHVCSQTAZ';

type Token = { readonly command: string } | { readonly number: number };

/** A letter, a number, a run of separators, or one character that is none of
 * those. The last group is what turns an unexpected character into a refusal
 * rather than leaving it in the string unread. */
const SCANNER = /([A-Za-z])|([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|([,\s]+)|([\s\S])/g;

function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  SCANNER.lastIndex = 0;
  for (let match = SCANNER.exec(d); match; match = SCANNER.exec(d)) {
    if (match[1]) tokens.push({ command: match[1] });
    else if (match[2] !== undefined) tokens.push({ number: Number(match[2]) });
    else if (match[3] === undefined)
      throw new Error(`path data holds "${match[4]}", which is neither a command nor a number`);
  }
  return tokens;
}

/** A quadratic written as a cubic, both controls two thirds of the way from an
 * end towards the single control. The two describe the same curve. */
const elevate = (from: Vec2, control: Vec2, to: Vec2): Cubic => ({
  control1: vec2.lerp(from, control, 2 / 3),
  control2: vec2.lerp(to, control, 2 / 3),
  to,
});

/** The control a smooth segment uses, which is the previous one turned through
 * the point the two segments share. */
const reflect = (control: Vec2, about: Vec2) => vec2.sub(vec2.scale(about, 2), control);

/** How far a cubic's controls sit from the ends of a piece of a unit arc, along
 * the tangent. It is the same derivation `arc` uses and it holds for any sweep
 * short enough, which is why the sweep is cut into quarters first. */
const reachFor = (sweep: number) => (4 / 3) * Math.tan(sweep / 4);

/**
 * An SVG elliptical arc as cubics, from the endpoint form the string carries.
 *
 * SVG gives an arc as where it ends plus two radii, a rotation and two flags,
 * and every one of the four arcs that fit those endpoints is selected by the
 * flags. The centre and the two angles are recovered first, which is the
 * conversion in the SVG specification, and then the sweep is walked in pieces
 * of at most a quarter turn on a unit circle. The ellipse is an affine map of
 * that circle, and an affine map takes a cubic to a cubic, so the control
 * points can be mapped straight through rather than derived again.
 */
function arcCurves(
  from: Vec2,
  radii: Vec2,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  to: Vec2
): Cubic[] {
  // A radius of zero is a straight line by the specification, and so is an arc
  // whose endpoints are the same point, which the specification drops entirely.
  if (radii.x === 0 || radii.y === 0) return [straight(from, to)];

  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const half = vec2.scale(vec2.sub(from, to), 0.5);
  const turned = vec2(cos * half.x + sin * half.y, -sin * half.x + cos * half.y);

  // Radii too small to reach both endpoints are scaled up until they just do,
  // which the specification asks for rather than treating as an error.
  let rx = Math.abs(radii.x);
  let ry = Math.abs(radii.y);
  const short = (turned.x * turned.x) / (rx * rx) + (turned.y * turned.y) / (ry * ry);
  if (short > 1) {
    rx *= Math.sqrt(short);
    ry *= Math.sqrt(short);
  }

  const denominator = rx * rx * turned.y * turned.y + ry * ry * turned.x * turned.x;
  const numerator = Math.max(0, rx * rx * ry * ry - denominator);
  const spread = (largeArc === sweep ? -1 : 1) * Math.sqrt(numerator / denominator);
  const centreTurned = vec2((spread * rx * turned.y) / ry, (-spread * ry * turned.x) / rx);
  const centre = vec2.add(
    vec2(cos * centreTurned.x - sin * centreTurned.y, sin * centreTurned.x + cos * centreTurned.y),
    vec2.scale(vec2.add(from, to), 0.5)
  );

  const at = (point: Vec2) => vec2((point.x - centreTurned.x) / rx, (point.y - centreTurned.y) / ry);
  const opening = at(turned);
  const closing = at(vec2.scale(turned, -1));
  const first = vec2.angle(opening);
  let swept = vec2.angle(closing) - first;
  if (!sweep && swept > 0) swept -= 2 * Math.PI;
  if (sweep && swept < 0) swept += 2 * Math.PI;

  // The whole ellipse, placed and turned, as one matrix. Every point of the
  // unit arc goes through it, controls included.
  const place = mat3.multiply(
    mat3.translation(centre),
    mat3.multiply(mat3.rotation(angle), mat3.scaling(vec2(rx, ry)))
  );

  const pieces = Math.max(1, Math.ceil(Math.abs(swept) / (Math.PI / 2)));
  const step = swept / pieces;
  const reach = reachFor(step);
  const curves: Cubic[] = [];
  for (let piece = 0; piece < pieces; piece++) {
    const a0 = first + step * piece;
    const a1 = a0 + step;
    const p0 = vec2(Math.cos(a0), Math.sin(a0));
    const p1 = vec2(Math.cos(a1), Math.sin(a1));
    const t0 = vec2(-Math.sin(a0), Math.cos(a0));
    const t1 = vec2(-Math.sin(a1), Math.cos(a1));
    curves.push({
      control1: mat3.transformPoint(place, vec2.add(p0, vec2.scale(t0, reach))),
      control2: mat3.transformPoint(place, vec2.sub(p1, vec2.scale(t1, reach))),
      // The endpoint the string named rather than the one the angles give back,
      // so a run of arcs cannot drift away from where it said it ends.
      to: piece === pieces - 1 ? to : mat3.transformPoint(place, p1),
    });
  }
  return curves;
}

/**
 * The path a `d` attribute describes.
 *
 * Both cases of every command are read, so a relative run is resolved against
 * where the last one ended. A command letter followed by more numbers than it
 * takes repeats, which is the shorthand the grammar allows and which a moveto
 * repeats as a lineto.
 */
export function pathFromData(d: string): Path {
  const tokens = tokenize(d);
  const subpaths: Subpath[] = [];
  let curves: Cubic[] = [];
  let start = vec2.ZERO;
  let at = vec2.ZERO;
  let open = false;
  let moved = false;
  let command = '';
  let index = 0;
  // Held per kind because an S reflects a cubic's second control and a T a
  // quadratic's only one, and either falls back to the current point when the
  // segment before it was neither.
  let lastCubic: Vec2 | undefined;
  let lastQuadratic: Vec2 | undefined;

  const take = (count: number): number[] => {
    const values: number[] = [];
    while (values.length < count) {
      const token = tokens[index++];
      if (!token || !('number' in token))
        throw new Error(`path command "${command}" wants ${count} numbers and the run ends short`);
      values.push(token.number);
    }
    return values;
  };

  const flush = (closed: boolean) => {
    if (open) subpaths.push({ start, curves, closed });
    open = false;
  };

  const segment = (...added: Cubic[]) => {
    if (!moved) throw new Error('path data draws before it moves to a starting point');
    // A segment after a close begins again where the closed subpath began,
    // which is the point the close left as the current one.
    if (!open) {
      start = at;
      curves = [];
      open = true;
    }
    curves.push(...added);
    at = added[added.length - 1]?.to ?? at;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (token && 'command' in token) {
      command = token.command;
      index++;
      if (!DRAWN.includes(command.toUpperCase()))
        throw new Error(`path data holds command "${command}", which is not one of "${DRAWN}"`);
    } else if (!command) {
      throw new Error('path data opens on a number rather than a command');
    }

    const relative = command === command.toLowerCase();
    const absolute = (x: number, y: number) => (relative ? vec2(at.x + x, at.y + y) : vec2(x, y));

    switch (command.toUpperCase()) {
      case 'M': {
        const [x = 0, y = 0] = take(2);
        flush(false);
        at = absolute(x, y);
        start = at;
        curves = [];
        open = true;
        moved = true;
        lastCubic = undefined;
        lastQuadratic = undefined;
        // A second pair under one moveto is a line rather than a second move,
        // and the repetition carries the case the moveto was written in.
        command = relative ? 'l' : 'L';
        break;
      }
      case 'L': {
        const [x = 0, y = 0] = take(2);
        segment(straight(at, absolute(x, y)));
        lastCubic = undefined;
        lastQuadratic = undefined;
        break;
      }
      case 'H': {
        const [x = 0] = take(1);
        segment(straight(at, relative ? vec2(at.x + x, at.y) : vec2(x, at.y)));
        lastCubic = undefined;
        lastQuadratic = undefined;
        break;
      }
      case 'V': {
        const [y = 0] = take(1);
        segment(straight(at, relative ? vec2(at.x, at.y + y) : vec2(at.x, y)));
        lastCubic = undefined;
        lastQuadratic = undefined;
        break;
      }
      case 'C': {
        const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x = 0, y = 0] = take(6);
        const control2 = absolute(x2, y2);
        segment({ control1: absolute(x1, y1), control2, to: absolute(x, y) });
        lastCubic = control2;
        lastQuadratic = undefined;
        break;
      }
      case 'S': {
        const [x2 = 0, y2 = 0, x = 0, y = 0] = take(4);
        const control1 = lastCubic ? reflect(lastCubic, at) : at;
        const control2 = absolute(x2, y2);
        segment({ control1, control2, to: absolute(x, y) });
        lastCubic = control2;
        lastQuadratic = undefined;
        break;
      }
      case 'Q': {
        const [qx = 0, qy = 0, x = 0, y = 0] = take(4);
        const control = absolute(qx, qy);
        segment(elevate(at, control, absolute(x, y)));
        lastCubic = undefined;
        lastQuadratic = control;
        break;
      }
      case 'T': {
        const [x = 0, y = 0] = take(2);
        const control = lastQuadratic ? reflect(lastQuadratic, at) : at;
        segment(elevate(at, control, absolute(x, y)));
        lastCubic = undefined;
        lastQuadratic = control;
        break;
      }
      case 'A': {
        const [rx = 0, ry = 0, turn = 0, large = 0, sweep = 0, x = 0, y = 0] = take(7);
        const to = absolute(x, y);
        // An arc that ends where it began is dropped rather than drawn, which
        // is the specification's own wording: there is no such ellipse to pick.
        if (to.x !== at.x || to.y !== at.y)
          segment(...arcCurves(at, vec2(rx, ry), turn, large !== 0, sweep !== 0, to));
        lastCubic = undefined;
        lastQuadratic = undefined;
        break;
      }
      case 'Z': {
        flush(true);
        at = start;
        lastCubic = undefined;
        lastQuadratic = undefined;
        // A close ends the run of one command, so a number after it has nothing
        // to repeat and is refused rather than read as a line.
        command = '';
        break;
      }
    }
  }

  flush(false);
  return subpaths;
}
