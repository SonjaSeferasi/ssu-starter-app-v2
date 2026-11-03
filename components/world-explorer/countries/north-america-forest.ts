import * as T from 'three';
import {Builder,random,v3,vertexMaterial} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import type {NorthAmericaCode} from '../../../lib/world-explorer/north-america';

/** Mixed crown shapes, buttress roots, epiphytes and fronds replace the former
 * repeated, oversized kapok wall. Monument clearings remain open to the camera. */
export function createNorthAmericanForest(parent:T.Object3D,code:NorthAmericaCode,finish:number,low:boolean,options:{clearings?:{minX:number;maxX:number;maxLayer:number}[];density?:number}={}){
 const root=new T.Group();root.name=code==='GTM'?'peten-forest':'emergent-trees';parent.add(root);
 const wood=new Builder(),leaves=new Builder(),details=new Builder(),r=random(code.charCodeAt(0)*47+code.charCodeAt(1));
 const forest=code==='CRI'||code==='GTM',ground=code==='MEX'?-4:-6;
 const leafColors=code==='CRI'?['#39725b','#517f5b','#75955f','#93ad77']:code==='GTM'?['#486b41','#6c8751','#869b5a','#a0b269']:['#547d43','#78954d','#96ad61'];
 const blob=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string)=>{
  const g=new T.SphereGeometry(1,low?8:12,low?6:9),p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),noise=1+.065*Math.sin(a*7+b*9+c*5);p.setXYZ(i,a*noise,b*noise,c*noise);}g.computeVertexNormals();
  leaves.add(g,color,[x,y,z],[0,r()*6,0],[sx,sy,sz],.07);
 };
 for(let layer=0;layer<3;layer++){
  const count=Math.max(3,Math.round((low?9:15)*(options.density??1))),zBase=[-18,-43,-77][layer];
  for(let i=0;i<count;i++){
   const x=-22+i*(finish+50)/count+(r()-.5)*5,z=zBase-r()*8;
   if(options.clearings?.some(c=>x>c.minX&&x<c.maxX&&layer<=c.maxLayer))continue;
   if(code==='MEX'&&x>10&&x<finish*.93&&layer<2)continue;
   if(code==='GTM'&&x>finish*.43&&x<finish*.82&&layer<2)continue;
   const h=(forest?9:6)+r()*(forest?6:3),spread=(forest?3.8:2.8)+r()*2,base=ground-(layer===2?3:0),radius=.22+r()*.18;
   const trunk=v3(x,base,z),fork=v3(x+(r()-.5)*1.3,base+h*.62,z+.2);
   wood.strut(trunk,fork,radius,layer===0?'#837b63':'#71816c',8,.6);
   for(let branch=0;branch<4;branch++){
    const a=branch/4*Math.PI*2+r(),top=v3(x+Math.sin(a)*spread*.75,base+h*(.76+r()*.2),z+Math.cos(a)*spread*.65);
    wood.strut(fork,top,radius*.55,'#7c7b60',7,.45);
    blob(top.x,top.y,top.z,spread*.64,1.1+r()*.9,spread*.52,leafColors[(i+branch+layer)%leafColors.length]);
    if(forest&&layer===0){
     const anchor=fork.clone().lerp(top,.55),end=anchor.clone().add(v3(.2,-2.4-r()*2,.15));
     details.strut(anchor,end,.025,'#78905a',5,.5);
     for(let leaf=0;leaf<5;leaf++)blob(end.x+Math.sin(leaf)*.12,end.y+leaf*.35,end.z,.12,.2,.06,'#78965c');
    }
   }
   blob(x,base+h,z,spread*.65,1.5,spread*.6,leafColors[(i+layer)%leafColors.length]);
   // Triangular buttress roots anchor the tree into the ground instead of
   // ending a straight tube abruptly at an unrelated horizontal slab.
   if(layer<2)for(let j=0;j<4;j++){
    const a=j*Math.PI/2+.3,rx=Math.sin(a),rz=Math.cos(a),g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([x,base+2.1,z,x+rx*1.25,base-.08,z+rz*1.25,x-rz*.25,base,z+rx*.25],3));g.computeVertexNormals();wood.add(g,'#7b7a61');
   }
  }
 }
 // Ground ferns and understory read at three different heights. They are
 // behind the lane, never giant trunks hiding a landing or an enemy.
 for(let i=0;i<(low?18:36);i++){
  const x=-8+i*(finish+16)/(low?18:36),z=-13-r()*5,y=ground+.05;
  for(let f=0;f<5;f++){
   const a=f/5*Math.PI*2+r(),length=1+r()*1.1,start=v3(x,y,z),tip=v3(x+Math.cos(a)*length,y+.4,z+Math.sin(a)*length);
   details.strut(start,tip,.018,'#6f9b52',5);
   for(let k=1;k<7;k++)for(const side of [-1,1]){
    const t=k/7,c=start.clone().lerp(tip,t),width=Math.sin(t*Math.PI)*.32,leafTip=c.clone().add(v3(-Math.sin(a)*side*width,.09,Math.cos(a)*side*width)),g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([...c.toArray(),...leafTip.toArray(),...c.clone().lerp(tip,.2).toArray()],3));g.computeVertexNormals();details.add(g,leafColors[k%leafColors.length]);
   }
  }
 }
 wood.mesh(root,vertexMaterial(.95,{side:T.DoubleSide}),'branched-trunks-and-buttress-roots');leaves.mesh(root,vertexMaterial(.92),'mixed-layered-leaf-crowns');details.mesh(root,vertexMaterial(.92,{side:T.DoubleSide}),'ferns-vines-and-epiphytes');
 if(code==='JAM'){
  const palms=Array.from({length:low?12:22},(_,i)=>({x:-14+i*(finish+30)/(low?12:22),y:-5.5,z:-20-(i%3)*12,scale:.8+r()*.45,rotation:r()*6}));plantGrove(root,'coconut-palm',palms,{low,name:'caribbean-coconut-palms'});
 }
 return root;
}

export function alpinePine(parent:T.Object3D,x:number,z:number,scale:number,seed:number,low:boolean){
 const root=new T.Group();root.name='natural-alpine-pine';root.position.set(x,0,z);root.scale.setScalar(scale);parent.add(root);
 const b=new Builder(),r=random(seed);b.add(new T.CylinderGeometry(.045,.13,3.9,8),'#7b7563',[0,1.95,0]);
 for(let layer=0;layer<7;layer++){
  const y=.6+layer*.46,reach=1-layer*.105;
  for(let i=0;i<(low?5:7);i++){
   const angle=i/(low?5:7)*Math.PI*2+layer*.7,end=v3(Math.cos(angle)*reach,y-.08,Math.sin(angle)*reach);
   b.strut(v3(0,y+.15,0),end,.025,'#79745b',5,.4);
   const g=new T.SphereGeometry(1,low?6:9,5);
   b.add(g,i%2?'#446c57':'#62846a',[end.x*.7,y+.08,end.z*.7],[0,angle,0],[reach*.55,.16+r()*.13,reach*.35],.12);
   if(layer>3)b.add(new T.SphereGeometry(1,7,5),'#e1e9df',[end.x*.7,y+.2,end.z*.7],[0,angle,0],[reach*.45,.06,reach*.25]);
  }
 }
 b.add(new T.ConeGeometry(.2,.7,9),'#59806b',[0,3.8,0]);b.mesh(root,vertexMaterial(.94),'whorled-branches-and-needle-crowns');return root;
}
