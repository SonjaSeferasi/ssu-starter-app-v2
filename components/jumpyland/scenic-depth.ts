import * as T from 'three';

/** Distant matte scenery, combined with the collision-aligned 3D foreground.
 * Slow camera parallax keeps the vista continuous across the whole course.
 * These surfaces never participate in platform or enemy collisions. */
export function scenicDepth(scene:T.Scene,world:number,width:number){
  const root=new T.Group();root.name='distant-matte-and-atmosphere';scene.add(root);
  const texture=new T.TextureLoader().load(`/jumpyland/scenery-v2/${['meadow','dragon','forest'][world-1]}.webp`);
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const backdrop=new T.Mesh(new T.PlaneGeometry(154,87),new T.MeshBasicMaterial({map:texture,fog:false,toneMapped:false,depthWrite:true}));
  backdrop.position.set(7,-3,-72);backdrop.renderOrder=-10;root.add(backdrop);
  // A thin moving mist layer supplies depth independently of the matte image.
  const mistCanvas=document.createElement('canvas');mistCanvas.width=128;mistCanvas.height=64;
  const c=mistCanvas.getContext('2d')!,g=c.createRadialGradient(64,32,0,64,32,64);
  g.addColorStop(0,'#edf6e82b');g.addColorStop(1,'#edf6e800');c.fillStyle=g;c.fillRect(0,0,128,64);
  const mistTexture=new T.CanvasTexture(mistCanvas);mistTexture.colorSpace=T.SRGBColorSpace;
  const mist:T.Mesh[]=[];
  for(let i=0;i<6;i++){
    const sheet=new T.Mesh(new T.PlaneGeometry(18,4),new T.MeshBasicMaterial({map:mistTexture,transparent:true,depthWrite:false,opacity:world===3?.45:.32}));
    sheet.position.set(i*width/5,-8-i%2,-16-i*3);root.add(sheet);mist.push(sheet);
  }
  // Airborne motes are true world-space particles and stay out of the lane.
  const positions:number[]=[];
  for(let i=0;i<140;i++){const n=Math.sin(i*127.1+world*61)*43758.5453,r=n-Math.floor(n);positions.push(r*width,-7+(i%31)*.32,-2-(i%9)*.7);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const motes=new T.Points(geometry,new T.PointsMaterial({color:world===3?'#f5e3a0':'#ffedba',size:.025,transparent:true,opacity:.45,depthWrite:false}));root.add(motes);
  scene.fog=new T.Fog(world===3?'#afbc9a':'#bddbe3',24,100);
  return {
    update(time:number,camera?:T.Camera){
      if(camera){backdrop.position.x=camera.position.x+5-(camera.position.x/Math.max(1,width)) * 11;backdrop.position.y=-3+(camera.position.y+1)*.12;}
      motes.position.y=Math.sin(time*.0002)*.12;
      for(let i=0;i<mist.length;i++)mist[i].position.x=i*width/5+Math.sin(time*.00008+i)*1.4;
    },
    dispose(){/* scene traversal owns all texture, geometry and material disposal */}
  };
}
