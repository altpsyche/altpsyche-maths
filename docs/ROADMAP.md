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

**What Manim has that this package already answers, so it is not audited again.** `ValueTracker`
with `always_redraw` and `add_updater` is a `Track` with a `scene` rebuilt from the clock, and the
rebuild is the better answer: `marksAt` gives one picture per time whichever direction the clock came
from, where an updater driven by `dt` cannot be scrubbed backwards. `LaggedStart` is `stagger`,
`AnimationGroup` is `together`, and `Succession` is one `play` after another. Two things here have no
Manim counterpart at all: a figure as a file, which is 2.0.0, and boolean operations held to
1.776e-15.

**What Manim has that is refused rather than queued.** Sound, syntax-highlighted code, network
graphs, and the glow and shadow that `manimgl` gets from its own shaders.

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

**A third decision is answered, and it is the one that shapes everything left.** Siva's, made on
2026-09-08.

**This package takes `@altpsyche/engine` as a dependency and grows a GPU painter and a recorder, so
that one install is the whole of it.** The goal at the top of this file says anyone who installs this
package should be able to make the animations, and a figures package leaving a consumer to wire up a
renderer and write shaders does not meet it. `DESIGN.md` said the opposite until now, and the two
could not both stand.

**What it costs a consumer who never draws on a GPU: nothing.** The painter loads the engine with
`await import()`, which is how the typesetting call already loads MathJax, and the engine's own
backends sit behind dynamic imports of their own.

**What it costs this package.** A fix needed from the engine ships there first. And a claim about
what a device draws needs a device, so the painter carries a browser gate and a card gate that are
not part of `npm test`. Geometry and timing stay held by `npm test` alone.

**The engine must never import this package**, since one direction is a dependency and both are a
cycle. The case that looked like it needed the second, a shader declaring a camera, is answered by
passing the camera as data.

**The website becomes a plain consumer.** It asks for a picture rather than assembling one, and the
GPU painter and the recording move here from there.

**A fifth decision is open, it is Siva's, and 2.0.0 is its deadline.** May a `Mark` be a raster
image? There is no image mark today, so a figure cannot carry a photograph or a diagram somebody
drew, and `ImageMobject` is how Manim carries one. Both painters could draw it, `<image>` and
`drawImage`. **What makes it a deadline rather than an item is that a new kind of `Mark` is a change
to the format's value types**, so adding one after 2.0.0 costs a major of the format's own version.
**What is missing is the other half of this repository's test:** no demo and no chapter is waiting to
draw an image, and a feature nothing is waiting to draw is a feature nobody has checked. So it is
answered before the format freezes or it is refused before the format freezes, and either answer is
cheaper than the third.

**A fourth decision is open and it is Siva's. It gates the frozen renderer work rather than the format,
so nothing below waits on it.**

**May a figure be undrawable in SVG?** `figure/mark.ts` says no, in its own header: what a mark may
ask for is the intersection of what an SVG element and a two-dimensional canvas can both do, rather
than the union, because a figure reaching for something only one painter has "would look right on the
page and lose it without a word in a recording". A third painter makes that a three-way intersection.

**The two answers and what each costs.** If the rule stands, the GPU painter draws the same marks
faster and sharper and gains no capability, so there is no depth buffer and the version that would
have written one never returns to the ladder.
If the rule goes, a figure using depth is silently wrong in SVG, and the still frame a page puts in
its exported HTML for a reader with no JavaScript is SVG.

**A third answer exists and it is the one worth examining.** A figure declares which painters can
draw it, so a figure asking for depth is refused by the SVG painter rather than drawn wrongly by it.
That keeps the rule's purpose, which is that nothing is lost without a word, while letting the GPU
painter be worth building.

**Nothing waits on this**, since the format work draws the marks that exist today and the four look
versions in front of it draw them differently rather than draw more of them. What the answer gates is
the GPU painter, which is off the ladder either way.

**A fifth set of decisions is answered, all Siva's, taken on 2026-09-08 after a review of the whole
architecture. They reorder everything below.**

**The figure format is the product, and this package is its reference implementation.** A figure
becomes a serialisable description rather than TypeScript closures. Today `scene` may be a function
and every animation is one, so a figure can only be authored by a programmer writing TypeScript and
can never leave this language. As data it reaches an editor, a page's content, a generator, a worker,
and a renderer written in something else.

**The format is closed.** An author uses the animations and the scene shapes the format names, with
parameters, and never an arbitrary function. That is what makes a figure portable, checkable and
generatable, and the cost is that a new kind of animation is a change to the format rather than a
function somebody writes.

**Every scene shape becomes a named builder.** `plot`, `axes`, `tangentAt`, `areaUnder` and the rest
are nodes of the format with parameters, and a track value binds to a parameter. **This is the
largest single piece of the whole plan**, because a scene builder today computes geometry: the flat
demo walks a path by its own length and recovers the graph x from where it lands, which is the design
this file already defends. Nothing arbitrary survives that.

**The format is versioned and stable, the way the door is.** An old figure keeps rendering and a
breaking change is a major, since anything else makes a second renderer impossible to write against.

**Truly native rendering happens through the format and not through this package.** A renderer in
another language reads a serialised figure and draws it, importing no TypeScript. That is what makes
"native, no browser" reachable at all: `@altpsyche/engine` targets browser WebGPU and WebGL 2, and
its headless path is Playwright driving Chromium with a window needed for a real card, so it cannot
go there and does not have to.

**The GPU painter stays in this package** and video out stays here too, behind a dynamic import. One
install still gives a working figure, a working painter and a file at the end.

**Lottie is the precedent** and it is worth reading before the format is designed. Vector animation
as JSON with independent renderers on several platforms, and its known trouble is the one this format
will meet: renderers drifting apart on the semantics the format left loose, text metrics worst of
all.

## The version ladder

**Every item gets its own minor version, then 1.0.0 is the polish.** Siva's plan, and the release
convention this repository already follows makes each one a minor bump. A version is cut when its
demos draw, not when its code compiles. A version that is cut leaves this table and its item goes
with it, because `git log` is what keeps a closed plan.

