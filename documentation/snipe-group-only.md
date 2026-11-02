# Group-only Snipe repair

## Root cause

The active main checkout (0b12a48) lacked the Snipe frontend, API routes and server helpers, although the connected Supabase database already had the seven historical Snipe migrations and two private photo buckets. The implementation existed in local feature commit b1e1f33, where it still allowed private conversations. The global navigation also showed an obsolete Sniping Soon placeholder. On phones, the chat grid and header pushed controls outside the viewport.

The initially signed-in browser account had no groups and could not access conversation 31. This was the existing participant check working correctly. The database confirms that conversation 31 is a group and its owner passes the membership check; @TheRealRinRinn is also a current member. No memberships or real users’ consent answers were changed.

## Changes

Restored the existing Snipe-specific implementation while retaining the current Next.js and React versions. Added the pinned Sharp image decoder and lockfile entries. The conversation page mounts Snipe only after authorized history confirms a group. The list component refuses a non-group response, and every core or upload-staging operation checks group membership through the existing server-only socialu_group_members function.

Migration 20261031223558_snipe_group_only.sql adds group checks to both database bridges. It was applied to the connected Supabase project after explicit user approval, and its filename matches hosted migration history. It changes no tables or data and broadens no grants. Private photo buckets and server-only function execution were verified.

Removed the obsolete global Sniping navigation item. Constrained the mobile grid and allowed group-header actions to wrap. Identity and sharing answers remain separate and unselected. Pending photos remain hidden from untagged members; publication requires the existing approvals. Withdrawal and removal retain confirmation, including metadata-only controls for original actors who leave a group.

## Validation

- 228 distinct Snipe unit, API and database tests passed. The changed API suites were rerun successfully (176 tests).
- 27 navigation tests passed, including absence of Snipe in side and bottom navigation.
- The phone-header browser test passed for both regular members and owners at 390 pixels, with no horizontal overflow.
- Two focused browser tests passed: separate identity/sharing consent, publication, keeping permission, confirmed withdrawal, photo denial for both actors; and DM UI/API denial on desktop and phone. Eight broader scenarios were excluded from this focused run.
- Hosted DM list and upload-begin calls both returned SC404. Both new database guards, private buckets and revoked browser execution grants were verified.
- A real signed-in DM was checked: messaging remained available, Snipe controls were absent, and no console errors were captured.
- Focused Snipe TypeScript and whitespace checks passed.

Historical database tests retain the behavior of the migrations they target. The new group-only database test and browser fixture apply the current group-only migration and explicitly reject DMs.

The isolated browser tests use the real Next app, API handlers, schema and functions with disposable accounts, in-memory PostgreSQL, and Auth/Storage provider stand-ins. They do not simulate Realtime or all unrelated notification features, which explains their isolated connection warnings. No real photos were submitted.

## Remaining limits

The full-project TypeScript check reports existing Jumpyland/Three.js module and type errors outside this change. A broader browser workflow reached approval/reward rendering but exceeded its local time limit; the focused consent and DM tests subsequently passed. The exact live UI check of conversation 31 still awaits sign-in with an existing group-member account; the verification tab is ready on the sign-in screen.

For focused browser acceptance, set SNIPE_BROWSER_DEV=1 and SNIPE_FOCUSED_ACCEPTANCE=1 and run vitest with vitest.snipe-basic.config.ts and the filter "supports group-only consent|never renders Snipe". Supply the installed Playwright module and browser executable through the existing environment options when needed.

## Changed files

