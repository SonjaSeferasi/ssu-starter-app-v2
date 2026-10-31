import * as T from 'three';
import {Builder,random,vertexMaterial} from './common';
import type {HazardDefinition,HazardPhase} from '../../../lib/world-explorer/game-types';

/** Visuals for warned, periodic hazards. The simulation owns timing and harm;
 * these only show it: a calm vent or crest, a readable warning (bubbling,
 * trembling, a shadow on the ground), then the eruption across the exact
 * hazard box. `style` picks the form; a country can recolour it. */
export type HazardStyle='geyser'|'wave'|'calving'|'rockfall'|'spray'|'steam';
export type HazardPalette={column:string;base:string;warning:string;debris?:string};
export const defaultHazardPalette:HazardPalette={column:'#f4f8fa',base:'#8a7d6c',warning:'#ffcf5a',debris:'#d8eef7'};
export type TimedHazardVisual={root:T.Group;update:(phase:HazardPhase,strength:number,time:number)=>void};

export function createTimedHazard(parent:T.Object3D,hazard:HazardDefinition,palette:HazardPalette=defaultHazardPalette):TimedHazardVisual{
 const style=(hazard.style||'steam') as HazardStyle,w=hazard.width,h=hazard.height,root=new T.Group(),r=random(hazard.id.length*131+7);
 root.name='timed-hazard-'+hazard.id;root.userData={style,decorative:true};root.position.set(hazard.x+w/2,hazard.y,0);parent.add(root);
 const translucent=(color:string,opacity:number)=>new T.MeshStandardMaterial({color,transparent:true,opacity,roughness:.5,depthWrite:false,emissive:color,emissiveIntensity:.15});
 // Warning marker: a pulsing ring (or ground shadow) the full width of the hazard.
 const ring=new T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>(new T.RingGeometry(w*.32,w*.5,28),new T.MeshBasicMaterial({color:palette.warning,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.name='hazard-warning-ring';root.add(ring);
 const column=new T.Group();column.name='hazard-eruption';root.add(column);
 const puffs:T.Mesh[]=[];
 if(style==='geyser'||style==='steam'||style==='spray'){
  // Vent cone or rock lip at the base, then a column of soft puffs.
  const b=new Builder();b.add(new T.CylinderGeometry(w*.32,w*.55,.3,12,1,true),palette.base,[0,.1,0]);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;b.add(new T.DodecahedronGeometry(.16,0),palette.base,[Math.cos(a)*w*.5,.08,Math.sin(a)*w*.42],[r(),r(),r()],[1,.6,1],.1);}
  b.mesh(root,vertexMaterial(.9),'hazard-vent');
  const material=translucent(palette.column,style==='spray'?.55:.72);
  for(let i=0;i<9;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(1,1),material);puff.userData.t=i/9;puff.userData.jitter=r();column.add(puff);puffs.push(puff);}
 }else if(style==='wave'){
  // A curling surge that rises over the rocks and spills back.
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.quadraticCurveTo(w/2+.2,h*.6,w*.15,h);shape.quadraticCurveTo(-w*.1,h*1.05,-w/2,h*.55);shape.closePath();
  const crest=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:3.2,bevelEnabled:true,bevelSize:.12,bevelThickness:.12,bevelSegments:2,curveSegments:10}),translucent(palette.column,.78));crest.geometry.translate(0,0,-1.6);crest.name='wave-surge';column.add(crest);
  const foam=translucent('#ffffff',.85);for(let i=0;i<7;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(.28,1),foam);puff.position.set(-w/2+r()*w,h*.85+r()*.3,(r()-.5)*2.4);puff.userData.t=r();column.add(puff);puffs.push(puff);}
 }else{
  // Calving ice or rockfall: chunks that fall from above onto the box, with a
  // shadow on the ground as the warning.
  const material=new T.MeshStandardMaterial({color:palette.debris||palette.column,roughness:style==='calving'?.25:.9,metalness:style==='calving'?.05:0,transparent:style==='calving',opacity:style==='calving'?.92:1});
  for(let i=0;i<4;i++){const chunk=new T.Mesh(new T.DodecahedronGeometry(.35+r()*.3,0),material);chunk.position.set((r()-.5)*w*.8,0,(r()-.5)*1.2);chunk.rotation.set(r()*3,r()*3,r()*3);chunk.userData.t=r()*.25;chunk.castShadow=true;column.add(chunk);puffs.push(chunk);}
  (ring.material as T.MeshBasicMaterial).color.set('#1d2228');ring.geometry.dispose();ring.geometry=new T.CircleGeometry(w*.55,24);
 }
 column.visible=false;
 return{root,update(phase,strength,time){
  const ringMaterial=ring.material as T.MeshBasicMaterial;
  ringMaterial.opacity=phase==='warning'?(style==='calving'||style==='rockfall'?.25+strength*.35:.35+Math.sin(time*14)*.25):phase==='active'?.15:0;
  ring.scale.setScalar(phase==='warning'&&style!=='calving'&&style!=='rockfall'?1+Math.sin(time*10)*.06:1);
  column.visible=phase!=='calm';
  if(style==='geyser'||style==='steam'||style==='spray'){
   // Warning: a low bubbling plume. Active: a column filling the hazard height.
   const height=phase==='active'?h*(.35+.65*strength):phase==='warning'?.45+strength*.35:0;
   for(const puff of puffs){const t=((puff.userData.t+time*(phase==='active'?.9:.35))%1),radius=w*(.22+t*.32)*(phase==='active'?1:.6);puff.position.set(Math.sin(time*3+puff.userData.jitter*9)*w*.08,t*height,Math.cos(time*2.3+puff.userData.jitter*7)*.12);puff.scale.setScalar(Math.max(.05,radius*(1-t*.25)));}
  }else if(style==='wave'){
   const crest=column.getObjectByName('wave-surge')!;crest.scale.set(1,phase==='active'?.25+.75*strength:.12+strength*.1,1);crest.position.x=phase==='active'?(1-strength)*w*.4:w*.4;
   for(const puff of puffs){const t=(puff.userData.t+time*.6)%1;puff.visible=phase==='active';puff.position.y=crest.scale.y*h*(.8+t*.25);}
  }else{
   // Chunks drop in during the eruption and shatter at the ground.
   for(const [i,chunk] of puffs.entries()){const t=phase==='active'?Math.min(1,(1-strength)+chunk.userData.t):0;chunk.visible=phase==='active';chunk.position.y=Math.max(.3,h+3.5-(phase==='active'?(h+3.2)*Math.min(1,strength*1.4+i*.05):0));chunk.rotation.x=time*2+i;chunk.scale.setScalar(1-t*.2);}
  }
 }};
}
