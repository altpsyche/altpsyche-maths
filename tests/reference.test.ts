import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The reference page against the door.
 *
 * The reference is the one surface that can go stale without anything breaking:
 * a name renamed at the door leaves an entry that describes nothing, and a name
 * added leaves a reader with no entry to find. This reads both and holds them
 * equal.
 */

const root = path.resolve(import.meta.dirname, '..');
const door = readFileSync(path.join(root, 'index.ts'), 'utf8');
const reference = readFileSync(path.join(root, 'docs/REFERENCE.md'), 'utf8');

// Every export at the door is a braced list, so one pattern reads the values and
// the types alike.
const exported = [...door.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap((match) =>
  match[1]
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);

// An entry opens a list item at the left margin with its name in backticks, and an
// indented item is a field of the entry above it and names nothing at the door.
const entries = [...reference.matchAll(/^- `([A-Za-z_$][A-Za-z0-9_$]*)/gm)].map((match) => match[1]);

describe('the reference and the door', () => {
  it('gives every name at the door an entry', () => {
    expect(entries.length).toBeGreaterThan(0);
    expect([...exported].filter((name) => !entries.includes(name))).toEqual([]);
  });

  it('names nothing the door does not export', () => {
    expect(entries.filter((name) => !exported.includes(name))).toEqual([]);
  });

  it('gives each name one entry rather than several', () => {
    expect(entries.filter((name, index) => entries.indexOf(name) !== index)).toEqual([]);
  });

  it('exports each name once, which is what makes the counts comparable', () => {
    expect(exported.filter((name, index) => exported.indexOf(name) !== index)).toEqual([]);
    expect(entries).toHaveLength(exported.length);
  });
});
