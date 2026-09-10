import { describe, expect, it } from 'vitest';
import { colourFrom, durationOf, framesOf, paintCanvas, paintFrame, recordFigure } from '@altpsyche/maths';
import type { CanvasLike, Figure, FrameSink } from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { solid } from '../demos/surface.js';

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
  // A walk of a demo paints every mark of every frame, which is seconds of work
  // rather than milliseconds, so each of these carries the time it needs rather
  // than sitting inside the five a test is given when it names none.
  it('takes the frames the flat demo walks', async () => {
    expect((await recorded(tangent, 30)).recording.frames).toBe(308);
  }, 20000);

  it('takes the frames the solid demo walks', async () => {
    expect((await recorded(solid, 30)).recording.frames).toBe(399);
  }, 20000);

  it('takes 615 frames of the flat demo at twice the rate, rather than 616', async () => {
    // The walk rounds the duration times the rate, so 10.25 seconds at sixty is
    // 615 frames and doubling the count given at thirty would be one too many.
    expect((await recorded(tangent, 60)).recording.frames).toBe(615);
  }, 20000);

  it('takes 798 frames of the solid demo at twice the rate', async () => {
    expect((await recorded(solid, 60)).recording.frames).toBe(798);
  }, 20000);

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
  }, 20000);

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

