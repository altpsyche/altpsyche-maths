import { describe, expect, it } from 'vitest';
import {
  areaOf,
  boundsOf,
  circle,
  colourFrom,
  containsPoint,
  depthOrder,
  lengthOf,
  polygon,
  rect,
  vec2,
  type Depth,
  type Mark,
  type Stroke,
} from '@altpsyche/maths';

/**
 * The order a painter with no depth buffer draws in.
 *
 * Every reading here is against the rule the format states: where two marks
 * carrying a depth overlap, the nearer of the two at a point is drawn over the
 * further one there, and a mark carrying no depth clears what the depths before
 * it decided.
 */

const ink = { colour: colourFrom('#000') };
const pen: Stroke = { colour: colourFrom('#000'), width: 0.1 };

/** A depth of one number the whole way, which is a flat piece facing the eye. */
const level = (at: number): Depth => ({ a: 0, b: 0, c: at });

/** A depth that leans across the page, nearer on the left than on the right. */
const leaning = (at: number, rate: number): Depth => ({ a: rate, b: 0, c: at });

function square(id: string, corner: number, depth?: Depth): Mark {
  return { kind: 'path', id, path: rect(vec2(corner, corner), 2, 2), fill: ink, ...(depth ? { depth } : {}) };
}

/** Which mark of the answer draws a place, taking the last one that holds it,
 * which is the one a painter leaves on top. */
function topAt(marks: readonly Mark[], x: number, y: number): string | undefined {
  let found: string | undefined;
  for (const mark of marks) {
    if (mark.kind !== 'path') continue;
    if (containsPoint(mark.path, vec2(x, y))) found = mark.id.replace(/\/\d+$/, '');
  }
  return found;
}

describe('a list with no depth in it', () => {
  it('is handed back as it stands', () => {
    const marks = [square('a', 0), square('b', 1)];
    expect(depthOrder(marks)).toBe(marks);
  });
});

describe('two marks that overlap', () => {
  it('draws the nearer of the two over the further, whatever order the list gives', () => {
    const far = square('far', 0, level(5));
    const near = square('near', 1, level(2));
    expect(depthOrder([near, far]).map((mark) => mark.id)).toEqual(['far', 'near']);
    expect(depthOrder([far, near]).map((mark) => mark.id)).toEqual(['far', 'near']);
  });

  it('leaves the order of the list where the two are at one depth', () => {
    const under = square('under', 0, level(3));
    const over = square('over', 1, level(3));
    expect(depthOrder([under, over]).map((mark) => mark.id)).toEqual(['under', 'over']);
    expect(depthOrder([over, under]).map((mark) => mark.id)).toEqual(['over', 'under']);
  });

  it('leaves two that never meet alone, whatever their depths say', () => {
    const left = square('left', -4, level(9));
    const right = square('right', 4, level(1));
    expect(depthOrder([left, right]).map((mark) => mark.id)).toEqual(['left', 'right']);
  });

  it('leaves two alone where a path clip cuts one down to ground the other never covers', () => {
    const far = square('far', 0, level(5));
    const near = { ...square('near', 1, level(2)), clipPath: circle(vec2(2.9, 2.9), 0.05) };
    expect(depthOrder([near, far]).map((mark) => mark.id)).toEqual(['near', 'far']);
  });
});

describe('a mark carrying no depth', () => {
  it('clears the depths before it, so nothing earlier comes back over it', () => {
    const far = square('far', 0, level(5));
    const flat = square('flat', 0);
    const near = square('near', 0, level(1));
    const drawn = depthOrder([near, flat, far]).map((mark) => mark.id);
    // The near one stands before the flat one and is not lifted past it, and the
    // far one after it is not pushed back behind it either.
    expect(drawn).toEqual(['near', 'flat', 'far']);
  });
});

