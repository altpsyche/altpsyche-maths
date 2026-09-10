/**
 * A change to some of the marks, over a span of time.
 *
 * An animation is a function rather than an object with a start and a stop,
 * because the picture at a time has to be the same whichever direction the clock
 * arrived from. Playing forward, dragging a scrub bar backwards and walking a
 * fixed step for a recording all ask the same question and must get the same
 * answer.
 *
 * Each one is given how far through its own span the clock is, already eased, and
 * hands back the marks as they stand at that fraction.
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { lerp } from '../values/scalar.js';
import { thereAndBack } from '../values/ease.js';
import { lerpColour } from '../values/colour.js';
import { circle, line, polygon, transformPath, type Path } from './path.js';
import { pathWindow, trimPath } from './trim.js';
import { lerpPath } from './morph.js';
import { matchGlyphs } from './equation-match.js';
import { pointAlong } from './length.js';
import { scaledWidth } from './width.js';
import { transformFill } from './gradient.js';
import { boundsOfMarks, centreOf, overlapOf } from './bounds.js';
import { interval } from '../values/interval.js';
import type { Colour, Mark, Stroke, TextMark } from './mark.js';

export type Animation = (marks: readonly Mark[], along: number) => readonly Mark[];

/**
 * Which marks an animation touches.
 *
 * A target is an id or the front of one, so naming a group reaches everything
 * inside it and naming a mark reaches only that mark. A name that matches
 * nothing changes nothing rather than failing, because a figure being written is
 * often a figure whose parts do not all exist yet.
 */
export function touches(id: string, target: string): boolean {
  return id === target || id.startsWith(`${target}/`);
}

function over(target: string, change: (mark: Mark, along: number) => Mark): Animation {
  return (marks, along) => marks.map((mark) => (touches(mark.id, target) ? change(mark, along) : mark));
}

/** From nothing to whatever opacity the mark already had, so a mark that is
 * half faded by design does not become solid on the way in. */
export function fadeIn(target: string): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: (mark.opacity ?? 1) * along }));
}

export function fadeOut(target: string): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: (mark.opacity ?? 1) * (1 - along) }));
}

/** Moved by an offset in figure units, which reaches the geometry rather than
 * riding alongside it, the same way a group's transform does. */
export function moveBy(target: string, offset: Vec2): Animation {
  return over(target, (mark, along) => {
    const step = mat3.translation(vec2.scale(offset, along));
    if (mark.kind === 'text') return { ...mark, at: mat3.transformPoint(step, mark.at) };
    return { ...mark, path: transformPath(mark.path, step) };
  });
}

/**
 * Drawn on from one end rather than switched on.
 *
 * A text mark has no path to walk along, so it fades instead. That is a choice
 * rather than an oversight: drawing letters on stroke by stroke needs outlines,
 * and a text mark is deliberately a string a painter lays out.
 */
export function draw(target: string): Animation {
  return over(target, (mark, along) => {
    if (mark.kind === 'text') return { ...mark, opacity: (mark.opacity ?? 1) * along };
    return { ...mark, path: trimPath(mark.path, along) };
  });
}

/**
 * One shape becoming another, point by point.
 *
 * The two paths are aligned first, so the one with fewer segments is subdivided
 * until both hold the same points. A mark with no path is left alone.
 */
export function morph(target: string, into: Path): Animation {
  return over(target, (mark, along) => {
    if (mark.kind === 'text') return mark;
    return { ...mark, path: lerpPath(mark.path, into, along) };
  });
}

/**
 * One typeset expression walked into another, the shared glyphs staying put and
 * only the difference moving.
 *
 * Both expressions are in the scene at every time and this moves one onto the
 * other. A mark that arrived part way through a span would turn up in a
 * comparison between two frames as something that changed, which is what a flash
 * keeps its rays for.
 *
 * A paired glyph is drawn once rather than cross-faded. Two copies of one letter
 * sitting on each other at half opacity through the middle of the span is a
 * ghost, so the glyph being left carries the walk and its partner stays at
 * nothing. At the end it is standing exactly on its partner, so nothing has to be
 * swapped at any moment.
 *
 * An unpaired mark has its own opacity multiplied rather than set, so an
 * expression still fading in when a morph starts does not jump to solid.
 */
