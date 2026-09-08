# Roadmap

**This file is the only queue.** If a piece of work is not written below, nobody is tracking it.
[DESIGN.md](../DESIGN.md) is the design and queues nothing.

## The goal, stated by Siva

**Anyone who installs this package should be able to make mathematical animations of the quality
3Blue1Brown publishes.** Manim is the reference, and the two ideas already taken from it are that a
picture is a timeline of animations over named objects and that those objects are measured in the
picture's own units. The goal now is the rest of the vocabulary.

**What that does not mean.** Manim is roughly a decade of work and tens of thousands of lines. The
quality of those videos is also substantially the writing and the pacing, which no library supplies.
What is queued here is the part a library can be held to: whether a picture that channel would draw
can be expressed at all.

**What decides the order.** A package is real when it has a consumer that ships, which is the
argument [DESIGN.md](../DESIGN.md) makes about timing moving in here before a single figure existed. So
an item earns its place by a picture something is waiting to draw, and the two demos below are what
is waiting until the website has a chapter that is.

**The website waits.** Its own roadmap has one open item and nothing there needs anything from this
page, so this package is worked to 1.0.0 first and the site is picked up after.

## The two decisions are answered

Both were Siva's and both are made. They are recorded here because they shape every item below, and
DESIGN.md is corrected to match.

**The typesetter goes behind the one door.** MathJax becomes a runtime dependency of this package
rather than sitting behind a second entry point. The reason is that nobody installs a figures package
without needing to label a picture with mathematics, so a consumer paying for MathJax and never
typesetting is a consumer who does not exist. It runs at build time, so what a reader downloads does
not change. **What would change this answer** is a consumer who draws figures and typesets nothing,
which would make a second door worth its test.

**A figure stops being flat.** Surfaces and vectors in space are a large share of the pictures this
package is meant to be able to draw, so refusing them refuses the goal. The camera is a figure's own
and never the engine's, which is the rule DESIGN.md keeps. **Which version it lands in was left to
the session and the answer was 0.9.0**, last of the feature versions, because everything before it is
reusable in three dimensions and nothing in three dimensions is reusable in two. It is now 0.10.0,
moved down one when the boolean operations took a version of their own, and the reason for its place
is unchanged. **What would change that** is a chapter needing a surface sooner.

## The version ladder

**Every item gets its own minor version, then 1.0.0 is the polish.** Siva's plan, and the release
convention this repository already follows makes each one a minor bump. A version is cut when its
demos draw, not when its code compiles. A version that is cut leaves this table and its item goes
with it, because `git log` is what keeps a closed plan.

| version | what lands |
| --- | --- |
| 0.13.0 | The eight sheets readable on a dark ground and worth looking at |
| 1.0.0 | The two demos complete, the README, the surface frozen |

**One place in the order is worth defending.** A camera that moves rides with three dimensions
because a figure's camera is one piece of work whether it is orbiting a surface or panning across a
plane, and splitting it would build the same matrix twice.

## The two demos, which are what a version is cut against

**One demo in two dimensions and one in three, and every feature reaches both.** Siva's ask, and it
is also the test DESIGN.md sets for whether a feature is real: a package is real when it has a
consumer that ships, and until the website has a chapter waiting on axes these two are that consumer.

They are written before the feature they need, as the target the work is built to compile. That is
the order rather than a preference: a demo written afterwards checks that the code runs, where a demo
written first says what the code has to be able to say.

**The flat demo is a tangent sliding along a curve**, and it draws as of 0.4.0. It is
`demos/tangent.ts`: the grid, both axes with ticks and labels, the plotted parabola, the region
shaded under it, a point walking along it, the tangent at that point, and the slope written as a
number that changes. As of 0.5.0 the picture arrives rather than appearing, and the walk is measured
along the curve's own length so the dot keeps one speed. As of 0.6.0 the number sits under the
typeset rule it is a value of, and as of 0.7.0 that rule reads `\frac{dy}{dx} = 0` at the stationary
point and walks into `\frac{dy}{dx} = 2x` as the dot leaves it. As of 0.8.0 the walk ends with a
brace measuring how far the curve climbed and a number counting up to that rise.

**How the walk is driven was Siva's call and the answer is the track.** The track drives a fraction of
the curve's length and the scene recovers the graph x from the point it lands on, so the dot, the
tangent and the reading are one number. Driving the dot with a `moveAlong` span while the tangent
stayed on an x track would have been two clocks free to disagree, since a span's eased fraction and a
track's value are unrelated. **What would change this answer** is an animation that can hand the
scene back what it did, which the seam refuses on purpose.

As of 0.10.0 the view follows the dot across, holding it within 1.2 figure units of the middle of the
frame where it used to cross 2.76. As of 0.11.0 the parabola sits on the field of its own tangents,
and the run integrated through that field from the origin never leaves the drawn curve by more than
4.689e-10 of a figure unit.

**The solid demo draws as of 0.10.0**, since nothing before it could draw one. It is `demos/surface.ts`:
a saddle with a level plane cutting through it, the two branches of the curve where they meet drawn on
both, three axes, the equation of the surface typeset beside it, and an eye that goes round once on a
track. What it takes from the versions before it is everything reusable in three dimensions: the axes
read the same tick list, the plane arrives with `fadeIn` and the curve is drawn on with `draw`. As of
0.11.0 three runs of steepest descent are drawn on the saddle, with the field they follow shown as
arrows across the plane.

**A third demo arrived at 0.9.0 and it is the boolean operations' own.** Siva's ask was one demo flat
and one solid, and this is the exception rather than a change to it: a union of two paths has no
picture in a graph of a function and none in a surface either, the way a rotation has none in a flat
graph. So the operation was given a picture whose whole purpose is the operation.

**The same exception was used a second time at 0.9.5, and for the rotation it names.** `demos/rotate.ts`
turns one L a whole circle in two panels, about the middle of the box round it and about a point the
figure names, which is the only way `rotate` reaches a picture at all. It is also the first figure here
to declare itself a loop, so `loops` has a picture behind it too.

**It is `demos/boolean.ts`: two discs drawn three times side by side, as their union, their overlap,
and the first with the second taken out of it.** One disc stands still and the other walks across it,
from clear of it, through touching it at one point, through overlapping it, to sitting wholly inside
it, and out the far side. That walk is what makes the demo a gate rather than an illustration: it
takes the operation through no crossing, one crossing, two crossings and containment, which are the
four cases this kind of code gets silently wrong.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Every demo is committed and every one is in the README**, which the flat one is as of 0.4.0 and the
boolean one as of 0.9.0 and the rotation one as of 0.9.5. Each image is SVG written by `svgMarkup`,
which needs no browser, so `npm run demos` regenerates the eight of them and a gate compares the
regenerated bytes against the committed files. A picture in a README that nothing regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still.

## Now

**0.12.0 is cut, and a figure walks out of this package as frames.** `frameTimes` and `framesOf` are
the two calls it added. A frame is its index, its time, its marks and the view they are painted
through, read together at one moment, which is what stops a consumer painting a figure whose view
moves through the matrix of some other moment. Frames come back one at a time, since ten seconds at
sixty frames a second is six hundred frames of every mark a figure draws. The step is a rate or a
count, and a walk stops strictly before the duration, so a loop never hands back its own first frame
twice. The rotation strip is a walk now and draws the same bytes it drew when its four times were
written out by hand. Every frame of both demos is painted through both painters in the suite, which
went from 575 tests to 590.

