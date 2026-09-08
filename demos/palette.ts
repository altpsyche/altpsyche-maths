/**
 * The colours every demo draws with, and what each is for.
 *
 * Four files each wrote the same hex out again, so `#1b1b1b` stood in four
 * places and the blue of an arrow in four more, and a picture could not be
 * recoloured without finding all of them. The package holds no palette of its
 * own, because a mark takes a colour as text and the choosing is the author's,
 * so this sits with the demos rather than behind the door.
 *
 * Each colour has a value per ground, because no one value can serve both: to
 * clear 4.5:1 against white a colour needs a relative luminance of 0.183333 or
 * less, and to clear it against `#0d1117` it needs 0.199675 or more. Every
 * colour is painted as `var(--name, light)`, so a sheet carrying the theme takes
 * the value of the ground it is read on and a sheet whose style element was
 * stripped falls back to the light value it shipped with.
 *
 * Anything a reader takes a value or a label off clears 4.5:1 against both
 * grounds, and the rest are washes and fields that carry no reading of their
 * own. A test holds both halves against both grounds.
 */

/** A colour per ground, keyed by the custom property it is written to. */
export const THEME = {
  ink: { light: '#1b1b1b', dark: '#ebebeb' },
  mist: { light: '#b4b9c0', dark: '#3a414c' },
  slate: { light: '#6b7280', dark: '#9aa3ae' },
  ember: { light: '#c2410c', dark: '#f97316' },
  amber: { light: '#b45309', dark: '#eba043' },
  peach: { light: '#fdba74', dark: '#7a4a1c' },
  deep: { light: '#0369a1', dark: '#4cb8ea' },
  sky: { light: '#38bdf8', dark: '#1f6f96' },
  haze: { light: '#bfd7e6', dark: '#33505f' },
  steel: { light: '#7fb2cc', dark: '#41708a' },
  frost: { light: '#e0f2fe', dark: '#17293b' },
  moss: { light: '#15803d', dark: '#3ec46d' },
} as const;

/** The grounds the two halves of the theme are measured against. */
export const GROUND = { light: '#ffffff', dark: '#0d1117' } as const;

/** One colour as a mark takes it, with the light value written in as what it
 * falls back to. */
function painted(name: keyof typeof THEME): string {
  return `var(--${name}, ${THEME[name].light})`;
}

/** Every line a reader reads a number or a word off. */
export const INK = painted('ink');
/** The grid behind a graph, which has to be seen without being looked at. */
export const MIST = painted('mist');
/** A shape that stands still while another moves across it. */
export const SLATE = painted('slate');
/** The curve a picture is about, and the cut where two surfaces meet. */
export const EMBER = painted('ember');
/** What a thing turns while it is being pointed at. */
export const AMBER = painted('amber');
/** A region under a curve or inside a shape, which sits behind everything. */
export const PEACH = painted('peach');
/** The moving thing, and the arrows of a field. */
export const DEEP = painted('deep');
/** The edge of a pane of glass in space. */
export const SKY = painted('sky');
/** A field arrow where the field is gentle. */
export const HAZE = painted('haze');
/** A field arrow where the field is steep. */
export const STEEL = painted('steel');
/** The face of a pane of glass. */
export const FROST = painted('frost');
/** A run of steepest descent. */
export const MOSS = painted('moss');

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
