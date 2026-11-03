import type {PlatformDefinition} from './game-types';

/** One surface definition for the deck, feet, pickups and respawn markers.
 * Endpoints meet the authored platform height; sag is deepest at the centre.
 * A `slope` rises linearly from `y` at the left edge to `y+slope` at the right;
 * with `steps` the same rise is cut into equal treads, a walkable staircase.
 * Detailed stone meshes never change this stable gameplay walking surface. */
export function platformSurfaceY(platform:Pick<PlatformDefinition,'x'|'y'|'width'>&Partial<Pick<PlatformDefinition,'type'|'sagDepth'|'slope'|'steps'>>,worldX:number):number{
 const t=Math.max(0,Math.min(1,(worldX-platform.x)/platform.width));
 if(platform.slope&&platform.steps&&platform.steps>1)return platform.y+platform.slope*Math.min(platform.steps-1,Math.floor(t*platform.steps))/(platform.steps-1);
 if(platform.slope)return platform.y+platform.slope*t;
 if(platform.type!=='wooden-bridge'||!platform.sagDepth)return platform.y;
 return platform.y-platform.sagDepth*4*t*(1-t);
}
