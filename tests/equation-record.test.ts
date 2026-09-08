import { describe, expect, it } from 'vitest';
import {
  equationFromTex,
  flatten,
  fractionOf,
  resolveNode,
  sameMarks,
  sampleTrack,
  vec2,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { INK } from '../demos/palette.js';
import { TIMES, frameAt, pointAt, sceneAt, walk } from '../demos/tangent.js';

const ink = { colour: INK };

/** The box the flat demo fits each of its two rules inside. */
const RULE_WIDTH = 1.2;
const RULE_HEIGHT = 0.6;

const atRest = await equationFromTex('\\frac{dy}{dx} = 0');
const moving = await equationFromTex('\\frac{dy}{dx} = 2x');

/** The flat demo's own marks under one name at a time, from its tree, with the
 * figure's own prefix taken off so a record built alone compares against them. */
const under = (seconds: number, id: string): readonly Mark[] =>
  flatten(sceneAt(sampleTrack(walk, seconds) as number))
    .filter((mark) => mark.id === id || mark.id.startsWith(`${id}/`))
    .map((mark) => ({ ...mark, id: mark.id.slice('tangent/equation/'.length) }));

const record = (name: string, equation: typeof atRest): NodeRecord => ({
  kind: 'equationNode',
  name,
  equation,
  options: {
    at: { kind: 'variable', name: 'corner' },
    align: 'start',
    width: RULE_WIDTH,
    height: RULE_HEIGHT,
    fill: ink,
  },
});

/** Where the flat demo hangs both rules at a time, which is a fraction of the
 * frame its view has moved to. */
const corner = (seconds: number) => fractionOf(frameAt(pointAt(seconds)), 0.02, 0.825);

const NAMED = Object.values(TIMES);

describe('the equation node as a record', () => {
  it('draws both of the flat demo rules glyph for glyph at each of its seven named times', () => {
    expect(NAMED).toHaveLength(7);
    for (const seconds of NAMED) {
      const bindings = { variables: { corner: corner(seconds) } };
      for (const [name, equation] of [
        ['at-rest', atRest],
        ['moving', moving],
      ] as const) {
        const theirs = under(seconds, `tangent/equation/${name}`);
        expect(theirs.length).toBeGreaterThan(0);
        expect(sameMarks(flatten(resolveNode(record(name, equation), bindings)), theirs)).toBe(true);
      }
    }
  });

  it('draws the two rules as the glyph counts the typesetter gave them', () => {
    expect(atRest.marks).toHaveLength(7);
    expect(moving.marks).toHaveLength(8);
    expect(flatten(resolveNode(record('at-rest', atRest), { variables: { corner: vec2(0, 0) } }))).toHaveLength(7);
  });

  it('moves both rules with the frame, which is what says the place is not fixed', () => {
    const one = { variables: { corner: corner(NAMED[0]) } };
    const two = { variables: { corner: corner(NAMED[4]) } };
    expect(sameMarks(flatten(resolveNode(record('moving', moving), one)), flatten(resolveNode(record('moving', moving), two)))).toBe(
      false
    );
  });

  it('carries the equation as geometry rather than as the TeX it came from', () => {
    // A figure carries what the typesetter produced, so a renderer draws the
    // expression without MathJax and two machines draw the same glyphs.
    const written = JSON.stringify(atRest);
    expect(written).not.toContain('frac');
    expect(written.length).toBe(32936);
    expect(JSON.stringify(moving).length).toBe(42224);
    expect(JSON.parse(written).marks).toHaveLength(7);
  });

  it('refuses a place that reads as a number', () => {
    expect(() =>
      resolveNode({
        kind: 'equationNode',
        name: 'r',
        equation: atRest,
        options: { at: 3, width: RULE_WIDTH, height: RULE_HEIGHT, fill: ink },
      })
    ).toThrow("an equation's place is a point and was given a number");
  });
});
