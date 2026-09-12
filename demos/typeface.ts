/**
 * The typeface every demo writes with, and the weight it writes at.
 *
 * A sheet is read inside an `<img>`, and an `<img>` loads no external resource:
 * no stylesheet, no script and no font file. So a `@font-face` rule pointing
 * anywhere falls back with no word said, and the bytes written into the sheet
 * are the one way its letters are the same letters on every machine. Each sheet
 * carries the shipped face and names it first, and what follows it is a system
 * stack, which is a list of families an operating system already has, ending in
 * the generic name the browser answers with when none of them is installed.
 *
 * The package holds no default of its own past the generic `sans-serif`,
 * because a family is a name a painter hands to the platform and the choosing is
 * the author's, so this sits with the demos rather than behind the door.
 *
 * The shipped typeface is named first. A card has that face and no other, so a
 * page that has loaded it draws the same letters the card draws, and a sheet
 * that carries it sets its labels in it wherever it is read. The system stack
 * behind it is what a mark drawn by a caller that carries no face falls through
 * to.
 */

/** The families to try in order, ending in a generic the browser always answers.
 * The first is the face this package ships, which every committed sheet carries;
 * the four after it are the sans serif an operating system ships with, so one of
 * them is installed wherever a sheet is read. */
export const FAMILY = "'Noto Sans', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The weight every demo writes at. Four hundred is the upright text weight, and
 * it is the one weight a system stack has without a face being synthesised. */
export const WEIGHT = 400;

/** What every demo hands its root group, so a text mark anywhere under it is
 * written with the same face rather than with whatever the painter defaults to. */
export const TYPE = { family: FAMILY, weight: WEIGHT } as const;
