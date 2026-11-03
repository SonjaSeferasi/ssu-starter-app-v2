import * as T from 'three';
import {clamp,fbm,mesh,smooth,valueNoise} from './common';

/** Distant landforms are vertex-coloured heightfields: one mesh per range, with
 * colour chosen from height and slope (forest, rock, snow, sand). */
export type HeightfieldOptions={name:string;x:number;y:number;z:number;width:number;depth:number;segments:[number,number];height:(u:number,v:number)=>number;color:(height:number,slope:number,u:number,v:number)=>T.Color;fog?:boolean};
export function createHeightfield(parent:T.Object3D,options:HeightfieldOptions){
 const [sx,sz]=options.segments,geometry=new T.PlaneGeometry(options.width,options.depth,sx,sz);geometry.rotateX(-Math.PI/2);
 const p=geometry.getAttribute('position'),heights=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){const u=p.getX(i)/options.width+.5,v=p.getZ(i)/options.depth+.5;heights[i]=options.height(u,v);p.setY(i,heights[i]);}
 geometry.computeVertexNormals();const normals=geometry.getAttribute('normal'),colors:number[]=[];
 for(let i=0;i<p.count;i++){const u=p.getX(i)/options.width+.5,v=p.getZ(i)/options.depth+.5,c=options.color(heights[i],1-normals.getY(i),u,v);colors.push(c.r,c.g,c.b);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const m=mesh(parent,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:false,fog:options.fog??true}),options.x,options.y,options.z);m.name=options.name;m.castShadow=false;return m;
}

/** Ridged multi-peak mountain height: sharp crests, eroded gullies, falling to
 * zero at the edges so the range sits naturally on the plain. */
export function ridgedRange(seed:number,options:{peaks:number;height:number;sharpness?:number;edge?:number;base?:number;width?:number}){
 const peaks=Array.from({length:options.peaks},(_,i)=>({u:(i+.5)/options.peaks+(valueNoise(i,1,seed)-.5)*.5/options.peaks,v:.35+valueNoise(i,7,seed)*.3,h:.6+valueNoise(i,3,seed)*.4,w:(.12+valueNoise(i,5,seed)*.1)*(options.width??1)}));
 return(u:number,v:number)=>{
  let h=0;for(const p of peaks){const d=Math.hypot((u-p.u)/p.w,(v-p.v)/(p.w*1.4));h=Math.max(h,p.h*Math.max(0,1-d)**(options.sharpness??1.25));}
  const ridge=1-Math.abs(fbm(u*7,v*7,seed,4)*2-1),gully=fbm(u*18,v*12,seed+9,3);
  const fade=smooth(0,options.edge??.12,Math.min(u,1-u,v,1-v));
  return((h*(.78+ridge*.3)+gully*.08*h)*options.height+(options.base??0))*fade;
 };
}
export function mountainColor(options:{snowLine:number;rock:string;forest:string;snow:string;treeLine?:number;grass?:string}){
 const rock=new T.Color(options.rock),forest=new T.Color(options.forest),snow=new T.Color(options.snow),grass=new T.Color(options.grass||options.forest);
 return(height:number,slope:number,u:number,v:number)=>{
  const n=valueNoise(u*40,v*40,3),snowAmount=smooth(options.snowLine-1.5,options.snowLine+1,height+n*2.2)*(1-smooth(.55,.8,slope));
  const treeLine=options.treeLine??options.snowLine*.45,forestAmount=(1-smooth(treeLine-1,treeLine+1.5,height))*(1-smooth(.45,.75,slope));
  const c=rock.clone().multiplyScalar(.82+n*.3).lerp(grass,clamp(forestAmount*.4,0,1)).lerp(forest,forestAmount*.85).lerp(snow,snowAmount);return c;
 };
}
/** Wind-shaped dune field: long crests with a steep lee side. */
export function duneHeight(seed:number,height:number,crests=5){
 return(u:number,v:number)=>{const w=u*crests+fbm(u*2,v*3,seed,3)*1.4,crest=(w-Math.floor(w)),profile=crest<.72?Math.sin(crest/.72*Math.PI/2):Math.cos((crest-.72)/.28*Math.PI/2);return(profile*.75+fbm(u*4,v*4,seed+5,3)*.5)*height*smooth(0,.1,Math.min(u,1-u,v,1-v));};
}
export function rollingHills(seed:number,height:number,scale=3){return(u:number,v:number)=>fbm(u*scale,v*scale,seed,4)*height*smooth(0,.15,Math.min(u,1-u,v,1-v));}
export function gradientColor(stops:[number,string][],noise=.08){
 const colors=stops.map(([h,c])=>[h,new T.Color(c)] as const);
 return(height:number,_slope:number,u:number,v:number)=>{
  const n=1+(valueNoise(u*50,v*50,11)-.5)*noise*2;let i=0;while(i<colors.length-2&&height>colors[i+1][0])i++;
  const [h0,c0]=colors[i],[h1,c1]=colors[Math.min(colors.length-1,i+1)],t=h1===h0?0:clamp((height-h0)/(h1-h0),0,1);return c0.clone().lerp(c1,t).multiplyScalar(n);
 };
}
