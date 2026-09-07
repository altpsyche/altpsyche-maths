/**
 * How close two things come before this package reads them as the same place.
 *
 * It is a distance in the picture's own units rather than a share of anything,
 * so a figure drawn in units of thousands wants its own number passed in. Every
 * call that takes a tolerance takes it as a distance and defaults to this one,
 * so a crossing, a cut, a flattening and a stitch all agree about what counts as
 * one place without a caller having to line four numbers up.
 *
 * A millionth of a figure unit is a ten thousandth of a pixel at the hundred
 * pixels to the unit the demos draw at, so nothing this decides is visible. What
 * it decides is which meetings are told apart, since two crossings closer than
 * this come back as one.
 */
export const TOLERANCE = 1e-6;
