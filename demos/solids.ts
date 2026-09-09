/**
 * The solids demo: a sphere, a cube, a cylinder and a torus turning together,
 * with a curve wound on two of them.
 *
 * The four solids are the shapes the format names rather than parametrises, and
 * each hands a scene its cells rather than one shape, so a curve that passes
 * through a solid is sorted against the pieces of it. The helix on the cylinder
 * and the trefoil on the torus are what make that visible: both wrap the solid
 * they lie on, so at every angle part of each curve is in front of its solid and
 * part is behind it, and a curve sorted whole would be painted entirely on one
 * side.
 *
 * The trefoil is the (2, 3) torus knot, which winds twice about the axis while it
 * winds three times through the hole, and it lies exactly on the torus it is
 * drawn on for every value of its parameter.
 *
 * Four solids have no picture in a saddle cut by a plane, so this is a figure of
 * its own, the way the phase portrait was given one.
 */
import {
  mat3,
  textScale,
  vec2,
  vec3,
  type Expression,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type NodeRecord,
  type Point3Record,
  type SceneItemRecord,
  type ShadeRecord,
  type Camera3Record,
  resolveFigure,
} from '../index.js';
import { EMBER, INK, MIST, SHADE_THEME, SKY, shadeOf } from './palette.js';
import { stripOf } from './strip.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const edge = { colour: MIST, width: 0.008 };
const coil = { colour: EMBER, width: 0.05 };
const knot = { colour: SKY, width: 0.05 };

const over = (operator: '+' | '-' | '*' | '/', left: Expression, right: Expression): Expression => ({
  kind: 'arithmetic',
  operator,
  left,
  right,
});
const call = (name: string, ...args: readonly Expression[]): Expression => ({ kind: 'call', name, arguments: args });
const reads = (name: string): Expression => ({ kind: 'variable', name });

/** How far round the curve's own parameter has gone, in radians, from the run of
 * nothing to one every curve in space is read over. */
const turns = (count: number): Expression => over('*', count * 2 * Math.PI, reads('t'));

/** How big each solid is. The four are set to one reach so that no panel reads as
 * the important one, and the reach is what the camera's frame is cut to. */
const REACH = 1.15;
const SPHERE = REACH;
const CUBE = 1.7;
const CYLINDER = { radius: 0.8, height: 2.1 };
const TORUS = { ring: 0.78, tube: 0.36 };

/** Where the eye sits: once round the middle on the one track this figure turns
 * on, kept at one height, looking at the origin each panel puts its solid on. */
const AWAY = 4.6;
const UP = 2.3;
const turn: Expression = { kind: 'arithmetic', operator: '*', left: 2 * Math.PI, right: { kind: 'track', name: 'turn' } };
const around = (name: 'cos' | 'sin'): Expression => over('*', AWAY, call(name, turn));

/**
 * The frame the camera cuts, which is shorter than a panel is wide.
 *
 * A solid drawn to the panel's own width would touch the label under it at the
 * angle it reaches furthest, since a cube seen corner on is its diagonal wide
 * rather than its edge.
 */
export const FRAME = 4.2;

export const camera: Camera3Record = {
  eye: { x: around('cos'), y: around('sin'), z: UP },
  target: vec3(0, 0, 0),
  up: vec3(0, 0, 1),
  projection: { kind: 'perspective', fov: Math.PI / 5, height: FRAME, near: 0.2 },
};

/** Which way the light comes from, over the shoulder and to one side, so a sphere
 * reads as round rather than as a flat disc. */
export const LIGHT = vec3(-0.4, -0.6, 0.7);

/**
 * The narrowest and widest a closed solid faces the light.
 *
 * A closed solid turns every direction to the light, so its cells reach both ends
 * of the ramp and the band is the whole of nothing to one, where a surface drawn
 * over a plane reaches only a part of it.
 */
export const FACING = { from: 0, to: 1 };

const SHADES = Object.keys(SHADE_THEME).length;
const shade: ShadeRecord = {
  ramp: Array.from({ length: SHADES }, (_, step) => shadeOf(step / (SHADES - 1))),
  band: FACING,
};

