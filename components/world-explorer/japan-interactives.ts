import * as T from 'three';
import {batchStatic,matte,mesh,random} from './scenic-kit';

export type JapanEnemyVisualState='IDLE'|'PATROL_LEFT'|'PATROL_RIGHT'|'TURN'|'ALERT'|'STUNNED'|'DISABLED';

function ellipsoid(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,segments=14){
 const object=mesh(parent,new T.SphereGeometry(1,segments,Math.max(6,Math.floor(segments*.67))),material,x,y,z);object.scale.set(sx,sy,sz);return object;
}

function line(parent:T.Object3D,material:T.Material,points:T.Vector3[],radius:number){
 return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(6,points.length*3),radius,6,false),material);
}

const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

/** Merge an opaque colored prop part without flattening its animation pivot. */
function paletteBatch(root:T.Object3D){
 const retired=new Set<T.Material>(),material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.88});
 root.traverse(object=>{
  if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshStandardMaterial)||object.material.transparent)return;
  const previous=object.material,count=object.geometry.getAttribute('position').count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){colors[i*3]=previous.color.r;colors[i*3+1]=previous.color.g;colors[i*3+2]=previous.color.b;}
  object.geometry.setAttribute('color',new T.BufferAttribute(colors,3));object.material=material;retired.add(previous);
 });
 batchStatic(root);retired.forEach(previous=>previous.dispose());
}

/** Original leaf-clasped mountain warden, inspired by a common hooded-cloak
 * silhouette rather than an existing game character. Ground origin is y=0;
 * height is approximately 1.06, or two thirds of the student explorer. The
 * gameplay simulation, not this object, owns patrol positions and collisions. */
