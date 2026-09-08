import { describe, expect, it } from 'vitest';
import {
  circle,
  flatten,
  group,
  interval,
  line,
  mat3,
  paintCanvas,
  shape,
  svgElements,
  text,
  vec2,
  viewMatrix,
  type CanvasLike,
  type Mark,
  type SvgElement,
} from '@altpsyche/maths';

/**
 * The rectangular clip, in the tree that declares it and in the two painters
 * that write it.
 *
 * The clip is the one thing a mark carries in the figure's own units rather than
 * its own, since a transform that turns takes a rectangle to a shape off the
 * axes and only a rectangle is drawable by every painter.
 */

/** Figure units onto the surface: ten across per unit, with the y axis turned
 * over, so (x, y) lands at (100 + 10x, 50 - 10y). */
const view = viewMatrix({ width: 20, height: 10 }, 'contain', 200, 100);

const ink = { colour: '#0f0' };
const pen = { colour: '#fff', width: 1 };

/** The box from (0, -2) to (4, 2), which is 100 to 140 across the surface and 30
 * to 70 down it. */
const box = { x: interval(0, 4), y: interval(-2, 2) };

/** A context that writes down what it was told rather than drawing, which is the
 * only way to read the canvas painter without a browser. */
class Recorder implements CanvasLike {
  readonly calls: Array<{ name: string; args: number[] }> = [];
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

  private note(name: string, ...args: number[]) {
    this.calls.push({ name, args });
  }
  save() {
    this.note('save');
  }
  restore() {
    this.note('restore');
  }
  beginPath() {
    this.note('beginPath');
  }
  rect(x: number, y: number, width: number, height: number) {
    this.note('rect', x, y, width, height);
  }
  clip() {
    this.note('clip');
  }
  moveTo(x: number, y: number) {
    this.note('moveTo', x, y);
  }
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.note('bezierCurveTo', a, b, c, d, e, f);
  }
  closePath() {
    this.note('closePath');
  }
  fill() {
    this.note('fill');
  }
  stroke() {
    this.note('stroke');
  }
  fillText(value: string, x: number, y: number) {
    this.note('fillText', x, y);
  }
  setLineDash() {
    this.note('setLineDash');
  }
}

const painted = (marks: readonly Mark[]): Recorder => {
  const recorder = new Recorder();
  paintCanvas(recorder, marks, view);
  return recorder;
};

/** The `<defs>` the sheet carries, or nothing where it carries none. */
const defsOf = (elements: readonly SvgElement[]): SvgElement | undefined =>
  elements.find((element) => element.tag === 'defs');

/** The numbers out of a `d` attribute, in the order they were written. */
const numbersIn = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);

describe('a clip on a mark', () => {
  const half = shape('disc', circle(vec2(4, 0), 2), { fill: ink, clip: box });

  it('leaves the geometry of a mark half outside it alone', () => {
    const clipped = flatten(half);
    const bare = flatten(shape('disc', circle(vec2(4, 0), 2), { fill: ink }));
    expect(clipped).toHaveLength(1);
    expect(clipped[0].clip).toEqual(box);
    const [one] = svgElements(clipped, view).filter((element) => element.tag === 'path');
    const [other] = svgElements(bare, view).filter((element) => element.tag === 'path');
    expect(numbersIn(one.attributes.d)).toEqual(numbersIn(other.attributes.d));
  });

  it('is one clip path holding one rectangle, in the units painted into', () => {
    const defs = defsOf(svgElements(flatten(half), view));
    expect(defs?.children).toHaveLength(1);
    const [clip] = defs!.children!;
    expect(clip.tag).toBe('clipPath');
    expect(clip.attributes).toEqual({ id: 'disc-clip', clipPathUnits: 'userSpaceOnUse' });
    expect(clip.children).toHaveLength(1);
    expect(clip.children![0]).toEqual({
      tag: 'rect',
      attributes: { x: '100', y: '30', width: '40', height: '40' },
    });
  });

  it('is the same rectangle on a canvas, set once before the geometry', () => {
    const recorder = painted(flatten(half));
    const clips = recorder.calls.filter((call) => call.name === 'clip');
    expect(clips).toHaveLength(1);
    const order = recorder.calls.map((call) => call.name);
    expect(order.slice(0, 4)).toEqual(['save', 'beginPath', 'rect', 'clip']);
    expect(order.indexOf('rect')).toBeLessThan(order.indexOf('moveTo'));
    const rect = recorder.calls.find((call) => call.name === 'rect')!;
    expect(rect.args).toEqual([100, 30, 40, 40]);
  });

  it('costs a painter nothing at all where no mark carries one', () => {
    const bare = flatten(shape('disc', circle(vec2(4, 0), 2), { fill: ink }));
    expect(defsOf(svgElements(bare, view))).toBeUndefined();
    expect(painted(bare).calls.filter((call) => call.name === 'clip')).toHaveLength(0);
  });

  it('is written on a text mark the same way', () => {
    const marks = flatten(text('label', vec2(1, 0), 'here', 1, { fill: ink, clip: box }));
    const [element] = svgElements(marks, view).filter((mark) => mark.tag === 'text');
    expect(element.attributes['clip-path']).toBe('url(#label-clip)');
    expect(painted(marks).calls.find((call) => call.name === 'rect')!.args).toEqual([100, 30, 40, 40]);
  });
});

