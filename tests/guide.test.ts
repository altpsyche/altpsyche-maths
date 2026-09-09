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

const blocks = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]);

const IMPORT = /^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'@altpsyche\/maths';$/;

/** The blocks as one module: every import gathered into one pair of lists, and
 * everything else in the order the page writes it. */
function assembled(): string {
  const values = new Set<string>();
  const types = new Set<string>();
  const body: string[] = [];
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      const found = IMPORT.exec(line.trim());
      if (!found) {
        body.push(line);
        continue;
      }
      const names = found[2].split(',').map((name) => name.trim()).filter(Boolean);
      for (const name of names) (found[1] ? types : values).add(name);
    }
  }
  const door = JSON.stringify(path.join(root, 'index.ts'));
  return [
    `import { ${[...values].sort().join(', ')} } from ${door};`,
    `import type { ${[...types].sort().join(', ')} } from ${door};`,
    ...body,
  ].join('\n');
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
    expect(blocks).toHaveLength(23);
    expect(guide.match(/```/g)).toHaveLength(blocks.length * 2);
  });

  it('imports names the door holds, which is what the merged list is read from', () => {
    const source = assembled();
    expect(source).toContain('marksAt');
    expect(source.split('\n').filter((line) => line.startsWith('import'))).toHaveLength(2);
  });

  it('compiles every block in the order the page writes them', () => {
    expect(compile(assembled())).toBe('');
  }, 60_000);

  it('reports the block a broken example is in, rather than passing it', () => {
    const broken = `${assembled()}\nconst wrong: number = vec2(0, 0);\n`;
    expect(compile(broken)).toContain("Type 'Vec2' is not assignable to type 'number'");
  }, 60_000);
});
