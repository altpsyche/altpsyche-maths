import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURVE_NAMES, EXPRESSION_FUNCTIONS, FIGURE_FORMAT_VERSION } from '../index.js';

/**
 * The specification against the format it specifies.
 *
 * A renderer in another language is written from that document and never from
 * this tree, so a field that changes shape here and not there is a renderer
 * drawing a picture nothing says is wrong. This holds the value types, the
 * expression form and the callable vocabulary to it, name by name.
 */

const root = path.resolve(import.meta.dirname, '..');
const specification = readFileSync(path.join(root, 'docs/SPECIFICATION.md'), 'utf8');

/** The document cut at its headings, each section holding the prose under one
 * heading and above the next of the same depth or shallower. */
function sections(text: string): Map<string, string> {
  const found = new Map<string, string>();
  let holding: string | undefined;
  let body: string[] = [];
  for (const line of text.split('\n')) {
    const heading = /^#{2,4} (.+)$/.exec(line);
    if (heading) {
      if (holding !== undefined) found.set(holding, body.join('\n'));
      // Keyed on the whole heading rather than its first word, since several of
      // them begin with the same one.
      holding = heading[1].replaceAll('`', '').trim();
      body = [];
      continue;
    }
    body.push(line);
  }
  if (holding !== undefined) found.set(holding, body.join('\n'));
  return found;
}