export function createJapanEnemy(parent:T.Object3D){
 const root=new T.Group(),figure=new T.Group(),robe=new T.Group(),head=new T.Group(),scarf=new T.Group();
 root.name='japan-original-leaf-warden';root.userData.originalCharacter=true;root.userData.height=1.06;root.userData.collisionOwner='level-simulation';
 parent.add(root);root.add(figure);figure.add(robe,head,scarf);
 const red=matte('#b8323d'),hoodRed=matte('#cb4248'),edge=matte('#dd655f'),darkCloth=matte('#542133'),lining=matte('#342832');
 const pale=matte('#eee3c8'),eye=matte('#25242d'),boot=matte('#252630'),sole=matte('#151922'),clasp=matte('#b7b16a'),stitch=matte('#d28a75');
 const cloakPoints=[new T.Vector2(0,.155),new T.Vector2(.19,.155),new T.Vector2(.2,.235),new T.Vector2(.181,.36),new T.Vector2(.148,.515),new T.Vector2(.113,.61),new T.Vector2(0,.64)];
 const cloak=mesh(robe,new T.LatheGeometry(cloakPoints,22),red);cloak.scale.z=.77;
 const hem=mesh(robe,new T.TorusGeometry(.19,.012,5,24),darkCloth,0,.174,0);hem.rotation.x=Math.PI/2;hem.scale.y=.77;
 // Separate angular overlap and diagonal scarf make the silhouette asymmetric.
 const flapShape=new T.Shape();flapShape.moveTo(-.065,.579);flapShape.bezierCurveTo(.075,.5,.145,.39,.118,.175);flapShape.lineTo(.012,.198);flapShape.bezierCurveTo(.037,.36,-.055,.455,-.104,.51);flapShape.closePath();
 mesh(scarf,new T.ExtrudeGeometry(flapShape,{depth:.014,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1}),edge,0,0,.142);
 line(robe,stitch,[point(-.08,.507,.144),point(-.037,.36,.16),point(-.05,.207,.15)],.0035);
 for(const side of [-1,1]){
  const sleeve=ellipsoid(robe,red,side*.184,.421,.004,.049,.11,.061,12);sleeve.rotation.z=side*-.28;
  ellipsoid(robe,darkCloth,side*.201,.329,.017,.04,.038,.045,10);
 }
 // A drooping, tapered hood with a side peak and a deep face aperture.
 const hoodGeometry=new T.SphereGeometry(1,24,16),hoodPosition=hoodGeometry.getAttribute('position');
 for(let i=0;i<hoodPosition.count;i++){
  const x=hoodPosition.getX(i),y=hoodPosition.getY(i),z=hoodPosition.getZ(i),tip=Math.max(0,y);
  hoodPosition.setXYZ(i,x*.229+tip*tip*.049,y*.249,z*.168-.012-tip*tip*.031);
 }
 hoodGeometry.computeVertexNormals();mesh(head,hoodGeometry,hoodRed,0,.789,0);
 ellipsoid(head,lining,0,.771,.147,.174,.21,.049,22);
 ellipsoid(head,pale,.004,.772,.186,.132,.174,.024,22);
 // The face covering is longer and narrower than the hood, with two quiet
 // eye slots, no mouth and no official game-character insignia.
 for(const side of [-1,1])ellipsoid(head,eye,side*.047+.004,.799,.21,.014,.033,.007,12);
 line(head,edge,[point(-.172,.746,.163),point(-.153,.916,.121),point(.036,1.024,.017),point(.202,.907,.108),point(.174,.733,.155)],.011);
 const leafShape=new T.Shape();leafShape.moveTo(0,-.047);leafShape.bezierCurveTo(-.054,-.012,-.035,.046,.016,.06);leafShape.bezierCurveTo(.055,.022,.055,-.017,0,-.047);
 const leaf=mesh(scarf,new T.ExtrudeGeometry(leafShape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1}),clasp,-.115,.548,.183);leaf.rotation.z=-.42;
 line(scarf,darkCloth,[point(-.134,.518,.203),point(-.11,.562,.203),point(-.09,.588,.202)],.0025);
 const feet:T.Group[]=[];
 for(const side of [-1,1]){
  const foot=new T.Group();foot.position.set(side*.083,.149,0);foot.name=side<0?'warden-left-foot':'warden-right-foot';figure.add(foot);feet.push(foot);
  ellipsoid(foot,boot,0,-.075,.025,.068,.07,.101,14);
  ellipsoid(foot,sole,0,-.127,.04,.071,.021,.109,14);paletteBatch(foot);
 }
 paletteBatch(robe);paletteBatch(head);paletteBatch(scarf);
 let lastFacing:1|-1=1;
 const update=(time:number,facing:1|-1,state:JapanEnemyVisualState)=>{
  const clock=Number.isFinite(time)?Math.max(0,time):0,moving=state==='PATROL_LEFT'||state==='PATROL_RIGHT';
  lastFacing=facing===-1?-1:1;root.visible=state!=='DISABLED';root.userData.state=state;
  // The simulation supplies a stationary TURN interval before patrol resumes.
  // Approach the new facing angle during that interval rather than snapping.
  figure.rotation.y=T.MathUtils.lerp(figure.rotation.y,lastFacing*1.08,state==='TURN'?.12:.22);figure.position.y=moving?Math.abs(Math.sin(clock*7))*.013:Math.sin(clock*2)*.003;
  for(let i=0;i<feet.length;i++)feet[i].rotation.x=moving?Math.sin(clock*7+i*Math.PI)*.24:0;
  head.rotation.z=state==='ALERT'?-lastFacing*.09:Math.sin(clock*1.8)*.012;
  scarf.rotation.z=moving?Math.sin(clock*7+.9)*.018:0;
 };
 update(0,1,'IDLE');return{root,update};
}

function grainTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const knot=Math.sin(Math.sqrt((x-17)**2*.17+(y-39)**2*.025)*3),grain=Math.sin(x*.65+Math.sin(y*.12)*1.4+knot*.35),fine=Math.sin(x*2.8+y*.05);
  const value=Math.round(185+grain*24+fine*7),i=(y*size+x)*4;data[i]=value;data[i+1]=Math.max(0,value-13);data[i+2]=Math.max(0,value-32);data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

function roundedRectangle(width:number,height:number,radius:number,inset:number){
 const left=-width/2+inset,right=width/2-inset,bottom=inset,top=height-inset,r=radius;
 const shape=new T.Shape();shape.moveTo(left+r,bottom);shape.lineTo(right-r,bottom);shape.quadraticCurveTo(right,bottom,right,bottom+r);shape.lineTo(right,top-r);shape.quadraticCurveTo(right,top,right-r,top);shape.lineTo(left+r,top);shape.quadraticCurveTo(left,top,left,top-r);shape.lineTo(left,bottom+r);shape.quadraticCurveTo(left,bottom,left+r,bottom);return shape;
}

/** Real beveled wooden discovery cube. LOCAL ORIGIN: bottom-centre (y=0),
 * front faces +Z, depth=.78*width. Place the group at the collider's bottom;
 * the engine owns the one-time reward and the bounce of the entire group. */
