import { describe, expect, it } from 'vitest';
import {
  arrow3,
  dot3,
  flatten,
  interval,
  resolveNode,
  sameMarks,
  scene3,
  text3,
  vec2,
  vec3,
  type Camera3Record,
  type Expression,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { EMBER, INK, MOSS } from '../demos/palette.js';
import { FRAMES, OVER, TEXT, alongAt, camera, sceneAt } from '../demos/surface.js';
import { descents, eyeAt, section } from './solid-forms.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.014 };
const cut = { colour: EMBER, width: 0.05 };
const fall = { colour: MOSS, width: { from: 0.035, to: 0 } };

/** The solid demo's own marks under one name at a time, from its tree. */
const theirs = (seconds: number, id: string): readonly Mark[] =>
  flatten(sceneAt(alongAt(seconds)))
    .filter((mark) => mark.id === id || mark.id.startsWith(`${id}/`))
    .map((mark) => ({ ...mark, id: mark.id.slice('solid/'.length) }));

const mine = (record: NodeRecord, seconds: number): readonly Mark[] =>
  flatten(resolveNode(record, { tracks: { turn: alongAt(seconds) } }));

describe('the space nodes as records', () => {
  it('draws the solid demo twenty-two marks of axes at each of the four times its strip draws', () => {
    expect(FRAMES).toHaveLength(4);
    // Three lines, three tips, three names and their ticks with the numbers on
    // them, which is what the demo's own record resolves to.
    for (const seconds of FRAMES) expect(theirs(seconds, 'solid/axes')).toHaveLength(22);
  });

  it('draws the solid demo three runs of descent and its crossing curve', () => {
    for (const seconds of FRAMES) {
      const runs: NodeRecord = {
        kind: 'group',
        name: 'descent',
        children: descents.map((run, at) => ({
          kind: 'polyline3' as const,
          name: `run${at}`,
          points: run,
          camera,
          options: { stroke: fall },
        })),
      };
      expect(descents).toHaveLength(3);
      expect(sameMarks(mine(runs, seconds), theirs(seconds, 'solid/descent'))).toBe(true);

      const crossing: NodeRecord = {
        kind: 'group',
        name: 'cut',
        children: section.map((run, at) => ({
          kind: 'polyline3' as const,
          name: `run${at}`,
          points: run,
          camera,
          options: { stroke: cut },
        })),
        style: { opacity: 1 },
      };
      expect(sameMarks(mine(crossing, seconds), theirs(seconds, 'solid/cut'))).toBe(true);
    }
  });

  it('turns the axes as the orbit turns', () => {
    const record: NodeRecord = { kind: 'axes3', name: 'axes', camera, options: { x: OVER, stroke: pen } };
    expect(sameMarks(mine(record, FRAMES[0]), mine(record, FRAMES[2]))).toBe(false);
  });
});

describe('the space nodes no demo names directly', () => {
  const built = eyeAt(0.3);
  const at = { tracks: { turn: 0.3 } };

  it('draws a dot in space where its own call draws one', () => {
    const record: NodeRecord = { kind: 'dot3', name: 'd', at: vec3(0.4, -0.7, 0.2), radius: 0.06, fill: ink, camera };
    expect(sameMarks(flatten(resolveNode(record, at)), flatten(dot3('d', vec3(0.4, -0.7, 0.2), 0.06, ink, built)))).toBe(true);
  });

  it('leaves out a dot the eye cannot see', () => {
    // Six times the eye's own place, which is behind the eye and on the far side
    // of it from what the camera is looking at.
    const past = vec3(built.eye.x * 6, built.eye.y * 6, built.eye.z * 6);
    const behind: NodeRecord = { kind: 'dot3', name: 'd', at: past, radius: 0.06, fill: ink, camera };
    expect(flatten(dot3('d', past, 0.06, ink, built))).toHaveLength(0);
    expect(flatten(resolveNode(behind, at))).toHaveLength(0);
  });

  it('draws a label in space, with its offset, where its own call draws one', () => {
    const options = { fill: ink, size: 0.2, offset: vec2(0.1, -0.05), align: 'middle' as const };
    const record: NodeRecord = {
      kind: 'text3',
      name: 't',
      at: vec3(0.2, 0.9, 0.5),
      content: 'z',
      size: 0.2,
      camera,
      options,
    };
    expect(
      sameMarks(flatten(resolveNode(record, at)), flatten(text3('t', vec3(0.2, 0.9, 0.5), 'z', 0.2, built, options)))
    ).toBe(true);
  });

  it('writes a label in space from a template', () => {
    const record: NodeRecord = {
      kind: 'text3',
      name: 't',
      at: vec3(0, 0, 0),
      content: { template: 'z = {0}', holes: [{ value: { kind: 'track', name: 'turn' }, precision: 0.01 }] },
      size: 0.2,
      camera,
      options: { fill: ink },
    };
    const mark = flatten(resolveNode(record, at))[0];
    expect(mark.kind === 'text' && mark.text).toBe('z = 0.30');
  });

  it('draws an arrow in space where its own call draws one', () => {
    const options = { stroke: pen, head: 0.13 };
    const record: NodeRecord = { kind: 'arrow3', name: 'a', from: vec3(0, 0, 0), to: vec3(1, 1, 0.5), camera, options };
    expect(
      sameMarks(flatten(resolveNode(record, at)), flatten(arrow3('a', vec3(0, 0, 0), vec3(1, 1, 0.5), built, options)))
    ).toBe(true);
  });

  it('sorts a scene by the mean depth of each piece rather than by the tree', () => {
    const place = { plusX: vec3(1.2, 0, 0), minusX: vec3(-1.2, 0, 0) };
    const piece = (name: 'plusX' | 'minusX') => ({
      points: [place[name]],
      node: { kind: 'dot3' as const, name, at: place[name], radius: 0.1, fill: ink, camera },
    });
    const record: NodeRecord = { kind: 'scene3', name: 's', items: [piece('minusX'), piece('plusX')], camera };
    const drawn = flatten(resolveNode(record, at));
    // The eye stands on the negative x side of this orbit, so the piece at
    // positive x is the further of the two and is drawn first.
    expect(drawn.map((mark) => mark.id)).toEqual(['s/plusX/disc', 's/minusX/disc']);
    const called = flatten(
      scene3(
        's',
        [
          { points: [place.minusX], node: dot3('minusX', place.minusX, 0.1, ink, built) },
          { points: [place.plusX], node: dot3('plusX', place.plusX, 0.1, ink, built) },
        ],
        built
      )
    );
    expect(sameMarks(drawn, called)).toBe(true);
  });

  it('refuses a place in space whose z reads as a point', () => {
    const record: NodeRecord = {
      kind: 'dot3',
      name: 'd',
      at: { x: 0, y: 0, z: { kind: 'point', x: 1, y: 1 } },
      radius: 0.1,
      fill: ink,
      camera,
    };
    expect(() => resolveNode(record, at)).toThrow("the z of a dot's place in space is a number and was given a point");
  });
});
