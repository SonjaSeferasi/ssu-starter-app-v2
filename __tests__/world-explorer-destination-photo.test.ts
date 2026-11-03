import {it,expect} from 'vitest';
import {commonsImage} from '../lib/world-explorer/media';
import {guideDestination} from '../lib/world-explorer/guide-destination';
const payload=(title:string)=>({query:{pages:[{title:'File:'+title+'.jpg',imageinfo:[{mime:'image/jpeg',thumburl:'https://upload.wikimedia.org/test.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.jpg',extmetadata:{Artist:{value:'Test photographer'},LicenseShortName:{value:'CC0'},LicenseUrl:{value:'https://creativecommons.org/publicdomain/zero/1.0/'}}}]}]}});
it.each([['LCA','Wildlife management area Tanzania'],['TTO','Bird sanctuary in Kenya']])('rejects the reproduced wrong destination for %s',(code,title)=>{
 const destination=guideDestination(code)!;
 expect(commonsImage(payload(title),destination.photoSubject)).toBeNull();
 expect(commonsImage(payload(title),destination.photoAliases??destination.photoSubject)).toBeNull();
});
it.each([['LCA','Gros Piton Saint Lucia'],['LCA','Petit Piton'],['TTO','Caroni Swamp Trinidad'],['TTO','Caroni Bird Sanctuary']])('accepts a complete curated destination name for %s',(code,title)=>{
 const destination=guideDestination(code)!;expect(commonsImage(payload(title),destination.photoAliases!)).not.toBeNull();
});
it('uses complete tokens rather than substring matches and folds accents',()=>{
 expect(commonsImage(payload('Mount Fujimoto'),'Mount Fuji')).toBeNull();
 expect(commonsImage(payload('Salar de Uyuni Bolivia'),'Salar Uyuni')).not.toBeNull();
 expect(commonsImage(payload('Galapagos coast'),'Galápagos')).not.toBeNull();
 expect(commonsImage(payload('Landscape'),['','Caroni Swamp'])).toBeNull();
});
