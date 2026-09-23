import { describe, expect, it } from 'vitest';
import {
  colourFrom,
  durationOf,
  framesOf,
  paintCanvas,
  paintFrame,
  paintPixels,
  recordFigure,
  recordFrames,
  walkTimesOf,
} from '@altpsyche/maths';
import type { CanvasLike, Figure, Frame, FrameSink, ImageDataLike, WalkTime } from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { solid } from '../demos/surface.js';
import { turns } from '../demos/rotate.js';

/**
 * A figure recorded into a sink that counts what it was handed.
 *
 * A sink is pure, so the frame count, the times the frames are taken at and the
 * calls each one made are held here rather than in a browser. What needs a
 * device is the bytes an encoder writes and nothing else.
 */

const WIDTH = 1080;
const HEIGHT = 600;

/** A context that counts the drawing calls it was asked for rather than drawing
 * them, since a walk of a demo is ninety thousand marks. */
class Counter implements CanvasLike {
  calls = 0;
  /** The last rectangle asked for, which is how the ground is told from a clip:
   * a clip is a rectangle followed by a clip call, and a ground is one followed
   * by a fill. */
  lastRect?: readonly number[];
  globalAlpha = 1;
  fillStyle: unknown = '';
  strokeStyle: unknown = '';
  lineWidth = 1;
  lineCap: CanvasLike['lineCap'] = 'butt';
  lineJoin: CanvasLike['lineJoin'] = 'miter';
  lineDashOffset = 0;
  font = '';
  textAlign: CanvasLike['textAlign'] = 'start';
  textBaseline: CanvasLike['textBaseline'] = 'alphabetic';
  save() {}
  restore() {}
  beginPath() {}
  rect(x: number, y: number, width: number, height: number) {
    this.lastRect = [x, y, width, height];
  }
  clip() {}
  moveTo() {}
  bezierCurveTo() {}
  closePath() {}
  fill() {
    this.calls += 1;
  }
  stroke() {
    this.calls += 1;
  }
  fillText() {
    this.calls += 1;
  }
  setLineDash() {}
}

/** A sink that keeps the time and the length of every frame it took, and the
 * count of the drawing calls those frames made. */
class Taken implements FrameSink<number> {
  readonly context = new Counter();
  readonly times: number[] = [];
  readonly lengths: number[] = [];
  finished = 0;
  cancelled = 0;
  add(seconds: number, duration: number) {
    this.times.push(seconds);
    this.lengths.push(duration);
  }
  finish() {
    this.finished += 1;
    return this.context.calls;
  }
  cancel() {
    this.cancelled += 1;
  }
}

const recorded = (figure: Figure, fps: number) => {
  const sink = new Taken();
  return recordFigure(figure, sink, { fps, width: WIDTH, height: HEIGHT }).then((recording) => ({
    sink,
    recording,
  }));
};