**0.11.0 is cut, and this package draws fields.** `vectorField`, `streamlineOf`, `arrow3`,
`fieldArrows3` and `vectorField3` are the five calls it added. A field is a function from a place to a
vector and nothing here stores one: what the package holds is the sampling, the drawing and the
integration. An arrow's length is the author's, taken from the magnitude at its own sample, and it is
in figure units on a graph and in the world's own units in space. The streamline's step is a distance
rather than a time, which keeps the points evenly spaced, and halving it divides the error along the
curve by 15.1 and then 15.6. Both demos draw against it: the flat one carries the slope field its own
curve is a streamline of, and the solid one three runs of steepest descent down its saddle. The suite
went from 540 tests to 574.

**0.10.0 is cut, and this package draws in space.** `mat4` is below the line, and `camera3`,
`polyline3`, `dot3`, `text3`, `space`, `surface3`, `surfaceCells`, `axes3`, `sectionOf` and `viewAt`
are above it. A camera is a value the caller holds, a builder that works in space hands back the flat
nodes the rest of the package already draws, and nothing in the marks, the tree, the flattening or
either painter was touched to make that work. `demos/surface.ts` is the solid demo Siva asked for: a
saddle, a plane cutting through it, the curve of the crossing, three axes, a typeset equation and an
orbiting eye. An extent carries a centre and may be a function of the clock, and the flat demo's view
follows its dot across. The suite went from 479 tests to 540 and the sheet list from six pictures to
eight.

**The lock file agrees with the manifest again**, and holding it there is one
`npm install --package-lock-only` in whichever commit bumps a version.

**0.13.0 is being worked and nine of its eleven steps are ticked.** Siva read the eight sheets and
rejected them, so 1.0.0 waits behind it: the cut's last criterion is Siva reading the README, the
guide and the pictures, and the pictures are being redrawn.

**A sheet reads on a dark page as of step 1.** Every colour is painted as `var(--name, light)` and
`svgMarkup` writes the theme as a `<style>` element, which works through an `<img>` with no page CSS
reaching it. The six colours a reader takes a value off went from 1.10:1 through 3.91:1 against
`#0d1117` to 15.87:1 through 6.75:1, and are unchanged on white. A value per ground is forced: the
luminance a colour needs to clear 4.5:1 on white is 0.183333 or less and on `#0d1117` is 0.199675 or
more. The suite went from 618 tests to 620 and the door from 227 names to 229.

**The next session starts at step 9**, which steps 9 and 11 were rewritten into: one piece of work about the frame a still is written into, and the last of this version. Siva made the one call this version had, the dark ramp's hue,
and answered it with slate. He also put three defects of the solid sheet into this version rather
than after it, which are steps 7, 8 and 9, so the plan is eleven steps rather than eight.

**1.0.0 is being worked and sixteen of its seventeen steps are ticked.** The library is 6,794 lines,
the door is 227 names, the suite is 618 tests over 40 files, and the four prose surfaces are a 175
line README, a 544 line guide, a 792 line reference and a 387 line DESIGN.md. **The next session
starts at step 17, and it is short.**

**Every done-criterion below is verified but one, and that one is Siva's.** The three gates pass, the
lock file agrees with the manifest, `npm run demos` leaves all eight sheets byte for byte as
committed, the reference has 227 entries against 227 names with a gate holding them equal, the
README and the guide read at a sentence mean of 16.6 and 15.1 words with none over 30, the guide's
seventeen code blocks compile in order, no comment in the tree carries a measurement nothing asserts,
no inline comment run is longer than two lines, and DESIGN.md carries none of the banned phrases. What
is left is **Siva reading the README, the guide and the pictures once and saying so**. On his word,
step 17 is one commit: the version to 1.0.0, `npm install --package-lock-only` in the same commit,
and `npm publish` asked for rather than assumed.

**The four prose surfaces were rewritten in one register, which is Siva's call and not a step.** He
read the pages, rejected the tone twice, and named the model: Eric Lengyel. Definitions first, third
person, the standard name for anything that has one, and every number with the expression behind it.
CLAUDE.md's voice brief carries the rule. All four read at a sentence mean between 15.1 and 16.6 with
none over 30, no banned phrases and no second person. The guide's seventeen code blocks still compile
in order and the reference gate still holds 227 entries against 227 names.

**Step 17's last criterion is Siva reading those four pages once and saying so**, and the pages
changed under it after this rewrite, so that read is of the current text rather than of what was
there before.

**Four findings landed on the way through steps 14 and 15**, each in its own commit. `indicate` walks
into a colour and two comments still said it swaps. Gradients are refused for a reason three files
stated wrongly, since both painters draw one. The demos' comments were never held to the rules the
library's are, and five measurements in them are assertions now. The guide's examples used six names
it never defined.

**What the 0.9.x audit found sound**, so that a later session does not go looking again. Sixty random
pairs of shapes with no coincident edges hold both `area(A) + area(B) = area(A or B) + area(A and B)`
and `difference = A less the overlap` to 1.776e-15. Two circles crossed at every scale from 1e-4 to
1e4 answer 4.11e-4 of the closed form, the same share at every one, so nothing there turns on the
tolerance being an absolute distance. Two 400-piece paths unite in 48ms, so the crossing search needs
no box test in front of it and the quadratic over piece pairs is not worth removing.

## The items

Each is a version above. What follows is what each one covers.

### The pictures, 0.13.0

**A sheet is one figure written out as SVG, and there are eight of them.** Siva read all eight and
rejected them. What he named is five faults. They look unfinished, they are ugly, the two solid
sheets are the worst of them and are not readable, the vector fields read as noise rather than as
fields, and every sheet is drawn for a white ground and breaks on a dark one.

#### What the eight sheets measure today

**Coverage is the share of the frame the drawn bounds cover**: `tangent-strip` 93.4%, `tangent`
80.0%, `surface-strip` 79.3%, `boolean-strip` 75.9%, `surface` 71.0%, `rotate-strip` 65.5%,
`rotate` 65.0%, `boolean` 59.9%. **On-page text is the smallest labelled glyph at the width the
README shows the sheet**: `boolean` 20.0px, `tangent` and `rotate` 17.3px, `surface` 14.7px, and the
four strips at 10.8, 9.4, 7.9 and 7.6px.

**Coverage does not measure emptiness, which is why a sheet can pass it and still look empty.**
`rotate.svg` reads 65.0% covered and draws two shapes inside the upper third of a frame 1080 by 600.
The bounds are stretched by a caption at y=575 and a word at y=181 while the picture between them
stays small. Step 8 replaces the number with one an empty frame fails.

