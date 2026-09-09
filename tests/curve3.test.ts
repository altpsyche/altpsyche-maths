import { describe, expect, it } from 'vitest';
import {
  camera3,
  colourFrom,
  curveOf3,
  cylinderCells,
  flatten,
  interval,
  perspective,
  resolveNode,
  resolveSpaceCurve,
  sameMarks,
  scene3,
  vec3,
  type NodeRecord,
  type SpaceCurveRecord,
} from '../index.js';

const camera = camera3({
  eye: vec3(5, 4, 3),
  target: vec3(0, 0, 0),
  projection: perspective({ fov: 0.7, height: 6, near: 0.2 }),
});
const seen = {
  eye: { x: 5, y: 4, z: 3 },
  target: { x: 0, y: 0, z: 0 },
  projection: { kind: 'perspective' as const, fov: 0.7, height: 6, near: 0.2 },
};

/** A run with no stroke draws nothing, so every case here names one. */
const WIRE = { stroke: { colour: colourFrom('#101010'), width: 0.02 } };

const RADIUS = 1.2;
const HEIGHT = 2.4;
const TURNS = 3;
/** A helix of three turns up the side of a cylinder standing on the axis. */
const helix = (t: number) =>
  vec3(RADIUS * Math.cos(TURNS * 2 * Math.PI * t), RADIUS * Math.sin(TURNS * 2 * Math.PI * t), HEIGHT * (t - 1 / 2));

describe('a curve in space', () => {
  it('hands back one place more than the steps it is cut into', () => {
    expect(curveOf3(helix, { resolution: 96 })).toHaveLength(97);
    expect(curveOf3(helix, { resolution: 1 })).toHaveLength(2);
  });

  it('lies on the cylinder it is written round', () => {
    let worst = 0;
    for (const place of curveOf3(helix, { resolution: 200 })) {
      worst = Math.max(worst, Math.abs(Math.hypot(place.x, place.y) - RADIUS));
      expect(Math.abs(place.z)).toBeLessThanOrEqual(HEIGHT / 2 + 1e-15);
    }
    expect(worst).toBeLessThan(1e-15);
  });

  it('reads the run of the parameter a figure names', () => {
    const half = curveOf3(helix, { resolution: 8, over: interval(0, 0.5) });
    expect(half).toHaveLength(9);
    expect(half[8].z).toBeCloseTo(0, 12);
  });

  it('closes where the curve it reads closes', () => {
    const ring = (t: number) => vec3(Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t), 0);
    const places = curveOf3(ring, { resolution: 24 });
    expect(places[24].x).toBeCloseTo(places[0].x, 15);
    expect(places[24].y).toBeCloseTo(places[0].y, 15);
  });
});

describe('a curve in space as a record', () => {
  const curve: SpaceCurveRecord = {
    of: {
      x: { kind: 'arithmetic', operator: '*', left: RADIUS, right: { kind: 'call', name: 'cos', arguments: [{ kind: 'arithmetic', operator: '*', left: TURNS * 2 * Math.PI, right: { kind: 'variable', name: 't' } }] } },
      y: { kind: 'arithmetic', operator: '*', left: RADIUS, right: { kind: 'call', name: 'sin', arguments: [{ kind: 'arithmetic', operator: '*', left: TURNS * 2 * Math.PI, right: { kind: 'variable', name: 't' } }] } },
      z: { kind: 'arithmetic', operator: '*', left: HEIGHT, right: { kind: 'arithmetic', operator: '-', left: { kind: 'variable', name: 't' }, right: 0.5 } },
    },
    resolution: 48,
  };

  it('reads its curve from the bound variable t', () => {
    const places = resolveSpaceCurve(curve);
    const called = curveOf3(helix, { resolution: 48 });
    expect(places).toHaveLength(called.length);
    for (let at = 0; at < places.length; at++) {
      expect(places[at].x).toBeCloseTo(called[at].x, 12);
      expect(places[at].z).toBeCloseTo(called[at].z, 12);
    }
  });

  it('holds its count of places as a track moves the run it is read over', () => {
    const growing: SpaceCurveRecord = { ...curve, over: { from: 0, to: { kind: 'track', name: 'along' } } };
    const early = resolveSpaceCurve(growing, { tracks: { along: 0.25 } });
    const whole = resolveSpaceCurve(growing, { tracks: { along: 1 } });
    expect(early).toHaveLength(49);
    expect(whole).toHaveLength(49);
    expect(early[48].z).toBeLessThan(whole[48].z);
  });

  it('draws one run where a run in space draws one', () => {
    const record: NodeRecord = { kind: 'curve3', name: 'coil', curve, camera: seen, options: WIRE };
    const marks = flatten(resolveNode(record));
    expect(marks).toHaveLength(1);
    expect(marks[0].id).toBe('coil/run/run');
  });

  it('sorts against the solid it lies on rather than in front of it', () => {
    const shade = () => ({ colour: colourFrom('#334455') });
    const cells = cylinderCells('can', vec3(0, 0, 0), RADIUS, HEIGHT, camera, { shade, resolution: 6 });
    const coil = curveOf3(helix, { resolution: 48 });
    const drawn = scene3(
      'both',
      [...cells, { points: coil, node: resolveNode({ kind: 'curve3', name: 'coil', curve, camera: seen, options: WIRE }) }],
      camera
    );
    const marks = flatten(drawn);
    // The curve is one piece among the cylinder's own, so it is somewhere in the
    // middle of the run rather than first or last.
    const at = marks.findIndex((mark) => mark.id.includes('coil'));
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(marks.length - 1);
  });

  it('is the same run whichever side of the seam it is built from', () => {
    const record: NodeRecord = { kind: 'curve3', name: 'coil', curve, camera: seen, options: WIRE };
    expect(sameMarks(flatten(resolveNode(record)), flatten(resolveNode(record)))).toBe(true);
  });
});