- `__tests__/api/snipe-moderation.test.ts`
- `__tests__/api/snipe-pagination.test.ts`
- `__tests__/api/snipe-reports.test.ts`
- `__tests__/api/snipe-sharing.test.ts`
- `__tests__/api/snipe-uploads.test.ts`
- `__tests__/api/snipes.test.ts`
- `__tests__/database/snipe-admin-review.test.ts`
- `__tests__/database/snipe-group-only.test.ts`
- `__tests__/database/snipe-pagination.test.ts`
- `__tests__/database/snipe-photo-transport.test.ts`
- `__tests__/database/snipe-reporting.test.ts`
- `__tests__/database/snipe-rewards.test.ts`
- `__tests__/database/snipe-sharing.test.ts`
- `__tests__/database/snipe.test.ts`
- `__tests__/helpers/snipe-db.ts`
- `__tests__/navigation.test.ts`
- `__tests__/snipe-group-access.test.ts`
- `__tests__/snipe-image.test.ts`
- `__tests__/snipe-pagination.test.ts`
- `__tests__/snipe-sharing-permissions.test.ts`
- `app/api/conversations/[id]/snipes/[snipeId]/admin-removal/route.ts`
- `app/api/conversations/[id]/snipes/[snipeId]/photo/route.ts`
- `app/api/conversations/[id]/snipes/[snipeId]/report/route.ts`
- `app/api/conversations/[id]/snipes/[snipeId]/route.ts`
- `app/api/conversations/[id]/snipes/reports/[reportId]/route.ts`
- `app/api/conversations/[id]/snipes/reports/route.ts`
- `app/api/conversations/[id]/snipes/route.ts`
- `app/api/conversations/[id]/snipes/uploads/finalize/route.ts`
- `app/api/conversations/[id]/snipes/uploads/route.ts`
- `app/api/snipes/sharing/[snipeId]/route.ts`
- `app/api/snipes/sharing/route.ts`
- `app/messages/[conversationId]/page.tsx`
- `app/messages/messages.module.css`
- `app/messages/page.tsx`
- `components/navigation/social-navigation.tsx`
- `components/snipe/snipe-panel.tsx`
- `components/snipe/snipe-sharing-permissions.module.css`
- `components/snipe/snipe-sharing-permissions.tsx`
- `components/snipe/snipe.module.css`
- `documentation/snipe-basic.md`
- `documentation/snipe-group-only.md`
- `documentation/snipe-moderation.md`
- `documentation/snipe-pagination.md`
- `documentation/snipe-photo-transport.md`
- `documentation/snipe-rewards.md`
- `documentation/snipe-sharing-permissions.md`
- `documentation/snipe-sprint-3.md`
- `lib/navigation.ts`
- `lib/snipe-image.ts`
- `lib/snipe-list-pagination.ts`
- `lib/snipe-policy.ts`
- `lib/snipe-sharing.ts`
- `lib/snipe-transport.ts`
- `lib/snipe.ts`
- `package-lock.json`
- `package.json`
- `scripts/tests/snipe-basic.browser.ts`
- `scripts/tests/snipe-local-storage.ts`
- `supabase/migrations/20261025043213_snipe_basic.sql`
- `supabase/migrations/20261029182808_snipe_rewards.sql`
- `supabase/migrations/20261029184238_snipe_group_reporting.sql`
- `supabase/migrations/20261030034841_snipe_photo_transport.sql`
- `supabase/migrations/20261030035002_snipe_admin_review.sql`
- `supabase/migrations/20261030040044_snipe_withdrawal_access.sql`
- `supabase/migrations/20261030093802_snipe_request_pagination.sql`
- `supabase/migrations/20261031223558_snipe_group_only.sql`
- `vitest.snipe-basic.config.ts`

## Evidence

- [Passing focused browser tests](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/socialu-group-snipe-browser-focused.log)
- [Unit/API/database regression](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/socialu-group-snipe-regression.log)
- [Navigation checks](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/socialu-group-snipe-navigation.log)
- [Approved group Snipe](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/mobile-group-snipe-approved.png)
- [Withdrawn group Snipe](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/mobile-group-snipe-withdrawn.png)
- [Direct message without Snipe](/Users/therealrinrin/Desktop/Schoolwork/CSC351/ssu-starter-app-v2/tmp/tools/snipe-group-only-evidence/mobile-dm-no-snipe.png)

The uploaded /mnt/data/schema.sql was not accessible on this host; repository schema files and the connected database were used.
