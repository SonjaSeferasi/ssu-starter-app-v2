import * as T from 'three';
import type {Course,Platform} from './levels';
import {landingHeight} from './landing-geometry';
import {island,terrainMaterials} from './scene-3d';
import {Batch,Mushrooms,Puffs,at,bokehLayer,bonsaiPine,cloud,cloudMaterial,foliageMaterial,glowPoints,paperLantern,propKit,ringArch,roundTree,torii,unit} from './toon-props';
import {rng} from './toon-textures';

/** The near layer: terraces, mushrooms and trees just behind the lane, lanterns under the
 * village walkways and soft out-of-focus foliage in front. Everything stays outside the
 * collision lane: behind z=-2.5, below the walking surfaces, or in front of z=+3.5. */
export function biomeDetails(scene:T.Scene,course:Course){
 const root=new T.Group();root.name='near-biome';scene.add(root);
 const world=course.number,width=course.width/100,r=rng(world*614+1),kit=propKit(world),mats=terrainMaterials(world);
 const batch=new Batch(),leaves=new Puffs(),puffs=new Puffs(),mushrooms=new Mushrooms(),glows:{position:T.Vector3;size:number;color:string}[]=[];
 const pick=<V>(list:readonly V[])=>list[Math.floor(r()*list.length)];
 const laneTop=(x:number)=>{
  let best=-4.5,gap=Infinity;
  for(const p of course.platforms){const left=p.x/100,right=(p.x+p.width)/100,d=x<left?left-x:x>right?x-right:0;if(d<gap){gap=d;best=-landingHeight(p,Math.max(p.x,Math.min(p.x+p.width,x*100)))/100;}}
  return best;
 };
 const terrace=(x:number,top:number,z:number,w:number,depth:number,seed:number,grounded=true)=>{
  const p:Platform={x:x*100,y:-top*100,width:w*100,depth,kind:'rock'};
  island(root,p,world,mats,seed,grounded,grounded?1600:-top*100+150+w*25,'near').position.z=z;
  return(gx:number)=>-landingHeight(p,p.x+Math.max(0,Math.min(w,gx-x))*100)/100;
 };
 if(world===1){
  const greens=['#5fb83a','#74c843','#4ea52f','#86d24c'];
  const bush=(x:number,y:number,z:number,s:number)=>{for(let i=0;i<3;i++)leaves.add(x+(i-1)*s*.7,y+s*(.45+r()*.2),z+(r()-.5)*s*.4,s*(.7+r()*.3),s*(.6+r()*.25),s*(.65+r()*.3),pick(greens));};
  // Terraces behind the route, mostly a little lower so the jump gaps still read as drops.
  for(let x=-8;x<width+8;){
   const w=3.4+r()*4,top=laneTop(x+w/2)-1.8+r()*2.2,z=-5.8-r()*1.2,depth=3.2+r()*1.6,crest=terrace(x,top,z,w,depth,900+Math.floor(x*13));
   for(let cursor=x+.5;cursor<x+w-.5;){
    const roll=r();
    if(roll<.34){const s=.7+r()*1.1;mushrooms.add(cursor+s*.45,crest(cursor+s*.45),z+(r()-.3)*depth*.3,s);cursor+=s*1.1+.35;}
    else if(roll<.62){roundTree(batch,leaves,kit,cursor+.9,crest(cursor+.9),z-depth*.15,1.5+r()*1.3,r,greens);cursor+=2;}
    else if(roll<.92){bush(cursor+.6,crest(cursor+.6),z+depth*.18,.5+r()*.4);cursor+=1.2;}
    else{const px=cursor+.5,py=crest(px);batch.add(kit.pipe,unit.cylinder,at(px,py+.5,z,0,0,0,.84,1,.84));batch.add(kit.pipe,unit.cylinder,at(px,py+1.05,z,0,0,0,1,.22,1));cursor+=1.4;}
   }
   x+=w+.2+r()*1.3;
  }
 }else if(world===2){
  // Small rocks with bonsai pines float just below and behind the route; clouds drift past.
  for(let x=-6;x<width+6;){
   const w=1.4+r()*2.2,top=laneTop(x)-2.4+r()*1.6,z=-5-r()*3,crest=terrace(x,top,z,w,1.8+r()*1.2,940+Math.floor(x*7),false);
   if(r()<.7)bonsaiPine(batch,leaves,kit,x+w/2,crest(x+w/2),z,1.1+r()*.7,r);
   x+=w+1.6+r()*3;
  }
  for(let x=-8;x<width+8;x+=3+r()*4)cloud(puffs,x,laneTop(x)-1.9-r()*1.6,-6.5-r()*6,1.1+r()*1.4,r);
  // The Celestial Gate: a stone ring and a column of golden light around the exit portal.
  const last=course.platforms[course.platforms.length-1];
  ringArch(batch,kit,at(course.finish/100,-last.y/100,-1.2,0,0,0,1.15));
  glows.push({position:new T.Vector3(course.finish/100,-last.y/100+2,-1.25),size:5,color:'#ffd56a'});
 }else{
  // Paper lanterns hang under every walkway and banners hang from the back edges.
  for(const p of course.platforms){
   if(p.kind==='rock')continue;const x0=p.x/100,w=p.width/100,top=-p.y/100;
   for(let x=x0+.45;x<x0+w-.3;x+=1.5){const sag=p.kind==='bridge'?Math.sin((x-x0)/w*Math.PI)*.22:0;glows.push({position:paperLantern(batch,kit,x,top-sag-.62,1.2,.32),size:1.7,color:'#ff9a3c'});}
   if(w>2.6&&p.kind!=='bridge')batch.add(kit.bannerLeaf,unit.plane,at(x0+w*.5,top-.98,-1.32,0,0,0,.7,1.4,1));
  }
  // Torii gates mark the trailhead and the exit.
  const first=course.platforms[0],last=course.platforms[course.platforms.length-1];
  torii(batch,kit,at(first.x/100+first.width/200+.3,-landingHeight(first,first.x+first.width/2+30)/100,-1.05,0,0,0,.72));
  torii(batch,kit,at(course.finish/100,-last.y/100,-1.15,0,0,0,1.05));
 }
 // Out-of-focus foliage frames the bottom of the view.
 const front:{x:number;y:number;z:number;size:number}[]=[];
 for(let x=-4;x<width+12;x+=4+r()*5)if(r()<.75)front.push({x,y:laneTop(x)-1.9-r()*.4,z:4.4+r()*.8,size:1.8+r()*.8});
 bokehLayer(root,world,front);
 batch.build(root,true);leaves.build(root,foliageMaterial());puffs.build(root,cloudMaterial());mushrooms.build(root,false);glowPoints(root,glows);
 return root;
}
