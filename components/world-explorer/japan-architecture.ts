import * as T from 'three';
import {batchStatic,matte,mesh,sphere,strut} from './scenic-kit';

/** Original procedural architectural studies for the fictional Japan course.
 * These helpers are not measured reconstructions of a named temple or shrine.
 * All surfaces, tile ribs, lattice and brackets are real three-dimensional
 * geometry; no reference photograph is used as a facade or background. */
export const japanArchitectureInfo={
 representation:'Original stylized architectural studies; not a reconstruction of a named historic building.',
 assets:['curved-tiled-pagoda','layered-timber-brackets','lattice-panels','veranda-houses','curved-torii','stone-toro','ribbed-paper-lantern'],
 source:'Procedural geometry and textures authored for SocialU.',
};

type Options={low?:boolean};
type Materials={red:T.MeshStandardMaterial;plaster:T.MeshStandardMaterial;wood:T.MeshStandardMaterial;tiles:T.MeshStandardMaterial;tileRib:T.MeshStandardMaterial;underside:T.MeshStandardMaterial;stone:T.MeshStandardMaterial;dark:T.MeshStandardMaterial;paper:T.MeshStandardMaterial;gold:T.MeshStandardMaterial};
const box=(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
const beam=(p:T.Object3D,m:T.Material,a:[number,number,number],b:[number,number,number],r=.035)=>strut(p,m,new T.Vector3(...a),new T.Vector3(...b),r);
function finishModel(root:T.Group){
 batchStatic(root);let vertices=0,meshes=0;root.traverse(object=>{if(object instanceof T.Mesh){vertices+=object.geometry.getAttribute('position').count;meshes++;}});root.userData.vertexCount=vertices;root.userData.meshCount=meshes;return root;
}

function grain(kind:'wood'|'tile'){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const line=kind==='wood'?Math.sin(x*.75+Math.sin(y*.22)*1.3):Math.cos(x*Math.PI/4)*.5+Math.cos(y*Math.PI/8)*.2;
  const value=Math.round(125+line*45+Math.sin(x*17+y*13)*10),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

function materials():Materials{
 const wood=matte('#77523b',.86);wood.bumpMap=grain('wood');wood.bumpScale=.025;
 const tiles=matte('#35475c',.72);tiles.bumpMap=grain('tile');tiles.bumpScale=.018;
 const paper=new T.MeshStandardMaterial({color:'#f5dfb4',roughness:.7,emissive:'#d6a451',emissiveIntensity:.24});
 return{red:matte('#c94c42',.73),plaster:matte('#eee7d6',.86),wood,tiles,tileRib:matte('#536272',.7),underside:matte('#743c32',.9),stone:matte('#aaa993',.97),dark:matte('#343438'),paper,gold:matte('#d7b86b',.5)};
}

function roofPoint(face:number,u:number,t:number,width:number,depth:number,rise:number,gable=false){
 const span=.5*(1-.86*t),a=face*Math.PI/2;
 const xx=gable?u*.5:u*span,zz=gable?.5*(1-t):span;
 const lift=rise*(t-.1*Math.sin(t*Math.PI))+.18*(1-t)**4*(.25+.75*Math.abs(u)**4);
 return new T.Vector3((xx*Math.cos(a)+zz*Math.sin(a))*width,lift,(zz*Math.cos(a)-xx*Math.sin(a))*depth);
}

function tiledRoof(parent:T.Object3D,width:number,depth:number,rise:number,m:Materials,low:boolean,gable=false){
 const root=new T.Group();root.name=gable?'japan-curved-gable-roof':'japan-curved-tiled-roof';root.userData.roofConstruction='modeled curved shell, underside, fascia, tile ribs and courses';parent.add(root);
 const steps=low?6:10,rows=low?3:5,faces=gable?[0,2]:[0,1,2,3],positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let f=0;f<faces.length;f++){
  const face=faces[f];for(let row=0;row<=rows;row++)for(let i=0;i<=steps;i++){const t=row/rows,u=i/steps*2-1,p=roofPoint(face,u,t,width,depth,rise,gable);positions.push(p.x,p.y,p.z);uv.push(i/steps*width,t*depth);}
  for(let row=0;row<rows;row++)for(let i=0;i<steps;i++){const k=f*(rows+1)*(steps+1)+row*(steps+1)+i;indices.push(k,k+1,k+steps+1,k+1,k+steps+2,k+steps+1);}
 }
 const top=new T.BufferGeometry();top.setAttribute('position',new T.Float32BufferAttribute(positions,3));top.setAttribute('uv',new T.Float32BufferAttribute(uv,2));top.setIndex(indices);top.computeVertexNormals();
 const cover=mesh(root,top,m.tiles);cover.name='modeled-tile-shell';const underMaterial=m.underside.clone();underMaterial.side=T.BackSide;mesh(root,top.clone().translate(0,-.075,0),underMaterial);
 let ribCount=0;
 for(const face of faces){
  const edge=new T.CatmullRomCurve3([-1,-.6,0,.6,1].map(u=>roofPoint(face,u,0,width,depth,rise,gable)));
  mesh(root,new T.TubeGeometry(edge,low?8:12,.045,low?3:4,false),m.underside);
  const lanes=low?5:9;
  for(let i=0;i<lanes;i++){
   const u=-.92+i/(lanes-1)*1.84,curve=new T.CatmullRomCurve3([0,.2,.45,.7,.94].map(t=>roofPoint(face,u,t,width,depth,rise,gable).add(new T.Vector3(0,.025,0))));
   mesh(root,new T.TubeGeometry(curve,low?5:8,.021,3,false),m.tileRib);ribCount++;
  }
  for(const t of low?[.45]:[.22,.48,.74]){const curve=new T.CatmullRomCurve3([-1,-.5,0,.5,1].map(u=>roofPoint(face,u,t,width,depth,rise,gable).add(new T.Vector3(0,.019,0))));mesh(root,new T.TubeGeometry(curve,low?5:8,.012,3,false),m.tileRib);}
 }
 if(gable){
  box(root,0,rise+.025,0,width*1.06,.075,.1,m.tileRib);
  for(const x of [-width/2,width/2]){const curve=new T.CatmullRomCurve3([new T.Vector3(x,.16,-depth/2),new T.Vector3(x,rise,0),new T.Vector3(x,.16,depth/2)]);mesh(root,new T.TubeGeometry(curve,12,.045,4,false),m.wood);}
 }else box(root,0,rise+.03,0,width*.17,.09,depth*.17,m.tileRib);
 root.userData.tileRibs=ribCount;return root;
}

function lattice(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,m:Materials,low:boolean,side=0){
 const root=new T.Group();root.position.set(x,y,z);root.rotation.y=side;root.name='recessed-lattice-panel';parent.add(root);
 box(root,0,0,-.025,w,h,.07,m.dark);box(root,0,0,.016,w*.88,h*.88,.025,m.paper);
 for(const sign of [-1,1]){box(root,sign*w/2,0,.06,.045,h+.06,.09,m.wood);box(root,0,sign*h/2,.06,w+.06,.045,.09,m.wood);}
 const columns=low?2:3,rows=low?2:3;
 for(let i=1;i<columns;i++)box(root,-w/2+i*w/columns,0,.075,.018,h,.025,m.wood);
 for(let i=1;i<rows;i++)box(root,0,-h/2+i*h/rows,.075,w,.018,.025,m.wood);
 return root;
}

function balcony(parent:T.Object3D,w:number,d:number,y:number,m:Materials,low:boolean){
 const root=new T.Group();root.name='japan-timber-balcony';parent.add(root);
 box(root,0,y,0,w,.13,d,m.wood);
 for(const side of [-1,1]){
  box(root,0,y+.48,side*d/2,w,.065,.07,m.red);box(root,0,y+.15,side*d/2,w,.05,.065,m.red);
  const count=low?5:8;for(let i=0;i<count;i++)box(root,-w/2+i/(count-1)*w,y+.31,side*d/2,.04,.36,.05,m.red);
  box(root,side*w/2,y+.48,0,.07,.065,d,m.red);box(root,side*w/2,y+.15,0,.065,.05,d,m.red);
  for(let i=1;i<(low?3:5);i++)box(root,side*w/2,y+.31,-d/2+i/(low?3:5)*d,.05,.36,.04,m.red);
 }
 return root;
}

function pagodaModel(options:{tiers?:number;low?:boolean},m:Materials){
 const low=options.low===true,tiers=Number.isFinite(options.tiers)?Math.max(2,Math.min(5,Math.floor(options.tiers!))):5;
 const root=new T.Group();root.name='spring-pagoda';root.userData.model='detailed-japanese-pagoda';root.userData.tiers=tiers;root.userData.features=['curved tiled roof shells','tile ribs','deep eaves','layered timber brackets','wraparound balconies','lattice windows','central finial'];
 for(let step=0;step<3;step++)box(root,0,.08+step*.12,0,4.65-step*.22,.16,3.75-step*.22,m.stone);
 for(let i=0;i<tiers;i++){
  const width=3.9-i*.48,depth=width*.74,y=.42+i*1.55,tier=new T.Group();tier.position.y=y;tier.name='japan-pagoda-tier-'+(i+1);root.add(tier);
  box(tier,0,.55,0,width*.96,1.03,depth*.96,m.plaster);balcony(tier,width*1.17,depth*1.2,.02,m,low);
  for(const side of [-1,1]){
   for(const x of [-width*.44,0,width*.44])box(tier,x,.57,side*depth*.5,.085,1.12,.085,m.red);
   box(tier,0,1.04,side*depth*.51,width*1.02,.12,.14,m.red);
   for(const x of [-width*.26,width*.26])lattice(tier,x,.64,side*(depth*.5+.012),width*.31,.55,m,low,side<0?Math.PI:0);
   for(const z of [-depth*.35,depth*.35]){
    box(tier,side*width*.5,.6,z,.085,1.18,.085,m.red);
    lattice(tier,side*(width*.5+.014),.64,z,width*.24,.55,m,low,side*Math.PI/2);
   }
  }
  const brackets=new T.Group();brackets.name='japan-layered-roof-brackets';tier.add(brackets);
  for(const x of [-width*.41,width*.41])for(const z of [-depth*.41,depth*.41])for(let layer=0;layer<(low?2:3);layer++){
   const direction=Math.sign(z),yy=1.05+layer*.085;box(brackets,x,yy,z+direction*.12,.2+layer*.1,.075,.38+layer*.14,m.red);box(brackets,x,yy+.04,z+direction*.12,.4+layer*.15,.065,.11,m.wood);
  }
  const roof=tiledRoof(tier,width*1.42,depth*1.43,.84,m,low);roof.position.y=1.13;
 }
 const top=.42+(tiers-1)*1.55+1.13+.84;beam(root,m.gold,[0,top,0],[0,top+1.2,0],.028);
 for(let i=0;i<6;i++){const r=.21-i*.024,ring=mesh(root,new T.TorusGeometry(r,.017,4,14),m.gold,0,top+.12+i*.14,0);ring.rotation.x=Math.PI/2;}
 sphere(root,m.gold,0,top+1.22,0,.06,.11,.06);return finishModel(root);
}

export function createJapanPagoda(options:{tiers?:number;low?:boolean}={}){return pagodaModel(options,materials());}

function toriiModel(options:{width?:number;low?:boolean},m:Materials){
 const width=Number.isFinite(options.width)?Math.max(1.8,Math.min(7,options.width!)):3.5,low=options.low===true,root=new T.Group();root.name='japan-torii-gate';root.userData.model='detailed-curved-torii';
 for(const side of [-1,1]){
  const post=mesh(root,new T.CylinderGeometry(.12,.18,2.8,12),m.red,side*width*.36,1.4,0);post.rotation.z=side*-.028;
  mesh(root,new T.CylinderGeometry(.21,.24,.27,12),m.dark,side*width*.36,.135,0);box(root,side*width*.36,.035,0,.62,.07,.62,m.stone);
  box(root,side*width*.36,2.25,0,.3,.24,.37,m.wood);
 }
 box(root,0,2.28,0,width*.95,.17,.19,m.red);box(root,0,2.72,0,width*1.1,.17,.31,m.red);box(root,0,2.5,.02,.22,.45,.12,m.red);
 const shape=new T.CatmullRomCurve3([-1,-.5,0,.5,1].map(u=>new T.Vector3(u*width*.62,2.94+.17*u*u,0)));mesh(root,new T.TubeGeometry(shape,16,.12,6,false),m.dark);
 const ropeMat=matte('#c3ae79');for(let strand=0;strand<(low?2:3);strand++){
  const points:T.Vector3[]=[];for(let i=0;i<=24;i++){const t=i/24,a=t*Math.PI*12+strand*Math.PI*2/3;points.push(new T.Vector3((t-.5)*width*.7,2.02-Math.sin(t*Math.PI)*.2+Math.sin(a)*.018,Math.cos(a)*.018+.12));}
  mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.018,3,false),ropeMat);
 }
 for(const t of [-.27,-.09,.09,.27]){
  const s=new T.Shape();s.moveTo(-.06,0);s.lineTo(.06,0);s.lineTo(.06,-.15);s.lineTo(.13,-.15);s.lineTo(.13,-.3);s.lineTo(.02,-.3);s.lineTo(.02,-.21);s.lineTo(-.06,-.21);s.closePath();const paper=m.plaster.clone();paper.side=T.DoubleSide;mesh(root,new T.ExtrudeGeometry(s,{depth:.015,bevelEnabled:false}),paper,t*width,1.82,.13);
 }
 root.userData.features=['curved kasagi','two supporting posts','crossbeam','modeled rope and paper streamers'];return finishModel(root);
}

