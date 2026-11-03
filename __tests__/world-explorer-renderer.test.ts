import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {batchStatic,island,palettes,type Biome} from '../components/world-explorer/scenic-kit';
import {countryLandmarks,countryPlatform} from '../components/world-explorer/country-landmarks';
import {localFlagUrl} from '../components/world-explorer/country-platforms';
import {countries} from '../lib/world-explorer/catalog';
import {countryProfile} from '../lib/world-explorer/profiles';
import {countrySurface,routeArchitecture,routeVegetation,groundAppearance} from '../components/world-explorer/route-scenery';

describe('World Explorer real geographic map and modeled scenery',()=>{
 it('bundles real valid polygon coordinates for all seven continents',()=>{
  const geo=JSON.parse(readFileSync(join(process.cwd(),'public/world-explorer/atlas-world.json'),'utf8'));
  expect(geo.source).toContain('Natural Earth');expect(geo.license).toBe('Public domain');
  const continents=new Set<string>();let points=0;
  for(const f of geo.features){
   continents.add(f.properties.continent);const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
   for(const polygon of polygons)for(const ring of polygon){
    expect(ring.length).toBeGreaterThanOrEqual(4);
    for(const [lng,lat] of ring){expect(Number.isFinite(lng)&&Number.isFinite(lat)).toBe(true);expect(Math.abs(lng)).toBeLessThanOrEqual(180.001);expect(Math.abs(lat)).toBeLessThanOrEqual(90);points++;}
   }
  }
  for(const name of ['Africa','Europe','Asia','North America','South America','Oceania','Antarctica'])expect(continents.has(name)).toBe(true);
  expect(points).toBeGreaterThan(5000);
 });
 it('keeps each platform walking cap solid while batching moving scenery in local coordinates',()=>{
  for(const biome of Object.keys(palettes) as Biome[]){
   const scene=new T.Scene(),root=island(scene,14,2.3,4.8,3.4,biome,74),before=new T.Box3().setFromObject(root);
   batchStatic(root);root.updateMatrixWorld(true);const after=new T.Box3().setFromObject(root);
   expect(before.min.distanceTo(after.min)).toBeLessThan(.00001);expect(before.max.distanceTo(after.max)).toBeLessThan(.00001);
   for(const x of [-2,-1,0,1,2]){const ray=new T.Raycaster(new T.Vector3(14+x,10,0),new T.Vector3(0,-1,0));const hit=ray.intersectObject(root,true)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeCloseTo(2.315,3);}
   root.position.x+=1.7;root.updateMatrixWorld(true);const moved=new T.Box3().setFromObject(root);expect(moved.min.x-after.min.x).toBeCloseTo(1.7,4);
  }
 });
 it('builds finite three-dimensional landmarks for every curated introduction',()=>{
  const biomes:Record<string,Biome>={USA:'temperate',BRA:'tropical',FRA:'temperate',EGY:'desert',JPN:'temperate',AUS:'coastal',IND:'temperate',CAN:'alpine',ZAF:'grassland',ANTARCTICA:'alpine'};
  for(const [code,biome] of Object.entries(biomes)){
   const scene=new T.Scene();countryLandmarks(scene,code,biome);const landmark=scene.getObjectByName('country-landmark-'+code);expect(landmark).toBeDefined();
   let count=0;landmark!.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)expect([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)).toBe(true);count+=p.count;});
   expect(count).toBeGreaterThan(1000);const bounds=new T.Box3().setFromObject(landmark!);expect(bounds.max.y-bounds.min.y).toBeGreaterThan(8);expect(bounds.max.x-bounds.min.x).toBeGreaterThan(14);
  }
 });
 it('keeps country-specific rooftops, ruins, gardens and ice on the shared collision plane',()=>{
  const biomes:Record<string,Biome>={USA:'temperate',BRA:'tropical',FRA:'temperate',EGY:'desert',JPN:'temperate',AUS:'coastal',IND:'temperate',CAN:'alpine',ZAF:'grassland',ANTARCTICA:'alpine'};
  for(const [code,biome] of Object.entries(biomes)){
   const scene=new T.Scene(),platform=island(scene,8,1.7,4.6,3.4,biome,21),profile=countryProfile(code)!;countryPlatform(platform,code,4.6,2,profile);countrySurface(platform,profile);routeArchitecture(platform,profile,4.6,2);batchStatic(platform);platform.updateMatrixWorld(true);
   for(let x=-1.9;x<=1.9;x+=.38){const ray=new T.Raycaster(new T.Vector3(8+x,12,0),new T.Vector3(0,-1,0)),hit=ray.intersectObject(platform,true)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeCloseTo(1.715,3);}
  }
 });
 it('keeps city roofs clear of forest props and gives rainforests broadleaf canopy rather than only palms',()=>{
  for(const code of ['USA','FRA','IND']){const root=new T.Group();routeVegetation(root,countryProfile(code)!,0,0,-1,1,7);expect(root.children).toHaveLength(0);}
  const forest=new T.Group();routeVegetation(forest,countryProfile('BRA')!,0,0,-1,1,7);expect(forest.getObjectByName('rainforest-canopy-tree')).toBeDefined();
  expect(groundAppearance(countryProfile('EGY')!)?.roughness).toBe(1);expect(groundAppearance(countryProfile('ZAF')!)?.metalness).toBe(0);expect(groundAppearance(countryProfile('JPN')!)).toBeNull();
 });
 it('retains valid cliff texture coordinates and grain through batching without moving the collision surface',()=>{
  const root=island(new T.Scene(),0,0,5,3.4,'desert',9),profile=countryProfile('EGY')!;countrySurface(root,profile);
  const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;expect(cliff.geometry.getAttribute('uv').count).toBe(cliff.geometry.getAttribute('position').count);expect(cliff.material.bumpMap).toBeInstanceOf(T.DataTexture);
  batchStatic(root);const ray=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));expect(ray.intersectObject(root,true)[0].point.y).toBeCloseTo(.015,3);
 });
 it('keeps UV-free sculpted roofs when their material is also used by textured walls',()=>{
  const root=new T.Group(),material=new T.MeshStandardMaterial({color:'#9b6558'}),roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([-2,2,0,0,4,0,2,2,0],3));roof.computeVertexNormals();root.add(new T.Mesh(roof,material));root.add(new T.Mesh(new T.BoxGeometry(2,2,2),material));
  const before=new T.Box3().setFromObject(root);batchStatic(root);const after=new T.Box3().setFromObject(root);expect(after.max.y).toBe(4);expect(after.min.distanceTo(before.min)).toBeLessThan(.00001);expect(after.max.distanceTo(before.max)).toBeLessThan(.00001);expect(root.children.filter(o=>o instanceof T.Mesh)).toHaveLength(2);
 });
 it('models a bounded, non-empty sourced place for all 193 countries and Antarctica',()=>{
  const codes=[...countries.map(c=>c.code),'ANTARCTICA'];expect(codes).toHaveLength(194);
  for(const code of codes){
   const profile=countryProfile(code);expect(profile).toBeDefined();const scene=new T.Scene(),root=countryLandmarks(scene,code,profile!.biome,profile!);
   expect(root.userData.landmarkName).toBe(profile!.landmarkName);expect(root.userData.landmarkKind).toBe(profile!.landmarkKind);expect(root.userData.representation).toBe('stylized');
   let vertices=0;root.traverse(o=>{if(!(o instanceof T.Mesh))return;const array=o.geometry.getAttribute('position').array;expect(array.every(Number.isFinite)).toBe(true);vertices+=array.length/3;});
   expect(vertices).toBeGreaterThan(1000);expect(vertices).toBeLessThan(180000);const bounds=new T.Box3().setFromObject(root);expect(bounds.isEmpty()).toBe(false);expect(bounds.max.toArray().concat(bounds.min.toArray()).every(Number.isFinite)).toBe(true);expect(bounds.max.length()).toBeLessThan(100);
   const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
 },30000);
 it('uses only safe local ISO flag paths and never invents an Antarctic national flag',()=>{
  expect(localFlagUrl('JP')).toBe('/world-explorer/flags/jp.svg');expect(localFlagUrl('us')).toBe('/world-explorer/flags/us.svg');
  for(const invalid of [undefined,'','USA','../x','<x>'])expect(localFlagUrl(invalid)).toBeNull();expect(localFlagUrl('AQ',true)).toBeNull();
 });
});
