import type * as Phaser from 'phaser';
import type {Course,Platform} from './levels';
import {regionAt} from './levels';
import {naturalTerrain,surfaceY} from './terrain';
import {movingLandings,landingPosition} from './platform-motion';

export function movingTerrain(scene:Phaser.Scene,course:Course,group:Phaser.Physics.Arcade.StaticGroup){
 const assemblies=movingLandings(course).map((base,index)=>{
  const skin=naturalTerrain(scene,base,group,course.number,course.number===3?'forest':regionAt(course,base.x).style);
  const marker=scene.add.text(base.x+base.width/2,base.y+90,base.axis==='x'?'↔':'↕',{fontFamily:'Arial',fontSize:'10px',color:'#f5eed3',stroke:'#1a3e36',strokeThickness:3}).setOrigin(.5).setDepth(3);
  const ropes=null; // No ropes hanging from unmodeled sky anchors.
  return {base,skin,marker,attachments:[] as Phaser.GameObjects.GameObject[],x:base.x,y:base.y,index};
 });
 return {
  attach(x:number,items:Phaser.GameObjects.GameObject[]){const a=assemblies.find(a=>x>=a.base.x&&x<=a.base.x+a.base.width);if(a)a.attachments.push(...items);},
  floors:()=>assemblies.map(a=>({x:a.x,y:a.y,width:a.base.width} as Platform)),
  update(elapsed:number,player:Phaser.Physics.Arcade.Sprite){
   const body=player.body as Phaser.Physics.Arcade.Body;
   let riding=false;
   for(const a of assemblies){
    const p={x:a.x,y:a.y,width:a.base.width};
    const contact=(body.blocked.down||body.touching.down)&&body.velocity.y>=0&&player.x>=p.x-5&&player.x<=p.x+p.width+5&&Math.abs(body.bottom-surfaceY(p,player.x))<10;
    const next=landingPosition(a.base,elapsed),dx=next.x-a.x,dy=next.y-a.y;
    a.skin.image.x+=dx;a.skin.image.y+=dy;
    for(const slab of a.skin.slabs){slab.x+=dx;slab.y+=dy;(slab.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();}
    a.marker.x+=dx;a.marker.y+=dy;
    if(contact){
     // Move both the rendered character and its body by the same displacement.
     // Keep its own horizontal/jump velocity; riding must not replace controls.
     player.x+=dx;player.y+=dy;body.position.x+=dx;body.position.y+=dy;body.prev.x+=dx;body.prev.y+=dy;body.prevFrame.x+=dx;body.prevFrame.y+=dy;riding=true;
    }
    a.x=next.x;a.y=next.y;
    for(const item of a.attachments){if(item.active){const positioned=item as unknown as {x:number;y:number};positioned.x+=dx;positioned.y+=dy;const body=(item as Phaser.GameObjects.GameObject&{body?:Phaser.Physics.Arcade.StaticBody}).body;if(body)body.updateFromGameObject();}}
   }
   const first=assemblies[0];if(first){scene.game.canvas.dataset.movingPlatformX=first.x.toFixed(2);scene.game.canvas.dataset.movingPlatformY=first.y.toFixed(2);}scene.game.canvas.dataset.ridingPlatform=String(riding);
  }
 };
}
