import { describe, expect, it } from 'vitest';
import { CURVE_NAMES, checkFigure, type FigureRecord } from '../index.js';
import { operations, turning } from './figures.js';

/** The record with one field somewhere inside it replaced, so a refusal is
 * measured against a figure that is otherwise whole. */
function withField(record: FigureRecord, path: readonly string[], value: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  let held = copy as Record<string, unknown>;
  for (const name of path.slice(0, -1)) held = held[name] as Record<string, unknown>;
  held[path[path.length - 1]] = value;
  return copy;
}

const CAMERA = { eye: { x: 3, y: 3, z: 3 }, target: { x: 0, y: 0, z: 0 } };
const SCALE = { graph: { from: 0, to: 1 }, units: { from: 0, to: 1 } };
const COORDS = { x: SCALE, y: SCALE };
const FILL = { colour: '#101010' };
const STROKE = { colour: '#101010', width: 0.02 };
const PLACE = { x: 0, y: 0 };
const SPOT = { x: 0, y: 0, z: 0 };

/** One node of every kind the vocabulary carries, each with the fields it
 * requires and nothing more, which is what says the table describes all of them
 * rather than the ones two demos happen to draw. */
const EVERY_KIND: readonly Record<string, unknown>[] = [
  { kind: 'shape', name: 'shape', path: { kind: 'circle', centre: PLACE, radius: 1 } },
  { kind: 'text', name: 'word', at: PLACE, content: 'a word', size: 0.2 },
  { kind: 'group', name: 'group', children: [] },
  { kind: 'dot', name: 'dot', at: PLACE, radius: 0.1, fill: FILL },
  { kind: 'arrow', name: 'arrow', from: PLACE, to: { x: 1, y: 1 }, options: { stroke: STROKE } },
  {
    kind: 'brace',
    name: 'brace',
    from: PLACE,
    to: { x: 1, y: 0 },
    content: 'over',
    options: { stroke: STROKE, fill: FILL, size: 0.2, depth: 0.3 },
  },
  {
    kind: 'callout',
    name: 'callout',
    at: PLACE,
    to: { x: 1, y: 1 },
    content: 'here',
    options: { stroke: STROKE, fill: FILL, size: 0.2 },
  },
  { kind: 'numberLine', name: 'line', scale: SCALE, options: { stroke: STROKE } },
  { kind: 'axes', name: 'axes', coords: COORDS, options: { stroke: STROKE } },
  { kind: 'numberPlane', name: 'plane', coords: COORDS, options: { stroke: STROKE } },
  { kind: 'riemannBars', name: 'bars', coords: COORDS, of: 1 },
  {
    kind: 'equationNode',
    name: 'equation',
    equation: { marks: [], box: { x: 0, y: 0, width: 1, height: 1 } },
    options: { at: PLACE, width: 1, height: 1, fill: FILL },
  },
  {
    kind: 'vectorField',
    name: 'field',
    coords: COORDS,
    of: { x: 1, y: 1 },
    options: { lengthOf: 0.2, colourFor: '#101010', width: 0.02 },
  },
  { kind: 'polyline3', name: 'run', points: [SPOT, { x: 1, y: 1, z: 1 }], camera: CAMERA },
  { kind: 'dot3', name: 'spot', at: SPOT, radius: 0.1, fill: FILL, camera: CAMERA },
  { kind: 'text3', name: 'label', at: SPOT, content: 'z', size: 0.2, camera: CAMERA },
  { kind: 'arrow3', name: 'vector', from: SPOT, to: { x: 1, y: 0, z: 0 }, camera: CAMERA, options: { stroke: STROKE } },
  { kind: 'scene3', name: 'scene', items: [], camera: CAMERA },
  { kind: 'axes3', name: 'frame', camera: CAMERA, options: { stroke: STROKE } },
  {
    kind: 'surface3',
    name: 'surface',
    of: SPOT,
    camera: CAMERA,
    options: { shade: { ramp: [FILL] } },
  },
  {
    kind: 'vectorField3',
    name: 'flow',
    of: SPOT,
    camera: CAMERA,
    options: { lengthOf: 0.2, colourFor: '#101010', stroke: STROKE },
  },
  {
    kind: 'section3',
    name: 'section',
    curve: { of: SPOT, plane: { point: SPOT, normal: { x: 0, y: 0, z: 1 } } },
    camera: CAMERA,
  },
  {
    kind: 'streamline3',
    name: 'streams',
    runs: [{ of: { x: 1, y: 1 }, from: PLACE, options: { step: 0.1 } }],
    on: SPOT,
    camera: CAMERA,
  },
];

