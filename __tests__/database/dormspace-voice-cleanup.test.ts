import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyMigration, createDorm3dDatabase, DIRECTORY_ONLY } from '../helpers/dormspace-3d-db';
import { testUid } from '../helpers/dormspace-db';
import { liveConnection, liveSession, prepareLiveDatabase } from '../helpers/dormspace-live-db';

it('queues managed cleanup only for outstanding leases and retires them only after a successful sweep', async () => {
  const db = await createDorm3dDatabase(4, DIRECTORY_ONLY);
  try {
    await prepareLiveDatabase(db);
    await applyMigration(db, 'supabase/migrations/20261106075900_dormspace_voice.sql');
    // Only hosted scheduling/HTTP/Vault are replaced. The actual application SQL runs unchanged.
    await db.exec(`CREATE SCHEMA vault; CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
      CREATE SCHEMA net; CREATE TABLE public.test_voice_sweep_requests(id bigint GENERATED ALWAYS AS IDENTITY,url text,headers jsonb,body jsonb);
      CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$
        INSERT INTO public.test_voice_sweep_requests(url,headers,body) VALUES(url,headers,body) RETURNING id $$;`);
    const sql = readFileSync('supabase/migrations/20261116054535_dormspace_voice_managed_cleanup.sql', 'utf8')
      .replace(/^CREATE EXTENSION.*$/gm, '').replace(/^SELECT cron.schedule.*$/gm, '');
    await db.exec(sql);
    const queue = () => db.query('SELECT dormspace_live.queue_voice_sweep()');
    await queue(); expect((await db.query('SELECT * FROM public.test_voice_sweep_requests')).rows).toHaveLength(0);
    await db.query(`INSERT INTO dormspace_live.voice_leases VALUES($1,$2,$3,$4,$5,clock_timestamp()-interval '1 second')`,
      [liveConnection(1), liveConnection(2), testUid(1), liveSession(1), 'socialu-voice-hall-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
    await queue(); expect((await db.query('SELECT * FROM public.test_voice_sweep_requests')).rows).toHaveLength(0);
    await db.query("INSERT INTO vault.decrypted_secrets VALUES('dormspace_voice_sweep_secret',$1)", ['synthetic-test-only-sweep-secret-0000000']);
    await queue();
    const requests = (await db.query<{ url: string; headers: { Authorization: string } }>('SELECT * FROM public.test_voice_sweep_requests')).rows;
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://socialu-social-u.vercel.app/api/dorm/voice/sweep');
    expect(requests[0].headers.Authorization).toBe('Bearer synthetic-test-only-sweep-secret-0000000');
    expect((await db.query('SELECT * FROM dormspace_live.voice_leases')).rows).toHaveLength(1);
    await db.exec('SET ROLE authenticated');
    await expect(queue()).rejects.toThrow('permission denied');
    await expect(db.query('SELECT public.socialu_dorm_voice_sweep_ack(clock_timestamp())')).rejects.toThrow('permission denied');
    await db.exec('SET ROLE service_role');
    await db.query('SELECT public.socialu_dorm_voice_sweep_ack(clock_timestamp())');
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT * FROM dormspace_live.voice_leases')).rows).toHaveLength(0);
    expect((await db.query<{ last_success_at: string }>('SELECT last_success_at FROM dormspace_live.voice_sweep_health')).rows[0].last_success_at).toBeTruthy();
    await queue(); expect((await db.query('SELECT * FROM public.test_voice_sweep_requests')).rows).toHaveLength(1);
  } finally { await db.close(); }
}, 60_000);
