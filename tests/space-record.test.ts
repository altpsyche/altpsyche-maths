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
  type SceneEntryRecord,
  type SpaceEntryRecord,
} from '../index.js';
import { EMBER, INK, MOSS } from '../demos/palette.js';
import {
  FRAMES,
  OVER,
  TEXT,
  alongAt,
  camera,
  sceneAt,
  written as surfaceWritten,
} from '../demos/surface.js';
import { camera as solidsCamera, written as solidsWritten } from '../demos/solids.js';
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

describe('the space nodes read back against their own calls', () => {
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
    const record: NodeRecord = { kind: 'scene3', name: 's', entries: [piece('minusX'), piece('plusX')], camera };
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

/**
 * One node of a demo's own tree, by the names that reach it.
 *
 * The five nodes below are held against what a committed figure draws rather
 * than against geometry written again here, since a second writing of a saddle
 * or a cylinder drifts from the demo's own without either side being wrong.
 */
type Named = NodeRecord | Exclude<SceneEntryRecord, SpaceEntryRecord>;

function nodeAt(node: Named, path: readonly string[]): Named {
  if (path.length === 0) return node;
  const inside: readonly Named[] =
    node.kind === 'group'
      ? node.children
      : node.kind === 'scene3'
        ? node.entries.map((entry) => ('node' in entry ? entry.node : entry))
        : [];
  const next = inside.find((child) => child.name === path[0]);
  if (!next) throw new Error(`nothing named ${path[0]} under this node`);
  return nodeAt(next, path.slice(1));
}

describe('a solid, a surface, a field and a curve written the short way', () => {
  const surfaceAt = { tracks: { turn: 0.3 } };
  const solidsAt = { tracks: { turn: 0.37 } };

  /** Both spellings of one node drawn and compared: the short one that makes its
   * own scene, and the scene a demo writes round the cells it names. Both run the
   * same arithmetic in the same process, so the tolerance the two are held at is
   * nothing. */
  const agree = (short: NodeRecord, long: NodeRecord, bindings: { tracks: { turn: number } }) => {
    const one = flatten(resolveNode(short, bindings));
    const two = flatten(resolveNode(long, bindings));
    return { marks: one.length, same: sameMarks(one, two, 0) };
  };

  const sceneOver = (item: SceneEntryRecord, seen: Camera3Record): NodeRecord => ({
    kind: 'scene3',
    name: 'one',
    camera: seen,
    entries: [item],
  });

  it('draws a cylinder where a scene over a cylinder`s own cells draws one', () => {
    const cells = nodeAt(solidsWritten.scene, ['can', 'body', 'skin']);
    if (cells.kind !== 'cylinderCells') throw new Error('the cylinder is not written as cells');
    const short: NodeRecord = { ...cells, kind: 'cylinder3', name: 'one', camera: solidsCamera };
    const held = agree(short, sceneOver({ ...cells, name: 'face' }, solidsCamera), solidsAt);
    expect(held.marks).toBe(300);
    expect(held.same).toBe(true);
  });

  it('draws a torus where a scene over a torus`s own cells draws one', () => {
    const cells = nodeAt(solidsWritten.scene, ['ring', 'body', 'skin']);
    if (cells.kind !== 'torusCells') throw new Error('the torus is not written as cells');
    const short: NodeRecord = { ...cells, kind: 'torus3', name: 'one', camera: solidsCamera };
    const held = agree(short, sceneOver({ ...cells, name: 'face' }, solidsCamera), solidsAt);
    expect(held.marks).toBe(324);
    expect(held.same).toBe(true);
  });

  it('draws a surface where a scene over that surface`s own cells draws one', () => {
    const cells = nodeAt(surfaceWritten.scene, ['body', 'hill']);
    if (cells.kind !== 'surfaceCells') throw new Error('the saddle is not written as cells');
    const short: NodeRecord = { ...cells, kind: 'surface3', name: 'one', camera: camera };
    const held = agree(short, sceneOver({ ...cells, name: 'cell' }, camera), surfaceAt);
    expect(held.marks).toBe(144);
    expect(held.same).toBe(true);
  });

  it('draws a field in space where a scene over that field`s own arrows draws one', () => {
    const arrows = nodeAt(surfaceWritten.scene, ['body', 'flow']);
    if (arrows.kind !== 'fieldArrows3') throw new Error('the flow is not written as arrows');
    const short: NodeRecord = { ...arrows, kind: 'vectorField3', name: 'one', camera: camera };
    const held = agree(short, sceneOver({ ...arrows, name: 'arrow' }, camera), surfaceAt);
    expect(held.marks).toBe(48);
    expect(held.same).toBe(true);
  });

  it('draws a curve in space through the places its own pieces are cut at', () => {
    const cut = nodeAt(solidsWritten.scene, ['can', 'body', 'coil']);
    if (cut.kind !== 'curvePieces3') throw new Error('the helix is not cut into pieces');
    const whole: NodeRecord = { kind: 'curve3', name: 'coil', curve: cut.curve, camera: solidsCamera, options: cut.options };
    const run = flatten(resolveNode(whole, solidsAt));
    expect(run).toHaveLength(1);
    if (run[0].kind !== 'path') throw new Error('a curve in space is one run');
    const drawn = [run[0].path[0].start, ...run[0].path[0].curves.map((curve) => curve.to)];
    expect(drawn).toHaveLength(97);

    // A scene sorts its pieces by depth, so a piece is read back by the place
    // along the run its own name carries rather than by where it was painted.
    const pieces = flatten(resolveNode(sceneOver(cut, solidsCamera), solidsAt))
      .map((mark) => ({ along: Number(mark.id.split('/')[2]), mark }))
      .sort((one, two) => one.along - two.along)
      .map(({ mark }) => {
        if (mark.kind !== 'path') throw new Error('a piece of a curve is one run');
        return mark.path[0];
      });
    expect(pieces).toHaveLength(drawn.length - 1);
    const walked = [pieces[0].start, ...pieces.map((piece) => piece.curves[piece.curves.length - 1].to)];
    let worst = 0;
    for (let step = 0; step < drawn.length; step += 1) {
      worst = Math.max(worst, Math.hypot(drawn[step].x - walked[step].x, drawn[step].y - walked[step].y));
    }
    expect(worst).toBe(0);
  });
});
