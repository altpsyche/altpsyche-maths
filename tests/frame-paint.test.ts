import { describe, expect, it } from 'vitest';
import { framesOf, paintCanvas, svgMarkup } from '@altpsyche/maths';
import type { CanvasLike, Frame, Mark } from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { solid } from '../demos/surface.js';

/**
 * Every frame of both demos, painted through both painters. This is the claim
 * frames out makes, and it needs no browser: a walk hands over marks and a view
 * together, and each painter turns that pair into what it draws.
 */

const WIDTH = 1080;
const HEIGHT = 600;

/** A context that counts what it was asked to draw rather than drawing it. It
 * counts rather than writing every call down, since a walk of a demo is ninety
 * thousand marks and a list of every call to each is not a thing to hold. */
class Counter implements CanvasLike {
  fills = 0;
  strokes = 0;
  texts = 0;
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
  rect() {}
  clip() {}
  moveTo() {}
  bezierCurveTo() {}
  closePath() {}
  fill() {
    this.fills += 1;
  }
  stroke() {
    this.strokes += 1;
  }
  fillText() {
    this.texts += 1;
  }
  setLineDash() {}
}

const countOf = (markup: string, tag: string) => markup.split(`<${tag}`).length - 1;

/** What one frame drew, on the canvas and in the markup, so the two can be held
 * to the same mark count. */
function drawn(
  frame: Frame,
  marks: readonly Mark[] = frame.marks
): { fills: number; strokes: number; texts: number; elements: number } {
  const target = new Counter();
  paintCanvas(target, marks, frame.view);
  const markup = svgMarkup(marks, frame.view, WIDTH, HEIGHT);
  return {
    fills: target.fills,
    strokes: target.strokes,
    texts: target.texts,
    elements: countOf(markup, 'path') + countOf(markup, 'text'),
  };
}

describe('a walk of the flat demo', () => {
  const frames = Array.from(framesOf(tangent, { fps: 30, width: WIDTH, height: HEIGHT }));

  it('walks 308 frames and paints every one of them', () => {
    expect(frames).toHaveLength(308);
    for (const frame of frames) {
      // The figure's own marks are the fixed part. What its inset draws is a
      // window that moves, so the count there changes frame to frame.
      const counted = drawn(
        frame,
        frame.marks.filter((mark) => !mark.id.startsWith('tangent/lens/'))
      );
      // The tangent is one of the fills rather than one of the strokes, since a
      // stroke of two widths is drawn as the filled outline of its own path.
      expect(counted.fills).toBe(44);
      expect(counted.strokes).toBe(90);
      expect(counted.texts).toBe(12);
      // Every mark is one element and one drawing call, so the two painters
      // agree about what the frame holds.
      const whole = drawn(frame);
      expect(whole.fills + whole.strokes + whole.texts).toBe(frame.marks.length);
      expect(whole.elements).toBe(frame.marks.length);
    }
  });

  it('carries a matrix that moves with the view, frame by frame', () => {
    const across = frames.map((frame) => frame.view[6]);
    expect(Math.max(...across) - Math.min(...across)).toBeCloseTo(124, 6);
    // The view holds still while the dot is inside its own reach of the middle of
    // the frame and again once it has reached the graph's own edge, so most of the
    // walk is one of a few places rather than a new one each frame.
    expect(new Set(across).size).toBe(21);
  });
});

describe('a walk of the solid demo', () => {
  const frames = Array.from(framesOf(solid, { fps: 30, width: WIDTH, height: HEIGHT }));

  it('walks 354 frames and paints every one of them', () => {
    expect(frames).toHaveLength(354);
    for (const frame of frames) {
      // The figure's own marks are the fixed part. What its inset draws is a
      // window on a saddle that turns, so the count there changes frame to frame.
      const own = frame.marks.filter((mark) => !mark.id.startsWith('solid/lens/'));
      const counted = drawn(frame, own);
      // The three runs of descent are among the fills rather than the strokes,
      // since a stroke of two widths is drawn as the filled outline of its path.
      expect(counted.fills).toBe(197);
      expect(counted.strokes).toBe(55);
      expect(counted.texts).toBe(11);
      // Sixteen more calls than marks, which are the panes of glass: a mark
      // carrying both a fill and a stroke is painted twice and written once.
      expect(counted.fills + counted.strokes + counted.texts).toBe(own.length + 16);
      const whole = drawn(frame);
      expect(whole.elements).toBe(frame.marks.length);
    }
  });

  it('turns its eye frame by frame, so no two frames draw the same picture', () => {
    // The figure's own marks, since the inset's count changes with what falls
    // inside a window on a saddle that turns.
    const own = (marks: readonly Mark[]) => marks.filter((mark) => !mark.id.startsWith('solid/lens/'));
    const first = own(frames[0].marks);
    const middle = own(frames[Math.floor(frames.length / 2)].marks);
    expect(first).toHaveLength(middle.length);
    const moved = first.filter((mark, index) => JSON.stringify(mark) !== JSON.stringify(middle[index]));
    expect(moved.length).toBeGreaterThan(200);
  });
});
