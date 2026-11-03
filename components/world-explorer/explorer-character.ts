import * as T from 'three';
import {batchStatic,mesh,matte,random} from './scenic-kit';

const vector=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

function ellipsoid(root:T.Object3D,material:T.Material,x:number,y:number,z:number,rx:number,ry:number,rz:number,detail=12){
 const object=mesh(root,new T.SphereGeometry(1,detail,Math.max(5,Math.floor(detail*.65))),material,x,y,z);object.scale.set(rx,ry,rz);return object;
}

function stitch(root:T.Object3D,material:T.Material,points:T.Vector3[],radius=.0035){
 const curve=new T.CatmullRomCurve3(points);
 return mesh(root,new T.TubeGeometry(curve,Math.max(4,points.length*2),radius,4,false),material);
}

function panel(root:T.Object3D,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
 const object=mesh(root,new T.BoxGeometry(w,h,d),material,x,y,z);return object;
}

/** Bake the opaque cloth/skin palette into vertices, keeping a complete limb
 * to a single draw call without flattening its animation pivot. */
function batchCharacterPart(root:T.Object3D,retired:Set<T.Material>){
 const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.9});
 root.traverse(object=>{
  if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshStandardMaterial))return;
  const previous=object.material,count=object.geometry.getAttribute('position').count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){colors[i*3]=previous.color.r;colors[i*3+1]=previous.color.g;colors[i*3+2]=previous.color.b;}
  object.geometry.setAttribute('color',new T.BufferAttribute(colors,3));object.material=material;retired.add(previous);
 });
 batchStatic(root);
}

/** Original SocialU student explorer. All proportions are authored in metres;
 * shoes rest at y=0 and the curly crown ends at approximately y=1.6. Legs and
 * arms retain their own hip/shoulder pivots for the shared gameplay animator.
 * Clothing, hair and equipment are real geometry, not layered avatar images. */
