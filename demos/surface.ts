/**
 * The solid demo: a saddle with a level plane cutting through it, and the curve
 * of the crossing drawn on both.
 *
 * Everything here that is not the camera is something the flat demo already uses.
 * The axes read the same tick list, the equation is typeset the same way, the
 * plane arrives with `fadeIn` and the curve is drawn on with `draw`, and neither
 * animation knows that the marks it moves came from points in space. That is the
 * claim this figure is here to hold: a builder that works in space hands back the
 * flat nodes the rest of the package already draws.
 *
 * The camera is driven by a track rather than by an animation, which is the same
 * call the flat demo's walk made. A span's eased fraction and a track's value are
 * unrelated numbers, so a camera on one with a surface on the other would be two
 * clocks free to disagree.
 *
 * The surface and the plane are sorted together rather than one after the other.
 * Two grids sorted apart are two groups, and the second is painted over the first
 * whichever way round they stand, which is the one thing a plane cutting through
 * a surface must not do. The field's arrows go into that same sort, so an arrow
 * behind the saddle is covered by it.
 *
 * At 0.11.0 three runs of steepest descent are drawn on the saddle. Each is a
 * streamline of the field that points the way the surface falls, walked in the
 * plane the surface is drawn over and then lifted onto it.
 *
 * At 2.0.0 the whole of it is a record. The saddle, the crossing, the runs and
 * the wash on the pane are forms with the orbit's own track in them, and
 * `demos/surface.figure.json` is written from that record beside the pictures.
 */
import {
  fractionOf,
  interval,
  marksAt,
  moveBy,
  rect,
  resolveFigure,
  resolveNode,
  sampleTrack,
  textScale,
  vec2,
  vec3,
  equationFromTex,
  type Camera3Record,
  type Expression,
  type Extent,
  type FigureRecord,
  type FillRecord,
  type Figure,
  type Mark,
  type Node,
  type NodeRecord,
  type Point3Record,
  type ShadeRecord,
  type SpanRecord,
  type Stroke,
  type Track,
} from '../index.js';
import { DEEP, EMBER, FROST, GLAZE, INK, MOSS, PANEL, SHADE_THEME, SKY, shadeOf } from './palette.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.014 };
const cut = { colour: EMBER, width: 0.05 };
const glass = { colour: SKY, width: 0.008 };
const flow = { colour: DEEP, width: 0.022 };
/**
 * The weight of a run of steepest descent, full at the seed it starts from and
 * nothing where it leaves.
 *
 * Every run here is stopped by the edge of the region rather than by arriving
 * anywhere, so a run that thins to nothing says it carries on and a run ending
 * at its full width would say it stops.
 */
const fall: Stroke = { colour: MOSS, width: { from: 0.035, to: 0 } };

/** Shaped like the projection rather than like the other two demos. A
 * perspective view of a saddle comes out roughly square, and over the whole
 * orbit it spans 6.85 by 5.11, so a 16:9 frame leaves a margin no mark reaches.
 * The extra height above the picture is the band the rule is written into. */
const extent: Extent = { width: 8.2, height: 6.4 };

/**
 * The panel the inset is drawn into, in the figure's own units, and how much of
 * the picture it shows.
 *
 * This figure has no empty band, unlike the flat demo: everything it draws fits
 * inside 7.872 by 6.155 against a declared 8.2 by 6.4, so a panel sits over the
 * saddle rather than beside it, which is what an inset is for. The bottom left is
 * where it sits because the rule and the title are written across the top.
 *
 * It is inside the extent the camera pushes to rather than inside the declared
 * one, since the push takes the frame to 6.8 by 5.307 and a panel outside that
 * would leave the picture half way through the orbit. An inset's marks carry no
 * opacity of their own, so walking the panel away the way the two labels are
 * walked away would leave the magnified copy standing on nothing.
 *
 * What it shows is half its size each way, so the magnification is exactly 2 and
 * the two shapes match rather than leaving a margin the fit would resolve. The
 * place it shows is the middle, where the two branches of the crossing meet.
 */