**Twelve colours are written against one ground.** `demos/palette.ts` says so in its own header: each
is measured against the white the sheets are drawn on. Six of the twelve carry a reading a reader
takes a value or a word off, and all six clear 4.5:1 against white at INK 17.22:1, DEEP 5.93:1, EMBER
5.18:1, MOSS and AMBER 5.02:1 and SLATE 4.83:1. Against GitHub's dark ground `#0d1117` none of the
six clears it: INK falls to 1.10:1, SLATE to 3.91:1, AMBER and MOSS to 3.77:1, EMBER to 3.65:1 and
DEEP to 3.19:1. `paint/svg.ts` writes each colour into the mark as a literal `fill`, so nothing on
the page can correct it.

**The saddle reads as cardboard because its shading covers a contrast range of 2.19.** `shadeOf` runs
a level from 150 to 240 in a warm ramp, which against white is 3.46:1 for a cell facing away and
1.27:1 for one facing the light. The lightest cell sits 1.27:1 from the ground it is drawn on, so the
near edge of the surface is nearly the page.

#### The mechanism for a dark ground is measured rather than chosen

**A `<style>` block inside the SVG carrying `@media (prefers-color-scheme: dark)` works through an
`<img>`.** Measured in Chromium with `--blink-settings=preferredColorScheme`: the same file draws
`#f0f0f0` text under the dark scheme and `#1b1b1b` under the light one, from one file with no page CSS
reaching it. This is also what `paint/svg.ts` already promises in its own header, that a figure
follows a theme with nothing watching.

**What is not measured here is GitHub's sanitizer**, which is what serves the README's sheets and may
strip a `<style>` element. Step 1 measures that first. The fallback is `<picture>` with a `<source>`
per scheme, which GitHub documents, and it doubles the sheets from eight to sixteen and the byte gate
with them.

#### The one call that is Siva's

**Whether the dark sheet keeps the warm surface ramp or takes a cool one**, and whether a dark sheet
is a second palette chosen for that ground or the light palette lightened. Step 1 lands a mechanism
and a light palette unchanged, then puts both versions of the surface sheet in front of Siva. Nothing
after step 1 depends on the answer.

#### The steps

**The order is not free.** The ground lands first, because the palette it settles is what every later
step picks a colour from. The text size lands before the frames are re-timed, since step 8 measures
the text of the frames step 4 chose. The stills are re-measured last, because every step before it
changes the bytes of a sheet.

**Every step changes a sheet, since the demos are what this version is.** Steps 1, 2 and 6 also add a
name to the door, and 0.13.0 lands before the surface is frozen at 1.0.0 for that reason.

- [x] **1. The ground a sheet is drawn on.** A colour is painted as `var(--name, light)` and
  `svgMarkup` writes the theme as a `<style>` element, the light ground on `:root` and the dark one
  behind `prefers-color-scheme`. No class was needed and no colour is read to theme it, so the rule
  that a colour is text is unchanged. **A value per ground is forced rather than chosen**: to clear
  4.5:1 against white a colour needs a relative luminance of 0.183333 or less, and to clear it
  against `#0d1117` it needs 0.199675 or more, a gap of 0.016341 that no single value fits. The
  six reading colours went from 1.10:1, 3.19:1, 3.65:1, 3.77:1, 3.77:1 and 3.91:1 on `#0d1117` to
  15.87:1, 8.43:1, 6.75:1, 8.69:1, 8.40:1 and 7.41:1, and are unchanged on white at 17.22:1 through
  4.83:1. The six washes read 1.28:1 through 3.52:1 on the dark ground, inside the band the light
  ones hold. The sheets stayed at eight and grew from 69,413, 277,410, 2,807, 13,466, 1,877, 8,097,
  89,891 and 365,165 bytes to 72,474, 288,367, 3,395, 14,531, 2,436, 9,046, 92,075 and 372,614. The
  door went from 227 names to 229 and the reference with it, and the suite from 618 tests to 620.

  **GitHub's sanitizer is still unmeasured and it does not gate the step.** The colour inside each
  `var()` is the light value, so a sheet whose `<style>` element is stripped draws exactly what it
  drew before this step. The `<picture>` fallback is not needed and the sheets stay at eight.

  **`lerpColour` reads the colour a `var()` falls back to**, which `colourOf` still refuses. Without
  it every themed mark would have been held at the far end of an `indicate` rather than eased,
  because `paintedTowards` reads the mark's own colour and `demos/tangent.ts` indicates its dot. The
  mix runs through the light value on both grounds, so a themed colour cross-faded on a dark page
  starts from its light end.

  **The surface ramp cannot ride a custom property, which is step 6's to settle.** `shadeOf` computes
  a colour for each of 2,304 cells from how squarely it faces the light, so there is no name to
  theme. The saddle is the light ramp on both grounds and reads as a lit slab on the dark one. A
  wash takes no reading off it, so what it needs is separation from both grounds rather than 4.5:1
  against either, and a ramp inside the middle of the range clears that.

- [x] **2. A text size that holds against the frame.** The floor belongs to the write rather than to
  the mark, since `tangent` is written as a still and as a strip frame and one figure cannot carry two
  floors. `svgMarkup` and `paintSvg` take a `minTextSize` in the units they paint into, and every text
  size is multiplied by the one factor that brings the smallest of them to it. **Raising each size on
  its own to the floor was wrong and was measured wrong**: it took `tangent-strip`'s 12.188 and 15.938
  written units to 18.251 alike, flattening two sizes into one. The lift keeps them at 18.251 and
  23.873. The four strips went from 9.4px, 10.8px, 7.6px and 7.9px on the page to 14.0px each, and the
  four stills are untouched at 17.3px, 20.0px, 17.3px and 14.7px, since a floor of 14 sits under the
  14.7 the tightest still already drew. The door went from 229 names to 229, the option being a field
  on a type already there, and the suite from 620 tests to 622.

  **The lift makes two captions collide, which is why step 3 follows it.** `rotate-strip` draws
  "about its own middle" and "about a point it is given" in one frame and they now run together, and
  `surface-strip`'s tick numbers crowd their own axis. Text is never measured here, so nothing can
  know a caption's width, and the fix is a shorter caption rather than a smaller glyph.

- [x] **3. The rotation's placeholder word, and every caption.** The word riding the shape was the
  literal string `label`, twice in `rotate.svg` and eight times in `rotate-strip.svg`, and it is
  `upright` now, which is what the mark is there to show. The three boolean captions read "either
  one", "both at once" and "first without second" and read `union`, `intersection` and `difference`
  now, which are the standard names. The two rotation captions went from "about its own middle" and
  "about a point it is given" to "about its centre" and "about a given point", **which is what
  cleared the collision step 2 made**: the two no longer run together in a strip frame. The panel's
  `label` field went with the change, since a caption that is the operation's standard name is the
  name the marks are already grouped under, and `overlap` became `intersection` in three mark ids the
  suite reads. A gate holds no sheet carrying the placeholder, and the suite went from 622 tests to
  623.

