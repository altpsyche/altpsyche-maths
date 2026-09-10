/**
 * The flat demo: a tangent sliding along a curve.
 *
 * It was written before the code it needed, as the target the work was built to
 * compile against. A demo written afterwards checks that the code runs, where a
 * demo written first says what the code has to be able to say.
 *
 * At 0.5.0 the picture arrives rather than appearing: the grid fades, the axes
 * draw on, their labels come in one after another, the curve draws, the dot
 * grows out of the origin, and the dot is indicated at the stationary point with
 * its reading boxed. Then the dot walks the curve and flashes at the top.
 *
 * At 0.6.0 the reading gains the rule it comes from, typeset once when this
 * module loads. The number beside it is the same rule with a value put in.
 *
 * At 0.7.0 that rule is two rules. It reads nothing for a slope while the dot is
 * held at the stationary point, and as the dot leaves it the right-hand side
 * walks into the one that depends on x. Both are in the picture at every time
 * and the morph moves one onto the other.
 *
 * At 0.8.0 the walk ends with a brace measuring how far the curve climbed, and
 * its number counts up to that rise. The dot has stopped by then, which is what
 * lets a number here be driven by the clock: every other one is a value of the
 * track and two clocks would be free to disagree.
 *
 * At 0.11.0 the slope field of the curve is drawn behind it. Every arrow lies
 * along the tangent the curve has at that x, so the tangent the dot carries is
 * the one arrow of the field that is being pointed at, and the curve itself is
 * the streamline of the field through the origin.
 *
 * At 2.0.0 the whole of it is a record. The picture is one `FigureRecord` and
 * `demos/tangent.figure.json` is written from it, so what the strip draws is
 * what a file carries and neither is a transcription of the other.
 */
import {
  clamp,
  coordsOf,
  equationFromTex,
  interval,
  labelFor,
  pointAlong,
  pointOf,
  resolveFigure,
  resolveNode,
  resolvePath,
  sampleTrack,
  scaleOf,
  textScale,
  vec2,
  type Equation,
  type Expression,
  type Extent,
  type Figure,
  type FigureRecord,
  type Fill,
  type Mark,
  type Node,
  type NodeRecord,
  type PathRecord,
  type SpanRecord,
  type Stroke,
  type Track,
  type Vec2,
} from '../index.js';
import { AMBER, CREAM, DEEP, EMBER, HAZE, INK, MIST, PANEL, PEACH, STEEL } from './palette.js';
import { stripOf } from './strip.js';
import { TYPE } from './typeface.js';
import { ADVANCE } from './cover.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.02 };
const faint = { colour: MIST, width: 0.012 };
const drawn = { colour: EMBER, width: 0.05 };
const accent = { colour: DEEP, width: 0.035 };

/**
 * The tangent's own weight, nothing at both ends and the accent's full width in
 * the middle.
 *
 * A tangent is a claim about one place on the curve, and a line drawn at one
 * weight all the way to the edge of the graph reads as a line that carries on
 * past it. Thinning to nothing at both ends says the piece that is drawn is the
 * whole of it.
 */
const slope: Stroke = { colour: DEEP, width: { from: 0, to: 0.035, curve: 'thereAndBack' } };
const lit = AMBER;

/** The two colours a field arrow takes, the second where the curve has begun to
 * climb, so the field darkens across the picture the way the curve steepens. */
const gentle = HAZE;
const steep = STEEL;

export const size = { width: 10.8, height: 6 };

/**
 * How far the dot may sit from the middle of the frame, across, before the view
 * starts to follow it, in figure units.
 *
 * The view holds still while the dot is inside that reach and then pushes exactly
 * as far as it must to hold it there, so the grid slides under a dot that stays
 * where a reader is already looking. Following the dot exactly would leave the
 * picture with nothing that stands still.
 */
export const REACH = 1.2;

