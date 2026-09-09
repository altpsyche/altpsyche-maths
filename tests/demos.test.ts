import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  areaOf,
  boundsOf,
  boundsOfMarks,
  centreOf,
  colourFrom,
  colourOf,
  containsPoint,
  durationOf,
  easeOut,
  extentAt,
  flatten,
  flattenPath,
  frameTimesOf,
  interval,
  isLoop,
  marksAt,
  nearestEdge,
  overlapOf,
  plot,
  pointAlong,
  readFigure,
  pointOf,
  resolveExtent,
  resolveNode,
  sameMarks,
  sampleTrack,
  slopeOf,
  smoothstep,
  streamlineOf,
  tangentAt,
  toGraph,
  vec2,
  viewAt,
  widthAt,
  type Figure,
  type Mark,
  type Taper,
  type Vec2,
} from '../index.js';
import {
  HEIGHT as STILL_HEIGHT,
  PAGE_FLOOR,
  PER_UNIT,
  SHOWN_AT,
  SHOWN_AT_STRIP,
  WIDTH as STILL_WIDTH,
  figures,
  sheets,
  stillMarkup,
} from '../demos/render.js';
import { ADVANCE, CAP, bareShare } from '../demos/cover.js';
import { FAMILY, WEIGHT } from '../demos/typeface.js';
import {
  FRAMES as SOLID_FRAMES,
  HEIGHT,
  STRIP_ALONG,
  BEAT as SOLID_BEAT,
  TIMES as SOLID_TIMES,
  alongAt,
  solid,
  stripMarks as solidStripMarks,
} from '../demos/surface.js';
import { descents, eyeAt, saddle, section } from './solid-forms.js';
import { FIELD, FRAMES, TIMES, coords, curve, slopeField, stripMarks, tangent, walk } from '../demos/tangent.js';
import {
  AMBER,
  CREAM,
  DEEP,
  EMBER,
  FROST,
  GLAZE,
  GROUND,
  HAZE,
  INK,
  MIST,
  MOSS,
  PEACH,
  SHADE_THEME,
  SKY,
  SLATE,
  STEEL,
  THEME,
} from '../demos/palette.js';
import {
  FRAMES as TURN_FRAMES,
  GIVEN,
  LOCAL,
  OWN,
  SWING,
  TIMES as TURN_TIMES,
  TURN,
  stripMarks as turnStripMarks,
  turns,
} from '../demos/rotate.js';
import {
  BIG,
  FRAMES as BOOLEAN_FRAMES,
  REACH,
  SMALL,
  TIMES as BOOLEAN_TIMES,
  booleans,
  scene as booleanScene,
  stripMarks as booleanStripMarks,
} from '../demos/boolean.js';

const root = path.resolve(import.meta.dirname, '..');
const reading = (marks: readonly Mark[]) => {
  const mark = marks.find((each) => each.id === 'tangent/reading');
  if (mark?.kind !== 'text') throw new Error('the reading is text');
  return mark.text;
};
const walkPath = plot(coords, curve, { over: interval(0, 3) });
const gaps = (points: readonly { x: number; y: number }[]) =>
  points.slice(1).map((point, at) => Math.hypot(point.x - points[at].x, point.y - points[at].y));

describe("every demo's view", () => {
  // The boolean and rotation demos hold no view entry, so each is the matrix its
  // own extent gives. The flat demo follows its dot and the solid demo pushes in
  // on its crossing, both from entries in their own timelines.
  const wanted: readonly [string, Figure, readonly number[], readonly number[]][] = [
    ['tangent', tangent, [TIMES.entrance, TIMES.beat], [100, 0, 0, 0, -100, 0, 602, 300, 1]],
    ['tangent', tangent, [TIMES.walkTo, durationOf(tangent)], [100, 0, 0, 0, -100, 0, 478, 300, 1]],
    [
      'solid',
      solid,
      [SOLID_TIMES.entrance, solid.still, SOLID_TIMES.quarter, SOLID_TIMES.round],
      [93.75, 0, 0, 0, -93.75, 0, 540, 300, 1],
    ],
    // Pushed in to 6.8 by 5.3073, which is 8.2 over 6.8 more of the picture.
    ['solid', solid, [SOLID_TIMES.half], [113.051471, 0, 0, 0, -113.051471, 0, 540, 300, 1]],
    ['booleans', booleans, [booleans.still, durationOf(booleans)], [100, 0, 0, 0, -100, 0, 540, 300, 1]],
    [
      'turns',
      turns,
      [turns.still, durationOf(turns)],
      [103.448276, 0, 0, 0, -103.448276, 0, 485.172414, 291.724138, 1],
    ],
  ];

  it('is the matrix its own extent and its own view entries give, at every named time', () => {
    for (const [name, figure, times, matrix] of wanted) {
      for (const seconds of times) {
        const read = Array.from(viewAt(figure, seconds, 1080, 600));
        read.forEach((value, at) => expect(value, `${name} at ${seconds}`).toBeCloseTo(matrix[at], 6));
      }
    }
  });

  it('leaves the solid demo where it began, since the push comes back', () => {
    const start = Array.from(viewAt(solid, SOLID_TIMES.entrance, 1080, 600));
    const end = Array.from(viewAt(solid, durationOf(solid), 1080, 600));
    end.forEach((value, at) => expect(value).toBeCloseTo(start[at], 12));
  });

  it('crops nothing a reader can see when the solid demo pushes in', () => {
    // The push holds the crossing with a margin at every place in the orbit, and
    // the two labels it does crop are at nothing by the time the camera moves.
    let margin = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 120; step += 1) {
      // The beat at the face of the saddle sits before the push, so the window
      // the camera is held in starts a beat later than the orbit alone would put
      // it.
      const seconds = SOLID_TIMES.entrance + 3.6 + SOLID_BEAT + (2.8 * step) / 120;
      const extent = extentAt(solid, seconds, 1.8);
      const cut = boundsOfMarks(marksAt(solid, seconds).filter((mark) => mark.id.startsWith('solid/cut/')))!;
      margin = Math.min(
        margin,
        extent.width / 2 - Math.max(Math.abs(cut.x.from), Math.abs(cut.x.to)),
        extent.height / 2 - Math.max(Math.abs(cut.y.from), Math.abs(cut.y.to))
      );
      for (const id of ['solid/rule', 'solid/title']) {
        const labels = marksAt(solid, seconds).filter((mark) => mark.id.startsWith(id));
        expect(labels.every((mark) => (mark.opacity ?? 1) === 0), id).toBe(true);
      }
    }
    expect(margin).toBeCloseTo(0.2896, 4);
  });
});

