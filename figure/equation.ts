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
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import { rect, transformPath, type Path } from './path.js';
import { pathFromData } from './path-data.js';
import { typesetElement, type EquationElement } from './typeset.js';
import type { PathMark } from './mark.js';

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
function transformOf(text: string): Mat3 {
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

export function equationMarks(root: EquationElement): Equation {
  const svg = svgOf(root);
  const marks: PathMark[] = [];

  const mark = (path: Path, stack: Mat3, suffix: string) => {
    marks.push({ kind: 'path', id: `${marks.length}-${suffix}`, path: transformPath(path, stack) });
  };

  const walk = (element: EquationElement, stack: Mat3) => {
    for (const child of element.children) {
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
  return equationMarks(await typesetElement(tex));
}