describe('two marks whose depths cross', () => {
  const across: Depth = { a: 0, b: 0, c: 0 };
  const leans = leaning(0, 1);

  it('cuts one of them and draws each piece the right way round', () => {
    const flat: Mark = { kind: 'path', id: 'flat', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: across };
    const tilted: Mark = { kind: 'path', id: 'tilted', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: leans };
    const drawn = depthOrder([flat, tilted]);
    expect(drawn.length).toBeGreaterThan(2);
    // The tilted one is nearer where the page is to the left of nothing and
    // further to the right of it, so each side shows the one the rule names.
    expect(topAt(drawn, -0.5, 0)).toBe('tilted');
    expect(topAt(drawn, 0.5, 0)).toBe('flat');
  });

  it('gives each piece its own id, the mark it came from with the number of the piece on the end', () => {
    const flat: Mark = { kind: 'path', id: 'fig/flat', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: across };
    const tilted: Mark = { kind: 'path', id: 'fig/tilted', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: leans };
    for (const mark of depthOrder([flat, tilted])) {
      expect(mark.id === 'fig/flat' || mark.id === 'fig/tilted' || /^fig\/(flat|tilted)\/\d+$/.test(mark.id)).toBe(true);
    }
  });

  it('keeps the ground the two covered, since a cut moves nothing', () => {
    const flat: Mark = { kind: 'path', id: 'flat', path: circle(vec2(0, 0), 1), fill: ink, depth: across };
    const tilted: Mark = { kind: 'path', id: 'tilted', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: leans };
    const drawn = depthOrder([flat, tilted]);
    const pieces = drawn.filter((mark) => mark.id.startsWith('flat'));
    for (const [x, y] of [
      [0, 0],
      [0.5, 0.5],
      [-0.7, 0.2],
      [0, 0.9],
    ]) {
      expect(pieces.some((mark) => mark.kind === 'path' && containsPoint(mark.path, vec2(x, y)))).toBe(true);
    }
    for (const [x, y] of [
      [0.95, 0.95],
      [-0.99, 0.99],
    ]) {
      expect(pieces.some((mark) => mark.kind === 'path' && containsPoint(mark.path, vec2(x, y)))).toBe(false);
    }
  });
});

describe('a stroke whose depth crosses another', () => {
  const board: Mark = { kind: 'path', id: 'board', path: rect(vec2(-2, -2), 4, 4), fill: ink, depth: { a: 0, b: 0, c: 0 } };
  const line: Mark = {
    kind: 'path',
    id: 'line',
    path: [{ start: vec2(-2, 0), curves: [{ control1: vec2(-0.67, 0), control2: vec2(0.67, 0), to: vec2(2, 0) }], closed: false }],
    stroke: pen,
    depth: leaning(0, 1),
  };
  // Either of two marks the line runs through could be the one cut, and the one
  // standing first in the list is the one that takes it.

  it('is cut at its centreline into the runs the line leaves', () => {
    const runs = depthOrder([line, board]).filter((mark) => mark.id.startsWith('line'));
    expect(runs).toHaveLength(2);
    // Neither run is closed and the two together are the length the one path had.
    const total = runs.reduce((sum, mark) => sum + (mark.kind === 'path' ? lengthOf(mark.path) : 0), 0);
    expect(total).toBeCloseTo(4, 9);
    for (const run of runs) {
      expect(run.kind === 'path' && run.path.every((subpath) => !subpath.closed)).toBe(true);
    }
  });

  it('draws the run that is nearer after the board and the run that is further before it', () => {
    const drawn = depthOrder([line, board]);
    const holding = (x: number) =>
      drawn.findIndex((mark) => {
        if (!mark.id.startsWith('line') || mark.kind !== 'path') return false;
        const box = boundsOf(mark.path);
        return box !== null && x >= Math.min(box.x.from, box.x.to) && x <= Math.max(box.x.from, box.x.to);
      });
    const under = drawn.findIndex((mark) => mark.id.startsWith('board'));
    // The line leans nearer to the left of nothing and further to the right of it.
    expect(holding(-1)).toBeGreaterThan(under);
    expect(holding(1)).toBeLessThan(under);
  });

  it('moves a dash pattern by the length before each run, so the dashes stay where they were', () => {
    const dashed: Mark = { ...line, id: 'dashed', stroke: { ...pen, dash: [0.3, 0.2] } } as Mark;
    const runs = depthOrder([dashed, board]).filter((mark) => mark.id.startsWith('dashed'));
    expect(runs).toHaveLength(2);
    const offsets = runs.map((mark) => (mark.kind === 'path' ? (mark.stroke?.dashOffset ?? 0) : 0));
    // One run starts where the path starts and the other two units along it.
    expect(Math.min(...offsets)).toBeCloseTo(0, 9);
    expect(Math.max(...offsets)).toBeCloseTo(2, 6);
  });
});