describe('the committed pictures', () => {
  it('are what the code draws now', () => {
    // A picture in a README that nothing regenerates goes stale in silence.
    // Run `npm run demos` when this fails on purpose.
    for (const sheet of sheets) {
      const committed = readFileSync(path.join(root, sheet.file), 'utf8');
      expect(committed).toBe(`${sheet.markup()}\n`);
    }
  });

  it('are drawn from the committed files rather than from the modules that wrote them', () => {
    // A sheet drawn from the module says the code draws a picture. A sheet drawn
    // from the file says the format carries one, which is the stronger claim and
    // the only one a renderer in another language could make.
    for (const figure of figures) {
      const read = readFigure(readFileSync(path.join(root, figure.file), 'utf8'));
      const sheet = sheets.find((one) => one.file === figure.file.replace('demos/', 'docs/').replace('.figure.json', '.svg'));
      expect(sheet).toBeDefined();
      expect(marksAt(read, read.still)).toEqual(sheet!.drawn().marks);
    }
  });

  it('carry the figure files the code writes now', () => {
    // A file of the format that nothing regenerates goes stale the way a picture
    // does. Run `npm run demos` when this fails on purpose.
    for (const figure of figures) {
      expect(readFileSync(path.join(root, figure.file), 'utf8')).toBe(figure.text());
    }
  });

  it('paint the ground each half of the theme was measured against', () => {
    // Inside an `<img>` the colour scheme query answers for the browser rather
    // than for the page, so a sheet that paints no ground can land its dark half
    // on a light page. Every reading colour falls under 2.81:1 when it does.
    for (const sheet of sheets) {
      const style = sheet.markup();
      const [light, dark] = style
        .slice(style.indexOf('<style>'), style.indexOf('</style>'))
        .split('@media(prefers-color-scheme:dark)');
      expect(light).toContain(`background:${GROUND.light}`);
      expect(dark).toContain(`background:${GROUND.dark}`);
    }
  });

  it('draw no glyph under the floor on the page, and leave every still where it was', () => {
    // A sheet scales from its view box, so the width the page shows it at is what
    // turns a written size into a size a reader sees.
    for (const sheet of sheets) {
      const markup = sheet.markup();
      const written = [...markup.matchAll(/font-size="([0-9.]+)"/g)].map((found) => Number(found[1]));
      const box = Number(/viewBox="0 0 ([0-9.]+)/.exec(markup)![1]);
      const shownAt = sheet.file.includes('-strip') ? SHOWN_AT_STRIP : SHOWN_AT;
      expect(Math.min(...written) * (shownAt / box)).toBeGreaterThanOrEqual(PAGE_FLOOR - 0.05);
    }
  });

  it('holds the four strips at the floor and gives the README its best-read still', () => {
    const onPage = (file: string) => {
      const markup = sheets.find((sheet) => sheet.file === file)!.markup();
      const written = [...markup.matchAll(/font-size="([0-9.]+)"/g)].map((found) => Number(found[1]));
      const box = Number(/viewBox="0 0 ([0-9.]+)/.exec(markup)![1]);
      const shownAt = file.includes('-strip') ? SHOWN_AT_STRIP : SHOWN_AT;
      return Math.min(...written) * (shownAt / box);
    };
    for (const strip of ['tangent-strip', 'boolean-strip', 'rotate-strip', 'surface-strip']) {
      expect(onPage(`docs/${strip}.svg`)).toBeCloseTo(14.0, 1);
    }
    const stills = ['tangent', 'boolean', 'rotate', 'surface'].map((name) => onPage(`docs/${name}.svg`));
    expect(stills[0]).toBeCloseTo(21.33, 2);
    expect(stills[1]).toBeCloseTo(20.0, 2);
    expect(stills[2]).toBeCloseTo(21.0, 2);
    expect(stills[3]).toBeCloseTo(19.32, 2);
    // The README opens on the still that clears both readings by the most, so the
    // one it opens on draws the largest smallest glyph as well as the least bare frame.
    expect(Math.max(...stills)).toBe(stills[0]);
  });

  it('write every piece of text in the one face the demos name', () => {
    for (const figure of [tangent, booleans, turns, solid]) {
      const end = durationOf(figure);
      for (let step = 0; step <= 8; step += 1) {
        for (const mark of marksAt(figure, (step / 8) * end)) {
          if (mark.kind !== 'text') continue;
          expect(mark.family, mark.id).toBe(FAMILY);
          expect(mark.weight, mark.id).toBe(WEIGHT);
        }
      }
    }
  });

  it('name a face the reader already has, since a sheet in an image loads nothing', () => {
    // A generic name is what the browser answers with when none of the families
    // is installed, so the stack ending in one is what makes it resolve offline.
    const generic = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
    const named = FAMILY.split(',').map((entry) => entry.trim());
    expect(generic).toContain(named[named.length - 1]);
    for (const entry of named) expect(entry).toMatch(/^(?:[A-Za-z][A-Za-z0-9-]*|'[A-Za-z][A-Za-z0-9 -]*')$/);
    for (const sheet of sheets) {
      const markup = sheet.markup();
      expect(markup).not.toContain('@font-face');
      expect(markup).not.toContain('@import');
      // A gradient's fill is `url(#id)`, which names an element of the sheet
      // itself, so what is forbidden is a reference reaching outside it.
      expect(markup).not.toMatch(/url\((?!#)/);
      expect(markup).not.toContain('<link');
    }
  });

  it('give each figure room for the sizes its own scale asks for', () => {
    // A text mark carries no measured extent, so its box is its size, how many
    // characters it has and the same advance the coverage measure counts by. The
    // whole run is walked, since a word riding a turning shape leaves the frame
    // between two named frames and not at either of them.
    for (const figure of [tangent, booleans, turns, solid]) {
      const end = durationOf(figure);
      for (let step = 0; step <= 240; step += 1) {
        const seconds = (step / 240) * end;
        const extent = extentAt(figure, seconds, STILL_WIDTH / STILL_HEIGHT);
        const centre = extent.centre ?? vec2(0, 0);
        for (const mark of marksAt(figure, seconds)) {
          if (mark.kind !== 'text') continue;
          // A mark at nothing is not drawn, so a view that pushes past a label
          // has cropped nothing a reader could see.
          if ((mark.opacity ?? 1) === 0) continue;
          // A clipped label is cut by its own rectangle rather than by the frame,
          // and an inset shows a fragment of a label on purpose. What holds for
          // one is that the rectangle is inside the frame, since nothing can then
          // be cropped by the frame that was not already cropped by the panel.
          if (mark.clip) {
            expect(mark.clip.x.from, mark.id).toBeGreaterThanOrEqual(centre.x - extent.width / 2);
            expect(mark.clip.x.to, mark.id).toBeLessThanOrEqual(centre.x + extent.width / 2);
            expect(mark.clip.y.from, mark.id).toBeGreaterThanOrEqual(centre.y - extent.height / 2);
            expect(mark.clip.y.to, mark.id).toBeLessThanOrEqual(centre.y + extent.height / 2);
            continue;
          }
          const width = ADVANCE * mark.size * mark.text.length;
          const left = mark.align === 'middle' ? mark.at.x - width / 2 : mark.align === 'end' ? mark.at.x - width : mark.at.x;
          expect(left, mark.id).toBeGreaterThanOrEqual(centre.x - extent.width / 2);
          expect(left + width, mark.id).toBeLessThanOrEqual(centre.x + extent.width / 2);
          expect(mark.at.y - (1 - CAP) * mark.size, mark.id).toBeGreaterThanOrEqual(centre.y - extent.height / 2);
          expect(mark.at.y + CAP * mark.size, mark.id).toBeLessThanOrEqual(centre.y + extent.height / 2);
        }
      }
    }
  });

  it('leave under four fifths of the frame bare, on the ink rather than on the box', () => {
    // The box round the marks is a number an empty frame passes, since a word in
    // each far corner stretches it over the whole frame. The emptiest sheet reads 72.3%.
    for (const sheet of sheets) expect(bareShare(sheet.drawn())).toBeLessThan(0.8);
  });

  it('write each still into a frame its own extent shapes', () => {
    // A frame shaped differently from the extent it draws leaves a margin down one
    // pair of edges that no mark can reach, whatever the figure does.
    const stills: readonly [string, Figure][] = [
      ['docs/tangent.svg', tangent],
      ['docs/boolean.svg', booleans],
      ['docs/rotate.svg', turns],
      ['docs/surface.svg', solid],
    ];
    for (const [file, figure] of stills) {
      const drawn = sheets.find((sheet) => sheet.file === file)!.drawn();
      const extent = extentAt(figure, figure.still, 16 / 9);
      expect(drawn.width).toBe(Math.round(extent.width * PER_UNIT));
      expect(drawn.height).toBe(Math.round(extent.height * PER_UNIT));
    }
  });

  it('give each strip four frames no two of which are one frame twice', () => {
    // The share of a frame's marks that stand where the other frame's stood. Two
    // frames of one strip that agree on every mark are one picture drawn twice.
    // A twentieth is the floor because a followed view that has reached its stop
    // holds the grid and the field still between two frames of the flat strip,
    // which leaves the dot, the shading and the brace as all that moves.
    const settled = (mark: Mark) =>
      mark.kind === 'text'
        ? `${mark.at.x},${mark.at.y},${mark.text},${mark.size}`
        : `${JSON.stringify(mark.path)},${mark.opacity ?? 1},${mark.fill?.colour ?? ''}`;
    const apart = (first: readonly Mark[], second: readonly Mark[]) => {
      const standing = new Map(first.map((mark) => [mark.id, settled(mark)]));
      return second.filter((mark) => standing.get(mark.id) !== settled(mark)).length / second.length;
    };
    for (const [figure, frames] of [
      [tangent, FRAMES],
      [booleans, BOOLEAN_FRAMES],
      [turns, TURN_FRAMES],
      [solid, SOLID_FRAMES],
    ] as const) {
      const lists = frames.map((seconds) => marksAt(figure, seconds));
      for (let first = 0; first < lists.length; first += 1)
        for (let second = first + 1; second < lists.length; second += 1)
          expect(apart(lists[first], lists[second])).toBeGreaterThan(0.05);
    }
  });

  it('keeps the solid strip inside a half turn, since a half turn draws the same saddle', () => {
    // The saddle is unchanged by a half turn about the z axis, so an eye at a
    // bearing and an eye a half turn from it draw the same shape.
    expect(saddle(0.7, 0.3)).toBeCloseTo(saddle(-0.7, -0.3), 12);
    const bearings = STRIP_ALONG.map((along) => along % 1);
    for (const first of bearings)
      for (const second of bearings)
        if (first !== second) expect(Math.abs(Math.abs(first - second) - 0.5)).toBeGreaterThan(0.05);
  });

  it('carry no placeholder word', () => {
    // A sheet in a README is read by someone deciding whether to install the
    // package, so a word standing in for a real one is worse than no word.
    for (const sheet of sheets) expect(sheet.markup()).not.toMatch(/>label</);
  });

  it('are all eight there', () => {
    expect(sheets.map((sheet) => sheet.file)).toEqual([
      'docs/tangent.svg',
      'docs/tangent-strip.svg',
      'docs/boolean.svg',
      'docs/boolean-strip.svg',
      'docs/rotate.svg',
      'docs/rotate-strip.svg',
      'docs/surface.svg',
      'docs/surface-strip.svg',
    ]);
  });
});

describe('the flat demo', () => {
  it('draws its tangent as an outline that swells in the middle and ends at nothing', () => {
    const mark = marksAt(tangent, TIMES.beat).find((each) => each.id === 'tangent/tangent');
    if (mark?.kind !== 'path') throw new Error('the tangent is a path');
    // A stroke of two widths is a filled outline, so the tangent carries no
    // stroke of its own.
    expect(mark.stroke).toBeUndefined();
    expect(mark.fill).toBeDefined();
    // The curve is flat where the beat holds it, so the outline's height is the
    // width across the tangent and its widest place is halfway along.
    const box = boundsOf(mark.path);
    if (!box) throw new Error('an outline has bounds');
    expect(box.y.to - box.y.from).toBeCloseTo(0.035, 12);
    const middle = (box.y.from + box.y.to) / 2;
    const loops = flattenPath(mark.path);
    const taper: Taper = { from: 0, to: 0.035, curve: 'thereAndBack' };
    for (const share of [0.25, 0.5, 0.75]) {
      const across = box.x.from + (box.x.to - box.x.from) * share;
      expect(nearestEdge(loops, vec2(across, middle))!.gap).toBeCloseTo(widthAt(taper, share) / 2, 5);
    }
  });

  it('draws the same 146 marks at every time, and an inset of between 32 and 40', () => {
    // Forty-two of the 146 are the field's twenty-one arrows, fifteen the two
    // rules and two the inset's own panel, and nothing arrives or leaves part way
    // through, so every time alike. What the inset draws is not: it magnifies a
    // window that moves, so what falls inside the window changes as the dot walks.
    for (const seconds of [0, ...FRAMES, durationOf(tangent)]) {
      const marks = marksAt(tangent, seconds);
      const lens = marks.filter((mark) => mark.id.startsWith('tangent/lens/'));
      expect(marks.length - lens.length).toBe(146);
      expect(lens.length).toBeGreaterThanOrEqual(32);
      expect(lens.length).toBeLessThanOrEqual(40);
    }
  });

  it('paints its inset panel in the sheet ground, so a reading inside it keeps its contrast', () => {
    // The panel is opaque, or the magnified copy would sit over the picture it
    // magnifies. Painting it in the ground the sheet paints behind itself is what
    // leaves a reading inside the panel on the ground it was measured against:
    // ink reads 17.22:1 on white and 15.87:1 on #0d1117 either side of the edge.
    const marks = marksAt(tangent, TIMES.entrance);
    const panel = marks.find((mark) => mark.id === 'tangent/window/ground');
    expect(panel?.kind === 'path' && panel.fill?.colour).toEqual(colourFrom(GROUND.light, 'ground'));
    const readings = marks.filter((mark) => mark.id.startsWith('tangent/lens/') && mark.kind === 'text');
    for (const reading of readings) expect(reading.kind === 'text' && reading.fill.colour).toEqual(INK);
    // The one whose anchor lands inside the panel at the entrance, which is the
    // label the x axis writes at the origin the dot starts on.
    const inside = readings.filter(
      (mark) =>
        mark.kind === 'text' &&
        mark.clip !== undefined &&
        interval.holds(mark.clip.x, mark.at.x) &&
        interval.holds(mark.clip.y, mark.at.y)
    );
    expect(inside.map((mark) => mark.id)).toEqual(['tangent/lens/tangent/axes/x/labels/0']);
  });

  it('braces the rise at the end and counts up to it', () => {
    const wordAt = (seconds: number) => {
      const mark = marksAt(tangent, seconds).find((each) => each.id === 'tangent/rise/word');
      if (mark?.kind !== 'text') throw new Error('the word is text');
      return mark;
    };
    // Nothing of it shows until the dot has stopped, so the number counting is
    // not a second clock arguing with the walk.
    expect(wordAt(TIMES.walkTo).opacity).toBe(0);
    expect(wordAt(TIMES.braceFrom).text).toBe('0.00');
    expect(wordAt((TIMES.braceFrom + TIMES.braceTo) / 2).text).not.toBe('9.00');
    expect(wordAt(TIMES.braceTo).text).toBe('9.00');
    expect(wordAt(TIMES.braceTo).opacity).toBeGreaterThan(0.99);
  });

  it('stands its brace on the two points the graph gives', () => {
    const mark = marksAt(tangent, TIMES.braceTo).find((each) => each.id === 'tangent/rise/brace');
    if (mark?.kind !== 'path') throw new Error('the brace is a path');
    const [subpath] = mark.path;
    const top = pointOf(coords, 3, 9);
    const foot = pointOf(coords, 3, 0);
    expect(subpath.start.x).toBeCloseTo(top.x, 12);
    expect(subpath.start.y).toBeCloseTo(top.y, 12);
    const end = subpath.curves[subpath.curves.length - 1].to;
    expect(end.x).toBeCloseTo(foot.x, 12);
    expect(end.y).toBeCloseTo(foot.y, 12);
  });

  it('washes the region deepest at the top of the graph and palest at the x axis', () => {
    // The axis is the graph's whole vertical run rather than the height of the
    // region at the time it is drawn, so the colour at a given height is the
    // same at every time. Fitted to the region it would be one point at the
    // start of the walk, where the region has no height, and a gradient whose
    // two ends are one point paints nothing on a canvas.
    const top = pointOf(coords, 0, curve(3));
    const foot = pointOf(coords, 0, 0);
    for (const seconds of [TIMES.entrance, TIMES.beat, TIMES.walkTo, durationOf(tangent)]) {
      const area = marksAt(tangent, seconds).find((mark) => mark.id === 'tangent/area')!;
      expect(area.fill!.colour).toBe(PEACH);
      const wash = area.fill!.gradient!;
      expect(wash.from.x).toBeCloseTo(top.x, 12);
      expect(wash.from.y).toBeCloseTo(top.y, 12);
      expect(wash.to.x).toBeCloseTo(foot.x, 12);
      expect(wash.to.y).toBeCloseTo(foot.y, 12);
      expect(wash.stops.map((stop) => [stop.offset, stop.colour])).toEqual([
        [0, PEACH],
        [1, CREAM],
      ]);
    }
  });

  it('reads no slope at the stationary point and the rule for one after it', () => {
    const opacityOf = (seconds: number, id: string) => marksAt(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    // The 0 of the first rule, and the 2 and the x of the second.
    expect(opacityOf(TIMES.beat, 'tangent/equation/at-rest/6-30')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/6-32')).toBe(0);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/7-1D465')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/at-rest/6-30')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/6-32')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/7-1D465')).toBeGreaterThan(0.99);
  });

  it('holds the glyphs the two rules share still while the right-hand side walks', () => {
    // Hung from one left edge, since centred the six glyphs they share would slide
    // sideways as the wider rule arrived, and read against the frame the view moves.
    const startOf = (seconds: number, id: string) => {
      const mark = marksAt(tangent, seconds).find((each) => each.id === id);
      if (mark?.kind !== 'path') throw new Error(`${id} is a path`);
      const centre = extentAt(tangent, seconds, 1.8).centre ?? vec2(0, 0);
      return vec2(mark.path[0].start.x - centre.x, mark.path[0].start.y - centre.y);
    };
    for (const glyph of ['0-1D451', '1-1D466', '2-1D451', '3-1D465', '4-rule', '5-3D']) {
      const id = `tangent/equation/at-rest/${glyph}`;
      expect(startOf(TIMES.morphTo, id).x, id).toBeCloseTo(startOf(TIMES.beat, id).x, 12);
      expect(startOf(TIMES.morphTo, id).y, id).toBeCloseTo(startOf(TIMES.beat, id).y, 12);
    }
  });

  it('arrives rather than appearing', () => {
    const opacityOf = (seconds: number, id: string) => marksAt(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'tangent/grid/majors/x/0')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'tangent/reading')).toBeCloseTo(0, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/grid/majors/x/0')).toBeCloseTo(1, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/reading')).toBeCloseTo(1, 12);
  });

  it('brings its x labels in one after another', () => {
    const row = (seconds: number) =>
      ['-1', '0', '1', '2', '3', '4'].map(
        (label) =>
          marksAt(tangent, seconds).find((mark) => mark.id === `tangent/axes/x/labels/${label}`)?.opacity ?? 1
      );
    // A stagger promises only that somewhere the six are part way up and no two
    // equal, so the moment is scanned for rather than named.
    const moment = Array.from({ length: 400 }, (_, step) => step / 100).find((seconds) => {
      const shown = row(seconds);
      return shown[0] > shown[5] && shown[0] < 1;
    });
    expect(moment).toBeDefined();
    const shown = row(moment!);
    for (let label = 1; label < shown.length; label++) expect(shown[label]).toBeLessThanOrEqual(shown[label - 1]);
    expect(row(TIMES.entrance).every((opacity) => opacity > 0.999)).toBe(true);
  });

  it('brings each x label in at speed rather than from rest', () => {
    const first = 'tangent/axes/x/labels/-1';
    const opacityAt = (seconds: number) =>
      marksAt(tangent, seconds).find((mark) => mark.id === first)?.opacity ?? 1;
    // The row's own start is scanned for at a thousandth of a second rather than
    // named, since the entrance is a chain and no name is kept for where the
    // stagger begins.
    const from = Array.from({ length: 4001 }, (_, step) => step / 1000).find(
      (seconds) => opacityAt(seconds) > 0
    );
    expect(from).toBeDefined();
    const along = 0.1 / 0.4;
    const shown = opacityAt(from! + 0.1);
    expect(shown).toBeCloseTo(easeOut(along), 2);
    expect(shown).toBeGreaterThan(smoothstep(along) + 0.25);
  });

  it('lands its dot by passing its own size and settling back on it', () => {
    const widthAt = (seconds: number) => {
      const box = boundsOfMarks(marksAt(tangent, seconds).filter((mark) => mark.id.startsWith('tangent/point')));
      return box === null ? 0 : interval.span(box.x);
    };
    const settled = widthAt(TIMES.entrance);
    let widest = 0;
    let at = 0;
    for (let step = 2800; step <= 3400; step++) {
      const seconds = step / 1000;
      if (widthAt(seconds) > widest) {
        widest = widthAt(seconds);
        at = seconds;
      }
    }
    expect(widest / settled).toBeCloseTo(1.100004, 5);
    expect(at).toBeCloseTo(2.8 + 0.4 * 0.580103, 3);
    expect(widthAt(TIMES.entrance)).toBeCloseTo(0.16, 10);
  });

  it('swells its dot on a clock that does not ease, so the gesture eases once', () => {
    const widthAt = (seconds: number) => {
      const box = boundsOfMarks(marksAt(tangent, seconds).filter((mark) => mark.id.startsWith('tangent/point')));
      return box === null ? 0 : interval.span(box.x);
    };
    const settled = widthAt(TIMES.entrance);
    const from = TIMES.entrance + 0.2;
    // A quarter of the way through, the swell's own out-and-back is halfway up,
    // so the factor is halfway to its peak of two. An eased clock would read
    // 1.2325 here instead.
    expect(widthAt(from + 0.25) / settled).toBeCloseTo(1.5, 6);
    expect(widthAt(from + 0.5) / settled).toBeCloseTo(2, 6);
  });

  it('flashes on a clock that does not ease either', () => {
    const rays = marksAt(tangent, TIMES.walkTo + 0.2).filter((mark) =>
      mark.id.startsWith('tangent/point/flash/')
    );
    expect(rays).toHaveLength(10);
    for (const ray of rays) expect(ray.opacity).toBeCloseTo(0.5, 6);
  });

  it('holds at the stationary point until the picture has arrived and been pointed at', () => {
    expect(sampleTrack(walk, 0)).toBe(0);
    expect(sampleTrack(walk, TIMES.entrance)).toBeCloseTo(0, 12);
    expect(sampleTrack(walk, TIMES.walkFrom)).toBeCloseTo(0, 12);
    expect(sampleTrack(walk, TIMES.walkTo)).toBeCloseTo(1, 12);
  });

  it('boxes its reading at the beat and lets the box go', () => {
    const boxAt = (seconds: number) =>
      marksAt(tangent, seconds).find((mark) => mark.id === 'tangent/reading/circumscribed')!;
    expect(boxAt(TIMES.entrance + 0.7).opacity).toBeGreaterThan(0);
    expect(boxAt(TIMES.beat).opacity).toBe(0);
  });

  it('flashes at the top of the curve and nowhere else', () => {
    const raysAt = (seconds: number) =>
      marksAt(tangent, seconds).filter((mark) => mark.id.includes('/flash/'));
    expect(raysAt(TIMES.walkTo).every((ray) => ray.opacity === 0)).toBe(true);
    expect(raysAt(TIMES.walkTo + 0.4).some((ray) => (ray.opacity ?? 1) > 0.5)).toBe(true);
    expect(raysAt(durationOf(tangent)).every((ray) => ray.opacity === 0)).toBe(true);
  });

  it('reads a slope that changes as the dot walks', () => {
    expect(reading(marksAt(tangent, 0))).toBe('slope 0.00');
    expect(reading(marksAt(tangent, TIMES.beat))).toBe('slope 0.00');
    expect(reading(marksAt(tangent, FRAMES[2]))).toBe('slope 4.98');
    expect(reading(marksAt(tangent, TIMES.walkTo))).toBe('slope 6.00');
  });

  it('walks at one speed along the curve rather than gathering pace as it steepens', () => {
    // Driven across x instead, the widest step is 1.65 times the narrowest,
    // because a step in x covers more of the curve where the curve is steep.
    const byLength = Array.from({ length: 21 }, (_, step) => pointAlong(walkPath, step / 20)!);
    const byX = Array.from({ length: 21 }, (_, step) => {
      const x = (3 * step) / 20;
      return pointOf(coords, x, curve(x));
    });
    const even = gaps(byLength);
    const uneven = gaps(byX);
    expect(Math.max(...even) / Math.min(...even)).toBeLessThan(1.001);
    expect(Math.max(...uneven) / Math.min(...uneven)).toBeGreaterThan(1.6);
  });

  it('draws the curve and the streamline of its own field as one answer', () => {
    // The whole reason this demo is the one to carry a field: the plotted curve
    // and the run integrated through the field are two answers to one question.
    const points = streamlineOf(slopeField, vec2(0, 0), {
      step: 0.02,
      steps: 2000,
      direction: 'both',
      within: { x: coords.x.graph, y: coords.y.graph },
    });
    expect(points.length).toBeGreaterThan(400);
    let worst = 0;
    for (const point of points) {
      const drawn = pointOf(coords, point.x, curve(point.x));
      const walked = pointOf(coords, point.x, point.y);
      worst = Math.max(worst, Math.hypot(walked.x - drawn.x, walked.y - drawn.y));
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('draws one arrow of its field along the tangent the dot carries', () => {
    const marks = marksAt(tangent, TIMES.walkTo);
    const shafts = marks.filter((mark) => mark.id.startsWith('tangent/field/') && mark.id.endsWith('/shaft'));
    expect(shafts).toHaveLength(21);

    for (const mark of shafts) {
      if (mark.kind !== 'path') throw new Error('a shaft is a path');
      const start = mark.path[0].start;
      const end = mark.path[0].curves[mark.path[0].curves.length - 1].to;
      const x = toGraph(coords.x, start.x);
      // The field reaches x either side of the walk, where the closed-form
      // derivative is the only slope there is.
      const read = slopeOf(coords, walkPath, x);
      const slope = Number.isNaN(read) ? 2 * x : read;
      const wanted = [pointOf(coords, x, curve(x)), pointOf(coords, x + 1, curve(x) + slope)];
      const along = vec2.sub(wanted[1], wanted[0]);
      const shaft = vec2.sub(end, start);
      expect(Math.abs(vec2.cross(vec2.normalize(along), vec2.normalize(shaft)))).toBeLessThan(1e-9);
    }
  });

  it('keeps the tangent on the dot at every place along the walk', () => {
    // The whole reason the graph x is recovered from the point rather than
    // driven beside it: one number, so these cannot drift apart.
    let worst = 0;
    for (let step = 0; step <= 40; step++) {
      const point = pointAlong(walkPath, step / 40)!;
      const x = toGraph(coords.x, point.x);
      const path = tangentAt(coords, walkPath, x, { reach: 1.2 });
      if (path.length === 0) continue;
      const from = path[0].start;
      const to = path[0].curves[0].to;
      const run = to.x - from.x;
      const rise = to.y - from.y;
      worst = Math.max(
        worst,
        Math.abs(rise * (point.x - from.x) - run * (point.y - from.y)) / Math.hypot(run, rise)
      );
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('writes its reading and its rules above the graph rather than over it', () => {
    // Text is never measured, so the graph's top edge from the coords is what every
    // anchor and every glyph of the two rules is checked against.
    const top = pointOf(coords, 4, 9).y;
    for (const seconds of [TIMES.entrance, TIMES.beat, TIMES.walkTo, durationOf(tangent)]) {
      for (const mark of marksAt(tangent, seconds)) {
        if (mark.id === 'tangent/reading') expect(mark.kind === 'text' && mark.at.y).toBeGreaterThan(top);
        if (!mark.id.startsWith('tangent/equation/') || mark.kind !== 'path') continue;
        for (const subpath of mark.path) {
          for (const point of [subpath.start, ...subpath.curves.map((piece) => piece.to)]) {
            expect(point.y, mark.id).toBeGreaterThan(top);
          }
        }
      }
    }
  });

  it('keeps the dot and everything placed against the frame inside the frame', () => {
    // The grid and the axes run off the edge once the view follows the dot, so what
    // may never leave is the dot and the two marks placed against the frame.
    const placed = ['tangent/point/disc', 'tangent/reading'];
    for (const seconds of FRAMES) {
      const centre = extentAt(tangent, seconds, 1.8).centre ?? vec2(0, 0);
      for (const mark of marksAt(tangent, seconds)) {
        if (!placed.includes(mark.id) && !mark.id.startsWith('tangent/equation/')) continue;
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x - centre.x), mark.id).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y - centre.y), mark.id).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('follows the dot from a timeline entry rather than from a function of the clock', () => {
    // What the entry buys is that the extent is a plain extent a file can carry.
    // A closure on the figure could not be sequenced against anything and could
    // not be written down.
    expect(typeof tangent.extent).toBe('object');
    expect(resolveExtent(tangent.extent, 1.8, 0).centre).toBeUndefined();
    const views = tangent.timeline!.spans.filter((span) => typeof span.entry !== 'function');
    expect(views).toHaveLength(1);
    // Its span is nothing wide, so it is applied in full from the first frame and
    // the picture is the one the closure drew.
    expect(views[0].from).toBe(0);
    expect(views[0].to).toBe(0);
    expect(extentAt(tangent, 0, 1.8).centre!.x).toBeCloseTo(-0.62, 12);
  });

  it('follows the dot rather than letting it cross the frame', () => {
    // The view follows across only, since dropping to the dot at the stationary
    // point would carry the frame-placed reading and rule down over the grid.
    let followed = 0;
    let still = 0;
    for (let step = 0; step <= 200; step += 1) {
      const seconds = (durationOf(tangent) * step) / 200;
      const centre = extentAt(tangent, seconds, 1.8).centre ?? vec2(0, 0);
      const mark = marksAt(tangent, seconds).find((each) => each.id === 'tangent/point/disc');
      if (mark?.kind !== 'path') continue;
      const middle = centreOf(boundsOf(mark.path)!);
      followed = Math.max(followed, Math.abs(middle.x - centre.x));
      still = Math.max(still, Math.abs(middle.x));
    }
    // The view stops where the graph does, so the dot travels further from the
    // middle than its own reach at the ends of the walk.
    expect(followed).toBeLessThanOrEqual(2.14 + 1e-12);
    expect(still).toBeGreaterThan(2.7);
  });
});

describe('the strip of frames', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = stripMarks(FRAMES);
    // Four frames of 146 own marks, and the four insets between them draw 142:
    // each magnifies a window that has moved, so no two of them hold the same
    // number of marks.
    expect(marks).toHaveLength(146 * FRAMES.length + 142);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('is as wide as its columns and as tall as its rows', () => {
    const oneRow = stripMarks(FRAMES);
    expect(oneRow.extent.width).toBeCloseTo(45.6, 12);
    expect(oneRow.extent.height).toBeCloseTo(6.4, 12);
    // Two columns of four frames is two rows, and the strip the README carries.
    const twoRows = stripMarks(FRAMES, 2);
    expect(twoRows.extent.width).toBeCloseTo(22.8, 12);
    expect(twoRows.extent.height).toBeCloseTo(12.8, 12);
  });

  it('shows every frame at one size, whichever strip it is in', () => {
    // A frame is a slot wide in every strip, so the four sheets draw their
    // frames at one scale rather than one sheet drawing them half the size.
    for (const strip of [stripMarks(FRAMES, 2), booleanStripMarks(BOOLEAN_FRAMES, 2), turnStripMarks(TURN_FRAMES, 2), solidStripMarks(SOLID_FRAMES, 2)]) {
      expect(strip.extent.width / strip.extent.height).toBeLessThan(2.6);
    }
  });

  it('shows a picture that moves in a still, since nothing here encodes a GIF', () => {
    const { marks } = stripMarks(FRAMES);
    // The frame's own reading rather than the inset's copy of it, which the inset
    // carries because a text mark is never dropped for sitting outside its clip.
    const readings = marks.filter((mark) => /^at\d+\/tangent\/reading$/.test(mark.id));
    expect(readings.map((mark) => (mark.kind === 'text' ? mark.text : ''))).toEqual([
      'slope 0.00',
      'slope 1.59',
      'slope 4.98',
      'slope 6.00',
    ]);
  });
});

describe('the still picture', () => {
  it('carries a view box and no size of its own', () => {
    const markup = stillMarkup(tangent, tangent.still);
    expect(markup).toContain('viewBox="0 0 1080 600"');
    expect(markup).not.toContain('width="1080"');
  });
});

/**
 * The boolean demo is read against closed forms rather than against a picture.
 * Two discs of radii R and r whose centres are d apart share an area with a
 * formula, and the union and the difference follow from it, so every panel has
 * a number to be right or wrong about at every distance the walk passes
 * through.
 */
const shared = (apart: number): number => {
  const gap = Math.abs(apart);
  if (gap >= BIG + SMALL) return 0;
  if (gap <= BIG - SMALL) return Math.PI * SMALL * SMALL;
  return (
    SMALL * SMALL * Math.acos((gap * gap + SMALL * SMALL - BIG * BIG) / (2 * gap * SMALL)) +
    BIG * BIG * Math.acos((gap * gap + BIG * BIG - SMALL * SMALL) / (2 * gap * BIG)) -
    Math.sqrt(
      (-gap + SMALL + BIG) * (gap + SMALL - BIG) * (gap - SMALL + BIG) * (gap + SMALL + BIG)
    ) / 2
  );
};

/** What the edges of these two discs can move an area by: their lengths times
 * the 2.8e-4 of the radius four cubics cost a circle. */
const EDGE_ERROR = 2 * Math.PI * 2.8e-4 * (BIG * BIG + SMALL * SMALL);

const panelAreas = (apart: number): number[] =>
  flatten(resolveNode(booleanScene, { tracks: { apart } }))
    .filter((mark) => mark.id.endsWith('/result'))
    .map((mark) => (mark.kind === 'path' ? areaOf(mark.path) : Number.NaN));

describe('the boolean demo', () => {
  it('draws the same 12 marks at every time', () => {
    // Four to a panel, and a panel whose result is empty draws an empty path rather
    // than no mark, so the count holds at every time.
    const times = [
      0,
      BOOLEAN_TIMES.entrance,
      ...BOOLEAN_FRAMES,
      BOOLEAN_TIMES.slipping,
      BOOLEAN_TIMES.walkTo,
      durationOf(booleans),
    ];
    for (const seconds of times) expect(marksAt(booleans, seconds)).toHaveLength(12);
  });

  it('ends its walk with the two discs clear of each other', () => {
    // The walk exists to take the operations through no crossing, one crossing,
    // two crossings and containment, and the first of those needs a gap.
    expect(REACH - (BIG + SMALL)).toBeCloseTo(0.18, 12);
  });

  it('encloses what the closed form says at every named distance', () => {
    const distances = [-1.44, -(BIG + SMALL), -0.9, -(BIG - SMALL), 0, 0.9, BIG + SMALL];
    for (const apart of distances) {
      const overlap = shared(apart);
      const wanted = [
        Math.PI * BIG * BIG + Math.PI * SMALL * SMALL - overlap,
        overlap,
        Math.PI * BIG * BIG - overlap,
      ];
      const drawn = panelAreas(apart);
      for (let panel = 0; panel < wanted.length; panel++) {
        expect(Math.abs(drawn[panel] - wanted[panel]), `${apart} panel ${panel}`).toBeLessThan(EDGE_ERROR);
      }
    }
  });

  it('passes through the moment the two touch without the picture changing size', () => {
    // Once from outside and once from within, which are the two distances where
    // the discs meet at one point rather than crossing at two.
    for (const seconds of [BOOLEAN_TIMES.touching, BOOLEAN_TIMES.slipping]) {
      const before = marksAt(booleans, seconds - 0.01);
      const during = marksAt(booleans, seconds);
      const after = marksAt(booleans, seconds + 0.01);
      expect(during).toHaveLength(before.length);
      expect(during).toHaveLength(after.length);
    }
  });

  it('leaves the overlap empty until the discs meet and empty again after they part', () => {
    const overlapAt = (seconds: number) => {
      const mark = marksAt(booleans, seconds).find((each) => each.id === 'booleans/intersection/result');
      if (mark?.kind !== 'path') throw new Error('the result is a path');
      return mark.path;
    };
    expect(overlapAt(BOOLEAN_TIMES.clear)).toHaveLength(0);
    expect(overlapAt(BOOLEAN_TIMES.crossing).length).toBeGreaterThan(0);
    expect(overlapAt(BOOLEAN_TIMES.walkTo)).toHaveLength(0);
  });

  it('takes a hole out of the middle when one disc sits wholly inside the other', () => {
    const mark = marksAt(booleans, BOOLEAN_TIMES.inside).find((each) => each.id === 'booleans/difference/result');
    if (mark?.kind !== 'path') throw new Error('the result is a path');
    expect(mark.path).toHaveLength(2);
    expect(areaOf(mark.path)).toBeGreaterThan(0);
  });

  it('arrives rather than appearing', () => {
    const opacityOf = (seconds: number, id: string) =>
      marksAt(booleans, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'booleans/union/discs/first')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'booleans/intersection/result')).toBeCloseTo(0, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/union/discs/first')).toBeCloseTo(1, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/intersection/result')).toBeCloseTo(1, 12);
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const seconds of BOOLEAN_FRAMES) {
      for (const mark of marksAt(booleans, seconds)) {
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('brings each panel of outlines in at speed, since the gap is what paces the row', () => {
    const opacityAt = (seconds: number) =>
      marksAt(booleans, seconds).find((mark) => mark.id === 'booleans/union/discs/first')?.opacity ?? 1;
    const from = Array.from({ length: 4001 }, (_, step) => step / 1000).find(
      (seconds) => opacityAt(seconds) > 0
    );
    expect(from).toBeDefined();
    const along = 0.1 / 0.4;
    const shown = opacityAt(from! + 0.1);
    expect(shown).toBeCloseTo(easeOut(along), 2);
    expect(shown).toBeGreaterThan(smoothstep(along) + 0.25);
  });
});

describe('the boolean strip', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = booleanStripMarks(BOOLEAN_FRAMES);
    expect(marks).toHaveLength(12 * BOOLEAN_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('shows the walk from clear of the disc to wholly inside it', () => {
    const loops = BOOLEAN_FRAMES.map((seconds) => {
      const mark = booleanStripMarks([seconds]).marks.find((each) => each.id.endsWith('/intersection/result'));
      return mark?.kind === 'path' ? mark.path.length : -1;
    });
    expect(loops).toEqual([0, 0, 1, 1]);
  });
});

describe('the rotation demo', () => {
  const corners = (seconds: number, panel: string) => {
    const mark = marksAt(turns, seconds).find((each) => each.id === `turns/${panel}/rider/ell`);
    if (mark?.kind !== 'path') throw new Error('the shape is a path');
    const subpath = mark.path[0];
    return [subpath.start, ...subpath.curves.slice(0, -1).map((piece) => piece.to)];
  };
  const word = (seconds: number, panel: string) => {
    const mark = marksAt(turns, seconds).find((each) => each.id === `turns/${panel}/rider/word`);
    if (mark?.kind !== 'text') throw new Error('the rider is text');
    return mark;
  };

  it('draws the same eight marks at every time', () => {
    // Two panels of four, the pivot and the shape with the word riding it and the
    // words underneath, and nothing arrives or leaves at any time.
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(marksAt(turns, seconds)).toHaveLength(8);
  });

  it('lands where it began after the whole turn, which is why it declares a loop', () => {
    expect(turns.loop).toBe(true);
    expect(isLoop(turns, 1e-9)).toBe(true);
  });

  it('turns the left panel about the middle of the box round it', () => {
    // The pivot is the shape's own centre because the shape is written about it,
    // so the closed form is stated here rather than read back off the marks.
    for (const [index, corner] of corners(TURN_TIMES.quarter, 'own').entries()) {
      const want = vec2.add(OWN, vec2.rotate(LOCAL[index], Math.PI / 2));
      expect(corner.x).toBeCloseTo(want.x, 12);
      expect(corner.y).toBeCloseTo(want.y, 12);
    }
  });

  it('turns the right panel about the point it is given', () => {
    for (const [index, corner] of corners(TURN_TIMES.half, 'given').entries()) {
      const want = vec2.sub(GIVEN, vec2.add(vec2(SWING, 0), LOCAL[index]));
      expect(corner.x).toBeCloseTo(want.x, 12);
      expect(corner.y).toBeCloseTo(want.y, 12);
    }
  });

  it('spins the left panel where it stands and swings the right one round', () => {
    // A turn keeps every corner its distance from the pivot, so the left panel's
    // reach is the shape's own and the right one's is that plus the swing.
    const reach = (swing: number) => Math.max(...LOCAL.map((point) => Math.hypot(swing + point.x, point.y)));
    for (const seconds of [0, ...TURN_FRAMES, TURN]) {
      const own = corners(seconds, 'own').map((point) => vec2.distance(point, OWN));
      const given = corners(seconds, 'given').map((point) => vec2.distance(point, GIVEN));
      expect(Math.max(...own)).toBeCloseTo(reach(0), 9);
      expect(Math.max(...given)).toBeCloseTo(reach(SWING), 9);
    }
    expect(reach(SWING)).toBeGreaterThan(2 * reach(0));
  });

  it('leaves the words upright and moves nothing about them but where they sit', () => {
    const start = word(0, 'given');
    for (const seconds of TURN_FRAMES) {
      const now = word(seconds, 'given');
      expect(now.text).toBe(start.text);
      expect(now.size).toBe(start.size);
      expect(now.align).toBe(start.align);
      expect(vec2.distance(now.at, GIVEN)).toBeCloseTo(vec2.distance(start.at, GIVEN), 9);
    }
  });

  it('does not thicken a line by turning it', () => {
    // A rotation's scale factor is one, where a growth's is the factor it grew
    // by, so a turned outline keeps the width the figure asked for.
    const width = (seconds: number) => {
      const mark = marksAt(turns, seconds).find((each) => each.id === 'turns/own/rider/ell');
      return mark?.kind === 'path' ? mark.stroke?.width : undefined;
    };
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(width(seconds)).toBe(0.04);
  });

  it('keeps every mark inside the frame it declares', () => {
    for (const seconds of [0, ...TURN_FRAMES, TURN]) {
      for (const mark of marksAt(turns, seconds)) {
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('keeps the word it carries clear of the edge it rides on, at every time in the turn', () => {
    // The word stays upright while the shape turns under it, so its box is square
    // to the figure and the edge is not. The box round an L is mostly the empty
    // corner the word sits in, so the box is no reading and the edge is the one
    // that says whether the two touch.
    const end = durationOf(turns);
    let closest = Infinity;
    for (let step = 0; step <= 480; step += 1) {
      const marks = marksAt(turns, (step / 480) * end);
      for (const panel of ['own', 'given']) {
        const word = marks.find((mark) => mark.id === `turns/${panel}/rider/word`);
        const ell = marks.find((mark) => mark.id === `turns/${panel}/rider/ell`);
        if (word?.kind !== 'text' || ell?.kind !== 'path') continue;
        const width = ADVANCE * word.size * word.text.length;
        const loops = flattenPath(ell.path);
        for (let across = 0; across <= 12; across += 1)
          for (let down = 0; down <= 4; down += 1) {
            const corner = vec2(
              word.at.x - width / 2 + (width * across) / 12,
              word.at.y - (1 - CAP) * word.size + (word.size * down) / 4
            );
            expect(containsPoint(ell.path, corner)).toBe(false);
            closest = Math.min(closest, nearestEdge(loops, corner)!.gap);
          }
      }
    }
    // Read to the edge's own line, so half the 0.04 the shape is stroked at comes
    // off before the gap is a gap a reader sees.
    expect(closest).toBeGreaterThan(0.02);
    expect(closest).toBeCloseTo(0.183, 3);
  });
});

describe('the rotation strip', () => {
  it('walks its four frames at a fixed step and leaves off the one that repeats', () => {
    expect(TURN_FRAMES).toEqual(frameTimesOf(turns, { frames: 4 }));
    expect(TURN_FRAMES).toEqual([TURN_TIMES.start, TURN_TIMES.quarter, TURN_TIMES.half, TURN_TIMES.threeQuarters]);
    expect(TURN_FRAMES).not.toContain(TURN);
    expect(sameMarks(marksAt(turns, TURN_FRAMES[0]), marksAt(turns, TURN))).toBe(true);
  });

  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = turnStripMarks(TURN_FRAMES, 2);
    expect(marks).toHaveLength(8 * TURN_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('leaves a wider gap between two frames than between the panels inside one', () => {
    // A row read by its gaps: the narrower gap has to be the one inside a frame,
    // or two frames of two panels read as one row of four.
    const { marks } = turnStripMarks(TURN_FRAMES, 2);
    const span = (id: string) => boundsOfMarks(marks.filter((mark) => mark.id.startsWith(id)))!;
    const insideFrame = span('at0/turns/given').x.from - span('at0/turns/own').x.to;
    const betweenFrames = span('at1/turns/own').x.from - span('at0/turns/given').x.to;
    expect(betweenFrames).toBeGreaterThan(insideFrame);
  });
});

describe('the solid demo', () => {
  const solidAt = (seconds: number) => marksAt(solid, seconds);
  /** The figure's own marks, without its inset's magnified copies of them. */
  const solidOwn = (seconds: number) => solidAt(seconds).filter((mark) => !mark.id.startsWith('solid/lens/'));
  const named = [SOLID_TIMES.entrance, SOLID_TIMES.quarter, SOLID_TIMES.half, SOLID_TIMES.round];

  it('holds the eye still at the face of the saddle for a beat and a half', () => {
    const from = alongAt(SOLID_TIMES.quarter);
    expect(from).toBeCloseTo(0.25, 12);
    expect(alongAt(SOLID_TIMES.quarter + SOLID_BEAT)).toBeCloseTo(0.25, 12);
    // Nothing else is playing over the beat, so the whole picture is the picture
    // it was, rather than the camera alone standing still.
    expect(sameMarks(solidAt(SOLID_TIMES.quarter), solidAt(SOLID_TIMES.quarter + SOLID_BEAT))).toBe(true);
    expect(sameMarks(solidAt(SOLID_TIMES.quarter), solidAt(SOLID_TIMES.quarter + SOLID_BEAT + 0.2))).toBe(false);
    expect(sameMarks(solidAt(SOLID_TIMES.quarter), solidAt(SOLID_TIMES.quarter - 0.2))).toBe(false);
  });

  it('turns at one pace either side of the beat', () => {
    const rate = (from: number, to: number) => (alongAt(to) - alongAt(from)) / (to - from);
    const before = rate(SOLID_TIMES.entrance + 0.4, SOLID_TIMES.quarter - 0.4);
    const after = rate(SOLID_TIMES.quarter + SOLID_BEAT + 0.4, SOLID_TIMES.round - 0.4);
    // A quarter of the turn every two seconds, which is one eighth a second.
    expect(before).toBeCloseTo(0.125, 12);
    expect(after).toBeCloseTo(before, 12);
  });

  it('holds its three runs of descent apart, so none reads as a tangle', () => {
    // The field is nothing at the middle and every run bends hardest near it, so
    // three runs seeded close to an axis all sweep the same small region.
    const nearest = (first: readonly Vec2[], second: readonly Vec2[]) =>
      Math.min(...first.map((one) => Math.min(...second.map((other) => vec2.distance(one, other)))));
    const flat = descents.map((run) => run.map((at) => vec2(at.x, at.y)));
    for (let first = 0; first < flat.length; first += 1)
      for (let second = first + 1; second < flat.length; second += 1)
        expect(nearest(flat[first], flat[second])).toBeGreaterThan(0.4);
    for (const run of flat) expect(Math.min(...run.map((at) => vec2.magnitude(at)))).toBeGreaterThan(0.5);
  });

  it('turns no run of descent back on itself', () => {
    for (const run of descents) {
      const flat = run.map((at) => vec2(at.x, at.y));
      for (let at = 1; at < flat.length - 1; at += 1) {
        const before = vec2.sub(flat[at], flat[at - 1]);
        const after = vec2.sub(flat[at + 1], flat[at]);
        const turn = Math.abs(Math.atan2(vec2.cross(before, after), vec2.dot(before, after)));
        expect(turn).toBeLessThan(Math.PI / 18);
      }
    }
  });

  it('names each of its three axes at the far end of the line', () => {
    // Nothing in a picture of three axes says which way is x, so each carries its
    // name past its last tick, leaning the way that tick's own label leans.
    const named3 = ['x', 'y', 'z'].map((axis) => {
      const mark = solidAt(solid.still).find((each) => each.id === `solid/axes/${axis}/name/label`);
      if (mark?.kind !== 'text') throw new Error('an axis name is text');
      return mark.text;
    });
    expect(named3).toEqual(['x', 'y', 'z']);
  });

  it('draws the same 247 marks at every time, and an inset of between 67 and 77', () => {
    // A hundred and forty-four cells of saddle, sixteen panes of glass and the
    // field's thirty-six arrows at two marks each, with the rest the axes, the
    // title, the rule and the inset's own panel. What the inset draws is not
    // fixed: it magnifies a window on the middle and the saddle turns under it.
    for (const seconds of [0, ...SOLID_FRAMES, SOLID_TIMES.round]) {
      expect(solidOwn(seconds)).toHaveLength(247);
      const lens = solidAt(seconds).length - solidOwn(seconds).length;
      expect(lens).toBeGreaterThanOrEqual(67);
      expect(lens).toBeLessThanOrEqual(77);
    }
  });

  it('runs its three descents down the saddle and never off it', () => {
    let worst = 0;
    for (const run of descents) {
      expect(run.length).toBeGreaterThan(20);
      for (const point of run) worst = Math.max(worst, Math.abs(point.z - saddle(point.x, point.y)));
      for (let step = 1; step < run.length; step += 1) expect(run[step].z).toBeLessThan(run[step - 1].z);
    }
    expect(worst).toBe(0);
  });

  it('thins each run of descent from its seed to nothing where it leaves', () => {
    for (const at of [0, 1, 2]) {
      const run = solidAt(SOLID_TIMES.quarter).find((mark) => mark.id === `solid/descent/run${at}/run`);
      if (run?.kind !== 'path') throw new Error('a run of descent is a path');
      // A stroke of two widths is a filled outline, so the run carries no stroke
      // of its own and the two sides of it are one loop.
      expect(run.stroke).toBeUndefined();
      expect(run.fill).toBeDefined();
      const side = [run.path[0].start, ...run.path[0].curves.slice(0, -1).map((piece) => piece.to)];
      const last = side.length - 1;
      // The loop walks out along one side and back along the other, so the point
      // this far from each end is the same station of the run on both sides.
      expect(vec2.distance(side[0], side[last])).toBeCloseTo(0.035, 12);
      let before = Infinity;
      for (let station = 0; station * 2 <= last; station++) {
        const across = vec2.distance(side[station], side[last - station]);
        expect(across).toBeLessThanOrEqual(before + 1e-12);
        before = across;
      }
      expect(before).toBeCloseTo(0, 12);
    }
  });

  it('names a surface, a plane, a curve, a field, three runs and three axes', () => {
    const ids = solidAt(SOLID_TIMES.quarter).map((mark) => mark.id);
    expect(ids.filter((id) => id.startsWith('solid/body/hill/')).length).toBe(144);
    expect(ids.filter((id) => id.startsWith('solid/body/pane/')).length).toBe(16);
    expect(ids.filter((id) => id.startsWith('solid/body/flow/')).length).toBe(48);
    expect(ids.filter((id) => id.startsWith('solid/descent/run')).length).toBe(3);
    expect(ids.filter((id) => id.startsWith('solid/cut/run')).length).toBe(2);
    for (const axis of ['x', 'y', 'z']) {
      expect(ids.some((id) => id.startsWith(`solid/axes/${axis}/line`))).toBe(true);
      expect(ids.some((id) => id.startsWith(`solid/axes/${axis}/ticks`))).toBe(true);
    }
    expect(ids.some((id) => id.startsWith('solid/rule/'))).toBe(true);
  });

  it('puts every point of the curve on both the surface and the plane', () => {
    let offSurface = 0;
    let offPlane = 0;
    for (const run of section) {
      for (const point of run) {
        offSurface = Math.max(offSurface, Math.abs(saddle(point.x, point.y) - point.z));
        offPlane = Math.max(offPlane, Math.abs(point.z - HEIGHT));
      }
    }
    expect(offSurface).toBeLessThan(0.002);
    expect(offPlane).toBe(0);
  });

  it('draws the curve where the camera at that time puts it', () => {
    for (const seconds of named) {
      const camera = eyeAt(alongAt(seconds));
      const mark = solidAt(seconds).find((each) => each.id === 'solid/cut/run0/run');
      if (mark?.kind !== 'path') throw new Error('the first branch is a path');
      const placed = camera.project(section[0][0]).at;
      expect(Math.abs(mark.path[0].start.x - placed.x)).toBeLessThan(1e-12);
      expect(Math.abs(mark.path[0].start.y - placed.y)).toBeLessThan(1e-12);
    }
  });

  it('brings the eye back to where it started after one orbit', () => {
    // Compared by name rather than in order, since two cells at one depth keep the
    // order given and a turn of 1e-9 swaps them without moving the eye.
    const before = new Map(solidAt(SOLID_TIMES.entrance).map((mark) => [mark.id, mark]));
    const after = solidAt(SOLID_TIMES.round);
    expect(after).toHaveLength(before.size);
    for (const mark of after) {
      const was = before.get(mark.id);
      expect(was, mark.id).toBeDefined();
      expect(sameMarks([was!], [mark]), mark.id).toBe(true);
    }
  });

  it('washes the pane with one gradient, deepest along the edge nearest the eye', () => {
    // Sixteen cells share one axis, which is what makes them read as one sheet
    // of glass: a gradient is measured in the units it is painted into, so the
    // same axis in every cell runs unbroken across the pane.
    const axisAt = (seconds: number) => {
      const cells = solidAt(seconds).filter((mark) => mark.id.startsWith('solid/body/pane/'));
      expect(cells).toHaveLength(16);
      for (const cell of cells) {
        expect(cell.fill!.colour).toBe(FROST);
        expect(cell.fill!.gradient!.stops.map((stop) => [stop.offset, stop.colour])).toEqual([
          [0, GLAZE],
          [1, FROST],
        ]);
        expect(cell.fill!.gradient!.from).toEqual(cells[0].fill!.gradient!.from);
        expect(cell.fill!.gradient!.to).toEqual(cells[0].fill!.gradient!.to);
      }
      return cells[0].fill!.gradient!;
    };
    // The eye looks at where the axes cross with z up, so the pane's recession
    // projects straight up the page at every place in the orbit. What the orbit
    // changes is the length of the axis, since the pane is square and recedes
    // over its own diagonal a quarter turn from where it recedes over an edge.
    for (const seconds of named) {
      const axis = axisAt(seconds);
      expect(axis.from.x).toBeCloseTo(0, 9);
      expect(axis.to.x).toBeCloseTo(0, 9);
      expect(axis.from.y).toBeLessThan(axis.to.y);
    }
    const overEdge = axisAt(SOLID_TIMES.quarter);
    expect(overEdge.from.y).toBeCloseTo(-0.876, 3);
    expect(overEdge.to.y).toBeCloseTo(1.25, 3);
    const overDiagonal = axisAt((SOLID_TIMES.entrance + SOLID_TIMES.quarter) / 2);
    expect(overDiagonal.from.y).toBeCloseTo(-1.742, 3);
    expect(overDiagonal.to.y).toBeCloseTo(1.491, 3);
  });

  it('arrives with the animations the flat demo already uses', () => {
    const opacityOf = (seconds: number, id: string) =>
      solidAt(seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'solid/body/pane/0-0/run')).toBeCloseTo(0, 12);
    expect(opacityOf(SOLID_TIMES.entrance, 'solid/body/pane/0-0/run')).toBeCloseTo(1, 12);
    const undrawn = solidAt(0).find((mark) => mark.id === 'solid/cut/run0/run');
    const drawn = solidAt(SOLID_TIMES.entrance).find((mark) => mark.id === 'solid/cut/run0/run');
    if (undrawn?.kind !== 'path' || drawn?.kind !== 'path') throw new Error('both are paths');
    expect(undrawn.path).toHaveLength(0);
    expect(drawn.path[0].curves.length).toBeGreaterThan(50);
  });

  it('paints its inset panel in the sheet ground, so a reading inside it keeps its contrast', () => {
    // This figure has no empty band, so the panel sits over the saddle and has to
    // be opaque. Painting it in the ground the sheet paints behind itself leaves a
    // reading inside it on the ground it was measured against: ink reads 17.22:1
    // on white and 15.87:1 on #0d1117 either side of the panel's edge.
    const marks = solidAt(SOLID_TIMES.half);
    const panel = marks.find((mark) => mark.id === 'solid/window/ground');
    expect(panel?.kind === 'path' && panel.fill?.colour).toEqual(colourFrom(GROUND.light, 'ground'));
    const readings = marks.filter((mark) => mark.id.startsWith('solid/lens/') && mark.kind === 'text');
    for (const reading of readings) expect(reading.kind === 'text' && reading.fill.colour).toEqual(INK);
    // The one whose anchor lands inside the panel, which is the label the x axis
    // writes at the origin the window is centred on.
    const inside = readings.filter(
      (mark) =>
        mark.kind === 'text' &&
        mark.clip !== undefined &&
        interval.holds(mark.clip.x, mark.at.x) &&
        interval.holds(mark.clip.y, mark.at.y)
    );
    expect(inside.map((mark) => mark.id)).toEqual(['solid/lens/solid/axes/x/labels/0/label']);
  });

  it('shows the middle of the saddle in its panel, which is what a hyperbola leaves there', () => {
    // The crossing is a hyperbola, so its two branches pass outside a window on
    // the middle at some bearings and holding both would need 6.3 units of the
    // 8.2 the figure declares, which is a reduction rather than a magnification.
    // What the panel always carries is the saddle's own cells, the three runs of
    // descent and the axes through the middle.
    const inPanel = (seconds: number, part: string) =>
      solidAt(seconds).filter((mark) => {
        if (!mark.id.startsWith(`solid/lens/solid/${part}`) || mark.kind !== 'path' || !mark.clip) return false;
        const box = boundsOf(mark.path);
        return box !== null && overlapOf(box, mark.clip) !== null;
      }).length;
    for (const seconds of named) {
      expect(inPanel(seconds, 'body')).toBeGreaterThanOrEqual(48);
      expect(inPanel(seconds, 'descent')).toBe(3);
      expect(inPanel(seconds, 'axes')).toBe(6);
    }
    // The crossing itself is there at three of the four, and at the quarter turn
    // both branches are outside the window.
    expect(inPanel(SOLID_TIMES.half, 'cut')).toBe(1);
    expect(inPanel(SOLID_TIMES.quarter, 'cut')).toBe(0);
  });

  it('keeps the whole picture inside the frame it declares', () => {
    // The frame is read off the figure rather than written out again here, so
    // reshaping it to fit the picture cannot leave this holding an old number.
    // The inset's marks are read by the rectangle they are cut to rather than by
    // their geometry, since a magnified copy runs past the panel on purpose and
    // what may not leave the frame is the panel.
    const frame = extentAt(solid, 0, 16 / 9);
    for (const seconds of named) {
      const box = boundsOfMarks(solidOwn(seconds));
      expect(Math.abs(box!.x.from)).toBeLessThanOrEqual(frame.width / 2);
      expect(Math.abs(box!.x.to)).toBeLessThanOrEqual(frame.width / 2);
      expect(Math.abs(box!.y.from)).toBeLessThanOrEqual(frame.height / 2);
      expect(Math.abs(box!.y.to)).toBeLessThanOrEqual(frame.height / 2);
      for (const mark of solidAt(seconds)) {
        if (!mark.clip) continue;
        expect(Math.abs(mark.clip.x.from), mark.id).toBeLessThanOrEqual(frame.width / 2);
        expect(Math.abs(mark.clip.x.to), mark.id).toBeLessThanOrEqual(frame.width / 2);
        expect(Math.abs(mark.clip.y.from), mark.id).toBeLessThanOrEqual(frame.height / 2);
        expect(Math.abs(mark.clip.y.to), mark.id).toBeLessThanOrEqual(frame.height / 2);
      }
    }
  });
});

describe('the solid strip', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = solidStripMarks(SOLID_FRAMES, 2);
    // Four frames of 247 own marks, and the four insets between them draw 288:
    // each magnifies a window on a saddle that has turned, so no two of them hold
    // the same number of marks.
    expect(marks).toHaveLength(247 * SOLID_FRAMES.length + 288);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });
});

describe("the flat demo's field", () => {
  it('samples on cells that come out nearly square', () => {
    // Arrows on tall thin cells read as a comb rather than as a field, and so do
    // arrows on wide flat ones, so the reading is how far from square it is
    // either way round.
    const across = interval.span(coords.x.units) / FIELD.x;
    const up = interval.span(coords.y.units) / FIELD.y;
    const shape = Math.max(across / up, up / across);
    expect(shape).toBeLessThan(1.11);
  });
});

describe("the demos' palette", () => {
  // The contrast of a colour against a ground, by the sRGB relative luminance
  // the guidelines define.
  const contrast = (colour: string, ground: string) => {
    const channel = (value: number) => {
      const share = value / 255;
      return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (text: string) => {
      const read = colourOf(text)!;
      return 0.2126 * channel(read.r) + 0.7152 * channel(read.g) + 0.0722 * channel(read.b);
    };
    const [high, low] = [luminance(colour), luminance(ground)].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
  };

  const READING = ['ink', 'slate', 'ember', 'amber', 'deep', 'moss'] as const;
  const WASH = ['mist', 'peach', 'cream', 'sky', 'haze', 'steel', 'frost', 'glaze'] as const;

  it('gives every colour a reader reads off the contrast text is asked for, on both grounds', () => {
    for (const name of READING) {
      expect(contrast(THEME[name].light, GROUND.light)).toBeGreaterThan(4.5);
      expect(contrast(THEME[name].dark, GROUND.dark)).toBeGreaterThan(4.5);
    }
    expect(contrast(THEME.ink.light, GROUND.light)).toBeCloseTo(17.22, 2);
    expect(contrast(THEME.ink.dark, GROUND.dark)).toBeCloseTo(15.87, 2);
  });

  it('keeps every wash below it on both grounds, so nothing carries a reading it cannot hold', () => {
    for (const name of WASH) {
      for (const ground of ['light', 'dark'] as const) {
        expect(contrast(THEME[name][ground], GROUND[ground])).toBeLessThan(4.5);
        expect(contrast(THEME[name][ground], GROUND[ground])).toBeGreaterThan(1.1);
      }
    }
  });

  it('leaves every reading colour unreadable on the ground it was not measured against', () => {
    // What a sheet painting no ground of its own can be shown on, since the
    // colour scheme query inside an `<img>` answers for the browser.
    const onLight = READING.map((name) => contrast(THEME[name].dark, GROUND.light));
    const onDark = READING.map((name) => contrast(THEME[name].light, GROUND.dark));
    expect(Math.max(...onLight)).toBeLessThan(2.81);
    expect(Math.max(...onDark)).toBeLessThan(3.92);
    expect(contrast(THEME.ink.dark, GROUND.light)).toBeCloseTo(1.19, 2);
  });

  // No luminance clears 4.5:1 against both grounds at once, which is why a colour
  // has a value per ground rather than one value chosen carefully.
  it('has no single value that could have served both grounds', () => {
    const capForLight = 1.05 / 4.5 - 0.05;
    const floorForDark = 4.5 * (0.005483 + 0.05) - 0.05;
    expect(capForLight).toBeLessThan(floorForDark);
  });

  it('keeps every step of the surface ramp a wash on both grounds', () => {
    // A cell of a surface carries no reading, so every step stays clear of the
    // contrast text is asked for and clear of the ground it is drawn on.
    for (const ground of ['light', 'dark'] as const) {
      const steps = Object.values(SHADE_THEME).map((step) => contrast(step[ground], GROUND[ground]));
      expect(Math.max(...steps)).toBeLessThan(4.5);
      expect(Math.min(...steps)).toBeGreaterThan(1.2);
      expect(Math.max(...steps) - Math.min(...steps)).toBeGreaterThan(3.1);
    }
  });

  it('spreads the saddle over every step of that ramp', () => {
    // A light with a positive z can never reach the far end of its own ramp on a
    // surface drawn over a plane, so the demo reads its amount against the band
    // its own normals cover. Eight of the twelve steps were reached without it.
    const painted = marksAt(solid, solid.still)
      .filter((mark) => mark.id.startsWith('solid/body/hill'))
      .map((mark) => (mark.kind === 'path' ? mark.fill?.colour.name : undefined));
    const reached = new Set(painted);
    expect(reached.size).toBe(Object.keys(SHADE_THEME).length);
  });

  it('carries every colour as the channels of its light value, under the name a sheet themes it by', () => {
    for (const [name, colour] of [
      ['ink', INK],
      ['mist', MIST],
      ['slate', SLATE],
      ['ember', EMBER],
      ['amber', AMBER],
      ['peach', PEACH],
      ['cream', CREAM],
      ['deep', DEEP],
      ['sky', SKY],
      ['haze', HAZE],
      ['steel', STEEL],
      ['frost', FROST],
      ['glaze', GLAZE],
      ['moss', MOSS],
    ] as const) {
      expect(colour).toEqual(colourFrom(THEME[name as keyof typeof THEME].light, name));
    }
  });
});
