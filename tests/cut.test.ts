import { describe, expect, it } from 'vitest';
import { circle, cutPath, pointOn, rect, vec2 } from '@altpsyche/maths';
import type { Cut, Path } from '@altpsyche/maths';

/**
 * A cut path has to draw what it drew, so these walk both paths over the same
 * places and compare. The walk maps a fraction along an uncut piece onto the
 * piece the cuts left it in, which is the definition of a cut and not the way
 * the cutting is written.
 */

const cutsIn = (cuts: readonly Cut[], subpath: number, curve: number): number[] =>
  cuts
    .filter((cut) => cut.subpath === subpath && cut.curve === curve)
    .map((cut) => cut.along)
    .sort((a, b) => a - b);

/** The same place on the cut path as a fraction along one piece of the path it
 * came from. */
const samePlace = (cut: Path, cuts: readonly Cut[], subpath: number, curve: number, along: number) => {
  let index = 0;
  for (let piece = 0; piece < curve; piece++) index += cutsIn(cuts, subpath, piece).length + 1;
  const edges = [0, ...cutsIn(cuts, subpath, curve), 1];
  let part = 0;
  while (part < edges.length - 2 && along > edges[part + 1]) part++;
  const low = edges[part];
  const high = edges[part + 1];
  const pieces = cut[subpath].curves;
  const from = part + index === 0 ? cut[subpath].start : pieces[index + part - 1].to;
  return pointOn(from, pieces[index + part], (along - low) / (high - low));
};

const walksTheSame = (path: Path, cuts: readonly Cut[], samples: number) => {
  const cut = cutPath(path, cuts);
  let worst = 0;
  for (let subpath = 0; subpath < path.length; subpath++) {
    let from = path[subpath].start;
    const perPiece = Math.ceil(samples / path[subpath].curves.length);
    for (let piece = 0; piece < path[subpath].curves.length; piece++) {
      const curve = path[subpath].curves[piece];
      for (let step = 0; step <= perPiece; step++) {
        const along = step / perPiece;
        const was = pointOn(from, curve, along);
        const now = samePlace(cut, cuts, subpath, piece, along);
        worst = Math.max(worst, Math.hypot(now.x - was.x, now.y - was.y));
      }
      from = curve.to;
    }
  }
  return worst;
};

const pieceCount = (path: Path) => path.reduce((total, subpath) => total + subpath.curves.length, 0);

describe('a path cut at its crossings', () => {
  it('draws what it drew when every piece is cut in half', () => {
    const path = circle(vec2(0, 0), 1);
    const cuts = [0, 1, 2, 3].map((curve) => ({ subpath: 0, curve, along: 0.5 }));
    expect(walksTheSame(path, cuts, 200)).toBeLessThan(1e-12);
    expect(pieceCount(cutPath(path, cuts))).toBe(pieceCount(path) + cuts.length);
  });

  it('draws what it drew when one piece takes several cuts', () => {
    const path = circle(vec2(0, 0), 1);
    const cuts = [0.2, 0.5, 0.9].map((along) => ({ subpath: 0, curve: 1, along }));
    expect(walksTheSame(path, cuts, 200)).toBeLessThan(1e-12);
    expect(pieceCount(cutPath(path, cuts))).toBe(pieceCount(path) + cuts.length);
  });

  it('cuts each subpath on its own', () => {
    const path: Path = [...rect(vec2(0, 0), 2, 1), ...circle(vec2(5, 0), 1)];
    const cuts = [
      { subpath: 0, curve: 2, along: 0.25 },
      { subpath: 1, curve: 0, along: 0.75 },
      { subpath: 1, curve: 3, along: 0.5 },
    ];
    expect(walksTheSame(path, cuts, 200)).toBeLessThan(1e-12);
    expect(pieceCount(cutPath(path, cuts))).toBe(pieceCount(path) + cuts.length);
  });

  it('leaves a path with no cuts as it was', () => {
    const path = circle(vec2(0, 0), 1);
    expect(cutPath(path, [])).toBe(path);
    expect(cutPath(path, [{ subpath: 7, curve: 0, along: 0.5 }])).toEqual(path);
  });

  it('makes no piece of nothing out of a cut at an end or a cut already made', () => {
    const path = circle(vec2(0, 0), 1);
    const ends = cutPath(path, [
      { subpath: 0, curve: 0, along: 0 },
      { subpath: 0, curve: 0, along: 1 },
      { subpath: 0, curve: 1, along: 1e-12 },
    ]);
    expect(pieceCount(ends)).toBe(pieceCount(path));
    const twice = cutPath(path, [
      { subpath: 0, curve: 0, along: 0.5 },
      { subpath: 0, curve: 0, along: 0.5 + 1e-12 },
    ]);
    expect(pieceCount(twice)).toBe(pieceCount(path) + 1);
  });

  it('keeps where a subpath starts and whether it is closed', () => {
    const path = circle(vec2(0, 0), 1);
    const cut = cutPath(path, [{ subpath: 0, curve: 2, along: 0.5 }]);
    expect(cut[0].start).toEqual(path[0].start);
    expect(cut[0].closed).toBe(true);
    expect(cut[0].curves[cut[0].curves.length - 1].to).toEqual(path[0].start);
  });
});