const LENS = { x: interval(-3.3, -0.7), y: interval(-2.55, -0.6) };
const LENS_SHOWS = { width: 1.3, height: 0.975, centre: vec2(0, 0) };

/** How wide the panel's own border is. It stands outside the rectangle by half
 * its width, so its inner edge lands on the clip the inset's marks are cut to
 * rather than being painted over by them. */
const LENS_EDGE = 0.014;

const LENS_ACROSS = interval.span(LENS.x);
const LENS_UP = interval.span(LENS.y);

/** The stretch of each parameter the surface is drawn over. */
export const OVER = interval(-1.5, 1.5);

const spread = { over: { u: OVER, v: OVER } };

const u: Expression = { kind: 'variable', name: 'u' };
const v: Expression = { kind: 'variable', name: 'v' };
const at = (name: 'x' | 'y'): Expression => ({ kind: 'member', of: { kind: 'variable', name: 'at' }, name });
const over = (operator: '+' | '-' | '*' | '/', left: Expression, right: Expression): Expression => ({
  kind: 'arithmetic',
  operator,
  left,
  right,
});
const call = (name: string, ...args: readonly Expression[]): Expression => ({
  kind: 'call',
  name,
  arguments: args,
});

/**
 * A saddle, because it is the shape a level plane cuts a curve out of rather
 * than a circle, and a curve with two branches is what says the crossing was
 * found rather than assumed.
 *
 * Its height is half of u squared less half of v squared, over the two
 * parameters every surface here is read from.
 */
export const saddle: Point3Record = {
  x: u,
  y: v,
  z: over('/', over('-', over('*', u, u), over('*', v, v)), 2),
};

/** How high the plane sits. At nothing it would cut the saddle in two straight
 * lines crossing at the middle, which is the one height that says nothing about
 * the method. */
export const HEIGHT = 0.35;

const plane: Point3Record = { x: u, y: v, z: HEIGHT };

/** How far the eye stands from the middle and how high it sits, in the units the
 * surface is drawn in. */
const AWAY = 4.6;
const UP = 2.6;

/**
 * How tall the projection's own frame is, in figure units.
 *
 * Shorter than the extent on purpose: what fills that frame is the middle of the
 * picture, and the tips of the axes and their numbers reach past it, so handing
 * the camera the extent's own height would carry them off the top and bottom.
 */
export const FRAME = 5;

/** Where the eye sits: once round the middle on the one track this figure turns
 * on, kept at one height, looking at where the axes cross. */
const turn: Expression = { kind: 'arithmetic', operator: '*', left: 2 * Math.PI, right: { kind: 'track', name: 'turn' } };
const around = (name: 'cos' | 'sin'): Expression => over('*', AWAY, call(name, turn));

export const camera: Camera3Record = {
  eye: { x: around('cos'), y: around('sin'), z: UP },
  target: vec3(0, 0, 0),
  up: vec3(0, 0, 1),
  projection: { kind: 'perspective', fov: Math.PI / 5, height: FRAME, near: 0.2 },
};

/**
 * The wash over the pane, deepest along the edge nearest the eye and palest
 * along the edge furthest from it.
 *
 * The axis is the pane's own recession, which is the horizontal direction from
 * the eye to the middle of the pane, and it reaches from one edge to the other
 * along that direction. Built instead from the nearest and furthest corners it
 * would jump every time the orbit crossed a diagonal, since the pane is square
 * and two corners sit at one depth there.
 *
 * The axis is the same for every cell of the pane, which is what makes sixteen
 * cells read as one sheet of glass: a gradient is measured in the units it is
 * painted into, so one axis shared across the cells runs unbroken over all of
 * them. Its ends are places in space put on the page by the camera, so the wash
 * turns as the orbit does.
 */
