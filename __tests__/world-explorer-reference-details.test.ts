import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {addReferenceDetails,countryDetailSources} from '../components/world-explorer/reference-details';
import {batchStatic} from '../components/world-explorer/scenic-kit';

describe('Country reference model distinctions',()=>{
 it('gives the Sphinx a human head and recumbent lion body, while retaining primary sources',()=>{
  const root=new T.Group();addReferenceDetails(root,'EGY');
  expect(root.getObjectByName('sphinx-human-head')).toBeDefined();expect(root.getObjectByName('sphinx-lion-body')).toBeDefined();
  expect(countryDetailSources.EGY[0]).toContain('egymonuments.gov.eg');
 });
 it('models Amazon broadleaf canopy and the sourced white-throated toucan rather than a generic continental bird',()=>{
  const root=new T.Group();addReferenceDetails(root,'BRA');
  expect(root.getObjectByName('amazon-broadleaf-canopy')).toBeDefined();expect(root.getObjectByName('amazon-round-log-bridge')).toBeDefined();
  expect(root.getObjectByName('white-throated-amazon-toucan')?.userData.species).toBe('Ramphastos tucanus');
 });
 it('distinguishes Paris mansard buildings from Sydney steel arches and four granite pylons',()=>{
  const france=new T.Group(),australia=new T.Group();addReferenceDetails(france,'FRA');addReferenceDetails(australia,'AUS');
  expect(france.getObjectByName('haussmann-mansard-building')).toBeDefined();expect(australia.getObjectByName('sydney-steel-through-arch')).toBeDefined();
  let pylons=0;australia.traverse(o=>{if(o.name==='sydney-granite-pylon')pylons++;});expect(pylons).toBe(4);
 });
 it('keeps all detail meshes finite within the landmark budget and leaves other countries untouched',()=>{
  for(const code of ['EGY','BRA','FRA','AUS']){
   const root=new T.Group();addReferenceDetails(root,code);let vertices=0;root.updateMatrixWorld(true);
   root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');vertices+=p.count;for(const value of p.array)expect(Number.isFinite(value)).toBe(true);}});
   expect(vertices).toBeGreaterThan(200);expect(vertices).toBeLessThan(55000);
   const bounds=new T.Box3().setFromObject(root);expect(bounds.min.x).toBeGreaterThan(-10);expect(bounds.max.x).toBeLessThan(10);expect(bounds.max.y).toBeLessThan(9);
   batchStatic(root);let batchedVertices=0;root.traverse(o=>{if(o instanceof T.Mesh)batchedVertices+=o.geometry.getAttribute('position').count;});expect(batchedVertices).toBeGreaterThan(vertices);expect(batchedVertices).toBeLessThan(80000);
  }
  const other=new T.Group();addReferenceDetails(other,'ISL');expect(other.children).toHaveLength(0);
 });
});
