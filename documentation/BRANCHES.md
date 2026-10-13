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
