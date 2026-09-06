import { describe, expect, it } from 'vitest';
import { circle, flatten, group, line, mat3, shape, text, vec2 } from '@altpsyche/maths';
import type { Mark, PathMark, TextMark } from '@altpsyche/maths';

/**
 * The tree turning into the list. What the list has to carry is an id that does
 * not move between frames, geometry with every transform already in it, and a
 * style with nothing left to inherit.
 */

const red = { colour: '#f00' };
const pen = { colour: '#00f', width: 2 };
const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const paths = (marks: readonly Mark[]) => marks.filter((mark): mark is PathMark => mark.kind === 'path');
const texts = (marks: readonly Mark[]) => marks.filter((mark): mark is TextMark => mark.kind === 'text');

describe('ids', () => {
  it('joins the names on the way down', () => {
    const tree = group('axes', [shape('x', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })]);
    expect(ids(flatten(tree))).toEqual(['axes/x']);
  });

  it('nests as deep as the tree goes', () => {
    const tree = group('figure', [group('axes', [shape('x', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })])]);
    expect(ids(flatten(tree))).toEqual(['figure/axes/x']);
  });

  it('numbers a repeated name rather than merging two marks into one', () => {
    const tick = () => shape('tick', line(vec2(0, 0), vec2(0, 1)), { stroke: pen });
    expect(ids(flatten(group('axis', [tick(), tick(), tick()])))).toEqual(['axis/tick', 'axis/tick#2', 'axis/tick#3']);
  });

  it('gives the same tree the same ids every time', () => {
    const build = () => group('a', [shape('p', line(vec2(0, 0), vec2(1, 1)), { stroke: pen }), shape('p', line(vec2(0, 0), vec2(2, 2)), { stroke: pen })]);
    expect(ids(flatten(build()))).toEqual(ids(flatten(build())));
  });
});

describe('style', () => {
  it('hands a group style down to a child that set none', () => {
    const tree = group('g', [shape('s', circle(vec2(0, 0), 1))], { style: { fill: red } });
    expect(paths(flatten(tree))[0].fill).toEqual(red);
  });

  it('lets a child override what the group handed down', () => {
    const own = { colour: '#0f0' };
    const tree = group('g', [shape('s', circle(vec2(0, 0), 1), { fill: own })], { style: { fill: red } });
    expect(paths(flatten(tree))[0].fill).toEqual(own);
  });

  it('multiplies opacity down rather than replacing it', () => {
    const tree = group('g', [shape('s', circle(vec2(0, 0), 1), { fill: red, opacity: 0.5 })], { style: { opacity: 0.5 } });
    expect(paths(flatten(tree))[0].opacity).toBeCloseTo(0.25, 10);
  });

  it('leaves out a shape with nothing to draw it with', () => {
    expect(flatten(group('g', [shape('s', circle(vec2(0, 0), 1))]))).toEqual([]);
    expect(flatten(group('g', [text('t', vec2(0, 0), 'hello', 1)]))).toEqual([]);
  });
});

describe('transforms', () => {
  it('bakes the transform into the geometry', () => {
    const tree = group('g', [shape('s', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })], {
      transform: mat3.translation(vec2(5, 5)),
    });
    expect(paths(flatten(tree))[0].path[0].start).toEqual({ x: 5, y: 5 });
  });

  it('multiplies nested transforms outermost first', () => {
    const tree = group('outer', [group('inner', [shape('s', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })], { transform: mat3.translation(vec2(1, 0)) })], {
      transform: mat3.scaling(vec2(10, 10)),
    });
    expect(paths(flatten(tree))[0].path[0].start).toEqual({ x: 10, y: 0 });
  });

  it('thickens a line inside a group that scales', () => {
    const tree = group('g', [shape('s', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })], { transform: mat3.scaling(vec2(3, 3)) });
    expect(paths(flatten(tree))[0].stroke?.width).toBeCloseTo(6, 10);
  });

  it('grows text inside a group that scales, and moves where it sits', () => {
    const tree = group('g', [text('t', vec2(1, 0), 'x', 2, { fill: red })], { transform: mat3.scaling(vec2(4, 4)) });
    const mark = texts(flatten(tree))[0];
    expect(mark.size).toBeCloseTo(8, 10);
    expect(mark.at).toEqual({ x: 4, y: 0 });
  });

  it('leaves a line its own width where nothing scales', () => {
    const tree = group('g', [shape('s', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })], { transform: mat3.rotation(0.9) });
    expect(paths(flatten(tree))[0].stroke?.width).toBeCloseTo(2, 10);
  });
});

describe('text marks', () => {
  it('falls back to a family both painters know', () => {
    expect(texts(flatten(group('g', [text('t', vec2(0, 0), 'x', 1, { fill: red })])))[0].family).toBe('sans-serif');
  });

  it('takes a family from the group above it', () => {
    const tree = group('g', [text('t', vec2(0, 0), 'x', 1)], { style: { fill: red, family: 'serif' } });
    expect(texts(flatten(tree))[0].family).toBe('serif');
  });
});
