import { describe, expect, it } from 'vitest';
import {
  flatten,
  interval,
  pointOf,
  resolveNode,
  resolveStreamline,
  sameMarks,
  streamlineOf,
  surface3,
  vec2,
  vec3,
  vectorField3,
  type Camera3Record,
  type Expression,
  type Mark,
  type NodeRecord,
  type Point3Record,
  type FillRecord,
  type SectionRecord,
  type ShadeRecord,
  type StreamlineRecord,
} from '../index.js';
import { DEEP, EMBER, FROST, GLAZE, MOSS, SHADE_THEME, SKY, shadeOf } from '../demos/palette.js';
import {
  CELLS,
  FACING,
  FLOW,
  FRAMES,
  HEIGHT,
  LIGHT,
  OVER,
  PANES,
  SEEDS,
  STEP,
  STEPS,
  alongAt,
  camera,
  saddle,
  sceneAt,
} from '../demos/surface.js';
import { eyeAt, paneWash } from './solid-forms.js';
import { coords, curve, slopeField } from '../demos/tangent.js';

const cut = { colour: EMBER, width: 0.05 };
const glass = { colour: SKY, width: 0.008 };
const flow = { colour: DEEP, width: 0.022 };
const fall = { colour: MOSS, width: { from: 0.035, to: 0 } };

const at = (name: 'x' | 'y' | 'z'): Expression => ({ kind: 'variable', name });
const over = (operator: '+' | '-' | '*' | '/', left: Expression, right: Expression): Expression => ({
  kind: 'arithmetic',
  operator,
  left,
  right,
});

/** The demo's own field over the plane, which turns a point about the origin one
 * way in x and the other in y. */
const flowing: Point3Record = { x: over('-', 0, at('x')), y: at('y'), z: 0 };

/** An arrow settling towards a third of a unit rather than growing with the
 * gradient, which is the demo's own length. */
const magnitude: Expression = { kind: 'variable', name: 'magnitude' };
const arrowLength: Expression = over('/', over('*', 0.34, magnitude), over('+', 0.9, magnitude));

/** The twelve washes of the demo's palette as a ramp, which is the list its own
 * shading picks a step of. */
const SHADES = Object.keys(SHADE_THEME).length;
const ramp = Array.from({ length: SHADES }, (_, step) => shadeOf(step / (SHADES - 1)));
const shade: ShadeRecord = { ramp, band: FACING };

const spread = { over: { u: OVER, v: OVER } };

/** The solid demo's own marks under one name at a time, from its tree. */
const theirs = (seconds: number, id: string): readonly Mark[] =>
  flatten(sceneAt(alongAt(seconds)))
    .filter((mark) => mark.id === id || mark.id.startsWith(`${id}/`))
    .map((mark) => ({ ...mark, id: mark.id.slice('solid/'.length) }));

const mine = (record: NodeRecord, seconds: number): readonly Mark[] =>
  flatten(resolveNode(record, { tracks: { turn: alongAt(seconds) } }));

describe('the surfaces and the fields in space as records', () => {
  it('draws the solid demo saddle, its plane and its field at each of the four times its strip draws', () => {
    expect(FRAMES).toHaveLength(4);
    for (const seconds of FRAMES) {
      const drawn = theirs(seconds, 'solid/body');
      expect(drawn.filter((mark) => mark.id.startsWith('body/hill/'))).toHaveLength(CELLS * CELLS);
      expect(drawn.filter((mark) => mark.id.startsWith('body/pane/'))).toHaveLength(PANES * PANES);
      // Twenty-five samples, each an arrow of a shaft and a head, less the one at
      // the middle of the plane where the field is nothing.
      expect(drawn.filter((mark) => mark.id.startsWith('body/flow/'))).toHaveLength(48);
    }
  });

  it('runs the pane wash between the two places the camera puts the edges of the pane', () => {
    for (const seconds of FRAMES) {
      const called = paneWash(eyeAt(alongAt(seconds))).gradient;
      const mark = theirs(seconds, 'solid/body').find((one) => one.id.startsWith('body/pane/'));
      const ours = mark?.kind === 'path' ? mark.fill?.gradient : undefined;
      expect(ours).toBeDefined();
      expect(ours?.from.x).toBeCloseTo(called!.from.x, 12);
      expect(ours?.from.y).toBeCloseTo(called!.from.y, 12);
      expect(ours?.to.x).toBeCloseTo(called!.to.x, 12);
      expect(ours?.to.y).toBeCloseTo(called!.to.y, 12);
    }
  });

  it('turns the wash as the orbit turns', () => {
    const endsAt = (seconds: number) => {
      const mark = theirs(seconds, 'solid/body').find((one) => one.id.startsWith('body/pane/'));
      return mark?.kind === 'path' ? mark.fill?.gradient?.from : undefined;
    };
    expect(endsAt(FRAMES[0])).not.toEqual(endsAt(FRAMES[2]));
  });

  it('draws the curve where the plane cuts the saddle in two branches', () => {
    // Two branches is what says the crossing was found rather than assumed.
    for (const seconds of FRAMES) expect(theirs(seconds, 'solid/cut')).toHaveLength(2);
  });

  it('draws one run of steepest descent for each seed', () => {
    expect(SEEDS).toHaveLength(3);
    for (const seconds of FRAMES) expect(theirs(seconds, 'solid/descent')).toHaveLength(3);
  });
});

