/**
 * A list of marks as the frame description a card draws, which is a value rather
 * than a drawing.
 *
 * The description is `@altpsyche/engine`'s own `FrameGraph`: its resources, its
 * pipelines and its passes, with every handle an index into one of those lists.
 * Nothing here touches a device and nothing here imports the engine at run time,
 * since a frame description is a plain value and the engine's own handle
 * builders are erased to the index they store. So `resolve` and `cost` run on
 * a figure inside `npm test`, and only the painter of the next step needs a card.
 *
 * The geometry is triangles in clip space and the shade is a colour per vertex.
 * A mark's opacity multiplies its alpha and its clip is cut into its triangles,
 * so nothing of a mark survives as state a draw would have to keep, and the
 * triangles of one draw sit in the order the marks were painted in.
 *
 * A mark with a depth is drawn against a depth attachment instead, so the depth
 * test on the card sets which of two marks covers the other at each pixel rather
 * than the order of the list. The list is split into stretches at every mark
 * with no depth, since such a mark clears the depths before it, and each
 * stretch is a pass that empties the depth attachment first. A flat figure has
 * one stretch, names no depth attachment and costs exactly what it did before.
 *
 * A gradient of two stops is a colour that changes affinely with position, and a
 * triangle interpolates an affine function exactly, so evaluating the two ends at
 * each vertex draws the gradient rather than an approximation of it. A gradient
 * of three stops or more is exact at the vertices and linear between them.
 */
import type {
  FrameGraph,
  PipelineHandle,
  ResourceSpec,
  TextureHandle,
  VertexHandle,
  VertexResource,
} from '@altpsyche/engine';
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Colour } from '../values/colour.js';
import { depthAt } from './depth.js';
import type { Fill, Mark } from './mark.js';
import { clipTriangles, strokeTrianglesOf, trianglesOf, type TriangleOptions } from './triangles.js';

export interface GpuFrameOptions extends TriangleOptions {
  /** How many pixels across the picture is drawn, which is what clip space is
   * worked out against. */
  readonly width: number;
  /** How many pixels down. */
  readonly height: number;
  /** What the frame opens on, four channels from nothing to one. Left out, the
   * frame opens on nothing at all and whatever is behind it shows through. */
  readonly clear?: readonly [number, number, number, number];
}

/** What one frame description contains: the graph the engine draws, how much
 * geometry went into it, and the marks it had no vocabulary for. */
export interface GpuFrame {
  /** The engine's own frame description, ready for `resolve`, `cost` and a
   * backend. */
  readonly frame: FrameGraph;
  /** How many triangles the whole frame is. */
  readonly triangles: number;
  /** How many bytes of vertex data the frame contains. */
  readonly bytes: number;
  /** The id of every mark the description leaves out or draws differently from
   * the other two painters, in the order they were painted. */
  readonly refused: readonly string[];
}

/** How far a flattened edge may sit from the curve it stands for, in pixels of
 * the picture as it is drawn. A fifth of a pixel is under what a screen resolves
 * and over what a curve needs to look straight. */
const PIXEL_SHARE = 0.2;

/**
 * The options a frame is flattened under, with the tolerance read off the view
 * where the caller named none.
 *
 * A tolerance is in the figure's own units and what it has to buy is a smooth
 * edge in pixels, so the two are only the same number at one scale. The view
 * sets how many pixels a unit covers, and a figure drawn at ten of them flattens
 * ten times finer than it needs to against a tolerance chosen for a hundred.
 */
function flattenedFor(view: Transform2D, options: GpuFrameOptions): GpuFrameOptions {
  if (options.tolerance !== undefined) return options;
  const scale = mat3.scaleFactor(view);
  // A view that collapses the plane gives no pixels to measure against, so the
  // flattening keeps whatever default the triangulation uses.
  if (!Number.isFinite(scale) || scale <= 0) return options;
  return { ...options, tolerance: PIXEL_SHARE / scale };
}

/** Two coordinates, four channels and one depth to a vertex, each a 32-bit
 * float. */
const STRIDE = 28;

/** Where a normalised depth is held inside the range the card keeps, which both
 * ends of are a clipping plane. A value landing exactly on one is a vertex the
 * card may drop, so the whole run is carried inside the two. */
