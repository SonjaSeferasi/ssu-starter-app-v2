import * as T from 'three';
import {Builder,vertexMaterial} from './common';
import {markSurface,type SurfaceSet} from './surface-maps';

/** Visible parts of the shared mechanisms. Collision always comes from the
 * level data (a gate slab, a plate position); these only draw them. */
export type MechanismPalette={stone:string;stoneDark:string;trim:string;glow:string;metal:string;maps?:{set:SurfaceSet;tint?:string;repeat?:number}};
export const defaultMechanismPalette:MechanismPalette={stone:'#bdb4a2',stoneDark:'#8f8676',trim:'#6d6355',glow:'#5fd0c4',metal:'#5b5f66'};

/** A stone slab gate that sinks into a floor slot. `slab` is moved by the
 * engine; its origin is the slab bottom. The flanking posts stand outside the
 * lane (|z| > 1.2) and nothing is built above the gate, so a high route can
 * pass over it. */
export function createGate(parent:T.Object3D,width:number,height:number,palette:MechanismPalette=defaultMechanismPalette){
 const root=new T.Group();root.name='stone-gate';parent.add(root);
 const frame=new Builder(.5);
 for(const z of [-1.5,1.5])for(const x of [-1,1]){frame.add(new T.BoxGeometry(.5,height+.5,.5),palette.stoneDark,[x*(width/2+.4),(height+.5)/2,z],[0,0,0],[1,1,1],.05);frame.add(new T.BoxGeometry(.66,.2,.66),palette.trim,[x*(width/2+.4),height+.6,z]);}
 frame.add(new T.BoxGeometry(width+.4,.06,2.7),palette.trim,[0,.01,0]);
 const frameMaterial=vertexMaterial(.9);if(palette.maps)markSurface(frameMaterial,palette.maps.set,palette.maps.tint,palette.maps.repeat);frame.mesh(root,frameMaterial,'gate-frame');
 const slab=new T.Group();slab.name='gate-slab';root.add(slab);
 const b=new Builder(.5);b.add(new T.BoxGeometry(width,height,2.5),palette.stone,[0,height/2,0],[0,0,0],[1,1,1],.04);
 // Carved bands and a glyph panel on the face toward the camera.
 for(const y of [.25,height-.25])b.add(new T.BoxGeometry(width+.02,.12,2.52),palette.trim,[0,y,0]);
 b.add(new T.BoxGeometry(width*.6,height*.42,.05),palette.stoneDark,[0,height*.55,1.27]);
 for(let i=0;i<3;i++)b.add(new T.BoxGeometry(width*.36,.07,.06),palette.trim,[0,height*(.42+i*.12),1.3]);
 const slabMaterial=vertexMaterial(.88);if(palette.maps)markSurface(slabMaterial,palette.maps.set,palette.maps.tint,palette.maps.repeat);b.mesh(slab,slabMaterial,'gate-stone');
 // A light that glows while the gate is open, dims as it closes.
 const lamp=new T.Mesh(new T.SphereGeometry(.16,12,8),new T.MeshStandardMaterial({color:palette.glow,emissive:palette.glow,emissiveIntensity:.1}));lamp.position.set(-(width/2+.4),height+.85,1.5);lamp.name='gate-lamp';root.add(lamp);
 return{root,slab,update(open:number,closing:boolean,time:number){slab.position.y=-open*height;slab.visible=open<.995;const material=lamp.material as T.MeshStandardMaterial;material.emissiveIntensity=open>0?(closing?.4+.6*Math.abs(Math.sin(time*9)):1):.1;}};
}

/** A floor plate set flush in the cap, with a ring that lights when pressed. */
export function createPressurePlate(parent:T.Object3D,palette:MechanismPalette=defaultMechanismPalette){
 const root=new T.Group();root.name='pressure-plate';parent.add(root);
 const b=new Builder();b.add(new T.CylinderGeometry(.72,.78,.1,24),palette.stoneDark,[0,.02,0]);
 const plate=new T.Group();plate.name='plate-top';root.add(plate);
 const top=new Builder();top.add(new T.CylinderGeometry(.58,.6,.08,24),palette.stone,[0,.06,0]);top.add(new T.BoxGeometry(.5,.012,.08),palette.trim,[0,.105,0]);top.add(new T.BoxGeometry(.08,.012,.5),palette.trim,[0,.105,0]);
 b.mesh(root,vertexMaterial(.9),'plate-base');top.mesh(plate,vertexMaterial(.85),'plate-stone');
 const ring=new T.Mesh(new T.TorusGeometry(.66,.03,6,32),new T.MeshStandardMaterial({color:palette.glow,emissive:palette.glow,emissiveIntensity:.15}));ring.rotation.x=Math.PI/2;ring.position.y=.07;root.add(ring);
 // A signpost behind the lane makes the plate's purpose readable.
 const post=new Builder();post.add(new T.CylinderGeometry(.05,.06,1.3,8),palette.metal,[0,.65,-1.1]);post.add(new T.BoxGeometry(.5,.36,.06),palette.stone,[0,1.35,-1.1]);post.add(new T.ConeGeometry(.1,.16,3),palette.glow,[0,1.35,-1.06],[Math.PI/2,0,-Math.PI/2]);post.mesh(root,vertexMaterial(.8),'plate-sign');
 return{root,update(pressed:boolean,active:boolean){plate.position.y=pressed?-.05:0;(ring.material as T.MeshStandardMaterial).emissiveIntensity=active?1.1:.15;}};
}

/** Two ropes (or vines) from a pendulum's pivot to its seat. */
export function createSwingRopes(parent:T.Object3D,color:string,spread=.7){
 const material=new T.MeshStandardMaterial({color,roughness:.9}),ropes=[-spread,spread].map(z=>{const rope=new T.Mesh(new T.CylinderGeometry(.04,.04,1,6),material);rope.position.z=z;rope.castShadow=true;parent.add(rope);return rope;});
 const pivot=new T.Mesh(new T.CylinderGeometry(.12,.12,spread*2+.6,10),new T.MeshStandardMaterial({color:'#4b3a2a',roughness:.8}));pivot.rotation.x=Math.PI/2;parent.add(pivot);
 const up=new T.Vector3(0,1,0),direction=new T.Vector3();
 return{update(px:number,py:number,sx:number,sy:number){
  pivot.position.set(px,py,0);direction.set(px-sx,py-sy,0);const length=direction.length();direction.normalize();
  for(const rope of ropes){rope.position.set((px+sx)/2,(py+sy)/2,rope.position.z);rope.scale.set(1,length,1);rope.quaternion.setFromUnitVectors(up,direction);}
 }};
}
