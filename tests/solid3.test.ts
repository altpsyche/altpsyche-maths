import { describe, expect, it } from 'vitest';
import {
  camera3,
  colourFrom,
  perspective,
  resolveNode,
  sameMarks,
  cube3,
  cubeCells,
  cylinder3,
  cylinderCells,
  flatten,
  orthographic,
  sphere3,
  sphereCells,
  torus3,
  torusCells,
  vec3,
  type NodeRecord,
  type ShadeRecord,
  type SpaceItem,
  type Vec3,
} from '../index.js';

const camera = camera3({ eye: vec3(0, 0, 9), target: vec3(0, 0, 0), projection: orthographic() });
const OPTIONS = { resolution: 12, shade: () => ({ colour: colourFrom('#000000') }) };
// A centre off the origin on all three axes, so nothing here passes by reading a
// coordinate that happens to be nothing.
const CENTRE = vec3(0.3, -0.2, 0.5);
const STEPS = 12;

/** Which way a cell faces, by the sum over its edges the surface reads. */
function facing(corners: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let at = 0; at < corners.length; at++) {
    const from = corners[at];
    const to = corners[(at + 1) % corners.length];
    x += (from.y - to.y) * (from.z + to.z);
    y += (from.z - to.z) * (from.x + to.x);
    z += (from.x - to.x) * (from.y + to.y);
  }
  return vec3.normalize(vec3(x, y, z));
}

const middleOf = (cell: SpaceItem): Vec3 =>
  cell.points.reduce((sum, point) => vec3.add(sum, vec3.scale(point, 1 / cell.points.length)), vec3.ZERO);

/** How many cells of a run face the way the solid's outside lies, which is every
 * one of them or the solid is lit from inside. */
function outward(cells: readonly SpaceItem[], out: (middle: Vec3) => Vec3): number {
  return cells.filter((cell) => vec3.dot(facing(cell.points), vec3.normalize(out(middleOf(cell)))) > 0).length;
}

/**
 * How many cells of a run have two corners in the same place, which is a whole
 * edge of the grid collapsed to one point.
 *
 * Compared by distance rather than by equality, since a pole at the far end of
 * the parameter sits where the sine of a whole half turn is, which is 1.2e-16
 * rather than nothing.
 */
function collapsed(cells: readonly SpaceItem[], grain = 1e-9): number {
  return cells.filter((cell) =>
    cell.points.some((point, at) => vec3.magnitude(vec3.sub(point, cell.points[(at + 1) % cell.points.length])) < grain)
  ).length;
}

describe('a sphere', () => {
  const cells = sphereCells('ball', CENTRE, 1.4, camera, OPTIONS);

  it('is one patch of one cell per step each way', () => {
    expect(cells).toHaveLength(STEPS * STEPS);
  });

  it('faces away from its centre everywhere', () => {
    expect(outward(cells, (middle) => vec3.sub(middle, CENTRE))).toBe(cells.length);
  });

  it('collapses the row of cells at each of its two poles', () => {
    expect(collapsed(cells)).toBe(2 * STEPS);
    // The pole the parameter starts at is one place exactly and the pole it ends
    // at is one place to the last bits, so a cell there faces nowhere under a
    // reading that crosses two edges and faces outwards under the sum over all
    // four.
    expect(collapsed(cells, 1e-17)).toBe(STEPS);
  });

  it('puts every corner on the true sphere', () => {
    for (const cell of cells) {
      for (const corner of cell.points) expect(vec3.magnitude(vec3.sub(corner, CENTRE))).toBeCloseTo(1.4, 12);
    }
  });

  it('quarters what a flat cell falls short by as the steps double', () => {
    const short = [12, 24, 48].map((resolution) => {
      const drawn = sphereCells('ball', CENTRE, 1.4, camera, { ...OPTIONS, resolution });
      return Math.max(...drawn.map((cell) => 1.4 - vec3.magnitude(vec3.sub(middleOf(cell), CENTRE))));
    });
    // A flat cell falls inside the sphere by the sagitta of the angle it covers,
    // which is second order in that angle.
    expect(short[0] / 1.4).toBeGreaterThan(0.04);
    expect(short[0] / short[1]).toBeGreaterThan(3.8);
    expect(short[0] / short[1]).toBeLessThan(4.2);
    expect(short[1] / short[2]).toBeGreaterThan(3.8);
    expect(short[1] / short[2]).toBeLessThan(4.2);
  });
});

