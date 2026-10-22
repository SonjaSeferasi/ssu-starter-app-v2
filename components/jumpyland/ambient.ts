import type * as Phaser from 'phaser';
import type {Course} from './levels';
export function livingBackground(scene:Phaser.Scene,_course:Course){let elapsed=0;return(delta:number,_x:number)=>{elapsed+=delta;scene.game.canvas.dataset.ambientTick=String(Math.floor(elapsed/100));};}
