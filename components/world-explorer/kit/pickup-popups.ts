import * as T from 'three';

/** How long a pickup label lives, in seconds. */
export const pickupPopupSeconds=.9;

/** The motion of a pickup label by age (SRS-631.4): it pops slightly past full
 * size, settles, rises above the collectible and fades over its last 40%. */
export function pickupPopupPose(age:number){
 const t=Math.max(0,Number.isFinite(age)?age:0)/pickupPopupSeconds,alive=t<1;
 const scale=t<.18?.6+t/.18*.55:1.15-Math.min(1,(t-.18)/.2)*.15;
 return{alive,scale,rise:.5+.95*(1-(1-Math.min(1,t))**2),opacity:!alive?0:t<.6?1:1-(t-.6)/.4};
}

function labelTexture(label:string){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const context=canvas.getContext('2d')!,fill=context.createLinearGradient(0,18,0,110);fill.addColorStop(0,'#fff6c2');fill.addColorStop(1,'#ffc22e');
 context.font='900 92px "Trebuchet MS","Segoe UI",Arial,sans-serif';context.textAlign='center';context.textBaseline='middle';context.lineJoin='round';
 context.lineWidth=16;context.strokeStyle='#6b3d00';context.strokeText(label,128,68);context.lineWidth=5;context.strokeStyle='#fffbe6';context.strokeText(label,128,68);context.fillStyle=fill;context.fillText(label,128,68);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

/** Floating "+1" style labels over collected coins and stars. One texture per
 * label is shared; every sprite material is released when its label expires. */
export function createPickupPopups(scene:T.Scene){
 const textures=new Map<string,T.Texture>(),live:{sprite:T.Sprite;born:number;y:number}[]=[];
 const remove=(index:number)=>{const {sprite}=live[index];sprite.removeFromParent();sprite.material.dispose();live.splice(index,1);};
 return{
  get count(){return live.length;},
  spawn(label:string,x:number,y:number,z:number,time:number){
   if(typeof document==='undefined')return;
   let map=textures.get(label);if(!map){map=labelTexture(label);textures.set(label,map);}
   const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,fog:false}));
   sprite.name='pickup-popup';sprite.position.set(x,y,z);sprite.renderOrder=20;sprite.scale.set(.01,.01,1);scene.add(sprite);live.push({sprite,born:time,y});
  },
  update(time:number){
   for(let i=live.length-1;i>=0;i--){
    const item=live[i],pose=pickupPopupPose(time-item.born);if(!pose.alive){remove(i);continue;}
    item.sprite.position.y=item.y+pose.rise;item.sprite.scale.set(1.5*pose.scale,.75*pose.scale,1);item.sprite.material.opacity=pose.opacity;
   }
  },
  dispose(){while(live.length)remove(live.length-1);textures.forEach(texture=>texture.dispose());textures.clear();},
 };
}
