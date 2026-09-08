/**
 * How much of the world a figure shows, and how that lands on a surface.
 *
 * A figure is measured in its own units and never in pixels, so one figure draws
 * at 640 across in a chapter and at 2160 by 3840 in a recording with no second
 * version of the picture and no coordinates rewritten.
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Mark } from './mark.js';

export interface Extent {
  width: number;
  height: number;
  /** Where the middle of the frame sits in the figure's own units, the origin
   * unless named. A figure whose view follows something moves this rather than
   * moving everything it draws. */
  centre?: Vec2;
}

/** Whether the extent is held inside the surface, leaving margins where the
 * shapes differ, or fills it and runs off two edges. */
export type Fit = 'contain' | 'cover';

/** An extent that never changes, or one chosen from the shape of the surface it
 * is about to be drawn on and the time it is drawn at. */
export type ExtentChoice = Extent | ((aspect: number, seconds: number) => Extent);

export function resolveExtent(choice: ExtentChoice, aspect: number, seconds = 0): Extent {
  return typeof choice === 'function' ? choice(aspect, seconds) : choice;
}

/**
 * A change to the view over a span of time.
 *
 * It is handed the extent the entries before it left rather than the one the
 * figure declares, so two view entries over one span compose the way two changes
 * to the marks do. Like an animation it is given how far through its own span
 * the clock is, already eased, which is what makes the view a function of time
 * rather than a record of what has been played.
 *
 * The marks arrive as a getter because a view that follows something has to read
 * where that thing is and most views read nothing. Every painter asks for the
 * marks and the matrix both, so building the marks inside the call that answers
 * for the matrix would build them twice a frame.
 */
export type ViewAnimation = (extent: Extent, along: number, marks: () => readonly Mark[]) => Extent;

/**
 * A view animation as a timeline entry.
 *
 * The wrapper is what lets one span list hold a change to the marks and a change
 * to the view. Both are functions of two arguments and nothing at runtime tells
 * them apart, and one list is what lets `after` and `stagger` sequence a camera
 * move against an entrance.
 */
export interface ViewChange {
  view: ViewAnimation;
}

/**
 * An extent per shape, for a figure whose composition does not survive being
 * reframed.
 *
 * A wide composition put in a square frame is a different picture rather than a
 * cropped one, which is why this chooses an extent rather than cutting a wide
 * frame down. The two thresholds sit between the three shapes anything here is
 * drawn at, which are sixteen by nine at 1.78, square at 1, and nine by sixteen
 * at 0.5625.
 */
export function byAspect(shapes: { wide: Extent; square: Extent; tall: Extent }): (aspect: number) => Extent {
  return (aspect) => {
    if (aspect > 1.15) return shapes.wide;
    if (aspect < 0.87) return shapes.tall;
    return shapes.square;
  };
}

/**
 * An extent that follows the shape of whatever it is drawn on.
 *
 * This is what a figure drawn over something else uses. The height is fixed and
 * the width follows the surface, so `contain` fits it exactly and there are no
 * margins at any shape: a figure over a shader covers the shader, at sixteen by
 * nine and at nine by sixteen alike.
 */
export function matchingAspect(height = 2): (aspect: number) => Extent {
  return (aspect) => ({ width: height * aspect, height });
}

/**
 * A point given as a fraction of the frame rather than in figure units, with
 * nothing at the bottom left and one at the top right.
 *
 * A mark placed this way is in screen space. That is the only placement that is
 * safe over a shader, because putting a mark at a place inside the scene a shader
 * is drawing would need the shader's camera, and nothing can read one.
 */
export function fractionOf(extent: Extent, across: number, up: number): Vec2 {
  const centre = extent.centre ?? vec2(0, 0);
  return vec2(centre.x + (across - 0.5) * extent.width, centre.y + (up - 0.5) * extent.height);
}

/**
 * The one matrix taking figure units onto a surface, with the extent centred.
 *
 * The y axis is flipped, because a figure counts upward the way a graph does and
 * both painters count downward from the top of the surface. Doing it here rather
 * than in each painter is what keeps the two from disagreeing about which way up
 * a picture is.
 */
export function viewMatrix(extent: Extent, fit: Fit, surfaceWidth: number, surfaceHeight: number): Mat3 {
  const byWidth = surfaceWidth / extent.width;
  const byHeight = surfaceHeight / extent.height;
  const scale = fit === 'cover' ? Math.max(byWidth, byHeight) : Math.min(byWidth, byHeight);
  const middle = mat3.translation(vec2(surfaceWidth / 2, surfaceHeight / 2));
  const flip = mat3.scaling(vec2(scale, -scale));
  const seen = extent.centre ?? vec2(0, 0);
  const follow = mat3.translation(vec2(-seen.x, -seen.y));
  return mat3.multiply(mat3.multiply(middle, flip), follow);
}
