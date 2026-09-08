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
import { trimPath } from './trim.js';
import { lerpPath } from './morph.js';
import { matchGlyphs } from './equation-match.js';
import { pointAlong } from './length.js';
import { scaledWidth } from './width.js';
import { transformFill } from './gradient.js';
import { boundsOfMarks, centreOf } from './bounds.js';
import { interval } from '../values/interval.js';
import type { Colour, Mark, Stroke } from './mark.js';

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
 */
function carried(mark: Mark, through: Mat3): Mark {
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
 * from where that colour stands. A colour neither end can be read from is held at
 * the far end rather than mixed towards a guess. */
function paintedTowards(mark: Mark, colour: Colour, along: number): Mark {
  const towards = (from: Colour | undefined) =>
    from === undefined ? colour : (lerpColour(from, colour, along) ?? colour);
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
 * colour `colourOf` cannot read is held at the far end rather than mixed towards
 * a guess.
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