**The ladder holds the look, then the format, then what Manim has and this does not.** Siva's call
on 2026-09-08, which reversed the freeze in part. Four renderer versions came off it and stay off,
because every one would have been written against an API the format is going to reshape. Six versions
went on in front of the format, because each changes something the format freezes a written form for,
and freezing first costs a major of the format's own version to change it afterwards. Eight went on
behind, because each adds a kind or a painter, which is a format minor an old figure survives, and
three more are written past those because a session should not rediscover them.

| version | what lands | what it changes | steps | cut against | depends on | plan |
| --- | --- | --- | --- | --- | --- | --- |
| 1.3.0 | the variable-width stroke, as the filled outline of a path | what a `Stroke`'s width may be | 5 | the flat demo's tangent and the solid demo's three runs of descent | nothing outside this package | written |
| 1.4.0 | gradients, as stops along an axis in the mark's own units | what a `Fill` may be | 5 | the flat demo's shaded region and the solid demo's plane | nothing outside this package | written |
| 1.5.0 | the view as a timeline entry, so a camera move is sequenced with the action | the shape of `Figure` | 4 | both demos' views, moved against their own entrances | nothing outside this package | written |
| 1.6.0 | a rectangular clip, and the inset it makes possible | what a `Mark` may ask for | 4 | the flat demo's inset on its tangent point | nothing outside this package | written |
| 2.0.0 | the figure format | every builder's shape, and the door | 28 | all four demos read from files, and the nine sheets | MathJax, which is already a dependency | written, in [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) |
| 2.1.0 | the curves and surfaces a figure can name: parametric, polar, implicit, and the solids | adds kinds | to plan | a phase portrait, which the flat demo's field cannot express | nothing outside this package | to plan |
| 2.2.0 | matrices and tables, and a matrix applied to a grid | adds kinds | to plan | a grid under a linear map, which nothing here can draw | nothing outside this package | to plan |
| 2.3.0 | the indications that run along a path, and text written on rather than faded in | adds kinds, and outlines for plain text | to plan | the flat demo's reading, written on | a source of glyph outlines for plain text | to plan |
| 2.4.0 | a group morphing into a group | adds a kind | to plan | the boolean demo's three panels, morphing into one another | nothing outside this package | to plan |
| 2.5.0 | the recorder: a figure out as a video file | nothing in the format, and a name at the door | to plan | every demo as a file on disk rather than a strip of frames | `mediabunny`, which the consumer already records with | to plan |
| 2.6.0 | the GPU painter | nothing in the format, and a name at the door | to plan | both demos through a third painter, mark for mark against the SVG painter | `@altpsyche/engine`, with its item 2 landed, declared as a peer | to plan |
| 2.7.0 | dashes and quadratics drawn on a GPU | nothing; `Stroke.dash` is already in the mark and no painter draws it | to plan | a dashed figure, and the strip that shows it moving | `@altpsyche/engine` | to plan |
| 2.8.0 | text on a GPU, and the recorder running without a page | nothing in the format | to plan | every demo recorded off a card | `@altpsyche/engine`, 2.3.0's outlines, and 2.5.0 | to plan |
| 3.0.0 | depth, so a figure in space keeps it | what a `Mark` may ask for, which breaks the format's own version | to plan | the solid demo, whose crossing curve is drawn in the right order rather than the tree's | `@altpsyche/engine`, and the fourth decision above | blocked on a decision |
| 3.1.0 | a clip that is a path rather than a rectangle | what a `Mark` may ask for | to plan | nothing yet, which is why it is last of the marks | `@altpsyche/engine`'s counting stencil, its item 2 | to plan |
| 4.0.0 | a figure a reader can act on | the shape of `Figure`, which gains input | to plan | nothing yet | nothing outside this package | to plan |

**The three rows past 2.8.0 are consequences rather than plans.** A major here exists only when
something breaks, so 3.0.0 is what the fourth decision creates if it is answered one way and nothing
at all if it is answered the other. 3.1.0 and 4.0.0 are written down so they are not rediscovered,
and neither has a picture waiting, which is what a version needs before it is worked.

**What hit testing already gives 4.0.0, so it is not built twice.** `containsPoint`, `windingAt` and
`nearestEdge` are at the door and a flat list of marks with stable ids is why hit testing is possible
at all. What is missing is an event reaching a figure, and that is the part that changes `Figure`.

**The recorder's encoder is chosen by precedent and it is `mediabunny`.** The consumer already
records with it: `lib/video/VideoRecorder.ts` there pulls `Output`, `Mp4OutputFormat`,
`WebMOutputFormat`, `BufferTarget` and `CanvasSource` out of a dynamic import, which is the same
shape this package loads MathJax with. So 2.5.0 moves that dependency here rather than picking a new
one, and the consumer drops it in the same release. **What would change the answer** is a recording
that has to run with no browser, since a canvas source needs one.

**2.3.0's outlines for plain text are the other dependency and are not chosen.** The typesetter
already hands back outlines for an equation, so the question is whether the same path serves a plain
label.

**The engine's roadmap carries the other half of this table**, as a record of which version above
needs what from it, so neither side rediscovers the dependency by reading the other's plan. It is a
record there rather than a queue, because that package throws out any argument amounting to a
consumer needing something and its stencil item stands on the WebGPU specification instead.

**Continuous integration is on none of these rows and is needed by four of them.** There is no
`.github/workflows` in this tree, and 2.6.0 through 3.1.0 each carry a claim about what a device
draws, which needs a browser gate and a card gate. `@altpsyche/engine` needed two workflows and
seventeen gate scripts to have those, and building the same here is unestimated.

**Two things on this plan are not versions and both have a deadline.** Composition and camera is
done-criteria on steps 3.8 and 7 of the format, because a version in front of those would write
camera moves as closures and then rewrite them. And whether a `Mark` may be a raster image is a
decision above, answered or refused before 2.0.0 freezes, since a new kind of `Mark` is a change to
the format's value types.

**What is cut is not here.** A version that is cut leaves this table, its entry is deleted, and the
Now section and `git log` are what keep it.

**Four things wait off the ladder, and each waits on something named.**

