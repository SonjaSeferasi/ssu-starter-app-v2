# SocialU database schema review

Status: executable review draft; human peer reviews are pending.

The single submission script is `database/schema.sql`. It builds a dedicated `socialu` schema on a clean PostgreSQL database and deliberately removes that schema and dependent objects on every rerun. It does not migrate the existing Supabase starter schema or implement application integration.

## Requirements baseline

Use the latest editable `documentation/SocialU_SRS_Editable.docx` and the aligned `documentation/user_requirements.md`, revised 28 September 2026. The CSV maps all 881 functional records (including retained retired/deferred records) and 65 uniquely numbered NFRs. The earlier 178-page PDF is preserved in the integration backup. A storage dependency does **not** assert that its entire feature has been implemented.

The 28 September revision adds eight trace rows for clarified controls, attempt exit, Wordle retry/day handling and the proposed return-wait target. These use existing data or transient interface state; no SQL schema change was needed. The previously recorded schema validation result has not been re-run or relabeled by this document-only update. Human peer reviews remain pending.

This design follows the confirmed one-university release, one shared participation streak, accepted non-friend message requests, renewed consent after unfriending, conversation-only Snipes, Trending based on active likes within 168 hours, same-university event invitations, optional Wordle and deferred post/event drafts. There are no tables for draft posts/events, university transfers, trophies, leaderboards, real-money payments, multiplayer synchronization or alternate dorm layouts.

## Run and rerun

```powershell
psql -v ON_ERROR_STOP=1 -d socialu_schema_test -f database/schema.sql
psql -v ON_ERROR_STOP=1 -d socialu_schema_test -f database/schema.sql
```

Use an empty development database owned by the testing role. Rerunning erases the dedicated `socialu` schema and its data. The transaction rolls back the build if any statement fails. No database extensions or Supabase `auth.users` table are required. Application integration must explicitly use the `socialu` schema and map the existing authentication provider before deployment.

## Review assignment

Exactly one proposed reviewer appears per table, with their full name. These are assignments, **not completed-review attestations**. All six people must perform the review and update their own comment labels before submission. Feature owners and proposed peer reviewers are different; all tables were drafted with AI assistance for team review.

| Proposed reviewer | Tables assigned |
| --- | ---: |
| LN (Linh Nguyen) | 12 |
| LP (Loens Paul) | 7 |
| MS (Merieme Sakhsoukhi) | 2 |
| KB (Kabanga Mbangu) | 15 |
| DP (Darrin Phimphisane) | 15 |
| SS (Sonja Seferasi) | 8 |

## Decisions still required before the team freezes the SRS/schema

These are genuine specification gaps, not permission to invent seed data. The SQL creates the structures now; relevant configuration remains empty until approved.

| Existing requirement | Required clarification or content |
| --- | --- |
| SRS-100.5; SRS-101.3 | Actual university name and allowed email domains. |
| SRS-210.2 | Exact fixed reaction emoji set. |
| SRS-304.1; SRS-NFR-41 | Accepted feed photo MIME types; the 10 MB size is already defined. |
| SRS-510.2 | Snipe accepted MIME types and maximum upload bytes. |
| SRS-314.2/3 | Definition of a valid report and whether each reporter may count only once. |
| SRS-312.4 | Duration of the like-notification grouping period. Raw notification times support any agreed duration. |
| SRS-112.4; SRS-113.13 | Who can create/remove ordinary feed-post tags and what consent is required. The promised Tagged view needs its existing relationship stored. |
| SRS-520.3; SRS-525.2; SRS-526.5/17; SRS-528.6 | Reward amounts and exact completion/replay eligibility. The rule table has no invented rates. |
| SRS-503.1; SRS-500.8/9/10; SRS-529.1/7 | Real catalog entries, default outfit/faces, four starter items, prices, room grids, protected cells and allowed overlaps. |
| SRS-618.1; SRS-616.1 | Authored course assets for Levels 1-3; include Level 4 only if delivered. |
| SRS-624.1/6 | Approved Wordle dictionary and daily puzzle schedule, only if Wordle is included. |
| SRS-613.12/13; SRS-526.3 | Trusted late-activity delivery/correction policy. Do not backdate arbitrary browser claims. |

