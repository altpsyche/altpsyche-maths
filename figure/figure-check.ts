/**
 * The vocabulary described as a table, and the walk that holds a value to it.
 *
 * A file read from disk is whatever the bytes said, so the shape of every kind
 * is checked before a figure is built from it. The description is a table rather
 * than a function for each kind, because sixty-one kinds written as sixty-one
 * functions are sixty-one places a field is forgotten, and a table is read
 * against the reference by eye.
 *
 * A refusal names the path of the field from the figure down, with the index of
 * a list wherever one is crossed, since a name on its own does not say which of
 * forty nodes carries it.
 *
 * A field a kind does not carry is refused rather than ignored. A renderer that
 * ignored one would draw a figure another renderer draws differently, with
 * nothing to say the two disagreed, and the format's version is what a new field
 * arrives with instead.
 */
import { CURVE_NAMES } from '../values/ease.js';
import { EXPRESSION_FUNCTIONS } from './expression.js';
import type { FigureRecord } from './figure-record.js';

/** One field of a record, and whether a figure has to carry it. */
interface Field {
  readonly shape: Shape;
  readonly required?: true;
}

type Fields = Readonly<Record<string, Field>>;

/**
 * What a value may be.
 *
 * `kinds` is a set of records told apart by a `kind` field, which is how the
 * format writes every union it has. `kindless` is what a value with no `kind`
 * is held to, since a fixed extent, a place and a bare number are each written
 * without one.
 */
type Shape =
  | { readonly form: 'number' }
  | { readonly form: 'text' }
  | { readonly form: 'flag' }
  | { readonly form: 'named'; readonly names: readonly string[]; readonly what: string }
  | { readonly form: 'list'; readonly of: Shape; readonly length?: number }
  | { readonly form: 'map'; readonly of: Shape }
  | { readonly form: 'fields'; readonly what: string; readonly fields: Fields }
  | { readonly form: 'kinds'; readonly what: string; readonly kinds: Readonly<Record<string, Fields>>; readonly kindless?: Shape }
  | { readonly form: 'either'; readonly what: string; readonly of: readonly Shape[] }
  | { readonly form: 'object'; readonly what: string }
  | { readonly form: 'ref'; readonly name: string };

const number: Shape = { form: 'number' };
const text: Shape = { form: 'text' };
const flag: Shape = { form: 'flag' };
const need = (shape: Shape): Field => ({ shape, required: true });
const may = (shape: Shape): Field => ({ shape });
const ref = (name: string): Shape => ({ form: 'ref', name });
const list = (of: Shape, length?: number): Shape => (length === undefined ? { form: 'list', of } : { form: 'list', of, length });
const fields = (what: string, held: Fields): Shape => ({ form: 'fields', what, fields: held });
const named = (what: string, names: readonly string[]): Shape => ({ form: 'named', what, names });

