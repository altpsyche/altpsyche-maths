import { describe, expect, it } from 'vitest';
import { boundsOfMarks, circle, colourFrom, flatten, followView, group, insetMarks, insetMatrix, interval, line, marksAt, mat3, moveView, sameMarks, shape, text, vec2, type Figure, type Mark } from '@altpsyche/maths';

/**
 * The inset, which is a second view of the same figure drawn into a rectangle of
 * its own frame.
 *
 * What it is held to is agreeing with the figure it magnifies: every mark it
 * draws is the same mark read through its own extent, so the two cannot show
 * different pictures of one time.
 */

const ink = { colour: colourFrom('#0f0') };

/** A picture 20 by 10 with a disc near the origin and a rule across it. */
const scene = group('fig', [
  shape('disc', circle(vec2(1, 0.5), 0.5), { fill: ink }),
  shape('rule', line(vec2(-8, 0), vec2(8, 0)), { stroke: { colour: colourFrom('#fff'), width: 0.1 } }),
  shape('far', circle(vec2(-7, -4), 0.5), { fill: ink }),
]);

/** Two units of the picture round the disc, drawn into a two-unit box in the top
 * right of the frame, which magnifies by two. */
const shows = { width: 2, height: 2, centre: vec2(1, 0.5) };
const into = { x: interval(6, 10), y: interval(1, 5) };

const idOf = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const found = (marks: readonly Mark[], id: string) => marks.find((mark) => mark.id === id)!;

describe('the matrix an inset draws through', () => {
  it('takes the middle of what it shows to the middle of the rectangle', () => {
    const through = insetMatrix(shows, into);
    const middle = mat3.transformPoint(through, vec2(1, 0.5));
    expect(middle.x).toBeCloseTo(8, 12);
    expect(middle.y).toBeCloseTo(3, 12);
  });

  it('magnifies by the smaller of the two ratios where it contains', () => {
    // Four units of rectangle over two units shown across, and four over one up,
    // so containing takes the two and covering takes the four.
    const tall = { width: 2, height: 1, centre: vec2(0, 0) };
    expect(mat3.scaleFactor(insetMatrix(tall, into))).toBeCloseTo(2, 12);
    expect(mat3.scaleFactor(insetMatrix(tall, into, 'cover'))).toBeCloseTo(4, 12);
  });

  it('keeps the picture the right way up, unlike the view matrix', () => {
    const through = insetMatrix(shows, into);
    const above = mat3.transformPoint(through, vec2(1, 1.5));
    // A unit above the middle of what is shown is two above the middle of the
    // rectangle rather than two below it.
    expect(above.y).toBeCloseTo(5, 12);
  });
});

describe('the marks of an inset', () => {
  const marks = flatten(scene);
  const drawn = insetMarks(marks, { shows, into });

  it('are the figure marks read through its own extent, mark for mark', () => {
    // The same picture flattened under the inset's matrix, which reaches the
    // magnified marks by the tree rather than by the marks and so cannot agree
    // with the inset by sharing its arithmetic.
    const wanted = flatten(scene, insetMatrix(shows, into))
      .filter((mark) => drawn.some((one) => one.id === `inset/${mark.id}`))
      .map((mark) => ({ ...mark, id: `inset/${mark.id}` }));
    expect(sameMarks(drawn, wanted, 1e-12)).toBe(true);
  });

  it('magnify a stroke width with the geometry', () => {
    const rule = found(drawn, 'inset/fig/rule');
    expect(rule.kind === 'path' && rule.stroke!.width).toBeCloseTo(0.2, 12);
  });

  it('carry the rectangle as their clip, so nothing spills out of it', () => {
    expect(drawn.every((mark) => mark.clip === into || JSON.stringify(mark.clip) === JSON.stringify(into))).toBe(true);
  });

  it('leave out what the rectangle cannot hold', () => {
    // The far disc sits at (-7, -4), which is 16 units left and 9 down of what the
    // inset shows, so magnified by two it is nowhere near the rectangle.
    expect(idOf(drawn)).toEqual(['inset/fig/disc', 'inset/fig/rule']);
  });

  it('are named apart from the marks they copy', () => {
    const named = insetMarks(marks, { shows, into, name: 'corner' });
    expect(idOf(named)).toEqual(['corner/fig/disc', 'corner/fig/rule']);
  });

  it('keep a clip a mark already carried, cut down to the rectangle', () => {
    const half = flatten(
      shape('disc', circle(vec2(1, 0.5), 0.5), { fill: ink, clip: { x: interval(0, 1), y: interval(-4, 5) } })
    );
    const [mark] = insetMarks(half, { shows, into });
    // The clip magnified by two about the middle of what is shown runs from 6 to 8
    // across, and the rectangle holds all of that.
    expect(mark.clip!.x.from).toBeCloseTo(6, 12);
    expect(mark.clip!.x.to).toBeCloseTo(8, 12);
    // Up it magnifies to -8.5 and 9.5, which the rectangle cuts back to its own.
    expect(mark.clip!.y.from).toBeCloseTo(1, 12);
    expect(mark.clip!.y.to).toBeCloseTo(5, 12);
  });

  it('leave out a mark whose own clip misses the rectangle', () => {
    const elsewhere = flatten(
      shape('disc', circle(vec2(1, 0.5), 0.5), { fill: ink, clip: { x: interval(-8, -6), y: interval(-4, 5) } })
    );
    expect(insetMarks(elsewhere, { shows, into })).toEqual([]);
  });

  it('magnify text with everything else', () => {
    const labelled = flatten(text('label', vec2(1, 0.5), 'here', 0.4, { fill: ink }));
    const [mark] = insetMarks(labelled, { shows, into });
    expect(mark.kind === 'text' && mark.size).toBeCloseTo(0.8, 12);
    expect(mark.kind === 'text' && mark.at.x).toBeCloseTo(8, 12);
  });
});

