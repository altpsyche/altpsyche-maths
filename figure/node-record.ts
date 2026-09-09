/**
 * The tree an author builds, written as data rather than as calls.
 *
 * A record is a kind, a name and its parameters, and a group's children are
 * records. `shape`, `text` and `group` are the three kinds the tree itself has,
 * and every other kind resolves into a tree of those three, so `resolveNode`
 * hands back the `Node` that `flatten` already walks and nothing below that line
 * moves.
 *
 * A record carries no functions, which is the whole point of it: the same tree
 * survives being written to a file and read back. A shape's path is a record of
 * its own, either a named form with parameters or its cubics written out.
 *
 * Text is the one kind whose parameter is not a value the format already has. A
 * drawn string is a word beside a formatted number and the expression form is
 * over numbers and points alone, so a text record's content is a template with
 * numbered holes and one expression per hole, each hole carrying the precision
 * it is written to.
 *
 * A text size is a plain number rather than an expression. A figure that grows a
 * label does it with `scale` over the marks, which is what the animation
 * vocabulary already carries, so a size that follows a track would be a second
 * way to say the same thing.
 *
 * A graph frame's options are the values the calls already take rather than
 * expressions. A frame is the furniture a figure draws its moving parts on and no
 * demo animates a tick length, and widening a number to an expression later costs
 * a minor rather than a major, since a bare number is a literal already.
 */
import type { Mat3 } from '../values/mat3.js';
import type { Vec2 } from '../values/vec2.js';
import type { Vec3 } from '../values/vec3.js';
import { interval, type Interval } from '../values/interval.js';
import { curveOf, resolvePath, spanOf, type IntervalRecord, type PathRecord } from './path-record.js';
import { group, shape, text, type Node, type Style, type TextOptions } from './node.js';
import { arrow, brace, callout, dot } from './annotate.js';
import { axes, numberLine, numberPlane, type AxesOptions, type NumberLineOptions, type NumberPlaneOptions } from './axis.js';
import { riemannBars, type BarsOptions } from './plot.js';
import { equationNode, type Equation, type EquationOptions } from './equation.js';
import { vectorField, type VectorFieldOptions } from './field.js';
import { arrow3, dot3, polyline3, scene3, text3, type Arrow3Options, type Polyline3Options, type SpaceItem, type Text3Options } from './space.js';
import { axes3, type Axes3Options } from './axis3.js';
import { surface3, surfaceCells, type Surface3Options } from './surface3.js';
import { cubeCells, cylinderCells, sphereCells, torusCells, type Solid3Options } from './solid3.js';
import { fieldArrows3, vectorField3, type VectorField3Options } from './field3.js';
import { sectionOf, type SectionOptions } from './section.js';
import { streamlineOf, type StreamlineOptions } from './streamline.js';
import type { Camera3 } from './camera.js';
import { resolveCamera, resolvePoint3, type Camera3Record, type Point3Record } from './camera-record.js';
import type { Colour } from './mark.js';
import type { Coords, Scale } from './scale.js';
import type { Fill, Stop, Stroke } from './mark.js';
import { asNumber, asPoint, evaluate, type Bindings, type Expression } from './expression.js';
import { labelFor } from './ticks.js';

/** One number written into a template, and how it is written. */
export interface TextHole {
  readonly value: Expression;
  /** The step the number is rounded and padded to, the way a tick's label takes
   * one, so a hole following a track keeps its width as the number moves. */
  readonly precision: number;
}

/** Text with numbered holes, `{0}` for the first hole and `{1}` for the second.
 * `{{` writes one brace, which is what leaves a set in braces writable. */
export interface TextTemplate {
  readonly template: string;
  readonly holes: readonly TextHole[];
}

/** What a text record draws. A string with no holes is written as itself, which
 * keeps the common case one value rather than a record wrapping one value. */
export type TextContent = string | TextTemplate;

export interface ShapeRecord {
  readonly kind: 'shape';
  readonly name: string;
  readonly path: PathRecord;
  readonly style?: Style;
}

export interface TextRecord {
  readonly kind: 'text';
  readonly name: string;
  /** Where the string is hung from, as an expression, since a reading placed
   * against a frame that follows a dot moves as the view does. */
  readonly at: Expression;
  readonly content: TextContent;
  readonly size: number;
  readonly options?: TextOptions;
}

export interface GroupRecord {
  readonly kind: 'group';
  readonly name: string;
  readonly children: readonly NodeRecord[];
  readonly transform?: Mat3;
  readonly style?: Style;
}

