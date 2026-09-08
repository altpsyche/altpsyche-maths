/**
 * The demos as SVG text, which is what the README carries and what a gate
 * compares against the committed files.
 *
 * Nothing here needs a browser. The marks are a list and the SVG painter writes
 * them as text, so the picture in the README is regenerated and checked by the
 * same suite everything else is.
 */
import {
  marksAt,
  resolveExtent,
  svgMarkup,
  viewAt,
  viewMatrix,
  type Extent,
  type Figure,
  type Mark,
  type Mat3,
} from '../index.js';
import { SHADE_THEME, THEME } from './palette.js';
import { FRAMES, stripMarks, tangent } from './tangent.js';
import {
  FRAMES as BOOLEAN_FRAMES,
  booleans,
  stripMarks as booleanStripMarks,
} from './boolean.js';
import { FRAMES as TURN_FRAMES, stripMarks as turnStripMarks, turns } from './rotate.js';
import { FRAMES as SOLID_FRAMES, solid, stripMarks as solidStripMarks } from './surface.js';

/** A hundred pixels to the figure unit, which is what turns an extent into the
 * frame a still is written into. A frame shaped differently from the extent it
 * draws leaves a margin no mark reaches, and this is the number that stops it. */
export const PER_UNIT = 100;

/** The frame the strips are fitted into, and the shape the flat demo's own
 * extent already has. */
export const WIDTH = 1080;
export const HEIGHT = 600;

/** The smallest a glyph is drawn on the page, in the pixels a reader sees rather
 * than in the units the sheet is written in. Fourteen is under the 14.7 the
 * tightest still already draws, so the floor lifts the strips and leaves every
 * still where it was. */
export const PAGE_FLOOR = 14;

/** The width each sheet is shown at, the stills in the README and the strips in
 * the guide. A sheet scales from its view box, so this is the only thing that
 * turns a written size into a size on the page. */
export const SHOWN_AT = 720;
export const SHOWN_AT_STRIP = 820;

/** Every colour a sheet is written with: the named ones and the steps of the
 * surface's own ramp, which follows the ground the way the rest do. */
const SHEET_THEME = { ...THEME, ...SHADE_THEME };

/** The floor in written units, from the floor on the page and how far the sheet
 * is scaled to reach the width it is shown at. */
function writtenFloor(width: number, shownAt: number): number {
  return (PAGE_FLOOR * width) / shownAt;
}

export function stillMarkup(figure: Figure, seconds: number, width = WIDTH, height = HEIGHT): string {
  return svgMarkup(marksAt(figure, seconds), viewAt(figure, seconds, width, height), width, height, {
    theme: SHEET_THEME,
    minTextSize: writtenFloor(width, SHOWN_AT),
  });
}

/** What a sheet is before it is written out: the marks, the frame in pixels and
 * the matrix that puts one in the other. A gate that reads how much of a frame
 * the marks cover needs all three, and reading them back out of the text would
 * be measuring the painter rather than the picture. */
export interface Drawn {
  marks: readonly Mark[];
  matrix: Mat3;
  width: number;
  height: number;
  /** The width the page shows it at, which is what turns a written size into a
   * size a reader sees. */
  shownAt: number;
}

export interface Sheet {
  /** Where it lives, from the root of the repository. */
  file: string;
  drawn: () => Drawn;
  markup: () => string;
}

/** A still written into a frame its own extent shapes, at a hundred pixels to
 * the figure unit. An extent given as a function is resolved at the moment the
 * still is taken, so what shapes the frame is what the figure draws then. */
function stillDrawn(figure: Figure): Drawn {
  const extent = resolveExtent(figure.extent, WIDTH / HEIGHT, figure.still);
  const width = Math.round(extent.width * PER_UNIT);
  const height = Math.round(extent.height * PER_UNIT);
  return {
    marks: marksAt(figure, figure.still),
    matrix: viewAt(figure, figure.still, width, height),
    width,
    height,
    shownAt: SHOWN_AT,
  };
}

/** A strip of frames written out over a surface shaped like the strip's own
 * extent, so contain leaves no margin above or below the frames. */
function stripDrawn(strip: { marks: readonly Mark[]; extent: Extent }): Drawn {
  const across = Math.round((strip.extent.width / strip.extent.height) * HEIGHT);
  return {
    marks: strip.marks,
    matrix: viewMatrix(strip.extent, 'contain', across, HEIGHT),
    width: across,
    height: HEIGHT,
    shownAt: SHOWN_AT_STRIP,
  };
}

/** The text of a sheet, from what it draws and the frame it draws into. */
export function markupFor(drawn: Drawn): string {
  return svgMarkup(drawn.marks, drawn.matrix, drawn.width, drawn.height, {
    theme: SHEET_THEME,
    minTextSize: writtenFloor(drawn.width, drawn.shownAt),
  });
}

function sheetOf(file: string, drawn: () => Drawn): Sheet {
  return { file, drawn, markup: () => markupFor(drawn()) };
}

export const sheets: readonly Sheet[] = [
  sheetOf('docs/tangent.svg', () => stillDrawn(tangent)),
  sheetOf('docs/tangent-strip.svg', () => stripDrawn(stripMarks(FRAMES, 2))),
  sheetOf('docs/boolean.svg', () => stillDrawn(booleans)),
  sheetOf('docs/boolean-strip.svg', () => stripDrawn(booleanStripMarks(BOOLEAN_FRAMES, 2))),
  sheetOf('docs/rotate.svg', () => stillDrawn(turns)),
  sheetOf('docs/rotate-strip.svg', () => stripDrawn(turnStripMarks(TURN_FRAMES, 2))),
  sheetOf('docs/surface.svg', () => stillDrawn(solid)),
  sheetOf('docs/surface-strip.svg', () => stripDrawn(solidStripMarks(SOLID_FRAMES, 2))),
];