export function morphEquation(from: string, to: string): Animation {
  return (marks, along) => {
    const leaving = marks.filter((mark) => touches(mark.id, from));
    const arriving = marks.filter((mark) => touches(mark.id, to));
    if (leaving.length === 0 || arriving.length === 0) return marks;

    const changed = new Map<string, Mark>();
    for (const [left, right] of matchGlyphs(leaving, arriving).pairs) {
      changed.set(left.id, { ...left, path: lerpPath(left.path, right.path, along) });
      changed.set(right.id, { ...right, opacity: 0 });
    }
    const faded = (mark: Mark, to: number) => ({ ...mark, opacity: (mark.opacity ?? 1) * to });
    for (const mark of leaving) if (!changed.has(mark.id)) changed.set(mark.id, faded(mark, 1 - along));
    for (const mark of arriving) if (!changed.has(mark.id)) changed.set(mark.id, faded(mark, along));

    return marks.map((mark) => changed.get(mark.id) ?? mark);
  };
}

/**
 * A number ticking from one value to another, written into a text mark.
 *
 * How the value is written is the caller's, so this holds no opinion about
 * decimal places: a count of a length and a count of a population want different
 * rounding and neither is this function's to choose.
 *
 * The scene writes the value the count ends at, which is what this writes at the
 * end of its span, so the two never disagree about what the number settles on.
 */
export function countTo(target: string, from: number, to: number, write: (value: number) => string): Animation {
  return over(target, (mark, along) => (mark.kind === 'text' ? { ...mark, text: write(lerp(from, to, along)) } : mark));
}

/** A mark's own opacity walked to a value, for a figure that wants a thing dimmed
 * rather than gone. */
export function fadeTo(target: string, opacity: number): Animation {
  return over(target, (mark, along) => ({ ...mark, opacity: lerp(mark.opacity ?? 1, opacity, along) }));
}

/**
 * A mark carried through a transform, geometry and weight together.
 *
 * A transform that scales makes the lines inside it thicker and the words
 * bigger, the way it makes everything else bigger, which is what a group that
 * scales already does to the marks under it. Doing less here would leave a
 * shrinking mark with the stroke it started at.
 *
 * The clip is left where the figure put it, so a mark an animation moves slides
 * through its own clip rather than carrying the window along with it.
 */
export function carried(mark: Mark, through: Mat3): Mark {
  const scale = mat3.scaleFactor(through);
  if (mark.kind === 'text') {
    return {
      ...mark,
      at: mat3.transformPoint(through, mark.at),
      size: mark.size * scale,
      fill: transformFill(mark.fill, through),
    };
  }
  return {
    ...mark,
    path: transformPath(mark.path, through),
    fill: mark.fill ? transformFill(mark.fill, through) : undefined,
    stroke: mark.stroke ? { ...mark.stroke, width: scaledWidth(mark.stroke.width, scale) } : undefined,
  };
}

export interface AboutOptions {
  /** The point the change happens about. The middle of the box round the marks
   * being changed unless a figure names one. */
  pivot?: Vec2;
}

/**
 * A change built round a point the marks themselves decide.
 *
 * The pivot is read off the marks as they arrive, which is before this change has
 * moved them, so it is the same point at every time and a turn of a whole circle
 * lands where it began. Reading it back off the marks after the change would let
 * it drift, because the box round a turned shape is not the turned box.
 */
