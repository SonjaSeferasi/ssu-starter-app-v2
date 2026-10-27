import { expect,it } from 'vitest';
import { DEFAULT_LOOK, profileLookInput, type ProfileLook } from '../lib/profile-space';
import { PROFILE_THEMES, applyProfileTheme } from '../lib/profile-themes';
import { sameProfileLook,saveProfileLook } from '../lib/profile-look-save';
it('applies every theme while preserving uploaded photos, frames, layout and positioned stickers',async()=>{
  const original:ProfileLook={...DEFAULT_LOOK,frame:'circle',layout:'campus-first',coverKey:'profile-covers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png',stickers:[{id:'one',kind:'coffee',x:50,y:50,rotation:15}],cardStickers:{about:[{id:'two',kind:'flower',x:30,y:40,rotation:-20}],notes:[]}};
  for(const theme of PROFILE_THEMES){
    const look=applyProfileTheme(original,theme.id);
    expect(profileLookInput(look)).toEqual(look);expect(look.stickers).toEqual(original.stickers);expect(look.cardStickers).toEqual(original.cardStickers);expect(look.frame).toBe('circle');expect(look.layout).toBe('campus-first');expect(look.coverKey).toBe(original.coverKey);
    expect(await saveProfileLook(look,async()=>({response:new Response(),data:{look,available:true,coverUrl:'https://example.test/photo'}}))).toEqual(look);
    expect(sameProfileLook(original,look)).toBe(false);
  }
  expect(original).not.toHaveProperty('theme');
});
it('rejects unknown themes and detects a dropped theme after saving',async()=>{
  expect(()=>profileLookInput({...DEFAULT_LOOK,theme:'unknown'})).toThrow('theme');
  const look=applyProfileTheme(DEFAULT_LOOK,'midnight');
  const {theme,...missing}=look;
  await expect(saveProfileLook(look,async()=>({response:new Response(),data:{look:missing,available:true}}))).rejects.toThrow('didn’t match');
});
