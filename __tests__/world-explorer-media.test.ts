import {afterEach,describe,expect,it,vi} from 'vitest';
import {commonsImage,landmarkImage} from '../lib/world-explorer/media';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import verifiedPhotos from '../lib/world-explorer/verified-photos.json';

const response=(overrides:Record<string,unknown>={})=>({query:{pages:[{title:'File:Mount Fuji view.jpg',imageinfo:[{mime:'image/jpeg',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/test/Fuji.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Mount_Fuji.jpg',extmetadata:{Artist:{value:'<a href="javascript:bad">Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}},...overrides}]}]}});
afterEach(()=>vi.unstubAllGlobals());
describe('Optional attributed landmark photography',()=>{
 it('retains author, licence and source without rendering contributor HTML',()=>{
  expect(commonsImage(response(),'Mount Fuji')).toMatchObject({author:'Photographer',license:'CC BY-SA 4.0',pageUrl:'https://commons.wikimedia.org/wiki/File:Mount_Fuji.jpg'});
  expect(commonsImage(response({extmetadata:{Artist:{value:'Photo author'},LicenseShortName:{value:'CC0'},LicenseUrl:{value:'http://creativecommons.org/publicdomain/zero/1.0/deed.en'}}}),'Mount Fuji')?.licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/deed.en');
 });
 it('rejects unknown licences, unsafe hosts, missing attribution and unrelated photos',()=>{
  expect(commonsImage(response({thumburl:'https://attacker.example/track.jpg'}),'Mount Fuji')).toBeNull();
  expect(commonsImage(response({extmetadata:{}}),'Mount Fuji')).toBeNull();
  expect(commonsImage(response(),'Eiffel Tower')).toBeNull();
  expect(commonsImage(response({extmetadata:{Artist:{value:'Photo'},LicenseShortName:{value:'All rights reserved'},LicenseUrl:{value:'https://creativecommons.org/'}}}),'Mount Fuji')).toBeNull();
 });
 it('does not allow arbitrary upstream lookups or non-member countries',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect(await landmarkImage('https://example.com')).toBeNull();expect(await landmarkImage('VAT')).toBeNull();expect(await landmarkImage('ANTARCTICA')).toBeNull();expect(fetch).not.toHaveBeenCalled();
 });
 it('accepts a credited public-domain file and links its Commons page in place of a licence deed',()=>{
  const image=commonsImage(response({extmetadata:{Credit:{value:'NASA Earth Observatory'},LicenseShortName:{value:'Public domain'}}}),'Mount Fuji');
  expect(image).toMatchObject({author:'NASA Earth Observatory',license:'Public domain',licenseUrl:'https://commons.wikimedia.org/wiki/File:Mount_Fuji.jpg'});
  // Without any credit it is still refused; a CC licence still needs its deed.
  expect(commonsImage(response({extmetadata:{LicenseShortName:{value:'Public domain'}}}),'Mount Fuji')).toBeNull();
  expect(commonsImage(response({extmetadata:{Artist:{value:'Photo'},LicenseShortName:{value:'CC BY-SA 4.0'}}}),'Mount Fuji')).toBeNull();
 });
 it('asks for a verified photo by its file title, and every pin names its place',async()=>{
  for(const [code,pin] of Object.entries(verifiedPhotos.photos as Record<string,{file:string;aliases:string[];why:string;verified:string}>)){
   const destination=guideDestination(code)!;expect(destination.photoFile,code).toBe(pin.file);expect(pin.why.length,code).toBeGreaterThan(10);expect(pin.verified,code).toMatch(/^\d{4}-\d{2}-\d{2}/);
   expect(commonsImage({query:{pages:[{...response().query.pages[0],title:pin.file}]}},destination.photoAliases!),code).not.toBeNull();
  }
  const fetch=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({query:{pages:[{...response().query.pages[0],title:'File:Lac Retba.jpg'}]}})});vi.stubGlobal('fetch',fetch);
  expect((await landmarkImage('SEN'))?.title).toBe('Lac Retba.jpg');
  const params=new URL(fetch.mock.calls[0][0]).searchParams;expect(params.get('titles')).toBe('File:Lac Retba.jpg');expect(params.get('gsrsearch')).toBeNull();
 });
 it('waits and asks again when Commons is busy',async()=>{
  const ok={ok:true,status:200,json:async()=>response()};
  const fetch=vi.fn().mockResolvedValueOnce({ok:false,status:429,headers:{get:()=>'1'}}).mockResolvedValueOnce(ok);vi.stubGlobal('fetch',fetch);
  expect((await landmarkImage('JPN'))?.title).toBe('Mount Fuji view.jpg');expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('keeps a missing media result optional and caches it instead of retrying repeatedly',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal('fetch',fetch);
  expect(await landmarkImage('LVA')).toBeNull();expect(await landmarkImage('LVA')).toBeNull();expect(fetch).toHaveBeenCalledTimes(1);
 });
});
