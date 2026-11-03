import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {oceaniaCodes,oceaniaPlaces} from '../lib/world-explorer/oceania';
import {authoredDifficulty,levelAvailability,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';
import {collectibleAcceptance} from '../lib/world-explorer/collectible-acceptance';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,routeGraphFor} from '../lib/world-explorer/route-graph';
import {countryProfile} from '../lib/world-explorer/profiles';
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {countryByCode} from '../lib/world-explorer/catalog';
import {oceaniaEnvironment} from '../components/world-explorer/countries/oceania';
import {oceaniaLandmarks} from '../components/world-explorer/countries/oceania-landmarks';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {island} from '../components/world-explorer/scenic-kit';

/** The Oceania adventures, checked the same way as the European batch: one
 * sourced place across title, card, guide and discovery; the design
 * validator and the measured tier; both routes and every collectible at the
 * runtime difficulty across start timings; checkpoints; and scenery that is
 * finite and dressed at the collision surface. */
describe.each(oceaniaCodes)('%s Oceania adventure',code=>{
 const place=oceaniaPlaces[code];
 it('names one sourced place on the title, card, guide and discovery',async()=>{
  expect(countryByCode(code)?.continent).toBe('oceania');
  expect(levelAvailability(code)?.title).toBe(place.title);expect(levelAvailability(code)?.stage).toBe('prototype');
  expect(countryProfile(code)?.levelTitle).toBe(place.title);expect(countryProfile(code)?.landmarkName).toBe(place.landmark);expect(countryProfile(code)?.sourceUrl).toBe(place.source);
  const guide=guideDestination(code)!;expect(guide.place).toBe(place.landmark);expect(guide.fromLevel).toBe(true);expect(guide.landscape).toEqual([...place.features]);
  expect(discoveryFor(code)?.text).toBe(place.fact);expect(discoveryFor(code)?.sourceUrl).toBe(place.source);
  expect(place.source).toMatch(/^https:\/\//);expect(place.fact).toMatch(/fictional/);
  expect(oceaniaLandmarks[place.scene.landmark],place.scene.landmark).toBeTypeOf('function');
  const environment=await loadCountryEnvironment(levelDefinitionFor(code).environmentId!);expect(environment?.id).toBe('oceania-'+place.iso2.toLowerCase());
 });
 it('passes the design validator and measures at the manifest tier with its signature mechanic',()=>{
  const level=levelDefinitionFor(code,authoredDifficulty(code));
  expect(validateLevelDesign(level,{physics:false}).checks.filter(c=>!c.ok)).toEqual([]);
  const report=analyzeDifficulty(level);
  expect(report.measuredTier,report.warnings.join('; ')).toBe(place.tier);
  expect(level.design?.signatureMechanic).toBe(place.signature);expect(level.design?.archetype).toBe(place.archetype);
 });
 it('completes both routes and collects every coin and star without damage at its runtime difficulty',()=>{
  const result=collectibleAcceptance(code);
  expect(result.incomplete.map(r=>`${r.route}@${r.wait}`)).toEqual([]);
  expect(result.cleanRoutes).toEqual(['bonus','main']);
  expect(result.missingCoins).toEqual([]);expect(result.missingStars).toEqual([]);
 },60000);
 it('reaches every checkpoint on the main route',()=>{
  const level=levelDefinitionFor(code,authoredDifficulty(code)),run=playRoute(level,criticalPlatforms(routeGraphFor(level)),{collectCoins:true});
  expect(run.events.filter(e=>e.type==='checkpoint').length).toBeGreaterThanOrEqual(level.checkpoints.length);
  expect(level.checkpoints.length).toBeGreaterThanOrEqual(2);
 },30000);
 it('builds finite scenery within budget and dresses every walking cap at the collision surface',()=>{
  const level=levelDefinitionFor(code),scene=new T.Scene(),environment=oceaniaEnvironment(code),context={scene,level,finish:110,low:true,reducedMotion:true},mounted=environment.mount(context);
  let triangles=0;
  mounted.root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');expect(Array.from(p.array as ArrayLike<number>).every(Number.isFinite)).toBe(true);triangles+=(o.geometry.index?.count??p.count)/3*(o instanceof T.InstancedMesh?o.count:1);}});
  expect(triangles).toBeLessThan(250000);
  for(const p of level.platforms){
   const root=new T.Group();island(root,0,0,p.width,p.depth,'temperate',3,p.thickness);environment.dressPlatform(root,p,context);root.updateMatrixWorld(true);
   const cap=root.getObjectByName('country-platform-cap');if(!cap)continue;
   for(const fraction of [.15,.5,.85]){const x=(fraction-.5)*p.width,expected=platformSurfaceY({...p,x:-p.width/2,y:0},x),hits=new T.Raycaster(new T.Vector3(x,expected+5,0),new T.Vector3(0,-1,0)).intersectObject(cap);expect(hits.length,p.id).toBeGreaterThan(0);expect(hits[0].point.y,p.id).toBeCloseTo(expected,1);}
  }
  mounted.dispose();
 },30000);
});
