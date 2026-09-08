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
 */
import {
  axes3,
  camera3,
  draw,
  equationFromTex,
  equationNode,
  fadeIn,
  fieldArrows3,
  fractionOf,
  group,
  interval,
  moveBy,
  perspective,
  polyline3,
  sampleTrack,
  sectionOf,
  scene3,
  streamlineOf,
  surfaceCells,
  text,
  textScale,
  vec2,
  vec3,
  Timeline,
  marksAt,
  type Extent,
  type Figure,
  type Mark,
  type Node,
  type Track,
  type Vec2,
} from '../index.js';
import { DEEP, EMBER, FROST, INK, MOSS, SKY, shadeOf } from './palette.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.014 };
const cut = { colour: EMBER, width: 0.05 };
const glass = { colour: SKY, width: 0.008 };
const flow = { colour: DEEP, width: 0.022 };
const fall = { colour: MOSS, width: 0.035 };

/** Shaped like the projection rather than like the other two demos. A
 * perspective view of a saddle comes out roughly square, and over the whole
 * orbit it spans 6.85 by 5.11, so a 16:9 frame leaves a margin no mark reaches.
 * The extra height above the picture is the band the rule is written into. */
const extent: Extent = { width: 8.2, height: 6.4 };

/** The stretch of each parameter the surface is drawn over. */
const OVER = interval(-1.5, 1.5);

/** A saddle, because it is the shape a level plane cuts a curve out of rather
 * than a circle, and a curve with two branches is what says the crossing was
 * found rather than assumed. */
export const saddle = (x: number, y: number) => (x * x - y * y) / 2;

const surfaceAt = (u: number, v: number) => vec3(u, v, saddle(u, v));

/** How high the plane sits. At nothing it would cut the saddle in two straight
 * lines crossing at the middle, which is the one height that says nothing about
 * the method. */
export const HEIGHT = 0.35;

const planeAt = (u: number, v: number) => vec3(u, v, HEIGHT);

/** The curve where the two meet, found once rather than at every frame: it is the
 * same curve at every time and only the camera moves. */
export const section = sectionOf(surfaceAt, { point: vec3(0, 0, HEIGHT), normal: vec3(0, 0, 1) }, {
  over: { u: OVER, v: OVER },
  resolution: 48,
});

/**
 * The way the saddle falls at a place, which is the gradient of its own height
 * turned round.
 *
 * The height of this saddle is half of x squared less half of y squared, so it
 * falls towards the middle along x and away from it along y, and no run of
 * steepest descent here is a straight line except the two through the middle.
 */
const descent = (at: Vec2) => vec2(-at.x, at.y);

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
const SEEDS = [vec2(1.3, 0.3), vec2(-1.3, 0.3), vec2(0.6, -0.3)];

/** How far each step of a run moves, in the units the surface is drawn in, and
 * how many steps one may take before the region's own edge stops it. */
const STEP = 0.05;
const STEPS = 300;

/**
 * The three runs of steepest descent, walked once rather than at every frame,
 * each lifted from the plane it was walked in onto the surface itself.
 */
export const descents = SEEDS.map((seed) =>
  streamlineOf(descent, seed, { step: STEP, steps: STEPS, within: { x: OVER, y: OVER } }).map((at) =>
    surfaceAt(at.x, at.y)
  )
);

/** How many arrows of the field are drawn across the plane, and how long one is
 * in the units the surface is drawn in. An arrow settles towards a third of a
 * unit rather than growing with the gradient, since the gradient at the corner
 * of the saddle is thirty times the gradient near the middle. */
const FLOW = { x: 5, y: 5, z: 1 };
const arrowLength = (magnitude: number) => (0.34 * magnitude) / (0.9 + magnitude);

/** How many cells each grid is cut into. Enough that the saddle reads as a
 * curved sheet and few enough that the committed pictures stay small: every cell
 * is a path in the file, and the strip holds four frames of them. */
const CELLS = 12;
const PANES = 4;

/**
 * How tall the projection's own frame is, in figure units.
 *
 * Shorter than the extent on purpose: what fills that frame is the middle of the
 * picture, and the tips of the axes and their numbers reach past it, so handing
 * the camera the extent's own height would carry them off the top and bottom.
 */
const FRAME = 5;

/**
 * Which way the light comes from, over the shoulder and to one side.
 *
 * Straight down the z axis is nearly parallel to every normal this saddle has,
 * so it lit the whole surface alike: the shading covered a contrast range of
 * 0.32 against white and the sheet read as one flat sheet of card. Off to one
 * side the same ramp covers 2.93.
 */
const LIGHT = vec3(-0.4, -0.6, 0.7);

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
const FACING = interval(0.346, 1);

/** The shading of a cell, its amount read against the band this saddle uses
 * rather than against the whole of nothing to one. */
