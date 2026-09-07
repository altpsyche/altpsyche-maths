/**
 * The one door. Nothing outside this package reaches a file inside it by path,
 * which is the same rule the engine is held to, so a caller can never come to
 * depend on where a file sits.
 *
 * There is a line through this package. Values and timing are below it and
 * change almost never; figures and painters will sit above it and change often.
 * Nothing below the line may import anything above it.
 */

export { clamp, inverseLerp, lerp, remap } from './values/scalar.js';
export { curveFor, easeIn, easeOut, linear, smoothstep } from './values/ease.js';
export type { Curve } from './values/ease.js';
export { vec2 } from './values/vec2.js';
export type { Vec2 } from './values/vec2.js';
export { vec3 } from './values/vec3.js';
export type { Vec3 } from './values/vec3.js';
export { interval } from './values/interval.js';
export type { Interval } from './values/interval.js';
export { mat3 } from './values/mat3.js';
export type { Mat3 } from './values/mat3.js';
export { mat4 } from './values/mat4.js';
export type { Mat4, OrthographicOptions, PerspectiveOptions } from './values/mat4.js';
export { SAME_TIME, keyAt, sampleTrack, sampleTracks, withKey, withoutKey } from './timing/track.js';
export type { Key, Track, TrackValue, Tracks } from './timing/track.js';

export { arc, circle, line, polygon, polyline, pointCount, pointOn, rect, slopeOn, splitCurve, straight, transformPath } from './figure/path.js';
export type { Cubic, Path, Subpath } from './figure/path.js';
export { pathFromData } from './figure/path-data.js';
export { TOLERANCE } from './figure/tolerance.js';
export { areaOf } from './figure/area.js';
export { differenceOf, intersectionOf, unionOf } from './figure/boolean.js';
export type { BooleanOptions } from './figure/boolean.js';
export { containsPoint, flattenPath, nearestEdge, windingAt } from './figure/inside.js';
export type { Edge, FlattenOptions } from './figure/inside.js';
export { cutPath } from './figure/cut.js';
export type { Cut, CutOptions } from './figure/cut.js';
export { curveCrossings } from './figure/intersect.js';
export type { Crossing, CrossingOptions } from './figure/intersect.js';
export type { Colour, Fill, Mark, PathMark, Stroke, TextMark } from './figure/mark.js';
export { byAspect, fractionOf, matchingAspect, resolveExtent, viewMatrix } from './figure/extent.js';
export type { Extent, ExtentChoice, Fit } from './figure/extent.js';
export { boundsOf, boundsOfMarks, centreOf } from './figure/bounds.js';
export type { Bounds } from './figure/bounds.js';
export { areaUnder, plot, riemannBars, slopeOf, tangentAt } from './figure/plot.js';
export type { AreaOptions, BarsOptions, PlotOptions, TangentOptions } from './figure/plot.js';
export { axes, numberLine, numberPlane } from './figure/axis.js';
export type { AxesOptions, NumberLineOptions, NumberPlaneOptions } from './figure/axis.js';
export { camera3, orthographic, perspective } from './figure/camera.js';
export type { Camera3, Camera3Choice, OrthographicChoice, PerspectiveChoice, Projected, Projection } from './figure/camera.js';
export { dot3, polyline3, space, surface3, text3 } from './figure/space.js';
export type { Polyline3Options, SpaceItem, Surface3Options, Text3Options } from './figure/space.js';
export { axes3 } from './figure/axis3.js';
export type { Axes3Options } from './figure/axis3.js';
export { sectionOf } from './figure/section.js';
export type { Plane, SectionOptions } from './figure/section.js';
export { coordsOf, pointOf, scaleOf, scaled, unscaled } from './figure/scale.js';
export type { Coords, Scale } from './figure/scale.js';
export { labelFor, tickStep, ticksOn } from './figure/ticks.js';
export type { Tick } from './figure/ticks.js';
export { flatten, group, shape, text } from './figure/node.js';
export type { GroupNode, Node, ShapeNode, Style, TextNode, TextOptions } from './figure/node.js';
export { circumscribe, countTo, fadeIn, fadeOut, fadeTo, draw, flash, growFrom, indicate, morph, morphEquation, moveAlong, moveBy, rotate, scale } from './figure/animation.js';
export type { AboutOptions, Animation, CircumscribeOptions, FlashOptions, IndicateOptions, ScaleOptions } from './figure/animation.js';
export { Timeline } from './figure/timeline.js';
export type { PlayOptions, Span, StaggerOptions } from './figure/timeline.js';
export { lengthOf, pointAlong } from './figure/length.js';
export { trimPath } from './figure/trim.js';
export { alignPaths, lerpPath } from './figure/morph.js';
export { at, durationOf, loops, sameMarks, viewAt } from './figure/figure.js';
export type { Figure, Values } from './figure/figure.js';
export { pathData, paintSvg, svgElements, svgMarkup } from './paint/svg.js';
export type { ElementMaker, PaintNode, PaintTarget, SvgElement } from './paint/svg.js';
export { paintCanvas } from './paint/canvas.js';
export type { CanvasLike } from './paint/canvas.js';
export { arrow, brace, bracePath, callout, dot } from './figure/annotate.js';
export type { ArrowOptions, BraceOptions, BracedOptions, CalloutOptions } from './figure/annotate.js';
export { typesetElement } from './figure/typeset.js';
export type { EquationElement } from './figure/typeset.js';
export { equationFromTex, equationMarks, equationNode } from './figure/equation.js';
export type { Equation, EquationBox, EquationOptions } from './figure/equation.js';
export { glyphToken, matchGlyphs } from './figure/equation-match.js';
export type { GlyphMatch } from './figure/equation-match.js';
