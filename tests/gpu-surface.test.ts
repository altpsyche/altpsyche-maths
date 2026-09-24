import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gpuSurface, paintGpu, rect, colourFrom, mat3, vec2 } from '@altpsyche/maths';
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

function card(): GpuDevice & { destroyed: number } {
  const device = {
    destroyed: 0,
    destroy: () => {
      device.destroyed += 1;
    },
  };
  return device;
}

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
    expect(paintGpu(surface!, [square], mat3.scaling(vec2(1, 1))).refused).toEqual([]);
    expect(engine.draws).toBe(1);
  });
});
