import { describe, expect, it } from 'vitest';
import { axes3, camera3, colourFrom, flatten, interval, orthographic, perspective, ticksOn, vec3 } from '@altpsyche/maths';
import type { GroupNode, Node } from '@altpsyche/maths';

/**
 * Three axes in space, checked against the camera that placed them and against
 * the tick list the flat axes already read, including at the pose that tempts a
 * builder to drop the axis it cannot draw well.
 */

const RANGE = interval(-2, 2);
const STYLE = {
  x: RANGE,
  y: RANGE,
  z: RANGE,
  stroke: { colour: colourFrom('#000000'), width: 0.01 },
  fill: { colour: colourFrom('#000000') },
  size: 0.2,
  tickLength: 0.1,
  ticks: 5,
};

const child = (node: Node, name: string): GroupNode => {
  if (node.kind !== 'group') throw new Error('not a group');
  const found = node.children.find((one) => one.name === name);
  if (!found || found.kind !== 'group') throw new Error(`no group called ${name}`);
  return found;
};

describe('axes3', () => {
  const looking = camera3({ eye: vec3(4, 3, 5), target: vec3(0, 0, 0), projection: orthographic() });

  it('marks each axis with the ticks the flat axes would give it', () => {
    const wanted = ticksOn(RANGE, 5).length;
    const drawn = axes3('axes', looking, STYLE);
    for (const which of ['x', 'y', 'z'] as const) {
      expect(child(child(drawn, which), 'ticks').children).toHaveLength(wanted);
    }
  });

  it('draws every tick where the camera puts its two ends', () => {
    const drawn = axes3('axes', looking, STYLE);
    const ticks = child(child(drawn, 'x'), 'ticks');
    const marked = ticksOn(RANGE, 5);
    marked.forEach((tick, at) => {
      const ends = [
        looking.project(vec3(tick.value, -0.05, 0)).at,
        looking.project(vec3(tick.value, 0.05, 0)).at,
      ];
      const marks = flatten(ticks.children[at]);
      expect(marks).toHaveLength(1);
      if (marks[0].kind !== 'path') return;
      const drawnEnds = [marks[0].path[0].start, marks[0].path[0].curves[0].to];
      expect(Math.abs(drawnEnds[0].x - ends[0].x)).toBeLessThan(1e-12);
      expect(Math.abs(drawnEnds[0].y - ends[0].y)).toBeLessThan(1e-12);
      expect(Math.abs(drawnEnds[1].x - ends[1].x)).toBeLessThan(1e-12);
      expect(Math.abs(drawnEnds[1].y - ends[1].y)).toBeLessThan(1e-12);
    });
  });

  it('writes the number at the crossing once', () => {
    const drawn = axes3('axes', looking, STYLE);
    const written = (['x', 'y', 'z'] as const).flatMap((which) =>
      child(child(drawn, which), 'labels').children.map((one) => one.name),
    );
    expect(written.filter((name) => name === '0')).toHaveLength(1);
  });

  it('keeps every tick at a pose where one axis points almost at the eye', () => {
    const wanted = ticksOn(RANGE, 5).length;
    const along = camera3({
      eye: vec3(0.001, 0.001, 6),
      target: vec3(0, 0, 0),
      projection: perspective({ fov: Math.PI / 3, height: 6, near: 0.1 }),
    });
    const drawn = axes3('axes', along, STYLE);
    for (const which of ['x', 'y', 'z'] as const) {
      expect(child(child(drawn, which), 'ticks').children).toHaveLength(wanted);
    }
    expect(flatten(drawn).length).toBeGreaterThan(0);
  });

  it('leans a label away from where the three lines cross', () => {
    const drawn = axes3('axes', looking, STYLE);
    const origin = looking.project(vec3(0, 0, 0)).at;
    const labels = child(child(drawn, 'x'), 'labels');
    const far = labels.children.find((one) => one.name === '2');
    expect(far).toBeDefined();
    const marks = flatten(far!);
    expect(marks).toHaveLength(1);
    if (marks[0].kind !== 'text') return;
    const tick = looking.project(vec3(2, 0, 0)).at;
    const stood = Math.hypot(marks[0].at.x - tick.x, marks[0].at.y - tick.y);
    expect(Math.abs(stood - 0.2 * 0.35)).toBeLessThan(1e-12);
    const outward = Math.hypot(marks[0].at.x - origin.x, marks[0].at.y - origin.y);
    expect(outward).toBeGreaterThan(Math.hypot(tick.x - origin.x, tick.y - origin.y));
  });
});
