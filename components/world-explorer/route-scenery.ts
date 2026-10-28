import * as T from 'three';
import {hash,matte,mesh,nature,random,sphere,strut} from './scenic-kit';
import type {VisualProfile} from './country-platforms';

const cities=new Set(['USA','FRA']);

/** Illustrative surface detail is generated locally; the place profile supplies
 * the stone colour. It is not a sampled historical building texture. */
function stoneGrain(seed:number){
 const size=64,data=new Uint8Array(size*size*4),r=random(seed);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const seam=Math.abs(Math.sin(y*.21+Math.sin(x*.11)*.7)),grain=Math.round(95+r()*80+(seam<.12?-48:0)),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=grain;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

/** Keep the collision cap at its original height while varying the actual
 * geometry colours and fine surface relief with the sourced setting. */
export function countrySurface(root:T.Group,profile:VisualProfile){
 const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>|undefined;
 if(!cliff)return;
 const colors=cliff.geometry.getAttribute('color'),target=new T.Color(profile.palette.stone);
 for(let i=0;i<colors.count;i++){
  const shade=.68+.25*(1-i/Math.max(1,colors.count-1));colors.setXYZ(i,target.r*shade,target.g*shade,target.b*shade);
 }
 colors.needsUpdate=true;cliff.material.bumpMap=stoneGrain(hash(profile.code));cliff.material.bumpScale=.11;cliff.material.needsUpdate=true;
}

/** A broadleaf canopy, with visible branches and hanging vines, rather than
 * giving every tropical forest the silhouette of a palm plantation. */
export function broadleafTree(parent:T.Object3D,x:number,y:number,z:number,size:number,seed:number,foliage:string,vines=false){
 const root=new T.Group();root.name=vines?'rainforest-canopy-tree':'broadleaf-setting-tree';root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);
 const r=random(seed),bark=matte('#71543d'),leaf=matte(foliage),light=matte(new T.Color(foliage).multiplyScalar(1.15).getStyle());
 strut(root,bark,new T.Vector3(0,0,0),new T.Vector3(.1,1.7,0),.12);
 for(let i=0;i<7;i++){
  const a=i*2.4,px=Math.sin(a)*.64,pz=Math.cos(a)*.5,py=1.65+r()*.5;
  strut(root,bark,new T.Vector3(.08,1,0),new T.Vector3(px,py,pz),.045);sphere(root,i%3?leaf:light,px,py,pz,.51,.38,.46);
  if(vines&&i%2===0){const curve=new T.QuadraticBezierCurve3(new T.Vector3(px,py,pz),new T.Vector3(px+.15,py-.65,pz+.1),new T.Vector3(px-.03,.65,pz+.16));mesh(root,new T.TubeGeometry(curve,9,.014,4,false),leaf);}
 }
 return root;
}

/** Scenery stays behind the walking lane (z=0). The plants are illustrative;
 * species are not presented as national symbols or exhaustive ecology. */
export function routeVegetation(parent:T.Object3D,profile:VisualProfile,x:number,y:number,z:number,size:number,seed:number){
 const traits=profile.features.join(' ').toLowerCase();
 if(cities.has(profile.code)||profile.code==='IND')return;
 if(profile.code==='ANTARCTICA')return;
 if(profile.code==='BRA'||profile.landmarkKind==='rainforest'||/tropical forest|flooded forest/.test(traits)){broadleafTree(parent,x,y,z,size,seed,profile.palette.foliage,true);return;}
 if(profile.code==='AUS'||(profile.landmarkKind==='forest'&&!/pine|cedar|conifer|taiga/.test(traits))){broadleafTree(parent,x,y,z,size,seed,profile.palette.foliage);return;}
 if(profile.code==='ZAF'){nature(parent,'grassland',x,y,z,size,seed);return;}
 const natural=['mountain','forest','glacier','savanna','wetland','desert','island'].includes(profile.landmarkKind);
 if(!natural){
  // Courtyard shrubs leave small architectural routes visually readable.
  sphere(parent,matte(profile.palette.foliage),x,y+.12,z,size*.28,size*.14,size*.23);return;
 }
 nature(parent,profile.biome,x,y,z,size,seed);
}

