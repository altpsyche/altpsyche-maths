import { describe, expect, it } from 'vitest';
import * as door from '@altpsyche/maths';
import {
  boundsOf,
  boundsOfMarks,
  camera3,
  centreOf,
  interval,
  dot3,
  flatten,
  orthographic,
  perspective,
  polyline3,
  space,
  surface3,
  text3,
  vec3,
} from '@altpsyche/maths';

/**
 * Marks placed in space, checked against the camera that placed them: every
 * drawn corner is that camera's own answer for the point it came from, and a
 * line running past the eye is cut rather than folded to the far side of the
 * frame.
 */

const flat = camera3({ eye: vec3(0, 0, 5), target: vec3(0, 0, 0), projection: orthographic() });
const eye = camera3({
  eye: vec3(0, 0, 5),
  target: vec3(0, 0, 0),
  projection: perspective({ fov: Math.PI / 2, height: 10, near: 1 }),
});

const SQUARE = [vec3(-1, -1, 0), vec3(1, -1, 0), vec3(1, 1, 0), vec3(-1, 1, 0)];

describe('polyline3', () => {
  it('draws a square in space at the camera projection of its corners', () => {
    const node = polyline3('square', SQUARE, eye, { close: true, stroke: { colour: 'black', width: 0.02 } });
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    const mark = marks[0];
    expect(mark.kind).toBe('path');
    if (mark.kind !== 'path') return;
    const subpath = mark.path[0];
    expect(subpath.closed).toBe(true);
    const corners = [subpath.start, ...subpath.curves.map((curve) => curve.to)];
    expect(corners).toHaveLength(5);
    SQUARE.forEach((point, at) => {
      const placed = eye.project(point).at;
      expect(Math.abs(corners[at].x - placed.x)).toBeLessThan(1e-12);
      expect(Math.abs(corners[at].y - placed.y)).toBeLessThan(1e-12);
    });
  });

  it('cuts a line where it crosses the near plane', () => {
    const points = [vec3(1, 1, 0), vec3(1, 1, 9)];
    const node = polyline3('line', points, eye, { stroke: { colour: 'black', width: 0.02 } });
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    const mark = marks[0];
    if (mark.kind !== 'path') return;
    const subpath = mark.path[0];
    expect(subpath.curves).toHaveLength(1);
    const end = subpath.curves[0].to;

    // The cut lands where the depth is the near plane's own, which is the last
    // place along the line that has a place on the page at all.
    const along = (5 - 1 - 0) / 9;
    const cutPoint = vec3(1, 1, 9 * along);
    const cut = eye.project(cutPoint);
    expect(Math.abs(cut.depth - 1)).toBeLessThan(1e-12);
    expect(Math.abs(end.x - cut.at.x)).toBeLessThan(1e-12);
    expect(Math.abs(end.y - cut.at.y)).toBeLessThan(1e-12);

    const folded = eye.project(points[1]).at;
    expect(Math.sign(folded.x)).toBe(-Math.sign(end.x));
  });

  it('draws nothing for a line wholly behind the eye', () => {
    const node = polyline3('gone', [vec3(1, 1, 7), vec3(2, 2, 9)], eye, { stroke: { colour: 'black', width: 0.02 } });
    expect(node.children).toHaveLength(0);
    expect(flatten(node)).toHaveLength(0);
  });

  it('opens a closed run that the near plane cut', () => {
    const node = polyline3('square', [vec3(-1, -1, 0), vec3(1, -1, 0), vec3(1, 1, 9)], eye, {
      close: true,
      stroke: { colour: 'black', width: 0.02 },
    });
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    if (marks[0].kind !== 'path') return;
    expect(marks[0].path[0].closed).toBe(false);
  });

  it('draws every piece of a line that passes the eye and comes back', () => {
    const points = [vec3(1, 1, 0), vec3(1, 1, 9), vec3(2, 2, 0)];
    const node = polyline3('there and back', points, eye, { stroke: { colour: 'black', width: 0.02 } });
    expect(node.children).toHaveLength(2);
    expect(flatten(node)).toHaveLength(2);
  });

  it('cuts nothing under an eye that shrinks nothing', () => {
    const node = polyline3('line', [vec3(1, 1, 0), vec3(1, 1, 9)], flat, { stroke: { colour: 'black', width: 0.02 } });
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    if (marks[0].kind !== 'path') return;
    expect(marks[0].path[0].curves).toHaveLength(1);
  });
});

describe('dot3 and text3', () => {
  it('marks a point in space where the camera puts it', () => {
    const node = dot3('point', vec3(1, 1, 0), 0.1, { colour: 'red' }, eye);
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    expect(marks[0].id).toBe('point/disc');
    const placed = eye.project(vec3(1, 1, 0)).at;
    if (marks[0].kind !== 'path') return;
    const box = boundsOf(marks[0].path);
    expect(box).not.toBeNull();
    const middle = centreOf(box!);
    expect(Math.abs(middle.x - placed.x)).toBeLessThan(1e-12);
    expect(Math.abs(middle.y - placed.y)).toBeLessThan(1e-12);
  });

  it('writes a label at a point in space', () => {
    const node = text3('name', vec3(1, 1, 0), 'P', 0.3, eye, { fill: { colour: 'black' } });
    const marks = flatten(node);
    expect(marks).toHaveLength(1);
    expect(marks[0].kind).toBe('text');
    if (marks[0].kind !== 'text') return;
    const placed = eye.project(vec3(1, 1, 0)).at;
    expect(Math.abs(marks[0].at.x - placed.x)).toBeLessThan(1e-12);
    expect(marks[0].text).toBe('P');
  });

  it('draws neither a dot nor a label behind the eye', () => {
    expect(flatten(dot3('point', vec3(1, 1, 9), 0.1, { colour: 'red' }, eye))).toHaveLength(0);
    expect(flatten(text3('name', vec3(1, 1, 9), 'P', 0.3, eye, { fill: { colour: 'black' } }))).toHaveLength(0);
  });
});

