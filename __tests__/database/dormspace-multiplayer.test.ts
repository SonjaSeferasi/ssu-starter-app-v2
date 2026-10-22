import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { befriend, createDormDatabase, dormCall, friendship, testUid } from '../helpers/dormspace-db';
import { liveCall, liveConnection, liveSession, liveState, prepareLiveDatabase } from '../helpers/dormspace-live-db';

it('shares real players and nearby messages only with active, authorized, unblocked members of the same space', async () => {
  const db = await createDormDatabase();
  try {
    await db.exec(readFileSync('supabase/migrations/20261020013144_dormspace_furnishings.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261020021507_dormspace_rotation.sql','utf8'));
    await prepareLiveDatabase(db);
    const friendshipId=await befriend(db,1,2); await befriend(db,1,3);
    const room = await dormCall(db,1,'open');
    await db.query('SELECT public.socialu_avatar_customization($1,NULL)',[testUid(1)]);
    const bed = room.catalog.find((c: any) => c.previewKey === 'bed').id;
    await dormCall(db,1,'save',null,{ ...room, placements:[{ itemId:bed,x:0,y:0,rotation:90 }] });
    await db.exec('SET ROLE service_role');
    const hall = { kind:'hall',floor:1 }, dorm = { kind:'room',owner:'dorm1' };
    const join = (student: number,location = hall,state = liveState(20,20)) => liveCall(db,student,'join',location,{state});
    expect((await join(1)).players).toHaveLength(1);
    expect((await join(2)).players.map((p:any)=>p.username)).toEqual(['dorm1','dorm2']);
    await join(3,{kind:'hall',floor:2});
    expect((await liveCall(db,1,'sync')).players).toHaveLength(2);
    const messageId = '33333333-3333-4333-8333-333333333333';
    const said = await liveCall(db,1,'say',{}, {text:'Hello  dorm!',messageId});
    expect(said.message.text).toBe('Hello dorm!');
    expect((await liveCall(db,1,'say',{}, {text:'Hello dorm!',messageId})).message.id).toBe(said.message.id);
    await expect(liveCall(db,1,'say',{}, {text:'Too fast',messageId:'44444444-4444-4444-8444-444444444444'})).rejects.toThrow(/wait/);
    expect((await liveCall(db,2,'sync')).messages).toHaveLength(1);
    expect((await liveCall(db,3,'sync')).messages).toHaveLength(0);
    await liveCall(db,1,'join',dorm,{state:liveState()});
    await liveCall(db,2,'join',dorm,{state:liveState()});
    await expect(liveCall(db,4,'join',dorm,{state:liveState()})).rejects.toThrow(/current friend/);
    expect((await liveCall(db,2,'sync')).players).toHaveLength(2);
    expect((await liveCall(db,2,'sync')).messages).toHaveLength(0);
    const asleep = { ...liveState(),restItemId:bed };
    await liveCall(db,1,'update',{}, { state:asleep,sequence:1 });
    await expect(liveCall(db,2,'update',{}, {state:asleep,sequence:1})).rejects.toThrow(/already using/);
    await expect(liveCall(db,2,'update',{}, {state:liveState(0,0),sequence:1})).rejects.toThrow(/Furniture moved/);
    await expect(liveCall(db,2,'update',{}, {state:liveState(4,7),sequence:1})).rejects.toThrow(/walkable/);
    const updated = await liveCall(db,1,'update',{}, {state:liveState(5,6),sequence:2});
    const stale = await liveCall(db,1,'update',{}, {state:liveState(8,6),sequence:1});
    expect(stale.self.state).toEqual(updated.self.state);
    // The saved avatar comes from the account, never a client-chosen username or look.
    expect(updated.self.username).toBe('dorm1');
    expect(updated.self.avatar.outfits).toHaveLength(1);
    await db.exec('RESET ROLE');
    const events = (await db.query<any>("SELECT * FROM public.test_live_events WHERE payload->'message'->>'id'=$1",[said.message.id])).rows;
    expect(events.every((e:any)=>e.private && e.event==='dormspace_event')).toBe(true);
    expect(events).toHaveLength(1);
    expect(new Set(events.map((e:any)=>e.topic))).toEqual(new Set([`dormspace:${testUid(2)}`]));
    await friendship(db,1,'remove',2,friendshipId);
    await expect(liveCall(db,2,'sync')).rejects.toThrow(/visit has ended/);
    expect((await liveCall(db,1,'sync')).players).toHaveLength(1);
    // Old-tab cleanup cannot remove the replacement connection.
    const replacement = liveConnection(4);
    await liveCall(db,1,'join',hall,{state:liveState(20,20)},replacement);
    await liveCall(db,1,'leave');
    expect((await liveCall(db,1,'sync',{}, {},replacement)).self.connectionId).toBe(replacement);
    await expect(liveCall(db,1,'update',{}, {state:liveState(30,20),sequence:9})).rejects.toThrow(/another tab/);
    await liveCall(db,4,'join',hall,{state:liveState(40,20)});
    await friendship(db,1,'block',4);
    expect((await liveCall(db,1,'sync',{}, {},replacement)).players.map((p:any)=>p.id)).not.toContain('4');
    expect((await liveCall(db,4,'sync')).players.map((p:any)=>p.id)).not.toContain('1');
    // Session revocation removes the player from snapshots and stops server fan-out.
    await db.query('DELETE FROM auth.sessions WHERE id=$1',[liveSession(1)]);
    expect((await liveCall(db,3,'sync')).players.map((p:any)=>p.username)).not.toContain('dorm1');
    await expect(liveCall(db,1,'sync',{}, {},replacement)).rejects.toThrow(/sign-in has ended/);
    await db.query("UPDATE dormspace_live.players SET seen_at=clock_timestamp()-interval '16 seconds' WHERE student_id=3");
    await expect(liveCall(db,3,'sync')).rejects.toThrow(/connection ended/);
    for (const role of ['anon','authenticated']) {
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_dormspace_live(uuid,uuid,uuid,text,jsonb,jsonb)','EXECUTE') AS allowed",[role])).rows[0].allowed).toBe(false);
      expect((await db.query<any>("SELECT has_schema_privilege($1,'dormspace_live','USAGE') AS allowed",[role])).rows[0].allowed).toBe(false);
    }
    await db.query("SELECT set_config('test.uid',$1,false),set_config('test.topic',$2,false)",[testUid(2),`dormspace:${testUid(2)}`]);
    await db.exec('SET ROLE authenticated');
    expect((await db.query<any>('SELECT count(*)::integer AS n FROM realtime.messages')).rows[0].n).toBe(1);
    await db.query("SELECT set_config('test.topic',$1,false)",[`dormspace:${testUid(1)}`]);
    expect((await db.query<any>('SELECT count(*)::integer AS n FROM realtime.messages')).rows[0].n).toBe(0);
    await expect(db.exec("INSERT INTO realtime.messages VALUES('broadcast')")).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
    expect((await dormCall(db,1,'open')).placements).toEqual([{itemId:bed,x:0,y:0,rotation:90}]);
  } finally { await db.close(); }
},30000);
