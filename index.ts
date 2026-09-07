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
export { SAME_TIME, keyAt, sampleTrack, sampleTracks, withKey, withoutKey } from './timing/track.js';
export type { Key, Track, TrackValue, Tracks } from './timing/track.js';

export { arc, circle, line, polygon, polyline, pointCount, pointOn, rect, straight, transformPath } from './figure/path.js';
export type { Cubic, Path, Subpath } from './figure/path.js';
export { pathFromData } from './figure/path-data.js';
export type { Colour, Fill, Mark, PathMark, Stroke, TextMark } from './figure/mark.js';
export { byAspect, fractionOf, matchingAspect, resolveExtent, viewMatrix } from './figure/extent.js';
export type { Extent, ExtentChoice, Fit } from './figure/extent.js';
export { boundsOf, boundsOfMarks, centreOf } from './figure/bounds.js';
export type { Bounds } from './figure/bounds.js';
export { areaUnder, plot, riemannBars, slopeOf, tangentAt } from './figure/plot.js';
export type { AreaOptions, BarsOptions, PlotOptions, TangentOptions } from './figure/plot.js';
export { axes, numberLine, numberPlane } from './figure/axis.js';
export type { AxesOptions, NumberLineOptions, NumberPlaneOptions } from './figure/axis.js';
export { coordsOf, pointOf, scaleOf, scaled, unscaled } from './figure/scale.js';
export type { Coords, Scale } from './figure/scale.js';
export { labelFor, tickStep, ticksOn } from './figure/ticks.js';
export type { Tick } from './figure/ticks.js';
export { flatten, group, shape, text } from './figure/node.js';
export type { GroupNode, Node, ShapeNode, Style, TextNode, TextOptions } from './figure/node.js';
export { fadeIn, fadeOut, fadeTo, draw, growFrom, morph, moveAlong, moveBy, rotate, scale } from './figure/animation.js';
export type { AboutOptions, Animation, ScaleOptions } from './figure/animation.js';
export { Timeline } from './figure/timeline.js';
export type { PlayOptions, Span } from './figure/timeline.js';
export { lengthOf, pointAlong } from './figure/length.js';
export { trimPath } from './figure/trim.js';
export { alignPaths, lerpPath } from './figure/morph.js';
export { at, durationOf, loops, sameMarks } from './figure/figure.js';
export type { Figure, Values } from './figure/figure.js';
export { pathData, paintSvg, svgElements, svgMarkup } from './paint/svg.js';
export type { ElementMaker, PaintNode, PaintTarget, SvgElement } from './paint/svg.js';
export { paintCanvas } from './paint/canvas.js';
export type { CanvasLike } from './paint/canvas.js';
export { arrow, callout, dot } from './figure/annotate.js';
export type { ArrowOptions, CalloutOptions } from './figure/annotate.js';