describe('recordFigure', () => {
  it('takes the frames the flat demo walks', async () => {
    expect((await recorded(tangent, 30)).recording.frames).toBe(308);
  });

  it('takes the frames the solid demo walks', async () => {
    expect((await recorded(solid, 30)).recording.frames).toBe(399);
  });

  it('takes 615 frames of the flat demo at twice the rate, rather than 616', async () => {
    // The walk rounds the duration times the rate, so 10.25 seconds at sixty is
    // 615 frames and doubling the count given at thirty would be one too many.
    expect((await recorded(tangent, 60)).recording.frames).toBe(615);
  });

  it('takes 798 frames of the solid demo at twice the rate', async () => {
    expect((await recorded(solid, 60)).recording.frames).toBe(798);
  });

  it('hands each frame the time its index gives, and the length one frame lasts', async () => {
    const { sink, recording } = await recorded(tangent, 30);
    for (const [index, seconds] of sink.times.entries()) {
      expect(Math.abs(seconds - index / 30)).toBeLessThan(1e-12);
      expect(sink.lengths[index]).toBeCloseTo(1 / 30, 15);
    }
    expect(recording.seconds).toBe(durationOf(tangent));
  });

  it('stops strictly before the figure ends, so a loop is never shown twice', async () => {
    const { sink } = await recorded(tangent, 30);
    expect(sink.times[sink.times.length - 1]).toBeLessThan(durationOf(tangent));
    expect(sink.times[sink.times.length - 1] + 1 / 30).toBeGreaterThanOrEqual(durationOf(tangent));
  });

  it('paints each frame exactly as painting it on its own does', async () => {
    const { sink } = await recorded(solid, 30);
    const alone = new Counter();
    for (const frame of framesOf(solid, { fps: 30, width: WIDTH, height: HEIGHT })) {
      paintCanvas(alone, frame.marks, frame.view);
    }
    expect(sink.context.calls).toBe(alone.calls);
  });

  it('finishes the sink once and hands back what it answered', async () => {
    const { sink, recording } = await recorded(tangent, 30);
    expect(sink.finished).toBe(1);
    expect(sink.cancelled).toBe(0);
    expect(recording.output).toBe(sink.context.calls);
  });

  it('counts every frame out to whoever is watching it run', async () => {
    const sink = new Taken();
    const seen: number[] = [];
    let total = 0;
    await recordFigure(tangent, sink, {
      fps: 30,
      width: WIDTH,
      height: HEIGHT,
      onFrame: (index, count) => {
        seen.push(index);
        total = count;
      },
    });
    expect(seen).toHaveLength(308);
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(307);
    expect(total).toBe(308);
  });

  it('records the span it was given rather than the figure it was handed', async () => {
    const sink = new Taken();
    const recording = await recordFigure(turns, sink, {
      fps: 30,
      width: WIDTH,
      height: HEIGHT,
      seconds: durationOf(turns) * 2,
    });
    expect(durationOf(turns)).toBe(6);
    expect(recording.frames).toBe(360);
    expect(recording.seconds).toBe(12);
    expect(sink.times[sink.times.length - 1]).toBeCloseTo(11 + 29 / 30, 12);
  });

  it('throws the sink away rather than finishing it when a frame fails', async () => {
    const sink = new Taken();
    const failing: FrameSink<number> = {
      context: sink.context,
      add: (seconds, duration) => {
        sink.add(seconds, duration);
        if (sink.times.length === 3) throw new Error('the encoder stopped');
      },
      finish: () => sink.finish(),
      cancel: () => sink.cancel(),
    };
    await expect(
      recordFigure(tangent, failing, { fps: 30, width: WIDTH, height: HEIGHT })
    ).rejects.toThrow('the encoder stopped');
    expect(sink.cancelled).toBe(1);
    expect(sink.finished).toBe(0);
  });

  it('paints each frame with the painter it was handed rather than with the canvas painter', async () => {
    const sink = new Taken();
    const seen: Frame[] = [];
    await recordFigure(tangent, sink, {
      fps: 30,
      width: WIDTH,
      height: HEIGHT,
      background: GROUND,
      paint: (context, frame, options) => {
        expect(context).toBe(sink.context);
        expect(options).toEqual({ width: WIDTH, height: HEIGHT, background: GROUND });
        seen.push(frame);
      },
    });
    expect(seen).toHaveLength(308);
    expect(seen.map((frame) => frame.index)).toEqual(seen.map((_, index) => index));
    expect(sink.context.calls).toBe(0);
  });

  it('waits for a painter that answers a promise before taking the frame', async () => {
    const order: string[] = [];
    const sink: FrameSink = {
      context: new Counter(),
      add: () => {
        order.push('taken');
      },
      finish: () => {},
    };
    await recordFigure(tangent, sink, {
      fps: 4,
      width: WIDTH,
      height: HEIGHT,
      paint: async () => {
        order.push('painting');
        await Promise.resolve();
        order.push('painted');
      },
    });
    expect(order.slice(0, 6)).toEqual([
      'painting',
      'painted',
      'taken',
      'painting',
      'painted',
      'taken',
    ]);
  });

  it('throws the sink away rather than finishing it when a painter fails', async () => {
    const sink = new Taken();
    await expect(
      recordFigure(tangent, sink, {
        fps: 30,
        width: WIDTH,
        height: HEIGHT,
        paint: async () => {
          throw new Error('the card was lost');
        },
      })
    ).rejects.toThrow('the card was lost');
    expect(sink.cancelled).toBe(1);
    expect(sink.finished).toBe(0);
  });

  it('waits for a sink that has fallen behind before painting the next frame', async () => {
    let inside = false;
    let overlapped = false;
    const slow: FrameSink = {
      context: new Counter(),
      add: async () => {
        overlapped ||= inside;
        inside = true;
        await Promise.resolve();
        inside = false;
      },
      finish: () => {},
    };
    await recordFigure(tangent, slow, { fps: 4, width: WIDTH, height: HEIGHT });
    expect(overlapped).toBe(false);
  });
});