- [x] **4. The frames a strip shows.** **The flat strip drew one frame twice.** Its first two times
  were the start and the end of the beat, and nothing moves during the beat, so the two rasterised to
  a root-mean-square difference of 0 and the suite's own expectation held "slope 0.00" twice. The
  four times are the arrived picture and two moments of the walk and the braced reading now, which
  read 0.00, 1.59, 4.98 and 6.00, and the closest pair rose from 0 to 6,308.74 and from 0.5% of marks
  moved to 14.9%.

  **The solid strip repeated itself for a reason the plan's measurement could not see.** Every pair
  of its frames differed in 94.7% of marks, yet frames 0 and 2 rasterised 2,501.39 apart and frames 1
  and 3 3,355.49 apart where every other pair sat near 8,000. The cause is a symmetry: the saddle is
  unchanged by a half turn about the z axis, since `(x, y)` and `(-x, -y)` give the same height, so
  the four quarters of an orbit are two pairs of the same shape. The four eyes sit at 0.03, 0.11,
  0.19 and 0.27 of the orbit now, inside a quarter turn, and the closest pair went from 2,501.39 to
  6,631.70.

  **The share of marks that moved is not the measurement for a camera and the gate says so.** Two
  gates landed instead: no two frames of any strip agree on more than nine tenths of their marks,
  which is what caught the flat strip, and no two eyes of the solid strip are a half turn apart, with
  the saddle's own invariance asserted beside it. The suite went from 623 tests to 625.

- [x] **5. The curve clipped to its frame.** **The premise was half wrong and the measurement said
  so.** `tangent-strip` had nothing outside its view box at all: the parabola ends where it is
  plotted, at three across and nine up, rather than being cut. `tangent.svg` had 65 of its 3,421
  drawn points outside, 1.90%, and every one of them at the left edge.

  **What was outside was the graph's own left side.** The grid's major at minus one and its minor at
  minus three quarters, the left end of every horizontal grid line, the x axis line, its low arrow
  head at 10 points of 10, the tick at minus one, five field arrow shafts and 16 of the curve's 232
  points. The cause is the followed view: the frame's middle travelled to 1.56 figure units where the
  graph's own margin allows 0.62, which is the frame's half-width of 5.4 less the graph's 4.6 less
  the 0.18 the axis reaches past its last tick. The follow stops there now and the sheet has 0 of
  3,421 points outside.

  **The trade is the dot sitting further from the middle and it is worth naming.** Its greatest
  distance from the middle of the frame went from 1.2 figure units to 2.14, and from the middle of
  the world it is unchanged at 2.76. The view's travel across went from 312 written units to 124 and
  its distinct places over a walk at thirty frames a second from 78 to 21. Step 4's floor for how
  much a strip's closest pair must move went from a tenth to a twentieth, since a view stopped at the
  graph's edge holds the grid and the field still between the last two frames and took that pair from
  14.9% to 7.9%. The two sheets went from 72,475 and 293,072 bytes to 71,616 and 292,197.

- [x] **6. The surface lit so its depth reads.** **The nominal range of the ramp was never the
  number.** `shadeOf` ran a level from 150 to 240, which is 3.46:1 to 1.27:1 against white, but the
  saddle only reached 216 to 239 of it: 144 cells took 16 near-identical colours and the shading
  covered a contrast range of 0.32. The cause is the light. It came straight down the z axis, which
  is nearly parallel to every normal a surface drawn over a plane has, so the whole saddle faced it
  alike and the amount spanned 0.264. Over the shoulder at `(-0.4, -0.6, 0.7)` the same normals span
  0.653.

  **A computed colour can ride a custom property once it is cut into steps.** Twelve steps carry the
  ramp, a cell paints one of them by name, and the surface follows the ground like every other
  colour. The saddle used 16 colours before and uses all twelve steps now.

  **A light with a positive z cannot reach the far end of its own ramp**, so the demo reads its
  amount against the band its own normals cover, 0.346 to 1, rather than against nothing to one.
  Without that the saddle reached eight of the twelve steps and the light ramp's used range was 1.35
  where the ramp itself offers 3.15.

  **Each ground carries its own hue, which was Siva's call and the answer is slate.** On white the
  ramp is warm, 133 to 246 offset by nothing, minus fourteen and minus thirty-four. On `#0d1117` it
  is slate, 42 to 129 offset by minus eighteen, minus six and plus ten, since a warm surface read as
  bronze against the page. Both were rendered and put in front of him. Every step of both is a wash,
  none over 4.4:1 of its ground and none under 1.2:1, leaving the ends 3.15 and 3.19 apart. The
  shading's used range went from 0.32 to 2.75 against white. The suite went from 625 tests to 627.

- [x] **7. The three axes named.** `Axes3Options` gains `names`, and an axis it names writes that
  name past its own far end under `name`, leaning the way the label of the last tick leans and set
  clear of it by the label's own size so the two are not written over each other. The solid sheets
  went from no names to three, and the door is unchanged at 229 names, since `Axes3Options` was
  already there and gained a field. The solid figure went from 265 marks to 268 and the strip from
  1,060 to 1,072, and a walk of it paints 10 pieces of text where it painted 7. The suite went from
  627 tests to 628.

- [x] **8. The descent run's curl.** **Nothing was wrong with any one run.** The worst turn between
  two steps of the three was 13.5 degrees and the field's magnitude along them never fell below
  0.202, so the integration was sound and the curl was not an artifact of it. What made the curl is
  three runs in one place: seeded a twentieth off the x axis at `(1.3, 0.06)`, `(-1.3, 0.06)` and
  `(0.5, -0.04)`, all three swept the region round the middle and came within 0.106 of each other,
  one of them passing 0.202 from the middle itself. Projected onto the saddle three curves that
  close read as one tangle.

  **The field is nothing at the middle and every run bends hardest near it**, which is why a seed
  near an axis is a seed that crowds. Three tenths off, at `(1.3, 0.3)`, `(-1.3, 0.3)` and
  `(0.6, -0.3)`, the closest two runs hold 0.528 apart and the nearest any comes to the middle is
  0.600. The worst turn fell from 13.5 degrees to 4.7 and the smallest magnitude rose from 0.202 to
  0.600. The runs are shorter for it, 35, 35 and 28 points where they were 47, 47 and 36. The suite
  went from 628 tests to 630.

- [ ] **9. The frame each still is written into.** **The premise was wrong for three sheets of the
  four and the measurement said so.** On `tangent.svg` the rule stands at x 25 to 134 inside a
  picture that spans 0 to 956, so it sits in the band above the graph that the demo leaves for it
  rather than in a column of its own. Both strips read the same way, since each holds four frames.
  Only `surface.svg` has the column: its rule spans x 23 to 178 and its picture 272 to 882, so 8.7%
  of the frame stands between them and the whole of the left margin below the rule is empty.

  **The cause is the frame rather than the placement, and it is step 11's own subject.** A
  perspective projection of a saddle comes out roughly square, so a picture 610 wide sits in a frame
  1080 wide and the rule in the left margin is what fills the rest. The sheet reads 71.0% covered
  only because the rule stretches the bounds to x 23: the bounds are 860 wide where the picture is
  610. That is the same flaw step 11 is there to fix, so the two are one piece of work and the frame
  is what it changes. **Measures:** the share of the frame no mark covers, on all four stills; the
  width of the surface sheet from 1080 against a picture 610 wide.

