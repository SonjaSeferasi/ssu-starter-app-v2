import * as T from 'three';
import type {Builder} from '../../kit/common';
import {v3} from '../../kit/common';

/** Small props shared by several African environments. */
type V=[number,number,number];
/** A simple timber or block hut with a pitched tin or thatch roof. */
export function cabinLike(b:Builder,at:V,size:[number,number,number],wall:string,roof:string){
 const [x,y,z]=at,[w,h,d]=size;b.add(new T.BoxGeometry(w,h,d),wall,[x,y+h/2,z],[0,0,0],[1,1,1],.05);
 const r=new T.CylinderGeometry(.01,1,1,4,1);r.rotateY(Math.PI/4);b.add(r,roof,[x,y+h+.5,z],[0,0,0],[w*.8,1,d*.8]);b.add(new T.BoxGeometry(.6,1.1,.06),'#2a1e14',[x,y+.55,z+d/2+.03]);
}
/** A dromedary: humped body, long neck, knobbly legs; faces +x. */
export function dromedary(b:Builder,x:number,y:number,z:number,colour:string,scale=1){
 const s=scale;b.add(new T.SphereGeometry(.7*s,12,8),colour,[x,y+1.75*s,z],[0,0,0],[1.5,.75,.7]);b.add(new T.SphereGeometry(.45*s,10,8),colour,[x-.1*s,y+2.3*s,z],[0,0,0],[1,.9,.9]);
 b.strut(v3(x+.85*s,y+1.9*s,z),v3(x+1.35*s,y+2.5*s,z),.16*s,colour,7);b.add(new T.SphereGeometry(.2*s,8,6),colour,[x+1.5*s,y+2.55*s,z],[0,0,0],[1.6,.8,.8]);
 for(const [lx,lz] of [[-.65,-.25],[-.65,.25],[.6,-.25],[.6,.25]])b.strut(v3(x+lx*s,y+1.4*s,z+lz*s),v3(x+lx*s,y,z+lz*s),.08*s,colour,5);
}
/** An elephant body for static scenery: barrel, head, ears, trunk, legs. */
export function elephantFigure(b:Builder,x:number,y:number,z:number,s=1,colour='#7a7470'){
 b.add(new T.SphereGeometry(1,14,10),colour,[x,y+2*s,z],[0,0,0],[1.6*s,1.1*s,1*s]);b.add(new T.SphereGeometry(.7,12,8),colour,[x+1.6*s,y+2.4*s,z],[0,0,0],[s,s,s]);
 for(const sz of [-1,1])b.add(new T.CylinderGeometry(.75*s,.75*s,.08,14).rotateX(Math.PI/2),new T.Color(colour).multiplyScalar(.9),[x+1.3*s,y+2.4*s,z+sz*.65*s],[0,sz*.4,0]);
 b.strut(v3(x+2.2*s,y+2.2*s,z),v3(x+2.5*s,y+.6*s,z),.18*s,colour,7);for(const [lx,lz] of [[-.9,-.5],[-.9,.5],[.8,-.5],[.8,.5]])b.add(new T.CylinderGeometry(.3*s,.32*s,1.4*s,8),colour,[x+lx*s,y+.7*s,z+lz*s]);
 for(const sz of [-1,1])b.add(new T.ConeGeometry(.06*s,.5*s,6),'#f2ece0',[x+2.1*s,y+1.8*s,z+sz*.25*s],[0,0,Math.PI*.7]);
}
