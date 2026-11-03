import * as T from 'three';
import {batchStatic,hash,island,matte,mesh,nature,random,sphere,strut,type Biome} from './scenic-kit';
import {addProfileDistrict} from './profile-districts';

export type PlaceKind='mountain'|'pyramid'|'tower'|'palace'|'castle'|'pagoda'|'mosque'|'cathedral'|'old-town'|'harbour'|'bridge'|'ruins'|'rainforest'|'forest'|'glacier'|'savanna'|'wetland'|'desert'|'island'|'research-station'|'civic';
export type VisualProfile={code:string;landmarkName:string;landmarkKind:PlaceKind;biome:Biome;palette:{stone:string;roof:string;accent:string;foliage:string};features:string[];shapeHints?:{height?:number;width?:number;towers?:number;tiers?:number;arches?:number;roof?:'flat'|'gable'|'dome'|'tiered'|'spire'}};

/** Curved overhanging eaves with raised corners and a small ridge cap. */
export function eavesRoof(width:number,depth:number,height:number){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],steps=10,rows=4;
 for(let face=0;face<4;face++)for(let row=0;row<=rows;row++)for(let i=0;i<=steps;i++){
  const t=row/rows,u=i/steps*2-1,half=.5*(1-t)+.075*t,x=u*half,z=half,a=face*Math.PI/2;
  positions.push((x*Math.cos(a)+z*Math.sin(a))*width,(t+Math.pow(1-t,3)*(.22*Math.pow(Math.abs(u),4)+.045))*height,(z*Math.cos(a)-x*Math.sin(a))*depth);uv.push(i/steps,t);
 }
 const count=(rows+1)*(steps+1);for(let f=0;f<4;f++)for(let row=0;row<rows;row++)for(let i=0;i<steps;i++){const a=f*count+row*(steps+1)+i;indices.push(a,a+1,a+steps+1,a+1,a+steps+2,a+steps+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** A country profile drives the model's physical vocabulary and palette.
 * These are deliberately stylized place interpretations, never survey scans. */
export function profileLandmark(parent:T.Object3D,p:VisualProfile){
 const root=new T.Group();root.name='profile-place-'+p.code;root.userData.landmarkName=p.landmarkName;root.userData.landmarkKind=p.landmarkKind;parent.add(root);
 const r=random(hash(p.code)),features=p.features.join(' ').toLowerCase(),stone=matte(p.palette.stone),roof=matte(p.palette.roof),accent=matte(p.palette.accent),leaf=matte(p.palette.foliage),ink=matte('#30454b'),white=matte('#f1eddb');
 const w=5.6+r()*1.2,h=3.7+r()*1.1;
 const box=(x:number,y:number,z:number,width:number,height:number,depth:number,m:T.Material=stone)=>mesh(root,new T.BoxGeometry(width,height,depth),m,x,y,z);
 const column=(x:number,z:number,height:number,radius=.18,m:T.Material=stone)=>mesh(root,new T.CylinderGeometry(radius*.87,radius,height,12),m,x,height/2,z);
 const beam=(a:[number,number,number],b:[number,number,number],radius=.07,m:T.Material=stone)=>strut(root,m,new T.Vector3(...a),new T.Vector3(...b),radius);
 const gable=(x:number,y:number,z:number,width:number,depth:number,height=.8)=>{const g=mesh(root,new T.ConeGeometry(width*.71,height,4),roof,x,y,z);g.rotation.y=Math.PI/4;g.scale.z=depth/width;return g;};
 const windows=(x:number,y:number,z:number,width:number,count=4)=>{for(let i=0;i<count;i++)box(x+(i-(count-1)/2)*width/count,y,z,.26,.43,.04,ink);};
 const house=(x:number,z:number,width:number,height:number,flat=false)=>{box(x,height/2,z,width,height,width*.75,stone);windows(x,height*.6,z+width*.38,width*.85,3);if(flat)box(x,height+.05,z,width*1.08,.15,width*.85,roof);else if(p.shapeHints?.roof==='dome'||/domes|cupola|byzantine/.test(features)){const dome=mesh(root,new T.SphereGeometry(.5,20,12,0,Math.PI*2,0,Math.PI/2),roof,x,height,z);dome.scale.set(width*1.15,width*.8,width*1.15);}else gable(x,height+.33,z,width*1.18,width*.9);};
 const arch=(x:number,y:number,z:number,width:number,height:number,m:T.Material=stone)=>{
  const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(-width/2,height-width/2);shape.absarc(0,height-width/2,width/2,Math.PI,0,true);shape.lineTo(width/2,0);shape.lineTo(width/2-.22,0);shape.lineTo(width/2-.22,height-width/2);shape.absarc(0,height-width/2,width/2-.22,0,Math.PI,false);shape.lineTo(-width/2+.22,0);shape.closePath();
  return mesh(root,new T.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1,steps:1}),m,x,y,z);
 };
 const pagoda=(x:number,z:number,tiers:number)=>{
  for(let i=0;i<tiers;i++){const size=w*.7-i*.54,y=i*1.15;box(x,y+.47,z,size,.92,size*.7,stone);windows(x,y+.5,z+size*.355,size*.8,3);
   // An overhanging roof has modeled upturned corners, not a flat poster.
   const roofShape=new T.BufferGeometry(),v:number[]=[],ix:number[]=[];const steps=8;
   for(let face=0;face<4;face++)for(let j=0;j<=steps;j++){const u=j/steps*2-1,a=face*Math.PI/2,px=u*size*.7,pz=size*.65,yy=y+1.02+.23*Math.pow(Math.abs(u),4);v.push(px*Math.cos(a)+pz*Math.sin(a)+x,yy,pz*Math.cos(a)-px*Math.sin(a)+z,Math.sin(a)*.15+x,y+1.63,Math.cos(a)*.15+z);if(j<steps){const k=(face*(steps+1)+j)*2;ix.push(k,k+2,k+1,k+1,k+2,k+3);}}
   roofShape.setAttribute('position',new T.Float32BufferAttribute(v,3));roofShape.setIndex(ix);roofShape.computeVertexNormals();const mat=roof.clone();mat.side=T.DoubleSide;mesh(root,roofShape,mat);
  }
 };
 const tree=(x:number,z:number,size:number,biome=p.biome)=>nature(root,biome,x,0,z,size,Math.floor(r()*100000));
 const kind=p.landmarkKind,name=p.landmarkName.toLowerCase();
 if(/kuwait towers/.test(name)){
  const mosaic=new T.MeshStandardMaterial({color:'#66a9b3',roughness:.35,metalness:.2});
  for(const [x,height] of [[-2.5,7],[.3,5.7],[2.7,4.9]])mesh(root,new T.CylinderGeometry(.065,.19,height,16),white,x,height/2,0);
  sphere(root,mosaic,-2.5,4.3,0,.88,.95,.88);sphere(root,mosaic,-2.5,6.02,0,.43,.47,.43);sphere(root,mosaic,.3,3.6,0,.92,.96,.92);
  for(const [x,y,rad] of [[-2.5,4.3,.89],[-2.5,6.02,.44],[.3,3.6,.93]]){const band=mesh(root,new T.TorusGeometry(rad,.035,6,28),accent,x,y,0);band.rotation.x=Math.PI/2;}
 }else if(/ha.?amonga|trilithon/.test(name)){
  // The monument is a trilithon: two uprights and one horizontal lintel.
  box(-1.7,1.5,0,.95,3,.72,stone);box(1.7,1.5,0,.95,3,.72,stone);box(0,3.17,0,4.65,.65,.86,stone);
 }else if(/cristo rei/.test(name)){
  box(0,.22,0,2.8,.44,2.4,stone);sphere(root,accent,0,1.15,0,1.05);mesh(root,new T.ConeGeometry(.45,2.2,14),stone,0,2.9,0);sphere(root,stone,0,4.18,0,.25,.32,.25);
  beam([0,3.58,0],[-1.65,3.65,0],.12,stone);beam([0,3.58,0],[1.65,3.65,0],.12,stone);sphere(root,stone,-1.7,3.65,0,.12,.08,.08);sphere(root,stone,1.7,3.65,0,.12,.08,.08);
 }else if(/gishora/.test(name)){
  const reed=matte('#b49c66'),thatch=matte('#8f7949');
  for(const [x,z,size] of [[-3,0,1.2],[.3,-1.1,1.65],[3.5,.6,1.05]]){
   mesh(root,new T.CylinderGeometry(size,size,1.15,28),reed,x,.575,z);box(x,.45,z+size+.01,.44,.9,.04,ink);
   const roofPoints=[new T.Vector2(size*1.2,0),new T.Vector2(size*1.05,.3),new T.Vector2(size*.65,.85),new T.Vector2(size*.22,1.2),new T.Vector2(0,1.32)];mesh(root,new T.LatheGeometry(roofPoints,28),thatch,x,1.12,z);
   for(let j=0;j<16;j++){const a=j*Math.PI/8;beam([x+Math.sin(a)*size,.04,z+Math.cos(a)*size],[x+Math.sin(a)*size,1.08,z+Math.cos(a)*size],.012,accent);}
  }
 }else if(/mongomo/.test(name)){
  box(0,1.45,0,6,2.9,3.5,white);const dome=(x:number,y:number,z:number,radius:number)=>{const o=mesh(root,new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI/2),roof,x,y,z);o.scale.set(radius,radius*.85,radius);};dome(0,2.9,0,1.3);
  for(const x of [-2.2,2.2])for(const z of [-1.15,1.15])dome(x,2.9,z,.55);for(let i=0;i<5;i++)arch((i-2)*1.02,0,1.79,.75,1.9,stone);
  for(const x of [-4.2,4.2])for(let i=0;i<4;i++){column(x,i*.8-1.1,1.65,.11,white);box(x,1.74,.1,.6,.18,3.5,white);}
 }else if(/laas geel/.test(name)){
  const rock=matte(p.palette.stone);box(0,1.2,-.1,6.6,2.4,.4,rock);sphere(root,rock,0,2.9,0,4.4,.67,2.2);for(const side of [-1,1])sphere(root,rock,side*3.5,1.25,.6,1.1,1.7,1.7);
  const paint=new T.LineBasicMaterial({color:'#9d4b37'});for(let i=0;i<3;i++){const x=(i-1)*1.6,points=[[-.45,1.65],[.42,1.65],[.62,1.83],[.77,1.82],[.65,1.64],[.38,1.42],[-.4,1.42],[-.45,1.65]];const g=new T.BufferGeometry().setFromPoints(points.map(([px,py])=>new T.Vector3(x+px,py,.115)));root.add(new T.Line(g,paint));for(const dx of [-.3,.22]){const legs=new T.BufferGeometry().setFromPoints([new T.Vector3(x+dx,1.43,.115),new T.Vector3(x+dx+.05,1.12,.115)]);root.add(new T.Line(legs,paint));}}
 }else if(/lake assal/.test(name)){
  const salt=matte('#ebe7cf');const rim=mesh(root,new T.RingGeometry(3,5.4,48),salt,0,.08,0);rim.rotation.x=-Math.PI/2;rim.scale.y=.65;const lake=mesh(root,new T.CircleGeometry(3,48),new T.MeshStandardMaterial({color:'#61a5a3',roughness:.24}),0,.03,0);lake.rotation.x=-Math.PI/2;lake.scale.y=.65;
  for(let i=0;i<7;i++){const a=i*Math.PI/3.5;sphere(root,stone,Math.sin(a)*5,.3,Math.cos(a)*3.1,.65,.4,.55);}
 }else if(/sibebe/.test(name)){
  const dome=mesh(root,new T.SphereGeometry(1,30,20,0,Math.PI*2,0,Math.PI/2),stone,0,0,0);dome.scale.set(5.3,4.1,3.7);for(const x of [-4.5,4.5])tree(x,2.5,.8,'temperate');
 }else if(/funafuti/.test(name)){
  const sand=matte('#e9dbb4');const ring=mesh(root,new T.RingGeometry(2.6,4.3,48),sand,0,.06,0);ring.rotation.x=-Math.PI/2;ring.scale.y=.65;const lagoon=mesh(root,new T.CircleGeometry(2.6,48),new T.MeshStandardMaterial({color:'#35b9bb',roughness:.22,metalness:.1}),0,.02,0);lagoon.rotation.x=-Math.PI/2;lagoon.scale.y=.65;
  for(const a of [.4,2.1,4.2]){const x=Math.sin(a)*3.7,z=Math.cos(a)*2.45;sphere(root,sand,x,.13,z,.6,.14,.5);tree(x,z,.9,'coastal');}
 }else if(/molinere|underwater sculpture/.test(name)){
  const seabed=mesh(root,new T.CircleGeometry(1,40),stone,0,.01,0);seabed.rotation.x=-Math.PI/2;seabed.scale.set(5.1,3.8,1);const sculpture=matte('#6f9990');
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a)*1.6,z=Math.cos(a)*1.2;mesh(root,new T.CylinderGeometry(.1,.14,.6,8),sculpture,x,.4,z);sphere(root,sculpture,x,.9,z,.14,.17,.13);beam([x-.22,.6,z],[x+.22,.6,z],.045,sculpture);}
  const water=mesh(root,new T.PlaneGeometry(10.2,7.6),new T.MeshStandardMaterial({color:'#30aeb4',roughness:.22,transparent:true,opacity:.45,side:T.DoubleSide}),0,1.35,0);water.rotation.x=-Math.PI/2;
 }else if(/queen.?s staircase/.test(name)){
  for(const side of [-1,1])box(side*1.8,1.9,-.5,1.6,3.8,7.6,stone);for(let i=0;i<18;i++)box(0,.12+i*.18,3.1-i*.33,1.9,.24,.4,stone);for(const x of [-3,3])tree(x,-1.5,1.15,'tropical');
 }else if(/pitch lake/.test(name)){
  const asphalt=matte('#343b39'),pool=new T.MeshStandardMaterial({color:'#718e89',roughness:.38});const deposit=mesh(root,new T.CircleGeometry(1,48),asphalt,0,.03,0);deposit.rotation.x=-Math.PI/2;deposit.scale.set(5,3.4,1);
  for(let i=0;i<10;i++){const x=(r()-.5)*7,z=(r()-.5)*4;const patch=mesh(root,new T.CircleGeometry(.2+r()*.4,14),pool,x,.05,z);patch.rotation.x=-Math.PI/2;}for(const x of [-5,5])tree(x,-2,.8,'tropical');
 }else if(/to.?sua|to sua/.test(name)){
  const wall=mesh(root,new T.CylinderGeometry(2.7,3.3,3.3,36,1,true),stone,0,-1.55,0);wall.material.side=T.DoubleSide;const grass=mesh(root,new T.RingGeometry(2.7,4.4,48),leaf,0,.12,0);grass.rotation.x=-Math.PI/2;const pool=mesh(root,new T.CircleGeometry(2.7,48),new T.MeshStandardMaterial({color:'#2bacaa',roughness:.23,metalness:.1}),0,-2.7,0);pool.rotation.x=-Math.PI/2;
  for(const x of [-.28,.28])beam([x,.35,2.6],[x,-2.8,2.6],.035,accent);for(let i=0;i<13;i++)beam([-.3,.3-i*.24,2.6],[.3,.3-i*.24,2.6],.025,accent);for(const x of [-4,4])tree(x,-1.6,1.2,'tropical');
 }else if(/kaieteur/.test(name)){
  const water=new T.MeshStandardMaterial({color:'#c4ece8',roughness:.3,transparent:true,opacity:.82,side:T.DoubleSide});const river=mesh(root,new T.PlaneGeometry(3.2,6),new T.MeshStandardMaterial({color:'#6db2ad',roughness:.3}),0,.04,0);river.rotation.x=-Math.PI/2;mesh(root,new T.PlaneGeometry(3.2,8.2),water,0,-4.1,3.1);for(let i=0;i<8;i++)sphere(root,white,(i-3.5)*.45,-7.9,3.2,.5,.2,.3);for(const x of [-5,-3,3,5])tree(x,-1.1,1.35,'tropical');
 }else if(/male.*friday|malé.*friday/.test(name)){
  house(0,0,4.7,2.2,false);gable(0,2.6,0,5.6,4.1,.9);column(3.3,.2,3.2,.38,stone);sphere(root,accent,3.3,3.35,.2,.45,.2,.45);for(let i=0;i<5;i++)arch((i-2)*.85,0,1.85,.62,1.4,accent);
 }else if(/taktsang|tiger.?s nest/.test(name)){
  for(let i=0;i<3;i++){const x=(i-1)*2.5,height=3+i*.8;const cliff=mesh(root,new T.CylinderGeometry(1.2,1.9,height,7),stone,x,height/2-2.6,-.6);cliff.rotation.y=i*.3;house(x,-.3,2.2,1.9+i*.35,false);}for(const x of [-5,5])tree(x,-1,1.5,'forest');
 }else if(/petra/.test(name)){
  box(0,2.75,-.7,9.5,5.5,1.6,stone);
  const front=matte(p.palette.accent);for(const x of [-2.4,-1.4,1.4,2.4]){column(x,.35,3.3,.2,front);box(x,3.38,.35,.62,.17,.6,front);}
  box(0,1.22,.26,1.1,2.44,.06,ink);box(0,3.53,.45,6.3,.25,.7,front);gable(0,4.05,.48,6.2,.8,1.1);column(0,.4,4.9,.44,front);sphere(root,front,0,5.06,.4,.5,.22,.48);
 }else if(/angkor/.test(name)){
  for(let i=0;i<4;i++){const size=7.5-i*.9;box(0,i*.3+.15,0,size,.3,size*.65,stone);}
  for(const [x,z,height] of [[0,0,5.5],[-2,1.2,3.4],[2,1.2,3.4],[-1.7,-1.1,3.1],[1.7,-1.1,3.1]]){
   for(let level=0;level<4;level++){const size=1.2-level*.19;box(x,1.2+level*height/5,z,size,height/5,size,stone);}sphere(root,accent,x,1.2+height*.76,z,.33,.8,.33);
  }for(const x of [-5.5,5.5])tree(x,0,1.5,'tropical');
 }else if(/colosseum/.test(name)||/amphitheatre|amphitheater/.test(features)){
  // An elliptical open arena with repeated arched bays, not a solid castle.
  const count=18;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,x=Math.sin(a)*4.4,z=Math.cos(a)*2.8;const bay=new T.Group();bay.position.set(x,0,z);bay.rotation.y=a;root.add(bay);for(let row=0;row<3;row++){const shape=new T.Shape();shape.moveTo(-.62,0);shape.lineTo(.62,0);shape.lineTo(.62,.8);shape.lineTo(-.62,.8);shape.closePath();const hole=new T.Path();hole.absellipse(0,.32,.25,.37,0,Math.PI*2,false,0);shape.holes.push(hole);mesh(bay,new T.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false}),stone,0,row*.85,0);}}
 }else if(/westminster|big ben|elizabeth tower/.test(name)||/clock tower/.test(features)){
  box(0,2.4,0,1.6,4.8,1.5,stone);for(const y of [.7,1.8,2.9,4.3])box(0,y,0,1.85,.16,1.72,accent);
  const face=mesh(root,new T.CircleGeometry(.48,32),white,0,3.7,.766);face.name='clock-face';const rim=mesh(root,new T.TorusGeometry(.48,.05,6,24),accent,0,3.7,.79);beam([0,3.7,.82],[0,4.04,.82],.025,ink);beam([0,3.7,.82],[.25,3.55,.82],.025,ink);gable(0,5.35,0,2,1.9,1.5);beam([0,5.9,0],[0,6.8,0],.06,accent);for(let i=0;i<4;i++)house(-3-i*1.1,-.8,1.05,2.4,true);
 }else if(/borobudur/.test(name)){
  for(let i=0;i<5;i++){const size=7-i*.95;box(0,i*.48+.24,0,size,.48,size,stone);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a)*1.65,z=Math.cos(a)*1.65;sphere(root,stone,x,2.65,z,.33,.4,.33);mesh(root,new T.ConeGeometry(.08,.45,8),accent,x,3.15,z);}sphere(root,stone,0,2.85,0,.67,.6,.67);mesh(root,new T.ConeGeometry(.14,.8,10),accent,0,3.53,0);
 }else if(/acropolis|temple of apollo/.test(name)){
  for(let i=0;i<3;i++)box(0,i*.15+.075,0,7-i*.3,.15,4-i*.3,stone);
  for(const z of [-1.5,1.5])for(let i=0;i<7;i++){const x=(i-3)*.9;column(x,z,3.1,.16);box(x,3.2,z,.45,.18,.45,accent);}box(0,3.3,0,6.8,.22,3.6,stone);gable(0,3.85,0,6.8,3.8,1.1);
 }else if(/alhambra/.test(name)){
  for(const side of [-1,1]){box(side*3,1.2,0,1.1,2.4,5,stone);for(let i=0;i<5;i++)arch(side*2.4,0,(i-2)*.85,.7,1.7,accent);gable(side*3,2.7,0,1.6,5.6,.8);}box(0,1.3,-2.3,6.8,2.6,.8);box(0,.05,.3,2.1,.1,3.7,new T.MeshStandardMaterial({color:'#6faca5',roughness:.2,metalness:.2}));for(const x of [-1.8,1.8])tree(x,2.8,.9,'temperate');
 }else if(addProfileDistrict(root,p)){
  // Source-supported district traits take precedence over the generic family.
 }else if(kind==='mountain'){
  const volcanic=/volcan|fuji|kilimanjaro/.test(features+' '+p.landmarkName.toLowerCase()),count=volcanic?1:4;
  for(let i=0;i<count;i++){const x=volcanic?0:(i-1.5)*2.2,height=volcanic?7.4:4.1+r()*3.2,radius=volcanic?5:2.6+r()*1.6;const peak=mesh(root,new T.ConeGeometry(radius,height,volcanic?28:7),stone,x,height/2,-.8);peak.rotation.y=r()*1.4;
   if(/snow|glacier|ice|alpine|fuji|everest|kilimanjaro/.test(features+' '+p.landmarkName.toLowerCase())){const cap=mesh(root,new T.ConeGeometry(radius*.32,height*.34,volcanic?28:7),white,x,height*.84,-.8);cap.rotation.y=peak.rotation.y;}
  }for(const x of [-6,-4,4,6])tree(x,1.9,.9);
 }else if(kind==='pyramid'){
  const stepped=/stepped|maya|tikal|mesoamerican|teotihuac|palenque|chichen|pre-hispanic/.test(features+' '+p.landmarkName.toLowerCase());
  if(stepped){const tiers=5;for(let i=0;i<tiers;i++){const size=6-i*.9;box(0,i*.65+.325,0,size,.65,size*.8);}house(0,0,1.7,4.6,true);for(let i=0;i<11;i++)box(0,.15+i*.3,2.8-i*.18,.78,.3,.35,accent);}
  else for(let i=0;i<3;i++){const height=i===0?6:3.8+i*.2,x=(i-1)*4.1,z=i===0?-1.2:1.1;const pyramid=mesh(root,new T.ConeGeometry(height*.67,height,4),stone,x,height/2,z);pyramid.rotation.y=Math.PI/4;}
 }else if(kind==='tower'){
  const leaning=/lean|pisa/.test(features+' '+p.landmarkName.toLowerCase()),metal=/iron|lattice|steel/.test(features);
  const tower=new T.Group();root.add(tower);if(leaning)tower.rotation.z=-.07;
  if(metal){for(const side of [-1,1])for(const z of [-1,1])strut(tower,accent,new T.Vector3(side*1.6,0,z*1.1),new T.Vector3(side*.12,6,z*.12),.14);for(let i=0;i<7;i++)mesh(tower,new T.TorusGeometry(1.6-i*.2,.05,5,12),accent,0,i*.8,0).rotation.x=Math.PI/2;}
  else{mesh(tower,new T.CylinderGeometry(1,1.3,5.5,20),stone,0,2.75,0);for(let i=1;i<=6;i++){const ring=mesh(tower,new T.TorusGeometry(1.17,.1,6,24),accent,0,i*.8,0);ring.rotation.x=Math.PI/2;for(let j=0;j<10;j++)mesh(tower,new T.CylinderGeometry(.035,.04,.58,6),stone,Math.cos(j*.628)*1.18,i*.8-.4,Math.sin(j*.628)*1.18);}mesh(tower,new T.ConeGeometry(1.1,1,12),roof,0,6,0);}
 }else if(kind==='castle'||kind==='palace'){
  const palace=kind==='palace';house(0,0,w,h,!!p.shapeHints?.roof&&p.shapeHints.roof==='flat');
  const towers=Math.min(6,Math.max(2,p.shapeHints?.towers??(palace?2:4)));
  for(let i=0;i<towers;i++){const side=i%2?1:-1,x=side*(w*.5+.25),z=i<2?1.35:-1.35,height=h+(palace?.2:1);column(x,z,height,.46);if(p.shapeHints?.roof==='dome')sphere(root,roof,x,height,z,.65,.55,.65);else gable(x,height+.35,z,1.2,1.2,1);}
  arch(0,0,w*.38+.02,1.3,1.9,accent);if(!palace)for(let x=-w/2;x<w/2;x+=.6)box(x,h+.18,w*.38,.32,.37,.27,accent);
 }else if(kind==='pagoda')pagoda(0,0,Math.min(5,Math.max(2,p.shapeHints?.tiers??3)));
 else if(kind==='mosque'){
  const earthen=/earthen|adobe|mud|timbuktu|djenn/.test(features+' '+p.landmarkName.toLowerCase());box(0,1.35,0,5.5,2.7,3.4);
  if(earthen){for(const x of [-1.9,0,1.9]){const tower=mesh(root,new T.CylinderGeometry(.4,.75,4.5,4),stone,x,2.25,-.5);tower.rotation.y=Math.PI/4;for(let y=.7;y<4.1;y+=.45)for(const side of [-1,1])box(x+side*.65,y,.15,.5,.07,.08,accent);}}
  else{if(p.shapeHints?.roof==='dome'||/dome|cupola/.test(features))sphere(root,roof,0,2.7,0,1.65,1.1,1.45);else box(0,2.76,0,5.7,.15,3.6,roof);if(/minaret/.test(features))for(const x of [-3.1,3.1]){column(x,-.8,4.7,.2);sphere(root,accent,x,4.75,-.8,.3,.4,.3);}}
  for(const x of [-1.65,0,1.65])arch(x,0,1.73,.95,1.8,accent);
 }else if(kind==='cathedral'){
  const domed=/onion|domes|byzantine|orthodox/.test(features);box(0,1.6,0,4.4,3.2,3.8);gable(0,3.5,0,4.6,4.1,1.5);
  for(const x of [-1.8,1.8]){column(x,1.15,4.8,.48);if(domed)sphere(root,roof,x,5,1.15,.73,.87,.73);else mesh(root,new T.ConeGeometry(.73,1.5,8),roof,x,5.45,1.15);beam([x,6,1.15],[x,6.55,1.15],.025,accent);beam([x-.14,6.38,1.15],[x+.14,6.38,1.15],.025,accent);}
  const rose=mesh(root,new T.TorusGeometry(.58,.1,7,24),accent,0,2.35,1.97);rose.rotation.z=.2;arch(0,0,1.94,1.2,1.55,accent);
 }else if(kind==='old-town'||kind==='civic'){
  const flat=p.shapeHints?.roof==='flat'||/flat roof|courtyard|medina/.test(features),civic=kind==='civic';
  for(let i=0;i<5;i++){const x=(i-2)*1.75,height=1.65+r()*1.45;house(x,(i%2)*.45,1.45,height,flat);}
  if(civic){box(0,.1,2.7,8.8,.2,1.2,accent);for(const x of [-3,3])tree(x,2.4,.85);}else{arch(0,0,2.1,1.4,2.2,accent);for(const x of [-5.6,5.6])tree(x,1.8,.9);}
 }else if(kind==='bridge'){
  const suspension=/suspension|cable|rope/.test(features),length=10;box(0,1.1,0,length,.22,1.6);
  if(suspension){
   for(const x of [-3.8,3.8])column(x,0,4.7,.2);
   for(const z of [-.8,.8]){const curve=new T.QuadraticBezierCurve3(new T.Vector3(-3.8,4.5,z),new T.Vector3(0,-.2,z),new T.Vector3(3.8,4.5,z));mesh(root,new T.TubeGeometry(curve,24,.04,5,false),accent);for(let i=0;i<11;i++){const p=curve.getPoint(i/10);beam([p.x,1.2,z],[p.x,p.y,z],.02,accent);}}
  }
  else{const n=Math.min(6,Math.max(2,p.shapeHints?.arches??4));for(let i=0;i<n;i++){const x=(i-(n-1)/2)*length/n;arch(x,-1.7,0,length/n,2.8,stone);}}
 }else if(kind==='ruins'){
  const columns=/column|roman|greek|classical|acropolis|temple/.test(features),stepped=/stepped|terrace|inca|machu/.test(features+' '+p.landmarkName.toLowerCase());
  if(columns){for(const x of [-3,-1.5,0,1.5,3]){column(x,0,2.7+(x===0?.3:0),.23);box(x,2.85,0,.6,.22,.65,accent);}box(-.8,3,0,5.3,.32,.7,stone);}
  else for(let i=0;i<6;i++){const x=(i-2.5)*1.5,height=.5+r()*1.5;box(x,height/2,(i%2)*.6,1.3,height,1.6);if(stepped)box(x-.2,height+.15,0,.95,.3,1.8,accent);}
  for(let i=0;i<9;i++)box((r()-.5)*8,.12,1+r()*1.8,.35+r()*.55,.24,.35+r()*.3,stone);
 }else if(kind==='rainforest'||kind==='forest'||kind==='savanna'){
  const green=kind==='rainforest',woodland=kind==='forest';
  if(woodland&&/baobab/.test(features)){
   for(let i=0;i<4;i++){const x=(i-1.5)*3.5;mesh(root,new T.CylinderGeometry(.34,.72,3.1,12),matte('#a3876d'),x,1.55,0);for(let j=0;j<6;j++){const a=j*2.4,px=x+Math.sin(a)*.85,pz=Math.cos(a)*.6;beam([x,2.4,0],[px,3.5,pz],.11,stone);sphere(root,leaf,px,3.6,pz,.57,.3,.45);}}
  }else for(let i=0;i<(green?11:woodland?8:6);i++)tree(-6+i*(green?1.2:woodland?1.7:2.3),(i%3)-1,green?1.2+r()*.9:1.3+r()*.6,green?'tropical':woodland?'temperate':'grassland');
  if(green){const water=new T.MeshStandardMaterial({color:'#b5e7e5',roughness:.35,transparent:true,opacity:.72,side:T.DoubleSide});for(const x of [-3,1.4,4])mesh(root,new T.PlaneGeometry(.8,6),water,x,-3,3.3);}
 }else if(kind==='glacier'){
  const ice=new T.MeshPhysicalMaterial({color:p.palette.accent,roughness:.23,clearcoat:.7});for(let i=0;i<9;i++){const height=2+r()*4,block=box((i-4)*1.15,height/2,-r()*2,1.4,height,2.3,ice);block.rotation.z=(r()-.5)*.19;sphere(root,white,block.position.x,height,-.5,.83,.24,1.2);}
 }else if(kind==='wetland'){
  const marine=/reef|coral|marine|lagoon|atoll/.test(features+' '+p.landmarkName.toLowerCase());box(0,-.12,0,11,.18,6,new T.MeshStandardMaterial({color:marine?'#24b8bd':'#418f8d',roughness:.25,metalness:.15}));
  if(marine){for(let i=0;i<14;i++)sphere(root,i%2?accent:leaf,(r()-.5)*9,.15,(r()-.5)*4,.2+r()*.25,.25+r()*.45,.24);}
  else for(let i=0;i<20;i++){const x=(r()-.5)*10,z=(r()-.5)*4;beam([x,0,z],[x,.5+r()*.8,z],.018,leaf);if(i%3===0)sphere(root,leaf,x,.03,z,.3,.025,.22);}
 }else if(kind==='desert'){
  for(let i=0;i<5;i++){const dune=sphere(root,stone,(i-2)*2.7,.3,-(i%2),2.9,.8+r()*.55,2);dune.rotation.z=(r()-.5)*.2;}for(const x of [-5,5])tree(x,1.8,.8,'desert');
 }else if(kind==='island'||kind==='harbour'){
  for(const x of [-5,-2,5])tree(x,-1,.9+r()*.4,p.biome==='alpine'?'alpine':'coastal');
  if(kind==='harbour'){box(0,.12,2.2,8,.24,1,accent);for(let i=0;i<4;i++){const x=(i-1.5)*2;const hull=mesh(root,new T.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),roof,x,.03,3.3);hull.rotation.z=Math.PI;hull.scale.set(.7,.3,.45);beam([x,0,3.3],[x,1.8,3.3],.025,accent);const sail=new T.Shape();sail.moveTo(0,0);sail.lineTo(.75,0);sail.lineTo(0,1.4);sail.closePath();mesh(root,new T.ShapeGeometry(sail),new T.MeshStandardMaterial({color:'#f1eddb',side:T.DoubleSide}),x,.3,3.3);}}
 }else{house(-2,0,2.6,1.5,true);house(2,0,2.6,1.5,true);column(0,-1,3.5,.05,accent);}
 batchStatic(root);return root;
}

