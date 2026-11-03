import {afterEach,describe,expect,it,vi} from 'vitest';
import {commonsImage,landmarkImage} from '../lib/world-explorer/media';

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
 it('keeps a missing media result optional and caches it instead of retrying repeatedly',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal('fetch',fetch);
  expect(await landmarkImage('LVA')).toBeNull();expect(await landmarkImage('LVA')).toBeNull();expect(fetch).toHaveBeenCalledTimes(1);
 });
});
