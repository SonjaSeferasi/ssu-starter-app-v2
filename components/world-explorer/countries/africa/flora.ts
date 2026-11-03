import * as T from 'three';
import {Builder,random,scatter,v3,valueNoise,vertexMaterial,type Placement} from '../../kit/common';
import {swayingMaterial} from '../south-america/flora';

/** African plant templates. Each is built once per kind and variant as one
 * vertex-coloured geometry, so a whole stand is a single instanced draw. The
 * shapes follow each plant's real silhouette: the baobab's bottle trunk and
 * root-like crown, the euphorbia's candelabra, the quiver tree's forked
 * branches, the doum palm's forking stems, the traveller's palm's fan. */
export type AfricaFloraKind='baobab'|'grandidier-baobab'|'umbrella-acacia'|'dead-camelthorn'|'euphorbia'|'quiver-tree'|'doum-palm'|'borassus-palm'|'oil-palm'|'ravenala'|'papyrus'|'mangrove'|'giant-groundsel'|'bamboo-clump'|'aloe'|'thorn-scrub'|'savanna-grass'|'forest-giant'|'cocoa-shrub'|'banana';

function lump(seed:number,detail:number,rough=.24){
 const g=new T.IcosahedronGeometry(1,detail),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const v=v3(p.getX(i),p.getY(i),p.getZ(i)),n=valueNoise(v.x*1.9+seed,v.y*1.9+v.z*1.4,seed)*2-1;v.multiplyScalar(1+n*rough);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
/** A drooping strap leaf (banana, ravenala, papyrus bract). */
function blade(length:number,width:number,droop:number){
 const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(width,length*.2,width*.9,length*.8,0,length);s.bezierCurveTo(-width*.9,length*.8,-width,length*.2,0,0);
 const g=new T.ShapeGeometry(s,5),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const y=p.getY(i)/length;p.setZ(i,-droop*y*y*length);}g.computeVertexNormals();return g;
}
/** A palm frond: leaflets either side of an arching spine. */
function frond(length:number,droop:number,width:number,leaflets:number){
 const pos:number[]=[],spine=(t:number)=>v3(0,Math.sin(t*Math.PI*.55)*length*.3-t*t*droop,t*length);
 for(let i=0;i<leaflets;i++){const t=(i+.5)/leaflets,a=spine(t),b=spine(Math.min(1,t+1/leaflets)),w=width*Math.sin(Math.PI*Math.min(1,t*1.1));for(const s of [-1,1]){const tip=a.clone().add(v3(s*w,-w*.7,w*.15));pos.push(...a.toArray(),...tip.toArray(),...b.toArray());}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
/** A fan-palm leaf: a pleated half-disc. */
function fan(radius:number,ribs:number){
 const pos:number[]=[];for(let i=0;i<ribs;i++){const a0=-Math.PI*.55+i/ribs*Math.PI*1.1,a1=a0+Math.PI*1.1/ribs,lift=i%2?.08:-.08;pos.push(0,0,0,Math.cos(a0)*radius,Math.sin(a0)*radius*.55+radius*.45,lift,Math.cos(a1)*radius,Math.sin(a1)*radius*.55+radius*.45,-lift);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
function crownOf(b:Builder,top:T.Vector3,count:number,length:number,colour:string,r:()=>number,droop=1.4){
 for(let i=0;i<count;i++){const f=frond(length*(.8+r()*.35),droop,.42,9);b.add(f,i%2?colour:new T.Color(colour).multiplyScalar(.85),top.toArray() as [number,number,number],[-.25-r()*.25,i/count*Math.PI*2+r()*.3,0]);}
}

const cache=new Map<string,T.BufferGeometry>();
export function africaFloraGeometry(kind:AfricaFloraKind,variant=0,low=false):T.BufferGeometry{
 const key=`${kind}:${variant}:${low}`,hit=cache.get(key);if(hit)return hit;
 const b=new Builder(),r=random(9100+variant*131+kind.length*29),d=low?0:1,seg=low?7:11;
 switch(kind){
  case'baobab':{
   // Bottle trunk swelling at the base, then short root-like limbs with
   // sparse leaf clusters: the "upside-down tree".
   const h=5+r()*1.6,pts=[0,.12,.3,.5,.7,.86,1].map(t=>new T.Vector2(.55+1.25*Math.pow(1-t,1.6)*(1+.15*Math.sin(t*9+variant))+(t>.9?-.15:0),t*h));
   b.add(new T.LatheGeometry(pts,seg),'#9b8a76',[0,0,0],[0,r()*3,0],[1,1,.9],.08);
   for(let i=0;i<7;i++){const a=i/7*Math.PI*2+r()*.5,base=v3(Math.cos(a)*.35,h-.2,Math.sin(a)*.35),mid=v3(Math.cos(a)*1.4,h+1+r()*.6,Math.sin(a)*1.2),tip=v3(Math.cos(a)*2.3,h+1.6+r()*.8,Math.sin(a)*1.9);b.strut(base,mid,.22,'#8f7f6b',6).strut(mid,tip,.12,'#8f7f6b',5);if(!low||i%2)b.add(lump(i+variant,d,.3),i%2?'#5f7d39':'#6f8a40',tip.toArray() as [number,number,number],[0,r()*3,0],[.8,.45,.7],.15);}
   break;}
  case'grandidier-baobab':{
   // Madagascar's Avenue of the Baobabs: a tall smooth column with a flat
   // crown of short branches at the very top.
   const h=13+r()*4;b.add(new T.CylinderGeometry(.85,1.35,h,seg),'#b08a6a',[0,h/2,0],[0,0,0],[1,1,1],.05);
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2+r()*.4,tip=v3(Math.cos(a)*(1.6+r()),h+1+r()*.7,Math.sin(a)*(1.4+r()));b.strut(v3(0,h-.3,0),tip,.2,'#9e7b5c',5);b.add(lump(i,d,.3),'#5d7a38',tip.toArray() as [number,number,number],[0,0,0],[.7,.35,.6],.15);}
   break;}
  case'umbrella-acacia':{
   // Flat-topped Vachellia: a leaning trunk forking into a wide, thin canopy.
   const h=3.4+r(),lean=(r()-.5)*.3;b.strut(v3(0,0,0),v3(lean,h*.55,0),.2,'#5d4a3a',6);
   for(let i=0;i<4;i++){const a=i/4*Math.PI*2+r(),end=v3(lean+Math.cos(a)*1.6,h+r()*.3,Math.sin(a)*1.3);b.strut(v3(lean,h*.55,0),end,.11,'#5d4a3a',5);}
   for(let i=0;i<(low?4:9);i++){const a=r()*Math.PI*2,rad=r()*2.4;b.add(lump(i+7,d,.2),i%3?'#6b7f3a':'#7f8f45',[lean+Math.cos(a)*rad,h+.35+r()*.25,Math.sin(a)*rad*.8],[0,r()*3,0],[1.5,.32,1.3],.12);}
   break;}
  case'dead-camelthorn':{
   // Deadvlei's black, sun-scorched trees: twisted bare limbs, no leaves.
   const h=2.6+r()*1.2;b.strut(v3(0,0,0),v3(.2,h*.6,0),.16,'#2b211b',6);
   const fork=(from:T.Vector3,dir:number,len:number,depth:number,rad:number)=>{const to=from.clone().add(v3(Math.cos(dir)*len,Math.sin(Math.abs(dir)+.6)*len*.8,(r()-.5)*len*.6));b.strut(from,to,rad,'#2f241d',4);if(depth>0){fork(to,dir+.5,len*.7,depth-1,rad*.7);fork(to,dir-.6,len*.65,depth-1,rad*.7);}};
   fork(v3(.2,h*.6,0),.9,1.2,low?1:2,.1);fork(v3(.2,h*.6,0),2.3,1.1,low?1:2,.1);
   break;}
  case'euphorbia':{
   // Candelabra euphorbia: a short trunk carrying many upright ribbed arms.
   const h=1.6+r()*.6;b.add(new T.CylinderGeometry(.18,.24,h,6),'#6d6a4c',[0,h/2,0]);
   for(let i=0;i<(low?5:9);i++){const a=i/9*Math.PI*2+r(),rad=.35+r()*.9,len=1.4+r()*1.4,x=Math.cos(a)*rad,z=Math.sin(a)*rad;b.strut(v3(0,h-.1,0),v3(x,h+.25,z),.09,'#5b7a3d',5);b.add(new T.CylinderGeometry(.11,.12,len,6),i%2?'#5b7a3d':'#4f6f36',[x,h+.25+len/2,z]);b.add(new T.SphereGeometry(.12,6,4),'#6f8f45',[x,h+.25+len,z]);}
   break;}
  case'quiver-tree':{
   // Aloidendron dichotomum: pale golden trunk, repeatedly forked branches,
   // each ending in a rosette of fleshy leaves.
   const h=2+r()*.7;b.add(new T.CylinderGeometry(.22,.42,h,seg),'#c8a96b',[0,h/2,0],[0,0,0],[1,1,1],.06);
   const tips:T.Vector3[]=[];const fork=(from:T.Vector3,ang:number,len:number,depth:number)=>{const to=from.clone().add(v3(Math.cos(ang)*len*.6,len,Math.sin(ang)*len*.6));b.strut(from,to,.1+depth*.03,'#bfa063',5);if(depth>0){fork(to,ang+.7,len*.8,depth-1);fork(to,ang-.7,len*.8,depth-1);}else tips.push(to);};
   fork(v3(0,h,0),0,.7,low?2:3);fork(v3(0,h,0),Math.PI,.7,low?1:2);
   for(const t of tips)for(let k=0;k<5;k++)b.add(new T.ConeGeometry(.06,.45,4),'#7f9a62',[t.x,t.y+.12,t.z],[Math.cos(k*1.26)*.9,0,Math.sin(k*1.26)*.9]);
   break;}
  case'doum-palm':{
   // Hyphaene thebaica forks into two or four stems, each with a fan crown.
   const h=3+r();b.strut(v3(0,0,0),v3(0,h,0),.17,'#7a6650',6);
   for(const s of [-1,1]){const top=v3(s*1.3,h+2.2+r(),(r()-.5)*.6);b.strut(v3(0,h,0),top,.13,'#7a6650',6);for(let i=0;i<7;i++)b.add(fan(1,9),i%2?'#7f9446':'#6c8a3e',[top.x,top.y,top.z],[-.3,i/7*Math.PI*2,0]);}
   break;}
  case'borassus-palm':{
   // Fan palm with the swollen mid-trunk typical of the African Borassus.
   const h=9+r()*2.5,pts=[0,.3,.55,.7,.85,1].map(t=>new T.Vector2(.22+.12*Math.sin(Math.min(1,t*1.4)*Math.PI),t*h));b.add(new T.LatheGeometry(pts,seg),'#857563',[0,0,0],[0,0,0],[1,1,1],.06);
   for(let i=0;i<(low?8:14);i++)b.add(fan(1.6,11),i%2?'#6c8f3f':'#5b7e37',[0,h,0],[-.6+r()*.3,i/14*Math.PI*2,0]);
   break;}
  case'oil-palm':{
   const h=5+r()*2;b.add(new T.CylinderGeometry(.24,.3,h,seg),'#6c5a45',[0,h/2,0],[0,0,0],[1,1,1],.09);
   for(let i=0;i<h*2;i++)b.add(new T.ConeGeometry(.12,.3,4),'#5e4c3a',[Math.cos(i*2.4)*.26,i*.48+.3,Math.sin(i*2.4)*.26],[Math.cos(i*2.4)*.8,0,Math.sin(i*2.4)*.8]);
   crownOf(b,v3(0,h,0),low?10:16,3.6,'#3f7a32',r,1.2);
   break;}
  case'ravenala':{
   // Traveller's palm: a flat, vertical fan of paddle leaves.
   const h=2.5+r();b.add(new T.CylinderGeometry(.2,.26,h,seg),'#7d7465',[0,h/2,0]);
   for(let i=0;i<(low?9:15);i++){const a=-1.2+i/14*2.4;const leaf=blade(3.2,.45,.15);leaf.rotateZ(-a);b.add(leaf,i%2?'#4e8a3a':'#5d9a44',[Math.sin(a)*.2,h,0]);}
   break;}
  case'papyrus':{
   for(let i=0;i<(low?6:12);i++){const a=r()*Math.PI*2,rad=r()*.6,h=2.2+r()*1.4,top=v3(Math.cos(a)*rad+(r()-.5)*.4,h,Math.sin(a)*rad);b.strut(v3(Math.cos(a)*rad,0,Math.sin(a)*rad),top,.03,'#5f8a3a',4);for(let k=0;k<9;k++){const ka=k/9*Math.PI*2;b.strut(top,top.clone().add(v3(Math.cos(ka)*.45,.15+r()*.12,Math.sin(ka)*.45)),.012,'#86a84a',3);}}
   break;}
  case'mangrove':{
   // Arching prop roots lift the trunk clear of the tide.
   const h=3.2+r();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,foot=v3(Math.cos(a)*1.3,-.2,Math.sin(a)*1),knee=v3(Math.cos(a)*.8,1,Math.sin(a)*.6);b.strut(foot,knee,.06,'#5b4a3a',4).strut(knee,v3(0,1.5,0),.07,'#5b4a3a',4);}
   b.strut(v3(0,1.5,0),v3(0,h,0),.14,'#5b4a3a',6);for(let i=0;i<(low?4:8);i++){const a=r()*Math.PI*2;b.add(lump(i,d,.25),i%2?'#2f6a35':'#3a7a3a',[Math.cos(a)*1.1,h+r()*.8,Math.sin(a)*.9],[0,0,0],[1.2,.7,1],.14);}
   break;}
  case'giant-groundsel':{
   // Dendrosenecio of the high East African mountains: thick stems topped
   // by cabbage-like leaf rosettes.
   for(let s=0;s<3;s++){const a=s*2.1+r(),x=Math.cos(a)*.5*(s>0?1:0),z=Math.sin(a)*.4*(s>0?1:0),h=1.8+r()*1.6;b.add(new T.CylinderGeometry(.2,.26,h,7),'#6e6250',[x,h/2,z],[0,0,0],[1,1,1],.1);for(let k=0;k<12;k++){const ka=k/12*Math.PI*2;b.add(blade(.7,.16,.25),'#7f9653',[x,h,z],[-.9,ka,0]);}}
   break;}
  case'bamboo-clump':{
   for(let i=0;i<(low?7:14);i++){const a=r()*Math.PI*2,rad=r()*.7,h=5+r()*4,base=v3(Math.cos(a)*rad,0,Math.sin(a)*rad),top=base.clone().add(v3((r()-.5)*1.4,h,(r()-.5)*1));b.strut(base,top,.06,i%3?'#9aa94e':'#7f9442',5,1);for(let k=0;k<4;k++)b.add(blade(.8,.08,.3),'#6f9a3e',top.clone().lerp(base,k*.12).toArray() as [number,number,number],[-1.2,r()*6,0]);}
   break;}
  case'aloe':{
   for(let k=0;k<(low?8:14);k++){const a=k/14*Math.PI*2+r()*.3,lift=.6+(k%3)*.25;b.add(new T.ConeGeometry(.09,.9,4),k%2?'#6f9a6b':'#5e8a63',[Math.cos(a)*.18,.4,Math.sin(a)*.18],[Math.sin(a)*lift,0,-Math.cos(a)*lift]);}
   b.add(new T.CylinderGeometry(.02,.025,1.5,4),'#6f7a5a',[0,1.1,0]);b.add(new T.ConeGeometry(.08,.5,6),'#e2603a',[0,1.95,0]);
   break;}
  case'thorn-scrub':{
   for(let i=0;i<(low?3:6);i++){const a=r()*Math.PI*2;b.add(lump(i+3,d,.42),i%2?'#7d7a45':'#8f8a50',[Math.cos(a)*.5,.45+r()*.3,Math.sin(a)*.4],[0,r()*3,0],[.8,.5,.7],.18);}
   break;}
  case'savanna-grass':{
   for(let i=0;i<(low?10:22);i++){const a=r()*Math.PI*2,rad=r()*.35,h=.6+r()*.7;b.strut(v3(Math.cos(a)*rad,0,Math.sin(a)*rad),v3(Math.cos(a)*(rad+.25),h,Math.sin(a)*(rad+.25)),.018,i%3?'#d1b46a':'#bfa058',3,.3);}
   break;}
  case'forest-giant':{
   const h=14+r()*5;b.add(new T.CylinderGeometry(.45,.75,h,seg),'#8a7f6c',[0,h/2,0],[0,0,0],[1,1,1],.07);
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2+r();b.add(new T.BoxGeometry(.1,2.6,1.6),'#7d725f',[Math.cos(a)*.6,1.3,Math.sin(a)*.6],[0,-a,0]);}
   for(let i=0;i<(low?8:18);i++){const a=r()*Math.PI*2,rad=1+r()*4,y=h+1.2+r()*2.4-rad*.2;b.add(lump(i+variant*5,d,.28),['#2c6b2f','#3d7f36','#4f9140','#2f5e2a'][i%4],[Math.cos(a)*rad,y,Math.sin(a)*rad*.85],[0,r()*3,0],[1.6,.85,1.3],.14);}
   break;}
  case'cocoa-shrub':{
   b.add(new T.CylinderGeometry(.08,.12,1.4,6),'#6a5440',[0,.7,0]);for(let i=0;i<(low?3:6);i++){const a=r()*Math.PI*2;b.add(lump(i+11,d,.25),'#3f6f33',[Math.cos(a)*.5,1.5+r()*.5,Math.sin(a)*.4],[0,0,0],[.7,.55,.6],.12);}
   for(let i=0;i<4;i++)b.add(new T.SphereGeometry(.09,6,4),i%2?'#d9a23a':'#b9532f',[Math.cos(i*1.6)*.12,.8+i*.12,Math.sin(i*1.6)*.12],[0,0,0],[1,1.6,1]);
   break;}
  case'banana':{
   b.add(new T.CylinderGeometry(.13,.17,2,7),'#6f8a45',[0,1,0]);for(let i=0;i<(low?5:8);i++)b.add(blade(1.8,.42,.6),i%2?'#5f9a3c':'#4e8a35',[0,1.9,0],[-.5,i/8*Math.PI*2,0]);
   break;}
 }
 const g=b.geometry();g.computeBoundingSphere();cache.set(key,g);return g;
}

/** Plant one stand as a single instanced draw; `sway` adds a breeze. */
export function plantAfrica(parent:T.Object3D,kind:AfricaFloraKind,placements:Placement[],options:{low?:boolean;variant?:number;name?:string;sway?:number}={}){
 if(!placements.length)return{update:(_:number)=>{}};
 const geometry=africaFloraGeometry(kind,options.variant??0,!!options.low).clone(),swaying=options.sway?swayingMaterial(options.sway):null;
 const stand=scatter(parent,geometry,swaying?.material??vertexMaterial(.85,{side:T.DoubleSide}),placements,options.name||'africa-'+kind,false);stand.userData.decorative=true;stand.userData.kind=kind;
 return{update:(time:number)=>{if(swaying)swaying.time.value=time;}};
}
