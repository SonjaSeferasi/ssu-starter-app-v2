import * as T from 'three';
import {Builder,pixelTexture,vertexMaterial,v3} from '../kit/common';
import type {RemainingNorthAmericaCode} from '../../../lib/world-explorer/north-america-remaining';

/** Original dimensional studies: silhouettes, proportions and materials, rather
 * than photographic billboards or replicas of protected archaeological art. */
export function islandLandmark(parent:T.Group,code:RemainingNorthAmericaCode,name:string,x:number,y:number,z:number,low:boolean){
 const group=new T.Group();group.name=name;group.position.set(x,y,z);parent.add(group);
 const b=new Builder(.18),stone='#b9b69c',dark='#59675c',roof='#aa614c';
 const box=(w:number,h:number,d:number,c:string,px:number,py:number,pz:number)=>b.add(new T.BoxGeometry(w,h,d),c,[px,py,pz]);
 const column=(px:number,py:number,pz:number,h:number,c=stone)=>b.add(new T.CylinderGeometry(.22,.3,h,10),c,[px,py+h/2,pz]);
 const gable=(px:number,py:number,pz:number,w:number,d:number,c=roof)=>{const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,Math.min(3.2,w*.18));shape.lineTo(w/2,0);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});b.add(geo,c,[px,py,pz-d/2]);};
 const house=(px:number,py:number,pz:number,w:number,h:number,c:string,balcony=false)=>{
  box(w,h,5,c,px,py+h/2,pz);gable(px,py+h,pz,w+.5,5.5);
  for(let row=0;row<Math.floor(h/2);row++)for(let col=0;col<Math.floor(w/1.8);col++){
   const wx=px-w/2+1+col*1.8,wy=py+1.1+row*2;
   box(.8,1.15,.12,'#e6dbb9',wx,wy,pz+2.57);box(.56,.94,.14,'#375b5e',wx,wy,pz+2.65);
   if(balcony&&row>0){box(1.4,.12,.8,'#d9ceb0',wx,wy-.65,pz+2.9);for(let k=0;k<5;k++)box(.035,.65,.035,'#425e59',wx-.6+k*.3,wy-.25,pz+3.24);box(1.4,.04,.04,'#425e59',wx,wy+.1,pz+3.24);}
  }
  box(w+.3,.2,5.3,'#e8d8b8',px,py+h-.15,pz);
 };
 const fort=(w:number,h:number,d:number)=>{
  box(w,h,d,stone,0,h/2,0);box(w+.7,.5,d+.7,'#d0cbb1',0,h-.2,0);
  for(let i=0;i<Math.ceil(w/1.5);i++)for(const zz of [-d/2,d/2])box(.65,.9,.65,stone,-w/2+.5+i*1.5,h+.4,zz);
  for(let i=0;i<4;i++){const xx=-w/2+1.5+i*(w-3)/3;box(.35,1,.13,dark,xx,h*.65,d/2+.07);}
  for(let i=0;i<5;i++){const xx=-w/2+1.5+i*(w-3)/4;b.add(new T.CylinderGeometry(.17,.25,2.2,10),'#384b46',[xx,h+.35,d/2+.7],[Math.PI/2,0,0]);box(.8,.35,1.1,'#665c49',xx,h+.06,d/2+.3);}
 };
 let peakIndex=0;
 const mountain=(px:number,pz:number,w:number,h:number,c:string,crater=false)=>{
  const radial=low?32:56,rows=low?18:32,positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[],base=new T.Color(c);
  const rings=rows+(crater?6:0);
  for(let row=0;row<=rings;row++)for(let col=0;col<=radial;col++){
   const t=Math.min(1,row/rows),inside=row>rows,a=col/radial*Math.PI*2;
   const r=inside?w*.23*(1-(row-rows)/6):w*(crater?.23+.36*Math.pow(1-t,.85):.59*Math.pow(1-t,code==='LCA'?.64:.9));
   const ribs=1+.13*Math.cos(a*5+t*4)+.055*Math.sin(a*11-t*7)+.035*Math.cos(a*17+t*11);
   const yy=inside?h-((row-rows)/6)*6:h*t-(crater?Math.max(0,Math.sin(a))*3*Math.pow(t,5):0);
   positions.push(px+Math.cos(a)*r*ribs+Math.sin(t*2.5)*w*.055,yy-6,pz+Math.sin(a)*r*ribs);
   const rock=code==='VCT'?new T.Color('#77796f'):code==='NIC'?new T.Color('#92917d'):new T.Color('#8b9980');
   const color=base.clone().lerp(rock,Math.max(0,(t-.55)*1.6)+(inside?.25:0)).multiplyScalar(.91+.09*Math.sin(a*7+t*12));colors.push(color.r,color.g,color.b);uvs.push(col/radial,row/rings);
   if(row<rings&&col<radial){const k=row*(radial+1)+col;indices.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,vertexMaterial(.98,{side:T.DoubleSide}));mesh.name=code.toLowerCase()+'-peak-'+(++peakIndex);mesh.userData={landmarkPeak:true,erodedRidges:true,crater};group.add(mesh);
 };
 const mangroves=()=>{for(let i=0;i<(low?7:13);i++){const xx=(i%5-2)*5,zz=-Math.floor(i/5)*6;column(xx,-3,zz,7,'#786e55');for(let j=0;j<5;j++){const a=j*1.256;b.strut(v3(xx,1,zz),v3(xx+Math.cos(a)*2.4,-4,zz+Math.sin(a)*2.4),.13,'#81755a',7,.65);}for(let j=0;j<3;j++)b.add(new T.SphereGeometry(1,12,8),j%2?'#638e65':'#427b58',[xx+(j-1)*1.5,4.3+j*.3,zz],[0,0,0],[2.9,1.3,2.3]);}};
 switch(code){
 case 'ATG':
  house(0,0,0,24,4.7,'#c9bd9d');for(let i=0;i<9;i++)column(-10+i*2.5,0,3.9,4.3);box(26,.4,3,roof,0,4.4,3.7);
  for(let i=0;i<4;i++){const xx=-17+i*11;column(xx,-2,-11,15,'#c9b88e');b.strut(v3(xx-3,8,-11),v3(xx+3,8,-11),.06,'#a99270',6);b.strut(v3(xx-3,-2,-11),v3(xx,12,-11),.025,'#e9e0bf',4);}break;
 case 'BHS':
  for(let i=0;i<7;i++)b.add(new T.SphereGeometry(1,16,9),'#f0e7c9',[(i-3)*8,-6,-(i%2)*10],[0,0,0],[9,2.4,7]);
  for(const xx of [-5.3,4.8])b.add(new T.DodecahedronGeometry(1,1),'#cfc7a4',[xx,-.5,0],[.13,xx*.2,.14],[2,4.5,2.1]);b.add(new T.TorusGeometry(5,1.3,7,19,Math.PI),'#d4ccb0',[0,3,0],[0,.1,0],[1,.73,.8]);break;
 case 'BLZ':
 case 'TTO':mangroves();if(code==='BLZ')for(let i=0;i<16;i++){const xx=(i%8-4)*2.1,zz=-Math.floor(i/8)*4;b.add(new T.SphereGeometry(1,10,8),i%3?'#caac8e':'#b69fae',[xx,-3,zz],[0,0,0],[.85,.7,1]);for(let j=0;j<3;j++)b.strut(v3(xx,-3,zz),v3(xx+(j-1)*.6,-1.6,zz+.3),.14,'#c7ac99',6,.5);}else for(let i=0;i<14;i++){const xx=(i%7-3)*2.3,yy=4+(i%3)*.3,zz=-3-Math.floor(i/7)*4;b.add(new T.SphereGeometry(.24,8,6),'#db5648',[xx,yy,zz]);b.strut(v3(xx,yy+.08,zz),v3(xx+.7,yy+.2,zz),.11,'#ef6b54',5,.15);b.strut(v3(xx,yy,zz),v3(xx-.6,yy-.15,zz),.11,'#d84538',5,.15);}break;
 case 'BRB':house(0,0,0,24,5,'#b56f53');box(4,12,4,'#b56f53',0,6,0);gable(0,12,0,5,5,'#536b65');b.add(new T.CircleGeometry(1,24),'#f1e7c8',[0,10,2.04]);box(.08,.65,.06,dark,0,10.2,2.1);box(.55,.07,.06,dark,.23,10,2.1);for(let i=0;i<5;i++)column(-9+i*4.5,0,3.2,3.5);break;
 case 'CUB':
  for(let i=0;i<5;i++){const xx=(i-2)*7;house(xx,0,0,6.8,7+i%2*2,['#d7ad93','#b8c7ab','#d5ca9f','#b4c4be','#d5b4a1'][i],true);for(let j=0;j<3;j++){const ax=xx-2+j*2;column(ax,0,3.2,2.5);b.add(new T.TorusGeometry(.84,.12,6,12,Math.PI),'#e8d9bc',[ax+.85,2.5,3.2]);}}
  for(const side of [-1,1]){const hh=side<0?14:11;box(3,hh,4,stone,side*5,hh/2,-13);gable(side*5,hh,-13,3.6,4.6,stone);}house(0,0,-14,8,7,stone);break;
 case 'DOM':fort(10,15,8);house(-14,0,-6,12,5,'#c8b799');for(let i=0;i<4;i++)b.add(new T.TorusGeometry(1.15,.22,7,14,Math.PI),'#ded2b3',[-18+i*2.6,3,-2.9]);break;
 case 'SLV':
  for(let i=0;i<6;i++){const xx=(i%3-1)*7,zz=-Math.floor(i/3)*7;box(5,.7,5,'#bfa889',xx,.2,zz);for(const side of [-1,1])box(5,1.2,.4,'#b69b7b',xx,1,zz+side*2.3);box(.4,1.2,4,'#b69b7b',xx-2.3,1,zz);}
  for(const xx of [-12,12])for(const zz of [-11,5])column(xx,0,zz,7,'#687b78');gable(0,7,-3,28,20,'#6b807d');break;
 case 'HTI':{
  const shape=new T.Shape();shape.moveTo(-12,-7);shape.lineTo(12,-7);shape.lineTo(9,4);shape.lineTo(0,12);shape.lineTo(-9,4);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:13,bevelEnabled:true,bevelSize:.2,bevelThickness:.2,bevelSegments:1});geo.rotateX(-Math.PI/2);b.add(geo,'#aaa995',[0,0,0]);fort(19,13,9);
  for(let row=0;row<3;row++)for(const side of [-1,1]){box(.55,.75,.15,'#45574d',side*(7-row*.4),3+row*3.2,6+row*.2);box(.3,12,1.3,'#949b87',side*9,6,4.2);}
  for(let i=0;i<4;i++)b.add(new T.TorusGeometry(1.5,.3,8,16,Math.PI),'#c2b79b',[-15+i*3.5,2,10]);group.rotation.y=.35;break;}
 case 'HND':
  for(let i=0;i<9;i++)box(22-i*1.7,.55,12-i*.8,stone,0,i*.55,-i*.25);
  for(let i=0;i<20;i++)box(5,.22,.42,'#d0c7a7',0,.12+i*.24,6-i*.42);
  for(const xx of [-13,13]){box(1.8,5,1.1,'#a9b097',xx,2.5,3);for(let row=0;row<7;row++)for(let k=0;k<3;k++)box(.28,.32,.12,row%2?'#7b8a70':'#c2c3a2',xx-.55+k*.55,.5+row*.6,3.62);b.add(new T.SphereGeometry(1,12,9),'#aeb79a',[xx,4.5,3.65],[0,0,0],[.7,.65,.35]);}break;
 case 'NIC':mountain(-17,-14,36,28,'#737d59',true);mountain(23,-28,42,23,'#657953');break;
 case 'LCA':mountain(-14,-12,24,43,'#537e5c');mountain(18,-27,21,35,'#648b62');break;
 case 'DMA':mountain(-23,-18,34,29,'#648366');mountain(24,-23,38,35,'#547a5e');break;
 case 'VCT':mountain(0,-4,58,29,'#9a9e8b',true);break;
 case 'KNA':
  b.add(new T.CylinderGeometry(13,18,8,5),'#8a9680',[0,-3,0],[0,Math.PI/5,0]);fort(19,5,13);box(13,.3,8,'#7d8c70',0,5.2,0);house(0,5,-2,9,3,'#bbb69c');break;
 case 'GRD':
  for(let i=0;i<11;i++){const xx=(i-5)*6,yy=Math.abs(i-5)*.65,zz=-Math.abs(i-5)*1.4;house(xx,yy,zz,5.7,4.5+i%3,['#d5b08a','#b5bba2','#d1a19a','#e0cead'][i%4]);}box(2,15,3,'#c5bd9e',8,9,-10);b.add(new T.ConeGeometry(1.6,5,4),'#5d7771',[8,18,-10],[0,Math.PI/4,0]);break;
 case 'PAN':
  for(const side of [-1,1]){box(57,6,3,'#a2aba0',0,0,side*9);for(let i=0;i<12;i++){box(.6,.25,2.7,'#d7c77a',-26+i*4.6,3.2,side*9);column(-26+i*4.6,3,side*10,2,'#d1d8c7');}box(57,.15,.15,'#d8dec9',0,5,side*10);}
  for(const xx of [-19,19])for(const side of [-1,1])b.add(new T.BoxGeometry(10,5,.7),'#556e68',[xx+side*4.1,.5,side*4.5],[0,side*-.45,0]);
  box(25,3,6,'#395e68',0,1.2,0);box(7,5,5,'#e3dfc6',9,4,0);for(let row=0;row<2;row++)for(let col=0;col<5;col++)for(const side of [-1,1])box(3.5,1.6,2.4,['#b66d50','#c5a65a','#587c80','#8e9e79'][(col+row)%4],-9+col*3.6,3.4+row*1.7,side*1.4);house(18,3,-14,10,6,'#e0dfc8');break;
 }
 const architectural=['ATG','BRB','CUB','DOM','SLV','HTI','HND','KNA','GRD','PAN','BHS'].includes(code);
 const map=pixelTexture(128,(_u,_v,xx,yy)=>{const row=Math.floor(yy/12),joint=architectural&&(yy%12<1||(xx+(row%2)*16)%32<1),grain=Math.sin(xx*2.3+yy*7.1)*(architectural?4:2),base=239+grain-(joint?22:0);return[base,base,base];});
 b.mesh(group,vertexMaterial(.92,map?{map,bumpMap:map,bumpScale:.045}:{}),name+'-study');return group;
}
