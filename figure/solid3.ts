/**
 * The four solids a figure names rather than parametrises: a sphere, a cube, a
 * cylinder and a torus.
 *
 * Each is cells over the surface a figure could already have written by hand, so
 * nothing here is new geometry. What it is instead is the parametrisation, which
 * is the part that is easy to write facing inwards: a surface's cells take their
 * shading from which way they face, and a solid whose parameters run the other
 * way round is lit from inside.
 *
 * A cube is six patches, a cylinder is a side and two caps, and a sphere and a
 * torus are one patch each. Every patch of one solid is one list of cells, so a
 * scene sorts a cylinder's cap against its own side rather than painting one
 * whole in front of the other.
 *
 * A sphere's poles and a cylinder's cap centres are places a whole edge of the
 * grid collapses to. Those cells are drawn rather than dropped, since a cell's
 * direction is read from every edge it has and not from two of them.
 */
import { interval } from '../values/interval.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import type { Camera3 } from './camera.js';
import { scene3, type SpaceItem } from './space.js';
import { surfaceCells, type Surface3Options } from './surface3.js';
import type { GroupNode } from './node.js';

/** What a solid takes, which is what a surface takes without the runs of its two
 * parameters. A solid fixes those itself, since a sphere over half of one is not
 * a sphere. */
export type Solid3Options = Omit<Surface3Options, 'over'>;

/** How far round a whole turn goes, so a parametrisation reads the turn rather
 * than the number. */
const TURN = 2 * Math.PI;

/** The cells of every patch of one solid, each patch named after the solid and
 * then after itself, so an animation reaches the whole solid by its own name. */
function patches(
  name: string,
  camera: Camera3,
  options: Solid3Options,
  each: readonly { readonly name: string; readonly of: (u: number, v: number) => Vec3 }[]
): SpaceItem[] {
  return each.flatMap((patch) => surfaceCells(`${name}/${patch.name}`, patch.of, camera, options));
}

/**
 * The cells of a sphere, from its centre and its radius.
 *
 * The first parameter runs once round the axis and the second runs from the pole
 * below the centre to the pole above it, which is the order that leaves every
 * cell facing away from the centre.
 */
export function sphereCells(name: string, centre: Vec3, radius: number, camera: Camera3, options: Solid3Options): SpaceItem[] {
  const at = (u: number, v: number) => {
    const round = TURN * u;
    const down = Math.PI * v;
    return vec3(
      centre.x + radius * Math.cos(round) * Math.sin(down),
      centre.y + radius * Math.sin(round) * Math.sin(down),
      centre.z - radius * Math.cos(down)
    );
  };
  return patches(name, camera, options, [{ name: 'skin', of: at }]);
}

/** A sphere drawn as one scene of its own cells. */
export function sphere3(name: string, centre: Vec3, radius: number, camera: Camera3, options: Solid3Options): GroupNode {
  return scene3(name, sphereCells('face', centre, radius, camera, options), camera);
}

/** The six faces of a cube, each named by the axis it faces and which way along
 * it, and each parametrised so that its cells face away from the middle. */
const FACES: readonly { readonly name: string; readonly at: (u: number, v: number) => Vec3 }[] = [
  { name: 'right', at: (u, v) => vec3(1, u, v) },
  { name: 'left', at: (u, v) => vec3(-1, v, u) },
  { name: 'far', at: (u, v) => vec3(v, 1, u) },
  { name: 'near', at: (u, v) => vec3(u, -1, v) },
  { name: 'top', at: (u, v) => vec3(u, v, 1) },
  { name: 'bottom', at: (u, v) => vec3(v, u, -1) },
];

/**
 * The cells of a cube, from its centre and the length of one edge.
 *
 * Each face runs its two parameters from one edge of the cube to the other, and
 * which of the two runs which way is what puts the face's cells facing out.
 */
export function cubeCells(name: string, centre: Vec3, size: number, camera: Camera3, options: Solid3Options): SpaceItem[] {
  const half = size / 2;
  return patches(
    name,
    camera,
    options,
    FACES.map((face) => ({
      name: face.name,
      of: (u: number, v: number) => {
        const corner = face.at(interval.at(interval(-1, 1), u), interval.at(interval(-1, 1), v));
        return vec3(centre.x + half * corner.x, centre.y + half * corner.y, centre.z + half * corner.z);
      },
    }))
  );
}

/** A cube drawn as one scene of its own cells. */
export function cube3(name: string, centre: Vec3, size: number, camera: Camera3, options: Solid3Options): GroupNode {
  return scene3(name, cubeCells('face', centre, size, camera, options), camera);
}

/**
 * The cells of a cylinder standing on the axis through its centre, from that
 * centre, its radius and its height.
 *
 * The first parameter runs once round the axis on all three patches. The second
 * runs up the side, inwards on the cap above and outwards on the cap below,
 * which is what leaves the two caps facing opposite ways.
 */
export function cylinderCells(
  name: string,
  centre: Vec3,
  radius: number,
  height: number,
  camera: Camera3,
  options: Solid3Options
): SpaceItem[] {
  const half = height / 2;
  const round = (u: number, reach: number, z: number) =>
    vec3(centre.x + reach * Math.cos(TURN * u), centre.y + reach * Math.sin(TURN * u), centre.z + z);
  return patches(name, camera, options, [
    { name: 'side', of: (u, v) => round(u, radius, height * (v - 1 / 2)) },
    { name: 'top', of: (u, v) => round(u, radius * (1 - v), half) },
    { name: 'bottom', of: (u, v) => round(u, radius * v, -half) },
  ]);
}

/** A cylinder drawn as one scene of its own cells. */
export function cylinder3(
  name: string,
  centre: Vec3,
  radius: number,
  height: number,
  camera: Camera3,
  options: Solid3Options
): GroupNode {
  return scene3(name, cylinderCells('face', centre, radius, height, camera, options), camera);
}

/**
 * The cells of a torus lying about the axis through its centre, from that
 * centre, the radius of the ring and the radius of the tube.
 *
 * The first parameter runs once round the ring and the second once round the
 * tube, which is the order that leaves every cell facing away from the tube's own
 * middle.
 */
export function torusCells(
  name: string,
  centre: Vec3,
  ring: number,
  tube: number,
  camera: Camera3,
  options: Solid3Options
): SpaceItem[] {
  const at = (u: number, v: number) => {
    const round = TURN * u;
    const about = TURN * v;
    const reach = ring + tube * Math.cos(about);
    return vec3(centre.x + reach * Math.cos(round), centre.y + reach * Math.sin(round), centre.z + tube * Math.sin(about));
  };
  return patches(name, camera, options, [{ name: 'skin', of: at }]);
}

/** A torus drawn as one scene of its own cells. */
export function torus3(
  name: string,
  centre: Vec3,
  ring: number,
  tube: number,
  camera: Camera3,
  options: Solid3Options
): GroupNode {
  return scene3(name, torusCells('face', centre, ring, tube, camera, options), camera);
}