| off the ladder | what it waits on |
| --- | --- |
| quadratics and dashes | the GPU painter, since a demo drawing quadratics as SVG checks the arithmetic and only a painter says whether the output is the shape a shader wants |
| the GPU painter | the format, and the engine's stencil, which cannot count a winding number and is filed in that repository as its item 2 |
| a figure in space keeping its depth | the fourth decision above, which is whether a figure may be undrawable in SVG |
| text on a GPU with a recorder | the GPU painter, and 2.5.0 |

**The reading behind each of the four is below and in `git log`**, so none of them is rediscovered
from nothing when it returns.

**What queues work is the table above, the found list below, and whatever the consumer asks for.**

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

**Which demo each of the look versions is cut against.** 1.3.0 is the flat demo's tangent and the
solid demo's three runs of descent. 1.4.0 is the flat demo's shaded region and the solid demo's
plane. So each of them holds to Siva's rule that a feature reaches a flat picture and a solid one.
1.1.0 held to it too and reached all four, since every one of them writes text and none of them
named a font.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Every demo is committed and every one is in the README**, which the flat one is as of 0.4.0 and the
boolean one as of 0.9.0 and the rotation one as of 0.9.5. Each image is SVG written by `svgMarkup`,
which needs no browser, so `npm run demos` regenerates the eight of them and a gate compares the
regenerated bytes against the committed files. A picture in a README that nothing regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still. 2.5.0 is the version that ends that, and the strips stay either way, since a
README that plays a video on load is a README nobody can read.

## Now

**1.2.0 is cut, and a figure names how a change is paced.** Four steps closed it. The easing set is
six curves from four: `overshoot` is Robert Penner's back ease out, whose constant 1.70158 puts its
peak at 1 + 4c³/(27(c+1)²), which is 1.100004 of the change, 0.580103 of the way through; and
`thereAndBack` is a smoothstep over each half, which reaches one at the midpoint and is zero at one.
Neither can be deduced from a pair of flat flags, which is why the set is named as well as widened:
`CurveName` is the closed set, `curveNamed` reads a name and `nameOfCurve` writes one back, so the
format can carry a name where it cannot carry a closure. `Key.curve` is a `CurveName` and never a
`Curve`, since a key is already data a file can hold. The name on the earlier key of a pair wins,
because a curve says how a value leaves a key rather than how it arrives.

**The demos name a curve at seven of their twenty-three entries, from one.** Three reasons cover the
six that gained one. A row a `stagger` built is paced by its gap, so each fade is `easeOut` and the
flat demo's first x label reads 0.441 a tenth of a second in where a smoothstep reads 0.156. A thing
arriving at its own size passes it and settles back, so the flat demo's dot reaches 0.176001 units
across against the 0.16 it settles at. A gesture carrying its own out-and-back gets a clock that does
not ease, so the swell at the beat is at 1.500000 of the settled width a quarter of the way through
where an eased clock would read 1.2325, and each of the flash's ten rays reads 0.5 opacity there.

**No span moved, so the four durations are 10.25, 7.74, 11.8 and 6 seconds as they were and the eight
sheets are byte-identical.** No still and no strip frame falls inside a paced entry, so five gates
read the pacing at times inside those entries instead, which is what makes the change checked rather
than merely written.

**One finding landed on the way through, in its own commit.** `figure/animation.ts` held a private
out-and-back of its own, which `indicate`, `flash` and `circumscribe` each read, and it was the same
cubic pair the set had just gained as a name.

**The door went from 235 names to 240 and the suite from 652 tests to 668 over 41 files.** Every
done-criterion was verified line by line in the commit that cut it.

**1.1.0 is cut, and a figure's text says which of it matters.** Five steps closed it. `textScale`,
`TextScale`, `TextRole` and `TEXT_RATIO` name four sizes by role, largest first: a title says what
the picture is, a note is a remark beside the picture, a label is a tag on a mark, and a tick is a
number on an axis. The ratio is the square root of two, so two steps double, and each figure builds
its own scale because a size in figure units lands at a different size on the page in each of them.
The flat demo went from 1.06:1 largest text against smallest to 2.000:1 and the solid demo from
1.000:1 to 2.828:1 on the title it gained, while the four stills read 21.33, 20.00, 21.00 and 19.32
pixels against 21.33, 20.00, 20.80 and 19.32 before, and the four strips read 14.00 as they did, so
`tangent.svg` still draws the largest smallest glyph of the eight.

**Every text mark in the four demos names a face and a weight**, from none of them before.
`demos/typeface.ts` holds `system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` at weight
400, and each demo hands it to its root group, so a mark a builder made takes it too. It is a system
stack and not a webfont, because a sheet is read inside an `<img>` and an `<img>` loads no external
resource. Each text mark costs 67 bytes more and the eight sheets grew by 201, 804, 268, 1072, 737,
2948, 804 and 3216 bytes.

**A newline in a text node's own string starts another line.** `leading` is how far apart two
baselines sit and `LEADING` is the six fifths of the size a node naming none falls back to. No mark
carries a newline: a node of several lines flattens into one text mark per line, so neither painter
changed and neither did the shape of a `TextMark`. A one-line text keeps its own id and its own
anchor, and every sheet was byte-identical after it landed.

**The step that said the rotation demo's word crosses the shape was wrong, and the measurement is
what replaced it.** Over the whole turn at 481 times and both panels, no point of the word's box is
ever inside the shape and the nearest it comes to the edge's own line is 0.183 units. What overlaps
is the box round the shape, in all eight of the strip's frames, and a box round an L is mostly the
empty corner the word rides in. The gate landed anyway, because the size scale had already eaten part
of that clearance when the word went from 0.26 to 0.296 and nothing said so.

**The rotation demo's frame is what the new sizes cost.** It went from 9 units wide to 10.15 and its
centre from (0.67, -0.1) to (0.53, -0.08), which is the room its captions and its swinging word need.
A gate now reads every text mark's box against its figure's extent over the whole run of all four
figures, and the rotation demo's left caption failed it by 0.09 units before this version.

