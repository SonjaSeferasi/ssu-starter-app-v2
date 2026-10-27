# Linh’s SRS branches

Organize related requirements together because they share forms, session handling, validation, and database operations. Include the specific SRS requirement in commit messages.

| Branch | Requirements | Purpose |
| --- | --- | --- |
| `linh/srs-100-105-authentication` | SRS 100–105 | Registration, verification, resend codes, login, password reset, password change |
| `linh/srs-106-108-123-account-settings` | SRS 106–108 and 123 | University email changes, login activity, logout, account deactivation |
| `linh/srs-109-113-profile` | SRS 109–113 | Profile setup, editing, activity summary, content filters, viewing student profiles |
| `linh/srs-114-122-friendships` | SRS 114–122 | Friend requests, friends search, profile messaging entry, removal, blocking and unblocking |

The authentication branch contains the current account-page work. The other three branches begin at the current main baseline for future work; creating them does not mean those requirements are implemented. Live authentication still requires Supabase credentials, the account migrations, and hosted email configuration.

The older per-requirement branches and `linh/srs-100-105-account-pages` are consolidated into the four groups above. `linh/socialu-work` is retained as an older reference. Main and teammates’ branches are not changed by this organization.

Before consolidation, a local recovery bundle was saved at `/tmp/socialu-before-srs-grouping.bundle`. Keep future recovery bundles somewhere durable if long-term recovery is needed.

Work on the relevant branch, commit with a requirement reference (for example, `SRS-103: update login form`), and push that branch. Merge to main only through the team’s review process.

# Kabanga’s SRS branch

| Branch | Requirements | Purpose |
| --- | --- | --- |
| `srs400.6-createevent` | SRS 400.1–400.6 and 401.1–401.6 | Create campus events; view active events on Events and Trending and in the Campus Feed Events card |
| `srs-402-405-event-engagement` | UR-401, UR-402, UR-403, UR-405 | Like events, comment on them, say “I’m going”, see who’s attending, Trending (5 or more likes, most liked first), and invite students to events (SRS-402.1–402.5) |

Event data lives in the `socialu` schema, so the API reaches it only through two server-only functions: `socialu_create_event` (`supabase/migrations/20261013150000_create_event.sql`) and `socialu_list_events` (`supabase/migrations/20261015120000_list_events.sql`). Both use `CREATE OR REPLACE`, so they apply cleanly where the functions were already created in the SQL Editor.

The Events and Trending page shows real data only: a featured next event, upcoming events, a Hosting tab for the student’s own events, and a This week calendar. Event art is generated because events have no photos. Likes, comments and open “I’m going” attendance are stored in `event_likes`, `event_comments` and `event_attendees` (`supabase/migrations/20261027130000_event_engagement.sql`), separate from invitation RSVPs in `event_invitations`. Attendance closes when an event starts. Each event has a details page (`/events/[id]`) with who’s going and comments; My RSVPs lists the events the student is going to. Event creators invite any registered students at their university from the event details page (`supabase/migrations/20261027140000_event_invitations.sql`). One request invites every selected student, all or nothing; the `event_invitations` primary key and `ON CONFLICT DO NOTHING` mean a student is never invited twice, and the response lists who was already invited. Invited students see their invitations in You’re invited on Events and Trending and the Campus Feed. Responding to invitations (rest of UR-403) and event editing (UR-404) are not built yet.
