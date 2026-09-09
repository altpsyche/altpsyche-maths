/**
 * A colour, and the reading of one out of the text a CSS author writes.
 *
 * A colour is four channels rather than text, because a figure read by a
 * renderer in another language cannot resolve a CSS custom property and a shader
 * takes four numbers. The text forms are still what a figure is written with, so
 * this reads the two a figure is actually handed, hex and `rgb()`, and refuses
 * every other form rather than guessing at it: a named colour or an `hsl()` read
 * as black is a wrong picture with nothing to say it went wrong.
 */

/** A colour read out of its text, each channel nothing to 255 and the alpha
 * nothing to one. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A colour as a mark carries it: four channels and, where the figure's author
 * gave it one, the name a page themes it under.
 *
 * The channels are what a renderer draws and the name is what a page overrides,
 * so the SVG painter writes `var(--name, #rrggbb)` and every other painter reads
 * the numbers and ignores the name. A colour with no name is a value the page
 * cannot reach, which is what a mixed colour is.
 */
export interface Colour extends Rgba {
  name?: string;
}

const HEX = /^#([0-9a-f]{3,8})$/i;
const FUNCTIONAL = /^rgba?\(([^)]*)\)$/i;

function channel(text: string, top: number): number | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  const percent = trimmed.endsWith('%');
  const value = Number(percent ? trimmed.slice(0, -1) : trimmed);
  if (!Number.isFinite(value)) return undefined;
  return percent ? (value / 100) * top : value;
}

/**
 * A colour read out of its text, or nothing where the form is one this does not
 * read.
 *
 * Hex takes three, four, six or eight digits, which are the short forms with and
 * without an alpha and the long ones. `rgb()` and `rgba()` take their channels
 * separated by commas or by spaces, as numbers or as percentages, and either name
 * takes an alpha, since CSS stopped keeping them apart.
 */
export function colourOf(colour: string): Rgba | undefined {
  const text = colour.trim();

  const hex = HEX.exec(text);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      const parts = [...digits].map((digit) => Number.parseInt(digit + digit, 16));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] / 255 };
    }
    if (digits.length === 6 || digits.length === 8) {
      const parts = [0, 2, 4, 6]
        .filter((at) => at < digits.length)
        .map((at) => Number.parseInt(digits.slice(at, at + 2), 16));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] / 255 };
    }
    return undefined;
  }

  const call = FUNCTIONAL.exec(text);
  if (!call) return undefined;
  const inside = call[1].includes(',') ? call[1].split(',') : call[1].replace('/', ' ').split(/\s+/);
  const parts = inside.map((part) => part.trim()).filter((part) => part !== '');
  if (parts.length < 3 || parts.length > 4) return undefined;
  const r = channel(parts[0], 255);
  const g = channel(parts[1], 255);
  const b = channel(parts[2], 255);
  const a = parts[3] === undefined ? 1 : channel(parts[3], 1);
  if (r === undefined || g === undefined || b === undefined || a === undefined) return undefined;
  return { r, g, b, a };
}

/**
 * A colour read out of its text, with the name a page themes it under, or an
 * error naming the text where the form is one `colourOf` does not read.
 *
 * This is how a colour written by a person becomes a colour a renderer draws, so
 * an unreadable form is refused here rather than painted as nothing further
 * down.
 */
export function colourFrom(colour: string, name?: string): Colour {
  const read = colourOf(colour);
  if (!read) throw new Error(`a colour is a hex or an rgb() and this is neither: ${colour}`);
  return name === undefined ? read : { ...read, name };
}

/**
 * A colour written back out as hex, six digits where it is opaque and eight
 * where it is not.
 *
 * Hex rather than `rgb()` is what lets a figure's sheets stay byte for byte
 * across this form: the channels are whole numbers from nothing to 255, so a hex
 * read in and written back out is the hex that was read.
 */
export function hexOf({ r, g, b, a }: Rgba): string {
  const digits = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, '0');
  const rgb = `#${digits(r)}${digits(g)}${digits(b)}`;
  return a >= 1 ? rgb : `${rgb}${digits(Math.min(1, Math.max(0, a)) * 255)}`;
}

/** A colour written back out, as `rgb()` where it is opaque and `rgba()` where it
 * is not, with the channels rounded so the same colour reached two ways is the
 * same string. */
export function colourText({ r, g, b, a }: Rgba): string {
  const whole = (value: number) => Math.round(Math.min(255, Math.max(0, value)));
  const parts = `${whole(r)}, ${whole(g)}, ${whole(b)}`;
  if (a >= 1) return `rgb(${parts})`;
  return `rgba(${parts}, ${Number(Math.min(1, Math.max(0, a)).toFixed(3))})`;
}

/**
 * A colour a fraction of the way from one to another.
 *
 * The walk is straight through each channel in sRGB, which is what CSS mixes in
 * when nothing names a space. Mixing in a space with even lightness would keep a
 * mid-point from going dull, and that is a different call with a different name
 * rather than a quiet change to this one.
 *
 * The mixed colour carries no name, since a page themes the two ends and has no
 * value for what lies between them. So a themed colour cross-faded on a dark
 * page walks from the value its record holds, which is the light one the palette
 * wrote in.
 */
export function lerpColour(from: Colour, to: Colour, along: number): Colour {
  const at = (a: number, b: number) => a + (b - a) * along;
  return {
    r: at(from.r, to.r),
    g: at(from.g, to.g),
    b: at(from.b, to.b),
    a: at(from.a, to.a),
  };
}
