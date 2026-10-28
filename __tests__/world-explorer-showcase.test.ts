import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {addCountryShowcase} from '../components/world-explorer/country-showcase';
import {countryProfile} from '../lib/world-explorer/profiles';

describe('Dedicated India, Canada and South Africa scenery',()=>{
 it('keeps the Taj Mahal mausoleum, four minarets and garden distinct',()=>{
  const scene=new T.Group();expect(addCountryShowcase(scene,'IND')).toBe(true);
  const names:string[]=[];scene.traverse(object=>names.push(object.name));
  expect(names.filter(name=>name==='taj-corner-minaret')).toHaveLength(4);
  for(const name of ['taj-central-mausoleum','taj-onion-dome','taj-charbagh-garden','taj-reflecting-pool'])expect(names).toContain(name);
  expect(countryProfile('IND')?.landmarkName).toBe('Taj Mahal');
 });
 it('uses Canadian peaks, a glacial lake and a palmate-antlered moose instead of a generic ruined town',()=>{
  const scene=new T.Group();addCountryShowcase(scene,'CAN');
  expect(scene.getObjectByName('rockies-glacial-lake')).toBeDefined();expect(scene.getObjectByName('canadian-moose')?.userData.species).toBe('Alces alces');
  const peaks:T.Object3D[]=[];scene.traverse(object=>{if(object.name==='rockies-snow-peak')peaks.push(object);});expect(peaks).toHaveLength(5);
  expect(countryProfile('CAN')?.landmarkName).toBe('Canadian Rocky Mountain Parks');
 });
 it('keeps Kruger wildlife in the modeled South African savanna scene',()=>{
  const scene=new T.Group();addCountryShowcase(scene,'ZAF');expect(scene.getObjectByName('kruger-giraffe')).toBeDefined();
  expect(scene.getObjectByName('kruger-african-elephant')?.userData.species).toBe('Loxodonta africana');expect(scene.getObjectByName('kruger-waterhole')).toBeDefined();
  expect(countryProfile('ZAF')?.sourceUrl).toContain('sanparks.org');
 });
 it('keeps every dedicated mesh finite and within the existing scene budget, without taking over other countries',()=>{
  for(const code of ['IND','CAN','ZAF']){
   const scene=new T.Group();addCountryShowcase(scene,code);let vertices=0;
   scene.traverse(object=>{if(object instanceof T.Mesh){const position=object.geometry.getAttribute('position');vertices+=object.geometry.index?object.geometry.index.count:position.count;for(let i=0;i<position.array.length;i++)expect(Number.isFinite(position.array[i])).toBe(true);}});
   expect(vertices).toBeGreaterThan(3000);expect(vertices).toBeLessThan(180000);
   const bounds=new T.Box3().setFromObject(scene),size=bounds.getSize(new T.Vector3());expect(size.x).toBeLessThan(24);expect(size.y).toBeLessThan(14);expect(size.z).toBeLessThan(16);
  }
  const unrelated=new T.Group();expect(addCountryShowcase(unrelated,'JPN')).toBe(false);expect(unrelated.children).toHaveLength(0);
 });
});