/** Profile-based masonry, boardwalk or natural edging for every country. */
export function profilePlatform(root:T.Group,p:VisualProfile,width:number,index:number){
 const cap=root.getObjectByName('country-platform-cap') as T.Mesh<T.CircleGeometry,T.MeshStandardMaterial>|undefined;
 const natural=['mountain','rainforest','forest','glacier','savanna','wetland','desert','island'].includes(p.landmarkKind),stone=matte(p.palette.stone),accent=matte(p.palette.accent);
 if(cap)cap.material.color.set(natural?(p.landmarkKind==='glacier'?'#ecf8fa':p.landmarkKind==='desert'?p.palette.stone:p.palette.foliage):p.palette.stone);
 if(!natural){const rim=mesh(root,new T.BoxGeometry(width,.18,.15),stone,0,-.1,1.4);rim.name='country-profile-masonry';for(let x=-width/2+.2;x<width/2;x+=.6){const post=mesh(root,new T.BoxGeometry(.07,.48,.08),accent,x,.24,-1.42);post.name='country-profile-back-rail';}mesh(root,new T.BoxGeometry(width,.07,.08),accent,0,.46,-1.42);}
 else if(index%2===0){const p1=sphere(root,stone,-width*.34,-.1,1.25,.25,.17,.24);p1.name='country-profile-natural-rim';}
}

