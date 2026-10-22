import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { testUid } from './dormspace-db';

export const LIVE_MIGRATION = 'supabase/migrations/20261020133829_dormspace_multiplayer.sql';
export const liveSession = (student: number) => `11111111-1111-4111-8111-${String(student).padStart(12, '0')}`;
export const liveConnection = (student: number) => `22222222-2222-4222-8222-${String(student).padStart(12, '0')}`;
export const liveState = (x = 4, y = 6) => ({ x, y, facing: 'down', moving: false, sprinting: false, restItemId: null });
export async function prepareLiveDatabase(db: PGlite, students = 4) {
  // Local provider stand-in only. Hosted migrations never create/alter Realtime-owned objects.
  await db.exec(`CREATE SCHEMA realtime;
    CREATE TABLE public.test_live_events(id BIGINT GENERATED ALWAYS AS IDENTITY,payload JSONB,event TEXT,topic TEXT,private BOOLEAN);
    CREATE TABLE realtime.messages(extension TEXT);
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION realtime.topic() RETURNS TEXT LANGUAGE sql AS $$ SELECT current_setting('test.topic',true) $$;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION realtime.send(payload JSONB,event TEXT,topic TEXT,private BOOLEAN) RETURNS VOID LANGUAGE sql AS $$
      INSERT INTO public.test_live_events(payload,event,topic,private) VALUES(payload,event,topic,private) $$;
    GRANT USAGE ON SCHEMA realtime,auth TO authenticated;
    GRANT SELECT ON realtime.messages TO authenticated;
    INSERT INTO realtime.messages(extension) VALUES('broadcast');`);
  await db.exec(readFileSync(LIVE_MIGRATION, 'utf8'));
  for (let student = 1; student <= students; student++)
    await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())', [liveSession(student), testUid(student)]);
}
export async function liveCall(db: PGlite, student: number, action: string, location: object = {}, data: object = {}, connection = liveConnection(student)) {
  return (await db.query<{ result: any }>('SELECT public.socialu_dormspace_live($1,$2,$3,$4,$5,$6) AS result',
    [testUid(student), liveSession(student), connection, action, JSON.stringify(location), JSON.stringify(data)])).rows[0].result;
}