- [x] **10. A field drawn as a field.** **Both fields drew heads all along and the plan was wrong to
  say otherwise.** What they drew was heads nobody could see: four times the shaft's width, which is
  what an arrow takes when nothing says, came to 4.43 to 5.01 pixels on the flat sheet and 2.48 to
  2.78 on the solid one at the width the README shows them. A head of 0.16 figure units on the flat
  sheet and 0.13 on the solid one draws 9.81 to 11.14 and 6.12 to 9.05 pixels.

  **Fifty arrows over a graph that already carries a grid, a curve, a shaded region, a tangent and a
  dot is the noise rather than the field.** The flat sheet samples 21 now and the solid one 25, of
  which 24 draw: the sample at the middle of a five by five grid sits on the origin, where this
  field is nothing and an arrow of no length is no mark. **Seven across by four up was tried first
  and was wrong**, since it puts the cells at 1.267 of square where the rule is 1.11, and that rule
  was itself only half written: it read the cells as wider than tall and passed nothing taller than
  wide. Seven by three holds 1.053.

  The two field colours went from HAZE 1.49:1 and STEEL 2.30:1 against white to 2.53:1 and 3.49:1,
  and on the dark ground from 2.21:1 and 3.52:1 to 2.79:1 and 3.53:1, all four still washes. The
  shafts went from 0.018 and 0.01 figure units to 0.03 and 0.022. The flat figure went from 202 marks
  to 144 and the solid from 268 to 244. The suite is 630 tests before and after.

- [ ] **11. The stills re-timed, and every sheet measured again.** Coverage on bounds is a number an
  empty frame passes, and two sheets now show how: `rotate.svg` reads 65.0% while drawing inside the
  upper third of its frame, and `surface.svg` reads 71.0% with bounds 860 wide round a picture 610
  wide, because a label in a corner stretches the bounds past the picture. What replaces it is the
  share of the frame no mark covers. All eight are read again on that and on on-page text, and the
  picture the README opens on is decided on the readings rather than kept. **Measures:** the
  replacement number for all eight against the eight coverage figures above; the sheet the README
  opens on.

#### Done-criteria

- Every colour a reader takes a value or a word off clears 4.5:1 against the white ground and against
  `#0d1117`, and a test in the suite holds both.
- A sheet in the README is legible under the dark scheme, measured the way step 1 measured it.
- No sheet draws a labelled glyph smaller than the floor step 2 sets, and no still falls below 14.7px.
- No sheet carries the string `label`, and a gate says so.
- Every caption names the operation with the standard name for it.
- No two frames of a strip move fewer marks between them than the floor step 4 sets.
- No drawn geometry falls outside the view box on any sheet.
- The surface's shading covers a used contrast range wider than 2.19, every step of its ramp is a
  wash on both grounds, and the saddle reaches every step.
- The three axes of the solid sheets carry names.
- No run of steepest descent turns back on itself.
- No still leaves more of its frame uncovered than the number step 11 sets, measured on what marks
  cover rather than on the box round them.
- Every field arrow draws a head at the width the README shows it.
- Every sheet is measured on the number step 8 sets, and the README opens on the sheet that reads
  best on it.
- `npm test`, `npm run type-check` and `npm run build` pass, and the lock file agrees with the
  manifest.
- `npm run demos` regenerates every sheet byte for byte as committed.
- Siva has read the eight sheets once and said so.

### The polish, 1.0.0

Both demos complete, the README carrying both, and the public surface frozen. A 1.0.0 is a promise
about `index.ts` not changing under a consumer, so what it needs beyond the features is a read of the
whole door with that promise in mind.

**Its steps are written below, and no code was touched in the session that wrote them.**

#### What the polish covers, given by Siva

He called this one crucial and named five areas. They are written here rather than left to a session
to guess, and each one needs the plan to say how it is checked.

**The codebase.** 6,624 lines across `figure`, `values`, `timing` and `paint`. What a read is looking
for is the same thing said two ways, a name that stopped matching what it does, a comment carrying a
measurement that is now stale, and a file that grew past what its header claims. `figure/space.ts` and
`figure/annotate.ts` have both taken new calls three versions running.

**The API.** 225 names come out of `index.ts` across 89 lines, 132 of them values and 93 of them
types. A 1.0.0 says none of them moves under a
consumer, so the read has to answer, for each one, whether it is the name a caller would guess, whether
it belongs at the door at all, and whether two of them are the same idea under different names. The
option bags want the same read: `resolution`, `over`, `within` and `samples` mean nearly the same thing
in four files and do not all take the same shape.

**The README.** 402 lines, and Siva's word for how it reads now is robotic. It wants a full natural
overhaul rather than a pass with a comb. Every paragraph opens on a bold lead and closes on a measured
number, and a reader meeting the twentieth of those has stopped reading. The prose rules in CLAUDE.md
are the floor and not the ceiling: a rule against brochure language does not by itself make a page
someone wants to read. What a plan has to decide is who the reader is at each point of the page, since
the person deciding whether to install this and the person looking up what `sectionOf` does are not the
same person.

**The images.** Eight sheets, and Siva's word is that they are not enticing. They were each cut to
prove a feature draws, which is why they look like gates rather than like the pictures the goal at the
top of this file names. What that means for colour, composition, what a still is chosen to show and
whether the README's first picture is one of the eight or a new one is the plan's to answer.

**The docs.** DESIGN.md is 242 lines and is the design. There is nothing between it and the README:
no page a reader lands on to learn what a figure is, no reference for the 225 names, and nothing that
says what this package refuses to do and why. Whether that gap is filled at 1.0.0, and where it lives
if it is, is Siva's call rather than a session's.

**What else is in scope** is the two items that were under "Found while working": the colour reader, which is the
one thing keeping `indicate` from easing between two colours, and the byte gate's rounding boundary. A
1.0.0 that freezes the door with a known gap behind it should say so on purpose rather than by
omission.

#### The calls Siva made on this item

**A guide and a reference both land at 1.0.0.** Four prose surfaces after that: the README sells,
the guide teaches, the reference is looked up, and DESIGN.md says why the design is what it is. The
reference is the one that can go stale in silence, so it gets a gate that fails when a name at the
door has no entry.

**The colour reader is code at 1.0.0.** A reader for hex and `rgb()`, a refusal for every other form,
and `indicate` easing between two colours instead of swapping them. It adds a name to a door about to
be frozen, which is the reason to land it now rather than at 1.1.0, and it is what lets the demos'
palette cross-fade.

**Whether the README opens on one of the eight pictures or a ninth is decided by which reads better**,
and step 10 decides it on a number rather than on taste. The eight are measured for what fraction of
their frame the drawn bounds cover and how tall the smallest labelled text stands at the width the
README shows. A ninth sheet is cut only when none of the eight clears both.

#### What a measurement of "reads better" is

**The greppable half of the prose rules already passes.** The README carries none of the phrases
CLAUDE.md bans and DESIGN.md carries one, so the robotic reading Siva named is not phrase-level and no
word list will find it. What is measurable is shape and load. Nine of the fifteen sections are the
same shape, `IMG P CODE P IMG P`, so a reader meeting the fourth one already knows what the fifth
looks like. The page has 148 sentences at a mean of 24.7 words with 46 of them over 30, and 55 prose
paragraphs at a mean of 66.5 words. There is no install line anywhere in it.

**Those numbers are a floor and not the verdict.** A step that claims a page reads better quotes them
and then says plainly that the reading is Siva's, taken once against the whole page rather than per
commit. The same holds for the pictures: a palette and a frame size are numbers, and whether a still
is worth looking at is not.