const half = (OVER.to - OVER.from) / 2;
const middle = (OVER.from + OVER.to) / 2;
const away: Expression = call('normalize', {
  kind: 'point',
  x: over('-', middle, around('cos')),
  y: over('-', middle, around('sin')),
});
const awayAt = (name: 'x' | 'y'): Expression => ({ kind: 'member', of: away, name });
// A square of half-width h reaches h/max(|x|, |y|) along a unit direction, so the
// axis spans the pane whichever way the recession points.
const reach: Expression = over('/', half, call('max', call('abs', awayAt('x')), call('abs', awayAt('y'))));
const edgeAt = (side: number): Expression =>
  call(
    'project',
    { kind: 'camera', of: camera },
    over('+', middle, over('*', over('*', side, reach), awayAt('x'))),
    over('+', middle, over('*', over('*', side, reach), awayAt('y'))),
    HEIGHT
  );

const wash: FillRecord = {
  colour: FROST,
  gradient: {
    from: edgeAt(-1),
    to: edgeAt(1),
    stops: [
      { offset: 0, colour: GLAZE },
      { offset: 1, colour: FROST },
    ],
  },
};

/**
 * The way the saddle falls at a place, which is the gradient of its own height
 * turned round.
 *
 * The height of this saddle is half of x squared less half of y squared, so it
 * falls towards the middle along x and away from it along y, and no run of
 * steepest descent here is a straight line except the two through the middle.
 */
const descent: Expression = { kind: 'point', x: over('-', 0, at('x')), y: at('y') };

/** The same field as the arrows over the plane draw it, which is a vector in
 * space at the place being sampled. */
const flowing: Point3Record = {
  x: over('-', 0, { kind: 'variable', name: 'x' }),
  y: { kind: 'variable', name: 'y' },
  z: 0,
};

/**
 * Where the three runs start.
 *
 * None is on either axis: a run started on one stays on it, and a straight line
 * down a saddle says nothing about how the run was found. None is near one
 * either. Seeded a twentieth off the x axis the three runs all swept the same
 * small region round the middle, passing within 0.106 of each other, and three
 * runs that close read as one tangle rather than as three descents. Three
 * tenths off, the closest two hold 0.528 apart.
 */
export const SEEDS = [vec2(1.3, 0.3), vec2(-1.3, 0.3), vec2(0.6, -0.3)];

/** How far each step of a run moves, in the units the surface is drawn in, and
 * how many steps one may take before the region's own edge stops it. */
export const STEP = 0.05;
export const STEPS = 300;

/** How many arrows of the field are drawn across the plane, and how long one is
 * in the units the surface is drawn in. An arrow settles towards a third of a
 * unit rather than growing with the gradient, since the gradient at the corner
 * of the saddle is thirty times the gradient near the middle. */
export const FLOW = { x: 5, y: 5, z: 1 };
const magnitude: Expression = { kind: 'variable', name: 'magnitude' };
const arrowLength: Expression = over('/', over('*', 0.34, magnitude), over('+', 0.9, magnitude));

/** How many cells each grid is cut into. Enough that the saddle reads as a
 * curved sheet and few enough that the committed pictures stay small: every cell
 * is a path in the file, and the strip holds four frames of them. */
export const CELLS = 12;
export const PANES = 4;

/**
 * Which way the light comes from, over the shoulder and to one side.
 *
 * Straight down the z axis is nearly parallel to every normal this saddle has,
 * so it lit the whole surface alike: the shading covered a contrast range of
 * 0.32 against white and the sheet read as one flat sheet of card. Off to one
 * side the same ramp covers 2.93.
 */
export const LIGHT = vec3(-0.4, -0.6, 0.7);

/**
 * The narrowest and widest this saddle faces the light, from its own normals
 * under `LIGHT` over the region it is drawn on.
 *
 * Every normal of a surface drawn over a plane has a positive z, so a light with
 * a positive z can never reach the far end of its own ramp and the band a
 * surface uses is a part of it. The ramp is spread over this band, so the twelve
 * steps of it are twelve steps of this saddle rather than the eight the raw
 * amount reached.
 */