Approved clarifications should amend the existing SRS items, keeping their identifiers, before final submission. They should not remain undocumented application-only decisions.

## Schema versus application responsibilities

- The script enforces required fields, option sets, PKs/FKs, uniqueness, selected cross-table business rules, purchase atomicity and append-only rewards. The table dictionary and CSV show the data dependencies.
- The server must authenticate the acting student and enforce owner/recipient permissions on every operation. Tables and functions are private to the database owner until deployment grants are explicitly configured. This is not an implemented Supabase RLS layer or proof of end-to-end access security.
- Registration validates plaintext password rules before hashing; one-time code verification checks the digest, consumed state and active/grace deadlines. Registration/resend code generation, email sending, 30-second resend waiting, login counter updates, session revocation and secure digest algorithms remain authentication-service responsibilities. The required dates and states are stored.
- Chat must atomically insert group creation plus its first owner, accepted invitations plus membership, and an accepted request plus its one delivered introduction. Deferred ownership constraints are checked at transaction end. Former members read only messages inside their recorded membership periods; private history remains accessible after blocks, with new sends denied. Personal message hiding filters the sender only. Replies and previews use the same visibility predicate.
- Feed operations must apply current account, friendship and block visibility checks. Trending candidates still require viewer-specific filtering. Notification grouping and unread rendering are queries/UI behavior, not additional counter tables.
- Dorm saves use `UPDATE dorms SET save_version = save_version + 1 WHERE owner_id = :owner AND save_version = :expected RETURNING save_version` in the same transaction as placement changes; zero updated rows means rollback and reload. Owner authorization stays in the server. Catalog geometry must be treated as published configuration and revalidated against placements when changed.
- Snipe creation inserts the request and every original tag, then seals `review_locked = TRUE` in one transaction. No later tag additions are allowed. Consent updates derive rejection, closure, publication or withdrawal. The server authenticates each respondent, expires pending records on access and by scheduled processing, protects private media and stops serving a removed photo. Approval records do not make a public storage URL safe.
- Streak processing serializes on the account and evaluates every elapsed local day in order before current activity. It creates played/forgiven/reset/inactive day outcomes and streak identities under the agreed Sunday-Saturday rules. The schema provides one source of truth, validates time zones/dates and caps forgiven misses at three per week; it does not run a daily background job by itself.
- Points credit only authenticated activity proof. The trigger calculates configured amounts and serializes ledger changes; purchases automatically grant their matching ownership in that same transaction. On duplicate action/source keys, the server retrieves the existing committed result. Normal game replay eligibility needs the still-open SRS policy. No transaction changes already-earned points on Snipe removal or a lost streak.
- Level geometry lives in authored course assets; movement, uncollected coins, pause state, unsaved edits and failed uploads remain transient client state. Only confirmed completions persist. Wordle retains accepted guesses to restore today; the result query exposes only the current Eastern-Time date. Historical rows do not introduce a historical statistics feature.
- A foreign key cannot verify decoded image bytes, actual game completion, English vocabulary, email delivery, network timing or UI accessibility. Those requirements need implementation/testing beyond this schema.

## Table and column rationale

Every table below lists its direct SRS references. Surrogate IDs provide stable row identity; all relationship IDs are foreign keys. Other stored columns are accounted for explicitly.

### `university`

Supports: SRS-101.3, SRS-113.4, SRS-106.4.

university_id is fixed at 1 to enforce one launch university; name identifies that university in registration and profiles.

### `university_domains`

Supports: SRS-100.5, SRS-106.4.

domain is an approved email suffix; university_id relates it to the single launch university.

### `students`

Supports: SRS-100.1, SRS-100.2, SRS-100.3, SRS-100.4, SRS-100.5, SRS-100.6, SRS-100.9, SRS-100.10, SRS-103.5, SRS-103.6, SRS-106.8, SRS-106.9, SRS-123.6, SRS-123.9, SRS-NFR-14.

