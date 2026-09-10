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

**The website waits, and it has waited longer than this file meant it to.** The plan was that this
package is worked to 1.0.0 first and the site is picked up after. 1.0.0 published and the site was
not picked up, so it reads `^0.6.0` against a published 1.6.0 and no feature of the 1.x band has been
drawn in a shipping page. Its move is unblocked and is under Now.

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

**A fifth decision was open with 2.0.0 as its deadline, and Siva answered it on 2026-09-09: a `Mark`
may not be a raster image.** There is no image mark, so a figure carries no photograph and no diagram
somebody drew, where `ImageMobject` is how Manim carries one. **What decided it is how a figure would
carry the pixels rather than whether a painter could draw them**: `<image>`, `drawImage` and a
textured quad all draw a raster, while a figure is one file, so an image is a path out of that file,
which breaks the property, or bytes inlined, which puts a photograph inside an eight-kilobyte record.
Fit, sampling and colour space each want an answer too, and no demo and no chapter is waiting to draw
an image to give one. **What refusal costs is one bump of `FIGURE_FORMAT_VERSION` from 0 to 1**
whenever a picture wants an image, which is the number that exists so a kind can be added: an old file
reads under a new reader, and only a new file under an old reader fails. **What would change this
answer** is a chapter whose picture is a photograph.

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

**A sixth decision is answered and it sets what the end of the 2.x band is for.** Siva's, taken on
2026-09-10 after a reading of what this package, the engine and the website each hold twice.

**Nothing is published until the 2.x band closes, and the release moves the consumer with it.** 2.1.0
through 2.5.1 are cut and unpublished, and they stay that way. The band ends with one release: this
package published, the engine published to whatever version this one installs, and `altpsyche.dev`
moved onto both in the same sitting. **Why the release waits** is that the dependency architecture is
part of what is being released, and publishing a version whose dependencies are about to be rearranged
spends a version number on a shape that is not the shape.

**The closing release carries the number the door has earned, and that is Siva's at release time.**
The band has already taken a name off the door: the flat transform type published at 2.0.0 as `Mat3`
is `Transform2D` now. Nothing imports it, since what a caller reaches for is the `mat3` family and
that name did not move, but a name that left the door is a break whatever imports it. The versions
inside the band are bookkeeping while nothing is published, and the ladder's own 3.0.0 is a major of
the format rather than of the door, so the two are different axes and the release decides which
number the break takes.

**The band ends with this package importing the engine rather than copying it.** The third decision
above already says `@altpsyche/engine` is a dependency and the GPU painter loads it with
`await import()`. What that decision did not say is where the value types live, and today they live in
both packages: six `vec3` functions identical character for character, nine `mat4` functions
overlapping, and until 2.5.1 two projections writing depth into different ranges. The found list below
carries the reading. **So the duplication is closed inside the 2.x band rather than gated inside it.**

**Three shapes close it and the third is refused.** The first is a second entry point in the engine
for its own maths, a module with no device code, which this package imports for `Vec3`, `Mat4` and
`Mat3` and then deletes its copies of. Its cost is the engine's rule that no export moves out from
behind its one door.

**A second entry point rather than the main door, and the sizes are why.** Walking static imports
from the engine's `index.ts` and its `host/surface.ts`, which are the two eager roots its own import
graph gate uses, reaches 27 source files whose built JavaScript is 207,090 bytes, and the arithmetic
is 7,520 of that. So a static import through the main door pulls 202k into every consumer of this
package including one that only ever draws SVG, to reach 7.3k of vectors and matrices. **The 600k this
session first wrote was wrong**: it came from the built directory's own total, which counts both
backends and every type declaration, where the walk counts what a static import actually reaches. The
value types are worth importing at 7.5k and are not worth importing at 202k, which is what makes this
a second entry point rather than a line off the door that already exists. **That entry point is filed
in the engine's own roadmap as its item 3**, argued there on that package's merits, and it changes a
standing refusal there rather than a line here. The
second is a third package both import, which costs the engine's zero runtime dependencies, a third
release to keep in step, and a third version in the consumer's tree. The third is the engine importing
this package's values, which is a cycle and is refused by that package's own standing refusal.
**The first is what this session recommends** and the call is Siva's, because it changes a rule in the
engine rather than a line in this tree.

**The name collision is closed here rather than there, and the flat transform is now
`Transform2D`.** The engine's `Mat3` is a general three by three with a family of two functions,
`fromMat4` and `pack`, which is the standard name for the standard thing. The special-purpose type
was the one here, a transform of the plane written as nine numbers, so it took the name that says
what it is. An item filed in that tree would have amounted to this package needing it, which that
package's first rule throws out.

**What is imported is `Vec3` and `Mat4`, and the flat transform stays this package's own.**
`Transform2D` here is an affine transform of the plane with its translation in the third column, and
`Mat3` there is the upper-left three by three of a `Mat4`. Both are nine readonly numbers, so
importing one name for the two meanings would make the collision worse rather than closing it: one
type would then be accepted everywhere the other is wanted with no second door to blame.

**How the consumer holds one engine: a peer dependency, which is the engine's own reading and not
this one's.** This session first wrote a plain dependency, on the argument that a peer is a second
install where one install is the goal. That argument is wrong twice. A package manager installs a
peer dependency by itself, so a peer is still one install for anyone who asks for this package. And
the engine's roadmap already states the cost the plain dependency carries: the website depends on that
package directly in nineteen files, none of which draws a figure, so it would hold the engine twice,
once directly and once through this one, and both ranges read a caret on a `0.x`, which tracks the
last number alone and splits the moment either side moves a minor. Two copies put that renderer twice
in a page's bundle and leave its tracer blind to every resource made through the other copy, and being
able to describe, cost and refuse a frame is that package's distinguishing claim. **So the declaration
is a peer**, and it lands at whatever version first imports a name from there, which is now earlier
than the painter. **What still holds it** is a test in the consumer that the version it resolves and
the version this package resolves are the same. The consumer's own duplicates go in the same crossing: a recorder that this package will own, a
clock that reimplements what `duration` and `loop` mean, and three scalar helpers nothing calls.

**The engine is opened, worked, cut and published whenever its half is needed.** That package has its
own rules, its own gates and its own queue, and a finding written here is not queued there. So the
`Mat3` brand, the second entry point and anything else this band needs from it are raised in that tree
in its own terms, and this package installs the version that comes out.

## The eight gaps the GPU spike found, which are what it leaves behind

**The spike is done and it was not a version.** It ran on 2026-09-09, drew a figure's marks as filled
and stroked paths on a `blackwell` adapter, and closed in six commits whose bodies carry every number
it read. Its steps and its done-criteria are in `git log` and are not repeated here. **What queues
work is the eight gaps below**, each with the reading that found it.

**Four of the eight went to the engine's roadmap as one batch**, argued on that package's own merits,
which is the only argument it takes: gaps 1, 2, 3 and 7. **Gap 5 is documented behaviour there rather
than a defect**, and is recorded under the batch there so the next session does not file it. **Gap 6
was 2.4.0's half of the text problem and gap 8 is 2.0.0.** The counted stencil is that package's item 2
already and was re-measured rather than re-found.

**What the spike settles about 2.7.0.** 117 of the flat demo's 181 marks at its still time drew, as
2,915 triangles in one pass and one draw, and the picture is recognisably the demo: the grid, both
axes with their arrow tips, the vector field, the area, the curve, the tangent, the point and the
typeset equation. 53 were refused and 11 more have no area at all. **So the painter's shape is settled
and what stands in front of it is the gaps**, of which the counted winding is the one that decides how
much can be built before the engine moves.

**Gap 1: nothing at the door joins a selection to a renderer.** `selectBackend` opens by saying which
backend draws a frame is "answered inside the library rather than by the caller naming one", and
`createFrameRenderer` builds WebGL 2 for any caller that passes neither `backend` nor `device`. So a
WGSL frame handed to `createSurface` on this machine is refused with `WebGL 2 was handed a wgsl frame
to draw`, twice, while `selectBackend` on the same page answers `webgpu`. What the caller has to do
instead is gather the offering itself, call `selectBackend`, call `requestWebGPUDevice`, and pass the
backend and the device back in. A GPU painter here would write those four steps and every other
consumer would write them again.

**Gap 2: a canvas the engine drew cannot be read.** No readback is at the door: `readPixels` is a
backend method and neither backend is exported. The canvas cannot answer either, because the context
is configured `RENDER_ATTACHMENT | COPY_DST` with no `COPY_SRC`, so `drawImage` of the drawn canvas
into a 2D context gives (0, 0, 0, 0) at every one of 120,000 pixels while a screenshot of that same
canvas reads (240, 92, 51) inside the triangle. Every pixel the spike read came from a screenshot for
that reason. **Step 2 measures a drawn edge against 2.6 to 2.8 parts in ten thousand of the true radius**,
which is a measurement in pixels, so this gap is in front of the next step rather than beside it.