describe('the surface and the field in space no demo names directly', () => {
  const built = eyeAt(0.3);
  const bindings = { tracks: { turn: 0.3 } };

  it('draws a surface where its own call draws one', () => {
    const options = { ...spread, resolution: 6, light: LIGHT, stroke: glass };
    const record: NodeRecord = { kind: 'surface3', name: 's', of: saddle, camera, options: { ...options, shade } };
    const called = surface3('s', (a, b) => vec3(a, b, (a * a - b * b) / 2), built, {
      ...options,
      shade: (amount) => shadeOf(interval.remap(amount, FACING, interval(0, 1))),
    });
    expect(sameMarks(flatten(resolveNode(record, bindings)), flatten(called))).toBe(true);
  });

  it('draws a field in space where its own call draws one', () => {
    const options = { over: { x: OVER, y: OVER, z: interval(HEIGHT, HEIGHT) }, resolution: 3, stroke: flow, head: 0.13 };
    const record: NodeRecord = {
      kind: 'vectorField3',
      name: 'f',
      of: flowing,
      camera,
      options: { ...options, lengthOf: arrowLength, colourFor: flow.colour },
    };
    const called = vectorField3('f', (place) => vec3(-place.x, place.y, 0), built, {
      ...options,
      lengthOf: (size) => (0.34 * size) / (0.9 + size),
      colourFor: () => flow.colour,
    });
    expect(sameMarks(flatten(resolveNode(record, bindings)), flatten(called))).toBe(true);
  });

  it('spreads a ramp over its band rather than over the whole of nothing to one', () => {
    const cells = (band: ShadeRecord['band']): number => {
      const record: NodeRecord = {
        kind: 'surface3',
        name: 's',
        of: saddle,
        camera,
        options: { ...spread, resolution: CELLS, shade: { ramp, band }, light: LIGHT },
      };
      const fills = flatten(resolveNode(record, bindings)).map((mark) => (mark.kind === 'path' ? mark.fill?.colour : undefined));
      return new Set(fills).size;
    };
    // The saddle faces this light between 0.346 and one, so the whole ramp
    // reaches it spread over that band and two thirds of it reaches it raw.
    expect(cells(FACING)).toBe(12);
    expect(cells(undefined)).toBe(8);
  });

  it('refuses a ramp with no colours in it', () => {
    const record: NodeRecord = {
      kind: 'surface3',
      name: 's',
      of: saddle,
      camera,
      options: { ...spread, resolution: 2, shade: { ramp: [] } },
    };
    expect(() => resolveNode(record, bindings)).toThrow('a shade is a ramp of at least one colour');
  });

  it('refuses a piece of a scene the set has no producer for', () => {
    const record = {
      kind: 'scene3',
      name: 's',
      camera,
      items: [{ kind: 'surfaceGrid', name: 'g', of: saddle, options: { shade: { ramp } } }],
    } as unknown as NodeRecord;
    expect(() => resolveNode(record, bindings)).toThrow('a scene has no piece called surfaceGrid');
  });
});

describe('the point producers as records', () => {
  it('walks the flat demo field to the curve the demo plots, which is one answer twice', () => {
    const record: StreamlineRecord = {
      of: {
        kind: 'point',
        x: 1,
        y: over('*', 2, { kind: 'member', of: { kind: 'variable', name: 'at' }, name: 'x' }),
      },
      from: vec2(0, 0),
      options: { step: 0.02, steps: 2000, direction: 'both', within: { x: coords.x.graph, y: coords.y.graph } },
    };
    const points = resolveStreamline(record);
    expect(points).toEqual(streamlineOf(slopeField, vec2(0, 0), record.options));
    expect(points.length).toBeGreaterThan(400);

    let worst = 0;
    for (const point of points) {
      const drawn = pointOf(coords, point.x, curve(point.x));
      const walked = pointOf(coords, point.x, point.y);
      worst = Math.max(worst, Math.hypot(walked.x - drawn.x, walked.y - drawn.y));
    }
    expect(worst).toBeLessThan(1e-6);
  });
});
