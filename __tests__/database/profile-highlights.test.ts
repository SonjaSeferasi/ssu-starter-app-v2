import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('accepts 30 pictures, rejects 31 pictures and text-only posts, and preserves ownership checks', async () => {
  const db = await createDormDatabase(2);
  try {
    for (const file of ['20261025000100_profile_highlights_study_log.sql', '20261025000300_highlight_photo_limit.sql'])
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    const post = (await db.query<any>("SELECT public.socialu_create_post($1,'My photos','public') AS p", [testUid(1)])).rows[0].p.post_id;
    const create = () => db.query<any>("SELECT public.socialu_profile_highlights($1,'create',NULL,'Campus',$2) AS h", [testUid(1), [post]]);
    await expect(create()).rejects.toThrow(/only include photo posts/);
    await db.query("INSERT INTO socialu.upload_policies(upload_context,mime_type,max_bytes) VALUES('post_photo','image/jpeg',10000000) ON CONFLICT DO NOTHING");
    for (let n=1;n<=30;n++) {
      const asset = (await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,$1,'post_photo','image/jpeg',100) RETURNING asset_id", [`photo-${n}.jpg`])).rows[0].asset_id;
      await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)', [post, asset]);
    }
    expect((await create()).rows[0].h[0].posts[0].photos).toHaveLength(30);
    await expect(db.query("SELECT public.socialu_profile_highlights($1,'create',NULL,'Not mine',$2)", [testUid(2), [post]])).rejects.toThrow(/own posts/);
    const last = (await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'photo-31.jpg','post_photo','image/jpeg',100) RETURNING asset_id")).rows[0].asset_id;
    await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)', [post, last]);
    await expect(create()).rejects.toThrow(/up to 30 pictures/);
  } finally { await db.close(); }
}, 30000);