**Gap 3: `probe()` leaves its canvases on the page.** `onScreenCanvas` appends a 200 by 100 canvas at
`position: fixed; left: 0; top: 0` for each backend it trials and removes neither, so two of them
stand over the top-left corner of the document afterwards. The first triangle drawn after a probe had
its top-left 200 by 100 covered by the clear colour (0.1, 0.2, 0.3) those canvases hold, read as (25,
51, 76). A painter that probes a device before drawing a figure leaves that over the figure.

**Gap 4: a draw that names a vertex count binds no geometry, and nothing says so.** The two draw
forms are `{ vertices }` and `{ instances }`, and `issueDraws` reads the first through `drawsCorners`
and calls `draw` without ever reaching `setVertexBuffer`, whatever the pipeline's `geometry` names. A
pipeline declaring a vertex layout drawn with `{ vertices: count }` therefore draws nothing, and the
card is what says so: `Vertex buffer slot 0 required by [RenderPipeline (unlabeled)] was not set`,
followed by an invalid render bundle and an invalid command buffer every frame. `resolve` answered
`{ backend: 'webgpu' }` for that same frame, and `cost` costed it at 1 pass and 1 draw, so the two
pure readings a caller has before submitting both pass a description that cannot draw. The form that
draws a mark is `{ instances: 1 }`.

**Gap 5: a pass that draws the frame the reader sees keeps one sample of each pixel.** `PipelineSpec`
carries `samples?: 4` and its own comment says "a pipeline drawing the frame the reader sees never
carries one, because the frame's own target keeps a single sample". So every edge the spike drew is
hard. The axis measures it: 0.02 figure units in a window 5.6 units across at 800 pixels is
2.857 pixels wide, and it drew as exactly 2, covering 1,600 pixels where the outline's area of
0.184314 asks for 3,761. **A painter wanting a smooth edge cannot ask the frame for it** and has to
draw into a multisampled texture of its own and name it in `present`, which is two resources and a
copy rather than one pass. The SVG painter has the browser's own antialiasing and pays nothing for it.
**The same rule takes the blend with it**, and there the engine refuses by name rather than staying
quiet: `targets` is where a blend lives, and a pipeline naming one gets `the pass on pipeline 0 writes
1 colours and attaches none`. So the 65 marks of the flat demo's still that sit below full opacity all
drew opaque.

**Gap 6: a plain `TextMark` cannot be drawn on a card at all, and an equation can only be drawn with
a stencil.** The engine has textures and samplers, so a glyph atlas is expressible, and it has no text
vocabulary of its own, so a painter would build that atlas by rasterising with a 2D canvas and
sampling it. That is the shape this step refuses to build. What the reading says instead is where the
line falls today: 46 text marks across the two demos name a CSS font stack and carry no outline, and
an equation arrives from `typesetElement` as 8 filled paths that read as 333 curves. **So the GPU
painter's text is two problems and not one.** A label waits on a source of glyph outlines, which
2.4.0 refused for the animation it needed them for, and an equation waits on the
same counted winding an annulus waits on, since 4 of the 8 glyphs of
`a^2 + b^2 = e^0` carry a hole.

**Gap 7: the frame description names no scissor and no viewport.** `FrameGraph`, `PassSpec` and
`DrawSpec` carry neither, and the word scissor appears nowhere in that tree except in its own roadmap,
which assumes a rectangle clip is one. So a `Mark.clip`, which 1.6.0 made a rectangle precisely
because a box is the scissor test every device already has, cannot be asked for at all. **35 of the
flat demo's 181 marks at its still time carry a clip**, and the 23 of those that are paths were
refused.

**Gap 8, and this one is this package's rather than the engine's.** A mark's colour is a CSS colour
string. All 43 colours the painter read at the flat demo's still time are `var(--name, #rrggbb)`, and
a shader wants four numbers, so the painter took the hex out of the fallback and a custom property
without one would have to be resolved against the document. **This belongs to 2.0.0 rather than to a
batch for the engine**, since the format is where a colour's written form is decided and a figure
read by a renderer in another language cannot carry a CSS custom property. **It is answered and it is
step 12 of the format's plan**, Siva's call of 2026-09-09: a colour is four channels and may carry the
name of a custom property a page overrides, so a renderer reads the numbers and the sheets keep their
theming.

**The known stencil gap, re-measured rather than re-found.** `StencilMode` is `'mark' | 'inside'` and
its own comment says what each is: `mark` leaves the reference behind everywhere it draws, and
`inside` draws only where the reference is already there. Neither counts, and no increment or
decrement is in the type, so **a frame asking for a counted winding cannot be written down**. That is
why no refusal arrived for the annulus that measured it: a refusal names a capability a frame asked
for, and that frame had no way to ask. An outer circle of radius 1 with an inner one of radius 0.5
wound the other way drew as a solid disc of 349,144 pixels against the 261,799 the rule wants, 33.4
per cent too much area, and `resolve` answered `{ backend: 'webgpu' }` for it. The engine files this as its item 2 and this reading changes nothing about
it.

## The version ladder

**Every item gets its own minor version.** Siva's plan, and the release convention this repository
already follows makes each one a minor bump. 1.0.0 was the polish of the 0.x band and is published, and
the 1.x band's own polish is closed and recorded under Now. Neither took a version of its own. A version is cut when its
demos draw, not when its code compiles. A version that is cut leaves this table and its item goes
with it, because `git log` is what keeps a closed plan.

**The ladder holds the look, then the format, then what Manim has and this does not.** Siva's call
on 2026-09-08, which reversed the freeze in part. Four renderer versions came off it and stay off,
because every one would have been written against an API the format is going to reshape. Six versions
went on in front of the format, because each changes something the format freezes a written form for,
and freezing first costs a major of the format's own version to change it afterwards. Eight went on
behind, because each adds a kind or a painter, which is a format minor an old figure survives, and
three more are written past those because a session should not rediscover them. Three of those eight
are left, since 2.1.0 through 2.5.0 are cut.

| version | what lands | what it changes | steps | cut against | depends on | plan |
| --- | --- | --- | --- | --- | --- | --- |
| 2.6.0 | the recorder: a figure out as a video file | nothing in the format, and a name at the door | to plan | every demo as a file on disk rather than a strip of frames | `mediabunny`, which the consumer already records with | to plan |
| 2.7.0 | the GPU painter | nothing in the format, and a name at the door | to plan | both demos through a third painter, mark for mark against the SVG painter | `@altpsyche/engine`, with its item 2 landed, declared as a peer | to plan |
| 2.8.0 | dashes and quadratics drawn on a GPU | nothing; `Stroke.dash` is already in the mark and no painter draws it | to plan | a dashed figure, and the strip that shows it moving | `@altpsyche/engine` | to plan |
| 2.9.0 | text on a GPU, and the recorder running without a page | nothing in the format | to plan | every demo recorded off a card | `@altpsyche/engine`, a source of glyph outlines, 2.6.0, and a canvas with no page behind it if `mediabunny` takes nothing else | to plan |
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
shape this package loads MathJax with. So 2.6.0 moves that dependency here rather than picking a new
one, and the consumer drops it in the same release. **What would change the answer** is a recording
that has to run with no browser, since a canvas source needs one.

**Outlines for plain text were 2.4.0's other dependency and that version refused them.** The
typesetter hands back outlines for an equation in its own font, and a plain label is written in a
family the painter hands to the platform, so the two are different shapes. True outlines need font
bytes inside the figure, which is a value type this band of the ladder is in front of. A write
sweeps a rectangular clip across the label instead and takes how far it runs as a number. **What
still waits on outlines** is a plain label on a card, which is 2.9.0, and a column width measured
rather than given.

**The engine's roadmap carries the other half of this table**, as a record of which version above
needs what from it, so neither side rediscovers the dependency by reading the other's plan. It is a
record there rather than a queue, because that package throws out any argument amounting to a
consumer needing something and its stencil item stands on the WebGPU specification instead.

**Continuous integration is on none of these rows and is needed by four of them.** There is no
`.github/workflows` in this tree, and 2.6.0 through 3.1.0 each carry a claim about what a device
draws, which needs a browser gate and a card gate. `@altpsyche/engine` needed two workflows and
seventeen gate scripts to have those, and building the same here is unestimated.

**Two things on this plan are not versions and both have a deadline.** Composition and camera is
done-criteria on steps 3.9 and 7 of the format, because a version in front of those would write
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
| text on a GPU with a recorder | the GPU painter, and 2.6.0 |

**The reading behind each of the four is below and in `git log`**, so none of them is rediscovered
from nothing when it returns.

**What queues work is the table above, the spike's eight gaps in front of it, the found list below,
and whatever the consumer asks for.**

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

As of 0.10.0 the view follows the dot across, holding it within 2.14 figure units of the middle of the
frame where it used to cross 2.76: its reach is 1.2 and its room is 0.62, and the room binds at both
ends of the walk. As of 1.5.0 that follow is a timeline entry rather than a function of the clock. As of 0.11.0 the parabola sits on the field of its own tangents,
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

**2.4.0 held to the rule too.** The flat demo's reading is written on, its stationary rule is written
glyph by glyph and a light runs along its tangent through the beat, and the solid demo's rule and
title are written on with a light along both branches of its crossing.

