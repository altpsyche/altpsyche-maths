// Vocabulary check: the banned nouns and the voice verbs CLAUDE.md names, counted in the comments
// of the published sources and in the prose of README.md, DESIGN.md and CLAUDE.md.
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const SOURCES = [
  'index.ts',
  ...['values', 'timing', 'figure', 'paint'].flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .sort()
      .map((name) => `${dir}/${name}`),
  ),
];
const PROSE = ['README.md', 'DESIGN.md', 'CLAUDE.md'];

// Alternation order matters: the longer phrase is tried first, so "drawn item" is not also an "item".
const BANNED = [
  ['noun', /\b(drawn items?|things?|items?)\b/gi],
  [
    'voice',
    /\b(hands back|handed back|hand back|gives back|given back|give back|comes back|come back|hands over|handed over|knows|wants|decides|sits in)\b/gi,
  ],
];
// Words the rule allows in one sense and bans in another, so they are counted for a reader to judge.
const BY_EYE = /\b(answers|says|holds|hold|held|carries|carry|carrying|carried)\b/gi;

// Comment ranges are collected from every token position, since the scanner attaches each
// comment to the token that follows or precedes it and the same range can be reached twice.
function commentText(path) {
  const text = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const ranges = new Map();
  const visit = (node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
    ])
      ranges.set(range.pos, range);
    ts.forEachChild(node, visit);
  };
  visit(file);
  visit(file.endOfFileToken);
  return [...ranges.values()].map((range) => ({
    line: file.getLineAndCharacterOfPosition(range.pos).line + 1,
    text: text.slice(range.pos, range.end),
  }));
}

// Code in backticks is a name rather than prose, and CLAUDE.md's Vocabulary section quotes the
// banned words in order to ban them, so both are blanked before counting.
function proseText(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  let fenced = false;
  let quoting = false;
  return lines.map((line, index) => {
    if (line.startsWith('```')) fenced = !fenced;
    if (path === 'CLAUDE.md' && line.startsWith('## ')) quoting = line === '## Vocabulary';
    const text = fenced || quoting ? '' : line.replace(/`[^`]*`/g, '');
    return { line: index + 1, text };
  });
}

const totals = { noun: 0, voice: 0 };
const eyeTotals = new Map();
const rows = [];
for (const [path, spans] of [
  ...SOURCES.map((path) => [path, commentText(path)]),
  ...PROSE.map((path) => [path, proseText(path)]),
]) {
  const counts = { noun: 0, voice: 0, eye: 0 };
  for (const span of spans) {
    for (const [kind, pattern] of BANNED) {
      for (const match of span.text.matchAll(pattern)) {
        const offset = span.text.slice(0, match.index).split('\n').length - 1;
        console.log(`${path}:${span.line + offset}: ${kind}: ${match[0]}`);
        counts[kind] += 1;
        totals[kind] += 1;
      }
    }
    for (const match of span.text.matchAll(BY_EYE)) {
      const word = match[0].toLowerCase();
      eyeTotals.set(word, (eyeTotals.get(word) ?? 0) + 1);
      counts.eye += 1;
    }
  }
  if (counts.noun + counts.voice + counts.eye > 0) rows.push([path, counts]);
}

console.log('\nfile  noun  voice  by-eye');
for (const [path, counts] of rows) console.log(`${path}  ${counts.noun}  ${counts.voice}  ${counts.eye}`);
console.log(
  `\n${SOURCES.length} sources and ${PROSE.length} prose files: ${totals.noun} banned nouns, ${totals.voice} banned voice patterns`,
);
console.log(
  'by eye: ' +
    [...eyeTotals]
      .sort()
      .map(([word, count]) => `${word} ${count}`)
      .join(', '),
);
