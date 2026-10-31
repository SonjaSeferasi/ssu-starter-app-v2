import * as T from 'three';

/** Locally bundled CC0 photographic surface maps (Poly Haven), one set per
 * regional rock or masonry. They replace the procedural fallback on modeled
 * terrain once loaded; vertex colours keep the moss, snow or sand bands. See
 * public/world-explorer/materials/LICENSES.md for sources and checksums. */
export type SurfaceSet='limestone'|'ashlar'|'sandstone-cliff'|'sandstone-blocks'|'mossy-rock'|'alpine-rock'|'coastal-rock'|'savanna-rock'|'gneiss'|'paris-stone'|'red-brick';

/** Mark a material to receive a surface set; `repeat` is texture tiles per UV unit. */
export function markSurface(material:T.MeshStandardMaterial,set:SurfaceSet,tint='#ffffff',repeat=1){material.userData.surfaceSet=set;material.userData.surfaceTint=tint;material.userData.surfaceRepeat=repeat;}

export function loadSurfaceMaps(scene:T.Scene,low:boolean,onReady?:()=>void){
 const groups=new Map<SurfaceSet,T.MeshStandardMaterial[]>();
 scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){const set=material.userData?.surfaceSet as SurfaceSet|undefined;if(set&&material instanceof T.MeshStandardMaterial){const list=groups.get(set)||[];if(!list.includes(material))list.push(material);groups.set(set,list);}}});
 const loader=new T.TextureLoader(),owned:T.Texture[]=[];let alive=true,pending=groups.size;
 if(!pending)onReady?.();
 for(const [set,materials] of groups){
  let loaded=0,failed=false;const maps:T.Texture[]=[];
  const apply=()=>{
   if(!alive||failed||loaded!==2)return;
   for(const material of materials){
    const repeat=material.userData.surfaceRepeat??1,offset=material.map?.offset.clone()||new T.Vector2();
    for(const previous of [material.map,material.bumpMap,material.roughnessMap])if(previous&&!owned.includes(previous))previous.dispose();
    const map=maps[0].clone(),normal=maps[1].clone();for(const t of [map,normal]){t.repeat.set(repeat,repeat);t.offset.copy(offset);t.needsUpdate=true;owned.push(t);}
    material.map=map;material.normalMap=normal;material.normalScale.set(.8,.8);material.bumpMap=null;material.roughnessMap=null;material.roughness=.92;material.color.set(material.userData.surfaceTint||'#ffffff');material.needsUpdate=true;
   }
   if(--pending===0)onReady?.();
  };
  for(const [index,kind] of ['color','normal'].entries()){
   const texture=loader.load(`/world-explorer/materials/${set}-${kind}.jpg`,()=>{loaded++;apply();},undefined,()=>{failed=true;});
   texture.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=low?2:4;maps.push(texture);owned.push(texture);
  }
 }
 return{dispose(){alive=false;owned.forEach(texture=>texture.dispose());}};
}