**Which demo each of the look versions was cut against.** Siva's rule is that a feature reaches a
flat picture and a solid one. 1.6.0 held to it with the flat demo's inset on its tangent point, and
the solid demo carries none because that figure has four per cent of margin and no room for a panel.
1.5.0 held to it with the flat demo's follow and the solid demo's push in on its crossing, 1.4.0 with
the flat demo's shaded region and the solid demo's plane, and 1.3.0 with the flat demo's tangent and
the solid demo's three runs of descent. 1.1.0 held to it too and reached all four, since every one of
them writes text and none of them named a font.

**A version is not cut until its demos draw.** The measurement is the demo's own marks: a count at
named times, compared by tolerance, which is the gate DESIGN.md describes and which needs no browser.

**Every demo is committed and every one is in the README**, which the flat one is as of 0.4.0 and the
boolean one as of 0.9.0 and the rotation one as of 0.9.5. Each image is SVG written by `svgMarkup`,
which needs no browser, so `npm run demos` regenerates the eight of them and a gate compares the
regenerated bytes against the committed files. A picture in a README that nothing regenerates goes stale in silence. **A moving image in a README needs a GIF and this package has no
encoder**, so what the README carries beside the still is a strip of frames in one SVG, which shows
the motion in a still. 2.6.0 is the version that ends that, and the strips stay either way, since a
README that plays a video on load is a README nobody can read.

## Now

**2.5.0 is cut and unpublished, and its ten done-criteria are verified line by line in the cut's own
commit.** A figure may walk one group of marks into another. `matchMarks` pairs two groups by a key
read off each mark, `matchGlyphs` is the case where the key is a glyph's code point, and `morphGroup`
walks each paired mark in geometry and in style alike. `AnimationRecord` holds 21 members. The boolean
demo is the picture: the union panel walks onto the intersection panel and the intersection panel then
walks onto the difference panel, the second span starting where the first hands its picture over, and
the strip shows six frames over three rows.

**The pairing is by name and not by shape, and that was the call this version turned on.** Manim
builds its key from a submobject's own points because a submobject carries no name. Every mark here
carries an id built from the names down the tree, a key from points would be a hash of floating point
numbers, and over the picture waiting a shape key pairs the three panels' identical discs and leaves
their three answers unpaired. The reasoning is in [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md).

**2.4.0 is cut and unpublished, and its nine done-criteria are verified line by line in the cut's own
commit.** A figure may run a light along a path, wave a shape, wiggle it, and write words on rather
than fade them in. `pathWindow` is the piece of a path between two fractions of its own length and
`trimPath` is the case where the near end is nothing, which the light is a travelling one of.
`AnimationRecord` holds 20 members. The flat demo writes its reading on and its rule glyph by glyph
and runs a light along the tangent through the beat, and the solid demo writes its rule and its title
on and lights both branches of the crossing over the first quarter of the turn.

**Outlines for plain text are refused rather than queued, and that was the call this version turned
on.** The package holds no font, so a write sweeps a rectangular clip across a label and takes how
far it runs as a number the figure gives. A letter arrives whole from its left edge and the SVG
painter keeps writing the label as text. What still wants outlines is a plain label drawn on a card,
which is 2.9.0.

**2.3.0 is cut and unpublished, and its eight done-criteria are verified line by line in the cut's own
commit.** A figure may write a matrix whose every entry answers to a name, a table whose columns are
given rather than measured, and a linear map carried over the marks it names. `demos/matrix.ts` is the
picture: a number plane sheared under a map, the unit square filled so the determinant is an area, and
the map written beside it with its four numbers at the values the grid is at. The map and the four
counts are five spans over one interval with one curve, so the number written is the number the grid
is at, and the square encloses the determinant to within 1e-12 at every named time, 1 at the identity
and 2 at the whole map. `NodeRecord` holds 30 members and `AnimationRecord` 16.

**2.1.0 is cut and unpublished, and its eight done-criteria are verified line by line in the cut's
own commit.** A figure's marks may now be read against the frame they are drawn in. `frame` is the
twelfth expression kind, answering the `width`, `height`, `aspect` and `centre` of the extent the
figure declares resolved at the aspect being drawn, `marksAt` takes that aspect, and a scene is
handed the frame it draws in. The consumer's `one-pixel` is a record here placing its plate at -20.2,
-12.8668 and -8.2 at aspects 3, 1.7778 and 1, which are the numbers their module gives.

**2.0.0 is published, and `npm view @altpsyche/maths version` answers it.** The nine done-criteria are
verified line by line in the cut's own commit. What a consumer gets is the figure format: a figure is
a JSON document, [`SPECIFICATION.md`](SPECIFICATION.md) states the whole of it in 613 lines for a
renderer written in another language, and the five committed figure files are its fixtures.

**The consumer crossed on 2026-09-09 and the crossing is landed there**, in six commits on its
`maths-package` branch: the dependency and the colour form in one, then the two silent defects step
10.5a's reading had named, then the reading that stopped its format step, then its two maths documents
at twelve claims corrected. Its gates are green at 804 tests over 55 files with both figure routes
prerendering, the 26 type errors the reading predicted came out as 26 over 9 files with the edit
landing in eight of them, and the one number that moved on screen is the still group on
`/figures/circle-distance`, 18,619 bytes to 18,718: eleven fills each gaining the nine bytes of
`, #f9fafb` now that the painter writes the channels inside the `var()`.

**Both defects were real and neither was visible.** A figure's view was read once rather than at each
painted time, which their fixture zooming from 200 by 100 units to 40 by 20 shows as three distinct
recorded frames where there was one. And two figures on one page wrote the same `figure-2f-plate` id,
so the second figure's wash resolved to the first figure's element.

**What their session found is answered by 2.1.0.** A figure whose marks are placed against the frame
is a document now, and `one-pixel` is written as one in this tree. `circle-distance` is the half that
is theirs: its glyph scale moves with the aspect as well as its places, and the scale reaches the
typesetter rather than the kind.

**How much of this package that consumer reaches, which they read off the door on 2026-09-09: 50
runtime names of 180.** The door is 180 values and 195 types. Every name the format is made of is
among the unreached: `readFigure`, `writeFigure`, `checkFigure`, `resolveFigure` and `evaluate` are
called nowhere there, because no figure of theirs is a file. **So the crossing being complete and the
format being adopted are different questions**, and what stands between the two is a release of 2.1.0
and their two figures written as files against it. Of the colour readers the crossing reached
`colourFrom`, `colourOf` and `colourText`, leaving `hexOf` and `lerpColour`.

**1.6.0 is published, the GPU spike is done, and 2.0.0 was what ran next.** Siva's call of 2026-09-09
put the spike in front of the format work, on the argument that a gap found in the engine costs an
item, a commit and a release there before a painter here can use it, and that the slack for that lead
time was 2.0.0's twenty-nine commits. The spike spent one session and found eight gaps, so the
argument held.

**What the spike proved.** A figure's marks draw on a card through the engine's one door. 117 of the
flat demo's 181 marks at its still time drew as 2,915 triangles in one pass and one draw, and the
picture is recognisably the demo. A filled disc's edge reads +2.7340 parts in ten thousand of the true
radius at the bearing where the cubic's error peaks, inside the 2.6 to 2.8 the suite already holds
`circle` to. A stroke's drawn edge tracks the polygon `outlinePath` writes within half a pixel and
lands exactly on its vertices. **So the geometry this package computes is what a card draws**, which
is the question the spike existed to settle.

**What the spike found.** Eight gaps, in the section in front of the ladder with the reading that
found each. Four went to the engine's roadmap as one batch. One is documented behaviour there. **Two
are this package's own and are on the ladder already**: a plain `TextMark` cannot be drawn at all,
which waits on a source of glyph outlines, and a mark's colour is a CSS colour string rather than four numbers, which is 2.0.0.
**And one gap decides how much of 2.7.0 can be built at all**, which is the counted winding number: an
annulus, a letter with a counter and every glyph of an equation all want it, and it is the engine's
item 2.

**Two numbers this file carried are corrected by the spike.** The flat demo holds 181 marks at its
still time and not 146, and the still time is 7.86.

**2.0.0 is under way and its first three steps are landed.** Step 1 gave the three graph readers the
plotted path instead of the function behind it, so a parabola's slope reads exactly where a central
difference carried 1.06e-11. Step 2 published the expression form: `Expression`, `evaluate` and
the thirty-four names of `EXPRESSION_FUNCTIONS`, holding a complex square, a complex exponential and
a Möbius map. Step 3.1 published the node record and `resolveNode`, and the rotation demo built from
records draws its eight marks at each of the four times its strip draws. Step 3.2 gave a path its
written form: `PathRecord` is one of six named shapes, the path data of an SVG `d` attribute, or a
path written out as cubics, and the rotation demo's two panels are records top to bottom. Step 3.3
added `union`, `intersection` and `difference` as forms over two path records, and made every path
parameter an expression, so the boolean demo's twelve marks draw through records at each of its seven
named times with its walking disc read off a track. Step 3.4 added `plot`, `areaUnder`, `tangentAt`
and `bracePath` as forms, so the flat demo's parabola comes from the expression `x * x` and its
shaded region runs from nothing to the x its dot stands at. Step 3.5 added `dot`, `arrow`, `brace`
and `callout` as node records, each resolving through its own call, so the flat demo's walking dot and
its brace both draw from records. Step 3.6 added `numberLine`, `axes`, `numberPlane` and
`riemannBars`, so the flat demo's whole frame draws from records: 42 marks of grid and 27 of axes.
Step 3.7 added `equationNode`, and an `Equation` stays resolved geometry rather than TeX a renderer
typesets, so the flat demo's two rules draw glyph for glyph from records at 32,936 and 42,224 bytes
written out. Step 3.8 added `vectorField`, whose field is an expression of a place and whose arrow
length is an expression of a magnitude, with `ColourChoice` for the one thing the expression
vocabulary has no form for. Step 3.9 added `Camera3Record`, `ProjectionChoice` and the two resolvers,
so the solid demo's orbit is a cosine and a sine of one track and its camera places every point where
the built one does. The door is 309 names and the suite is 884 tests over 57 files.