const NEAREST = 0.05;
const FURTHEST = 0.95;

/** What a mark with no depth writes, which is the middle of the range and is
 * never tested against anything. */
const UNTESTED = 0.5;

/** How far toward the eye a stroke is written ahead of the fill it accompanies,
 * as a share of the range the card keeps.
 *
 * A stroke follows the line its own fill is bounded by, so the two are the same
 * distance away and the card interpolates that one distance across two different
 * sets of triangles. The two answers differ in the last bits, and a comparison
 * that a stroke has to win is one it then loses at some of the samples of a
 * pixel, which leaves the stroke averaged with the fill under it. The number is
 * far above where two interpolations of one plane disagree and far below where
 * two surfaces of a figure stand apart. */
const STROKE_NEARER = 1e-4;

/** Nothing at all, which is what a frame opens on where the caller names no
 * ground. */
const NOTHING: readonly [number, number, number, number] = [0, 0, 0, 0];

/** Colour channels reach a mark as nothing to 255 and reach a shader as nothing
 * to one. */
const FULL = 255;

/**
 * The colour a fill paints one point in, with the mark's opacity already in its
 * alpha.
 *
 * A gradient is read at the point's place along its axis, which is where the
 * point projects onto the run from one end to the other. An axis of no length has
 * no place to read and paints the first stop.
 */
function shadeOf(fill: Fill, at: Vec2, opacity: number): [number, number, number, number] {
  const colour = fill.gradient ? along(fill.gradient.from, fill.gradient.to, fill.gradient.stops, at) : fill.colour;
  return [colour.r / FULL, colour.g / FULL, colour.b / FULL, colour.a * opacity];
}

/** The colour a run of stops reaches at one point, by that point's place along
 * the axis. */
function along(
  from: Vec2,
  to: Vec2,
  stops: readonly { readonly offset: number; readonly colour: Colour }[],
  at: Vec2
): Colour {
  const axis = vec2.sub(to, from);
  const length = vec2.dot(axis, axis);
  const place = length > 0 ? Math.min(1, Math.max(0, vec2.dot(vec2.sub(at, from), axis) / length)) : 0;
  if (stops.length === 0) return { r: 0, g: 0, b: 0, a: 1 };
  let before = stops[0];
  let after = stops[stops.length - 1];
  for (let step = 1; step < stops.length; step += 1) {
    if (stops[step].offset >= place) {
      before = stops[step - 1];
      after = stops[step];
      break;
    }
  }
  const span = after.offset - before.offset;
  const share = span > 0 ? (place - before.offset) / span : 0;
  return {
    r: before.colour.r + (after.colour.r - before.colour.r) * share,
    g: before.colour.g + (after.colour.g - before.colour.g) * share,
    b: before.colour.b + (after.colour.b - before.colour.b) * share,
    a: before.colour.a + (after.colour.a - before.colour.a) * share,
  };
}

/** One mark's triangles in the figure's own units, its fill and its stroke both,
 * with its clip already cut into them.
 *
 * A scissor rectangle is the other way to clip and it draws a different picture:
 * it is whole pixels, so a box whose edge falls between two of them is refused
 * until it is rounded, and it keeps or drops a whole pixel where cutting the
 * geometry lets the four samples resolve the clipped edge the way they resolve
 * every other one. */
interface Piece {
  corners: Vec2[];
  fill: Fill;
  /** Whether this piece is drawn over another piece of the same mark that stands
   * at the same depth. */
  over: boolean;
}

function trianglesFor(mark: Mark, options: TriangleOptions): Piece[] {
  if (mark.kind !== 'path') return [];
  const pieces: Piece[] = [];
  if (mark.fill) {
    pieces.push({ corners: trianglesOf(mark.path, { ...options, rule: mark.fill.rule }), fill: mark.fill, over: false });
  }
  if (mark.stroke) {
    pieces.push({
      corners: strokeTrianglesOf(mark.path, mark.stroke, options),
      fill: { colour: mark.stroke.colour },
      // A stroke drawn around a fill of the same mark covers it, which is what
      // the other two painters draw and what the card has to be told.
      over: mark.fill !== undefined,
    });
  }
  const box = mark.clip;
  if (!box) return pieces;
  return pieces.map((piece) => ({ ...piece, corners: clipTriangles(piece.corners, box) }));
}

