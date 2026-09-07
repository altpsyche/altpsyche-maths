/**
 * How a coordinate is written out.
 *
 * Rounding is not a nicety here. Both painters have to agree mark for mark, and
 * two doubles that differ in their last bit would read as a difference where a
 * reader could never see one. A thousandth of a pixel is finer than anything a
 * screen or an encoder can hold.
 */
const PLACES = 3;

export function short(value: number): string {
  // An integer keeps no decimal point and a negative zero is written as zero, or the same coordinate
  // reached two ways would compare as two strings.
  const rounded = Number(value.toFixed(PLACES));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}