function about(
  target: string,
  options: AboutOptions,
  step: (along: number, pivot: Vec2) => Mat3 | null
): Animation {
  return (marks, along) => {
    const touched = marks.filter((mark) => touches(mark.id, target));
    if (touched.length === 0) return marks;
    const box = boundsOfMarks(touched);
    const pivot = options.pivot ?? (box ? centreOf(box) : vec2(0, 0));
    const through = step(along, pivot);
    if (through === null) return marks;
    return marks.map((mark) => (touches(mark.id, target) ? carried(mark, through) : mark));
  };
}

/** The transform for a change about a point: back to the origin, the change,
 * then back where it was. */
function around(pivot: Vec2, change: Mat3): Mat3 {
  return mat3.multiply(mat3.multiply(mat3.translation(pivot), change), mat3.translation(vec2.scale(pivot, -1)));
}

/**
 * Turned about a point, by an angle in radians.
 *
 * A text mark's anchor moves and its words stay upright. A mark carries no
 * rotation of its own, so turning the words would mean adding one to what both
 * painters have to do, and a label that stays readable while the thing it names
 * turns is what a figure wants anyway, which is the same reason a number line
 * takes a direction rather than being turned on its side.
 */
export function rotate(target: string, angle: number, options: AboutOptions = {}): Animation {
  return about(target, options, (along, pivot) => {
    const turned = angle * along;
    return turned === 0 ? null : around(pivot, mat3.rotation(turned));
  });
}

export interface ScaleOptions extends AboutOptions {
  /** What it is scaled by at the start of the span, which is its own size. */
  from?: number;
}

/** Grown or shrunk about a point, from one factor to another. */
export function scale(target: string, to: number, options: ScaleOptions = {}): Animation {
  const start = options.from ?? 1;
  return about(target, options, (along, pivot) => {
    const factor = lerp(start, to, along);
    return factor === 1 ? null : around(pivot, mat3.scaling(vec2(factor, factor)));
  });
}

/** The matrix a map has reached partway along, taken entry by entry from the
 * identity, which is what makes the entries beside the picture the numbers it is
 * counting to. */
function blended(m: Mat3, along: number): Mat3 {
  const from = mat3.IDENTITY;
  return from.map((entry, at) => lerp(entry, m[at], along)) as unknown as Mat3;
}

/**
 * A linear map carried over the marks it names, reached entry by entry.
 *
 * The pivot is the origin of the figure's units rather than the middle of the
 * box round the marks, which is what `rotate` and `scale` take. A linear map is
 * defined about the origin, and a grid whose box centre sits elsewhere would be
 * mapped about the wrong point and slide as it deformed.
 *
 * Interpolating the entries is what the picture needs and it is not a turn. The
 * determinant halfway to a turn by an angle is `(1 + cos angle) / 2`, so a
 * quarter turn halves the area on the way and a half turn flattens every point
 * onto one line. A figure that wants the turn itself asks `rotate`, which
 * interpolates the angle and holds the area at 1.
 */
export function applyMatrix(target: string, m: Mat3, options: AboutOptions = {}): Animation {
  const pivot = options.pivot ?? vec2(0, 0);
  return (marks, along) => {
    if (along === 0) return marks;
    const through = around(pivot, blended(m, along));
    return marks.map((mark) => (touches(mark.id, target) ? carried(mark, through) : mark));
  };
}

/**
 * Carried along a path at a steady pace, by length rather than by piece.
 *
 * What it moves is the offset from the path's own start, so a mark placed at that
 * start travels the path and a mark placed elsewhere travels the same shape from
 * where it stands. That is what `moveBy` does with a straight offset, and it is
 * what makes this nothing at the beginning of its span like every other change
 * here.
 */
export function moveAlong(target: string, path: Path): Animation {
  const start = pointAlong(path, 0);
  return (marks, along) => {
    if (start === null || along === 0) return marks;
    const reached = pointAlong(path, along);
    if (reached === null) return marks;
    const step = mat3.translation(vec2.sub(reached, start));
    return marks.map((mark) => (touches(mark.id, target) ? carried(mark, step) : mark));
  };
}

