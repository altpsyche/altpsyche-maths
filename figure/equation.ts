/**
 * A typeset expression read out of the SVG a typesetter wrote.
 *
 * MathJax describes an expression as nested groups with a transform on each,
 * every glyph as an outline and a fraction bar or a root's rule as a rectangle.
 * A figure holds a flat list of marks with every transform already applied, so
 * this walks the tree, carries the transform stack down it, and hands back the
 * marks with the box the typesetter measured the expression into.
 *
 * The stack starts turned over, because SVG counts y downward and a figure
 * counts it upward. Doing it here means the whole expression arrives in the
 * figure's own space and nothing downstream has to know which way up the
 * typesetter works.
 *
 * A mark comes back with no fill and its id is a leaf name, because both arrive
 * when the equation is placed in a figure: a figure's node tree builds an id out
 * of the names on the way down it, so a full path written here would be a second
 * naming of the same mark. The colour arrives there too, since a figure is handed
 * its palette as it is drawn rather than reading one.
 *
 * An id carries the glyph's own code point, which is what a match between two
 * expressions has to be made on.
 *
 * Three things stop the walk instead of being drawn, and each names what it
 * found: a TeX error, a character the font has no outline for, and a macro the
 * typesetter does not know.
 */
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { rect, transformPath, type Path } from './path.js';
import { group, shape, type GroupNode } from './node.js';
import { pathFromData } from './path-data.js';
import { typesetElement, type EquationElement } from './typeset.js';
import type { Fill, PathMark } from './mark.js';

/** Where the typesetter put the expression, in the marks' own units and with y
 * counted upward, so `y` is the bottom edge and `y + height` the top. */
export interface EquationBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Equation {
  readonly marks: readonly PathMark[];
  readonly box: EquationBox;
}

/** Both transforms a typeset expression uses. Anything else refuses rather than
 * being ignored, which would leave a glyph sitting at the origin. */
function transformOf(text: string): Transform2D {
  let matrix = mat3.IDENTITY;
  for (const match of text.matchAll(/([A-Za-z]+)\s*\(([^)]*)\)/g)) {
    const name = match[1] ?? '';
    const numbers = (match[2] ?? '')
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number);
    if (numbers.length === 0 || numbers.some((value) => !Number.isFinite(value)))
      throw new Error(`the transform "${text}" carries something that is not a number`);
    const [first = 0, second] = numbers;
    if (name === 'translate') matrix = mat3.multiply(matrix, mat3.translation(vec2(first, second ?? 0)));
    else if (name === 'scale') matrix = mat3.multiply(matrix, mat3.scaling(vec2(first, second ?? first)));
    else throw new Error(`the transform "${text}" asks for "${name}", which this does not apply`);
  }
  return matrix;
}

function attribute(element: EquationElement, name: string): string {
  const value = element.attributes[name];
  if (value === undefined) throw new Error(`a "${element.tag}" element in the typeset expression has no ${name}`);
  return value;
}

function numberAttribute(element: EquationElement, name: string, fallback?: number): number {
  const written = element.attributes[name];
  if (written === undefined && fallback !== undefined) return fallback;
  const value = Number(attribute(element, name));
  if (!Number.isFinite(value))
    throw new Error(`a "${element.tag}" element has ${name}="${written}", which is not a number`);
  return value;
}

function svgIn(element: EquationElement): EquationElement | undefined {
  if (element.tag === 'svg') return element;
  for (const child of element.children) {
    const found = svgIn(child);
    if (found) return found;
  }
  return undefined;
}

function svgOf(element: EquationElement): EquationElement {
  const found = svgIn(element);
  if (!found) throw new Error('the typesetter returned no svg element');
  return found;
}

/** The colour the `noundefined` extension draws a macro the typesetter does not
 * know, which is the only sign that it did not typeset one. */
const UNKNOWN = 'red';

/** The characters under an element, read off the code point each glyph carries.
 * It is what names a run the typesetter drew instead of typesetting. */
function charactersOf(element: EquationElement): string {
  const code = element.tag === 'path' ? Number.parseInt(element.attributes['data-c'] ?? '', 16) : NaN;
  const own = Number.isInteger(code) ? String.fromCodePoint(code) : '';
  return own + element.children.map(charactersOf).join('');
}