/**
 * How many steps each solid is cut into.
 *
 * The cube is cut into two rather than the ten or more the round three take, since
 * every one of its faces is flat and a finer grid over a flat face buys nothing
 * but marks. The round three are cut fine enough that a cell's own depth varies
 * less than the standoff the curves stand at, which is what stops a curve on the
 * near side of a solid being sorted under a cell of it.
 */
export const STEPS = { sphere: 14, cube: 2, cylinder: 10, torus: 18 };

/** How many pieces each curve is cut into. Each piece is sorted on its own, so the
 * count is how finely the curve can pass in and out of the solid it wraps. */
export const PIECES = { coil: 96, knot: 120 };

const skin = { shade, light: LIGHT, stroke: edge };

/**
 * How far outside its solid each curve stands.
 *
 * A curve drawn at the solid's own radius shares a depth with the cells under it,
 * and the sort between two pieces at one depth is decided by the order they were
 * given rather than by the picture: the helix came out broken into dashes on the
 * near side of the cylinder as well as the far. The standoff is what separates
 * them, and it is larger than half the curve's own stroke so the curve clears the
 * surface rather than sinking into it. The trefoil takes the smaller of the two
 * because the torus it stands on is smaller, and a standoff read against the tube
 * rather than against the picture would swing the knot wide of it.
 */
export const LIFT = { coil: 0.07, knot: 0.045 };

/** The helix up the side of the cylinder, three turns of it, written as the place
 * it reaches at each value of its parameter. */
const helix: Point3Record = {
  x: over('*', CYLINDER.radius + LIFT.coil, call('cos', turns(3))),
  y: over('*', CYLINDER.radius + LIFT.coil, call('sin', turns(3))),
  z: over('*', CYLINDER.height, over('-', reads('t'), 0.5)),
};

/**
 * The trefoil on the torus, which is the (2, 3) torus knot.
 *
 * Its distance from the ring circle is one number at every value of the
 * parameter, which is what puts it on a torus about that ring rather than near
 * one. The number is the tube radius and the standoff, so the curve stands clear
 * of the torus drawn under it.
 */
const trefoil: Point3Record = {
  x: over('*', over('+', TORUS.ring, over('*', TORUS.tube + LIFT.knot, call('cos', turns(3)))), call('cos', turns(2))),
  y: over('*', over('+', TORUS.ring, over('*', TORUS.tube + LIFT.knot, call('cos', turns(3)))), call('sin', turns(2))),
  z: over('*', TORUS.tube + LIFT.knot, call('sin', turns(3))),
};

/** One panel: a scene of its own, so each solid is sorted against what lies on it
 * and against nothing else, moved to its quarter of the figure. */
