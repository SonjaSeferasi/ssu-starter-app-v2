# LN remaining-work audit — October 28, 2026

Purpose: choose a manageable Sprint 3 commitment while exposing what could still block completion in Sprint 4. This is a code/backlog audit, not a declaration that all existing features have passed acceptance.

## Decision

Sprint 3 commits to **SRS-107.1, 107.2, 107.3, 107.4 and 107.6**: a signed-in student opens Login Activity, reaches all recorded history, reads each entry's date/time, and sees which sessions are active. Reuse the current authentication infrastructure. Do not add dashboards, charts, new decoration features, GPS collection or remote logout to this slice.

SRS-107.6 was moved from the future backlog into this commitment on October 28. Its own SRS-named branch was created before implementation. All five items remain unstarted; this planning pass changes no application code or hosted database.

## Evidence and limits

- Fetched main at `7d048efc59060fab163e6275b55916f8f2515d38`. The planning branch predates the latest team changes; auth/profile/friendship source inspected here is unchanged in the relevant files, except the current main notification view has newer team changes. No teammate code was replaced or pulled into the working tree.
- Read the canonical [SRS](../SocialU_SRS_Editable.md), existing LN issues, account/profile/friendship routes, UI, SQL and relevant test definitions. Old broad issue descriptions were treated as historical notes, not proof of current completion.
- Tests were not rerun for this planning-only audit. Existing tests indicate coverage and intended behavior; they do not establish hosted deployment or end-to-end acceptance. The previous 957-test result is not relabeled as a new result for current main.
- No real account was created, email sent, friendship changed, session revoked or account deactivated during this audit.
- The three local unfriend files remain excluded. They are not part of the shared baseline or this Sprint 3 commitment.

## Account and authentication areas

| Area | Code evidence | Remaining work / acceptance decision |
| --- | --- | --- |
| UR-100 registration | `app/api/auth/register/route.ts`, account forms and registration tests exist; Sprint 1 selected SRS-100.1 already has its own record. | Do not rebuild registration. #47 still lacks complete unique-username acceptance. Verify supported-school policy and concurrent duplicate handling; distinguish those checks from the already graded missing-name behavior. |
| UR-101 verification | `app/api/auth/verify/route.ts` and account forms implement email-link verification. | **Specification mismatch:** the SRS specifies six-digit code generation, entry and validation. The current route accepts email-link sessions/token hashes instead. This is not evidence that the code-entry criteria are complete. Resolve with the instructor/team: implement the stated behavior or obtain an approved SRS change. |
| UR-102 resend | `app/api/auth/resend/route.ts` uses provider email resend plus the application guard; the response says a new link was sent. | Six-digit replacement code and 10-second previous-code grace/invalidation are not established by this link-based route. Record the provider/configuration finding and resolve the original acceptance criteria; do not assume a passing resend response proves grace-period behavior. |
| UR-103 login | Username/email resolution, password sign-in, failed-attempt/reverification handling, Remember Me and login redirect are present. | Live successful/failed/reverification acceptance still needed. Reverification currently uses an email link, so the six-digit requirement needs the same scope decision as UR-101. |
| UR-104 reset password | Forgot/reset/verify routes, encrypted recovery tickets and session-revocation support exist. | The implemented reset-link workflow differs from six-digit reset-code requirements. Review the exact criteria, including previous-password restriction and two-device revocation. Reuse working code rather than count an old implementation as new Sprint 3 work. |
| UR-105 change password | `/account/security`, change-password API, password policy and revoke-other-session support exist. | Verify current-session preservation, other-session revocation and actual email notification with authorized accounts. Password-change revocation is not the same behavior as selecting one session for remote logout. |
| UR-106 university-email change | No complete student-facing replacement-email workflow or dedicated email-change API was found. | **New implementation remains:** access, current-password verification, supported/unique replacement, verification, preservation of current email, and final replacement. Keep deferred transfers 106.10–106.13 deferred. |
| UR-107 Login Activity | Proposed `database/schema.sql` has `login_sessions`; existing runtime guard uses provider `auth.sessions` and application revocation cutoffs. No student-facing history page/API was found. | **Sprint 3:** 107.1–107.4 plus 107.6. Verify how history is recorded/retained; do not equate provider active sessions with complete durable history. **Later:** 107.5 and 107.7–107.9. |
| UR-108 logout confirmation | `ProfileLogout` in `components/profile/profile-view.tsx` calls logout immediately and clears local session storage. | Confirmation/choices/cancel/page preservation in 108.1–108.4 are missing from that control. Existing logout/redirect/storage clearing can be reused for 108.5–108.7 after verification. |

## Profile areas