/**
 * Nine graph units up against five across, so the parabola is cut where it meets
 * the top of its own axis rather than running off the picture.
 *
 * The graph stops at 1.6 up rather than filling the figure, which leaves a band
 * across the top for the reading and the rule it is a value of. Written over the
 * graph instead, both of them sit on live grid lines.
 */
export const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.55, 1.6))
);

/** How long each axis reaches past its last tick, and how wide the arrow head
 * there is. */
export const TIP = 0.18;

/** How far the middle of the frame may travel before the graph's own edge would
 * leave it: the frame's half-width, less the graph's, less the arrow head the
 * axis ends in. */
export const ROOM = size.width / 2 - coords.x.units.to - TIP;

/**
 * The panel the inset is drawn into, in the figure's own units, and how much of
 * the picture it shows.
 *
 * It sits in the band above the graph and to the right of the reading and the
 * rule, which is the one part of this figure nothing else draws in. The band is
 * 1.4 units tall between the top of the graph and the top of the frame, so the
 * panel is 1.26 of that and leaves 0.12 above itself. Its right edge stands at
 * 4.7 because the view follows the dot and the frame's own right edge comes in
 * to 4.78 at the start of the walk, where the dot is furthest left.
 *
 * What it shows is half its size each way, so the magnification is exactly 2 and
 * the two shapes match rather than leaving a margin the fit would have to
 * resolve.
 */
export const LENS = { x: interval(1.9, 4.7), y: interval(1.62, 2.88) };
export const LENS_SHOWS = { width: 1.4, height: 0.63 };

/** How wide the panel's own border is, and what it is drawn along: the border
 * sits outside the rectangle by half its width, so its inner edge lands exactly
 * on the clip the inset's marks are cut to rather than being painted over by
 * them. */
const LENS_EDGE = 0.02;

const LENS_ACROSS = interval.span(LENS.x);
const LENS_UP = interval.span(LENS.y);

/**
 * Where the middle of the frame sits when the dot is at this point.
 *
 * The view follows across and not up and down, because the reading and the rule
 * are placed against the frame and the graph is not: a view that dropped to
 * follow the dot at the stationary point would carry that band down over the top
 * of the grid.
 *
 * It stops where the graph does. A view that followed the dot the whole way
 * carried the grid's left edge, the x axis and its arrow head off the frame, so
 * the axis ran out of the picture instead of ending in a tip.
 */
export function frameAt(point: Vec2): Extent {
  const followed = point.x - clamp(point.x, -REACH, REACH);
  return { ...size, centre: vec2(clamp(followed, -ROOM, ROOM), 0) };
}

export const curve = (x: number) => x * x;

/** The curve as the record draws it, which is the same square of the bound
 * variable the function above takes. */
const squared: Expression = {
  kind: 'arithmetic',
  operator: '*',
  left: { kind: 'variable', name: 'x' },
  right: { kind: 'variable', name: 'x' },
};

/**
 * The wash under the curve, deepest at the top of the graph and palest at the x
 * axis.
 *
 * The axis is the whole vertical run of the graph rather than the height of the
 * region at the time it is drawn, which is what keeps the colour at a given
 * height the same at every time. An axis fitted to the region would also be a
 * point at the start of the walk, where the region has no height, and a gradient
 * whose two ends are one point paints nothing on a canvas.
 */
const wash: Fill = {
  colour: PEACH,
  gradient: {
    from: pointOf(coords, 0, curve(3)),
    to: pointOf(coords, 0, 0),
    stops: [
      { offset: 0, colour: PEACH },
      { offset: 1, colour: CREAM },
    ],
  },
};

/**
 * The direction the curve has at a place, which is one across and the curve's
 * own slope up.
 *
 * The slope is the derivative of the same curve in closed form rather than a
 * reading off the drawn one, because the field covers x that the curve is cut
 * short of where it leaves the top of the graph.
 */
export const slopeField = (at: Vec2) => vec2(1, 2 * at.x);

