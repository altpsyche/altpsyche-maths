/**
 * The matrix demo: a number plane under a linear map, with the map's own numbers
 * written beside it.
 *
 * A linear map has no picture in a graph of a function, where the axes do not
 * move, and none on a surface either, where what turns is the camera. So the map
 * is given a picture whose whole purpose is the map, the way the boolean
 * operations and the rotation were.
 *
 * The plane is clipped to a square panel, so a grid line carried out of the
 * panel is cut at its edge rather than run off across the figure. A clip does
 * not ride the transform, which is what lets the panel stand still while the
 * grid inside it deforms.
 *
 * One clock drives the whole picture. The map and the four counted entries are
 * spans over the same interval with the same curve, so each entry reads the same
 * eased fraction the map does and the number written is the number the grid is
 * at. The track the table and the line read names that same curve over those
 * same seconds, so it is the one clock written a second way rather than a
 * second clock.
 *
 * The area is drawn rather than written. The determinant of a matrix reached
 * entry by entry is not linear in that fraction, so a number counted from 1 to 2
 * would be wrong at every time between, where the square itself is right at all
 * of them.
 */
import {
  TEXT_RATIO,
  frameTimesOf,
  interval,
  resolveFigure,
  scaleOf,
  textScale,
  vec2,
  type Coords,
  type Expression,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type Scale,
  type TextContent,
  type Track,
  type Transform2D,
  type NodeRecord,
} from '../index.js';
import { EMBER, FROST, INK, PEACH, STEEL } from './palette.js';
import { stripOf } from './strip.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const grid = { colour: STEEL, width: 0.02 };
const axis = { colour: INK, width: 0.045 };
const edge = { colour: EMBER, width: 0.055 };
const wash = { colour: PEACH };
const bracket = { colour: INK, width: 0.04 };
const rule = { colour: INK, width: 0.025 };

/** How far the panel reaches from the origin, in graph units and in figure units
 * alike, since one figure unit is one graph unit here. */
export const REACH = 3;

/**
 * How far the grid is drawn past the panel it is cut to.
 *
 * A grid drawn only as far as the panel empties as the map carries its lines
 * out of the panel, and a picture of a deforming grid with four lines left in it
 * shows nothing. The reach is what the widest column of the map needs to keep
 * the panel full: the map takes a point at 8 in to 3 or further out along both
 * axes at every fraction of the way.
 */
export const DRAWN = 8;

/** The plane's coordinates, at one figure unit to one graph unit, so the map the
 * matrix writes is the map the grid is under. A plane drawn at any other scale
 * would deform by a matrix conjugated by that scale, and the numbers beside it
 * would name a different map. */
export const coords: Coords = {
  x: { graph: interval(-DRAWN, DRAWN), units: interval(-DRAWN, DRAWN) },
  y: { graph: interval(-DRAWN, DRAWN), units: interval(-DRAWN, DRAWN) },
};

/**
 * The map the picture reaches, column-major, which is the first column and then
 * the second.
 *
 * Its determinant is 2, so the unit square ends at twice the area it began with,
 * which is the reading the square is drawn for. The two columns are where the
 * two sides of that square land.
 */
export const MAP: Transform2D = [2, 1, 0, 1, 1.5, 0, 0, 0, 1];

/** The entries in the order the matrix draws them, which is by row, against the
 * identity they are counted from. */
export const ENTRIES = [
  { from: 1, to: MAP[0] },
  { from: 0, to: MAP[3] },
  { from: 0, to: MAP[1] },
  { from: 1, to: MAP[4] },
];

/** How long the map takes to go out and come back. */
export const TURN = 6;

/** Where the matrix stands, clear of the panel. */
const MATRIX_AT = vec2(5.9, 0.5);
const CAPTION_Y = -3.5;
export const TEXT = textScale(0.3 / TEXT_RATIO);

/**
 * The frame, shaped and placed from what the picture reaches.
 *
 * It runs x -3.2 to 7.6 and y -3.85 to 3.15: the panel's own square, the column
 * beside it out to the tip the line ends in at 7.54, and the captions at their
 * own size below both. It is off the origin because everything beside the panel
 * stands to the right of it.
 */
