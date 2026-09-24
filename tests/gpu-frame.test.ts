import { describe, expect, it } from 'vitest';
import { cost, resolve, webgl2Capabilities, webgpuCapabilities } from '@altpsyche/engine';
import {
  circle,
  colourFrom,
  gpuFrame,
  interval,
  line,
  marksAt,
  mat3,
  rect,
  shippedFont,
  textOutlines,
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

/** Every vertex of a frame's first vertex buffer, seven numbers to a vertex. */
function vertices(built: ReturnType<typeof gpuFrame>): Float32Array {
  const geometry = built.frame.resources.find((resource) => resource.kind === 'vertices');
  if (!geometry || geometry.kind !== 'vertices' || !geometry.data) throw new Error('no vertex data');
  return new Float32Array(geometry.data.buffer);
}

/** One vertex read back as its position, its four channels and its depth. */
function vertexAt(built: ReturnType<typeof gpuFrame>, at: number): number[] {
  return [...vertices(built).slice(at * 7, at * 7 + 7)];
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
      expect(Math.abs(corners[at * 7])).toBeCloseTo(1, 12);
      expect(Math.abs(corners[at * 7 + 1])).toBeCloseTo(1, 12);
    }
    expect(vertexAt(built, 0).slice(2, 6)).toEqual([1, 0, 0, 1]);
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
    const highest = Math.max(...Array.from({ length: 6 }, (_, at) => corners[at * 7 + 1]));
    const lowest = Math.min(...Array.from({ length: 6 }, (_, at) => corners[at * 7 + 1]));
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
      const left = corners[at * 7] < 0;
      expect(corners[at * 7 + 2]).toBeCloseTo(left ? 0 : 1, 6);
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

  it('refuses nothing where the labels were outlined before the frame was built', async () => {
    const font = await shippedFont();
    // A card has no font, so the painter outlines a label before it builds a
    // frame. What gpuFrame refuses is text it is handed itself, which is what a
    // caller building a frame with no font hands it.
    const marks = marksAt(tangent, 5, WIDTH / HEIGHT);
    const plain = gpuFrame(marks, viewAt(tangent, 5, WIDTH, HEIGHT), { width: WIDTH, height: HEIGHT });
    const lettered = gpuFrame(textOutlines(marks, font), viewAt(tangent, 5, WIDTH, HEIGHT), {
      width: WIDTH,
      height: HEIGHT,
    });
    expect(plain.refused.length).toBeGreaterThan(0);
    expect(lettered.refused).toEqual([]);
    expect(lettered.triangles).toBeGreaterThan(plain.triangles);
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
    for (let at = 0; at * 7 < corners.length; at += 1) expect(corners[at * 7]).toBeLessThanOrEqual(0);
    // A scissor is pass state, so a frame using one would carry a pass per run of
    // marks sharing a box rather than one pass over every mark.
    expect(built.frame.passes).toHaveLength(1);
    expect(built.frame.passes[0]).not.toHaveProperty('scissor');
  });

  it('cuts a path clip into the geometry, inside the rectangle as well', () => {
    const clipped: Mark = {
      kind: 'path',
      id: 'clipped',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#000') },
      clip: { x: interval(0, 1), y: interval(0, 2) },
      clipPath: circle(vec2(1, 1), 0.5),
    };
    // The disc's centre is the middle of the frame, which is clip space's origin.
    const corners = vertices(gpuFrame([clipped], straight, TINY));
    expect(corners.length).toBeGreaterThan(0);
    for (let at = 0; at * 7 < corners.length; at += 1) {
      const [x, y] = [corners[at * 7], corners[at * 7 + 1]];
      expect(x).toBeLessThanOrEqual(1e-6);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });

  it('holds every mark in the order it was painted, which is what carries depth', () => {
    const under: Mark = { kind: 'path', id: 'under', path: rect(vec2(0, 0), 2, 2), fill: { colour: colourFrom('#ff0000') } };
    const over: Mark = { kind: 'path', id: 'over', path: rect(vec2(0, 0), 2, 2), fill: { colour: colourFrom('#00ff00') } };
    const built = gpuFrame([under, over], straight, TINY);
    expect(built.triangles).toBe(4);
    expect(vertexAt(built, 0).slice(2, 6)).toEqual([1, 0, 0, 1]);
    expect(vertexAt(built, 6).slice(2, 6)).toEqual([0, 1, 0, 1]);
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

  it('negates clip-space y in the baked stage, so both backends draw the same way up', () => {
    // A baked translation is read as carrying the negation the top-left origin
    // needs, and the backend inverts the winding to match rather than flipping
    // the picture back afterwards.
    const built = gpuFrame([], straight, TINY);
    const pipeline = built.frame.pipelines[0];
    const vertex = pipeline.kind === 'render' && 'wgsl' in pipeline.source ? pipeline.source.glsl?.vertex : undefined;
    expect(vertex).toContain('-position.y');
  });
});

describe('a figure that carries depth', () => {
  const square = (id: string, colour: string, depth?: { a: number; b: number; c: number }): Mark => ({
    kind: 'path',
    id,
    path: rect(vec2(0, 0), 2, 2),
    fill: { colour: colourFrom(colour) },
    ...(depth ? { depth } : {}),
  });

  /** The depth each vertex of a frame carries, which is the seventh number. */
  function depths(built: ReturnType<typeof gpuFrame>): number[] {
    const all = vertices(built);
    return Array.from({ length: all.length / 7 }, (_, at) => all[at * 7 + 6]);
  }

  it('names no depth attachment where no mark carries one', () => {
    const built = gpuFrame([square('flat', '#ff0000')], straight, TINY);
    expect(built.frame.resources.filter((resource) => resource.kind === 'texture')).toHaveLength(2);
    expect(built.frame.passes).toHaveLength(1);
    const pass = built.frame.passes[0];
    expect('draws' in pass && pass.depth).toBeUndefined();
    const pipeline = built.frame.pipelines[0];
    expect(pipeline.kind === 'render' && pipeline.depth).toBeUndefined();
  });

  it('tests and writes the depth for a mark that carries one', () => {
    const built = gpuFrame([square('deep', '#ff0000', { a: 0, b: 0, c: 1 })], straight, TINY);
    const depth = built.frame.resources.find(
      (resource) => resource.kind === 'texture' && String(resource.format).startsWith('depth')
    );
    expect(depth && depth.kind === 'texture' && depth.samples).toBe(4);
    const pipeline = built.frame.pipelines[0];
    expect(pipeline.kind === 'render' && pipeline.depth).toEqual({
      format: 'depth24plus',
      compare: 'less-equal',
      write: true,
    });
    const pass = built.frame.passes[0];
    expect('draws' in pass && pass.depth?.clear).toBe(1);
  });

  it('keeps the nearer mark at the smaller number, which is what less-equal reads', () => {
    const near = square('near', '#ff0000', { a: 0, b: 0, c: -4 });
    const far = square('far', '#00ff00', { a: 0, b: 0, c: 7 });
    const built = gpuFrame([near, far], straight, TINY);
    const written = depths(built);
    // Six corners each, the first mark's then the second's.
    expect(Math.max(...written.slice(0, 6))).toBeLessThan(Math.min(...written.slice(6)));
    // Both ends are held inside the range the card keeps, since a value on a
    // clipping plane is a vertex the card may drop.
    for (const value of written) {
      expect(value).toBeGreaterThanOrEqual(0.05);
      expect(value).toBeLessThanOrEqual(0.95);
    }
  });

  it('rescales every mark against one pair of ends, so the order is the depths own', () => {
    // A depth that changes across the page against one that does not: the sloped
    // mark is nearer on the left and further on the right, and the rescale has to
    // keep that crossing rather than flatten each mark against its own ends.
    const sloped = square('sloped', '#ff0000', { a: 4, b: 0, c: 0 });
    const level = square('level', '#00ff00', { a: 0, b: 0, c: 4 });
    const built = gpuFrame([sloped, level], straight, TINY);
    const all = vertices(built);
    // The square spans two figure units from the origin, so the sloped mark runs
    // from a depth of nothing to one of eight and the level mark sits at four,
    // which is the middle of the pair of ends the whole frame is held against.
    for (let at = 0; at * 7 < all.length; at += 1) {
      const acrossTheFigure = all[at * 7] + 1;
      const value = all[at * 7 + 6];
      if (at < 6) expect(value).toBeCloseTo(0.05 + ((4 * acrossTheFigure) / 8) * 0.9, 6);
      else expect(value).toBeCloseTo(0.5, 6);
    }
    // The sloped mark is nearer than the level one on one side and further on the
    // other, which is the crossing a single pair of ends is what preserves.
    const slopedValues = Array.from({ length: 6 }, (_, at) => all[at * 7 + 6]);
    expect(Math.min(...slopedValues)).toBeLessThan(0.5);
    expect(Math.max(...slopedValues)).toBeGreaterThan(0.5);
  });

  it('parts the list into a pass for each stretch, since a flat mark clears the depths', () => {
    const built = gpuFrame(
      [
        square('deep one', '#ff0000', { a: 0, b: 0, c: 1 }),
        square('flat', '#00ff00'),
        square('deep two', '#0000ff', { a: 0, b: 0, c: 2 }),
      ],
      straight,
      TINY
    );
    expect(built.frame.passes).toHaveLength(3);
    expect(built.frame.pipelines).toHaveLength(3);
    const tested = built.frame.passes.map((pass) => ('draws' in pass ? pass.depth !== undefined : false));
    expect(tested).toEqual([true, false, true]);
    // Each stretch empties the attachment, so what a stretch draws is never
    // tested against what a stretch before the flat mark drew.
    for (const pass of built.frame.passes) {
      if ('draws' in pass && pass.depth) expect(pass.depth.clear).toBe(1);
    }
  });

  it('opens on the ground once and averages its samples in every pass', () => {
    const built = gpuFrame(
      [square('deep', '#ff0000', { a: 0, b: 0, c: 1 }), square('flat', '#00ff00')],
      straight,
      { ...TINY, clear: [1, 1, 1, 1] }
    );
    expect(built.frame.passes).toHaveLength(2);
    const colours = built.frame.passes.map((pass) => ('draws' in pass ? pass.colour?.[0] : undefined));
    expect(colours[0]?.clear).toEqual([1, 1, 1, 1]);
    // A later pass naming a clear would empty what the pass before it drew.
    expect(colours[1]?.clear).toBeUndefined();
    // Both passes average their samples, since a pass writing an attachment of
    // several samples and averaging them nowhere is refused by both backends.
    expect(colours[0]?.resolve).toBe(1);
    expect(colours[1]?.resolve).toBe(1);
  });

  it('writes the middle of the range for a mark carrying no depth', () => {
    const built = gpuFrame([square('flat', '#ff0000')], straight, TINY);
    for (const value of depths(built)) expect(value).toBe(0.5);
  });

  it('writes a stroke ahead of the fill it goes round, which is what it covers', () => {
    const both: Mark = {
      kind: 'path',
      id: 'both',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#ff0000') },
      stroke: { colour: colourFrom('#0000ff'), width: 0.2 },
      depth: { a: 0, b: 0, c: 1 },
    };
    const written = depths(gpuFrame([both], straight, TINY));
    // The fill's corners come first and the stroke's after them, and the two sit
    // at one depth, which the card interpolates across two different sets of
    // triangles and answers differently in the last bits.
    const fill = written.slice(0, 6);
    const stroke = written.slice(6);
    expect(stroke.length).toBeGreaterThan(0);
    for (const value of stroke) expect(value).toBeLessThan(fill[0]);
    // The buffer holds 32-bit floats, so the step back is read to that width.
    for (const value of stroke) expect(fill[0] - value).toBeCloseTo(1e-4, 8);
  });

  it('leaves a stroke with no fill at the depth it was given', () => {
    const alone: Mark = {
      kind: 'path',
      id: 'alone',
      path: line(vec2(0, 0), vec2(2, 2)),
      stroke: { colour: colourFrom('#0000ff'), width: 0.2 },
      depth: { a: 0, b: 0, c: 1 },
    };
    const flat: Mark = {
      kind: 'path',
      id: 'flat',
      path: rect(vec2(0, 0), 2, 2),
      fill: { colour: colourFrom('#ff0000') },
      depth: { a: 0, b: 0, c: 1 },
    };
    // One depth across the pair, so both land at the near end of the range and
    // nothing is moved for want of a fill to cover.
    const written = depths(gpuFrame([alone, flat], straight, TINY));
    for (const value of written) expect(value).toBeCloseTo(0.05, 7);
  });

  it('carries the depth through both stages, so either backend reads it', () => {
    const built = gpuFrame([square('deep', '#ff0000', { a: 0, b: 0, c: 1 })], straight, TINY);
    const pipeline = built.frame.pipelines[0];
    const source = pipeline.kind === 'render' && 'wgsl' in pipeline.source ? pipeline.source : undefined;
    expect(source?.wgsl.vertex).toContain('@location(2) depth: f32');
    // WGSL keeps clip-space depth from nothing to one and GLSL from minus one to
    // one, so the baked stage carries the number across that difference.
    expect(source?.glsl?.vertex).toContain('depth * 2.0 - 1.0');
  });
});

describe('the demos as a frame description', () => {
  it('resolves the flat demo to a backend and costs one pass and one draw', () => {
    const built = frameOf(tangent, 5);
    expect(built.triangles).toBe(1596);
    // Two coordinates, four channels and one depth to a vertex, four bytes each.
    expect(built.bytes).toBe(built.triangles * 3 * 28);
    expect(built.bytes).toBe(134064);
    // Every text mark of the flat demo at 5 seconds, and nothing else.
    expect(built.refused).toHaveLength(24);

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

  it('resolves the solid demo to a backend and costs a pass for each of its stretches', () => {
    const built = frameOf(solid, 6);
    expect(built.triangles).toBe(2140);
    expect(built.bytes).toBe(179760);
    expect(built.refused).toHaveLength(21);

    const spent = cost(built.frame, { width: WIDTH, height: HEIGHT });
    // The demo's marks fall into four runs, since the marks carrying no depth
    // part the ones that do, and each run is a pass that empties the depth
    // attachment and a pipeline naming its own vertices.
    expect(spent.passes).toBe(4);
    expect(spent.draws).toBe(4);
    expect(built.frame.pipelines).toHaveLength(4);
    // The two colour textures as before, and the depth beside them at four
    // samples and four bytes: 1080 by 600 by 4 by 4.
    expect(spent.transientBytes).toBe(12960000 + 10368000);

    expect(resolve(built.frame, everything)).toEqual({ backend: 'webgpu' });
    expect(resolve(built.frame, { webgpu: null, webgl2: webgl2Capabilities([]) })).toEqual({ backend: 'webgl2' });
  });

  it('asks only for a smooth edge, which both backends have', () => {
    expect(frameOf(tangent, 5).frame.requires).toEqual(['msaa']);
  });
});

/**
 * A curve is flattened to a share of a pixel rather than to a share of a figure
 * unit, so the same circle costs what the picture it is drawn into needs.
 *
 * The tolerance a caller names is in the figure's own units and what it buys is a
 * smooth edge in pixels, and those are the same number only where a unit covers
 * one pixel. A figure drawn small flattened as though it were drawn large, which
 * is triangles nothing on the screen can tell apart.
 */
describe('the flattening a frame chooses', () => {
  const dot = (at: number): Mark[] => [
    { kind: 'path', id: `dot-${at}`, path: circle(vec2(0, 0), 1), fill: { colour: colourFrom('#ffffff') } },
  ];

  const trianglesAt = (pixelsPerUnit: number) =>
    gpuFrame(dot(0), mat3.scaling(vec2(pixelsPerUnit, pixelsPerUnit)), { width: 400, height: 400 }).triangles;

  it('costs fewer triangles the smaller the picture is drawn', () => {
    const large = trianglesAt(100);
    const small = trianglesAt(10);
    expect(small).toBeLessThan(large);
    // Ten times fewer pixels across the same curve is a coarser flattening, and
    // the count follows the square root of the tolerance for a circle.
    expect(large / small).toBeGreaterThan(2);
  });

  it('keeps a tolerance the caller names', () => {
    const named = gpuFrame(dot(0), mat3.scaling(vec2(10, 10)), { width: 400, height: 400, tolerance: 0.5 }).triangles;
    expect(named).toBeLessThan(trianglesAt(10));
  });

  it('flattens a view that collapses the plane rather than refusing it', () => {
    const flat = gpuFrame(dot(0), mat3.scaling(vec2(0, 0)), { width: 400, height: 400 });
    expect(flat.triangles).toBeGreaterThan(0);
  });
});
