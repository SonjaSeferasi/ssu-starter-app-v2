import * as T from 'three';
import {batchStatic,box,ellipsoid,matte,mesh,pixelTexture,standard,tube,v3} from './common';

function rounded(width:number,height:number,radius:number,inset:number){
 const left=-width/2+inset,right=width/2-inset,bottom=inset,top=height-inset,r=radius,shape=new T.Shape();
 shape.moveTo(left+r,bottom);shape.lineTo(right-r,bottom);shape.quadraticCurveTo(right,bottom,right,bottom+r);shape.lineTo(right,top-r);shape.quadraticCurveTo(right,top,right-r,top);shape.lineTo(left+r,top);shape.quadraticCurveTo(left,top,left,top-r);shape.lineTo(left,bottom+r);shape.quadraticCurveTo(left,bottom,left+r,bottom);return shape;
}
const grains:Record<string,(u:number,v:number,x:number,y:number)=>[number,number,number]>={
 wood:(u,v)=>{const g=Math.sin(u*40+Math.sin(v*7)*1.4)*.5+.5,c=170+g*40;return[c,c-16,c-40];},
 stone:(u,v,x,y)=>{const n=((x*73+y*151)%97)/97,c=170+n*35+Math.sin(u*9+v*13)*8;return[c,c-6,c-18];},
 marble:(u,v)=>{const vein=Math.abs(Math.sin(u*9+Math.sin(v*6)*2.4)),c=228-Math.pow(1-vein,12)*80;return[c,c-2,c-8];},
 metal:(u,v,x)=>{const c=150+((x*13)%7)*3+Math.sin(v*80)*4;return[c,c+4,c+10];},
};
export type CrateStyle={body:'wood'|'stone'|'marble'|'metal';color:string;trim:string;glyph:string;glow?:string};

/** Beveled discovery block with a raised question mark. LOCAL ORIGIN is the
 * bottom-centre (y=0), front faces +Z. The engine owns the reward and bounce. */
export function createDiscoveryCrate(parent:T.Object3D,width:number,height:number,style:CrateStyle){
 const w=Math.max(.2,Number.isFinite(width)?width:1),h=Math.max(.2,Number.isFinite(height)?height:1),d=w*.78,bevel=Math.min(w,h)*.035;
 const root=new T.Group();root.name='discovery-block';root.userData={origin:'bottom-centre',width:w,height:h,depth:d,symbol:'?',body:style.body};parent.add(root);
 const map=pixelTexture(64,grains[style.body]),material=new T.MeshStandardMaterial({color:style.color,map,bumpMap:map,bumpScale:.015,roughness:style.body==='metal'?.42:style.body==='marble'?.35:.82,metalness:style.body==='metal'?.55:0,emissive:style.glow||'#000000',emissiveIntensity:style.glow?.12:0});
 const trim=standard(style.trim,.55,{metalness:style.body==='metal'||style.body==='marble'?.3:.1}),symbol=new T.MeshStandardMaterial({color:style.glyph,emissive:style.glyph,emissiveIntensity:.32,roughness:.45});
 mesh(root,new T.ExtrudeGeometry(rounded(w,h,Math.min(w,h)*.07,bevel),{depth:d-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:4,steps:1}),material,0,0,-d/2+bevel);
 for(const side of [-1,1]){box(root,side*w*.42,h/2,d/2+.016,w*.05,h*.88,.025,trim);for(const top of [false,true])box(root,side*w*.36,top?h*.9:h*.1,d/2+.03,w*.22,h*.06,.04,trim);}
 box(root,0,h*.9,d/2+.016,w*.7,h*.04,.02,trim);box(root,0,h*.1,d/2+.016,w*.7,h*.04,.02,trim);
 const glyph=new T.Group();glyph.name='raised-discovery-question-mark';glyph.position.set(0,0,d/2+.052);root.add(glyph);
 tube(glyph,symbol,[v3(-.145*w,.687*h,0),v3(-.128*w,.78*h,0),v3(-.016*w,.816*h,0),v3(.119*w,.772*h,0),v3(.142*w,.67*h,0),v3(.078*w,.59*h,0),v3(.014*w,.527*h,0),v3(.009*w,.437*h,0)],Math.min(w,h)*.04,24,7);
 ellipsoid(glyph,symbol,.009*w,.308*h,0,.045*w,.045*h,.035*Math.min(w,h),14);
 batchStatic(root);return root;
}

