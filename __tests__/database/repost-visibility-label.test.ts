import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for GitHub #1180 (SRS: Reposting, additional functionality):
// the embedded original inside a repost must be labelled with the ORIGINAL
// post's own visibility, never the repost's. Before the fix in
// 20261112120000_repost_visibility_label.sql, repost_of carried no
// visibility key at all, so a client reading post.visibility for the
// embed (the only field available) showed the repost's own visibility
// instead -- e.g. a public original embedded inside a friends-only repost
// was mislabelled "Friends only".
//
// Uses the full chronological migration chain (every migration in the
// repo, in order, plus the new fix at the end) rather than a hand-picked
// subset, since the feed functions this bug touches were later redefined
// inside a migration (20261028000300_global_reaction_system.sql) that
// itself depends on whisper-wall tables created earlier the same day --
// a hand-picked subset silently broke on that cross-feature dependency.
it('labels the embedded original inside a repost with the ORIGINAL post\'s own visibility, not the repost\'s', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261009000100_game_room_navigation.sql','20261012120000_chat_send_text_message.sql','20261012230000_srs_100_105_auth.sql','20261013000100_dormspace.sql','20261013000100_game_room_starter_collection.sql','20261013000200_avatar_trigger_search_paths.sql','20261013000300_starter_ownership_validation.sql','20261013140000_avatar_customization.sql','20261013150000_create_event.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015000100_jumpyland.sql','20261015120000_list_events.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261018020000_avatar_layers.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql','20261020000100_like_notifications.sql','20261020013144_dormspace_furnishings.sql','20261020021507_dormspace_rotation.sql','20261020133829_dormspace_multiplayer.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022000100_comment_notifications.sql','20261022010000_notification_read_state.sql','20261022020000_complete_avatars.sql','20261022020000_open_private_conversation.sql','20261022030000_avatar_variants.sql','20261022030000_profile_friends_list.sql','20261022040000_profile_friends_request_status.sql','20261022050000_integrate_notifications_with_main.sql','20261022060000_backfill_friend_request_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261025043213_snipe_basic.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027000100_avatar_body_skin.sql','20261027000100_reposts.sql','20261027000200_world_explorer_progress.sql','20261027000300_restore_school_isolation.sql','20261027010000_unfriend_removes_mutual_follows.sql','20261027020000_profile_personality.sql','20261027030000_profile_spaces.sql','20261027040000_profile_corners.sql','20261027050000_profile_decoration_library.sql','20261027060000_profile_about_and_hello_notes.sql','20261027070000_profile_vibe_stickers.sql','20261027080000_profile_memories.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql','20261029000100_whisper_retire_categories.sql','20261029000200_customize_your_screen.sql','20261029000300_customize_your_screen_header_options.sql','20261029100000_login_history.sql','20261029101000_complete_login_history.sql','20261029102000_login_activity_status.sql','20261029182808_snipe_rewards.sql','20261029184238_snipe_group_reporting.sql','20261030034841_snipe_photo_transport.sql','20261030035002_snipe_admin_review.sql','20261030040044_snipe_withdrawal_access.sql','20261030093802_snipe_request_pagination.sql','20261031223558_snipe_group_only.sql','20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103000100_whisper_professor_tea.sql','20261103000200_whisper_trending_sidebar.sql','20261103110000_login_context.sql','20261103111000_selected_session_logout.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104000100_screen_themes_redesign.sql','20261104120000_chat_delete_photo.sql','20261112120000_repost_visibility_label.sql'];
for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=2;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const post=async(n:number,text:string,vis='public')=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const repost=async(n:number,text:string|null,vis:string,origId:number)=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3,$4) AS p',[uid(n),text,vis,origId])).rows[0].p;
const getPost=async(n:number,postId:number)=>(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(n),postId])).rows[0].p;
const getFriendsFeed=async(n:number)=>(await db.query<any>('SELECT public.socialu_friends_feed($1) AS f',[uid(n)])).rows[0].f as any[];

// Student 1 publishes a PUBLIC original. Student 2 reposts it, forcing
// their own repost to FRIENDS_ONLY -- a deliberately different visibility
// from the original, so the bug (repost's visibility leaking into the
// embed) and the fix (original's own visibility) are distinguishable.
const original=(await post(1,'My public thoughts','public')).post_id;
const rp=await repost(2,'Sharing this with just my friends','friends_only',original);
assert.equal(rp.visibility,'friends_only'); // the repost's OWN visibility, as requested

// The create_post response itself must label the embed with the
// ORIGINAL's visibility (public), not the repost's (friends_only).
assert.equal(rp.repost_of.visibility,'public');

// Re-reading the repost later (socialu_get_post) must show the same.
const reread=await getPost(2,rp.post_id);
assert.equal(reread.repost_of.visibility,'public');

// And the friends feed (socialu_friends_feed), a separate RPC with its
// own copy of the repost_of query, must agree -- checked as the repost's
// own author (student 2), who can always see their own friends-only post.
const feed=await getFriendsFeed(2);
const rpInFeed=feed.find((p:any)=>p.post_id===rp.post_id);
assert.equal(rpInFeed.repost_of.visibility,'public');

console.log('PASS: repost_of.visibility reflects the ORIGINAL post\'s own visibility (public), not the repost\'s (friends_only), across create_post, get_post, and campus_feed.');
} finally { await db.close(); }
}, 30000);
