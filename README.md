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
- **Pages** follow the Messages UI design and share the Messages column (`app/messages/conversation-list.tsx`; the conversation list itself is SRS-212.4). `/messages` shows the column and a "Choose a conversation" panel. `/messages/[conversationId]` adds the conversation header with live status and the message box with the send button. Saved history is loaded on open (SRS-201.2 below). On tablets and phones, where the list and the conversation are separate screens, the conversation header has a back button to the Messages list. On wider screens, where the list sits beside the conversation, a close (X) button at the right of the header closes the conversation and returns to the Messages screen (#847); nothing is changed or deleted. Until SRS-200.1/212.4 add ways to open a conversation, open one by its ID.
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
- **Page.** The New group button (#456) first shows a confirmation step ("Create a group chat?", explaining that the creator becomes the owner and first member) with **Create group** and **Cancel**; only Create group creates it. Create group is disabled while creating, so a double-click can't make two groups, and it shows a clear message on failure. Group conversations show "Group chat", an **Owner** badge for the owner, and the member count; DMs keep the friend's name. Invitations are described below; administrators and leaving are later SRS items (SRS-204, SRS-206 to SRS-208).
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

### Invite friends to a group (SRS-205.1, SRS-205.3)

SRS-205.1 (LP): the group's owner or administrator selects one of their current friends for a group invitation. SRS-205.3 (LP): they send that friend a group-join request. Only current friends can be invited (SRS-205.2), and an invited friend is not a member until they accept (SRS-205.4; answering invitations is SRS-205.5 to SRS-205.8).

- **Migration** `supabase/migrations/20261026120000_chat_group_invite_friends.sql` (#481). It adds the server-only `public.socialu_group_invite_friends(p_auth_id, p_conversation_id, p_query)`. It runs the participant check (404 for outsiders), allows only the group's current owner or administrator (`SCI01`), and returns up to 20 current friends (active, not blocked, not already members) with an `invited` flag for friends who already have a pending invitation.
- **Migration** `supabase/migrations/20261026120100_chat_send_group_invitation.sql` (#485). It adds the server-only `public.socialu_send_group_invitation(p_auth_id, p_conversation_id, p_username)`, which saves a `pending` row in the existing `group_invitations` table. Non-friends, blocked students and unknown usernames get `SCI02`, and current members get `SCI03`. Sending again returns the invitation already waiting instead of saving a second one. It never adds a membership, and the existing `validate_group_invitation` trigger still checks the friendship, blocks and the inviter's role.
- **API** `GET /api/conversations/[id]/invitations?q=` returns `{ friends, has_more }` (#482). `POST /api/conversations/[id]/invitations` with `{ "username": … }` returns `201 { created, invitation }`, or `200` when an invitation was already waiting (#486). The inviter always comes from the bearer token; other body fields are ignored. Errors: 403 not the owner or an administrator, 403 not a current friend, 409 already a member, 404 not available.
- **Page (#483, #487).** In a group, the owner (or an administrator) sees **Invite** in the header. It opens a panel with a friend search; each friend has an **Invite** button that changes to **Invited** once sent, and double-clicks can't send twice. Regular members never see the button. The Messages list has a **Find people** link to the Friends page (`/friends`, unchanged) for finding new friends.
- **Testing (#484, #488).** `__tests__/api/group-invitations.test.ts` covers both routes. `__tests__/database/group-invitations.test.ts` checks the friend list (friends only, no blocked or non-friends, members excluded, search), that inviting saves one pending invitation and no membership, that sending again reuses it, that non-friends, blocked students, members, regular members, outsiders and private conversations are refused, and that browser roles are denied. It runs twice: with the Chat migrations, and with main's latest migrations including LN's school communities.

Status: applied to the hosted database on 2026-10-26 and recorded as versions `20261026120000` and `20261026120100`, after a rolled-back dry run of all seven Sprint 3 Chat migrations together (`20261026120000` to `20261026140100`). They were applied as one all-or-nothing statement from single-line copies of the files (comments removed; same SQL), with guards that stop without changes if a function already exists, the versions are already recorded, or the replaced history and list functions differ from the checked versions. In the dry run, run as `service_role`, Testing 2 (owner of group 32) saw loens1 and testing 1 to invite; inviting loens1 twice reused one invitation; and a regular member got `SCI01`.

### Answer a group invitation (SRS-205.5 to SRS-205.8)

SRS-205.5 (LP): a pending group invitation is available to the invited student for a response. SRS-205.6 (LP): they can accept it, and SRS-205.7 (LP): accepting adds them to the group's current membership. SRS-205.8 (LP): they can decline it instead, and a declined student is not added (SRS-205.9).

- **Migration** `supabase/migrations/20261026130000_chat_pending_group_invitations.sql` (#489). It adds the server-only `public.socialu_pending_group_invitations(p_auth_id)`, which returns only the student's own pending invitations (newest first) with the inviter's name and the group's member count. It leaves out invitations from a student either of them has blocked since.
- **Migration** `supabase/migrations/20261026130100_chat_accept_group_invitation.sql` (#493, #791). It adds the server-only `public.socialu_accept_group_invitation(p_auth_id, p_invitation_id)`, which marks the invitation `accepted` and adds the student as a regular `member` in one all-or-nothing step, then runs `SET CONSTRAINTS ALL IMMEDIATE` so the group checks report any problem from inside the function. Missing, someone else's, already answered, or blocked invitations all get `SCI05`.
- **Migration** `supabase/migrations/20261026130200_chat_decline_group_invitation.sql` (#497). It adds the server-only `public.socialu_decline_group_invitation(p_auth_id, p_invitation_id)`, which marks the invitation `declined` and never adds a membership.
- **API.** `GET /api/group-invitations` returns `{ invitations }` (#490). `POST /api/group-invitations/[id]/accept` returns `{ conversation_id, member_count }` (#494, #792), and `POST /api/group-invitations/[id]/decline` returns `{ id, status }` (#498). The student always comes from the bearer token. Invitation IDs are checked as positive integers, and every "can't answer" case gets the same 404 `This invitation is no longer available.`
- **Page (#491, #495, #793, #499).** Pending invitations appear at the top of the Groups tab ("Group chat", who invited you, the member count) with **Accept** and **Decline**, and the Groups tab shows a dot while any are waiting. Accept opens the group right away and it appears in the Groups list; a new member reads messages from their membership period only. Decline removes the invitation. Both buttons are disabled while saving. The list refreshes with the Messages list (on focus and chat activity). The old "can't invite yet" notice is gone.
- **Testing (#492, #496, #794, #500).** `__tests__/api/group-invitation-answers.test.ts` covers the three routes. `__tests__/database/group-invitation-answers.test.ts` checks that each student sees only their own invitations, that only the invitee can answer, that accepting adds a regular member who can then use the group (and cannot see messages from before they joined), that answering twice is refused, that declining adds no member, that blocking the inviter hides the invitation, and that browser roles are denied. It also runs with LN's school communities migration.

Status: applied to the hosted database on 2026-10-26 and recorded as versions `20261026130000`, `20261026130100` and `20261026130200`, together with the invite and emoji migrations (see above). In the dry run, loens1 saw the invitation from Testing 2. Accepting made them a member (2 members), and testing 1 declining worked.

### Send and display an emoji (SRS-201.8, SRS-201.9)

SRS-201.8 (LP): a conversation participant sends an emoji, in a private or group conversation. SRS-201.9 (LP): once sent, the emoji is displayed in the conversation.

- **Migration** `supabase/migrations/20261026140000_chat_send_emoji.sql` (#795). It adds the server-only `public.socialu_send_emoji(p_auth_id, p_conversation_id, p_emoji)`. It runs the same checks as text messages: the participant check (404 for outsiders) and, for DMs, the friendship and block rule (`SC403`). It saves one message of the existing kind `emoji` and broadcasts it live like text, with `"kind": "emoji"` added. Letters, digits, spaces and long values are refused with `SCE01`.
- **Migration** `supabase/migrations/20261026140100_chat_emoji_in_history.sql` (#799). It replaces `public.socialu_conversation_messages` so history includes emoji messages (with `"kind": "emoji"`; text messages keep exactly the same fields). It also replaces `public.socialu_conversation_list` so the list preview shows the latest emoji. That function keeps LN's school-community rules (from `20261026000100_school_communities.sql`): groups follow the shared participant check, and where her migration is installed, a DM with a student from another school stays hidden like a blocked one (the migration re-applies her `socialu.community_unavailable` change to the new list). Grants are unchanged.
- **API** `POST /api/conversations/[id]/messages` also accepts `{ "kind": "emoji", "emoji": "😂" }` (#796). It returns `201 { message }`, and a value that isn't exactly one emoji gets 400 `Choose an emoji to send.` (`lib/chat-emoji.ts`). Text messages are unchanged. The sender always comes from the bearer token.
- **Page (#797, #800).** A smiley button in the message box opens the emoji picker (`app/messages/emoji-picker.tsx`). It has a search box ("laugh" finds 😂) over a built-in list of 187 emoji (`lib/chat-emoji.ts`), so no outside service is used. Choosing an emoji sends it right away, and Enter in the search box sends the first match. Escape or **Close** closes the picker, and double-clicks can't send twice. Emoji messages show larger than text, without a bubble, on the sender's side. The Messages list preview shows the emoji too.
- **Testing (#798, #801).** `__tests__/api/emoji-messages.test.ts` covers the route and checks that every emoji in the list passes the server check, once each, including the planned reaction set. `__tests__/database/emoji-messages.test.ts` checks that an emoji is saved as an `emoji` message and sent live, that history matches the live event while text messages are unchanged, the list preview, multi-part emoji, that text and other non-emoji values are refused, outsiders, groups (members only see emoji from their membership period), blocks and server-only grants. It runs with and without LN's school communities migration.

Status: applied to the hosted database on 2026-10-26 and recorded as versions `20261026140000` and `20261026140100`, together with the invitation migrations (see above). LN's school-communities rules were already installed on the hosted database (her migration is not recorded in the history). The hosted list function was checked to match this repo plus her two changes, and it keeps both after the replacement. In the dry run, 🎉 in group 32 and 👋 in DM 17 were saved as emoji and shown in history and the list preview. Text messages kept their fields, "hello" got `SCE01`, and an outsider got `SC404`. After applying: 6 new server-only functions (browser roles denied), 64 messages and 0 invitations (unchanged), and loens1's list and history still load.

### Sender names (SRS-211.1)

SRS-211.1 (LP): the system shows the sender's name with each message.

- **Migration** `supabase/migrations/20261026150000_chat_sender_names.sql` (#830). It replaces `public.socialu_conversation_messages` so the history also returns `senders`, keyed by student ID: each sender's name (display name, or full name) and username. This covers the senders of the returned messages, both students in a private conversation, and every current group member. The messages themselves are returned exactly as before, and the grants are unchanged.
- **Page (#831).** In group chats, the sender's name appears above each run of messages from another member; the student's own messages stay on the right. Screen readers hear the sender's name with every message, in DMs and groups (DMs already show the friend's name in the header). If a live message arrives from someone whose name isn't loaded yet, such as a member who just joined, the page loads the names again.
- **Testing (#832).** `__tests__/api/sender-names.test.ts` covers the route. `__tests__/database/sender-names.test.ts` checks the names for DMs and groups, including display names, a member who joined later, outsiders being refused, and server-only grants. It runs with and without LN's school communities migration.

Status: applied to the hosted database on 2026-10-26 and recorded as version `20261026150000`, together with the group-name migrations, after a rolled-back dry run of all three. Before applying, the hosted history function was checked to match `20261026140100` exactly. In the dry run, group 32's history named both senders by their display names ("Loens", "Test 2") and every message had a named sender. After applying, loens1's group and Messages list load as before.

### Name a group chat (SRS-202.5, SRS-202.6)

SRS-202.5 (LP): the owner or an administrator of a group chat can set or change the group's name, using 1 to 50 characters. SRS-202.6 (LP): members see a named group's name in the conversation header, the Messages list, and group invitations.

- **Migration** `supabase/migrations/20261026160000_chat_name_group.sql` (#834). It adds an optional `group_name` column to `socialu.conversations`. A table check allows names on groups only, with 1 to 50 characters, no spaces at the ends and no control characters. It also adds the server-only `public.socialu_rename_group(p_auth_id, p_conversation_id, p_name)`, which runs the participant check (404 for outsiders) and allows only the group's current owner or administrator (`SCG01`). It turns runs of spaces and line breaks into single spaces and refuses empty or too-long names (`SCG02`). Existing groups keep no name.
- **Migration** `supabase/migrations/20261026160100_chat_group_name_display.sql` (#839). It replaces three functions so the name comes back wherever groups are loaded: the history returns `name`, the conversation list returns the group's name in `name`, and pending invitations return `group_name`. Unnamed groups return no name. DMs are unchanged, the list keeps LN's school-community rules as in `20261026140100`, and the grants are unchanged.
- **API** `PATCH /api/conversations/[id]` with `{ "name": "..." }` returns `{ conversation: { id, name } }` (#835). The student always comes from the bearer token, and other body fields are ignored. Errors: 400 for an empty or too-long name, 403 for students who aren't the owner or an administrator, and 404 when the conversation isn't available.
- **Page (#836, #840).** In a group, the owner or an administrator sees a pencil button next to the title. It opens a small form in place of the title with the current name, a 50-character limit, **Save** and **Cancel** (Escape also cancels); Save is disabled while saving. The new name shows right away, and the Messages list refreshes. Named groups show their name in the header, on the Groups tab and on pending invitations; unnamed groups still show "Group chat". Other members see the new name right away through live updates (#844, below).
- **Testing (#837, #841).** `__tests__/api/group-name.test.ts` covers the route. `__tests__/database/group-names.test.ts` checks that only the owner or an administrator can name a group, and that regular members, invitees, outsiders, DMs, and empty, blank or too-long names are refused with nothing saved. It also checks the name in the history, the list and the pending invitation, that DMs are unchanged, the table check, LN's school rule, and server-only grants. It runs with and without LN's school communities migration.
- **Live updates (#844).** `supabase/migrations/20261026170000_chat_group_name_live.sql` replaces `public.socialu_rename_group` so a saved name is also sent as a `conversation_updated` event (the group's ID and new name) to each current member's private channel, the same way new messages are delivered. The conversation page updates its header, and both Messages pages refresh the list, so members see the new name without reloading. Invited students who haven't joined, former members and outsiders receive nothing. No policy changes were needed, because the existing `realtime.messages` policy already limits each student to their own channel. `__tests__/database/group-names.test.ts` checks who receives the event.

Status: applied to the hosted database on 2026-10-26 and recorded as versions `20261026160000` and `20261026160100`, together with `20261026150000` (sender names), after a rolled-back dry run of all three. They were applied as one all-or-nothing statement from single-line copies of the files (comments removed; same SQL), with guards that stop without changes if group names are already installed, the versions are already recorded, or the replaced functions differ from the checked versions (the hosted list was the `20261026140100` version plus LN's change). In the dry run, run as `service_role`: Testing 2 (owner of group 32) renamed it ("  CSC 351   Squad " became "CSC 351 Squad"). A regular member, a DM, a blank name and a 51-character name were refused. The name showed in the history, the Messages list and a new invitation, and the DM kept the friend's name. After applying: the `group_name` column and its check exist, existing groups have no name, browser roles are denied, LN's school rule is kept, and data is unchanged (16 conversations, 67 messages, 1 invitation).

Live updates (`20261026170000`) status: applied to the hosted database on 2026-10-26 and recorded as version `20261026170000`, after a rolled-back dry run. Before applying, the hosted rename function was checked to match `20261026160000`. In the dry run, run as `service_role`: a regular member's rename was refused, the owner's rename was saved, and exactly one `conversation_updated` event went to each of group 32's two members and none to anyone else. After applying: the function sends the event, only `service_role` can run it, and data is unchanged.

### Message notifications (SRS-212.9)

SRS-212.9 (LP): when a message is sent in a private or group conversation, each other current participant gets a notification that identifies the sender and the conversation.

- **Where they show.** A new **Messages** tab on the Notifications page sits beside Notifications and Friend requests. It lists messages the student hasn't seen yet, one entry per conversation ("Sam sent a message in Study group (3 new)", with a preview and the time), which opens that conversation. It also lists pending group invitations, with **Accept** and **Decline**. A message the student watches arrive in an open conversation is marked read right away (SRS-212.5), so it never shows. Opening the conversation clears its entry.
- **Live (Supabase Realtime).** The tab refreshes as soon as a message arrives, a group is renamed, or the student is invited to a group, and again when the window regains focus. Its count shows on the tab.
- **Counts on the bell and the Messages link.** The header bell adds the message notifications (one per conversation with unseen messages, plus pending group invitations) to its number. When those are the only new ones, it opens the Messages tab (`/notifications?tab=messages`). The Messages link in the navigation shows the same number on its icon. Both update live and drop as soon as the student opens the conversation. They share one copy of the notifications with the Messages tab (`components/chat/message-notifications.tsx`), and every page shares one live channel (`lib/realtime-client.ts`), because Supabase allows only one channel per topic in a tab.
- **Open the conversation.** Each message notification is one link, avatar, text and an **Open chat** button included, that opens the conversation it is about.
- **Migration** `supabase/migrations/20261026180000_chat_message_notifications.sql` (#822). It adds the server-only `public.socialu_message_notifications(p_auth_id)`, built from the existing messages and `message_reads` tables, so no new table is needed. Visibility follows the Messages list (blocked or deactivated DMs are hidden, and groups use the shared participant check), and LN's school-community rule is re-applied where installed.
- **Migration** `supabase/migrations/20261026180100_chat_group_invitation_live.sql` (#823). It replaces `public.socialu_send_group_invitation` so a newly saved invitation is also sent as a live `group_invitation_created` event to the invited student's private channel. Sending again sends nothing, and everything else is unchanged.
- **API** `GET /api/message-notifications` returns `{ notifications }`, with sender photos as signed links. The student always comes from the bearer token.
- **Teammates' code.** The shared notifications table, `socialu_notifications`, `/api/notifications` and the header bell (LN / MS) are unchanged. On their Notifications page (`components/profile/notifications-view.tsx`), the only change is the extra tab, which renders Chat's `components/chat/message-notifications.tsx`. The other two tabs, their loading and their mark-as-read behavior are untouched.
- **Testing (#824).** `__tests__/api/message-notifications.test.ts` covers the route. `__tests__/database/message-notifications.test.ts` checks:
  - one notification per conversation, with the sender, name, preview and count, and none for the sender;
  - opening the conversation clears it;
  - group messages reach other current members only, not invitees or outsiders, and named groups show their name;
  - the newest notifications come first, and blocked DMs are hidden;
  - new invitations are sent live once, to the invited student only;
  - LN's school rule, and server-only grants.

  It runs with and without LN's school communities migration. `__tests__/chat-live-counts.test.ts` checks that the bell, the Messages link and the tab share one load and one live channel, that a new message or reading a conversation updates the count, and that nothing is loaded when signed out.

Status: applied to the hosted database on 2026-10-26 and recorded as versions `20261026180000` and `20261026180100`, after a rolled-back dry run of both. Before applying, the hosted invitation function was checked to match `20261026120100`. In the dry run, run as `service_role`: loens1 went from 0 to 1 notification ("Test 2, 1 new", DM 17) after Testing 2 sent a message, the sender got none for their own message, and a new invitation went live to testing 1 only (no events to anyone else). After applying: both functions are server-only, LN's school rule is applied, and data is unchanged.

### React to messages (SRS-210.1 to SRS-210.6)

SRS-210.1 to SRS-210.6 (LP): a current participant picks a message in a private or group conversation and reacts with one emoji from the approved set (👍 ❤️ 😂 😮 😢 🙏). The reaction shows with the message, and the student can remove it or change it to another emoji from the set.

- **Migration** `supabase/migrations/20261027120000_chat_reaction_set.sql` (#804). It saves the approved set in the existing `socialu.reaction_options` table, which was empty until the team agreed on it. It also replaces the shared `socialu.validate_message_receipt` trigger function from `schema.sql`, so reactions are allowed for current participants of private conversations as well as groups (UR-210 covers both). The function still requires that the student can read the message. Read receipts, which use the same function, are checked exactly as before.
- **Migration** `supabase/migrations/20261027120100_chat_react_to_message.sql` (#807, #814, #818). It adds two server-only functions:
  - `public.socialu_react_to_message(p_auth_id, p_conversation_id, p_message_id, p_emoji)` adds the student's reaction or replaces it. Each student has at most one reaction per message (the table's primary key).
  - `public.socialu_remove_reaction(p_auth_id, p_conversation_id, p_message_id)` removes only the student's own reaction.

  Both run the participant check (404 for outsiders) and accept only sent text and emoji messages in that conversation that the student may read (`SCR04`). Reacting also needs an emoji from the set (`SCR01`) and, in DMs, the same friendship and block rule as sending (`SCR03`); removing doesn't. Both return the message's reactions (each emoji, its count, and whether it is the student's own). A change is also sent live as a `reaction_updated` event to each participant who can read the message, through their private channel. Choosing the same emoji again, or removing a reaction that is already gone, changes nothing and sends nothing.
- **Migration** `supabase/migrations/20261027120200_chat_reactions_in_history.sql` (#811). It replaces `public.socialu_conversation_messages` so the history also returns `reactions`, keyed by message ID, in the same shape as the live event. The messages themselves are unchanged, and the grants are unchanged.
- **API** (#808, #815). `PUT /api/conversations/[id]/messages/[messageId]/reaction` with `{ "emoji": "👍" }` adds or changes the reaction. `DELETE` on the same address removes it. Both return `{ conversation_id, message_id, reactions }`. The student always comes from the bearer token, and other body fields are ignored. Errors:
  - 400 for an emoji outside the set;
  - 403 when reactions aren't allowed in a DM right now;
  - 404 when the conversation or the message isn't available, or for malformed IDs.
- **Page (#802, #805, #809, #812, #816, #819).** Each message has a **React** button beside its bubble. It shows on hover or keyboard focus, and always on touch screens. It opens the six emoji under that message, with the student's current reaction marked; Escape closes them.
  - Choosing an emoji adds it or replaces the student's reaction. Choosing their current one again removes it.
  - Reactions show as chips under the message with their counts, in the order of the set, and the student's own is highlighted. Selecting their own chip removes it, and selecting another chip changes theirs to it.
  - Other participants see changes right away through live updates, and double-clicks can't send twice.
- **Testing (#803, #806, #810, #813, #817, #820).** `__tests__/api/message-reactions.test.ts` covers the set, the two routes and the error answers. `__tests__/database/message-reactions.test.ts` checks:
  - the database set matches the page's;
  - adding, changing (still one reaction per student), removing only the student's own, and counts per emoji;
  - the history and the live events, with each student's own reaction marked;
  - refused emoji, messages from another conversation, outsiders, invitees, members who joined later or left, and blocks;
  - the table rule, that read receipts are unchanged, and server-only grants.

  It runs with and without LN's school communities migration.

Status: applied to the hosted database on 2026-10-27 and recorded as versions `20261027120000`, `20261027120100` and `20261027120200`, after a rolled-back dry run of all three. They were applied as one all-or-nothing statement from single-line copies of the files (comments removed; same SQL), with guards that stop without changes if reactions are already installed, the reaction tables aren't empty, the versions are already recorded, or the replaced history and trigger functions differ from the checked versions. In the dry run, run as `service_role`: in DM 17, loens1 reacted 👍 and changed it to ❤️ (still one reaction), choosing ❤️ again changed nothing, Testing 2 added 😂, the history showed both with each student's own marked, and loens1's removal left only Testing 2's. An emoji outside the set (`SCR01`), an outsider (`SC404`) and a message from another conversation (`SCR04`) were refused. Each change went live to both students in the DM and to nobody else, and a reaction in group 32 went to both members. After applying: the six reactions are saved, the new and replaced functions match this repo, only `service_role` can run them, both triggers are in place, there are no reactions yet, and loens1's DM and group history load as before.

### Assign administrator privileges (SRS-204.2)

SRS-204.2 (LP): when the group owner assigns administrator privileges to a selected member, that member's group role becomes administrator. Traces to UR-204.

- **Migration** `supabase/migrations/20261028120000_chat_assign_group_admin.sql` (#883). Two new server-only functions, additive only:
  - `public.socialu_group_members(p_auth_id, p_conversation_id)` returns the group's current members with their names and roles, owner first, so the owner can select one (SRS-204.1). Any current member may read it; invitees and outsiders get `SC404`.
  - `public.socialu_assign_group_admin(p_auth_id, p_conversation_id, p_username)` gives one selected current regular member the administrator role.

  The surrounding UR-204 rules are enforced here because the role change cannot be correct without them: only the owner may assign (`SCA01`, SRS-204.5), a group has at most one administrator so a second assignment is refused (`SCA02`, SRS-204.3 / SRS-204.4), the chosen student must be a current regular member (`SCA03`, SRS-204.1), and the owner's own row is never touched (SRS-204.9). The conversation row is locked while assigning, so two assignments at the same moment cannot both pass the one-administrator check.
- **API** `GET /api/conversations/[id]/members` returns `{ student_id, members }`. `PATCH` on the same address with `{ "username": "...", "role": "administrator" }` assigns the administrator and returns the member's new role. The student always comes from the bearer token, and other body fields are ignored.
- **Page (#883).** A **Members** button in a group's header opens the member list, showing each member's name, username and role. The owner also sees **Make admin** beside each regular member; those buttons disappear once the group has an administrator, with a note that a group can have one at a time. Closing the panel reloads the conversation so the header reflects any role change.
- **Testing.** `__tests__/api/group-administrator.test.ts` covers both routes and every error answer. `__tests__/database/group-administrator.test.ts` checks the member list and its access rules, that only the owner can assign, that regular members, invitees, outsiders and DMs are refused, that the chosen student must be a current regular member, the one-administrator rule (including the table's own constraint), that ownership and other roles never move, that a member who left is not eligible, and server-only grants. It runs with and without LN's school communities migration.

Status: not yet applied to the hosted database. Until it is, the Members panel reports that chat is unavailable and nothing else changes.

### Revoke administrator privileges (SRS-204.6)

SRS-204.6 (LP): the group owner can revoke administrator privileges from the currently assigned administrator. Traces to UR-204.

- **Migration** `supabase/migrations/20261028120100_chat_revoke_group_admin.sql` (#884). One new server-only function, `public.socialu_revoke_group_admin(p_auth_id, p_conversation_id, p_username)`, which returns the named administrator to regular-member status (SRS-204.7). Only the owner may revoke (`SCA04`, SRS-204.8), and the owner's own row is never touched (SRS-204.9). A group with no administrator, a student who is only a regular member, and a student outside the group all get the same answer (`SCA05`), so the panel cannot be used to learn about other students. Once the position is vacant the owner can assign someone else (SRS-204.4).
- **API** `PATCH /api/conversations/[id]/members` also accepts `{ "username": "...", "role": "member" }`, which takes the administrator role back. `"role": "administrator"` still assigns it, and any other role is refused before the database is called.
- **Page (#884).** In the Members panel the owner sees **Remove admin** beside the current administrator. Taking the role back frees the position, so the **Make admin** buttons reappear beside the regular members.
- **Testing.** `__tests__/api/group-administrator.test.ts` covers the revoking half of the route, including that it never calls the assign function. `__tests__/database/group-administrator.test.ts` checks that there is nothing to revoke before an administrator exists, that regular members, the administrator themselves, outsiders and DMs are refused, that naming anyone other than the administrator is refused, that the role returns to member while ownership and other roles stay put, that revoking twice finds nobody, that the position can then be given to someone else, and server-only grants. It runs with and without LN's school communities migration.

Status: not yet applied to the hosted database, and it is applied together with `20261028120000`.

### Remove a regular group member (SRS-205.10)

SRS-205.10 (LP): the group owner or administrator can remove a regular member from the group. Traces to UR-205.

- **Migration** `supabase/migrations/20261028120200_chat_remove_group_member.sql` (#885). One new server-only function, `public.socialu_remove_group_member(p_auth_id, p_conversation_id, p_username)`, which ends that student's current membership by stamping `left_at` (SRS-205.11). The membership row is kept rather than deleted, which is what makes the rest of UR-205 true with no extra work: the shared `is_current_participant` check already excludes a student whose membership ended, so nothing sent afterwards reaches them and they cannot send or react (SRS-205.12), while `can_read_message` still matches messages from their membership period (SRS-205.13). Only the owner or the administrator may remove (`SCM01`, SRS-206.2, SRS-206.9), and only a current regular member can be removed, which is what protects the owner from the administrator (`SCM02`, SRS-206.6).
- **API** `DELETE /api/conversations/[id]/members?username=...` removes that member and returns the group's remaining member count.
- **Page (#885).** In the Members panel the owner and the administrator see **Remove** beside each regular member. The owner, the administrator and anyone outside the group have no Remove button, and the server refuses them anyway.
- **Testing.** `__tests__/api/group-administrator.test.ts` covers the route and its error answers. `__tests__/database/group-member-removal.test.ts` checks that a regular member cannot remove anyone, that the owner and the administrator can, that the owner, the administrator, yourself and outsiders cannot be removed, that removing twice finds nobody, that the removed student keeps `can_read_message` access to earlier messages but not later ones and can no longer send or react, that the rows are kept rather than deleted, and server-only grants. It runs with and without LN's school communities migration.

**Finding (noted on #885).** `public.socialu_conversation_messages` still gates on `is_current_participant`, so a removed student cannot open the conversation at all, even though the data layer preserves the messages they could already see. Showing that preserved history to a former member is SRS-205.13's own work, and the same gap applies to SRS-207.5 and SRS-208.7 for students who leave. The removal itself is unaffected.

Status: not yet applied to the hosted database, and it is applied together with `20261028120000` and `20261028120100`.

### Leave as a regular member (SRS-207.1)

SRS-207.1 (LP): a regular group member can leave the group. Traces to UR-207.

- **Migration** `supabase/migrations/20261028120300_chat_leave_group.sql` (#886). One new server-only function, `public.socialu_leave_group(p_auth_id, p_conversation_id)`, which ends the student's own current membership by stamping `left_at` (SRS-207.3). As with removal, the membership row is kept, so the shared participant check stops anything sent afterwards (SRS-207.4) while `can_read_message` still matches messages from their membership period (SRS-207.5). An administrator who is not the owner leaves through the same path, which is SRS-207.2 and needs no separate code. The owner is refused while the group has no administrator (`SCL01`, SRS-208.1, SRS-208.9), so a group is never left without one; promoting that administrator and letting the owner go is SRS-208.2's own work.
- **API** `POST /api/conversations/[id]/leave`. The student comes only from the bearer token and the route takes no student from the request, so nobody can use it to make someone else leave.
- **Page (#886).** **Leave group** sits at the foot of the Members panel for anyone who is not the owner. The owner sees why instead: either that they need an administrator first, or that they hand the group to their administrator when they go. After leaving, the student returns to the Messages list, which no longer lists that group.
- **Testing.** `__tests__/api/group-leaving.test.ts` covers the route, that it passes no student ID, and its error answers. `__tests__/database/group-leaving.test.ts` checks that outsiders, private conversations and unknown accounts are refused, that the owner cannot leave without an administrator, that a regular member and an administrator can and the position is freed, that leaving twice is refused, that the departed student keeps `can_read_message` access to earlier messages but not later ones and can no longer send or react, that exactly one owner remains, and server-only grants. It runs with and without LN's school communities migration.

Status: not yet applied to the hosted database, and it is applied together with `20261028120000`, `20261028120100` and `20261028120200`.