/** One mark ready to be written out: the triangles it came to, and the depth
 * function it has. */
interface Ready {
  readonly pieces: Piece[];
  readonly mark: Mark;
}

/** One run of marks sharing a vertex buffer, and whether the card tests what it
 * draws against a depth. */
interface Segment {
  readonly deep: boolean;
  readonly data: Uint8Array<ArrayBuffer>;
  readonly count: number;
}

/**
 * The smallest and largest depth any corner of any mark is at, or nothing where
 * no mark has one.
 *
 * The card keeps a depth over a fixed range, so the depths a figure uses are
 * carried into that range before they are written. One pair of ends for the whole
 * frame is what keeps the comparison between two marks the comparison the depths
 * asked for, since rescaling each mark against its own ends would order them by
 * nothing.
 */
function endsOf(ready: readonly Ready[]): { least: number; most: number } | undefined {
  let least = Infinity;
  let most = -Infinity;
  for (const { pieces, mark } of ready) {
    if (!mark.depth) continue;
    for (const piece of pieces) {
      for (const corner of piece.corners) {
        const at = depthAt(mark.depth, corner);
        if (at < least) least = at;
        if (at > most) most = at;
      }
    }
  }
  return least <= most ? { least, most } : undefined;
}

/**
 * A depth carried into the range the card keeps, with the nearer depth still the
 * smaller number.
 *
 * The map is affine in the depth and the depth is affine in the page, so what the
 * card interpolates across a triangle is still the function the mark stores
 * rather than an approximation of it. A run of no width is drawn at the near end,
 * since every mark of it is at the same distance and the order of the list is
 * what separates them.
 */
function heldInside(value: number, ends: { least: number; most: number }): number {
  const width = ends.most - ends.least;
  if (!(width > 0)) return NEAREST;
  return NEAREST + ((value - ends.least) / width) * (FURTHEST - NEAREST);
}

/**
 * A vertex buffer for one run of marks, in the order they are painted.
 *
 * A position reaches the buffer in clip space, which runs from minus one to one
 * across and up, so the y axis turns over: a figure's view maps onto a picture
 * whose y counts down the way an SVG viewBox does.
 *
 * A gradient is read at the figure-unit position rather than the clip-space one,
 * since a gradient's axis is in the mark's own units, and a depth is read there
 * for the same reason: the three numbers are a function of the figure's own page.
 */
function bufferOf(run: readonly Ready[], view: Transform2D, options: GpuFrameOptions, ends?: { least: number; most: number }): {
  data: Uint8Array<ArrayBuffer>;
  count: number;
} {
  const numbers: number[] = [];
  for (const { pieces, mark } of run) {
    const opacity = mark.opacity ?? 1;
    for (const piece of pieces) {
      for (const corner of piece.corners) {
        const drawn = mat3.transformPoint(view, corner);
        const shade = shadeOf(piece.fill, corner, opacity);
        const held =
          mark.depth && ends
            ? heldInside(depthAt(mark.depth, corner), ends) - (piece.over ? STROKE_NEARER : 0)
            : UNTESTED;
        numbers.push((2 * drawn.x) / options.width - 1, 1 - (2 * drawn.y) / options.height, ...shade, held);
      }
    }
  }
  const data = new Uint8Array(new ArrayBuffer(numbers.length * 4));
  new Float32Array(data.buffer).set(numbers);
  return { data, count: numbers.length / 7 };
}

/**
 * Every mark's triangles as the runs the passes are built from.
 *
 * A run ends wherever a mark with a depth meets a mark with none, which is
 * the same split the painters with no depth buffer make: a mark with none
 * clears the depths before it, so what is drawn after it is never tested against
 * what was drawn before it.
 */
