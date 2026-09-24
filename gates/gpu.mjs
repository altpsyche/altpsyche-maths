/**
 * Every committed figure drawn on a card and compared with the SVG painter,
 * pixel by pixel, in a browser.
 *
 * This is not part of `npm test` and it never will be. A claim about what a
 * device draws needs a device, and Node has neither a graphics card nor a
 * rasteriser. Everything the GPU painter can be held to without one is already
 * in the suite: the triangles cover the area a fill rule encloses, a stroke's
 * outline covers 2πrw, a clip cuts to the box, and the engine's own `resolve` and
 * `cost` answer for both demos. What is left is whether the picture on a card is
 * the picture on the page, and that is this.
 *
 * What runs in the page is the built package itself, served over a local address
 * and loaded as modules, so the gate measures what a consumer installs rather
 * than a copy of it. The engine is a bare name inside a dynamic import, which a
 * browser cannot resolve on its own, so the page carries an import map pointing
 * it at what is installed.
 *
 * Both painters are handed the same marks, labels included. The card draws a
 * label as the shapes the shipped typeface gives it and the page writes it as
 * text, so the page is handed that same typeface as a `FontFace` built from the
 * font's own bytes: one typeface either way, which is what makes the comparison
 * a comparison of painters rather than of fonts.
 *
 * The two pictures are not expected to be equal to the last bit and no reading
 * here says they are. An SVG rasteriser computes an edge pixel's coverage exactly
 * and a card resolves four samples to five levels, so an edge pixel differs by
 * construction, and a thin diagonal stroke is nearly all edge.
 *
 * Each figure is read twice, once with its labels and once without them. The two
 * hold different floors and for one reason: a glyph stem is two or three pixels
 * across at the sizes these figures write, so a label is nearly all edge, and an
 * edge is where the two painters differ by construction. Reading the figure both
 * ways is what tells a letter in the wrong place from a letter whose edge is
 * resolved differently.
 *
 * One canvas and one surface draw all eight figures, since disposing a renderer
 * releases what it allocated and leaves the canvas alone. The last figure is then
 * drawn again through a second surface opened on that same canvas, which is what
 * says so rather than assumes it.
 *
 * Run it with `npm run gate:gpu`. It writes nothing.
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');

const WIDTH = 1080;
const HEIGHT = 600;

/** How far apart two channels may be and still count as agreeing, out of 255.
 * An edge pixel is a blend of the mark and the ground in both painters and the
 * two weigh it differently, so the run of values along an edge is what this
 * allows for. */
const CHANNEL = 8;

/** The share of pixels that has to agree within a channel before the gate calls
 * the two pictures the same picture. It is a floor rather than a target: an edge
 * is a small share of a figure and a shape drawn in the wrong place is a large
 * one. */
const FLOOR = 0.97;

/** The same floor for the figure with its labels drawn. A glyph stem at the sizes
 * these figures write is two or three pixels across, so a label is nearly all
 * edge, and an edge pixel is where an exact coverage and four samples resolved to
 * five levels differ by construction. The letters are in the same places either
 * way: the ink of a label drawn both ways sits within half a pixel across and
 * within a pixel down. */
const LETTERED_FLOOR = 0.96;

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.map': 'application/json',
};

const page_html = `<!doctype html>
<meta charset="utf-8">
<script type="importmap">
{"imports": {
  "@altpsyche/engine": "/node_modules/@altpsyche/engine/dist/index.js",
  "@altpsyche/engine/maths": "/node_modules/@altpsyche/engine/dist/scene/maths.js"
}}
</script>
<div id="canvases"></div>
`;

/** The repository over a local address, so the page loads the built package and
 * the installed engine by path rather than by bare name. */
