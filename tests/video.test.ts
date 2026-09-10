import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { videoSink } from '@altpsyche/maths';
import type { CanvasSurface } from '@altpsyche/maths';

/**
 * The encoder's sink, held to what can be held without a device.
 *
 * Encoding needs WebCodecs and Node has none, so the bytes are a browser gate.
 * What the suite holds is that the library is reached by the call that needs it
 * and by nothing else, and that a canvas with no context is refused before the
 * library is loaded at all.
 */

const source = readFileSync(path.resolve(import.meta.dirname, '../paint/video.ts'), 'utf8');

const contextless: CanvasSurface = { width: 320, height: 200, getContext: () => null };

describe('videoSink', () => {
  it('names the encoder only inside the call that loads it', () => {
    const mentions = [...source.matchAll(/mediabunny/g)];
    expect(mentions.length).toBeGreaterThan(0);
    // A static import would cost the library to every consumer who never
    // records, since a module names its imports before it runs a line.
    expect(source).not.toMatch(/^\s*import[^\n]*'mediabunny'/m);
    expect([...source.matchAll(/await import\('mediabunny'\)/g)]).toHaveLength(1);
  });

  it('is the only file in the package that names the encoder', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const others = ['index.ts', 'paint/record.ts', 'paint/canvas.ts', 'figure/frames.ts'];
    for (const file of others) {
      expect(readFileSync(path.join(root, file), 'utf8'), file).not.toMatch(/mediabunny/);
    }
  });

  it('refuses a canvas with no context before it loads anything', async () => {
    await expect(videoSink(contextless, { fps: 30 })).rejects.toThrow(
      'the canvas handed to videoSink has no 2d context'
    );
  });
});