#### The steps

**The order is not free.** The colour reader lands before the door is read, so the read sees the name
set it is being asked to freeze. The code is read before the door is renamed, because a rename lands
in `index.ts` and in the file it points at. The door is settled before any page is written, because a
page written against the old names is a page written twice. The pictures are cut before the pages that
carry them, and 1.0.0 is cut last.

**The demos gain from steps 8, 9 and 10**, which are the pictures Siva called not enticing, and every
demo is recompiled by steps 6 and 7 against the renamed door.

- [x] **1. The comments carrying a measurement.** Seven of the nine numbers in comments were
  measurements and two were definitions: `figure/ticks.ts` names three fifths as
  0.6000000000000001 and `figure/extent.ts` names sixteen by nine as 1.78, and neither can drift,
  so both stay. The seven left their comments and became brackets in the suite. One of them was
  stale: `figure/inside.ts` claimed the point ceiling left a thousandfold of room over a unit
  circle at a tolerance of a millionth, and that circle wants 4,097 points against a ceiling of a
  million, so the room is 244-fold. The chord shortfall was not stale and the suite proved it while
  the number was being moved: 16 chords read a curve 4.02e-4 short of the curve's own length, where
  measuring against an exact circle instead reads 2.62e-4 and mixes in the error the cubic already
  has. **Measured:** seven comments carrying a measurement to zero; seven inline runs over two lines
  to zero; 1,994 comment lines of 6,624 to 1,987 of 6,563; the suite from 590 tests to 592; all
  eight sheets identical.

- [x] **2. The same thing said twice.** Four copies of the same widening, a resolution given as one
  number spread over the ways a grid is counted: `resolutionOf` and `gridOf` in `figure/space.ts`
  under two names in one file, `stepsOf` in `figure/field.ts`, and a fourth written inline in
  `figure/section.ts`. The grid itself was walked twice: `surfaceCells` worked out each cell's four
  corners, where `sectionOf` already took the corners once and read cells out of them. Both now come
  from `figure/grid.ts`, and the cheaper walk is the one that was already there. **Measured:** four
  wideners to one; `surfaceCells` at a resolution of 28 asked its surface for 3,136 points and asks
  for 841, since four cells meet at every inside corner; `sectionOf` unchanged at 2,401, which is
  what it always did; 6,563 lines to 6,540 with a 41-line file added, so 64 lines of repetition gone;
  the suite from 592 tests to 593; all eight sheets identical.

- [x] **3. Files past what their header claims.** `figure/space.ts` held three subjects under a
  header naming one: the primitives a camera projects, the field of arrows, and the surface of cells.
  It split along them into `space.ts`, `field3.ts` and `surface3.ts`, which is the naming
  `axis.ts` and `axis3.ts` already set. `figure/annotate.ts` turned out to hold one subject and did
  not want splitting; what it had was the same overclaim `space.ts` had, a header promising every
  builder hands back a group where `bracePath` hands back a path and the pieces a scene sorts are not
  groups either. Both headers now say what their file does. **Measured:** `space.ts` from 349 lines
  to 182, with `field3.ts` at 94 and `surface3.ts` at 90; exports per file from 14 to 8, 3 and 3;
  225 names at the door unchanged across 94 lines from 89, since a split moves a name's file and not
  the name; 6,540 lines to 6,569, the two new headers being what grew; the suite holds at 593; all
  eight sheets identical.

- [x] **4. Two colours walked between.** `values/colour.ts` reads hex in three, four, six and eight
  digits and `rgb()` and `rgba()` with commas, spaces or a slash before the alpha, either as numbers
  or as percentages. Twelve other forms are refused, a named colour and `hsl()` among them, because a
  named colour read as black is a wrong picture with nothing to say it went wrong. `indicate` walks
  into its colour from whatever each mark already had, and where either end is a form the reader
  refuses it holds the far end rather than mixing towards a guess. **Measured:** `indicate` from
  `#222` towards `#f00` gave `#f00` flat across the whole span and now gives rgb(57, 30, 30) at a
  tenth, rgb(145, 17, 17) at a quarter and rgb(255, 0, 0) at the middle; the door from 132 values and
  93 types to 135 and 94; the suite from 593 tests to 608; all eight sheets identical, since no still
  and no strip frame lands inside the flat demo's own indicate span.

- [x] **5. The door read, name by name.** All 229 names were read against the three questions. Two
  do not belong at the door and ten are not the name a caller would guess. Five groups looked wrong
  and turned out to be right, and they are written down so a later read does not go over them again.
  The renames are not applied here: they reach the site and the README, so step 6 applies whichever
  of them Siva takes.

  **Two that do not belong.** `OrthographicOptions` and `PerspectiveOptions` come out of
  `values/mat4.ts` and nothing in this tree, in the tests or in the demos names either of them. Both
  exist only as the parameter type of a call whose every caller passes a literal, so freezing them
  freezes two names no consumer has a use for.

  | name | which question it fails | what it would become |
  | --- | --- | --- |
  | `at` | the name a caller would guess | `marksAt`, since `viewAt` beside it says what it reads |
  | `space` | says what it does | `scene3`; the call orders pieces back to front and its name says a place |
  | `slopeOn` | two ideas under one name, beside `slopeOf` | `tangentOn`, which is the direction it returns |
  | `scaled` and `unscaled` | which way round they go | `toUnits` and `toGraph` |
  | `pathData` | which way it goes, beside `pathFromData` | `pathToData` |
  | `equationMarks` | says what it returns | `equationOf`; it hands back an `Equation`, not marks |
  | `loops` | reads as a noun for the loops of a thing | `isLoop` |
  | `frameTimes` | the pattern its own partner uses | `frameTimesOf`, beside `framesOf` |
  | `Values` | too broad for a door | `TrackValues` |
  | `Edge` | too broad for a door | `FlatEdge` |

  **Five that read as wrong and are not.** `pointOn`, `pointOf` and `pointAlong` are three ideas
  whose first argument says which is which, a curve, a coords and a path, and renaming them buys a
  reader nothing. `boundsOf` and `boundsOfMarks` are one idea over two types, and one call taking a
  union would be worse to read than two names. `flatten` and `flattenPath` flatten different things,
  a tree of nodes and a path of curves, and both names say which. `TOLERANCE` is broad but it is the
  one default this package has. `SAME_TIME` is odd and is the idea it names.

  **Measured:** 229 names read, 2 marked remove, 10 marked rename, 217 marked keep.

- [x] **6. The door verdict applied.** All ten renames and both removals, taken by Siva. What the
  work turned up is that four demos already wrote `at as marksAt` at their own import and one test
  had named its local helper `marksAt` too, so the name the read arrived at is the name the author
  had already reached for five times over. Renaming `at` by its word is not safe: it is the English
  word in a test's name, a parameter in eight files, a hole in a template and a method on the
  timeline, so each rename went into the import list and into call position only, in the files that
  take that name from the door and do not shadow it. Four sites were left to hand: two shadowed
  locals, a template hole and a door test naming its own exports as strings. **Measured:** the door
  from 135 values and 94 types to 135 and 92; twelve names moved across 32 files, 196 lines each way
  and nothing in the diff but the renames; the suite holds at 608 tests; all eight sheets identical.

  **Import lists are out of alphabetical order where a rename moved a name**, which a first pass
  tried to fix and which put 253 lines of reordering into a commit about names. It is a second
  finding and it is not queued: nothing reads those lists but a person, and the tree has never held
  them to an order.

