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

**1.0.0 is next and its sixteen steps are written below.** What it needs beyond the features is a
read of the whole door with the promise a 1.0.0 makes in mind, and the read that planned it is a
session of its own that touched no code.

**What the 0.9.x audit found sound**, so that a later session does not go looking again. Sixty random
pairs of shapes with no coincident edges hold both `area(A) + area(B) = area(A or B) + area(A and B)`
and `difference = A less the overlap` to 1.776e-15. Two circles crossed at every scale from 1e-4 to
1e4 answer 4.11e-4 of the closed form, the same share at every one, so nothing there turns on the
tolerance being an absolute distance. Two 400-piece paths unite in 48ms, so the crossing search needs
no box test in front of it and the quadratic over piece pairs is not worth removing.

## The items

Each is a version above. What follows is what each one covers.

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

- [ ] **4. Two colours walked between.** A reader for hex, in three, four, six and eight digits, and
  for `rgb()` and `rgba()`, which are the forms a figure is handed. Every other form is refused rather
  than answered wrongly, since a named CSS colour read as black is a silently wrong picture. `indicate`
  then eases between two colours instead of swapping them, and the typesetter's own red keeps being
  spotted by comparing the string, which needs none of this. **Measures:** the forms read and the
  forms refused, each with a test; `indicate` at half a span before and after, which is a swap today;
  names at the door from 132 values.

- [ ] **5. The door read, name by name.** No code. `index.ts` exports 132 values and 93 types across
  89 lines, plus whatever step 4 added. For each name the read answers three questions: is it the name
  a caller would guess, does it belong at the door at all, and is it the same idea as another name
  already there. The verdict is written into this entry as a table, so step 6 applies a list rather
  than a judgement. **Measures:** names read, and the count marked rename, remove and keep.

- [ ] **6. The door verdict applied.** Every rename and removal in one commit, because a rename split
  across two commits leaves the door disagreeing with the file it points at. **Measures:** names at
  the door before and after; all eight sheets regenerate to identical bytes; the three gates pass.

- [ ] **7. The option bags take one shape.** Four names mean sampling density today, `resolution` in
  `space.ts` twice and `section.ts` and `field.ts`, and `samples` in `plot.ts`, in three different
  shapes. Three names mean a domain: `over` in `space.ts` and `plot.ts` twice, and `within` in
  `streamline.ts`. **Measures:** four names for density to one and three for a domain to one; the
  shape each takes written out; every demo compiles.

- [ ] **8. One palette the demos share.** Thirteen colours are written as hex across four demo files
  with no shared source, and `#1b1b1b` appears six times. The palette is the demos' own and not the
  package's, because DESIGN.md keeps colour the author's. **Measures:** thirteen ad hoc colours to a
  named list, each with its contrast ratio against the ground; distinct fill and stroke values per
  sheet from 11 on `tangent.svg`, 25 on `surface.svg`, 5 on `boolean.svg` and 4 on `rotate.svg`.

- [ ] **9. The strips take one shape.** `tangent-strip.svg` is 7.60 to 1 in a single row, so at the
  960 pixels the README shows it a frame is 240 by 126. The other three are two rows between 1.78 and
  2.59 to 1, giving frames from 410 by 158 to 410 by 230. **Measures:** the four frame sizes at the
  width the README shows, before and after, against a floor of 200 pixels tall.

- [ ] **10. The stills chosen to be looked at, and the picture the README opens on.** `boolean.svg` is
  12 marks and `rotate.svg` is 8, so both read as diagrams beside `tangent.svg` at 202 and
  `surface.svg` at 265. Two numbers decide a still: the fraction of the view box the drawn bounds
  cover, read with `boundsOfMarks` against the extent, and the height in pixels of the smallest
  labelled text at the width the README shows it. The opening picture is whichever of the eight clears
  both by the most, and a ninth sheet is cut only if none of them clears both. **Measures:** both
  numbers for all eight sheets before and after, the time each still is taken at, and which sheet
  opens the page.