full_name/username/email identify the account; generated email_domain enforces the approved-domain relationship. password_digest stores a one-way digest, not a password. email_verified_at, failed_login_count, reverification_required and is_active support verification, login restrictions and deactivation.

### `authentication_challenges`

Supports: SRS-101.1, SRS-101.4, SRS-101.6, SRS-102.1, SRS-102.4, SRS-102.5, SRS-104.2, SRS-104.3, SRS-106.6, SRS-106.7.

purpose separates registration, re-verification, reset and email-change challenges. destination_email preserves the pending replacement destination. code_digest identifies the issued code securely. generated_at/sent_at/expires_at/replaced_at/consumed_at support validity, resend waiting, the 10-second previous-code grace interval and one-time use.

### `login_sessions`

Supports: SRS-103.12, SRS-104.12, SRS-105.14, SRS-105.15, SRS-107.2, SRS-107.3, SRS-107.4, SRS-107.5, SRS-107.6, SRS-107.8, SRS-108.5, SRS-NFR-22.

student_id owns a session; token_digest identifies it without storing a bearer token. signed_in_at/location_text support login history. remember_me and revoked_at support remembered sessions and local/remote logout. Active status is derived from revoked_at.

### `upload_policies`

Supports: SRS-109.3, SRS-109.4, SRS-201.4, SRS-201.5, SRS-201.13, SRS-510.2, SRS-609.3, SRS-609.4, SRS-NFR-41.

upload_context and mime_type identify an allowed format for a specific workflow; max_bytes supplies that workflows documented size limit. Unagreed policies are intentionally absent.

### `media_assets`

Supports: SRS-109.2, SRS-304.3, SRS-201.6, SRS-201.14, SRS-510.2, SRS-609.8.

owner_id identifies the uploader; storage_key locates the accepted private object. upload_context/mime_type/byte_count enforce the appropriate upload policy. Bytes, MIME type and readability must be determined from the actual file by the server, not trusted from a browser.

### `student_profiles`

Supports: SRS-109.2, SRS-109.5, SRS-109.6, SRS-109.7, SRS-109.8, SRS-109.9, SRS-110.5, SRS-110.6, SRS-113.2, SRS-113.3, SRS-113.5, SRS-113.6, SRS-113.7.

photo_id/major/class_year/bio support required setup. setup_completed allows a newly registered account to exist before required profile fields are supplied. display_name and display_name_changed_at implement the optional displayed name and seven-day change interval. Names fall back to students.full_name before a display name is selected.

### `friend_requests`

Supports: SRS-114.2, SRS-114.3, SRS-115.9, SRS-116.2, SRS-117.1, SRS-119.7, SRS-120.4, SRS-121.6, SRS-507.4.

sender_id/recipient_id identify the directed request. status and requested_at/decided_at record its lifecycle; friendship_ended_at ends an accepted connection without erasing the timestamp needed to invalidate older messaging consent. current_friendships is a view over accepted, unended requests.

### `student_blocks`

Supports: SRS-121.4, SRS-121.8, SRS-121.9, SRS-121.10, SRS-121.11, SRS-122.9.

blocker_id/blocked_id preserve the direction of a current block. Removing a row unblocks without recreating a friendship.

### `student_preferences`

Supports: SRS-601.1, SRS-601.4, SRS-601.7, SRS-627.2, SRS-627.4, SRS-627.9, SRS-NFR-62.

navigation_position stores Side/Bottom; theme stores Light/Dark. Defaults match the reviewed SRS; Light remains a proposed default there.

### `conversations`

Supports: SRS-200.3, SRS-200.4, SRS-200.5, SRS-200.6, SRS-202.1, SRS-202.2, SRS-203.3, SRS-NFR-36.

kind distinguishes a two-person private conversation from a group. created_by records its initiator. The ordered private_student_low/high pair enforces exactly two distinct participants and only one conversation per pair; group rows have neither private endpoint.

### `group_memberships`

Supports: SRS-202.3, SRS-203.4, SRS-204.2, SRS-204.3, SRS-205.12, SRS-205.13, SRS-207.5, SRS-208.2, SRS-213.5, SRS-NFR-34, SRS-NFR-35.