/** Every form a path is written in, each with the fields it requires. */
const EVERY_PATH: readonly Record<string, unknown>[] = [
  { kind: 'line', from: PLACE, to: { x: 1, y: 1 } },
  { kind: 'polyline', points: [PLACE, { x: 1, y: 1 }] },
  { kind: 'polygon', points: [PLACE, { x: 1, y: 0 }, { x: 1, y: 1 }] },
  { kind: 'rect', corner: PLACE, width: 1, height: 1 },
  { kind: 'circle', centre: PLACE, radius: 1 },
  { kind: 'arc', centre: PLACE, radius: 1, from: 0, to: 1 },
  { kind: 'plot', coords: COORDS, of: { kind: 'variable', name: 'x' } },
  { kind: 'areaUnder', coords: COORDS, curve: { kind: 'plot', coords: COORDS, of: 1 } },
  { kind: 'tangentAt', coords: COORDS, curve: { kind: 'plot', coords: COORDS, of: 1 }, x: 0.5 },
  { kind: 'bracePath', from: PLACE, to: { x: 1, y: 0 }, depth: 0.2 },
  { kind: 'data', d: 'M 0 0 L 1 1' },
  { kind: 'cubics', subpaths: [{ start: PLACE, curves: [{ control1: PLACE, control2: PLACE, to: PLACE }], closed: false }] },
  { kind: 'union', first: { kind: 'circle', centre: PLACE, radius: 1 }, second: { kind: 'circle', centre: PLACE, radius: 0.5 } },
];

/** One entry of every kind a span may carry: the fifteen animations and the
 * three view moves, which are one list because a timeline holds both. */
const EVERY_ENTRY: readonly Record<string, unknown>[] = [
  { kind: 'fadeIn', target: 'turns' },
  { kind: 'fadeOut', target: 'turns' },
  { kind: 'fadeTo', target: 'turns', opacity: 0.4 },
  { kind: 'draw', target: 'turns' },
  { kind: 'moveBy', target: 'turns', offset: { x: 1, y: 0 } },
  { kind: 'moveAlong', target: 'turns', path: { kind: 'line', from: PLACE, to: { x: 1, y: 1 } } },
  { kind: 'rotate', target: 'turns', angle: 1, options: { pivot: PLACE } },
  { kind: 'scale', target: 'turns', to: 2, options: { pivot: PLACE, from: 1 } },
  { kind: 'growFrom', target: 'turns', from: PLACE },
  { kind: 'morph', target: 'turns', into: { kind: 'circle', centre: PLACE, radius: 1 } },
  { kind: 'morphEquation', from: 'first', to: 'second' },
  { kind: 'indicate', target: 'turns', options: { factor: 1.2, colour: '#101010', pivot: PLACE } },
  { kind: 'flash', target: 'turns', options: { stroke: STROKE, at: PLACE, rays: 8, reach: 1, inner: 0.4 } },
  { kind: 'circumscribe', target: 'turns', options: { stroke: STROKE, around: 'ellipse', padding: 0.1 } },
  { kind: 'countTo', target: 'turns', from: 0, to: 10, precision: 0.01 },
  { kind: 'moveView', to: { width: 8, height: 4, centre: PLACE } },
  { kind: 'followView', target: 'turns/own/pivot', options: { within: 0.5, room: 2 } },
  { kind: 'frameView', targets: ['turns/own', 'turns/given'], options: { padding: 0.2 } },
];