/** What an arrow takes beyond its two ends. */
export interface ArrowRecordOptions {
  readonly stroke: Stroke;
  readonly fill?: Fill;
  readonly head?: Expression;
  readonly spread?: Expression;
}

/** What a brace with a word on it takes beyond its two points and its content. */
export interface BraceRecordOptions {
  readonly stroke: Stroke;
  readonly fill: Fill;
  readonly size: number;
  readonly depth: Expression;
  readonly curl?: Expression;
  readonly padding?: Expression;
  readonly align?: TextOptions['align'];
  readonly baseline?: TextOptions['baseline'];
  readonly family?: string;
  readonly weight?: number;
}

/** What a callout takes beyond the place it names, where its word sits and its
 * content. */
export interface CalloutRecordOptions {
  readonly stroke: Stroke;
  readonly fill: Fill;
  readonly size: number;
  readonly marker?: Expression;
  readonly align?: TextOptions['align'];
  readonly baseline?: TextOptions['baseline'];
  readonly family?: string;
  readonly weight?: number;
}

export interface DotRecord {
  readonly kind: 'dot';
  readonly name: string;
  readonly at: Expression;
  readonly radius: Expression;
  readonly fill: Fill;
}

export interface ArrowRecord {
  readonly kind: 'arrow';
  readonly name: string;
  readonly from: Expression;
  readonly to: Expression;
  readonly options: ArrowRecordOptions;
}

export interface BraceRecord {
  readonly kind: 'brace';
  readonly name: string;
  readonly from: Expression;
  readonly to: Expression;
  readonly content: TextContent;
  readonly options: BraceRecordOptions;
}

export interface CalloutRecord {
  readonly kind: 'callout';
  readonly name: string;
  readonly at: Expression;
  readonly to: Expression;
  readonly content: TextContent;
  readonly options: CalloutRecordOptions;
}

/**
 * What a run of bars takes beyond its coordinates and its curve.
 *
 * The run it covers is an `IntervalRecord`, since a figure that walks the bars
 * across a graph moves both ends of it. Everything else a bar carries is
 * layout.
 */
export interface BarsRecordOptions extends Omit<BarsOptions, 'over'> {
  readonly over?: IntervalRecord;
}

export interface NumberLineRecord {
  readonly kind: 'numberLine';
  readonly name: string;
  readonly scale: Scale;
  readonly options: NumberLineOptions;
}

export interface AxesRecord {
  readonly kind: 'axes';
  readonly name: string;
  readonly coords: Coords;
  readonly options: AxesOptions;
}

export interface NumberPlaneRecord {
  readonly kind: 'numberPlane';
  readonly name: string;
  readonly coords: Coords;
  readonly options: NumberPlaneOptions;
}

export interface RiemannBarsRecord {
  readonly kind: 'riemannBars';
  readonly name: string;
  readonly coords: Coords;
  /** The curve the bars stand under, as an expression of the bound variable `x`. */
  readonly of: Expression;
  readonly options?: BarsRecordOptions;
}

/**
 * What a typeset expression takes beyond its geometry.
 *
 * The place it is hung from is an expression, since the flat demo hangs its two
 * rules off a frame that follows the dot. The box it is fitted inside is layout.
 */
export interface EquationRecordOptions extends Omit<EquationOptions, 'at'> {
  readonly at: Expression;
}

/**
 * A typeset expression in a figure.
 *
 * The `equation` is resolved geometry, one path per glyph with the box round
 * them, rather than the TeX it was typeset from. That is the answer to where
 * text's geometry is settled: a figure carries what MathJax produced, so a
 * renderer draws the expression without MathJax and two machines draw the same
 * glyphs.
 */
export interface EquationRecord {
  readonly kind: 'equationNode';
  readonly name: string;
  readonly equation: Equation;
  readonly options: EquationRecordOptions;
}

/**
 * What colour a thing read off a magnitude takes.
 *
 * A bare colour is a constant, which keeps the common case one value. A `bands`
 * choice is a first colour and a list of thresholds, each with the colour that
 * holds above it, read in order so the last threshold a magnitude clears is the
 * one that decides. The expression form is over numbers and points and has no
 * colour, which is why this is a form of its own rather than an expression.
 */
export type ColourChoice =
  | Colour
  | {
      readonly kind: 'bands';
      readonly first: Colour;
      readonly then: readonly { readonly above: Expression; readonly colour: Colour }[];
    };