conversation_id/student_id identify membership; joined_at/left_at preserve historical visibility periods, including leave/rejoin periods. role identifies the current owner, administrator or regular member; partial unique indexes and deferred checks enforce ownership and administrator counts.

### `group_invitations`

Supports: SRS-205.1, SRS-205.3, SRS-205.5, SRS-205.6, SRS-205.8.

conversation_id/inviter_id/invitee_id identify an invitation. status records pending, accepted or declined without making a pending invitee a member.

### `message_requests`

Supports: SRS-200.7, SRS-200.8, SRS-200.9, SRS-200.11, SRS-200.12, SRS-200.14, SRS-200.17, SRS-200.18, SRS-NFR-26.

sender_id/recipient_id/initial_text supply the pending request. status/created_at/decided_at support decisions and renewed consent after an ended friendship. Initial text remains here; a delivered introduction references it rather than copying the text into messages.

### `messages`

Supports: SRS-201.1, SRS-201.6, SRS-201.8, SRS-201.14, SRS-201.17, SRS-209.4, SRS-211.3, SRS-211.4, SRS-211.5, SRS-200.14, SRS-NFR-26.

conversation_id/sender_id identify context and authorship. kind selects exactly one payload: text_content, asset_id, gif_reference or accepted_request_id. reply_to_id has a composite FK that requires the same conversation. status and created_at/sent_at distinguish failed retryable messages from delivered messages. Client-only failures may remain client state until they can be saved.

### `message_reads`

Supports: SRS-211.6, SRS-211.7, SRS-211.8, SRS-212.1, SRS-212.5, SRS-603.1.

message_id/student_id identify each read receipt; read_at records when the read was acknowledged. Missing receipts mean unread. Group receipt detail is not exposed to other members.

### `hidden_messages`

Supports: SRS-119.10, SRS-119.11, SRS-119.12, SRS-119.13.

message_id alone is sufficient: its sender is the only account allowed to hide that own message. The server filters only that senders view; the original message remains available to recipients.

### `hidden_conversations`

Supports: SRS-207.6, SRS-207.7.

conversation_id/student_id identify the former members personal history deletion, independent of other members views.

### `reaction_options`

Supports: SRS-210.2, SRS-210.3.

emoji holds one approved choice. The agreed fixed set must be loaded by the team.

### `message_reactions`

Supports: SRS-210.3, SRS-210.4, SRS-210.5, SRS-210.6.

message_id/student_id prevent duplicate reactions by one person; emoji references an approved option and can be replaced.

### `posts`

Supports: SRS-303.2, SRS-303.3, SRS-305.3, SRS-306.2, SRS-306.4, SRS-307.3, SRS-315.1, SRS-315.2, SRS-315.3, SRS-405.1.

author_id stores authorship once. text_content stores the caption/text; visibility is public or friends_only. published_at provides chronology and Trending tie-breaking; edited_at supplies the Edited indicator. No draft status exists.

### `post_photos`

Supports: SRS-304.1, SRS-304.3, SRS-304.4, SRS-306.3, SRS-NFR-41.

post_id/asset_id relate accepted photos to their post without copying image metadata.

### `post_tags`

Supports: SRS-112.4, SRS-113.13.

post_id/student_id support the SRS profile Tagged category. The SRS still needs to specify the feed-tag creation/removal interaction; the schema does not invent it.

### `post_likes`

Supports: SRS-308.2, SRS-308.3, SRS-309.1, SRS-405.2, SRS-405.3, SRS-405.4.

post_id/student_id enforce one active like; liked_at is the latest like time. Unliking deletes the row; reliking creates a new row with a new time. Counts and Trending are derived.

### `post_comments`

Supports: SRS-310.1, SRS-310.2, SRS-310.3, SRS-311.4, SRS-311.5.

post_id/author_id/text_content/created_at are the comment association, author, content and display time.

### `post_reports`

Supports: SRS-314.1, SRS-314.2, SRS-314.3, SRS-314.5, SRS-NFR-43.

