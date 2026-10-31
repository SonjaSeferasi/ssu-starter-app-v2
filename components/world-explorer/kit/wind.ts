import * as T from 'three';
import {matte} from './common';

/** Cloth banners that flutter harder as a gust approaches and blows. */
export function windBanners(parent:T.Object3D,positions:[number,number,number][],colors:string[]){
 const root=new T.Group();root.name='wind-warning-banners';parent.add(root);const cloths:{mesh:T.Mesh<T.PlaneGeometry>;base:Float32Array;phase:number}[]=[];
 positions.forEach(([x,y,z],i)=>{const pole=new T.Mesh(new T.CylinderGeometry(.04,.05,3,8),matte('#6f5236'));pole.position.set(x,y+1.5,z);root.add(pole);
  const geometry=new T.PlaneGeometry(1.4,.7,10,4);geometry.translate(-.7,0,0);const cloth=new T.Mesh(geometry,new T.MeshStandardMaterial({color:colors[i%colors.length],side:T.DoubleSide,roughness:.8}));cloth.position.set(x,y+2.6,z);cloth.name='wind-banner-cloth';root.add(cloth);cloths.push({mesh:cloth,base:Float32Array.from(geometry.getAttribute('position').array as Float32Array),phase:i*1.7});});
 return{root,update(time:number,strength:number,warning:boolean){
  const amplitude=.05+(warning?.12:0)+strength*.28,speed=4+strength*9;
  for(const c of cloths){const p=c.mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const bx=c.base[i*3],by=c.base[i*3+1],t=-bx/1.4;p.setXYZ(i,bx*(1-strength*.08),by-t*.12*(1-strength),Math.sin(time*speed+t*5+c.phase)*amplitude*t);}p.needsUpdate=true;c.mesh.geometry.computeVertexNormals();}
 }};
}