const written = sections(specification);
const quoted = (text: string) => new Set([...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
const everywhere = quoted(specification);

// One interface's body, from the brace after its name to the brace that closes
// it, and the names declared at that body's own depth.
function fieldsOf(file: string, name: string): string[] {
  const text = readFileSync(path.join(root, file), 'utf8');
  const opener = new RegExp(`^export (?:interface|type) ${name}\\b[^{]*\\{`, 'm');
  const found = opener.exec(text);
  if (!found) throw new Error(`${name} is not declared in ${file}`);
  let depth = 1;
  let at = (found.index ?? 0) + found[0].length;
  const from = at;
  while (at < text.length && depth > 0) {
    if (text[at] === '{') depth += 1;
    else if (text[at] === '}') depth -= 1;
    at += 1;
  }
  const names: string[] = [];
  let inside = 0;
  for (const line of text.slice(from, at - 1).split('\n')) {
    const field = /^\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:/.exec(line);
    if (inside === 0 && field) names.push(field[1]);
    for (const character of line) {
      if (character === '{' || character === '(' || character === '[') inside += 1;
      if (character === '}' || character === ')' || character === ']') inside -= 1;
    }
  }
  return [...new Set(names)];
}

/** Which section of the document each value type's fields have to be named in.
 * A colour, a stroke, a fill and a taper are all under `Style`, since a style is
 * where a figure reaches them. */
const VALUE_TYPES: { name: string; file: string; section: string }[] = [
  { name: 'Interval', file: 'values/interval.ts', section: 'Interval' },
  { name: 'Scale', file: 'figure/scale.ts', section: 'Scale' },
  { name: 'Coords', file: 'figure/scale.ts', section: 'Coords' },
  { name: 'Extent', file: 'figure/extent.ts', section: 'Extent' },
  { name: 'Bounds', file: 'figure/bounds.ts', section: 'Bounds' },
  { name: 'Style', file: 'figure/node.ts', section: 'Style' },
  { name: 'Stroke', file: 'figure/mark.ts', section: 'Style' },
  { name: 'Fill', file: 'figure/mark.ts', section: 'Style' },
  { name: 'Stop', file: 'figure/mark.ts', section: 'Style' },
  { name: 'Taper', file: 'figure/mark.ts', section: 'Style' },
  { name: 'Colour', file: 'values/colour.ts', section: 'Style' },
  { name: 'Rgba', file: 'values/colour.ts', section: 'Style' },
  { name: 'Camera3Record', file: 'figure/camera-record.ts', section: 'Camera3Choice' },
  { name: 'Equation', file: 'figure/equation.ts', section: 'Equation' },
  { name: 'Key', file: 'timing/track.ts', section: 'Track' },
  { name: 'Inset', file: 'figure/inset.ts', section: 'Inset' },
];

describe('the specification and the value types', () => {
  it('gives each value type a section of its own', () => {
    const missing = [...new Set(VALUE_TYPES.map(({ section }) => section))].filter((name) => !written.has(name));
    expect(missing).toEqual([]);
  });

  it('names every field of every value type in the section that carries it', () => {
    const absent = VALUE_TYPES.flatMap(({ name, file, section }) => {
      const inside = quoted(written.get(section) ?? '');
      const missing = fieldsOf(file, name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name} in ${section}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });
});

/** Each form of a union whose members carry a `kind`, as the kind and the fields
 * declared beside it. A member naming several kinds at once is one form. */
function formsOf(file: string, name: string): { kinds: string[]; fields: string[] }[] {
  const text = readFileSync(path.join(root, file), 'utf8');
  const from = text.indexOf(`export type ${name} =`);
  if (from < 0) throw new Error(`${name} is not declared in ${file}`);
  const union = text.slice(from, text.indexOf('\n\n', from));
  return union
    .split(/\n\s*\|/)
    .slice(1)
    .map((member) => ({
      kinds: [...member.matchAll(/'([a-zA-Z0-9]+)'/g)].map((match) => match[1]),
      fields: [...member.matchAll(/readonly ([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:/g)]
        .map((match) => match[1])
        .filter((field) => field !== 'kind'),
    }));
}

describe('the specification and the paths', () => {
  it('names every form of path with its fields', () => {
    const forms = formsOf('figure/path-record.ts', 'PathRecord');
    expect(forms).toHaveLength(16);
    const inside = quoted(written.get('The paths') ?? '');
    const absent = forms.flatMap(({ kinds, fields }) => {
      const missing = [...kinds, ...fields].filter((each) => !inside.has(each));
      return missing.length === 0 ? [] : [`${kinds.join(' | ')}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names both point producers and every field each carries', () => {
    const absent = [
      { name: 'SectionRecord', file: 'figure/node-record.ts', section: 'The section of a surface' },
      { name: 'PlaneRecord', file: 'figure/node-record.ts', section: 'The section of a surface' },
      { name: 'SectionOptions', file: 'figure/section.ts', section: 'The section of a surface' },
      { name: 'StreamlineRecord', file: 'figure/node-record.ts', section: 'The streamline of a field' },
      { name: 'StreamlineOptions', file: 'figure/streamline.ts', section: 'The streamline of a field' },
    ].flatMap(({ name, file, section }) => {
      const inside = quoted(written.get(section) ?? '');
      const missing = fieldsOf(file, name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });
});

/** Every member of a union of named interfaces, as the interface names. */
function membersOf(file: string, name: string): string[] {
  const text = readFileSync(path.join(root, file), 'utf8');
  const from = text.indexOf(`export type ${name} =`);
  if (from < 0) throw new Error(`${name} is not declared in ${file}`);
  return text
    .slice(from, text.indexOf(';', from))
    .split('|')
    .slice(1)
    .map((member) => member.trim())
    .filter((member) => /^[A-Za-z0-9_]+$/.test(member));
}

/** What a node section is allowed to name a field in: the tables and prose of
 * the nodes, which is three sections and the producers' own. */
const nodeProse = [
  'The nodes',
  'The tree\'s own three',
  'The flat builders',
  'The space builders',
  'The two item producers',
]
  .map((heading) => written.get(heading) ?? '')
  .join('\n');

describe('the specification and the nodes', () => {
  it('names every node kind and its fields', () => {
    const kinds = membersOf('figure/node-record.ts', 'NodeRecord');
    expect(kinds).toHaveLength(28);
    const inside = quoted(nodeProse);
    const absent = kinds.flatMap((name) => {
      const missing = fieldsOf('figure/node-record.ts', name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names every field of every options record a node carries', () => {
    const inside = quoted(nodeProse);
    const absent = [
      { name: 'ArrowRecordOptions', file: 'figure/node-record.ts' },
      { name: 'BraceRecordOptions', file: 'figure/node-record.ts' },
      { name: 'CalloutRecordOptions', file: 'figure/node-record.ts' },
      { name: 'BarsRecordOptions', file: 'figure/node-record.ts' },
      { name: 'EquationRecordOptions', file: 'figure/node-record.ts' },
      { name: 'FieldRecordOptions', file: 'figure/node-record.ts' },
      { name: 'Field3RecordOptions', file: 'figure/node-record.ts' },
      { name: 'Surface3RecordOptions', file: 'figure/node-record.ts' },
      { name: 'ShadeRecord', file: 'figure/node-record.ts' },
      { name: 'SpaceItemRecord', file: 'figure/node-record.ts' },
      { name: 'TextTemplate', file: 'figure/node-record.ts' },
      { name: 'TextHole', file: 'figure/node-record.ts' },
      { name: 'Point3Record', file: 'figure/camera-record.ts' },
      { name: 'NumberLineOptions', file: 'figure/axis.ts' },
      { name: 'NumberPlaneOptions', file: 'figure/axis.ts' },
      { name: 'Axes3Options', file: 'figure/axis3.ts' },
    ].flatMap(({ name, file }) => {
      const missing = fieldsOf(file, name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names every item producer, which are entries of a scene rather than nodes', () => {
    const inside = quoted(written.get('The seven item producers') ?? '');
    const producers = membersOf('figure/node-record.ts', 'SceneItemRecord').filter((name) => name !== 'SpaceItemRecord');
    expect(producers).toHaveLength(7);
    for (const name of ['surfaceCells', 'fieldArrows3', 'sphereCells', 'cubeCells', 'cylinderCells', 'torusCells', 'curvePieces3']) {
      expect(inside.has(name), name).toBe(true);
    }
  });
});

describe('the specification and the timeline', () => {
  it('names every animation kind and its fields', () => {
    const kinds = membersOf('figure/animation-record.ts', 'AnimationRecord');
    expect(kinds).toHaveLength(15);
    const inside = quoted(written.get('The animations') ?? '');
    const absent = kinds.flatMap((name) => {
      const missing = fieldsOf('figure/animation-record.ts', name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names every field of every options record an animation carries', () => {
    const inside = quoted(written.get('The animations') ?? '');
    const absent = [
      { name: 'AboutOptions', file: 'figure/animation.ts' },
      { name: 'ScaleOptions', file: 'figure/animation.ts' },
      { name: 'IndicateOptions', file: 'figure/animation.ts' },
      { name: 'FlashOptions', file: 'figure/animation.ts' },
      { name: 'CircumscribeOptions', file: 'figure/animation.ts' },
    ].flatMap(({ name, file }) => {
      const missing = fieldsOf(file, name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names the timeline and a span with their fields', () => {
    const inside = quoted(written.get('The timeline') ?? '');
    const absent = ['TimelineRecord', 'SpanRecord'].flatMap((name) => {
      const missing = fieldsOf('figure/timeline-record.ts', name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect(absent).toEqual([]);
  });

  it('names all three view changes and both extent choices with their fields', () => {
    const inside = quoted(written.get('The extent and the view') ?? '');
    const absent = [
      'MoveViewRecord',
      'FollowViewRecord',
      'FrameViewRecord',
      'ByAspectRecord',
      'MatchingAspectRecord',
    ].flatMap((name) => {
      const missing = fieldsOf('figure/view-record.ts', name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    const options = ['FollowOptions', 'FrameOptions'].flatMap((name) => {
      const missing = fieldsOf('figure/view.ts', name).filter((field) => !inside.has(field));
      return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
    });
    expect([...absent, ...options]).toEqual([]);
  });

  it('names every field a figure itself carries', () => {
    const inside = quoted(written.get('The figure') ?? '');
    expect(fieldsOf('figure/figure-record.ts', 'FigureRecord').filter((field) => !inside.has(field))).toEqual([]);
  });
});

/** The numbers a reader takes at their word, since no code reads a sentence. */
const WRITTEN = new Map([
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fifteen', 15],
  ['sixteen', 16],
  ['twenty-three', 23],
  ['twenty-eight', 28],
  ['thirty-seven', 37],
]);

/** The number a sentence writes for one vocabulary, taken from the first phrase
 * whose word is a number rather than from the first phrase that matches, since
 * "the value types" reads before "eleven value types" does. */
const counted = (text: string, what: RegExp): number | undefined => {
  for (const found of text.matchAll(what)) {
    const written = WRITTEN.get(found[1].toLowerCase());
    if (written !== undefined) return written;
  }
  return undefined;
};

describe('the specification and the counts it writes in words', () => {
  it('counts each vocabulary as the source counts it', () => {
    const kinds = (file: string, name: string) => membersOf(file, name).length;
    const expressionKinds = (() => {
      const source = readFileSync(path.join(root, 'figure/expression.ts'), 'utf8');
      const from = source.indexOf('export type Expression =');
      const union = source.slice(from, source.indexOf('\n\n', from));
      return new Set([...union.matchAll(/kind: '([a-z0-9]+)'/g)].map((match) => match[1])).size;
    })();
    const wrong = [
      ['node kinds', counted(specification, /([a-z-]+) node kinds/gi), kinds('figure/node-record.ts', 'NodeRecord')],
      [
        'animation kinds',
        counted(specification, /([a-z-]+) animation kinds/gi),
        kinds('figure/animation-record.ts', 'AnimationRecord'),
      ],
      ['value types', counted(specification, /([a-z-]+) value types/gi), 11],
      [
        'functions',
        counted(specification, /([a-z-]+) functions an expression/gi),
        EXPRESSION_FUNCTIONS.length,
      ],
      ['path forms', counted(specification, /([a-z-]+) forms of path/gi), 16],
      ['expression kinds', counted(specification, /there are ([a-z-]+)/gi), expressionKinds],
    ].filter(([, written, real]) => written !== real);
    expect(wrong).toEqual([]);
  });
});

describe('the specification as one document', () => {
  it('names nothing as still to be specified', () => {
    expect(specification).not.toMatch(/has to be specified|is not written|still a list/);
  });

  it('reaches the plan once, as the reasoning behind it rather than as its inventory', () => {
    // A specification a renderer cannot read without a second document is a
    // specification with a hole in it.
    expect([...specification.matchAll(/FIGURE-FORMAT\.md/g)]).toHaveLength(2);
  });

  it('names each committed figure as a fixture, with the bytes it holds', () => {
    const inside = written.get('The fixtures') ?? '';
    for (const name of ['tangent', 'surface', 'boolean', 'rotate', 'frame', 'portrait', 'solids']) {
      const file = `demos/${name}.figure.json`;
      expect(inside, file).toContain(file);
      const bytes = statSync(path.join(root, file)).size.toLocaleString('en-US');
      expect(inside, `${file} is ${bytes} bytes`).toContain(bytes);
    }
  });

  it('holds the format version to the one the reader carries', () => {
    expect(specification).toContain(`version ${FIGURE_FORMAT_VERSION}`);
  });
});

describe('the specification and the expression form', () => {
  it('names every kind an expression may carry', () => {
    const source = readFileSync(path.join(root, 'figure/expression.ts'), 'utf8');
    const from = source.indexOf('export type Expression =');
    // The declaration ends at the blank line after it, since its own members
    // carry semicolons of their own.
    const union = source.slice(from, source.indexOf('\n\n', from));
    const kinds = [...new Set([...union.matchAll(/kind: '([a-z0-9]+)'/g)].map((match) => match[1]))];
    expect(kinds.length).toBeGreaterThan(9);
    expect(kinds.filter((kind) => !everywhere.has(kind))).toEqual([]);
  });

  it('names every function an expression may call', () => {
    expect(EXPRESSION_FUNCTIONS.filter((name) => ![...everywhere].some((each) => each.startsWith(name)))).toEqual([]);
  });

  it('names every curve a figure may name', () => {
    expect(CURVE_NAMES.filter((name) => !everywhere.has(name))).toEqual([]);
  });
});
