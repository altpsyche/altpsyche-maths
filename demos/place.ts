/**
 * `fractionOf` written as an expression, which is what puts a mark against the
 * frame in a file rather than in a closure.
 *
 * `fractionOf(extent, across, up)` is a call, and a figure carries no functions,
 * so a demo placing a mark that way had to resolve the extent while it was
 * building its tree. The frame kind reads the extent the figure declares at the
 * aspect being drawn, and these two build the same arithmetic out of it.
 */
import type { Expression } from '../index.js';

/** One member of `fractionOf(frame, across, up)`: the centre of the declared
 * extent, plus how far from the middle the fraction asks for. */
function fraction(name: 'width' | 'height', member: 'x' | 'y', of: number): Expression {
  return {
    kind: 'arithmetic',
    operator: '+',
    left: { kind: 'member', of: { kind: 'frame', name: 'centre' }, name: member },
    right: { kind: 'arithmetic', operator: '*', left: of - 0.5, right: { kind: 'frame', name } },
  };
}

/** A place given as a fraction of the frame, with nothing at the bottom left and
 * one at the top right. */
export const atFraction = (across: number, up: number): Expression => ({
  kind: 'point',
  x: fraction('width', 'x', across),
  y: fraction('height', 'y', up),
});

/** A share of the frame as a length rather than as a place, which is what sizes
 * a mark that fills part of it. */
export const shareOf = (name: 'width' | 'height', of: number): Expression => ({
  kind: 'arithmetic',
  operator: '*',
  left: of,
  right: { kind: 'frame', name },
});
