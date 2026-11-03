import * as T from 'three';
import {Builder,random,hash,v3,vertexMaterial,boxUV} from '../kit/common';
import {markSurface,type SurfaceSet} from '../kit/surface-maps';
import {createWaterSurface} from '../kit/water';
import {localSurface} from '../kit/landmass';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';

/** Asia-only art helpers. They never add or alter simulation colliders. */
export function irregularBasin(parent:T.Object3D,o:{name:string;x:number;y:number;z:number;width:number;depth:number;seed:number;low:boolean;rim?:string;shallow?:string;deep?:string;height?:number}){
 const count=o.low?40:72,point=(i:number,r=1)=>{const a=i/count*Math.PI*2,n=1+.07*Math.sin(a*3+o.seed)+.035*Math.cos(a*7-o.seed);return new T.Vector2(Math.cos(a)*o.width*.5*n*r,Math.sin(a)*o.depth*.5*n*r);};
 const outline=(r:number,reverse=false)=>{const p=new T.Path();for(let i=0;i<count;i++){const v=point(reverse?count-i:i,r);if(!i)p.moveTo(v.x,v.y);else p.lineTo(v.x,v.y);}p.closePath();return p;};
 const shape=new T.Shape(outline(1.12).getPoints());shape.holes.push(outline(1,true));
 const h=o.height??1.3,g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.1,bevelThickness:.08});g.rotateX(-Math.PI/2);g.translate(o.x,o.y-h,o.z);boxUV(g,.35);
 const mat=new T.MeshStandardMaterial({color:o.rim||'#c8c6a0',roughness:.96});markSurface(mat,'limestone','#eee9d7',.45);const rim=new T.Mesh(g,mat);rim.name=o.name+'-scalloped-mineral-rim';rim.castShadow=rim.receiveShadow=true;rim.userData.nonColliding=true;parent.add(rim);
 const water=createWaterSurface(parent,{name:o.name+'-water',x:o.x,y:o.y-.03,z:o.z,width:o.width,depth:o.depth,shallow:o.shallow||'#9bd2be',deep:o.deep||'#579f96',segments:8,flow:[.008,.003]});
 const face=new T.Shape(outline(.995).getPoints()),waterGeometry=new T.ShapeGeometry(face,1),p=waterGeometry.getAttribute('position'),uv=waterGeometry.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/o.width+.5,p.getY(i)/o.depth+.5);const shades:number[]=[];for(let i=0;i<p.count;i++){const radial=Math.min(1,Math.hypot(p.getX(i)/(o.width*.5),p.getY(i)/(o.depth*.5))),c=new T.Color(o.deep||'#579f96').lerp(new T.Color(o.shallow||'#9bd2be'),radial*.75);shades.push(c.r,c.g,c.b);}waterGeometry.setAttribute('color',new T.Float32BufferAttribute(shades,3));water.surface.geometry.dispose();water.surface.geometry=waterGeometry;const wm=water.surface.material as T.MeshStandardMaterial;wm.roughness=.28;wm.normalScale.set(.18,.18);wm.normalMap?.repeat.set(2,1);
 const bed=new T.Mesh(new T.ShapeGeometry(face),new T.MeshStandardMaterial({color:o.shallow||'#9bbfa7',roughness:1}));bed.rotation.x=-Math.PI/2;bed.position.set(o.x,o.y-.22,o.z);bed.name=o.name+'-mineral-bed';parent.add(bed);
 return{rim,water:water.surface,update:water.update};
}