export function createJapanDiscoveryBlock(parent:T.Object3D,width=1,height=1){
 const w=Math.max(.2,Number.isFinite(width)?width:1),h=Math.max(.2,Number.isFinite(height)?height:1),d=w*.78,bevel=Math.min(w,h)*.033;
 const root=new T.Group();root.name='japan-wooden-discovery-block';root.userData.origin='bottom-centre';root.userData.width=w;root.userData.height=h;root.userData.depth=d;root.userData.symbol='?';parent.add(root);
 const grain=grainTexture(),wood=new T.MeshStandardMaterial({color:'#b67d44',map:grain,bumpMap:grain,bumpScale:.018,roughness:.83,emissive:'#57300c',emissiveIntensity:.13});
 const trim=matte('#704323'),brass=new T.MeshStandardMaterial({color:'#d8b66a',roughness:.55,metalness:.22}),symbol=new T.MeshStandardMaterial({color:'#ffe3a1',emissive:'#d4a541',emissiveIntensity:.28,roughness:.48});
 const shape=roundedRectangle(w,h,Math.min(w,h)*.065,bevel),geometry=new T.ExtrudeGeometry(shape,{depth:d-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:4,steps:1});
 mesh(root,geometry,wood,0,0,-d/2+bevel);
 // Board seams and inset frame preserve the wood grain instead of hiding the
 // front face behind a flat UI decal. Corner collars sit on all four corners.
 for(const fraction of [.31,.67])mesh(root,new T.BoxGeometry(w*.87,.009*h,.009),trim,0,h*fraction,d/2+.005);
 for(const side of [-1,1]){
  mesh(root,new T.BoxGeometry(w*.045,h*.89,.025),trim,side*w*.423,h/2,d/2+.016);
  for(const top of [false,true]){
   const x=side*w*.41,y=top?h*.9:h*.1;
   mesh(root,new T.BoxGeometry(w*.19,h*.056,.045),brass,x-side*w*.04,y,d/2+.031);
   mesh(root,new T.BoxGeometry(w*.056,h*.17,.047),brass,x,y+(top?-1:1)*h*.055,d/2+.032);
   ellipsoid(root,trim,x,y,d/2+.061,.018*w,.018*h,.012,8);
  }
 }
 const glyph=new T.Group();glyph.name='raised-discovery-question-mark';glyph.position.set(0,0,d/2+.052);root.add(glyph);
 line(glyph,symbol,[point(-.145*w,.687*h,0),point(-.128*w,.78*h,0),point(-.016*w,.816*h,0),point(.119*w,.772*h,0),point(.142*w,.67*h,0),point(.078*w,.59*h,0),point(.014*w,.527*h,0),point(.009*w,.437*h,0)],Math.min(w,h)*.039);
 ellipsoid(glyph,symbol,.009*w,.308*h,0,.044*w,.044*h,.035*Math.min(w,h),14);
 batchStatic(root);return root;
}

/** Lightweight original gold sparkle burst, aged by the engine. update(age)
 * returns false after .7 seconds; the owner then calls dispose exactly once. */
export function createCollectibleBurst(parent:T.Object3D,x:number,y:number,z:number){
 const root=new T.Group();root.name='japan-collectible-sparkle-burst';root.position.set(x,y,z);parent.add(root);
 const material=new T.MeshBasicMaterial({color:'#ffe8a5',transparent:true,opacity:1,depthWrite:false,toneMapped:false});
 const geometry=new T.OctahedronGeometry(1,0),particles=new T.InstancedMesh(geometry,material,18),dummy=new T.Object3D(),r=random(902);
 particles.frustumCulled=false;particles.castShadow=false;root.add(particles);
 const seeds=Array.from({length:particles.count},(_,i)=>{const a=i/particles.count*Math.PI*2;return{x:Math.cos(a)*(.45+r()*.55),y:.3+r()*.85,z:(r()-.5)*.5,size:.018+r()*.023,phase:r()*6};});
 let disposed=false;
 const update=(age:number)=>{
  if(disposed)return false;const t=Math.max(0,Number.isFinite(age)?age:0),life=Math.max(0,1-t/.7);root.visible=life>0;material.opacity=life;
  for(let i=0;i<seeds.length;i++){const seed=seeds[i];dummy.position.set(seed.x*t,seed.y*t-.9*t*t,seed.z*t);dummy.rotation.set(t*3+seed.phase,t*2,seed.phase);dummy.scale.setScalar(seed.size*life);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);}particles.instanceMatrix.needsUpdate=true;
  return life>0;
 };
 update(0);return{root,update,dispose(){if(disposed)return;disposed=true;particles.dispose();geometry.dispose();material.dispose();root.removeFromParent();}};
}