describe('space', () => {
  const quad = (name: string, z: number, camera = eye) => {
    const points = [vec3(-1, -1, z), vec3(1, -1, z), vec3(1, 1, z), vec3(-1, 1, z)];
    return { points, node: polyline3(name, points, camera, { close: true, fill: { colour: 'grey' } }) };
  };

  it('paints the far piece before the near one, whichever side the eye is on', () => {
    const near = quad('near', 1);
    const far = quad('far', -3);
    const front = space('scene', [near, far], eye);
    expect(front.children.map((child) => child.name)).toEqual(['far', 'near']);

    const behind = camera3({
      eye: vec3(0, 0, -8),
      target: vec3(0, 0, 0),
      projection: perspective({ fov: Math.PI / 2, height: 10, near: 1 }),
    });
    const other = space('scene', [near, far], behind);
    expect(other.children.map((child) => child.name)).toEqual(['near', 'far']);
  });

  it('orders a line against a face by the same rule', () => {
    const face = quad('face', 0);
    const points = [vec3(-2, 0, 2), vec3(2, 0, 2)];
    const line = { points, node: polyline3('line', points, eye, { stroke: { colour: 'black', width: 0.02 } }) };
    expect(space('scene', [line, face], eye).children.map((child) => child.name)).toEqual(['face', 'line']);
    const away = [vec3(-2, 0, -2), vec3(2, 0, -2)];
    const behind = { points: away, node: polyline3('line', away, eye, { stroke: { colour: 'black', width: 0.02 } }) };
    expect(space('scene', [behind, face], eye).children.map((child) => child.name)).toEqual(['line', 'face']);
  });

  it('keeps the order the author gave two pieces at the same depth', () => {
    const first = quad('first', 0);
    const second = quad('second', 0);
    expect(space('scene', [first, second], eye).children.map((child) => child.name)).toEqual(['first', 'second']);
  });

  it('orders four thousand pieces back to front', () => {
    const pieces = Array.from({ length: 4000 }, (unused, at) => quad(`cell${at}`, -at / 100));
    const sorted = space('many', pieces, eye);
    expect(sorted.children).toHaveLength(4000);
    expect(sorted.children[0].name).toBe('cell3999');
    expect(sorted.children[3999].name).toBe('cell0');
  });
});

describe('surface3', () => {
  const sphere = (u: number, v: number) =>
    vec3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
  const looking = camera3({ eye: vec3(0, 0, 5), target: vec3(0, 0, 0), projection: orthographic() });
  const ball = (resolution: number, cull: boolean, shades: number[] = []) =>
    surface3('ball', sphere, looking, {
      u: interval(0, 2 * Math.PI),
      v: interval(0, Math.PI),
      resolution,
      cull,
      shade: (amount) => {
        shades.push(amount);
        return { colour: 'rgb(0, 0, 0)' };
      },
    });

  it('draws a cell for every square of the grid', () => {
    const drawn = ball(24, false);
    expect(drawn.children).toHaveLength(576);
    expect(flatten(drawn)).toHaveLength(576);
  });

  it('leaves out the cells facing away when it is asked to', () => {
    // Fewer than half, because an eye five radii off sees less than a
    // hemisphere of a ball of radius one.
    expect(ball(24, true).children).toHaveLength(188);
  });

  it('draws a ball as wide as the ball is', () => {
    const box = boundsOfMarks(flatten(ball(24, false)));
    expect(box).not.toBeNull();
    const across = Math.abs(box!.x.to - box!.x.from);
    expect(Math.abs(across - 2) / 2).toBeLessThan(1e-12);

    const odd = boundsOfMarks(flatten(ball(25, false)));
    const short = Math.abs(odd!.x.to - odd!.x.from);
    expect((2 - short) / 2).toBeLessThan(0.01);
    expect((2 - short) / 2).toBeGreaterThan(0);
  });

  it('shades a cell by how squarely it faces the light', () => {
    const shades: number[] = [];
    ball(24, false, shades);
    expect(shades).toHaveLength(576);
    expect(Math.min(...shades)).toBeLessThan(0.01);
    expect(Math.max(...shades)).toBeGreaterThan(0.99);
  });

  it('takes a different count each way', () => {
    const uneven = surface3('sheet', (u, v) => vec3(u, v, 0), looking, {
      resolution: { u: 5, v: 3 },
      shade: () => ({ colour: 'grey' }),
    });
    expect(uneven.children).toHaveLength(15);
  });
});

describe('the door', () => {
  it('hands out every call three dimensions added', () => {
    for (const name of [
      'mat4',
      'camera3',
      'orthographic',
      'perspective',
      'polyline3',
      'dot3',
      'text3',
      'space',
      'surface3',
      'surfaceCells',
      'axes3',
      'sectionOf',
      'viewAt',
    ]) {
      expect(typeof (door as Record<string, unknown>)[name], name).not.toBe('undefined');
    }
  });
});
