import { describe, expect, it } from 'vitest';
import {
  arc,
  boundsOf,
  centreOf,
  heldFrom,
  inputAt,
  mat3,
  marksAt,
  placeAt,
  pointAlong,
  pointOf,
  viewAt,
  type Input,
  type Mark,
  type Motion,
} from '../index.js';
import { TIMES, coords, tangent, walkPath } from '../demos/tangent.js';

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

  const along: Motion = { kind: 'along', path: walkPath };
  const pressed = { place: { x: 0, y: 0 }, value: 0 };

  it('puts the dot on a pointer that lies on the walked stretch', () => {
    const pointer = pointOf(coords, 1.5, 1.5 * 1.5);
    const s = heldFrom(along, pressed, pointer);
    const marks = marksAt(tangent, TIMES.walkTo, WIDTH / HEIGHT, undefined, { s });
    const dot = marks.find((mark) => mark.id === 'tangent/point/disc');
    if (!dot || dot.kind !== 'path') throw new Error('the dot is not drawn');
    const middle = centreOf(boundsOf(dot.path)!);
    expect(Math.hypot(middle.x - pointer.x, middle.y - pointer.y)).toBeLessThan(1e-6);
  });

  it('holds a pointer off the curve at the point of the curve nearest it', () => {
    const on = pointAlong(walkPath, 0.4)!;
    const ahead = pointAlong(walkPath, 0.4001)!;
    const run = Math.hypot(ahead.x - on.x, ahead.y - on.y);
    const off = { x: on.x - (0.3 * (ahead.y - on.y)) / run, y: on.y + (0.3 * (ahead.x - on.x)) / run };
    const held = heldFrom(along, pressed, off);
    expect(held).toBeCloseTo(0.4, 4);
    const nearest = pointAlong(walkPath, held)!;
    expect(Math.hypot(nearest.x - off.x, nearest.y - off.y)).toBeLessThanOrEqual(0.3 + 1e-12);
  });

  it('moves a dragged value by its rate for each unit travelled across', () => {
    const drag: Motion = { kind: 'drag', rate: 0.125 };
    const press = { place: { x: 1, y: 2 }, value: 0.25 };
    expect(heldFrom(drag, press, { x: 3.4, y: -5 })).toBeCloseTo(0.25 + 0.125 * 2.4, 12);
    expect(heldFrom(drag, press, press.place)).toBe(0.25);
  });

  it('measures a drag along the direction it names', () => {
    const press = { place: { x: 1, y: 2 }, value: 0.25 };
    const pointer = { x: 3.4, y: -5 };
    const along = (across: { x: number; y: number }) => heldFrom({ kind: 'drag', rate: 0.125, across }, press, pointer);
    expect(along({ x: 1, y: 0 })).toBeCloseTo(0.25 + 0.125 * 2.4, 12);
    expect(along({ x: 0, y: 1 })).toBeCloseTo(0.25 + 0.125 * -7, 12);
    expect(along({ x: 3, y: 3 })).toBeCloseTo(0.25 + (0.125 * (2.4 - 7)) / Math.SQRT2, 12);
  });

  it('turns a value by its rate for each turn swept about the centre', () => {
    const centre = { x: 1, y: -1 };
    const around: Motion = { kind: 'around', rate: 60, centre };
    const at = (turns: number) => ({ x: 1 + 2 * Math.cos(turns * 2 * Math.PI), y: -1 + 2 * Math.sin(turns * 2 * Math.PI) });
    expect(heldFrom(around, { place: at(0), value: 5 }, at(0.25))).toBeCloseTo(5 + 15, 12);
    expect(heldFrom(around, { place: at(0.25), value: 5 }, at(0))).toBeCloseTo(5 - 15, 12);
    // A sweep from 170 degrees to 190 crosses the negative x axis, where atan2 jumps from π to -π.
    expect(heldFrom(around, { place: at(170 / 360), value: 5 }, at(190 / 360))).toBeCloseTo(5 + 60 * (20 / 360), 12);
    expect(heldFrom(around, { place: at(0.1), value: 5 }, centre)).toBe(5);
  });
});
