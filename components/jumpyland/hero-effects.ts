import type * as Phaser from 'phaser';
import type {PowerState} from './powers';
export function heroEffects(scene:Phaser.Scene,player:Phaser.Physics.Arcade.Sprite){
 const ink=scene.add.graphics().setDepth(6);
 const source=scene.textures.get('avatar').getSourceImage() as HTMLImageElement;
 const gold=scene.textures.createCanvas('avatar-golden',source.width,source.height)!,gc=gold.context;gc.drawImage(source,0,0);
 const pixels=gc.getImageData(0,0,source.width,source.height);
 // Transform the actual hair pixels in every animation frame. This preserves
 // strand detail and head fit, instead of placing a crown above the face.
 for(let y=0;y<122;y++)for(let x=0;x<source.width;x++){
  const at=(y*source.width+x)*4,r=pixels.data[at],g=pixels.data[at+1],b=pixels.data[at+2],local=x%256;
  if(pixels.data[at+3]>80&&local>45&&local<215&&y<100&&r<145&&g<125&&b<120&&(r>=b*.94)){
   const light=(r+g+b)/3/145;pixels.data[at]=145+light*105;pixels.data[at+1]=99+light*117;pixels.data[at+2]=25+light*90;
  }
 }
 gc.putImageData(pixels,0,0);gold.refresh();for(let i=0;i<Math.floor(source.width/256);i++)gold.add(String(i),0,i*256,0,256,384);
 const glow=scene.textures.createCanvas('gold-aura',128,192)!,c=glow.context,g=c.createRadialGradient(64,100,18,64,100,68);g.addColorStop(0,'#ffe58b00');g.addColorStop(.6,'#ffe59a38');g.addColorStop(.8,'#f4ca6330');g.addColorStop(1,'#f5d56800');c.fillStyle=g;c.scale(1,1.5);c.fillRect(0,0,128,128);glow.refresh();
 const aura=scene.add.image(0,0,'gold-aura').setDepth(4).setDisplaySize(89,133);
 const clones=[0,1].map(()=>scene.add.sprite(0,0,'avatar').setDepth(5).setDisplaySize(64,96).setOrigin(.5,1));
 const smoke:{x:number;y:number;born:number}[]=[];
 const trail:{time:number;x:number;y:number;frame:string|number;flip:boolean}[]=[];
 let priorCount=0;
 return(now:number,p:PowerState,reduced:boolean)=>{
  ink.clear();const golden=now<p.saiyanUntil,nimbus=now<p.nimbusUntil,star=now<p.starUntil;
  const direction=player.flipX?-1:1;
  const wanted=golden?'avatar-golden':'avatar';if(player.texture.key!==wanted)player.setTexture(wanted,player.frame.name);
  aura.setVisible(golden||star).setPosition(player.x,player.y-43).setAlpha(golden?.8:.45);
  const count=now<p.cloneUntil?p.clones:0;
  if(count<priorCount)for(let i=count;i<priorCount;i++)smoke.push({x:clones[i].x,y:clones[i].y-40,born:now});
  priorCount=count;trail.push({time:now,x:player.x,y:player.y,frame:player.frame.name,flip:player.flipX});while(trail.length&&trail[0].time<now-1600)trail.shift();
  clones.forEach((clone,i)=>{const point=trail.find(t=>t.time>=now-(i+1)*210)||trail[0];clone.setVisible(i<count);if(point){
   const desired=point.x+(i===0?-1:1)*direction*45,candidates=[desired,point.x-(i===0?-1:1)*direction*60,point.x+(i===0?-1:1)*direction*85,point.x];
   const x=candidates.find(x=>!scene.physics.overlapRect(x-10,point.y-72,20,68,true,true).some(b=>b.gameObject?.getData('terrainSolid')))||point.x;
   clone.setPosition(x,point.y).setFrame(point.frame).setFlipX(point.flip);
  }});
  for(let i=smoke.length-1;i>=0;i--){const puff=smoke[i],t=(now-puff.born)/650;if(t>=1){smoke.splice(i,1);continue;}for(let n=0;n<8;n++){const angle=n*Math.PI/4;ink.fillStyle(n%2?0xf4f0df:0xc9ceca,(1-t)*.82);ink.fillCircle(puff.x+Math.cos(angle)*(8+t*28),puff.y+Math.sin(angle)*(8+t*20)-t*22,8+t*10);}}
  if(golden){ink.lineStyle(1,0xffe6a0,.6);for(let i=0;i<5;i++){const x=player.x-29+i*14,y=player.y-10-((now*.055+i*19)%90);ink.lineBetween(x,y,x+2,y-8);}}
  if(nimbus){
   // A long, tapered, curling vapor tail follows the travel direction.
   for(let i=0;i<20;i++){const t=i/20,x=player.x-direction*(36+t*125),y=player.y+8+Math.sin(t*7+now/280)*7*t;ink.fillStyle(i%2?0xffe998:0xe9bd42,.8*(1-t));ink.fillEllipse(x,y,22*(1-t)+3,14*(1-t)+2);}
   ink.fillStyle(0xbc862b,.75);ink.fillEllipse(player.x,player.y+17,91,21);ink.fillStyle(0xf2ce53);ink.fillEllipse(player.x,player.y+8,98,28);
   for(let i=0;i<6;i++){ink.fillStyle(i%2?0xffefad:0xffe484);ink.fillEllipse(player.x-36+i*14,player.y+1-Math.sin(i*1.5)*5,31,25);}
   ink.lineStyle(1,0xd3a432,.7);ink.strokeEllipse(player.x+13,player.y+7,22,12);
  }
 };
}
