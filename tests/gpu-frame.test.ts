import { describe, expect, it } from 'vitest';
import { cost, resolve, webgl2Capabilities, webgpuCapabilities } from '@altpsyche/engine';
import {
  colourFrom,
  gpuFrame,
  interval,
  line,
  marksAt,
  mat3,
  rect,
  vec2,
  viewAt,
} from '@altpsyche/maths';
import type { Mark } from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { solid } from '../demos/surface.js';

/**
 * The marks of a figure as the engine's own frame description.
 *
 * Everything here is a reading of a value. The engine's `resolve` and `cost` are
 * pure functions of a frame description, so which backend would draw a figure and
 * how many passes and draws it costs are answered with no device anywhere, which
 * is the whole of this step's claim.
 */

/** The frame the demos are written into, which is what their stills and strips
 * are drawn at. */
const WIDTH = 1080;
const HEIGHT = 600;

/** A frame two pixels each way, where a figure unit and a clip-space unit line up
 * and a coordinate can be read by eye. */
const TINY = { width: 2, height: 2 };

const straight = mat3.scaling(vec2(1, 1));

/** Every vertex of a frame's one vertex buffer, six numbers to a vertex. */
function vertices(built: ReturnType<typeof gpuFrame>): Float32Array {
  const geometry = built.frame.resources.find((resource) => resource.kind === 'vertices');
  if (!geometry || geometry.kind !== 'vertices' || !geometry.data) throw new Error('no vertex data');
  return new Float32Array(geometry.data.buffer);
}

/** One vertex read back as its position and its four channels. */
function vertexAt(built: ReturnType<typeof gpuFrame>, at: number): number[] {
  return [...vertices(built).slice(at * 6, at * 6 + 6)];
}

function frameOf(figure: Parameters<typeof marksAt>[0], seconds: number) {
  return gpuFrame(marksAt(figure, seconds, WIDTH / HEIGHT), viewAt(figure, seconds, WIDTH, HEIGHT), {
    width: WIDTH,
    height: HEIGHT,
  });
}

const everything = { webgpu: webgpuCapabilities([]), webgl2: webgl2Capabilities([]) };

describe('gpuFrame', () => {
  it('writes a square onto the corners of clip space', () => {
    const square: Mark = {
      kind: 'path',
      id: 'square',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#ff0000') },
    };
    const built = gpuFrame([square], straight, TINY);
    expect(built.triangles).toBe(2);
    const corners = vertices(built);
    // Clip space runs from minus one to one both ways and its y counts up, where
    // the view's y counts down, so the square's four corners are the frame's.
    for (let at = 0; at < 6; at += 1) {
      expect(Math.abs(corners[at * 6])).toBeCloseTo(1, 12);
      expect(Math.abs(corners[at * 6 + 1])).toBeCloseTo(1, 12);
    }
    expect(vertexAt(built, 0).slice(2)).toEqual([1, 0, 0, 1]);
  });

  it('turns the y axis over rather than leaving it counting down', () => {
    const along: Mark = {
      kind: 'path',
      id: 'along',
      path: rect(vec2(0, 0), 2, 1),
      fill: { colour: colourFrom('#000') },
    };
    const built = gpuFrame([along], straight, TINY);
    const corners = vertices(built);
    const highest = Math.max(...Array.from({ length: 6 }, (_, at) => corners[at * 6 + 1]));
    const lowest = Math.min(...Array.from({ length: 6 }, (_, at) => corners[at * 6 + 1]));
    // The rectangle covers the top half of the view, which is the top half of
    // clip space rather than the bottom.
    expect(highest).toBeCloseTo(1, 12);
    expect(lowest).toBeCloseTo(0, 12);
  });

  it('multiplies a mark opacity into the alpha it writes', () => {
    const half: Mark = {
      kind: 'path',
      id: 'half',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#000') },
      opacity: 0.25,
    };
    expect(vertexAt(gpuFrame([half], straight, TINY), 0)[5]).toBeCloseTo(0.25, 12);
  });

  it('reads a gradient of two stops at each vertex, which draws it exactly', () => {
    const ramp: Mark = {
      kind: 'path',
      id: 'ramp',
      path: rect(vec2(0, 0), 2, 2),
      fill: {
        colour: colourFrom('#000'),
        gradient: {
          from: vec2(0, 0),
          to: vec2(2, 0),
          stops: [
            { offset: 0, colour: colourFrom('#000000') },
            { offset: 1, colour: colourFrom('#ffffff') },
          ],
        },
      },
    };
    const built = gpuFrame([ramp], straight, TINY);
    const corners = vertices(built);
    // A colour that changes affinely with position is interpolated exactly across
    // a triangle, so the two ends of the axis are the only readings needed: a
    // vertex on the left of the square is black and one on the right is white.
    for (let at = 0; at < 6; at += 1) {
      const left = corners[at * 6] < 0;
      expect(corners[at * 6 + 2]).toBeCloseTo(left ? 0 : 1, 6);
    }
  });

  it('names every text mark as refused, since a card has no text vocabulary', () => {
    const label: Mark = {
      kind: 'text',
      id: 'label',
      at: vec2(0, 0),
      text: 'x',
      size: 0.2,
      family: 'serif',
      fill: { colour: colourFrom('#000') },
    };
    const built = gpuFrame([label], straight, TINY);
    expect(built.refused).toEqual(['label']);
    expect(built.triangles).toBe(0);
  });

  it('draws a dashed stroke as its runs and refuses nothing for it', () => {
    const dashed: Mark = {
      kind: 'path',
      id: 'dashed',
      path: line(vec2(0, 0), vec2(2, 0)),
      stroke: { colour: colourFrom('#000'), width: 0.2, dash: [0.2, 0.2] },
    };
    const built = gpuFrame([dashed], straight, TINY);
    expect(built.refused).toEqual([]);
    // Five runs of a fifth over two units, each a rectangle of two triangles.
    expect(built.triangles).toBe(10);
  });

  it('cuts a clip into the geometry rather than naming a scissor', () => {
    const clipped: Mark = {
      kind: 'path',
      id: 'clipped',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#000') },
      clip: { x: interval(0, 1), y: interval(0, 2) },
    };
    const built = gpuFrame([clipped], straight, TINY);
    const corners = vertices(built);
    // Half the square is cut away, so no vertex reaches the right of the middle.
    for (let at = 0; at * 6 < corners.length; at += 1) expect(corners[at * 6]).toBeLessThanOrEqual(0);
  });

  it('holds every mark in the order it was painted, which is what carries depth', () => {
    const under: Mark = { kind: 'path', id: 'under', path: rect(vec2(0, 0), 2, 2), fill: { colour: colourFrom('#ff0000') } };
    const over: Mark = { kind: 'path', id: 'over', path: rect(vec2(0, 0), 2, 2), fill: { colour: colourFrom('#00ff00') } };
    const built = gpuFrame([under, over], straight, TINY);
    expect(built.triangles).toBe(4);
    expect(vertexAt(built, 0).slice(2)).toEqual([1, 0, 0, 1]);
    expect(vertexAt(built, 6).slice(2)).toEqual([0, 1, 0, 1]);
  });

  it('owns its attachment, since a pass on the frame itself may name no blend', () => {
    const built = gpuFrame([], straight, TINY);
    const [attachment, resolved] = built.frame.resources;
    expect(attachment.kind === 'texture' && attachment.samples).toBe(4);
    expect(resolved.kind === 'texture' && resolved.samples).toBeUndefined();
    const pass = built.frame.passes[0];
    expect('draws' in pass && pass.colour?.[0].resolve).toBe(1);
    expect(built.frame.present).toBe(1);
    const pipeline = built.frame.pipelines[0];
    expect(pipeline.kind === 'render' && pipeline.samples).toBe(4);
    expect(pipeline.kind === 'render' && pipeline.targets?.[0].blend).toBeDefined();
  });

  it('carries a baked translation, so a device with no WebGPU is not refused', () => {
    const built = gpuFrame([], straight, TINY);
    expect(built.frame.authored).toBe('wgsl');
    expect(built.frame.translated).toBe(true);
    const pipeline = built.frame.pipelines[0];
    expect(pipeline.kind === 'render' && 'wgsl' in pipeline.source && pipeline.source.glsl).toBeDefined();
  });
});