/** The same direction as the record draws it, over the place a field arrow is
 * sampled at. */
const fieldOf: Expression = {
  kind: 'point',
  x: 1,
  y: {
    kind: 'arithmetic',
    operator: '*',
    left: 2,
    right: { kind: 'member', of: { kind: 'variable', name: 'at' }, name: 'x' },
  },
};

/**
 * How many arrows across and up, chosen so a cell comes out nearly square in
 * figure units rather than tall and thin.
 *
 * Fifty read as scratches rather than as a field over a graph that already
 * carries a grid, a curve, a shaded region, a tangent and a dot. Twenty-one of
 * them, each drawn at a width and a head a reader can see, say the same thing
 * about the same curve. Seven across and three up keeps the cells at 1.053 of
 * square, where seven across and four up comes to 1.267.
 */
export const FIELD = { x: 7, y: 3 };

/** How wide a field arrow's shaft is and how long its head is, in figure units.
 * A head four times the shaft, which is what an arrow takes when nothing says,
 * came to 4.4 pixels at the width the README shows the sheet. */
export const FIELD_WIDTH = 0.03;
export const FIELD_HEAD = 0.16;

/** How long an arrow is, in figure units, against the magnitude of the vector
 * there. It settles towards a third of a figure unit as the curve steepens
 * rather than growing with the slope, since a slope of eight drawn at eight
 * times the length of a slope of one would cover the curve it belongs to. */
const arrowLength: Expression = {
  kind: 'arithmetic',
  operator: '/',
  left: { kind: 'arithmetic', operator: '*', left: 0.34, right: { kind: 'variable', name: 'magnitude' } },
  right: { kind: 'arithmetic', operator: '+', left: 0.6, right: { kind: 'variable', name: 'magnitude' } },
};

/** The slope a field arrow is drawn dark from, which is where the curve has
 * begun to climb. */
const STEEPENS = 3;

/** The stretch the dot walks, from the stationary point to where the curve meets
 * the top of its axis. The walk is measured along this rather than across x, so
 * the dot keeps one speed instead of gathering pace as the curve steepens. */
const walked: PathRecord = { kind: 'plot', coords, of: squared, over: { from: 0, to: 3 } };

export const walkPath = resolvePath(walked);

/** How far along that stretch the dot stands, as a fraction of its length, which
 * is the one number this figure's picture is driven by. */
const along: Expression = { kind: 'track', name: 's' };

/** Where the dot stands, which the tangent, the reading and the followed frame
 * are all read off. */
const point: Expression = {
  kind: 'call',
  name: 'pointAlong',
  arguments: [{ kind: 'path', of: walked }, along],
};

/** The graph x the dot stands at, which is its place across mapped back through
 * the scale it was drawn with. */
const graphX: Expression = {
  kind: 'call',
  name: 'remap',
  arguments: [
    { kind: 'member', of: point, name: 'x' },
    coords.x.units.from,
    coords.x.units.to,
    coords.x.graph.from,
    coords.x.graph.to,
  ],
};

/** Where the middle of the frame sits, as the expression `frameAt` computes: the
 * dot's place across, less the reach the view holds still over, held inside the
 * room the graph's own edge leaves. */
const centred: Expression = {
  kind: 'call',
  name: 'clamp',
  arguments: [
    {
      kind: 'arithmetic',
      operator: '-',
      left: { kind: 'member', of: point, name: 'x' },
      right: { kind: 'call', name: 'clamp', arguments: [{ kind: 'member', of: point, name: 'x' }, -REACH, REACH] },
    },
    -ROOM,
    ROOM,
  ],
};

/** A place in the frame the view has moved to, as a fraction of its width and
 * its height, so a word hung there holds its place on the page while the picture
 * slides under it. */
const placeIn = (across: number, up: number): Expression => ({
  kind: 'point',
  x: { kind: 'arithmetic', operator: '+', left: centred, right: (across - 0.5) * size.width },
  y: (up - 0.5) * size.height,
});