export function createJapanTorii(options:{width?:number;low?:boolean}={}){return toriiModel(options,materials());}

function lanternModel(options:{kind?:'stone'|'hanging';low?:boolean},m:Materials){
 const root=new T.Group(),low=options.low===true;root.name=options.kind==='hanging'?'japan-ribbed-paper-lantern':'japan-stone-lantern';
 if(options.kind==='hanging'){
  beam(root,m.dark,[0,1.5,0],[0,1.05,0],.014);
  const points=[[0,0],[.16,0],[.22,.08],[.26,.3],[.24,.57],[.17,.68],[0,.68]].map(([r,y])=>new T.Vector2(r,y));mesh(root,new T.LatheGeometry(points,low?12:20),m.paper,0,.38,0);
  for(let i=0;i<(low?6:11);i++){const t=i/(low?5:10),r=.17+Math.sin(t*Math.PI)*.08,ring=mesh(root,new T.TorusGeometry(r,.008,3,low?12:20),m.wood,0,.4+t*.64,0);ring.rotation.x=Math.PI/2;}
  for(const y of [.4,1.04])mesh(root,new T.CylinderGeometry(.18,.18,.05,12),m.dark,0,y,0);root.userData.model='ribbed-paper-chochin';
 }else{
  for(let i=0;i<3;i++)box(root,0,.06+i*.09,0,.68-i*.13,.12,.68-i*.13,m.stone);
  mesh(root,new T.CylinderGeometry(.1,.15,.65,10),m.stone,0,.57,0);mesh(root,new T.CylinderGeometry(.28,.2,.13,10),m.stone,0,.93,0);
  for(const x of [-.18,.18])for(const z of [-.18,.18])box(root,x,1.16,z,.07,.4,.07,m.stone);
  box(root,0,1.17,0,.25,.29,.25,m.paper);box(root,0,1.4,0,.53,.09,.53,m.stone);
  const points=[[0,0],[.42,0],[.39,.06],[.29,.13],[.15,.23],[.08,.28],[0,.28]].map(([r,y])=>new T.Vector2(r,y));mesh(root,new T.LatheGeometry(points,low?8:16),m.stone,0,1.44,0);sphere(root,m.stone,0,1.79,0,.07,.1,.07);root.userData.model='stone-toro-with-open-light-chamber';
 }
 return finishModel(root);
}

