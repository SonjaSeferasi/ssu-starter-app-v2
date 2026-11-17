import {beforeEach,expect,it,vi} from 'vitest';
import sharp from 'sharp';
const {verified,account,upload,remove,rpc,sign}=vi.hoisted(()=>({verified:vi.fn(),account:vi.fn(),upload:vi.fn(),remove:vi.fn(),rpc:vi.fn(),sign:vi.fn()}));
vi.mock('../../lib/socialu-account',async importOriginal=>({...await importOriginal<object>(),verifiedUser:verified,accountOperation:account,accountClient:()=>({storage:{from:()=>({upload,remove})}})}));
vi.mock('../../lib/avatar-photo-server',()=>({avatarPhotoRpc:rpc,signedAvatarPhoto:sign}));
import {POST} from '../../app/api/game-room/photo/route';
import {AccountError} from '../../lib/socialu-account';
beforeEach(()=>{vi.resetAllMocks();verified.mockResolvedValue({id:'owner'});account.mockResolvedValue({id:'1'});upload.mockResolvedValue({error:null});remove.mockResolvedValue({});sign.mockResolvedValue('https://example.test/private-photo');rpc.mockResolvedValue({id:'9'});});
const request=(body:unknown)=>new Request('http://localhost/api/game-room/photo',{method:'POST',body:JSON.stringify(body)});
async function input(){const b=await sharp({create:{width:512,height:512,channels:3,background:'#ea9476'}}).jpeg().toBuffer();return{image:`data:image/jpeg;base64,${b.toString('base64')}`,crop:{x:0,y:0,width:1,height:1}};}
it('rejects unauthenticated requests before image processing or storage',async()=>{verified.mockRejectedValue(new AccountError('Please sign in.',401));expect((await POST(request({}))).status).toBe(401);expect(upload).not.toHaveBeenCalled();});
it('requires a linked profile',async()=>{account.mockResolvedValue(null);expect((await POST(request({}))).status).toBe(409);});
it('rejects null JSON as invalid input',async()=>{expect((await POST(request(null))).status).toBe(400);expect(upload).not.toHaveBeenCalled();});
it('retains the private upload when the database transaction outcome is uncertain',async()=>{rpc.mockRejectedValue(new Error('connection lost'));expect((await POST(request(await input()))).status).toBe(503);expect(remove).not.toHaveBeenCalled();});
it('bounds streaming bodies regardless of Content-Length',async()=>{expect((await POST(request({image:'x'.repeat(600001)}))).status).toBe(413);expect(upload).not.toHaveBeenCalled();});
it('rejects an undecodable spoofed JPEG',async()=>{expect((await POST(request({image:'data:image/jpeg;base64,YWJj',crop:{x:0,y:0,width:1,height:1}}))).status).toBe(400);expect(upload).not.toHaveBeenCalled();});
it('normalizes a valid crop and derives the private storage owner from authentication',async()=>{const response=await POST(request({...await input(),userId:'victim'}));expect(response.status).toBe(200);expect(upload.mock.calls[0][0]).toMatch(/^avatar-face\/owner\//);expect(rpc.mock.calls[0][0]).toBe('owner');expect(await response.json()).toEqual({photoFaceId:'9',photoFaceUrl:'https://example.test/private-photo'});});
it('does not change the face when upload fails',async()=>{upload.mockResolvedValue({error:{message:'offline'}});expect((await POST(request(await input()))).status).toBe(503);expect(rpc).not.toHaveBeenCalled();});
it('cleans up an upload if URL preparation fails before the face transaction',async()=>{sign.mockRejectedValue(new Error('offline'));expect((await POST(request(await input()))).status).toBe(503);expect(rpc).not.toHaveBeenCalled();expect(remove).toHaveBeenCalledOnce();});