/** The rule at the stationary point and the rule everywhere else, typeset when
 * this module loads rather than at every frame, since the geometry of each is
 * the same at every time. */
const atRest = await equationFromTex('\\frac{dy}{dx} = 0');
const moving = await equationFromTex('\\frac{dy}{dx} = 2x');

/** Where the rules start and the box each is fitted inside. Both are hung from
 * the same left edge, under the reading's own, so the six glyphs they share
 * stand still while the right-hand side walks. Centred instead they would slide
 * sideways as the wider one arrives. Both sit in the band above the graph
 * rather than over it. */
const RULE_WIDTH = 1.2;
const RULE_HEIGHT = 0.6;
const rule = (name: string, equation: Equation): NodeRecord => ({
  kind: 'equationNode',
  name,
  equation,
  options: { at: placeIn(0.02, 0.825), align: 'start', width: RULE_WIDTH, height: RULE_HEIGHT, fill: ink },
});

/** How far the curve climbs over the stretch the dot walks, which is what the
 * brace at the end measures and what its number counts to. */
export const RISE = curve(3);

/** The brace stands on the right of the shaded region, so it is pushed the way
 * the perpendicular of a downward span points, which is away from the curve. */
export const RISE_DEPTH = 0.3;

/** The sizes this figure's text takes, from the numbers on its axes, which are
 * the smallest text it draws. */
export const TEXT = textScale(0.32);

/** The step every number this figure writes is rounded and padded to, which is
 * what keeps the reading the same width as it moves. */
const PRECISION = 0.01;

/**
 * How far the sweep runs across the reading, in figure units.
 *
 * Nothing in the package measures a string, so a write is given the run. It is
 * the average advance these sheets estimate with, over the ten characters the
 * reading writes at its widest. A run short of the words would clip their tail
 * for the rest of the figure, so the estimate is taken at the longest the
 * reading gets rather than at what it says when the sweep runs.
 */
const READING_WIDTH = ADVANCE * TEXT.note * 'slope -0.00'.length;

/** Every label along the x axis, named after the number it shows, which is what
 * lets them arrive one after another. */
const acrossLabels = ['-1', '0', '1', '2', '3', '4'].map((label) => `tangent/axes/x/labels/${label}`);

/**
 * The whole picture, as one record over the fraction of the walk's length the
 * dot stands at.
 *
 * The graph x is recovered from that place rather than driven beside it, so the
 * dot, the tangent and the reading are one number. Driving the dot with a span
 * and the tangent with a track would be two clocks free to disagree.
 */
