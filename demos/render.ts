/**
 * The demos as SVG text, which is what the README carries and what a gate
 * compares against the committed files.
 *
 * Nothing here needs a browser. The marks are a list and the SVG painter writes
 * them as text, so the picture in the README is regenerated and checked by the
 * same suite everything else is.
 */
import { at, resolveExtent, svgMarkup, viewMatrix, type Figure } from '../index.js';
import { tangent } from './tangent.js';

/** A hundred pixels to the figure unit, which is the size the README shows and
 * the only place the number matters, since the picture scales from its view box. */
export const WIDTH = 1080;
export const HEIGHT = 600;

export function stillMarkup(figure: Figure, seconds: number, width = WIDTH, height = HEIGHT): string {
  const extent = resolveExtent(figure.extent, width / height);
  return svgMarkup(at(figure, seconds), viewMatrix(extent, figure.fit ?? 'contain', width, height), width, height);
}

export interface Sheet {
  /** Where it lives, from the root of the repository. */
  file: string;
  markup: () => string;
}

export const sheets: readonly Sheet[] = [
  { file: 'docs/tangent.svg', markup: () => stillMarkup(tangent, tangent.still) },
];