function serve() {
  const server = createServer((request, response) => {
    const asked = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    // The page is served rather than set on the browser, since a page set from
    // outside has no origin and a module fetched from one is refused.
    if (asked === '/') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(page_html);
      return;
    }
    const file = path.join(root, asked);
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = readFileSync(file);
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** The one canvas every figure is drawn on, and the surface over it. A canvas
 * keeps the first graphics context it is given for as long as it lives, so the
 * same one serving every figure is what a disposed renderer leaving it alone
 * buys. */
async function openSurface(page, origin, backend) {
  return page.evaluate(
    async ({ origin, width, height, backend }) => {
      const { gpuSurface, shippedFont } = await import(`${origin}/dist/index.js`);
      // The sheet is rasterised inside an `<img>`, which is an isolated document
      // that fetches nothing and never sees the page's own fonts. So the typeface
      // is carried into each sheet as a rule whose source is the font's own bytes,
      // which is the one way a label in an `<img>` is set in the face the card
      // draws from.
      const font = await shippedFont();
      if (!window.face) {
        let binary = '';
        for (const byte of font.bytes) binary += String.fromCharCode(byte);
        window.face =
          `@font-face{font-family:'${font.family}';src:url(data:font/ttf;base64,${btoa(binary)})}`;
      }
      if (!window.card) {
        window.card = document.createElement('canvas');
        window.card.width = width;
        window.card.height = height;
        document.getElementById('canvases').replaceChildren(window.card);
      }
      window.loss = new Promise((settle) => {
        window.settleLoss = settle;
      });
      window.surface = await gpuSurface(window.card, {
        clear: [1, 1, 1, 1],
        ...(backend ? { backend } : {}),
        onLost: (reason) => window.settleLoss({ reason, at: performance.now() }),
        onRefused: (message) => {
          throw new Error(message);
        },
      });
      if (!window.surface) throw new Error('no backend drew the figure');
      return window.surface.backend;
    },
    { origin, width: WIDTH, height: HEIGHT, backend }
  );
}

/** Takes the card away from the open surface, the way each backend loses it, and
 * paints one figure's marks through the lost surface. WebGL 2 is restored before
 * returning, since a canvas whose context is lost gives a new surface nothing. */
async function takeAway(page, origin, name) {
  return page.evaluate(
    async ({ origin, name, width, height }) => {
      const { readFigure, marksAt, viewAt, paintGpu } = await import(`${origin}/dist/index.js`);
      const figure = readFigure(await (await fetch(`${origin}/demos/${name}.figure.json`)).text());
      const marks = marksAt(figure, figure.still, width / height, 'gpu');
      const view = viewAt(figure, figure.still, width, height);
      const surface = window.surface;
      const lose = surface.backend === 'webgl2' ? window.card.getContext('webgl2').getExtension('WEBGL_lose_context') : null;
      const started = performance.now();
      if (lose) lose.loseContext();
      else surface.device.destroy();
      const loss = await window.loss;
      const refused = paintGpu(surface, marks, view).refused.length;
      if (lose) {
        // Chromium permits a restore only once the lost event's dispatch has returned,
        // so a restore asked for in a microtask of that dispatch is never answered.
        await new Promise((done) => setTimeout(done, 0));
        const restored = new Promise((done) => window.card.addEventListener('webglcontextrestored', done, { once: true }));
        lose.restoreContext();
        await restored;
      }
      surface.dispose();
      window.surface = null;
      return { backend: surface.backend, reason: loss.reason, took: loss.at - started, refused, marks: marks.length };
    },
    { origin, name, width: WIDTH, height: HEIGHT }
  );
}

/** A card taken away from one figure and the figure drawn again through a new
 * surface on the same canvas, which must give the picture its first reading gave. */
async function lostAndRedrawn(page, origin, name, before) {
  const lost = await takeAway(page, origin, name);
  await openSurface(page, origin, lost.backend);
  const redrawn = (await compare(page, origin, name)).whole;
  const kept = redrawn.same === before.same && redrawn.worst === before.worst;
  const reported = lost.reason === (lost.backend === 'webgl2' ? 'context' : 'destroyed');
  console.log(
    `${name} on ${lost.backend} with its card taken away: onLost said ${lost.reason} after ` +
      `${lost.took.toFixed(1)}ms, a paint through the lost surface refused ${lost.refused} of ${lost.marks} marks | ` +
      `redrawn ${(redrawn.same * 100).toFixed(2)}% equal against ${(before.same * 100).toFixed(2)}%, ` +
      `worst ${redrawn.worst} against ${before.worst} | ` +
      `${kept && reported && lost.refused === lost.marks ? 'the loss was reported and the redraw kept the picture' : 'THE LOSS WAS NOT ANSWERED'}`
  );
  return kept && reported && lost.refused === lost.marks;
}

/** Gives up the card resources the surface holds, leaving the canvas where it is. */
async function disposeSurface(page) {
  return page.evaluate(() => {
    window.surface.dispose();
    window.surface = null;
  });
}

/** One figure drawn both ways in the page and the two pictures compared. */
async function compare(page, origin, name) {
  return page.evaluate(
    async ({ origin, name, width, height, channel }) => {
      const { readFigure, marksAt, viewAt, pixelsGpu, shippedFont, svgMarkup, colourFrom } = await import(
        `${origin}/dist/index.js`
      );
      const font = await shippedFont();

      const text = await (await fetch(`${origin}/demos/${name}.figure.json`)).text();
      const figure = readFigure(text);
      const seconds = figure.still;
      const view = viewAt(figure, seconds, width, height);
      const everything = marksAt(figure, seconds, width / height, 'gpu');
      const marks = everything;
      const ground = colourFrom('#ffffff');

      const surface = window.surface;

      /** The same list of marks through both painters, read pixel against pixel. */
      const reading = async (drawing) => {
        const started = performance.now();
        const drawn = await pixelsGpu(surface, drawing, view);
        const took = performance.now() - started;

        // The same marks through the SVG painter, rasterised by the browser's own
        // reader so the comparison is against what a page actually shows.
        const markup = svgMarkup(drawing, view, width, height, { ground, font }).replace(
          '>',
          `><style>${window.face}</style>`
        );
        const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
        const image = new Image();
        await new Promise((done, failed) => {
          image.onload = done;
          image.onerror = () => failed(new Error('the browser could not read the sheet'));
          image.src = url;
        });
        const sheet = document.createElement('canvas');
        sheet.width = width;
        sheet.height = height;
        // A canvas the card accelerates answers getImageData with zeros wherever the
        // browser is drawing to a real display, so the sheet is read off one the
        // browser keeps in ordinary memory.
        const context = sheet.getContext('2d', { willReadFrequently: true });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const page_pixels = context.getImageData(0, 0, width, height).data;

        const gpu = drawn.pixels;
        let same = 0;
        let close = 0;
        let inked = 0;
        let worst = 0;
        for (let at = 0; at < page_pixels.length; at += 4) {
          let apart = 0;
          for (let band = 0; band < 3; band += 1) {
            apart = Math.max(apart, Math.abs(gpu[at + band] - page_pixels[at + band]));
          }
          if (apart === 0) same += 1;
          if (apart <= channel) close += 1;
          worst = Math.max(worst, apart);
          const white = page_pixels[at] === 255 && page_pixels[at + 1] === 255 && page_pixels[at + 2] === 255;
          const blank = gpu[at] === 255 && gpu[at + 1] === 255 && gpu[at + 2] === 255;
          if (!white || !blank) inked += 1;
        }
        const pixels = page_pixels.length / 4;
        return {
          drew: drawing.length,
          refused: drawn.painting.refused,
          triangles: drawn.painting.triangles,
          same: same / pixels,
          close: close / pixels,
          inked: inked / pixels,
          worst,
          took: Math.round(took),
        };
      };

      const whole = await reading(marks);
      // The same figure with its labels taken out, which is every mark whose edge
      // is a stroke or a fill rather than a letter.
      const unlettered = marks.filter((mark) => mark.kind !== 'text');
      const held = unlettered.length === marks.length ? whole : await reading(unlettered);

      return {
        backend: surface.backend,
        seconds,
        marks: everything.length,
        whole,
        held,
        refused: whole.refused.length,
      };
    },
    { origin, name, width: WIDTH, height: HEIGHT, channel: CHANNEL }
  );
}

const figures = readdirSync(path.join(root, 'demos'))
  .filter((file) => file.endsWith('.figure.json'))
  .map((file) => file.replace('.figure.json', ''))
  .sort();

const { server, port } = await serve();
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') console.error(`  page: ${message.text()}`);
});
await page.goto(`${origin}/`);
await openSurface(page, origin);

