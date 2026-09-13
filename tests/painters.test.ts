import { describe, expect, it } from 'vitest';
import { PAINTER_NAMES, checkFigure, circle, marksAt, painterRefusal, resolveFigure } from '../index.js';
import type { Figure, FigureRecord, PainterName } from '../index.js';

/**
 * The painters a figure names, and what a painter it does not name is told.
 *
 * A figure naming none names all three, so every figure written before the field
 * existed is drawn by everything.
 */

const ink = { r: 0, g: 0, b: 0, a: 1 };

function figureOf(painters?: readonly PainterName[]): Figure {
  return {
    extent: { width: 2, height: 2 },
    still: 0,
    scene: { kind: 'shape', name: 'disc', path: circle({ x: 0, y: 0 }, 0.5), fill: { colour: ink } },
    painters,
  };
}

describe('the painters a figure names', () => {
  it('is every painter where the figure names none', () => {
    const figure = figureOf();
    for (const painter of PAINTER_NAMES) {
      expect(painterRefusal(figure, painter)).toBeUndefined();
      expect(marksAt(figure, 0, 1, painter)).toHaveLength(1);
    }
  });

  it('turns away a painter it does not name, saying which', () => {
    const figure = figureOf(['gpu']);
    expect(painterRefusal(figure, 'gpu')).toBeUndefined();
    expect(painterRefusal(figure, 'svg')).toBe('this figure is drawn by gpu and the svg painter asked for it');
    expect(() => marksAt(figure, 0, 1, 'svg')).toThrow('this figure is drawn by gpu and the svg painter asked for it');
    expect(() => marksAt(figure, 0, 1, 'canvas')).toThrow('the canvas painter asked for it');
  });

  it('names every painter it was given in the sentence it refuses with', () => {
    expect(painterRefusal(figureOf(['svg', 'canvas']), 'gpu')).toBe(
      'this figure is drawn by svg and canvas and the gpu painter asked for it',
    );
  });

  it('hands back marks where no painter is named at all, which is what a gate asks', () => {
    expect(marksAt(figureOf(['gpu']), 0, 1)).toHaveLength(1);
  });
});

describe('the painters a figure written as a file names', () => {
  const record = (painters?: unknown): unknown => ({
    extent: { width: 2, height: 2 },
    still: 0,
    scene: { kind: 'shape', name: 'disc', path: { kind: 'circle', centre: { x: 0, y: 0 }, radius: 0.5 }, style: { fill: { colour: ink } } },
    ...(painters === undefined ? {} : { painters }),
  });

  it('carries the three names through to the figure', () => {
    const checked = checkFigure(record(['svg', 'gpu'])) as FigureRecord;
    expect(resolveFigure(checked).painters).toEqual(['svg', 'gpu']);
  });

  it('leaves the field out where the file carries none', () => {
    expect(resolveFigure(checkFigure(record()) as FigureRecord).painters).toBeUndefined();
  });

  it('refuses a name that is not a painter, by path', () => {
    expect(() => checkFigure(record(['svg', 'metal']))).toThrow('painters.1');
  });
});