export function contourBench(parent:T.Object3D,o:{name:string;x:number;y:number;z:number;width:number;depth:number;seed:number;low:boolean;water?:boolean;color?:string}){
 const n=o.low?32:60,front=(u:number)=>Math.sin(u*5.5+o.seed*.3)*2.2+Math.sin(u*12+o.seed)*.5,shape=new T.Shape();
 for(let i=0;i<=n;i++){const u=i/n,x=(u-.5)*o.width,z=front(u);if(!i)shape.moveTo(x,z);else shape.lineTo(x,z);}
 for(let i=n;i>=0;i--){const u=i/n;shape.lineTo((u-.5)*o.width,front(u)-o.depth);}shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:1.85,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(o.x,o.y-1.85,o.z);boxUV(g,.45);const mat=new T.MeshStandardMaterial({color:o.color||'#8b8665',roughness:.94});markSurface(mat,'mossy-rock','#ded3af',.4);const wall=new T.Mesh(g,mat);wall.name=o.name+'-contour-wall';wall.castShadow=wall.receiveShadow=true;parent.add(wall);
 const b=new Builder(),r=random(o.seed);for(let i=0;i<n;i++){const u=(i+.5)/n,x=o.x+(u-.5)*o.width,z=o.z-front(u);for(let row=0;row<3;row++)b.add(new T.BoxGeometry(o.width/n*.96,.45,.4),row%2?'#807c5a':'#9b9670',[x,o.y-.3-row*.5,z-.02],[0,.04*Math.cos(u*13),r()*.03]);}
 // Flat fields at each contour's level; irrigation stays inside its walls.
 const field=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:o.water?'#8fb6a0':'#719447',roughness:o.water?.23:.9,metalness:o.water?.08:0}));field.rotation.x=-Math.PI/2;field.position.set(o.x,o.y+.012,o.z);field.name=o.name+'-level-paddy';field.receiveShadow=true;parent.add(field);
 for(let i=0;i<(o.low?24:48);i++){const u=(i+.5)/(o.low?24:48),x=o.x+(u-.5)*o.width,z=o.z-front(u)+o.depth*.55;for(let blade=0;blade<3;blade++)b.add(new T.ConeGeometry(.035,.5,3),'#77a448',[x+blade*.11,o.y+.25,z],[0,blade,.13*(blade-1)]);}
 b.mesh(parent,vertexMaterial(),'contour-masonry-and-rice-'+o.seed);return{wall,field};
}

export function organicCave(parent:T.Object3D,w:number,seed:number,color:string,low:boolean){
 const outer=new T.Shape(),n=low?22:42;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1+.06*Math.sin(a*7+seed);const x=Math.cos(a)*w*.58*r,y=2.5+Math.sin(a)*4.5*r;if(!i)outer.moveTo(x,y);else outer.lineTo(x,y);}outer.closePath();
 const hole=new T.Path();for(let i=n;i>=0;i--){const a=i/n*Math.PI*2,r=1+.04*Math.sin(a*5+seed),x=Math.cos(a)*w*.42*r,y=2+Math.sin(a)*2.5*r;if(i===n)hole.moveTo(x,y);else hole.lineTo(x,y);}hole.closePath();outer.holes.push(hole);
 const g=new T.ExtrudeGeometry(outer,{depth:2,bevelEnabled:true,bevelSize:.25,bevelThickness:.22,bevelSegments:2,curveSegments:low?6:12});boxUV(g,.45);const mat=new T.MeshStandardMaterial({color,roughness:.98});markSurface(mat,'limestone','#d4d9c8',.5);const cave=new T.Mesh(g,mat);cave.position.z=-4.7;cave.name='organic-limestone-cave-opening';cave.castShadow=cave.receiveShadow=true;cave.userData.nonColliding=true;parent.add(cave);
 const dark=new T.Mesh(new T.PlaneGeometry(w*.82,4.5),new T.MeshStandardMaterial({color:'#263e3c',roughness:1}));dark.position.set(0,1.8,-6.9);dark.name='cave-shadowed-interior';parent.add(dark);return cave;
}

