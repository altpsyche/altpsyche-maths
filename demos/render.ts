/**
 * The demos as SVG text, which is what the README carries and what a gate
 * compares against the committed files.
 *
 * Nothing here needs a browser. The marks are a list and the SVG painter writes
 * them as text, so the picture in the README is regenerated and checked by the
 * same suite everything else is.
 */
import { marksAt, svgMarkup, viewAt, viewMatrix, type Extent, type Figure, type Mark } from '../index.js';
import { FRAMES, stripMarks, tangent } from './tangent.js';
import {
  FRAMES as BOOLEAN_FRAMES,
  booleans,
  stripMarks as booleanStripMarks,
} from './boolean.js';
import { FRAMES as TURN_FRAMES, stripMarks as turnStripMarks, turns } from './rotate.js';
import { FRAMES as SOLID_FRAMES, solid, stripMarks as solidStripMarks } from './surface.js';

/** A hundred pixels to the figure unit, which is the size the README shows and
 * the only place the number matters, since the picture scales from its view box. */
export const WIDTH = 1080;
export const HEIGHT = 600;

/** One list of marks written out over a surface shaped like the extent it covers. */
export function markupOf(marks: readonly Mark[], extent: Extent, width: number, height: number): string {
  return svgMarkup(marks, viewMatrix(extent, 'contain', width, height), width, height);
}

export function stillMarkup(figure: Figure, seconds: number, width = WIDTH, height = HEIGHT): string {
  return svgMarkup(marksAt(figure, seconds), viewAt(figure, seconds, width, height), width, height);
}

export interface Sheet {
  /** Where it lives, from the root of the repository. */
  file: string;
  markup: () => string;
}

/** A strip of frames written out over a surface shaped like the strip's own
 * extent, so contain leaves no margin above or below the frames. */
function stripMarkup(strip: { marks: readonly Mark[]; extent: Extent }): string {
  const across = Math.round((strip.extent.width / strip.extent.height) * HEIGHT);
  return markupOf(strip.marks, strip.extent, across, HEIGHT);
}

export const sheets: readonly Sheet[] = [
  { file: 'docs/tangent.svg', markup: () => stillMarkup(tangent, tangent.still) },
  { file: 'docs/tangent-strip.svg', markup: () => stripMarkup(stripMarks(FRAMES, 2)) },
  // The surface is shaped like the figure rather than like the other demo, or
  // contain fits it to the width and leaves a band of white above and below.
  { file: 'docs/boolean.svg', markup: () => stillMarkup(booleans, booleans.still, WIDTH, 400) },
  { file: 'docs/boolean-strip.svg', markup: () => stripMarkup(booleanStripMarks(BOOLEAN_FRAMES, 2)) },
  { file: 'docs/rotate.svg', markup: () => stillMarkup(turns, turns.still) },
  { file: 'docs/rotate-strip.svg', markup: () => stripMarkup(turnStripMarks(TURN_FRAMES, 2)) },
  { file: 'docs/surface.svg', markup: () => stillMarkup(solid, solid.still) },
  { file: 'docs/surface-strip.svg', markup: () => stripMarkup(solidStripMarks(SOLID_FRAMES, 2)) },
];
