import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {batchStatic,island} from '../components/world-explorer/scenic-kit';
import {woodenDeck} from '../components/world-explorer/kit/wooden-deck';
import {dressJapanPlatform} from '../components/world-explorer/japan-terrain';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {FIXED_STEP,LevelSimulation} from '../lib/world-explorer/simulation';
import type {PlatformDefinition} from '../lib/world-explorer/game-types';

function build(definition:PlatformDefinition){
 const root=island(new T.Scene(),definition.x+definition.width/2,definition.y,definition.width,definition.depth,'temperate',19,definition.thickness);
 if(definition.type!=='stone')woodenDeck(root,definition);
 root.updateMatrixWorld(true);return root;
}

function dispose(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse(object=>{if(!(object instanceof T.Mesh))return;if(object instanceof T.InstancedMesh)object.dispose();geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}});
 textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();
}

function deckHit(root:T.Object3D,x:number,z=0){
 return new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];
}

describe('Japan bridge visible geometry and physical walking surface',()=>{
 it('keeps real sloping plank tops on the collision curve before and after terrain dressing and batching',()=>{
  const bridge=levelDefinitionFor('JPN').platforms.find(p=>p.id==='jp-lower-bridge')!,count=Math.ceil(bridge.width/.27),samples=Array.from({length:count},(_,i)=>[.12,.5,.88].map(fraction=>bridge.x+(i+fraction)*bridge.width/count)).flat();
  for(const quality of ['standard','low'] as const){
   const root=build(bridge),originalPosition=root.position.clone();let previous:number[]|undefined;
   const check=()=>{
    root.updateMatrixWorld(true);const heights:number[]=[];
    for(const z of [-.54,0,.54])for(const x of samples){
     const hit=deckHit(root,x,z);expect(hit,`plank missing at ${x}, ${z}`).toBeDefined();
     // All islands have a 15 mm visual cap offset above their mathematical
     // support. Tilted 18 cm planks may vary by a fraction of a millimetre.
     expect(Math.abs(hit.point.y-platformSurfaceY(bridge,x)-.015),`deck/collider mismatch at ${x}, ${z}`).toBeLessThan(.001);
     expect(hit.face!.normal.y).toBeGreaterThan(.99);heights.push(hit.point.y);
    }
    if(previous)for(let i=0;i<heights.length;i++)expect(heights[i]).toBeCloseTo(previous[i],5);
    previous=heights;expect(root.position.equals(originalPosition)).toBe(true);
   };
   check();dressJapanPlatform(root,bridge,{quality});check();batchStatic(root);check();
   const centres=Array.from({length:count},(_,i)=>deckHit(root,bridge.x+(i+.5)*bridge.width/count)!.point.y),measuredSag=Math.max(...centres)-Math.min(...centres);
   expect(measuredSag).toBeGreaterThan(.20);expect(measuredSag).toBeLessThan(.23);
   for(let i=1;i<centres.length;i++)expect(Math.abs(centres[i]-centres[i-1])/(bridge.width/count)).toBeLessThan(.06);
   dispose(root);
  }
 });

 it('gives an input-driven player visible support across plank joints and the connected lower-route exit',()=>{
  const level=levelDefinitionFor('JPN'),bridge=level.platforms.find(p=>p.id==='jp-lower-bridge')!,start=level.platforms.find(p=>p.id==='jp-start')!,exit=level.platforms.find(p=>p.id==='jp-bridge-exit')!,root=build(bridge),exitRoot=build(exit),visible=new T.Group(),simulation=new LevelSimulation(level),visited=new Set<string>();let supportedFrames=0;
  dressJapanPlatform(root,bridge);dressJapanPlatform(exitRoot,exit);batchStatic(root);batchStatic(exitRoot);visible.add(root,exitRoot);visible.updateMatrixWorld(true);simulation.setInput({left:false,right:true,jump:false});
  for(let frame=0;frame<600&&simulation.state.x<exit.x+1.4;frame++){
   simulation.advance(FIXED_STEP);const s=simulation.state;if(s.standing)visited.add(s.standing);
   if(!s.grounded||s.standing!==bridge.id)continue;
   // Individual planks intentionally have narrow visible joints. A real
   // player footprint must always cover wood even when its centre is a joint.
   const support=[s.x-level.physics.playerRadius/2,s.x,s.x+level.physics.playerRadius/2].filter(x=>x>=bridge.x&&x<=exit.x+exit.width).map(x=>deckHit(visible,x)).filter((hit):hit is T.Intersection=>!!hit);
   expect(support.length,`unsupported footprint at ${s.x}`).toBeGreaterThan(0);
   expect(Math.min(...support.map(hit=>Math.abs(hit.point.y-s.y-.015)))).toBeLessThan(.022);supportedFrames++;
  }
  expect(supportedFrames).toBeGreaterThan(120);expect([...visited]).toEqual(expect.arrayContaining([start.id,bridge.id,exit.id]));expect(simulation.state.hearts).toBe(3);expect(simulation.state.checkpointId).toBe('jp-checkpoint-01');
  expect(simulation.state.grounded).toBe(true);expect(simulation.state.standing).toBe(exit.id);expect(simulation.state.y).toBe(exit.y);
  dispose(visible);
 });

 it('keeps the visible entrance drop small and the final plank level with the grassy exit',()=>{
  const level=levelDefinitionFor('JPN'),start=level.platforms.find(p=>p.id==='jp-start')!,bridge=level.platforms.find(p=>p.id==='jp-lower-bridge')!,exit=level.platforms.find(p=>p.id==='jp-bridge-exit')!,definitions=[start,bridge,exit],roots=definitions.map(build);
  roots.forEach((root,i)=>{dressJapanPlatform(root,definitions[i]);batchStatic(root);root.updateMatrixWorld(true);});
  expect(bridge.x).toBeLessThan(start.x+start.width);expect(exit.x).toBe(bridge.x+bridge.width);
  const count=Math.ceil(bridge.width/.27),entryX=Array.from({length:count},(_,i)=>bridge.x+(i+.5)*bridge.width/count).find(x=>x>start.x+start.width)!,startTop=deckHit(roots[0],start.x+start.width-.02)!.point.y,entryTop=deckHit(roots[1],entryX)!.point.y;
  expect(startTop-entryTop).toBeGreaterThan(.8);expect(startTop-entryTop).toBeLessThan(.9);
  for(const z of [-.54,0,.54]){
   const finalPlank=deckHit(roots[1],bridge.x+bridge.width-.02,z),grass=deckHit(roots[2],exit.x+.02,z);expect(finalPlank).toBeDefined();expect(grass).toBeDefined();expect(Math.abs(finalPlank.point.y-grass.point.y)).toBeLessThan(.002);
  }
  roots.forEach(dispose);
 });
});
