/**
 * The frame demo, which is the one figure in this tree whose marks move when the
 * frame changes shape.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf, marksAt, readFigure, type Mark } from '../index.js';
import { readFileSync } from 'node:fs';
import { DISC, GAP, HEIGHT, HOLD, SHAPES, framed, stripMarks } from '../demos/frame.js';

const found = (marks: readonly Mark[], id: string): Mark => {
  const mark = marks.find((each) => each.id === id);
  if (!mark) throw new Error(`${id} is drawn`);
  return mark;
};

const boxOf = (mark: Mark) => {
  if (mark.kind !== 'path') throw new Error('a plate is a path');
  const box = boundsOf(mark.path);
  if (!box) throw new Error('a plate has bounds');
  return box;
};

describe('the frame demo', () => {
  it('gives the plate a different rectangle at each of the three shapes', () => {
    const widths = SHAPES.map((aspect) => {
      const box = boxOf(found(marksAt(framed, HOLD, aspect), 'frame/plate'));
      return box.x.to - box.x.from;
    });
    // A twentieth off each edge leaves nine tenths of the frame, and the frame is
    // six units tall.
    expect(widths[0]).toBeCloseTo(0.9 * HEIGHT * (16 / 9), 10);
    expect(widths[1]).toBeCloseTo(0.9 * HEIGHT, 10);
    expect(widths[2]).toBeCloseTo(0.9 * HEIGHT * (9 / 16), 10);
  });

  it('leaves the disc the same circle at all three, which is one place', () => {
    const boxes = SHAPES.map((aspect) => boxOf(found(marksAt(framed, HOLD, aspect), 'frame/disc')));
    for (const box of boxes) {
      expect(box.x.from).toBeCloseTo(-DISC, 6);
      expect(box.x.to).toBeCloseTo(DISC, 6);
      expect(box.y.from).toBeCloseTo(-DISC, 6);
      expect(box.y.to).toBeCloseTo(DISC, 6);
    }
  });

  it('draws the committed file the way the module draws it', () => {
    const read = readFigure(readFileSync('demos/frame.figure.json', 'utf8'));
    for (const aspect of SHAPES) {
      expect(marksAt(read, HOLD, aspect)).toEqual(marksAt(framed, HOLD, aspect));
    }
  });

  it('lays the strip out as three columns of the widths their shapes give', () => {
    const strip = stripMarks();
    const widths = SHAPES.map((aspect) => HEIGHT * aspect);
    expect(strip.extent.height).toBe(HEIGHT);
    expect(strip.extent.width).toBeCloseTo(widths.reduce((sum, one) => sum + one, 0) + GAP * 2, 10);
    // Each column's plate stands in the middle of its own column, so the gaps
    // between the three are the gap the strip names.
    const middles = SHAPES.map((_, column) => {
      const box = boxOf(found(strip.marks, `at${column}/frame/plate`));
      return (box.x.from + box.x.to) / 2;
    });
    for (const column of [0, 1]) {
      const between = middles[column + 1] - middles[column] - (widths[column] + widths[column + 1]) / 2;
      expect(between).toBeCloseTo(GAP, 10);
    }
  });
});