**The door went from 230 names to 235 and the suite from 637 tests over 40 files to 652 over 41.**
Every done-criterion was verified line by line in the commit that cut it.

**1.0.0 is cut, and the door is a promise.** Seventeen steps closed it: the comments holding a
measurement became assertions, the door was read name by name against three questions and ten names
were renamed and two removed, the option bags took one shape, the demos took one palette, the strips
took one shape, the sheets were chosen to be looked at, and the four prose surfaces were written in
one register. The door is 230 names, the suite is 637 tests over 40 files, and the prose is a 175
line README, a 544 line guide, a 805 line reference and a 387 line DESIGN.md. Every done-criterion
was verified line by line in the commit that cut it.

**What 1.0.0 promises is `index.ts`.** A name at the door does not change under a consumer without a
major version, which is the whole of what the number means here. Everything below the door stays
free to move.

**0.14.0 is cut, and a sheet paints the ground it was measured against.** `SvgColour` is the door's
name for a colour per ground, and `SvgMarkupOptions.ground` is what a sheet paints behind its own
marks. Inside an `<img>` the colour scheme query answers for the browser rather than for the page
around it, so npm's white page was shown the dark half: the six reading colours fell from 15.87:1
through 6.75:1 to 1.19:1 through 2.80:1, and the typeset equation at 1.19:1 was the one a reader
could not see. A ground is written as a `background` declaration on `:root` in each half of the style
element rather than as a mark, so the bare-fraction readings of 0.13.0 are untouched. All eight
sheets grew by 38 bytes. The door went from 229 names to 230 and the suite from 631 tests to 637.

**0.14.0 shipped inside the 1.0.0 release, which went to npm.** It was held back rather than
published on its own, which was Siva's call, and the condition that would have changed the answer
never arrived: 1.0.0 did not slip. So the ground fix is in a reader's hands and the sheets npm
carries are the readable ones.

**0.13.0 is cut, and the eight sheets read on a dark page and are worth looking at.** Every colour is
painted as `var(--name, light)` and `svgMarkup` writes the theme as a `<style>` element, so a sheet
follows the reader's colour scheme through an `<img>` with no page CSS reaching it. A value per
ground is forced rather than chosen: to clear 4.5:1 the luminance a colour needs is 0.183333 or less
on white and 0.199675 or more on `#0d1117`, a gap no single value fits. The six reading colours read
17.22:1 through 4.83:1 on white and 15.87:1 through 6.75:1 on the dark ground, and the twelve washes
stay between 1.2:1 and 4.5:1 on both. The door went from 227 names to 229.

**A still is written into a frame its own extent shapes**, at a hundred pixels to the figure unit.
Coverage read on the box round the marks is a number an empty frame passes, since a word in each far
corner stretches the box over the whole frame, and the share of cells no mark's ink reaches replaces
it. The eight sheets went from 21.2%, 17.1%, 67.4%, 56.5%, 81.8%, 76.3%, 59.5% and 50.4% bare to
21.2%, 17.1%, 60.1%, 56.5%, 71.5%, 72.3%, 46.1% and 43.2%. The suite went from 618 tests to 631 and
the four stills draw text at 17.33, 20.0, 20.8 and 19.32 pixels on the page.

**Both of the criteria that needed a call are answered and Siva made both.** The still the README
opens on draws the largest smallest glyph now: `tangent.svg` went from 17.33 pixels to 21.33 against
20.0, 20.8 and 19.32, holding 21.2% bare, so it leads both readings and the gate asserts the lead.
The strip criterion names the slot rather than the fill, since a frame holding two panels needs a gap
between frames wider than the gap inside one.

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

Each is a version above. What follows is what each one covers. The four of the 1.x band carry a step
list and the eight of the 2.x band do not, because writing one is a session of its own and the band
is behind 2.0.0.

### 1.3.0 The variable-width stroke

**A stroke is one number and neither painter can taper it.** `Stroke.width` is a number in figure
units, `paint/svg.ts` writes it once as `stroke-width` and `paint/canvas.ts` sets it once as
`lineWidth`. This is what Manim gets from its own renderer and what neither painter here offers.

**So a variable width is geometry rather than a painter's setting.** The stroke becomes the outline
of the path, filled, computed in this package. That keeps `figure/mark.ts`'s rule intact, since what
reaches a painter is a filled path both of them already draw, and it is the same answer Manim's
renderer arrives at from the other direction.

**One interaction has to be got right or the feature breaks `draw`.** `draw` trims a path with
`trimPath`, so drawing a tapered line on has to trim the centreline and outline what is left, rather
than trim the outline and open it.

- [x] **1. The outline of a stroked path.** A path and a width to the filled outline, with caps and
  joins. **Measures:** a straight segment's outline against the rectangle it must be, to 1e-12; a
  circle of radius r stroked at w giving an area within tolerance of `π((r + w/2)² − (r − w/2)²)`;
  the outline of the flat demo's parabola against its stroked mark, by area, within a share the
  commit quotes.

  **Landed.** `outlinePath` takes a path and a width and gives the filled outline, with the SVG
  specification's caps, joins and miter limit and its defaults: a butt cap, a miter join, and a
  limit of four. A straight segment of length 2 stroked at 0.4 is the rectangle exactly, its four
  corners agreeing to 1e-12 and its area 0.8 to the same. A circle of radius 1 stroked at 0.1 covers
  0.6283471 against the ring's 0.6283185, a share of 4.549e-5. The flat demo's parabola stroked at
  the 0.05 it is drawn at covers 0.44047672 against the 0.44048238 its length times its width comes
  to, a share of 1.286e-5. A 2 by 2 square stroked at 0.1 covers 0.8 under a miter join and 0.795
  under a bevel, both to 1e-12, and 0.79765367 under a round join against the 0.79785398 four
  quarter discs leave, a share of 2.5e-4. A round cap adds a half disc at each end, 0.92485781
  against 0.92566371, a share of 8.7e-4. The three shares that are not exact are the flattening the
  outline is built on: the offset of a cubic is not a cubic, so the outline walks a polyline, and its
  tolerance defaults to a thousandth of a figure unit, which is a tenth of a pixel at the hundred
  pixels to the unit the demos draw at. The door went from 240 names to 242 and the suite from 668
  tests to 682 over 42 files. Nothing in the demos changed and the eight sheets are byte-identical.