export const scene: NodeRecord = {
  kind: 'group',
  name: 'tangent',
  children: [
    {
      kind: 'numberPlane',
      name: 'grid',
      coords,
      options: { stroke: faint, minors: 4, minorOpacity: 0.45 },
    },
    { kind: 'axes', name: 'axes', coords, options: { stroke: pen, fill: ink, size: TEXT.tick, tip: TIP } },
    {
      kind: 'shape',
      name: 'area',
      path: {
        kind: 'areaUnder',
        coords,
        curve: { kind: 'plot', coords, of: squared, over: { from: 0, to: graphX } },
      },
      style: { fill: wash },
    },
    {
      kind: 'vectorField',
      name: 'field',
      coords,
      of: fieldOf,
      options: {
        resolution: FIELD,
        lengthOf: arrowLength,
        colourFor: { kind: 'bands', first: gentle, then: [{ above: STEEPENS, colour: steep }] },
        width: FIELD_WIDTH,
        head: FIELD_HEAD,
      },
    },
    { kind: 'shape', name: 'curve', path: { kind: 'plot', coords, of: squared }, style: { stroke: drawn } },
    {
      kind: 'shape',
      name: 'tangent',
      path: { kind: 'tangentAt', coords, curve: walked, x: graphX, reach: 1.2 },
      style: { stroke: slope },
    },
    { kind: 'dot', name: 'point', at: point, radius: 0.08, fill: ink },
    {
      kind: 'text',
      name: 'reading',
      at: placeIn(0.02, 0.91),
      content: {
        template: 'slope {0}',
        holes: [
          {
            value: { kind: 'call', name: 'slopeOf', arguments: [{ kind: 'coords', of: coords }, { kind: 'path', of: walked }, graphX] },
            precision: PRECISION,
          },
        ],
      },
      size: TEXT.note,
      options: { fill: ink },
    },
    { kind: 'group', name: 'equation', children: [rule('at-rest', atRest), rule('moving', moving)] },
    {
      kind: 'group',
      name: 'window',
      children: [
        {
          kind: 'shape',
          name: 'ground',
          path: { kind: 'rect', corner: vec2(LENS.x.from, LENS.y.from), width: LENS_ACROSS, height: LENS_UP },
          style: { fill: { colour: PANEL } },
        },
        {
          kind: 'shape',
          name: 'edge',
          path: {
            kind: 'rect',
            corner: vec2(LENS.x.from - LENS_EDGE / 2, LENS.y.from - LENS_EDGE / 2),
            width: LENS_ACROSS + LENS_EDGE,
            height: LENS_UP + LENS_EDGE,
          },
          style: { stroke: { colour: INK, width: LENS_EDGE } },
        },
      ],
    },
    {
      kind: 'brace',
      name: 'rise',
      from: pointOf(coords, 3, RISE),
      to: pointOf(coords, 3, 0),
      content: labelFor(RISE, PRECISION),
      options: { depth: RISE_DEPTH, padding: 0.28, stroke: pen, fill: ink, size: TEXT.tick },
    },
  ],
  style: TYPE,
};

/**
 * When each wave of the entrance runs, in seconds.
 *
 * Every wave leaves before the one in front of it has finished, so the picture
 * arrives as one movement rather than as eight that each stop. The labels along
 * the x axis are the one wave that does not arrive together: each starts 0.08
 * after the one before it and each takes 0.4, which is the row a reader sees
 * being written out.
 */
const GRID = { from: 0, to: 0.6 };
const LINES = { from: 0.4, to: 1.1 };
const TICKS = { from: 1, to: 1.4 };
const LABELS = [1.4, 1.48, 1.56, 1.64, 1.72, 1.8];
const LABEL_FADE = 0.4;
const Y_LABELS = { from: 1.8, to: 2.2 };
const CURVE = { from: 2.1, to: 3 };
const LAND = { from: 2.8, to: 3.2 };
const PARTS = { from: 3.1, to: 3.6 };

/** How long the whole entrance takes, which is where its last fade ends. */
const ENTRANCE = PARTS.to;

/** The beat at the stationary point, where the slope is nothing and the reading
 * says so. */
const BEAT = { from: 3.8, to: 4.8 };

const WALK = 3.6;
const WALK_FROM = BEAT.to;
const WALK_TO = WALK_FROM + WALK;

/** How long the right-hand side takes to walk, which starts as the walk does so
 * the reading and the rule stop disagreeing about the slope. */
const MORPH = 0.9;

/** The flash at the top of the curve, and the brace that follows it. */
const FLASH = { from: WALK_TO, to: WALK_TO + 0.8 };
const RISE_SPAN = { from: 9.35, to: 10.25 };

/** How long the figure runs, which is where its last span ends. */
const DURATION = RISE_SPAN.to;

/**
 * The picture arriving, one part at a time, and the two gestures that follow it.
 *
 * The view follows the dot as an entry rather than as a function of the clock
 * written on the figure, and its span is nothing wide, so it is applied in full
 * from the first frame. What the entry buys is that the figure's extent is a
 * plain extent, which a file can carry.
 *
 * A swell and a box that draws then lets go each carry their own out-and-back,
 * so easing the clock as well eases the gesture twice and its two halves crawl
 * away from the middle they turn at. That is why the beat is linear, and the
 * flash with it.
 */
