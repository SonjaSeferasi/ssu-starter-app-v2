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

`supabase/schema.sql` now builds the team's full `socialu` application schema (see `database/schema_review.md`). The legacy `myapp_profile` table used by `/login`, `/register`, and `/profile` lives separately in [`supabase/legacy_myapp_profile.sql`](supabase/legacy_myapp_profile.sql) — open the Supabase **SQL Editor** and run that file if you need those pages to work.

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

Home, Game Room, and Events and Trending currently contain clearly
labeled placeholder content; their route integration is ready, but their feature
implementation and end-to-end acceptance remain dependent on the feature owners.
Messages now uses the chat layout (see SocialU chat below).
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

## SocialU chat: send a text message (UR-201)

SRS-201.1 (LP): a conversation participant sends a text message, and every current participant receives it live through Supabase Realtime. No custom socket server is used, so `npm run dev` and `npm start` are unchanged.

- **Migration** `supabase/migrations/20261012120000_chat_send_text_message.sql` (additive; apply once after `20261008000100`). It adds `public.socialu_send_message(p_auth_id, p_conversation_id, p_text)`, executable only by the server's service role like `socialu_account`. It resolves the verified, active student, runs the shared participant check (`socialu.is_current_participant`), accepts 1–500 characters, applies the private-messaging rule (`socialu.can_send_private`: current friends or accepted request, no block), saves the message, and broadcasts it with `realtime.send` to each current participant's private topic `student:<auth user id>`. It also adds one SELECT policy on `realtime.messages` so a signed-in student can receive broadcasts only on their own topic. There is no INSERT policy, so browsers cannot broadcast.
- **API** `POST /api/conversations/[id]/messages` with body `{ "text": "..." }`. The sender always comes from the bearer token; sender IDs in the body are ignored. Missing and forbidden conversations both return 404 `Conversation not available.` (`lib/chat-access.ts` maps database errors).
- **Pages** follow the Messages UI design and share the Messages column (`app/messages/conversation-list.tsx`; the conversation list itself is SRS-212.4). `/messages` shows the column and a "Choose a conversation" panel. `/messages/[conversationId]` adds the conversation header with live status and the message box with the send button. Saved history is loaded on open (SRS-201.2 below). Until SRS-200.1/212.4 add ways to open a conversation, open one by its ID.
- **Browser variables.** Realtime runs in the browser, which can only read `NEXT_PUBLIC_` values. `next.config.js` reuses the existing `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY`, so no `.env.local` changes are needed. Only these public values are exposed; never add `SUPABASE_SERVICE_ROLE_KEY` there.
- **Testing.** `npm test` covers the route (`__tests__/api/messages.test.ts`). For the end-to-end check, use two verified Salem State students who are current friends, a private conversation between them, and a third student outside it; open `/messages/<conversation id>` in two browser windows and send a message.

Status: applied to the hosted database on 2026-10-12 and recorded as version `20261012120000` after a rolled-back dry run. It was applied as one all-or-nothing statement from a single-line copy of this file (comments removed; same SQL). Checks confirmed the function, service-role-only execution (browser roles denied), the one `realtime.messages` policy, 59 unchanged SocialU tables, and the migration history entry.

### Message history (SRS-201.2)

SRS-201.2 (LP): after a text message is sent, it is displayed within the conversation, including after the page is closed and opened again.

- **Migration** `supabase/migrations/20261019120000_chat_conversation_messages.sql` (additive; apply once after `20261012120000`). It adds the read-only `public.socialu_conversation_messages(p_auth_id, p_conversation_id)`, executable only by the server's service role. It resolves the verified, active student (`public.socialu_require_student`), runs the same participant check as sending (`socialu.is_current_participant`), and returns the signed-in student's ID with the latest 50 successfully sent text messages, oldest first. `socialu.can_read_message` limits group members to messages from their own membership period. Each message has the same fields as the live `message_created` event.
- **API** `GET /api/conversations/[id]/messages` (same route file as sending). Missing and forbidden conversations both return 404 `Conversation not available.`
- **Page.** Opening a conversation loads its saved messages and merges live messages by ID, so a message never appears twice. The page reloads the history whenever live updates connect or reconnect, so messages sent while it was offline still appear. If loading fails, the page shows the reason with a Try again button; sending still works.
- **Testing.** `__tests__/api/messages.test.ts` covers the route. `__tests__/database/chat.test.ts` runs the real schema and both chat migrations in memory (PGlite), covering participants only, oldest-first order, the 50-message limit, sent-only messages, group membership periods, history matching the live event, and browser roles being denied. End to end: send messages in two windows, refresh one, and the conversation is still there.

**Fix: opening a new chat from the friends Message button.** Opening an existing chat worked, but starting a new one failed with "Connections are temporarily unavailable". Rolled-back tests on the hosted database (PostgreSQL 17.6) showed why: the deferred group check `socialu.check_group_structure()` (exactly one current owner, SRS-203.4) runs when the save commits, as the app's `service_role`, which has no access to the `socialu` schema, so it fails with 42P01 `relation "conversations" does not exist` and the save is undone. `supabase/migrations/20261019120100_chat_group_structure_check_as_owner.sql` makes that check run as its owner (one `ALTER FUNCTION`; the rule is unchanged). This also covers saving group memberships for group chats. The in-memory tests use PostgreSQL 18, which runs such checks as the role that queued them, so this is verified on the hosted database rather than in `npm test`.

