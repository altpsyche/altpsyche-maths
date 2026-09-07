import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  camera3,
  centreOf,
  dot3,
  flatten,
  orthographic,
  perspective,
  polyline3,
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
