import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import * as T from 'three';
import {storedAccessToken,accessToken} from '../lib/account/session';
import {loadExplorerAvatar} from '../lib/world-explorer/avatar';
import {gameRoomSamples,type AvatarAppearance} from '../lib/game-room';
import {createExplorerCharacter} from '../components/world-explorer/explorer-character';
import {dormAvatarStyleKey,resolveDormAvatarStyle} from '../components/dormspace-3d/avatar-style';

vi.mock('../lib/account/session',()=>({storedAccessToken:vi.fn(),accessToken:vi.fn()}));
const saved=(avatarId:string)=>({...gameRoomSamples,appearance:{outfitId:'sample-campus',faceId:'sample-smile',avatarId} as AvatarAppearance});

describe('World Explorer saved Game Room avatar',()=>{
 beforeEach(()=>{vi.mocked(storedAccessToken).mockReturnValue('account-a');vi.mocked(accessToken).mockResolvedValue('account-a');});
 afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});

 it('uses the authenticated saved look and fetches again after a save or account change',async()=>{
  const first=saved('campus-v4-female-3-2-glasses'),next=saved('campus-v4-hijab-4-1-natural');
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(first)).mockResolvedValueOnce(Response.json(next));
  vi.stubGlobal('fetch',fetcher);
  const signal=new AbortController().signal;
  expect(await loadExplorerAvatar(signal)).toEqual(first);
  vi.mocked(storedAccessToken).mockReturnValue('account-b');vi.mocked(accessToken).mockResolvedValue('account-b');
  expect(await loadExplorerAvatar(signal)).toEqual(next);
  expect(fetcher).toHaveBeenNthCalledWith(2,'/api/game-room',expect.objectContaining({method:'GET',cache:'no-store',headers:expect.objectContaining({Authorization:'Bearer account-b'}),signal}));
 });

 it('keeps visitor gameplay available without requesting account data',async()=>{
  vi.mocked(storedAccessToken).mockReturnValue(null);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(await loadExplorerAvatar(new AbortController().signal)).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 });

 it('reports a failed signed-in avatar load instead of silently using the fixed boy',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Connection interrupted'},{status:503})));
  await expect(loadExplorerAvatar(new AbortController().signal)).rejects.toThrow('Your Game Room avatar could not load. Connection interrupted');
 });

 it('does not hand an abandoned request to a new level',async()=>{
  const request=new AbortController();
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>{request.abort();return Response.json(saved('campus-v4-female-1-1-natural'));}));
  await expect(loadExplorerAvatar(request.signal)).rejects.toMatchObject({name:'AbortError'});
 });

 it.each(['campus-v4-male-2-2-glasses','campus-v4-female-3-2-natural','campus-v4-hijab-4-1-natural'])('builds the actual animated character from %s',avatarId=>{
  const scene=new T.Scene(),data=saved(avatarId);data.appearance.bodyShape='broad';data.appearance.skinColor='espresso';
  const character=createExplorerCharacter(scene,data),expected=resolveDormAvatarStyle(data).style;
  expect(scene.getObjectByName('original-student-explorer')).toBeUndefined();
  expect(scene.getObjectByName('saved-game-room-explorer')).toBe(character.hero);
  expect(character.hero.userData.dormAvatar).toBe(dormAvatarStyleKey(expected));
  expect(character.body.scale.x).toBeCloseTo(1.13);
  const colors=new Set<string>();character.hero.traverse(o=>{if(o instanceof T.Mesh)for(const material of [o.material].flat())if(material instanceof T.MeshStandardMaterial)colors.add('#'+material.color.getHexString());});
  expect(colors.has('#613e2e')).toBe(true);expect(colors.has(expected.topColor)).toBe(true);expect(colors.has(expected.bottomColor)).toBe(true);
  expect(character.hero.getObjectByName('hairstyle-'+expected.hair)).toBeDefined();
  expect(character.legs).toHaveLength(2);expect(character.arms).toHaveLength(2);
  // Keep the same gameplay collision height for every look and body shape.
  character.hero.scale.setScalar(1.6/character.height);
  expect(new T.Box3().setFromObject(character.hero).max.y).toBeCloseTo(1.6,2);
  const limb=character.legs[0],before=new T.Box3().setFromObject(limb);
  limb.rotation.x=.7;const after=new T.Box3().setFromObject(limb);
  expect(after.min.distanceTo(before.min)).toBeGreaterThan(.01);
  character.dispose?.();expect(scene.children).toHaveLength(0);
 });

 it('does not dispose shared geometry needed by the next run or DormSpace',()=>{
  const scene=new T.Scene(),character=createExplorerCharacter(scene,saved('campus-v4-female-1-1-natural'));
  const shared=new Set<T.BufferGeometry>();character.hero.traverse(o=>{if(o instanceof T.Mesh&&o.geometry.userData.shared)shared.add(o.geometry);});
  expect(shared.size).toBeGreaterThan(0);
  const disposeSpies=[...shared].map(geometry=>vi.spyOn(geometry,'dispose'));
  character.dispose?.();for(const spy of disposeSpies){expect(spy).not.toHaveBeenCalled();spy.mockRestore();}
  const replay=createExplorerCharacter(scene,saved('campus-v4-male-2-2-glasses'));
  expect(new T.Box3().setFromObject(replay.hero).isEmpty()).toBe(false);replay.dispose?.();
 });

 it('preserves the original visitor character',()=>{
  const scene=new T.Scene(),character=createExplorerCharacter(scene,null);
  expect(character.hero.name).toBe('original-student-explorer');expect(character.height).toBe(1.59);
  expect(character.legs).toHaveLength(2);expect(character.arms).toHaveLength(2);
  scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of [o.material].flat())m.dispose();}});
 });
});
