import * as T from 'three';
import {Builder,v3,vertexMaterial} from './common';
import {createWaterSurface} from './water';
import {traceLight} from '../../../lib/world-explorer/light-puzzle';
import type {LevelSimulation} from '../../../lib/world-explorer/simulation';
import {sign} from '../scenic-kit';

/** Only levels explicitly declaring these fictional mechanisms create them. */
export function mountCountryPuzzles(scene:T.Scene,simulation:LevelSimulation){
 const root=new T.Group();root.name='country-water-and-light-puzzles';scene.add(root);
 const waters=(simulation.level.waterBasins||[]).map(b=>{
  const water=createWaterSurface(root,{name:b.id,x:b.x+b.width/2,y:b.lowSurface,z:b.z,width:b.width,depth:b.depth,shallow:'#6fc6bd',deep:'#377f8d',segments:16,flow:[.012,.002],roughness:.27});
  const shell=new Builder();for(const z of [b.z-b.depth/2,b.z+b.depth/2])shell.add(new T.BoxGeometry(b.width,b.highSurface-b.lowSurface+1,.3),'#a6ac92',[b.x+b.width/2,(b.highSurface+b.lowSurface)/2-.4,z]);
  for(let i=0;i<=5;i++)shell.add(new T.BoxGeometry(.3,.035,.1),'#e3d7ad',[b.x+.3,b.lowSurface+i*(b.highSurface-b.lowSurface)/5,b.z+b.depth/2+.2]);shell.mesh(root,vertexMaterial(.9),'sluice-basin-and-water-level-gauge');
  sign(root,'SLUICE: raise water to cross',b.x+b.width/2,b.highSurface+2,-3,5);
  return{definition:b,water};
 });
 const lights=(simulation.level.lightPuzzles||[]).map(p=>{
  const point=simulation.position(p),b=new Builder();b.add(new T.CylinderGeometry(.13,.28,p.height,12),'#8f8063',[point.x,point.y-p.height/2,-.85]);
  b.add(new T.CylinderGeometry(.18,.22,2,10),'#b9a570',[p.emitter.x,p.emitter.y-1,-1]);b.add(new T.SphereGeometry(.23,12,8),'#ffe48a',[p.emitter.x,p.emitter.y,-1]);
  b.add(new T.CylinderGeometry(.11,.2,2,10),'#a49372',[p.receiver.x,p.receiver.y-1,-1]);b.mesh(root,vertexMaterial(.8),'light-puzzle-pedestals');
  const mirror=new T.Mesh(new T.BoxGeometry(.07,1.05,.12),new T.MeshStandardMaterial({color:'#c0e1e7',metalness:.8,roughness:.12}));mirror.position.set(point.x,point.y,-1);root.add(mirror);
  const receiver=new T.Mesh(new T.TorusGeometry(p.receiver.radius,.07,8,24),new T.MeshStandardMaterial({color:'#d5b35f',emissive:'#ac823a',emissiveIntensity:.3}));receiver.position.set(p.receiver.x,p.receiver.y,-1);root.add(receiver);
  const beam=new T.Line(new T.BufferGeometry().setFromPoints([v3(0,0,0),v3(0,0,0),v3(0,0,0)]),new T.LineBasicMaterial({color:'#ffe591',transparent:true,opacity:.9}));beam.frustumCulled=false;root.add(beam);
  sign(root,'E / Turn mirror: aim at the ring',point.x,point.y+1.6,-1.4,5);
  return{definition:p,mirror,receiver,beam};
 });
 return{root,update(time:number){
  for(const {definition:b,water}of waters){water.surface.position.y=simulation.waterSurface(b.id);water.update(time);}
  for(const {definition:p,mirror,receiver,beam}of lights){const state=simulation.lightPuzzles.find(s=>s.id===p.id)!,point=simulation.position(p),trace=traceLight(p,point,state.index),normal=p.normals[state.index];mirror.rotation.z=Math.atan2(normal[1],normal[0]);const positions=beam.geometry.getAttribute('position') as T.BufferAttribute;[[p.emitter.x,p.emitter.y],[point.x,point.y],[trace.end.x,trace.end.y]].forEach(([x,y],i)=>positions.setXYZ(i,x,y,-1));positions.needsUpdate=true;(receiver.material as T.MeshStandardMaterial).emissiveIntensity=state.lit?1.5:.2;}
 }};
}