/** A place, a colour, a style and the rest of the values a parameter may be. */
const SHAPES: Readonly<Record<string, Shape>> = {
  point: fields('a place', { x: need(number), y: need(number) }),
  point3: fields('a place in space', {
    x: need(ref('expression')),
    y: need(ref('expression')),
    z: need(ref('expression')),
  }),
  interval: fields('an interval', { from: need(number), to: need(number) }),
  extent: fields('an extent', {
    width: need(number),
    height: need(number),
    centre: may(ref('point')),
  }),
  bounds: fields('a rectangle', { x: need(ref('interval')), y: need(ref('interval')) }),
  scale: fields('a scale', { graph: need(ref('interval')), units: need(ref('interval')) }),
  coords: fields('a pair of scales', { x: need(ref('scale')), y: need(ref('scale')) }),
  colour: text,
  curve: named('the name of a curve', CURVE_NAMES),
  taper: fields('a taper', { from: need(number), to: need(number), curve: may(ref('curve')) }),
  width: { form: 'either', what: 'a width', of: [number, ref('taper')] },
  stop: fields('a gradient stop', { offset: need(number), colour: need(ref('colour')) }),
  gradient: fields('a gradient', {
    from: need(ref('point')),
    to: need(ref('point')),
    stops: need(list(ref('stop'))),
  }),
  fill: fields('a fill', {
    colour: need(ref('colour')),
    gradient: may(ref('gradient')),
    rule: may(named('a fill rule', ['nonzero', 'evenodd'])),
  }),
  stroke: fields('a stroke', {
    colour: need(ref('colour')),
    width: need(ref('width')),
    cap: may(named('a cap', ['butt', 'round', 'square'])),
    join: may(named('a join', ['miter', 'round', 'bevel'])),
    dash: may(list(number)),
    dashOffset: may(number),
  }),
  style: fields('a style', {
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    opacity: may(number),
    family: may(text),
    weight: may(number),
    clip: may(ref('bounds')),
  }),
  mat3: list(number, 9),
  cubic: fields('a cubic', {
    control1: need(ref('point')),
    control2: need(ref('point')),
    to: need(ref('point')),
  }),
  subpath: fields('a subpath', {
    start: need(ref('point')),
    curves: need(list(ref('cubic'))),
    closed: need(flag),
  }),
  geometry: list(ref('subpath')),
  pathMark: fields('a mark', {
    kind: need(named('the kind of a mark', ['path'])),
    id: need(text),
    path: need(ref('geometry')),
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    opacity: may(number),
    clip: may(ref('bounds')),
  }),
  equation: fields('a typeset expression', {
    marks: need(list(ref('pathMark'))),
    box: need(
      fields('the box round a typeset expression', {
        x: need(number),
        y: need(number),
        width: need(number),
        height: need(number),
      }),
    ),
  }),
  trackValue: { form: 'either', what: "a track's value", of: [number, flag, list(number)] },
  key: fields('a key', {
    time: need(number),
    value: need(ref('trackValue')),
    smooth: may(flag),
    curve: may(ref('curve')),
  }),
  tracks: { form: 'map', of: list(ref('key')) },
  projection: {
    form: 'kinds',
    what: 'a projection',
    kinds: {
      perspective: { fov: may(number), near: may(number), far: may(number) },
      orthographic: { height: may(number), near: may(number), far: may(number) },
    },
  },
  camera: fields('a camera', {
    eye: need(ref('point3')),
    target: need(ref('point3')),
    up: may(ref('point3')),
    projection: may(ref('projection')),
  }),
  expression: {
    form: 'kinds',
    what: 'an expression',
    kinds: {
      track: { name: need(text) },
      variable: { name: need(text) },
      point: { x: need(ref('expression')), y: need(ref('expression')) },
      member: { of: need(ref('expression')), name: need(named('a member', ['x', 'y'])) },
      arithmetic: {
        operator: need(named('an operator', ['+', '-', '*', '/'])),
        left: need(ref('expression')),
        right: need(ref('expression')),
      },
      compare: {
        operator: need(named('a comparison', ['<', '<=', '>', '>=', '=', '!='])),
        left: need(ref('expression')),
        right: need(ref('expression')),
      },
      choice: {
        when: need(ref('expression')),
        then: need(ref('expression')),
        otherwise: need(ref('expression')),
      },
      call: { name: need(named('a function of the vocabulary', EXPRESSION_FUNCTIONS)), arguments: need(list(ref('expression'))) },
      path: { of: need(ref('carriedPath')) },
      coords: { of: need(ref('coords')) },
      camera: { of: need(ref('camera')) },
    },
    kindless: { form: 'either', what: 'an expression', of: [number, flag, ref('point')] },
  },
  expressionInterval: fields('an interval', { from: need(ref('expression')), to: need(ref('expression')) }),
  hole: fields('a hole of a template', { value: need(ref('expression')), precision: need(number) }),
  content: {
    form: 'either',
    what: 'text or a template',
    of: [text, fields('a template', { template: need(text), holes: need(list(ref('hole'))) })],
  },
  textOptions: fields('what a word takes', {
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    opacity: may(number),
    family: may(text),
    weight: may(number),
    clip: may(ref('bounds')),
    align: may(named('an alignment', ['start', 'middle', 'end'])),
    baseline: may(named('a baseline', ['alphabetic', 'middle', 'hanging'])),
    leading: may(number),
  }),
  arrowOptions: fields('what an arrow takes', {
    stroke: need(ref('stroke')),
    fill: may(ref('fill')),
    head: may(ref('expression')),
    spread: may(ref('expression')),
  }),
  braceOptions: fields('what a brace takes', {
    stroke: need(ref('stroke')),
    fill: need(ref('fill')),
    size: need(number),
    depth: need(ref('expression')),
    curl: may(ref('expression')),
    padding: may(ref('expression')),
    align: may(named('an alignment', ['start', 'middle', 'end'])),
    baseline: may(named('a baseline', ['alphabetic', 'middle', 'hanging'])),
    family: may(text),
    weight: may(number),
  }),
  calloutOptions: fields('what a callout takes', {
    stroke: need(ref('stroke')),
    fill: need(ref('fill')),
    size: need(number),
    marker: may(ref('expression')),
    align: may(named('an alignment', ['start', 'middle', 'end'])),
    baseline: may(named('a baseline', ['alphabetic', 'middle', 'hanging'])),
    family: may(text),
    weight: may(number),
  }),
  axisOptions: fields('what an axis takes', {
    stroke: need(ref('stroke')),
    fill: may(ref('fill')),
    size: may(number),
    ticks: may(number),
    tickLength: may(number),
    gap: may(number),
    tip: may(number),
    spread: may(number),
    family: may(text),
    weight: may(number),
    crossedAt: may(number),
  }),
  numberLineOptions: fields('what a number line takes', {
    stroke: need(ref('stroke')),
    fill: may(ref('fill')),
    size: may(number),
    at: may(number),
    direction: may(named('a direction', ['across', 'up'])),
    ticks: may(number),
    tickLength: may(number),
    gap: may(number),
    tip: may(number),
    spread: may(number),
    family: may(text),
    weight: may(number),
    skipZero: may(flag),
    crossedAt: may(number),
  }),
  numberPlaneOptions: fields('what a number plane takes', {
    stroke: need(ref('stroke')),
    minors: may(number),
    minorOpacity: may(number),
    minorWidth: may(number),
    ticks: may(number),
  }),
  barsOptions: fields('what a run of bars takes', {
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    bars: may(number),
    over: may(ref('expressionInterval')),
    height: may(named('where a bar takes its height', ['left', 'right', 'middle'])),
    baseline: may(number),
  }),
  equationOptions: fields('what a typeset expression takes', {
    at: need(ref('expression')),
    align: may(named('an alignment', ['start', 'middle', 'end'])),
    width: need(number),
    height: need(number),
    fill: need(ref('fill')),
  }),
  colourChoice: {
    form: 'kinds',
    what: 'a colour read off a magnitude',
    kinds: {
      bands: {
        first: need(ref('colour')),
        then: need(
          list(fields('a band', { above: need(ref('expression')), colour: need(ref('colour')) })),
        ),
      },
    },
    kindless: ref('colour'),
  },
  fillRecord: fields('a fill', {
    colour: need(ref('colour')),
    gradient: may(
      fields('a gradient', {
        from: need(ref('expression')),
        to: need(ref('expression')),
        stops: need(list(ref('stop'))),
      }),
    ),
    rule: may(named('a fill rule', ['nonzero', 'evenodd'])),
  }),
  shade: fields('a shading ramp', { ramp: need(list(ref('fillRecord'))), band: may(ref('interval')) }),
  flatResolution: {
    form: 'either',
    what: 'a resolution',
    of: [number, fields('a resolution', { x: need(number), y: need(number) })],
  },
  surfaceResolution: {
    form: 'either',
    what: 'a resolution',
    of: [number, fields('a resolution', { u: need(number), v: need(number) })],
  },
  spaceResolution: {
    form: 'either',
    what: 'a resolution',
    of: [number, fields('a resolution', { x: need(number), y: need(number), z: need(number) })],
  },
  fieldOptions: fields('what a field takes', {
    lengthOf: need(ref('expression')),
    colourFor: need(ref('colourChoice')),
    width: need(number),
    resolution: may(ref('flatResolution')),
    over: may(fields('the box a field is read over', { x: may(ref('interval')), y: may(ref('interval')) })),
    head: may(number),
    spread: may(number),
  }),
  field3Options: fields('what a field in space takes', {
    lengthOf: need(ref('expression')),
    colourFor: need(ref('colourChoice')),
    stroke: need(ref('stroke')),
    fill: may(ref('fill')),
    head: may(number),
    spread: may(number),
    over: may(
      fields('the box a field is read over', {
        x: may(ref('interval')),
        y: may(ref('interval')),
        z: may(ref('interval')),
      }),
    ),
    resolution: may(ref('spaceResolution')),
  }),
  surfaceOptions: fields('what a surface takes', {
    shade: need(ref('shade')),
    light: may(ref('point3')),
    over: may(fields('the runs of a surface', { u: may(ref('interval')), v: may(ref('interval')) })),
    resolution: may(ref('surfaceResolution')),
    cull: may(flag),
    stroke: may(ref('stroke')),
  }),
  polyline3Options: fields('what a run in space takes', {
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    opacity: may(number),
    family: may(text),
    weight: may(number),
    clip: may(ref('bounds')),
    close: may(flag),
  }),
  text3Options: fields('what a label in space takes', {
    fill: may(ref('fill')),
    stroke: may(ref('stroke')),
    opacity: may(number),
    family: may(text),
    weight: may(number),
    clip: may(ref('bounds')),
    align: may(named('an alignment', ['start', 'middle', 'end'])),
    baseline: may(named('a baseline', ['alphabetic', 'middle', 'hanging'])),
    leading: may(number),
    offset: may(ref('point')),
  }),
  axes3Options: fields('what axes in space take', {
    stroke: need(ref('stroke')),
    fill: may(ref('fill')),
    x: may(ref('interval')),
    y: may(ref('interval')),
    z: may(ref('interval')),
    size: may(number),
    ticks: may(number),
    tickLength: may(number),
    gap: may(number),
    names: may(fields('the names of three axes', { x: may(text), y: may(text), z: may(text) })),
    family: may(text),
    weight: may(number),
  }),
  sectionOptions: fields('what a section takes', {
    over: may(fields('the runs of a surface', { u: may(ref('interval')), v: may(ref('interval')) })),
    resolution: may(ref('surfaceResolution')),
    tolerance: may(number),
  }),
  streamlineOptions: fields('what a streamline takes', {
    step: need(number),
    steps: may(number),
    within: may(fields('the box a run stays inside', { x: need(ref('interval')), y: need(ref('interval')) })),
    direction: may(named('a direction', ['forward', 'backward', 'both'])),
    least: may(number),
  }),
  plane: fields('a plane', { point: need(ref('point3')), normal: need(ref('point3')) }),
  section: fields('a section', {
    of: need(ref('point3')),
    plane: need(ref('plane')),
    options: may(ref('sectionOptions')),
  }),
  streamline: fields('a streamline', {
    of: need(ref('expression')),
    from: need(ref('expression')),
    options: need(ref('streamlineOptions')),
  }),
  spaceItem: fields('a piece of a scene', { points: need(list(ref('point3'))), node: need(ref('node')) }),
  sceneItem: {
    form: 'kinds',
    what: 'an entry of a scene in space',
    kinds: {
      surfaceCells: { name: need(text), of: need(ref('point3')), options: need(ref('surfaceOptions')) },
      fieldArrows3: { name: need(text), of: need(ref('point3')), options: need(ref('field3Options')) },
    },
    kindless: ref('spaceItem'),
  },
  carriedPath: {
    form: 'kinds',
    what: 'a path',
    kinds: {
      line: { from: need(ref('expression')), to: need(ref('expression')) },
      polyline: { points: need(list(ref('expression'))) },
      polygon: { points: need(list(ref('expression'))) },
      rect: {
        corner: need(ref('expression')),
        width: need(ref('expression')),
        height: need(ref('expression')),
      },
      circle: { centre: need(ref('expression')), radius: need(ref('expression')) },
      arc: {
        centre: need(ref('expression')),
        radius: need(ref('expression')),
        from: need(ref('expression')),
        to: need(ref('expression')),
      },
      plot: {
        coords: need(ref('coords')),
        of: need(ref('expression')),
        resolution: may(number),
        over: may(ref('expressionInterval')),
      },
      areaUnder: {
        coords: need(ref('coords')),
        curve: need(ref('carriedPath')),
        baseline: may(ref('expression')),
      },
      tangentAt: {
        coords: need(ref('coords')),
        curve: need(ref('carriedPath')),
        x: need(ref('expression')),
        reach: may(ref('expression')),
      },
      bracePath: {
        from: need(ref('expression')),
        to: need(ref('expression')),
        depth: need(ref('expression')),
        curl: may(ref('expression')),
      },
      data: { d: need(text) },
      cubics: { subpaths: need(ref('geometry')) },
      union: { first: need(ref('carriedPath')), second: need(ref('carriedPath')), tolerance: may(number) },
      intersection: { first: need(ref('carriedPath')), second: need(ref('carriedPath')), tolerance: may(number) },
      difference: { first: need(ref('carriedPath')), second: need(ref('carriedPath')), tolerance: may(number) },
    },
  },
  node: {
    form: 'kinds',
    what: 'a node',
    kinds: {
      shape: { name: need(text), path: need(ref('carriedPath')), style: may(ref('style')) },
      text: {
        name: need(text),
        at: need(ref('point')),
        content: need(ref('content')),
        size: need(number),
        options: may(ref('textOptions')),
      },
      group: {
        name: need(text),
        children: need(list(ref('node'))),
        transform: may(ref('mat3')),
        style: may(ref('style')),
      },
      dot: {
        name: need(text),
        at: need(ref('expression')),
        radius: need(ref('expression')),
        fill: need(ref('fill')),
      },
      arrow: {
        name: need(text),
        from: need(ref('expression')),
        to: need(ref('expression')),
        options: need(ref('arrowOptions')),
      },
      brace: {
        name: need(text),
        from: need(ref('expression')),
        to: need(ref('expression')),
        content: need(ref('content')),
        options: need(ref('braceOptions')),
      },
      callout: {
        name: need(text),
        at: need(ref('expression')),
        to: need(ref('expression')),
        content: need(ref('content')),
        options: need(ref('calloutOptions')),
      },
      numberLine: { name: need(text), scale: need(ref('scale')), options: need(ref('numberLineOptions')) },
      axes: { name: need(text), coords: need(ref('coords')), options: need(ref('axisOptions')) },
      numberPlane: {
        name: need(text),
        coords: need(ref('coords')),
        options: need(ref('numberPlaneOptions')),
      },
      riemannBars: {
        name: need(text),
        coords: need(ref('coords')),
        of: need(ref('expression')),
        options: may(ref('barsOptions')),
      },
      equationNode: {
        name: need(text),
        equation: need(ref('equation')),
        options: need(ref('equationOptions')),
      },
      vectorField: {
        name: need(text),
        coords: need(ref('coords')),
        of: need(ref('expression')),
        options: need(ref('fieldOptions')),
      },
      polyline3: {
        name: need(text),
        points: need(list(ref('point3'))),
        camera: need(ref('camera')),
        options: may(ref('polyline3Options')),
      },
      dot3: {
        name: need(text),
        at: need(ref('point3')),
        radius: need(ref('expression')),
        fill: need(ref('fill')),
        camera: need(ref('camera')),
      },
      text3: {
        name: need(text),
        at: need(ref('point3')),
        content: need(ref('content')),
        size: need(number),
        camera: need(ref('camera')),
        options: may(ref('text3Options')),
      },
      arrow3: {
        name: need(text),
        from: need(ref('point3')),
        to: need(ref('point3')),
        camera: need(ref('camera')),
        options: need(ref('arrowOptions')),
      },
      scene3: { name: need(text), items: need(list(ref('sceneItem'))), camera: need(ref('camera')) },
      axes3: { name: need(text), camera: need(ref('camera')), options: need(ref('axes3Options')) },
      surface3: {
        name: need(text),
        of: need(ref('point3')),
        camera: need(ref('camera')),
        options: need(ref('surfaceOptions')),
      },
      vectorField3: {
        name: need(text),
        of: need(ref('point3')),
        camera: need(ref('camera')),
        options: need(ref('field3Options')),
      },
      section3: {
        name: need(text),
        curve: need(ref('section')),
        camera: need(ref('camera')),
        options: may(ref('polyline3Options')),
        style: may(ref('style')),
      },
      streamline3: {
        name: need(text),
        runs: need(list(ref('streamline'))),
        on: need(ref('point3')),
        camera: need(ref('camera')),
        options: may(ref('polyline3Options')),
        style: may(ref('style')),
      },
    },
  },
  entry: { form: 'object', what: 'a timeline entry' },
  viewChange: { form: 'object', what: 'a view move' },
  span: fields('a span', {
    entry: need(ref('entry')),
    from: need(number),
    to: need(number),
    curve: may(ref('curve')),
  }),
  timeline: fields('a timeline', { spans: need(list(ref('span'))), duration: may(number) }),
  extentChoice: {
    form: 'kinds',
    what: 'an extent',
    kinds: {
      byAspect: { wide: need(ref('extent')), square: need(ref('extent')), tall: need(ref('extent')) },
      matchingAspect: { height: need(number) },
    },
    kindless: ref('extent'),
  },
  inset: fields('an inset', {
    shows: need(ref('extent')),
    into: need(ref('bounds')),
    fit: may(named('a fit', ['contain', 'cover'])),
    view: may(ref('viewChange')),
    name: may(text),
    hides: may(list(text)),
  }),
  figure: fields('a figure', {
    extent: need(ref('extentChoice')),
    fit: may(named('a fit', ['contain', 'cover'])),
    scene: need(ref('node')),
    tracks: may(ref('tracks')),
    timeline: may(ref('timeline')),
    duration: may(number),
    still: need(number),
    loop: may(flag),
    insets: may(list(ref('inset'))),
  }),
};