export const FACING = interval(0.346, 1);

/** The washes of the palette as the ramp a cell's shading picks a step of, read
 * against the band this saddle uses rather than against the whole of nothing to
 * one. */
const SHADES = Object.keys(SHADE_THEME).length;
const shade: ShadeRecord = {
  ramp: Array.from({ length: SHADES }, (_, step) => shadeOf(step / (SHADES - 1))),
  band: FACING,
};

/** The sizes this figure's text takes, from the numbers on its axes, which are
 * the smallest text it draws. */
export const TEXT = textScale(0.22);

/** The equation of the surface, typeset when this module loads rather than at
 * every frame, since its geometry is the same at every time. */
const rule = await equationFromTex('z = \\frac{x^2 - y^2}{2}');

export const scene: NodeRecord = {
  kind: 'group',
  name: 'solid',
  children: [
    {
      kind: 'scene3',
      name: 'body',
      camera,
      items: [
        { kind: 'surfaceCells', name: 'hill', of: saddle, options: { ...spread, resolution: CELLS, shade, light: LIGHT } },
        {
          kind: 'surfaceCells',
          name: 'pane',
          of: plane,
          options: { ...spread, resolution: PANES, shade: { ramp: [wash] }, stroke: glass },
        },
        {
          kind: 'fieldArrows3',
          name: 'flow',
          of: flowing,
          options: {
            over: { x: OVER, y: OVER, z: interval(HEIGHT, HEIGHT) },
            resolution: FLOW,
            lengthOf: arrowLength,
            colourFor: flow.colour,
            stroke: flow,
            head: 0.13,
          },
        },
      ],
    },
    {
      kind: 'streamline3',
      name: 'descent',
      runs: SEEDS.map((seed) => ({ of: descent, from: seed, options: { step: STEP, steps: STEPS, within: { x: OVER, y: OVER } } })),
      on: saddle,
      camera,
      options: { stroke: fall },
    },
    {
      kind: 'section3',
      name: 'cut',
      curve: { of: saddle, plane: { point: vec3(0, 0, HEIGHT), normal: vec3(0, 0, 1) }, options: { ...spread, resolution: 48 } },
      camera,
      options: { stroke: cut },
      style: { opacity: 1 },
    },
    {
      kind: 'axes3',
      name: 'axes',
      camera,
      options: {
        x: OVER,
        y: OVER,
        z: interval(-1.2, 1.2),
        stroke: pen,
        fill: ink,
        size: TEXT.tick,
        tickLength: 0.08,
        ticks: 4,
        names: { x: 'x', y: 'y', z: 'z' },
      },
    },
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
      kind: 'text',
      name: 'title',
      at: fractionOf(extent, 0.98, 0.9156),
      content: 'a saddle',
      size: TEXT.title,
      options: { fill: ink, align: 'end' },
    },
    {
      kind: 'equationNode',
      name: 'rule',
      equation: rule,
      options: { at: fractionOf(extent, 0.02, 0.93), align: 'start', width: 1.6, height: 0.7, fill: ink },
    },
  ],
  style: TYPE,
};

/** How long one orbit takes. */
export const ORBIT = 8;

/**
 * When each part of the entrance runs, in seconds.
 *
 * The picture arrives, then the eye goes round once. The plane fades in and the
 * curve draws on, which is the whole of what this demo has to show about
 * animations reaching marks in space.
 */
const AXES = { from: 0, to: 0.6 };
const HILL = { from: 0.3, to: 1 };
const RULE = { from: 0.7, to: 1.2 };
const PANE = { from: 1.3, to: 2 };
const CUT = { from: 1.8, to: 2.7 };
const FLOW_IN = { from: 2.5, to: 3 };
const DESCENT = { from: 2.9, to: 3.8 };

