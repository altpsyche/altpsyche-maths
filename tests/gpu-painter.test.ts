import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gpuSurface, paintGpu, pixelsGpu, rect, colourFrom, mat3, vec2 } from '@altpsyche/maths';
import type { GpuCanvas, GpuSurface, Mark } from '@altpsyche/maths';

/**
 * The painter at the door, held to what can be held without a card.
 *
 * What a device draws is a gate with a browser in it. What the suite holds is the
 * refusal path, the error a misused surface gives, and the one-install rule: the
 * built JavaScript names the engine's door nowhere, so a consumer who never draws
 * on a card never loads a renderer.
 */

const root = path.resolve(import.meta.dirname, '..');
const straight = mat3.scaling(vec2(1, 1));

/** A canvas that answers no context, which is every canvas in Node. */
function contextless(size: number): GpuCanvas {
  return { width: size, height: size, getContext: () => null };
}
const square: Mark = {
  kind: 'path',
  id: 'square',
  path: rect(vec2(0, 0), 1, 1),
  fill: { colour: colourFrom('#000') },
};

describe('gpuSurface', () => {
  it('answers nothing and names why where no canvas can give a context', () => {
    // Node has no WebGPU adapter and a canvas of two numbers has no WebGL 2
    // context, so both arms of the choosing run out and the refusal is named
    // rather than thrown.
    const said: string[] = [];
    return gpuSurface(contextless(64), { onRefused: (message) => said.push(message) }).then((surface) => {
      expect(surface).toBeNull();
      expect(said).toHaveLength(1);
      expect(said[0]).toContain('webgl2');
    });
  });

  it('takes a backend the caller has already chosen without asking for a device', async () => {
    const said: string[] = [];
    const surface = await gpuSurface(contextless(8), {
      backend: 'webgl2',
      onRefused: (message) => said.push(message),
    });
    expect(surface).toBeNull();
    expect(said[0]).toBe('the webgl2 backend gave no renderer for this canvas');
  });
});

describe('the painting calls', () => {
  const stranger = { backend: 'webgl2', canvas: contextless(8), dispose: () => {} } as GpuSurface;

  it('refuses a surface it did not make, since only one carries a renderer', () => {
    expect(() => paintGpu(stranger, [square], straight)).toThrow(
      'the surface handed to a GPU painter was not made by gpuSurface'
    );
  });

  it('refuses the same surface when asked for pixels', async () => {
    await expect(pixelsGpu(stranger, [square], straight)).rejects.toThrow(
      'the surface handed to a GPU painter was not made by gpuSurface'
    );
  });
});

describe('the one install', () => {
  it('names the engine in no built JavaScript but the maths door', () => {
    const built = ['dist/paint/gpu.js', 'dist/figure/gpu-frame.js', 'dist/index.js'];
    for (const file of built) {
      const source = readFileSync(path.join(root, file), 'utf8');
      const statics = [...source.matchAll(/(?<!await )import[^;]*from\s*'(@altpsyche\/engine[^']*)'/g)];
      // The arithmetic reaches the engine's maths door and nothing else reaches
      // its main door except the painter's own dynamic import.
      expect(statics.map((match) => match[1])).toEqual([]);
    }
    const painter = readFileSync(path.join(root, 'dist/paint/gpu.js'), 'utf8');
    expect(painter).toContain("await import('@altpsyche/engine')");
  });
});
