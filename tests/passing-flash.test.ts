import { describe, expect, it } from 'vitest';
import { circle, colourFrom, lengthOf, pointAlong, showPassingFlash, vec2, type Mark, type Stroke } from '../index.js';

const stroke: Stroke = { colour: colourFrom('#ffffff'), width: 0.04 };

const ring: Mark = { kind: 'path', id: 'demo/ring', path: circle(vec2(0, 0), 1), stroke };
const marks: readonly Mark[] = [ring];

/** The light the animation adds to the list, which carries the lit mark's own
 * name in front of its own. */
function lightAt(along: number, covers?: number) {
  const changed = showPassingFlash('demo', covers === undefined ? { stroke } : { stroke, covers })(marks, along);
  const found = changed.find((mark) => mark.id === 'demo/ring/passing');
  if (found === undefined || found.kind !== 'path') throw new Error('the light is not in the list');
  return found;
}

describe('a light travelling a path', () => {
  it('is in the list at every fraction and holds no path at both ends', () => {
    for (const along of [0, 0.25, 0.5, 0.75, 1]) {
      expect(showPassingFlash('demo', { stroke })(marks, along)).toHaveLength(2);
    }
    expect(lightAt(0).path).toHaveLength(0);
    expect(lightAt(1).path).toHaveLength(0);
  });

  it('covers the share of the path it was asked for, once it is wholly on', () => {
    const whole = lengthOf(circle(vec2(0, 0), 1));
    // The light is part way on at both ends of the span, so the share it covers is
    // the share asked for only between them.
    for (const along of [0.3, 0.5, 0.7]) {
      expect(lengthOf(lightAt(along, 0.2).path) / whole).toBeCloseTo(0.2, 3);
    }
  });

  it('runs its near edge from the start of the path to the end', () => {
    const covers = 0.25;
    const path = circle(vec2(0, 0), 1);
    for (const along of [0.2, 0.4, 0.6, 0.8]) {
      const far = along * (1 + covers);
      const light = lightAt(along, covers).path;
      const near = pointAlong(path, Math.max(0, far - covers))!;
      const ahead = pointAlong(path, Math.min(1, far))!;
      const last = light[light.length - 1];
      expect(light[0].start.x).toBeCloseTo(near.x, 6);
      expect(light[0].start.y).toBeCloseTo(near.y, 6);
      expect(last.curves[last.curves.length - 1].to.x).toBeCloseTo(ahead.x, 6);
      expect(last.curves[last.curves.length - 1].to.y).toBeCloseTo(ahead.y, 6);
    }
  });

  it('enters at the start and leaves at the end rather than appearing whole', () => {
    expect(lengthOf(lightAt(0.05, 0.3).path)).toBeLessThan(lengthOf(lightAt(0.5, 0.3).path));
    expect(lengthOf(lightAt(0.95, 0.3).path)).toBeLessThan(lengthOf(lightAt(0.5, 0.3).path));
  });

  it('passes over a text mark, which carries no path to run along', () => {
    const label: Mark = {
      kind: 'text',
      id: 'demo/label',
      at: vec2(0, 0),
      text: 'x',
      size: 0.4,
      family: 'sans-serif',
      fill: { colour: colourFrom('#ffffff') },
    };
    expect(showPassingFlash('demo/label', { stroke })([label], 0.5)).toHaveLength(1);
  });

  it('changes nothing where the name reaches nothing', () => {
    expect(showPassingFlash('nowhere', { stroke })(marks, 0.5)).toBe(marks);
  });
});
