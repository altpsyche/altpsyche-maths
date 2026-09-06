import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The line through this package, held by a test rather than by a promise.
 *
 * Values and timing change almost never; figures and painters change constantly.
 * The two halves are worth splitting into separate packages the day that
 * difference costs something, and a split is only mechanical while nothing below
 * the line reaches above it.
 */

const ROOT = resolve(import.meta.dirname, '..');
const BELOW = ['values', 'timing'];
const ABOVE = ['figure', 'paint'];

function sources(directory: string): string[] {
  const full = join(ROOT, directory);
  let entries: string[];
  try {
    entries = readdirSync(full);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(full, entry);
    if (statSync(path).isDirectory()) return sources(join(directory, entry));
    return entry.endsWith('.ts') ? [join(directory, entry)] : [];
  });
}

describe('the line through the package', () => {
  it('has nothing below it reaching above it', () => {
    const crossings: string[] = [];
    for (const directory of BELOW) {
      for (const file of sources(directory)) {
        const text = readFileSync(join(ROOT, file), 'utf8');
        for (const half of ABOVE) {
          if (text.includes(`../${half}/`)) crossings.push(`${file} names ${half}`);
        }
      }
    }
    expect(crossings).toEqual([]);
  });

  it('is reading files that exist, so a passing run means something', () => {
    expect(sources('values').length).toBeGreaterThan(0);
    expect(sources('timing').length).toBeGreaterThan(0);
    expect(sources('figure').length).toBeGreaterThan(0);
  });
});