function segmentsOf(marks: readonly Mark[], view: Transform2D, options: GpuFrameOptions): {
  segments: Segment[];
  count: number;
  bytes: number;
  refused: string[];
} {
  const refused: string[] = [];
  const ready: Ready[] = [];
  for (const mark of marks) {
    // A text mark has no outline and a card has no text vocabulary, which is
    // the one case where this painter draws less than the other two.
    if (mark.kind === 'text') refused.push(mark.id);
    const pieces = trianglesFor(mark, options);
    if (pieces.length === 0 || pieces.every((piece) => piece.corners.length === 0)) continue;
    ready.push({ pieces, mark });
  }

  const ends = endsOf(ready);
  const segments: Segment[] = [];
  let run: Ready[] = [];
  let deep = false;
  const close = () => {
    if (run.length === 0) return;
    const { data, count } = bufferOf(run, view, options, ends);
    segments.push({ deep, data, count });
    run = [];
  };
  for (const item of ready) {
    const carries = item.mark.depth !== undefined;
    if (run.length > 0 && carries !== deep) close();
    deep = carries;
    run.push(item);
  }
  close();

  // A frame drawing nothing still opens on its ground and still presents, so an
  // empty list is one run rather than none.
  if (segments.length === 0) segments.push({ deep: false, data: new Uint8Array(new ArrayBuffer(0)), count: 0 });

  let count = 0;
  let bytes = 0;
  for (const segment of segments) {
    count += segment.count;
    bytes += segment.data.byteLength;
  }
  return { segments, count, bytes, refused };
}

/** The WGSL a card draws the frame with: a position straight through to clip
 * space, a depth straight through to the card's own range, and a colour straight
 * through to the target.
 *
 * WGSL's clip space keeps its depth from nothing to one, which is the range the
 * vertex already stores, so the number is written as it stands. */
const WGSL = `struct Vertex {
  @location(0) position: vec2f,
  @location(1) shade: vec4f,
  @location(2) depth: f32,
};

struct Painted {
  @builtin(position) clip: vec4f,
  @location(0) shade: vec4f,
};

@vertex
fn vertexMain(vertex: Vertex) -> Painted {
  var painted: Painted;
  painted.clip = vec4f(vertex.position, vertex.depth, 1.0);
  painted.shade = vertex.shade;
  return painted;
}

@fragment
fn fragmentMain(painted: Painted) -> @location(0) vec4f {
  return painted.shade;
}
`;

/** The same two stages in GLSL ES 3.00, which is what lets a device with no
 * WebGPU draw the frame on WebGL 2.
 *
 * The vertex stage negates clip-space y, which is the first half of the only way
 * WebGL 2 has of giving a WGSL frame its own top-left framebuffer origin, and the
 * winding inversion the backend applies is the second. A baked translation is
 * read as applying both, so a stage leaving y alone draws the picture upside
 * down.
 *
 * The depth is doubled and moved back by one because this clip space keeps its
 * own from minus one to one where WGSL's keeps it from nothing to one, and the
 * vertex stores the WGSL range. A stage writing the number as it stands would
 * draw the near half of every figure in space. */
const GLSL_VERTEX = `#version 300 es
layout(location = 0) in vec2 position;
layout(location = 1) in vec4 shade;
layout(location = 2) in float depth;
out vec4 painted;

void main() {
  painted = shade;
  gl_Position = vec4(position.x, -position.y, depth * 2.0 - 1.0, 1.0);
}
`;

const GLSL_FRAGMENT = `#version 300 es
precision highp float;
in vec4 painted;
out vec4 drawn;

void main() {
  drawn = painted;
}
`;

/** The name the two stages are fetched under, which a loader dedups by. */
const DOCUMENT = 'altpsyche-marks';

/** The colour the target already stores kept in the share the new colour's alpha
 * leaves, which is the painter's algorithm written as a blend. */
const OVER = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
} as const;

/** Four channels of a byte each, which is the format a page's own colour buffer
 * stores and what a resolved picture is presented as. */
const FORMAT = 'rgba8unorm';

/** The format the depth is kept in, which both backends support and neither of them
 * keeps a stencil beside. */
const DEPTH_FORMAT = 'depth24plus';

/** The far end of the range the card normalises a depth into, which the
 * attachment is emptied to so a first mark at any distance passes. */
const EMPTY = 1;

/**
 * A handle is the index of the entry it names, and the engine's own builders are
 * erased to that index, so a description written here needs no run-time import of
 * the engine to name one.
 */
function handle<Named extends number>(index: number): Named {
  return index as Named;
}