describe('the demos as a frame description', () => {
  it('resolves the flat demo to a backend and costs one pass and one draw', () => {
    const built = frameOf(tangent, 5);
    expect(built.triangles).toBe(1489);
    // Two coordinates and four channels to a vertex, four bytes each.
    expect(built.bytes).toBe(built.triangles * 3 * 24);
    expect(built.bytes).toBe(107208);
    // Every text mark of the flat demo at 5 seconds, and nothing else.
    expect(built.refused).toHaveLength(23);

    const spent = cost(built.frame, { width: WIDTH, height: HEIGHT });
    expect(spent.passes).toBe(1);
    expect(spent.draws).toBe(1);
    expect(spent.dispatches).toBe(0);
    // One attachment of four samples and the texture it resolves into, at four
    // bytes to a pixel: 1080 by 600 by 4 by 5.
    expect(spent.transientBytes).toBe(12960000);

    expect(resolve(built.frame, everything)).toEqual({ backend: 'webgpu' });
    expect(resolve(built.frame, { webgpu: null, webgl2: webgl2Capabilities([]) })).toEqual({ backend: 'webgl2' });
    expect(resolve(built.frame, { webgpu: null, webgl2: null })).toEqual({
      refusal: 'no backend can draw a wgsl frame: WebGPU returned no adapter on this device',
    });
  });

  it('resolves the solid demo to a backend and costs one pass and one draw', () => {
    const built = frameOf(solid, 6);
    expect(built.triangles).toBe(2145);
    expect(built.bytes).toBe(154440);
    expect(built.refused).toHaveLength(21);

    const spent = cost(built.frame, { width: WIDTH, height: HEIGHT });
    expect(spent.passes).toBe(1);
    expect(spent.draws).toBe(1);
    expect(spent.transientBytes).toBe(12960000);

    expect(resolve(built.frame, everything)).toEqual({ backend: 'webgpu' });
    expect(resolve(built.frame, { webgpu: null, webgl2: webgl2Capabilities([]) })).toEqual({ backend: 'webgl2' });
  });

  it('asks only for a smooth edge, which both backends have', () => {
    expect(frameOf(tangent, 5).frame.requires).toEqual(['msaa']);
  });
});
