/**
 * The colours every demo draws with, and what each is for.
 *
 * Four files each wrote the same hex out again, so `#1b1b1b` stood in four
 * places and the blue of an arrow in four more, and a picture could not be
 * recoloured without finding all of them. The package holds no palette of its
 * own, because a mark takes a colour as text and the choosing is the author's,
 * so this sits with the demos rather than behind the door.
 *
 * Each is measured against the white the sheets are drawn on. Anything a reader
 * has to read a value or a label off clears the contrast the guidelines ask of
 * text, and the rest are washes and fields that carry no reading of their own.
 * A test holds both halves.
 */

/** Every line a reader reads a number or a word off. */
export const INK = '#1b1b1b';
/** The grid behind a graph, which has to be seen without being looked at. */
export const MIST = '#b4b9c0';
/** A shape that stands still while another moves across it. */
export const SLATE = '#6b7280';
/** The curve a picture is about, and the cut where two surfaces meet. */
export const EMBER = '#c2410c';
/** What a thing turns while it is being pointed at. */
export const AMBER = '#b45309';
/** A region under a curve or inside a shape, which sits behind everything. */
export const PEACH = '#fdba74';
/** The moving thing, and the arrows of a field. */
export const DEEP = '#0369a1';
/** The edge of a pane of glass in space. */
export const SKY = '#38bdf8';
/** A field arrow where the field is gentle. */
export const HAZE = '#bfd7e6';
/** A field arrow where the field is steep. */
export const STEEL = '#7fb2cc';
/** The face of a pane of glass. */
export const FROST = '#e0f2fe';
/** A run of steepest descent. */
export const MOSS = '#15803d';

/**
 * How dark a cell of a surface is drawn, from how squarely it faces the light.
 *
 * The ramp is warm rather than grey, so a cell facing away reads as shadow on
 * the same surface rather than as a different material. It runs from 150 to 240,
 * which keeps the darkest cell above the ground and the lightest below the
 * white, so neither end of the surface disappears.
 */
export function shadeOf(amount: number): { colour: string } {
  const level = Math.round(150 + 90 * amount);
  return { colour: `rgb(${level}, ${level - 14}, ${level - 34})` };
}