Step 3.9b was the held beat the solid demo's orbit gains at the face of the saddle, and Siva answered
it on 2026-09-09: a quarter round, a second and a half, and the figure lengthens by the beat rather
than the turn going faster either side of it. The rate is the same either side and neither half eases,
so what a reader sees is the stop rather than a change of speed. The figure went from 11.8 seconds to
13.3 and its walk from 354 painted frames to 399, and all eight sheets stayed byte for byte, since the
still is drawn before the beat and the strip is drawn from fractions of the turn rather than from
times.

Step 3.10 added `polyline3`, `dot3`, `text3`, `arrow3`, `scene3` and `axes3`, so the solid demo's
axes, its three runs of descent and its crossing curve all draw from records at each of the four times
its strip draws. The door is 316 names and the suite is 894 tests over 58 files. Step 3.11 added
`surface3`, `surfaceCells`, `fieldArrows3` and `vectorField3`, with `sectionOf` and `streamlineOf` as
the point producers they are, so steps 1 through 7.5 are landed. The door is 373 names and the suite
is 1,017 tests over 65 files.

Step 12 made a colour four channels and an optional name, so no mark carries a CSS custom property
and the SVG painter writes the `var()` from the channels it holds. All eight sheets are byte for byte
what they were, demos/rotate.figure.json went from 6,624 bytes to 8,244 with no `var(` left in it,
and the flat demo's 185 colour slots at its still time each carry four channels and a name over 9
distinct colours. The door is 375 names and the suite is 1,024 tests over 65 files.

**Step 8 is planned and is three commits, one per demo**, in the order boolean, flat, solid. Nothing
in it needs a new form: every difficulty the three carry was closed by a step already ticked, so a
commit that cannot express something has found a gap in the vocabulary rather than a hard demo.
Step 8.1 made the boolean demo a record: `demos/boolean.figure.json` is 13,914 bytes over 519 lines,
its two sheets are byte for byte what they were, and the committed file read back draws twelve marks
at each of the demo's seven named times. The record had been written in three places rather than the
one the plan found, and collapsing them took 211 lines out of the tests.

Step 8.2 made the flat demo a record, and it found the two gaps the plan said a commit would stop on.
A text record's place was a `Vec2` where an equation's is an expression, so the two rules could hang
off the frame the view has moved to and the reading standing between them could not. The validator's
shape for a follow held `within` and `room` and not `axis`, so a figure that follows across and not up
and down was refused by the reader. Each is a commit of its own in front of the transcription.
`demos/tangent.figure.json` is 394,881 bytes over 10,637 lines, eleven children and thirty spans, and
read back it draws 181 marks at the still time of 7.86 and 186, 185, 185, 182, 178, 178 and 178 at the
seven named times. All eight sheets are byte for byte what they were.

Step 8.3 made the solid demo a record, and it found a third gap: the validator's table named the
frame height of a perspective camera as a field of a parallel one, so this demo's camera was refused
for naming its own. `demos/surface.figure.json` is 263,847 bytes over 7,110 lines, and read back it
draws 321 marks at the still time of 5.24 and 316, 317, 316 and 316 at its four named times. The
record had been written in two test files rather than in the demo, and the calls those files measure
it against are now `tests/solid-forms.ts`. **Step 8 is cut**: all four demos are files, all eight
sheets are byte for byte what they were, and the suite is 1,038 tests over 65 files. **Step 9 is planned and is four commits**: a gate that compiles the
guide's code blocks, the guide teaching a figure as data, the reference's prose against the record
kinds, and the README and the design read against the format. The two pages are less stale than their
line counts say and stale in the one place that matters, since `Record` appears nowhere in the guide.
Its 23 blocks are 171 lines importing 61 names, and assembled into one module they compile against the
tree with two errors, both of them one identifier declared twice. Step 9.1 landed that gate: the 23
blocks are assembled into one module with their imports merged and type-checked by a spawned
compiler, the duplicate `timeline` of the view section is now `viewed`, and the suite is 1,042 tests
over 66 files. Step 9.2 gave the guide the two sections it had none of, a record and a file, taking it from 713
lines to 816 and its examples from 23 blocks to 27. Step 9.3 read the 68 record interfaces against their entries and found one wrong, which is a text
record's place. Step 9.4 read the README and the design against the format: the design says nothing false and the
README carried three stale numbers, a suite of 785 tests now 1,042, 266 names at the door now 375,
and 202 marks at the flat demo's still time now 181. Its model gains a paragraph on a figure as data.
A fifth commit met the last of step 9's done-criteria, which asks the gate to name the block a broken
example is in rather than a line of the module it assembles: each line of the body carries the block
it came from and the line of the page, and the compiler's output is rewritten to name both. **Step 9
is cut** and its four criteria are verified line by line. Step 10 made the demos the conformance suite: every one of the eight sheets is drawn from the figure
its committed file describes rather than from the module that wrote it, the files are written before
the sheets in one run, and all eight stayed byte for byte. 2.0.0's nine done-criteria are verified line by line in
[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md), each with the number that satisfies it, and every one holds.
Two of them moved while the work ran and Siva's call of 2026-09-09 is that both read as the tree
reads: the vocabulary line says twenty-three node kinds rather than twenty-one, since step 3.11 made
`section3` and `streamline3` kinds of their own, and the line about functions asks what it always
meant, which is that no figure passes one. `plot`, `vectorField`, `surface3`, `streamlineOf` and
`sectionOf` take one at the door and always will, since a function making fixed geometry never had to
serialise.

**Step 11 is the cut and it is landed.** The version is 2.0.0 with `npm install --package-lock-only`
beside it, the README's migration section moves a caller from 1.6.0, the ladder's 2.0.0 row and its
item are deleted, [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) keeps its name and loses its plan, and
publishing is Siva's.

**Two calls inside the cut are answered.** Siva's, on 2026-09-09. A `Mark` may not be a raster image,
which closes the fifth decision above: no painter is what blocks one, since `<image>`, `drawImage` and
a textured quad all draw a raster, and what is unanswered is how a figure carries the pixels. A figure
is one file, so an image is a path out of that file, which breaks the property, or bytes inlined,
which puts a photograph inside an eight-kilobyte record, and fit, sampling and colour space each want
an answer no picture is waiting to give. Refusal costs one bump of `FIGURE_FORMAT_VERSION` from 0 to 1
whenever a picture wants one, which is the number that exists so a kind can be added. And
[`FIGURE-FORMAT.md`](FIGURE-FORMAT.md) keeps its name and loses its plan at the cut, since a document
of that name sits in each of the three repositories the change crosses.

**Step 10.6 was landed in five commits.** [`SPECIFICATION.md`](SPECIFICATION.md) said of
itself that three sections were written and the vocabulary was not, with its "What has to be
specified" pointing at the plan for the inventory, so dropping the plan first would have taken the
only written vocabulary with it. The document goes from 112 lines to 605: the eleven value types, the
expression form and the thirty-seven callable names, the thirteen forms of path with both point
producers, the twenty-three node kinds with both item producers, the fifteen animation kinds with the
timeline and the extent, and conformance against the four committed figure files as its fixtures. It
reaches the plan twice in one paragraph, as the reasoning rather than as the inventory.

**`tests/specification.test.ts` holds the document to the source, and writing it before the prose was
checked found three things.** An `Inset` carries `name` and `hides`, which neither the document nor
the plan's list of value types mentioned. The extent section had to say that a choice carries a `kind`
and a bare extent carries none. And the section keying had to read a whole heading rather than its
first word, since five headings begin with the same one. The suite goes from 1,046 tests over 66 files
to 1,065 over 67.

**The polish pass ran before the cut**, which is Siva's call of 2026-09-09 on the argument that 2.x
is a major release. The 1.x band was cut the same way: an audit read the whole band against the tree
and seven commits closed what it found. The reading of 2026-09-09 found seven things, ordered by the
damage each does if it ships, and all seven are closed.

