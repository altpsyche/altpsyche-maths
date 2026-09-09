/**
 * The solid demo's own mathematics written as calls, which is the side its
 * records are measured against.
 *
 * The demo itself is a record from end to end, so a saddle written as an
 * expression is checked against a saddle written as a function, and a camera
 * built from a track against one built from a number. Written inside the demo
 * these would be the same figure said twice, with nothing between them to
 * disagree.
 */
import {
  camera3,
  perspective,
  sectionOf,
  streamlineOf,
  vec2,
  vec3,
  type Camera3,
  type Fill,
  type Vec2,
} from '../index.js';
import { FROST, GLAZE } from '../demos/palette.js';
import { FRAME, HEIGHT, OVER, SEEDS, STEP, STEPS } from '../demos/surface.js';

/** The height of the saddle at a place, which is half of x squared less half of
 * y squared. */
export const saddle = (x: number, y: number) => (x * x - y * y) / 2;

const surfaceAt = (u: number, v: number) => vec3(u, v, saddle(u, v));
const planeAt = (u: number, v: number) => vec3(u, v, HEIGHT);

/** Where the eye sits at a fraction of the orbit: once round the middle, kept at
 * one height, looking at where the axes cross. */
export function eyeAt(along: number): Camera3 {
  const turn = 2 * Math.PI * along;
  return camera3({
    eye: vec3(4.6 * Math.cos(turn), 4.6 * Math.sin(turn), 2.6),
    target: vec3(0, 0, 0),
    up: vec3(0, 0, 1),
    projection: perspective({ fov: Math.PI / 5, height: FRAME, near: 0.2 }),
  });
}

/**
 * The wash over the pane, deepest along the edge nearest the eye and palest
 * along the edge furthest from it.
 *
 * The axis is the pane's own recession, which is the horizontal direction from
 * the eye to the middle of the pane, and it reaches from one edge to the other
 * along that direction.
 */
export function paneWash(camera: Camera3): Fill {
  const half = (OVER.to - OVER.from) / 2;
  const middle = (OVER.from + OVER.to) / 2;
  const away = vec2.normalize(vec2(middle - camera.eye.x, middle - camera.eye.y));
  // A square of half-width h reaches h/max(|x|, |y|) along a unit direction, so
  // the axis spans the pane whichever way the recession points.
  const reach = half / Math.max(Math.abs(away.x), Math.abs(away.y));
  const edgeAt = (side: number) =>
    camera.project(planeAt(middle + side * reach * away.x, middle + side * reach * away.y)).at;
  return {
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
}

/** The curve where the level plane meets the saddle, which is the same curve at
 * every time since only the camera moves. */
export const section = sectionOf(surfaceAt, { point: vec3(0, 0, HEIGHT), normal: vec3(0, 0, 1) }, {
  over: { u: OVER, v: OVER },
  resolution: 48,
});

/** The way the saddle falls at a place, which is the gradient of its own height
 * turned round. */
const descent = (at: Vec2) => vec2(-at.x, at.y);

/** The three runs of steepest descent, each lifted from the plane it was walked
 * in onto the surface itself. */
export const descents = SEEDS.map((seed) =>
  streamlineOf(descent, seed, { step: STEP, steps: STEPS, within: { x: OVER, y: OVER } }).map((at) =>
    surfaceAt(at.x, at.y)
  )
);
