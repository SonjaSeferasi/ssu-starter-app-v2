import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid, befriend, friendship } from '../helpers/dormspace-db';
let db: Awaited<ReturnType<typeof createDormDatabase>>;
const sid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function call(student: number, action = 'read', session: string | null = null, location: string | null = null, visible: boolean | null = null) {
  return (await db.query<{result:any}>('SELECT public.socialu_game_presence($1,$2,$3,$4,$5) result',[testUid(student),action,session,location,visible])).rows[0].result;
}
beforeAll(async () => {
  db = await createDormDatabase(5);
  await db.exec(readFileSync('supabase/migrations/20261117090000_game_friend_presence.sql','utf8'));
},60000);
afterAll(async () => { await db?.close(); });
describe('SRS-630 PostgreSQL privacy and expiry', () => {
  it('defaults off and heartbeats cannot publish without opt-in', async () => {
    expect(await call(1)).toMatchObject({visible:false,friends:[]});
    await call(1,'heartbeat',sid(1),'game-room');
    expect((await db.query('SELECT * FROM socialu.game_presence_sessions')).rows).toHaveLength(0);
  });
  it('shows accepted friends with only a name, username, current location and expiry', async () => {
    await befriend(db,1,2);await call(2,'visibility',null,null,true);await call(2,'heartbeat',sid(2),'jumpyland');
    const state = await call(1);expect(state.friends).toHaveLength(1);
    expect(state.friends[0]).toMatchObject({username:'dorm2',name:'Dorm Student 2',location:'jumpyland'});
    expect(Object.keys(state.friends[0]).sort()).toEqual(['expiresAt','location','name','username']);
    expect(Date.parse(state.friends[0].expiresAt)-Date.parse(state.serverTime)).toBeLessThanOrEqual(60000);
  });
  it('never shows strangers or pending requests', async () => {
    await call(3,'visibility',null,null,true);await call(3,'heartbeat',sid(3),'world-explorer');
    await friendship(db,1,'send',3);
    expect((await call(1)).friends.map((f:any)=>f.username)).toEqual(['dorm2']);
    expect((await call(4)).friends).toEqual([]);
  });
  it.each([[1,2],[2,1]])('filters block %s -> %s', async (a,b) => {
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES($1,$2)',[a,b]);
    expect((await call(1)).friends).toEqual([]);
    await db.query('DELETE FROM socialu.student_blocks WHERE blocker_id=$1 AND blocked_id=$2',[a,b]);
    await befriend(db,1,2);
  });
  it('hiding persists on fresh reads, deletes sessions, and rejects later hidden heartbeats', async () => {
    await call(2,'visibility',null,null,false);await call(2,'heartbeat',sid(2),'jumpyland');
    expect((await call(1)).friends).toEqual([]);expect((await call(2)).visible).toBe(false);
    expect((await db.query('SELECT * FROM socialu.game_presence_sessions WHERE student_id=2')).rows).toHaveLength(0);
    await call(2,'visibility',null,null,true);await call(2,'heartbeat',sid(2),'jumpyland');
  });
  it('deduplicates tabs and leaving one tab preserves the other', async () => {
    await call(2,'heartbeat',sid(22),'dormspace');expect((await call(1)).friends[0].location).toBe('dormspace');
    expect((await call(1)).friends).toHaveLength(1);await call(2,'leave',sid(22));
    expect((await call(1)).friends[0].location).toBe('jumpyland');
  });
  it('cannot delete another account session by guessing its id', async () => {
    await call(1,'leave',sid(2));expect((await call(1)).friends).toHaveLength(1);
  });
  it('expires abandoned sessions at 60 seconds without relying on browser cleanup', async () => {
    expect((await call(1)).friends).toHaveLength(1);
    await db.exec("UPDATE socialu.game_presence_sessions SET seen_at=clock_timestamp()-interval '61 seconds' WHERE student_id=2");
    expect((await call(1)).friends).toEqual([]);await call(2,'heartbeat',sid(2),'jumpyland');
  });
  it('filters inactive and reverification-required friends', async () => {
    expect((await call(1)).friends).toHaveLength(1);
    await db.exec('UPDATE socialu.students SET is_active=false WHERE student_id=2');expect((await call(1)).friends).toEqual([]);
    await db.exec('UPDATE socialu.students SET is_active=true,reverification_required=true WHERE student_id=2');expect((await call(1)).friends).toEqual([]);
    await db.exec('UPDATE socialu.students SET reverification_required=false WHERE student_id=2');
  });
  it('removing a friendship immediately affects the next read', async () => {
    expect((await call(1)).friends).toHaveLength(1);
    const active=await db.query<{request_id:string}>("SELECT request_id::text FROM socialu.friend_requests WHERE status='accepted' AND friendship_ended_at IS NULL AND least(sender_id,recipient_id)=1 AND greatest(sender_id,recipient_id)=2");
    await friendship(db,1,'remove',2,active.rows[0].request_id);expect((await call(1)).friends).toEqual([]);
  });
  it('caps active sessions and never stores activity history', async () => {
    for(let n=100;n<135;n++)await call(2,'heartbeat',sid(n),'game-room');
    expect((await db.query('SELECT * FROM socialu.game_presence_sessions WHERE student_id=2')).rows).toHaveLength(32);
  });
  it.each([['heartbeat',null,'game-room',null],['heartbeat',sid(99),'messages',null],['visibility',null,null,null],['invalid',null,null,null]])('rejects invalid arguments for %s', async (action,session,location,visible) => {
    await expect(call(1,action as string,session,location,visible)).rejects.toMatchObject({code:'22023'});
  });
  it('rejects unknown or inactive viewers', async () => {
    await expect(call(999)).rejects.toBeDefined();
    await db.exec('UPDATE socialu.students SET is_active=false WHERE student_id=5');await expect(call(5)).rejects.toBeDefined();
  });
  it('prevents direct authenticated/anonymous RPC or table access', async () => {
    for(const role of ['anon','authenticated']) {
      const result=await db.query<{rpc:boolean;table:boolean}>(`SELECT has_function_privilege($1,'public.socialu_game_presence(uuid,text,uuid,text,boolean)','EXECUTE') rpc,has_table_privilege($1,'socialu.game_presence_sessions','SELECT') AS table`,[role]);
      expect(result.rows[0]).toEqual({rpc:false,table:false});
    }
  });
});