| found | state |
| --- | --- |
| the consumer has drawn no 2.x figure and holds 0.6.0 | closed here, and the migration is a session in that tree after the release |
| the reference is held to the door by name and to the records by nothing | closed, and 66 record interfaces have every field held to its entry |
| the npm tarball is `dist`, `LICENSE` and `README.md` while the README shows four pictures out of `docs/` | closed, and the four are absolute URLs into the repository's raw content |
| `DESIGN.md` quoted 3.9 and 4.2 milliseconds a frame | closed, and it reads 5.13 and 5.14 measured on 2026-09-09 |
| `stripMarks` was written four times | closed, and `demos/strip.ts` holds `stripOf` |
| the thirty-seven expression functions were named nowhere a reader could look them up | closed, and the reference lists them with their arguments |
| `tests/figures.ts` described two demos as records when four are | closed |

**The polish pass is closed**, and its seven findings are recorded in the three paragraphs below and
in `git log`.

Step 10.5a drew the consumer's figures against this tree and found no defect. `npm pack` here is
162,542 bytes over 133 files, and installed there with the manifest untouched it left 26 type errors
over 9 files, all of them names this package moved: `at` is `marksAt`, `loops` is `isLoop` and
`pathData` is `pathToData`, all three shipped in 0.13.0, and a colour is four channels and a name
from step 12.
Migrating the nine files took the site's type-check to clean, its suite to 793 tests over 52 files and
`npm run build` to prerendering both figure pages, where `circle-distance` draws 11 marks and
`one-pixel` draws 4 over 1.6 seconds, and a figure read from a file there draws 8 marks at each of
four times. **The migration lands in the consumer after the release**, in one commit bumping the
dependency to `^2.0.0`, since source calling `marksAt` with 0.6.0 installed is a state no gate there
measures.

Step 10.5b holds the reference's record entries to the records themselves. 66 record interfaces across
`figure/` are read by walking each body to the brace that closes it, and every field declared at that
body's own depth is held to a backticked name in that record's entry. One entry named a field in words
and it is `TimelineRecord`, whose `duration` read as "how long it runs". A `settle` added to that
record and not to the page fails the gate with `TimelineRecord: settle`, which is the defect it exists
for.

Step 10.5c pointed the README's four pictures at the repository's raw content. npm renders a README as
GitHub Flavored Markdown through GitHub's markdown API, and that API leaves a relative `src` as
written, so four pictures written as `docs/tangent.svg` resolved against the registry's own host and
drew nothing. Each is now an absolute URL answering 200 with `image/svg+xml`, the four remote sheets
match this tree's at 80,702, 4,112, 126,906 and 3,296 bytes, and a gate holds every `<img>` in the
README to that host and to a sheet the tree carries.

**One call inside the cut is still Siva's**, which is what
becomes of [`FIGURE-FORMAT.md`](FIGURE-FORMAT.md), a document `CLAUDE.md` calls the change in flight
and which a cut version leaves as a specification rather than a plan.

**Three things fell due before the format freezes and all three are answered.** A `Mark` may not be a
raster image, which is the decision above. The consumer's move from 0.6.0 is read in step 10.5a and
lands in that tree as one commit after the release. And a colour's written form, which the spike
found, is four channels and a name as of step 12, since a figure read by a renderer in another
language cannot carry a CSS custom property.

**The 1.x band is closed and 1.6.0 is published.** An audit on 2026-09-08 read the
whole band against the tree and found nine things, and seven commits closed them. Nothing since
1.0.0 is published: `npm view @altpsyche/maths version` answers 1.0.0 while this tree reads 1.6.0,
with thirty-seven commits unpushed and no tags, and the consumer holds 0.6.0. **Siva publishes**, and
the polish took no version of its own because eight of the nine were documentation and the ninth
tightened an interface 1.6.0 never shipped.

**Three documents contradicted the tree and one of them was the design.** `DESIGN.md` said a clip
path is something a 2D canvas "either lacks or supports partially" and that the mark vocabulary
refuses it, which 1.6.0 made false, and the README still excluded gradients, which 1.4.0 did. All
four documents now name one set of refusals, which is filters and blend modes, and say separately why
a clip is a rectangle and what a fill carries.

**A painter target that cannot hold a child is now refused by the type.** `PaintNode.append` was
optional and the reason its comment gave was the gradient: a target without it draws every mark and
no gradient. A `<clipPath>` holding no `<rect>` clips away everything referencing it, so the same
target lost every clipped mark instead, silently. `CanvasLike.rect` and `CanvasLike.clip` were made
required on that reasoning when the clip landed and the SVG side was not.

**The guide gained the two versions it never taught.** It named `moveView`, `followView`,
`frameView`, the clip and the inset zero times and now names them 29 times over two sections, and its
own moving-view section was stale beyond the omission: it said a figure's extent is a function of the
clock, which is the shape 1.5.0 replaced. Nothing gates the guide's code, so the three new blocks
were type-checked against the door in a scratch tree.

**Ten numbers across the two plans were wrong and the format plan carried a known-wrong paragraph.**
Its inventory said the extent is a function of the clock and the flat demo holds its dot within 1.2
figure units, which 1.5.0 measured at 2.14, corrected in step 7 and left standing there. It counted
nine sheets in three places where there are eight, four look versions in front of the format where
six went, a door of 230 names and a suite of 637 tests, and 9,507 lines of source with 133 exported
values. The README said 247 door names and `DESIGN.md` said the flat demo is 202 marks and the solid
one 265 at 2.5 and 2.7 milliseconds a frame.

**The format plan gained step 7.5, because 1.6.0 landed after it was written.** Step 6 carries the
timeline as data and step 7 the extent, and nothing carried `Figure.insets`, so step 8 could not have
written the flat demo out as a file with the panel it draws. The plan is forty commits and its
value types eleven.

**The solid demo carries an inset, so the clip reached both demos the way every 1.x feature before it
did.** Its panel is 2.6 by 1.95 showing 1.3 by 0.975 of the middle at a magnification of exactly 2,
sitting inside the 6.8 by 5.307 the camera pushes to rather than inside the declared 8.2 by 6.4:
an inset's marks carry no opacity of their own, so walking the panel away the way the rule and the
title are walked away would leave the magnified copy standing on nothing. **What it shows is the
middle rather than the crossing**, since the crossing is a hyperbola whose branches pass outside a
window on the middle at some bearings and holding both would need 6.3 of 8.2 units, which is a
reduction. docs/surface.svg went from 97200 bytes and 245 marks to 126906 and 247 with an inset of 67
to 77, and docs/surface-strip.svg from 391635 to 522338.

**The suite went from 782 tests over 47 files to 785, and the door is unchanged at 266 names.** Every
done-criterion was verified line by line in the commit that closed the item.

**1.6.0 publishes as a minor and four published types broke since 1.0.0, which is Siva's call taken
on 2026-09-09 rather than a reading of the convention.** The door itself is additive: 230 names at
1.0.0 to 266, none removed. What is not additive is the shape of four of them.

| what changed | at 1.0.0 | now | landed at |
| --- | --- | --- | --- |
| `Span.animation` | `animation: Animation` | `entry: Entry` | 1.5.0 |
| `CanvasLike` | neither `rect` nor `clip` | both, required | 1.6.0 |
| `PaintNode` | no `append` | required | the polish |
| `Stroke.width` | `number` | `number \| Taper` | 1.3.0 |

**A fifth is worse for being silent.** `Fill.gradient` and `Mark.clip` are new optional fields, so a
consumer painting marks with a painter of its own ignores them and draws the wrong picture with no
error, which is the failure `figure/mark.ts` opens by refusing.

**Why the number is 1.6.0 anyway.** 2.0.0 is reserved for the figure format in three documents, one
in each repository the change crosses, and taking it here moves the format to 3.0.0 for a break no
consumer feels. Nothing on npm is above 1.0.0 and the only consumer is on 0.6.0, so its next move
crosses 1.0.0's own major whatever this one is called. **What would change the answer** is a second
consumer adopting 1.0.0 from npm, which would be someone the number misleads.

**The consumer's own plan was wrong about this and is corrected.** Its roadmap said the first move is
a door read name by name at 1.0.0, ten names renamed and two removed. It is that and these four, and
the version is wrong as well: the renames shipped in 0.13.0, which is the release the door read
landed in, and 1.0.0 froze the door rather than moving it. Eleven names were renamed and two removed,
which is what the door itself says at that version.

**1.6.0 is cut, and a mark may be drawn inside a rectangle.** Four steps and a fifth found while
working closed it. A clip is a rectangle and no other shape: a path clip needs a winding number
counted, which is a stencil on a card, where a box is the scissor test every device already has. Both
painters write it, `<clipPath>` holding a `<rect>` and `rect` then `clip` on a context, and the same
box (0, -2) to (4, 2) at ten units across per figure unit reads x 100, y 30, width 40, height 40 in
each.

**The clip is in the figure's own units rather than the mark's, which is the one place a mark departs
from carrying its geometry through every transform above it.** A transform that turns takes a
rectangle to a shape with corners off the axes, so a clip that rode the transform down would be a
rectangle only until a group turned. A group under a clip of (0, -2) to (4, 2) holding a translation
of ten across draws nothing: the disc it holds lands at 11 across, which the clip would hold had it
moved by the same ten. A clip inside a clip is the box both hold, so (0, 4) inside (2, 8) leaves
(2, 4), and two clips that miss each other leave nothing under them.