/** The name of what a value is, for the sentence that refuses it. */
function nameOf(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `the text ${JSON.stringify(value)}`;
  if (typeof value === 'object') return 'an object';
  return `a ${typeof value}`;
}

const refuse = (path: string, said: string): never => {
  throw new Error(`${path === '' ? 'the figure' : path} ${said}`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A value held to one shape, refusing with the path of the field where it does
 * not hold. Nothing is returned, since what a file carried is what is drawn. */
function check(value: unknown, shape: Shape, path: string): void {
  switch (shape.form) {
    case 'ref': {
      const held = SHAPES[shape.name];
      if (!held) throw new Error(`the vocabulary has no shape called ${shape.name}`);
      return check(value, held, path);
    }
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) refuse(path, `is a number and is ${nameOf(value)}`);
      return;
    case 'text':
      if (typeof value !== 'string') refuse(path, `is text and is ${nameOf(value)}`);
      return;
    case 'flag':
      if (typeof value !== 'boolean') refuse(path, `is a true or false and is ${nameOf(value)}`);
      return;
    case 'named':
      if (typeof value !== 'string' || !shape.names.includes(value)) {
        refuse(path, `is ${shape.what}, one of ${shape.names.join(', ')}, and is ${nameOf(value)}`);
      }
      return;
    case 'list':
      if (!Array.isArray(value)) refuse(path, `is a list and is ${nameOf(value)}`);
      if (shape.length !== undefined && (value as unknown[]).length !== shape.length) {
        refuse(path, `is a list of ${shape.length} and holds ${(value as unknown[]).length}`);
      }
      (value as unknown[]).forEach((item, at) => check(item, shape.of, `${path}.${at}`));
      return;
    case 'map':
      if (!isObject(value)) refuse(path, `is a set of values by name and is ${nameOf(value)}`);
      for (const [name, held] of Object.entries(value as Record<string, unknown>)) {
        check(held, shape.of, path === '' ? name : `${path}.${name}`);
      }
      return;
    case 'object':
      if (!isObject(value)) refuse(path, `is ${shape.what} and is ${nameOf(value)}`);
      return;
    case 'either':
      for (const one of shape.of) {
        try {
          check(value, one, path);
          return;
        } catch {
          continue;
        }
      }
      return refuse(path, `is ${shape.what} and is ${nameOf(value)}`);
    case 'fields':
      return checkFields(value, shape.what, shape.fields, path, false);
    case 'kinds': {
      if (!isObject(value)) {
        if (shape.kindless) return check(value, shape.kindless, path);
        return refuse(path, `is ${shape.what} and is ${nameOf(value)}`);
      }
      const kind = (value as { kind?: unknown }).kind;
      if (kind === undefined && shape.kindless) return check(value, shape.kindless, path);
      if (typeof kind !== 'string' || !(kind in shape.kinds)) {
        return refuse(path, `is ${shape.what} and has no kind called ${nameOf(kind)}`);
      }
      return checkFields(value, `${shape.what} of kind ${kind}`, shape.kinds[kind], path, true);
    }
  }
}

/**
 * One record against its fields, refusing a required field that is absent and a
 * field the kind does not carry.
 *
 * A field written as `undefined` counts as absent, since that is what a record
 * built in TypeScript carries for a field it leaves out and a written file drops
 * it.
 */
function checkFields(value: unknown, what: string, held: Fields, path: string, tagged: boolean): void {
  if (!isObject(value)) return void refuse(path, `is ${what} and is ${nameOf(value)}`);
  const at = (name: string) => (path === '' ? name : `${path}.${name}`);
  for (const [name, field] of Object.entries(held)) {
    const carried = (value as Record<string, unknown>)[name];
    if (carried === undefined) {
      if (field.required) refuse(at(name), `is required and is missing`);
      continue;
    }
    check(carried, field.shape, at(name));
  }
  for (const name of Object.keys(value as Record<string, unknown>)) {
    if (name in held) continue;
    if (tagged && name === 'kind') continue;
    if ((value as Record<string, unknown>)[name] === undefined) continue;
    refuse(at(name), `is not a field of ${what}`);
  }
}

/**
 * A value held to the shape of a figure, handed back as one.
 *
 * What comes back is the value that was given rather than a copy of it, so a
 * reader parses once and draws what it parsed.
 */
export function checkFigure(value: unknown): FigureRecord {
  check(value, SHAPES.figure, '');
  return value as FigureRecord;
}
