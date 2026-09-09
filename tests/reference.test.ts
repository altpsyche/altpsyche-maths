import { readFileSync, readdirSync } from 'node:fs';
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

const figureDirectory = path.join(root, 'figure');

/** One interface's body, from the brace after its name to the brace that closes
 * it, so a nested object type stays inside the body it belongs to. */
function bodiesOf(text: string): { name: string; body: string }[] {
  const found: { name: string; body: string }[] = [];
  const opener = /^export interface ([A-Za-z0-9_]+)[^{]*\{/gm;
  for (let match = opener.exec(text); match !== null; match = opener.exec(text)) {
    let depth = 1;
    let at = opener.lastIndex;
    while (at < text.length && depth > 0) {
      if (text[at] === '{') depth += 1;
      else if (text[at] === '}') depth -= 1;
      at += 1;
    }
    found.push({ name: match[1], body: text.slice(opener.lastIndex, at - 1) });
  }
  return found;
}

// A field is a name declared at the body's own depth, so the members of a nested
// object type are not read as fields of the interface holding it.
function fieldsOf(body: string): string[] {
  const names: string[] = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    const field = /^\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:/.exec(line);
    if (depth === 0 && field) names.push(field[1]);
    for (const character of line) {
      if (character === '{' || character === '(' || character === '[') depth += 1;
      if (character === '}' || character === ')' || character === ']') depth -= 1;
    }
  }
  return [...new Set(names)];
}

// An entry is its own line and the indented lines under it, which end at the
// first blank line, so a field named in a nested item counts as named.
const blocks = new Map<string, string>();
{
  let holding: string | undefined;
  for (const line of reference.split('\n')) {
    const opening = /^- `([A-Za-z_$][A-Za-z0-9_$]*)/.exec(line);
    if (opening) {
      holding = opening[1];
      blocks.set(holding, line);
      continue;
    }
    if (holding === undefined) continue;
    if (line.trim() === '') holding = undefined;
    else if (line.startsWith('  ')) blocks.set(holding, `${blocks.get(holding)}\n${line}`);
    else holding = undefined;
  }
}

const records = readdirSync(figureDirectory)
  .filter((name) => name.endsWith('.ts'))
  .flatMap((name) => bodiesOf(readFileSync(path.join(figureDirectory, name), 'utf8')))
  .filter(({ name }) => name.includes('Record'));

describe('the reference and the records', () => {
  it('reads every record interface the figure modules declare', () => {
    expect(records.length).toBeGreaterThan(60);
  });

  it('names every field of a record in its own entry, in backticks', () => {
    const absent = records.flatMap(({ name, body }) => {
      const entry = blocks.get(name);
      if (entry === undefined) return [`${name}: no entry`];
      const quoted = new Set([...entry.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
      const missing = fieldsOf(body).filter((field) => !quoted.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });
});
