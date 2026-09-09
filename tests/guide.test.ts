import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The guide's examples against the tree.
 *
 * The reference is held to the door by name and the guide is held to it by
 * nothing, so an example calling a signature that changed reads as instruction
 * and compiles nowhere. This assembles every TypeScript block of the page in the
 * order it is written and type-checks the result.
 *
 * The blocks are one module rather than one module each, since a later block
 * uses what an earlier one declared: the notation block's four styles and its
 * path are what the rest are written against. So a name declared twice is a
 * defect of the guide rather than of this gate.
 *
 * The import lists are merged into one, because the page repeats a name in every
 * block that uses it and a module may import a name once. What is checked is the
 * code rather than the import line, so the specifier is rewritten to the tree
 * this repository holds.
 */
const root = path.resolve(import.meta.dirname, '..');
const guide = readFileSync(path.join(root, 'docs/GUIDE.md'), 'utf8');

/** Every TypeScript block of the page, each with the line of the page it starts
 * on, so a compiler reading the assembled module names a place in the guide. */
const blocks = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => ({
  source: match[1],
  at: guide.slice(0, match.index).split('\n').length,
}));

const IMPORT = /^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'@altpsyche\/maths';$/;

/** The blocks as one module: every import gathered into one pair of lists, and
 * everything else in the order the page writes it. */
function assembled(): { source: string; where: readonly { line: number; block: number; at: number }[] } {
  const values = new Set<string>();
  const types = new Set<string>();
  const body: string[] = [];
  const where: { line: number; block: number; at: number }[] = [];
  for (const [index, block] of blocks.entries()) {
    let offset = 0;
    for (const line of block.source.split('\n')) {
      offset += 1;
      const found = IMPORT.exec(line.trim());
      if (!found) {
        body.push(line);
        // Two import lines stand in front of the body, so a line of the module is
        // its place in the body and those two.
        where.push({ line: body.length + 2, block: index + 1, at: block.at + offset });
        continue;
      }
      const names = found[2].split(',').map((name) => name.trim()).filter(Boolean);
      for (const name of names) (found[1] ? types : values).add(name);
    }
  }
  const door = JSON.stringify(path.join(root, 'index.ts'));
  return {
    source: [
      `import { ${[...values].sort().join(', ')} } from ${door};`,
      `import type { ${[...types].sort().join(', ')} } from ${door};`,
      ...body,
    ].join('\n'),
    where,
  };
}

/** What the compiler said, with each line of the assembled module read back as
 * the block of the guide it came from and the line of the page it is written on.
 * A reader given `guide.ts(214,7)` has to count blocks to find it. */
function inTheGuide(said: string, where: readonly { line: number; block: number; at: number }[]): string {
  return said.replace(/guide\.ts\((\d+),(\d+)\)/g, (whole, line: string) => {
    const found = where.find((one) => one.line === Number(line));
    return found ? `GUIDE.md block ${found.block}, line ${found.at}` : whole;
  });
}

/** What the compiler says about the assembled module, as its own output with the
 * temporary path taken off the front of each line. */
function compile(source: string): string {
  const where = mkdtempSync(path.join(tmpdir(), 'guide-'));
  const file = path.join(where, 'guide.ts');
  writeFileSync(file, source);
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2022',
        '--skipLibCheck',
        '--allowImportingTsExtensions',
        file,
      ],
      { encoding: 'utf8', stdio: 'pipe' }
    );
    return '';
  } catch (thrown) {
    const said = thrown as { stdout?: string; stderr?: string };
    return `${said.stdout ?? ''}${said.stderr ?? ''}`.split(where).join('');
  }
}

describe('the guide and the tree', () => {
  it('writes its examples in TypeScript and nothing else', () => {
    expect(blocks).toHaveLength(30);
    expect(guide.match(/```/g)).toHaveLength(blocks.length * 2);
  });

  it('imports names the door holds, which is what the merged list is read from', () => {
    const { source } = assembled();
    expect(source).toContain('marksAt');
    expect(source.split('\n').filter((line) => line.startsWith('import'))).toHaveLength(2);
  });

  it('compiles every block in the order the page writes them', () => {
    const { source, where } = assembled();
    expect(inTheGuide(compile(source), where)).toBe('');
  }, 60_000);

  it('names the block and the line of the page a broken example is on', () => {
    const { source, where } = assembled();
    // The last line of the last block, made wrong where the page writes it.
    const lines = source.split('\n');
    const last = where[where.length - 1] as { line: number; block: number; at: number };
    lines[last.line - 1] = 'const wrong: number = vec2(0, 0);';
    const said = inTheGuide(compile(lines.join('\n')), where);
    expect(said).toContain(`GUIDE.md block ${last.block}, line ${last.at}`);
    expect(said).toContain("Type 'Vec2' is not assignable to type 'number'");
    expect(said).not.toContain('guide.ts(');
  }, 60_000);
});