/**
 * Grown from nothing at a point, which is a growth starting at no size.
 *
 * Left out, the point is the middle of the box round the marks, so a thing grows
 * out of where it already is. At the end of the span it is the marks themselves
 * rather than the marks rebuilt through a transform of one, so a growth that has
 * finished leaves the geometry the author wrote.
 */
export function growFrom(target: string, from?: Vec2): Animation {
  return scale(target, 1, { from: 0, pivot: from });
}

/** A mark's own colours replaced, fill and stroke together. */
function painted(mark: Mark, colour: Colour): Mark {
  if (mark.kind === 'text') return { ...mark, fill: { ...mark.fill, colour } };
  return {
    ...mark,
    fill: mark.fill ? { ...mark.fill, colour } : undefined,
    stroke: mark.stroke ? { ...mark.stroke, colour } : undefined,
  };
}

/** A mark walked a fraction of the way towards a colour, each of its own colours
 * from where that colour stands. */
function paintedTowards(mark: Mark, colour: Colour, along: number): Mark {
  const towards = (from: Colour | undefined) =>
    from === undefined ? colour : lerpColour(from, colour, along);
  if (mark.kind === 'text') return { ...mark, fill: { ...mark.fill, colour: towards(mark.fill.colour) } };
  return {
    ...mark,
    fill: mark.fill ? { ...mark.fill, colour: towards(mark.fill.colour) } : undefined,
    stroke: mark.stroke ? { ...mark.stroke, colour: towards(mark.stroke.colour) } : undefined,
  };
}

export interface IndicateOptions extends AboutOptions {
  /** How big it gets at the middle of the span. */
  factor?: number;
  /** Walked towards over the span and back again, so the mark ends in the colour
   * it started in. */
  colour?: Colour;
}

/**
 * Swelled and settled, to point at something without moving it.
 *
 * Each of the mark's own colours is walked towards the colour named and back
 * again, so the swell and the colour reach their furthest at the same moment. A
 * mark part of the way there carries no name, so it paints the mixed channels
 * rather than following a page's theme for the span it is swelling.
 */
export function indicate(target: string, options: IndicateOptions = {}): Animation {
  const peak = options.factor ?? 1.2;
  const swell = about(target, options, (along, pivot) => {
    const factor = lerp(1, peak, thereAndBack(along));
    return factor === 1 ? null : around(pivot, mat3.scaling(vec2(factor, factor)));
  });
  const colour = options.colour;
  return (marks, along) => {
    const swelled = swell(marks, along);
    if (colour === undefined || along <= 0 || along >= 1) return swelled;
    if (!swelled.some((mark) => touches(mark.id, target))) return swelled;
    const towards = thereAndBack(along);
    return swelled.map((mark) =>
      touches(mark.id, target) ? paintedTowards(mark, colour, towards) : mark
    );
  };
}

export interface FlashOptions {
  stroke: Stroke;
  /** Where it flashes from. The middle of the box round the marks unless named. */
  at?: Vec2;
  rays?: number;
  /** How far the far end of a ray reaches at the widest, in figure units. Twice
   * the distance from the middle of the box to its corner unless named, so the
   * rays sit outside the thing they are pointing at. */
  reach?: number;
  /** Where the near end of a ray sits, as a share of the reach. */
  inner?: number;
}

/**
 * Rays out from a point and gone, for a moment a figure wants a reader to look
 * at.
 *
 * The rays are in the list at every fraction of the span, at nothing at both
 * ends, rather than appended part way through. A mark that arrives between one
 * frame and the next turns up in a comparison between two frames as something
 * that changed, and a figure's marks are compared frame to frame by every gate
 * here.
 */
