import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {europeCodes,europePlaces} from '../lib/world-explorer/europe';

/** UR-632: scenery water never covers the walking route. Every European level
 * that has water keeps its surface below the lowest platform of the route. */
const wet=europeCodes.filter(code=>'water' in europePlaces[code].scene&&europePlaces[code].scene.water);
describe.each(wet)('%s keeps its water below the route',code=>{
 it('has the water surface under every platform',async()=>{
  const level=levelDefinitionFor(code),finish=level.platforms.find(p=>p.id===level.finish.platformId)!;
  const environment=await loadCountryEnvironment('europe-'+europePlaces[code].iso2.toLowerCase());expect(environment).toBeTruthy();
  const scene=new T.Scene(),mounted=environment!.mount({scene,level,finish:finish.x+finish.width,low:true,reducedMotion:true});
  mounted.root.updateMatrixWorld(true);
  const waterline=mounted.root.userData.waterline as number,lowest=Math.min(...level.platforms.map(p=>p.y));
  expect(waterline).toBeLessThanOrEqual(-2.4);expect(waterline).toBeLessThan(lowest-.4);
  // The lowering moves the whole scenery together, so banks and landmarks keep their place beside the water.
  expect(mounted.root.position.y).toBeCloseTo(waterline+2.4,5);
  mounted.dispose();
 },40000);
});