export function createJapanLantern(options:{kind?:'stone'|'hanging';low?:boolean}={}){return lanternModel(options,materials());}

function houseModel(options:{width?:number;low?:boolean},m:Materials){
 const width=Number.isFinite(options.width)?Math.max(2.5,Math.min(6,options.width!)):3.8,depth=width*.67,low=options.low===true,root=new T.Group();root.name='japan-timber-plaster-house';root.userData.model='timber-plaster-veranda-house';
 box(root,0,.18,0,width+.22,.36,depth+.2,m.stone);box(root,0,1.18,0,width,1.7,depth,m.plaster);
 for(const z of [-depth*.51,depth*.51]){
  for(const x of [-width*.47,0,width*.47])box(root,x,1.18,z,.1,1.8,.1,m.wood);
  for(const y of [.4,1.25,1.97])box(root,0,y,z,width,.1,.1,m.wood);
  for(const x of [-width*.27,width*.27])lattice(root,x,1.4,z+(z>0?.025:-.025),width*.32,.85,m,low,z>0?0:Math.PI);
 }
 for(const x of [-width*.51,width*.51]){
  box(root,x,1.18,0,.1,1.8,depth,m.wood);lattice(root,x+(x>0?.02:-.02),1.4,0,depth*.58,.85,m,low,x>0?Math.PI/2:-Math.PI/2);
  const gable=new T.Shape();gable.moveTo(-depth*.5,0);gable.lineTo(depth*.5,0);gable.lineTo(0,.84);gable.closePath();
  const end=mesh(root,new T.ExtrudeGeometry(gable,{depth:.06,bevelEnabled:false}),m.plaster,x-.03,1.98,0);end.rotation.y=Math.PI/2;end.name='plaster-gable-end';
  beam(root,m.wood,[x,2.02,-depth*.5],[x,2.84,0],.035);beam(root,m.wood,[x,2.84,0],[x,2.02,depth*.5],.035);beam(root,m.wood,[x,2.04,-depth*.5],[x,2.04,depth*.5],.035);
 }
 box(root,0,.4,depth*.5+.36,width*1.07,.12,.76,m.wood);
 for(const x of [-width*.45,width*.45]){box(root,x,1.2,depth*.5+.55,.09,1.65,.09,m.wood);beam(root,m.wood,[x,1.72,depth*.5+.52],[x,1.98,depth*.5+.2],.035);}
 const roof=tiledRoof(root,width*1.23,depth*1.4,.9,m,low,true);roof.position.y=1.98;
 // Recessed lattice panels and deep eaves remain visible from the fixed
 // gameplay camera; these are not printed textures on a rectangular house.
 const lamp=lanternModel({kind:'hanging',low},m);lamp.position.set(width*.35,.22,depth*.5+.5);lamp.scale.setScalar(.58);root.add(lamp);
 root.userData.features=['curved tiled gable roof','deep eaves','exposed timber frame','recessed lattice panels','raised wooden veranda','paper lantern'];return finishModel(root);
}