describe('a figure held to the vocabulary', () => {
  it('takes both demos as they stand', () => {
    expect(checkFigure(JSON.parse(JSON.stringify(turning)))).toBeTruthy();
    expect(checkFigure(JSON.parse(JSON.stringify(operations)))).toBeTruthy();
  });

  it('hands back the value it was given rather than a copy', () => {
    const held = JSON.parse(JSON.stringify(turning));
    expect(checkFigure(held)).toBe(held);
  });

  it('names every curve of the closed set, and refuses one outside it', () => {
    expect(CURVE_NAMES).toEqual(['easeIn', 'easeOut', 'linear', 'overshoot', 'smoothstep', 'thereAndBack']);
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'curve'], 'bounce'))).toThrow(
      'timeline.spans.0.curve is the name of a curve, one of easeIn, easeOut, linear, overshoot, smoothstep, thereAndBack, and is the text "bounce"',
    );
  });

  it('refuses a required field that is missing, with its path', () => {
    const { still, ...rest } = turning;
    expect(still).toBe(0.75);
    expect(() => checkFigure(rest)).toThrow('still is required and is missing');
    expect(() => checkFigure(withField(turning, ['extent', 'width'], undefined))).toThrow(
      'extent.width is required and is missing',
    );
  });

  it('refuses a field of the wrong type, with its path', () => {
    expect(() => checkFigure(withField(turning, ['still'], 'soon'))).toThrow(
      'still is a number and is the text "soon"',
    );
    expect(() => checkFigure(withField(turning, ['loop'], 1))).toThrow('loop is a true or false and is 1');
    expect(() => checkFigure(withField(turning, ['extent'], []))).toThrow('extent is an extent and is a list');
  });

  it('refuses a field the kind does not carry', () => {
    expect(() => checkFigure(withField(turning, ['wobble'], 1))).toThrow('wobble is not a field of a figure');
    expect(() => checkFigure(withField(turning, ['extent', 'depth'], 1))).toThrow(
      'extent.depth is not a field of an extent',
    );
  });

  it('refuses an extent choice with a kind the format has no form for', () => {
    expect(() => checkFigure(withField(turning, ['extent'], { kind: 'byMood', wide: {} }))).toThrow(
      'extent is an extent and has no kind called the text "byMood"',
    );
  });

  it('takes both extent choices and refuses one of them short of a field', () => {
    const extent = { width: 8, height: 4 };
    expect(checkFigure({ ...turning, extent: { kind: 'byAspect', wide: extent, square: extent, tall: extent } })).toBeTruthy();
    expect(checkFigure({ ...turning, extent: { kind: 'matchingAspect', height: 4 } })).toBeTruthy();
    expect(() => checkFigure({ ...turning, extent: { kind: 'byAspect', wide: extent, square: extent } })).toThrow(
      'extent.tall is required and is missing',
    );
  });

  it('holds a track to its keys and refuses a value a key cannot carry', () => {
    expect(() => checkFigure(withField(operations, ['tracks', 'apart', '0', 'time'], 'late'))).toThrow(
      'tracks.apart.0.time is a number and is the text "late"',
    );
    expect(() => checkFigure(withField(operations, ['tracks', 'apart', '0', 'value'], {}))).toThrow(
      "tracks.apart.0.value is a track's value and is an object",
    );
  });

  it('holds a span to its own fields, and its entry to being one', () => {
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'from'], 'soon'))).toThrow(
      'timeline.spans.0.from is a number and is the text "soon"',
    );
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'entry'], 4))).toThrow(
      'timeline.spans.0.entry is a timeline entry and is 4',
    );
    expect(() => checkFigure(withField(turning, ['timeline', 'spans'], {}))).toThrow(
      'timeline.spans is a list and is an object',
    );
  });

  it('holds an inset to its rectangle, its fit and what it hides', () => {
    const inset = {
      shows: { width: 2, height: 1 },
      into: { x: { from: 1, to: 3 }, y: { from: 1, to: 2 } },
      name: 'panel',
      hides: ['turns/own/pivot'],
    };
    expect(checkFigure({ ...turning, insets: [inset] })).toBeTruthy();
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, into: { x: { from: 1 }, y: inset.into.y } }] })).toThrow(
      'insets.0.into.x.to is required and is missing',
    );
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, fit: 'crop' }] })).toThrow(
      'insets.0.fit is a fit, one of contain, cover, and is the text "crop"',
    );
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, hides: 'turns/own/pivot' }] })).toThrow(
      'insets.0.hides is a list and is the text "turns/own/pivot"',
    );
  });

  it('holds the scene to being a node', () => {
    expect(() => checkFigure(withField(turning, ['scene'], 'a shape'))).toThrow(
      'scene is a node and is the text "a shape"',
    );
    expect(() => checkFigure(withField(turning, ['scene'], { kind: 'wobble' }))).toThrow(
      'scene is a node and has no kind called the text "wobble"',
    );
  });

  it('names the child a bad kind sits in, by its index', () => {
    const scene = JSON.parse(JSON.stringify(turning.scene));
    scene.children[1].children[0] = { kind: 'wobble', name: 'ell' };
    expect(() => checkFigure({ ...turning, scene })).toThrow(
      'scene.children.1.children.0 is a node and has no kind called the text "wobble"',
    );
  });

  it('takes one node of every kind of the vocabulary', () => {
    expect(EVERY_KIND).toHaveLength(23);
    expect(checkFigure({ ...turning, scene: { kind: 'group', name: 'all', children: EVERY_KIND } })).toBeTruthy();
  });

  it('refuses each kind short of the name every node carries', () => {
    EVERY_KIND.forEach((node, at) => {
      const children = EVERY_KIND.map((held, index) =>
        index === at ? Object.fromEntries(Object.entries(held).filter(([field]) => field !== 'name')) : held,
      );
      expect(() => checkFigure({ ...turning, scene: { kind: 'group', name: 'all', children } })).toThrow(
        `scene.children.${at}.name is required and is missing`,
      );
    });
  });

  it('takes every optional field the table describes, dressed in full', () => {
    // A field the table names wrongly would be refused as one the kind does not
    // carry, so passing every optional field is what holds the transcription to
    // the records themselves.
    const dressed: readonly Record<string, unknown>[] = [
      {
        kind: 'text',
        name: 'word',
        at: PLACE,
        content: { template: 'slope {0}', holes: [{ value: { kind: 'track', name: 'apart' }, precision: 0.01 }] },
        size: 0.2,
        options: {
          fill: FILL,
          stroke: STROKE,
          opacity: 0.5,
          family: 'serif',
          weight: 600,
          clip: { x: { from: 0, to: 1 }, y: { from: 0, to: 1 } },
          align: 'middle',
          baseline: 'hanging',
          leading: 1.2,
        },
      },
      {
        kind: 'numberLine',
        name: 'line',
        scale: SCALE,
        options: {
          stroke: STROKE,
          fill: FILL,
          size: 0.2,
          at: 0,
          direction: 'across',
          ticks: 1,
          tickLength: 0.1,
          gap: 0.05,
          tip: 0.2,
          spread: 0.6,
          family: 'serif',
          weight: 400,
          skipZero: true,
          crossedAt: 0,
        },
      },
      {
        kind: 'numberPlane',
        name: 'grid',
        coords: COORDS,
        options: { stroke: STROKE, minors: 4, minorOpacity: 0.4, minorWidth: 0.01, ticks: 1 },
      },
      {
        kind: 'riemannBars',
        name: 'bars',
        coords: COORDS,
        of: 1,
        options: {
          fill: FILL,
          stroke: STROKE,
          bars: 8,
          over: { from: 0, to: { kind: 'track', name: 'apart' } },
          height: 'middle',
          baseline: 0,
        },
      },
      {
        kind: 'vectorField',
        name: 'field',
        coords: COORDS,
        of: { x: 1, y: 1 },
        options: {
          lengthOf: { kind: 'variable', name: 'magnitude' },
          colourFor: { kind: 'bands', first: '#101010', then: [{ above: 2, colour: '#202020' }] },
          width: 0.02,
          resolution: { x: 8, y: 6 },
          over: { x: { from: 0, to: 1 }, y: { from: 0, to: 1 } },
          head: 0.1,
          spread: 0.6,
        },
      },
      {
        kind: 'surface3',
        name: 'surface',
        of: SPOT,
        camera: { ...CAMERA, up: { x: 0, y: 0, z: 1 }, projection: { kind: 'perspective', fov: 0.8, near: 0.1, far: 20 } },
        options: {
          shade: { ramp: [FILL, { colour: '#202020', gradient: { from: PLACE, to: { x: 1, y: 1 }, stops: [{ offset: 0, colour: '#101010' }] } }], band: { from: 0.2, to: 0.9 } },
          light: { x: 0, y: 0, z: 1 },
          over: { u: { from: 0, to: 1 }, v: { from: 0, to: 1 } },
          resolution: { u: 8, v: 8 },
          cull: true,
          stroke: STROKE,
        },
      },
      {
        kind: 'axes3',
        name: 'frame',
        camera: { ...CAMERA, projection: { kind: 'orthographic', height: 4 } },
        options: {
          stroke: STROKE,
          fill: FILL,
          x: { from: -1, to: 1 },
          y: { from: -1, to: 1 },
          z: { from: -1, to: 1 },
          size: 0.2,
          ticks: 1,
          tickLength: 0.1,
          gap: 0.05,
          names: { x: 'x', y: 'y', z: 'z' },
          family: 'serif',
          weight: 400,
        },
      },
      {
        kind: 'scene3',
        name: 'pieces',
        camera: CAMERA,
        items: [
          { points: [SPOT], node: { kind: 'dot', name: 'spot', at: PLACE, radius: 0.1, fill: FILL } },
          { kind: 'surfaceCells', name: 'cells', of: SPOT, options: { shade: { ramp: [FILL] }, resolution: 6 } },
          {
            kind: 'fieldArrows3',
            name: 'arrows',
            of: SPOT,
            options: { lengthOf: 0.2, colourFor: '#101010', stroke: STROKE, resolution: 4, head: 0.1, spread: 0.6, fill: FILL },
          },
        ],
      },
      {
        kind: 'section3',
        name: 'section',
        curve: {
          of: SPOT,
          plane: { point: SPOT, normal: { x: 0, y: 0, z: 1 } },
          options: { over: { u: { from: 0, to: 1 } }, resolution: 12, tolerance: 1e-9 },
        },
        camera: CAMERA,
        options: { close: true, stroke: STROKE },
        style: { stroke: STROKE },
      },
      {
        kind: 'streamline3',
        name: 'streams',
        runs: [
          {
            of: { x: 1, y: 1 },
            from: PLACE,
            options: {
              step: 0.1,
              steps: 40,
              within: { x: { from: 0, to: 1 }, y: { from: 0, to: 1 } },
              direction: 'both',
              least: 1e-6,
            },
          },
        ],
        on: SPOT,
        camera: CAMERA,
        options: { close: false },
        style: { opacity: 0.8 },
      },
      {
        kind: 'text3',
        name: 'label',
        at: SPOT,
        content: 'z',
        size: 0.2,
        camera: CAMERA,
        options: { offset: { x: 0.1, y: 0.1 }, align: 'end', fill: FILL },
      },
      {
        kind: 'arrow',
        name: 'arrow',
        from: PLACE,
        to: { x: 1, y: 1 },
        options: { stroke: STROKE, fill: FILL, head: 0.2, spread: 0.6 },
      },
      {
        kind: 'brace',
        name: 'brace',
        from: PLACE,
        to: { x: 1, y: 0 },
        content: 'over',
        options: {
          stroke: STROKE,
          fill: FILL,
          size: 0.2,
          depth: 0.3,
          curl: 0.4,
          padding: 0.05,
          align: 'start',
          baseline: 'middle',
          family: 'serif',
          weight: 400,
        },
      },
      {
        kind: 'callout',
        name: 'callout',
        at: PLACE,
        to: { x: 1, y: 1 },
        content: 'here',
        options: {
          stroke: STROKE,
          fill: FILL,
          size: 0.2,
          marker: 0.06,
          align: 'end',
          baseline: 'alphabetic',
          family: 'serif',
          weight: 400,
        },
      },
      {
        kind: 'equationNode',
        name: 'equation',
        equation: {
          marks: [
            {
              kind: 'path',
              id: 'glyph',
              path: [{ start: PLACE, curves: [{ control1: PLACE, control2: PLACE, to: PLACE }], closed: true }],
              fill: FILL,
              opacity: 0.9,
            },
          ],
          box: { x: 0, y: 0, width: 1, height: 1 },
        },
        options: { at: PLACE, align: 'middle', width: 1, height: 1, fill: FILL },
      },
    ];
    expect(
      checkFigure({
        ...turning,
        tracks: { apart: [{ time: 0, value: 0 }] },
        scene: { kind: 'group', name: 'dressed', children: dressed },
      }),
    ).toBeTruthy();
  });

  it('takes a path of every form and refuses one the format has none for', () => {
    expect(EVERY_PATH).toHaveLength(13);
    const children = EVERY_PATH.map((path, at) => ({ kind: 'shape', name: `p${at}`, path }));
    expect(checkFigure({ ...turning, scene: { kind: 'group', name: 'paths', children } })).toBeTruthy();
    expect(() =>
      checkFigure({
        ...turning,
        scene: { kind: 'group', name: 'paths', children: [{ kind: 'shape', name: 'p', path: { kind: 'squiggle' } }] },
      }),
    ).toThrow('scene.children.0.path is a path and has no kind called the text "squiggle"');
  });

  it('holds a path parameter to the expression form, by path', () => {
    const scene = {
      kind: 'group',
      name: 'paths',
      children: [{ kind: 'shape', name: 'disc', path: { kind: 'circle', centre: { x: 0, y: 0 }, radius: 'wide' } }],
    };
    expect(() => checkFigure({ ...turning, scene })).toThrow(
      'scene.children.0.path.radius is an expression and is the text "wide"',
    );
  });

  it('holds an expression to the form, down through the tree it sits in', () => {
    const walking = ['scene', 'children', '0', 'children', '0', 'path', 'second', 'centre'];
    expect(() => checkFigure(withField(operations, [...walking, 'x', 'operator'], '^'))).toThrow(
      'scene.children.0.children.0.path.second.centre.x.operator is an operator, one of +, -, *, /, and is the text "^"',
    );
  });

  it('takes a bare number, a true or false and a place as an expression', () => {
    const at = ['scene', 'children', '0', 'children', '0', 'path', 'second', 'radius'];
    for (const held of [0.4, true, { x: 1, y: 2 }]) {
      expect(checkFigure(withField(operations, at, held))).toBeTruthy();
    }
    expect(() => checkFigure(withField(operations, at, 'wide'))).toThrow(
      'is an expression and is the text "wide"',
    );
  });

  it('refuses a call into a function the vocabulary does not carry', () => {
    const at = ['scene', 'children', '0', 'children', '0', 'path', 'second', 'radius'];
    expect(checkFigure(withField(operations, at, { kind: 'call', name: 'cos', arguments: [0] }))).toBeTruthy();
    expect(() => checkFigure(withField(operations, at, { kind: 'call', name: 'wobble', arguments: [0] }))).toThrow(
      'is a function of the vocabulary',
    );
  });

  it('holds a style, a stroke and a fill under a node to their own fields', () => {
    const style = ['scene', 'children', '0', 'children', '1', 'children', '0', 'style'];
    expect(() => checkFigure(withField(turning, [...style, 'stroke', 'width'], 'thick'))).toThrow(
      'is a width and is the text "thick"',
    );
    expect(() => checkFigure(withField(turning, [...style, 'fill', 'rule'], 'inside'))).toThrow(
      'is a fill rule, one of nonzero, evenodd, and is the text "inside"',
    );
    expect(() => checkFigure(withField(turning, [...style, 'opacity'], 'half'))).toThrow(
      'is a number and is the text "half"',
    );
  });

  it('holds a taper to its two widths, which is what a width may be instead', () => {
    const stroke = ['scene', 'children', '0', 'children', '1', 'children', '0', 'style', 'stroke'];
    expect(checkFigure(withField(turning, [...stroke, 'width'], { from: 0.01, to: 0.04 }))).toBeTruthy();
    expect(
      checkFigure(withField(turning, [...stroke, 'width'], { from: 0.01, to: 0.04, curve: 'thereAndBack' })),
    ).toBeTruthy();
    expect(() => checkFigure(withField(turning, [...stroke, 'width'], { from: 0.01 }))).toThrow('is a width');
  });

  it('takes an entry of every kind a span may carry', () => {
    expect(EVERY_ENTRY).toHaveLength(18);
    const spans = EVERY_ENTRY.map((entry, at) => ({ entry, from: at, to: at + 1 }));
    expect(checkFigure({ ...turning, timeline: { spans, duration: EVERY_ENTRY.length } })).toBeTruthy();
  });

  it('refuses each entry short of a field it requires', () => {
    EVERY_ENTRY.forEach((entry, at) => {
      const [field] = Object.keys(entry).filter((name) => name !== 'kind' && name !== 'options');
      const short = Object.fromEntries(Object.entries(entry).filter(([name]) => name !== field));
      expect(() => checkFigure({ ...turning, timeline: { spans: [{ entry: short, from: 0, to: 1 }] } })).toThrow(
        `timeline.spans.0.entry.${field} is required and is missing`,
      );
    });
  });

  it('refuses an entry of a kind the format has no form for', () => {
    expect(() =>
      checkFigure({ ...turning, timeline: { spans: [{ entry: { kind: 'wiggle', target: 'turns' }, from: 0, to: 1 }] } }),
    ).toThrow('timeline.spans.0.entry is a timeline entry and has no kind called the text "wiggle"');
  });

  it('holds an animation option to its own fields', () => {
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'entry', 'options'], { pivot: 4 }))).toThrow(
      'timeline.spans.0.entry.options.pivot is a place and is 4',
    );
    expect(() =>
      checkFigure(withField(turning, ['timeline', 'spans', '0', 'entry', 'options'], { about: { x: 0, y: 0 } })),
    ).toThrow('timeline.spans.0.entry.options.about is not a field of what a turn takes');
  });

  it('takes an inset whose view move is one of the three, and refuses a fourth', () => {
    const inset = {
      shows: { width: 2, height: 1 },
      into: { x: { from: 1, to: 3 }, y: { from: 1, to: 2 } },
      view: { kind: 'followView', target: 'turns/own/pivot', options: { within: 0.5, room: 1 } },
    };
    expect(checkFigure({ ...turning, insets: [inset] })).toBeTruthy();
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, view: { kind: 'chaseView', target: 'x' } }] })).toThrow(
      'insets.0.view is a view move and has no kind called the text "chaseView"',
    );
  });

  it('refuses a span that runs backwards', () => {
    const spans = [{ entry: { kind: 'fadeIn', target: 'turns' }, from: 4, to: 2 }];
    expect(() => checkFigure({ ...turning, timeline: { spans } })).toThrow(
      'timeline.spans.0.to is 2 and its from is 4',
    );
  });

  it('refuses an expression reading a track the figure does not carry, by path', () => {
    const { tracks, ...without } = operations;
    expect(tracks).toBeTruthy();
    expect(() => checkFigure(JSON.parse(JSON.stringify(without)))).toThrow(
      'scene.children.0.children.0.path.second.centre.x.right reads the track apart, which the figure does not carry',
    );
  });

  it('refuses a value that is not a figure at all', () => {
    expect(() => checkFigure(null)).toThrow('the figure is a figure and is null');
    expect(() => checkFigure([])).toThrow('the figure is a figure and is a list');
    expect(() => checkFigure(4)).toThrow('the figure is a figure and is 4');
  });
});
