import * as T from 'three';
import {ellipsoid,matte} from '../kit/common';
import {createNorthAmericanCreature} from './north-america-creatures';
import {remainingNorthAmericaPlaces,type RemainingNorthAmericaCode} from '../../../lib/world-explorer/north-america-remaining';

export function createIslandCreature(parent:T.Object3D,code:RemainingNorthAmericaCode){
 const place=remainingNorthAmericaPlaces[code],kind=place.creature;
 const family=kind==='clockwork'?'USA':kind==='leaf-ant'||kind==='beetle'?'CRI':kind.includes('crab')||kind==='turtle'?'JAM':kind==='coati'||kind==='mongoose'||kind==='armadillo'?'GTM':'MEX';
 const rig=createNorthAmericanCreature(parent,family);rig.root.name=code.toLowerCase()+'-'+kind+'-patrol';rig.root.userData.species=kind;
 // Distinct anatomy on shared articulated rigs keeps the visual states in sync
 // with the simulation's turn, alert, stun and disabled states.
 const shape=(color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>ellipsoid(rig.body,matte(color,.8),x,y,z,sx,sy,sz,14);
 if(kind==='hermit-crab'){
  shape('#d1ad83',0,.39,-.12,.25,.27,.25);
  const spiral=new T.Mesh(new T.TorusGeometry(.13,.035,7,20),matte('#8b7054'));spiral.position.set(.19,.45,-.1);spiral.rotation.y=Math.PI/2;rig.body.add(spiral);
 }else if(kind==='armadillo'){
  for(let i=0;i<7;i++)shape(i%2?'#a99a7e':'#887e69',0,.36,-.18+i*.06,.22,.11,.05);
 }else if(kind==='beetle'){
  rig.extras.leaf.visible=false;for(const side of [-1,1])shape(code==='DMA'?'#498277':'#6c7166',side*.085,.3,-.1,.085,.14,.24);
  const horn=new T.Mesh(new T.ConeGeometry(.05,.2,7),matte('#c4b786'));horn.position.set(0,.43,.2);horn.rotation.x=.4;rig.head.add(horn);
 }else if(kind==='mongoose'){
  shape('#b49a72',0,.26,-.02,.17,.15,.31);shape('#d1b78e',0,.38,.29,.07,.05,.13);
 }else if(kind==='gecko'||kind==='anole'){
  for(const side of [-1,1])for(const zz of [-.1,.17])shape('#b2bb7f',side*.23,.14,zz,.1,.035,.07);
  if(kind==='anole')shape(code==='CUB'?'#d9a36d':'#9fc47e',0,.29,.25,.09,.1,.025);
 }else if(kind==='fiddler-crab')shape('#edb078',.33,.33,.23,.13,.13,.18);
 else if(kind==='reef-crab')for(let i=0;i<5;i++)shape('#d4c4a0',(i-2)*.08,.37,-.04,.035,.018,.055);
 else if(kind==='clockwork'){
  const gear=new T.Mesh(new T.TorusGeometry(.12,.035,5,12),matte(place.accent));gear.position.set(0,.3,.2);rig.body.add(gear);
 }
 rig.root.updateMatrixWorld(true);const size=new T.Box3().setFromObject(rig.root).getSize(new T.Vector3());rig.figure.scale.multiplyScalar(.65/size.y);rig.root.userData.collisionHeight=.65;
 return rig;
}