post_id/reporter_id identify an accepted report. The fifth accepted row triggers post deletion. What makes a report valid and whether repeat reporters count remain SRS decisions unless amended below.

### `events`

Supports: SRS-400.1, SRS-400.2, SRS-400.3, SRS-400.4, SRS-400.5, SRS-400.6, SRS-404.7, SRS-404.9, SRS-NFR-45.

creator_id identifies the event owner. title/description/location/starts_at supply all event details; starts_at stores one actual timestamp rather than unrelated date and time strings. status records active or cancelled. No event draft is stored.

### `event_invitations`

Supports: SRS-402.1, SRS-402.3, SRS-402.5, SRS-403.2, SRS-403.3, SRS-403.4, SRS-403.5, SRS-404.11.

event_id/invitee_id identify one invitation per student and event; rsvp records the current pending/attending/not_attending response. Event changes are read from events, not copied into invitations.

### `notifications`

Supports: SRS-114.7, SRS-116.4, SRS-116.5, SRS-312.1, SRS-312.2, SRS-312.3, SRS-312.4, SRS-313.1, SRS-313.2, SRS-313.3, SRS-NFR-42.

recipient_id/actor_id identify who is notified and who acted. kind plus one typed target identifies a request, liked post or comment (the comment already identifies its post). created_at permits grouping likes within the teams eventual grouping window.

### `activities`

Supports: SRS-607.1, SRS-607.2, SRS-615.1, SRS-623.1.

activity_code identifies the three named activities; name/description/instructions provide Game Room content. included gates an optional or unreleased activity. Wordle starts disabled.

### `catalog_items`

Supports: SRS-503.1, SRS-522.2, SRS-522.7, SRS-529.1, SRS-529.5, SRS-529.7, SRS-608.1.

kind distinguishes furniture, decoration, complete outfits and wall/floor appearances. name/preview_key supply the offer display. price_points/purchasable/unavailable_reason represent the current offer. starter_slot identifies the four specified free starter items; is_initial_outfit identifies the default outfit without guessing an asset.

### `owned_items`

Supports: SRS-503.1, SRS-503.4, SRS-505.6, SRS-522.6, SRS-523.1, SRS-524.2, SRS-608.1.

student_id/item_id enforce one ownership per catalog item. purchase_transaction_id links paid ownership to its exact ledger transaction; NULL denotes a free starter/default entitlement, granted by trusted initialization code.

### `default_faces`

Supports: SRS-607.4, SRS-608.4, SRS-608.5.

asset_key identifies a provided face; is_initial identifies the initial default, with at most one such row.

### `avatar_photo_faces`

Supports: SRS-609.6, SRS-609.7, SRS-609.8, SRS-609.14, SRS-610.1.

student_id/photo_id identify the saved face source. crop_x/y/width/height are normalized image fractions, not screen pixels. processed_face_key stores a successful optional background-removal output. Unsaved crops remain editor state.

### `student_avatars`

Supports: SRS-608.3, SRS-608.5, SRS-610.1, SRS-610.2, SRS-504.1, SRS-NFR-62.

student_id identifies one saved avatar. outfit_id must reference that students ownership. Exactly one of default_face_id/photo_face_id identifies the selected face; a composite FK prevents selecting another students saved photo face.

### `room_surfaces`

Supports: SRS-500.2, SRS-500.8, SRS-529.7.

surface_code identifies an authored room placement surface; width_cells/height_cells are its grid bounds.

### `reserved_room_cells`

Supports: SRS-500.9.

surface_code/x/y identify each protected entrance/exit cell. No separate door-position table is needed for DormHall: its doors are derived from ordered current friendships.

### `item_footprints`

Supports: SRS-500.2, SRS-500.7, SRS-500.8, SRS-529.7.

item_id identifies a placeable catalog item; surface_code and width_cells/height_cells define its fixed footprint. overlap_category supplies the promised catalog explanation; compatible_item_overlaps supplies actual allowed pairs. No furniture rotation field is stored.

### `compatible_item_overlaps`

Supports: SRS-500.10, SRS-529.7.

item_low/item_high identify an explicitly allowed pair of overlapping item definitions, with no mirrored duplicate pair.