- [x] **7. The option bags take one shape.** Sampling density is `resolution` everywhere, and its
  shape is one number, or one number per way the thing is counted. `plot` counted a curve in
  `samples`, and it has one way to count so its number stays a number. The run a thing is sampled
  over is `over`, keyed the same way: an `Interval` where there is one way and a record of them
  where there are more, so `overX` and `overY` in `field.ts` and the bare `u` and `v` in
  `section.ts` and `surface3.ts` are gone.

  **`within` in `streamline.ts` is not the same idea and keeps its name.** `over` is where samples
  are taken and `within` is where a walk is held, and a walk that leaves its box stops rather than
  sampling outside it. Merging the two would have made one name mean two things, which is what this
  step is against. **Measured:** two names for density to one and three for a domain to one, the
  shape of each written out; the suite holds at 608 tests; every demo compiles and all eight sheets
  identical.

- [x] **8. One palette the demos share.** `demos/palette.ts` holds twelve named colours and the
  shade ramp a surface cell is drawn with, and no hex is written anywhere else in the demos. It sits
  with the demos rather than behind the door, because a mark takes a colour as text and the choosing
  is the author's, which is the rule DESIGN.md keeps. Every colour a reader reads a value or a label
  off stands above 4.5 against the white the sheets are drawn on, which is what the guidelines ask
  of text, and the ones below it are washes and field arrows carrying no reading of their own.
  **Measured:** thirteen hex values written 23 times across four files to twelve names written once,
  `#1b1b1b` from six places to one; contrast against white recorded for each, from 17.22 to one for
  the ink down to 1.15 for the face of a pane of glass; the suite holds at 608 tests; all eight
  sheets identical, since the step moves where a colour is written and not what it is.

- [x] **9. The strips take one shape.** `tangent-strip.svg` was the only strip laid out in one row,
  so its four frames drew at 240 by 126 pixels where the other three drew theirs at 410 by up to 230.
  It takes the `columns` argument the other three already took, and the README shows it at the 820
  pixels they are shown at. Every strip now draws its frames one slot wide, so a frame is 410 pixels
  across in all four sheets.

  **The floor this step was planned against was the wrong measurement and is corrected.** A frame at
  least 200 pixels tall cannot be asked of every strip, because a frame's height at a fixed width is
  the figure's own aspect and the boolean demo's figure is three panels side by side. Its frame is
  158 pixels tall and that is the picture, not a defect. What one shape means is that every strip
  draws its frames at one scale, which is a frame one slot wide, and that no strip runs wider than
  2.6 to one. **Measured:** frame sizes from 240 by 126, 410 by 158, 410 by 193 and 410 by 230 to
  410 by 230, 410 by 158, 410 by 193 and 410 by 230; the tangent strip from 7.60 to one down to 1.78;
  `tangent-strip.svg` from 282,370 bytes to 277,409; the suite from 608 tests to 609.

- [x] **10. The stills chosen to be looked at, and the picture the README opens on.** The eight
  sheets were read on how much of the frame the drawn bounds cover and how tall the smallest labelled
  text stands at the width the README shows it. Coverage: `tangent-strip` 93.4%, `tangent` 80.0%,
  `surface-strip` 79.3%, `boolean-strip` 75.9%, `surface` 71.0%, `rotate-strip` 65.5%, `boolean`
  59.9%, `rotate` 49.0%. On-page text: `boolean` 20.0px, `tangent` and `rotate` 17.3px, `surface`
  14.7px, then the four strips at 10.8, 9.4, 7.9 and 7.6px.

  **What a frame's emptiness turns on is the time the still is taken at, not the frame.** Every
  frame here is sized for the widest moment of its own motion: the rotation reaches 4.940 of its 5.4
  half-width and 2.750 of its 3 half-height somewhere in the turn, so narrowing the frame would clip
  the swing. The rotation's still moved from three eighths of a turn to one eighth, which is 65.0%
  covered rather than 49.0% and is still a clean fraction a reader can name. The other three were
  read the same way and left: the flat demo's best-covering moment is 97.6% at 4.27 seconds and
  shows neither the brace nor the finished reading, so 80.0% at the end of the walk is the better
  picture and coverage is not the only number.

  **The README opens on `tangent.svg`, which is what it already opened on, and no ninth sheet is
  cut.** It is the sheet that clears both numbers by the most: 80.0% covered with 17.3px text, where
  the only sheet covering more has text at 9.4px.

  **The strips' labels are too small to read on the page**, 7.6 to 10.8 pixels, and that is not
  fixable inside this step: a strip's text size is the figure's own, so growing it grows the stills
  too. Written down under "Found while working". **Measured:** the rotation still from 49.0% to
  65.0% and `rotate.svg` from 1,870 bytes to 1,876; the suite from 609 tests to 610, the new one
  holding every still above half its frame.

- [x] **11. The four surfaces divided, and who each is for.** Two readers land here. One is deciding
  whether to install this and has not read a line of it. The other has installed it and wants to know
  what `sectionOf` takes. A page serves one of them at a time, and the README serves both today,
  which is why it is 402 lines with no install line in it.

  **The README sells, and it is for the deciding reader only.** What a figure is, the picture that
  reads best, how to install it, one example short enough to read in full, what it can draw with one
  picture each, what it refuses, and a link to the other two pages. Nothing on it explains an option
  bag. Target 120 lines from 402.

  **`docs/GUIDE.md` teaches, and it is for the reader who has installed it.** In the order a reader
  needs rather than the order the package is built: a figure and a mark, a painter, coordinates and
  scales, a timeline and a span, tracks, annotations, equations, space, frames out. Every technical
  word gets its everyday meaning where it first appears and a forward reference is a defect. It
  carries the eight pictures and the code that draws them, which is where most of the README's nine
  feature sections go. Those sections run from line 21 to line 321, so around 300 of the 402 lines
  move rather than being rewritten.

  **`docs/REFERENCE.md` is looked up, and nobody reads it through.** One entry per name at the door,
  grouped by where the name comes from, each with its signature and one line saying what it is and
  what it hands back. The gate step 14 writes reads the export names out of `index.ts` and fails when
  a name has no entry or an entry names nothing at the door, so the fourth surface cannot go stale in
  silence.

  **DESIGN.md keeps the role it has**, which is why the design is what it is and what this package
  refuses to do. Step 15 checks its claims rather than moving them.

  **The floor steps 12 to 14 are held to**, and it is a floor and not the verdict: a sentence mean
  under 18 words where the README's is 24.7 today, no sentence over 30 where 46 of 148 are, no banned
  phrase where the README already has none, an install line where there is none, no section shape
  shared by more than two sections where nine of fifteen share one, every technical word defined
  where it first appears, and every code block compiling under `tsconfig.demos.json`. **Measured:**
  four surfaces named with one reader each; nine of fifteen README sections sharing one shape today;
  about 300 of 402 lines moving to the guide rather than being rewritten.

