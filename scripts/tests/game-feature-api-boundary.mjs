// Live Data API boundary probes. Use only the public anon/publishable key.
// Optional OWNER_ACCESS_TOKEN / OTHER_ACCESS_TOKEN must be real user sessions.
// This suite makes no table writes. The PostgreSQL suite exercises mutations.
import { pathToFileURL } from 'node:url';

const socialu = ['activities','catalog_items','owned_items','room_surfaces','reserved_room_cells',
  'item_footprints','compatible_item_overlaps','dorms','dorm_placements','guestbook_notes','counted_dorm_visits',
  'game_levels','participation_settings','participation_events','streak_instances','participation_days',
  'reminder_dismissals','level_completions','snipe_requests','snipe_tags','snipe_reports','snipe_photo_stages',
  'reward_rules','point_transactions'];
const tables = [...socialu.map(name => ['socialu',name]),
  ['dormspace_directory','room_assignments'], ['dormspace_live','players'], ['dormspace_live','messages'],
  ['dormspace_live','voice_leases'], ['dormspace_live','voice_sweep_health'], ['dormspace_music','tracks']];

export async function runBoundaryChecks({ url, key, ownerToken, otherToken }) {
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY (or a publishable key).');
  if (!key.startsWith('sb_publishable_')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); } catch { /* checked below */ }
    if (claims?.role !== 'anon') throw new Error('The attack suite refuses secret/service_role keys.');
  }
  const actors = [['visitor', null], ...(ownerToken ? [['owner',ownerToken]] : []), ...(otherToken ? [['other user',otherToken]] : [])];
  const users = new Set();
  const results = [];
  for (const [actor, token] of actors) {
    const headers = { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) };
    if (token) {
      const response = await fetch(`${url}/auth/v1/user`, { headers });
      const user = await response.json();
      if (!response.ok || !user.id || users.has(user.id)) throw new Error('Provide distinct, valid user sessions.');
      users.add(user.id);
    }
    for (const [schema,table] of tables) {
      const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { ...headers, 'Accept-Profile':schema } });
      const body = await response.json();
      const denied = !response.ok && ['PGRST106','42501'].includes(body.code);
      results.push({ actor, target:`${schema}.${table}`, pass:denied, status:response.status, code:body.code });
    }
    const uid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    for (const [name,payload] of [
      ['socialu_dorm',{ p_action:'open',p_auth_id:uid,p_owner:null,p_payload:{} }],
      ['socialu_snipe',{ p_auth_id:uid,p_action:'list',p_conversation_id:-1,p_snipe_id:null,p_payload:{} }],
      ['socialu_points_balance',{ p_auth_id:uid }],
      ['socialu_game_participation',{ p_auth_id:uid,p_activity:null,p_zone:null }],
    ]) {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method:'POST', headers:{ ...headers,'Content-Type':'application/json' }, body:JSON.stringify(payload),
      });
      const body = await response.json();
      // A business-rule failure is not a permission denial: require the actual
      // function ACL to reject the call, proving a forged caller ID cannot enter.
      const denied = !response.ok && body.code === '42501' && /permission denied for function/.test(body.message || '');
      results.push({ actor,target:`public.${name}`,pass:denied,status:response.status,code:body.code });
    }
  }
  return { passed:results.filter(r=>r.pass).length,total:results.length,
    actors:actors.map(([actor])=>actor),failures:results.filter(r=>!r.pass) };
}

if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runBoundaryChecks({ url:process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key:process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ownerToken:process.env.OWNER_ACCESS_TOKEN,otherToken:process.env.OTHER_ACCESS_TOKEN });
  console.log(JSON.stringify(report,null,2));
  if (report.failures.length) process.exitCode = 1;
}
