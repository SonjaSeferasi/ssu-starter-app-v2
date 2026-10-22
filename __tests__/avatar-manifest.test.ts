import {afterEach,expect,it,vi} from 'vitest';
import manifest from '../public/avatars/v2/manifest.json';

afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('shares a successful manifest request across avatar previews',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>manifest});vi.stubGlobal('fetch',fetch);
 const {loadAvatarManifest}=await import('../lib/avatar-manifest');
 const [a,b]=await Promise.all([loadAvatarManifest(),loadAvatarManifest()]);
 expect(a).toEqual(manifest);expect(b).toBe(a);expect(fetch).toHaveBeenCalledTimes(1);
});
it('allows a later visit to recover after the art was unavailable',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>manifest});vi.stubGlobal('fetch',fetch);
 const {loadAvatarManifest}=await import('../lib/avatar-manifest');
 expect(await loadAvatarManifest()).toBeNull();expect(await loadAvatarManifest()).toEqual(manifest);expect(fetch).toHaveBeenCalledTimes(2);
});
it('falls back safely when a manifest is malformed',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({version:1,heads:{}})}));
 const {loadAvatarManifest}=await import('../lib/avatar-manifest');expect(await loadAvatarManifest()).toBeNull();
});
