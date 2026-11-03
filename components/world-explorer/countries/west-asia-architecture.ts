import * as T from 'three';
import {Builder,vertexMaterial,v3} from '../kit/common';
import {facadeCourses} from './asia-landscape-art';
import type {WestAsiaCode} from '../../../lib/world-explorer/west-asia';

function house(b:Builder,x:number,y:number,z:number,w:number,h:number,roof:string,tower=false){
 b.add(new T.BoxGeometry(w,h,w*.72),'#b4a48b',[x,y+h/2,z]);
 b.add(new T.ConeGeometry(w*.79,w*.42,4),roof,[x,y+h+w*.21,z],[0,Math.PI/4,0],[1,1,.75]);
 facadeCourses(b,{x,y,z:z+w*.36+.04,w,h,color:'#bdaf95',trim:'#968e7a',seed:Math.round(x*17),windows:false});
 for(let k=0;k<(tower?4:2);k++)b.add(new T.BoxGeometry(.26,.6,.06),'#4d504c',[x-w*.2,y+1+k*(h-1)/4,z+w*.36+.04]);
}
function column(b:Builder,x:number,y:number,z:number,h:number,r:number,color:string){
 b.add(new T.CylinderGeometry(r*.8,r,h,12),color,[x,y+h/2,z]);
 for(const top of [0,h])b.add(new T.BoxGeometry(r*2.7,.35,r*2.7),'#d9c8a5',[x,y+top,z]);
}
function pediment(b:Builder,x:number,y:number,z:number,w:number,h:number,color:string){
 const g=new T.BufferGeometry(),p=[-w/2,0,0,w/2,0,0,0,h,0,-w/2,0,-.5,0,h,-.5,w/2,0,-.5];g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(g,color,[x,y,z]);
}
function rockFacade(b:Builder,x:number,y:number,z:number,w:number,h:number){
 b.add(new T.BoxGeometry(w,h,3),'#bd8667',[x,y+h/2,z]);
 b.add(new T.BoxGeometry(w*.2,h*.4,.1),'#534a41',[x,y+h*.2,z+1.56]);
 facadeCourses(b,{x,y,z:z+1.53,w,h,color:'#bd8667',trim:'#b47c60',seed:Math.round(x*13)});for(const level of [0,1]){for(const side of [-1,-.4,.4,1])column(b,x+side*w*.37,y+level*h*.52,z+1.9,h*.42,.3,'#e2ad86');b.add(new T.BoxGeometry(w+1,.5,2),'#cb9a76',[x,y+h*(.49+level*.48),z+1.5]);}
 pediment(b,x,y+h*.98,z+2.3,w*.85,h*.14,'#d7a17e');
}
/** Country-specific background architecture. Nothing created here is a collider. */
export function westArchitecture(parent:T.Object3D,code:WestAsiaCode,finish:number,low:boolean){
 const b=new Builder(),base=-7,z=-34,x=finish*.57;
 if(code==='CYP'||code==='GEO'){
  for(let i=0;i<(low?6:10);i++){
   const xx=-4+i*(finish+15)/(low?6:10),yy=base+Math.sin(i)*.35;
   house(b,xx,yy,z+(i%3)*5,code==='GEO'?3.2:4.5,code==='GEO'?5+i%4:3+i%2,code==='GEO'?'#62676b':'#a7583d');
   if(code==='GEO'&&i%2===0)house(b,xx+4,yy,z+2,2.6,12+i%4,'#60696a',true);
  }
 }else if(code==='BHR'){
  const w=33,h=8;b.add(new T.BoxGeometry(w,h,3),'#bea98a',[x,base+h/2,z]);
  for(const s of [-1,1])b.add(new T.CylinderGeometry(3.2,3.8,h+1,20),'#b9a07c',[x+s*w/2,base+(h+1)/2,z]);
  for(let k=0;k<15;k++)b.add(new T.BoxGeometry(1.2,1.2,3.5),'#c9b594',[x-w/2+k*w/14,base+h+.6,z]);
  b.add(new T.BoxGeometry(3,4,.1),'#685944',[x,base+2,z+1.6]);facadeCourses(b,{x,y:base,z:z+1.54,w,h,color:'#bea98a',trim:'#ac997e',seed:523});for(const side of [-1,1])for(let j=0;j<12;j++){const a=j/12*Math.PI*2;b.add(new T.BoxGeometry(.75,.85,.7),'#c9b594',[x+side*w/2+Math.cos(a)*2.9,base+h+1.4,z+Math.sin(a)*2.9],[0,-a,0]);}
 }else if(code==='IRQ'){
  for(let h=0;h<3;h++){
   const xx=8+h*29,zz=-20-h%2*12;
   for(let rib=0;rib<7;rib++){
    const points=Array.from({length:13},(_,i)=>{const a=Math.PI*i/12;return v3(xx+Math.cos(a)*4.6,base+Math.sin(a)*10,zz-4+rib*1.3);});
    b.add(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.13,5,false),'#b4aa6f');
   }
   for(const s of [-1,1])b.add(new T.BoxGeometry(.18,4.6,8.6),'#a99d63',[xx+s*4.5,base+2.3,zz]);
  }
 }else if(code==='JOR'||code==='SAU'){
  rockFacade(b,x,base,z,code==='JOR'?13:10,code==='JOR'?20:15);
  if(code==='SAU')rockFacade(b,x+30,base,-48,8,12);
 }else if(code==='SYR'){
  for(let i=0;i<15;i++){
   const xx=-8+i*7;column(b,xx,base,z,12,.65,'#d0b88e');
   if(i<14)b.add(new T.BoxGeometry(7,.8,2),'#d9c39b',[xx+3.5,base+12,z]);
  }
 }else if(code==='ISR'){
  b.add(new T.BoxGeometry(33,1.5,17),'#baaa8a',[x,8,z-8]);
  for(const s of [-1,1]){b.add(new T.BoxGeometry(33,1,1),'#cbbb9b',[x,9,z-8+s*8]);b.add(new T.BoxGeometry(1,1,17),'#cbbb9b',[x+s*16,9,z-8]);}
  for(let i=0;i<5;i++)b.add(new T.BoxGeometry(4,1.3,3),'#c4b294',[x-10+i*5,9,z-8]);
 }else if(code==='LBN'){
  house(b,x,base,-43,9,5,'#a37b59');column(b,x+5,base,-43,9,1,'#b5b4a4');
 }else if(['KWT','QAT','ARE'].includes(code)){
  // Each waterfront has its own selected skyline, not a shared city silhouette.
  if(code==='KWT'){
   for(const [dx,h,r]of [[-7,33,3.8],[5,25,3.2],[13,20,.3]]){
    b.add(new T.CylinderGeometry(.25,1.1,h,16),'#d8d8c8',[x+dx,base+h/2,z]);
    if(r>1){b.add(new T.SphereGeometry(r,20,14),'#72a8a9',[x+dx,base+h*.65,z],[0,0,0],[1,.92,1]);if(dx<0)b.add(new T.SphereGeometry(2,16,12),'#b6d3cd',[x+dx,base+h*.88,z]);}
   }
  }else{
   for(let i=0;i<10;i++){
    const xx=-12+i*12,h=12+(i*17)%23,zz=z-5-(i%3)*8;
    if(code==='QAT'&&i===5){b.add(new T.CylinderGeometry(2.2,4,h,24),'#79a6b2',[xx,base+h/2,zz]);for(let k=0;k<12;k++)b.add(new T.TorusGeometry(2.4+k*.1,.07,4,24),'#c0c8c2',[xx,base+h-k*1.5,zz],[Math.PI/2,0,k*.1]);}
    else{b.add(new T.BoxGeometry(5,h,5),'#86adb8',[xx,base+h/2,zz]);for(let k=1;k<h;k+=1.8)b.add(new T.BoxGeometry(5.1,.08,5.1),'#c1cbd0',[xx,base+k,zz]);}
   }
   if(code==='ARE'){
    for(let j=0;j<10;j++){const h=4,wide=7-j*.6;b.add(new T.CylinderGeometry(wide*.55,wide*.65,h,3),'#9ebcc8',[x,base+j*4+h/2,z-4],[0,j*.3,0]);for(let floor=0;floor<4;floor++)b.add(new T.CylinderGeometry(wide*.55+.025,wide*.55+.025,.07,3),'#d1dcdd',[x,base+j*4+floor+.5,z-4],[0,j*.3,0]);}
    b.add(new T.CylinderGeometry(.06,.45,13,12),'#d2dedf',[x,base+46,z-4]);
   }
  }
 }
 if(b.parts.length)b.mesh(parent,vertexMaterial(.8),'west-architecture-'+code);
}