describe('a cube', () => {
  const cells = cubeCells('box', CENTRE, 2, camera, OPTIONS);
  // The faces arrive in the order the six are written, each a whole run of cells.
  const NORMALS = [vec3(1, 0, 0), vec3(-1, 0, 0), vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1)];

  it('is six patches of one cell per step each way', () => {
    expect(cells).toHaveLength(6 * STEPS * STEPS);
  });

  it('faces every one of its six faces outwards', () => {
    NORMALS.forEach((normal, face) => {
      const own = cells.slice(face * STEPS * STEPS, (face + 1) * STEPS * STEPS);
      expect(outward(own, () => normal)).toBe(own.length);
    });
  });

  it('has no collapsed cell, since none of its faces closes on a point', () => {
    expect(collapsed(cells)).toBe(0);
  });

  it('puts its eight corners half an edge from the centre along all three axes', () => {
    const corners = new Set(cells.flatMap((cell) => cell.points).map((p) => `${p.x.toFixed(9)},${p.y.toFixed(9)},${p.z.toFixed(9)}`));
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        for (const z of [-1, 1]) {
          expect(corners.has(`${(CENTRE.x + x).toFixed(9)},${(CENTRE.y + y).toFixed(9)},${(CENTRE.z + z).toFixed(9)}`)).toBe(true);
        }
      }
    }
  });
});

describe('a cylinder', () => {
  const cells = cylinderCells('can', CENTRE, 1.2, 2.4, camera, OPTIONS);
  const run = STEPS * STEPS;

  it('is a side and two caps, each of one cell per step each way', () => {
    expect(cells).toHaveLength(3 * run);
  });

  it('faces its side away from the axis and its two caps opposite ways', () => {
    const side = cells.slice(0, run);
    expect(outward(side, (middle) => vec3(middle.x - CENTRE.x, middle.y - CENTRE.y, 0))).toBe(run);
    expect(outward(cells.slice(run, 2 * run), () => vec3(0, 0, 1))).toBe(run);
    expect(outward(cells.slice(2 * run), () => vec3(0, 0, -1))).toBe(run);
  });

  it('collapses the ring at the middle of each cap and nowhere else', () => {
    expect(collapsed(cells.slice(0, run))).toBe(0);
    expect(collapsed(cells.slice(run))).toBe(2 * STEPS);
  });
});

describe('a torus', () => {
  const cells = torusCells('ring', CENTRE, 2, 0.6, camera, OPTIONS);

  it('is one patch of one cell per step each way', () => {
    expect(cells).toHaveLength(STEPS * STEPS);
  });

  it('faces away from the middle of its own tube everywhere', () => {
    expect(
      outward(cells, (middle) => {
        const flat = vec3(middle.x - CENTRE.x, middle.y - CENTRE.y, 0);
        const reach = Math.hypot(flat.x, flat.y);
        return vec3.sub(middle, vec3(CENTRE.x + (2 * flat.x) / reach, CENTRE.y + (2 * flat.y) / reach, CENTRE.z));
      })
    ).toBe(cells.length);
  });

  it('holds every corner one tube radius from the ring it turns about', () => {
    for (const cell of cells) {
      for (const corner of cell.points) {
        const flat = Math.hypot(corner.x - CENTRE.x, corner.y - CENTRE.y);
        expect(Math.hypot(flat - 2, corner.z - CENTRE.z)).toBeCloseTo(0.6, 12);
      }
    }
  });
});

