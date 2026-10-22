import type {CostumeStyle} from '../game-room/costume-details';
export type RunLoadout={costume:string|null;power:'doubleJump'|'rapid'|null;shield:boolean};
export const emptyLoadout:RunLoadout={costume:null,power:null,shield:false};
export const costumes:(CostumeStyle&{world:number})[]=[
  {id:'mario',name:'Mario',world:1,shirt:'#c34838',pants:'#365d88'},
  {id:'luigi',name:'Luigi',world:1,shirt:'#3f8856',pants:'#365d88'},
  {id:'goku',name:'Goku',world:2,shirt:'#df853c',pants:'#d67b32'},
  {id:'vegeta',name:'Vegeta',world:2,shirt:'#355787',pants:'#355787'},
  {id:'piccolo',name:'Piccolo',world:2,shirt:'#79558e',pants:'#78538a'},
  {id:'naruto',name:'Naruto',world:3,shirt:'#d68b45',pants:'#cf7b37'},
  {id:'sasuke',name:'Sasuke',world:3,shirt:'#d0cfc8',pants:'#3c435d'},
  {id:'kakashi',name:'Kakashi',world:3,shirt:'#6b825b',pants:'#364755'},
];
export function runCostume(selection:RunLoadout,world:number){return costumes.find(c=>c.id===selection.costume&&c.world===world);}