/** A context that keeps the first thing it was asked to fill, so the ground can
 * be told from the marks painted over it. */
class Opening extends Counter {
  first?: { style: unknown; rect?: readonly number[] };
  override fill() {
    super.fill();
    this.first ??= { style: this.fillStyle, rect: this.lastRect };
  }
}

const GROUND = colourFrom('#0b1020');
const only = (figure: Figure) => [...framesOf(figure, { frames: 1, width: WIDTH, height: HEIGHT })][0];

describe('paintFrame', () => {
  it('fills the whole surface with the ground before it paints a mark', () => {
    const context = new Opening();
    paintFrame(context, only(tangent), { width: WIDTH, height: HEIGHT, background: GROUND });
    expect(context.first?.style).toBe('#0b1020');
    expect(context.first?.rect).toEqual([0, 0, WIDTH, HEIGHT]);
  });

  it('paints what the marks alone paint when no ground is given', () => {
    const frame = only(tangent);
    const whole = new Counter();
    paintFrame(whole, frame, { width: WIDTH, height: HEIGHT });
    const alone = new Counter();
    paintCanvas(alone, frame.marks, frame.view);
    expect(whole.calls).toBe(alone.calls);
  });

  it('adds one call to the frame when a ground is given', () => {
    const frame = only(tangent);
    const grounded = new Counter();
    paintFrame(grounded, frame, { width: WIDTH, height: HEIGHT, background: GROUND });
    const bare = new Counter();
    paintFrame(bare, frame, { width: WIDTH, height: HEIGHT });
    expect(grounded.calls).toBe(bare.calls + 1);
  });

  it('gives a recording one ground for every frame it takes', async () => {
    const grounded = new Taken();
    const recording = await recordFigure(tangent, grounded, {
      fps: 4,
      width: WIDTH,
      height: HEIGHT,
      background: GROUND,
    });
    const bare = new Taken();
    await recordFigure(tangent, bare, { fps: 4, width: WIDTH, height: HEIGHT });
    expect(recording.frames).toBe(41);
    expect(grounded.context.calls).toBe(bare.context.calls + recording.frames);
  });
});


/** A context that keeps the pixels it was handed, which is what a card's frame
 * arrives as. Its image data is the shape a real context makes rather than the
 * DOM's own, since this package names no browser library. */
class Pixels extends Counter {
  written?: { image: ImageDataLike; x: number; y: number };
  createImageData(width: number, height: number): ImageDataLike {
    return { width, height, data: new Uint8ClampedArray(width * height * 4) };
  }
  putImageData(image: ImageDataLike, x: number, y: number) {
    this.written = { image, x, y };
  }
}

describe('paintPixels', () => {
  it('writes the bytes it was handed at the top left corner', () => {
    const context = new Pixels();
    const pixels = new Uint8Array(4 * 3 * 4);
    for (let at = 0; at < pixels.length; at += 1) pixels[at] = at % 256;
    paintPixels(context, pixels, 4, 3);
    expect(context.written?.x).toBe(0);
    expect(context.written?.y).toBe(0);
    expect(context.written?.image.width).toBe(4);
    expect(context.written?.image.height).toBe(3);
    expect([...(context.written?.image.data ?? [])]).toEqual([...pixels]);
  });

  it('paints nothing, since pixels replace what the canvas held', () => {
    const context = new Pixels();
    paintPixels(context, new Uint8Array(2 * 2 * 4), 2, 2);
    expect(context.calls).toBe(0);
  });

  it('refuses a count of bytes that is not the frame', () => {
    expect(() => paintPixels(new Pixels(), new Uint8Array(15), 2, 2)).toThrow(
      '15 bytes of pixels is not the 16 a 2x2 frame holds'
    );
  });

  it('refuses a context with no image calls rather than dropping the frame', () => {
    expect(() => paintPixels(new Counter(), new Uint8Array(16), 2, 2)).toThrow(
      'no createImageData and putImageData'
    );
  });
});