- [x] **12. The guide written.** `docs/GUIDE.md` is 467 lines in seventeen sections, teaching in the
  order a reader needs: a figure and a mark, figure units, painting, nodes and names, paths, graphs,
  moving a picture, tracks, a view that follows, annotations, equations, combining shapes, fields,
  space, frames out, and what the package refuses. It carries the four stills. It landed before the
  README, since the README's rewrite links to it.

  **Two of the guide's own examples were wrong and the compile check found them.** A track's key is
  `{ time, value, smooth }` and the guide had written `{ seconds, value, curve }`, which is a shape
  nothing here takes. Two blocks also used a call they had not imported. Every one of the sixteen
  blocks compiles now, each wrapped with the locals a fragment implies.

  **The floor's rule about section shape is a README rule and does not hold here.** Nine of the
  guide's seventeen sections are prose, code, prose, and that is what a page read section by section
  wants. Varying it to satisfy a count written for a page read top to bottom would make it worse.

  **Measured:** 467 lines; 199 sentences at a mean of 13.8 words against the README's 24.7 and none
  over 30 against 46 of 148; 78 paragraphs at a mean of 34.8 words against 66.5; no banned phrase;
  22 technical words defined in bold and every one of them defined where it first appears, which
  four rounds of checking took, since a term glossed pages after a plain use of it is the defect this
  measures; sixteen of sixteen code blocks compile.

- [x] **13. The README written.** 96 lines from 402, in six sections: what the package is with the
  picture that reads best, how to install it, one example in full, what it draws with three pictures,
  what it refuses and why, and where to go next. It sells and hands the reader on to the guide. No
  option bag is explained anywhere on it.

  **The four strips ended up shown by nothing and moved into the guide.** The README dropped the nine
  feature sections that carried them, and a committed sheet with a byte gate that no page shows is a
  picture nobody checks. Each strip now sits in the guide beside the motion it shows, and what a
  strip is gets said once where the first one appears.

  **Measured:** 402 lines to 96; 44 sentences at a mean of 13.8 words from 148 at 24.7, none over 30
  from 46; 18 paragraphs at a mean of 33.8 words from 55 at 66.5; an install line from absent to
  present; nine of fifteen sections sharing one shape to six sections with six different shapes; the
  one code block compiles; all eight sheets referenced, four by the README and four by the guide.

- [x] **14. The reference for the door.** `docs/REFERENCE.md` is 791 lines in thirty-one sections, one
  entry per name at the door: 227 entries against 227 names, each naming what it is and what it takes,
  with an option bag's fields and a family's members under it. `tests/reference.test.ts` reads the door
  and the page and holds the two equal both ways, and a name added to the door with no entry fails it.
  The page's sentence mean is 15.5 words with none over 30, and it carries none of the banned phrases.
  The suite went from 610 tests to 614. The README and the guide both link it.

- [x] **15. DESIGN.md, and the byte gate's boundary.** Twenty-five claims about this tree were read
  against it and ten were wrong: the seam written as `figure.at` where it is `marksAt`, twice; the flat
  refusal written as being lifted where it lifted at 0.10.0; "maths depends on nothing" where MathJax
  is a runtime dependency; geometry placed below the line where it sits above it; a seeded randomness
  nothing here draws; a comfort claim with no reading behind it, now 202 and 265 marks at 2.5 and 2.7
  milliseconds a frame against the 16.7 a sixtieth of a second gives; and the three times written as
  one type declared here where the type is the website's. The gradient refusal is true: `Fill` and
  `Stroke` carry a colour and nothing else. Banned words went from one to zero, `seamless` in a
  sentence about a looping clip. The byte gate's boundary is written down under what becomes
  measurable, with the fix it would cost and why it is not made in advance. Two claims were added, for
  the colour reader and that gate. DESIGN.md went from 242 lines to 245. The gradient refusal was
  re-read and the refusal stands, but the reason three other files give for it does not, which is the
  commit after this one.

- [x] **16. The comment runs in the suite.** The two-line rule was read against the library alone, so
  the library held no run over two lines while `tests/` held 24 of three to six, 79 comment lines in
  all. Each kept its claim and lost the sentence restating it, and the 24 are 48 lines now. Eleven
  files changed, the three gates pass at 618 tests over 40 files, and all eight sheets regenerate byte
  for byte as committed.

- [ ] **17. Cut 1.0.0.** The version bumped in this commit, `npm install --package-lock-only` in the
  same one, the done-criteria verified line by line with the number that satisfies each, and
  publishing asked for rather than assumed. **Measures:** the three gates; all eight sheets identical
  after `npm run demos`; the suite's final count from 590.

#### Done-criteria

- Every comment in the tree that holds a number is an assertion in the suite instead, or gone.
- No inline `//` run is longer than two lines.
- No two files hold the same sampling walk.
- Every file's header names one subject.
- A colour written as hex or `rgb()` is read, every other form is refused, and `indicate` eases
  between two colours at half a span.
- Every name at the door has been read against the three questions of step 5, and the verdict table
  is in this entry.
- One name means sampling density and one name means a domain, in one shape each.
- The demos take their colours from one named list, and no hex is written in a demo file.
- Every strip draws its frames one slot wide, and no strip runs wider than 2.6 to one.
- Every sheet's covered fraction and smallest text height are recorded, and the picture the README
  opens on is the one that clears both by the most.
- The README's sentence mean is under 18 words and no sentence is over 30, and the guide's too.
- The README carries an install line.
- No section of the README shares its shape with more than two others.
- Every technical word in the guide has its everyday meaning where it first appears.
- Every code block in the guide compiles.
- The reference has one entry per name at the door, and a gate in the suite says so.
- All eight pictures, or nine, are referenced by the README or the guide and regenerate to identical
  bytes.
- DESIGN.md carries none of the banned phrases and every claim in it is true of the tree.
- The byte gate's rounding boundary is written down as a known gap.
- `npm test`, `npm run type-check` and `npm run build` pass, and the lock file agrees with the manifest.
- Siva has read the README, the guide and the pictures once, and said so. The pictures are 0.13.0's,
  so this waits on that version being cut.

## Found while working, not yet queued

- **A run of descent shows a short hook where it meets the region's edge.** The run seeded at
  `(-1.3, 0.3)` draws a bracket a few points long at its start on both solid sheets, which reads as a
  kink rather than as the run leaving the region. Found while cutting 0.13.0's step 10.

- **The word riding the shape crosses it in two of the eight rotation frames.** `upright` sits at a
  fixed offset from the shape's centre and the shape turns under it, so at two of the eight times in
  `rotate-strip.svg` the word overlaps the drawn edge. The offset is one vector in `demos/rotate.ts`
  and what it wants is a place the turn cannot reach. Found while cutting 0.13.0's step 3.

## Someday

- **Gradients along a stroke or across a fill.** The refusal stands and the reason was corrected at
  1.0.0: both painters draw a gradient, so the intersection rule was never what refused it. What
  refuses it is that a colour is text and a gradient is not, so it wants a shape of value the marks do
  not have, an id unique across every figure on a page, and a rule for how it is measured. Nothing has
  asked for one.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
