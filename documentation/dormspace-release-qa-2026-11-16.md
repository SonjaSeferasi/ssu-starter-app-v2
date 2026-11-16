# DormSpace release verification — November 16, 2026

Combined release: [PR #1254](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1254).
Issues #1247–#1253 are assigned to TheRealRinRin. This is a draft; production voice acceptance, merge, and redeployment remain pending.

## Passed

- Final `npx tsc --noEmit` and `npm run build` passed. The build used network access for the existing Google Fonts downloads.
- 74 focused tests passed across nine files, covering rewards, shared balance, shop spending, music API/access, 3D integration, navigation, and voice API/SQL/managed cleanup. Database tests use disposable PGlite with actual migrations.
- Disposable local browser checks: the Game Room opens the 3D DormSpace; owner MP3 upload, explicit listening, looping, and volume controls work; leaving the room removes its audio element; both pixel versions remain reachable through Settings; the header displays the verified account points balance.
- Rewards SQL tests cover all three levels at 25 points, duplicate/concurrent retries, invalid or foreign attempts, instant completion rejection, and a purchase from the same ledger after earning 150 points.
- Hosted rewards, private music storage/schema, and shared-balance migrations were applied. No production test account or test music upload was created.
- Supabase security advisory comparison: no new warnings. The added informational RLS-without-policy notice is expected for the private music table, accessed only through authorized server RPCs. Existing Auth expiry and password-protection warnings are unchanged.

## Broad-suite limits

The broad run was stopped after 250 files reported results: 244 passed and six failed (12 failed assertions). Failed files were `world-explorer-level-design`, `world-explorer-west-asia`, `world-explorer-melanesia`, `world-explorer-oceania-audit`, `database/chat-photo-bugs`, and `database/chat-former-member-history-access`. Those files and the related World Explorer implementation were not changed by this release. This is not a claim that the complete suite passes. The separate focused run passed the new points and voice-cleanup tests that had not finished in the broad run.

## Release prerequisites

1. Finish creating the LiveKit Cloud project. Enter provider credentials directly into hosting configuration; do not put secrets in issues or chat.
2. Configure the production voice connection and matching cleanup secret in Vercel and Supabase Vault.
3. Apply the managed-cleanup migration, explicitly approved by the user once LiveKit is configured. Automatic approval review previously withheld that persistent Cron/HTTP change pending this prerequisite.
4. Verify hosted voice with two participants, microphone/mute, room exit, session/access revocation, and successful cleanup acknowledgments.
5. Mark the combined PR ready, merge to main, redeploy that exact main commit, and verify the resulting production deployment.

Local checks do not establish hosted voice acceptance. The earlier voice draft #1167 should be superseded only after the combined release actually merges.

## Production setup update

LiveKit project `p_4ldogw6em63` (SocialU) was created in the United States with agent observability/recording disabled. The three provider settings and the matching cleanup secret are saved as production Secrets in SocialU's Vercel project. The cleanup secret is also stored in Supabase Vault. The managed-cleanup migration was applied and its active `5 seconds` job was verified; it queues no HTTP requests when there are no leases.

The release now includes main through `bad516e` (the chat photo preview fix). The combined production build passed again. The follow-up run reported 91 passing tests, including all 74 release-focused tests, and four failures in the two existing chat database suites. Those remaining failures concern former-member access and a nonparticipant photo-delete error. The earlier broad-run results above remain historical, not a current full-suite pass.

Merge and deployment can proceed with these known test limits. Hosted provider connectivity, cleanup acknowledgment, and any signed-in browser voice checks must be recorded separately after deployment; a two-person cloud call has not yet been verified.
