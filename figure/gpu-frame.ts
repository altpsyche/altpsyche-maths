/**
 * A list of marks as the frame description a card draws, which is a value rather
 * than a drawing.
 *
 * The description is `@altpsyche/engine`'s own `FrameGraph`: its resources, its
 * pipelines and its passes, with every handle an index into one of those lists.
 * Nothing here touches a device and nothing here imports the engine at run time,
 * since a frame description is a plain value and the engine's own handle
 * builders are erased to the index they carry. So `resolve` and `cost` answer for
 * a figure inside `npm test`, and only the painter of the next step needs a card.
 *
 * The geometry is triangles in clip space and the shade is a colour per vertex.
 * A mark's opacity multiplies its alpha and its clip is cut into its triangles,
 * so nothing of a mark survives as state a draw would have to carry, and the
 * whole frame is one draw whose triangles sit in the order the marks were painted
 * in. That order is what the painter's algorithm needs, since a figure carries no
 * depth.
 *
 * A gradient of two stops is a colour that changes affinely with position, and a
 * triangle interpolates an affine function exactly, so evaluating the two ends at
 * each vertex draws the gradient rather than an approximation of it. A gradient
 * of three stops or more is exact at the vertices and linear between them.
 */
import type { FrameGraph, PipelineHandle, TextureHandle, VertexHandle, VertexResource } from '@altpsyche/engine';
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Colour } from '../values/colour.js';
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

/** What one frame description carries: the graph the engine draws, how much
 * geometry went into it, and the marks it had no vocabulary for. */
export interface GpuFrame {
  /** The engine's own frame description, ready for `resolve`, `cost` and a
   * backend. */
  readonly frame: FrameGraph;
  /** How many triangles the whole frame is. */
  readonly triangles: number;
  /** How many bytes of vertex data the frame carries. */
  readonly bytes: number;
  /** The id of every mark the description leaves out or draws differently from
   * the other two painters, in the order they were painted. */
  readonly refused: readonly string[];
}

/** Two coordinates and four channels to a vertex, each a 32-bit float. */
const STRIDE = 24;

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
 * with its clip already cut into them. */
function trianglesFor(mark: Mark, options: TriangleOptions): { corners: Vec2[]; fill: Fill }[] {
  if (mark.kind !== 'path') return [];
  const pieces: { corners: Vec2[]; fill: Fill }[] = [];
  if (mark.fill) {
    pieces.push({ corners: trianglesOf(mark.path, { ...options, rule: mark.fill.rule }), fill: mark.fill });
  }
  if (mark.stroke) {
    pieces.push({ corners: strokeTrianglesOf(mark.path, mark.stroke, options), fill: { colour: mark.stroke.colour } });
  }
  const box = mark.clip;
  if (!box) return pieces;
  return pieces.map((piece) => ({ corners: clipTriangles(piece.corners, box), fill: piece.fill }));
}

/**
 * A vertex buffer holding every mark's triangles, in the order they are painted.
 *
 * A position reaches the buffer in clip space, which runs from minus one to one
 * across and up, so the y axis turns over: a figure's view maps onto a picture
 * whose y counts down the way an SVG viewBox does.
 *
 * A gradient is read at the figure-unit position rather than the clip-space one,
 * since a gradient's axis is in the mark's own units.
 */
function vertexData(marks: readonly Mark[], view: Transform2D, options: GpuFrameOptions): {
  data: Uint8Array<ArrayBuffer>;
  count: number;
  refused: string[];
} {
  const numbers: number[] = [];
  const refused: string[] = [];
  for (const mark of marks) {
    // A text mark carries no outline and a card has no text vocabulary, and a
    // dashed stroke is widened solid because nothing here turns a dash into
    // geometry. Both differ from what the other two painters draw.
    if (mark.kind === 'text' || (mark.kind === 'path' && mark.stroke?.dash)) refused.push(mark.id);
    const pieces = trianglesFor(mark, options);
    if (pieces.length === 0 || pieces.every((piece) => piece.corners.length === 0)) continue;
    const opacity = mark.opacity ?? 1;
    for (const piece of pieces) {
      for (const corner of piece.corners) {
        const drawn = mat3.transformPoint(view, corner);
        const shade = shadeOf(piece.fill, corner, opacity);
        numbers.push((2 * drawn.x) / options.width - 1, 1 - (2 * drawn.y) / options.height, ...shade);
      }
    }
  }
  const data = new Uint8Array(new ArrayBuffer(numbers.length * 4));
  new Float32Array(data.buffer).set(numbers);
  return { data, count: numbers.length / 6, refused };
}