export function flash(target: string, options: FlashOptions): Animation {
  const count = Math.max(1, Math.round(options.rays ?? 12));
  const inner = options.inner ?? 0.5;
  return (marks, along) => {
    const touched = marks.filter((mark) => touches(mark.id, target));
    if (touched.length === 0) return marks;
    const box = boundsOfMarks(touched);
    if (box === null) return marks;
    const centre = options.at ?? centreOf(box);
    const corner = Math.hypot(interval.span(box.x) / 2, interval.span(box.y) / 2);
    const reach = options.reach ?? corner * 2;
    const opacity = thereAndBack(along);
    const rays: Mark[] = [];
    for (let ray = 0; ray < count; ray++) {
      const angle = (2 * Math.PI * ray) / count;
      const direction = vec2(Math.cos(angle), Math.sin(angle));
      const near = vec2.add(centre, vec2.scale(direction, reach * inner * along));
      const far = vec2.add(centre, vec2.scale(direction, reach * along));
      rays.push({
        kind: 'path',
        id: `${target}/flash/${ray}`,
        path: line(near, far),
        stroke: options.stroke,
        opacity,
      });
    }
    return [...marks, ...rays];
  };
}

export interface WriteOptions {
  /**
   * How far the sweep runs across a text mark, in figure units.
   *
   * It is given rather than measured because nothing here measures a string: a
   * text mark is a family name a painter hands to the platform, so how wide the
   * words come out is not known until they are drawn. A text mark under a write
   * that names no run fades instead.
   */
  across?: number;
  /** How much of the span each mark's own drawing takes, as a share of it. An
   * even share unless a figure names one, so the marks abut rather than
   * overlap. */
  covers?: number;
}

/**
 * How much of a line of type stands below its baseline, against its size.
 *
 * A line of type stands one size tall with a fifth of it under the baseline,
 * which is the box a text mark occupies. The sweep cuts across the words and
 * never along them, so a band any taller than that box would only reach outside
 * the frame for a label written near its edge.
 */
const WRITTEN_BELOW = 0.2;

/** Where the near edge of a sweep sits, which is the anchor for text that starts
 * there and the whole run back for text that ends there. */
function sweepFrom(mark: TextMark, across: number): number {
  if (mark.align === 'middle') return mark.at.x - across / 2;
  if (mark.align === 'end') return mark.at.x - across;
  return mark.at.x;
}

/** The bottom of the box a line of type stands in, which the anchor sits on the
 * baseline of unless the mark says otherwise. */
function writtenFoot(mark: TextMark): number {
  if (mark.baseline === 'middle') return mark.at.y - mark.size / 2;
  if (mark.baseline === 'hanging') return mark.at.y - mark.size;
  return mark.at.y - WRITTEN_BELOW * mark.size;
}

/**
 * Written on: a path drawn from its start and a string uncovered from its near
 * edge, one mark after another.
 *
 * The marks under the target take an even share of the span each and are drawn
 * in the order they stand in, so a typeset rule writes glyph by glyph where
 * `draw` writes every glyph at once. That order is the one the equation walk
 * wrote them in, which is the order the expression reads.
 *
 * A string is uncovered behind a rectangle rather than drawn stroke by stroke.
 * Drawing the strokes needs the outlines of the face, and a text mark carries a
 * family name rather than a font, so the outlines are not here to draw. What the
 * sweep costs is that a letter arrives whole from its left edge; what it saves is
 * that the painter still writes the string as text.
 */
export function write(target: string, options: WriteOptions = {}): Animation {
  const across = options.across;
  return (marks, along) => {
    const written = marks.filter((mark) => touches(mark.id, target));
    if (written.length === 0) return marks;
    const covers = Math.min(1, Math.max(1e-6, options.covers ?? 1 / written.length));
    const step = written.length > 1 ? (1 - covers) / (written.length - 1) : 0;

    const share = new Map<string, number>();
    written.forEach((mark, at) => {
      const raw = (along - at * step) / covers;
      share.set(mark.id, raw <= 0 ? 0 : raw >= 1 ? 1 : raw);
    });

    return marks.map((mark) => {
      const reached = share.get(mark.id);
      if (reached === undefined) return mark;
      if (mark.kind !== 'text') return { ...mark, path: trimPath(mark.path, reached) };
      if (across === undefined) return { ...mark, opacity: (mark.opacity ?? 1) * reached };
      const from = sweepFrom(mark, across);
      const foot = writtenFoot(mark);
      const band = {
        x: interval(from, from + across * reached),
        y: interval(foot, foot + mark.size),
      };
      return { ...mark, clip: mark.clip ? (overlapOf(mark.clip, band) ?? band) : band };
    });
  };
}

