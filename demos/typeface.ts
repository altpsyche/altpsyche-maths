/**
 * The typeface every demo writes with, and the weight it writes at.
 *
 * A sheet is read inside an `<img>`, and an `<img>` loads no external resource:
 * no stylesheet, no script and no font file. So a `@font-face` rule pointing
 * anywhere would fall back with no word said, and a face embedded as data would
 * put its bytes in every sheet. What is named here is a system stack, which is a
 * list of families an operating system already has, ending in the generic name
 * the browser answers with when none of them is installed.
 *
 * The package holds no default of its own past the generic `sans-serif`,
 * because a family is a name a painter hands to the platform and the choosing is
 * the author's, so this sits with the demos rather than behind the door.
 */

/** The families to try in order, ending in a generic the browser always answers.
 * The four named faces are the sans serif an operating system ships with, so one
 * of them is installed wherever a sheet is read. */
export const FAMILY = "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The weight every demo writes at. Four hundred is the upright text weight, and
 * it is the one weight a system stack has without a face being synthesised. */
export const WEIGHT = 400;

/** What every demo hands its root group, so a text mark anywhere under it is
 * written with the same face rather than with whatever the painter defaults to. */
export const TYPE = { family: FAMILY, weight: WEIGHT } as const;
