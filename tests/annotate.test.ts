import { describe, expect, it } from 'vitest';
import { arrow, at, callout, dot, flatten, fractionOf, group, matchingAspect, mat3, resolveExtent, vec2, viewMatrix } from '@altpsyche/maths';
import type { Mark, PathMark } from '@altpsyche/maths';

/**
 * The pieces an annotation is made of, and the placement that is safe over a
 * shader. Everything here is checked through the flat list rather than through
 * the tree, because the list is what a painter and a reader both see.
 */

const pen = { colour: '#fff', width: 0.1 };
const ink = { colour: '#fff' };
const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const paths = (marks: readonly Mark[]) => marks.filter((m): m is PathMark => m.kind === 'path');
const ends = (mark: PathMark) => mark.path[0].curves[mark.path[0].curves.length - 1].to;

describe('arrow', () => {
  const built = flatten(arrow('a', vec2(0, 0), vec2(10, 0), { stroke: pen }));

  it('is a shaft and a head, each with an id of its own', () => {
    expect(ids(built)).toEqual(['a/shaft', 'a/head']);
  });

  it('stops the shaft where the head begins, so a see-through head shows nothing under it', () => {
    expect(ends(paths(built)[0]).x).toBeCloseTo(10 - 0.4, 10);
  });

  it('points the head at the place the arrow was aimed', () => {
    expect(paths(built)[1].path[0].start).toEqual({ x: 10, y: 0 });
  });

  it('sizes the head against the shaft, so both scale together', () => {
    const fat = flatten(arrow('a', vec2(0, 0), vec2(10, 0), { stroke: { ...pen, width: 1 } }));
    expect(ends(paths(fat)[0]).x).toBeCloseTo(6, 10);
  });

  it('takes the shaft colour for the head unless told another', () => {
    expect(paths(built)[1].fill).toEqual({ colour: '#fff' });
    const two = flatten(arrow('a', vec2(0, 0), vec2(1, 0), { stroke: pen, fill: { colour: '#f00' } }));
    expect(paths(two)[1].fill).toEqual({ colour: '#f00' });
  });

  it('never draws a head longer than the arrow itself', () => {
    const stubby = flatten(arrow('a', vec2(0, 0), vec2(0.2, 0), { stroke: pen, head: 1 }));
    expect(ends(paths(stubby)[0]).x).toBeCloseTo(0, 10);
    expect(paths(stubby)[1].path[0].start).toEqual({ x: 0.2, y: 0 });
  });

  it('points whichever way it was aimed', () => {
    const up = flatten(arrow('a', vec2(0, 0), vec2(0, 10), { stroke: pen }));
    expect(paths(up)[1].path[0].start).toEqual({ x: 0, y: 10 });
    expect(ends(paths(up)[0]).y).toBeCloseTo(9.6, 10);
  });
});

describe('dot and callout', () => {
  it('is a disc where it was put', () => {
    const built = flatten(dot('d', vec2(3, 4), 1, ink));
    expect(ids(built)).toEqual(['d/disc']);
    expect(paths(built)[0].path[0].start).toEqual({ x: 4, y: 4 });
  });

  it('is a marker, a line out, and the word at the far end', () => {
    const built = flatten(callout('c', vec2(0, 0), vec2(5, 5), 'photon ring', { stroke: pen, fill: ink, size: 1 }));
    expect(ids(built)).toEqual(['c/marker', 'c/leader', 'c/word']);
    const word = built[2];
    expect(word.kind).toBe('text');
    if (word.kind === 'text') expect(word.at).toEqual({ x: 5, y: 5 });
  });

  it('leaves the marker off where a figure asked for none', () => {
    const built = flatten(callout('c', vec2(0, 0), vec2(5, 5), 'x', { stroke: pen, fill: ink, size: 1, marker: 0 }));
    expect(ids(built)).toEqual(['c/leader', 'c/word']);
  });
});

describe('placement over something else', () => {
  it('follows the shape of the surface, so there are no margins at any shape', () => {
    const extent = matchingAspect(2);
    expect(resolveExtent(extent, 16 / 9)).toEqual({ width: 2 * (16 / 9), height: 2 });
    expect(resolveExtent(extent, 9 / 16)).toEqual({ width: 2 * (9 / 16), height: 2 });
  });

  it('covers the surface exactly, at a wide shape and at a tall one', () => {
    for (const [width, height] of [[1920, 1080], [1080, 1920], [1080, 1080]]) {
      const extent = resolveExtent(matchingAspect(2), width / height);
      const view = viewMatrix(extent, 'contain', width, height);
      const corner = mat3.transformPoint(view, fractionOf(extent, 0, 0));
      const far = mat3.transformPoint(view, fractionOf(extent, 1, 1));
      expect(corner.x).toBeCloseTo(0, 6);
      expect(corner.y).toBeCloseTo(height, 6);
      expect(far.x).toBeCloseTo(width, 6);
      expect(far.y).toBeCloseTo(0, 6);
    }
  });

  it('reads a fraction with nothing at the bottom left', () => {
    const extent = { width: 10, height: 4 };
    expect(fractionOf(extent, 0, 0)).toEqual({ x: -5, y: -2 });
    expect(fractionOf(extent, 0.5, 0.5)).toEqual({ x: 0, y: 0 });
    expect(fractionOf(extent, 1, 1)).toEqual({ x: 5, y: 2 });
  });

  it('puts a callout at the same fraction of the frame whatever the frame is', () => {
    const marks = (width: number, height: number) => {
      const extent = resolveExtent(matchingAspect(2), width / height);
      const view = viewMatrix(extent, 'contain', width, height);
      const figure = {
        extent: matchingAspect(2),
        still: 0,
        scene: group('fig', [callout('ring', fractionOf(extent, 0.62, 0.55), fractionOf(extent, 0.85, 0.8), 'photon ring', { stroke: pen, fill: ink, size: 0.12 })]),
      };
      const word = at(figure, 0).find((mark) => mark.id === 'fig/ring/word');
      if (!word || word.kind !== 'text') throw new Error('no word');
      const point = mat3.transformPoint(view, word.at);
      return { across: point.x / width, up: point.y / height };
    };
    const wide = marks(1920, 1080);
    const tall = marks(1080, 1920);
    expect(wide.across).toBeCloseTo(tall.across, 6);
    expect(wide.up).toBeCloseTo(tall.up, 6);
    expect(wide.across).toBeCloseTo(0.85, 6);
  });
});