export const CENTRE = vec2(2.2, -0.35);
const extent: Extent = { width: 10.8, height: 7, centre: CENTRE };

/** The panel the plane is cut to, which is the square the grid began as. */
const PANEL = { x: interval(-REACH, REACH), y: interval(-REACH, REACH) };

/** Everything the map carries: the grid, the two axes through the origin, and
 * the unit square. */
const plane: NodeRecord = {
  kind: 'group',
  name: 'plane',
  style: { clip: PANEL },
  children: [
    { kind: 'numberPlane', name: 'grid', coords, options: { stroke: grid, ticks: 2 * DRAWN + 1, minors: 2 } },
    {
      kind: 'shape',
      name: 'across',
      path: { kind: 'line', from: vec2(-DRAWN, 0), to: vec2(DRAWN, 0) },
      style: { stroke: axis },
    },
    {
      kind: 'shape',
      name: 'up',
      path: { kind: 'line', from: vec2(0, -DRAWN), to: vec2(0, DRAWN) },
      style: { stroke: axis },
    },
    {
      kind: 'shape',
      name: 'square',
      path: { kind: 'polygon', points: [vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1)] },
      style: { fill: wash, stroke: edge },
    },
  ],
};

/** The matrix, written at the identity, since every entry is counted from there
 * to the map over the same span the map runs on. */
const numbers: NodeRecord = {
  kind: 'matrix',
  name: 'map',
  entries: [
    ['1.0', '0.0'],
    ['0.0', '1.0'],
  ],
  options: {
    at: MATRIX_AT,
    width: 2.9,
    height: 2.3,
    size: TEXT.note,
    fill: ink,
    stroke: bracket,
    align: 'middle',
  },
};

/**
 * How far through the map the picture has reached, as one number.
 *
 * The key names the curve the map's own span names, over the same seconds and
 * from the same nothing to the same whole, so the table and the line read the
 * clock the grid is read from rather than a second clock beside it.
 */
export const FRACTION: Track = [
  { time: 0, value: 0, curve: 'thereAndBack' },
  { time: TURN, value: 1 },
];

const fraction: Expression = { kind: 'track', name: 'f' };

/** One entry of the map at the fraction reached, which is the identity's number
 * walked towards the map's. */
const entryAt = (at: number): Expression => ({
  kind: 'arithmetic',
  operator: '+',
  left: ENTRIES[at].from,
  right: { kind: 'arithmetic', operator: '*', left: ENTRIES[at].to - ENTRIES[at].from, right: fraction },
});

/** The determinant as the entries give it, ad less bc, which is the area of the
 * parallelogram the unit square lands on. It is quadratic in the fraction, so
 * the marker reading it off the line travels at a pace of its own rather than
 * the pace the grid deforms at. */
const determinant: Expression = {
  kind: 'arithmetic',
  operator: '-',
  left: { kind: 'arithmetic', operator: '*', left: entryAt(0), right: entryAt(3) },
  right: { kind: 'arithmetic', operator: '*', left: entryAt(1), right: entryAt(2) },
};

/** Where the two basis vectors land, written as the pair of entries of one
 * column of the map. */
const landsAt = (across: number, up: number): TextContent => ({
  template: '({0}, {1})',
  holes: [
    { value: entryAt(across), precision: 0.1 },
    { value: entryAt(up), precision: 0.1 },
  ],
});

/** Where the table stands and how its two columns are split, the second wide
 * enough for a pair of numbers written to a tenth. */
const TABLE_AT = vec2(MATRIX_AT.x, -1.48);
const TABLE_COLUMNS = [1.25, 1.75];

/** The two columns of the map as the two places the basis vectors go, which is
 * the same four numbers the matrix writes, read a pair at a time. */
const columns: NodeRecord = {
  kind: 'table',
  name: 'columns',
  cells: [
    ['in', 'out'],
    ['(1, 0)', landsAt(0, 2)],
    ['(0, 1)', landsAt(1, 3)],
  ],
  options: {
    at: TABLE_AT,
    columns: TABLE_COLUMNS,
    rowHeight: 0.44,
    size: TEXT.label,
    fill: ink,
    stroke: rule,
    header: true,
    align: 'middle',
  },
};

/** The line the determinant is read off, one figure unit to one unit of area,
 * and where it sits under the table. */