/** Swallow-tailed banner on a post; the emblem disc carries a country accent. */
export function createBannerPost(parent:T.Object3D,options:{pole:string;cloth:string;accent:string;height?:number;cap?:string}){
 const root=new T.Group();root.name='checkpoint-banner';parent.add(root);const h=options.height??2.3,pole=matte(options.pole,.6);
 mesh(root,new T.CylinderGeometry(.045,.06,h,10),pole,0,h/2,0);ellipsoid(root,standard(options.cap||options.accent,.4,{metalness:.4}),0,h+.05,0,.09,.09,.09,10);
 const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(.9,0);shape.lineTo(.72,-.32);shape.lineTo(.9,-.64);shape.lineTo(0,-.64);shape.closePath();
 const cloth=mesh(root,new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:options.cloth,side:T.DoubleSide,roughness:.8}),.05,h-.12,0);cloth.name='checkpoint-cloth';
 mesh(root,new T.CircleGeometry(.15,20),new T.MeshStandardMaterial({color:options.accent,side:T.DoubleSide,roughness:.5,emissive:options.accent,emissiveIntensity:.15}),.38,h-.44,.01);
 return root;
}

export type ArchStyle='roman'|'egyptian'|'mughal'|'timber'|'iron'|'stone'|'jungle'|'harbor';
/** Finish archway: two piers and a lintel or arch, with style-specific profile.
 * Purely visual; the finish trigger belongs to the level configuration. */
export function createArchway(parent:T.Object3D,options:{style:ArchStyle;width:number;height:number;stone:string;trim:string;accent?:string}){
 const root=new T.Group();root.name='finish-archway';root.userData.style=options.style;parent.add(root);
 const {width:w,height:h}=options,stone=matte(options.stone,.9),trim=matte(options.trim,.7),pier=options.style==='egyptian'?.7:.5,d=options.style==='timber'||options.style==='iron'?.35:.9;
 for(const side of [-1,1]){
  if(options.style==='egyptian'){const g=new T.CylinderGeometry(.28,.42,h,4);g.rotateY(Math.PI/4);mesh(root,g,stone,side*(w/2+.1),h/2,0).scale.set(1,1,.8);}
  else box(root,side*(w/2+pier/2-.1),h/2,0,pier,h,d,stone);
  box(root,side*(w/2+pier/2-.1),.12,0,pier+.18,.24,d+.18,trim);box(root,side*(w/2+pier/2-.1),h-.08,0,pier+.14,.16,d+.14,trim);
 }
 if(options.style==='roman'||options.style==='stone'||options.style==='mughal'){
  const outer=new T.Shape(),r=w/2+pier-.1,rise=options.style==='mughal'?w*.75:w/2;outer.moveTo(-r,0);outer.lineTo(-r,rise+.6);outer.lineTo(r,rise+.6);outer.lineTo(r,0);outer.lineTo(w/2-.1,0);
  if(options.style==='mughal'){outer.quadraticCurveTo(w/2-.1,rise*.75,0,rise);outer.quadraticCurveTo(-w/2+.1,rise*.75,-w/2+.1,0);}else outer.absarc(0,0,w/2-.1,0,Math.PI,false);
  outer.lineTo(-r,0);const arch=mesh(root,new T.ExtrudeGeometry(outer,{depth:d,bevelEnabled:false,curveSegments:16}),stone,0,h,-d/2);arch.name='finish-arch-crown';
  box(root,0,h+rise+.68,0,2*r+.3,.18,d+.2,trim);if(options.style==='roman')box(root,0,h+rise+1.1,0,2*r*.7,.7,d*.8,stone);
 }else if(options.style==='egyptian'){box(root,0,h+.25,0,w+1.4,.5,.8,stone);box(root,0,h+.6,0,w+1.7,.2,.9,trim);mesh(root,new T.CircleGeometry(.35,24),standard(options.accent||'#d9b24c',.35,{metalness:.6}),0,h+.26,.42);}
 else if(options.style==='timber'||options.style==='jungle'){box(root,0,h+.15,0,w+1.2,.3,.4,stone);box(root,0,h+.55,0,w+.6,.22,.32,trim);}
 else{const beam=standard(options.stone,.45,{metalness:.6});box(root,0,h+.1,0,w+1,.22,.3,beam);for(let i=0;i<6;i++){const x=-w/2+i*w/5;mesh(root,new T.CylinderGeometry(.03,.03,.8,6),beam,x,h+.5,0).rotation.z=i%2?.6:-.6;}box(root,0,h+.9,0,w+1,.16,.25,beam);}
 batchStatic(root);return root;
}