/**
 * What a field takes beyond its coordinates and the field itself.
 *
 * An arrow's length is an expression of the bound variable `magnitude`, which
 * already spells the three forms a field wants: a constant is a literal, a
 * saturating length is arithmetic, and a threshold is a choice on a comparison.
 * Its colour is a `ColourChoice` because the vocabulary has no colour.
 */
export interface FieldRecordOptions extends Omit<VectorFieldOptions, 'lengthOf' | 'colourFor'> {
  readonly lengthOf: Expression;
  readonly colourFor: ColourChoice;
}

export interface VectorFieldRecord {
  readonly kind: 'vectorField';
  readonly name: string;
  readonly coords: Coords;
  /** The field, as an expression of the bound variable `at`, which is the place
   * being sampled, giving the vector there. */
  readonly of: Expression;
  readonly options: FieldRecordOptions;
}

/**
 * One piece of a scene in space: the places its depth is measured from, and the
 * node drawn for it.
 *
 * A scene sorts its pieces by the mean of their own depths, so the points are
 * what order the piece rather than anything the node carries.
 */
export interface SpaceItemRecord {
  readonly points: readonly Point3Record[];
  readonly node: NodeRecord;
}

export interface Polyline3Record {
  readonly kind: 'polyline3';
  readonly name: string;
  readonly points: readonly Point3Record[];
  readonly camera: Camera3Record;
  readonly options?: Polyline3Options;
}

export interface Dot3Record {
  readonly kind: 'dot3';
  readonly name: string;
  readonly at: Point3Record;
  readonly radius: Expression;
  readonly fill: Fill;
  readonly camera: Camera3Record;
}

export interface Text3Record {
  readonly kind: 'text3';
  readonly name: string;
  readonly at: Point3Record;
  readonly content: TextContent;
  readonly size: number;
  readonly camera: Camera3Record;
  readonly options?: Text3Options;
}

export interface Arrow3Record {
  readonly kind: 'arrow3';
  readonly name: string;
  readonly from: Point3Record;
  readonly to: Point3Record;
  readonly camera: Camera3Record;
  readonly options: ArrowRecordOptions;
}

export interface Scene3Record {
  readonly kind: 'scene3';
  readonly name: string;
  readonly items: readonly SceneItemRecord[];
  readonly camera: Camera3Record;
}

export interface Axes3Record {
  readonly kind: 'axes3';
  readonly name: string;
  readonly camera: Camera3Record;
  readonly options: Axes3Options;
}

/**
 * A fill whose gradient runs between two places an expression gives.
 *
 * Every `Fill` is one of these already, since a fixed place is a literal
 * expression. What it adds is a wash whose axis moves: the solid demo's pane runs
 * its wash along the recession from the eye, and both ends of that axis are
 * places in space projected through the camera as it turns.
 *
 * A record carrying a fill of its own takes one of these where a figure moves it.
 * The rest stay plain fills until a demo asks.
 */
export interface FillRecord extends Omit<Fill, 'gradient'> {
  readonly gradient?: {
    readonly from: Expression;
    readonly to: Expression;
    readonly stops: readonly Stop[];
  };
}

/**
 * What colour a cell of a surface is filled with, read off how squarely the cell
 * faces the light.
 *
 * A ramp is a list of fills read as even steps from nothing to one, and the band
 * is the stretch of that amount the ramp is spread over. Every normal of a
 * surface drawn over a plane has a positive z, so a light with a positive z
 * reaches part of the ramp alone, and a band spreads the whole ramp over the part
 * the surface uses.
 *
 * A ramp rather than a function is what the format can carry: the shading a cell
 * takes is a number and the vocabulary of expressions has no colour, so the
 * steps are written out and the amount picks one.
 */
export interface ShadeRecord {
  readonly ramp: readonly FillRecord[];
  /** The stretch of the amount the ramp covers, nothing to one unless named. */
  readonly band?: Interval;
}

/** What a surface takes beyond its own places and its camera. The light is a
 * place in space, so a figure that moves the light writes it as three
 * expressions. */
export interface Surface3RecordOptions extends Omit<Surface3Options, 'shade' | 'light'> {
  readonly shade: ShadeRecord;
  readonly light?: Point3Record;
}

export interface Surface3Record {
  readonly kind: 'surface3';
  readonly name: string;
  /** The surface, as a place in space read from the bound variables `u` and `v`. */
  readonly of: Point3Record;
  readonly camera: Camera3Record;
  readonly options: Surface3RecordOptions;
}

