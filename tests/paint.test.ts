import { describe, expect, it } from 'vitest';
import {
  marksAt,
  circle,
  group,
  line,
  mat3,
  paintCanvas,
  paintSvg,
  pathToData,
  shape,
  svgElements,
  svgMarkup,
  text,
  vec2,
  viewMatrix,
} from '@altpsyche/maths';
import type { CanvasLike, Figure, Mark, PaintNode } from '@altpsyche/maths';

/**
 * Both painters, and the one test that holds them together.
 *
 * They cannot be compared as pixels: SVG text and a canvas `fillText` do not
 * rasterise alike, and holding them to that would be a gate failing over
 * antialiasing. What they are held to is consuming every mark and emitting the
 * same geometry and the same style for each one.
 */

const view = viewMatrix({ width: 20, height: 10 }, 'contain', 200, 100);
const pen = { colour: '#fff', width: 2 };
const ink = { colour: '#0f0' };

const fixture: Figure = {
  extent: { width: 20, height: 10 },
  still: 0,
  scene: group('fig', [
    shape('axis', line(vec2(-8, 0), vec2(8, 0)), { stroke: { ...pen, cap: 'round', dash: [1, 0.5] } }),
    shape('dot', circle(vec2(2, 1), 1), { fill: ink, opacity: 0.5 }),
    text('label', vec2(2, 3), 'here & there', 1.5, { fill: ink, align: 'middle', weight: 600 }),
  ]),
};

const marks = marksAt(fixture, 0);

/** A context that writes down what it was told rather than drawing, which is the
 * only way to read a painter's output without a browser. */
class Recorder implements CanvasLike {
  readonly calls: Array<{ name: string; args: unknown[] }> = [];
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

  private note(name: string, ...args: unknown[]) {
    this.calls.push({ name, args });
  }
  save() { this.note('save'); }
  restore() { this.note('restore'); }
  beginPath() { this.note('beginPath'); }
  moveTo(x: number, y: number) { this.note('moveTo', x, y); }
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number) { this.note('bezierCurveTo', a, b, c, d, e, f); }
  closePath() { this.note('closePath'); }
  fill(rule?: 'nonzero' | 'evenodd') { this.note('fill', rule, this.fillStyle, this.globalAlpha); }
  stroke() { this.note('stroke', this.strokeStyle, this.lineWidth, this.lineCap, this.globalAlpha); }
  fillText(value: string, x: number, y: number) { this.note('fillText', value, x, y, this.font, this.textAlign, this.fillStyle, this.globalAlpha); }
  setLineDash(segments: number[]) { this.note('setLineDash', segments.join(' ')); }
}

/** The numbers out of an SVG `d` attribute, in the order they were written. */
const numbersIn = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

/** The numbers a recorder was handed for one mark's geometry. */
function canvasGeometry(recorder: Recorder, index: number): number[] {
  let seen = -1;
  const numbers: number[] = [];
  for (const call of recorder.calls) {
    if (call.name === 'save') seen += 1;
    if (seen !== index) continue;
    if (call.name === 'moveTo' || call.name === 'bezierCurveTo') numbers.push(...(call.args as number[]));
    if (call.name === 'fillText') numbers.push(call.args[1] as number, call.args[2] as number);
  }
  return numbers;
}

