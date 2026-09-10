import { describe, expect, it } from 'vitest';
import {
  applyMatrix,
  checkFigure,
  colourFrom,
  flatten,
  mat3,
  matrix,
  resolveAnimation,
  resolveNode,
  sameMarks,
  table,
  vec2,
  type AnimationRecord,
  type FigureRecord,
  type Transform2D,
  type NodeRecord,
} from '../index.js';
import { turning } from './figures.js';

/**
 * The matrix, the table and the linear map as written forms, each read back to
 * the call it was written from.
 */

const FILL = { colour: colourFrom('#101010') };
const STROKE = { colour: colourFrom('#101010'), width: 0.02 };
const PLACE = { x: 0, y: 0 };
const options = { at: PLACE, width: 10, height: 8, size: 1, fill: FILL, stroke: STROKE };
const cells = [
  ['a', 'b'],
  ['c', 'd'],
];
const tableOptions = { at: PLACE, columns: [2, 3], rowHeight: 2, size: 1, fill: FILL, stroke: STROKE };

describe('a matrix as a record', () => {
  it('reads back to the call it was written from', () => {
    const record: NodeRecord = { kind: 'matrix', name: 'm', entries: cells, options };
    expect(sameMarks(flatten(resolveNode(record, {})), flatten(matrix('m', cells, options)), 1e-12)).toBe(true);
  });

  it('writes an entry from a template, so a tracked number reaches the matrix', () => {
    const record: NodeRecord = {
      kind: 'matrix',
      name: 'm',
      entries: [[{ template: '{0}', holes: [{ value: { kind: 'variable', name: 'a' }, precision: 0.01 }] }, 'b']],
      options,
    };
    const drawn = flatten(resolveNode(record, { variables: { a: 1.5 } }));
    expect(drawn.map((mark) => (mark.kind === 'text' ? mark.text : ''))).toEqual(['', '', '1.50', 'b']);
  });

  it('carries the place it is centred on as an expression', () => {
    const record: NodeRecord = {
      kind: 'matrix',
      name: 'm',
      entries: cells,
      options: { ...options, at: { kind: 'variable', name: 'seat' } },
    };
    const drawn = flatten(resolveNode(record, { variables: { seat: vec2(3, 0) } }));
    expect(sameMarks(drawn, flatten(matrix('m', cells, { ...options, at: vec2(3, 0) })), 1e-12)).toBe(true);
  });
});

describe('a table as a record', () => {
  it('reads back to the call it was written from', () => {
    const record: NodeRecord = { kind: 'table', name: 't', cells, options: tableOptions };
    expect(sameMarks(flatten(resolveNode(record, {})), flatten(table('t', cells, tableOptions)), 1e-12)).toBe(true);
  });

  it('keeps its rules and its header through the written form', () => {
    const record: NodeRecord = {
      kind: 'table',
      name: 't',
      cells,
      options: { ...tableOptions, header: true, rules: 'rows', align: ['start', 'end'] },
    };
    expect(flatten(resolveNode(record, {}))).toHaveLength(5);
  });
});

describe('a linear map as a record', () => {
  const shear: Transform2D = [1, 0, 0, 0.5, 1, 0, 0, 0, 1];
  const marks = flatten(matrix('m', cells, options));

  it('reads back to the call it was written from', () => {
    const record: AnimationRecord = { kind: 'applyMatrix', target: 'm', matrix: shear };
    expect(sameMarks(resolveAnimation(record, {})(marks, 0.4), applyMatrix('m', shear)(marks, 0.4), 1e-12)).toBe(true);
  });

  it('carries the pivot a record names', () => {
    const record: AnimationRecord = { kind: 'applyMatrix', target: 'm', matrix: mat3.scaling(vec2(2, 2)), options: { pivot: vec2(1, 1) } };
    const drawn = resolveAnimation(record, {})(marks, 1);
    expect(sameMarks(drawn, applyMatrix('m', mat3.scaling(vec2(2, 2)), { pivot: vec2(1, 1) })(marks, 1), 1e-12)).toBe(true);
  });
});

/** The rotation demo with a node and a span spliced in, so the checker reads the
 * three new kinds inside a figure it already takes. */
function carrying(node: NodeRecord, entry: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(turning)) as FigureRecord;
  const timeline = copy.timeline ?? { spans: [], duration: 1 };
  return {
    ...copy,
    scene: { kind: 'group', name: 'all', children: [copy.scene, node] },
    timeline: { ...timeline, spans: [...timeline.spans, { entry, from: 0, to: 1, curve: 'linear' }] },
  };
}

describe('the three kinds through the checker', () => {
  const node: NodeRecord = { kind: 'matrix', name: 'm', entries: cells, options };
  const entry: AnimationRecord = { kind: 'applyMatrix', target: 'm', matrix: mat3.IDENTITY };

  it('takes a figure carrying a matrix, a table and a linear map', () => {
    expect(checkFigure(JSON.parse(JSON.stringify(carrying(node, entry))))).toBeTruthy();
    const t: NodeRecord = { kind: 'table', name: 't', cells, options: tableOptions };
    expect(checkFigure(JSON.parse(JSON.stringify(carrying(t, entry))))).toBeTruthy();
  });

  it('refuses a matrix drawn with no stroke for its brackets, naming the path to it', () => {
    const without = { ...node, options: { ...options, stroke: undefined } } as unknown as NodeRecord;
    expect(() => checkFigure(JSON.parse(JSON.stringify(carrying(without, entry))))).toThrow(
      'options.stroke is required and is missing',
    );
  });

  it('refuses a map whose matrix is not nine numbers', () => {
    const short = { ...entry, matrix: [1, 0, 0, 0, 1, 0] };
    expect(() => checkFigure(JSON.parse(JSON.stringify(carrying(node, short))))).toThrow(
      'timeline.spans.2.entry.matrix is a list of 9 and holds 6',
    );
  });

  it('refuses rows of different lengths where the layout is worked out', () => {
    const ragged: NodeRecord = { kind: 'matrix', name: 'm', entries: [['a', 'b'], ['c']], options };
    expect(() => resolveNode(ragged, {})).toThrow('row 1 carries 1 entries and row 0 carries 2');
  });
});
