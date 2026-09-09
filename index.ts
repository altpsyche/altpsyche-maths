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
export { colourOf, colourText, lerpColour } from './values/colour.js';
export type { Rgba } from './values/colour.js';
export { curveFor, curveNamed, easeIn, easeOut, linear, nameOfCurve, overshoot, smoothstep, thereAndBack } from './values/ease.js';
export type { Curve, CurveName } from './values/ease.js';
export { vec2 } from './values/vec2.js';
export type { Vec2 } from './values/vec2.js';
export { vec3 } from './values/vec3.js';
export type { Vec3 } from './values/vec3.js';
export { interval } from './values/interval.js';
export type { Interval } from './values/interval.js';
export { mat3 } from './values/mat3.js';
export type { Mat3 } from './values/mat3.js';
export { mat4 } from './values/mat4.js';
export type { Mat4 } from './values/mat4.js';
export { SAME_TIME, keyAt, sampleTrack, sampleTracks, withKey, withoutKey } from './timing/track.js';
export type { Key, Track, TrackValue, Tracks } from './timing/track.js';

export { arc, circle, line, polygon, polyline, pointCount, pointOn, rect, splitCurve, straight, tangentOn, transformPath } from './figure/path.js';
export type { Cubic, Path, Subpath } from './figure/path.js';
export { pathFromData } from './figure/path-data.js';
export { TOLERANCE } from './figure/tolerance.js';
export { areaOf } from './figure/area.js';
export { outlinePath, outlinedMarks } from './figure/outline.js';
export type { OutlineOptions } from './figure/outline.js';
export { widestWidth, widthAt } from './figure/width.js';
export { transformFill, transformGradient } from './figure/gradient.js';
export { differenceOf, intersectionOf, unionOf } from './figure/boolean.js';
export type { BooleanOptions } from './figure/boolean.js';
export { containsPoint, flattenPath, nearestEdge, windingAt } from './figure/inside.js';
export type { FlatEdge, FlattenOptions } from './figure/inside.js';
export { cutPath } from './figure/cut.js';
export type { Cut, CutOptions } from './figure/cut.js';
export { curveCrossings } from './figure/intersect.js';
export type { Crossing, CrossingOptions } from './figure/intersect.js';
export type { Colour, Fill, Gradient, Mark, PathMark, Stop, Stroke, Taper, TextMark, Width } from './figure/mark.js';
export { byAspect, fractionOf, matchingAspect, resolveExtent, viewMatrix } from './figure/extent.js';
export type { Extent, ExtentChoice, Fit, ViewAnimation, ViewChange } from './figure/extent.js';
export { followView, frameView, moveView } from './figure/view.js';
export type { FollowOptions, FrameOptions } from './figure/view.js';
export { boundsOf, boundsOfMarks, centreOf, grownBy, overlapOf } from './figure/bounds.js';
export type { Bounds } from './figure/bounds.js';
export { insetMarks, insetMatrix } from './figure/inset.js';
export type { Inset } from './figure/inset.js';
export { EXPRESSION_FUNCTIONS, evaluate } from './figure/expression.js';
export type { Arithmetic, Bindings, Comparison, Expression, ExpressionValue, Variables } from './figure/expression.js';
export { resolvePath } from './figure/path-record.js';
export type { IntervalRecord, PathRecord } from './figure/path-record.js';
export { resolveNode, resolveSection, resolveStreamline, writeTemplate } from './figure/node-record.js';
export type {
  Arrow3Record,
  ArrowRecord,
  ArrowRecordOptions,
  Axes3Record,
  AxesRecord,
  BarsRecordOptions,
  BraceRecord,
  BraceRecordOptions,
  CalloutRecord,
  CalloutRecordOptions,
  ColourChoice,
  Dot3Record,
  DotRecord,
  EquationRecord,
  EquationRecordOptions,
  FieldArrows3Record,
  Field3RecordOptions,
  FillRecord,
  GroupRecord,
  NodeRecord,
  NumberLineRecord,
  NumberPlaneRecord,
  PlaneRecord,
  Polyline3Record,
  RiemannBarsRecord,
  SceneItemRecord,
  Scene3Record,
  Section3Record,
  SectionRecord,
  ShadeRecord,
  SpaceItemRecord,
  FieldRecordOptions,
  ShapeRecord,
  Streamline3Record,
  StreamlineRecord,
  Surface3Record,
  Surface3RecordOptions,
  SurfaceCellsRecord,
  TextContent,
  TextHole,
  Text3Record,
  TextRecord,
  TextTemplate,
  VectorField3Record,
  VectorFieldRecord,
} from './figure/node-record.js';
export { areaUnder, plot, riemannBars, slopeOf, tangentAt } from './figure/plot.js';
export type { AreaOptions, BarsOptions, PlotOptions, TangentOptions } from './figure/plot.js';
export { vectorField } from './figure/field.js';
export { streamlineOf } from './figure/streamline.js';
export type { StreamlineOptions } from './figure/streamline.js';
export type { VectorFieldOptions } from './figure/field.js';
export { axes, numberLine, numberPlane } from './figure/axis.js';
export type { AxesOptions, NumberLineOptions, NumberPlaneOptions } from './figure/axis.js';
export { camera3, orthographic, perspective, resolveProjection } from './figure/camera.js';
export type {
  Camera3,
  Camera3Choice,
  OrthographicChoice,
  PerspectiveChoice,
  Projected,
  Projection,
  ProjectionChoice,
} from './figure/camera.js';
export { resolveCamera, resolvePoint3 } from './figure/camera-record.js';
export type { Camera3Record, Point3Record } from './figure/camera-record.js';
export { arrow3, dot3, polyline3, scene3, text3 } from './figure/space.js';
export type { Arrow3Options, Polyline3Options, SpaceItem, Text3Options } from './figure/space.js';
export { fieldArrows3, vectorField3 } from './figure/field3.js';
export type { VectorField3Options } from './figure/field3.js';
export { surface3, surfaceCells } from './figure/surface3.js';
export type { Surface3Options } from './figure/surface3.js';
export { axes3 } from './figure/axis3.js';
export type { Axes3Options } from './figure/axis3.js';
export { sectionOf } from './figure/section.js';
export type { Plane, SectionOptions } from './figure/section.js';
export { coordsOf, pointOf, scaleOf, toGraph, toUnits } from './figure/scale.js';
export type { Coords, Scale } from './figure/scale.js';
export { labelFor, tickStep, ticksOn } from './figure/ticks.js';
export type { Tick } from './figure/ticks.js';
export { TEXT_RATIO, textScale } from './figure/type-scale.js';
export type { TextRole, TextScale } from './figure/type-scale.js';
export { LEADING, flatten, group, shape, text } from './figure/node.js';
export type { GroupNode, Node, ShapeNode, Style, TextNode, TextOptions } from './figure/node.js';
export { circumscribe, countTo, fadeIn, fadeOut, fadeTo, draw, flash, growFrom, indicate, morph, morphEquation, moveAlong, moveBy, rotate, scale } from './figure/animation.js';
export type { AboutOptions, Animation, CircumscribeOptions, FlashOptions, IndicateOptions, ScaleOptions } from './figure/animation.js';
export { resolveAnimation } from './figure/animation-record.js';
export type {
  AnimationRecord,
  DrawRecord,
  FadeInRecord,
  FadeOutRecord,
  FadeToRecord,
  GrowFromRecord,
  MorphEquationRecord,
  MorphRecord,
  MoveAlongRecord,
  MoveByRecord,
  RotateRecord,
  ScaleRecord,
} from './figure/animation-record.js';
export { Timeline } from './figure/timeline.js';
export type { Entry, PlayOptions, Span, StaggerOptions } from './figure/timeline.js';
export { lengthOf, pointAlong } from './figure/length.js';
export { trimPath } from './figure/trim.js';
export { alignPaths, lerpPath } from './figure/morph.js';
export { durationOf, extentAt, isLoop, marksAt, sameMarks, viewAt } from './figure/figure.js';
export { frameTimesOf, framesOf } from './figure/frames.js';
export type { Frame, FrameStep, FramesOptions } from './figure/frames.js';
export type { Figure, TrackValues } from './figure/figure.js';
export { paintSvg, pathToData, svgElements, svgMarkup } from './paint/svg.js';
export type { ElementMaker, PaintNode, PaintTarget, SvgColour, SvgElement, SvgMarkupOptions, SvgTheme } from './paint/svg.js';
export { paintCanvas } from './paint/canvas.js';
export type { CanvasGradientLike, CanvasLike } from './paint/canvas.js';
export { arrow, brace, bracePath, callout, dot } from './figure/annotate.js';
export type { ArrowOptions, BraceOptions, BracedOptions, CalloutOptions } from './figure/annotate.js';
export { typesetElement } from './figure/typeset.js';
export type { EquationElement } from './figure/typeset.js';
export { equationFromTex, equationNode, equationOf } from './figure/equation.js';
export type { Equation, EquationBox, EquationOptions } from './figure/equation.js';
export { glyphToken, matchGlyphs } from './figure/equation-match.js';
export type { GlyphMatch } from './figure/equation-match.js';