- [ ] **2. A width that varies along the length.** The width is a number or a named taper with
  parameters. **Measures:** a taper from w to nothing over a straight segment giving a triangle's
  area to 1e-12; the width read at eleven places along the flat demo's tangent.

- [ ] **3. `draw` over an outlined stroke.** The centreline is trimmed and re-outlined, so a tapered
  line draws on from one end. **Measures:** the outlined mark at eleven fractions of `draw` against
  the outline of the trimmed centreline, within tolerance.

- [ ] **4. The demos taper.** The flat demo's tangent and the solid demo's three runs of descent.
  **Measures:** the mark count and the bytes of each affected sheet, re-committed with both numbers
  quoted; the marks at the named times.

- [ ] **5. Cut 1.3.0.** **Measures:** the three gates; the eight sheets identical after
  `npm run demos`; the door and the suite from 240 names and 668 tests.

#### Done-criteria

- A stroke's width is a number or a named taper, and a taper draws as a filled outline.
- The outline of a uniform stroke matches the stroked mark by area within the share the plan quotes,
  and a straight segment's outline is exact to 1e-12.
- `draw` over a tapered line trims the centreline, and the eleven fractions agree within tolerance.
- The flat demo's tangent and the solid demo's descent runs taper, and both sheets are re-committed.
- The three gates pass and the lock file agrees with the manifest.

### 1.4.0 Gradients

**Refused until now, and the reason was corrected at 1.0.0.** Both painters draw a gradient. What
refused it is that `Colour` is a string and a gradient is not, so it wants a shape of value the marks
do not have, an id unique across every figure on a page, and a rule for how it is measured. The SVG
painter also has no `<defs>` element at all today.

**The pictures waiting for it.** The flat demo's shaded region under the parabola sits at one flat
wash and should fade as it falls away from the curve. The solid demo's plane is one flat `FROST` fill
and should fade toward its far edge, which is what makes a pane read as glass.

- [ ] **1. A fill that is a gradient.** `Fill.colour` stays a string and a gradient is a second shape
  of fill: stops, each a colour and an offset, along an axis given in the mark's own units.
  **Measures:** the stops read back off a mark in the order they were given; the door from wherever
  1.3.0 left it.

- [ ] **2. The SVG painter's `<defs>`, and an id nothing collides with.** A gradient's id is built
  from the mark's own id, which is already stable frame to frame and unique inside a figure, and the
  document's own prefix makes it unique across a page. **Measures:** two figures in one document each
  with a gradient, drawn with no repeated id; the bytes a sheet grows by.

- [ ] **3. The canvas painter's gradient.** `createLinearGradient` with the same stops in the same
  order, held by the recorded calls on a `CanvasLike` rather than by a pixel, since a claim about
  what a device draws needs a device. **Measures:** the recorded stops against the mark's, colour for
  colour and offset for offset.

- [ ] **4. The demos use one.** The flat demo's region and the solid demo's plane. **Measures:** both
  sheets re-committed with their bytes quoted; every reading over the gradient still between 1.2:1
  and 4.5:1 against both grounds, which is the wash band 0.13.0 holds.

- [ ] **5. Cut 1.4.0.** **Measures:** the three gates; the eight sheets identical after
  `npm run demos`; the door and the suite from wherever 1.3.0 left them.

#### Done-criteria

- A fill is a colour or a gradient, and a gradient is stops along an axis in the mark's own units.
- Two figures with a gradient in one document draw with no repeated id.
- Both painters are given the same mark and produce the same stops in the same order.
- The flat demo's region and the solid demo's plane are gradients, both sheets are re-committed, and
  every reading over them stays inside the wash band on both grounds.
- The three gates pass and the lock file agrees with the manifest.

### 1.5.0 The view as a timeline entry

**A camera move cannot be sequenced with anything.** `viewAt` reads `figure.extent` straight off the
figure and the timeline never touches the view, so a view that moves is a function of the clock
sitting outside the order everything else is written in. The flat demo's view follows its dot and
holds it within 1.2 figure units of the middle, and there is no way to say that the move starts after
the entrance finishes, overlaps it by half a second, or holds while a brace arrives. Manim animates
`camera.frame` as an object among the others, which is why every chapter it draws can move the camera
against the action.

**What this changes is the shape of `Figure`**, which is why it goes in front of the format rather
than after it.

- [ ] **1. A view animation, and the timeline carrying it.** An entry that changes the extent over
  its span, played and staggered like any other. The extent a figure declares stays what the view is
  before the first entry and after the last. **Measures:** `viewAt` answering the same matrix at
  every named time as it does today for a figure with no view entry; a view entry with a negative
  `after` overlapping the entrance and the matrix at eleven times through the overlap.

- [ ] **2. The named view moves.** A move to a fixed extent, a follow with a margin, a framing of
  named marks, and a hold. These are the same forms step 7 of the format needs, written here first so
  that step names them rather than inventing them. **Measures:** each form's matrix at eleven times
  against its closed form; the flat demo's dot held within 1.2 figure units of the middle, which is
  the number that view already quotes.

- [ ] **3. Both demos move their view against the action.** The flat demo's follow becomes an entry
  after its entrance, and the solid demo's orbit gains a held beat at the face of the saddle.
  **Measures:** both demos' marks and view matrices at their named times, re-committed with the
  seconds each hold lasts quoted; the flat demo's duration unchanged within a tenth of a second.

- [ ] **4. Cut 1.5.0.** **Measures:** the three gates; the eight sheets identical after
  `npm run demos`; the door and the suite from wherever 1.4.0 left them.

#### Done-criteria

- A view move is an entry in the timeline, sequenced with `after` and `stagger` like any animation.
- A figure with no view entry gets the same matrix at every time it gets today.
- The four view forms are named, and each one's matrix agrees with its closed form at eleven times.
- Both demos move their view as a timeline entry, and the flat demo's dot stays within 1.2 figure
  units of the middle.
- The three gates pass and the lock file agrees with the manifest.

