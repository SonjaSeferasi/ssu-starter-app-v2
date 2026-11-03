# Sprint 3 extension: login location and remote logout

Owner: Linh Nguyen (LN), GitHub Dieulinhh23. Selected November 3, 2026, after the five original Login Activity SRS items merged.

| SRS | Parent | Actual SRS branch |
| --- | --- | --- |
| 107.5 Login location | #878 | linh/srs-107.5-login-location |
| 107.7 Remote logout option | #880 | linh/srs-107.7-remote-logout-option |
| 107.8 End selected remote session | #881 | linh/srs-107.8-end-selected-session |
| 107.9 Preserve current session during remote logout | #882 | linh/srs-107.9-preserve-current-session |

All trace to UR-107. Preserve the exact existing SRS shall statements and acceptance criteria on their issues. The four branches were created and pushed from main `bef679d` before this implementation sequence. Earlier combined prototype `8be484d` informed the implementation; it predates these per-SRS branches, so its work is not represented as having originally happened on them. Actual new changes and checks belong to the named branches, in dependency order.

## SRS-107.5 location contract

`20261103110000_login_context.sql` adds optional bounded device/location metadata to the existing owner-authorized login history. A successful authenticated sign-in records the provider session's first context. Capture failures do not fail otherwise valid sign-in. The server trusts the Vercel geolocation headers only when configured as a Vercel deployment; it does not infer location from student profile, timezone, or language. No raw IP, precise coordinates, token, or raw user-agent is stored.

The history API returns device and location fields using its existing verified-owner check. Login Activity renders available location as approximate, and missing/older/localhost context as Location unavailable. Reopening history does not invent or replace the original location.

Real task sub-issues of #878: #1048 data contract; #1049 authenticated capture/API; #1050 UI; #1051 verification/evidence. Tests cover trusted-host gating, malformed headers, immutable context, wrong-owner rejection, absent context, and denied direct authenticated-role RPC execution. Initial targeted run: 56 tests passed; type-check/build/live hosted-location acceptance remain separately recorded checks until completed.

## Deployment and evidence status

## SRS-107.7 logout-option contract

The verified-owner history API authorizes `can_end` only when it knows the caller's current session and the record is another active session. The client independently fails closed for current, ended, unauthorized or invalid-ID records. Eligible rows offer Log out and an accessible confirmation dialog. Cancel makes no logout request. Confirm connects to the selected-session operation implemented by the dependent SRS-107.8 branch; keep the implementation PR in draft until the combined flow is verified.

Real task sub-issues of #880: #1053 data eligibility; #1054 authenticated API; #1056 controls/confirmation; #1057 verification/evidence. The focused API, eligibility and database run passed 10 tests. Live control/cancellation evidence remains pending.

The new migration has not yet been applied to the shared project. It is additive and installation does not end sessions. A localhost screenshot with unavailable location does not prove the available-location acceptance criterion: capture a genuine hosted sign-in with platform-supplied location. Never populate a fabricated location to make an evidence screenshot.

The other three SRS items are selected for this sprint, but their implementation, deployment, browser acceptance and PRs must be recorded when actually completed. Do not close tasks or mark Done based only on branch creation or this plan.

## Primary references

- [Supabase session identity and refresh behavior](https://supabase.com/docs/guides/auth/sessions).
- [Vercel platform request headers](https://vercel.com/docs/headers/request-headers).
- [Next.js 14 route handlers](https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers).