const spans: readonly SpanRecord[] = [
  {
    entry: { kind: 'followView', target: 'tangent/point', options: { within: REACH, room: ROOM, axis: 'x' } },
    from: 0,
    to: 0,
  },
  // The panel arrives with the grid rather than later, because the inset's marks
  // carry the opacity of the marks they copy: the picture inside the panel fades
  // in as the picture does, and a panel arriving afterwards would leave that
  // arrival hanging over the band with no ground behind it.
  { entry: { kind: 'fadeIn', target: 'tangent/grid' }, ...GRID },
  { entry: { kind: 'fadeIn', target: 'tangent/window' }, ...GRID },
  { entry: { kind: 'draw', target: 'tangent/axes/x/line' }, ...LINES },
  { entry: { kind: 'draw', target: 'tangent/axes/y/line' }, ...LINES },
  { entry: { kind: 'fadeIn', target: 'tangent/axes/x/ticks' }, ...TICKS },
  { entry: { kind: 'fadeIn', target: 'tangent/axes/y/ticks' }, ...TICKS },
  { entry: { kind: 'fadeIn', target: 'tangent/axes/x/tips' }, ...TICKS },
  { entry: { kind: 'fadeIn', target: 'tangent/axes/y/tips' }, ...TICKS },
  // A staggered row is paced by its gap, and 0.08 of a second is shorter than the
  // rest a smoothstep spends leaving zero, so a label easing in as well arrives
  // later than the row reads it as arriving.
  ...acrossLabels.map((label, at): SpanRecord => ({
    entry: { kind: 'fadeIn', target: label },
    from: LABELS[at] as number,
    to: (LABELS[at] as number) + LABEL_FADE,
    curve: 'easeOut',
  })),
  { entry: { kind: 'fadeIn', target: 'tangent/axes/y/labels' }, ...Y_LABELS, curve: 'easeOut' },
  { entry: { kind: 'draw', target: 'tangent/curve' }, ...CURVE },
  // The dot passes its own size and settles on it, which is what says it landed
  // rather than swelled into place.
  { entry: { kind: 'growFrom', target: 'tangent/point', from: pointOf(coords, 0, 0) }, ...LAND, curve: 'overshoot' },
  { entry: { kind: 'fadeIn', target: 'tangent/area' }, ...PARTS },
  { entry: { kind: 'fadeIn', target: 'tangent/field' }, ...PARTS },
  { entry: { kind: 'fadeIn', target: 'tangent/tangent' }, ...PARTS },
  { entry: { kind: 'write', target: 'tangent/reading', options: { across: READING_WIDTH } }, ...PARTS },
  { entry: { kind: 'write', target: 'tangent/equation/at-rest' }, ...PARTS },
  { entry: { kind: 'fadeIn', target: 'tangent/equation/moving' }, ...PARTS },
  { entry: { kind: 'indicate', target: 'tangent/point', options: { factor: 2, colour: lit } }, ...BEAT, curve: 'linear' },
  {
    entry: { kind: 'showPassingFlash', target: 'tangent/tangent', options: { stroke: accent, covers: 0.3 } },
    ...BEAT,
    curve: 'linear',
  },
  {
    entry: { kind: 'circumscribe', target: 'tangent/reading', options: { stroke: accent, padding: 0.14 } },
    ...BEAT,
    curve: 'linear',
  },
  {
    entry: { kind: 'morphEquation', from: 'tangent/equation/at-rest', to: 'tangent/equation/moving' },
    from: WALK_FROM,
    to: WALK_FROM + MORPH,
  },
  { entry: { kind: 'flash', target: 'tangent/point', options: { stroke: accent, rays: 10 } }, ...FLASH, curve: 'linear' },
  // The brace draws on while its number counts to the rise, which is one span so
  // the two cannot end at different moments.
  { entry: { kind: 'draw', target: 'tangent/rise/brace' }, ...RISE_SPAN },
  { entry: { kind: 'fadeIn', target: 'tangent/rise/word' }, ...RISE_SPAN },
  {
    entry: { kind: 'countTo', target: 'tangent/rise/word', from: 0, to: RISE, precision: PRECISION },
    ...RISE_SPAN,
  },
];

