import { describe, expect, it } from 'vitest';
import { arc, boundsOf, centreOf, inputAt, mat3, marksAt, placeAt, viewAt, type Input, type Mark } from '../index.js';
import { TIMES, tangent } from '../demos/tangent.js';

const WIDTH = 1280;
const HEIGHT = 720;
const INPUTS: readonly Input[] = [{ track: 's', mark: 'tangent/point', reach: 0.2 }];

describe('a pixel read as a place and a press read as an input', () => {
  it('returns every pixel it was given from the place it names', () => {
    const view = viewAt(tangent, TIMES.walkTo, WIDTH, HEIGHT);
    const pixels = [
      { x: 0, y: 0 },
      { x: WIDTH, y: 0 },
      { x: 0, y: HEIGHT },
      { x: WIDTH, y: HEIGHT },
      { x: WIDTH / 2, y: HEIGHT / 2 },
    ];
    for (const pixel of pixels) {
      const place = placeAt(tangent, TIMES.walkTo, WIDTH, HEIGHT, pixel)!;
      const back = mat3.transformPoint(view, place);
      expect(Math.hypot(back.x - pixel.x, back.y - pixel.y)).toBeLessThan(1e-9);
    }
  });

  it('takes s on a press on the dot and nothing half a unit away', () => {
    const marks = marksAt(tangent, TIMES.walkTo, WIDTH / HEIGHT);
    const dot = marks.find((mark) => mark.id === 'tangent/point/disc');
    if (!dot || dot.kind !== 'path') throw new Error('the dot is not drawn');
    const middle = centreOf(boundsOf(dot.path)!);
    expect(inputAt(INPUTS, marks, middle)?.track).toBe('s');
    expect(inputAt(INPUTS, marks, { x: middle.x + 0.25, y: middle.y })?.track).toBe('s');
    expect(inputAt(INPUTS, marks, { x: middle.x + 0.5, y: middle.y })).toBeUndefined();
  });

  it('takes the dot through the pixel it is drawn at', () => {
    const marks = marksAt(tangent, TIMES.walkTo, WIDTH / HEIGHT);
    const dot = marks.find((mark) => mark.id === 'tangent/point/disc');
    if (!dot || dot.kind !== 'path') throw new Error('the dot is not drawn');
    const pixel = mat3.transformPoint(viewAt(tangent, TIMES.walkTo, WIDTH, HEIGHT), centreOf(boundsOf(dot.path)!));
    const place = placeAt(tangent, TIMES.walkTo, WIDTH, HEIGHT, pixel)!;
    expect(inputAt(INPUTS, marks, place)?.track).toBe('s');
  });

  it('measures a stroke by half its width either side of its open path', () => {
    const half: Mark = {
      kind: 'path',
      id: 'half',
      path: arc({ x: 0, y: 0 }, 1, 0, Math.PI),
      stroke: { colour: { r: 0, g: 0, b: 0, a: 1 }, width: 0.1 },
    };
    const inputs: readonly Input[] = [{ track: 'turn', mark: 'half' }];
    expect(inputAt(inputs, [half], { x: 0, y: 1.04 })?.track).toBe('turn');
    expect(inputAt(inputs, [half], { x: 0, y: 1.06 })).toBeUndefined();
    expect(inputAt(inputs, [half], { x: 0, y: 0 })).toBeUndefined();
  });
});