### 1.6.0 The rectangular clip

**`figure/mark.ts` refuses clipping and the reason it gives is the cost rather than the capability.**
Both painters clip, `clipPath` and `clip()`, and the header's rule is that adding one means adding it
to both in the same change. What a clip makes possible is the inset: a second view of the same figure
in a corner of the frame, magnifying what the eye should be on, which is `ZoomedScene` in Manim.

**The clip is a rectangle and nothing else.** An arbitrary path clip is a scissor test no GPU
refuses only while the shape is a box; a path needs a stencil, and `@altpsyche/engine` cannot count a
winding number, which is filed there as its item 2. So a rectangle is drawable by all three painters
and a path is drawable by two, and the rule in `mark.ts` is what keeps the difference from reaching a
figure.

- [ ] **1. A clip on a mark, and both painters honouring it.** A rectangle in the figure's own units.
  A mark wholly outside its clip contributes nothing rather than being drawn invisibly, which is the
  rule `flatten` already holds for a mark with no fill and no stroke. **Measures:** a mark half
  outside its clip drawing the same geometry with the clip written once in each painter; the recorded
  calls on a `CanvasLike` against the SVG attributes, element for element.

- [ ] **2. The inset.** A second view of the same figure, at its own extent, drawn into a rectangle
  of the frame. **Measures:** the inset's marks against the same figure's marks read through the
  inset's extent, mark for mark within tolerance.

- [ ] **3. The flat demo carries one.** An inset magnifying the tangent point while the dot walks.
  **Measures:** the sheet's bytes and mark count re-committed; every reading in the inset against the
  ground still between 4.5:1 and the top of the reading band, which is what 0.13.0 holds the six
  reading colours to.

- [ ] **4. Cut 1.6.0.** **Measures:** the three gates; the eight sheets identical after
  `npm run demos`; the door and the suite from wherever 1.5.0 left them.

#### Done-criteria

- A mark may carry a rectangular clip and both painters write it, and no other shape of clip exists.
- A mark wholly outside its clip is left out of the list rather than drawn.
- An inset draws the same marks as the figure read through the inset's own extent.
- The flat demo carries an inset, its sheet is re-committed, and every reading in it holds the
  contrast band.
- The three gates pass and the lock file agrees with the manifest.

### 2.0.0 The figure format

**[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) is the shape this is built to**, and it is one of three
documents of that name, one in each repository the change crosses.

**Three more decisions, Siva's, taken on 2026-09-08 after he said the name undersold the work.** It
is a format with a specification, and it evaluates a bounded expression form rather than being a
language: no loops, no recursion, no user-defined functions, no assignment, not Turing-complete.
Those four are standing refusals in the specification's first section, because a name cannot hold a
boundary and a rule can. Calling it a language was tried and dropped, since Lottie and glTF are both
called formats and both have implementers on several platforms. The specification's version is its
own, so a figure declares which version of the format it is written in and a renderer declares which
it reads, and neither number is this package's.

**Two planning sessions ran and neither touched code.** What they produced is the format written
down, the six questions below answered, and a step list of twenty-eight commits Siva reads before
anything lands.

A figure format is a description of a picture over time that a program reads rather than runs. It
carries nodes, tracks and animations, each a named thing with parameters, and no function anywhere.
Two things follow: a figure can be written by something other than a person typing TypeScript, and a
figure can be drawn by something other than this package.

**Why it comes before the renderer.** Four renderer versions were queued and every one would have
been written against an API the format reshapes. The format is also the only part that cannot be
retrofitted: an authoring API can be added over a format, and a format cannot be extracted from
closures without redesigning every builder.

#### What the planning session has to answer

- **The scene shapes, named and parameterised.** Every builder this package publishes becomes a node
  of the format or is refused a place in it. The count is the size of the work and nobody has counted
  it yet. `plot`, `axes`, `tangentAt`, `areaUnder`, `brace`, `vectorField`, `surface3` and the rest.
- **How a track value binds to a parameter.** The flat demo drives a fraction of a curve's length and
  recovers the graph x from the point it lands on. That is computation, and the format admits none,
  so either a node takes a length fraction directly or the demo is expressed differently. **This one
  case decides whether the format is workable**, so it is answered first and on paper.
- **Where text's geometry is settled.** A label's place depends on font metrics, which differ between
  platforms, so two renderers disagree unless the format pins metrics or a figure carries text
  already resolved. This is the failure Lottie never fully closed.
- **What conformance means and what checks it.** Two renderers agree if they draw the same marks at
  the same times, compared by tolerance, which is a gate this repository already runs. That oracle
  covers a flat figure and covers nothing a depth buffer does, so the second half needs an answer of
  its own.
- **What the version promise covers.** Which parts are frozen, what a renderer may leave unimplemented
  and how it says so, and what a major would be for.
- **Whether the authoring API changes at all.** The builders that exist can stay as the way a figure
  is written, producing the format rather than closures, in which case a consumer sees little change.
  That is the goal and it needs checking rather than assuming.

#### That was done, and the six questions are answered

**`demos/tangent.ts` was written out as data by hand on 2026-09-08**, before anything was designed,
and it answered the questions above. "A function" turned out to be three problems wearing one word,
and only the smallest needs the format to grow anything: geometry-making functions do not survive
serialisation and do not need to, geometry-reading functions should take geometry instead, and what
is left is a handful of operations over a track value. The three hard problems, the inventory, and a
step list with its done-criteria are all in [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md).

**The vocabulary is twenty-one node kinds, two item producers, eleven path producers, two point
producers and fifteen animation kinds**, read from the door by return type, and **sixteen names at
the door carry a function** in eleven shapes. Everything else is already a record of values wearing a
function call's clothing.

**The measurement runs through every step and it is what makes this checkable: a figure as data draws
mark for mark what the TypeScript figure draws, compared by tolerance.** The demos are already the
conformance suite.

**The size was written down honestly on a second pass**, after Siva said the document was underselling
it. Sixty-one things rather than thirty-nine once the timeline structure and the nine value types are
counted, two of the steps larger than a commit and needing to be split, four prose and demo surfaces
to rewrite that were never counted, and at least twenty-eight commits rather than six. **It is almost
certainly 2.0.0 rather than a minor, since `plot` returns a `Path` today and would return a record**,
and that is Siva's call.