Status: applied to the hosted database on 2026-10-19 and recorded as versions `20261019120000` and `20261019120100`, after a rolled-back dry run of both. They were applied together as one all-or-nothing statement from single-line copies of these files (comments removed; same SQL), with guards against re-running. Checks after applying, called as `service_role` like the app: history returned 15 messages for a participant, a new private chat opened without error (rolled back), the group check runs as its owner, and existing data was unchanged (1 conversation, 15 messages).

### Conversation list (SRS-202.1, task #457)

The Messages column lists the signed-in student's conversations so they can return to them: DMs show the friend's name, and groups show "Group chat" with the member count. Each entry shows the latest message ("You: …" for your own) and its time, newest activity first. Selecting one opens it, and the open conversation is highlighted.

- **Migration** `supabase/migrations/20261019150000_chat_conversation_list.sql` (additive). It adds the read-only, server-only `public.socialu_conversation_list(p_auth_id)`. It lists private conversations where the student is either participant and groups where they are a current member. Like the conversation header, it hides DMs with a blocked or deactivated student. The latest message respects `socialu.can_read_message`.
- **API** `GET /api/conversations` returns `{ student_id, conversations }`. The student always comes from the bearer token.
- **Page.** `app/messages/conversation-list.tsx` loads the list, reloads it when the window regains focus, and reloads it whenever the open conversation sends or receives a message (the `socialu-chat-activity` event). The open conversation's tab (DMs or Groups) is selected automatically. Unread indicators are SRS-212.4 (#328, #329), which extends this same list.
- **Testing.** `__tests__/api/conversations.test.ts` covers the route. `__tests__/database/chat.test.ts` checks names, order, member counts, outsiders, a DM without messages, and that blocked DMs are hidden.

Status: applied to the hosted database on 2026-10-19 and recorded as version `20261019150000`, after a rolled-back dry run. Called as `service_role`, it returned the expected DMs for loens1 and test1, rejected an unknown account (42501), and denied both browser roles.

### Create a group chat (SRS-202.1, SRS-203.1)

A signed-in student creates a group from **New group** on the Groups tab. The group is saved on its own, before any invitation and without other members (SRS-202.2, SRS-202.4). The creator becomes its first member (SRS-202.3) and its owner (SRS-203.1), and the new group opens right away.