export function localFlagUrl(iso2:string|undefined,expedition=false){
 return expedition?null:iso2&&/^[a-z]{2}$/i.test(iso2)?'/world-explorer/flags/'+iso2.toLowerCase()+'.svg':null;
}

export function cherryBlossom(parent:T.Object3D,x:number,y:number,z:number,size:number,seed:number){
 const root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(size);root.name='seasonal-cherry-blossom';parent.add(root);const r=random(seed),bark=matte('#805d4e'),pink=matte('#efb3c6'),pale=matte('#f7dce6');
 strut(root,bark,new T.Vector3(0,0,0),new T.Vector3(.12,1.4,0),.09);
 for(let i=0;i<9;i++){const a=i*2.4,px=Math.sin(a)*.58,py=1.35+r()*.55,pz=Math.cos(a)*.5;strut(root,bark,new T.Vector3(.08,.85,0),new T.Vector3(px,py,pz),.027);sphere(root,i%3?pink:pale,px,py,pz,.37,.27,.35);}
 return root;
}

/** A real bundled national flag. Antarctica gets a clearly neutral expedition
 * design because it is not a country and has no single national flag. */
export function countryFlag(parent:T.Object3D,iso2:string|undefined,expedition=false){
 const root=new T.Group();root.position.set(2.4,0,-.9);root.name='country-flag';parent.add(root);
 mesh(root,new T.CylinderGeometry(.025,.035,2.8,10),matte('#d3c49b'),0,1.4,0);sphere(root,matte('#e8c55e'),0,2.85,0,.07);
 const geometry=new T.PlaneGeometry(1,1,12,5),positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 const material=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,transparent:true,alphaTest:.04,toneMapped:false}),flag=mesh(root,geometry,material,.025,2.3,0);flag.castShadow=false;
 let width=1.44,height=.9,disposed=false,texture:T.Texture|undefined;
 const url=localFlagUrl(iso2,expedition);
 if(expedition){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=240;const c=canvas.getContext('2d')!;c.fillStyle='#285a85';c.fillRect(0,0,384,240);c.strokeStyle='#f3f3e5';c.lineWidth=6;
  c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.moveTo(192,103);c.lineTo(192+Math.sin(a)*(i%2?43:66),103+Math.cos(a)*(i%2?43:66));}c.stroke();c.beginPath();c.arc(192,103,42,0,Math.PI*2);c.stroke();c.fillStyle='#fff5cf';c.font='bold 25px Arial';c.textAlign='center';c.fillText('EXPEDITION',192,209);texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;material.map=texture;material.needsUpdate=true;
 }else if(url){
  texture=new T.TextureLoader().load(url,loaded=>{if(disposed){loaded.dispose();return;}loaded.colorSpace=T.SRGBColorSpace;const image=loaded.image as {width?:number;height?:number};if(image.width&&image.height)width=height*image.width/image.height;material.map=loaded;material.needsUpdate=true;},undefined,()=>{if(disposed)return;flag.visible=false;root.userData.flagUnavailable=true;});texture.colorSpace=T.SRGBColorSpace;material.map=texture;
 }else flag.visible=false;
 const tick=(time:number)=>{for(let i=0;i<positions.count;i++){const u=uv.getX(i),v=uv.getY(i);positions.setXYZ(i,u*width,(v-.5)*height,Math.sin(u*7-time*3+v*.7)*.045*u);}positions.needsUpdate=true;geometry.computeVertexNormals();};tick(0);
 return{root,tick,dispose(){disposed=true;texture?.dispose();}};
}