export interface WiggleOptions extends AboutOptions {
  /** How big it gets at the widest of the swell. */
  factor?: number;
  /** How far it rocks either way, in radians. */
  angle?: number;
  /** How many times it rocks over the span. */
  rocks?: number;
}

/**
 * A swell and a rock about a point, for a figure that wants something noticed
 * without moving it.
 *
 * The swell is `indicate`'s, out and back over the span, and the rock is a sine
 * of a whole number of turns, so both are at nothing at both ends and the marks
 * come back the geometry they went in as. A whole number of rocks is what makes
 * that true of the turn: half a rock would leave the shape at an angle when the
 * span ended.
 */
export function wiggle(target: string, options: WiggleOptions = {}): Animation {
  const peak = options.factor ?? 1.1;
  const angle = options.angle ?? 0.1;
  const rocks = Math.max(1, Math.round(options.rocks ?? 3));
  return about(target, options, (along, pivot) => {
    const factor = lerp(1, peak, thereAndBack(along));
    const turned = angle * Math.sin(2 * Math.PI * rocks * along);
    if (factor === 1 && turned === 0) return null;
    return around(pivot, mat3.multiply(mat3.rotation(turned), mat3.scaling(vec2(factor, factor))));
  });
}

export interface WaveOptions {
  /** Which way a point is pushed. Up unless named. */
  direction?: Vec2;
  /** How far the furthest point is pushed, in figure units. */
  amplitude?: number;
  /** How much of the crossing the band covers at once, as a share of it. */
  covers?: number;
}

/** Every point a path is made of, moved by a function of where it stands. */
function displacedPath(path: Path, push: (point: Vec2) => Vec2): Path {
  return path.map((subpath) => ({
    start: push(subpath.start),
    curves: subpath.curves.map((curve) => ({
      control1: push(curve.control1),
      control2: push(curve.control2),
      to: push(curve.to),
    })),
    closed: subpath.closed,
  }));
}

/**
 * A hump travelling across a shape, pushing the points it reaches.
 *
 * The hump is a raised cosine of the band's own width, so a point enters and
 * leaves the push smoothly and the shape is exactly the one it started as at
 * both ends of the span. The band runs from behind one edge of the shape to past
 * the other, which is what makes the wave cross rather than swell in place.
 *
 * The push moves the control points a path is made of rather than resampling it,
 * so a piece whose two ends the band has not both reached bends at one end. A
 * shape drawn with few pieces therefore shows a coarser wave than one drawn with
 * many, and a plotted curve carries enough points for the difference not to
 * show.
 *
 * The box the crossing is measured across is read off the marks as they arrive,
 * which is before this has moved them, for the reason a turn reads its pivot
 * once.
 */
