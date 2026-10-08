# SSU Starter App V2

Professor Brockenbrough's Next.js starter with Tailwind CSS, Supabase auth, and a user profile system.

## Prerequisites

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Wait for the database to finish provisioning.

### 2. Get your connection variables

In your Supabase project, go to **Project Settings → GENERAL** and copy:
- **Project ID** → use to form `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`. Take the value and construct a path like this: "https://xxxx.supabase.co" by adding the https part and the supabase.co part.  Both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL use thissame value.

In your Supabase project, go to **Project Settings → API Keys/Legacy anon, service_role API keys** and copy:
- **anon public key** → use as `SUPABASE_ANON_KEY`
- **service_role secret key** → use as `SUPABASE_SERVICE_ROLE_KEY`

Create a `.env.local` file in the project root (copy from `.env.example`) and fill in those values:

```
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
```

### 3. Run the schema script

In your Supabase project, open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the `myapp_profile` table used by the profile page.

### 4. Create the avatars storage bucket

In your Supabase project, go to **Storage → New bucket**, name it `avatars`, and check **Public bucket**.

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # run all tests
```

## SocialU navigation (UR-600)

SRS-600.1–600.3 share the navigation in `components/navigation`. The mint palette,
left sidebar, and outlined icons follow the pictures in `documentation/UI design`.
There are five destinations: Home (`/`), Messages (`/messages`), Game Room
(`/game-room`), Events and Trending (`/events`), and the current student's Profile
(`/profile`). The current section is indicated visually and with `aria-current`.

The shared shell verifies the starter login's existing `access_token` through
`GET /api/auth/session`. Login, registration, Game 1 and Wordle routes omit the
shell. This is display/session integration, not the pending verified-student
integration with the new `socialu` database schema. Each feature API must retain
its own authentication and authorization checks.

Home, Messages, Game Room, and Events and Trending currently contain clearly
labeled placeholder content; their route integration is ready, but their feature
implementation and end-to-end acceptance remain dependent on the feature owners.
Profile continues to use the existing authenticated profile implementation.

To review the design without an account, run `npm run dev` and open
`http://localhost:3000/dev/navigation`. This static preview contains no account
data and returns 404 in production. Its links lead to the real application routes.
To check the real flow, log in, use each destination, verify only the current item
is selected, and confirm Profile shows your own account. Check the sidebar at both
desktop and phone widths and use Tab to verify keyboard focus.

Preferences, unread badges, Create actions, avatar editing, and game content are
separate SRS requirements. The mockups' sample users, scores, and leaderboard are
not added by this navigation implementation.

## SocialU account integration (UR-100 / UR-103)

The account bridge is in `supabase/migrations/20261008000100_link_supabase_accounts.sql`. Apply it once after the 59-table initial migration; never rerun the reset schema to install this integration. It adds a unique `students.auth_user_id` foreign key to Supabase Auth and permits a null local password digest only when a provider identity exists. No passwords are copied and no students are attached by matching email alone. The original assignment schema remains unchanged; the migration is the Supabase-specific deployment adapter.

Requirement traces: SRS-100.1/.2/.3/.4/.5/.9/.10 require name, username, university email uniqueness and verification; SRS-103.1/.3/.8 govern identity and account access; SRS-110.5 supports profile bio updates. Sonja confirmed `salemstate.edu` as the initial domain on 2026-10-08. The migration seeds Salem State University and that domain without replacing existing rows.

Only the Next.js server's `SUPABASE_SERVICE_ROLE_KEY` can execute `public.socialu_account`. It checks Supabase's confirmed email and SocialU's active/re-verification state. Browser roles cannot execute it, and raw `socialu` tables are not exposed through the Data API. Request bodies never select the acting student; the API uses `auth.getUser(token)` to derive the identity. Do not expose the service key in a NEXT_PUBLIC variable.

Existing confirmed Salem State accounts sign in with email/password, complete missing name/username once on Profile, and then use their linked SocialU profile. Subsequent sign-ins can also use that username. Biography edits update `socialu.student_profiles.bio`. Navigation requires the linked, eligible account. Account setup is distinct from the full SRS-109 profile-setup workflow; `setup_completed` stays false until its required fields are implemented.

Registration now uses normal Supabase signup instead of admin auto-confirmation. Keep Confirm email enabled. The current hosted project has no custom SMTP configured, so new-student email delivery still needs SMTP/Resend setup and an end-to-end check. The default provider confirmation link is an interim integration: UR-101/102 six-digit codes, exact expiry/resend/grace behavior, UR-103 failed-attempt counting and re-verification delivery, Remember Me/refresh/revocation, and password recovery are not completed by this bridge. Auth access tokens retain the starter app's browser storage behavior and expire; this is not a claim of production-ready authentication. Username collisions between pending signups are caught when onboarding commits.

The obsolete profile-photo upload is disabled and returns 501 after account checks; it must be connected to SocialU private media storage before re-enabling the control. Existing Gmail test accounts remain in Supabase Auth but cannot access SocialU under the approved university domain policy.

Validation: `npm test`; `npx tsc --noEmit --incremental false`. The separate `supabase/account-integration-check.sql` exercises migration/onboarding/idempotency/bio/account checks and permission isolation inside BEGIN/ROLLBACK. It requires a confirmed Salem State Auth account and is for a pre-migration check only. It persists no test profile or schema changes.

Hosted migration history was empty during inspection even though all 59 tables existed. Do not run an automatic initial migration/reset against this database; reconcile that pre-existing baseline separately before enabling automatic database deployments.

The account integration migration was applied with Sonja's approval on 2026-10-08 and recorded as version `20261008000100`. Live checks confirmed 59 SocialU tables, the account-link column, `salemstate.edu`, backend function access, and denial for both browser roles. The application remains on port 3000; restart `npm run dev` there to replace the old running starter code. A real successful login still requires verification from that user-run server. The temporary tool-started preview was stopped; its outbound Supabase connection was blocked by the tool environment's network permissions.
