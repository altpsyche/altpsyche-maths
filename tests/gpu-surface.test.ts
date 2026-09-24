import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gpuSurface, paintGpu, pixelsGpu, rect, colourFrom, mat3, vec2 } from '@altpsyche/maths';
import type { GpuCanvas, GpuDevice, Mark } from '@altpsyche/maths';

/**
 * The surface's hold on its card, read against an engine that counts what it is
 * asked for, since a device and a lost card are what Node has neither of.
 */

const engine = vi.hoisted(() => ({
  opened: [] as { backend?: string; device?: unknown }[],
  draws: 0,
  disposed: 0,
  requested: [] as unknown[],
  offer: null as unknown,
}));

vi.mock('@altpsyche/engine', () => ({
  requestWebGPUDevice: async () => {
    engine.requested.push(engine.offer);
    return engine.offer;
  },
  glslFrameOf: (frame: unknown) => frame,
  openRenderer: async (_canvas: unknown, _frame: unknown, options: { backend?: string; device?: unknown }) => {
    engine.opened.push(options);
    return {
      renderer: {
        backend: options.device ? 'webgpu' : 'webgl2',
        resize: () => {},
        draw: () => {
          engine.draws += 1;
        },
        frame: async () => new Uint8Array(),
        dispose: () => {
          engine.disposed += 1;
        },
      },
    };
  },
}));

function canvas(): GpuCanvas {
  return { width: 8, height: 8, getContext: () => null };
}

type Card = GpuDevice & { destroyed: number; lose: (reason: 'destroyed' | 'unknown') => void };

/** A device whose `lost` settles when the test says, and on `destroy`, as a
 * WebGPU device's does. */
function card(): Card {
  let settle: (info: { reason: 'destroyed' | 'unknown' }) => void = () => {};
  const lost = new Promise<{ reason: 'destroyed' | 'unknown' }>((resolve) => {
    settle = resolve;
  });
  const device: Card = {
    destroyed: 0,
    lost,
    lose: (reason) => settle({ reason }),
    destroy: () => {
      device.destroyed += 1;
      settle({ reason: 'destroyed' });
    },
  };
  return device;
}

/** Lets every settled promise run its callbacks. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const straight = mat3.scaling(vec2(1, 1));

const square: Mark = {
  kind: 'path',
  id: 'square',
  path: rect(vec2(0, 0), 1, 1),
  fill: { colour: colourFrom('#000') },
};

beforeEach(() => {
  engine.opened = [];
  engine.draws = 0;
  engine.disposed = 0;
  engine.requested = [];
  engine.offer = null;
});

describe('gpuSurface and its device', () => {
  it('draws with the device the caller passes and returns it', async () => {
    const device = card();
    const surface = await gpuSurface(canvas(), { device });
    expect(engine.requested).toHaveLength(0);
    expect(engine.opened[0].device).toBe(device);
    expect(surface?.device).toBe(device);
    expect(surface?.backend).toBe('webgpu');
  });

  it('leaves a device the caller passed alive on dispose', async () => {
    const device = card();
    const surface = await gpuSurface(canvas(), { device });
    surface?.dispose();
    expect(engine.disposed).toBe(1);
    expect(device.destroyed).toBe(0);
  });

  it('asks for a device where none is passed, and destroys it on dispose', async () => {
    const asked = card();
    engine.offer = asked;
    const surface = await gpuSurface(canvas());
    expect(engine.requested).toHaveLength(1);
    expect(engine.opened[0].device).toBe(asked);
    expect(surface?.device).toBe(asked);
    surface?.dispose();
    expect(asked.destroyed).toBe(1);
  });

  it('narrows the door to WebGL 2 where no device comes back', async () => {
    const surface = await gpuSurface(canvas());
    expect(engine.requested).toHaveLength(1);
    expect(engine.opened[0]).toMatchObject({ backend: 'webgl2' });
    expect(engine.opened[0].device).toBeUndefined();
    expect(surface?.backend).toBe('webgl2');
    expect(surface?.device).toBeUndefined();
  });

  it('asks for no device where the caller named WebGL 2', async () => {
    const surface = await gpuSurface(canvas(), { backend: 'webgl2' });
    expect(engine.requested).toHaveLength(0);
    expect(surface?.device).toBeUndefined();
    expect(paintGpu(surface!, [square], straight).refused).toEqual([]);
    expect(engine.draws).toBe(1);
  });
});

describe('a lost device', () => {
  it('calls onLost once with the device reason', async () => {
    const device = card();
    const reasons: string[] = [];
    await gpuSurface(canvas(), { device, onLost: (reason) => reasons.push(reason) });
    device.lose('destroyed');
    device.lose('unknown');
    await settled();
    expect(reasons).toEqual(['destroyed']);
  });

  it('draws nothing after the loss and refuses every mark it is given', async () => {
    const device = card();
    const surface = (await gpuSurface(canvas(), { device }))!;
    const other: Mark = { ...square, id: 'other' };
    expect(paintGpu(surface, [square, other], straight).refused).toEqual([]);
    expect(engine.draws).toBe(1);
    device.lose('unknown');
    await settled();
    const painting = paintGpu(surface, [square, other], straight);
    expect(engine.draws).toBe(1);
    expect(painting).toEqual({ refused: ['square', 'other'], triangles: 0 });
  });

  it('returns a cleared picture of the canvas size from pixelsGpu after the loss', async () => {
    const device = card();
    const surface = (await gpuSurface(canvas(), { device }))!;
    device.lose('destroyed');
    await settled();
    const drawn = await pixelsGpu(surface, [square], straight);
    expect(drawn.pixels).toHaveLength(8 * 8 * 4);
    expect(drawn.pixels.every((byte) => byte === 0)).toBe(true);
    expect(drawn.painting.refused).toEqual(['square']);
  });

  it('never reports a loss after dispose, a caller device lost later included', async () => {
    const device = card();
    const reasons: string[] = [];
    const surface = await gpuSurface(canvas(), { device, onLost: (reason) => reasons.push(reason) });
    surface?.dispose();
    device.lose('unknown');
    await settled();
    expect(reasons).toHaveLength(0);
  });

  it('never reports the loss of a device it asked for and destroyed on dispose', async () => {
    const asked = card();
    engine.offer = asked;
    const reasons: string[] = [];
    const surface = await gpuSurface(canvas(), { onLost: (reason) => reasons.push(reason) });
    surface?.dispose();
    await settled();
    expect(asked.destroyed).toBe(1);
    expect(reasons).toHaveLength(0);
  });
});