- [ ] **11. The four surfaces divided, and who each is for.** No code. Two readers land here, the
  person deciding whether to install this and the person looking up what `sectionOf` does, and a page
  serves one of them at a time. This step writes into this entry what belongs on the README, what
  belongs in the guide, what belongs in the reference and what stays in DESIGN.md, plus the numeric
  floor steps 12 to 14 are held to. **Measures:** the outline; the count of README sections sharing
  one shape from nine of fifteen; the count of the 402 README lines that move to the guide rather than
  being rewritten.

- [ ] **12. The README written.** A full rewrite against the step 11 outline rather than a pass with a
  comb, and it sells rather than teaches. **Measures:** sentence mean from 24.7 words and the count
  over 30 from 46; prose paragraph mean from 66.5 words; the install line from absent to present; the
  opening picture from step 10; the banned-phrase count still zero.

- [ ] **13. The guide written.** The page a new reader lands on: what a figure is, what a mark is,
  what a painter does with one, and how to draw and move a first picture. It teaches in the order a
  reader needs rather than in the order the package is built, and every technical word gets its
  everyday meaning where it first appears. **Measures:** the same sentence and paragraph numbers as
  step 12; the count of terms defined before first use, which has to be all of them; every code block
  in it compiles under `tsconfig.demos.json`.

- [ ] **14. The reference for the door.** One entry per name at the door, each saying what it is and
  what it takes, and a gate that fails when a name at the door has no entry or an entry names nothing
  at the door. That gate is what stops the fourth surface going stale in silence, and it needs no
  browser because it reads `index.ts` and a page of text. **Measures:** entries against names at the
  door, which have to be equal; the suite from its step 13 count.

- [ ] **15. DESIGN.md, and the byte gate's boundary.** DESIGN.md is 242 lines and carries one banned
  word, `seamless`. Every claim it makes is checked against the tree, since four versions landed after
  it was last read, and the gradient refusal it makes is re-read rather than assumed. The picture
  gate's rounding boundary is written down as a known gap on purpose, since nothing has hit it and the
  fix costs the gate its ability to say a committed file is stale. **Measures:** banned words from one
  to zero; the count of DESIGN.md claims checked and the count corrected.

- [ ] **16. Cut 1.0.0.** The version bumped in this commit, `npm install --package-lock-only` in the
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
- Every strip frame is at least 200 pixels tall at the width the README shows it.
- Every sheet's covered fraction and smallest text height are recorded, and the picture the README
  opens on is the one that clears both by the most.
- The README's sentence mean is under 18 words and no sentence is over 30, and the guide's too.
- The README carries an install line.
- No section of the README shares its shape with more than two others.
- Every technical word in the guide has its everyday meaning where it first appears.
- Every code block in the guide compiles.
- The reference has one entry per name at the door, and a gate in the suite says so.
- All eight pictures, or nine, are referenced and regenerate to identical bytes.
- DESIGN.md carries none of the banned phrases and every claim in it is true of the tree.
- The byte gate's rounding boundary is written down as a known gap.
- `npm test`, `npm run type-check` and `npm run build` pass, and the lock file agrees with the manifest.
- Siva has read the README, the guide and the pictures once, and said so.

## Found while working, not yet queued

- **The picture gate is engine-dependent at a rounding boundary.** A coordinate is written to three
  decimal places, so the sine and cosine differences between engines are invisible in the bytes,
  which is what lets the committed pictures be compared byte for byte at all. A value landing exactly
  on a half in the fourth place would still round two ways. Nothing has hit it, and the fix if
  anything ever does is a picture gate that compares marks by tolerance rather than bytes, which
  costs the gate its ability to say the committed file is stale. Found while planning step 8 of
  0.5.0.

## Someday

- **Gradients along a stroke or across a fill.** DESIGN.md refuses them under the rule that a mark
  may only ask for what both painters can do, and both painters can do gradients, so the refusal is
  worth re-reading rather than assumed.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