const ORBIT_FROM = DESCENT.to;

/** Where in the turn the eye stops, and for how long, in seconds. A quarter round
 * is the bearing the saddle faces along the axis it falls away on. */
export const BEAT_AT = 0.25;
export const BEAT = 1.5;

const BEAT_FROM = ORBIT_FROM + ORBIT * BEAT_AT;

/**
 * The eye goes round at one pace and stops once, at the face of the saddle.
 *
 * Neither half eases: a turn that slowed to a stop and started again at every end
 * would read as a stutter, and the one stop here is the beat rather than the
 * pacing. The rate is the same either side of it, a quarter of the turn every two
 * seconds, so the stop is what a reader sees rather than a change of speed.
 */
export const orbit: Track = [
  { time: 0, value: 0 },
  { time: ORBIT_FROM, value: 0 },
  { time: BEAT_FROM, value: BEAT_AT },
  { time: BEAT_FROM + BEAT, value: BEAT_AT },
  { time: ORBIT_FROM + ORBIT + BEAT, value: 1 },
];

/** When the eye is a fraction of the way round, which is that fraction of the
 * orbit, and the beat as well once the beat has passed. */
export function timeAt(along: number): number {
  return ORBIT_FROM + ORBIT * along + (along > BEAT_AT ? BEAT : 0);
}

/**
 * How far in the camera pushes on the crossing, in figure units across.
 *
 * The crossing reaches 3.1105 across and 1.4744 up from the middle at its widest
 * over the orbit, so 6.8 across holds both branches of it with 0.2895 to spare at
 * every place in the turn. The declared extent is 8.2, which makes this a
 * magnification of 1.21.
 */
const PUSH = 6.8;

/** The extent the push reaches, its shape the declared one's so the saddle fills
 * the frame the way it did. */
const pushed: Extent = { width: PUSH, height: (PUSH * extent.height) / extent.width };

/**
 * When the two labels go, when the camera pushes in, and when both come back.
 *
 * The push starts after the still and after the last frame the strip shows, so a
 * reader shown one frame gets the whole saddle with its equation rather than a
 * crop of the middle of it, and the strip is four frames of one composition.
 *
 * The equation and the title are placed at fractions of the declared extent and
 * are what reach nearest its edge, so the push crops them: everything drawn fits
 * inside 7.872 by 6.155 against a declared 8.2 by 6.4, and any push worth seeing
 * is further in than that. They go before the camera moves and return after it
 * has come back, rather than fading while it moves, since a label at half its
 * opacity outside the frame reads as one that slid off the edge.
 */
const LABELS_OUT = { from: 7.5, to: 7.9 };
const PUSH_IN = { from: 7.9, to: 8.9 };
const PULL_OUT = { from: 11.7, to: 12.9 };
const LABELS_BACK = { from: 12.9, to: 13.3 };

/** How long the figure runs, which is where its last span ends. */
const DURATION = LABELS_BACK.to;

/**
 * The picture arriving, the two labels going and coming back, and the camera
 * pushing in on the crossing between them.
 *
 * `fadeTo` rather than `fadeOut` and `fadeIn`, since those two multiply the
 * opacity they are handed: a mark faded out is at nothing, and a fade in over it
 * walks nothing towards nothing and the mark never returns.
 */