export const AREA_LINE: Scale = scaleOf(interval(0, 3), interval(4.4, 7.4));
const LINE_Y = -2.86;

/** The line, and the marker standing on it at the area the square encloses. The
 * marker takes the square's own colour, since the number it points at is the
 * area of that square. */
const areaLine: readonly NodeRecord[] = [
  {
    kind: 'text',
    name: 'says',
    at: vec2(MATRIX_AT.x, -2.5),
    content: 'the determinant',
    size: TEXT.label,
    options: { fill: ink, align: 'middle' },
  },
  {
    kind: 'numberLine',
    name: 'area',
    scale: AREA_LINE,
    options: {
      stroke: rule,
      fill: ink,
      size: TEXT.tick,
      at: LINE_Y,
      ticks: 4,
      tickLength: 0.18,
      gap: 0.05,
      tip: 0.14,
    },
  },
  {
    kind: 'dot',
    name: 'reading',
    at: {
      kind: 'point',
      x: {
        kind: 'call',
        name: 'remap',
        arguments: [determinant, AREA_LINE.graph.from, AREA_LINE.graph.to, AREA_LINE.units.from, AREA_LINE.units.to],
      },
      y: LINE_Y,
    },
    radius: 0.085,
    fill: { colour: EMBER },
  },
];

export const scene: NodeRecord = {
  kind: 'group',
  name: 'map',
  children: [
    { kind: 'shape', name: 'panel', path: { kind: 'rect', corner: vec2(-REACH, -REACH), width: 2 * REACH, height: 2 * REACH }, style: { fill: { colour: FROST } } },
    plane,
    numbers,
    columns,
    ...areaLine,
    {
      kind: 'text',
      name: 'underPanel',
      at: vec2(0, CAPTION_Y),
      content: 'the unit square',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
    {
      kind: 'text',
      name: 'underMatrix',
      at: vec2(MATRIX_AT.x, CAPTION_Y),
      content: 'the map',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
  ],
  style: TYPE,
};

/**
 * The map and its four numbers over one span each, all of them from nothing to
 * the whole duration on `thereAndBack`.
 *
 * The curve is what makes the figure a loop: the map goes out to the whole of
 * itself and returns to the identity, so the picture at the end is the picture
 * at the start.
 */
export const written: FigureRecord = {
  extent,
  scene,
  tracks: { f: FRACTION },
  timeline: {
    spans: [
      { entry: { kind: 'applyMatrix', target: 'map/plane', matrix: MAP }, from: 0, to: TURN, curve: 'thereAndBack' },
      ...ENTRIES.map((entry, at) => ({
        entry: {
          kind: 'countTo' as const,
          target: `map/map/rows/${Math.floor(at / 2)}/${at % 2}`,
          from: entry.from,
          to: entry.to,
          precision: 0.1,
        },
        from: 0,
        to: TURN,
        curve: 'thereAndBack' as const,
      })),
    ],
    duration: TURN,
  },
  duration: TURN,
  still: TURN * 0.25,
  loop: true,
};

export const mapped: Figure = resolveFigure(written);

/**
 * How much wider and taller each frame's slot is than the figure.
 *
 * The gap a slot leaves between two frames is wider than the 1.45 units between
 * the panel and the matrix inside one, so a row of two frames reads as two
 * pictures rather than as four panels.
 */
export const SLOT = 13.4;
export const DOWN = 8.5;

/** Several times of one figure laid out together, as one list of marks. */
export function stripMarks(
  times: readonly number[],
  columns = times.length,
  figure: Figure = mapped
): { marks: readonly Mark[]; extent: Extent } {
  // The figure is drawn off the origin, so each frame is carried off its own
  // middle before it is carried into its slot.
  return stripOf(figure, 'map', times, columns, { across: SLOT, down: DOWN }, () => CENTRE);
}

/** The times the gate reads: the identity, a quarter of the way out, the whole
 * map, and the way back. */
export const TIMES = {
  start: 0,
  quarter: TURN * 0.25,
  half: TURN * 0.5,
  threeQuarters: TURN * 0.75,
};

/** The four frames the strip shows. */
export const FRAMES = frameTimesOf(mapped, { frames: 4 });