**A shape whose whole reach falls outside its clip is left out of the list, and a text mark is not.**
The reach counts half a stroke width past the geometry: a line at 4.4 across, 0.4 outside a clip
ending at 4, stays at a width of 1 and is dropped at a width of 0.5. A text mark reaches only as far
as its own anchor here, since how wide some text is depends on which fonts the machine has, so
dropping one on an anchor outside the clip would cut a line whose letters run back inside on the
machine that has the font. That is the one done-criterion the item met differently from the way it
was written, and the cost is an invisible copy of each text mark inside an inset.

**An inset is a second view of the same figure, magnified into a rectangle of its own frame**, which
is `ZoomedScene` in Manim and what the clip was added for. It reads the marks the figure has already
built rather than building the tree again, and the same scene flattened under the inset's own matrix
agrees with it to 1e-12 mark for mark. `insetMatrix` has no flip, unlike `viewMatrix`, because both
rectangles are in the figure's own units and count upward the same way. Its own view is one
`ViewChange` applied in full at every time, so a `followView` on a dot reads (8, 3) with a width of 1
at -6, 0 and 3.5 along a walk, with no span and no easing: an inset that eased into following would
show the wrong part of the picture while it caught up.

**A view entry naming a mark reads the figure's own marks rather than the whole list.** An inset's
copy carries an id ending in the mark's own, so `touches` matched both and a `followView` was handed
the box round the mark and its magnified copy together. `ownMarks` is the list before the insets.

**The flat demo's panel is 2.8 by 1.26 at (1.9, 1.62) and shows 1.4 by 0.63, so it magnifies by
exactly 2.** It sits in the band above the graph and right of the reading and the rule, which is the
one part of that figure nothing else draws in, and its right edge stands at 4.7 because the view
follows the dot and the frame's own right edge comes in to 4.78 at the start of the walk. The panel
arrives with the grid, since an inset's marks carry the opacity of the marks they copy and a panel
arriving later would leave that arrival hanging over the band with no ground behind it. It is painted
in the sheet's own ground, so ink inside it reads 17.22:1 on white and 15.87:1 on #0d1117, the same
either side of its edge, and `Inset.hides` keeps the inset from magnifying its own border and
painting a picture of itself.

**A clip is one element per rectangle rather than one per mark**, which was found by rendering the
demo. A gradient is named per mark because two marks rarely share an axis, where every mark of an
inset is cut to the one rectangle: the still went from 35 clip elements and 87452 bytes to 1 element
and 80701, and the strip from 354135 to 324852 with 4, one per frame since each frame's window has
moved. A clip id is the rectangle's own four numbers, since numbering them in order is shorter and is
not stable when a mark leaves the list.

**The door went from 261 names to 266 and the suite from 747 tests to 782 over 47 files.** Every
done-criterion was verified line by line in the commit that cut it.

**1.5.0 is cut, and the view is a timeline entry.** Three steps and a plan correction closed it. A
view that moved was a function of the clock written on the figure, so it sat outside the order
everything else is written in and could not be told to start after an entrance or to overlap one. A
`ViewAnimation` is the extent the entries before it left and how far along, to the extent at that
point, and a `ViewChange` is one as a timeline entry.

**One span list carries both kinds, which is the whole of the item.** `after` and `stagger` read that
list, so a second timeline for the view could not sequence a camera move against an entrance at all.
An animation is a function and a view change is an object holding one, which is what tells two
functions of two arguments apart. `Span.animation` is `Span.entry`, `at` skips the view entries and
`extentAt` folds only those. A move overlapping the entrance by half its own length gives the spans
(0, 2) and (1, 3): over eleven times the fade reads against its own span and the move against its
own, so one entry's overlap shifts neither clock, to 1e-10.

**The declared extent is the base of that fold at every time rather than the answer.** A figure with
no view entry keeps it throughout, and a finished view entry stays applied in full, which is the rule
every mark animation already follows. Returning to the declared extent after the last entry was the
other reading available and would make a camera move snap back. Resolving the declared extent first
is also what keeps a shape-dependent extent choosing: with a view entry in the timeline, `byAspect`
still picks 20 by 10 at a surface of 400 by 200 and 10 by 10 at 200 by 200.

**Three forms are named and they are the format's own list**, which is a fixed extent, an aspect
choice, a follow with a margin and a framing of named marks. The first two are what a figure already
declares. `moveView` walks each field of the extent it was handed to the one it names and leaves the
fields it does not, so a pan writes a centre alone. `followView` holds a mark within a margin of the
middle and pushes no further, stopping where its room runs out. `frameView` grows the frame to cover
the marks rather than fitting it to them, so the shape it was handed is the shape it keeps and the
picture does not stretch as the marks move: two discs reaching 5 across and 2 up inside a frame of
two to one come out 5 by 2.5, and padded by one they come out 8 by 4 because the height then sets the
width. Each agrees with its closed form at eleven times.

**A follow and a framing read the marks, and they arrive as a getter.** Every painter asks for the
marks and the matrix both, so building them inside the call that answers for the matrix would build
the solid demo's 245 marks and its depth sort twice a frame. A figure whose view is a `moveView`
builds its scene no times and one whose view is a `followView` and a `frameView` together builds it
once.

**The door gained `extentAt(figure, seconds, aspect)`, which the work needed rather than chose.** Four
gates read the frame off `figure.extent` to place a mark against it, and a declared extent stopped
being the whole view the moment a view entry existed: the flat demo's reading came out at -5.804
against a frame the gate believed ran to -5.4. `viewAt` is that call plus `viewMatrix`, so the two
cannot disagree. A scene placing a mark against the frame cannot read it from there, since a view
that follows something reads the marks and the scene would be asking for what is being built.

**The flat demo's view is one `followView` entry and its picture is byte-identical.** `tangent.extent`
was `(_aspect, seconds) => frameAt(pointAt(seconds))` and is now the plain extent `size`. The entry's
span is nothing wide, so it is applied in full from the first frame: the duration is 10.25 seconds as
it was and the matrices read 602 across at the entrance and the beat and 478 at the walk and the end.

**The solid demo's camera pushes in on the crossing to 6.8 across, a magnification of 1.21, and comes
back.** The crossing reaches 3.1105 across and 1.4744 up from the middle at its widest over the
orbit, so 6.8 holds both branches with 0.2896 to spare at every place in the turn. Its matrix reads
93.75 at the entrance, the still, a quarter turn and the end and 113.051471 at the half turn, and the
figure ends where it began to 1e-12.

**The equation and the title had to go, because that demo had no room.** Everything it draws fits
inside 7.872 by 6.155 against a declared 8.2 by 6.4, four per cent of margin, so any push worth
seeing crops something, and those two are placed at fractions of the declared extent. They are walked
to nothing over 0.4 seconds before the camera moves and back after it has returned. Fading them while
it moved left a label at half its opacity outside the frame, which reads as one that slid off rather
than one that went, and the gate holding every text mark inside the frame caught it. `fadeTo` rather
than `fadeOut` and `fadeIn`, since those two multiply the opacity they are handed and a mark faded
out never returns.

**The push starts after the still and after the last frame the strip shows**, so a reader shown one
frame gets the whole saddle with its equation, and the strip stays four frames of one composition.
**The eight sheets are byte-identical, so what holds both moves is the suite rather than a sheet**,
which is what 1.2.0 did with the pacing for the same reason.

**Three errors in the plan were found and corrected before they were built.** Step 2 said four forms
including a hold, and step 7 of the format, which it defers to, names no hold: `wait` already inserts
dead time and a finished view entry stays applied in full, so a view holding while a brace arrives is
the absence of an entry. Step 3 said the solid demo's orbit gains a held beat, and that orbit is a
`Camera3` driven by a track inside the scene rather than the figure's view, so pacing it belongs to
step 3.9 of the format. And both this file and the format claimed the flat demo holds its dot within
1.2 figure units of the middle: the reach is 1.2 but `ROOM` is 0.62 and binds at both ends of the
walk, so the real bound is 2.14. The suite already held 2.14 and said why, so the gate was right and
both plans were wrong.

**The door went from 252 names to 261 and the suite from 722 tests to 747 over 45 files.** Every
done-criterion was verified line by line in the commit that cut it.

**1.4.0 is cut, and a fill may be a run of colours along an axis.** Five steps closed it. A
`Gradient` is two points and a list of `Stop`s, each a colour and an offset from nothing at the start
of the axis to one at its end. `Fill.colour` is still one string and the gradient sits beside it,
because a contrast reading and anything else needing a single colour has to have one. The axis is in
the mark's own units, so it goes through every transform the geometry does: a group that scales by 3
and moves by (5, 1) takes an axis from (0, 0)-(2, 0) to (5, 1)-(11, 1), and a quarter turn takes one
lying along x to lying along y, to 1e-12. The stops are untouched by all of it, since a stop is a
share of the axis rather than a place.