/**
 * A list of marks as the engine's frame description, drawn at a named size.
 *
 * The picture is drawn into a colour attachment of the painter's own at four
 * samples to the pixel and resolved into the texture the frame presents. A pass
 * drawing straight into the frame the reader sees keeps one sample of each pixel
 * and may name no blend, and 67 of the flat demo's marks sit under partial
 * opacity, so a blend and a smooth edge are both bought by owning the attachment.
 */
export function gpuFrame(marks: readonly Mark[], view: Transform2D, options: GpuFrameOptions): GpuFrame {
  const { segments, count, bytes, refused } = segmentsOf(marks, view, flattenedFor(view, options));
  const tests = segments.some((segment) => segment.deep);

  const multisampled: TextureHandle = handle(0);
  const presented: TextureHandle = handle(1);
  const depth: TextureHandle = handle(2);
  // A figure with no depth in it names no attachment for one, so a flat figure
  // declares and costs exactly what it did before there was a depth at all.
  const firstVertex = tests ? 3 : 2;

  const geometry: VertexResource[] = segments.map((segment) => ({
    kind: 'vertices',
    stride: STRIDE,
    attributes: [
      { location: 0, offset: 0, format: 'float32x2' },
      { location: 1, offset: 8, format: 'float32x4' },
      { location: 2, offset: 24, format: 'float32' },
    ],
    topology: 'triangle-list',
    count: segment.count,
    data: segment.data,
  }));

  const resources: ResourceSpec[] = [
    { kind: 'texture', size: { scale: 1 }, format: FORMAT, use: ['attachment'], samples: 4 },
    { kind: 'texture', size: { scale: 1 }, format: FORMAT, use: ['attachment', 'sample'] },
  ];
  // The depth keeps as many samples as the colour beside it, since a pass whose
  // attachments disagree on that is no pass a card will open.
  if (tests) resources.push({ kind: 'texture', size: { scale: 1 }, format: DEPTH_FORMAT, use: ['attachment'], samples: 4 });
  resources.push(...geometry);

  const frame: FrameGraph = {
    id: 'altpsyche-marks',
    authored: 'wgsl',
    // The GLSL below is the baked translation of the WGSL above, so a device with
    // no WebGPU draws the same frame on WebGL 2 rather than being refused.
    translated: true,
    requires: ['msaa'],
    modules: [],
    resources,
    pipelines: segments.map((segment, at) => ({
      kind: 'render',
      source: {
        wgsl: { vertex: WGSL, fragment: WGSL },
        glsl: { vertex: GLSL_VERTEX, fragment: GLSL_FRAGMENT },
      },
      vertex: { document: DOCUMENT, entry: 'vertexMain' },
      fragment: { document: DOCUMENT, entry: 'fragmentMain' },
      geometry: handle<VertexHandle>(firstVertex + at),
      bindings: [],
      // A mark with no depth is drawn by a pipeline that neither tests one
      // nor writes one: the order of the list is what places it, and a mark under
      // partial opacity that wrote a depth would hide what is drawn behind it
      // afterwards.
      ...(segment.deep ? { depth: { format: DEPTH_FORMAT, compare: 'less-equal' as const, write: true } } : {}),
      targets: [{ format: FORMAT, blend: OVER }],
      samples: 4,
    })),
    passes: segments.map((segment, at) => ({
      pipeline: handle<PipelineHandle>(at),
      // A pipeline naming its own geometry reads how many corners to draw off
      // that vertex buffer, so a draw beside it names instances rather than a
      // corner count of its own, which the backend refuses in a geometry pass.
      draws: [{ instances: 1 }],
      // Each stretch empties the depth attachment, so a mark from before a mark
      // with none never shows through one drawn after it.
      ...(segment.deep ? { depth: { resource: depth, clear: EMPTY } } : {}),
      colour: [
        {
          resource: multisampled,
          // Only the first pass opens on the ground, since a later one naming a
          // clear would empty what the pass before it drew.
          ...(at === 0 ? { clear: [...(options.clear ?? NOTHING)] as [number, number, number, number] } : {}),
          // Every pass averages its samples, because a pass writing an attachment
          // of several samples and averaging them nowhere is refused by both
          // backends. The attachment keeps what the pass before it drew, so each
          // average is of the whole picture so far and the last one is presented.
          resolve: presented,
        },
      ],
    })),
    present: presented,
  };

  return { frame, triangles: count / 3, bytes, refused };
}
