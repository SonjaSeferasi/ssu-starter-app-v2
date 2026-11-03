import * as T from 'three';

/** Locally bundled CC0 photographic surface maps (Poly Haven), one set per
 * regional rock or masonry. They replace the procedural fallback on modeled
 * terrain once loaded; vertex colours keep the moss, snow or sand bands. See
 * public/world-explorer/materials/LICENSES.md for sources and checksums. */
export type SurfaceSet='limestone'|'ashlar'|'sandstone-cliff'|'sandstone-blocks'|'mossy-rock'|'alpine-rock'|'coastal-rock'|'savanna-rock'|'gneiss'|'paris-stone'|'red-brick';

/** Mark a material to receive a surface set; `repeat` is texture tiles per UV unit. */
export function markSurface(material:T.MeshStandardMaterial,set:SurfaceSet,tint='#ffffff',repeat=1){material.userData.surfaceSet=set;material.userData.surfaceTint=tint;material.userData.surfaceRepeat=repeat;}

/** Set on `scene.userData.prepareMaterials` by the stage: links the shader
 * programs of stand-in materials, on stand-ins for the meshes that will use
 * them, and resolves once they are ready; rejects when the stage is gone. */
export type PrepareMaterials=(changes:{object:T.Mesh;material:T.Material}[])=>Promise<void>;

/** Change materials that may already be on screen without linking a shader
 * during play. Copies take the change first and the stage prepares their
 * programs; only then do the live materials change, reusing those programs.
 * If preparation fails the materials keep their current look. Without a stage
 * hook (tests, tools) the change applies at once. Resolves true when applied. */
export async function changeMaterialsPrepared<M extends T.Material>(scene:T.Scene,materials:M[],change:(target:M,original:M)=>void){
 const prepare=scene.userData.prepareMaterials as PrepareMaterials|undefined;
 if(prepare){
  const copies=new Map<T.Material,M>();
  for(const material of materials){const copy=material.clone() as M;copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;change(copy,material);copies.set(material,copy);}
  const changes:{object:T.Mesh;material:T.Material}[]=[];
  scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){const copy=copies.get(material);if(copy)changes.push({object,material:copy});}});
  try{await prepare(changes);}catch{return false;}
 }
 for(const material of materials){change(material,material);material.needsUpdate=true;}
 return true;
}

export function loadSurfaceMaps(scene:T.Scene,low:boolean,onReady?:()=>void){
 const groups=new Map<SurfaceSet,T.MeshStandardMaterial[]>();
 scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){const set=material.userData?.surfaceSet as SurfaceSet|undefined;if(set&&material instanceof T.MeshStandardMaterial){const list=groups.get(set)||[];if(!list.includes(material))list.push(material);groups.set(set,list);}}});
 const loader=new T.TextureLoader(),owned:T.Texture[]=[];let alive=true,pending=groups.size;
 if(!pending)onReady?.();
 for(const [set,materials] of groups){
  let loaded=0,failed=false;const maps:T.Texture[]=[];
  const apply=async()=>{
   if(!alive||failed||loaded!==2)return;
   // Each material's own map pair, shared by its prepared copy and itself.
   const next=new Map(materials.map(material=>{
    const repeat=material.userData.surfaceRepeat??1,offset=material.map?.offset.clone()||new T.Vector2();
    const map=maps[0].clone(),normal=maps[1].clone();for(const t of [map,normal]){t.repeat.set(repeat,repeat);t.offset.copy(offset);t.needsUpdate=true;owned.push(t);}
    return[material,{map,normal,previous:[material.map,material.bumpMap,material.roughnessMap]}] as const;
   }));
   const applied=await changeMaterialsPrepared(scene,materials,(target,original)=>{const {map,normal}=next.get(original)!;target.map=map;target.normalMap=normal;target.normalScale.set(.8,.8);target.bumpMap=null;target.roughnessMap=null;target.roughness=.92;target.color.set(original.userData.surfaceTint||'#ffffff');});
   if(!applied||!alive)return;
   for(const {previous} of next.values())for(const texture of previous)if(texture&&!owned.includes(texture))texture.dispose();
   if(--pending===0)onReady?.();
  };
  for(const [index,kind] of ['color','normal'].entries()){
   const texture=loader.load(`/world-explorer/materials/${set}-${kind}.jpg`,()=>{loaded++;void apply();},undefined,()=>{failed=true;});
   texture.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=low?2:4;maps.push(texture);owned.push(texture);
  }
 }
 return{dispose(){alive=false;owned.forEach(texture=>texture.dispose());}};
}