/** The WGSL a card draws the frame with: a position straight through to clip
 * space and a colour straight through to the target. */
const WGSL = `struct Vertex {
  @location(0) position: vec2f,
  @location(1) shade: vec4f,
};

struct Painted {
  @builtin(position) clip: vec4f,
  @location(0) shade: vec4f,
};

@vertex
fn vertexMain(vertex: Vertex) -> Painted {
  var painted: Painted;
  painted.clip = vec4f(vertex.position, 0.0, 1.0);
  painted.shade = vertex.shade;
  return painted;
}

@fragment
fn fragmentMain(painted: Painted) -> @location(0) vec4f {
  return painted.shade;
}
`;

/** The same two stages in GLSL ES 3.00, which is what lets a device with no
 * WebGPU draw the frame on WebGL 2. */
const GLSL_VERTEX = `#version 300 es
layout(location = 0) in vec2 position;
layout(location = 1) in vec4 shade;
out vec4 painted;

void main() {
  painted = shade;
  gl_Position = vec4(position, 0.0, 1.0);
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

/** The colour the target already holds kept in the share the new colour's alpha
 * leaves, which is the painter's algorithm written as a blend. */
const OVER = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
} as const;

/** Four channels of a byte each, which is the format a page's own colour buffer
 * holds and what a resolved picture is presented as. */
const FORMAT = 'rgba8unorm';

/**
 * A handle is the index of the thing it names, and the engine's own builders are
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
  const { data, count, refused } = vertexData(marks, view, options);

  const geometry: VertexResource = {
    kind: 'vertices',
    stride: STRIDE,
    attributes: [
      { location: 0, offset: 0, format: 'float32x2' },
      { location: 1, offset: 8, format: 'float32x4' },
    ],
    topology: 'triangle-list',
    count,
    data,
  };

  const multisampled: TextureHandle = handle(0);
  const presented: TextureHandle = handle(1);
  const painted: VertexHandle = handle(2);
  const pipeline: PipelineHandle = handle(0);

  const frame: FrameGraph = {
    id: 'altpsyche-marks',
    authored: 'wgsl',
    // The GLSL below is the baked translation of the WGSL above, so a device with
    // no WebGPU draws the same frame on WebGL 2 rather than being refused.
    translated: true,
    requires: ['msaa'],
    modules: [],
    resources: [
      { kind: 'texture', size: { scale: 1 }, format: FORMAT, use: ['attachment'], samples: 4 },
      { kind: 'texture', size: { scale: 1 }, format: FORMAT, use: ['attachment', 'sample'] },
      geometry,
    ],
    pipelines: [
      {
        kind: 'render',
        source: {
          wgsl: { vertex: WGSL, fragment: WGSL },
          glsl: { vertex: GLSL_VERTEX, fragment: GLSL_FRAGMENT },
        },
        vertex: { document: DOCUMENT, entry: 'vertexMain' },
        fragment: { document: DOCUMENT, entry: 'fragmentMain' },
        geometry: painted,
        bindings: [],
        targets: [{ format: FORMAT, blend: OVER }],
        samples: 4,
      },
    ],
    passes: [
      {
        pipeline,
        draws: [{ vertices: count }],
        colour: [
          {
            resource: multisampled,
            clear: [...(options.clear ?? NOTHING)] as [number, number, number, number],
            resolve: presented,
          },
        ],
      },
    ],
    present: presented,
  };

  return { frame, triangles: count / 3, bytes: data.byteLength, refused };
}