/**
 * The three things that stop the walk rather than being drawn, each naming what
 * it found.
 *
 * A TeX error carries its message on the group MathJax puts the error box in. A
 * character the font has no outline for arrives as a text element, which draws
 * in a browser with whatever font it found and draws nothing at all in a
 * recording. And an undefined macro is not an error under `AllPackages`, since
 * the `noundefined` extension in it draws the macro's own name in red, so a typo
 * would otherwise ship as a red word inside the picture.
 */
function refuse(element: EquationElement): void {
  const error = element.attributes['data-mjx-error'];
  if (error !== undefined) throw new Error(`the typesetter refused the expression: ${error}`);
  if (element.attributes.fill === UNKNOWN)
    throw new Error(`the typesetter does not know "${charactersOf(element)}" and drew it in ${UNKNOWN}`);
  if (element.tag === 'text')
    throw new Error(`the typesetter has no outline for "${element.text ?? ''}" and wrote it as text`);
}

/** The four numbers of the `viewBox`, turned over the way the marks are. */
function boxOf(svg: EquationElement): EquationBox {
  const numbers = attribute(svg, 'viewBox')
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (numbers.length !== 4 || numbers.some((value) => !Number.isFinite(value)))
    throw new Error(`the svg has viewBox="${svg.attributes.viewBox}", which is not four numbers`);
  const [x = 0, y = 0, width = 0, height = 0] = numbers;
  return { x, y: -(y + height), width, height };
}

export function equationOf(root: EquationElement): Equation {
  const svg = svgOf(root);
  const marks: PathMark[] = [];

  const mark = (path: Path, stack: Transform2D, suffix: string) => {
    marks.push({ kind: 'path', id: `${marks.length}-${suffix}`, path: transformPath(path, stack) });
  };

  const walk = (element: EquationElement, stack: Transform2D) => {
    for (const child of element.children) {
      refuse(child);
      const written = child.attributes.transform;
      const own = written ? mat3.multiply(stack, transformOf(written)) : stack;
      switch (child.tag) {
        case 'g':
          walk(child, own);
          break;
        case 'path':
          mark(pathFromData(attribute(child, 'd')), own, child.attributes['data-c'] ?? 'glyph');
          break;
        case 'rect':
          mark(
            rect(
              vec2(numberAttribute(child, 'x', 0), numberAttribute(child, 'y', 0)),
              numberAttribute(child, 'width'),
              numberAttribute(child, 'height')
            ),
            own,
            'rule'
          );
          break;
        default:
          throw new Error(`the typeset expression holds a "${child.tag}" element, which this does not draw`);
      }
    }
  };

  walk(svg, mat3.scaling(vec2(1, -1)));
  return { marks, box: boxOf(svg) };
}

/** One expression typeset and read, which is the two halves above in the order
 * they are always used in. */
export async function equationFromTex(tex: string): Promise<Equation> {
  return equationOf(await typesetElement(tex));
}

export interface EquationOptions {
  /** The point the expression is placed against, in the figure's own units. */
  readonly at: Vec2;
  /** Which edge of the expression sits on that point across, the middle of it
   * unless named. Two expressions placed at one point by their start keep the
   * part they share in the same place. */
  readonly align?: 'start' | 'middle' | 'end';
  /** The box the expression is fitted inside, in the figure's own units. */
  readonly width: number;
  readonly height: number;
  readonly fill: Fill;
}

/**
 * A typeset expression placed in a figure: one shape per glyph, fitted inside a
 * box and centred on a point.
 *
 * It fits inside both measurements rather than being sized by the height alone.
 * An expression two units wide for every one it is tall runs off the sides of a
 * narrow figure the moment its height is what decides its size.
 *
 * The group carries the transform rather than the geometry, so the glyphs stay
 * the typesetter's own numbers and moving the expression is one matrix.
 */
export function equationNode(name: string, equation: Equation, options: EquationOptions): GroupNode {
  const { box } = equation;
  const fit = Math.min(options.width / box.width, options.height / box.height);
  // The point the expression is hung from, in the typesetter's units, so that
  // scaling about it lands the asked-for edge on the asked-for place.
  const across = options.align === 'start' ? box.x : options.align === 'end' ? box.x + box.width : box.x + box.width / 2;
  const hung = vec2(across, box.y + box.height / 2);
  const transform = mat3.multiply(
    mat3.translation(options.at),
    mat3.multiply(mat3.scaling(vec2(fit, fit)), mat3.translation(vec2(-hung.x, -hung.y)))
  );
  return group(
    name,
    equation.marks.map((mark) => shape(mark.id, mark.path, { fill: options.fill })),
    { transform }
  );
}
