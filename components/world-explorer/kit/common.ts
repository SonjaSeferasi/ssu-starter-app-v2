import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {batchStatic,hash,matte,mesh,random,sphere,strut} from '../scenic-kit';
export {batchStatic,hash,matte,mesh,random,sphere,strut};

/** Small shared modelling vocabulary for the country environments. Every helper
 * builds real geometry; nothing here creates a collider. */
export type Quality={low:boolean};
export const v3=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
export const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function noise2(x:number,y:number,seed:number){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
/** Smooth value noise and a fractal sum, used by heightfields and textures. */
export function valueNoise(x:number,y:number,seed:number){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
 const a=noise2(ix,iy,seed),b=noise2(ix+1,iy,seed),c=noise2(ix,iy+1,seed),d=noise2(ix+1,iy+1,seed);
 return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;
}
export function fbm(x:number,y:number,seed:number,octaves=4){let total=0,amplitude=.5,frequency=1;for(let i=0;i<octaves;i++){total+=valueNoise(x*frequency,y*frequency,seed+i*131)*amplitude;amplitude*=.5;frequency*=2.03;}return total;}

export function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){return mesh(parent,new T.BoxGeometry(w,h,d),m,x,y,z);}
export function cylinder(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,top:number,bottom:number,height:number,segments=12){return mesh(parent,new T.CylinderGeometry(top,bottom,height,segments),m,x,y,z);}
export function tube(parent:T.Object3D,m:T.Material,points:T.Vector3[],radius:number,segments=12,radial=6){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,radius,radial,false),m);}
export function beam(parent:T.Object3D,m:T.Material,a:[number,number,number],b:[number,number,number],radius=.05){return strut(parent,m,v3(...a),v3(...b),radius);}
export function ellipsoid(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,segments=14){const o=mesh(parent,new T.SphereGeometry(1,segments,Math.max(6,Math.floor(segments*.67))),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
export function standard(color:string,roughness=.86,extra:T.MeshStandardMaterialParameters={}){return new T.MeshStandardMaterial({color,roughness,...extra});}

/** Bake a colour into a geometry so many differently coloured parts can share
 * one vertex-coloured material and merge into very few draw calls. */
export function tint(geometry:T.BufferGeometry,color:string|T.Color,jitter=0,seed=1){
 const g=geometry.index?geometry.toNonIndexed():geometry,count=g.getAttribute('position').count,base=new T.Color(color),colors=new Float32Array(count*3),r=random(seed);
 for(let i=0;i<count;i+=3){const shade=1+(r()-.5)*jitter;for(let j=0;j<3&&i+j<count;j++){colors[(i+j)*3]=base.r*shade;colors[(i+j)*3+1]=base.g*shade;colors[(i+j)*3+2]=base.b*shade;}}
 g.setAttribute('color',new T.BufferAttribute(colors,3));if(g.getAttribute('uv'))g.deleteAttribute('uv');return g;
}
/** A geometry assembler: add tinted parts with transforms, then build one mesh. */
export class Builder{
 parts:T.BufferGeometry[]=[];
 /** With `worldUV` set, built geometry gets box-mapped texture coordinates at
  * that many tiles per world unit, so a stone or brick map runs across parts. */
 constructor(readonly worldUV=0){}
 add(geometry:T.BufferGeometry,color:string|T.Color,position:[number,number,number]=[0,0,0],rotation:[number,number,number]=[0,0,0],scale:[number,number,number]=[1,1,1],jitter=0){
  const matrix=new T.Matrix4().compose(v3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),v3(...scale));
  const g=tint(geometry,color,jitter,this.parts.length*17+3).applyMatrix4(matrix);if(g!==geometry)geometry.dispose();this.parts.push(g);return this;
 }
 /** A cylinder between two points, like scenic-kit strut. */
 strut(a:T.Vector3,b:T.Vector3,radius:number,color:string,segments=7,taper=.84){
  const length=a.distanceTo(b),g=new T.CylinderGeometry(radius*taper,radius,length,segments);
  const q=new T.Quaternion().setFromUnitVectors(v3(0,1,0),b.clone().sub(a).normalize()),m=new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,v3(1,1,1));
  const t=tint(g,color).applyMatrix4(m);g.dispose();this.parts.push(t);return this;
 }
 geometry(){const merged=this.parts.length?mergeGeometries(this.parts,false):new T.BufferGeometry();this.parts.forEach(part=>part.dispose());this.parts=[];if(!merged.getAttribute('normal'))merged.computeVertexNormals();if(this.worldUV&&merged.getAttribute('position'))boxUV(merged,this.worldUV);return merged;}
 mesh(parent:T.Object3D,material?:T.Material,name?:string){const m=new T.Mesh(this.geometry(),material||vertexMaterial());m.castShadow=m.receiveShadow=true;if(name)m.name=name;parent.add(m);return m;}
}
/** Box mapping from world position and normal (triplanar-style, per vertex). */
export function boxUV(geometry:T.BufferGeometry,scale:number){
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));if(ay>=ax&&ay>=az){uv[i*2]=p.getX(i)*scale;uv[i*2+1]=p.getZ(i)*scale;}else if(ax>=az){uv[i*2]=p.getZ(i)*scale;uv[i*2+1]=p.getY(i)*scale;}else{uv[i*2]=p.getX(i)*scale;uv[i*2+1]=p.getY(i)*scale;}}
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));return geometry;
}
export function vertexMaterial(roughness=.88,extra:T.MeshStandardMaterialParameters={}){return new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness,...extra});}

