import {expect,it} from 'vitest';
import {PROFILE_COUNTRIES,countryByCode,countryFlag,countryInput} from '../lib/profile-countries';
import {DEFAULT_LOOK,profileLookInput} from '../lib/profile-space';
import {sameProfileLook,saveProfileLook} from '../lib/profile-look-save';
it('offers real flag sequences with searchable country and region names',()=>{
 expect(new Set(PROFILE_COUNTRIES.map(item=>item.code)).size).toBe(PROFILE_COUNTRIES.length);
 expect(PROFILE_COUNTRIES.length).toBeGreaterThan(240);
 expect(countryByCode('VN')?.name).toBe('Vietnam');expect(countryFlag('VN')).toBe('🇻🇳');expect(countryFlag('US')).toBe('🇺🇸');expect(countryFlag('ZZ')).toBe('');
 for(const item of PROFILE_COUNTRIES)expect([...countryFlag(item.code)]).toHaveLength(2);
 expect(countryInput(' vn ')).toBe('VN');expect(countryInput('')).toBe('');expect(()=>countryInput('ZZ')).toThrow();
});
it('persists and detects country-only changes and keeps the section optional',async()=>{
 const look=profileLookInput({...DEFAULT_LOOK,hometown:' Hanoi ',homeCountry:'vn'});
 expect(look.hometown).toBe('Hanoi');expect(look.homeCountry).toBe('VN');
 expect(sameProfileLook(look,{...look,homeCountry:'US'})).toBe(false);
 expect(sameProfileLook(DEFAULT_LOOK,{...DEFAULT_LOOK,hometown:'',homeCountry:''})).toBe(true);
 expect(await saveProfileLook(look,async()=>({response:new Response(),data:{look,available:true}}))).toEqual(look);
 await expect(saveProfileLook(look,async()=>({response:new Response(),data:{look:{...look,homeCountry:''},available:true}}))).rejects.toThrow('didn’t match');
 expect(()=>profileLookInput({...look,homeCountry:'ZZ'})).toThrow();
});