export function createJapanHouse(options:{width?:number;low?:boolean}={}){return houseModel(options,materials());}

/** Optional composed district. Individual helpers above let the environment
 * place architecture on its own cliff tops instead of duplicating a district. */
export function addJapanArchitecture(parent:T.Object3D,options:{finish:number;low?:boolean}){
 const root=new T.Group();root.name='japan-detailed-architecture';root.userData.decorative=true;root.userData.license=japanArchitectureInfo.source;parent.add(root);const low=options.low===true,m=materials(),finish=Number.isFinite(options.finish)?Math.max(30,options.finish):138;
 const pagoda=pagodaModel({tiers:5,low},m);pagoda.position.set(16,1,-14);pagoda.scale.setScalar(1.25);root.add(pagoda);
 for(let i=0;i<(low?2:3);i++){const house=houseModel({width:3.6+(i%2)*.4,low},m);house.position.set(finish*.63+(i-1)*5.2,-1.5,-21-(i%2)*2);root.add(house);}
 const gate=toriiModel({width:3.8,low},m);gate.position.set(7,-.5,-7.2);root.add(gate);
 for(const x of [5,11,finish*.63-6,finish*.63+6]){const lamp=lanternModel({low},m);lamp.position.set(x,-.6,-5.5);root.add(lamp);}
 return finishModel(root);
}