export function wave(target: string, options: WaveOptions = {}): Animation {
  const direction = options.direction ?? vec2(0, 1);
  const amplitude = options.amplitude ?? 0.2;
  const covers = Math.min(1, Math.max(1e-6, options.covers ?? 0.3));
  // Turned a quarter clockwise off the push, so a shape pushed up is crossed
  // from left to right.
  const across = vec2(direction.y, -direction.x);
  return (marks, along) => {
    const touched = marks.filter((mark) => touches(mark.id, target));
    if (touched.length === 0) return marks;
    const box = boundsOfMarks(touched);
    if (box === null) return marks;

    const corners = [
      vec2(box.x.from, box.y.from),
      vec2(box.x.to, box.y.from),
      vec2(box.x.from, box.y.to),
      vec2(box.x.to, box.y.to),
    ].map((corner) => vec2.dot(corner, across));
    const low = Math.min(...corners);
    const reach = Math.max(...corners) - low;
    const centre = along * (1 + covers) - covers / 2;

    const push = (point: Vec2): Vec2 => {
      const u = reach > 0 ? (vec2.dot(point, across) - low) / reach : 0;
      const off = (u - centre) / covers;
      if (off <= -0.5 || off >= 0.5) return point;
      return vec2.add(point, vec2.scale(direction, amplitude * (1 + Math.cos(2 * Math.PI * off)) / 2));
    };

    return marks.map((mark) => {
      if (!touches(mark.id, target)) return mark;
      if (mark.kind === 'text') return { ...mark, at: push(mark.at) };
      return { ...mark, path: displacedPath(mark.path, push) };
    });
  };
}

export interface PassingFlashOptions {
  stroke: Stroke;
  /** How much of the path the light covers at once, as a share of the path's own
   * length. */
  covers?: number;
}

/**
 * A light travelling the length of a path and gone.
 *
 * The window runs from behind the start to past the end, so the light enters at
 * one end and leaves at the other rather than appearing whole and vanishing
 * whole. It is in the list at every fraction of the span and holds no path at
 * both ends, for the reason a flash keeps its rays: a mark that arrives between
 * one frame and the next turns up in a comparison between two frames as
 * something that changed.
 *
 * A text mark carries no path for a light to run along and is passed over.
 */
export function showPassingFlash(target: string, options: PassingFlashOptions): Animation {
  const covers = Math.min(1, Math.max(0, options.covers ?? 0.2));
  return (marks, along) => {
    const far = along * (1 + covers);
    const lit: Mark[] = [];
    for (const mark of marks) {
      if (!touches(mark.id, target) || mark.kind === 'text') continue;
      lit.push({
        kind: 'path',
        id: `${mark.id}/passing`,
        path: pathWindow(mark.path, far - covers, far),
        stroke: options.stroke,
        clip: mark.clip,
      });
    }
    return lit.length === 0 ? marks : [...marks, ...lit];
  };
}

export interface CircumscribeOptions {
  stroke: Stroke;
  /** A box round the thing, or the ellipse through the same four sides. */
  around?: 'box' | 'ellipse';
  /** How far outside the box it sits, in figure units. */
  padding?: number;
}

/**
 * A shape drawn round something and then let go.
 *
 * The first half of the span draws it on and the second half fades it, so one
 * span is the whole gesture rather than two a figure has to line up. The shape
 * is in the list at every fraction, with nothing drawn at the beginning and
 * nothing showing at the end, for the reason a flash keeps its rays.
 */
export function circumscribe(target: string, options: CircumscribeOptions): Animation {
  const padding = options.padding ?? 0;
  return (marks, along) => {
    const touched = marks.filter((mark) => touches(mark.id, target));
    if (touched.length === 0) return marks;
    const box = boundsOfMarks(touched);
    if (box === null) return marks;

    const centre = centreOf(box);
    const across = interval.span(box.x) / 2 + padding;
    const up = interval.span(box.y) / 2 + padding;
    const whole =
      (options.around ?? 'box') === 'ellipse'
        ? transformPath(circle(vec2(0, 0), 1), mat3.multiply(mat3.translation(centre), mat3.scaling(vec2(across, up))))
        : polygon([
            vec2(centre.x - across, centre.y - up),
            vec2(centre.x + across, centre.y - up),
            vec2(centre.x + across, centre.y + up),
            vec2(centre.x - across, centre.y + up),
          ]);

    const drawing = along <= 0.5;
    return [
      ...marks,
      {
        kind: 'path',
        id: `${target}/circumscribed`,
        path: drawing ? trimPath(whole, along * 2) : whole,
        stroke: options.stroke,
        opacity: drawing ? 1 : 2 - along * 2,
      },
    ];
  };
}