const spans: readonly SpanRecord[] = [
  { entry: { kind: 'fadeIn', target: 'solid/axes' }, ...AXES },
  { entry: { kind: 'fadeIn', target: 'solid/body/hill' }, ...HILL },
  { entry: { kind: 'fadeIn', target: 'solid/rule' }, ...RULE },
  { entry: { kind: 'fadeIn', target: 'solid/body/pane' }, ...PANE },
  { entry: { kind: 'draw', target: 'solid/cut' }, ...CUT },
  { entry: { kind: 'fadeIn', target: 'solid/body/flow' }, ...FLOW_IN },
  { entry: { kind: 'draw', target: 'solid/descent' }, ...DESCENT },
  { entry: { kind: 'fadeTo', target: 'solid/rule', opacity: 0 }, ...LABELS_OUT },
  { entry: { kind: 'fadeTo', target: 'solid/title', opacity: 0 }, ...LABELS_OUT },
  { entry: { kind: 'moveView', to: pushed }, ...PUSH_IN },
  { entry: { kind: 'moveView', to: { width: extent.width, height: extent.height } }, ...PULL_OUT },
  { entry: { kind: 'fadeTo', target: 'solid/rule', opacity: 1 }, ...LABELS_BACK },
  { entry: { kind: 'fadeTo', target: 'solid/title', opacity: 1 }, ...LABELS_BACK },
];

export const written: FigureRecord = {
  extent,
  scene,
  tracks: { turn: orbit },
  timeline: { spans, duration: DURATION },
  duration: DURATION,
  still: ORBIT_FROM + ORBIT * 0.18,
  // Named under the figure's own root, so the strip's move carries its marks into
  // their slot with everything else, and hiding the panel because an inset that
  // magnified its own ground and border would paint a picture of itself.
  insets: [{ shows: LENS_SHOWS, into: LENS, name: 'solid/lens', hides: ['solid/window'] }],
};

export const solid: Figure = resolveFigure(written);

/** The picture at one place in the orbit, given as a fraction of the turn, which
 * is the scene read with that one track bound. */
export function sceneAt(along: number): Node {
  return resolveNode(scene, { tracks: { turn: along } });
}

/** Where the eye is at a time, for a gate that would otherwise rebuild the track
 * to find out. */
export function alongAt(seconds: number): number {
  return sampleTrack(orbit, seconds) as number;
}

export const SLOT = 8.8;
export const DOWN = 6.8;

/** Several times of one figure laid out together, as one list of marks, each
 * frame carried into its own slot and renamed so no two frames share an id. */
export function stripMarks(
  times: readonly number[],
  columns = times.length
): { marks: readonly Mark[]; extent: Extent } {
  const rows = Math.ceil(times.length / columns);
  const marks = times.flatMap((seconds, frame) => {
    const across = ((frame % columns) - (columns - 1) / 2) * SLOT;
    const up = ((rows - 1) / 2 - Math.floor(frame / columns)) * DOWN;
    const by = vec2(across, up);
    // A clip stays where the figure declared it while a mark moves through it,
    // which is the rule an animation wants and the wrong one here: a slot is a
    // second frame rather than a place inside one, so the inset's window travels
    // with the marks it holds or it would cut every frame but the middle away.
    return moveBy('solid', by)(marksAt(solid, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
      clip: mark.clip
        ? {
            x: interval(mark.clip.x.from + by.x, mark.clip.x.to + by.x),
            y: interval(mark.clip.y.from + by.y, mark.clip.y.to + by.y),
          }
        : undefined,
    }));
  });
  return { marks, extent: { width: SLOT * columns, height: DOWN * rows } };
}

/** What the timeline is made of, for a gate that would otherwise guess where one
 * part ends and the next begins. */
export const TIMES = {
  entrance: ORBIT_FROM,
  quarter: timeAt(0.25),
  half: timeAt(0.5),
  round: timeAt(1),
};

/**
 * The four times the strip shows, inside the first quarter of the orbit rather
 * than at its quarters.
 *
 * The saddle is unchanged by a half turn about the z axis, since `(x, y)` and
 * `(-x, -y)` give the same height, so an eye at a bearing and an eye a half turn
 * from it draw the same shape. Four frames at the quarters of the orbit are two
 * such pairs, and the two of them read as one picture drawn twice.
 */
export const STRIP_ALONG = [0.03, 0.11, 0.19, 0.27];
export const FRAMES = STRIP_ALONG.map(timeAt);