/**
 * The cells of a surface, for a scene that sorts them among pieces of its own.
 *
 * This carries no camera and takes the scene's, since pieces sorted together are
 * seen from one place, and a producer inside a scene is where a surface that
 * shares a sort with a second surface is written.
 */
export interface SurfaceCellsRecord {
  readonly kind: 'surfaceCells';
  readonly name: string;
  readonly of: Point3Record;
  readonly options: Surface3RecordOptions;
}

/** What a solid takes, which is what a surface takes without the runs of its two
 * parameters. A solid fixes those itself, since a sphere over half of one is not
 * a sphere. */
export type Solid3RecordOptions = Omit<Surface3RecordOptions, 'over'>;

/** What every solid carries beyond its own measurements: where it stands, how it
 * is shaded, and, where it is drawn on its own rather than sorted with a scene,
 * the camera it is seen from. */
interface Solid3Fields {
  readonly name: string;
  readonly centre: Point3Record;
  readonly options: Solid3RecordOptions;
}

export interface SphereFields extends Solid3Fields {
  readonly radius: Expression;
}

export interface CubeFields extends Solid3Fields {
  /** The length of one edge, so a cube is a cube rather than a box. */
  readonly size: Expression;
}

export interface CylinderFields extends Solid3Fields {
  readonly radius: Expression;
  readonly height: Expression;
}

export interface TorusFields extends Solid3Fields {
  /** How far the middle of the tube stands from the axis. */
  readonly ring: Expression;
  /** How thick the tube is. */
  readonly tube: Expression;
}

export interface Sphere3Record extends SphereFields {
  readonly kind: 'sphere3';
  readonly camera: Camera3Record;
}

export interface SphereCellsRecord extends SphereFields {
  readonly kind: 'sphereCells';
}

export interface Cube3Record extends CubeFields {
  readonly kind: 'cube3';
  readonly camera: Camera3Record;
}

export interface CubeCellsRecord extends CubeFields {
  readonly kind: 'cubeCells';
}

export interface Cylinder3Record extends CylinderFields {
  readonly kind: 'cylinder3';
  readonly camera: Camera3Record;
}

export interface CylinderCellsRecord extends CylinderFields {
  readonly kind: 'cylinderCells';
}

export interface Torus3Record extends TorusFields {
  readonly kind: 'torus3';
  readonly camera: Camera3Record;
}

export interface TorusCellsRecord extends TorusFields {
  readonly kind: 'torusCells';
}

/**
 * What a field in space takes beyond its own vectors and its camera.
 *
 * An arrow's length is an expression of the bound variable `magnitude`, the way a
 * flat field's is, and it is in the world's own units rather than the page's.
 */
export interface Field3RecordOptions extends Omit<VectorField3Options, 'lengthOf' | 'colourFor'> {
  readonly lengthOf: Expression;
  readonly colourFor: ColourChoice;
}

/** The arrows of a field in space, for a scene that sorts them among pieces of
 * its own. The camera is the scene's, the way a surface's cells take it. */
export interface FieldArrows3Record {
  readonly kind: 'fieldArrows3';
  readonly name: string;
  /** The field, as a vector read from the bound variables `x`, `y` and `z`, which
   * are the place being sampled. */
  readonly of: Point3Record;
  readonly options: Field3RecordOptions;
}

export interface VectorField3Record {
  readonly kind: 'vectorField3';
  readonly name: string;
  readonly of: Point3Record;
  readonly camera: Camera3Record;
  readonly options: Field3RecordOptions;
}

/** A flat plane in space: a place it passes through, and which way it faces. */
export interface PlaneRecord {
  readonly point: Point3Record;
  readonly normal: Point3Record;
}

/**
 * The curve where a plane cuts a surface, as the parameters it is found from.
 *
 * What this describes is runs of places in space rather than a node, so
 * `resolveSection` hands back points and `Section3Record` is the node that draws
 * them.
 */
export interface SectionRecord {
  /** The surface, read from the bound variables `u` and `v`. */
  readonly of: Point3Record;
  readonly plane: PlaneRecord;
  readonly options?: SectionOptions;
}

export interface Section3Record {
  readonly kind: 'section3';
  readonly name: string;
  readonly curve: SectionRecord;
  readonly camera: Camera3Record;
  /** How each run of the curve is drawn. */
  readonly options?: Polyline3Options;
  readonly style?: Style;
}

/**
 * A run walked through a flat field from a seed, as the parameters it is walked
 * from.
 *
 * The step and the cap are plain numbers rather than expressions. A step that
 * followed a track would hand back a different number of points at every time,
 * and a morph pairs two runs up by their points.
 */