describe('a solid drawn on its own', () => {
  it('is one scene of the cells the solid hands back', () => {
    const drawn = [
      [sphere3('ball', CENTRE, 1, camera, OPTIONS), sphereCells('face', CENTRE, 1, camera, OPTIONS)],
      [cube3('box', CENTRE, 1, camera, OPTIONS), cubeCells('face', CENTRE, 1, camera, OPTIONS)],
      [cylinder3('can', CENTRE, 1, 2, camera, OPTIONS), cylinderCells('face', CENTRE, 1, 2, camera, OPTIONS)],
      [torus3('ring', CENTRE, 2, 0.5, camera, OPTIONS), torusCells('face', CENTRE, 2, 0.5, camera, OPTIONS)],
    ] as const;
    for (const [node, cells] of drawn) {
      expect(flatten(node as never)).toHaveLength((cells as SpaceItem[]).length);
    }
  });
});

describe('the four solids as records', () => {
  // A camera written as a record and the same camera built, so the two sides of
  // each case are seen from one place.
  const seen = { eye: { x: 4, y: 5, z: 3 }, target: { x: 0, y: 0, z: 0 }, projection: { kind: 'perspective' as const, fov: 0.7, height: 6, near: 0.2 } };
  const built = camera3({ eye: vec3(4, 5, 3), target: vec3(0, 0, 0), projection: perspective({ fov: 0.7, height: 6, near: 0.2 }) });
  // A ramp of one colour twice, so every amount of light gives that colour and
  // what the two sides are compared on is the geometry rather than the shading.
  const ONE = { colour: colourFrom('#334455') };
  const shade: ShadeRecord = { ramp: [ONE, ONE] };
  const options = { shade, resolution: 6 };
  const called = { ...options, shade: () => ONE };
  const centre = { x: 0.3, y: -0.2, z: 0.5 };

  const cases: readonly { readonly record: NodeRecord; readonly node: ReturnType<typeof sphere3> }[] = [
    {
      record: { kind: 'sphere3', name: 'ball', centre, radius: 1.4, camera: seen, options },
      node: sphere3('ball', CENTRE, 1.4, built, called),
    },
    {
      record: { kind: 'cube3', name: 'box', centre, size: 2, camera: seen, options },
      node: cube3('box', CENTRE, 2, built, called),
    },
    {
      record: { kind: 'cylinder3', name: 'can', centre, radius: 1.2, height: 2.4, camera: seen, options },
      node: cylinder3('can', CENTRE, 1.2, 2.4, built, called),
    },
    {
      record: { kind: 'torus3', name: 'ring', centre, ring: 2, tube: 0.6, camera: seen, options },
      node: torus3('ring', CENTRE, 2, 0.6, built, called),
    },
  ];

  it('draws each solid where its own call draws one', () => {
    for (const { record, node } of cases) {
      expect(sameMarks(flatten(resolveNode(record)), flatten(node)), record.kind).toBe(true);
    }
  });

  it("hands a scene the cells of a solid, sorted among the scene's own", () => {
    const record: NodeRecord = {
      kind: 'scene3',
      name: 'both',
      camera: seen,
      items: [
        { kind: 'sphereCells', name: 'ball', centre, radius: 1, options },
        { kind: 'torusCells', name: 'ring', centre, ring: 2, tube: 0.4, options },
      ],
    };
    const marks = flatten(resolveNode(record));
    // Two solids sorted together are one run of marks, and every mark names the
    // solid it came from ahead of its own place in the grid.
    expect(marks).toHaveLength(2 * 6 * 6);
    expect(marks.filter((mark) => mark.id.includes('/ball/'))).toHaveLength(36);
    expect(marks.filter((mark) => mark.id.includes('/ring/'))).toHaveLength(36);
  });

  it("drives a solid's own measurements with a track", () => {
    const record: NodeRecord = {
      kind: 'sphere3',
      name: 'ball',
      centre,
      radius: { kind: 'track', name: 'grows' },
      camera: seen,
      options,
    };
    const small = flatten(resolveNode(record, { tracks: { grows: 0.5 } }));
    const large = flatten(resolveNode(record, { tracks: { grows: 2 } }));
    expect(small).toHaveLength(36);
    expect(large).toHaveLength(36);
    expect(sameMarks(small, large)).toBe(false);
  });
});
