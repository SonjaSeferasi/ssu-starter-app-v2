import * as T from 'three';
import {Builder,random,v3} from './common';

/** Reusable architectural parts that add into a Builder, so a whole district
 * merges into one vertex-coloured mesh. These are stylized studies, not
 * measured reconstructions of named buildings. */
export type Vec=[number,number,number];

/** Fluted classical column with base and capital; `broken` snaps the shaft. */
export function column(b:Builder,at:Vec,height:number,radius:number,color:string,options:{broken?:number;capital?:string;seed?:number;segments?:number}={}){
 const [x,y,z]=at,r=random(options.seed??7),segments=options.segments??14,shaft=height*(options.broken??1)-radius*1.1;
 b.add(new T.CylinderGeometry(radius*1.45,radius*1.55,radius*.5,segments),color,[x,y+radius*.25,z],[0,0,0],[1,1,1],.05);
 b.add(new T.CylinderGeometry(radius*1.25,radius*1.4,radius*.35,segments),color,[x,y+radius*.68,z]);
 const g=new T.CylinderGeometry(radius*.88,radius,shaft,segments*2,4,false),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),flute=1-Math.abs(Math.sin(a*segments/2))*.06;p.setX(i,p.getX(i)*flute);p.setZ(i,p.getZ(i)*flute);}
 if(options.broken!==undefined&&options.broken<1)for(let i=0;i<p.count;i++)if(p.getY(i)>shaft/2-.01)p.setY(i,p.getY(i)-r()*radius*1.2);
 g.computeVertexNormals();b.add(g,color,[x,y+radius*.85+shaft/2,z],[0,0,0],[1,1,1],.04);
 if(options.broken===undefined||options.broken>=1){
  const top=y+radius*.85+shaft;b.add(new T.CylinderGeometry(radius*1.35,radius*.9,radius*.9,segments),options.capital||color,[x,top+radius*.45,z],[0,0,0],[1,1,1],.06);
  b.add(new T.BoxGeometry(radius*2.9,radius*.32,radius*2.9),options.capital||color,[x,top+radius*1.05,z]);
 }
}

/** One arcaded bay: two piers with engaged half columns and a round arch,
 * as an extruded wall section with a true opening. Origin: bottom centre. */
export function arcadeBay(width:number,height:number,depth:number,options:{opening?:number;spring?:number}={}){
 const opening=width*(options.opening??.62),spring=height*(options.spring??.62),shape=new T.Shape();
 shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();
 const hole=new T.Path();hole.moveTo(-opening/2,0);hole.lineTo(opening/2,0);hole.lineTo(opening/2,spring);hole.absarc(0,spring,opening/2,0,Math.PI,false);hole.lineTo(-opening/2,0);shape.holes.push(hole);
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10});g.translate(0,0,-depth/2);return g;
}

/** A Mediterranean stucco house with a hipped tile roof, windows and shutters. */
export function stuccoHouse(b:Builder,at:Vec,size:[number,number,number],palette:{wall:string;roof:string;shutter:string;trim?:string},rotation=0,seed=1){
 const [x,y,z]=at,[w,h,d]=size,r=random(seed),c=Math.cos(rotation),s=Math.sin(rotation),local=(lx:number,ly:number,lz:number):Vec=>[x+lx*c+lz*s,y+ly,z-lx*s+lz*c];
 b.add(new T.BoxGeometry(w,h,d),palette.wall,local(0,h/2,0),[0,rotation,0],[1,1,1],.05);
 const roof=new T.ConeGeometry(Math.hypot(w,d)/2*1.04,h*.42,4,1);roof.rotateY(Math.PI/4);b.add(roof,palette.roof,local(0,h+h*.21,0),[0,rotation,0],[w/Math.hypot(w,d)*1.42,1,d/Math.hypot(w,d)*1.42],.1);
 b.add(new T.BoxGeometry(w+.12,.1,d+.12),palette.trim||palette.wall,local(0,h,0),[0,rotation,0]);
 const floors=Math.max(1,Math.round(h/1.4)),cols=Math.max(1,Math.round(w/1.2));
 for(let f=0;f<floors;f++)for(let i=0;i<cols;i++){
  if(r()<.15)continue;const lx=-w/2+(i+.5)*w/cols,ly=.75+f*h/floors;
  b.add(new T.BoxGeometry(.34,.5,.05),'#3b3029',local(lx,ly,d/2+.01),[0,rotation,0]);
  for(const side of [-1,1])b.add(new T.BoxGeometry(.16,.52,.04),palette.shutter,local(lx+side*.26,ly,d/2+.03),[0,rotation,0]);
 }
 b.add(new T.BoxGeometry(.5,.85,.05),'#5b3f2c',local((r()-.5)*w*.4,.43,d/2+.01),[0,rotation,0]);
}

