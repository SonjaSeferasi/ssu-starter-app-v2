import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({token:vi.fn(),create:vi.fn(),channel:vi.fn(),remove:vi.fn(),auth:vi.fn().mockResolvedValue(undefined)}));
vi.mock('../lib/account/session',()=>({storedAccessToken:mocks.token}));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.create}));
const token=(sid?:string)=>'e30.'+Buffer.from(JSON.stringify({sub:'user-one',session_id:sid})).toString('base64url')+'.test';
beforeEach(()=>{vi.resetModules();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://fixture.example');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','fixture');const channel={on:vi.fn().mockReturnThis(),subscribe:vi.fn()};mocks.channel.mockReturnValue(channel);mocks.create.mockReturnValue({channel:mocks.channel,removeChannel:mocks.remove,realtime:{setAuth:mocks.auth}});});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('uses a private session-specific topic and replaces it on a different login of the same user',async()=>{
 const {subscribeToChat}=await import('../lib/realtime-client');
 mocks.token.mockReturnValue(token('caller'));subscribeToChat(vi.fn(),vi.fn());
 expect(mocks.channel).toHaveBeenLastCalledWith('session:user-one:caller',{config:{private:true}});
 mocks.token.mockReturnValue(token('another-login'));subscribeToChat(vi.fn(),vi.fn());
 expect(mocks.remove).toHaveBeenCalledTimes(1);
 expect(mocks.channel).toHaveBeenLastCalledWith('session:user-one:another-login',{config:{private:true}});
});
it('refuses to subscribe without a session ID',async()=>{
 const {subscribeToChat}=await import('../lib/realtime-client');const status=vi.fn();
 mocks.token.mockReturnValue(token());subscribeToChat(vi.fn(),status);
 expect(status).toHaveBeenCalledWith('signed-out');expect(mocks.channel).not.toHaveBeenCalled();
});