let failed = 0;
const first = new Map();
for (const name of figures) {
  try {
    const answer = await compare(page, origin, name);
    first.set(name, answer.whole);
    const { whole, held } = answer;
    const agrees = held.close >= FLOOR && whole.close >= LETTERED_FLOOR && held.inked > 0;
    console.log(
      `${name} at ${answer.seconds.toFixed(2)}s on ${answer.backend}: ${whole.drew} of ${answer.marks} marks, ` +
        `${answer.refused} refused, ${whole.triangles} triangles, ${whole.took}ms, ` +
        `${(whole.inked * 100).toFixed(1)}% drawn | with its labels ${(whole.same * 100).toFixed(2)}% equal, ` +
        `${(whole.close * 100).toFixed(2)}% within ${CHANNEL}, worst ${whole.worst} | without them ` +
        `${held.drew} marks, ${(held.same * 100).toFixed(2)}% equal, ${(held.close * 100).toFixed(2)}% ` +
        `within ${CHANNEL}, worst ${held.worst} | ` +
        `${agrees ? 'the card draws the sheet' : 'THE CARD DISAGREES WITH THE SHEET'}`
    );
    if (!agrees) failed += 1;
  } catch (error) {
    failed += 1;
    console.error(`${name} failed: ${error.message}`);
  }
}

