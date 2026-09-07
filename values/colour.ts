/**
 * Reading a colour out of the text a figure is written with, so two of them can
 * be walked between.
 *
 * A colour here is a string, which is what both painters take and what a CSS
 * author already knows how to write. Nothing reads it back, so an animation that
 * wants to cross-fade has nothing to work with. This reads the two forms a figure
 * is actually handed, hex and `rgb()`, and refuses every other form rather than
 * guessing at it: a named colour or an `hsl()` read as black is a wrong picture
 * with nothing to say it went wrong.
 */

/** A colour read out of its text, each channel nothing to 255 and the alpha
 * nothing to one. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
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
 * A colour a fraction of the way from one to another, or nothing where either
 * end is a form `colourOf` does not read.
 *
 * The walk is straight through each channel in sRGB, which is what CSS mixes in
 * when nothing names a space. Mixing in a space with even lightness would keep a
 * mid-point from going dull, and that is a different call with a different name
 * rather than a quiet change to this one.
 */
export function lerpColour(from: string, to: string, along: number): string | undefined {
  const start = colourOf(from);
  const end = colourOf(to);
  if (!start || !end) return undefined;
  const at = (a: number, b: number) => a + (b - a) * along;
  return colourText({
    r: at(start.r, end.r),
    g: at(start.g, end.g),
    b: at(start.b, end.b),
    a: at(start.a, end.a),
  });
}