/** The walk holds at the stationary point until the picture has arrived and been
 * pointed at, then runs to the top of the curve. */
export const walk: Track = [
  { time: 0, value: 0, smooth: true },
  { time: WALK_FROM, value: 0, smooth: true },
  { time: WALK_TO, value: 1, smooth: true },
];

export const written: FigureRecord = {
  extent: size,
  scene,
  tracks: { s: walk },
  timeline: { spans, duration: DURATION },
  duration: DURATION,
  still: WALK_FROM + WALK * 0.85,
  // The inset is named under the figure's own root, so the strip's move carries
  // its marks into their slot along with everything else. It hides the panel,
  // which is a figure mark: an inset that magnified its own ground and border
  // would paint a picture of itself inside itself.
  insets: [
    {
      shows: LENS_SHOWS,
      into: LENS,
      view: { kind: 'followView', target: 'tangent/point' },
      name: 'tangent/lens',
      hides: ['tangent/window'],
    },
  ],
};

export const tangent: Figure = resolveFigure(written);

/** The picture at one place along the walk, given as a fraction of the walk's
 * own length, which is the scene read with that one track bound. */
export function sceneAt(along: number): Node {
  return resolveNode(scene, { tracks: { s: along } });
}

/** Where the dot is at a time, which is what the view follows and what the strip
 * lays each frame out against. */
export function pointAt(seconds: number): Vec2 {
  return pointAlong(walkPath, sampleTrack(walk, seconds) as number) ?? vec2(0, 0);
}

/** How much wider each frame's slot is than the figure, so a strip of them has
 * white between the frames rather than one grid running into the next. */
export const SLOT = 11.4;

/** How far apart two rows of the strip sit, in figure units, the way `SLOT`
 * spaces two columns. */
export const DOWN = 6.4;

/**
 * Several times of one figure side by side, as one list of marks.
 *
 * It is marks rather than a tree because each frame is the figure with its own
 * timeline applied, and a timeline answers a time rather than a place in a tree.
 * Each frame's marks are carried sideways and renamed, so no two frames share an
 * id.
 */
export function stripMarks(
  times: readonly number[],
  columns = times.length,
  figure: Figure = tangent
): { marks: readonly Mark[]; extent: Extent } {
  // Each frame is carried by its own view as well as into its slot, or a frame
  // whose view had followed the dot would sit off its own slot by that much.
  return stripOf(figure, 'tangent', times, columns, { across: SLOT, down: DOWN }, (seconds) =>
    frameAt(pointAt(seconds)).centre ?? vec2(0, 0)
  );
}

/**
 * The four times the strip shows: the picture arrived and at rest, two moments
 * of the walk, and the finished reading under its brace.
 *
 * Nothing moves during the beat, so the beat's start and its end drew the same
 * image and two of the four frames were one frame twice.
 */
export const FRAMES = [ENTRANCE, WALK_FROM + WALK * 0.3, WALK_FROM + WALK * 0.7, DURATION];

/** What the timeline is made of, for a gate that would otherwise have to guess
 * where one part of the story ends and the next begins. */
export const TIMES = {
  entrance: ENTRANCE,
  beat: BEAT.to,
  walkFrom: WALK_FROM,
  morphTo: WALK_FROM + MORPH,
  walkTo: WALK_TO,
  braceFrom: RISE_SPAN.from,
  braceTo: RISE_SPAN.to,
};