// The same canvas through a second surface, which is what says a disposed
// renderer left it drawable rather than taking its context with it.
const again = figures[figures.length - 1];
await disposeSurface(page);
await openSurface(page, origin);
const redrawn = (await compare(page, origin, again)).whole;
const before = first.get(again);
const kept = redrawn.same === before.same && redrawn.worst === before.worst;
console.log(
  `${again} redrawn through a second surface on the same canvas: ` +
    `${(redrawn.same * 100).toFixed(2)}% equal against ${(before.same * 100).toFixed(2)}%, ` +
    `worst ${redrawn.worst} against ${before.worst} | ` +
    `${kept ? 'the canvas survived the dispose' : 'THE CANVAS DID NOT SURVIVE THE DISPOSE'}`
);
if (!kept) failed += 1;
if (!(await lostAndRedrawn(page, origin, again, redrawn))) failed += 1;
await browser.close();

// Without a card: a software renderer spends the WebGPU device at its first drawable and refuses every readback after it.
if (process.argv.includes('--without-webgpu')) {
  console.log('the WebGPU loss went unmeasured, since --without-webgpu names a run with no card to hold a WebGPU device');
} else {
  // WebGPU is off in Chromium unless asked for, and ANGLE on Vulkan is what gives it
  // the real card rather than SwiftShader, the CPU fallback.
  const webgpu = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=vulkan'] });
  const second = await webgpu.newPage();
  await second.goto(`${origin}/`);
  if ((await openSurface(second, origin, 'webgpu')) !== 'webgpu') {
    failed += 1;
    console.error('no WebGPU surface opened, so the WebGPU loss went unmeasured');
  } else {
    const drawn = (await compare(second, origin, again)).whole;
    if (!(await lostAndRedrawn(second, origin, again, drawn))) failed += 1;
  }
  await webgpu.close();
}
server.close();
console.log(
  `${figures.length - failed} of ${figures.length} figures agree within ${CHANNEL} of 255 over ` +
    `${LETTERED_FLOOR * 100}% of their pixels with their labels and ${FLOOR * 100}% without them`
);
process.exit(failed === 0 ? 0 : 1);