**Three more decisions, Siva's, on 2026-09-08.**

**This is 2.0.0 and it is a clean break.** `areaUnder`, `plot`, `riemannBars`, `slopeOf` and
`tangentAt` are all at the door and all change shape, so every step of the plan touches a door frozen
five commits ago. Old calls stop working rather than standing beside new ones, since two APIs is two
resolvers, two sets of tests and a reference twice the size, carried until a major removes them
anyway. 1.0.0 has one consumer and it is this tree's own author.

**The specification lives here, as [`SPECIFICATION.md`](SPECIFICATION.md).** A fourth repository was
made and folded back on the same day. glTF and Lottie split their specifications because several
implementers with different owners read them, and there is one implementation and one author here, so
a fourth repository would have been a fourth roadmap and a fourth set of gates against a document
sitting nearly empty for months. **The discipline the split would have bought is a rule instead: the
specification changes before the code does.** It moves out when a second implementation exists, or
when a tool wants the types and a validator without the whole library, which is also when
`@altpsyche/figure-format` becomes a package. Nothing needs that today.

**Steps 3 and 4 are split and the plan is complete.** Step 3 is ten commits and step 4 is five, each
naming the demo whose marks measure it, and the plan is twenty-eight commits rather than the twelve to
sixteen it claimed.

**Splitting them corrected the inventory in four places**, because the tables had been read from the
names at the door rather than from each builder's return type. `riemannBars` returns a node and was
counted as a path producer. `vectorField3` is a node kind that was missed, and `surfaceCells` and
`fieldArrows3` return `SpaceItem[]`, which is a third thing a figure is made of. Six path producers
in `figure/path.ts` and the two point producers were never counted. And sixteen names at the door
carry a function in eleven shapes rather than nine in three: a `Camera3` carries `project`, a
`Projection` carries `place`, and `lengthOf`, `colourFor` and `shade` are function-valued options.

**Two of those findings shrink the work and one grows it.** The five option functions the two demos
pass are four named forms between them, a constant, a threshold, a saturating length and a ramp
through a band, so they need no expression at all. Eleven names at the door are drawn by no demo, so
each gets a test against its own call rather than a picture. What grows is the camera: the solid
demo's eye sits at `4.6·cos(2πt)`, `4.6·sin(2πt)`, `2.6`, which is the second place a demo asks the
expression form for arithmetic, so the camera has a step of its own.

**Nothing is signed off.** Siva reads the plan before a line is written.

### The 2.x band, which is what Manim has and this does not

**Every one of these five adds a kind rather than changing a value type**, so each is a format minor
an old figure survives, and each waits behind 2.0.0 for that reason. **None of them has a step list
yet**, and writing one is a session of its own, which is the rule this file holds every item to.

**2.1.0 The curves and surfaces a figure can name.** `plot` takes `(x: number) => number` and nothing
else, so nothing that is not a function of x can be drawn on a graph: no circle on axes, no Lissajous
figure, no phase portrait, no implicit curve. `surface3` already draws any parametrisation, so a
sphere, a cube, a cylinder and a torus are builders over what exists rather than new machinery. **The
picture waiting** is a phase portrait, which is the flat demo's field with a closed orbit through it
that its slope field cannot express.

**2.2.0 Matrices and tables, and a matrix applied to a grid.** A static matrix is already drawable,
since `equationFromTex` goes through MathJax and `matchGlyphs` gives glyph-level access to what comes
back. What is missing is a matrix whose entries are separately targetable, a table with rules, and
the animation that carries the picture: a matrix applied to a number plane, deforming the grid.
`mat3`, `numberPlane` and `transformPath` are all at the door already. **One thing has to be written
into the step list:** interpolating a matrix entry by entry passes through a degenerate matrix near a
quarter turn, so a rotation interpolates its angle and a general matrix interpolates entry by entry,
which is what Manim does and what the picture expects. **The picture waiting** is the one this makes
possible at all, a grid under a linear map.

**2.3.0 The indications that run along a path, and text written on.** A light running along a path, a
wave, and a wiggle are each a moving window over `trimPath`, which exists and is what `draw` already
uses. Text is the other half: `draw` fades a text mark rather than drawing it, because a text mark is
a string a painter lays out, so a typeset equation draws on and a plain label cannot. Closing that
means outlines for plain text, the way MathJax already hands back outlines for an equation. **The
picture waiting** is the flat demo's reading written on rather than faded in.

**2.4.0 A group morphing into a group.** `morph` takes one target and one path. Matching many shapes
to many is `TransformMatchingShapes`, and the matching machinery is already here: `morphEquation`
matches glyphs and `alignPaths` matches subpaths. **The picture waiting** is the boolean demo's three
panels morphing into one another, which no animation there can express today.

**2.5.0 The recorder.** `framesOf` hands back a frame at a time and there is no encoder anywhere in
this tree, so what a consumer gets is frames and what the goal at the top of this file asks for is an
animation. This is the largest single distance between this package and Manim, which writes an MP4
from a command. The third decision above already says the recorder lives here behind a dynamic
import. **It goes after 2.0.0 rather than before** because a recorder reads a figure, and after the
format a recorder reads a file, which is also what lets one run without a page around it.

## Found while working, not yet queued

- **All four of the things that look worse than 3Blue1Brown are queued now**, which is Siva's call of
  2026-09-08 and the reason the ladder above is no longer empty. Motion and pacing was 1.2.0 and is
  cut, typography and labels was 1.1.0 and is cut, composition and camera is done-criteria on the format's
  steps 3.8 and 7, and line quality is 1.3.0 and 1.4.0 between them. **The reading that put them there is that
  three of the four are builder and demo work over the SVG painter that already draws**, and only the
  sharpness of a line is the renderer's.

