import * as T from 'three';
import {matte,mesh,sphere} from '../scenic-kit';
import {platformSurfaceY} from '../../../lib/world-explorer/platform-surface';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';

/** The wooden deck is a playable solid surface; its rails stay outside z=0. */
export function woodenDeck(root:T.Group,definition:Pick<PlatformDefinition,'width'|'type'> & Partial<Pick<PlatformDefinition,'sagDepth'>>){
 for(const name of ['country-platform-cap','country-platform-cliff']){const old=root.getObjectByName(name) as T.Mesh|undefined;if(old){old.removeFromParent();old.geometry.dispose();for(const material of Array.isArray(old.material)?old.material:[old.material])material.dispose();}}
 const width=definition.width,wood=matte('#936a45'),edge=matte('#a47a50'),rope=matte('#bfb08b'),n=Math.ceil(width/.27);
 const surface=(x:number)=>platformSurfaceY({x:0,y:0,width,type:definition.type,sagDepth:definition.sagDepth},x+width/2);
 root.userData.surface=definition.type;
 for(let i=0;i<n;i++){
  const a=-width/2+i*width/n,b=a+width/n,x=(a+b)/2;
  const plank=mesh(root,new T.BoxGeometry(width/n-.009,.18,3.1),i%3?wood:edge,x,surface(x)-.075,0);
  plank.rotation.z=Math.atan2(surface(b)-surface(a),b-a);
 }
 for(const z of [-1.42,1.42]){
  const beamPoints=Array.from({length:17},(_,i)=>{const x=-width/2+width*i/16;return new T.Vector3(x,surface(x)-.21,z);});
  mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(beamPoints),32,.075,5,false),wood);
  const posts=Math.max(2,Math.ceil(width/2.8)+1);for(let i=0;i<posts;i++){const x=-width/2+.2+(width-.4)*i/(posts-1),y=surface(x);mesh(root,new T.CylinderGeometry(.045,.06,.76,8),wood,x,y+.38,z);sphere(root,edge,x,y+.79,z,.07);}
  for(let i=0;i<posts-1;i++){const a=-width/2+.2+(width-.4)*i/(posts-1),b=-width/2+.2+(width-.4)*(i+1)/(posts-1),curve=new T.QuadraticBezierCurve3(new T.Vector3(a,surface(a)+.72,z),new T.Vector3((a+b)/2,surface((a+b)/2)+.38,z),new T.Vector3(b,surface(b)+.72,z));mesh(root,new T.TubeGeometry(curve,12,.032,5,false),rope);}
  const lower=new T.QuadraticBezierCurve3(new T.Vector3(-width/2,-.1,z),new T.Vector3(0,surface(0)-.65,z),new T.Vector3(width/2,-.1,z));mesh(root,new T.TubeGeometry(lower,32,.055,6,false),wood);
 }
}
