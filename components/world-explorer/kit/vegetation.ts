import * as T from 'three';
import {Builder,random,scatter,v3,valueNoise,vertexMaterial,type Placement} from './common';

/** Original procedural plant templates. Each returns one vertex-coloured
 * geometry (trunk and foliage merged) so a whole grove is one instanced draw.
 * Heights are nominal world units at scale 1. */
export type TreeKind='cypress'|'stone-pine'|'olive'|'date-palm'|'coconut-palm'|'kapok'|'understory'|'conifer'|'snow-conifer'|'acacia'|'plane'|'shrub'|'tuft'|'golden-tuft'|'reed'|'flowering-shrub'|'birch'|'bamboo';

/** A noisy, smooth-shaded foliage lump. */
function lump(seed:number,detail=1,roughness=.22){
 const g=new T.IcosahedronGeometry(1,detail),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const v=v3(p.getX(i),p.getY(i),p.getZ(i)),n=valueNoise(v.x*1.7+seed,v.y*1.7+v.z*1.3,seed)*2-1;v.multiplyScalar(1+n*roughness);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
function frond(length:number,droop:number,width:number,leaflets:number){
 const positions:number[]=[],spine=(t:number)=>v3(0,Math.sin(t*Math.PI*.55)*length*.35-t*t*droop,t*length);
 for(let i=0;i<leaflets;i++){const t=(i+.5)/leaflets,a=spine(t),b=spine(Math.min(1,t+1/leaflets)),w=width*Math.sin(Math.PI*Math.min(1,t*1.15))*(1-t*.3);
  for(const side of [-1,1]){const tip=a.clone().add(v3(side*w,-w*.55,w*.25));positions.push(...a.toArray(),...tip.toArray(),...b.toArray());}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
function bladeLeaf(length:number,width:number){const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(width,length*.25,width*.8,length*.75,0,length);shape.bezierCurveTo(-width*.8,length*.75,-width,length*.25,0,0);return new T.ShapeGeometry(shape,6);}

const templates=new Map<string,T.BufferGeometry>();
export function treeGeometry(kind:TreeKind,variant=0,low=false):T.BufferGeometry{
 const key=`${kind}:${variant}:${low}`,cached=templates.get(key);if(cached)return cached;
 const b=new Builder(),r=random(9000+variant*97+kind.length*13),detail=low?0:1;
 const bark='#6d5440',dark='#5a4633';
 switch(kind){
  case'cypress':{
   b.add(new T.CylinderGeometry(.08,.13,.8,6),bark,[0,.4,0]);
   const profile=[0,.18,.34,.42,.44,.41,.35,.26,.16,.06,0].map((w,i,a)=>new T.Vector2(w*(1+(r()-.5)*.12),.5+i/(a.length-1)*5.4));
   const g=new T.LatheGeometry(profile,low?7:11),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const n=valueNoise(p.getY(i)*2.5,Math.atan2(p.getZ(i),p.getX(i))*2,7)*.18;p.setX(i,p.getX(i)*(1+n));p.setZ(i,p.getZ(i)*(1+n));}g.computeVertexNormals();
   b.add(g,'#2f5a33',[0,0,0],[0,0,0],[1,1,1],.12);break;
  }
  case'stone-pine':{
   const trunk=[v3(0,0,0),v3(.15,1.5,0),v3(-.1,3,.1),v3(.2,4.1,0)];for(let i=1;i<trunk.length;i++)b.strut(trunk[i-1],trunk[i],.16-i*.03,bark);
   for(const a of [0,2.1,4.2]){const end=v3(Math.cos(a)*1.3,4.4,Math.sin(a)*1.1);b.strut(trunk[3],end,.06,bark,5);}
   for(let i=0;i<(low?5:9);i++){const a=i/(low?5:9)*Math.PI*2,rad=i===0?0:1.3+r()*.5;b.add(lump(i+variant,detail,.2),i%2?'#3f6b3a':'#4d7a42',[Math.cos(a)*rad,4.6+r()*.35,Math.sin(a)*rad*.85],[0,r()*3,0],[1.2+r()*.4,.42+r()*.12,1.1],.1);}break;
  }
  case'olive':{
   b.strut(v3(0,0,0),v3(.18,.9,.05),.17,dark,6);b.strut(v3(.18,.9,.05),v3(-.3,1.5,0),.1,dark,5);b.strut(v3(.18,.9,.05),v3(.55,1.6,.1),.09,dark,5);
   for(let i=0;i<(low?4:7);i++){const a=i*2.3,rad=.25+r()*.55;b.add(lump(i+variant+20,detail,.25),i%2?'#7f9168':'#93a37a',[Math.cos(a)*rad,1.7+r()*.6,Math.sin(a)*rad*.8],[0,0,0],[.62+r()*.25,.45+r()*.12,.55],.14);}break;
  }
  case'date-palm':case'coconut-palm':{
   const coconut=kind==='coconut-palm',lean=coconut?.9+r()*.5:.2,height=coconut?5:5.6,points=Array.from({length:7},(_,i)=>{const t=i/6;return v3(Math.sin(t*1.3)*lean,t*height,0);});
   for(let i=1;i<points.length;i++)b.strut(points[i-1],points[i],.17-i*.012,i%2?'#8a7155':'#7a634a',7,.96);
   const top=points.at(-1)!,count=low?8:13;
   for(let i=0;i<count;i++){const a=i/count*Math.PI*2+r()*.2,up=i%3===0?.35:0;b.add(frond(coconut?2.5:2.2,coconut?1.6:.6,coconut?.36:.24,low?7:12),coconut?(i%2?'#3f8f3a':'#4fa043'):(i%2?'#6f8a4d':'#7d9658'),[top.x,top.y,top.z],[-.25+up,a,0],[1,1,1],.12);}
   if(coconut)for(let i=0;i<4;i++)b.add(new T.SphereGeometry(.13,6,4),'#7b5a2e',[top.x+Math.cos(i*1.6)*.18,top.y-.18,Math.sin(i*1.6)*.18]);
   else for(let i=0;i<5;i++)b.add(new T.SphereGeometry(.12,6,4),'#c08a34',[top.x+Math.cos(i*1.3)*.2,top.y-.3,Math.sin(i*1.3)*.2],[0,0,0],[1,1.6,1]);
   break;
  }
  case'kapok':{
   const height=11;b.add(new T.CylinderGeometry(.35,.55,height,low?7:10),'#7d7162',[0,height/2,0],[0,0,0],[1,1,1],.06);
   // Buttress roots: thin radial fins flaring from the trunk base.
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2+r()*.3,fin=new T.BufferGeometry();fin.setAttribute('position',new T.Float32BufferAttribute([0,0,-.08,1.7,0,-.02,0,2.8,-.06, 0,0,.08,0,2.8,.06,1.7,0,.02, 0,0,-.08,0,2.8,-.06,0,0,.08, 0,0,.08,0,2.8,-.06,0,2.8,.06],3));fin.computeVertexNormals();b.add(fin,'#776b5c',[Math.cos(a)*.3,0,Math.sin(a)*.3],[0,-a,0],[1,1,1],.1);}
   for(let i=0;i<4;i++){const a=i*1.6+r(),end=v3(Math.cos(a)*2.4,height+1.2+r(),Math.sin(a)*2);b.strut(v3(0,height-1,0),end,.18,'#7d7162',6);}
   for(let i=0;i<(low?6:12);i++){const a=i/(low?6:12)*Math.PI*2,rad=i<2?.4:1.6+r()*1.8;b.add(lump(i+variant+40,detail,.24),i%3===0?'#2d6b33':i%3===1?'#3c7d3a':'#4d8f3f',[Math.cos(a)*rad,height+1.4+r()*1.6,Math.sin(a)*rad*.85],[0,r()*3,0],[1.9+r()*.8,1.1+r()*.4,1.6],.12);}
   break;
  }
  case'understory':{
   for(let i=0;i<(low?5:9);i++){const a=i/(low?5:9)*Math.PI*2+r()*.3;b.add(bladeLeaf(1.5+r()*.7,.36+r()*.12),i%2?'#3f9d3d':'#57b44a',[0,.1,0],[-.9-r()*.5,a,0],[1,1,1],.1);}
   b.add(new T.CylinderGeometry(.05,.07,.6,5),'#4d7d38',[0,.3,0]);break;
  }
  case'conifer':case'snow-conifer':{
   const snow=kind==='snow-conifer',tiers=low?4:6,height=4.5+r()*1.5;b.add(new T.CylinderGeometry(.08,.16,height*.35,6),bark,[0,height*.17,0]);
   for(let i=0;i<tiers;i++){const t=i/tiers,w=(1-t)*1.25+.18,y=height*.18+t*height*.78,g=new T.ConeGeometry(w,height*.32,low?6:9),p=g.getAttribute('position');for(let k=0;k<p.count;k++)if(p.getY(k)<0){const a=Math.atan2(p.getZ(k),p.getX(k)),n=1+Math.sin(a*7+i)*.12+(r()-.5)*.1;p.setX(k,p.getX(k)*n);p.setZ(k,p.getZ(k)*n);p.setY(k,p.getY(k)-Math.abs(Math.sin(a*7+i))*.12);}g.computeVertexNormals();
    b.add(g,i%2?'#24533f':'#2c5f46',[0,y,0],[0,i*.7,0],[1,1,1],.1);
    if(snow){const cap=new T.ConeGeometry(w*.86,height*.12,low?6:9);b.add(cap,'#eef5fa',[0,y+height*.09,0],[0,i*.7+.3,0],[1,1,1],.05);}
   }
   break;
  }
  case'birch':{
   b.add(new T.CylinderGeometry(.06,.09,4,6),'#e8e2d6',[0,2,0]);for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.092,.092,.06,6),'#3a3632',[0,.4+i*.6,0]);
   for(let i=0;i<(low?3:6);i++){const a=i*2.2;b.add(lump(i+variant+60,detail,.25),i%2?'#8fae4f':'#a3bf5c',[Math.cos(a)*.5,3.6+r()*.8,Math.sin(a)*.4],[0,0,0],[.7,.9,.6],.12);}break;
  }
  case'acacia':{
   const fork=v3(.1,1.6,0);b.strut(v3(0,0,0),fork,.16,'#5e4a37',6);
   const tops=[v3(-1.3,2.8,.2),v3(1.1,3,-.2),v3(.2,3.1,.6)];for(const t of tops)b.strut(fork,t,.09,'#5e4a37',5);
   for(let i=0;i<(low?5:9);i++){const a=i/(low?5:9)*Math.PI*2,rad=i<1?0:1+r()*1.4;b.add(lump(i+variant+80,detail,.18),i%2?'#5c7436':'#6d843d',[Math.cos(a)*rad,3.15+r()*.25,Math.sin(a)*rad*.8],[0,r()*3,0],[1.3+r()*.4,.3+r()*.08,1.1],.12);}break;
  }
  case'plane':{
   b.add(new T.CylinderGeometry(.12,.2,2.6,7),'#8b7d68',[0,1.3,0],[0,0,0],[1,1,1],.1);
   for(let i=0;i<(low?5:9);i++){const a=i/(low?5:9)*Math.PI*2,rad=i<2?.2:.9+r()*.5;b.add(lump(i+variant+100,detail,.22),i%2?'#4f7f3d':'#62904a',[Math.cos(a)*rad,3+r()*1,Math.sin(a)*rad*.8],[0,0,0],[1.05+r()*.3,.9+r()*.25,.95],.12);}break;
  }
  case'shrub':case'flowering-shrub':{
   for(let i=0;i<(low?3:5);i++){const a=i*2.4;b.add(lump(i+variant+120,detail,.25),i%2?'#4d7f3c':'#5d8f45',[Math.cos(a)*.35,.35+r()*.2,Math.sin(a)*.3],[0,0,0],[.5+r()*.15,.42,.45],.14);}
   if(kind==='flowering-shrub')for(let i=0;i<(low?5:12);i++){const a=r()*Math.PI*2,h=.3+r()*.45;b.add(new T.IcosahedronGeometry(.07,0),i%3===0?'#f3d36b':i%3===1?'#e66f8a':'#f2f0ea',[Math.cos(a)*.55,h+.15,Math.sin(a)*.45]);}
   break;
  }
  case'tuft':case'golden-tuft':case'reed':{
   const golden=kind==='golden-tuft',reed=kind==='reed',blades=low?4:7;
   for(let i=0;i<blades;i++){const a=i/blades*Math.PI*2+r(),h=(reed?1.4:golden?.75:.45)*(.7+r()*.5),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.03,0,0,.03,0,0,Math.sin(a)*.12,h,Math.cos(a)*.12],3));g.computeVertexNormals();b.add(g,golden?(i%2?'#cfa957':'#b99145'):reed?'#6f8a43':(i%2?'#6a9a3a':'#7fae48'),[Math.cos(a)*.05,0,Math.sin(a)*.05],[0,a,0],[1,1,1],.15);}
   break;
  }
  case'bamboo':{
   for(let i=0;i<5;i++){const x=(r()-.5)*.6,z=(r()-.5)*.6,h=4+r()*2;b.add(new T.CylinderGeometry(.05,.06,h,6),'#7f9b4a',[x,h/2,z]);for(let k=0;k<3;k++)b.add(bladeLeaf(.6,.08),'#6f9a3e',[x,h*(.6+k*.15),z],[-1.2,r()*6,0]);}break;
  }
 }
 const geometry=b.geometry();geometry.computeBoundingSphere();templates.set(key,geometry);return geometry;
}

/** Instanced grove of one template; each placement may vary scale, rotation and
 * a colour multiplier. A fresh geometry clone keeps disposal per scene safe. */
export function plantGrove(parent:T.Object3D,kind:TreeKind,placements:Placement[],options:{low?:boolean;variant?:number;shadows?:boolean;name?:string}={}){
 const geometry=treeGeometry(kind,options.variant??0,!!options.low).clone(),material=vertexMaterial(.9,{side:T.DoubleSide});
 const grove=scatter(parent,geometry,material,placements,options.name||'grove-'+kind,options.shadows??false);grove.userData.kind=kind;grove.userData.decorative=true;return grove;
}