describe('svg', () => {
  it('writes a move, a cubic per segment, and a close where the shape joins', () => {
    const d = pathToData(circle(vec2(0, 0), 1), mat3.IDENTITY);
    expect(d.startsWith('M1 0')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(4);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('leaves an open path unclosed', () => {
    expect(pathToData(line(vec2(0, 0), vec2(1, 1)), mat3.IDENTITY).includes('Z')).toBe(false);
  });

  it('writes no fill as the word rather than as nothing', () => {
    const element = svgElements(marks, view)[0];
    expect(element.attributes.fill).toBe('none');
    expect(element.attributes.stroke).toBe('#fff');
  });

  it('carries every mark id into the document, so the picture can be found', () => {
    expect(svgElements(marks, view).map((element) => element.attributes['data-mark'])).toEqual([
      'fig/axis',
      'fig/dot',
      'fig/label',
    ]);
  });

  it('scales a stroke width and a font size by the view', () => {
    const elements = svgElements(marks, view);
    expect(Number(elements[0].attributes['stroke-width'])).toBeCloseTo(20, 6);
    expect(Number(elements[2].attributes['font-size'])).toBeCloseTo(15, 6);
  });

  it('escapes what would otherwise close a tag', () => {
    expect(svgMarkup(marks, view, 200, 100).includes('here &amp; there')).toBe(true);
  });

  it('carries a view box and no size of its own, so the page decides how big it is', () => {
    const markup = svgMarkup(marks, view, 200, 100);
    const opening = markup.slice(0, markup.indexOf('>') + 1);
    expect(opening.includes('viewBox="0 0 200 100"')).toBe(true);
    expect(opening.includes('width=')).toBe(false);
    expect(opening.includes('height=')).toBe(false);
  });

  it('rounds a coordinate rather than writing every bit of a double', () => {
    expect(pathToData(line(vec2(1 / 3, 0), vec2(1, 0)), mat3.IDENTITY)).toBe('M0.333 0C0.556 0 0.778 0 1 0');
  });

  it('puts the marks into an element that is already there, replacing what was in it', () => {
    const made: Array<{ tag: string; attributes: Record<string, string>; text: string | null }> = [];
    let children: PaintNode[] = [];
    const target = { replaceChildren: (...nodes: PaintNode[]) => { children = nodes; } };
    const maker = {
      createElementNS: (_namespace: string, tag: string): PaintNode => {
        const record = { tag, attributes: {} as Record<string, string>, text: null as string | null };
        made.push(record);
        return {
          setAttribute: (name: string, value: string) => { record.attributes[name] = value; },
          set textContent(value: string | null) { record.text = value; },
          get textContent() { return record.text; },
        };
      },
    };
    paintSvg(target, marks, view, maker);
    expect(children).toHaveLength(3);
    expect(made.map((node) => node.tag)).toEqual(['path', 'path', 'text']);
    expect(made[2].text).toBe('here & there');
    expect(made[0].attributes['data-mark']).toBe('fig/axis');
  });

  it('takes an element from a document, whose own call accepts more than a painter can make', () => {
    // Shaped the way a document is rather than the way the painter is. An element
    // there holds other elements and text, and text is not a thing an attribute
    // can be set on, so the two calls each accept something the other refuses and
    // neither signature is assignable to the other. This compiling is the test:
    // the element a maker makes travels through to the target, and a caller with
    // a real document does not have to cast its own element to hand it over.
    interface DocumentElement {
      setAttribute(name: string, value: string): void;
      textContent: string | null;
      replaceChildren(...nodes: (DocumentElement | string)[]): void;
    }

    const make = (): DocumentElement => {
      let children: (DocumentElement | string)[] = [];
      return {
        setAttribute: () => {},
        textContent: null,
        replaceChildren: (...nodes) => { children = nodes; },
        get count() { return children.length; },
      } as DocumentElement & { count: number };
    };

    const into = make() as DocumentElement & { count: number };
    const maker = { createElementNS: (_namespace: string, _tag: string): DocumentElement => make() };

    paintSvg(into, marks, view, maker);
    expect(into.count).toBe(3);
  });
});

describe('canvas', () => {
  it('wraps every mark so a dash or an opacity cannot leak into the next one', () => {
    const recorder = new Recorder();
    paintCanvas(recorder, marks, view);
    const saves = recorder.calls.filter((call) => call.name === 'save').length;
    const restores = recorder.calls.filter((call) => call.name === 'restore').length;
    expect(saves).toBe(marks.length);
    expect(restores).toBe(marks.length);
  });

  it('clears the dash for a mark that asked for none', () => {
    const plain = marksAt({ ...fixture, scene: group('g', [shape('l', line(vec2(0, 0), vec2(1, 0)), { stroke: pen })]) }, 0);
    const recorder = new Recorder();
    paintCanvas(recorder, plain, view);
    expect(recorder.calls.find((call) => call.name === 'setLineDash')?.args[0]).toBe('');
  });

  it('says center where SVG says middle', () => {
    const recorder = new Recorder();
    paintCanvas(recorder, marks, view);
    const drawn = recorder.calls.find((call) => call.name === 'fillText');
    expect(drawn?.args[4]).toBe('center');
    expect(drawn?.args[3]).toBe('600 15px sans-serif');
  });
});

describe('the two painters agree', () => {
  it('consumes every mark, once each, in the same order', () => {
    const recorder = new Recorder();
    paintCanvas(recorder, marks, view);
    const painted = recorder.calls.filter((call) => call.name === 'save').length;
    expect(painted).toBe(svgElements(marks, view).length);
    expect(painted).toBe(marks.length);
  });

  it('emits the same geometry for every mark, to a thousandth of a pixel', () => {
    const recorder = new Recorder();
    paintCanvas(recorder, marks, view);
    const elements = svgElements(marks, view);
    marks.forEach((mark: Mark, index: number) => {
      const fromCanvas = canvasGeometry(recorder, index);
      const fromSvg = mark.kind === 'path'
        ? numbersIn(elements[index].attributes.d)
        : [Number(elements[index].attributes.x), Number(elements[index].attributes.y)];
      expect(fromCanvas).toHaveLength(fromSvg.length);
      fromCanvas.forEach((value, at) => expect(value).toBeCloseTo(fromSvg[at], 3));
    });
  });

  it('emits the same style for every mark', () => {
    const recorder = new Recorder();
    paintCanvas(recorder, marks, view);
    const elements = svgElements(marks, view);

    const stroked = recorder.calls.find((call) => call.name === 'stroke');
    expect(stroked?.args[0]).toBe(elements[0].attributes.stroke);
    expect(stroked?.args[1]).toBeCloseTo(Number(elements[0].attributes['stroke-width']), 6);
    expect(stroked?.args[2]).toBe(elements[0].attributes['stroke-linecap']);

    const filled = recorder.calls.find((call) => call.name === 'fill');
    expect(filled?.args[1]).toBe(elements[1].attributes.fill);
    expect(filled?.args[2]).toBeCloseTo(Number(elements[1].attributes.opacity), 6);

    const written = recorder.calls.find((call) => call.name === 'fillText');
    expect(written?.args[5]).toBe(elements[2].attributes.fill);
    expect(written?.args[3]).toContain(elements[2].attributes['font-size']);
  });
});