describe('a mark against its clip', () => {
  const discAt = (x: number, name = 'disc') => shape(name, circle(vec2(x, 0), 1), { fill: ink, clip: box });

  it('is left out of the list where its whole reach falls outside', () => {
    expect(flatten(discAt(10))).toEqual([]);
  });

  it('stays where it touches the edge, since a mark often sits on one', () => {
    expect(ids(flatten(discAt(5)))).toEqual(['disc']);
  });

  it('counts half a stroke width past its own geometry', () => {
    const at = (width: number) =>
      flatten(shape('rule', line(vec2(4.4, -1), vec2(4.4, 1)), { stroke: { ...pen, width }, clip: box }));
    // The line stands 0.4 outside the clip: a width of 1 reaches 0.5 back inside
    // and a width of 0.5 reaches 0.25, which is short of it.
    expect(ids(at(1))).toEqual(['rule']);
    expect(at(0.5)).toEqual([]);
  });

  it('keeps its clip through being drawn as the outline of a tapered stroke', () => {
    const tapered = shape('rule', line(vec2(1, 0), vec2(3, 0)), {
      stroke: { colour: '#fff', width: { from: 0.2, to: 0.6 } },
      clip: box,
    });
    const [mark] = flatten(tapered);
    expect(mark.clip).toEqual(box);
    const [element] = svgElements([mark], view).filter((one) => one.tag === 'path');
    expect(element.attributes['clip-path']).toBe('url(#rule-clip)');
  });
});

describe('a clip a group hands down', () => {
  it('reaches every mark under it', () => {
    const marks = flatten(
      group('fig', [shape('near', circle(vec2(1, 0), 1), { fill: ink })], { style: { clip: box } })
    );
    expect(marks[0].clip).toEqual(box);
  });

  it('is the box both hold where one clip sits inside another', () => {
    const inner = { x: interval(2, 8), y: interval(-2, 2) };
    const marks = flatten(
      group(
        'fig',
        [
          group('half', [shape('in', circle(vec2(3, 0), 0.5), { fill: ink }), shape('out', circle(vec2(0.5, 0), 0.25), { fill: ink })], {
            style: { clip: inner },
          }),
        ],
        { style: { clip: box } }
      )
    );
    expect(ids(marks)).toEqual(['fig/half/in']);
    expect(marks[0].clip).toEqual({ x: interval(2, 4), y: interval(-2, 2) });
  });

  it('leaves nothing at all where the two clips miss each other', () => {
    const marks = flatten(
      group('fig', [group('half', [shape('disc', circle(vec2(0.5, 0), 0.25), { fill: ink })], {
        style: { clip: { x: interval(3, 4), y: interval(-2, 2) } },
      })], { style: { clip: { x: interval(0, 1), y: interval(-2, 2) } } })
    );
    expect(marks).toEqual([]);
  });

  it('stays where it was declared rather than riding the transform below it', () => {
    const moved = (name: string) =>
      group('fig', [group('shifted', [shape(name, circle(vec2(1, 0), 0.5), { fill: ink })], {
        transform: mat3.translation(vec2(10, 0)),
      })], { style: { clip: box } });
    // The disc lands at 11 across, which the clip would hold had it moved by the
    // same ten and does not.
    expect(flatten(moved('disc'))).toEqual([]);
  });
});

describe('the id of a clip', () => {
  it('is the mark id escaped, so two mark ids cannot arrive at one', () => {
    const marks = flatten(group('fig', [shape('a/b', circle(vec2(1, 0), 1), { fill: ink, clip: box })]));
    const defs = defsOf(svgElements(marks, view));
    expect(defs!.children![0].attributes.id).toBe('fig-2f-a-2f-b-clip');
  });

  it('differs from the id of the same mark gradient', () => {
    const washed = {
      colour: '#345',
      gradient: { from: vec2(0, 0), to: vec2(2, 0), stops: [{ offset: 0, colour: '#012' }, { offset: 1, colour: '#678' }] },
    };
    const marks = flatten(shape('disc', circle(vec2(1, 0), 1), { fill: washed, clip: box }));
    const defs = defsOf(svgElements(marks, view));
    expect(defs!.children!.map((child) => `${child.tag} ${child.attributes.id}`)).toEqual([
      'clipPath disc-clip',
      'linearGradient disc',
    ]);
  });

  it('takes the document prefix the gradients take', () => {
    const marks = flatten(shape('disc', circle(vec2(1, 0), 1), { fill: ink, clip: box }));
    const defs = defsOf(svgElements(marks, view, { prefix: 'one-' }));
    expect(defs!.children![0].attributes.id).toBe('one-disc-clip');
  });
});
