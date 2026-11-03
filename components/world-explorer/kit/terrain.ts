import * as T from 'three';
import {clamp,fbm,hash,hexRgb,matte,mesh,mix,noise2,random,smooth,valueNoise} from './common';
import {markSurface,type SurfaceSet} from './surface-maps';

/** Region-specific terrain materials. A preset changes geometry (organic rock
 * or cut masonry), the rock and surface textures, and the planted details, so
 * a snowy ledge, a sandstone terrace and a mossy jungle rock differ in form as
 * well as colour. The walking cap always stays flat at the collision height. */
export type CapKind='grass'|'sand'|'snow'|'dry'|'moss'|'paving'|'tiles'|'brick'|'earth';
export type TerrainPreset={
 id:string;shape:'rock'|'masonry';
 rock:{light:string;dark:string;crack:string;top:string;topDepth:number;strata:number;taper?:number};
 cap:{kind:CapKind;a:string;b:string;c:string;path?:number};
 rim?:{kind:'tufts'|'drift'|'ridge'|'moss'|'curb';color:string;alt:string;size?:number};
 blades?:{color:string;alt:string;density:number;height:number};
 flowers?:{colors:string[];density:number};
 vines?:{color:string;leaf:string;density:number;length:number};
 icicles?:boolean;ferns?:string;pebbles?:string;
 /** Photographic CC0 surface set applied after loading (see surface-maps). */
 maps?:{set:SurfaceSet;tint?:string;repeat?:number};
};
export type TerrainOptions={quality?:'standard'|'low';lush?:boolean;seed?:number;sparse?:boolean};
type Definition={id:string;x:number;y:number;width:number;depth:number;thickness:number;type:string};

export const terrainCapHeight=.015,walkingCorridor=.55;

/** Rounded-rectangle outline; at angle 0 and PI the outline reaches exactly
 * +/-width/2 on z=0, matching the collider's walking extent. */
export function outline(angle:number,width:number,depth:number,t=0,squareness=.69){
 const c=Math.cos(angle),s=Math.sin(angle),scale=1-.11*t-.32*t*t*t;
 return new T.Vector3(Math.sign(c)*Math.pow(Math.abs(c),squareness)*width*.5*scale,0,Math.sign(s)*Math.pow(Math.abs(s),squareness)*depth*.5*scale);
}

// ---------- textures ----------
type Pixels={width:number;height:number;color:Uint8Array;relief:Uint8Array};
const pixelCache=new Map<string,Pixels>();
function texture(data:Uint8Array,width:number,height:number,color:boolean,low:boolean){
 const t=new T.DataTexture(data,width,height,T.RGBAFormat);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=low?2:4;t.needsUpdate=true;return t;
}
function paint(width:number,height:number,key:string,pixel:(u:number,v:number,px:number,py:number)=>[number,number,number,number]){
 const cached=pixelCache.get(key);if(cached)return cached;
 const color=new Uint8Array(width*height*4),relief=new Uint8Array(width*height*4);
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){const [r,g,b,h]=pixel(px/width,py/height,px,py),i=(py*width+px)*4;color[i]=clamp(Math.round(r),0,255);color[i+1]=clamp(Math.round(g),0,255);color[i+2]=clamp(Math.round(b),0,255);color[i+3]=255;relief[i]=relief[i+1]=relief[i+2]=clamp(Math.round(h),0,255);relief[i+3]=255;}
 const pixels={width,height,color,relief};pixelCache.set(key,pixels);return pixels;
}
/** Periodic noise along u so the texture tiles seamlessly along the course. */
const periodic=(u:number,v:number,scale:number,seed:number,octaves=4)=>{const a=fbm(u*scale,v*scale,seed,octaves),b=fbm((u-1)*scale,v*scale,seed,octaves);return a*(1-u)+b*u;};