describe('recordFrames', () => {
  it('walks a span with no figure behind it, a fill at each time the walk reads', async () => {
    const sink = new Taken();
    const filled: WalkTime[] = [];
    const recording = await recordFrames(sink, (_, time) => void filled.push(time), { fps: 30, seconds: 1.999 });
    const times = walkTimesOf({ fps: 30, seconds: 1.999 });
    expect(recording.frames).toBe(60);
    expect(filled.map((time) => time.seconds)).toEqual(times);
    expect(sink.times).toEqual(times);
    expect(sink.finished).toBe(1);
  });

  it('counts every filled frame on the clock when nothing settles', async () => {
    const filled: WalkTime[] = [];
    await recordFrames(new Taken(), (_, time) => void filled.push(time), { fps: 4, seconds: 1 });
    expect(filled).toEqual([0, 1, 2, 3].map((index) => ({ index, seconds: index / 4, frame: index, clock: index / 4 })));
  });

  it('fills the settling frames first and never passes them to the sink', async () => {
    const sink = new Taken();
    const filled: WalkTime[] = [];
    const settled: [number, number][] = [];
    const recording = await recordFrames(sink, (_, time) => void filled.push(time), {
      fps: 30,
      seconds: 1,
      settle: 300,
      onSettle: (frame, count) => void settled.push([frame, count]),
    });
    expect(filled).toHaveLength(330);
    expect(sink.times).toHaveLength(30);
    expect(recording.frames).toBe(30);
    expect(settled).toEqual(Array.from({ length: 300 }, (_, frame) => [frame, 300]));
    expect(filled[0]).toEqual({ index: 0, seconds: 0, frame: 0, clock: 0 });
    expect(filled[299]).toEqual({ index: 0, seconds: 0, frame: 299, clock: 299 / 30 });
    expect(filled[300]).toEqual({ index: 0, seconds: 0, frame: 300, clock: 10 });
    expect(filled[329]).toEqual({ index: 29, seconds: 29 / 30, frame: 329, clock: 329 / 30 });
  });

  it('fills with a settle of 0 exactly what it fills with none', async () => {
    const none: WalkTime[] = [];
    const zero: WalkTime[] = [];
    await recordFrames(new Taken(), (_, time) => void none.push(time), { fps: 30, seconds: 1.999 });
    await recordFrames(new Taken(), (_, time) => void zero.push(time), { fps: 30, seconds: 1.999, settle: 0 });
    expect(zero).toEqual(none);
  });

  it('stops before the next fill once its signal is aborted, cancelling the sink once', async () => {
    const sink = new Taken();
    const controller = new AbortController();
    const reason = new Error('stopped');
    let fills = 0;
    const fill = (_: CanvasLike, time: WalkTime) => {
      fills += 1;
      if (time.index === 7) controller.abort(reason);
    };
    const walk = recordFrames(sink, fill, { fps: 30, seconds: 1, signal: controller.signal });
    await expect(walk).rejects.toBe(reason);
    expect(fills).toBe(8);
    expect(sink.times).toHaveLength(8);
    expect(sink.cancelled).toBe(1);
    expect(sink.finished).toBe(0);
  });

  it('stops during settling once its signal is aborted', async () => {
    const sink = new Taken();
    const controller = new AbortController();
    let fills = 0;
    const onSettle = (frame: number) => {
      if (frame === 4) controller.abort();
    };
    const walk = recordFrames(sink, () => void (fills += 1), { fps: 30, seconds: 1, settle: 30, onSettle, signal: controller.signal });
    await expect(walk).rejects.toThrow();
    expect(fills).toBe(5);
    expect(sink.times).toHaveLength(0);
    expect(sink.cancelled).toBe(1);
    expect(sink.finished).toBe(0);
  });

  it('fills onto the surface the sink reads', async () => {
    const sink = new Taken();
    const contexts = new Set<CanvasLike>();
    await recordFrames(sink, (context) => void contexts.add(context), { fps: 4, seconds: 1 });
    expect([...contexts]).toEqual([sink.context]);
  });

  it('throws the sink away rather than finishing it when a fill fails', async () => {
    const sink = new Taken();
    const failing = (_: CanvasLike, time: WalkTime) => {
      if (time.index === 2) throw new Error('fill failed');
    };
    await expect(recordFrames(sink, failing, { fps: 4, seconds: 1 })).rejects.toThrow('fill failed');
    expect(sink.cancelled).toBe(1);
    expect(sink.finished).toBe(0);
    expect(sink.times).toHaveLength(2);
  });
});