const shadeSpread = (amount: number) => shadeOf(interval.remap(amount, FACING, interval(0, 1)));

/** Where the eye sits at a fraction of the orbit: once round the middle, kept at
 * one height, looking at where the axes cross. */
export function eyeAt(along: number) {
  const turn = 2 * Math.PI * along;
  return camera3({
    eye: vec3(4.6 * Math.cos(turn), 4.6 * Math.sin(turn), 2.6),
    target: vec3(0, 0, 0),
    up: vec3(0, 0, 1),
    projection: perspective({ fov: Math.PI / 5, height: FRAME, near: 0.2 }),
  });
}

/** The sizes this figure's text takes, from the numbers on its axes, which are
 * the smallest text it draws. */
const TEXT = textScale(0.22);

/** The equation of the surface, typeset when this module loads rather than at
 * every frame, since its geometry is the same at every time. */
const written = await equationFromTex('z = \\frac{x^2 - y^2}{2}');

export function sceneAt(along: number): Node {
  const camera = eyeAt(along);
  return group('solid', [
    scene3(
      'body',
      [
        ...surfaceCells('hill', surfaceAt, camera, {
          over: { u: OVER, v: OVER },
          resolution: CELLS,
          shade: shadeSpread,
          light: LIGHT,
        }),
        ...surfaceCells('pane', planeAt, camera, {
          over: { u: OVER, v: OVER },
          resolution: PANES,
          shade: () => ({ colour: FROST }),
          stroke: glass,
        }),
        ...fieldArrows3('flow', (at) => vec3(-at.x, at.y, 0), camera, {
          over: { x: OVER, y: OVER, z: interval(HEIGHT, HEIGHT) },
          resolution: FLOW,
          lengthOf: arrowLength,
          colourFor: () => flow.colour,
          stroke: flow,
          head: 0.13,
        }),
      ],
      camera
    ),
    group(
      'descent',
      descents.map((run, at) => polyline3(`run${at}`, run, camera, { stroke: fall }))
    ),
    group('cut', section.map((run, at) => polyline3(`run${at}`, run, camera, { stroke: cut })), {
      style: { opacity: 1 },
    }),
    axes3('axes', camera, {
      x: OVER,
      y: OVER,
      z: interval(-1.2, 1.2),
      stroke: pen,
      fill: ink,
      size: TEXT.tick,
      tickLength: 0.08,
      ticks: 4,
      names: { x: 'x', y: 'y', z: 'z' },
    }),
    text('title', fractionOf(extent, 0.98, 0.9156), 'a saddle', TEXT.title, { fill: ink, align: 'end' }),
    equationNode('rule', written, {
      at: fractionOf(extent, 0.02, 0.93),
      align: 'start',
      width: 1.6,
      height: 0.7,
      fill: ink,
    }),
  ]);
}

/** How long one orbit takes. */
export const ORBIT = 8;

/** The picture arrives, then the eye goes round once. The plane fades in and the
 * curve draws on, which is the whole of what this demo has to show about
 * animations reaching marks in space. */
const entrance = Timeline.empty()
  .play(fadeIn('solid/axes'), 0.6)
  .play(fadeIn('solid/body/hill'), 0.7, { after: -0.3 })
  .play(fadeIn('solid/rule'), 0.5, { after: -0.3 })
  .play(fadeIn('solid/body/pane'), 0.7, { after: 0.1 })
  .play(draw('solid/cut'), 0.9, { after: -0.2 })
  .play(fadeIn('solid/body/flow'), 0.5, { after: -0.2 })
  .play(draw('solid/descent'), 0.9, { after: -0.1 });

const ORBIT_FROM = entrance.duration;

/** The eye goes round at one pace rather than easing at both ends, because a turn
 * that slowed to a stop and started again would read as a stutter. */
export const orbit: Track = [
  { time: 0, value: 0 },
  { time: ORBIT_FROM, value: 0 },
  { time: ORBIT_FROM + ORBIT, value: 1 },
];

const line = entrance.wait(ORBIT);

export const solid: Figure = {
  extent,
  scene: (_seconds, values) => sceneAt(values.turn as number),
  tracks: { turn: orbit },
  timeline: line,
  duration: line.duration,
  still: ORBIT_FROM + ORBIT * 0.18,
};

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
    return moveBy('solid', vec2(across, up))(marksAt(solid, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: SLOT * columns, height: DOWN * rows } };
}

/** What the timeline is made of, for a gate that would otherwise guess where one
 * part ends and the next begins. */
export const TIMES = {
  entrance: ORBIT_FROM,
  quarter: ORBIT_FROM + ORBIT * 0.25,
  half: ORBIT_FROM + ORBIT * 0.5,
  round: ORBIT_FROM + ORBIT,
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
export const FRAMES = STRIP_ALONG.map((along) => ORBIT_FROM + ORBIT * along);