/** Cellular weathered rock with cracks and optional sedimentary strata. */
function rockPixels(preset:TerrainPreset,variant:number,low:boolean){
 const size=low?128:256,key=`rock:${preset.id}:${variant}:${size}`,light=hexRgb(preset.rock.light),dark=hexRgb(preset.rock.dark),crack=hexRgb(preset.rock.crack),cols=8,rows=6;
 const cells=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>({x:(noise2(x,y,7919+variant)-.5)*.68,y:(noise2(x,y,1327+variant)-.5)*.58,tone:noise2(x,y,977+variant)})));
 return paint(size,size,key,(u,v,px,py)=>{
  const uu=u+.016*Math.sin(v*Math.PI*4+variant),vv=v+.024*Math.sin(u*Math.PI*2+variant),cx=Math.floor(uu*cols),cy=Math.floor(vv*rows);
  let first=Infinity,second=Infinity,tone=0,dx0=0,dy0=0;
  for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){const cell=cells[(yy%rows+rows)%rows][(xx%cols+cols)%cols],dx=uu*cols-(xx+.5+cell.x),dy=vv*rows-(yy+.5+cell.y),d=dx*dx+dy*dy;if(d<first){second=first;first=d;tone=cell.tone;dx0=dx;dy0=dy;}else if(d<second)second=d;}
  const boundary=Math.sqrt(second)-Math.sqrt(first),fissure=1-smooth(.014,.07,boundary),edge=smooth(.07,.1,boundary)*(1-smooth(.1,.18,boundary));
  const layer=v*(4+preset.rock.strata*5)+Math.sin(u*Math.PI*2)*.12,layerSeam=(1-smooth(.006,.035,Math.abs((layer-Math.floor(layer))-.5)))*preset.rock.strata;
  const grain=noise2(px,py,variant+3721),mottle=fbm(u*6,v*6,variant+11,3),slope=dx0*.05-dy0*.035;
  const shade=clamp(.5+tone*.45+slope*2+(mottle-.5)*.5+(grain-.5)*.18+edge*.2,0,1),base=mix(dark,light,shade),f=fissure*.85+layerSeam*.35;
  const c=mix(base,crack,clamp(f*.65,0,1));
  return[c[0],c[1],c[2],186+tone*25+slope*50+(mottle-.5)*30+(grain-.5)*32-fissure*139-layerSeam*39+edge*13];
 });
}
/** A single dressed stone: chisel texture, bevel shading and weathered edges. */
function ashlarPixels(preset:TerrainPreset,low:boolean){
 const size=low?64:128,light=hexRgb(preset.rock.light),dark=hexRgb(preset.rock.dark),crack=hexRgb(preset.rock.crack);
 return paint(size,size,`ashlar:${preset.id}:${size}`,(u,v,px,py)=>{
  const edge=Math.min(u,1-u,v,1-v),bevel=smooth(0,.07,edge),chisel=Math.sin((u*.6+v)*60+fbm(u*8,v*8,5)*6)*.5+.5,grain=noise2(px,py,91),pits=noise2(px>>1,py>>1,17)>.93?1:0;
  const tone=clamp(.45+fbm(u*3,v*3,33,3)*.5+(grain-.5)*.2+chisel*.08-(1-bevel)*.35-pits*.25,0,1),c=mix(mix(dark,light,tone),crack,(1-smooth(0,.025,edge))*.8);
  return[c[0],c[1],c[2],120+bevel*90+chisel*12-pits*40+(grain-.5)*20];
 });
}
/** Walking-surface textures: u repeats along the course, v spans the depth. */
function capPixels(preset:TerrainPreset,low:boolean){
 const width=low?128:256,height=low?64:128,{kind,a,b,c}=preset.cap,A=hexRgb(a),B=hexRgb(b),C=hexRgb(c),pathWidth=preset.cap.path??.2;
 return paint(width,height,`cap:${preset.id}:${width}`,(u,v,px,py)=>{
  const z=Math.abs(v-.5),n=periodic(u,v,6,hash(preset.id)),grain=noise2(px,py,hash(kind)),path=pathWidth+.06*Math.sin(u*Math.PI*4)+(n-.5)*.1,cover=smooth(path-.05,path+.07,z);
  if(kind==='grass'||kind==='dry'||kind==='moss'||kind==='earth'){
   const patch=periodic(u,v,22,9,2),fleck=patch>.62&&cover>.4?.4:0,base=mix(mix(A,B,cover),C,fleck),shade=.8+grain*.32+(n-.5)*.3;
   return[base[0]*shade,base[1]*shade,base[2]*shade,100+grain*80+cover*30+patch*25];
  }
  if(kind==='sand'){
   const ripple=Math.sin((u*14+periodic(u,v,3,4)*2.2)*Math.PI*2)*.5+.5,shade=.86+ripple*.1+grain*.1-(cover<.5?.04:0),pebble=grain>.985?.35:0,base=mix(mix(A,B,cover*.6+ripple*.2),C,pebble);
   return[base[0]*shade,base[1]*shade,base[2]*shade,120+ripple*60+grain*20+pebble*50];
  }
  if(kind==='snow'){
   const bumps=periodic(u,v,10,21,3),step=(1-cover)*(noise2(Math.floor(u*28),Math.floor(v*8),5)>.55?1:0)*(Math.abs(v-.5)<.09?1:0),shade=.9+bumps*.12+grain*.04-step*.07,base=mix(mix(A,B,cover),C,clamp(.35-bumps,0,.35));
   return[base[0]*shade,base[1]*shade,base[2]*shade,150+bumps*70-step*30];
  }
  if(kind==='paving'||kind==='brick'){
   const rowsAcross=kind==='brick'?10:4,rowIndex=Math.floor(v*rowsAcross),rowV=v*rowsAcross-rowIndex,lengths=kind==='brick'?16:7,shift=kind==='brick'?(rowIndex%2)*.5:noise2(rowIndex,1,3),cell=u*lengths+shift,stone=Math.floor(cell),stoneU=cell-stone;
   const joint=Math.min(stoneU,1-stoneU,rowV,1-rowV),mortar=1-smooth(.02,kind==='brick'?.07:.05,joint),tone=noise2(stone,rowIndex,41),worn=1-cover;
   const base=mix(mix(A,B,tone*.8),C,mortar),shade=.85+grain*.14+(n-.5)*.18+worn*.06,moss=kind==='paving'&&mortar>.5&&n>.56?.55:0;
   const final=moss?mix(base,[94,128,62],moss):base;return[final[0]*shade,final[1]*shade,final[2]*shade,160-mortar*110+grain*30];
  }
  // Mughal-style inlay: red sandstone panels with pale lozenge stars.
  const tile=8,cu=(u*tile)%1,cv=(v*4)%1,dx=Math.abs(cu-.5),dy=Math.abs(cv-.5),star=Math.min(Math.abs(dx+dy-.32),Math.abs(Math.max(dx,dy)-.3)),inlay=1-smooth(.015,.045,star),border=z>.4?1:0,joint=1-smooth(.01,.03,Math.min(cu,1-cu,cv,1-cv));
  const base=mix(mix(A,B,inlay),C,Math.max(joint*.8,border*.5)),shade=.88+grain*.12;return[base[0]*shade,base[1]*shade,base[2]*shade,150+inlay*40-joint*80];
 });
}

