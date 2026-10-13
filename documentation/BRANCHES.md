# Linh’s SRS branches

Use one branch per SRS group. For example, SRS-100.1 through SRS-100.10 belong on `linh/srs-100-registration`. Branches begin at the current main baseline; their existence does not mean every requirement is implemented.

`linh/integration-pages` combines the latest main pages with the local campus login design. `linh/backup-local-pages-20261012` preserves the local work before integration. The older per-requirement branches are retained for reference.

| SRS group | Part | Branch |
| --- | --- | --- |
| 100 | Create an Account with School Email Verification | `linh/srs-100-registration` |
| 101 | Verify My University Email | `linh/srs-101-email-verification` |
| 102 | Resend a Verification Code | `linh/srs-102-resend-verification` |
| 103 | Log In to My Account | `linh/srs-103-login` |
| 104 | Reset a Forgotten Password | `linh/srs-104-password-reset` |
| 105 | Change My Password | `linh/srs-105-password-change` |
| 106 | Update My University Email | `linh/srs-106-university-email` |
| 107 | Review Recent Login Activity | `linh/srs-107-login-activity` |
| 108 | Confirm Before Logging Out | `linh/srs-108-logout` |
| 109 | Add Profile Information | `linh/srs-109-profile-information` |
| 110 | Edit My Profile | `linh/srs-110-edit-profile` |
| 111 | View My Activity Summary | `linh/srs-111-activity-summary` |
| 112 | Filter My Profile Content | `linh/srs-112-profile-filters` |
| 113 | View Another Student's Profile | `linh/srs-113-view-student-profile` |
| 114 | Send a Friend Request | `linh/srs-114-send-friend-request` |
| 115 | View Pending Friend Requests | `linh/srs-115-pending-friend-requests` |
| 116 | Accept a Friend Request | `linh/srs-116-accept-friend-request` |
| 117 | Decline a Friend Request | `linh/srs-117-decline-friend-request` |
| 118 | Search My Friends List | `linh/srs-118-friends-search` |
| 119 | Open messaging from a profile. | `linh/srs-119-profile-messaging` |
| 120 | Remove a Friend | `linh/srs-120-remove-friend` |
| 121 | Block Another Student | `linh/srs-121-block-student` |
| 122 | Manage Blocked Students | `linh/srs-122-blocked-students` |
| 123 | Deactivate My Account | `linh/srs-123-deactivate-account` |

Before starting work, fetch origin and switch to the relevant branch. Keep changes scoped to that group, test them, and open a pull request to main.
