# Presence installation and World Explorer checks — November 17, 2026

SRS-630.1–630.4; issue #1312. World Explorer is the active game focus. No further Jumpyland development was performed.

## Hosted installation

The previously published `20261117090000_game_friend_presence.sql` migration was applied successfully to the intended SocialU Supabase project through the signed-in SQL editor. Both presence tables and the public function had been missing; account/friendship prerequisites were present.

Read-only catalog checks after installation verified:

| Object | Result |
| --- | --- |
| socialu.game_presence_preferences | Row-level security enabled; anon and authenticated direct SELECT blocked |
| socialu.game_presence_sessions | Row-level security enabled; anon and authenticated direct SELECT blocked |
| public.socialu_game_presence(uuid,text,uuid,text,boolean) | service_role can execute; anon and authenticated direct execution blocked |

Proof: `live-table-security.jpg` and `live-function-access.jpg`. No account reward, friendship, or progress rows were manually inserted for evidence. The initial SQL-editor replacement attempt failed with a syntax error; a subsequent metadata query confirmed no partial tables. Replacing the complete editor content with native select-all/paste allowed the original protected migration to run successfully. No RLS bypass was used.

## Verification

- **84/84 tests in 5 files passed**, raw `tests.json`: database presence, API presence, presence client, database friendships, API friends. This includes synthetic privacy/friendship/expiry cases; it does not replace two-account hosted acceptance.
- **9/9 Edge browser checks passed**, zero uncaught page errors, raw `results.json`. Real local Next UI with intercepted synthetic account responses. Covers display, visibility save/reload, failure/retry, account switching, expiry, stale-list clearing, mobile/dark layout, route cleanup, and standalone World Explorer presence publication.
- The visibility retry test now waits for the confirmed enabled/unchecked control, rather than assuming disappearance of the Retry button means the request has completed. The current browser run omits Jumpyland in accordance with the user's active scope; its historical checks remain in the previous evidence folder.
- Signed-in local application against hosted storage: Game Room now displays the normal empty friends list instead of the missing-migration error. “Show me as online” remained off. The header showed 20 points; shared streak was 2 days, qualified today, +10 earned today. This reads an existing reward, not a newly earned reward.
- The same real account opened World Explorer's Japan level successfully, with the saved Cream knit avatar shown in the level route and rendered game. Screenshot: `live-world-explorer-avatar.jpg`. The attempt was left paused for the user, with completed progress preserved. This verifies startup/avatar loading, not a completed level or failed-save recovery.
- The separate navigation/World Explorer regression run passed 78 tests; details are in the navigation submission evidence folder.

## Still pending before full acceptance

Two real accepted-friend accounts are required to demonstrate live show/hide, both block directions, removed/pending friendships, multiple tabs, sign-out expiry, and account isolation. Physical-device/screen-reader testing, a newly earned live daily reward, real date rollover, and full World Explorer completion/retry are not claimed. The branch still needs integration/release verification before these changes can be counted as deployed fixes. Keep the issue open pending that acceptance.
