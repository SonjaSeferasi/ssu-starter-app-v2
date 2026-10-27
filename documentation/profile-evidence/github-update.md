# GitHub description update

The connector could read PR #855 but GitHub denied editing it (403, Resource not accessible by integration). The replacement below is prepared for Linh to apply from her GitHub account. It has not been applied by the agent.

Open https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/855 and edit the description using the three-dot menu next to its opening description. Keep the PR merged; do not reopen it.

Suggested title: **SRS-109–113: saved profile themes, decorations and campus cards**

## Replacement description

Students can personalize their profile and classmates can view the saved design. Adds six themes, uploaded covers, avatar frames, stickers with saved position/size/rotation on the cover and About/hello cards, editable prompts and interests, public Spotify embeds, and optional country flags and hometown. Posts, Tagged and the owner's private Saved tab remain available.

Adds vibes, goals, two-option polls and study plans with votes/participants, independently editable poll/plan stickers, and hello notes. Includes pinned-memory UI and its storage migration. The shared Avatar component is isolated so chat notifications do not import the profile editor.

Implementation: `linh/srs-109-113-profile-campus-polish`, head `e4bf2db58b9d2a30bd4bec5ae27f95a409b1af08`. Related existing evidence issue: #342. This is later profile development; it does not replace the original Sprint 1 registration or Sprint 2 notification submission.

Validation of this exact integrated head:
- npm test: 957 tests passed across 109 files.
- npm run build: passed in an isolated source copy.
- API tests mock Supabase; database tests use disposable PostgreSQL. These checks do not replace live save/reload and visitor screenshots, which still need attaching.

Database setup: includes additive profile migrations 20261027020000 through 20261027080000. A code merge does not apply migrations. Hosted prompt, space and campus-card functions were found during setup checks; pinned memories remain in preview until 20261027080000_profile_memories.sql is applied and verified.

The local-only unfriend migration, its confirmation wording and its test edits are excluded. Existing SRS and graded sprint documents are unchanged.

Evidence package: [profile improvements and evidence](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/linh/srs-109-113-profile-evidence/documentation/profile-evidence/README.md). This branch contains a dated documentation record and fresh test/build output. Current profile screenshots are still pending.