export interface StreamlineRecord {
  /** The field, as a vector read from the bound variable `at`. */
  readonly of: Expression;
  readonly from: Expression;
  readonly options: StreamlineOptions;
}

/**
 * Runs walked through a flat field and lifted onto a surface.
 *
 * Each run is walked in the two parameters of the surface, so the surface reads
 * the point a run lands on as its own `u` and `v`. A run drawn in a plane is that
 * plane written as a surface, so there is no second form for one.
 */
export interface Streamline3Record {
  readonly kind: 'streamline3';
  readonly name: string;
  readonly runs: readonly StreamlineRecord[];
  /** The surface the runs stand on, read from `u` and `v`. */
  readonly on: Point3Record;
  readonly camera: Camera3Record;
  /** How each run is drawn. */
  readonly options?: Polyline3Options;
  readonly style?: Style;
}

/**
 * One entry of a scene: a piece written out, or a producer of many pieces.
 *
 * A producer carries a kind and a written-out piece carries none, so a scene
 * written before the producers existed still reads.
 */
export type SceneItemRecord =
  | SpaceItemRecord
  | SurfaceCellsRecord
  | FieldArrows3Record
  | SphereCellsRecord
  | CubeCellsRecord
  | CylinderCellsRecord
  | TorusCellsRecord;

export type NodeRecord =
  | ShapeRecord
  | TextRecord
  | GroupRecord
  | DotRecord
  | ArrowRecord
  | BraceRecord
  | CalloutRecord
  | NumberLineRecord
  | AxesRecord
  | NumberPlaneRecord
  | RiemannBarsRecord
  | EquationRecord
  | VectorFieldRecord
  | Polyline3Record
  | Dot3Record
  | Text3Record
  | Arrow3Record
  | Scene3Record
  | Axes3Record
  | Surface3Record
  | Sphere3Record
  | Cube3Record
  | Cylinder3Record
  | Torus3Record
  | VectorField3Record
  | Section3Record
  | Streamline3Record;

/** A hole and everything up to it, or a doubled brace. The alternation is
 * ordered so `{{0}` reads as a brace before a hole rather than as a hole. */