// ---------- geometry ----------
function rockGeometry(preset:TerrainPreset,width:number,depth:number,thickness:number,seed:number,low:boolean){
 const segments=low?36:52,rings=low?8:12,positions:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[],taper=preset.rock.taper??1;
 const white=new T.Color('#ffffff'),deep=new T.Color('#d4d0c4'),top=new T.Color(preset.rock.top),r=random(seed);
 const spikes=Array.from({length:5},()=>({a:r()*Math.PI*2,depth:.15+r()*.45,width:.4+r()*.6}));
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,t=row/rings,shrink=1-(1-(1-.11*t-.32*t*t*t))*taper,point=outline(a,width,depth,0),edge=Math.sin(t*Math.PI);
  point.multiplyScalar(shrink);
  const strata=Math.sin(t*23+Math.sin(a*3+seed)*.6),fissure=Math.sin(a*13+Math.floor(t*5)*1.7+seed),bulge=(strata*.055+fissure*.045+(valueNoise(a*3,t*4,seed)-.5)*.12)*edge;
  point.x*=1+bulge;point.z*=1+bulge;
  // Irregular underside: hanging lobes so floating rock never reads as a slab.
  let drop=0;for(const s of spikes){const d=Math.abs(((a-s.a+Math.PI*3)%(Math.PI*2))-Math.PI);drop+=Math.max(0,1-d/s.width)*s.depth;}
  point.y=-thickness*t*(1+drop*smooth(.55,1,t))+Math.sin(a*8+row*.9+seed)*.045*edge;
  positions.push(point.x,point.y,point.z);uv.push(i/segments*(width+depth)*.32,t*thickness*.42);
  const seam=Math.abs(Math.sin(t*12+Math.sin(a*2.2)*.18)),shade=.95+.04*Math.sin(a*2+seed)+.03*strata-(seam<.12?.05:0),color=white.clone().lerp(deep,.05+t*.16).multiplyScalar(shade);
  const drip=(Math.sin(a*7+seed)+Math.sin(a*17+seed*.2))*.5,cover=preset.rock.topDepth*(1+Math.max(0,drip)*1.6);
  if(t<cover)color.lerp(top,clamp((cover-t)/Math.max(.04,cover)*.9,0,.85));
  colors.push(color.r,color.g,color.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
 // Close the underside with a fan to a low point, so islands are solid from below.
 const centre=positions.length/3;positions.push(0,-thickness*1.12,0);uv.push(.5,thickness*.5);const under=white.clone().lerp(deep,.3);colors.push(under.r,under.g,under.b);
 for(let i=0;i<segments;i++){const a=rings*(segments+1)+i;indices.push(a,a+1,centre);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
/** Cut-stone courses that crumble towards a broken underside. */
function masonryGeometry(preset:TerrainPreset,width:number,depth:number,thickness:number,seed:number){
 const r=random(seed),parts:T.BufferGeometry[]=[],course=.5,rows=Math.max(1,Math.ceil(thickness/course));
 const add=(x:number,y:number,z:number,w:number,h:number,d:number,shade:number)=>{const g=new T.BoxGeometry(w,h,d).toNonIndexed(),n=g.getAttribute('position').count,colors=new Float32Array(n*3);for(let i=0;i<n*3;i++)colors[i]=shade;g.setAttribute('color',new T.BufferAttribute(colors,3));g.translate(x,y,z);parts.push(g);};
 // The top course carries the walking cap, so it always spans the full width.
 add(0,-.16,0,width,.32,depth,.98);
 for(let row=0;row<rows;row++){
  const top=-.32-row*course,h=Math.min(course,thickness-.32-row*course);if(h<=.05)break;
  const loss=row/Math.max(1,rows)*.42,left=-width/2+loss*width*(.3+r()*.7)*.5,right=width/2-loss*width*(.3+r()*.7)*.5,inset=row*.06;
  for(let x=left;x<right-.1;){
   const w=Math.min(right-x,.7+r()*.9),gap=r()<.08+row*.05?w:0;
   if(!gap)add(x+w/2,top-h/2,(r()-.5)*.08,w-.03,h-.03,Math.max(.6,depth-inset*2-(r()*.1)),.88+r()*.14);
   x+=w;
  }
 }
 let geometry=parts.length>1?mergeAll(parts):parts[0];geometry=geometry.clone();parts.forEach(p=>p.dispose());geometry.computeVertexNormals();
 // World-scale box mapping, so a photographic wall texture runs across blocks.
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
 for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));uv.setXY(i,(ay>.5||ax<=.5?p.getX(i):p.getZ(i))*.45,(ay>.5?p.getZ(i):p.getY(i))*.45);}
 return geometry;
}
function mergeAll(parts:T.BufferGeometry[]){
 let total=0;for(const p of parts)total+=p.getAttribute('position').count;
 const positions=new Float32Array(total*3),normals=new Float32Array(total*3),uvs=new Float32Array(total*2),colors=new Float32Array(total*3);let offset=0;
 for(const p of parts){const n=p.getAttribute('position').count;positions.set(p.getAttribute('position').array as Float32Array,offset*3);normals.set(p.getAttribute('normal').array as Float32Array,offset*3);uvs.set(p.getAttribute('uv').array as Float32Array,offset*2);colors.set(p.getAttribute('color').array as Float32Array,offset*3);offset+=n;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
}
function capGeometry(width:number,depth:number,shape:'rock'|'masonry',low:boolean){
 if(shape==='masonry'){const g=new T.PlaneGeometry(width-.02,depth-.02,1,1);const p=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/4,p.getY(i)/depth+.5);return g;}
 const n=low?48:72,positions=[0,0,0],uv=[0,.5],indices:number[]=[];
 for(let i=0;i<n;i++){const p=outline(i/n*Math.PI*2,width,depth);positions.push(p.x,p.z,0);uv.push(p.x/4,p.z/depth+.5);}
 for(let i=0;i<n;i++)indices.push(0,i+1,(i+1)%n+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

// ---------- details ----------
function bladeGeometry(low:boolean,height:number){
 const positions:number[]=[],indices:number[]=[],count=low?3:5;
 for(let blade=0;blade<count;blade++){const angle=blade*2.4,scale=.7+(blade%3)*.17,c=Math.cos(angle),s=Math.sin(angle),base=blade*5;for(const [x,y,z] of [[-.028,0,0],[.028,0,0],[-.018,.16,.015],[.018,.16,.015],[.009,.29,.055]])positions.push((x*c+z*s)*scale,y*scale*height,(-x*s+z*c)*scale);indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function instanced(root:T.Object3D,geometry:T.BufferGeometry,material:T.Material,count:number,name:string,place:(i:number,dummy:T.Object3D)=>string|T.Color){
 const mesh=new T.InstancedMesh(geometry,material,Math.max(1,count)),dummy=new T.Object3D();mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
 for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);const color=place(i,dummy);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(color));}
 if(!count)mesh.count=0;root.add(mesh);return mesh;
}
/** A point on the cap that stays out of the walking corridor (|z|>=0.84). */
function rearPoint(r:()=>number,width:number,depth:number,front=false){
 const z=(front&&r()<.4?1:-1)*(.84+r()*(depth*.5-.95)),limit=width*.5*Math.pow(clamp(1-Math.pow(Math.abs(z)/(depth*.5),1/.345),0,1),.345);
 return new T.Vector3((r()*2-1)*limit*.94,terrainCapHeight,z);
}

function addRim(root:T.Group,preset:TerrainPreset,width:number,depth:number,r:()=>number,low:boolean,lush:boolean){
 const rim=preset.rim;if(!rim)return;
 const count=Math.min(low?22:lush?110:48,Math.ceil(width*(low?2.6:lush?10:5.8))),size=rim.size??1;
 const geometry=rim.kind==='curb'?new T.BoxGeometry(1,1,1):new T.SphereGeometry(1,low?6:8,low?3:5);
 instanced(root,geometry,new T.MeshStandardMaterial({color:'#ffffff',roughness:rim.kind==='drift'?.7:1}),count,'terrain-rim-'+rim.kind,(i,d)=>{
  const a=i/count*Math.PI*2,p=outline(a,width,depth);
  const sy=(rim.kind==='drift'?.08+r()*.08:rim.kind==='ridge'?.05+r()*.06:.035+r()*.045)*size,s=(.12+r()*.14)*size;
  d.position.set(p.x*.98,Math.abs(p.z)<.9?-sy*.6:terrainCapHeight-sy*.35,p.z*.98);d.scale.set(s*(1.5+r()),sy,s*(rim.kind==='drift'?1.4:1));d.rotation.set(0,a,0);
  return new T.Color(i%3?rim.color:rim.alt).multiplyScalar(.86+r()*.26);
 });
}
function addBlades(root:T.Group,preset:TerrainPreset,width:number,depth:number,r:()=>number,low:boolean,lush:boolean){
 const blades=preset.blades;if(!blades)return;
 const count=Math.min(low?50:lush?560:180,Math.ceil(width*depth*blades.density*(low?.25:lush?2.2:1)));
 instanced(root,bladeGeometry(low,blades.height),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide}),count,'terrain-grass-blades',(i,d)=>{
  const p=r()<.5?outline(r()*Math.PI*2,width,depth).multiplyScalar(.78+r()*.18):rearPoint(r,width,depth,true);if(Math.abs(p.z)<.84)p.z=Math.sign(p.z||1)*.84;
  const limit=width*.5*Math.pow(clamp(1-Math.pow(Math.abs(p.z)/(depth*.5),1/.345),0,1),.345);p.x=clamp(p.x,-limit*.96,limit*.96);
  d.position.set(p.x,terrainCapHeight+.01,p.z);d.scale.setScalar(.45+r()*.7);d.rotation.set(0,r()*Math.PI*2,(r()-.5)*.35);
  return new T.Color(i%3?blades.color:blades.alt).multiplyScalar(.85+r()*.25);
 });
}
function addFlowers(root:T.Group,preset:TerrainPreset,width:number,depth:number,r:()=>number,low:boolean,lush:boolean){
 const flowers=preset.flowers;if(!flowers)return;
 const shape=new T.Shape();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,rad=.07*(.75+.25*Math.cos(a*5));if(!i)shape.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);else shape.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}
 const count=Math.min(low?8:lush?70:24,Math.ceil(width*flowers.density*(lush?2.5:1)));
 instanced(root,new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,side:T.DoubleSide}),count,'terrain-flowers',(i,d)=>{
  const p=rearPoint(r,width,depth,true),size=.6+r()*.6;d.position.set(p.x,.15*size+.02,p.z);d.rotation.set(-Math.PI/2+(r()-.5)*.7,(r()-.5)*.5,r()*Math.PI);d.scale.setScalar(size);
  return flowers.colors[i%flowers.colors.length];
 });
}
function addFerns(root:T.Group,color:string,width:number,depth:number,r:()=>number,low:boolean,lush:boolean){
 const positions:number[]=[];const tri=(a:T.Vector3,b:T.Vector3,c:T.Vector3)=>positions.push(...a.toArray(),...b.toArray(),...c.toArray());
 for(let f=0;f<6;f++){const angle=f*Math.PI/3,point=(t:number)=>new T.Vector3(Math.sin(angle)*t*.55,Math.sin(t*Math.PI*.62)*.5,Math.cos(angle)*t*.55),side=new T.Vector3(Math.cos(angle),0,-Math.sin(angle));for(let i=1;i<8;i++){const t=i/8,a=point(t),b=point((i+1)/8),w=.11*(1-t)+.02;for(const dir of [-1,1])tri(a.clone().addScaledVector(side,-.01),a.clone().addScaledVector(side,w*dir).addScaledVector(b.clone().sub(a),.6),b);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 const count=Math.min(low?2:lush?14:6,Math.max(2,Math.ceil(width/(low?3.5:lush?1:1.6))));
 instanced(root,g,new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1}),count,'terrain-rear-ferns',(i,d)=>{
  const size=Math.min(.7+r()*.6,Math.max(.3,(depth*.5-.2-.7)/.55));d.position.set((i+.5)/count*width*.8-width*.4,terrainCapHeight,-(.7+.55*size));d.scale.setScalar(size);d.rotation.set(0,r()*Math.PI*2,0);
  return new T.Color(color).multiplyScalar(.85+r()*.3);
 });
}
function addVines(root:T.Group,preset:TerrainPreset,width:number,depth:number,thickness:number,r:()=>number,low:boolean,lush:boolean){
 const vines=preset.vines;if(!vines)return;
 const count=Math.min(low?3:lush?18:8,Math.max(2,Math.ceil(width*vines.density*(lush?1.8:1)))),leafPer=low?5:9,leafGeometry=new T.BufferGeometry();
 leafGeometry.setAttribute('position',new T.Float32BufferAttribute([0,.04,0,.07,0,0,-.07,0,0,0,-.04,0],3));leafGeometry.setIndex([0,2,1,2,3,1]);leafGeometry.computeVertexNormals();
 const stems:T.Vector3[][]=[];
 for(let i=0;i<count;i++){const a=(.12+.76*(i+.5)/count)*Math.PI,p=outline(a,width,depth),length=Math.min(thickness*.85,.6+r()*vines.length*(lush?1.4:1));stems.push([new T.Vector3(p.x,-.03,p.z+.03),new T.Vector3(p.x+.08,-length*.33,p.z*.93+.06),new T.Vector3(p.x-.1,-length*.7,p.z*.82+.12),new T.Vector3(p.x+.02,-length,p.z*.72+.15)]);}
 const material=matte(vines.color);
 for(const points of stems){const stem=mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),low?6:10,.014,4,false),material);stem.name='terrain-hanging-vine';stem.castShadow=false;}
 instanced(root,leafGeometry,new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide}),count*leafPer,'terrain-vine-leaves',(i,d)=>{
  const curve=new T.CatmullRomCurve3(stems[Math.floor(i/leafPer)]),t=((i%leafPer)+.5)/leafPer,p=curve.getPoint(t),side=i%2?1:-1;d.position.set(p.x+side*.05,p.y,p.z+.014);d.rotation.set(-.15,side*.25,side*.55);d.scale.setScalar((lush?1.7:1)+r()*.4);
  return new T.Color(vines.leaf).multiplyScalar(.82+r()*.3);
 });
}
function addIcicles(root:T.Group,width:number,depth:number,r:()=>number,low:boolean){
 const count=Math.min(low?8:24,Math.ceil(width*(low?1:2.6)));
 instanced(root,new T.ConeGeometry(.05,1,5),new T.MeshStandardMaterial({color:'#e8f6ff',roughness:.18,metalness:.05,transparent:true,opacity:.86}),count,'terrain-icicles',(i,d)=>{
  const a=(.08+.84*r())*Math.PI,p=outline(a,width,depth),length=.18+r()*.55;d.position.set(p.x*.96,-.12-length/2,p.z*.96);d.rotation.set(Math.PI,0,0);d.scale.set(1+r(),length,1+r());return'#ffffff';
 });
}
function addPebbles(root:T.Group,color:string,width:number,depth:number,r:()=>number,low:boolean){
 const count=Math.min(low?6:18,Math.ceil(width*(low?.7:1.6)));
 instanced(root,new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#ffffff',roughness:.95}),count,'terrain-pebbles',(i,d)=>{
  const p=rearPoint(r,width,depth,true),s=.05+r()*.11;d.position.set(p.x,terrainCapHeight+s*.4,p.z);d.scale.set(s*1.4,s*.7,s);d.rotation.set(r(),r()*6,r());return new T.Color(color).multiplyScalar(.8+r()*.35);
 });
}