describe('a label in space', () => {
  it('is never cut and takes its place from the depth at its own anchor', () => {
    const board: Mark = { kind: 'path', id: 'board', path: rect(vec2(-2, -2), 4, 4), fill: ink, depth: leaning(0, 1) };
    const near: Mark = {
      kind: 'text',
      id: 'near',
      at: vec2(-1, 0),
      text: 'x',
      size: 0.4,
      family: 'sans-serif',
      fill: ink,
      depth: level(-3),
    };
    const far: Mark = { ...near, id: 'far', at: vec2(1, 0), depth: level(3) } as Mark;
    const drawn = depthOrder([near, far, board]).map((mark) => mark.id);
    expect(drawn).toContain('near');
    expect(drawn).toContain('far');
    // The board leans from nearer than both on the left to further than both on
    // the right, and neither label is cut whatever it stands over.
    expect(drawn.indexOf('near')).toBeGreaterThan(drawn.indexOf('board'));
    expect(drawn.indexOf('far')).toBeLessThan(drawn.indexOf('board'));
  });
});

describe('a stretch of many marks', () => {
  it('draws every piece of every mark, so nothing is lost to the cut', () => {
    const cells: Mark[] = [];
    for (let at = 0; at < 6; at += 1) {
      cells.push({
        kind: 'path',
        id: `cell/${at}`,
        path: polygon([vec2(at, 0), vec2(at + 1, 0), vec2(at + 1, 1), vec2(at, 1)]),
        fill: ink,
        depth: leaning(at * 0.1, 0.05),
      });
    }
    const drawn = depthOrder(cells);
    for (let at = 0; at < 6; at += 1) {
      const pieces = drawn.filter((mark) => mark.id.startsWith(`cell/${at}`));
      expect(pieces.length).toBeGreaterThan(0);
      expect(pieces.some((mark) => mark.kind === 'path' && containsPoint(mark.path, vec2(at + 0.5, 0.5)))).toBe(true);
      const box = boundsOf(pieces.flatMap((mark) => (mark.kind === 'path' ? mark.path : [])));
      expect(box).not.toBeNull();
    }
  });
});

describe('what a cut leaves', () => {
  const across: Depth = { a: 0, b: 0, c: 0 };
  const leans = leaning(0, 1);

  it('adds back up to the mark it was cut from, piece by piece', () => {
    const flat: Mark = { kind: 'path', id: 'flat', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: across };
    const tilted: Mark = { kind: 'path', id: 'tilted', path: circle(vec2(0, 0), 1), fill: ink, depth: leans };
    const drawn = depthOrder([flat, tilted]);
    for (const whole of [flat, tilted]) {
      const pieces = drawn.filter((mark) => mark.id.startsWith(whole.id));
      const area = pieces.reduce((sum, mark) => sum + (mark.kind === 'path' ? Math.abs(areaOf(mark.path)) : 0), 0);
      expect(area).toBeCloseTo(whole.kind === 'path' ? Math.abs(areaOf(whole.path)) : 0, 9);
    }
  });

  it('keeps a shape carrying both a fill and a stroke apart, so no stroke runs down a cut', () => {
    const flat: Mark = { kind: 'path', id: 'flat', path: rect(vec2(-1, -1), 2, 2), fill: ink, depth: across };
    const both: Mark = { kind: 'path', id: 'both', path: rect(vec2(-1, -1), 2, 2), fill: ink, stroke: pen, depth: leans };
    const pieces = depthOrder([both, flat]).filter((mark) => mark.id.startsWith('both'));
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      if (piece.kind !== 'path') throw new Error('a piece of a path is a path');
      expect(piece.fill !== undefined && piece.stroke !== undefined).toBe(false);
      // The stroke's pieces are runs rather than loops, since a stroke closed
      // along the cut would draw a line the mark never had.
      if (piece.stroke) expect(piece.path.every((subpath) => !subpath.closed)).toBe(true);
    }
  });

  it('draws every piece it made, even where the orders among them run in a ring', () => {
    const cells: Mark[] = [];
    for (let at = 0; at < 12; at += 1) {
      const turn = (at / 12) * Math.PI * 2;
      cells.push({
        kind: 'path',
        id: `ring/${at}`,
        path: rect(vec2(Math.cos(turn) - 0.6, Math.sin(turn) - 0.6), 1.2, 1.2),
        fill: ink,
        depth: { a: Math.cos(turn), b: Math.sin(turn), c: at * 1e-3 },
      });
    }
    const drawn = depthOrder(cells);
    for (let at = 0; at < 12; at += 1) {
      expect(drawn.some((mark) => mark.id.startsWith(`ring/${at}`))).toBe(true);
    }
  });
});
