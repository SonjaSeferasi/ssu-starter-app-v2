import * as T from 'three';
import {Builder,pixelTexture,vertexMaterial} from '../kit/common';

function limestoneMaterial(tikal=false){
 const map=pixelTexture(128,(_u,_v,x,y)=>{
  const row=Math.floor(y/10),shift=(row%2)*12,col=Math.floor((x+shift)/24),joint=y%10<1||(x+shift)%24<1;
  const grain=Math.sin(x*2.17+y*7.13)*3,cell=Math.sin(row*17+col*31)*9,base=(tikal?163:204)+cell+grain-(joint?31:0);
  return[base,base*(tikal?1.01:.99),base*(tikal?.98:.95)];
 });
 return vertexMaterial(.96,{map,bumpMap:map,bumpScale:.055});
}

/** Reference-informed, original monument studies: stepped limestone battered
 * faces, narrow masonry courses, inset panels and real stair ribbons. */
export function mayaTemple(parent:T.Object3D,name:string,x:number,y:number,z:number,scale:number,tikal:boolean){
 const root=new T.Group();root.name=name;root.userData={decorative:true,reference:tikal?'Tikal Temple I':'El Castillo, Chichen-Itza'};parent.add(root);
 const stone=new Builder(.65),detail=new Builder(.65),base=tikal?15:25,step=tikal?1.12:2,dy=tikal?1.65:1.18,n=9;
 const light=tikal?'#a7ada2':'#d5d5c4',shade=tikal?'#79867b':'#aeb4a4';
 for(let i=0;i<n;i++){
  const w=base-i*step,d=w*(tikal?.82:1),h=dy;
  const tier=new T.CylinderGeometry(w/2-step*.22,w/2,h,4,1,false,Math.PI/4);tier.scale(1,1,tikal?.82:1);
  stone.add(tier,i%3?light:shade,[0,i*h+h/2,0],[0,0,0],[Math.SQRT2,1,Math.SQRT2]);
  detail.add(new T.BoxGeometry(w+.08,.15,d+.08),shade,[0,(i+1)*h-.08,0]);
  // Recessed facade panels are modeled, not painted onto a blank box.
  for(const side of [-1,1])for(let j=0;j<(tikal?2:3);j++){
   const px=side*(w*.2+j*w*.09);detail.add(new T.BoxGeometry(w*.075,h*.36,.06),shade,[px,i*h+h*.5,d/2+.035]);
  }
 }
 const top=n*dy,shrineWidth=tikal?4.6:7.1,shrineDepth=tikal?3.4:5.8,shrineH=tikal?3:3.1;
 // Separate piers and lintel make actual dark entry openings.
 for(const side of [-1,1])stone.add(new T.BoxGeometry(shrineWidth*.28,shrineH,shrineDepth),light,[side*shrineWidth*.36,top+shrineH/2,0]);
 stone.add(new T.BoxGeometry(shrineWidth,shrineH,.45),shade,[0,top+shrineH/2,-shrineDepth/2]);
 stone.add(new T.BoxGeometry(shrineWidth+.7,.5,shrineDepth+.5),light,[0,top+shrineH+.2,0]);
 if(!tikal)for(const side of [-1,1])stone.add(new T.CylinderGeometry(.23,.25,shrineH,10),shade,[side*.95,top+shrineH/2,shrineDepth/2]);
 if(tikal){
  for(let i=0;i<4;i++)stone.add(new T.BoxGeometry(4.2-i*.55,1.1,1.15),i%2?shade:light,[0,top+shrineH+.8+i,0]);
  for(let i=0;i<3;i++)detail.add(new T.BoxGeometry(.36,.8,.06),'#5b6f60',[-.8+i*.8,top+shrineH+1.8,.61]);
 }
 // Central staircase rises toward the actual summit instead of being
 // buried inside the pyramid. El Castillo receives all four stairways.
 const stairs=tikal?1:4,count=tikal?48:42,frontBase=base*(tikal?.82:1)/2,frontTop=(base-(n-1)*step)*(tikal?.82:1)/2,run=frontBase+.75-frontTop;
 for(let face=0;face<stairs;face++){
  const angle=face*Math.PI/2,width=tikal?3.2:4.8;
  for(let i=0;i<count;i++){
   const zz=frontBase+.75-(i+.5)/count*run,yy=(i+.5)/count*top;
   const mesh=new T.BoxGeometry(width,top/count+.03,run/count+.055);mesh.rotateY(angle);
   stone.add(mesh,i%4?light:shade,[Math.sin(angle)*zz,yy,Math.cos(angle)*zz]);
   const tread=new T.BoxGeometry(width+.04,.045,run/count+.07);tread.rotateY(angle);
   detail.add(tread,tikal?'#afb6aa':'#d7d8cd',[Math.sin(angle)*zz,yy+top/count/2+.035,Math.cos(angle)*zz]);
  }
  for(const side of [-1,1]){
   const beam=new T.BoxGeometry(.55,Math.hypot(top,run),.55);beam.rotateX(-Math.atan2(run,top));beam.rotateY(angle);
   detail.add(beam,shade,[Math.sin(angle)*(frontBase+.75-run/2)+Math.cos(angle)*side*(width/2+.3),top/2,Math.cos(angle)*(frontBase+.75-run/2)-Math.sin(angle)*side*(width/2+.3)]);
  }
 }
 stone.mesh(root,limestoneMaterial(tikal),'weathered-limestone-courses');detail.mesh(root,vertexMaterial(.96),'stair-balustrades-and-facade-recesses');
 root.position.set(x,y,z);root.scale.setScalar(scale);return root;
}

export function mayaObservatory(parent:T.Object3D,x:number){
 const root=new T.Group();root.name='el-caracol';parent.add(root);const b=new Builder(.6),dark=new Builder();
 for(let i=0;i<3;i++)b.add(new T.BoxGeometry(19-i*3.2,1.2,13-i*2),'#b9bcaa',[0,i*1.2+.6,0]);
 b.add(new T.CylinderGeometry(4.1,4.5,4.8,32),'#c3c5b3',[0,5.8,0]);b.add(new T.SphereGeometry(4.1,32,16,0,Math.PI*2,0,Math.PI/2),'#aeb5a3',[0,8.2,0]);
 for(let ring=0;ring<3;ring++)b.add(new T.TorusGeometry(4.2,.12,5,32),'#dbdacc',[0,4.1+ring*1.7,0],[Math.PI/2,0,0]);
 for(const side of [-1,1])dark.add(new T.BoxGeometry(.8,1.2,.12),'#46544c',[side*1.65,6.4,3.95]);
 b.mesh(root,limestoneMaterial(),'observatory-limestone');dark.mesh(root,vertexMaterial(),'observatory-openings');root.position.set(x,-4,-30);return root;
}