function replace(object:T.Mesh,geometry:T.BufferGeometry,material:T.MeshStandardMaterial){object.geometry.dispose();for(const old of Array.isArray(object.material)?object.material:[object.material])old.dispose();object.geometry=geometry;object.material=material;}

/** Dress a playable island from scenic-kit island(). root is centred at the
 * platform's middle with its cap on y=0. Decorations never enter |z|<0.55. */
export function dressTerrain(root:T.Group,definition:Definition,preset:TerrainPreset,options:TerrainOptions={}){
 if(![definition.width,definition.depth,definition.thickness].every(value=>Number.isFinite(value)&&value>0))throw new Error('Terrain dimensions must be finite and positive.');
 const previous=root.getObjectByName('terrain-dressing');if(previous instanceof T.Group)return previous;
 for(const object of [...root.children]){
  if(!(object instanceof T.Mesh)||object.name||object.geometry.type!=='SphereGeometry'||Math.abs(object.position.y-.025)>.000001||object.scale.y>.14)continue;
  object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();object.removeFromParent();
 }
 const low=options.quality==='low',seed=options.seed??hash(definition.id),r=random(seed),width=clamp(definition.width,1.6,30),depth=clamp(definition.depth,2,15),thickness=clamp(definition.thickness,.2,30),lush=!!options.lush;
 const details=new T.Group();details.name='terrain-dressing';details.userData={preset:preset.id,quality:low?'low':'standard',nonColliding:true,walkingCorridor};root.add(details);
 const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh|undefined,cap=root.getObjectByName('country-platform-cap') as T.Mesh|undefined;
 if(cliff){
  const variant=seed%4;
  if(preset.shape==='masonry'){const p=ashlarPixels(preset,low);replace(cliff,masonryGeometry(preset,width,depth,thickness,seed),new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.93,map:texture(p.color,p.width,p.height,true,low),bumpMap:texture(p.relief,p.width,p.height,false,low),bumpScale:.12}));}
  else{const p=rockPixels(preset,variant,low),map=texture(p.color,p.width,p.height,true,low),bump=texture(p.relief,p.width,p.height,false,low);map.offset.set((seed%97)/97,(seed%53)/53);bump.offset.copy(map.offset);replace(cliff,rockGeometry(preset,width,depth,thickness,seed,low),new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.95,map,bumpMap:bump,bumpScale:.2}));}
  cliff.userData.terrain=preset.id;if(preset.maps)markSurface(cliff.material as T.MeshStandardMaterial,preset.maps.set,preset.maps.tint,preset.maps.repeat);
 }
 if(cap){
  const p=capPixels(preset,low);replace(cap,capGeometry(width,depth,preset.shape,low),new T.MeshStandardMaterial({color:'#ffffff',roughness:preset.cap.kind==='snow'?.62:.94,map:texture(p.color,p.width,p.height,true,low),bumpMap:texture(p.relief,p.width,p.height,false,low),bumpScale:.03}));
  cap.scale.set(1,1,1);cap.rotation.set(-Math.PI/2,0,0);cap.position.set(0,terrainCapHeight,0);
 }
 if(options.sparse)return details;
 addRim(details,preset,width,depth,r,low,lush);addBlades(details,preset,width,depth,r,low,lush);addFlowers(details,preset,width,depth,r,low,lush);
 if(preset.ferns)addFerns(details,preset.ferns,width,depth,r,low,lush);addVines(details,preset,width,depth,thickness,r,low,lush);
 if(preset.icicles&&preset.shape==='rock')addIcicles(details,width,depth,r,low);if(preset.pebbles)addPebbles(details,preset.pebbles,width,depth,r,low);
 details.userData.style=preset.id;return details;
}

