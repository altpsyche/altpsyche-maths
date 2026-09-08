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
- Siva has read the README, the guide and the pictures once, and said so.

## Found while working, not yet queued

- **A strip's labels are too small to read at the width the README shows it.** The four strips draw
  their smallest labelled text at 7.6 to 10.8 pixels on the page, where the four stills draw theirs
  at 14.7 to 20.0. A strip's text size is the figure's own, so growing it grows the stills too, and
  what it wants is a text size a figure can scale with the frame it is drawn into. Found while
  measuring the eight sheets for 1.0.0.

## Someday

- **Gradients along a stroke or across a fill.** The refusal stands and the reason was corrected at
  1.0.0: both painters draw a gradient, so the intersection rule was never what refused it. What
  refuses it is that a colour is text and a gradient is not, so it wants a shape of value the marks do
  not have, an id unique across every figure on a page, and a rule for how it is measured. Nothing has
  asked for one.
- **A variable-width stroke.** What Manim gets from its own renderer and neither painter here offers.