describe('an inset whose own view moves', () => {
  it('is folded in full, so it shows the part it names from the first frame', () => {
    const marks = flatten(scene);
    const moved = insetMarks(marks, { shows, into, view: moveView({ centre: vec2(-7, -4) }) });
    // The view moves what is shown onto the far disc, so that is the mark inside
    // the rectangle and the near two are the ones left out.
    expect(idOf(moved)).toEqual(['inset/fig/far']);
  });

  it('follows a named mark by the form a timeline already carries', () => {
    const walking = (x: number) =>
      flatten(group('fig', [shape('dot', circle(vec2(x, 0), 0.25), { fill: ink })]));
    const at = (x: number) => {
      const [dot] = insetMarks(walking(x), {
        shows: { width: 2, height: 2, centre: vec2(0, 0) },
        into,
        view: followView('fig/dot'),
      });
      return boundsOfMarks([dot])!;
    };
    // Wherever the dot is, following it puts it in the middle of the rectangle,
    // which is (8, 3), magnified by two so its radius reads 0.5.
    for (const x of [-6, 0, 3.5]) {
      const box = at(x);
      expect((box.x.from + box.x.to) / 2).toBeCloseTo(8, 9);
      expect((box.y.from + box.y.to) / 2).toBeCloseTo(3, 9);
      expect(box.x.to - box.x.from).toBeCloseTo(1, 9);
    }
  });
});

describe('a figure carrying an inset', () => {
  const figure: Figure = { extent: { width: 20, height: 10 }, still: 0, scene, insets: [{ shows, into }] };

  it('draws its own marks and then the inset over them', () => {
    expect(idOf(marksAt(figure, 0))).toEqual([
      'fig/disc',
      'fig/rule',
      'fig/far',
      'inset/fig/disc',
      'inset/fig/rule',
    ]);
  });

  it('draws nothing extra where it names no inset', () => {
    const bare: Figure = { extent: { width: 20, height: 10 }, still: 0, scene };
    expect(idOf(marksAt(bare, 0))).toEqual(['fig/disc', 'fig/rule', 'fig/far']);
  });

  it('magnifies the picture rather than an inset of it where two are named', () => {
    const twice: Figure = {
      ...figure,
      insets: [
        { shows, into },
        { shows, into: { x: interval(-10, -6), y: interval(1, 5) }, name: 'second' },
      ],
    };
    const marks = marksAt(twice, 0);
    const one = found(marks, 'inset/fig/disc');
    const other = found(marks, 'second/fig/disc');
    expect(idOf(marks).filter((id) => id.startsWith('second/'))).toEqual(['second/fig/disc', 'second/fig/rule']);
    // The two rectangles are the same size, so the two copies are the same shape
    // in different places rather than one being a magnification of the other.
    const boxes = [one, other].map((mark) => boundsOfMarks([mark])!);
    expect(boxes[0].x.to - boxes[0].x.from).toBeCloseTo(boxes[1].x.to - boxes[1].x.from, 12);
    expect(boxes[1].x.from - boxes[0].x.from).toBeCloseTo(-16, 12);
  });
});
