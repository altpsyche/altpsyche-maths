import { describe, expect, it } from 'vitest';
import {
  arrow,
  callout,
  flatten,
  pointOf,
  resolveNode,
  sameMarks,
  sampleTrack,
  vec2,
  type Expression,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { DEEP, INK } from '../demos/palette.js';
import {
  RISE,
  RISE_DEPTH,
  TEXT,
  TIMES,
  coords,
  pointAt,
  sceneAt,
  walk,
} from '../demos/tangent.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.02 };

const NAMED = Object.values(TIMES);

/** The flat demo's own marks at a time, taken from its tree, since a figure
 * outlines a tapered stroke after its timeline has run. */
const treeAt = (seconds: number): readonly Mark[] => flatten(sceneAt(sampleTrack(walk, seconds) as number));

const under = (marks: readonly Mark[], id: string): readonly Mark[] =>
  marks.filter((mark) => mark.id === id || mark.id.startsWith(`${id}/`));

/** A record resolved and flattened under the name the demo gives it. */
const drawnFrom = (record: NodeRecord, seconds?: number): readonly Mark[] =>
  flatten(
    resolveNode(record, seconds === undefined ? {} : { variables: { at: pointAt(seconds) } })
  );

describe('the annotation nodes as records', () => {
  it('draws the flat demo walking dot at each of its seven named times', () => {
    expect(NAMED).toHaveLength(7);
    const record: NodeRecord = {
      kind: 'dot',
      name: 'point',
      at: { kind: 'variable', name: 'at' },
      radius: 0.08,
      fill: ink,
    };
    for (const seconds of NAMED) {
      const theirs = under(treeAt(seconds), 'tangent/point').map((mark) => ({ ...mark, id: mark.id.slice('tangent/'.length) }));
      expect(theirs).toHaveLength(1);
      expect(sameMarks(drawnFrom(record, seconds), theirs)).toBe(true);
    }
  });

  it('moves the dot where the track moves it, which is what says the reading is not fixed', () => {
    const record: NodeRecord = {
      kind: 'dot',
      name: 'point',
      at: { kind: 'variable', name: 'at' },
      radius: 0.08,
      fill: ink,
    };
    expect(sameMarks(drawnFrom(record, NAMED[0]), drawnFrom(record, NAMED[4]))).toBe(false);
  });

  it('draws the flat demo brace with its word from a template', () => {
    const record: NodeRecord = {
      kind: 'brace',
      name: 'rise',
      from: pointOf(coords, 3, RISE),
      to: pointOf(coords, 3, 0),
      content: { template: '{0}', holes: [{ value: RISE, precision: 0.01 }] },
      options: { depth: RISE_DEPTH, padding: 0.28, stroke: pen, fill: ink, size: TEXT.tick },
    };
    const theirs = under(treeAt(NAMED[6]), 'tangent/rise').map((mark) => ({
      ...mark,
      id: mark.id.slice('tangent/'.length),
    }));
    expect(theirs).toHaveLength(2);
    expect(sameMarks(drawnFrom(record), theirs)).toBe(true);
  });

  it('writes the brace word as the demo writes it', () => {
    const word = under(treeAt(NAMED[6]), 'tangent/rise').find((mark) => mark.id.endsWith('/word'));
    expect(word?.kind === 'text' && word.text).toBe('9.00');
  });
});

describe('an arrow and a callout, which no demo draws', () => {
  const from = vec2(-1, 0.5);
  const to = vec2(2, 1.5);
  const stroke = { colour: DEEP, width: 0.03 };

  it('draws an arrow where its own call draws one', () => {
    const record: NodeRecord = { kind: 'arrow', name: 'a', from, to, options: { stroke } };
    expect(sameMarks(flatten(resolveNode(record)), flatten(arrow('a', from, to, { stroke })))).toBe(true);
  });

  it('carries an arrow head and spread through to the call', () => {
    const options = { stroke, head: 0.4, spread: 0.9, fill: { colour: INK } };
    const record: NodeRecord = { kind: 'arrow', name: 'a', from, to, options };
    expect(sameMarks(flatten(resolveNode(record)), flatten(arrow('a', from, to, options)))).toBe(true);
    const bare: NodeRecord = { kind: 'arrow', name: 'a', from, to, options: { stroke } };
    expect(sameMarks(flatten(resolveNode(record)), flatten(resolveNode(bare)))).toBe(false);
  });

  it('draws a callout where its own call draws one, marker and all', () => {
    const options = { stroke, fill: { colour: INK }, size: 0.3, marker: 0.06 };
    const record: NodeRecord = { kind: 'callout', name: 'c', at: from, to, content: 'here', options };
    expect(sameMarks(flatten(resolveNode(record)), flatten(callout('c', from, to, 'here', options)))).toBe(true);
  });

  it('leaves out a callout marker of nothing, which is what a moving thing wants', () => {
    const options = { stroke, fill: { colour: INK }, size: 0.3, marker: 0 };
    const record: NodeRecord = { kind: 'callout', name: 'c', at: from, to, content: 'here', options };
    expect(flatten(resolveNode(record))).toHaveLength(2);
  });

  it('follows a track through an arrow and a callout', () => {
    const moving: Expression = { kind: 'point', x: { kind: 'track', name: 'x' }, y: 0 };
    const record: NodeRecord = { kind: 'arrow', name: 'a', from, to: moving, options: { stroke } };
    const one = flatten(resolveNode(record, { tracks: { x: 1 } }));
    const two = flatten(resolveNode(record, { tracks: { x: 4 } }));
    expect(sameMarks(one, two)).toBe(false);
  });
});

describe('an annotation record given the wrong kind of value', () => {
  it('is refused with a sentence naming what was asked for', () => {
    expect(() => resolveNode({ kind: 'dot', name: 'd', at: 3, radius: 1, fill: ink })).toThrow(
      "a dot's place is a point and was given a number"
    );
    expect(() =>
      resolveNode({ kind: 'dot', name: 'd', at: vec2(0, 0), radius: vec2(1, 1), fill: ink })
    ).toThrow("a dot's radius is a number and was given a point");
  });

  it('refuses a kind the vocabulary has no entry for', () => {
    expect(() => resolveNode({ kind: 'halo', name: 'h' } as unknown as NodeRecord)).toThrow(
      'a node has no kind called halo'
    );
  });
});
