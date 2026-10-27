import { beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '../../lib/profile-space';
const {getClient,getUser,rpc,upload,remove,sign}=vi.hoisted(()=>({getClient:vi.fn(),getUser:vi.fn(),rpc:vi.fn(),upload:vi.fn(),remove:vi.fn(),sign:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:getClient}));
import { GET, PUT } from '../../app/api/profiles/space/route';
const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-10-08T12:00:00Z'};
const token='header.'+Buffer.from(JSON.stringify({iat:1791849600,session_id:'11111111-1111-4111-8111-111111111111'})).toString('base64url')+'.signature';
const headers={Authorization:`Bearer ${token}`};
const photo=()=>new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'cover.png',{type:'image/png'});
const formRequest=(file=photo())=>{const form=new FormData();form.set('look',JSON.stringify(DEFAULT_LOOK));form.set('coverPhoto',file);return new Request('http://localhost/api/profiles/space',{method:'PUT',headers,body:form});};
let stored:any;
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key');stored=DEFAULT_LOOK;
  getClient.mockReturnValue({auth:{getUser},rpc,storage:{from:()=>({upload,remove,createSignedUrl:sign})}});
  getUser.mockResolvedValue({data:{user},error:null});upload.mockResolvedValue({error:null});remove.mockResolvedValue({error:null});sign.mockResolvedValue({data:{signedUrl:'https://example.test/signed'},error:null});
  rpc.mockImplementation(async(fn,args)=>{if(fn==='socialu_session_guard')return {data:true,error:null};if(args.p_action==='save_look')stored=args.p_look;return {data:{look:stored,notes:[]},error:null};});
});
it('uploads into the owner’s private folder, saves the key, and signs a visitor’s read',async()=>{
  const response=await PUT(formRequest());expect(response.status).toBe(200);
  expect(upload.mock.calls[0][0]).toMatch(new RegExp(`^profile-covers/${user.id}/.+\\.png$`));
  const saved=await response.json();expect(saved.look.coverKey).toBe(upload.mock.calls[0][0]);
  expect((await (await GET(new Request('http://localhost/api/profiles/space?username=linh',{headers}))).json()).coverUrl).toBe('https://example.test/signed');
});
it('rejects another student’s private key before writing or signing',async()=>{
  const response=await PUT(new Request('http://localhost/api/profiles/space',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({look:{...DEFAULT_LOOK,coverKey:'profile-covers/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.png'}})}));
  expect(response.status).toBe(403);expect(upload).not.toHaveBeenCalled();expect(rpc.mock.calls.some(([,args])=>args.p_action==='save_look')).toBe(false);
});
it('rejects disguised SVG and oversized files without uploading',async()=>{
  expect((await PUT(formRequest(new File(['<svg/>'],'fake.png',{type:'image/png'})))).status).toBe(400);
  expect((await PUT(formRequest(new File([new Uint8Array(5000001)],'big.png',{type:'image/png'})))).status).toBe(400);
  expect(upload).not.toHaveBeenCalled();
});
it('removes an uploaded orphan if saving fails',async()=>{
  rpc.mockImplementation(async(fn,args)=>fn==='socialu_session_guard'?{data:true,error:null}:args.p_action==='save_look'?{data:null,error:{code:'22023',message:'Invalid look'}}:{data:{look:DEFAULT_LOOK,notes:[]},error:null});
  expect((await PUT(formRequest())).status).toBe(400);expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
});
it('leaves the saved cover unchanged when storage rejects an upload',async()=>{
  upload.mockResolvedValue({error:{message:'unavailable'}});
  expect((await PUT(formRequest())).status).toBe(502);expect(stored).toEqual(DEFAULT_LOOK);
});
it('requires sign-in for uploads',async()=>{
  const form=new FormData();form.set('coverPhoto',photo());
  expect((await PUT(new Request('http://localhost/api/profiles/space',{method:'PUT',body:form}))).status).toBe(401);expect(upload).not.toHaveBeenCalled();
});
