import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { typesetElement } from '@altpsyche/maths';
import type { EquationElement } from '@altpsyche/maths';

/**
 * The typesetter, held to two things: that it answers with the tree the walk
 * over it takes, and that a consumer who never asks for one never loads it.
 *
 * The second is read off the source rather than off a running process, because
 * the claim is about what a static import graph reaches and a test that has
 * already imported the door cannot see that any more.
 */

const source = readFileSync(path.resolve(import.meta.dirname, '../figure/typeset.ts'), 'utf8');

function find(element: EquationElement, tag: string): EquationElement | undefined {
  if (element.tag === tag) return element;
  for (const child of element.children) {
    const found = find(child, tag);
    if (found) return found;
  }
  return undefined;
}

describe('typesetElement', () => {
  it('answers with the svg the typesetter wrote', async () => {
    const svg = find(await typesetElement('x'), 'svg');
    expect(svg).toBeDefined();
    expect(svg!.attributes.viewBox).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
  });

  it('draws every glyph as its own outline rather than a reference to one', async () => {
    // What `fontCache: 'none'` buys. Cached, the second x is a `use` element
    // pointing at the first, and a reference is not geometry anything can read.
    const root = await typesetElement('x + x');
    const paths: EquationElement[] = [];
    const walk = (element: EquationElement) => {
      if (element.tag === 'path') paths.push(element);
      element.children.forEach(walk);
    };
    walk(root);
    expect(paths.length).toBeGreaterThanOrEqual(3);
    expect(paths.every((each) => typeof each.attributes.d === 'string')).toBe(true);
    expect(find(root, 'use')).toBeUndefined();
  });

  it('carries the packages that stop an ordinary macro being an error', async () => {
    // `\lVert` is in `AllPackages` and nowhere else, so a tree with no error on
    // it is the reading that says the packages arrived.
    const root = await typesetElement('\\lVert v \\rVert = 1');
    const errors: string[] = [];
    const walk = (element: EquationElement) => {
      const error = element.attributes['data-mjx-error'];
      if (error !== undefined) errors.push(error);
      element.children.forEach(walk);
    };
    walk(root);
    expect(errors).toEqual([]);
  });

  it('reads the same expression the same way twice', async () => {
    expect(await typesetElement('a^2')).toEqual(await typesetElement('a^2'));
  });
});

describe('the load that does not happen', () => {
  it('names mathjax at the top of the file for its types alone', async () => {
    // A value import at the top would put 41 MB of CommonJS in the graph of
    // every consumer that draws a figure and typesets nothing.
    const top = source.split('\n').filter((line) => line.startsWith('import'));
    const named = top.filter((line) => line.includes("'mathjax-full/"));
    expect(named.length).toBeGreaterThan(0);
    expect(named.every((line) => line.startsWith('import type '))).toBe(true);
  });

  it('reaches mathjax by an import written as a call', async () => {
    expect(source).toMatch(/await Promise\.all\(\[[\s\S]*import\('mathjax-full\//);
  });
});