### `dorms`

Supports: SRS-500.13, SRS-500.14, SRS-505.1, SRS-505.5, SRS-505.8, SRS-508.3, SRS-508.4.

owner_id is also the dorm primary key, enforcing one current dorm per account. wall_item_id/floor_item_id reference owned appearance items. welcome_text stores the 500-character welcome page. save_version supports optimistic save checks; applications must condition a whole layout transaction on the expected version.

### `dorm_placements`

Supports: SRS-500.2, SRS-500.3, SRS-500.4, SRS-500.5, SRS-500.6, SRS-505.2.

owner_id/item_id identify one placement of an owned item; x/y are its grid position. Surface and dimensions come from item_footprints rather than being repeated.

### `guestbook_notes`

Supports: SRS-508.9, SRS-508.10, SRS-508.11, SRS-508.13, SRS-508.16, SRS-508.18, SRS-508.20.

dorm_owner_id/author_id/text_content/created_at store exactly the required note record; note_id supplies a stable timestamp tie-break. Editing preserves creation time. Unfriending deletes both directions of former-friend notes.

### `counted_dorm_visits`

Supports: SRS-509.2, SRS-509.3, SRS-509.6, SRS-509.7, SRS-509.8, SRS-509.9.

dorm_owner_id/visitor_id/entered_at record only visits eligible to increase the counter. The total is COUNT(*), so no duplicated mutable counter is stored. Old counted visits survive unfriending.

### `game_levels`

Supports: SRS-616.1, SRS-617.1, SRS-618.1, SRS-618.4.

level_number identifies the level and preceding unlock dependency; course_asset_key references the authored course file containing start, platforms, gaps, hazards, coins and finish flag. The team supplies Levels 1-3; level 4 is optional. Movement, collisions, pause state and unfinished coin positions remain runtime state.

### `wordle_words`

Supports: SRS-624.1, SRS-624.6.

word is one approved A-Z five-letter dictionary entry. English validity comes from the teams approved dictionary, not a database language detector.

### `wordle_puzzles`

Supports: SRS-624.1, SRS-624.12, SRS-625.2.

puzzle_date identifies the shared Eastern-Time puzzle; answer references an approved dictionary word. Answers are server-private.

### `wordle_guesses`

Supports: SRS-624.6, SRS-624.8, SRS-624.9, SRS-624.11, SRS-625.3, SRS-626.1, SRS-NFR-62.

student_id/puzzle_date/guess_number identify each of at most six sequential accepted guesses. word is validated against the dictionary. accepted_at proves its puzzle day; submission_key gives retries a stable identity. Solved/failed state and feedback are derived, not duplicated. Old rows are not exposed by todays-only result queries.

### `participation_settings`

Supports: SRS-613.4, SRS-613.10, SRS-613.11.

student_id/time_zone store the initially reported valid time zone once; later device or travel changes cannot rewrite it.

### `participation_events`

Supports: SRS-613.1, SRS-613.2, SRS-613.13, SRS-526.1, SRS-526.3.

event_id is the stable authenticated activity identifier. student_id/activity_code/occurred_at identify participation. game_level is supplied for a Game 1 attempt start; wordle_guess_id proves an accepted Wordle guess; successful DormSpace opening needs neither. This row never contains a paused game position.

### `streak_instances`

Supports: SRS-613.9, SRS-613.13, SRS-526.18, SRS-526.20.

streak_id identifies a shared streak for unique milestone awards. student_id/started_on/reset_on define its lifetime; there is at most one unreset streak per account. Restarting creates a new instance, not a second feature-specific streak.

### `participation_days`

Supports: SRS-612.4, SRS-613.3, SRS-613.5, SRS-613.6, SRS-613.7, SRS-613.8, SRS-613.9, SRS-613.12, SRS-613.13.

student_id/participation_date give at most one outcome per saved local day. state stores played, forgiven, reset or inactive. streak_id assigns that day to its shared streak; first_event_id proves a played day. Counts and weekly remaining allowance are derived. Upcoming and not-yet-qualified UI states do not require rows.

### `reminder_dismissals`