export function createExplorerCharacter(scene:T.Scene){
 const hero=new T.Group(),body=new T.Group(),details=new T.Group();
 const retiredMaterials=new Set<T.Material>();
 hero.name='original-student-explorer';body.name='explorer-animated-body';details.name='explorer-clothed-torso-and-head';
 hero.add(body);body.add(details);scene.add(hero);
 hero.userData.originalCharacter=true;hero.userData.height=1.6;
 const navy=matte('#172f54',.89),navyLight=matte('#2b486d',.95),rib=matte('#142b48',.99),seam=matte('#526984',.92);
 const denim=matte('#3a5877',.97),denimLight=matte('#506b88',.98),thread=matte('#a49476',.95);
 const skin=matte('#c7936c',.86),skinLight=matte('#d6a481',.84),shadowSkin=matte('#a96f53',.92);
 const curls=matte('#29211b',.97),litCurls=matte('#403026',.99),hairline=matte('#241e1c',.99);
 const white=matte('#edeae1',.88),sole=matte('#c8c9c1',.97),dark=matte('#1b2533',.89),strap=matte('#3b4652',.97),metal=matte('#a7a194',.48);
 // A shaped, slightly loose hoodie silhouette, with a narrower ribbed hem.
 const jacketProfile=[new T.Vector2(0,.735),new T.Vector2(.157,.735),new T.Vector2(.17,.78),new T.Vector2(.183,.88),new T.Vector2(.212,1.04),new T.Vector2(.199,1.115),new T.Vector2(.143,1.17),new T.Vector2(.072,1.19)];
 const jacket=mesh(details,new T.LatheGeometry(jacketProfile,20),navy);jacket.scale.z=.72;
 const hem=mesh(details,new T.CylinderGeometry(.166,.156,.059,20),rib,0,.761,0);hem.scale.z=.77;
 ellipsoid(details,denim,0,.72,0,.151,.103,.109);
 // Hood behind the neck, contrasting lining and a short collar opening.
 ellipsoid(details,navy,0,1.157,-.078,.157,.13,.104,16);
 ellipsoid(details,rib,0,1.188,.001,.087,.043,.07);
 mesh(details,new T.CylinderGeometry(.055,.059,.085,12),skin,0,1.205,.013);
 stitch(details,navyLight,[vector(-.17,1.104,.079),vector(-.1,1.158,.13),vector(-.051,1.174,.136)],.008);
 stitch(details,navyLight,[vector(.17,1.104,.079),vector(.1,1.158,.13),vector(.051,1.174,.136)],.008);
 for(const side of [-1,1]){
  stitch(details,seam,[vector(side*.039,1.16,.143),vector(side*.045,1.062,.153),vector(side*.035,1.022,.154)],.003);
  panel(details,metal,side*.035,1.016,.156,.006,.014,.005);
  stitch(details,navyLight,[vector(side*.142,1.065,.101),vector(side*.17,.947,.109),vector(side*.142,.807,.114)],.003);
 }
 stitch(details,rib,[vector(-.12,.898,.12),vector(-.106,.829,.132),vector(0,.819,.137),vector(.106,.829,.132),vector(.12,.898,.12)],.007);
 stitch(details,navyLight,[vector(-.103,.84,.139),vector(0,.828,.144),vector(.103,.84,.139)],.003);
 // Softly sculpted jaw and cheeks; the small features read as a student even
 // when the camera uses the reference's small character/environment scale.
 const headGeometry=new T.SphereGeometry(1,22,15),positions=headGeometry.getAttribute('position');
 for(let i=0;i<positions.count;i++){
  const px=positions.getX(i),py=positions.getY(i),pz=positions.getZ(i),jaw=py<-.15?1+(py+.15)*.2:1;
  positions.setXYZ(i,px*.132*jaw,py*.173,pz*.118+(pz>0&&py<.1&&py>-.5?.005:0));
 }
 headGeometry.computeVertexNormals();mesh(details,headGeometry,skinLight,0,1.363,.016);
 for(const side of [-1,1]){
  ellipsoid(details,skin,side*.132,1.352,.005,.024,.038,.018);
  ellipsoid(details,shadowSkin,side*.146,1.353,.011,.007,.019,.009,8);
  ellipsoid(details,white,side*.049,1.393,.127,.024,.012,.009,12);
  ellipsoid(details,dark,side*.049,1.392,.135,.01,.011,.005,10);
  ellipsoid(details,white,side*.047,1.396,.14,.003,.003,.002,6);
  stitch(details,curls,[vector(side*.074,1.423,.119),vector(side*.05,1.432,.132),vector(side*.028,1.425,.128)],.006);
 }
 ellipsoid(details,skinLight,0,1.369,.131,.016,.031,.022,12);
 ellipsoid(details,skin,0,1.35,.146,.021,.011,.013,10);
 stitch(details,shadowSkin,[vector(-.023,1.308,.124),vector(0,1.304,.132),vector(.024,1.308,.124)],.0034);
 // Fine round glasses, bridge and arms avoid oversized cartoon eyeballs.
 for(const side of [-1,1]){
  const rim=mesh(details,new T.TorusGeometry(.037,.003,5,22),dark,side*.048,1.391,.142);rim.scale.y=.91;
  stitch(details,dark,[vector(side*.085,1.402,.139),vector(side*.127,1.412,.074),vector(side*.133,1.395,.007)],.003);
 }
 stitch(details,dark,[vector(-.012,1.395,.143),vector(0,1.403,.15),vector(.012,1.395,.143)],.003);
 // An irregular cap of individual curls with a few loose forehead locks.
 ellipsoid(details,hairline,0,1.469,-.007,.137,.091,.117,16);
 const r=random(713);
 for(let i=0;i<42;i++){
  const a=i*2.399963,up=.04+r()*.91,radial=Math.sqrt(1-up*up),rx=.13*radial,rz=.114*radial;
  const curl=ellipsoid(details,i%4?curls:litCurls,Math.cos(a)*rx,1.474+up*.091,Math.sin(a)*rz-.012,.025+r()*.014,.022+r()*.013,.025+r()*.012,8);
  curl.rotation.set(r()*.8,r()*2,r()*.8);
 }
 for(let i=0;i<8;i++)ellipsoid(details,i%3?curls:litCurls,-.103+i*.028,1.473+(i%3)*.009,.096+(i%2)*.012,.028,.027+(i%3)*.007,.025,8);
 // Compact canvas backpack, with separated front pocket, zip and shoulder
 // straps passing around the jacket instead of one dark blob on the back.
 ellipsoid(details,dark,0,.992,-.173,.146,.203,.084,16);
 ellipsoid(details,strap,0,.953,-.237,.112,.111,.028,14);
 stitch(details,metal,[vector(-.09,1.007,-.252),vector(0,1.019,-.268),vector(.089,1.007,-.252)],.004);
 panel(details,navyLight,0,.949,-.267,.034,.036,.006);
 stitch(details,strap,[vector(-.045,1.165,-.175),vector(0,1.195,-.177),vector(.045,1.165,-.175)],.01);
 for(const side of [-1,1]){
  stitch(details,dark,[vector(side*.105,1.155,-.151),vector(side*.157,1.143,.017),vector(side*.147,1.044,.12),vector(side*.13,.897,.115),vector(side*.121,.853,-.11)],.014);
  panel(details,metal,side*.141,1.017,.129,.025,.037,.009);
 }
 batchCharacterPart(details,retiredMaterials);
 const legs:T.Group[]=[],arms:T.Group[]=[];
 for(const side of [-1,1]){
  const leg=new T.Group();leg.name=side<0?'explorer-left-hip-pivot':'explorer-right-hip-pivot';leg.position.set(side*.085,.733,0);body.add(leg);legs.push(leg);
  // Tapered straight jeans with a softly modeled knee and folded cuff.
  const legProfile=[new T.Vector2(0,-.604),new T.Vector2(.054,-.604),new T.Vector2(.06,-.558),new T.Vector2(.063,-.398),new T.Vector2(.07,-.307),new T.Vector2(.076,-.178),new T.Vector2(.082,-.035),new T.Vector2(.068,.018)];
  const jeans=mesh(leg,new T.LatheGeometry(legProfile,14),denim);jeans.scale.z=.87;
  ellipsoid(leg,denimLight,0,-.323,.024,.058,.052,.027,10);
  const cuff=mesh(leg,new T.CylinderGeometry(.06,.061,.033,12),denimLight,0,-.59,0);cuff.scale.z=.91;
  stitch(leg,thread,[vector(side*.063,-.08,.037),vector(side*.059,-.31,.038),vector(side*.052,-.578,.034)],.0025);
  stitch(leg,thread,[vector(-.047,-.089,.059),vector(-.02,-.139,.068),vector(.023,-.12,.067)],.0025);
  // Raised sole, rounded toe, ankle collar and three visible lace rows.
  ellipsoid(leg,sole,0,-.701,.041,.078,.031,.135,14);
  ellipsoid(leg,white,0,-.665,.039,.073,.045,.125,16);
  ellipsoid(leg,white,0,-.628,-.015,.06,.041,.055,12);
  ellipsoid(leg,dark,0,-.602,-.019,.042,.012,.038,10);
  stitch(leg,sole,[vector(-.06,-.682,.105),vector(0,-.687,.161),vector(.06,-.682,.105)],.0035);
  for(let i=0;i<3;i++)stitch(leg,white,[vector(-.032,-.624-i*.008,.065+i*.018),vector(0,-.619-i*.009,.071+i*.019),vector(.032,-.624-i*.008,.065+i*.018)],.003);
  panel(leg,navyLight,side*.071,-.664,.023,.004,.019,.051);
  batchCharacterPart(leg,retiredMaterials);
  const arm=new T.Group();arm.name=side<0?'explorer-left-shoulder-pivot':'explorer-right-shoulder-pivot';arm.position.set(side*.207,1.118,0);body.add(arm);arms.push(arm);
  const sleeve=mesh(arm,new T.CapsuleGeometry(.058,.24,5,12),navy,side*.016,-.156,.005);sleeve.rotation.z=side*.06;
  ellipsoid(arm,navy,side*.023,-.288,.021,.056,.085,.059,12);
  const wrist=mesh(arm,new T.CylinderGeometry(.045,.045,.039,12),rib,side*.023,-.359,.026);
  wrist.rotation.x=.1;
  ellipsoid(arm,skinLight,side*.024,-.407,.034,.043,.055,.035,12);
  ellipsoid(arm,skin,side*-.006,-.401,.054,.019,.029,.018,10);
  stitch(arm,navyLight,[vector(side*.06,-.069,.031),vector(side*.066,-.202,.043),vector(side*.054,-.336,.047)],.0025);
  batchCharacterPart(arm,retiredMaterials);
 }
 // Metadata describes the animation contract, not a separate collision body.
 body.userData.forwardAxis='+Z';body.userData.limbPivotContract='hip-and-shoulder';
 retiredMaterials.forEach(material=>material.dispose());
 return{hero,body,legs,arms};
}