function panel(name: string, at: { x: number; y: number }, items: readonly SceneItemRecord[], label: string): NodeRecord {
  return {
    kind: 'group',
    name,
    transform: mat3.translation(vec2(at.x, at.y)),
    children: [
      { kind: 'scene3', name: 'body', camera, items },
      {
        kind: 'text',
        name: 'name',
        at: vec2(0, -PANEL.down / 2 + 0.18),
        content: label,
        size: TEXT.label,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

/** How wide and how tall one panel is in the figure's own units. */
const PANEL = { across: 4.3, down: 4.5 };

export const TEXT = textScale(0.26);

const extent: Extent = { width: 8.8, height: 9.4 };

export const scene: NodeRecord = {
  kind: 'group',
  name: 'solids',
  children: [
    panel('ball', { x: -PANEL.across / 2, y: PANEL.down / 2 + 0.2 }, [
      { kind: 'sphereCells', name: 'skin', centre: vec3(0, 0, 0), radius: SPHERE, options: { ...skin, resolution: STEPS.sphere } },
    ], 'a sphere'),
    panel('box', { x: PANEL.across / 2, y: PANEL.down / 2 + 0.2 }, [
      { kind: 'cubeCells', name: 'skin', centre: vec3(0, 0, 0), size: CUBE, options: { ...skin, resolution: STEPS.cube } },
    ], 'a cube'),
    panel('can', { x: -PANEL.across / 2, y: -PANEL.down / 2 + 0.2 }, [
      {
        kind: 'cylinderCells',
        name: 'skin',
        centre: vec3(0, 0, 0),
        radius: CYLINDER.radius,
        height: CYLINDER.height,
        options: { ...skin, resolution: STEPS.cylinder },
      },
      { kind: 'curvePieces3', name: 'coil', curve: { of: helix, resolution: PIECES.coil }, options: { stroke: coil } },
    ], 'a cylinder, with a helix'),
    panel('ring', { x: PANEL.across / 2, y: -PANEL.down / 2 + 0.2 }, [
      {
        kind: 'torusCells',
        name: 'skin',
        centre: vec3(0, 0, 0),
        ring: TORUS.ring,
        tube: TORUS.tube,
        options: { ...skin, resolution: STEPS.torus },
      },
      { kind: 'curvePieces3', name: 'knot', curve: { of: trefoil, resolution: PIECES.knot }, options: { stroke: knot } },
    ], 'a torus, with a trefoil'),
    {
      kind: 'text',
      name: 'title',
      at: vec2(0, extent.height / 2 - 0.34),
      content: 'four solids, and two curves wound on them',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
  ],
  style: TYPE,
};

export const DURATION = 6;
export const STILL = 4.5;

/** When the turn starts and how long it runs. The four panels fade in over the
 * first of it, so the figure opens empty and the solids arrive already turning. */
const TURN_FROM = 0.1;

export const written: FigureRecord = {
  extent,
  fit: 'contain',
  scene,
  timeline: {
    spans: [
      { entry: { kind: 'fadeIn', target: 'solids/ball' }, from: 0, to: 0.7 },
      { entry: { kind: 'fadeIn', target: 'solids/box' }, from: 0.3, to: 1 },
      { entry: { kind: 'fadeIn', target: 'solids/can/body/skin' }, from: 0.6, to: 1.3 },
      { entry: { kind: 'fadeIn', target: 'solids/can/name' }, from: 0.6, to: 1.3 },
      { entry: { kind: 'fadeIn', target: 'solids/ring/body/skin' }, from: 0.9, to: 1.6 },
      { entry: { kind: 'fadeIn', target: 'solids/ring/name' }, from: 0.9, to: 1.6 },
      // Each piece of a curve is a mark of its own, so a curve is wound on by
      // fading its pieces in one after another rather than by drawing it: `draw`
      // trims every mark it reaches, which would grow all the pieces at once.
      ...windOn('solids/can/body/coil', PIECES.coil, 1.4, 2.9),
      ...windOn('solids/ring/body/knot', PIECES.knot, 2.4, 4),
      { entry: { kind: 'fadeIn', target: 'solids/title' }, from: 4.2, to: 4.8 },
    ],
    duration: DURATION,
  },
  tracks: { turn: [{ time: TURN_FROM, value: 0 }, { time: DURATION, value: 1 }] },
  duration: DURATION,
  still: STILL,
};

/** One span per piece of a curve, each starting a little after the last, so the
 * curve arrives along its own length. */
function windOn(target: string, pieces: number, from: number, to: number) {
  const each = (to - from) / pieces;
  return Array.from({ length: pieces }, (_, at) => ({
    entry: { kind: 'fadeIn' as const, target: `${target}/${at}` },
    from: from + at * each,
    to: from + at * each + each * 3,
  }));
}

export const solids: Figure = resolveFigure(written);

/** How wide and how tall one column of the strip is, which is the figure's own
 * extent with a gap around it. */
const SLOT = { across: 9.3, down: 9.9 };

/** The times the strip shows: the first two solids alone, the helix winding on,
 * the trefoil winding on, and all four turned to the still. */
export const FRAMES = [1.3, 2.6, 3.8, STILL] as const;

export function stripMarks(
  times: readonly number[] = FRAMES,
  columns = times.length,
  figure: Figure = solids
): { marks: readonly Mark[]; extent: Extent } {
  return stripOf(figure, 'solids', times, columns, SLOT);
}
