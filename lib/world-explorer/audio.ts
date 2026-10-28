/** Original synthesized feedback and quiet ambient notes. No external music,
 * recordings or network assets are loaded. Audio starts after a user gesture. */
export type ExplorerSound='coin'|'star'|'checkpoint'|'discovery'|'finish'|'damage';
type Volumes={musicVolume?:number;effectsVolume?:number};
const bounded=(value:number|undefined,fallback:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value!)):fallback;
const tunes:Record<ExplorerSound,number[]>={coin:[784,1047],star:[523,659,784,1047],checkpoint:[440,554,659],discovery:[392,523,659],finish:[523,659,784,1047,1319],damage:[220,165]};

export function createExplorerAudio(initial:Volumes={}){
 let musicVolume=bounded(initial.musicVolume,.12),effectsVolume=bounded(initial.effectsVolume,.45),context:AudioContext|null=null,music:GainNode|null=null,effects:GainNode|null=null,paused=false,disposed=false,timer:ReturnType<typeof setTimeout>|undefined,melody=0;
 const voices=new Set<OscillatorNode>();
 function note(frequency:number,start:number,duration:number,bus:GainNode,loudness:number,type:OscillatorType='sine'){
  if(!context||context.state!=='running'||disposed)return;
  const oscillator=context.createOscillator(),envelope=context.createGain();oscillator.type=type;oscillator.frequency.value=frequency;
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(loudness,start+.025);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(envelope);envelope.connect(bus);voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};oscillator.start(start);oscillator.stop(start+duration+.03);
 }
 function stopTimer(){if(timer!==undefined)clearTimeout(timer);timer=undefined;}
 function ambient(){
  stopTimer();if(disposed||paused||!context||!music||context.state!=='running')return;
  if(musicVolume>0){const pitches=[262,330,392,440,392,330];note(pitches[melody++%pitches.length],context.currentTime+.03,2.1,music,.14);}
  timer=setTimeout(ambient,2300);
 }
 function setVolumes(value:Volumes){musicVolume=bounded(value.musicVolume,musicVolume);effectsVolume=bounded(value.effectsVolume,effectsVolume);if(context){music?.gain.setTargetAtTime(paused?0:musicVolume,context.currentTime,.04);effects?.gain.setTargetAtTime(paused?0:effectsVolume,context.currentTime,.02);}}
 function unlock(){
  if(disposed||typeof window==='undefined'||typeof window.AudioContext!=='function')return;
  try{
   if(!context){context=new window.AudioContext();music=context.createGain();effects=context.createGain();music.connect(context.destination);effects.connect(context.destination);setVolumes({musicVolume,effectsVolume});}
   if(context.state==='suspended')void context.resume().then(()=>{if(!disposed&&!paused)ambient();}).catch(()=>{});else if(timer===undefined)ambient();
  }catch{/* Unsupported or blocked audio keeps the game silent and playable. */}
 }
 return{
  unlock,setVolumes,
  play(event:ExplorerSound){if(disposed||paused||!context||!effects||effectsVolume<=0)return;const start=context.currentTime+.01;for(const [i,pitch] of tunes[event].entries())note(pitch,start+i*.065,event==='damage'?.22:.18,effects,event==='coin'?.12:.16,event==='damage'?'triangle':'sine');},
  pause(){paused=true;stopTimer();if(context){music?.gain.setTargetAtTime(0,context.currentTime,.025);effects?.gain.setTargetAtTime(0,context.currentTime,.015);}},
  resume(){paused=false;setVolumes({musicVolume,effectsVolume});if(context?.state==='running')ambient();},
  dispose(){if(disposed)return;disposed=true;stopTimer();for(const voice of voices){try{voice.stop();}catch{/* Already ended. */}voice.disconnect();}voices.clear();music?.disconnect();effects?.disconnect();if(context)void context.close().catch(()=>{});context=null;}
 };
}