**Both painters name a gradient the way their own surface names one.** A sheet carries one `<defs>`
in front of its marks holding a `<linearGradient>` of `<stop>`s for each, written in the units
painted into, which is what `userSpaceOnUse` means, and the mark's `fill` is `url(#id)`. A canvas
takes an object built from the context, so `CanvasLike` gained an optional `createLinearGradient` and
`CanvasGradientLike` is what it hands back. Given one three-stop wash both produce (0, `#012`),
(0.5, `#345`) and (1, `#678`) in that order. A context with no `createLinearGradient` paints the
single colour and builds nothing, which is what keeps a stand-in written before gradients a stand-in.

**An id is the mark's own id with every character an id may not carry written as its own code point
between dashes, a dash included.** Nothing is dropped and nothing is folded together, so two mark ids
that differ cannot arrive at one id: `fig/a/b` and `fig/a-b` become `fig-2f-a-2f-b` and
`fig-2f-a-2d-b`. The document's own prefix makes an id unique across a page, so the same disc drawn
twice under `one-` and `two-` gives `one-disc` and `two-disc`. A three-stop gradient costs a sheet
249 bytes, 206 to 455 on a disc drawn alone.

**The demos wash a region and a pane.** The flat demo's region under the parabola runs `peach` at the
top of the graph to `cream` at the x axis, on an axis that is the graph's whole vertical run rather
than the height of the region at the time it is drawn, so the colour at a given height is the same at
every time: (-2.76, 1.6)-(-2.76, -2.135) at every named time. Fitted to the region it would be one
point at the start of the walk, where the region has no height, and a gradient whose two ends are one
point paints nothing on a canvas.

**The solid demo's pane runs `glaze` along the edge nearest the eye to `frost` along the edge
furthest from it**, on the pane's own recession, which is the horizontal direction from the eye to
the middle of the pane. Built from the nearest and furthest projected corners it jumped every time
the orbit crossed a diagonal, since the pane is square and two corners sit at one depth there. The
eye looks at where the axes cross with z up, so the projected axis is straight up the page everywhere
in the orbit and what the orbit changes is its length: (0, -0.876)-(0, 1.25) where the pane recedes
over an edge and (0, -1.742)-(0, 1.491) a quarter turn on, over its own diagonal. All sixteen cells
carry that one axis, which is what makes them read as one sheet of glass rather than sixteen tiles.

**Against their own grounds the four stop colours are `peach` at 1.686 and 2.545, `cream` at 1.273
and 1.330, `glaze` at 1.580 and 1.872, and `frost` at 1.147 and 1.277.** Every one is under the 4.5
contrast text is asked for and three of the four clear 1.2. `frost` light is 1.147 and was before
this version, which is why the palette's own floor is 1.1: the face of a pane of glass is the one
wash meant to barely tint the page.

**Four sheets grew for the gradients they draw and four for the two custom properties they carry and
never paint.** `docs/tangent.svg` went 62081 to 62387 bytes, `docs/tangent-strip.svg` 250543 to
251632, `docs/surface.svg` 92609 to 97166 and `docs/surface-strip.svg` 372676 to 391601. The other
four grew by 64 bytes each, since a sheet carries the whole theme. Mark counts are unchanged at 144
and 245.

**The door went from 247 names to 252 and the suite from 701 tests to 722 over 44 files.** Every
done-criterion was verified line by line in the commit that cut it.

**1.3.0 is cut, and a stroke's width may change along its length.** Five steps closed it. A `Taper`
is the width where a path starts, the width where it ends, and the `CurveName` the width leaves the
first along, which is the shape a key already has and so a shape a file can carry. `Stroke.width` is
a `Width`, one number or a taper, and a tapered stroke is drawn as the filled outline of its own
path, since neither an SVG `stroke-width` attribute nor a canvas context's `lineWidth` holds two
widths. `outlinePath` builds that outline on a flattening, because the offset of a cubic is not a
cubic, and its tolerance is a thousandth of a figure unit, a tenth of a pixel at the hundred pixels
to the unit the demos draw at.

**Area is the reading throughout, because a stroke of width w over a length L covers Lw wherever the
two sides do not run into each other.** A straight segment of length 2 stroked at 0.4 is the
rectangle exactly, to 1e-12. A circle of radius 1 stroked at 0.1 covers 0.6283471 against the
0.6283185 of the ring, a share of 4.549e-5. The flat demo's parabola at the 0.05 it is drawn at
covers 0.44047672 against 0.44048238, a share of 1.286e-5. A 2 by 2 square covers 0.8 under a miter
join and 0.795 under a bevel, both to 1e-12. A taper from 0.4 to nothing over a straight segment of
length 2 is the triangle exactly, 0.4 to 1e-12.

**`marksAt` takes the outline after the timeline has run**, so an animation still sees the
centreline: `draw` trims that and the outline follows, agreeing with the outline of the trimmed
centreline to 1e-12 at all eleven fractions. Trimming the outline instead leaves the loop open along
one side, covering 0.0398015 where the right answer is 0.2.

**Two findings landed on the way through.** The flattening answers for the geometry alone, so a
straight run is two points however the width moves along it and a swell had nothing to swell at; a
run is now split while the width along it bends. Reading the width halfway along against the width
its ends average to is not that test, because a curve that rises and falls by the same amount has its
midpoint on the chord: the swell then drew as a four-point diamond whose area was the right answer
for the wrong shape. The width is read at a third and two thirds, where the geometry's own flatness
test reads a cubic's two controls.

**The demos taper the two lines that are claims about one place.** The flat demo's tangent is nothing
at both ends and 0.035 in the middle, since a line drawn at one weight to the edge of the graph reads
as a line that carries on past it. The solid demo's three runs of descent are 0.035 at their seeds
and nothing where they leave, since every run is stopped by the edge of the region rather than by
arriving anywhere. The mark counts are unchanged at 144 and 245, and what moved is which call draws
them: 43 fills and 89 strokes a frame in the flat demo where it painted 42 and 90, and 196 and 54 in
the solid where it painted 193 and 57. Four sheets grew and four are byte-identical.

**The door went from 240 names to 247 and the suite from 668 tests to 701 over 43 files.** Every
done-criterion was verified line by line in the commit that cut it.

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
measurement became assertions, the door was read name by name against three questions and eleven
names were renamed and two removed, the option bags took one shape, the demos took one palette, the
strips took one shape, the sheets were chosen to be looked at, and the four prose surfaces were
written in one register. **The renames reached npm in 0.13.0 rather than in 1.0.0**, since the read
landed at version 0.12.0 and the sheets release carried it out, so a consumer crossing 0.12.0 to
0.13.0 is the one that felt them. The door is 230 names, the suite is 637 tests over 40 files, and the prose is a 175
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

Each is a version above. What follows is what each one covers. 2.6.0 carries no step list, because
writing one is a session of its own.

### The 2.x band, which is what Manim has and this does not

**One item of this band is left and it adds no kind.** The recorder reads a figure and writes a file,
so it changes nothing in the format and puts a name at the door. **It carries no step list**, and
writing one is a session of its own, which is the rule this file holds every item to.

**2.6.0 The recorder.** `framesOf` hands back a frame at a time and there is no encoder anywhere in
this tree, so what a consumer gets is frames and what the goal at the top of this file asks for is an
animation. This is the largest single distance between this package and Manim, which writes an MP4
from a command. The third decision above already says the recorder lives here behind a dynamic
import. **It goes after 2.0.0 rather than before** because a recorder reads a figure, and after the
format a recorder reads a file, which is also what lets one run without a page around it.

**The recorder is three parts and only one of them is written here.** Siva's reading on 2026-09-10,
so a planning session starts from it. The walk exists: `framesOf` yields `{index, seconds, marks,
view}` and `frameTimesOf` gives the times before anything is drawn. What turns a frame into pixels is
a parameter, and `paintCanvas(context: CanvasLike, marks, view)` already takes a structural
`CanvasLike` rather than a browser type, so a page's canvas, a canvas shim with no page and 2.7.0's
GPU painter all satisfy one seam. What writes the bytes is a second parameter, and `mediabunny` behind
a dynamic import is the first one rather than the only shape allowed. **What this buys** is that 2.7.0
adds a pixel source, 2.9.0 adds a sink and a source that needs no page, and the recorder itself
changes no line. A recorder that named its own canvas and its own encoder would be rewritten twice,
which is what took four renderer versions off this ladder.

**The sink being a parameter is also how the recorder is gated without a device.** A sink that counts
the frames it is handed and the timestamp on each is pure, so the frame count, a step of exactly one
over the rate, and the walk stopping strictly before the duration are all held by `npm test`. Only the
bytes need a browser gate, which is the rule this repository already holds a claim about pixels to.

**Bringing the engine in at this version is refused, and the engine's own gap is why.** Its stencil
cannot count a winding number, filed there as its item 2, so the GPU painter cannot draw an annulus
and cannot draw 4 of the 8 glyphs of `a^2 + b^2 = e^0`. A recording taken off a card before that lands
is a recording with the holes filled in. The order of 2.6.0 and 2.7.0 is forced by that rather than
chosen.

