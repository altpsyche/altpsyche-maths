/**
 * TeX in, and the typesetter's own SVG tree out, in the shape the walk over it
 * takes.
 *
 * MathJax is loaded by an import written as a call inside the function rather
 * than by a line at the top of the file. It is 41 MB of CommonJS and declares no
 * `sideEffects`, so a line at the top would put all of it in the graph of every
 * consumer that draws a figure and typesets nothing. What it costs is that
 * typesetting answers with a promise.
 *
 * `fontCache: 'none'` is what makes the outlines readable. With a cache MathJax
 * defines each glyph once and refers to it, and a reference is not geometry
 * anything can read. Without it every glyph arrives as its own outline.
 *
 * `AllPackages` is load-bearing in the other direction. Without it a macro as
 * ordinary as `\lVert` is an undefined control sequence and the typesetter draws
 * its own error message, so the picture that ships is a sentence in a red box.
 */
import type { LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js';
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js';
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js';
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js';

/**
 * One element of the tree a typesetter wrote, with its attributes as written.
 *
 * The walk that turns this into marks takes this shape rather than the
 * typesetter's own, which is what lets the walk be tested by building a tree by
 * hand with no typesetter behind it.
 */
export interface EquationElement {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly EquationElement[];
  /** A text element's own characters, which is what names it when it is
   * refused. Nothing else here carries any. */
  readonly text?: string;
}

type LiteNode = LiteElement | LiteText;

interface Typesetter {
  readonly adaptor: LiteAdaptor;
  readonly document: MathDocument<LiteElement, LiteText, LiteDocument>;
}

// Held as the promise rather than the value: two calls arriving together share
// one load, and registering the handler twice leaves MathJax with two of them.
let shared: Promise<Typesetter> | undefined;

async function load(): Promise<Typesetter> {
  const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }, { AllPackages }] = await Promise.all([
    import('mathjax-full/js/mathjax.js'),
    import('mathjax-full/js/input/tex.js'),
    import('mathjax-full/js/output/svg.js'),
    import('mathjax-full/js/adaptors/liteAdaptor.js'),
    import('mathjax-full/js/handlers/html.js'),
    import('mathjax-full/js/input/tex/AllPackages.js'),
  ]);
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const document = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'none' }),
  }) as MathDocument<LiteElement, LiteText, LiteDocument>;
  return { adaptor, document };
}

/** MathJax's own tree read into the shape above, with a text node's characters
 * gathered onto the element that holds them. */
function elementOf(adaptor: LiteAdaptor, node: LiteElement): EquationElement {
  const children: EquationElement[] = [];
  let text = '';
  for (const child of adaptor.childNodes(node) as LiteNode[]) {
    if (adaptor.kind(child) === '#text') text += adaptor.value(child);
    else children.push(elementOf(adaptor, child as LiteElement));
  }
  const attributes: Record<string, string> = {};
  for (const { name, value } of adaptor.allAttributes(node)) attributes[name] = value;
  return { tag: adaptor.kind(node), attributes, children, text };
}

/** One expression typeset, as the tree the typesetter wrote it. `display: true`
 * is the centred form rather than the one that sits inside a line of prose. */
export async function typesetElement(tex: string): Promise<EquationElement> {
  shared ??= load();
  const { adaptor, document } = await shared;
  return elementOf(adaptor, document.convert(tex, { display: true }) as LiteElement);
}