/** Simple barrel-tile texture as vertex shading for long roofs. */
export function tileRows(b:Builder,at:Vec,width:number,depth:number,pitch:number,color:string,rows=6){
 const [x,y,z]=at;for(let i=0;i<rows;i++){const t=i/rows,g=new T.CylinderGeometry(.06,.06,width,6);g.rotateZ(Math.PI/2);b.add(g,color,[x,y+t*pitch,z+depth/2-t*depth],[0,0,0],[1,1,1],.15);}
}
export {v3};

/** A gable-roofed cabin: stacked logs or vertical planks, door, windows, an
 * optional chimney and snow on the roof; `stilts` raises it on posts. */
export function cabin(b:Builder,at:Vec,size:[number,number,number],palette:{wall:string;roof:string;trim:string;snow?:string},options:{logs?:boolean;stilts?:number;rotation?:number;chimney?:boolean}={}){
 const [x,y0,z]=at,[w,h,d]=size,rotation=options.rotation??0,c=Math.cos(rotation),s=Math.sin(rotation),y=y0+(options.stilts??0);
 const local=(lx:number,ly:number,lz:number):Vec=>[x+lx*c+lz*s,y+ly,z-lx*s+lz*c];
 if(options.stilts)for(const [px,pz] of [[-w/2+.2,-d/2+.2],[w/2-.2,-d/2+.2],[-w/2+.2,d/2-.2],[w/2-.2,d/2-.2]])b.add(new T.CylinderGeometry(.09,.11,options.stilts+.2,6),'#5b4636',local(px,-options.stilts/2,pz));
 if(options.logs){const rows=Math.round(h/.26);for(let i=0;i<rows;i++){for(const lz of [-d/2,d/2]){const g=new T.CylinderGeometry(.13,.13,w+.3,7);g.rotateZ(Math.PI/2);b.add(g,i%2?palette.wall:palette.trim,local(0,.13+i*.26,lz),[0,rotation,0],[1,1,1],.08);}for(const lx of [-w/2,w/2]){const g=new T.CylinderGeometry(.13,.13,d+.3,7);g.rotateX(Math.PI/2);b.add(g,i%2?palette.trim:palette.wall,local(lx,.26+i*.26,0),[0,rotation,0],[1,1,1],.08);}}b.add(new T.BoxGeometry(w-.1,h,d-.1),palette.wall,local(0,h/2,0),[0,rotation,0]);}
 else{b.add(new T.BoxGeometry(w,h,d),palette.wall,local(0,h/2,0),[0,rotation,0],[1,1,1],.05);const planks=Math.round(w/.22);for(let i=0;i<planks;i++)b.add(new T.BoxGeometry(.03,h,.02),palette.trim,local(-w/2+(i+.5)*w/planks,h/2,d/2+.01),[0,rotation,0]);}
 const roof=new T.Shape();roof.moveTo(-d/2-.35,0);roof.lineTo(0,h*.62);roof.lineTo(d/2+.35,0);roof.lineTo(d/2+.2,-.08);roof.lineTo(0,h*.52);roof.lineTo(-d/2-.2,-.08);roof.closePath();
 const prism=new T.ExtrudeGeometry(roof,{depth:w+.5,bevelEnabled:false});prism.translate(0,0,-(w+.5)/2);prism.rotateY(Math.PI/2);b.add(prism,palette.roof,local(0,h,0),[0,rotation,0],[1,1,1],.06);
 const gable=new T.Shape();gable.moveTo(-d/2,0);gable.lineTo(0,h*.52);gable.lineTo(d/2,0);gable.closePath();for(const lx of [-w/2,w/2]){const g=new T.ShapeGeometry(gable);g.rotateY(lx<0?-Math.PI/2:Math.PI/2);b.add(g,palette.wall,local(lx*1.001,h,0),[0,rotation,0]);}
 if(palette.snow){const snow=new T.ExtrudeGeometry(roof,{depth:w+.4,bevelEnabled:false});snow.translate(0,0,-(w+.4)/2);snow.rotateY(Math.PI/2);b.add(snow,palette.snow,local(0,h+.09,0),[0,rotation,0],[1,.7,1.02]);}
 b.add(new T.BoxGeometry(.6,1.05,.06),'#3d2c21',local(-w*.18,.53,d/2+.04),[0,rotation,0]);
 for(const lx of [w*.22])b.add(new T.BoxGeometry(.55,.48,.06),'#f2d37a',local(lx,h*.55,d/2+.04),[0,rotation,0]);
 b.add(new T.BoxGeometry(.7,.08,.08),palette.trim,local(w*.22,h*.55-.29,d/2+.06),[0,rotation,0]);
 if(options.chimney)b.add(new T.BoxGeometry(.4,1.1,.4),'#7d756c',local(w*.3,h+h*.4,-d*.15),[0,rotation,0],[1,1,1],.1);
}