**The seam this describes is written already, in the consumer, and the found list below carries the
reading.** `FrameFiller` there is `fill(target, seconds, index, clipSeconds)` with `settle` and
`dispose`, and its walk counts frames by a floor where `frameTimesOf` counts by a round. So the shape
is taken rather than designed, and the two frame counts become one.

**What a planning session settles first is whether `mediabunny` takes a frame that is not a canvas.**
A raw sample path makes the sink independent of a page, and 2.9.0 then needs only a rasteriser that
runs without one. A `CanvasSource` and nothing else makes that class the browser tie, and 2.9.0 gains a
canvas shim as a named dependency on the ladder rather than discovering one. **What would change the
answer** is nothing in this package, so it is read off that library's own surface before a step is
written.

## Found while working, not yet queued

- **Two demo tests run within half a second of vitest's default timeout.** `the portrait demo > draws
  the spirals the flow itself walks` takes 4550ms and `the committed pictures > give each figure room
  for the sizes its own scale asks for` takes 3990ms, against the 5000ms a test gets when nothing
  names a timeout, and `vitest.config.ts` names none. One suite run in ten failed one test on an
  unchanged tree on 2026-09-10 and nine runs since have passed, which is what a test half a second
  inside the limit looks like on a machine doing something else. **What closes it** is either a
  `testTimeout` in the config or the two tests reading fewer times of their figures, and the second is
  the better answer if what makes them slow is re-resolving one figure at many times.

- **The specification writes `ticks` as a step and the code reads it as a count.** `SPECIFICATION.md`
  says `ticks` is the step between two ticks in graph units for a number line, and the major step for
  a number plane. `tickStep(bounds, about)` divides the span by one less than that number and rounds
  the result to a round number, so it is about how many ticks are wanted, which is what `axis.ts` and
  `REFERENCE.md` both say. A renderer written from the specification would draw a grid at a step of 20
  where a figure asking for `ticks` of 1 over a span of 16 wants a step of 1, which is what the matrix
  demo hit while it was being written. Two sentences of the specification are wrong and nothing in the
  code is.

- **A plotted curve is cut on the height alone, so a run of x wider than the graph draws off it.**
  `plot` takes `over` as the run of x it samples and its `drawable` test reads only `coords.y.graph`,
  so nothing holds the samples inside the width. A graph counting x from -1 to 1 into figure units of
  -1 to 1, plotted over -3 to 3, draws from -3.000 to 3.000 in figure units, which is three times the
  graph's own width and outside every axis the figure drew. `parametric` over the same run is held to
  -1.000 to 1.000, since it tests both coordinates. The fix is one clause in `plot`'s `drawable` and a
  cut on x at both ends, which is the machinery `parametric` now carries. Nothing in this tree passes
  an `over` wider than its graph, which is why it has never shown.

- **The clamp at the end of a plotted curve's crossing is dead and its comment describes what it would
  do.** `crossing` bisects until `near` is the last parameter still drawable, then hands back
  `interval.clampTo(bounds, of(near))`. A drawable y is inside `bounds` by the same test, so the clamp
  is the identity on every call and the cut end sits inside the edge rather than on it. The comment says
  the y "is held on the edge rather than taken from the function", which is the line that does not
  happen. `parametric` drops the clamp and says what the bisection leaves instead, measured at 3.3785e-9
  graph units inside the edge. Whether `plot` should place the end on the edge or say what it leaves is
  the call the fix has to make.

- **The reference is held to the door by name and to the records by nothing.** `tests/reference.test.ts`
  says every name at the door has one entry and no entry names a name the door lacks, which is what
  keeps a rename from leaving a description of nothing. What it does not read is the fields inside an
  entry: `TextRecord` described its place as a plain `at` for as long as it took step 8.2 to widen the
  field, and nothing failed. A comparison run by hand over the 68 record interfaces against their
  entries found that one and no other, so the gate would be cheap and would have caught it. What
  stops it being written already is that an entry may name a field in words rather than in backticks,
  as `TimelineRecord` names its duration, so the gate needs the entries to name every field the way
  most of them already do.

- **A tapered stroke's outline is unstable in the last bits of its centreline, and the drawn width is
  what pays.** `outlinePath` splits a run until the width along it is straight enough, halving the
  chord and testing the width a third and two thirds of the way along. Where the split lands decides
  how much of a swelling taper is drawn: the flat demo's tangent carries
  `{ from: 0, to: 0.035, curve: 'thereAndBack' }`, whose width peaks in the middle, and the outline's
  points land on eighths of the centreline in the good case. Over 201 tangents to the demo's parabola
  with x from 0.7 to 0.9, five of them draw more than one per cent away from the true integral of the
  width over the length and the worst is 5.371e-2. Step 1 of the format moved the frame-1 tangent by
  1.35e-11 and that was enough to move it from a good split to a bad one: 0.07616098 of area, which is
  the true value, down to 0.07145405, a mean width of 0.017500 down to 0.016419, or 0.108 of a pixel
  at the hundred pixels to the unit the sheets draw at. **Adding the midpoint to the test changes
  nothing**, measured: the same five of 201 and the same worst. So the cause is where the extra points
  land rather than which places the test reads, and the fix is unknown. **What would settle it** is a
  gate holding a tapered outline's area to the integral of its own width, which is a claim no test
  makes today.

- **All four of the things that look worse than 3Blue1Brown are queued now**, which is Siva's call of
  2026-09-08 and the reason the ladder above is no longer empty. Motion and pacing was 1.2.0 and is
  cut, typography and labels was 1.1.0 and is cut, composition and camera is done-criteria on the format's
  steps 3.9 and 7, and line quality is 1.3.0 and 1.4.0 between them. **The reading that put them there is that
  three of the four are builder and demo work over the SVG painter that already draws**, and only the
  sharpness of a line is the renderer's.

- **The engine cannot count a winding number, and a GPU fill needs one.** `StencilMode` there is a
  boolean mask: `mark` replaces every bit where it draws, `inside` keeps what compares equal, and
  both set the front and back faces to one state. A winding number is counted by front and back faces
  cancelling, which is the whole of how Loop and Blinn's fill decides an interior. **It is filed in
  that repository as its item 2**, argued on its own merits, and the painter waits on it whenever it
  returns.

- **A decision falls due at 2.7.0 and it is Siva's.** Pin an exact version of `@altpsyche/engine` and
  take the churn by hand, or wait for that package to reach 1.0.0 before the painter starts. A 2.0.0
  with a frozen door cannot promise stability through a dependency below 1.0.0, where a minor may
  break anything, which is the same argument that produced the clean break.

- **The consumer will hold two engines unless the declaration says otherwise, and the answer is a
  peer dependency.** That site depends on `@altpsyche/engine` directly in nineteen files and not one
  of them draws a figure: a shader playground, a shader background, a shader embed, a browser
  compiler for Slang, a video export and a thumbnail script. So it keeps that package after the
  painter lands here, and from 2.7.0 it depends on it twice, once directly and once through this
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

- **`Mat3` is one name and one shape with two meanings, and no compiler can tell them apart.** Here it
  is a 2D affine transform, nine numbers column-major with the translation in the third column. In the
  engine it is the upper-left three by three of a `Mat4`. Both are `readonly [number, number, number,
  number, number, number, number, number, number]` behind two doors, so either is accepted where the
  other is wanted with nothing reported. The consumer already holds one file importing both packages.
  **What closes it** is a brand on one of the two, which is a change to a published type and wants the
  engine's agreement rather than a session's.

- **The recorder's seam is written already, in the consumer, and 2.6.0 should take it rather than
  invent one.** `lib/video/VideoRecorder.ts` is 232 lines and `components/figure/record.ts` is 77.
  `FrameFiller` there is `fill(target, seconds, index, clipSeconds)` with `settle` and `dispose`,
  which is the parameterised sink the 2.6.0 entry above argues for, in a tree that ships. Taking it
  means `CanvasLike` in place of `CanvasRenderingContext2D`, which is what lets a canvas with no page
  behind it satisfy the same seam at 2.9.0. **The walk has already drifted**: that file counts
  `Math.floor(duration * fps)` frames where `frameTimesOf` counts `Math.max(1, Math.round(duration *
  fps))`, so a figure of 1.999 seconds at 30 frames a second is 59 frames there and 60 here.

- **Elapsed time becoming figure time is format semantics implemented in the consumer.**
  `components/figure/clock.ts` holds a figure at its duration when it does not declare itself a loop
  and wraps with a remainder when it does, and clamps a frame's delta to 0.1 seconds so a tab restored
  after a minute away does not jump a lap. Both rules are about `duration` and `loop`, which are
  fields of the format, and this package ships `durationOf` and `isLoop` and nothing that maps one
  time to the other. 2.6.0's recorder needs the same rule, so writing it twice more is the thing to
  avoid. **What closes it** is one function at this door, with the clamp named rather than inlined.


## Someday

**Nothing is here.** Gradients and the variable-width stroke were the two entries and both are on
the ladder now, as 1.4.0 and 1.3.0, because Siva asked for the look rather than for another feature.
The reasons they were refused are unchanged and are written into those two items as the work each has
to do: a gradient wants a shape of value the marks do not have and an id unique across a page, and a
variable width wants the stroke to become geometry, since neither painter can taper one.
