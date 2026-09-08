/**
 * The sizes a figure's text may take, named by what the text is doing.
 *
 * A text scale is four sizes, one per role, each a fixed ratio above the one
 * below it. This is a modular scale, which is the typographic name for sizes
 * that step by one ratio rather than by a list of numbers chosen apart.
 *
 * A figure names a role rather than a number, so the hierarchy is the same
 * wherever it is drawn. The smallest role is the base, because the smallest
 * text is what a reader has to be able to read at all and every other size is
 * headroom above it.
 */

/** What a piece of text is doing in the figure.
 *
 * A title says what the picture is. A note is a remark written beside the
 * picture, which is read at the distance prose is read at. A label is a tag on
 * a drawn mark and has to sit beside that mark without covering it. A tick is a
 * number on an axis, which is the smallest text a figure carries. */
export type TextRole = 'title' | 'note' | 'label' | 'tick';

export interface TextScale {
  readonly title: number;
  readonly note: number;
  readonly label: number;
  readonly tick: number;
}

/** The step between one role and the next.
 *
 * The square root of two, so two steps double: a note is twice a tick and a
 * title is twice a label. It is the ratio ISO 216 sizes paper by, and one step
 * of 1.41421 is a difference a reader sees without the four roles running off
 * the top of the figure. */
export const TEXT_RATIO = Math.SQRT2;

/**
 * The four sizes, from the size the ticks take.
 *
 * Each role is one multiplication above the role below it rather than the base
 * raised to a power, so a scale built on a different ratio steps evenly too.
 */
export function textScale(tick: number, ratio: number = TEXT_RATIO): TextScale {
  const label = tick * ratio;
  const note = label * ratio;
  return { title: note * ratio, note, label, tick };
}