/** Place many copies of one template; each copy keeps its own transform and an
 * optional colour multiplier, all in one instanced draw call. */
export type Placement={x:number;y:number;z:number;scale?:number|[number,number,number];rotation?:number|[number,number,number];color?:string|T.Color};
export function scatter(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,placements:Placement[],name:string,shadows=false){
 const instances=new T.InstancedMesh(geometry,material,Math.max(1,placements.length)),dummy=new T.Object3D();instances.name=name;instances.castShadow=shadows;instances.receiveShadow=true;
 placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);const s=p.scale??1;if(typeof s==='number')dummy.scale.setScalar(s);else dummy.scale.set(...s);const r=p.rotation??0;if(typeof r==='number')dummy.rotation.set(0,r,0);else dummy.rotation.set(...r);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);instances.setColorAt(i,new T.Color(p.color??'#ffffff'));});
 if(!placements.length)instances.count=0;instances.computeBoundingSphere();parent.add(instances);return instances;
}

/** Make a repeatable DataTexture from a per-pixel colour function. */
export function pixelTexture(size:number,pixel:(u:number,v:number,x:number,y:number)=>[number,number,number,number?],color=true,repeat=true){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const [r,g,b,a=255]=pixel(x/size,y/size,x,y),i=(y*size+x)*4;data[i]=clamp(Math.round(r),0,255);data[i+1]=clamp(Math.round(g),0,255);data[i+2]=clamp(Math.round(b),0,255);data[i+3]=clamp(Math.round(a),0,255);}
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=repeat?T.RepeatWrapping:T.ClampToEdgeWrapping;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}
/** sRGB byte channels of a CSS colour, for writing texture pixels. */
export const hexRgb=(hex:string)=>{const c={r:0,g:0,b:0};new T.Color(hex).getRGB(c,T.SRGBColorSpace);return[c.r*255,c.g*255,c.b*255] as [number,number,number];};
export const mix=(a:readonly number[],b:readonly number[],t:number)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t] as [number,number,number];

/** Release everything a decorative root owns, once. */
export function disposeTree(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line||object instanceof T.Points){if(object instanceof T.InstancedMesh)object.dispose();geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);if(material instanceof T.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof T.Texture)textures.add(uniform.value);}}});
 textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();
}
export {hash as seedOf};
