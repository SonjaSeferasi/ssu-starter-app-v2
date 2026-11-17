import {beforeEach,expect,it,vi} from 'vitest';
const {rpc,sign}=vi.hoisted(()=>({rpc:vi.fn(),sign:vi.fn()}));
vi.mock('../lib/socialu-account',async original=>({...await original<object>(),accountClient:()=>({rpc,storage:{from:()=>({createSignedUrl:sign})}})}));
import {avatarPhotoRpc,signedAvatarPhoto} from '../lib/avatar-photo-server';
beforeEach(()=>vi.resetAllMocks());
it('reads the photo for the authenticated owner',async()=>{rpc.mockResolvedValue({data:{id:'1',key:'own-key'},error:null});expect(await avatarPhotoRpc('owner')).toEqual({id:'1',key:'own-key'});expect(rpc).toHaveBeenCalledWith('socialu_avatar_photo',{p_auth_id:'owner'});});
it('reports a missing migration instead of claiming a photo saved',async()=>{rpc.mockResolvedValue({error:{code:'PGRST202'}});await expect(avatarPhotoRpc('owner')).rejects.toMatchObject({code:'AVATAR_PHOTO_SETUP_REQUIRED',status:503});});
it('creates short-lived signed URLs without making the bucket public',async()=>{sign.mockResolvedValue({data:{signedUrl:'signed'},error:null});expect(await signedAvatarPhoto('own-key')).toBe('signed');expect(sign).toHaveBeenCalledWith('own-key',3600);});
it('fails clearly when storage cannot issue a URL',async()=>{sign.mockResolvedValue({error:{message:'unavailable'}});await expect(signedAvatarPhoto('own-key')).rejects.toThrow('could not be loaded');});
