import * as Phaser from 'phaser';
import {livingBackground} from './ambient';
import { AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, RUN_FRAMES, JUMP_FRAME, FALL_FRAME } from './avatar-animation';
import { drawIsland, drawScenery, drawFinish } from './scenery';
import { themeFor } from './themes';
import {makeAdventureTextures,decorateRegion,drawAdventureBackdrop,drawJourneySurface} from './adventure-art';
import { Course, GRAVITY, JUMP_SPEED, horizontalVelocity, regionAt } from './levels';
export type InputState = { left: boolean; right: boolean; jump: boolean; power:boolean };
export type GameController = { pause: () => void; resume: () => void; destroy: () => void };
export function mountGame(parent: HTMLElement, course: Course, avatar: string, input: InputState,
  onCoins: (count: number) => void, onEnd: (cause: 'fall' | 'hazard' | 'enemy' | 'complete', coins: number) => void,
  onPause: () => void, onReady: (controller: GameController) => void, onProgress: (percent:number)=>void, onWorld:(state:{region:string;cooldown:number;defeated:number})=>void) {
  class Jumpyland extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    shadow!: Phaser.GameObjects.Ellipse;
    lastDust = 0;
    animateBackground!:(delta:number,x:number)=>void;
    enemies!:Phaser.Physics.Arcade.Group;
    shots!:Phaser.Physics.Arcade.Group;
    powerKey!:Phaser.Input.Keyboard.Key;
    elapsed=0;nextPower=0;previousPower=false;defeated=0;lastWorld='';
    ended = false; count = 0; previousTouchJump = false; progress = -1;
    preload() { this.load.image('journey-background','/jumpyland/world-'+course.number+'-v1.png'); this.load.spritesheet('avatar', avatar, {frameWidth:AVATAR_FRAME_WIDTH,frameHeight:AVATAR_FRAME_HEIGHT}); }
    create() {
      if(!drawAdventureBackdrop(this,course))drawScenery(this,course);
      course.regions.forEach(region=>decorateRegion(this,region,course));
      makeAdventureTextures(this,course.number);
      this.animateBackground=livingBackground(this,course);
      const theme=themeFor(course.number);
      this.anims.create({key:'run',frames:this.anims.generateFrameNumbers('avatar',{start:1,end:RUN_FRAMES}),frameRate:14,repeat:-1});
      const platforms=this.physics.add.staticGroup();
      for(const p of course.platforms) {
        const dirt=this.add.rectangle(p.x+p.width/2,p.y+27,p.width,54,0x957354,0);
        this.physics.add.existing(dirt,true); platforms.add(dirt);
        drawIsland(this,p,course.number);drawJourneySurface(this,p,regionAt(course,p.x));
      }
      const coinGroup=this.physics.add.staticGroup();
      for(const c of course.coins) {
        const coin=this.add.image(c.x,c.y,'relic').setDisplaySize(30,30);
        this.physics.add.existing(coin,true);coinGroup.add(coin);
        const glow=this.add.circle(c.x,c.y,22,theme.coin,.12).setData('coinDecoration',coin);
        this.tweens.add({targets:glow,alpha:.3,scale:1.2,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      }
      const hazards=this.physics.add.staticGroup();
      for(const h of course.hazards) {
        const hazard=this.add.rectangle(h.x,h.y-11,34,22,0xa14d49,0);
        this.physics.add.existing(hazard,true); hazards.add(hazard);
        const spikes=this.add.graphics().fillStyle(theme.hazard);
        for(let x=h.x-17;x<h.x+17;x+=11) spikes.fillTriangle(x,h.y,x+5,h.y-22,x+11,h.y);
      }
      drawFinish(this,course);
      this.add.text(80,course.platforms[0].y+54,'START',{fontSize:'13px',color:'#fff',fontStyle:'bold'}).setOrigin(.5);
      this.shadow=this.add.ellipse(85,course.platforms[0].y-1,35,8,0x203b31,.22).setDepth(3);
      this.player=this.physics.add.sprite(85,course.platforms[0].y-52,'avatar').setDisplaySize(64,96).setOrigin(.5,1).setDepth(5);
      // Narrow torso collider avoids the transparent sheet padding and hair edges.
      this.player.body!.setSize(100,290); (this.player.body as Phaser.Physics.Arcade.Body).setOffset(78,80);
      this.physics.add.collider(this.player,platforms);
      this.physics.add.overlap(this.player,coinGroup,(_player,item)=>{
        const coin=item as Phaser.GameObjects.Image;
        if(this.ended || !coin.active)return;
        this.children.list.filter(o=>o.getData('coinDecoration')===coin).forEach(o=>o.destroy());
        const pickup=this.add.text(coin.x,coin.y-20,'+1',{fontFamily:'Arial',fontSize:'20px',fontStyle:'bold',color:'#fff6be',stroke:'#34483b',strokeThickness:3}).setOrigin(.5).setDepth(8);
        this.tweens.add({targets:pickup,y:pickup.y-42,alpha:0,duration:650,onComplete:()=>pickup.destroy()});
        coin.destroy(); this.count++; onCoins(this.count);
      });
      this.physics.add.overlap(this.player,hazards,()=>this.finish('hazard'));
      this.enemies=this.physics.add.group({allowGravity:false,immovable:true});
      for(const e of course.enemies){
        const enemy=this.enemies.create(e.x,e.y-3,'villain') as Phaser.Physics.Arcade.Sprite;
        enemy.setDisplaySize(42,42).setVelocityX(-55).setDepth(4).setData({left:e.left,right:e.right});
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(34,38).setOffset(7,8);
      }
      this.shots=this.physics.add.group({allowGravity:false});
      this.physics.add.overlap(this.player,this.enemies,()=>this.finish('enemy'));
      this.physics.add.overlap(this.shots,this.enemies,(shot,enemy)=>{
        const target=enemy as Phaser.Physics.Arcade.Sprite,blast=shot as Phaser.Physics.Arcade.Image;
        if(!target.active||!blast.active||this.ended)return;
        const burst=this.add.circle(target.x,target.y,20,theme.coin,.6).setDepth(6);
        this.tweens.add({targets:burst,alpha:0,scale:2.4,duration:280,onComplete:()=>burst.destroy()});
        blast.destroy();target.destroy();this.defeated++;
      });
      this.physics.world.setBounds(0,-500,course.width,1200);
      this.physics.world.setBoundsCollision(true,true,true,false);
      this.player.setCollideWorldBounds(true);
      this.cameras.main.setBounds(0,0,course.width,540).startFollow(this.player,true,.12,.12,0,70);
      this.cursors=this.input.keyboard!.createCursorKeys();
      this.powerKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      // The canvas, rather than the whole document, owns movement keys.
      this.input.keyboard!.enabled=false;
      game.canvas.tabIndex=0; game.canvas.setAttribute('aria-label','Jumpyland play area. Left and right arrows move; Space jumps; X uses your power.');
      game.canvas.addEventListener('focus',this.enableKeyboard);
      game.canvas.addEventListener('blur',this.blur);
      this.events.once('shutdown',()=>{game.canvas.removeEventListener('focus',this.enableKeyboard);game.canvas.removeEventListener('blur',this.blur);});
      onReady({pause:()=>{this.physics.pause();this.tweens.pauseAll();this.player.anims.pause();this.clearInput();},resume:()=>{this.clearInput();this.physics.resume();this.tweens.resumeAll();this.player.anims.resume();game.canvas.focus();},destroy:()=>game.destroy(true)});
      game.canvas.focus();
    }
    enableKeyboard=()=>{if(this.input.keyboard)this.input.keyboard.enabled=true;};
    blur=()=>{if(this.input.keyboard)this.input.keyboard.enabled=false;this.clearInput();if(!this.ended)onPause();};
    clearInput(){ input.left=false;input.right=false;input.jump=false;input.power=false;this.input.keyboard?.resetKeys();this.previousTouchJump=false;this.previousPower=false; }
    finish(cause:'fall'|'hazard'|'enemy'|'complete') {if(this.ended)return;this.ended=true;this.physics.pause();this.tweens.pauseAll();this.player.anims.pause();this.clearInput();onEnd(cause,this.count);}
    update(time:number,delta:number) {
      if(!this.player || this.ended || this.physics.world.isPaused)return;
      this.elapsed+=delta;
      this.animateBackground(delta,this.player.x);
      const body=this.player.body as Phaser.Physics.Arcade.Body;
      for(const object of this.enemies.getChildren()){
        const enemy=object as Phaser.Physics.Arcade.Sprite;
        if(enemy.x<=enemy.getData('left'))enemy.setVelocityX(55).setFlipX(false);
        if(enemy.x>=enemy.getData('right'))enemy.setVelocityX(-55).setFlipX(true);
      }
      const usePower=Phaser.Input.Keyboard.JustDown(this.powerKey)||(input.power&&!this.previousPower);
      this.previousPower=input.power;
      if(usePower&&this.elapsed>=this.nextPower){
        this.nextPower=this.elapsed+3500;
        const direction=this.player.flipX?-1:1;
        const shot=this.shots.create(this.player.x+direction*25,this.player.y-40,'power') as Phaser.Physics.Arcade.Image;
        shot.setDepth(6).setDisplaySize(course.number===3?38:30,30).setVelocityX(direction*(course.number===2?620:490)).setData('expires',this.elapsed+1300);
        const target=(this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[])
          .filter(e=>e.active&&(e.x-this.player.x)*direction>0&&Math.abs(e.x-this.player.x)<720)
          .sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];
        if(target){
          const travel=Math.max(.15,Math.abs(target.x-shot.x)/(course.number===2?620:490));
          shot.setVelocityY(Phaser.Math.Clamp((target.y-shot.y)/travel,-220,220));
        }
        (shot.body as Phaser.Physics.Arcade.Body).setSize(24,24).setOffset(8,8);
      }
      for(const object of this.shots.getChildren())if((object as Phaser.GameObjects.Image).getData('expires')<this.elapsed)object.destroy();
      const region=regionAt(course,this.player.x).name;
      const cooldown=Math.max(0,Math.ceil((this.nextPower-this.elapsed)/1000));
      const signature=region+cooldown+this.defeated;
      if(signature!==this.lastWorld){this.lastWorld=signature;onWorld({region,cooldown,defeated:this.defeated});}
      game.canvas.dataset.distance=String(Math.round(this.player.x));game.canvas.dataset.region=region;game.canvas.dataset.enemies=String(this.enemies.countActive());game.canvas.dataset.powerCooldown=String(cooldown);game.canvas.dataset.defeated=String(this.defeated);
      const velocity=horizontalVelocity(this.cursors.left.isDown||input.left,this.cursors.right.isDown||input.right);
      this.player.setVelocityX(velocity);
      const jump=Phaser.Input.Keyboard.JustDown(this.cursors.space)||(input.jump&&!this.previousTouchJump);
      this.previousTouchJump=input.jump;
      if(jump&&body.blocked.down)this.player.setVelocityY(-JUMP_SPEED);
      if(velocity)this.player.setFlipX(velocity<0);
      const grounded=body.blocked.down;
      const airborne=!grounded || body.velocity.y<0;
      if(airborne){this.player.anims.stop();this.player.setFrame(body.velocity.y<0?JUMP_FRAME:FALL_FRAME);}
      else if(velocity)this.player.play('run',true);
      else {this.player.anims.stop();this.player.setFrame(0);}
      game.canvas.dataset.motion=airborne?(body.velocity.y<0?'jump':'fall'):velocity?'run':'idle';
      game.canvas.dataset.avatarFrame=String(this.player.frame.name);
      const floor=course.platforms.find(p=>this.player.x>=p.x&&this.player.x<=p.x+p.width&&this.player.y<=p.y+12);
      this.shadow.setVisible(!!floor);
      if(floor){const height=Math.max(0,floor.y-this.player.y);this.shadow.setPosition(this.player.x,floor.y-1).setAlpha(Math.max(.04,.22-height/700)).setScale(Math.max(.4,1-height/400));}
      if(grounded&&velocity&&time-this.lastDust>140){
        this.lastDust=time;
        const dust=this.add.ellipse(this.player.x-Math.sign(velocity)*9,this.player.y-3,7,4,0xd9ceab,.35).setDepth(4);
        this.tweens.add({targets:dust,x:dust.x-Math.sign(velocity)*12,y:dust.y-8,alpha:0,scale:1.8,duration:380,onComplete:()=>dust.destroy()});
      }
      const percent=Math.min(100,Math.max(0,Math.floor(100*(this.player.x-85)/(course.finish-85))));
      if(percent!==this.progress){this.progress=percent;onProgress(percent);}
      if(this.player.y>650)this.finish('fall');
      else if(this.player.x>=course.finish && body.blocked.down)this.finish('complete');
    }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:540,backgroundColor:'#cce9ef',
    physics:{default:'arcade',arcade:{gravity:{x:0,y:GRAVITY},debug:false}},
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Jumpyland,
    render:{antialias:true},audio:{noAudio:true}});
  return ()=>game.destroy(true);
}
