export type WorldDefinition={id:string;name:string;themeLevel:number;levels:number[];x:number;y:number};
// Themes contain course IDs; new authored worlds can add their own level lists.
export const worlds:WorldDefinition[]=[
 {id:'mushroom',name:'Mushroom Kingdom',themeLevel:1,levels:[1],x:24,y:59},
 {id:'dragon',name:'Dragon World',themeLevel:2,levels:[2],x:50,y:27},
 {id:'shinobi',name:'Shinobi World',themeLevel:3,levels:[3],x:79,y:57},
];