const HOLE = /\{\{|\{(\d+)\}/g;

/**
 * A template with its holes filled, each hole written to its own precision.
 *
 * A hole naming an index the list has no entry for is refused rather than left
 * standing, since a template short of a hole would otherwise draw its own
 * notation into the picture.
 */
export function writeTemplate(content: TextContent, bindings: Bindings = {}): string {
  if (typeof content === 'string') return content;
  return content.template.replace(HOLE, (whole, digits: string | undefined) => {
    if (digits === undefined) return '{';
    const at = Number(digits);
    const hole = content.holes[at];
    if (!hole) throw new Error(`the template asks for hole ${at} and carries ${content.holes.length}`);
    return labelFor(asNumber(evaluate(hole.value, bindings), `hole ${at}`), hole.precision);
  });
}

const numberOf = (expression: Expression, bindings: Bindings, what: string): number =>
  asNumber(evaluate(expression, bindings), what);

const pointOf = (expression: Expression, bindings: Bindings, what: string): Vec2 =>
  asPoint(evaluate(expression, bindings), what);

/** Values bound under their names for the reading of an inner expression, so a
 * field sampled at a place, an arrow sized off a magnitude and a surface read
 * from its two parameters each see their own variables over the outer
 * bindings. */
const binding = (bindings: Bindings, values: Record<string, number | Vec2>): Bindings => ({
  ...bindings,
  variables: { ...bindings.variables, ...values },
});

/** The field as the function `vectorField` samples, from an expression of the
 * bound variable `at`. */
const fieldOf = (expression: Expression, bindings: Bindings) => (at: Vec2): Vec2 =>
  pointOf(expression, binding(bindings, { at }), 'a field');

/** An arrow's length from an expression of the bound variable `magnitude`. */
const lengthFrom = (expression: Expression, bindings: Bindings) => (magnitude: number): number =>
  numberOf(expression, binding(bindings, { magnitude }), "an arrow's length");

/**
 * An arrow's colour from a choice.
 *
 * The bands are walked in order rather than searched, so the last threshold a
 * magnitude clears is the one that decides and a list written out of order still
 * has one answer.
 */
function colourFrom(choice: ColourChoice, bindings: Bindings) {
  if (!('kind' in choice)) return () => choice;
  return (magnitude: number): Colour => {
    const inner = binding(bindings, { magnitude });
    let colour = choice.first;
    for (const band of choice.then) {
      if (magnitude > numberOf(band.above, inner, "a colour band's threshold")) colour = band.colour;
    }
    return colour;
  };
}

/** The stretch of an amount a shade's ramp covers when its record names no
 * band. */
const WHOLE = interval(0, 1);

/** A surface as `surfaceCells` samples it, from a place in space read from the
 * bound variables `u` and `v`. */
const surfaceOf = (record: Point3Record, bindings: Bindings) => (u: number, v: number): Vec3 =>
  resolvePoint3(record, binding(bindings, { u, v }), 'a place on a surface');

/** A field in space as `fieldArrows3` samples it, from a vector read from the
 * bound variables `x`, `y` and `z`. */
const field3Of = (record: Point3Record, bindings: Bindings) => (at: Vec3) =>
  resolvePoint3(record, binding(bindings, { x: at.x, y: at.y, z: at.z }), 'a field in space');

/**
 * The shading as `surfaceCells` calls it: the amount spread from the band over
 * the whole ramp, then rounded to the nearest step of it.
 *
 * A ramp with no colours in it is refused, since every cell is filled with one.
 */
function shadeFrom(record: ShadeRecord, bindings: Bindings): (amount: number) => Fill {
  const last = record.ramp.length - 1;
  if (last < 0) throw new Error('a shade is a ramp of at least one colour');
  const ramp = record.ramp.map((fill) => fillOf(fill, bindings));
  return (amount) => {
    const spread = record.band ? interval.remap(amount, record.band, WHOLE) : amount;
    return ramp[Math.max(0, Math.min(last, Math.round(spread * last)))];
  };
}

/** A fill with the ends of its gradient read, which is the fill itself where it
 * has none. */
function fillOf(record: FillRecord, bindings: Bindings): Fill {
  const { gradient, ...rest } = record;
  if (!gradient) return rest;
  return {
    ...rest,
    gradient: {
      ...gradient,
      from: pointOf(gradient.from, bindings, "the start of a gradient"),
      to: pointOf(gradient.to, bindings, "the end of a gradient"),
    },
  };
}

/** What a surface's own call takes, from what its record carries. */
const surfaceOptions = (options: Surface3RecordOptions, bindings: Bindings): Surface3Options => ({
  ...options,
  shade: shadeFrom(options.shade, bindings),
  light: options.light ? resolvePoint3(options.light, bindings, "a surface's light") : undefined,
});

/** What a field in space takes, from what its record carries. */
/** What a solid takes, from what its record carries, which is the surface's own
 * reading without the runs a solid fixes for itself. */
const solidOptions = (options: Solid3RecordOptions, bindings: Bindings): Solid3Options => ({
  ...options,
  shade: shadeFrom(options.shade, bindings),
  light: options.light ? resolvePoint3(options.light, bindings, "a solid's light") : undefined,
});

/** Where a solid stands and how it is shaded, which every one of the four reads
 * the same way before its own measurements. */
const solidStands = (record: SphereFields | CubeFields | CylinderFields | TorusFields, bindings: Bindings) =>
  ({
    centre: resolvePoint3(record.centre, bindings, "a solid's centre"),
    options: solidOptions(record.options, bindings),
  });

/** The cells of one solid, whichever of the four it is, for a scene that sorts
 * them among pieces of its own or for a scene of the solid alone. */
function solidCells(
  record: SphereCellsRecord | CubeCellsRecord | CylinderCellsRecord | TorusCellsRecord | Sphere3Record | Cube3Record | Cylinder3Record | Torus3Record,
  camera: Camera3,
  bindings: Bindings
): SpaceItem[] {
  const { centre, options } = solidStands(record, bindings);
  const measure = (expression: Expression, what: string) => numberOf(expression, bindings, what);
  switch (record.kind) {
    case 'sphere3':
    case 'sphereCells':
      return sphereCells(record.name, centre, measure(record.radius, "a sphere's radius"), camera, options);
    case 'cube3':
    case 'cubeCells':
      return cubeCells(record.name, centre, measure(record.size, "a cube's size"), camera, options);
    case 'cylinder3':
    case 'cylinderCells':
      return cylinderCells(
        record.name,
        centre,
        measure(record.radius, "a cylinder's radius"),
        measure(record.height, "a cylinder's height"),
        camera,
        options
      );
    default:
      return torusCells(
        record.name,
        centre,
        measure(record.ring, "a torus's ring"),
        measure(record.tube, "a torus's tube"),
        camera,
        options
      );
  }
}

const field3Options = (options: Field3RecordOptions, bindings: Bindings): VectorField3Options => ({
  ...options,
  lengthOf: lengthFrom(options.lengthOf, bindings),
  colourFor: colourFrom(options.colourFor, bindings),
});

/**
 * The runs of points where a plane cuts a surface, from the record naming both.
 *
 * A run whose two ends meet comes back with its first point repeated at the end,
 * the way the call it stands for hands one back.
 */
export function resolveSection(record: SectionRecord, bindings: Bindings = {}): Vec3[][] {
  return sectionOf(
    surfaceOf(record.of, bindings),
    {
      point: resolvePoint3(record.plane.point, bindings, "a place the plane passes through"),
      normal: resolvePoint3(record.plane.normal, bindings, 'which way a plane faces'),
    },
    record.options
  );
}

/** The points a run through a flat field passes, from the record naming the field
 * and the seed. */
export function resolveStreamline(record: StreamlineRecord, bindings: Bindings = {}): Vec2[] {
  return streamlineOf(fieldOf(record.of, bindings), pointOf(record.from, bindings, "a run's seed"), record.options);
}

/**
 * The pieces one entry of a scene stands for: one for a piece written out, and
 * as many as the grid holds for a producer.
 *
 * A producer takes the scene's own camera, so a surface and a field sorted
 * together are seen from one place and neither carries a pose of its own.
 */
function resolveItems(item: SceneItemRecord, camera: Camera3, bindings: Bindings): SpaceItem[] {
  if (!('kind' in item)) {
    return [
      {
        points: item.points.map((point) => resolvePoint3(point, bindings, 'a point of a piece in space')),
        node: resolveNode(item.node, bindings),
      },
    ];
  }
  if (item.kind === 'surfaceCells') {
    return surfaceCells(item.name, surfaceOf(item.of, bindings), camera, surfaceOptions(item.options, bindings));
  }
  if (item.kind === 'fieldArrows3') {
    return fieldArrows3(item.name, field3Of(item.of, bindings), camera, field3Options(item.options, bindings));
  }
  if (
    item.kind === 'sphereCells' ||
    item.kind === 'cubeCells' ||
    item.kind === 'cylinderCells' ||
    item.kind === 'torusCells'
  ) {
    return solidCells(item, camera, bindings);
  }
  throw new Error(`a scene has no piece called ${String((item as { kind?: unknown }).kind)}`);
}

/** An optional parameter read where it is given and left out where it is not, so
 * the call falls back on its own default rather than on a number repeated here. */
const maybe = (expression: Expression | undefined, bindings: Bindings, what: string): number | undefined =>
  expression === undefined ? undefined : numberOf(expression, bindings, what);

/**
 * A record walked into the node it describes.
 *
 * The bindings reach every expression a record carries: the text holes, the
 * parameters of every path, and the places and distances an annotation is built
 * from. A tree of literals needs no bindings at all.
 *
 * The four annotations resolve through their own calls rather than by rebuilding
 * what those calls build, so a brace's curls and an arrow's head are one piece of
 * arithmetic with one set of gates over it.
 */
export function resolveNode(record: NodeRecord, bindings: Bindings = {}): Node {
  switch (record.kind) {
    case 'shape':
      return shape(record.name, resolvePath(record.path, bindings), record.style);
    case 'text':
      return text(
        record.name,
        pointOf(record.at, bindings, "a text's place"),
        writeTemplate(record.content, bindings),
        record.size,
        record.options
      );
    case 'group':
      return group(
        record.name,
        record.children.map((child) => resolveNode(child, bindings)),
        { transform: record.transform, style: record.style }
      );
    case 'dot':
      return dot(
        record.name,
        pointOf(record.at, bindings, "a dot's place"),
        numberOf(record.radius, bindings, "a dot's radius"),
        record.fill
      );
    case 'arrow':
      return arrow(
        record.name,
        pointOf(record.from, bindings, "an arrow's start"),
        pointOf(record.to, bindings, "an arrow's end"),
        {
          stroke: record.options.stroke,
          fill: record.options.fill,
          head: maybe(record.options.head, bindings, "an arrow's head"),
          spread: maybe(record.options.spread, bindings, "an arrow's spread"),
        }
      );
    case 'brace':
      return brace(
        record.name,
        pointOf(record.from, bindings, "a brace's first point"),
        pointOf(record.to, bindings, "a brace's last point"),
        writeTemplate(record.content, bindings),
        {
          ...record.options,
          depth: numberOf(record.options.depth, bindings, "a brace's depth"),
          curl: maybe(record.options.curl, bindings, "a brace's curl"),
          padding: maybe(record.options.padding, bindings, "a brace's padding"),
        }
      );
    case 'callout':
      return callout(
        record.name,
        pointOf(record.at, bindings, "a callout's place"),
        pointOf(record.to, bindings, "where a callout's word sits"),
        writeTemplate(record.content, bindings),
        { ...record.options, marker: maybe(record.options.marker, bindings, "a callout's marker") }
      );
    case 'equationNode':
      return equationNode(record.name, record.equation, {
        ...record.options,
        at: pointOf(record.options.at, bindings, "an equation's place"),
      });
    case 'polyline3':
      return polyline3(
        record.name,
        record.points.map((point) => resolvePoint3(point, bindings, 'a point of a run in space')),
        resolveCamera(record.camera, bindings),
        record.options
      );
    case 'dot3':
      return dot3(
        record.name,
        resolvePoint3(record.at, bindings, "a dot's place in space"),
        numberOf(record.radius, bindings, "a dot's radius"),
        record.fill,
        resolveCamera(record.camera, bindings)
      );
    case 'text3':
      return text3(
        record.name,
        resolvePoint3(record.at, bindings, 'where a label in space stands'),
        writeTemplate(record.content, bindings),
        record.size,
        resolveCamera(record.camera, bindings),
        record.options
      );
    case 'arrow3':
      return arrow3(
        record.name,
        resolvePoint3(record.from, bindings, "an arrow's start in space"),
        resolvePoint3(record.to, bindings, "an arrow's end in space"),
        resolveCamera(record.camera, bindings),
        {
          stroke: record.options.stroke,
          fill: record.options.fill,
          head: maybe(record.options.head, bindings, "an arrow's head"),
          spread: maybe(record.options.spread, bindings, "an arrow's spread"),
        }
      );
    case 'scene3': {
      const camera = resolveCamera(record.camera, bindings);
      return scene3(
        record.name,
        record.items.flatMap((item) => resolveItems(item, camera, bindings)),
        camera
      );
    }
    case 'surface3':
      return surface3(
        record.name,
        surfaceOf(record.of, bindings),
        resolveCamera(record.camera, bindings),
        surfaceOptions(record.options, bindings)
      );
    case 'sphere3':
    case 'cube3':
    case 'cylinder3':
    case 'torus3': {
      const camera = resolveCamera(record.camera, bindings);
      return scene3(record.name, solidCells({ ...record, name: 'face' }, camera, bindings), camera);
    }
    case 'vectorField3':
      return vectorField3(
        record.name,
        field3Of(record.of, bindings),
        resolveCamera(record.camera, bindings),
        field3Options(record.options, bindings)
      );
    case 'section3': {
      const camera = resolveCamera(record.camera, bindings);
      return group(
        record.name,
        resolveSection(record.curve, bindings).map((run, at) => polyline3(`run${at}`, run, camera, record.options)),
        { style: record.style }
      );
    }
    case 'streamline3': {
      const camera = resolveCamera(record.camera, bindings);
      const on = surfaceOf(record.on, bindings);
      return group(
        record.name,
        record.runs.map((run, at) =>
          polyline3(
            `run${at}`,
            resolveStreamline(run, bindings).map((point) => on(point.x, point.y)),
            camera,
            record.options
          )
        ),
        { style: record.style }
      );
    }
    case 'axes3':
      return axes3(record.name, resolveCamera(record.camera, bindings), record.options);
    case 'vectorField':
      return vectorField(record.name, record.coords, fieldOf(record.of, bindings), {
        ...record.options,
        lengthOf: lengthFrom(record.options.lengthOf, bindings),
        colourFor: colourFrom(record.options.colourFor, bindings),
      });
    case 'numberLine':
      return numberLine(record.name, record.scale, record.options);
    case 'axes':
      return axes(record.name, record.coords, record.options);
    case 'numberPlane':
      return numberPlane(record.name, record.coords, record.options);
    case 'riemannBars':
      return riemannBars(record.name, record.coords, curveOf(record.of, bindings), {
        ...record.options,
        over: record.options?.over ? spanOf(record.options.over, bindings, 'a run of bars') : undefined,
      });
  }
  throw new Error(`a node has no kind called ${String((record as { kind?: unknown }).kind)}`);
}