- **Migration** `supabase/migrations/20261019170000_chat_create_group.sql` (#454, #459). It adds the server-only `public.socialu_create_group(p_auth_id)`, which saves the group conversation and the creator's `owner` membership in one all-or-nothing step. It then runs `SET CONSTRAINTS ALL IMMEDIATE`, so the "exactly one current owner" check (SRS-203.4) reports any problem from inside the function.
- **Migration** `supabase/migrations/20261019170100_chat_conversation_role.sql` (#460). It replaces `public.socialu_conversation_messages` so the history call also returns `kind`, the student's current group `role`, and the `member_count`. The message rules and grants are unchanged.
- **API** `POST /api/conversations` with `{ "kind": "group" }` returns `201 { conversation: { id, kind, role, member_count } }`. The creator always comes from the bearer token; owner or member IDs in the body are ignored, and any other body returns 400.
- **Page.** The New group button (#456) is disabled while creating, so a double-click can't make two groups, and it shows a clear message on failure. Group conversations show "Group chat", an **Owner** badge for the owner, and the member count; DMs keep the friend's name. Invitations, administrators, and leaving are later SRS items (SRS-204 to SRS-208).
- **Testing.** `__tests__/api/conversations.test.ts` covers the create route. `__tests__/database/chat.test.ts` checks that the creator is the only member and the only owner, that two groups stay separate, that a member sees `member`, that outsiders are denied, that the first message sends, and that browser roles are denied.

Status: applied to the hosted database on 2026-10-19 and recorded as versions `20261019170000` and `20261019170100`, after a rolled-back dry run. Called as `service_role`, creating a group for loens1 returned owner with 1 member and the group opened as `group / owner / 1` (rolled back). An existing DM still returned `private` with its messages.

### Private-conversation access (SRS-213.1)

SRS-213.1 (LP): only a private conversation's two participants can access it. Missing and forbidden conversations give the same answer, so outsiders cannot tell whether a conversation exists.

| Access point | Protection |
| --- | --- |
| Send: `POST /api/conversations/[id]/messages` | `public.socialu_send_message` runs `socialu.is_current_participant` (and the `validate_message` trigger checks again); outsiders get 404 `Conversation not available.` |
| History: `GET /api/conversations/[id]/messages` | `public.socialu_conversation_messages` runs the same participant check; outsiders get the same 404 |
| List: `GET /api/conversations` | `public.socialu_conversation_list` returns only conversations the student is in |
| Header name: `GET /api/conversations/[id]/peer` | `public.socialu_friend_conversation` requires the student to be one of the pair (404 otherwise) |
| Friends Message button: `POST /api/friends` (`message`) | Returns the conversation only for a current friend pair |
| Live messages (Supabase Realtime) | Each student listens only on `student:<auth uid>`. The `realtime.messages` SELECT policy rejects any other topic, and with no INSERT policy browsers cannot broadcast. `socialu_send_message` broadcasts only to the conversation's participants. |
| Conversation IDs | Validated as positive integers (`lib/chat-access.ts`); anything else gets the same 404 |

All of these database functions are server-only (`service_role`), and the `socialu` schema is not exposed through the Data API.

- **Page (#324).** If a conversation is missing or the student is not a participant, `/messages/[id]` shows "This conversation isn't available" with a link back to Messages, instead of the message box. A send that returns 404 shows the same screen.
- **Testing (#325).** `__tests__/database/chat.test.ts` uses three students and checks that the outsider cannot read history, send (nothing is saved), see the conversation in their list, or receive its live broadcasts. It also checks the real `realtime.messages` policy: a student can listen only on their own channel, and browsers cannot insert broadcasts. The route tests cover the 404s. In the running app, signing in as a third student and opening another pair's conversation (for example loens1 opening `/messages/1`) shows the not-available screen.

### Unread conversations and read tracking (SRS-212.4, SRS-212.5)

SRS-212.4 (LP): the Messages list shows an unread indicator for each conversation that has unread messages for the signed-in student. SRS-212.5 (LP): opening a conversation marks the messages already in it as read.

- **Unread rule (#327).** A message is unread for a student when another participant sent it, the student may read it (`socialu.can_read_message`, so group members only count messages from their own membership period), and `socialu.message_reads` has no row for that message and student. Read state is kept separately for each student (SRS-212.1), and a student's own messages are never unread.
- **Migration** `supabase/migrations/20261019190000_chat_unread_status.sql` (#328). It replaces `public.socialu_conversation_list` so each conversation also returns `unread`. Everything else and the grants are unchanged.
- **Migration** `supabase/migrations/20261019190100_chat_mark_read.sql` (SRS-212.5). It adds the server-only `public.socialu_mark_conversation_read(p_auth_id, p_conversation_id)`, which runs the participant check (404 for outsiders) and records reads for the readable messages from others that aren't read yet. Calling it again is harmless. No new tables; it uses the existing `message_reads` table and its `validate_read` trigger.
- **API** `POST /api/conversations/[id]/read` returns `{ marked }`.
- **Page (#329).** Unread conversations show a green dot and a bold name and preview, and the DMs or Groups tab shows a dot when one of its conversations is unread. The open conversation is never shown as unread. A conversation is marked read once its messages are shown, again when a message arrives while it is visible, and when the student returns to the tab; nothing is marked while the page is hidden. The list refreshes live on `/messages` and on conversation pages.
- **Testing (#330).** `__tests__/api/conversation-read.test.ts` covers the route. `__tests__/database/chat.test.ts` checks per-student unread state, that marking clears it and is harmless to repeat, that own messages are never unread, that a new message makes a conversation unread again, group membership periods, that outsiders are denied, and that browser roles are denied.

Status: applied to the hosted database on 2026-10-19 and recorded as versions `20261019190000` and `20261019190100`, after a rolled-back dry run. Called as `service_role`, loens1's DM showed as unread, marking it read cleared it (rolled back), and marking another pair's conversation returned SC404. After applying, loens1's DM shows as unread, with no reads saved yet.

### Start a friend conversation (SRS-200.1)

SRS-200.1 (LP): when a signed-in student selects a current friend to message, and neither has blocked the other, the private conversation opens. It is created the first time and reused after that.

- **Find or create, with friendship and block checks (#312, #313).** This reuses the existing friends workflow instead of adding a second one: `POST /api/friends` with `{ "action": "message", "username": … }` calls `public.socialu_friendships` (from `20261016010000_friendships.sql`). It accepts only current friends who are active and not blocked (`socialu.are_friends`, which includes `socialu.is_blocked`), then finds or creates the pair's single private conversation (unique pair; SRS-200.5, SRS-200.6) and returns its ID. `20261019120100_chat_group_structure_check_as_owner.sql` is what lets the create step save when called through the app.
- **Messages page (#314).** **New message** on the DMs tab opens a friend picker (`app/messages/friend-picker.tsx`). It lists current friends from `GET /api/friends?view=friends` with a search box, and selecting a friend opens their conversation. The profile and Friends page **Message** buttons use the same workflow, so all three open the same conversation.
- **Testing (#315).** `__tests__/database/chat.test.ts` checks that the conversation has exactly the two students with the initiator recorded, that opening it again from either side reuses it with only one conversation per pair, and that non-friends and blocked pairs are rejected. The friends route tests (`__tests__/api/friends.test.ts`) cover the `message` action's identity handling.