Supports: SRS-614.1, SRS-614.3, SRS-614.5.

student_id/participation_date suppress further reminder display for that saved local date. This follows the SRS proposed daily dismissal default.

### `level_completions`

Supports: SRS-619.3, SRS-619.4, SRS-619.9, SRS-618.6, SRS-520.4, SRS-528.6.

attempt_id references its accepted Game 1 start, which already supplies student and level. completed_at/collected_coins record the successful result for progression and reward validation. No separate unlocked-level Boolean can contradict completion history.

### `snipe_requests`

Supports: SRS-510.2, SRS-510.9, SRS-510.10, SRS-510.11, SRS-510.12, SRS-512.4, SRS-512.9, SRS-512.11, SRS-514.5, SRS-514.7.

submitter_id/conversation_id/photo_id/submission_key identify the immutable submission and retry. submitted_at/expires_at preserve the 24-hour window. review_locked seals the original tag list in the creation transaction. status/published_at/terminal_reason store the required lifecycle and removed placeholder context; Snipes never become feed posts.

### `snipe_tags`

Supports: SRS-510.5, SRS-510.6, SRS-511.2, SRS-511.3, SRS-511.4, SRS-511.9, SRS-511.11, SRS-513.1, SRS-513.6, SRS-525.2.

snipe_id/student_id retain original distinct targets. identity_yes and sharing_yes are separately nullable unanswered/Yes/No responses. sharing_withdrawn records withdrawal without erasing the original consent/identity used for published rewards. Pair cooldowns derive from the request submission time and original tags.

### `snipe_reports`

Supports: SRS-514.8, SRS-514.10, SRS-514.12, SRS-514.13.

snipe_id/reporter_id/reason store a report; status/resolved_by identify unresolved, dismissed or removed review and its group manager. Reports exist only for group Snipes.

### `reward_rules`

Supports: SRS-520.3, SRS-523.8, SRS-525.2, SRS-526.5, SRS-526.17, SRS-528.1, SRS-528.5, SRS-528.6.

category/points_per_unit define the approved rate; milestone_days is restricted to 7, 14 and 30 for milestone rules. eligibility_text supplies the earning explanation; is_current selects the active rule. Rule versions preserve referenced history; a ledger entry records the historical amount.

### `point_transactions`

Supports: SRS-520.1, SRS-523.1, SRS-523.3, SRS-523.4, SRS-523.5, SRS-523.7, SRS-525.1, SRS-526.6, SRS-526.18, SRS-527.2, SRS-527.3, SRS-527.5, SRS-NFR-49, SRS-NFR-50.

student_id/category/points_change/recorded_at record a balance change; transaction_id provides per-account committed order and action_key retry identity. reward_rule_id/reward_units explain rewards. Exactly the appropriate typed source is set: snipe_id, attempt_id, participation_date, streak_id plus milestone_days, or purchased_item_id. Balance and historical resulting balances are calculated from the ledger; they are not separately editable columns.

## Verification

- Built and reran successfully in **PostgreSQL 18.3 (PGlite 0.5.8) on wasm32-unknown-emscripten, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5), 32-bit**.
- **59 tables**, each with a primary key; all 59 table comment blocks have exactly one proposed reviewer.
- **74 checks passed**, with 0 failures: fresh/repeated builds, populated reset, representative valid workflows and rejected invalid data.
- The test database is isolated and temporary. No live app database was changed. This is a real PostgreSQL engine compiled to WebAssembly through PGlite, not a native PostgreSQL service test. The team should also run the two commands above on its chosen native PostgreSQL environment before submission.
- Multi-session race/load testing, authenticated API authorization, real image/game proof validation and end-to-end UI/NFR verification are not asserted complete.
- Table references were checked against all 938 records in the reviewed SRS. The CSV distinguishes direct storage, shared dependencies, conditional features and requirements with no new storage. The dictionary accounts for every table and explains its columns; human peer review remains required.

Technical references used while checking the SQL: [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html), [PGlite PostgreSQL runtime](https://pglite.dev/docs/about), and [PGlite batch execution](https://pglite.dev/docs/).
