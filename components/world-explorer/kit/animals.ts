import * as T from 'three';
import {Builder,pixelTexture,vertexMaterial} from './common';

/** Distant, non-interactive wildlife. Each animal is a few merged parts with
 * four leg pivots for a lightweight walk; it never enters the playable lane. */
export type AnimalKind='elk'|'giraffe'|'elephant'|'zebra'|'antelope';
type Spec={body:[number,number,number];bodyY:number;neck:[number,number,number,number];head:[number,number,number];leg:[number,number];color:string;belly?:string;dark:string};
const specs:Record<AnimalKind,Spec>={
 elk:{body:[1.3,.75,.62],bodyY:1.55,neck:[.95,.75,.24,.75],head:[.55,.3,.28],leg:[1.2,.08],color:'#8a6342',belly:'#c7a77c',dark:'#4a3322'},
 giraffe:{body:[1.25,.75,.6],bodyY:2.25,neck:[.95,2.2,.2,1.25],head:[.55,.28,.24],leg:[2,.08],color:'#d9a65c',dark:'#6b4422'},
 elephant:{body:[2.1,1.5,1.35],bodyY:2.15,neck:[1.75,.25,.6,.1],head:[.95,1.05,.95],leg:[1.6,.34],color:'#8f8a84',dark:'#6c6863'},
 zebra:{body:[1.15,.65,.52],bodyY:1.25,neck:[.85,.6,.2,.75],head:[.5,.26,.22],leg:[1,.065],color:'#f4f1ea',dark:'#1d1c1b'},
 antelope:{body:[.95,.5,.42],bodyY:1,neck:[.72,.5,.15,.8],head:[.42,.22,.18],leg:[.85,.05],color:'#b07a45',belly:'#efe2c8',dark:'#3d2a1c'},
};
let stripes:T.Texture|null=null,patches:T.Texture|null=null;
function coat(kind:AnimalKind){
 if(kind==='zebra')return stripes||(stripes=pixelTexture(64,(u,v)=>{const s=Math.sin((u*10+Math.sin(v*6)*.8)*Math.PI)>.1?245:30;return[s,s,s];}));
 if(kind==='giraffe')return patches||(patches=pixelTexture(64,(u,v,x,y)=>{const cx=Math.floor(u*5),cy=Math.floor(v*5),fx=u*5-cx-.5,fy=v*5-cy-.5,edge=Math.max(Math.abs(fx),Math.abs(fy));void x;void y;return edge>.38?[244,226,190]:[184,112,48];}));
 return null;
}
export function createAnimal(parent:T.Object3D,kind:AnimalKind,scale=1){
 const s=specs[kind],root=new T.Group();root.name='wildlife-'+kind;root.userData.decorative=true;root.scale.setScalar(scale);parent.add(root);
 const map=coat(kind),bodyMaterial=map?new T.MeshStandardMaterial({color:'#ffffff',map,roughness:.9}):new T.MeshStandardMaterial({color:s.color,roughness:.9});
 const torso=new T.Mesh(new T.SphereGeometry(1,16,10),bodyMaterial);torso.scale.set(s.body[0],s.body[1]*.5,s.body[2]*.5);torso.position.y=s.bodyY;root.add(torso);
 const b=new Builder(),[nx,ny,nr,lean]=s.neck,neckBase=new T.Vector3(s.body[0]*.75,s.bodyY+s.body[1]*.15,0),neckTop=new T.Vector3(s.body[0]*.75+nx*Math.sin(lean)*.6,s.bodyY+ny+s.body[1]*.2,0);
 if(kind==='elephant'){b.add(new T.SphereGeometry(1,14,10),s.color,[s.body[0]*.95,s.bodyY+.2,0],[0,0,0],[s.head[0]*.75,s.head[1]*.75,s.head[2]*.65]);b.strut(new T.Vector3(s.body[0]*1.45,s.bodyY,0),new T.Vector3(s.body[0]*1.6,s.bodyY-1.5,0),.16,s.color,8,.55);for(const side of [-1,1])b.add(new T.SphereGeometry(1,10,8),s.dark,[s.body[0]*.85,s.bodyY+.3,side*.62],[0,0,0],[.12,.75,.6]);for(const side of [-1,1])b.add(new T.ConeGeometry(.07,.6,6),'#f2ead8',[s.body[0]*1.4,s.bodyY-.55,side*.25],[0,0,-2]);}
 else{
  b.strut(neckBase,neckTop,nr,map&&kind==='giraffe'?'#d9a65c':s.color,8,.7);
  b.add(new T.SphereGeometry(1,12,8),kind==='zebra'?'#e8e4dc':s.color,[neckTop.x+s.head[0]*.45,neckTop.y,0],[0,0,-.35],[s.head[0]*.65,s.head[1]*.5,s.head[2]*.5]);
  b.add(new T.SphereGeometry(1,8,6),s.dark,[neckTop.x+s.head[0]*.95,neckTop.y-.1,0],[0,0,0],[.09,.08,.09]);
  for(const side of [-1,1])b.add(new T.ConeGeometry(.05,.18,5),s.dark,[neckTop.x,neckTop.y+.18,side*.1],[0,0,side*.4]);
  if(kind==='elk')for(const side of [-1,1]){const base=new T.Vector3(neckTop.x+.05,neckTop.y+.2,side*.1),tip=base.clone().add(new T.Vector3(-.35,.9,side*.35));b.strut(base,tip,.035,'#d9c9a6',5,.6);for(let i=1;i<4;i++){const p=base.clone().lerp(tip,i/4);b.strut(p,p.clone().add(new T.Vector3(.25,.25,side*.06)),.025,'#d9c9a6',4,.5);}}
  if(kind==='giraffe')for(const side of [-1,1])b.strut(new T.Vector3(neckTop.x,neckTop.y+.15,side*.07),new T.Vector3(neckTop.x-.05,neckTop.y+.4,side*.08),.03,s.dark,5);
  if(kind==='antelope')for(const side of [-1,1])b.strut(new T.Vector3(neckTop.x,neckTop.y+.15,side*.06),new T.Vector3(neckTop.x-.25,neckTop.y+.7,side*.12),.025,s.dark,5,.4);
  if(kind==='zebra')b.add(new T.BoxGeometry(.75,.14,.05),s.dark,[neckBase.x+.25,neckTop.y-.2,0],[0,0,.75]);
  if(s.belly)b.add(new T.SphereGeometry(1,12,8),s.belly,[0,s.bodyY-s.body[1]*.18,0],[0,0,0],[s.body[0]*.8,s.body[1]*.3,s.body[2]*.42]);
 }
 b.strut(new T.Vector3(-s.body[0]*.95,s.bodyY+.05,0),new T.Vector3(-s.body[0]*1.15,s.bodyY-s.body[1]*.6,0),.03,s.dark,5);
 b.mesh(root,vertexMaterial(.9),'wildlife-'+kind+'-head');
 const legs:T.Group[]=[];
 for(const [lx,lz] of [[.65,.5],[.65,-.5],[-.7,.5],[-.7,-.5]] as const){const pivot=new T.Group();pivot.position.set(lx*s.body[0],s.bodyY-s.body[1]*.15,lz*s.body[2]*.55);root.add(pivot);const leg=new T.Mesh(new T.CylinderGeometry(s.leg[1],s.leg[1]*.8,s.leg[0],7),map&&kind==='zebra'?bodyMaterial:new T.MeshStandardMaterial({color:kind==='elephant'?s.color:s.dark,roughness:.9}));leg.position.y=-s.leg[0]/2;pivot.add(leg);legs.push(pivot);}
 return{root,update(time:number,walking:boolean){legs.forEach((leg,i)=>{leg.rotation.z=walking?Math.sin(time*3+(i===0||i===3?0:Math.PI))*.3:0;});torso.position.y=s.bodyY+(walking?Math.abs(Math.sin(time*3))*.03:0);}};
}

/** A small herd walking slowly back and forth along a fixed line. */
export function createHerd(parent:T.Object3D,kind:AnimalKind,options:{count:number;x:number;y:number|((x:number)=>number);z:number;spread:number;scale:number;range:number;speed:number;seed:number}){
 const animals=Array.from({length:options.count},(_,i)=>{const a=createAnimal(parent,kind,options.scale*(.9+((i*37)%10)/50));return{...a,offset:i*options.spread,phase:i*1.7+options.seed};});
 const height=(x:number)=>typeof options.y==='function'?options.y(x):options.y;
 const update=(time:number)=>{for(const a of animals){const t=time*options.speed/options.range+a.phase,wave=Math.sin(t),x=options.x+a.offset+wave*options.range,dir=Math.cos(t)>=0?1:-1;a.root.position.set(x,height(x),options.z+((a.offset*3)%2));a.root.rotation.y=dir>0?0:Math.PI;a.update(time,true);}};
 update(0);return{animals,update};
}