| Area | Code evidence | Remaining work / acceptance decision |
| --- | --- | --- |
| UR-109 profile information | Profile editor/details API support photo, major, class year and a 250-character bio; format/size tests exist. | **Mismatch:** setup labels the bio optional, the API permits a blank bio, and tests explicitly accept it; SRS-109.7/109.9 require a bio during required setup. Also review 109.4 against browser preprocessing: large decodable files can be resized before reaching the server, while the SRS says reject a profile-photo file over 10 MB. These are findings requiring a fix or approved specification decision. |
| UR-110 profile editing | Editor, authenticated save API, name cooldown and unsaved-change dialog exist. | Save/reload and leave/cancel flows need real-account acceptance evidence. The new decorations in PR #855 are already delivered extensions, not new Sprint 3 implementation. |
| UR-111 activity summary | Profile counts and friendship-aware queries exist. | Check actual accepted/pending/deleted/Snipe exclusions and count changes after removal/blocking with controlled test data. |
| UR-112 Posts / Tagged | Profile content tabs and authenticated content API exist; Saved is an owner-only extension. | Verify category filtering, accessible tagged posts, empty states and Snipe exclusion on the integrated app. |
| UR-113 other profiles | Student-profile route/API, relationship controls and access tests exist. | Verify nonfriend/Public vs friend/Friends Only, blocked/inactive restrictions and permitted message-request entry. Chat integration must be coordinated with its owner; do not duplicate their sending/consent implementation. |

## Friendship and account-lifecycle areas

| Area | Code evidence | Remaining work / acceptance decision |
| --- | --- | --- |
| UR-114 send requests | Authenticated friendship API, action controls, SQL and notification integration exist. | #503–#505 retain acceptance gaps; #506/#511 still need their previously deferred fresh-request/unread-notification check. Keep original Sprint 2 history; do not count these old implementations as new Sprint 3 code. |
| UR-115 pending requests | Friends page has Received/Sent views and Cancel request; friendship SQL persists request states. | Verify sender/recipient ownership, cancel removal on both lists and required student information. Current list rows show name/username/photo; school and major required by 115.5/.6 are not rendered there. |
| UR-116 accept request | Accept action, mutual friendship and supporting SQL exist. | Verify both lists, both notification recipients, Friends Only access and authorized conversation behavior. |
| UR-117 decline request | Decline action and SQL transitions exist. | Verify no friendship/block/decline notification, and immediate eligible resend in both directions. |
| UR-118 friends search | Search-as-you-type, lowercased full/display-name matching and pagination exist. | UI displays “No matches found” where SRS-118.10 requires “No friends found”. Search-result rows also omit the major required by 118.9. Verify these specific gaps and normal search behavior before claiming full acceptance. |
| UR-119 profile messaging | Message actions and shared chat/access infrastructure exist; chat has newer team changes. | Coordinate acceptance with the chat owner for nonfriend requests, former-friend consent, blocks and personal-view deletion. This audit does not certify the other owner's code or schedule duplicate chat implementation. |
| UR-120 remove friend | Remove/confirmation controls and SQL exist. | Verify cancel, both friendship views, Friends Only access, preserved conversation and eligible future request. The separately local mutual-unfollow migration is not deployed and is not a new requirement introduced by this plan. |
| UR-121 block | Confirmation, block action, SQL restrictions and conversation access guards exist. | Verify both directions for profile/feed/request/message restrictions and that old conversation visibility follows the current SRS. |
| UR-122 manage blocks | Account Settings links to Blocked students; list, Unblock and confirmation controls exist. | Verify account ownership, no automatic re-friending and future eligible requests. Current blocked-list identity rows omit school/major required by 122.4/.5. |
| UR-123 deactivate/reactivate | Deactivation form/API, lifecycle SQL, password checks and explicit login-reactivation flow exist. | Verify preserved profile/posts/friendships, inactive access and two-device revocation, followed by actual restoration. Code presence is not a completed live demonstration. |

## Delivery order and workload control

| Checkpoint | Focus | Stop / reconsider if… |
| --- | --- | --- |
| First working day | SRS-107.1: determine durable history contract and connect own-account data/API/UI. Record SRS/provider gaps on the card. | A reliable, owner-isolated recording/read pipeline is not feasible in the remaining week. Reduce scope openly rather than invent historical entries. |
| Midweek | SRS-107.2–107.4: make all recorded entries reachable and show recorded dates/times with a consistent timezone. | Pagination, auth or timestamp boundaries fail. Fix these before adding active-status presentation. |
| Remaining implementation time | SRS-107.6: derive active/inactive state from actual provider/session and application revocation information. | Active state cannot be established reliably. Keep the card open and return it to Product Backlog if the sprint ends unfinished. |
| Final verification time | Real account/second-session checks, per-card screenshots, PR review/merge, integrated demo and current board. | A card lacks working acceptance, merged PR or screenshot. It stays unfinished. |

These are planning checkpoints, not dated promises. The assignment gives one week; no exact due date or daily availability was supplied. Five selected SRS items are a limit, not a reason to add more feature work.

## Sprint 4 handoff and completion risk

1. Implement the missing university-email change flow (UR-106) and the remaining Login Activity controls (107.5, 107.7–107.9), selecting exact SRS cards/tasks before coding.
2. Complete logout confirmation (UR-108) and small profile/request/search/blocked-list corrections identified above.
3. Close existing acceptance gaps with actual demonstrations, screenshots and appropriate PRs, coordinating messaging with the chat owner.
4. **Resolve the email-link vs six-digit-code and required-profile-field findings early, during Sprint 3 planning/review.** Do not wait until the final demo to discover the instructor requires implementation changes. No SRS wording is changed by this audit.

There is more remaining work than the original five future Login Activity cards suggested. Finishing every requirement in one final sprint is **not established**. If the original code-based authentication criteria remain mandatory, agree on scope and a realistic delivery plan with the instructor/team before assuming the above Sprint 4 work fits. Do not silently mark unmatched criteria complete.