export function routeArchitecture(root:T.Group,profile:VisualProfile,width:number,index:number){
 const code=profile.code,stone=matte(profile.palette.stone),dark=matte('#39434a'),leaf=matte(profile.palette.foliage),wood=matte('#927448');
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>mesh(root,new T.BoxGeometry(w,h,d),m,x,y,z);
 if(code==='FRA'){
  root.userData.routeStyle='paris-rooftops';
  box(-width*.28,.36,-1.15,.34,.72,.3,matte('#b99e86'));box(-width*.28,.75,-1.15,.46,.08,.4,dark);
  const x=width*.28;strut(root,dark,new T.Vector3(x,0,-1.26),new T.Vector3(x,1.55,-1.26),.025);
  box(x,1.56,-1.26,.2,.29,.2,new T.MeshStandardMaterial({color:'#f3d69b',emissive:'#ffb95c',emissiveIntensity:.45}));box(x,1.75,-1.26,.3,.08,.3,dark);
  box(0,.12,-1.08,.85,.24,.29,stone);for(let i=0;i<5;i++){sphere(root,leaf,(i-2)*.14,.29,-1.08,.13,.11,.12);sphere(root,matte(i%2?'#d66f95':'#eece72'),(i-2)*.14,.38,-1.04,.055);}
 }else if(code==='USA'){
  root.userData.routeStyle='new-york-rooftops';
  if(index%3===0){const x=-width*.2;for(const dx of [-.25,.25])strut(root,dark,new T.Vector3(x+dx,.02,-1.14),new T.Vector3(x+dx,.5,-1.14),.025);mesh(root,new T.CylinderGeometry(.38,.38,.68,14),wood,x,.81,-1.12);mesh(root,new T.ConeGeometry(.43,.25,14),dark,x,1.27,-1.12);}
  else{box(0,.22,-1.14,.68,.44,.38,dark);for(let i=0;i<4;i++)box((i-1.5)*.12,.26,-.94,.045,.26,.012,stone);}
 }else if(code==='IND'){
  root.userData.routeStyle='taj-garden-terraces';
  const marble=matte('#e8dfcb'),rose=matte('#d98d9d');box(0,-.12,1.45,width,.2,.1,marble);
  for(let x=-width/2+.2;x<width/2;x+=.38){box(x,.22,-1.4,.06,.44,.09,marble);sphere(root,marble,x,.47,-1.4,.07,.045,.07);}box(0,.5,-1.4,width,.08,.14,marble);
  for(const side of [-1,1]){const x=side*width*.32;box(x,.1,-1.01,.6,.2,.32,marble);for(let i=0;i<4;i++){sphere(root,leaf,x+(i-1.5)*.12,.25,-1.01,.12,.11,.13);sphere(root,rose,x+(i-1.5)*.12,.33,-1.0,.05);}}
 }else if(code==='CAN'){
  root.userData.routeStyle='rocky-mountain-trail';const snow=matte('#eef5f4'),ice=matte('#9bcbd5');
  for(let i=0;i<5;i++){const x=(i-2)*width*.18;sphere(root,ice,x,-.16,1.44,.25,.16,.15);sphere(root,snow,x,.04,1.4,.29,.07,.19);}
 }else if(code==='ZAF'){
  root.userData.routeStyle='kruger-savanna';const grass=matte('#adad58');
  for(let i=0;i<8;i++){const x=(i-3.5)*width/8;for(let j=0;j<3;j++)strut(root,grass,new T.Vector3(x,0,-1.28),new T.Vector3(x+(j-1)*.06,.22+(i%3)*.03,-1.28),.012);}
  if(index%3===0)sphere(root,stone,width*.32,.17,-1.15,.33,.25,.27);
 }
}

export function groundAppearance(profile:VisualProfile){
 if(profile.code==='IND')return{color:'#6b8443',roughness:1,metalness:0};
 if(profile.code==='ZAF'||profile.landmarkKind==='savanna')return{color:'#ad985d',roughness:1,metalness:0};
 if(profile.biome==='desert'||profile.landmarkKind==='desert')return{color:profile.palette.stone,roughness:1,metalness:0};
 return null;
}