/** Sculpt the lower/front body only. The exact walking cap is untouched. */
export function sculptRegionalBody(root:T.Group,p:PlatformDefinition,code:string){
 const body=root.getObjectByName('country-platform-cliff') as T.Mesh|undefined;if(!body)return;
 const geo=body.geometry,pos=geo.getAttribute('position'),seed=hash(code+p.id),r=random(seed),surface=localSurface(p),urban=['SGP','IRN','QAT','KWT','ARE'].includes(code),limestone=['LAO','THA','VNM','OMN'].includes(code);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),below=surface(Math.max(-p.width/2,Math.min(p.width/2,x)))-y;if(below<.22)continue;const fade=Math.min(1,(below-.22)/1.2),strata=Math.sin(y*(code==='IDN'?3.8:1.6)+Math.sin(x*.7+seed)*.7),fissure=Math.pow(Math.max(0,Math.sin(x*(limestone?2.4:1.3)+seed)),8);if(!urban)pos.setZ(i,z+(z>=0?1:-1)*fade*(strata*.12-fissure*.28));}
 geo.computeVertexNormals();geo.userData.asiaArtPass=code;
 const b=new Builder(),z=p.depth/2+.13;
 if(['KHM','MMR','PHL','UZB','BHR'].includes(code)){
  for(let row=0;row<3;row++)for(let x=-p.width/2+.45+(row%2)*.35;x<p.width/2-.25;x+=code==='MMR'?.55:1.05){const h=code==='MMR'?.24:.42,yy=surface(x)-.35-row*(h+.08);b.add(new T.BoxGeometry(code==='MMR'?.48:.88,h,.16),code==='MMR'?(row%2?'#a27252':'#bd8864'):row%2?'#6d7254':'#848768',[x,yy,z],[0,0,(r()-.5)*.025]);}
 }else if(code==='BRN'||code==='BGD'){
  for(let x=-p.width/2+1;x<p.width/2;x+=2.3){const y=surface(x)-.2;for(const s of [-1,1])b.strut(v3(x,y,z),v3(x+s*.6,y-1.5,z+.3),.09,'#74664c');}
 }else if(urban){for(let x=-p.width/2+.7;x<p.width/2;x+=1.8)b.add(new T.BoxGeometry(1.65,.65,.09),code==='IRN'?'#c9a779':'#bcc8c3',[x,surface(x)-.48,z]);}
 else if(limestone){for(let x=-p.width/2+.3;x<p.width/2;x+=.65)b.add(new T.SphereGeometry(.23,7,5),'#c3c2a0',[x,surface(x)-.17,z],[0,0,0],[1,.4,1.25]);}
 if(b.parts.length)b.mesh(root,vertexMaterial(.95),'country-specific-body-detail-'+code);
}

export function lotusTower(b:Builder,x:number,y:number,z:number,h:number,s=1){
 for(let i=0;i<4;i++)b.add(new T.BoxGeometry((5-i*.45)*s,.7*s,(5-i*.45)*s),'#8b8571',[x,y+(.35+i*.7)*s,z]);
 b.add(new T.BoxGeometry(3.4*s,h*.45,3.4*s),'#8c8775',[x,y+h*.225+2.8*s,z]);
 for(const side of [-1,1])for(let i=0;i<4;i++){b.add(new T.BoxGeometry(.2*s,h*.43,.3*s),'#a39a82',[x+side*1.75*s,y+h*.23+2.8*s,z+(i-1.5)*.7*s]);b.add(new T.BoxGeometry(.6*s,h*.25,.1*s),'#4f5145',[x+(i-1.5)*.7*s,y+h*.2+2.8*s,z+side*1.72*s]);}
 const points=Array.from({length:18},(_,i)=>{const t=i/17;return new T.Vector2((1.7*(1-t)**.65+.045*Math.sin(t*8*Math.PI))*(.78+.22*Math.sin(t*Math.PI))*s,t*h*.55);});
 b.add(new T.LatheGeometry(points,12),'#928976',[x,y+h*.45+2.8*s,z]);
 for(let i=0;i<4;i++)b.add(new T.BoxGeometry((3.6-i*.55)*s,.11*s,(3.6-i*.55)*s),'#a49a7e',[x,y+h*.45+2.8*s+i*h*.07,z]);
}

export function baganMonument(b:Builder,x:number,y:number,z:number,s:number,kind:number){
 const brick=kind%2?'#a66848':'#b88761';for(let i=0;i<3;i++)b.add(new T.BoxGeometry((7-i)*s,.6*s,(7-i)*s),brick,[x,y+(.3+i*.6)*s,z]);
 if(kind%3===0){const points=[[3,0],[2.7,1],[2.4,2],[2.2,3],[1.2,5],[.7,6],[.5,6.5],[.15,9]].map(([r,h])=>new T.Vector2(r*s,h*s));b.add(new T.LatheGeometry(points,20),brick,[x,y+1.8*s,z]);}
 else{b.add(new T.BoxGeometry(4.5*s,5*s,4.5*s),brick,[x,y+4.3*s,z]);for(const side of [-1,1])b.add(new T.BoxGeometry(1*s,2.7*s,.08),'#544633',[x,y+3.2*s,z+side*2.28*s]);for(let i=0;i<5;i++)b.add(new T.CylinderGeometry((2.9-i*.42)*s,(3.2-i*.42)*s,.6*s,4),brick,[x,y+(7.1+i*.6)*s,z],[0,Math.PI/4,0]);}
 b.add(new T.ConeGeometry(.55*s,4*s,12),'#ccb575',[x,y+12*s,z]);for(let i=0;i<4;i++)b.add(new T.TorusGeometry((.55-i*.11)*s,.06*s,4,16),'#d2bd83',[x,y+(10.7+i*.7)*s,z],[Math.PI/2,0,0]);
}