/** Decorative background terrace: x/z are its centre and y its top. */
export function createScenicTerrace(parent:T.Object3D,options:{x:number;y:number;z:number;width:number;depth:number;thickness:number;preset:TerrainPreset;seed?:number;quality?:'standard'|'low';sparse?:boolean;lush?:boolean}){
 if(![options.x,options.y,options.z,options.width,options.depth,options.thickness].every(Number.isFinite)||options.width<=0||options.depth<=0||options.thickness<=0)throw new Error('Invalid scenic terrace dimensions.');
 const root=new T.Group();root.name='scenic-terrace';root.position.set(options.x,options.y,options.z);root.userData.nonColliding=true;parent.add(root);
 const cliff=mesh(root,new T.CylinderGeometry(1,1,1,8),matte('#999999'));cliff.name='country-platform-cliff';const cap=mesh(root,new T.CircleGeometry(1,8),matte('#999999'),0,.015,0);cap.name='country-platform-cap';
 dressTerrain(root,{id:'scenic-'+(options.seed??hash(`${options.x}:${options.z}`)),x:options.x-options.width/2,y:options.y,width:options.width,depth:options.depth,thickness:options.thickness,type:'stone'},options.preset,{quality:options.quality,seed:options.seed,sparse:options.sparse,lush:options.lush});return root;
}
