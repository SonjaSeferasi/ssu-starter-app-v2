import * as T from 'three';

/** Local 1K CC0 PBR maps by Rob Tuytel / Poly Haven (Aerial Rocks 02).
 * Only surface maps are photographs; every cliff remains modeled 3D geometry.
 * Existing procedural materials stay visible until all local files decode. */
export function mountJapanRockMaterials(scene:T.Scene,low:boolean,onReady?:()=>void){
 const targets=new Set<T.MeshStandardMaterial>();
 scene.traverse(object=>{
  if(!(object instanceof T.Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material])
   if(material instanceof T.MeshStandardMaterial&&material.map instanceof T.DataTexture&&material.roughnessMap)targets.add(material);
 });
 const loader=new T.TextureLoader(),textures:T.Texture[]=[];let alive=true,loaded=0,failed=false;
 const apply=()=>{
  if(!alive||failed||loaded!==3)return;
  const retired=new Set<T.Texture>();
  for(const material of targets){
   for(const previous of [material.map,material.bumpMap,material.roughnessMap])if(previous)retired.add(previous);
   material.map=textures[0];material.normalMap=textures[1];material.normalScale.set(.75,.75);
   material.bumpMap=null;material.roughnessMap=textures[2];material.roughness=.95;
   material.needsUpdate=true;
  }
  retired.forEach(texture=>texture.dispose());onReady?.();
 };
 for(const [index,name] of ['rock-color.jpg','rock-normal.jpg','rock-roughness.jpg'].entries()){
  const texture=loader.load('/world-explorer/materials/'+name,()=>{loaded++;apply();},undefined,()=>{failed=true;});
  texture.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(.65,.65);texture.anisotropy=low?2:4;textures.push(texture);
 }
 return{dispose(){alive=false;textures.forEach(texture=>texture.dispose());}};
}