- **A renderer step would freeze an API before anything validated it**, which is part of why the
  ladder was frozen. A demo drawing quadratics as SVG checks the arithmetic and not whether the output
  is the shape a shader wants, and only the painter says. The engine's stencil gap below was found by
  reading its source rather than by building anything, and a throwaway spike of the painter would
  have found it in an hour.

  **The spike is a session of its own and it goes after 1.6.0**, which is a scheduling answer rather
  than a preference. An engine gap costs a release in that repository before this one can use it, and
  the fifty-five commits of 1.x and 2.0.0 are the only slack that lead time has: a gap found after
  2.5.0 is found with none. Earlier than 1.6.0 is no better, since 1.3.0, 1.4.0 and 1.6.0 each change
  what a `Mark` is and a spike paints marks, so a spike in front of them measures something that will
  not exist. **What it touches is nothing that ships**, and it does not add the engine to this
  manifest: it links that package in a scratch tree or as a development dependency that leaves with
  the spike.

  **The dependency is added in one commit and it is the first `await import('@altpsyche/engine')` in
  the GPU painter, at 2.6.0.** A manifest entry nothing loads is what the rule at the top of
  `CLAUDE.md` exists to prevent. What the dynamic import defers is the load and not the download, so
  from 2.6.0 a consumer who never draws on a GPU still fetches that package's bytes and never parses
  them, which is the trade one install is worth and is why the engine having no runtime dependencies
  of its own matters.

- **The engine cannot count a winding number, and a GPU fill needs one.** `StencilMode` there is a
  boolean mask: `mark` replaces every bit where it draws, `inside` keeps what compares equal, and
  both set the front and back faces to one state. A winding number is counted by front and back faces
  cancelling, which is the whole of how Loop and Blinn's fill decides an interior. **It is filed in
  that repository as its item 2**, argued on its own merits, and the painter waits on it whenever it
  returns.

- **A decision falls due at 2.6.0 and it is Siva's.** Pin an exact version of `@altpsyche/engine` and
  take the churn by hand, or wait for that package to reach 1.0.0 before the painter starts. A 2.0.0
  with a frozen door cannot promise stability through a dependency below 1.0.0, where a minor may
  break anything, which is the same argument that produced the clean break.

- **The consumer will hold two engines unless the declaration says otherwise, and the answer is a
  peer dependency.** That site depends on `@altpsyche/engine` directly in nineteen files and not one
  of them draws a figure: a shader playground, a shader background, a shader embed, a browser
  compiler for Slang, a video export and a thumbnail script. So it keeps that package after the
  painter lands here, and from 2.6.0 it depends on it twice, once directly and once through this
  one. Both name `^0.3.0` today and a caret on a `0.x` tracks the last number alone, so the ranges
  are identical now and split the moment either side moves a minor, at which point npm nests a
  second copy under this package rather than hoisting one.

  **What two copies cost, read from that package rather than assumed.** It holds three pieces of
  module-level state: a `Set` that dedupes deprecation warnings, and two `WeakMap`s in `trace/trace.ts`
  that track resource lifetimes. No module there holds a device or an adapter, so two copies do not
  make two devices and a page can still hand one `GPUDevice` to both. What it costs is the renderer
  twice in the browser bundle, a tracer blind to resources made through the other copy, which is the
  half of that package's own diagnostics claim this would weaken, and a deprecation warning printed
  twice.

  **Declaring it a peer is what turns that into an install error rather than a bundle.** One engine
  in the tree by construction, its version the consumer's to choose, and npm installs a missing peer
  by itself so one install is still the whole of it. A mismatch then stops the install with a
  sentence instead of shipping two renderers, which is the failure a package built to refuse a frame
  before a driver sees it should prefer. **What would change the answer** is that package reaching
  1.0.0 first, after which two caret ranges intersect across minors and npm dedupes with no help.

- **An engine sitting idle costs its baseline.** That repository's numbers expire rather than hold: a
  pair of them read 514 tests over 34 files until they were re-taken at 864 over 73. Months with no
  session there means the baseline any item is measured against is re-taken before the first item can
  be worked, and that is a session too.

- **A 1.0.0 package depends on a 0.3.0 one.** This package has promised its door does not change
  under a consumer, and `@altpsyche/engine` is below 1.0.0, where a minor may break anything. The
  promise cannot be honoured through a dependency that does not make it. Either the version is pinned
  exactly and the churn is taken by hand, or that package reaches 1.0.0 first. **Siva's call**, and it
  is answered: it is 2.0.0, a clean break, and the decision is above.

- **This repository has no continuous integration at all.** There is no `.github/workflows`, and the
  three gates are run by hand. The decision above says the GPU painter carries a browser gate and a
  card gate, and `@altpsyche/engine` needed two workflows and seventeen gate scripts to have those.
  Building that here is unestimated and is plausibly the size of the painter.

- **A card gate is a gate only one machine can run.** The engine's card gate is measured on an RTX
  5080, which is right for a renderer used in one place and is a maintenance problem for a package
  published to npm: a correctness claim nobody else can check goes stale without anyone learning
  that it has. What a published package can hold is the browser gate; what the card gate can hold is
  a reading that is dated rather than a gate.

- **The renderer may be the wrong thing to build for the goal.** Manim's value is a decade of
  builders, number lines through matrices and tables and arbitrary shape morphing, and this file
  already says that its videos are substantially the writing and the pacing. Four versions of
  renderer work buy pictures that are sharper and can hold a depth buffer. The same effort spent on
  builders over the SVG painter that exists moves closer to a reader being able to make the video.
  **Siva's call, and it is the one that decides whether the ladder above is the right ladder.**

- **A run of descent shows a short hook where it meets the region's edge.** The run seeded at
  `(-1.3, 0.3)` draws a bracket a few points long at its start on both solid sheets, which reads as a
  kink rather than as the run leaving the region. Found while cutting 0.13.0's step 10.


## Someday

**Nothing is here.** Gradients and the variable-width stroke were the two entries and both are on
the ladder now, as 1.4.0 and 1.3.0, because Siva asked for the look rather than for another feature.
The reasons they were refused are unchanged and are written into those two items as the work each has
to do: a gradient wants a shape of value the marks do not have and an id unique across a page, and a
variable width wants the stroke to become geometry, since neither painter can taper one.
