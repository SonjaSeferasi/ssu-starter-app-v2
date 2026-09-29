<a id="cover"></a>

# SocialU Software Requirements Specification

CSC 351 - Semester Project | Integrated revision | 28 September 2026

Status: revised working baseline, pending the decisions in Appendix B. This edition preserves existing identifiers, integrates confirmed team decisions, and synchronizes the URD stories with the detailed SRS. Proposed thresholds are not recorded as stakeholder-approved commitments.

| Team member | Initials |
| --- | --- |
| Linh Nguyen | LN |
| Loens Paul | LP |
| Merieme Sakhsoukhi | MS |
| Kabanga Mbangu | KB |
| Darrin Phimphisane | DP |
| Sonja Seferasi | SS |

Companion document: [Editable Word version](SocialU_SRS_Editable.docx). User goals: [User requirements](user_requirements.md). This Markdown edition uses section links in the contents, functional-area guide, and coverage index; page numbers belong to the Word edition.

Acceptance criteria are included where supplied. The remaining decision items and proposed quality targets are identified in Appendix B for team review before the baseline is approved.

<a id="contents"></a>

## Contents

- [Functional-area guide](#area-guide)
- [1. Introduction and scope](#introduction)
- [2. Application pages and student journey](#page-guide)
- [3. Integration decisions and review status](#decisions)
- [4. Accounts, Profile, and Friendships](#section-LN)
- [5. Chat](#section-LP)
- [6. Campus Feed and Social Features](#section-MS)
- [7. Campus Events and Trending](#section-KB)
- [8. DormSpace, Snipe, and Shared Points](#section-DP)
- [9. Navigation, Game Room, and Games](#section-SS)
- [10. Non-Functional Requirements](#nfr)
- [Appendix A. Behavior reference tables](#appendix-a)
- [Appendix B. Interfaces and open parameters](#appendix-b)
- [Appendix C. Source alignment and revision record](#appendix-c)
- [Appendix D. SS constraints and dependencies](#appendix-d)
- [Appendix E. User requirement coverage index](#appendix-e)
- [Appendix F. NFR old-to-new reference table](#appendix-f)
- [Appendix G. URD amendment register](#appendix-g)

<a id="area-guide"></a>

## Functional-area guide

| Functional area | Owner | UR range | Section |
| --- | --- | --- | --- |
| Accounts and Authentication | LN | UR-100 to UR-108 | [See section](#area-100) |
| Profile | LN | UR-109 to UR-113 | [See section](#area-109) |
| Friendships | LN | UR-114 to UR-123 | [See section](#area-114) |
| Private Messaging | LP | UR-200 to UR-201 | [See section](#area-200) |
| Group Chats and Membership | LP | UR-202 to UR-208 | [See section](#area-202) |
| Conversation Experience | LP | UR-209 to UR-213 | [See section](#area-209) |
| Campus Feed and Social Features | MS | UR-301 to UR-315 | [See section](#area-301) |
| Campus Events and Trending | KB | UR-400 to UR-405 | [See section](#area-400) |
| DormSpace | DP | UR-500 to UR-509 | [See section](#area-500) |
| Snipe | DP | UR-510 to UR-514 | [See section](#area-510) |
| Shared Points | DP | UR-520 to UR-529 | [See section](#area-520) |
| Navigation Bar | SS | UR-600 to UR-603 | [See section](#area-600) |
| Post and Event Creation Entry Points | SS | UR-604 to UR-606 | [See section](#area-604) |
| Game Room and Avatar Customization | SS | UR-607 to UR-611 | [See section](#area-607) |
| Participation Streak | SS | UR-612 to UR-614 | [See section](#area-612) |
| Game 1: Platform Game | SS | UR-615 to UR-622 | [See section](#area-615) |
| Daily Word Game | SS | UR-623 to UR-626 | [See section](#area-623) |
| Display Preference | SS | UR-627 | [See section](#area-627) |

Ranges preserve intentional gaps. UR-506 is retired, UR-605 is delegated to MS audience selection, and UR-606 is deferred. New children extend their parent numbers; earlier numbers are never reassigned.

<a id="introduction"></a>

## 1. Introduction and scope

<a id="1-1-purpose-and-audience"></a>

### 1.1 Purpose and audience

SocialU helps university students connect with classmates, follow campus activity, communicate privately or in groups, and take short game breaks in one browser-based application. This SRS translates student goals into behavior for the team, instructor, reviewers, developers and testers. Read the page guide first, then the relevant feature and its parent UR.

<a id="1-2-release-scope"></a>

### 1.2 Release scope

SocialU is a browser-based social platform for students at one university. It brings verified accounts, profiles and friendships, Campus and Friends feeds, private and group messages, conversation-only Snipes, Events and Trending, avatar customization, games, and a customizable virtual dorm into one website. The semester release includes Game 1 with three levels and DormSpace. Wordle and a fourth platform level are optional if time allows; automatic photograph-background removal is conditional on feasibility. University transfers and post/event drafts are deferred. Native mobile applications, voice/video calling, exam tips, and professor ratings are outside the semester scope. Students share one participation streak across Game 1 attempt starts, accepted Wordle guesses when available, and successful DormSpace openings. Shared points use that participation record for daily and milestone rewards. Reward amounts and catalog prices remain open team decisions; signing in alone does not qualify. Approved Snipes appear only in their original conversation. A non-friend conversation requires an accepted message request; ending a friendship requires renewed request acceptance before new messages can be sent. Events can invite any registered student at the same university. The SRS provides detailed behavior and the open-decision register. Functional areas appear in the same order in both documents.

<a id="1-3-specification-conventions"></a>

### 1.3 Specification conventions

Each UR story appears once above the system requirements derived from it. Each functional SRS record retains its author and trace. NFR identifiers are unique across the team; Appendix F preserves the author-qualified migration from older reused numbers. Retired/deferred records are explicitly labeled and create no semester implementation obligation.

A proposed target is measurable draft text awaiting agreement. A conditional feature is required only when selected for release. An open parameter has no approved value; implementation must not silently choose one. Existing explicit thresholds are retained even where their test conditions still require agreement.

<a id="page-guide"></a>

## 2. Application pages and student journey

| Page / entry point | Purpose |
| --- | --- |
| Registration and sign-in | Create and verify a university account, sign in, recover credentials, and manage access. |
| Home | Open Campus Feed; switch to Friends Feed under the audience and blocking rules. |
| Messages | Private and group conversations, incoming non-friend requests, and conversation-only Snipes. |
| Game Room | Avatar preview, face/outfit editing, shared participation status and descriptions/opening controls for included activities. |
| Game 1 | Three platform levels, movement, optional coins, hazards, finish flags, pause, retries and protected exit. A fourth level is optional. |
| Daily word game | Optional five-letter daily puzzle with six accepted guesses, instructions and today's result; no history statistics. |
| DormSpace | An illustrated 2D dorm, owned decorations, friends' dorm visits, DormHall, guestbooks and purchase entry points. |
| Profile | Own or permitted student profile, Posts and Tagged content, counts and friendship/messaging actions. Snipes are excluded. |
| Events and Trending | One combined page for campus events and accessible Campus Feed posts ranked by recent likes. |
| Create (+) | Entry choices for a text post, photo post or event. MS/KB own the forms; SS owns navigation to them. Drafts are deferred. |
| Preferences | Side/bottom navigation and Light/Dark settings. Game 1 and Wordle hide global navigation during play and provide return controls. |

Typical journey: verify an account -> sign in -> Home -> connect or message -> discover an event or open Game Room -> customize an avatar -> play or visit DormSpace -> return using navigation or the game return control.

<a id="2-1-user-classes-and-roles"></a>

### 2.1 User classes and roles

| Role | Permission boundary |
| --- | --- |
| Student / account holder | Uses their own verified account; each workflow states its sign-in requirement. |
| Current friend | Mutually accepted, unended and unblocked friendship. |
| Conversation participant | May access that conversation under Chat membership and consent rules. |
| Group owner / administrator | Has only the group-management powers defined by Chat. |
| Event creator / invitee | Manages their event or answers an invitation. |
| Dorm owner / visitor | Decorates their own dorm or visits as an eligible current friend. |
| Snipe photographer / tagged participant | Submits a conversation photo or separately answers identity and sharing questions. |

<a id="2-2-feature-ownership"></a>

### 2.2 Feature ownership

| Owner | Responsible feature |
| --- | --- |
| LN | Accounts, authentication, profiles, friendships and blocking. |
| LP | Chat membership, message requests, message delivery, read status and unread totals. |
| MS | Feeds, posts, audiences, interactions and post reporting. |
| KB | Events, invitations, RSVPs, event management and Trending. |
| DP | DormSpace, Snipe, shared points, catalogs and purchases. |
| SS | Navigation, Game Room, avatar appearance, the shared participation record, Game 1, optional Wordle and display preferences. |

<a id="2-3-shared-terminology"></a>

### 2.3 Shared terminology

| Term | Meaning |
| --- | --- |
| Campus Feed | The university feed opened by Home; older source sections called it Community Feed. |
| Profile photo / avatar face | Separate settings: a social account photo and a face on an illustrated game character. |
| Complete outfit / available outfit | One provided clothing combination; available means entitled to use. |
| Saved / committed | Durable storage has been confirmed; a preview or pending operation is not a confirmed save. |
| Level coins / shared points | Level coins describe an attempt. Spendable account points and any conversion are owned by DP. |
| Snipe | A conversation photo requiring separate identity and sharing answers before publication. |
| Authoritative time | The system-assigned time for accepted activity, not a manually altered device clock. |
| 24 elapsed hours | 86,400 seconds, independent of midnight and daylight-saving changes. |
| Character count in DP | Unicode code points, including spaces and line breaks; this may count an emoji as multiple characters. |

<a id="decisions"></a>

## 3. Integration decisions and review status

| ID / status | Decision | Affected scope |
| --- | --- | --- |
| D-01 / Confirmed | One shared SS participation streak; DP uses the same qualifying dates and streak instance for daily and milestone awards. | UR-526; UR-612 to UR-614 |
| D-02 / Confirmed | Non-friends require accepted message requests. Unfriending requires renewed acceptance; old messages remain visible. | UR-119; UR-120; UR-200 |
| D-03 / Confirmed | Approved Snipes remain only in their original conversation; feeds, profiles and profile counts exclude them. | UR-111 to UR-113; UR-510 to UR-514 |
| D-04 / Confirmed | One university. Transfers are deferred and their identifiers remain reserved. | UR-106; SRS-106.10 to SRS-106.13 |
| D-05 / Confirmed | Wordle is optional. Trending ranks accessible Campus Feed posts by active likes received within the preceding 168 hours. | UR-405; UR-623 to UR-626 |
| D-06 / Confirmed | Event invitations may reach any registered student at the same university. Post/event drafts are deferred. | UR-402; UR-606 |
| D-07 / Open | Reward amounts, replay eligibility, catalog parameters and trusted late-participation handling require team decisions. No numerical reward values are invented. | Appendix B |
| D-08 / Proposed | Bring in the earlier SS controls and recovery corrections. The 10-second return-wait limit is a proposal, not a newly confirmed stakeholder value. | SRS-616; SRS-622; SRS-624; SRS-NFR-65 |
| D-09 / Open | Approve measurable quality targets and test conditions, including the proposed replacement for event readability. | Appendix B; SRS-NFR-46; SRS-NFR-52 to SRS-NFR-65 |

<a id="3-1-traceability-and-freeze-conditions"></a>

### 3.1 Traceability and freeze conditions

Appendix E lists every numbered UR and its exact SRS children, including delegated, conditional, retired and deferred dispositions. Every active functional record has a parent; every NFR has explicit UR traces. A syntactically complete trace does not resolve an open product decision or prove implementation.

Before freezing: agree the relevant Appendix B parameters and quality profiles, confirm proposed defaults, review the amended URD/SRS together, and select one dated revision for every team member to submit. No review or approval is attributed to a teammate by this generated revision.

<a id="section-LN"></a>

## 4. Accounts, Profile, and Friendships

Feature owner: Linh Nguyen (LN).

<a id="area-100"></a>

### Accounts and Authentication

<a id="ur-100"></a>

#### UR-100, LN - Create an Account with School Email Verification

User requirement: As a student, I want to sign up using my full name, username, university email, and password, so that my identity is connected to a valid school account before I access SocialU.

##### SRS-100.1, LN — Full name registration.

The system shall require a student to enter a full name when creating a SocialU account.

Acceptance criterion: Given a student is completing registration, when the student attempts to continue without entering a full name, then the system prevents registration from continuing.

Traces to: UR-100

##### SRS-100.2, LN — Username registration.

The system shall require a student to create a username when registering a SocialU account.

Acceptance criterion: Given a student is completing registration, when the student attempts to continue without entering a username, then the system prevents registration from continuing.

Traces to: UR-100

##### SRS-100.3, LN — Unique username.

The system shall reject a registration request when the submitted username is already associated with another SocialU account.

Acceptance criterion: Given the entered username already belongs to another account, when the student submits registration, then the system rejects the username.

Traces to: UR-100

##### SRS-100.4, LN — University email registration.

The system shall require a student to enter a university email address when creating a SocialU account.

Acceptance criterion: Given a student is completing registration, when the university email field is empty, then the system prevents registration from continuing.

Traces to: UR-100

##### SRS-100.5, LN — School-specific email validation.

The system shall accept a registration email only when its domain matches an approved university email domain supported by SocialU.

Acceptance criterion: Given a student enters an email address, when its domain is not associated with a supported university, then the system rejects the email address.

Traces to: UR-100

##### SRS-100.6, LN — Password creation.

The system shall require a student to create a password when registering a SocialU account.

Acceptance criterion: Given a student is completing registration, when the password field is empty, then the system prevents registration from continuing.

Traces to: UR-100

##### SRS-100.7, LN — Password confirmation.

The system shall require a student to re-enter the password during registration.

Acceptance criterion: Given a student has entered a registration password, when the confirmation field is empty, then the system prevents registration from continuing.

Traces to: UR-100

##### SRS-100.8, LN — Matching registration passwords.

The system shall reject a registration request when the password and confirmation password do not match.

Acceptance criterion: Given the registration password and confirmation password are different, when the student submits registration, then the system rejects the request and indicates that the passwords do not match.

Traces to: UR-100

##### SRS-100.9, LN — Unique university email.

The system shall reject a registration request when the submitted university email is already associated with another SocialU account.

Acceptance criterion: Given the submitted university email already belongs to an existing account, when registration is submitted, then the system rejects the registration request.

Traces to: UR-100

##### SRS-100.10, LN — Verification before authenticated access.

The system shall prevent a newly registered student from accessing authenticated SocialU features until the submitted university email has been verified.

Acceptance criterion: Given a registered student's university email has not been verified, when the student attempts to access an authenticated feature, then the system prevents access and directs the student to email verification.

Traces to: UR-100

<a id="ur-101"></a>

#### UR-101, LN - Verify My University Email

User requirement: As a student, I want to enter a one-time verification code sent to my university email, so that SocialU can confirm that the email address belongs to me.

##### SRS-101.1, LN — Six-digit verification code.

The system shall generate a six-digit verification code after a valid account registration request is submitted.

Acceptance criterion: Given a valid registration request is submitted, when the system generates a verification code, then the generated code contains exactly six digits.

Traces to: UR-101

##### SRS-101.2, LN — Send verification code.

The system shall send the six-digit verification code to the university email submitted during registration.

Acceptance criterion: Given a valid registration has been submitted, when the verification code is generated, then the code is sent to the university email used for registration.

Traces to: UR-101

##### SRS-101.3, LN — University identification.

The system shall identify the student's associated university in the verification email.

Acceptance criterion: Given a verification email is generated, when the student opens the email, then the student's associated university is identified in the verification message.

Traces to: UR-101

##### SRS-101.4, LN — Verification-code validity.

The system shall keep an issued verification code valid for 15 minutes from the time the code is generated.

Acceptance criterion: Given a verification code was generated less than 15 minutes ago, when the correct code is submitted, then the code is accepted as active.

Traces to: UR-101

##### SRS-101.5, LN — Verification-code entry.

The system shall allow the student to submit the six-digit verification code received at the registered university email.

Acceptance criterion: Given a student is on the verification page, when the student enters a six-digit code and submits it, then the system processes the verification attempt.

Traces to: UR-101

##### SRS-101.6, LN — Successful email verification.

The system shall mark the university email as verified when the student submits the correct active verification code within its 15-minute validity period.

Acceptance criterion: Given the correct verification code is active, when the student submits that code, then the system marks the university email as verified.

Traces to: UR-101

##### SRS-101.7, LN — Incorrect verification code.

The system shall reject a submitted verification code when it does not match the active verification code associated with the registration.

Acceptance criterion: Given an active verification code exists, when the student submits a different code, then the system rejects the submitted code.

Traces to: UR-101

##### SRS-101.8, LN — Verification retry.

The system shall allow another verification-code attempt after an incorrect verification code is rejected.

Acceptance criterion: Given an incorrect verification attempt was rejected, when the student enters another code, then the system allows the new verification attempt.

Traces to: UR-101

##### SRS-101.9, LN — Verification-attempt limit.

The system shall not impose a fixed maximum number of verification-code entry attempts while an active verification code remains valid.

Acceptance criterion: Given the verification code remains active, when the student makes multiple incorrect verification attempts, then the system continues to permit another attempt.

Traces to: UR-101

##### SRS-101.10, LN — Expired verification code.

The system shall reject a verification code after 15 minutes have elapsed since the code was generated.

Acceptance criterion: Given more than 15 minutes have elapsed since code generation, when the student submits that code, then the system rejects it as expired.

Traces to: UR-101

##### SRS-101.11, LN — Expiration message.

The system shall inform the student that the verification code has expired when an expired code is submitted.

Acceptance criterion: Given an expired verification code is submitted, when the system rejects the code, then the student is informed that the code has expired.

Traces to: UR-101

##### SRS-101.12, LN — Access after verification.

The system shall direct the student to the authenticated Home/Campus area after university-email verification is completed successfully.

Acceptance criterion: Given the student successfully verifies the university email, when verification completes, then the system opens the Home/Campus area.

Traces to: UR-101

<a id="ur-102"></a>

#### UR-102, LN - Resend a Verification Code

User requirement: As a student, I want to request a new verification code if the original code does not arrive, so that a delayed or lost email does not prevent me from completing registration.

##### SRS-102.1, LN — Resend waiting period.

The system shall allow another verification-code request 30 seconds after the previous verification code was sent.

Acceptance criterion: Given fewer than 30 seconds have passed since the previous code was sent, when the student attempts to resend, then the system prevents the resend request until 30 seconds have elapsed.

Traces to: UR-102

##### SRS-102.2, LN — Send replacement code.

The system shall send a new six-digit verification code to the university email associated with the pending registration after an eligible resend request.

Acceptance criterion: Given at least 30 seconds have passed, when the student selects Resend Code, then a new six-digit code is sent to the registered university email.

Traces to: UR-102

##### SRS-102.3, LN — Replacement-code validity.

The system shall keep a replacement verification code valid for 15 minutes from the time it is generated.

Acceptance criterion: Given a replacement code has been issued, when the correct replacement code is submitted within 15 minutes, then the system accepts it as active.

Traces to: UR-102

##### SRS-102.4, LN — Previous-code grace period.

The system shall keep the previous verification code valid for 10 seconds after a replacement verification code is issued.

Acceptance criterion: Given a replacement code was issued less than 10 seconds ago, when the student submits the previous valid code, then the system accepts the previous code.

Traces to: UR-102

##### SRS-102.5, LN — Previous-code invalidation.

The system shall invalidate the previous verification code 10 seconds after the replacement verification code is issued.

Acceptance criterion: Given more than 10 seconds have elapsed since a replacement code was issued, when the previous code is submitted, then the system rejects the previous code.

Traces to: UR-102

##### SRS-102.6, LN — Resend-request limit.

The system shall allow additional verification-code resend requests without a fixed total-request limit, subject to the 30-second waiting period between requests.

Acceptance criterion: Given each 30-second resend interval has elapsed, when the student repeatedly requests replacement codes, then the system continues to allow eligible resend requests.

Traces to: UR-102

##### SRS-102.7, LN — Resend confirmation.

The system shall display a confirmation after a replacement verification code is sent successfully.

Acceptance criterion: Given a replacement verification code is successfully sent, when the send operation completes, then the system informs the student that a new code was sent.

Traces to: UR-102

<a id="ur-103"></a>

#### UR-103, LN - Log In to My Account

User requirement: As a student, I want to log in using my university email and password, so that I can securely access my SocialU account when I return to the platform.

##### SRS-103.1, LN — Login identifier.

The system shall allow a registered student to enter either the university email or username associated with the student's account when logging in.

Acceptance criterion: Given a registered student has an email and username, when either valid identifier is entered with the correct password, then the system accepts the identifier for authentication.

Traces to: UR-103

##### SRS-103.2, LN — Login password.

The system shall require the student to enter the account password when submitting a login request.

Acceptance criterion: Given a student enters a valid identifier without a password, when Log In is selected, then the system prevents the login request from succeeding.

Traces to: UR-103

##### SRS-103.3, LN — Successful login.

The system shall authenticate the student when the submitted identifier and password match an active SocialU account that is eligible for access.

Acceptance criterion: Given an active verified account exists, when the student submits the correct identifier and password, then the system authenticates the student.

Traces to: UR-103

##### SRS-103.4, LN — Invalid-login message.

The system shall display "Incorrect email or password" when the submitted login credentials cannot be authenticated.

Acceptance criterion: Given invalid credentials are submitted, when authentication fails, then the system displays "Incorrect email or password."

Traces to: UR-103

##### SRS-103.5, LN — Failed-login tracking.

The system shall count consecutive unsuccessful login attempts associated with the student's account.

Acceptance criterion: Given a login attempt for an account fails, when authentication is rejected, then the account's consecutive failed-attempt count increases by one.

Traces to: UR-103

##### SRS-103.6, LN — Re-verification threshold.

The system shall require university-email verification after five consecutive unsuccessful login attempts for the same account.

Acceptance criterion: Given four consecutive failed attempts already exist, when the fifth consecutive login attempt fails, then the system requires university-email re-verification.

Traces to: UR-103

##### SRS-103.7, LN — Re-verification code.

The system shall send a six-digit verification code to the university email associated with the account when re-verification is required.

Acceptance criterion: Given re-verification is triggered after five failed attempts, when the requirement is activated, then a six-digit code is sent to the account's university email.

Traces to: UR-103

##### SRS-103.8, LN — Login restriction during re-verification.

The system shall prevent additional authenticated access until the required email re-verification is completed.

Acceptance criterion: Given an account requires re-verification, when the student attempts authenticated access before verification, then access is denied.

Traces to: UR-103

##### SRS-103.9, LN — Password after re-verification.

The system shall require the correct account password before authenticating the student after email re-verification.

Acceptance criterion: Given email re-verification has been completed, when the student attempts to log in, then authentication succeeds only after the correct password is submitted.

Traces to: UR-103

##### SRS-103.10, LN — Failed-attempt reset.

The system shall reset the consecutive failed-login count after a successful login.

Acceptance criterion: Given one or more failed login attempts exist, when the student subsequently logs in successfully, then the failed-attempt count resets to zero.

Traces to: UR-103

##### SRS-103.11, LN — Remember Me option.

The system shall provide a Remember Me option when the student submits login credentials.

Acceptance criterion: Given a student is on the login page, when login credentials are entered, then a Remember Me option is available before login submission.

Traces to: UR-103

##### SRS-103.12, LN — Remembered session.

When Remember Me is selected, the system shall retain that sign-in until logout or a session-revoking security action.

Acceptance criterion: Given a remembered sign-in, when the browser reopens before logout, password-reset revocation, remote session termination, or account deactivation, then authentication is retained.

Traces to: UR-103.

##### SRS-103.13, LN — Login destination.

The system shall direct the student to the Home/Campus area after a successful login.

Acceptance criterion: Given the student successfully authenticates, when login completes, then the Home/Campus area is displayed.

Traces to: UR-103

<a id="ur-104"></a>

#### UR-104, LN - Reset a Forgotten Password

User requirement: As a student, I want to request a password reset from the login page, so that I can regain access to my account if I forget my password.

##### SRS-104.1, LN — Password-reset request.

The system shall allow a student to request a password reset by entering the university email associated with the account.

Acceptance criterion: Given the student is on the login page, when the student requests a reset using a registered university email, then the system processes the password-reset request.

Traces to: UR-104

##### SRS-104.2, LN — Password-reset code.

The system shall send a six-digit password-reset code to the university email associated with an eligible account.

Acceptance criterion: Given an eligible password-reset request is submitted, when the request is accepted, then a six-digit reset code is sent to the registered university email.

Traces to: UR-104

##### SRS-104.3, LN — Reset-code validity.

The system shall keep the password-reset code valid for 15 minutes from the time the code is generated.

Acceptance criterion: Given a reset code was generated less than 15 minutes ago, when the correct code is submitted, then the system accepts the code.

Traces to: UR-104

##### SRS-104.4, LN — Reset-code entry.

The system shall allow the student to submit the six-digit password-reset code received at the registered university email.

Acceptance criterion: Given the student has received a reset code, when the six-digit code is entered and submitted, then the system validates the code.

Traces to: UR-104

##### SRS-104.5, LN — Invalid reset code.

The system shall reject a password-reset code when it does not match the active password-reset code associated with the account.

Acceptance criterion: Given an active reset code exists, when a different code is submitted, then the system rejects the submitted code.

Traces to: UR-104

##### SRS-104.6, LN — Expired reset code.

The system shall reject a password-reset code after 15 minutes have elapsed since the code was generated.

Acceptance criterion: Given the reset code is older than 15 minutes, when it is submitted, then the system rejects it as expired.

Traces to: UR-104

##### SRS-104.7, LN — New password.

The system shall require the student to enter a new password after successfully verifying the password-reset code.

Acceptance criterion: Given the reset code has been successfully verified, when the student proceeds with password reset, then a new password is required.

Traces to: UR-104

##### SRS-104.8, LN — Confirm reset password.

The system shall require the student to re-enter the new password before completing the password reset.

Acceptance criterion: Given a new password has been entered, when the student attempts to complete the reset without confirming it, then the system prevents completion.

Traces to: UR-104

##### SRS-104.9, LN — Matching reset passwords.

The system shall reject the password-reset request when the new password and confirmation password do not match.

Acceptance criterion: Given two different password values are entered, when the password reset is submitted, then the system rejects the reset.

Traces to: UR-104

##### SRS-104.10, LN — Previous-password restriction.

The system shall reject the new password when it is identical to the student's current password.

Acceptance criterion: Given the student enters the current password as the replacement password, when the reset is submitted, then the system rejects the replacement password.

Traces to: UR-104

##### SRS-104.11, LN — Save reset password.

The system shall replace the student's current password after the verified password-reset request is completed successfully.

Acceptance criterion: Given all reset requirements are satisfied, when the student completes the password reset, then subsequent login requires the replacement password.

Traces to: UR-104

##### SRS-104.12, LN — End existing sessions after reset.

The system shall end all existing authenticated sessions associated with the account after the password is reset successfully.

Acceptance criterion: Given the account is active on multiple devices, when the password reset succeeds, then all existing authenticated sessions are ended.

Traces to: UR-104

##### SRS-104.13, LN — Password-reset destination.

The system shall direct the student to the login page after the password reset is completed successfully.

Acceptance criterion: Given a password reset completes successfully, when the new password is saved, then the login page is displayed.

Traces to: UR-104

<a id="ur-105"></a>

#### UR-105, LN - Change My Password

User requirement: As a student, I want to change my password from account settings, so that I can maintain the security of my account.

##### SRS-105.1, LN — Password-change access.

The system shall provide a signed-in student with a password-change option in Account Settings.

Acceptance criterion: Given a student is signed in, when Account Settings is opened, then a password-change option is available.

Traces to: UR-105

##### SRS-105.2, LN — Current password entry.

The system shall require the student to enter the current account password before submitting a password-change request.

Acceptance criterion: Given a student attempts to change the password, when the current-password field is empty, then the system prevents the change request from completing.

Traces to: UR-105

##### SRS-105.3, LN — Current password verification.

The system shall reject the password-change request when the submitted current password does not match the account password.

Acceptance criterion: Given an incorrect current password is entered, when the change request is submitted, then the system rejects the request.

Traces to: UR-105

##### SRS-105.4, LN — New password entry.

The system shall require the student to enter a new password.

Acceptance criterion: Given the student is changing a password, when no new password is entered, then the system prevents the request from completing.

Traces to: UR-105

##### SRS-105.5, LN — Confirm new password.

The system shall require the student to re-enter the new password before completing the password change.

Acceptance criterion: Given a new password is entered, when the confirmation field is empty, then the system prevents the password change.

Traces to: UR-105

##### SRS-105.6, LN — Matching new passwords.

The system shall reject the password-change request when the new password and confirmation password do not match.

Acceptance criterion: Given the new-password values differ, when the student submits the change request, then the system rejects the request.

Traces to: UR-105

##### SRS-105.7, LN — Minimum password length.

The system shall require a new password to contain at least eight characters.

Acceptance criterion: Given a new password contains fewer than eight characters, when it is submitted, then the system rejects the password.

Traces to: UR-105

##### SRS-105.8, LN — Uppercase requirement.

The system shall require a new password to contain at least one uppercase letter.

Acceptance criterion: Given a new password contains no uppercase letter, when it is submitted, then the system rejects the password.

Traces to: UR-105

##### SRS-105.9, LN — Lowercase requirement.

The system shall require a new password to contain at least one lowercase letter.

Acceptance criterion: Given a new password contains no lowercase letter, when it is submitted, then the system rejects the password.

Traces to: UR-105

##### SRS-105.10, LN — Number requirement.

The system shall require a new password to contain at least one number.

Acceptance criterion: Given a new password contains no number, when it is submitted, then the system rejects the password.

Traces to: UR-105

##### SRS-105.11, LN — Special-character requirement.

The system shall require a new password to contain at least one special character.

Acceptance criterion: Given a new password contains no special character, when it is submitted, then the system rejects the password.

Traces to: UR-105

##### SRS-105.12, LN — Current-password restriction.

The system shall reject a new password that is identical to the student's current password.

Acceptance criterion: Given the new password matches the current password, when the student submits the change request, then the system rejects the new password.

Traces to: UR-105

##### SRS-105.13, LN — Save changed password.

The system shall replace the current password after all password-change requirements are satisfied.

Acceptance criterion: Given all password-change requirements are satisfied, when the student submits the change, then the new password becomes the account password.

Traces to: UR-105

##### SRS-105.14, LN — End other sessions.

The system shall end all other authenticated sessions associated with the account after a successful password change.

Acceptance criterion: Given the student has active sessions on other devices, when the password is successfully changed, then those other sessions are ended.

Traces to: UR-105

##### SRS-105.15, LN — Preserve current session.

The system shall keep the session used to complete the successful password change authenticated.

Acceptance criterion: Given the student changes the password from the current device, when the change succeeds, then the current device remains authenticated.

Traces to: UR-105

##### SRS-105.16, LN — Password-change notification.

The system shall send a password-change confirmation to the student's registered university email after the password is changed successfully.

Acceptance criterion: Given the password has been changed successfully, when the change completes, then a confirmation is sent to the registered university email.

Traces to: UR-105

<a id="ur-106"></a>

#### UR-106, LN - Update My University Email

User requirement: As a student, I want to update the university email associated with my account, so that my account information remains accurate if my school email changes.

##### SRS-106.1, LN — University-email update access.

The system shall provide a signed-in student with an option to change the university email associated with the account.

Acceptance criterion: Given a student is signed in, when Account Settings is opened, then an option to update the university email is available.

Traces to: UR-106

##### SRS-106.2, LN — Current-password confirmation.

The system shall require the student to enter the current account password before submitting a university-email change request.

Acceptance criterion: Given a student attempts to change the university email, when no current password is entered, then the system prevents the request from completing.

Traces to: UR-106

##### SRS-106.3, LN — Email-change password verification.

The system shall reject the university-email change request when the submitted current password does not match the account password.

Acceptance criterion: Given an incorrect account password is entered, when the email-change request is submitted, then the system rejects the request.

Traces to: UR-106

##### SRS-106.4, LN — Supported replacement email.

When an account holder requests an email change, the system shall accept the replacement email only if its domain belongs to the launch university.

Acceptance criterion: Given an email from another university, when the change is submitted, then the replacement is rejected.

Traces to: UR-106

##### SRS-106.5, LN — Unique replacement email.

The system shall reject a replacement university email that is already associated with another SocialU account.

Acceptance criterion: Given the replacement email belongs to another account, when it is submitted, then the system rejects the email-change request.

Traces to: UR-106

##### SRS-106.6, LN — Replacement-email verification code.

The system shall send a six-digit verification code to the replacement university email after an eligible email-change request.

Acceptance criterion: Given an eligible replacement email is submitted, when the request is accepted, then a six-digit verification code is sent to the replacement email.

Traces to: UR-106

##### SRS-106.7, LN — Replacement-code validity.

The system shall keep the replacement-email verification code valid for 15 minutes from the time it is generated.

Acceptance criterion: Given a replacement-email code is less than 15 minutes old, when the correct code is submitted, then the system accepts it.

Traces to: UR-106

##### SRS-106.8, LN — Preserve current email during verification.

The system shall keep the currently verified university email associated with the account until the replacement email is successfully verified.

Acceptance criterion: Given the replacement email has not yet been verified, when the account information is viewed, then the current verified university email remains associated with the account.

Traces to: UR-106

##### SRS-106.9, LN — Complete email change.

The system shall replace the existing university email with the verified replacement university email after successful verification.

Acceptance criterion: Given the replacement email is successfully verified, when verification completes, then the replacement email becomes the account's university email.

Traces to: UR-106

##### SRS-106.10, LN — Deferred - university transfers.

Transfers between universities are outside the semester release. This identifier is retained for a future scope decision and is not an active semester requirement. Original parent: UR-106.

Traces to: UR-106.

##### SRS-106.11, LN — Deferred - university transfers.

Transfers between universities are outside the semester release. This identifier is retained for a future scope decision and is not an active semester requirement. Original parent: UR-106.

Traces to: UR-106.

##### SRS-106.12, LN — Deferred - university transfers.

Transfers between universities are outside the semester release. This identifier is retained for a future scope decision and is not an active semester requirement. Original parent: UR-106.

Traces to: UR-106.

##### SRS-106.13, LN — Deferred - university transfers.

Transfers between universities are outside the semester release. This identifier is retained for a future scope decision and is not an active semester requirement. Original parent: UR-106.

Traces to: UR-106.

<a id="ur-107"></a>

#### UR-107, LN - Review Recent Login Activity

User requirement: As a student, I want to view recent login activity for my account, so that I can identify possible unauthorized access.

##### SRS-107.1, LN — Login-history access.

The system shall allow a signed-in student to view the login history associated with the student's account.

Acceptance criterion: Given a student is signed in, when the Login Activity section is opened, then the student's recorded login history is displayed.

Traces to: UR-107

##### SRS-107.2, LN — Complete login history.

The system shall make all recorded login-history entries associated with the student's account available in the login-activity section.

Acceptance criterion: Given multiple login records exist, when the student reviews login history, then all recorded entries are available to the student.

Traces to: UR-107

##### SRS-107.3, LN — Login date.

The system shall display the recorded date for each login-history entry.

Acceptance criterion: Given a login-history record exists, when the record is displayed, then its recorded login date is shown.

Traces to: UR-107

##### SRS-107.4, LN — Login time.

The system shall display the recorded time for each login-history entry.

Acceptance criterion: Given a login-history record exists, when the record is displayed, then its recorded login time is shown.

Traces to: UR-107

##### SRS-107.5, LN — Login location.

The system shall display the recorded location associated with each login-history entry when location information is available.

Acceptance criterion: Given location information exists for a login record, when the record is displayed, then the recorded location is shown.

Traces to: UR-107

##### SRS-107.6, LN — Active-session status.

The system shall identify which recorded sessions are currently active.

Acceptance criterion: Given one or more sessions remain active, when login activity is viewed, then each active session is identified as active.

Traces to: UR-107

##### SRS-107.7, LN — Remote logout option.

The system shall provide the signed-in student with a logout action for another currently active session associated with the account.

Acceptance criterion: Given another active session exists, when the student views that session, then a remote logout option is available.

Traces to: UR-107

##### SRS-107.8, LN — End selected remote session.

The system shall terminate the selected active session after the student completes the remote logout action.

Acceptance criterion: Given another session is active, when the student confirms remote logout for that session, then the selected session is terminated.

Traces to: UR-107

##### SRS-107.9, LN — Preserve current session during remote logout.

The system shall keep the session being used to perform the remote logout active when another session is terminated.

Acceptance criterion: Given the student remotely logs out another session, when that logout completes, then the student's current session remains authenticated.

Traces to: UR-107

<a id="ur-108"></a>

#### UR-108, LN - Confirm Before Logging Out

User requirement: As a student, I want SocialU to ask for confirmation before logging me out, so that I do not accidentally end my session.

##### SRS-108.1, LN — Logout confirmation.

The system shall display a logout confirmation when a signed-in student selects Log Out.

Acceptance criterion: Given a student is signed in, when Log Out is selected, then the system displays a confirmation before ending the session.

Traces to: UR-108

##### SRS-108.2, LN — Logout confirmation choices.

The system shall provide both Cancel and Log Out options in the logout confirmation.

Acceptance criterion: Given the logout confirmation is displayed, when the student views the confirmation, then both Cancel and Log Out options are available.

Traces to: UR-108

##### SRS-108.3, LN — Cancel logout.

The system shall keep the student's authenticated session active when the student selects Cancel.

Acceptance criterion: Given the logout confirmation is displayed, when Cancel is selected, then the authenticated session remains active.

Traces to: UR-108

##### SRS-108.4, LN — Preserve page after canceled logout.

The system shall keep the student on the current page when the logout request is canceled.

Acceptance criterion: Given the student is viewing a SocialU page, when logout is canceled, then the same page remains displayed.

Traces to: UR-108

##### SRS-108.5, LN — Confirmed logout.

The system shall end the student's current authenticated session when the student confirms logout.

Acceptance criterion: Given the logout confirmation is displayed, when Log Out is confirmed, then the current authenticated session ends.

Traces to: UR-108

##### SRS-108.6, LN — End remembered session.

The system shall end the student's remembered authenticated session when the student manually confirms logout.

Acceptance criterion: Given Remember Me was previously selected, when the student manually logs out, then returning to SocialU requires authentication again.

Traces to: UR-108

##### SRS-108.7, LN — Logout destination.

The system shall direct the student to the login page after logout is completed successfully.

Acceptance criterion: Given the student confirms logout, when the authenticated session ends, then the login page is displayed.

Traces to: UR-108 2. Profile

<a id="area-109"></a>

### Profile

<a id="ur-109"></a>

#### UR-109, LN - Add Profile Information

User requirement: As a student, I want to add a profile photo, major, class year, and short bio, so that other students can learn more about me.

##### SRS-109.1, LN — Default profile avatar.

The system shall display a default avatar while a student has not yet uploaded a profile photo.

Acceptance criterion: Given a student has no saved profile photo, when the profile is displayed, then a default avatar is shown.

Traces to: UR-109

##### SRS-109.2, LN — Required profile photo.

The system shall require a student to upload a profile photo before completing required profile setup.

Acceptance criterion: Given no profile photo has been uploaded, when the student attempts to complete required profile setup, then the system prevents completion.

Traces to: UR-109

##### SRS-109.3, LN — Accepted photo formats.

The system shall accept JPG, JPEG, PNG, and HEIC files for profile-photo uploads.

Acceptance criterion: Given a profile photo is in JPG, JPEG, PNG, or HEIC format, when the student uploads the file within the size limit, then the system accepts the file format.

Traces to: UR-109

##### SRS-109.4, LN — Profile-photo size limit.

The system shall reject a profile-photo file that exceeds 10 MB.

Acceptance criterion: Given an image file is larger than 10 MB, when the student attempts to upload it, then the system rejects the file.

Traces to: UR-109

##### SRS-109.5, LN — Major entry.

The system shall require the student to enter a major as free-form text during required profile setup.

Acceptance criterion: Given the major field is empty, when the student attempts to complete required profile setup, then the system prevents completion.

Traces to: UR-109

##### SRS-109.6, LN — Class-year selection.

The system shall require the student to select Freshman, Sophomore, Junior, Senior, or Graduate as the class-year category.

Acceptance criterion: Given a student is completing profile setup, when the class-year control is viewed, then Freshman, Sophomore, Junior, Senior, and Graduate are available choices.

Traces to: UR-109

##### SRS-109.7, LN — Bio entry.

The system shall require the student to enter a bio during required profile setup.

Acceptance criterion: Given the bio field is empty, when the student attempts to complete required profile setup, then the system prevents completion.

Traces to: UR-109

##### SRS-109.8, LN — Bio character limit.

The system shall limit the profile bio to a maximum of 250 characters.

Acceptance criterion: Given the student attempts to enter more than 250 bio characters, when the bio is submitted, then the system prevents the bio from exceeding 250 characters.

Traces to: UR-109

##### SRS-109.9, LN — Required profile completion.

The system shall prevent required profile setup from being completed while the profile photo, major, class year, or bio is missing.

Acceptance criterion: Given at least one required profile field is missing, when the student attempts to finish profile setup, then the system prevents completion.

Traces to: UR-109

<a id="ur-110"></a>

#### UR-110, LN - Edit My Profile

User requirement: As a student, I want to edit my profile information, so that my profile remains accurate as my information changes.

##### SRS-110.1, LN — Edit profile photo.

The system shall allow a signed-in student to replace the profile photo associated with the student's account.

Acceptance criterion: Given the student has a saved profile photo, when a valid replacement photo is selected and saved, then the new photo replaces the previous photo.

Traces to: UR-110

##### SRS-110.2, LN — Edit major.

The system shall allow a signed-in student to modify the major shown on the student's profile.

Acceptance criterion: Given the student edits the major, when Save Changes is selected, then the saved major is updated.

Traces to: UR-110

##### SRS-110.3, LN — Edit class year.

The system shall allow a signed-in student to modify the class-year category shown on the student's profile.

Acceptance criterion: Given the student selects a different class year, when Save Changes is selected, then the saved class year is updated.

Traces to: UR-110

##### SRS-110.4, LN — Edit bio.

The system shall allow a signed-in student to modify the profile bio.

Acceptance criterion: Given the student edits the bio within the 250-character limit, when Save Changes is selected, then the updated bio is saved.

Traces to: UR-110

##### SRS-110.5, LN — Display-name editing.

The system shall allow a signed-in student to set or change a display name.

Acceptance criterion: Given the student is eligible to change the display name, when a new display name is entered and saved, then the new display name is stored.

Traces to: UR-110

##### SRS-110.6, LN — Display-name change interval.

The system shall prevent another display-name change until seven days have elapsed since the previous display-name change.

Acceptance criterion: Given fewer than seven days have elapsed since the previous display-name change, when the student attempts another change, then the system prevents the change.

Traces to: UR-110

##### SRS-110.7, LN — Save Changes action.

The system shall apply edited profile information after the student selects Save Changes.

Acceptance criterion: Given valid profile edits are present, when Save Changes is selected, then the edited values are stored and displayed.

Traces to: UR-110

##### SRS-110.8, LN — Unsaved-changes warning.

The system shall display a warning when the student attempts to leave profile editing while unsaved changes are present.

Acceptance criterion: Given unsaved profile changes exist, when the student attempts to leave the editing page, then an unsaved-changes warning is displayed.

Traces to: UR-110

##### SRS-110.9, LN — Leave with unsaved changes.

The system shall discard unsaved profile changes when the student confirms leaving the editing page.

Acceptance criterion: Given unsaved changes exist, when the student confirms leaving without saving, then those unsaved changes are discarded.

Traces to: UR-110

##### SRS-110.10, LN — Continue profile editing.

The system shall keep the student on the profile-editing page when the student cancels the unsaved-changes warning.

Acceptance criterion: Given the unsaved-changes warning is displayed, when the student cancels leaving, then the profile-editing page remains open with the unsaved values present.

Traces to: UR-110

<a id="ur-111"></a>

#### UR-111, LN - View My Activity Summary

User requirement: As a student, I want to see my profile post count excluding Snipes and my friend count, so that I can understand my published activity and network size.

##### SRS-111.1, LN — Post-count display.

The system shall display the student's current post count on the student's profile.

Acceptance criterion: Given a student's profile is opened, when the activity summary is displayed, then the current post count is shown.

Traces to: UR-111

##### SRS-111.2, LN — Post-count contents.

The system shall count the student's existing published feed posts, excluding Snipes, in the profile post count.

Acceptance criterion: Given two published feed posts and one approved Snipe, when the profile post count is displayed, then the count is two.

Traces to: UR-111

##### SRS-111.3, LN — Deleted-post exclusion.

The system shall exclude deleted posts from the displayed post count.

Acceptance criterion: Given the student deletes a post, when the post count is recalculated, then the deleted post is not included.

Traces to: UR-111

##### SRS-111.4, LN — Friend-count display.

The system shall display the total number of the student's current accepted friends.

Acceptance criterion: Given the student has accepted friendships, when the profile is displayed, then the friend count equals the number of current accepted friends.

Traces to: UR-111

##### SRS-111.5, LN — Pending-request exclusion.

The system shall exclude pending friend requests from the displayed friend count.

Acceptance criterion: Given the student has pending friend requests, when the friend count is calculated, then pending requests are not included.

Traces to: UR-111

##### SRS-111.6, LN — Friend-count update after removal.

The system shall update the displayed friend count after an existing friendship is removed.

Acceptance criterion: Given a friendship exists, when that friendship is removed, then the displayed friend count decreases accordingly.

Traces to: UR-111

##### SRS-111.7, LN — Friend-count update after blocking.

The system shall update the displayed friend count when blocking another student ends an existing friendship.

Acceptance criterion: Given two students are friends, when one student blocks the other, then the friendship ends and the displayed friend count updates accordingly.

Traces to: UR-111

##### SRS-111.8, LN — Activity-summary visibility.

The system shall allow an authorized profile viewer to see the profile owner's post count and friend count.

Acceptance criterion: Given a student is authorized to view another student's profile, when that profile is opened, then the post count and friend count are visible.

Traces to: UR-111

<a id="ur-112"></a>

#### UR-112, LN - Filter My Profile Content

User requirement: As a student, I want to view my profile content in Posts and Tagged categories that exclude Snipes, so that I can find my published or tagged feed content.

##### SRS-112.1, LN — Profile-content categories.

The system shall provide Posts and Tagged categories on a student's profile.

Acceptance criterion: Given a profile is opened, when its content controls appear, then Posts and Tagged are available and no Snipe category appears.

Traces to: UR-112

##### SRS-112.2, LN — Default profile category.

The system shall display the Posts category by default when a student profile is opened.

Acceptance criterion: Given a student opens a profile, when the profile first loads, then Posts is the selected category.

Traces to: UR-112

##### SRS-112.3, LN — Posts-category content.

The system shall display the student's text posts and photo posts when the Posts category is selected.

Acceptance criterion: Given the profile owner has text and photo posts, when Posts is selected, then those accessible posts are displayed.

Traces to: UR-112

##### SRS-112.4, LN — Tagged-category content.

The system shall display accessible content in which the student has been tagged when the Tagged category is selected.

Acceptance criterion: Given tagged content exists and is accessible to the viewer, when Tagged is selected, then that content is displayed.

Traces to: UR-112

##### SRS-112.5, LN — Exclude Snipes from my profile.

When a student opens their own profile, the system shall exclude Snipes from all profile content categories.

Acceptance criterion: Given the student has an approved Snipe, when they view each category on their own profile, then that Snipe is absent.

Traces to: UR-112

##### SRS-112.6, LN — Selected-category filtering.

The system shall display only content belonging to the currently selected profile category.

Acceptance criterion: Given a post belongs only to Posts, when the viewer selects Tagged, then that post is absent from the displayed results.

Traces to: UR-112

##### SRS-112.7, LN — Empty-category message.

The system shall display an empty-content message when the selected profile category contains no content.

Acceptance criterion: Given the selected category has no content, when that category is opened, then an empty-content message is displayed.

Traces to: UR-112

<a id="ur-113"></a>

#### UR-113, LN - View Another Student's Profile

User requirement: As a student, I want to view another student's school, major, class year, bio, and permitted profile content excluding Snipes, so that I can learn about them before connecting.

##### SRS-113.1, LN — View another student's profile.

The system shall allow a signed-in student to view another active student's profile when neither student has blocked the other.

Acceptance criterion: Given both accounts are active and no block exists, when one student opens the other's profile, then the profile is displayed.

Traces to: UR-113

##### SRS-113.2, LN — Profile-photo display.

The system shall display the profile owner's profile photo.

Acceptance criterion: Given a profile photo is saved, when another authorized student views the profile, then the profile photo is displayed.

Traces to: UR-113

##### SRS-113.3, LN — Display-name display.

The system shall display the profile owner's display name.

Acceptance criterion: Given the profile owner has a display name, when the profile is opened, then the display name is shown.

Traces to: UR-113

##### SRS-113.4, LN — School display.

The system shall display the profile owner's current university.

Acceptance criterion: Given a student's university is associated with the account, when the profile is viewed, then the university is displayed.

Traces to: UR-113

##### SRS-113.5, LN — Major display.

The system shall display the profile owner's major.

Acceptance criterion: Given the student has a saved major, when the profile is viewed, then the major is displayed.

Traces to: UR-113

##### SRS-113.6, LN — Class-year display.

The system shall display the profile owner's class year.

Acceptance criterion: Given a class year is saved, when the profile is viewed, then the class year is displayed.

Traces to: UR-113

##### SRS-113.7, LN — Bio display.

The system shall display the profile owner's bio.

Acceptance criterion: Given a bio is saved, when the profile is viewed, then the bio is displayed.

Traces to: UR-113

##### SRS-113.8, LN — Post-count display.

The system shall display the profile owner's post count.

Acceptance criterion: Given the profile is accessible, when another student views it, then the post count is displayed.

Traces to: UR-113

##### SRS-113.9, LN — Friend-count display.

The system shall display the profile owner's current accepted-friend count.

Acceptance criterion: Given the profile is accessible, when another student views it, then the accepted-friend count is displayed.

Traces to: UR-113

##### SRS-113.10, LN — Profile access before friendship.

The system shall allow a student to view another student's profile without requiring an accepted friendship.

Acceptance criterion: Given two students are not friends and no block exists, when one student opens the other's profile, then the profile is accessible.

Traces to: UR-113

##### SRS-113.11, LN — Public posts before friendship.

The system shall display only Public posts to a profile viewer who is not an accepted friend of the profile owner.

Acceptance criterion: Given the viewer is not a friend of the profile owner, when Posts is opened, then Public posts are displayed and Friends Only posts are hidden.

Traces to: UR-113

##### SRS-113.12, LN — Friends Only posts.

The system shall display Friends Only posts to a current accepted friend when that friend views the profile owner's Posts category.

Acceptance criterion: Given the viewer is a current accepted friend, when Posts is opened, then authorized Friends Only posts are displayed.

Traces to: UR-113

##### SRS-113.13, LN — Tagged-content access.

The system shall display tagged content that the viewing student is authorized to access.

Acceptance criterion: Given tagged content exists, when an authorized viewer selects Tagged, then the accessible tagged content is displayed.

Traces to: UR-113

##### SRS-113.14, LN — Exclude Snipes from another student's profile.

When a student views another student's profile, the system shall exclude all Snipe content from that profile.

Acceptance criterion: Given an approved Snipe, when another student's profile opens, then the Snipe is absent.

Traces to: UR-113

##### SRS-113.15, LN — Blocked-profile restriction.

The system shall prevent two students from viewing each other's profiles while a block between them is active.

Acceptance criterion: Given a block is active between two students, when either attempts to open the other's profile, then profile access is denied.

Traces to: UR-113

##### SRS-113.16, LN — Add Friend action.

The system shall provide an Add Friend action when the profile owner is eligible to receive a friend request from the viewing student.

Acceptance criterion: Given two students are not friends, no request is pending, and no block exists, when one views the other's profile, then Add Friend is available.

Traces to: UR-113

##### SRS-113.17, LN — Friend messaging action.

The system shall allow a current friend to use the Message action from the profile owner's profile.

Acceptance criterion: Given two students are current friends, when one views the other's profile, then the Message action is available.

Traces to: UR-113

##### SRS-113.18, LN — Non-friend messaging action.

The system shall allow a non-friend to use the Message action from the profile owner's profile when neither student has blocked the other.

Acceptance criterion: Given two students are not friends and no block exists, when one views the other's profile, then the Message action is available for creating a message request.

Traces to: UR-113

<a id="area-114"></a>

### Friendships

<a id="ur-114"></a>

#### UR-114, LN - Send a Friend Request

User requirement: As a student, I want to send a friend request from another student's profile, so that I can connect with classmates and other students I know.

##### SRS-114.1, LN — Add Friend action.

The system shall provide an Add Friend action on another student's profile when the viewing student is eligible to send a friend request.

Acceptance criterion: Given two students are not friends, no request is pending, and no block exists, when one student opens the other's profile, then Add Friend is displayed.

Traces to: UR-114

##### SRS-114.2, LN — Create pending friend request.

The system shall create a pending friend request when an eligible student selects Add Friend.

Acceptance criterion: Given Student A is eligible to send Student B a request, when Student A selects Add Friend, then a pending request is created for Student B.

Traces to: UR-114

##### SRS-114.3, LN — Duplicate pending-request restriction.

The system shall prevent another friend request to the same student while an existing request between the two students remains pending.

Acceptance criterion: Given a pending request already exists between two students, when the sender attempts another request, then the system prevents a duplicate pending request.

Traces to: UR-114

##### SRS-114.4, LN — Friendship requires acceptance.

The system shall not create a friendship until the receiving student accepts the pending friend request.

Acceptance criterion: Given a request is pending, when it has not yet been accepted, then the two students are not listed as friends.

Traces to: UR-114

##### SRS-114.5, LN — New request after decline.

The system shall allow a student to send another friend request after a previous request to the same student has been declined.

Acceptance criterion: Given a previous request was declined and no block exists, when the sender returns to the student's profile, then Add Friend is available again.

Traces to: UR-114

##### SRS-114.6, LN — No resend waiting period.

The system shall allow the new friend request immediately after the previous request has been declined.

Acceptance criterion: Given a request has just been declined, when the previous sender submits a new eligible request, then the system accepts it without a waiting period.

Traces to: UR-114

##### SRS-114.7, LN — Friend-request notification.

The system shall notify the receiving student when a new friend request is submitted successfully.

Acceptance criterion: Given a friend request is successfully created, when the request is recorded, then the receiving student receives a friend-request notification.

Traces to: UR-114

##### SRS-114.8, LN — Blocked-request restriction.

The system shall prevent a friend request when either student has blocked the other.

Acceptance criterion: Given a block exists between two students, when either attempts to send a friend request, then the request is prevented.

Traces to: UR-114

<a id="ur-115"></a>

#### UR-115, LN - View Pending Friend Requests

User requirement: As a student, I want to view my pending friend requests, so that I can see which students are waiting for my response.

##### SRS-115.1, LN — Received requests.

The system shall display friend requests waiting for the signed-in student's response in a Requests Received section.

Acceptance criterion: Given one or more received requests are pending, when the student opens Requests Received, then those pending requests are displayed.

Traces to: UR-115

##### SRS-115.2, LN — Sent requests.

The system shall display unanswered friend requests submitted by the signed-in student in a Requests Sent section.

Acceptance criterion: Given the student has sent unanswered requests, when Requests Sent is opened, then those requests are displayed.

Traces to: UR-115

##### SRS-115.3, LN — Request profile photo.

The system shall display the other student's profile photo with each pending friend request.

Acceptance criterion: Given a pending request is displayed, when the request information loads, then the other student's profile photo is shown.

Traces to: UR-115

##### SRS-115.4, LN — Request display name.

The system shall display the other student's display name with each pending friend request.

Acceptance criterion: Given a pending request is displayed, when the request information loads, then the other student's display name is shown.

Traces to: UR-115

##### SRS-115.5, LN — Request school information.

The system shall display the other student's current university with each pending friend request.

Acceptance criterion: Given a pending request is displayed, when its student information loads, then the student's current university is shown.

Traces to: UR-115

##### SRS-115.6, LN — Request major information.

The system shall display the other student's major with each pending friend request.

Acceptance criterion: Given a pending request is displayed, when its student information loads, then the student's major is shown.

Traces to: UR-115

##### SRS-115.7, LN — Request post information.

The system shall display posts associated with the other student that the signed-in student is authorized to view.

Acceptance criterion: Given accessible posts exist for the other student, when request-related profile information is viewed, then only authorized posts are displayed.

Traces to: UR-115

##### SRS-115.8, LN — Open profile from request.

The system shall allow the signed-in student to open the other student's profile from a pending friend request.

Acceptance criterion: Given a pending friend request is displayed, when the student selects the associated profile, then that student's profile opens.

Traces to: UR-115

##### SRS-115.9, LN — Cancel sent request.

The system shall allow the sender to cancel a friend request while the request remains pending.

Acceptance criterion: Given a sent request remains pending, when the sender selects Cancel Request, then the system cancels the request.

Traces to: UR-115

##### SRS-115.10, LN — Remove canceled request.

The system shall remove a canceled friend request from both students' pending-request lists.

Acceptance criterion: Given a pending request is canceled, when cancellation completes, then the request no longer appears in either student's pending list.

Traces to: UR-115

##### SRS-115.11, LN — Pending-request duration.

The system shall keep an unanswered friend request pending until it is accepted, declined, canceled, or removed because of a block.

Acceptance criterion: Given a request has not been accepted, declined, canceled, or removed by a block, when time passes, then the request remains pending.

Traces to: UR-115

<a id="ur-116"></a>

#### UR-116, LN - Accept a Friend Request

User requirement: As a student, I want to accept a friend request, so that the requester can become part of my SocialU network.

##### SRS-116.1, LN — Accept pending request.

The system shall allow the recipient of a pending friend request to accept the request.

Acceptance criterion: Given a received friend request is pending, when the recipient selects Accept, then the system processes the acceptance.

Traces to: UR-116

##### SRS-116.2, LN — Create mutual friendship.

The system shall establish a mutual friendship immediately after the pending friend request is accepted.

Acceptance criterion: Given a pending friend request exists, when the recipient accepts it, then both students are recorded as current friends.

Traces to: UR-116

##### SRS-116.3, LN — Remove accepted request.

The system shall remove an accepted request from both students' pending-request lists.

Acceptance criterion: Given a pending request is accepted, when the friendship is established, then the request no longer appears in either pending list.

Traces to: UR-116

##### SRS-116.4, LN — Requester acceptance notification.

The system shall notify the requester after the request is accepted.

Acceptance criterion: Given the recipient accepts the request, when acceptance completes, then the requester receives a friendship notification.

Traces to: UR-116

##### SRS-116.5, LN — Recipient friendship notification.

The system shall notify the recipient that the friendship has been established after the request is accepted.

Acceptance criterion: Given the recipient accepts the request, when the friendship is created, then the recipient receives confirmation of the friendship.

Traces to: UR-116

##### SRS-116.6, LN — Friends Only access.

The system shall allow the new friends to view each other's Friends Only posts after the friendship is established.

Acceptance criterion: Given two students have become friends, when either views the other's Posts category, then authorized Friends Only posts are accessible.

Traces to: UR-116

##### SRS-116.7, LN — Messaging access.

The system shall allow either new friend to start or open a private conversation with the other after the friendship is established.

Acceptance criterion: Given two students are current friends, when either selects Message from the other's profile, then the existing conversation opens or a new conversation is created.

Traces to: UR-116

##### SRS-116.8, LN — Pending request removal after block.

The system shall remove a pending friend request when either student blocks the other before acceptance.

Acceptance criterion: Given a friend request is pending, when either student blocks the other, then the pending request is removed.

Traces to: UR-116

<a id="ur-117"></a>

#### UR-117, LN - Decline a Friend Request

User requirement: As a student, I want to decline a friend request, so that I can control who becomes part of my SocialU network.

##### SRS-117.1, LN — Decline pending request.

The system shall allow the recipient of a pending friend request to decline the request.

Acceptance criterion: Given a received request is pending, when the recipient selects Decline, then the system processes the decline.

Traces to: UR-117

##### SRS-117.2, LN — Remove declined request.

The system shall remove a declined friend request from both students' pending-request lists immediately after the request is declined.

Acceptance criterion: Given a pending request is declined, when the decline is processed, then the request no longer appears in either pending list.

Traces to: UR-117

##### SRS-117.3, LN — No friendship after decline.

The system shall not create a friendship when a pending friend request is declined.

Acceptance criterion: Given a request is declined, when the decline completes, then the two students are not recorded as friends.

Traces to: UR-117

##### SRS-117.4, LN — No decline notification.

The system shall not notify the requester that the friend request was declined.

Acceptance criterion: Given the recipient declines a friend request, when the decline completes, then no decline notification is sent to the requester.

Traces to: UR-117

##### SRS-117.5, LN — Future request after decline.

The system shall allow the requester to send another friend request after the previous request has been declined.

Acceptance criterion: Given a previous request was declined and no block exists, when the requester sends another request, then the new request is allowed.

Traces to: UR-117

##### SRS-117.6, LN — Immediate request after decline.

The system shall allow the new friend request without a waiting period after the previous request is declined.

Acceptance criterion: Given a request has just been declined, when the requester immediately submits another eligible request, then the system accepts it.

Traces to: UR-117

##### SRS-117.7, LN — Request from previous recipient.

The system shall allow the student who declined a request to send a future friend request to the previous requester.

Acceptance criterion: Given Student B previously declined Student A's request, when Student B later sends Student A an eligible request, then the request is allowed.

Traces to: UR-117

##### SRS-117.8, LN — Decline does not block.

The system shall not block a student solely because the student's friend request was declined.

Acceptance criterion: Given a friend request is declined, when the decline completes, then no block relationship is created.

Traces to: UR-117

<a id="ur-118"></a>

#### UR-118, LN - Search My Friends List

User requirement: As a student, I want to search my friends list by name, so that I can quickly find a specific friend.

##### SRS-118.1, LN — Friends-list search field.

The system shall provide a search field while the student is viewing the friends list.

Acceptance criterion: Given the student opens the friends list, when the page loads, then a search field is available.

Traces to: UR-118

##### SRS-118.2, LN — Display-name search.

The system shall match current friends whose display names contain the entered search text.

Acceptance criterion: Given a friend's display name contains the entered search text, when that text is entered, then the friend appears in the results.

Traces to: UR-118

##### SRS-118.3, LN — Verified-name search.

The system shall match current friends whose verified real names contain the entered search text.

Acceptance criterion: Given a friend's verified real name contains the entered search text, when that text is entered, then the friend appears in the results.

Traces to: UR-118

##### SRS-118.4, LN — Partial-name search.

The system shall return matching friends when the entered search text contains only part of a friend's display name or verified real name.

Acceptance criterion: Given a friend named "Linh" exists, when the student enters "Lin," Then that friend appears in the results.

Traces to: UR-118

##### SRS-118.5, LN — Case-insensitive search.

The system shall treat uppercase and lowercase letters as equivalent when matching friends-list search text.

Acceptance criterion: Given a friend's name is "Linh," When the student enters "LINH," Then the friend is returned as a match.

Traces to: UR-118

##### SRS-118.6, LN — Search-as-you-type.

The system shall update friends-list search results as the student enters or removes characters in the search field.

Acceptance criterion: Given the student is typing in the friends search field, when a character is added or removed, then the displayed matching results update without requiring a separate Search action.

Traces to: UR-118

##### SRS-118.7, LN — Search-result profile photo.

The system shall display the friend's profile photo for each search result.

Acceptance criterion: Given a friend appears in the search results, when the result is displayed, then that friend's profile photo is shown.

Traces to: UR-118

##### SRS-118.8, LN — Search-result display name.

The system shall display the friend's display name for each search result.

Acceptance criterion: Given a friend appears in search results, when the result is displayed, then the friend's display name is shown.

Traces to: UR-118

##### SRS-118.9, LN — Search-result major.

The system shall display the friend's major for each search result.

Acceptance criterion: Given a friend appears in search results, when the result is displayed, then the friend's major is shown.

Traces to: UR-118

##### SRS-118.10, LN — No-match message.

The system shall display "No friends found" when no current friend matches the entered search text.

Acceptance criterion: Given no accepted friend matches the entered search text, when search results update, then "No friends found" is displayed.

Traces to: UR-118

##### SRS-118.11, LN — Friends-list capacity.

The system shall not impose a fixed user-facing maximum on the number of accepted friends a student may have.

Acceptance criterion: Given a student continues establishing valid friendships, when the number of accepted friends increases, then the system does not reject a friendship solely because a fixed friend-count limit was reached.

Traces to: UR-118

<a id="ur-119"></a>

#### UR-119, LN - Open messaging from a profile.

User requirement: As a student, I want the Message action on a profile to open an authorized conversation or a message request addressed to that student, so that I can begin communication without finding them again in Messages.

##### SRS-119.1, LN — Profile Message action.

The system shall provide a Message action on another student's profile when messaging between the two students is permitted.

Acceptance criterion: Given no active block prevents messaging, when another student's profile is opened, then a Message action is available.

Traces to: UR-119

##### SRS-119.2, LN — Existing friend conversation.

The system shall open the existing private conversation when a student selects Message on the profile of a friend with whom a conversation already exists.

Acceptance criterion: Given two friends already have a private conversation, when Message is selected from the friend's profile, then the existing conversation opens.

Traces to: UR-119

##### SRS-119.3, LN — New friend conversation.

The system shall create a private conversation when a student selects Message on a current friend's profile and no private conversation exists between them.

Acceptance criterion: Given two students are friends and have no existing conversation, when Message is selected, then a new private conversation is created.

Traces to: UR-119

##### SRS-119.4, LN — Open a non-friend message request.

When Message is selected for a non-friend without valid accepted messaging consent, the system shall open the Chat request workflow addressed to that student.

Acceptance criterion: Given an eligible non-friend, when Message is selected, then the request composer identifies that recipient.

Traces to: UR-119. Chat behavior: SRS-200.7 through SRS-200.19.

##### SRS-119.5, LN — Retired - request inbox display.

The Chat owner specifies incoming request presentation in SRS-200.8. This duplicate identifier is retained as a retirement record and is not reused. Original parent: UR-119.

Traces to: UR-119.

##### SRS-119.6, LN — Conversation after friendship removal.

The system shall keep an existing private conversation accessible after the friendship between its participants is removed.

Acceptance criterion: Given two former friends have an existing conversation, when the friendship is removed, then both students can still open the previous conversation.

Traces to: UR-119

##### SRS-119.7, LN — Renew messaging consent.

After friendship removal, the system shall require a new accepted request before sending resumes.

Acceptance criterion: Given former friends without a newly accepted request, when either tries to send, then sending is prevented; accepting a new request permits sending.

Traces to: UR-119.

##### SRS-119.8, LN — Conversation after blocking.

The system shall keep an existing conversation visible after a block between its participants becomes active.

Acceptance criterion: Given two students have an existing conversation, when one blocks the other, then the previous conversation remains visible.

Traces to: UR-119

##### SRS-119.9, LN — Messaging while blocked.

The system shall prevent new messages from being sent between two students while a block between them is active.

Acceptance criterion: Given a block is active, when either student attempts to send the other a message, then the system prevents the message from being sent.

Traces to: UR-119

##### SRS-119.10, LN — Delete own sent message.

The system shall allow a student to delete an individual message that the student personally sent.

Acceptance criterion: Given the student previously sent a message, when the student selects Delete for that message, then the system allows the deletion from the student's own view.

Traces to: UR-119

##### SRS-119.11, LN — Personal-view message deletion.

The system shall remove a deleted sent message only from the deleting student's conversation view.

Acceptance criterion: Given a student deletes a previously sent message, when deletion completes, then that message no longer appears in the deleting student's conversation view.

Traces to: UR-119

##### SRS-119.12, LN — Preserve message for other participant.

The system shall keep the deleted message visible to the other conversation participant.

Acceptance criterion: Given the sender deletes a message from the sender's own view, when the other participant views the conversation, then the message remains visible to that participant.

Traces to: UR-119

##### SRS-119.13, LN — Received-message deletion restriction.

The system shall prevent a student from deleting a message sent by the other conversation participant.

Acceptance criterion: Given a message was sent by the other participant, when the student views that message, then no delete action is provided for removing it from the student's own view.

Traces to: UR-119

<a id="ur-120"></a>

#### UR-120, LN - Remove a Friend

User requirement: As a student, I want to remove someone from my friends list, so that I can manage my connections as relationships change.

##### SRS-120.1, LN — Remove Friend action.

The system shall provide a Remove Friend action on the profile of a current friend.

Acceptance criterion: Given two students are current friends, when one views the other's profile, then Remove Friend is available.

Traces to: UR-120

##### SRS-120.2, LN — Removal confirmation.

The system shall request confirmation when a student selects Remove Friend.

Acceptance criterion: Given Remove Friend is selected, when the action is initiated, then the system requests confirmation before ending the friendship.

Traces to: UR-120

##### SRS-120.3, LN — Cancel friend removal.

The system shall keep the existing friendship unchanged when the student cancels the removal confirmation.

Acceptance criterion: Given a removal confirmation is displayed, when Cancel is selected, then the friendship remains active.

Traces to: UR-120

##### SRS-120.4, LN — End friendship.

The system shall remove the mutual friendship when the student confirms Remove Friend.

Acceptance criterion: Given two students are friends, when Remove Friend is confirmed, then the mutual friendship is removed.

Traces to: UR-120

##### SRS-120.5, LN — No removal notification.

The system shall not notify the removed student that the friendship was removed.

Acceptance criterion: Given a friendship is removed, when the removal completes, then no friendship-removal notification is sent to the other student.

Traces to: UR-120

##### SRS-120.6, LN — Remove Friends Only access.

The system shall prevent former friends from viewing each other's Friends Only posts after the friendship is removed.

Acceptance criterion: Given a friendship has been removed, when either former friend views the other's profile, then Friends Only posts are not accessible.

Traces to: UR-120

##### SRS-120.7, LN — Preserve previous conversation.

The system shall keep an existing private conversation accessible after the friendship is removed.

Acceptance criterion: Given an existing private conversation exists, when the friendship is removed, then the previous conversation remains accessible.

Traces to: UR-120

##### SRS-120.8, LN — Retired - duplicate sending restriction.

SRS-119.7 and SRS-200.17 through SRS-200.18 govern renewed messaging consent after friendship removal. This identifier is retained and is not reused. Original parent: UR-120.

Traces to: UR-120.

##### SRS-120.9, LN — Future friend requests.

The system shall allow either former friend to send a new friend request after the friendship is removed when neither student has blocked the other.

Acceptance criterion: Given a friendship was removed and no block exists, when either former friend sends a new request, then the system allows the request.

Traces to: UR-120

<a id="ur-121"></a>

#### UR-121, LN - Block Another Student

User requirement: As a student, I want to block another student, so that I can prevent unwanted contact and interaction from that person.

##### SRS-121.1, LN — Block action.

The system shall provide a Block action on another student's profile.

Acceptance criterion: Given another student's profile is accessible, when the profile actions are viewed, then Block is available.

Traces to: UR-121

##### SRS-121.2, LN — Block confirmation.

The system shall request confirmation when a student selects Block.

Acceptance criterion: Given the student selects Block, when the action begins, then the system requests confirmation before activating the block.

Traces to: UR-121

##### SRS-121.3, LN — Cancel block.

The system shall leave the relationship between the two students unchanged when the block confirmation is canceled.

Acceptance criterion: Given a block confirmation is displayed, when Cancel is selected, then no block is activated.

Traces to: UR-121

##### SRS-121.4, LN — Activate block.

The system shall activate the block when the student confirms the Block action.

Acceptance criterion: Given the block confirmation is displayed, when the student confirms Block, then the block becomes active.

Traces to: UR-121

##### SRS-121.5, LN — No block notification.

The system shall not notify the blocked student that the block was activated.

Acceptance criterion: Given a block is activated, when the action completes, then no block notification is sent to the blocked student.

Traces to: UR-121

##### SRS-121.6, LN — End friendship after block.

The system shall remove an existing friendship between the two students when a block is activated.

Acceptance criterion: Given two students are friends, when one blocks the other, then the friendship is removed.

Traces to: UR-121

##### SRS-121.7, LN — Remove pending request after block.

The system shall remove any pending friend request between the two students when a block is activated.

Acceptance criterion: Given a pending request exists between two students, when either activates a block, then the pending request is removed.

Traces to: UR-121

##### SRS-121.8, LN — Block profile access.

The system shall prevent the two students from viewing each other's profiles while the block is active.

Acceptance criterion: Given a block is active, when either student attempts to open the other's profile, then access is denied.

Traces to: UR-121

##### SRS-121.9, LN — Block friend requests.

The system shall prevent either student from sending a friend request to the other while the block is active.

Acceptance criterion: Given a block is active, when either student attempts to send a friend request to the other, then the request is prevented.

Traces to: UR-121

##### SRS-121.10, LN — Block new messages.

The system shall prevent either student from sending a new direct message to the other while the block is active.

Acceptance criterion: Given a block is active, when either student attempts to send a direct message, then the system prevents sending.

Traces to: UR-121

##### SRS-121.11, LN — Block post visibility.

The system shall prevent the two students from viewing each other's posts while the block is active.

Acceptance criterion: Given a block is active, when either student attempts to access the other's posts, then those posts are not displayed.

Traces to: UR-121

##### SRS-121.12, LN — Preserve old blocked conversation.

The system shall keep an existing private conversation visible after a block is activated.

Acceptance criterion: Given an existing conversation exists, when one participant blocks the other, then the prior conversation remains visible.

Traces to: UR-121

##### SRS-121.13, LN — Disable blocked conversation.

The system shall disable new message sending in an existing private conversation while a block between the participants is active.

Acceptance criterion: Given an existing conversation remains visible and a block is active, when either participant attempts to send a new message, then the send action is disabled.

Traces to: UR-121

<a id="ur-122"></a>

#### UR-122, LN - Manage Blocked Students

User requirement: As a student, I want to view my blocked-students list and unblock a student when needed, so that I can manage previous blocking decisions.

##### SRS-122.1, LN — Blocked Students access.

The system shall provide a Blocked Students section within Account Settings.

Acceptance criterion: Given a student is signed in, when Account Settings is opened, then a Blocked Students section is available.

Traces to: UR-122

##### SRS-122.2, LN — Blocked-student profile photo.

The system shall display the blocked student's profile photo for each entry in the Blocked Students list.

Acceptance criterion: Given at least one blocked student exists, when the Blocked Students list is viewed, then each entry displays a profile photo.

Traces to: UR-122

##### SRS-122.3, LN — Blocked-student display name.

The system shall display the blocked student's display name for each entry in the Blocked Students list.

Acceptance criterion: Given a blocked student entry exists, when the list is viewed, then that student's display name is shown.

Traces to: UR-122

##### SRS-122.4, LN — Blocked-student school.

The system shall display the blocked student's current university for each entry in the Blocked Students list.

Acceptance criterion: Given a blocked student entry exists, when the list is viewed, then the student's current university is shown.

Traces to: UR-122

##### SRS-122.5, LN — Blocked-student major.

The system shall display the blocked student's major for each entry in the Blocked Students list.

Acceptance criterion: Given a blocked student entry exists, when the list is viewed, then the student's major is shown.

Traces to: UR-122

##### SRS-122.6, LN — Unblock action.

The system shall provide an Unblock action for each student in the Blocked Students list.

Acceptance criterion: Given a blocked student is listed, when that entry is viewed, then an Unblock action is available.

Traces to: UR-122

##### SRS-122.7, LN — Unblock confirmation.

The system shall request confirmation when the student selects Unblock.

Acceptance criterion: Given the student selects Unblock, when the action begins, then the system requests confirmation before removing the block.

Traces to: UR-122

##### SRS-122.8, LN — Cancel unblock.

The system shall keep the block active when the student cancels the unblock confirmation.

Acceptance criterion: Given an unblock confirmation is displayed, when Cancel is selected, then the existing block remains active.

Traces to: UR-122

##### SRS-122.9, LN — Remove block.

The system shall remove the active block when the student confirms Unblock.

Acceptance criterion: Given an active block exists, when Unblock is confirmed, then the block is removed.

Traces to: UR-122

##### SRS-122.10, LN — No unblock notification.

The system shall not notify the unblocked student that the block was removed.

Acceptance criterion: Given a student is successfully unblocked, when the unblock completes, then no unblock notification is sent to that student.

Traces to: UR-122

##### SRS-122.11, LN — No automatic friendship restoration.

The system shall not automatically restore a previous friendship when a student is unblocked.

Acceptance criterion: Given two students were previously friends before blocking, when the block is removed, then they remain non-friends.

Traces to: UR-122

##### SRS-122.12, LN — Future request after unblock.

The system shall allow either student to send a new friend request after the block is removed.

Acceptance criterion: Given a previous block has been removed, when either student submits an eligible friend request, then the system allows the request.

Traces to: UR-122

<a id="ur-123"></a>

#### UR-123, LN - Deactivate My Account

User requirement: As a student, I want to deactivate my SocialU account, so that I can stop using the platform without permanently losing my data if I decide to return later.

##### SRS-123.1, LN — Deactivate Account access.

The system shall provide a Deactivate Account option within Account Settings.

Acceptance criterion: Given a student is signed in, when Account Settings is opened, then Deactivate Account is available.

Traces to: UR-123

##### SRS-123.2, LN — Deactivation confirmation.

The system shall request confirmation when the student selects Deactivate Account.

Acceptance criterion: Given Deactivate Account is selected, when the deactivation process begins, then the system displays a confirmation request.

Traces to: UR-123

##### SRS-123.3, LN — Deactivation password entry.

The system shall require the student to enter the current account password before completing account deactivation.

Acceptance criterion: Given the student confirms the intent to deactivate, when no password is entered, then the system prevents deactivation from completing.

Traces to: UR-123

##### SRS-123.4, LN — Deactivation password verification.

The system shall reject an account-deactivation request when the submitted password does not match the current account password.

Acceptance criterion: Given an incorrect password is submitted, when the student attempts to deactivate the account, then the system rejects the request.

Traces to: UR-123

##### SRS-123.5, LN — Cancel deactivation.

The system shall keep the student's account active when the student cancels the deactivation confirmation.

Acceptance criterion: Given the deactivation confirmation is displayed, when Cancel is selected, then the account remains active.

Traces to: UR-123

##### SRS-123.6, LN — Deactivate account.

The system shall change the student's account to an inactive state after deactivation is successfully confirmed.

Acceptance criterion: Given the correct password is entered and deactivation is confirmed, when the process completes, then the account is marked inactive.

Traces to: UR-123

##### SRS-123.7, LN — Hide deactivated profile.

The system shall prevent other students from viewing the profile of a deactivated account.

Acceptance criterion: Given an account is deactivated, when another student attempts to view its profile, then the profile is not accessible.

Traces to: UR-123

##### SRS-123.8, LN — Hide deactivated-account posts.

The system shall prevent other students from viewing posts created by a student while that student's account is deactivated.

Acceptance criterion: Given an account is deactivated, when another student attempts to view posts created by that account, then those posts are hidden.

Traces to: UR-123

##### SRS-123.9, LN — Preserve deactivated-account data.

The system shall preserve the student's account data while the account is deactivated.

Acceptance criterion: Given an account is deactivated, when the account remains inactive, then the previously saved account data is retained.

Traces to: UR-123

##### SRS-123.10, LN — Preserve friendships during deactivation.

The system shall preserve existing friendship connections while the account is deactivated.

Acceptance criterion: Given existing friendships are present, when the account is deactivated, then those friendship records are retained.

Traces to: UR-123

##### SRS-123.11, LN — Reactivate with valid credentials.

When a deactivated account holder submits valid account credentials, the system shall reactivate the account before completing authenticated sign-in.

Acceptance criterion: Given a deactivated verified account, when valid credentials are submitted, then the account becomes active and sign-in can complete.

Traces to: UR-123.

##### SRS-123.12, LN — Restore profile after reactivation.

The system shall make the student's profile visible again after successful account reactivation.

Acceptance criterion: Given the account has been reactivated, when an authorized student opens the profile, then the profile is visible again.

Traces to: UR-123

##### SRS-123.13, LN — Restore posts after reactivation.

The system shall make the student's preserved posts available again after successful account reactivation.

Acceptance criterion: Given preserved posts existed before deactivation, when the account is reactivated, then those posts become available again according to their visibility settings.

Traces to: UR-123

##### SRS-123.14, LN — Restore friendships after reactivation.

The system shall restore access to the student's preserved friendship connections after successful account reactivation.

Acceptance criterion: Given friendship connections were preserved during deactivation, when the account is reactivated, then those friendships become active again.

Traces to: UR-123

<a id="section-LP"></a>

## 5. Chat

Feature owner: Loens Paul (LP).

<a id="area-200"></a>

### Private Messaging

<a id="ur-200"></a>

#### UR-200, LP - Start a private conversation.

User requirement: As a student, I want to start a private conversation with a current friend or a non-friend who accepts my message request, so that I can communicate with students who agree to receive my messages.

##### SRS-200.1, LP — Start a friend conversation.

When a signed-in student selects a current friend to message and neither account has blocked the other, the system shall open their private conversation.

Traces to: UR-200.

##### SRS-200.2, LP — Require non-friend acceptance.

When two students are not current friends and have no currently accepted message request between them, the system shall withhold an active private conversation until the recipient accepts a request.

Traces to: UR-200.

##### SRS-200.3, LP — Identify the initiating participant.

When a private conversation is created, the system shall designate the initiating student as one participant.

Traces to: UR-200.

##### SRS-200.4, LP — Identify the receiving participant.

When a private conversation is created, the system shall designate the selected recipient as the other participant.

Traces to: UR-200.

##### SRS-200.5, LP — Limit private conversation membership.

For each private conversation, the system shall maintain exactly two participants.

Traces to: UR-200.

##### SRS-200.6, LP — Reuse the existing conversation.

When messaging becomes authorized for a pair that already has a private conversation, the system shall open that existing conversation rather than create another.

Traces to: UR-200.

##### SRS-200.7, LP — Submit a message request.

When a signed-in student submits a new request containing initial text to a non-friend without current messaging consent and neither account has blocked the other, the system shall record a Pending message request addressed to that recipient.

Traces to: UR-200.

##### SRS-200.8, LP — Show incoming requests.

When the recipient opens Message Requests within Messages, the system shall display their pending requests with the sender and initial text.

Traces to: UR-200.

##### SRS-200.9, LP — Accept a request.

When the addressed recipient accepts a Pending request and neither account has blocked the other, the system shall mark that request Accepted.

Traces to: UR-200.

##### SRS-200.10, LP — Open after acceptance.

When a message request becomes Accepted, the system shall open or reactivate the pair's private conversation with messaging enabled.

Traces to: UR-200.

##### SRS-200.11, LP — Decline a request.

When the addressed recipient declines a Pending request, the system shall mark it Declined without enabling the private conversation.

Traces to: UR-200.

##### SRS-200.12, LP — Prevent duplicate pending requests.

When a student submits another request while their request to the same recipient remains Pending, the system shall return the existing pending request rather than create a duplicate.

Traces to: UR-200.

##### SRS-200.13, LP — Restrict request decisions.

When anyone other than the addressed recipient attempts to accept or decline a message request, the system shall reject the attempted decision.

Traces to: UR-200.

##### SRS-200.14, LP — Deliver the accepted introduction once.

When a request first becomes Accepted, the system shall add its initial text to the private conversation exactly once.

Traces to: UR-200.

##### SRS-200.15, LP — Keep requests separate from friendships.

When a message request is accepted, the system shall leave the pair's friendship status unchanged.

Traces to: UR-200.

##### SRS-200.16, LP — Check private sending permission.

When a student attempts to send text, a photograph, an emoji, or a GIF in a private conversation, the system shall permit sending only if neither account has blocked the other and the pair are current friends or have an accepted request that has not been invalidated by a later friendship removal.

Traces to: UR-200.

##### SRS-200.17, LP — Invalidate consent on friendship removal.

When an existing friendship ends, the system shall invalidate any earlier message-request acceptance for that pair.

Traces to: UR-200.

##### SRS-200.18, LP — Request permission after unfriending.

When former friends attempt to resume sending without an accepted request created after their latest friendship removal, the system shall route the sender through a new message request unless their friendship has been re-established.

Traces to: UR-200.

##### SRS-200.19, LP — Reject blocked contact requests.

When a block is active between two students, the system shall reject attempts to submit or accept a message request between them.

Traces to: UR-200.

<a id="ur-201"></a>

#### UR-201, LP - Communicate through messages.

User requirement: As a student, I want to send text messages, photos, emojis, and GIFs in conversations, so that I have multiple ways to communicate.

##### SRS-201.1, LP — Send a text message.

The system shall allow a conversation participant to send a text message within a conversation.

Traces to: UR-201.

##### SRS-201.2, LP — Display a sent text message.

After a text message is successfully sent, the system shall display the text message within the conversation.

Traces to: UR-201.

##### SRS-201.3, LP — Select a photo for sending.

The system shall allow a conversation participant to select a photo file from their device for sending within a conversation.

Traces to: UR-201.

##### SRS-201.4, LP — Restrict supported photo formats.

The system shall accept conversation photo uploads only when the selected file uses the PNG, JPEG, or WebP format.

Traces to: UR-201.

##### SRS-201.5, LP — Enforce the photo size limit.

The system shall reject a selected photo file when the file is larger than 15 MB.

Traces to: UR-201.

##### SRS-201.6, LP — Send a supported photo.

The system shall allow a conversation participant to send a selected photo after the file satisfies the supported-format and file-size requirements.

Traces to: UR-201.

##### SRS-201.7, LP — Display a sent photo.

After a photo is successfully sent, the system shall display the photo within the conversation.

Traces to: UR-201.

##### SRS-201.8, LP — Send an emoji.

The system shall allow a conversation participant to send an emoji within a conversation.

Traces to: UR-201.

##### SRS-201.9, LP — Display a sent emoji.

After an emoji is successfully sent, the system shall display the emoji within the conversation.

Traces to: UR-201.

##### SRS-201.10, LP — Open the GIF library.

The system shall allow a conversation participant to access the available GIF library while preparing a message.

Traces to: UR-201.

##### SRS-201.11, LP — Select a GIF from the GIF library.

The system shall allow a conversation participant to select a GIF from the available GIF library for sending.

Traces to: UR-201.

##### SRS-201.12, LP — Select a GIF file from a device.

The system shall allow a conversation participant to select a GIF file from their own device for upload.

Traces to: UR-201.

##### SRS-201.13, LP — Enforce the uploaded GIF size limit.

The system shall reject a GIF file selected from the student's device when the file is larger than 15 MB.

Traces to: UR-201.

##### SRS-201.14, LP — Send a GIF.

The system shall allow a conversation participant to send a GIF selected from the GIF library or uploaded from the participant's device.

Traces to: UR-201.

##### SRS-201.15, LP — Display a sent GIF.

After a GIF is successfully sent, the system shall display the GIF within the conversation.

Traces to: UR-201.

##### SRS-201.16, LP — Display failed message status.

When a message cannot be successfully sent, the system shall display a failed status for that message to its sender.

Traces to: UR-201.

##### SRS-201.17, LP — Retain failed non-media message content.

When a text, emoji, or GIF-library message fails to send, the system shall retain the message content for a retry attempt.

Traces to: UR-201.

##### SRS-201.18, LP — Retry a failed non-media message.

The system shall allow the sender to retry sending a failed text, emoji, or GIF-library message without recreating the message.

Traces to: UR-201.

<a id="area-202"></a>

### Group Chats and Membership

<a id="ur-202"></a>

#### UR-202, LP - Create my own group.

User requirement: As a student, I want to be able to create a group chat, so that I can form groups for friends.

##### SRS-202.1, LP — Create a group chat.

The system shall allow a signed-in student to create a new group chat.

Traces to: UR-202.

##### SRS-202.2, LP — Create the group before invitations.

When a student creates a group chat, the system shall create the group before invitations are sent to prospective members.

Traces to: UR-202.

##### SRS-202.3, LP — Add the creator as the first member.

When a group chat is created, the system shall add the student who created the group as its first member.

Traces to: UR-202.

##### SRS-202.4, LP — Allow creation without additional members.

The system shall allow a student to complete group creation before another student accepts an invitation to join the group.

Traces to: UR-202.

<a id="ur-203"></a>

#### UR-203, LP - Establish group ownership.

User requirement: As a student who creates a group chat, I want to become the group owner and default administrator, so that I have responsibility for managing the group from the beginning.

##### SRS-203.1, LP — Assign initial ownership.

When a group chat is created, the system shall assign the student who created the group as the group owner.

Traces to: UR-203.

##### SRS-203.2, LP — Grant owner management authority.

The system shall grant the group owner the group-management permissions assigned to the owner role.

Traces to: UR-203.

##### SRS-203.3, LP — Maintain a group owner.

The system shall maintain an assigned owner for every active group chat.

Traces to: UR-203.

##### SRS-203.4, LP — Maintain one current owner.

The system shall maintain exactly one current owner for each active group chat.

Traces to: UR-203.

<a id="ur-204"></a>

#### UR-204, LP - Assign another administrator.

User requirement: As a group owner, I want to be able to give another trusted group member administrator privileges, so that another person can help manage the group when needed.

##### SRS-204.1, LP — Select a member for administrator assignment.

The system shall allow the group owner to select a current regular group member for administrator assignment.

Traces to: UR-204.

##### SRS-204.2, LP — Assign administrator privileges.

When the group owner assigns administrator privileges to a selected member, the system shall change that member's group role to administrator.

Traces to: UR-204.

##### SRS-204.3, LP — Limit the group to one administrator.

The system shall maintain no more than one administrator in addition to the group owner.

Traces to: UR-204.

##### SRS-204.4, LP — Prevent a second administrator assignment.

When a group already has an administrator, the system shall prevent the owner from assigning another administrator until the administrator position becomes vacant.

Traces to: UR-204.

##### SRS-204.5, LP — Restrict administrator assignment to the owner.

The system shall prevent a student who is not the group owner from assigning administrator privileges.

Traces to: UR-204.

##### SRS-204.6, LP — Revoke administrator privileges.

The system shall allow the group owner to revoke administrator privileges from the currently assigned administrator.

Traces to: UR-204.

##### SRS-204.7, LP — Return a revoked administrator to regular-member status.

When administrator privileges are revoked, the system shall change the affected student's role to regular group member.

Traces to: UR-204.

##### SRS-204.8, LP — Restrict administrator revocation to the owner.

The system shall prevent a student who is not the group owner from revoking administrator privileges.

Traces to: UR-204.

##### SRS-204.9, LP — Preserve ownership during administrator assignment.

Assigning or revoking the administrator role shall not change the current group owner.

Traces to: UR-204.

<a id="ur-205"></a>

#### UR-205, LP - Manage group membership.

User requirement: As a group administrator, I want to add and remove members from the group, so that I can keep the group's membership appropriate and organized.

##### SRS-205.1, LP — Select a friend for a group invitation.

The system shall allow the group owner or administrator to select one of their current SocialU friends for a group invitation.

Traces to: UR-205.

##### SRS-205.2, LP — Restrict invitations to friends.

The system shall prevent the group owner or administrator from sending a group invitation to a student who is not currently their friend.

Traces to: UR-205.

##### SRS-205.3, LP — Send a group invitation.

The system shall allow the group owner or administrator to send a group-join request to a selected friend.

Traces to: UR-205.

##### SRS-205.4, LP — Keep invited students outside the group until acceptance.

Sending a group invitation shall not make the invited student a current group member.

Traces to: UR-205.

##### SRS-205.5, LP — Present a pending invitation.

The system shall make a pending group invitation available to the invited student for response.

Traces to: UR-205.

##### SRS-205.6, LP — Accept a group invitation.

The system shall allow an invited student to accept a pending group invitation.

Traces to: UR-205.

##### SRS-205.7, LP — Add an accepted invitee.

When an invited student accepts a group invitation, the system shall add that student to the group's current membership.

Traces to: UR-205.

##### SRS-205.8, LP — Decline a group invitation.

The system shall allow an invited student to decline a pending group invitation.

Traces to: UR-205.

##### SRS-205.9, LP — Preserve nonmembership after decline.

When an invited student declines a group invitation, the system shall not add that student to the group.

Traces to: UR-205.

##### SRS-205.10, LP — Remove a regular group member.

The system shall allow the group owner or administrator to remove a regular member from the group.

Traces to: UR-205.

##### SRS-205.11, LP — End membership after administrative removal.

When an authorized group manager removes a regular member, the system shall remove that student from the group's current membership.

Traces to: UR-205.

##### SRS-205.12, LP — Stop future messages after removal.

After a student is removed from the group, the system shall not provide that former member with messages sent after the membership ended.

Traces to: UR-205.

##### SRS-205.13, LP — Preserve historical messages after removal.

After a student is removed from the group, the system shall allow that former member to view messages that were available before their membership ended.

Traces to: UR-205.

<a id="ur-206"></a>

#### UR-206, LP - Control group administration.

User requirement: As a group member, I want group-management actions to be limited to authorized administrators or the owner, so that regular members cannot remove people or make major changes without permission.

##### SRS-206.1, LP — Prevent regular members from inviting students.

The system shall prevent a regular group member from sending group invitations.

Traces to: UR-206.

##### SRS-206.2, LP — Prevent regular members from removing members.

The system shall prevent a regular group member from removing another group member.

Traces to: UR-206.

##### SRS-206.3, LP — Prevent regular members from assigning administrators.

The system shall prevent a regular group member from assigning administrator privileges.

Traces to: UR-206.

##### SRS-206.4, LP — Prevent administrators from assigning administrators.

The system shall prevent a group administrator from assigning administrator privileges to another member.

Traces to: UR-206.

##### SRS-206.5, LP — Prevent administrators from revoking administrator privileges.

The system shall prevent the administrator from modifying the administrator-role assignment.

Traces to: UR-206.

##### SRS-206.6, LP — Protect the group owner from administrator removal.

The system shall prevent the group administrator from removing the current owner from the group.

Traces to: UR-206.

##### SRS-206.7, LP — Protect ownership from administrator transfer.

The system shall prevent the administrator from manually transferring group ownership while the current owner remains a member.

Traces to: UR-206.

##### SRS-206.8, LP — Permit administrator invitations.

The system shall allow the administrator to send group invitations to eligible friends.

Traces to: UR-206.

##### SRS-206.9, LP — Permit administrator member removal.

The system shall allow the administrator to remove regular group members.

Traces to: UR-206.

<a id="ur-207"></a>

#### UR-207, LP - Leave a group chat.

User requirement: As a student, I want to leave a group chat whenever I choose, so that I do not have to remain in a conversation that is no longer relevant to me.

##### SRS-207.1, LP — Leave as a regular member.

The system shall allow a regular group member to leave the group.

Traces to: UR-207.

##### SRS-207.2, LP — Leave as an administrator.

The system shall allow an administrator who is not the group owner to leave the group.

Traces to: UR-207.

##### SRS-207.3, LP — End membership after leaving.

When a non-owner student leaves a group, the system shall remove that student from the group's current membership.

Traces to: UR-207.

##### SRS-207.4, LP — Stop future messages after leaving.

After a student leaves a group, the system shall not provide that student with group messages sent after the student's membership ended.

Traces to: UR-207.

##### SRS-207.5, LP — Preserve historical messages after leaving.

After a student leaves a group, the system shall allow that former member to view messages that were available before they left.

Traces to: UR-207.

##### SRS-207.6, LP — Offer conversation deletion after leaving.

After a student leaves a group, the system shall provide that former member with an option to delete the group conversation from their own conversation history.

Traces to: UR-207.

##### SRS-207.7, LP — Delete a former group conversation from the student's view.

When a former member chooses to delete a group conversation, the system shall remove that conversation from that student's conversation history without deleting the conversation for remaining group members.

Traces to: UR-207.

<a id="ur-208"></a>

#### UR-208, LP - Transfer ownership before leaving.

User requirement: As a group owner, I want to transfer ownership to another group member before leaving the group, so that the group is not left without an owner responsible for managing it.

##### SRS-208.1, LP — Require an administrator before owner departure.

The system shall prevent the group owner from leaving when the group does not have a currently assigned administrator.

Traces to: UR-208.

##### SRS-208.2, LP — Promote the administrator to owner.

When the group owner leaves, the system shall assign the current administrator as the new group owner.

Traces to: UR-208.

##### SRS-208.3, LP — Complete ownership transfer before owner removal.

The system shall complete the administrator's promotion to owner before removing the departing owner from current group membership.

Traces to: UR-208.

##### SRS-208.4, LP — Remove the former owner from membership.

After ownership has successfully transferred, the system shall remove the former owner from the group's current membership.

Traces to: UR-208.

##### SRS-208.5, LP — Vacate the administrator role after promotion.

When the administrator becomes the new group owner, the system shall leave the administrator role unassigned.

Traces to: UR-208.

##### SRS-208.6, LP — Allow the new owner to assign an administrator.

The system shall allow the new owner to assign one eligible current group member as the group's new administrator.

Traces to: UR-208.

##### SRS-208.7, LP — Preserve former-owner historical messages.

After the previous owner leaves, the system shall allow the former owner to view messages that were available while they were a group member.

Traces to: UR-208.

##### SRS-208.8, LP — Stop future messages for the former owner.

After the former owner's membership ends, the system shall not provide that student with messages subsequently sent to the group.

Traces to: UR-208.

##### SRS-208.9, LP — Maintain continuous group ownership.

The system shall not place an active group into a state in which no current member is assigned as owner.

Traces to: UR-208.

<a id="area-209"></a>

### Conversation Experience

<a id="ur-209"></a>

#### UR-209, LP - Reply to a specific message.

User requirement: As a student, I want to reply directly to a specific message in a group conversation, so that other participants can clearly understand which message I am responding to.

##### SRS-209.1, LP — Select a message for reply.

The system shall allow a current group participant to select an existing group message as the target of a reply.

Traces to: UR-209.

##### SRS-209.2, LP — Compose a reply.

After a message is selected for reply, the system shall allow the participant to compose a new message in response to the selected message.

Traces to: UR-209.

##### SRS-209.3, LP — Send a reply.

The system shall allow the participant to send the composed reply to the group conversation.

Traces to: UR-209.

##### SRS-209.4, LP — Associate the reply with its target.

When a reply is sent, the system shall associate the reply with the specific message selected as its target.

Traces to: UR-209.

##### SRS-209.5, LP — Identify the replied-to message.

The system shall display an indication of the original message associated with a reply.

Traces to: UR-209.

##### SRS-209.6, LP — Preserve the reply relationship.

The system shall retain the relationship between a reply and its original message while both messages remain available in the conversation.

Traces to: UR-209.

<a id="ur-210"></a>

#### UR-210, LP - React to messages.

User requirement: As a student, I want to react to messages in group conversations, so that I can quickly respond to conversations without always sending another message.

##### SRS-210.1, LP — Select a message for reaction.

The system shall allow a current group participant to select an existing group message for a reaction.

Traces to: UR-210.

##### SRS-210.2, LP — Display the fixed reaction set.

When a participant chooses to react to a group message, the system shall display the project's approved fixed set of reaction emojis. The exact fixed reaction emoji set is TBD.

Traces to: UR-210.

##### SRS-210.3, LP — Apply a reaction.

The system shall allow a group participant to apply one emoji from the approved reaction set to a selected group message.

Traces to: UR-210.

##### SRS-210.4, LP — Display an applied reaction.

After a reaction is applied, the system shall display the reaction with the group message to which it belongs.

Traces to: UR-210.

##### SRS-210.5, LP — Remove a reaction.

The system shall allow a student to remove their own reaction from a group message.

Traces to: UR-210.

##### SRS-210.6, LP — Change a reaction.

The system shall allow a student to replace their existing reaction with another emoji from the approved reaction set.

Traces to: UR-210.

<a id="ur-211"></a>

#### UR-211, LP - Understand message details.

User requirement: As a student, I want to see the sender's name, profile picture, message time, and message status, so that I can understand who sent a message, when it was sent, and whether my own messages have been sent or read.

##### SRS-211.1, LP — Display sender name.

The system shall display the sender's name with each message.

Traces to: UR-211.

##### SRS-211.2, LP — Display sender profile picture.

The system shall display the sender's profile picture with each message.

Traces to: UR-211.

##### SRS-211.3, LP — Display message time.

The system shall display the time associated with each sent message.

Traces to: UR-211.

##### SRS-211.4, LP — Display sent status.

After a message has been successfully sent, the system shall display a sent status for that message to its sender.

Traces to: UR-211.

##### SRS-211.5, LP — Display failed status.

When a message fails to send, the system shall display a failed status for that message to its sender.

Traces to: UR-211.

##### SRS-211.6, LP — Mark existing private messages as read when opened.

When a student opens a private conversation, the system shall mark previously unread messages received from the other participant as read.

Traces to: UR-211.

##### SRS-211.7, LP — Mark incoming private messages as read while viewing.

When a new private message arrives while its recipient is currently viewing that private conversation, the system shall mark the incoming message as read without requiring the recipient to leave or reopen the conversation.

Traces to: UR-211.

##### SRS-211.8, LP — Display private-message read status.

When a private message has been marked as read, the system shall display a read status for that message to its sender.

Traces to: UR-211.

##### SRS-211.9, LP — Omit group-message read receipts.

The system shall not display recipient read-status information to senders of group messages.

Traces to: UR-211.

<a id="ur-212"></a>

#### UR-212, LP - Identify unread conversations.

User requirement: As a student, I want to know which conversations contain unread messages, so that I can easily find conversations that I have not yet reviewed.

##### SRS-212.1, LP — Maintain unread state by participant.

The system shall maintain message read or unread state separately for each conversation participant.

Traces to: UR-212.

##### SRS-212.2, LP — Identify an unread private conversation.

The system shall identify a private conversation as unread for a student when it contains at least one message that student has not read.

Traces to: UR-212.

##### SRS-212.3, LP — Identify an unread group conversation.

The system shall identify a group conversation as unread for a current member when it contains at least one message that member has not read.

Traces to: UR-212.

##### SRS-212.4, LP — Display an unread-conversation indicator.

The system shall display an unread indicator for each conversation currently containing unread messages for the signed-in student.

Traces to: UR-212.

##### SRS-212.5, LP — Mark existing messages as read when opening a conversation.

When a student opens a private or group conversation, the system shall mark messages already present in that conversation as read for that student.

Traces to: UR-212.

##### SRS-212.6, LP — Mark incoming messages as read while viewing.

When a new message arrives while the receiving student is currently viewing that conversation, the system shall mark the incoming message as read for that student.

Traces to: UR-212.

##### SRS-212.7, LP — Maintain unread state outside the active conversation.

When a message arrives in a conversation the receiving student is not currently viewing, the system shall maintain that message as unread for that student.

Traces to: UR-212.

##### SRS-212.8, LP — Remove the unread indicator.

When a conversation contains no unread messages for the signed-in student, the system shall stop displaying that conversation's unread indicator.

Traces to: UR-212.

<a id="ur-213"></a>

#### UR-213, LP - Keep conversations private.

User requirement: As a student, I want private and group conversations to be accessible only to their participants, so that people outside the conversation cannot view our messages.

##### SRS-213.1, LP — Restrict private-conversation access.

The system shall allow access to a private conversation only to its two authorized participants.

Traces to: UR-213.

##### SRS-213.2, LP — Deny unauthorized private-conversation access.

The system shall deny access to a private conversation when the requesting student is not one of its two participants.

Traces to: UR-213.

##### SRS-213.3, LP — Restrict current group activity to current members.

The system shall allow access to current group-conversation activity only to current group members.

Traces to: UR-213.

##### SRS-213.4, LP — Deny future group-message access to former members.

The system shall deny a former group member access to messages sent after that student's membership ended.

Traces to: UR-213.

##### SRS-213.5, LP — Preserve historical access for former members.

The system shall allow a former group member to view messages that were available during that student's period of group membership.

Traces to: UR-213.

##### SRS-213.6, LP — Prevent former members from receiving new messages.

The system shall prevent a former group member from receiving messages sent after that student's membership ended.

Traces to: UR-213.

##### SRS-213.7, LP — Prevent former members from sending group messages.

The system shall prevent a former group member from sending messages to a group they have left or from which they have been removed.

Traces to: UR-213.

##### SRS-213.8, LP — Prevent former members from reacting to new activity.

The system shall prevent a former group member from reacting to messages sent after that student's membership ended.

Traces to: UR-213.

##### SRS-213.9, LP — Prevent former members from replying to new activity.

The system shall prevent a former group member from replying to messages sent after that student's membership ended.

Traces to: UR-213.

<a id="section-MS"></a>

## 6. Campus Feed and Social Features

Feature owner: Merieme Sakhsoukhi (MS).

<a id="area-301"></a>

### Campus Feed and Social Features

<a id="ur-301"></a>

#### UR-301, MS - Campus Feed

User requirement: As a student, I want a dedicated Campus Feed where I can view posts that students at my university have shared publicly, so that I can discover updates, conversations, photographs, and other content from students across the wider campus community, including students who are not on my friends list.

##### SRS-301.1, MS — Campus Feed access.

The system shall provide an authenticated student with access to a dedicated Campus Feed containing posts marked as Public.

Traces to: UR-301.

##### SRS-301.2, MS — Public post display.

The system shall display each published Public post in the Campus Feed when the post belongs to a student within the same university.

Traces to: UR-301.

##### SRS-301.3, MS — Non-friend public posts.

The system shall display a student's Public post in the Campus Feed regardless of whether the current student has an accepted friendship relationship with the post author.

Traces to: UR-301.

<a id="ur-302"></a>

#### UR-302, MS - Friends Feed

User requirement: As a student, I want a separate Friends Feed where I can view posts that my accepted friends have shared privately with their friends, so that I can see content that is intended only for people within my social circle and not available to the entire university community.

##### SRS-302.1, MS — Friends Feed access.

The system shall provide an authenticated student with access to a separate Friends Feed containing Friends Only posts.

Traces to: UR-302.

##### SRS-302.2, MS — Friend-only post display.

The system shall display a Friends Only post in the current student's Friends Feed when the current student has an accepted friendship relationship with the post author.

Traces to: UR-302.

##### SRS-302.3, MS — Restricted friend content.

The system shall prevent a Friends Only post from being displayed in the Friends Feed of a student who does not have an accepted friendship relationship with the post author.

Traces to: UR-302.

<a id="ur-303"></a>

#### UR-303, MS - Creating Text Posts

User requirement: As a student, I want to create and publish a text post by entering a written message and selecting who should be able to view it, so that I can share campus updates, questions, opinions, or other information either with the wider university community or only with my friends.

##### SRS-303.1, MS — Text post entry.

The system shall provide an authenticated student with a post creation function that accepts written text as post content.

Traces to: UR-303.

##### SRS-303.2, MS — Text post publication.

The system shall create a new post containing the submitted text when an authenticated student submits a valid text post for publication.

Traces to: UR-303.

##### SRS-303.3, MS — Post author assignment.

The system shall associate a newly created post with the authenticated student who submitted the post.

Traces to: UR-303.

<a id="ur-304"></a>

#### UR-304, MS - Attaching Photographs

User requirement: As a student, I want to attach one or more photographs to a post while I am creating it, so that I can share visual content along with my written message and allow other authorized students to view the photographs directly within the post.

##### SRS-304.1, MS — Photograph attachment.

The system shall allow an authenticated student to select one or more supported photograph files while creating a post.

Traces to: UR-304.

##### SRS-304.2, MS — Photograph preview.

The system shall display a preview of each selected photograph before the student publishes the post.

Traces to: UR-304.

##### SRS-304.3, MS — Photograph association.

The system shall associate each successfully uploaded photograph with the post to which it was attached.

Traces to: UR-304.

##### SRS-304.4, MS — Photograph display.

The system shall display photographs attached to a published post to students who are authorized to view that post.

Traces to: UR-304.

<a id="ur-305"></a>

#### UR-305, MS - Displaying the Post Author

User requirement: As a student, I want every post in the Campus Feed and Friends Feed to clearly display the name and profile picture of the student who created it, along with when the post was published, so that I can easily identify who shared the content before I decide to interact with it.

##### SRS-305.1, MS — Author name display.

The system shall display the name of the student who created each post shown in the Campus Feed or Friends Feed.

Traces to: UR-305.

##### SRS-305.2, MS — Author profile picture display.

The system shall display the profile picture associated with the author of each post shown in the Campus Feed or Friends Feed.

Traces to: UR-305.

##### SRS-305.3, MS — Publication timestamp display.

The system shall display the publication date or time associated with each post shown in the Campus Feed or Friends Feed.

Traces to: UR-305.

<a id="ur-306"></a>

#### UR-306, MS - Editing a Student's Own Post

User requirement: As a student, I want to edit the text or attached content of a post that I personally created, so that I can correct mistakes, update information, or make changes after the post has been published, while still making it clear to other students that the post was edited.

##### SRS-306.1, MS — Own-post editing access.

The system shall allow an authenticated student to initiate editing for a post when that student is the post's author.

Traces to: UR-306.

##### SRS-306.2, MS — Post content modification.

The system shall allow the author of a post to modify the text content of that post after publication.

Traces to: UR-306.

##### SRS-306.3, MS — Attached content modification.

The system shall allow the author of a post to modify its attached photograph content after publication.

Traces to: UR-306.

##### SRS-306.4, MS — Edited indicator.

The system shall display an "Edited" indicator on a post after the author successfully saves changes to the post.

Traces to: UR-306.

##### SRS-306.5, MS — Unauthorized post editing prevention.

The system shall prevent a student from editing a post when that student is not the post's author.

Traces to: UR-306.

<a id="ur-307"></a>

#### UR-307, MS - Deleting a Student's Own Post

User requirement: As a student, I want to delete a post that I personally created, so that I can remove content that I no longer want available in the Campus Feed or Friends Feed, with the system asking me to confirm the deletion before permanently removing the post.

##### SRS-307.1, MS — Own-post deletion access.

The system shall allow an authenticated student to initiate deletion of a post when that student is the post's author.

Traces to: UR-307.

##### SRS-307.2, MS — Deletion confirmation.

The system shall display a confirmation prompt when a student initiates deletion of their own post.

Traces to: UR-307.

##### SRS-307.3, MS — Confirmed post deletion.

The system shall remove a post from the feeds in which it is displayed when the post author confirms the deletion.

Traces to: UR-307.

##### SRS-307.4, MS — Canceled post deletion.

The system shall preserve the post when the author cancels the deletion confirmation.

Traces to: UR-307.

##### SRS-307.5, MS — Unauthorized post deletion prevention.

The system shall prevent a student from deleting a post when that student is not the post's author.

Traces to: UR-307.

<a id="ur-308"></a>

#### UR-308, MS - Liking Posts

User requirement: As a student, I want to like a post that I am allowed to view in the Campus Feed or Friends Feed, so that I can quickly show appreciation or support for another student's content and allow the post's displayed like count to reflect my reaction.

##### SRS-308.1, MS — Post like access.

The system shall allow an authenticated student to like a published post when that student is authorized to view the post.

Traces to: UR-308.

##### SRS-308.2, MS — Like recording.

The system shall record the authenticated student's like when the student successfully likes an authorized post.

Traces to: UR-308.

##### SRS-308.3, MS — Like count display.

The system shall display the total number of active likes associated with each post in the Community Feed or Friends Feed.

Traces to: UR-308.

<a id="ur-309"></a>

#### UR-309, MS - Removing a Like

User requirement: As a student, I want to remove a like that I previously gave to a post, so that I can change my reaction whenever I no longer want my like associated with that post and have the displayed like count updated accordingly.

##### SRS-309.1, MS — Existing like removal.

The system shall allow a student to remove their existing like from a post when the student has previously liked that post.

Traces to: UR-309.

##### SRS-309.2, MS — Updated like count after removal.

The system shall decrease the displayed like count for a post when a student successfully removes their like.

Traces to: UR-309.

<a id="ur-310"></a>

#### UR-310, MS - Commenting on Posts

User requirement: As a student, I want to comment on a post that I am authorized to view, whether it appears in the Campus Feed or Friends Feed, so that I can participate in the discussion, respond to the author, ask questions, or share my own thoughts about the content.

##### SRS-310.1, MS — Comment submission.

The system shall allow an authenticated student to submit a written comment on a published post when the student is authorized to view that post.

Traces to: UR-310.

##### SRS-310.2, MS — Comment association.

The system shall associate a successfully submitted comment with the post on which the student submitted the comment.

Traces to: UR-310.

##### SRS-310.3, MS — Comment author association.

The system shall associate a successfully submitted comment with the authenticated student who submitted it.

Traces to: UR-310.

<a id="ur-311"></a>

#### UR-311, MS - Displaying Comments

User requirement: As a student, I want to view the comments that other students have posted on a feed post, including the commenter's name, profile picture, comment text, and when the comment was made, so that I can follow the conversation and understand how other students have responded to the post.

##### SRS-311.1, MS — Comment display.

The system shall display comments associated with a post when an authorized student views the post's comments.

Traces to: UR-311.

##### SRS-311.2, MS — Comment author display.

The system shall display the name of the student who submitted each displayed comment.

Traces to: UR-311.

##### SRS-311.3, MS — Comment profile picture display.

The system shall display the profile picture associated with the student who submitted each displayed comment.

Traces to: UR-311.

##### SRS-311.4, MS — Comment text display.

The system shall display the text content of each submitted comment.

Traces to: UR-311.

##### SRS-311.5, MS — Comment timestamp display.

The system shall display the date or time associated with each submitted comment.

Traces to: UR-311.

<a id="ur-312"></a>

#### UR-312, MS - Like Notifications

User requirement: As a student, I want to receive a notification when another student likes one of my posts, so that I know that another student has interacted with my content and can identify which of my posts received the like.

##### SRS-312.1, MS — Like notification creation.

The system shall create a notification for a post author when another student successfully likes that author's post.

Traces to: UR-312.

##### SRS-312.2, MS — Like notification actor.

The system shall identify the student who liked the post in the generated notification.

Traces to: UR-312.

##### SRS-312.3, MS — Like notification post reference.

The system shall associate the generated like notification with the post that received the like.

Traces to: UR-312.

##### SRS-312.4, MS — Grouped like notifications.

The system shall combine multiple like notifications for the same post into a grouped notification when more than one student has liked that post within the notification grouping period.

Traces to: UR-312.

<a id="ur-313"></a>

#### UR-313, MS - Comment Notifications

User requirement: As a student, I want to receive a notification when another student comments on one of my posts, so that I know someone has responded to my content and can easily identify the related post so that I can read the comment and respond if needed.

##### SRS-313.1, MS — Comment notification creation.

The system shall create a notification for a post author when another student successfully submits a comment on that author's post.

Traces to: UR-313.

##### SRS-313.2, MS — Comment notification actor.

The system shall identify the student who submitted the comment in the generated notification.

Traces to: UR-313.

##### SRS-313.3, MS — Comment notification post reference.

The system shall associate the generated comment notification with the post on which the comment was submitted.

Traces to: UR-313.

<a id="ur-314"></a>

#### UR-314, MS - Reporting Inappropriate Campus Content

User requirement: As a student, I want to report a post that I believe contains inappropriate, offensive, harassing, or otherwise unacceptable content, so that the report can be submitted for review without automatically deleting the reported post from the feed, and so that my identity as the person who submitted the report remains private.

##### SRS-314.1, MS — Report submission.

The system shall allow an authenticated student to submit a report for a published post that the student is authorized to view.

Traces to: UR-314.

##### SRS-314.2, MS — Report count.

The system shall record each successfully submitted report associated with the reported post and maintain the total number of reports received for that post.

Traces to: UR-314.

##### SRS-314.3, MS — Automatic post deletion threshold.

The system shall delete a reported post when the number of valid reports associated with that post reaches 5 reports.

Traces to: UR-314.

##### SRS-314.4, MS — Report confirmation.

The system shall display a confirmation message to the reporting student after a report has been successfully submitted.

Traces to: UR-314.

##### SRS-314.5, MS — Reporter identity privacy.

The system shall prevent the identity of the student who submitted a report from being displayed to other students.

Traces to: UR-314.

<a id="ur-315"></a>

#### UR-315, MS - Post Visibility and Feed Scope

User requirement: As a student, I want to choose the visibility of my post before publishing it, with a Public option that allows the post to appear in the Campus Feed for students across the university and a Friends Only option that limits the post to my accepted friends through the Friends Feed, so that I can control whether my content is shared with the wider campus community or only with people in my friend network.

##### SRS-315.1, MS — Public visibility option.

The system shall provide a Public visibility option when an authenticated student creates a post.

Traces to: UR-315. Also covers: UR-605.

##### SRS-315.2, MS — Friends Only visibility option.

The system shall provide a Friends Only visibility option when an authenticated student creates a post.

Traces to: UR-315. Also covers: UR-605.

##### SRS-315.3, MS — Visibility selection requirement.

The system shall require the student to select a post visibility option before the post is published.

Traces to: UR-315. Also covers: UR-605.

##### SRS-315.4, MS — Public feed placement.

The system shall make a published post available in the Campus Feed when the post's visibility is set to Public.

Traces to: UR-315.

##### SRS-315.5, MS — Friends Feed placement.

The system shall make a published post available to the author's accepted friends through the Friends Feed when the post's visibility is set to Friends Only.

Traces to: UR-315.

##### SRS-315.6, MS — Friends Only access restriction.

The system shall prevent a Friends Only post from being displayed to anyone other than its author or the author's current accepted friends.

Traces to: UR-315.

##### SRS-315.7, MS — Friends Only Campus Feed restriction.

The system shall prevent a Friends Only post from appearing in the Campus Feed.

Traces to: UR-315.

<a id="section-KB"></a>

## 7. Campus Events and Trending

Feature owner: Kabanga Mbangu (KB).

<a id="area-400"></a>

### Campus Events and Trending

<a id="ur-400"></a>

#### UR-400, KB - Create Campus Events

User requirement: As a student on campus, I want to create a campus event with information like title, description, location, date, and time, so that I can organize an activity and provide other students with the information they need to attend the event if they want to attend.

##### SRS-400.1, KB — Enter Event Title.

The system shall allow a registered student to enter a title for a campus event.

Acceptance criterion: Given a registered student has opened the event creation form and is ready to provide the basic information about the activity they want to organize, when the student enters a title that identifies the purpose or name of the campus event, then the system shall accept the entered title and associate it with the event being created.

Traces to: UR-400

##### SRS-400.2, KB — Enter Event Description.

The system shall allow a registered student to enter a description for a campus event.

Acceptance criterion: Given a registered student is creating a new campus event and has already opened the event information form, when the student enters information explaining what the event is about and what other students should know about the activity, then the system shall accept the description and associate it with the campus event.

Traces to: UR-400

##### SRS-400.3, KB — Enter Event Location.

The system shall allow a registered student to enter a location for a campus event.

Acceptance criterion: Given a registered student is completing the required information for an event they are organizing on campus, when the student enters the location where the event is expected to take place, then the system shall save the entered location as part of the event information.

Traces to: UR-400

##### SRS-400.4, KB — Select Event Date.

The system shall allow a registered student to select a date for a campus event.

Acceptance criterion: Given a registered student has entered the basic details for a new event and needs to specify when the activity will occur, when the student selects the appropriate calendar date for the event, then the system shall record the selected date as the scheduled date for that event.

Traces to: UR-400

##### SRS-400.5, KB — Select Event Time.

The system shall allow a registered student to select a time for a campus event.

Acceptance criterion: Given a registered student has selected the date for an event and is completing the scheduling information, when the student chooses the time at which the campus activity is planned to begin, then the system shall store the selected time as part of the event's schedule.

Traces to: UR-400

##### SRS-400.6, KB — Create Event.

The system shall create a campus event when a registered student submits the required event information.

Acceptance criterion: Given a registered student has provided the required title, description, location, date, and time for a campus event, when the student submits the completed event form to create the activity, then the system shall create the campus event and make the saved event information available for students to view.

Traces to: UR-400

<a id="ur-401"></a>

#### UR-401, KB - Discover Campus Events

User requirement: As a student, I want to discover campus events created by other students and view their current information like the event title, description, location, date, and time, so that I can find activities that interest me, understand what each event is about, know when and where it will take place, and decide whether I want to attend.

##### SRS-401.1, KB — Display Campus Events.

The system shall display available campus events when a registered student opens the campus events area.

Acceptance criterion: Given a registered student has logged into SocialU and navigated to the Campus Events and Trending section, when the student opens the area used to discover campus events created by students, then the system shall display the campus events that are currently available for the student to discover.

Traces to: UR-401

##### SRS-401.2, KB — Display Event Title.

The system shall display the title of each campus event.

Acceptance criterion: Given a campus event has been created and contains a title identifying the activity, when a registered student opens that event while browsing available campus events, then the system shall show the event title so the student can identify what the activity is called.

Traces to: UR-401

##### SRS-401.3, KB — Display Event Description.

The system shall display the description of each campus event.

Acceptance criterion: Given an available campus event contains a description explaining the purpose or details of the activity, when a registered student selects or views the event information, then the system shall present the event description so the student can understand what the event is about.

Traces to: UR-401

##### SRS-401.4, KB — Display Event Location.

The system shall display the location of each campus event.

Acceptance criterion: Given an event creator has provided a location for a campus activity, when a registered student views the details of that campus event, then the system shall display the saved location so the student knows where the activity is scheduled to take place.

Traces to: UR-401

##### SRS-401.5, KB — Display Event Date.

The system shall display the date of each campus event.

Acceptance criterion: Given a campus event has a scheduled date stored in its event information, when a registered student views the event details while deciding whether to participate, then the system shall show the scheduled date so the student knows which day the event will occur.

Traces to: UR-401

##### SRS-401.6, KB — Display Event Time.

The system shall display the time of each campus event.

Acceptance criterion: Given a campus event has a scheduled time that was provided by its creator, when a registered student opens the event details to learn when it will take place, then the system shall display the scheduled time along with the other event information.

Traces to: UR-401

<a id="ur-402"></a>

#### UR-402, KB - Invite students to an event.

User requirement: As an event creator, I want to invite students at my university whether or not they are my friends, so that I can include the students for whom the event is intended.

##### SRS-402.1, KB — Select Students.

The system shall allow an event creator to select any registered student at the same university to invite, whether or not they are friends.

Acceptance criterion: Given a registered student has created an event and has access to the event invitation feature, when the creator selects a registered student from the available students they can invite, then the system shall add that selected student to the list of students who will receive an invitation.

Traces to: UR-402

##### SRS-402.2, KB — Select Multiple Students.

The system shall allow an event creator to select multiple students for an event invitation.

Acceptance criterion: Given an event creator wants to invite more than one student to the same campus event, when the creator selects several registered students from the available invitation list, then the system shall keep each selected student in the invitation list so they can all receive an invitation.

Traces to: UR-402

##### SRS-402.3, KB — Send Event Invitation.

The system shall send an event invitation to each selected student.

Acceptance criterion: Given the event creator has selected one or more registered students to receive an invitation, when the creator submits the completed invitation request for the campus event, then the system shall send an event invitation to every student included in the selected invitation list.

Traces to: UR-402

##### SRS-402.4, KB — Display Invitation.

The system shall display an event invitation to an invited student.

Acceptance criterion: Given a registered student has been selected by an event creator to receive an invitation, when the invited student accesses their available event invitations on SocialU, then the system shall display the invitation and identify the campus event associated with it.

Traces to: UR-402

##### SRS-402.5, KB — Track Invited Students.

The system shall allow the event creator to view the students who were invited to the event.

Acceptance criterion: Given an event creator has sent invitations to registered students for a campus event, when the creator opens the event's invitation information, then the system shall display the students who were included in the event invitation list.

Traces to: UR-402

<a id="ur-403"></a>

#### UR-403, KB - Respond to Event Invitations

User requirement: As an invited student, I want to respond to an event invitation and indicate whether I plan to attend, so that the event creator can know which invited students are interested in participating.

##### SRS-403.1, KB — View Event Invitation.

The system shall allow an invited student to view an event invitation.

Acceptance criterion: Given a registered student has received an invitation to participate in a campus event, when the student opens the invitation from their SocialU event information, then the system shall show the invitation and provide access to the associated event details.

Traces to: UR-403

##### SRS-403.2, KB — Accept Event Invitation.

The system shall allow an invited student to accept an event invitation.

Acceptance criterion: Given an invited student has reviewed the information for a campus event and decides that they plan to attend, when the student selects the option to accept the event invitation, then the system shall record the student's response as an RSVP indicating that the student plans to attend.

Traces to: UR-403

##### SRS-403.3, KB — Decline Event Invitation.

The system shall allow an invited student to decline an event invitation.

Acceptance criterion: Given a student has received an invitation to a campus event but does not plan to participate, when the student chooses the option to decline the invitation, then the system shall save the student's response as an RSVP indicating that the student does not plan to attend.

Traces to: UR-403

##### SRS-403.4, KB — Change RSVP.

The system shall allow an invited student to change their RSVP before the event.

Acceptance criterion: Given a student has already responded to a campus event invitation and their plans have changed before the scheduled event date, when the student submits a different RSVP response for the same event, then the system shall replace the previous RSVP with the student's new response.

Traces to: UR-403

##### SRS-403.5, KB — Display Current RSVP.

The system shall display the invited student's current RSVP status.

Acceptance criterion: Given a student has submitted an RSVP response for a campus event, when the student returns to the event after submitting or changing their response, then the system shall display the student's most recently saved RSVP status for that event.

Traces to: UR-403

<a id="ur-404"></a>

#### UR-404, KB - Manage My Events

User requirement: As an event creator, I want to update or cancel an event and view the list of students who have plan to attend, so that I can keep participants informed about changes to the event, make sure they have the most accurate event information, monitor expected attendance, and effectively manage the campus activity I organized.

##### SRS-404.1, KB — Update Event Title.

The system shall allow the event creator to update the event title.

Acceptance criterion: Given a registered student is the creator of an existing campus event and wants to correct or change its title, when the creator enters a new title and saves the event changes, then the system shall replace the previous event title with the newly saved title.

Traces to: UR-404

##### SRS-404.2, KB — Update Event Description.

The system shall allow the event creator to update the event description.

Acceptance criterion: Given the event creator needs to provide different or additional information about an existing campus activity, when the creator edits the event description and saves the modification, then the system shall store and display the newly updated description for the event.

Traces to: UR-404

##### SRS-404.3, KB — Update Event Location.

The system shall allow the event creator to update the event location.

Acceptance criterion: Given the creator of a campus event needs to change the place where the activity will occur, when the creator enters a new location and confirms the event update, then the system shall save the new location and use it as the current location for the event.

Traces to: UR-404

##### SRS-404.4, KB — Update Event Date.

The system shall allow the event creator to update the event date.

Acceptance criterion: Given an event creator has determined that the scheduled day of an upcoming event needs to change, when the creator selects a different date and saves the updated event information, then the system shall record the new date as the current scheduled date for the event.

Traces to: UR-404

##### SRS-404.5, KB — Update Event Time.

The system shall allow the event creator to update the event time.

Acceptance criterion: Given the creator needs to change the scheduled time for an upcoming campus event, when the creator selects a new event time and submits the change, then the system shall save the new time and display it as the current event time.

Traces to: UR-404

##### SRS-404.6, KB — Restrict Event Updates.

The system shall allow only the event creator to update an event.

Acceptance criterion: Given a registered student is viewing an event that was created by another student and is not the owner of that event, when the student attempts to change any of the event's saved information, then the system shall prevent the student from making or saving changes to the event.

Traces to: UR-404

##### SRS-404.7, KB — Cancel Event.

The system shall allow the event creator to cancel an event.

Acceptance criterion: Given the creator has an existing campus event that will no longer take place as originally planned, when the creator selects the cancellation option and confirms the cancellation, then the system shall mark the event as cancelled and update its current event status.

Traces to: UR-404

##### SRS-404.8, KB — Restrict Event Cancellation.

The system shall allow only the event creator to cancel an event.

Acceptance criterion: Given a registered student is viewing a campus event that was created by another student, when the non-creator attempts to cancel that event, then the system shall prevent the student from cancelling the event.

Traces to: UR-404

##### SRS-404.9, KB — Display Cancellation Status.

The system shall display when an event has been cancelled.

Acceptance criterion: Given the event creator has successfully cancelled an existing campus event, when an invited student or other registered student views the cancelled event, then the system shall clearly show that the event has been cancelled instead of presenting it as an upcoming active event.

Traces to: UR-404

##### SRS-404.10, KB — Provide Cancellation Information.

The system shall provide cancellation information to students who were invited to the event.

Acceptance criterion: Given a campus event has been cancelled after students were invited to participate, when an invited student accesses the event or their invitation information, then the system shall provide information indicating that the event has been cancelled.

Traces to: UR-404

##### SRS-404.11, KB — View Event Attendees.

The system shall allow the event creator to view students who have responded as attending.

Acceptance criterion: Given invited students have submitted RSVP responses indicating that they plan to attend a campus event, when the event creator opens the attendee information for that event, then the system shall display the students whose current RSVP indicates that they plan to attend.

Traces to: UR-404

##### SRS-404.12, KB — Display Updated Event Information.

The system shall display the most recently saved event information to students viewing the event.

Acceptance criterion: Given the creator has successfully saved one or more changes to an existing campus event, when another registered student opens the event after those changes have been saved, then the system shall display the updated event information rather than the previously saved version.

Traces to: UR-404

<a id="ur-405"></a>

#### UR-405, KB - Discover trending campus posts.

User requirement: As a student, I want to see campus posts ranked by the likes received during the last seven days, so that I can discover discussions attracting attention at my university.

##### SRS-405.1, KB — Select eligible campus posts.

When Trending is loaded, the system shall consider only existing published Campus Feed posts visible to the signed-in student at the launch university.

Traces to: UR-405.

##### SRS-405.2, KB — Count recent active likes.

When calculating a post's Trending count at time T, the system shall count at most one currently active like per student whose latest like time is within the interval from T minus 168 hours through T, inclusive.

Traces to: UR-405.

##### SRS-405.3, KB — Rank trending posts.

When Trending results are produced, the system shall order eligible posts by recent-like count descending, then publication time descending for ties, then stable post identifier ascending for remaining ties.

Traces to: UR-405.

##### SRS-405.4, KB — Exclude zero-count posts.

When a post has zero qualifying likes in the current 168-hour interval, the system shall omit it from Trending.

Traces to: UR-405.

##### SRS-405.5, KB — Identify trending entries.

When a Trending entry is shown, the system shall present the post author, a text or photo preview, and its recent-like count.

Traces to: UR-405.

##### SRS-405.6, KB — Open the selected post.

When a student selects a Trending entry, the system shall open the corresponding feed post under the current feed access rules.

Traces to: UR-405.

##### SRS-405.7, KB — Explain empty results.

When no eligible post has a qualifying recent like, the system shall display an empty Trending message.

Traces to: UR-405.

##### SRS-405.8, KB — Refresh the ranking.

When a student opens or refreshes Events and Trending, the system shall calculate Trending using the recorded post and like state at that refresh time.

Traces to: UR-405.

<a id="section-DP"></a>

## 8. DormSpace, Snipe, and Shared Points

Feature owner: Darrin Phimphisane (DP).

<a id="definitions-and-boundaries"></a>

### Definitions and boundaries

A dorm is one persistent 2D room; friends visit the saved room asynchronously. No live synchronization of visiting avatars is required. The first DormHall floor contains the owner's door and nine friend/vacant doors; later floors contain ten friend/vacant doors ordered by current friendship acceptance time.

An originally tagged participant remains part of the sharing/removal decision even after answering No to identity verification. A verified target is an originally tagged friend who answers Yes to identity and qualifies for an approved publication. A multi-person Snipe is accepted or rejected as a whole. A rejected submission attempt consumes no cooldown; an accepted request consumes each selected pair's cooldown even if it later fails.

Removal prevents retrieval through SocialU; it cannot erase external screenshots. Ending friendship does not subtract historical visits. Reaccepting a friendship uses its new acceptance time and does not bypass pair cooldowns.

SS owns the shared participation calculation. DP credits the first qualifying activity of each participation date and each 7/14/30 milestone at most once per streak instance. Normal game rewards are separate. Amounts remain open in Appendix B.

<a id="area-500"></a>

### DormSpace

<a id="ur-500"></a>

#### UR-500, DP - Personalize My Virtual Dorm

User requirement: As a student, I want to arrange furniture and decorations and customize the appearance of my virtual dorm, so that I can create a personal space that reflects my style.

##### SRS-500.1, DP — Owner edit access.

When a student opens their own dorm, the system shall provide a decorating mode restricted to that dorm owner.

Traces to: UR-500.

##### SRS-500.2, DP — Grid placement.

When an owner places an owned furniture or decoration item, the system shall align its footprint to the room's placement grid.

Traces to: UR-500.

##### SRS-500.3, DP — Move a placed item.

When the owner confirms a valid destination for a placed item, the system shall relocate that item to the selected grid position.

Traces to: UR-500.

##### SRS-500.4, DP — Return to inventory.

When the owner returns a placed item to inventory, the system shall remove its room placement without removing ownership.

Traces to: UR-500.

##### SRS-500.5, DP — One placement per item.

When an item is already placed in the owner's dorm, the system shall reject an additional placement of that same owned catalog item.

Traces to: UR-500.

##### SRS-500.6, DP — Unowned item rejection.

When an owner attempts to place an item they do not own, the system shall reject the placement.

Traces to: UR-500.

##### SRS-500.7, DP — Fixed item orientation.

When a student decorates their dorm, the system shall retain each item's predefined orientation without offering rotation.

Traces to: UR-500.

##### SRS-500.8, DP — Room boundary validation.

When a proposed item footprint extends outside its permitted room area, the system shall reject the placement.

Traces to: UR-500.

##### SRS-500.9, DP — Entrance protection.

When a proposed footprint intersects a reserved entrance or exit area, the system shall reject the placement.

Traces to: UR-500.

##### SRS-500.10, DP — Overlap validation.

When proposed footprints overlap, the system shall accept placement only if every overlapping item pair is permitted by the catalog's compatibility rules.

Traces to: UR-500.

##### SRS-500.11, DP — Invalid placement feedback.

When placement is rejected, the system shall identify the violated placement rule to the owner.

Traces to: UR-500.

##### SRS-500.12, DP — Preserve rejected placement.

When a move or placement is rejected, the system shall retain the last accepted room arrangement.

Traces to: UR-500.

##### SRS-500.13, DP — Wall color selection.

When the owner selects an available wall color, the system shall apply that color to their dorm walls.

Traces to: UR-500.

##### SRS-500.14, DP — Floor appearance selection.

When the owner selects an available flooring option, the system shall apply that appearance to their dorm floor.

Traces to: UR-500.

##### SRS-500.15, DP — Visitor edit denial.

When a visitor attempts to modify another student's dorm arrangement or appearance, the system shall deny the modification.

Traces to: UR-500.

<a id="ur-503"></a>

#### UR-503, DP - Begin Decorating My Virtual Dorm

User requirement: As a student, I want access to a useful set of free starter furniture and decorations, so that I can begin personalizing my dorm before I have earned or spent any points.

##### SRS-503.1, DP — Starter ownership.

When a student's dorm is initialized for the first time, the system shall grant one bed, one window, one desk, and one chair as free owned starter items.

Traces to: UR-503.

##### SRS-503.2, DP — No starter cost.

When starter items are granted, the system shall leave the student's shared points balance unchanged.

Traces to: UR-503.

##### SRS-503.3, DP — Starter availability.

When a new owner first opens their decorating inventory, the system shall include all four starter items as available for placement.

Traces to: UR-503.

##### SRS-503.4, DP — No duplicate starter grants.

When a previously initialized dorm is reopened, the system shall retain the existing starter ownership without granting additional copies.

Traces to: UR-503.

##### SRS-503.5, DP — Zero balance access.

When a student has a zero points balance, the system shall permit decorating with their owned starter items.

Traces to: UR-503.

<a id="ur-504"></a>

#### UR-504, DP - Represent Myself in DormSpace

User requirement: As a student, I want my 2D avatar to represent me while I explore DormSpace, so that I can have a recognizable character when visiting my dorm and the dorms of my friends.

##### SRS-504.1, DP — Avatar representation.

When a student enters the DormHall or an accessible dorm, the system shall display that student's current Game Room avatar in two dimensions.

Traces to: UR-504.

##### SRS-504.2, DP — Default representation.

When the student has not customized a Game Room avatar, the system shall display the Game Room's default avatar.

Traces to: UR-504.

##### SRS-504.3, DP — Keyboard movement.

When the DormSpace movement view has focus, the system shall move the avatar in the direction indicated by WASD or the arrow keys.

Traces to: UR-504.

##### SRS-504.4, DP — Touch movement.

When a student uses DormSpace on a touch device, the system shall provide on-screen directional controls for avatar movement.

Traces to: UR-504.

##### SRS-504.5, DP — Keyboard interaction.

When an interactable door, elevator, or guestbook is in interaction range, pressing E shall activate the indicated interaction target.

Traces to: UR-504.

##### SRS-504.6, DP — Touch interaction.

When an interactable object is in interaction range on a touch device, the system shall provide an on-screen control to activate that object.

Traces to: UR-504.

##### SRS-504.7, DP — Movement bounds.

When movement would carry the avatar outside the traversable hall or room boundary, the system shall prevent that movement.

Traces to: UR-504.

##### SRS-504.8, DP — Furniture traversal.

When an avatar moves across placed furniture or decorations, the system shall permit traversal without furniture collision blocking.

Traces to: UR-504.

##### SRS-504.9, DP — Text entry focus.

When the student types in a guestbook text field, the system shall suspend avatar movement commands from those keystrokes.

Traces to: UR-504.

<a id="ur-505"></a>

#### UR-505, DP - Maintain One Current Virtual Dorm

User requirement: As a student, I want my current dorm arrangement, appearance, and owned decorations to remain available between sessions, so that I can continue developing the same personal space over time.

##### SRS-505.1, DP — One current dorm.

When a student's dorm is created, the system shall associate exactly one current dorm state with that account.

Traces to: UR-505.

##### SRS-505.2, DP — Automatic saving.

When the owner completes a valid placement, move, inventory return, wall-color change, or flooring change, the system shall automatically save the resulting current dorm state.

Traces to: UR-505.

##### SRS-505.3, DP — Save acknowledgment.

When a decorating change has been successfully stored, the system shall mark that change as saved.

Traces to: UR-505.

##### SRS-505.4, DP — Save failure feedback.

When a decorating change cannot be stored, the system shall display an unsaved-change error instead of a saved confirmation.

Traces to: UR-505.

##### SRS-505.5, DP — Restore current arrangement.

When the owner reenters DormSpace in a later session, the system shall restore the most recently acknowledged saved arrangement and appearance.

Traces to: UR-505.

##### SRS-505.6, DP — Restore owned inventory.

When the owner opens inventory after signing in again, the system shall restore ownership and placement availability from their saved account state.

Traces to: UR-505.

##### SRS-505.7, DP — No alternate layouts.

When the owner saves a decorating change, the system shall replace the current layout without creating a user-selectable alternate layout or layout history.

Traces to: UR-505.

##### SRS-505.8, DP — Conflict protection.

When a decorating save is based on a superseded version of the dorm, the system shall reject that save rather than overwrite a newer saved layout.

Traces to: UR-505.

##### SRS-505.9, DP — Conflict recovery.

When a decorating conflict is detected, the system shall offer to reload the current saved dorm before further editing.

Traces to: UR-505.

<a id="ur-506"></a>

#### UR-506, DP - Display My SocialU Achievements

User requirement: As a student, I want to display trophies or other achievements earned through supported SocialU games in my dorm, so that visiting friends can see accomplishments I choose to show.

Disposition: Retired. Achievement displays and trophies are outside this release. This identifier will not be reused.

<a id="ur-507"></a>

#### UR-507, DP - Visit Friends Through the DormHall

User requirement: As a student, I want to move my 2D avatar through a DormHall with my own marked door followed by doors for current friends in friendship order, so that I can enter my dorm or recognize and visit my friends across elevator-accessible floors.

##### SRS-507.1, DP — Game Room entry.

When a student selects DormSpace in the Game Room, the system shall open the first floor of that student's DormHall.

Traces to: UR-507.

##### SRS-507.2, DP — Own dorm door.

When the first DormHall floor is displayed, the system shall reserve its first door for the student's own dorm with a My Dorm label.

Traces to: UR-507.

##### SRS-507.3, DP — Friend door identity.

When a door represents a current friend, the system shall display that friend's username and current profile picture, using the account default picture when none is set.

Traces to: UR-507.

##### SRS-507.4, DP — Friend ordering.

When assigning friends to doors, the system shall order current friendships by their mutual acceptance time from oldest to newest, using a stable account identifier to break timestamp ties.

Traces to: UR-507.

##### SRS-507.5, DP — First floor allocation.

When the first floor is displayed, the system shall assign the first nine friends in that ordering to the nine doors after My Dorm.

Traces to: UR-507.

##### SRS-507.6, DP — Additional floor allocation.

When floor f greater than one is displayed, the system shall assign friends in positions (10 × f) − 10 through (10 × f) − 1 to that floor's ten doors, counting the oldest friend as friend 1.

Traces to: UR-507.

##### SRS-507.7, DP — Vacant doors.

When a displayed floor has fewer assigned friends than available friend doors, the system shall label its remaining friend doors Vacant.

Traces to: UR-507.

##### SRS-507.8, DP — Vacant door interaction.

When a student interacts with a Vacant door, the system shall leave the student in the DormHall without opening a dorm.

Traces to: UR-507.

##### SRS-507.9, DP — Floor count.

When the friend list changes, the system shall provide one first floor plus the minimum additional ten-door floors needed for friends beyond the first nine.

Traces to: UR-507.

##### SRS-507.10, DP — Elevator controls.

When a student interacts with the DormHall elevator, the system shall display one labeled floor-selection button for every available floor.

Traces to: UR-507.

##### SRS-507.11, DP — Floor selection.

When a student selects an available elevator floor, the system shall move their avatar to that floor's elevator arrival area.

Traces to: UR-507.

##### SRS-507.12, DP — Enter own dorm.

When a student interacts with My Dorm, the system shall open their own saved dorm.

Traces to: UR-507.

##### SRS-507.13, DP — Enter friend dorm.

When a student interacts with an assigned friend door, the system shall open that friend's saved dorm only if the friendship remains current at entry.

Traces to: UR-507.

##### SRS-507.14, DP — Asynchronous visits.

When an authorized friend enters a dorm, the system shall allow the visit regardless of whether the owner is online.

Traces to: UR-507.

##### SRS-507.15, DP — Return through exit.

When a student interacts with a dorm's exit, the system shall return them to their own DormHall floor containing that dorm's current door, or floor one if the door no longer exists.

Traces to: UR-507.

##### SRS-507.16, DP — Friend removal compaction.

When a friendship ends, the system shall reassign the remaining friends consecutively to fill the vacated door position.

Traces to: UR-507.

##### SRS-507.17, DP — Active visit revocation.

When a visitor's friendship with the dorm owner ends during a visit, the system shall end that visit by returning the visitor to their own DormHall.

Traces to: UR-507.

##### SRS-507.18, DP — Removed floor recovery.

When friend-list changes remove the floor the student is viewing, the system shall return the student to the first DormHall floor.

Traces to: UR-507.

##### SRS-507.19, DP — Unauthorized direct entry.

When a non-owner without a current friendship requests a dorm directly, the system shall deny entry.

Traces to: UR-507.

<a id="ur-508"></a>

#### UR-508, DP - Explore Friends' Dorms and Leave Notes

User requirement: As a student, I want to explore a current friend's dorm and leave a guestbook note for the owner, while being able to manage notes associated with my own dorm, so that friends can interact with each other's spaces even when they are not online at the same time.

##### SRS-508.1, DP — Open guestbook.

When an owner or current friend interacts with a dorm guestbook, the system shall open its first page.

Traces to: UR-508.

##### SRS-508.2, DP — Owner welcome page.

When the first guestbook page is displayed, the system shall reserve its note area for the owner's welcome message rather than visitor notes.

Traces to: UR-508.

##### SRS-508.3, DP — Default welcome.

When an owner has not customized their welcome message, the system shall display Welcome! Thanks for coming. as the default message.

Traces to: UR-508.

##### SRS-508.4, DP — Welcome customization.

When the owner submits a welcome message containing at most 500 Unicode characters, the system shall save that message as the dorm's welcome text.

Traces to: UR-508.

##### SRS-508.5, DP — Welcome length rejection.

When a welcome message exceeds 500 Unicode characters, the system shall reject the change without replacing the saved message.

Traces to: UR-508.

##### SRS-508.6, DP — Welcome ownership.

When a non-owner attempts to change a welcome message, the system shall deny the change.

Traces to: UR-508.

##### SRS-508.7, DP — Guestbook reading.

When the owner or a current friend views the guestbook's note pages, the system shall display the notes stored for that dorm.

Traces to: UR-508.

##### SRS-508.8, DP — Note author access.

When a student submits a guestbook note, the system shall accept the submission only if the student is a current friend of the dorm owner.

Traces to: UR-508.

##### SRS-508.9, DP — Note length validation.

When a submitted note contains more than 500 Unicode characters, the system shall reject the submission without creating a note.

Traces to: UR-508.

##### SRS-508.10, DP — Empty note rejection.

When a submitted note contains only whitespace or no characters, the system shall reject the submission.

Traces to: UR-508.

##### SRS-508.11, DP — Note record.

When a valid note is submitted, the system shall store a note record containing its text, author identity, dorm identity, and creation time.

Traces to: UR-508.

##### SRS-508.12, DP — Note display.

When a note is displayed, the system shall show its text, author's username, and creation date and time.

Traces to: UR-508.

##### SRS-508.13, DP — Note ordering.

When note pages are opened, the system shall order notes by original creation time from newest to oldest, using a stable note identifier to break ties.

Traces to: UR-508.

##### SRS-508.14, DP — Note pagination.

When note pages are displayed, the system shall show three notes per page except for a final page containing fewer remaining notes.

Traces to: UR-508.

##### SRS-508.15, DP — Page navigation.

When additional guestbook pages exist in the requested direction, the system shall allow the reader to turn to the next or previous page.

Traces to: UR-508.

##### SRS-508.16, DP — Author edit.

When a note's author submits a valid replacement text, the system shall update that note without changing its original creation time.

Traces to: UR-508.

##### SRS-508.17, DP — Other author edit denial.

When anyone other than the note's author requests a text edit, the system shall deny the edit.

Traces to: UR-508.

##### SRS-508.18, DP — Note deletion.

When the dorm owner or the note's author requests deletion, the system shall remove that note from the guestbook.

Traces to: UR-508.

##### SRS-508.19, DP — Unauthorized deletion.

When someone other than the dorm owner or note author requests deletion, the system shall deny the deletion.

Traces to: UR-508.

##### SRS-508.20, DP — Former friend cleanup.

When a friendship ends, the system shall delete each former friend's authored notes from the other's guestbook.

Traces to: UR-508.

##### SRS-508.21, DP — Guestbook persistence.

When an authorized reader returns in a later session, the system shall restore the saved welcome message and all notes not subsequently deleted.

Traces to: UR-508.

<a id="ur-509"></a>

#### UR-509, DP - Track Visits to My Virtual Dorm

User requirement: As a student, I want a persistent visit counter for my virtual dorm, so that I can see how often friends have visited my space.

##### SRS-509.1, DP — Initial count.

When a dorm is initialized, the system shall set its visit counter to zero.

Traces to: UR-509.

##### SRS-509.2, DP — Qualifying visit.

When a current friend successfully enters a dorm at least 24 hours after that friend's last counted visit, or has never had a counted visit, the system shall increase that dorm's visit counter by one.

Traces to: UR-509.

##### SRS-509.3, DP — Repeat visit exclusion.

When a friend enters fewer than 24 elapsed hours after their last counted visit to that dorm, the system shall leave the visit counter unchanged.

Traces to: UR-509.

##### SRS-509.4, DP — Owner exclusion.

When the owner enters their own dorm, the system shall leave the visit counter unchanged.

Traces to: UR-509.

##### SRS-509.5, DP — Failed entry exclusion.

When an attempted dorm entry fails or is denied, the system shall leave the visit counter unchanged.

Traces to: UR-509.

##### SRS-509.6, DP — Guestbook counter.

When an owner or authorized friend opens the first guestbook page, the system shall display the dorm's cumulative visit count.

Traces to: UR-509.

##### SRS-509.7, DP — Counter persistence.

When a dorm is reopened in a later session, the system shall restore its cumulative visit count.

Traces to: UR-509.

##### SRS-509.8, DP — Historical count retention.

When a friendship ends, the system shall retain visits already included in the dorm's cumulative counter.

Traces to: UR-509.

##### SRS-509.9, DP — Concurrent entry protection.

When simultaneous entries by the same friend qualify for the same 24-hour counting interval, the system shall record exactly one counted visit.

Traces to: UR-509.

<a id="area-510"></a>

### Snipe

<a id="ur-510"></a>

#### UR-510, DP - Submit Snipes Inside Chat

User requirement: As a student, I want to submit a photograph of a friend through an eligible direct message or group chat when the friend did not expect the photograph to be taken, so that Snipe feels like a natural game inside conversations I already use.

##### SRS-510.1, DP — Chat submission entry.

When a signed-in participant opens an eligible direct message or group conversation, the system shall provide a Snipe submission action within that conversation.

Traces to: UR-510.

##### SRS-510.2, DP — Photograph requirement.

When a student submits a Snipe, the system shall require exactly one readable photograph in a supported image format within the agreed upload-size limit.

Traces to: UR-510.

##### SRS-510.3, DP — Invalid photograph feedback.

When an uploaded file fails the photograph validation policy, the system shall reject submission with the applicable validation reason.

Traces to: UR-510.

##### SRS-510.4, DP — Tag selection.

When selecting Snipe tags, the system shall offer only current friends of the submitter who are current participants in the selected conversation.

Traces to: UR-510.

##### SRS-510.5, DP — Multiple tagged friends.

When composing a Snipe, the system shall allow selection of one or more distinct eligible friends.

Traces to: UR-510.

##### SRS-510.6, DP — Self tagging denial.

When a submitter attempts to tag their own account in a Snipe, the system shall reject that tag.

Traces to: UR-510.

##### SRS-510.7, DP — Submission eligibility check.

When a submission is accepted, the system shall validate the submitter's current conversation membership and every tagged friend's current friendship, membership, and pair-specific cooldown eligibility.

Traces to: UR-510.

##### SRS-510.8, DP — Whole submission rejection.

When any selected tag is ineligible at submission, the system shall reject the whole submission without silently dropping that tag.

Traces to: UR-510.

##### SRS-510.9, DP — Immutable review content.

When a Snipe request is created, the system shall fix its photograph, conversation, submitter, and tagged-account list for the lifetime of that request.

Traces to: UR-510.

##### SRS-510.10, DP — Create pending request.

When a valid submission is accepted, the system shall create one Pending Snipe request with its submission time and expiration time.

Traces to: UR-510.

##### SRS-510.11, DP — Submission retry identity.

When the same accepted submission action is retried because of a connection failure, the system shall return its existing request rather than create a second request.

Traces to: UR-510.

##### SRS-510.12, DP — Chat-only publication.

When a Snipe is published, the system shall publish it only in its original conversation without creating a Campus Feed post.

Traces to: UR-510.

<a id="ur-511"></a>

#### UR-511, DP - Control Consent to a Snipe

User requirement: As a student tagged in a Snipe, I want to answer identity verification and photograph-sharing permission separately and withdraw sharing permission before or after publication, so that I control whether the photograph is shared and whether I count as a verified target.

##### SRS-511.1, DP — Private review access.

When a pending Snipe is requested for review, the system shall allow photograph access only to its submitter and originally tagged participants who remain authorized conversation members and eligible friends.

Traces to: UR-511.

##### SRS-511.2, DP — Separate identity answer.

When a tagged student reviews a pending Snipe, the system shall request a Yes or No answer to Is this you? independently of sharing permission.

Traces to: UR-511.

##### SRS-511.3, DP — Separate sharing answer.

When a tagged student reviews a pending Snipe, the system shall request a Yes or No answer to Do you approve sharing this photograph in this conversation? independently of identity verification.

Traces to: UR-511.

##### SRS-511.4, DP — No assumed permission.

When one consent question is answered, the system shall leave the other question unanswered until the tagged student explicitly answers it.

Traces to: UR-511.

##### SRS-511.5, DP — Response ownership.

When a consent response is submitted, the system shall accept it only from the tagged account whose response is being recorded.

Traces to: UR-511.

##### SRS-511.6, DP — Complete response gate.

When any originally tagged student has not answered both questions, the system shall keep the request unpublished unless a terminal rejection, cancellation, or expiration has occurred.

Traces to: UR-511.

##### SRS-511.7, DP — Sharing rejection.

When any tagged student answers No to sharing while the request is pending, the system shall close the entire request as Rejected without publication.

Traces to: UR-511.

##### SRS-511.8, DP — Verified publication.

When every tagged student has completed both responses before expiration, every sharing answer is Yes, at least one identity answer is Yes, and eligibility remains valid, the system shall publish the photograph as an Approved Snipe.

Traces to: UR-511.

##### SRS-511.9, DP — Verified tag list.

When an Approved Snipe is displayed, the system shall identify only the tagged friends whose identity answers are Yes as verified Snipe targets.

Traces to: UR-511.

##### SRS-511.10, DP — No verified target.

When all tagged students have answered both questions with sharing permitted but every identity answer is No, the system shall close the request as Closed with the reason No verified targets.

Traces to: UR-511.

##### SRS-511.11, DP — Pending withdrawal.

When a tagged student withdraws a previously granted sharing permission before publication, the system shall cancel the entire request without publication.

Traces to: UR-511.

##### SRS-511.12, DP — Published withdrawal.

When an originally tagged participant withdraws sharing permission after publication, the system shall invoke the published removal operation defined by SRS-514.5 through SRS-514.7.

Traces to: UR-511.

##### SRS-511.13, DP — Terminal response rejection.

When a response is submitted for a request that is no longer Pending, the system shall reject the response except for the separate published-removal action.

Traces to: UR-511.

<a id="ur-512"></a>

#### UR-512, DP - Track Snipe Requests and Outcomes

User requirement: As a student, I want Snipe approval requests and their current status to be visible in the relevant conversation and unanswered requests to expire, so that I know whether a submission is pending, approved, rejected, expired, or removed without leaving old requests open indefinitely.

##### SRS-512.1, DP — Private pending status.

When the submitter or an authorized tagged student opens the conversation, the system shall display that request's current status in their private Snipe view.

Traces to: UR-512.

##### SRS-512.2, DP — Other member invisibility.

When an untagged conversation member views the conversation before Snipe publication, the system shall omit that request's photograph, approval controls, and existence placeholder.

Traces to: UR-512.

##### SRS-512.3, DP — Individual response status.

When the submitter or authorized tagged student opens a pending request, the system shall display each tagged student's identity-response and sharing-response state separately.

Traces to: UR-512.

##### SRS-512.4, DP — Request expiration deadline.

When a request is created, the system shall set its deadline to exactly 24 elapsed hours after its accepted submission time.

Traces to: UR-512.

##### SRS-512.5, DP — Expired request.

When a request remains Pending at its deadline, the system shall close it as Expired without publication.

Traces to: UR-512.

##### SRS-512.6, DP — Deadline enforcement.

When a response arrives at or after the request's deadline, the system shall reject it as expired even if a background status refresh has not yet run.

Traces to: UR-512.

##### SRS-512.7, DP — Eligibility cancellation.

When the submitter leaves the conversation, a tagged student leaves the conversation, or a required submitter-to-tagged friendship ends before publication, the system shall cancel the entire pending request.

Traces to: UR-512.

##### SRS-512.8, DP — Final eligibility validation.

When the last required response would authorize publication, the system shall revalidate all required conversation memberships and friendships before publishing.

Traces to: UR-512.

##### SRS-512.9, DP — Terminal reason display.

When an authorized reviewer opens a Rejected, Expired, Canceled, or Closed request, the system shall display the reason for that terminal outcome.

Traces to: UR-512.

##### SRS-512.10, DP — Published status display.

When an authorized conversation member views a published Snipe, the system shall display its Approved status.

Traces to: UR-512.

##### SRS-512.11, DP — Durable outcome.

When an authorized reviewer returns in a later session, the system shall restore the request's stored outcome rather than reopen it for approval.

Traces to: UR-512.

##### SRS-512.12, DP — No reopening.

When a request is Rejected, Expired, Canceled, Closed, or Removed, the system shall reject attempts to republish that same request.

Traces to: UR-512.

<a id="ur-513"></a>

#### UR-513, DP - Avoid Excessive Snipe Submissions

User requirement: As a student, I want submission cooldowns to limit how frequently Snipes can be submitted, so that Snipe does not overwhelm direct messages or group chats.

##### SRS-513.1, DP — Pair cooldown start.

When a Snipe submission is accepted, the system shall start a 24-elapsed-hour submission cooldown for each ordered pair consisting of that submitter and one selected tagged friend.

Traces to: UR-513.

##### SRS-513.2, DP — Cross-conversation enforcement.

When a submitter tries to tag a friend before their pair's cooldown expires, the system shall reject the submission regardless of which conversation is selected.

Traces to: UR-513.

##### SRS-513.3, DP — Cooldown boundary.

When exactly 24 elapsed hours have passed since the pair's most recent accepted submission, the system shall permit that pair to pass the cooldown check.

Traces to: UR-513.

##### SRS-513.4, DP — Outcome-independent cooldown.

When an accepted request is rejected, canceled, expired, closed without verified targets, or removed, the system shall retain the pair cooldown measured from the original submission time.

Traces to: UR-513.

##### SRS-513.5, DP — Independent photographers.

When a different photographer tags the same friend, the system shall evaluate that different photographer's pair cooldown independently.

Traces to: UR-513.

##### SRS-513.6, DP — Multi-tag reservation.

When a multi-person submission is accepted, the system shall reserve the daily opportunity for every originally selected tagged friend, including friends who later deny identity verification.

Traces to: UR-513.

##### SRS-513.7, DP — Cooldown feedback.

When a submission is rejected by a pair cooldown, the system shall identify the affected friend and the next eligible submission time.

Traces to: UR-513.

##### SRS-513.8, DP — Concurrent pair protection.

When simultaneous submissions attempt to use the same available pair opportunity, the system shall accept at most one of those submissions.

Traces to: UR-513.

##### SRS-513.9, DP — Rejected attempt preservation.

When a submission fails validation before request creation, the system shall leave all selected pairs' cooldowns unchanged.

Traces to: UR-513.

<a id="ur-514"></a>

#### UR-514, DP - Address Unwanted Snipes

User requirement: As a student, I want reporting and removal controls for Snipes that are inappropriate or unwanted, so that I can respond to content that should no longer remain in a conversation.

##### SRS-514.1, DP — Removal roles.

When removal of a published Snipe is requested, the system shall authorize the submitter, any originally tagged participant, or a current administrator of its group conversation.

Traces to: UR-514.

##### SRS-514.2, DP — Other viewer removal denial.

When a person outside the authorized removal roles requests removal, the system shall deny the request.

Traces to: UR-514.

##### SRS-514.3, DP — Direct message removal.

When the submitter or an originally tagged person removes a published Snipe from a direct message, the system shall apply the same photograph-removal behavior used in group chats.

Traces to: UR-514.

##### SRS-514.4, DP — Removal confirmation.

When an authorized person selects Remove, the system shall request confirmation before removing the published Snipe.

Traces to: UR-514.

##### SRS-514.5, DP — Removed status.

When an authorized published-removal action is confirmed, the system shall transition the request to Removed.

Traces to: UR-514.

##### SRS-514.6, DP — Photograph withdrawal.

When a published Snipe transitions to Removed, the system shall stop serving its photograph to every conversation participant through SocialU.

Traces to: UR-514.

##### SRS-514.7, DP — Removed placeholder.

When a previously published Snipe is Removed, the system shall display Snipe removed in place of its photograph in the original conversation.

Traces to: UR-514.

##### SRS-514.8, DP — Group reporting.

When a current group participant reports a published Snipe, the system shall accept a report identifying that Snipe and the reporting reason.

Traces to: UR-514.

##### SRS-514.9, DP — Report receipt.

When a Snipe report is recorded, the system shall display a submission confirmation to its reporter.

Traces to: UR-514.

##### SRS-514.10, DP — Review access.

When a current group administrator opens the group's Snipe reports, the system shall display unresolved reports for that group.

Traces to: UR-514.

##### SRS-514.11, DP — Pending report visibility.

When a report is submitted, the system shall retain the photograph's current publication status until an authorized removal action occurs.

Traces to: UR-514.

##### SRS-514.12, DP — Admin report decision.

When a group administrator reviews a report, the system shall allow the administrator to resolve it as Dismissed or Removed.

Traces to: UR-514.

##### SRS-514.13, DP — Report removal result.

When a group administrator resolves a report as Removed, the system shall invoke the published Snipe removal behavior.

Traces to: UR-514.

##### SRS-514.14, DP — No DM reporting.

When a student views a Snipe in a direct message, the system shall omit group-reporting controls.

Traces to: UR-514.

##### SRS-514.15, DP — Repeat removal.

When removal is requested for an already Removed Snipe, the system shall return its existing Removed state without creating another removal event.

Traces to: UR-514.

<a id="area-520"></a>

### Shared Points

<a id="ur-520"></a>

#### UR-520, DP - Earn Shared SocialU Rewards

User requirement: As a student, I want qualifying SocialU activities, including supported game activity and eligible approved Snipes, to contribute to one shared points balance, so that participation in different parts of SocialU helps me work toward the same rewards.

##### SRS-520.1, DP — Shared balance.

When an account becomes eligible for rewards, the system shall maintain one shared SocialU points balance for that student across all supported earning and spending features.

Traces to: UR-520.

##### SRS-520.2, DP — Initial balance.

When a student's shared points account is initialized, the system shall set the balance to zero before applying any qualifying rewards.

Traces to: UR-520.

##### SRS-520.3, DP — Qualifying activity award.

When a supported feature confirms an activity eligible under an agreed reward rule, the system shall credit the amount defined for that reward category.

Traces to: UR-520.

##### SRS-520.4, DP — Game result validation.

When a game-related reward is requested, the system shall validate the record required by its category: a confirmed level completion for a completion reward, or an accepted UR-613 participation record for daily and milestone rewards.

Traces to: UR-520.

##### SRS-520.5, DP — Unverified reward rejection.

When a reward claim cannot be matched to an authenticated qualifying activity record for its reward category, the system shall reject the claim without changing the balance.

Traces to: UR-520.

##### SRS-520.6, DP — Independent reward categories.

When more than one agreed reward category applies, the system shall process normal game rewards, the daily participation reward, and shared-streak milestone bonuses as distinct categories.

Traces to: UR-520.

##### SRS-520.7, DP — No unrelated social rewards.

When a student likes a Feed post, comments, responds to an event invitation, or attends an event, the system shall award no shared points for that action in the initial release.

Traces to: UR-520.

##### SRS-520.8, DP — No real-money conversion.

When a student views points earning or spending options, the system shall exclude real-money purchase or cash-conversion options.

Traces to: UR-520.

<a id="ur-521"></a>

#### UR-521, DP - Know My Available Balance

User requirement: As a student, I want to view my current shared points balance anywhere it is relevant to earning or spending points, so that I can understand my progress and decide whether I can afford a reward I want.

##### SRS-521.1, DP — Relevant balance display.

When a student opens the Game Room, a points shop, points history, or the Snipe reward result, the system shall display that student's current confirmed shared balance.

Traces to: UR-521.

##### SRS-521.2, DP — Balance after earning.

When a reward has been confirmed, the system shall refresh the visible balance to include that reward.

Traces to: UR-521.

##### SRS-521.3, DP — Balance after purchase.

When a purchase has been confirmed, the system shall refresh the visible balance to reflect its deduction.

Traces to: UR-521.

##### SRS-521.4, DP — Unconfirmed balance distinction.

When a balance cannot be refreshed, the system shall identify the displayed value as last confirmed rather than current.

Traces to: UR-521.

##### SRS-521.5, DP — Account separation.

When a student requests their spendable balance, the system shall return the authenticated account's balance rather than a balance selected by a supplied account identifier.

Traces to: UR-521.

<a id="ur-522"></a>

#### UR-522, DP - Redeem Points for Virtual Rewards

User requirement: As a student, I want to spend my available points on eligible virtual rewards, including DormSpace decorations and other supported Game Room items, so that the points I earn give me meaningful customization goals across SocialU.

##### SRS-522.1, DP — Toggle decoration shop.

When a student uses the DormSpace shop control, the system shall toggle the decoration shop open or closed without ending their DormSpace session.

Traces to: UR-522.

##### SRS-522.2, DP — Available reward purchase.

When a student selects an eligible catalog reward, the system shall offer purchase using their own shared points balance.

Traces to: UR-522.

##### SRS-522.3, DP — Final purchase confirmation.

When a student confirms a purchase, the system shall present the item, its point cost, and the statement that purchases are final before accepting confirmation.

Traces to: UR-522.

##### SRS-522.4, DP — Affordable purchase.

When the confirmed item is available, not already owned, and affordable at its current confirmed price, the system shall complete the purchase as the indivisible transaction defined in SRS-523.1.

Traces to: UR-522.

##### SRS-522.5, DP — Insufficient funds.

When available points are less than the confirmed price, the system shall reject the purchase without granting the item.

Traces to: UR-522.

##### SRS-522.6, DP — Single catalog ownership.

When a student already owns a catalog item, the system shall reject another purchase of that item.

Traces to: UR-522.

##### SRS-522.7, DP — Changed offer.

When an item's cost or eligibility has changed since the student confirmed the offer, the system shall require confirmation of the updated offer before any charge.

Traces to: UR-522.

##### SRS-522.8, DP — Ownership availability.

When a decoration purchase succeeds, the system shall make the item available in that student's DormSpace inventory.

Traces to: UR-522.

##### SRS-522.9, DP — Final purchases.

When a completed purchase is displayed, the system shall provide no refund or sell-back action.

Traces to: UR-522.

##### SRS-522.10, DP — Own balance enforcement.

When a purchase attempts to debit an account other than the authenticated buyer's account, the system shall deny the purchase.

Traces to: UR-522.

<a id="ur-523"></a>

#### UR-523, DP - Trust Reward and Purchase Results

User requirement: As a student, I want each qualifying reward and purchase to update my points and item ownership accurately without duplicate credits or duplicate charges, so that I can trust the value of the points I earn and spend.

##### SRS-523.1, DP — Atomic purchase outcome.

When an eligible purchase completes, the system shall commit exactly one inseparable outcome consisting of its point deduction, item ownership grant, and purchase-history record.

Traces to: UR-523.

##### SRS-523.2, DP — Failed purchase rollback.

When a purchase cannot complete every required component, the system shall preserve the pre-purchase balance and ownership state.

Traces to: UR-523.

##### SRS-523.3, DP — Reward uniqueness.

When the same qualifying activity reward is delivered more than once, the system shall credit that reward category exactly once for that activity.

Traces to: UR-523.

##### SRS-523.4, DP — Purchase retry uniqueness.

When a completed purchase action is retried, the system shall return the original result without an additional charge or ownership grant.

Traces to: UR-523.

##### SRS-523.5, DP — Concurrent spending.

When multiple purchases compete for the same available points, the system shall accept only purchases whose combined committed cost does not exceed those points.

Traces to: UR-523.

##### SRS-523.6, DP — Concurrent ownership.

When concurrent requests attempt to buy the same catalog item for one account, the system shall complete at most one purchase.

Traces to: UR-523.

##### SRS-523.7, DP — Atomic reward record.

When a points reward is credited, the system shall commit its balance change and corresponding history record as one indivisible outcome.

Traces to: UR-523.

##### SRS-523.8, DP — Authoritative reward amount.

When a reward claim supplies a points amount, the system shall determine the credited value from the agreed reward rule rather than trust the supplied amount.

Traces to: UR-523.

##### SRS-523.9, DP — Authoritative item price.

When a purchase request supplies an item price, the system shall determine its charge from the confirmed catalog offer rather than trust the supplied value.

Traces to: UR-523.

##### SRS-523.10, DP — Unknown transaction status.

When a connection is lost before a transaction result is known, the system shall identify the result as unconfirmed until its stored outcome can be retrieved.

Traces to: UR-523.

##### SRS-523.11, DP — Transaction recovery.

When an unconfirmed transaction is queried again, the system shall return its committed outcome or a definitive failure without creating a replacement transaction.

Traces to: UR-523.

<a id="ur-524"></a>

#### UR-524, DP - Keep My Earned Progress

User requirement: As a student, I want my points balance and purchased rewards to remain available between sessions, so that I do not lose progress when I leave SocialU and return later.

##### SRS-524.1, DP — Persistent balance.

When a student signs out and later signs in, the system shall restore the same confirmed balance adjusted only by completed transactions in the interval.

Traces to: UR-524.

##### SRS-524.2, DP — Persistent purchases.

When a student returns in a new session, the system shall restore all catalog items they previously acquired.

Traces to: UR-524.

##### SRS-524.3, DP — Missed-day protection.

When a student misses a daily qualifying activity or loses a streak, the system shall leave previously earned points and owned items unchanged.

Traces to: UR-524.

##### SRS-524.4, DP — Published removal protection.

When a previously rewarded Snipe is removed, the system shall retain all points already awarded for that Snipe.

Traces to: UR-524.

##### SRS-524.5, DP — Cross-device continuity.

When the same account opens SocialU on another supported device, the system shall load its shared saved balance and owned rewards rather than start separate device progress.

Traces to: UR-524.

<a id="ur-525"></a>

#### UR-525, DP - Limit Snipe Point Farming

User requirement: As a student, I want Snipe point awards to use clear reward limits and eligibility rules, so that earning points does not encourage repeated submissions or spam in my conversations.

##### SRS-525.1, DP — Photographer reward recipient.

When an Approved Snipe qualifies for a reward, the system shall award its points only to the submitting photographer.

Traces to: UR-525.

##### SRS-525.2, DP — Per-friend reward calculation.

When the Snipe reward is calculated, the system shall multiply the agreed per-friend reward by the number of originally tagged friends whose identity answer is Yes at publication.

Traces to: UR-525.

##### SRS-525.3, DP — Publication-dependent eligibility.

When a Snipe has not successfully reached Approved publication, the system shall award zero Snipe points for that request.

Traces to: UR-525.

##### SRS-525.4, DP — No verified identity credit.

When a tagged friend answers No to identity verification, the system shall exclude that friend from the request's rewarded-friend count.

Traces to: UR-525.

##### SRS-525.5, DP — Pair-only farming limit.

When evaluating Snipe point eligibility, the system shall apply the per-friend rolling submission limits without imposing an additional photographer-wide daily reward cap.

Traces to: UR-525.

##### SRS-525.6, DP — Reward explanation.

When the photographer opens a published Snipe's reward result, the system shall display the verified-friend count, applied points per friend, and resulting total reward.

Traces to: UR-525.

<a id="ur-526"></a>

#### UR-526, DP - Earn participation rewards.

User requirement: As a student, I want a daily participation reward and milestone bonuses based on the same streak shown in the Game Room, so that my participation across supported activities contributes to one consistent reward history.

##### SRS-526.1, DP — Qualifying daily participation.

When the shared participation feature confirms a Game 1 attempt start, an accepted Wordle guess, or successful DormSpace opening, the system shall treat that participation record as eligible for the daily reward check.

Traces to: UR-526.

##### SRS-526.2, DP — Exclude login-only activity.

When a student signs in without qualifying participation, the system shall grant no daily participation reward for that sign-in.

Traces to: UR-526.

##### SRS-526.3, DP — Use the shared participation date.

When assigning a participation record to a daily reward, the system shall use the participation date supplied under SRS-613.4 and SRS-613.10 through SRS-613.11.

Traces to: UR-526.

##### SRS-526.4, DP — Use the shared day boundary.

When checking the daily reward interval, the system shall use midnight inclusive to the following midnight exclusive in the account's saved participation time zone.

Traces to: UR-526.

##### SRS-526.5, DP — Award the first qualifying participation.

When an account has its first qualifying participation record for a date that has not received a daily participation reward, the system shall credit the agreed daily amount to that account.

Traces to: UR-526.

##### SRS-526.6, DP — Limit the daily reward.

When another qualifying activity occurs on an already rewarded participation date, the system shall grant no additional daily participation reward for that date.

Traces to: UR-526.

##### SRS-526.7, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.3 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.8, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.3 and SRS-613.9 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.9, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.1, SRS-613.2, and SRS-613.12 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.10, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.5 through SRS-613.9 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.11, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.5 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.12, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.6 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.13, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.5 and SRS-613.6 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.14, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.8 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.15, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.12 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.16, DP — Retired - independent streak calculation.

The shared participation rules in SRS-613.9 replace this duplicate DP calculation. This identifier remains retired and is not reused. Original parent: UR-526.

Traces to: UR-526.

##### SRS-526.17, DP — Award a shared-streak milestone.

When qualifying participation first raises a shared streak instance to 7, 14, or 30 qualifying days, the system shall credit the agreed bonus for that milestone.

Traces to: UR-526.

##### SRS-526.18, DP — Prevent duplicate milestone awards.

When milestone processing is retried or triggered by multiple devices, the system shall credit each milestone at most once per account and shared streak instance.

Traces to: UR-526.

##### SRS-526.19, DP — Stop after the final defined milestone.

When the shared streak continues beyond 30 qualifying days, the system shall grant no further milestone bonus under the current 7, 14, and 30-day schedule.

Traces to: UR-526.

##### SRS-526.20, DP — Allow milestones on a new streak.

When a new shared streak instance reaches a defined milestone after an earlier streak ended, the system shall treat that milestone as independently eligible.

Traces to: UR-526.

##### SRS-526.21, DP — Handle concurrent participation.

When multiple devices provide qualifying participation records for the same account and participation date, the system shall credit exactly one daily participation reward for that date.

Traces to: UR-526.

##### SRS-526.22, DP — Display the shared reward status.

When a student opens participation reward information, the system shall display the shared streak count, today's daily reward status, and this week's remaining forgiven-miss allowance.

Traces to: UR-526.

##### SRS-526.23, DP — Display the next milestone.

When the shared streak count is below 30 qualifying days, the system shall display the next milestone threshold and its agreed bonus amount.

Traces to: UR-526.

<a id="ur-527"></a>

#### UR-527, DP - Review My Points History

User requirement: As a student, I want to review a history of points I have earned and spent, including the activity or purchase that caused each change, so that I can understand why my balance changed and identify unexpected results.

##### SRS-527.1, DP — History access.

When a student opens their points history, the system shall display only that account's recorded balance changes.

Traces to: UR-527.

##### SRS-527.2, DP — Transaction details.

When a history entry is displayed, the system shall show its date and time, earning or spending category, signed points change, resulting balance, and source activity or purchased item.

Traces to: UR-527.

##### SRS-527.3, DP — History order.

When points history is displayed, the system shall order transactions from newest to oldest using their committed sequence to resolve equal timestamps.

Traces to: UR-527.

##### SRS-527.4, DP — Separate reward history.

When one accepted activity earns multiple reward categories, the system shall record a distinct history entry for each credited category.

Traces to: UR-527.

##### SRS-527.5, DP — Historical amount stability.

When a reward rule or catalog price later changes, the system shall preserve previously recorded transaction amounts.

Traces to: UR-527.

##### SRS-527.6, DP — History persistence.

When a student returns in another session, the system shall retain their earlier committed points-history records.

Traces to: UR-527.

##### SRS-527.7, DP — Removed Snipe history.

When a rewarded Snipe is removed, the system shall retain its reward history entry without displaying the removed photograph.

Traces to: UR-527.

##### SRS-527.8, DP — Older history access.

When more history entries exist than fit in the current history view, the system shall provide access to the older entries.

Traces to: UR-527.

<a id="ur-528"></a>

#### UR-528, DP - Understand How Points Can Be Earned

User requirement: As a student, I want the available ways to earn points and any important reward limits to be understandable before I participate, so that I know which activities can make progress toward rewards and when an activity is no longer eligible for additional points.

##### SRS-528.1, DP — Earning rules access.

When a student opens the Game Room rewards explanation, the system shall list supported earning activities with their agreed reward amounts and eligibility conditions.

Traces to: UR-528.

##### SRS-528.2, DP — Snipe rules before submission.

When a student opens the Snipe submission flow, the system shall provide the per-verified-friend reward rule, all-person sharing-permission rule, 24-hour request expiration, and pair cooldown rule before submission.

Traces to: UR-528.

##### SRS-528.3, DP — Daily participation rules.

When a student opens daily-reward information, the system shall explain the qualifying UR-613 activities, the saved participation-time-zone day boundary, and the once-per-day credit rule.

Traces to: UR-528.

##### SRS-528.4, DP — Shared streak rules before participation.

When a student opens the streak explanation, the system shall describe the UR-613 participation activities, three forgiven misses per Sunday-Saturday week, fourth unforgiven-miss reset, saved participation time zone, and unchanged count on forgiven days.

Traces to: UR-528.

##### SRS-528.5, DP — Milestone rules display.

When a student opens milestone information, the system shall display the 7, 14, and 30 qualifying-day thresholds with their agreed bonus amounts.

Traces to: UR-528.

##### SRS-528.6, DP — Normal game rules dependency.

When a supported game's reward explanation is displayed, the system shall use that game's agreed completion and replay-reward rules rather than imply that every replay earns normal game points.

Traces to: UR-528.

<a id="ur-529"></a>

#### UR-529, DP - Understand Rewards Before Spending

User requirement: As a student, I want eligible rewards to show their point cost and whether I already own or can currently purchase them, so that I can make informed choices about how to spend my points.

##### SRS-529.1, DP — Catalog offer details.

When a catalog item is displayed, the system shall show its name, visual preview, current point cost, and ownership or purchase-eligibility state.

Traces to: UR-529.

##### SRS-529.2, DP — Owned item state.

When the student already owns a catalog item, the system shall label it Owned rather than offer purchase.

Traces to: UR-529.

##### SRS-529.3, DP — Insufficient balance state.

When the student does not own an item but lacks its point cost, the system shall label it Insufficient points.

Traces to: UR-529.

##### SRS-529.4, DP — Purchase availability state.

When an unowned item is affordable and meets the catalog's eligibility conditions, the system shall label it Available to purchase.

Traces to: UR-529.

##### SRS-529.5, DP — Other ineligibility reason.

When an item is unavailable for a reason other than ownership or balance, the system shall display that specific reason.

Traces to: UR-529.

##### SRS-529.6, DP — Ownership refresh.

When a purchase is confirmed, the system shall update the purchased catalog item's state to Owned.

Traces to: UR-529.

##### SRS-529.7, DP — Placement information.

When a student inspects a decoration before purchasing, the system shall display its grid footprint, permitted placement area, and overlap category.

Traces to: UR-529.

<a id="section-SS"></a>

## 9. Navigation, Game Room, and Games

Feature owner: Sonja Seferasi (SS).

<a id="definitions-and-shared-rules"></a>

### Definitions and shared rules

| Term | Definition |
| --- | --- |
| Saved change | A change whose successful storage has been confirmed. A preview or pending request is not a confirmed save. |
| Complete outfit | A provided clothing combination selected as one item. Students do not select individual clothing pieces separately. |
| Available outfit | An outfit the student is currently entitled to use. |
| Game 1 attempt | One run of a level, beginning at its starting position and ending through failure, completion, or exit. |
| Paused attempt | An open attempt whose character position, movement state, and coin state remain unchanged until Resume. |
| Participation time zone | The time zone recorded from the student's browser when the account first records qualifying participation. Travel and device changes do not change it. |
| Participation day | Midnight up to, but excluding, the next midnight in the account's participation time zone. |
| Participation week | Sunday through Saturday in the account's participation time zone. |
| Qualifying participation | Starting a Game 1 attempt, submitting an accepted Wordle guess, or successfully opening Dorm Space. |
| Forgiven missed day | A completed day without qualifying participation during an active streak that consumes one weekly allowance without increasing or resetting the streak count. |
| Puzzle day | Midnight up to, but excluding, the next midnight in America/New_York, including applicable daylight-saving changes. |
| Accepted Wordle guess | A five-letter word from the game's approved English word list that is accepted as one of the student's six guesses. |
| Photograph size limit | A maximum input-file size of 10,000,000 bytes, identified in the interface as 10 MB. |

**Operation outcomes:** A confirmed rejection means an operation was not accepted. An unconfirmed outcome means its result is unknown, for example after a lost response; it does not prove that saving or submission failed. A submission-wait state ends when an outcome arrives or the return-wait limit is reached. Recovery preserves confirmed-saved state. An original Wordle submission and its retries are one logical submission; independently entering the same word on a later turn is a different submission.

**Participation-day states:** Played; Forgiven Miss; Miss That Reset the Streak; No Active Streak; Today-Not Yet Qualified; Upcoming. Completed days are reconciled chronologically; a Saturday miss belongs to the ending week before Sunday's allowance is initialized.

### Navigation Destination Table

| Navigation item | Destination |
| --- | --- |
| Home | Campus feed |
| Messages | Private and group messaging |
| Game Room | Activity selection, avatar customization, and participation status |
| Profile | The signed-in student's profile |
| Events and Trending | One combined Events and Trending page |

### Wordle Feedback Rule

The system evaluates repeated letters using these rules:

- Exact-position matches receive Correct position - green.

- Remaining guess letters are evaluated from left to right.

- A remaining letter receives Present elsewhere - yellow only if an unused occurrence remains in the answer.

- Otherwise, the letter receives No remaining match - gray.

- Each occurrence in the answer can support only one matching mark.

### Game 1 Controls

| Action | Keyboard | On-screen control |
| --- | --- | --- |
| Move left | Left Arrow | Left |
| Move right | Right Arrow | Right |
| Jump | Space | Jump |

<a id="area-600"></a>

### Navigation Bar

<a id="ur-600"></a>

#### UR-600, SS - Find and open a section.

User requirement: As a student, I want the navigation bar to identify my current section and provide access to Home, Messages, Game Room, Profile, and Events and Trending, so that I can recognize where I am and move to the section I need.

##### SRS-600.1, SS — Navigation destinations.

When a signed-in student opens a page outside Game 1 or Wordle, the system shall display the five destinations in the navigation destination table.

Acceptance criterion: Given the student opens the Game Room, when navigation appears, then all five destinations are present, with Events and Trending represented by one item.

Traces to: UR-600.

##### SRS-600.2, SS — Open the selected destination.

When a student selects a navigation destination, the system shall open its corresponding page from the navigation destination table.

Acceptance criterion: Given each destination in the navigation table, when it is selected, then its corresponding page opens; Profile opens the signed-in student's own profile.

Traces to: UR-600.

##### SRS-600.3, SS — Current-section indicator.

When a navigation destination becomes the current section, the system shall mark only that destination as selected.

Acceptance criterion: Given Home is selected, when Events and Trending opens, then Events and Trending is selected and Home is no longer selected.

Traces to: UR-600.

<a id="ur-601"></a>

#### UR-601, SS - Keep my navigation preference.

User requirement: As a student, I want to choose side or bottom placement through an option on the navigation bar and have that choice remembered after signing out and returning, so that I can continue using my preferred layout.

##### SRS-601.1, SS — Initial navigation placement.

When an account has no saved navigation-placement preference, the system shall display navigation on the left side of the page.

Acceptance criterion: Given an account has no saved placement, when an authenticated page opens, then navigation appears on the left.

Traces to: UR-601.

##### SRS-601.2, SS — Navigation placement control.

When navigation is visible, the system shall provide a Preferences control containing Side and Bottom placement choices.

Acceptance criterion: Given navigation is visible, when the student opens Preferences, then Side and Bottom are available.

Traces to: UR-601.

##### SRS-601.3, SS — Apply navigation placement.

When a student chooses Side or Bottom, the system shall display navigation in the selected position.

Acceptance criterion: Given navigation appears on the side, when Bottom is selected, then navigation moves to the bottom without changing the current page.

Traces to: UR-601.

##### SRS-601.4, SS — Remember navigation placement.

When a student signs in, the system shall restore the account's last successfully saved navigation placement.

Acceptance criterion: Given Bottom was successfully saved, when the student signs in on another supported device, then navigation appears at the bottom.

Traces to: UR-601.

##### SRS-601.5, SS — Preference-save failure.

When saving a navigation-placement preference fails, the system shall display a failure message with Retry.

Acceptance criterion: Given a placement save fails, when the failure is reported, then the student sees an unsaved-preference message and Retry.

Traces to: UR-601.

##### SRS-601.6, SS — Retry a navigation-preference save.

When the student selects Retry after a placement-save failure, the system shall retry saving the same selected placement.

Acceptance criterion: Given saving Bottom failed, when Retry succeeds, then Bottom becomes the account's saved placement.

Traces to: UR-601.

##### SRS-601.7, SS — Save the selected navigation placement.

When a student selects a navigation placement, the system shall initiate saving that selection without requiring a separate Save action.

Acceptance criterion: Given Side is active, when Bottom is selected, then saving Bottom begins without another student action.

Traces to: UR-601.

<a id="ur-602"></a>

#### UR-602, SS - Play without distraction.

User requirement: As a student, I want the navigation bar hidden while I am actively playing a game, so that I can focus on gameplay and avoid accidentally switching to another section.

##### SRS-602.1, SS — Game-only layout.

When Game 1 or Wordle is open, the system shall hide the shared application header and navigation throughout the game's selection, instructions, gameplay, pause, and result views.

Acceptance criterion: Given either game is open, when an applicable game view appears, then the shared header, navigation, Create control, and navigation-area leaderboard are absent.

Traces to: UR-602.

##### SRS-602.2, SS — Restore application navigation.

When a student returns from Game 1 or Wordle to the Game Room, the system shall restore navigation in the account's saved position.

Acceptance criterion: Given Bottom is the saved placement, when the student returns to the Game Room, then bottom navigation appears.

Traces to: UR-602.

<a id="ur-603"></a>

#### UR-603, SS - Notice unread messages.

User requirement: As a student, I want the Messages item to show the total number of unread messages across my private and group conversations, so that I can identify when conversations need my attention without opening each one to check.

##### SRS-603.1, SS — Unread-message count.

When the messaging feature supplies an unread-message total greater than zero, the system shall display that total beside Messages.

Acceptance criterion: Given three unread private messages and two unread group messages, when the total is supplied, then the Messages badge displays 5.

Traces to: UR-603.

##### SRS-603.2, SS — Update the unread badge.

When the messaging feature supplies a changed unread-message total, the system shall update the badge to represent the new total, with no badge displayed for zero.

Acceptance criterion: Given the badge displays 5, when the supplied unread total becomes zero, then the badge disappears.

Traces to: UR-603.

<a id="area-604"></a>

### Post and Event Creation Entry Points

<a id="ur-604"></a>

#### UR-604, SS - Start creating content through navigation.

User requirement: As a student, I want the plus (+) button to offer Text Post, Photo Post, and Event from any section where the navigation bar is available, so that I can start creating content without first opening its destination section.

##### SRS-604.1, SS — Create choices.

When a student activates the navigation plus button, the system shall display Text Post, Photo Post, and Event as creation choices.

Acceptance criterion: Given navigation is visible, when the plus button is activated, then all three creation choices appear.

Traces to: UR-604.

##### SRS-604.2, SS — Open the creation workflow.

When a student selects a creation choice, the system shall open the corresponding workflow supplied by the responsible feature owner.

Acceptance criterion: Given each Create choice, when it is selected, then Text Post opens the text composer, Photo Post opens the photo composer, and Event opens event creation.

Traces to: UR-604.

##### SRS-604.3, SS — Dismiss the Create menu.

When a student dismisses the Create menu without selecting an action, the system shall retain the current page.

Acceptance criterion: Given the Create menu is open over the Game Room, when it is dismissed, then the Game Room remains open.

Traces to: UR-604.

<a id="ur-605"></a>

#### UR-605, SS - Choose my post's audience.

User requirement: As a student, I want to select the campus feed or friends feed before publishing a text or photo post, so that I can share it with my intended audience.

Disposition: Delegated. MS requirements SRS-315.1 through SRS-315.3 implement this audience-selection goal. SS owns only the creation entry points.

<a id="ur-606"></a>

#### UR-606, SS - Finish a draft later.

User requirement: As a student, I want to save an unfinished text post, photo post, or event as a draft and reopen its saved content for editing, so that I can finish preparing it later without losing my work or publishing it prematurely.

Disposition: Deferred. Saving post or event drafts is reserved for a future release; this identifier is preserved.

<a id="area-607"></a>

### Game Room and Avatar Customization

<a id="ur-607"></a>

#### UR-607, SS - Choose and open an activity.

User requirement: As a student, I want to read the descriptions of Game 1, Wordle, and DormSpace and open my selection, with a clear message and the option to retry or choose a different activity if it fails to open, so that I can recover from the problem and continue using the Game Room.

##### SRS-607.1, SS — Present the available activities.

When a signed-in student opens the Game Room, the system shall display an entry for each included activity containing its name, description, and opening control.

Acceptance criterion: Given Game 1, Wordle, and DormSpace are included, when the Game Room opens, then each has a correctly labeled description and opening control.

Traces to: UR-607.

##### SRS-607.2, SS — Open the selected activity.

When a student activates an available activity's opening control, the system shall open that activity.

Acceptance criterion: Given each activity included in the release, when its opening control is selected, then that named activity opens without requiring avatar customization.

Traces to: UR-607.

##### SRS-607.3, SS — Recover from an activity-opening failure.

When an activity fails to open, the system shall display an opening-failure message offering Retry and Return to Game Room.

Acceptance criterion: Given an activity-opening failure, when the error appears, then the student can retry that activity or return to choose another.

Traces to: UR-607.

##### SRS-607.4, SS — Play without avatar customization.

When a student without a customized avatar opens Game 1, the system shall provide a character with the initial default face and outfit.

Acceptance criterion: Given the student has never customized an avatar, when Game 1 opens, then a playable default character is available without a photograph upload.

Traces to: UR-607.

<a id="ur-608"></a>

#### UR-608, SS - Choose an outfit and default face.

User requirement: As a student, I want to select a complete outfit and a provided default face, with both selections immediately displayed and saved on my avatar, so that I can personalize my character without uploading a photograph.

##### SRS-608.1, SS — Show available complete outfits.

When a student opens the outfit selector, the system shall list only complete outfits that the account is entitled to use.

Acceptance criterion: Given two usable outfits and one unowned outfit, when the selector opens, then only the two usable outfits are selectable.

Traces to: UR-608.

##### SRS-608.2, SS — Preview an outfit selection.

When a student selects an available outfit, the system shall display that complete outfit on the Game Room avatar.

Acceptance criterion: Given the outfit selector is open, when an outfit is selected, then the avatar displays the selected complete outfit.

Traces to: UR-608.

##### SRS-608.3, SS — Save an outfit automatically.

When a student selects an available outfit, the system shall initiate saving that selection without a separate Save action.

Acceptance criterion: Given an outfit is selected, when its save succeeds, then the selection remains applied on a later visit.

Traces to: UR-608.

##### SRS-608.4, SS — Preview a default face.

When a student selects a provided default face, the system shall display that face on the Game Room avatar.

Acceptance criterion: Given default faces are available, when one is selected, then the avatar displays it without requiring a photograph.

Traces to: UR-608.

##### SRS-608.5, SS — Save a default face automatically.

When a student selects a default face, the system shall initiate saving that selection without a separate Save action.

Acceptance criterion: Given a default face is selected, when its save succeeds, then that face remains selected on a later visit.

Traces to: UR-608.

##### SRS-608.6, SS — Recover from an appearance-save failure.

When an outfit or default-face save fails, the system shall display the previously saved appearance with a save-failure message and Retry.

Acceptance criterion: Given a new appearance selection fails to save, when the failure appears, then the previous saved appearance is displayed and Retry is available.

Traces to: UR-608.

<a id="ur-609"></a>

#### UR-609, SS - Use a photograph for my avatar's face.

User requirement: As a student, I want to resize and reposition the crop area of an uploaded photograph and preview the result before saving it, so that I can choose how the photograph appears on my avatar.

##### SRS-609.1, SS — Choose an existing photograph.

When a student selects Choose Photograph in the face editor, the system shall provide a device-file selection control.

Acceptance criterion: Given the face editor is open, when Choose Photograph is selected, then the student can select an existing image.

Traces to: UR-609.

##### SRS-609.2, SS — Take a photograph.

When a student selects Take Photograph on a device with an available camera, the system shall provide a camera-capture flow.

Acceptance criterion: Given camera access is permitted, when the student captures a photograph, then the captured image becomes available for face editing.

Traces to: UR-609.

##### SRS-609.3, SS — Accept supported photograph formats.

When a valid photograph within the size limit is supplied in JPG/JPEG, PNG, WebP, or HEIC format, the system shall accept it for face editing.

Acceptance criterion: Given a valid image in each supported format, when each is supplied within the size limit, then each opens for editing.

Traces to: UR-609.

##### SRS-609.4, SS — Enforce the photograph size limit.

When a photograph exceeds 10,000,000 bytes, the system shall reject it with a message stating the 10 MB maximum.

Acceptance criterion: Given valid images of 10,000,000 and 10,000,001 bytes, when they are supplied, then only the second is rejected for exceeding the limit.

Traces to: UR-609.

##### SRS-609.5, SS — Explain invalid photograph input.

When a supplied file uses an unsupported format or cannot be decoded as an image, the system shall display a rejection explanation with Choose Another Photograph.

Acceptance criterion: Given an unreadable file, when it is supplied, then an explanation and replacement-file option appear without changing the saved avatar.

Traces to: UR-609.

##### SRS-609.6, SS — Adjust the face crop.

When an accepted photograph opens in the editor, the system shall provide a crop area that the student can resize and reposition within the photograph.

Acceptance criterion: Given a photograph is open, when the crop is resized or repositioned, then the selected image area changes accordingly.

Traces to: UR-609.

##### SRS-609.7, SS — Preview the photographic face.

When the crop selection changes, the system shall preview the selected photographic face on the illustrated avatar body.

Acceptance criterion: Given a photograph is being edited, when the crop changes, then the preview reflects the selected face without converting it into a cartoon.

Traces to: UR-609.

##### SRS-609.8, SS — Save the photograph explicitly.

When a student selects Save for a photograph, the system shall replace the saved avatar face only after the save succeeds.

Acceptance criterion: Given an edited photograph, when Save succeeds, then that edited face replaces the previous saved face.

Traces to: UR-609.

##### SRS-609.9, SS — Recover from a photograph-save failure.

When saving an edited photograph fails, the system shall display a failure message with Retry for the retained photograph and crop.

Acceptance criterion: Given a photograph save fails, when Retry is offered, then the same edited photograph remains available and the previous saved face remains unchanged.

Traces to: UR-609.

##### SRS-609.10, SS — Confirm leaving an unsaved photograph.

When a student attempts to leave the face editor through an in-app action with unsaved changes, the system shall offer Keep Editing and Discard Changes.

Acceptance criterion: Given an unsaved crop, when the student attempts to close the editor, then both choices appear before the editor closes.

Traces to: UR-609.

##### SRS-609.11, SS — Discard an unsaved photograph.

When the student selects Discard Changes, the system shall leave the editor without replacing the previously saved face.

Acceptance criterion: Given an unsaved photograph, when Discard Changes is selected, then the editor closes and the saved face remains unchanged.

Traces to: UR-609.

##### SRS-609.12, SS — Continue editing after cancellation.

When the student selects Keep Editing, the system shall restore the editor with the current photograph and crop selection intact.

Acceptance criterion: Given an exit confirmation is open, when Keep Editing is selected, then the photograph and crop remain available for editing.

Traces to: UR-609.

##### SRS-609.13, SS — Recover from unavailable camera capture.

When camera capture is unavailable, denied, or unsuccessful, the system shall display an explanation with an option to choose an existing photograph.

Acceptance criterion: Given camera access is denied, when capture is attempted, then the existing-file option remains available and the saved face is unchanged.

Traces to: UR-609.

##### SRS-609.14, SS — Remove the photograph background.

Conditional feature: Applies if automatic background removal is included after feasibility validation.

When the photograph or crop changes, the system shall process the current selection for a background-free photographic face preview.

Acceptance criterion: Given processing succeeds, when the preview appears, then the selected face appears on the illustrated body without the photograph's original background.

Traces to: UR-609.

##### SRS-609.15, SS — Handle background-processing failure.

Conditional feature: Applies if automatic background removal is included.

When background processing fails, the system shall display Retry Processing, Choose Another Photograph, and Use Default Face as recovery options.

Acceptance criterion: Given processing fails, when the error appears, then all three recovery options are available.

Traces to: UR-609.

##### SRS-609.16, SS — Save only the processed candidate.

Conditional feature: Applies if automatic background removal is included.

When automatic background removal is enabled, the system shall permit saving a photograph candidate only after processing of its current selection succeeds.

Acceptance criterion: Given processing is pending or failed, when the editor is displayed, then Save remains unavailable until the current selection is successfully processed.

Traces to: UR-609.

<a id="ur-610"></a>

#### UR-610, SS - Retain my saved appearance.

User requirement: As a student, I want my saved face and outfit to remain selected on later visits and appear on my character in Game 1, so that I do not have to repeat my setup every time I return.

##### SRS-610.1, SS — Restore the saved appearance.

When a student returns to the Game Room, the system shall display the account's last successfully saved face and outfit.

Acceptance criterion: Given an appearance was saved, when the student signs out and returns, then the same face and outfit appear.

Traces to: UR-610.

##### SRS-610.2, SS — Use the saved appearance in Game 1.

When a student starts a Game 1 attempt, the system shall apply the account's saved face and outfit to the playable illustrated character.

Acceptance criterion: Given a face and outfit were saved in the Game Room, when an attempt starts, then the character uses both saved selections.

Traces to: UR-610.

<a id="ur-611"></a>

#### UR-611, SS - Change my avatar anytime.

User requirement: As a student, I want to update my outfit or face from the Game Room whenever I choose, so that I can change my appearance after the initial setup.

##### SRS-611.1, SS — Reopen avatar customization.

When a student opens the Game Room, the system shall provide face and outfit editing controls regardless of whether the avatar has previously been customized.

Acceptance criterion: Given the student already customized an avatar, when the Game Room opens again, then both editing controls remain available.

Traces to: UR-611.

<a id="area-612"></a>

### Participation Streak

<a id="ur-612"></a>

#### UR-612, SS - Understand my streak status.

User requirement: As a student, I want to see my current streak count, whether I have qualified for today's participation, and how many of this week's three forgiven missed days remain, so that I understand my progress and the flexibility available before my streak resets.

##### SRS-612.1, SS — Display the participation count.

When the student opens the Game Room or the included Wordle feature, the system shall display the account's current participation-streak count.

Acceptance criterion: Given four qualifying days and one forgiven miss since the last reset, when the count appears, then it displays four.

Traces to: UR-612.

##### SRS-612.2, SS — Display today's qualification.

When the student opens the Game Room or the included Wordle feature, the system shall identify whether the current participation day has qualified.

Acceptance criterion: Given today has no qualifying activity, when status appears, then today is marked Not Yet Qualified.

Traces to: UR-612.

##### SRS-612.3, SS — Display the remaining weekly allowance.

When the student opens the Game Room or the included Wordle feature, the system shall display the number of forgiven missed days remaining in the current participation week.

Acceptance criterion: Given two of the week's three forgiven misses have been used, when status appears, then one remains.

Traces to: UR-612.

##### SRS-612.4, SS — Identify days in the displayed week.

When the Game Room opens, the system shall display a Sunday-through-Saturday participation row assigning one of the defined day states to each date.

Acceptance criterion: Given played, forgiven, current-unqualified, and future dates in the participation week, when the Game Room opens, then the weekly row displays the correct state for each date.

Traces to: UR-612.

<a id="ur-613"></a>

#### UR-613, SS - Maintain progress through participation.

User requirement: As a student, I want starting a Game 1 attempt, submitting an accepted Wordle guess when available, or successfully opening DormSpace to count toward one shared participation streak once per day, with up to three missed days per Sunday-through-Saturday week preserving my count, so that I can maintain progress around classes and other commitments.

##### SRS-613.1, SS — Recognize qualifying participation.

When a student starts a Game 1 attempt, has a Wordle guess accepted, or successfully opens DormSpace, the system shall record qualifying participation for the current participation day.

Acceptance criterion: Given no participation today, when any qualifying action occurs, then today qualifies without requiring a win.

Traces to: UR-613.

##### SRS-613.2, SS — Exclude nonqualifying actions.

When a student performs an action outside the defined qualifying activities, the system shall leave the day's participation qualification unchanged.

Acceptance criterion: Given today is unqualified, when the student only opens a game menu, submits an invalid Wordle guess, or encounters an opening failure, then today remains unqualified.

Traces to: UR-613.

##### SRS-613.3, SS — Count a qualifying day once.

When the first qualifying activity of a participation day occurs, the system shall increase the streak count by exactly one for that day.

Acceptance criterion: Given a count of four, when several qualifying activities occur on the same day, then the count becomes five and increases no further that day.

Traces to: UR-613.

##### SRS-613.4, SS — Use the participation-day boundary.

When assigning an activity to a participation day, the system shall use midnight boundaries in the account's saved participation time zone.

Acceptance criterion: Given qualifying actions occur immediately before and after that midnight, when recorded, then they belong to different participation days.

Traces to: UR-613.

##### SRS-613.5, SS — Forgive an eligible missed day.

When an active-streak day ends without qualification and fewer than three misses have been forgiven that week, the system shall record that day as a forgiven miss.

Acceptance criterion: Given a streak of four and one allowance remaining, when an unqualified day ends, then the count remains four and the allowance becomes zero.

Traces to: UR-613.

##### SRS-613.6, SS — Reset after the allowance is exhausted.

When an active-streak day ends without qualification after all three weekly forgiven misses have been used, the system shall reset the streak count to zero.

Acceptance criterion: Given an active streak and no remaining allowance, when an unqualified day ends, then the count becomes zero.

Traces to: UR-613.

##### SRS-613.7, SS — Exclude days without an active streak.

When a day ends without qualification while the streak count is zero, the system shall leave the weekly forgiven-miss usage unchanged.

Acceptance criterion: Given no active streak, when an unqualified day ends, then that day consumes no forgiven-miss allowance.

Traces to: UR-613.

##### SRS-613.8, SS — Renew the weekly allowance.

When Sunday begins in the participation time zone, the system shall set the new week's forgiven-miss allowance to three without carrying over unused allowance.

Acceptance criterion: Given Saturday ends without qualification and one unused allowance remains in the ending week, when Sunday begins, then Saturday uses the ending week's allowance before the new week receives three allowances.

Traces to: UR-613.

##### SRS-613.9, SS — Preserve allowance usage after a restart.

When qualifying participation restarts a streak after a reset, the system shall retain the current week's existing forgiven-miss usage.

Acceptance criterion: Given the allowance was exhausted, when participation restarts the streak during the same week, then the count becomes one and the allowance remains zero.

Traces to: UR-613.

##### SRS-613.10, SS — Establish the participation time zone.

When the account first records qualifying participation, the system shall save the browser-reported time zone as the account's participation time zone.

Acceptance criterion: Given the browser reports America/Los_Angeles, when first participation is recorded, then that zone becomes the account's participation zone.

Traces to: UR-613.

##### SRS-613.11, SS — Keep the participation time zone stable.

When subsequent participation days are calculated, the system shall use the initially saved participation time zone with its applicable daylight-saving rules.

Acceptance criterion: Given America/Los_Angeles was initially saved, when the student uses a device in New York, then participation deadlines still follow America/Los_Angeles.

Traces to: UR-613.

##### SRS-613.12, SS — Evaluate elapsed participation days.

When participation status is requested or a new qualifying activity is processed after an absence, the system shall evaluate every completed participation day in chronological order before applying the current activity.

Acceptance criterion: Given an absence crosses a fourth unforgiven miss and a Sunday boundary, when the student returns, then the earlier streak resets before the later weekly allowance and current activity are processed.

Traces to: UR-613.

##### SRS-613.13, SS — Provide shared participation state.

After a qualifying activity updates the participation state, the system shall make its participation record available to shared reward processing with account identity, a stable activity identifier, participation date, saved time zone, current streak count, and streak-instance identifier. A streak-instance identifier remains the same until the streak resets; participation after a reset starts a new instance. Repeated processing of the same activity retains its activity identifier.

Traces to: UR-613.

<a id="ur-614"></a>

#### UR-614, SS - Get warned before losing my streak.

User requirement: As a student, I want an in-app reminder outside of gameplay when I have an active streak, have used all three forgiven missed days this week, and have not qualified for participation today, so that I know I must participate before local midnight to prevent a reset.

##### SRS-614.1, SS — Show an at-risk reminder.

When a student opens a page outside games with an active streak, no remaining weekly allowance, no qualification today, and no dismissal today, the system shall display a participation reminder.

Acceptance criterion: Given all four conditions apply, when a page outside games opens, then the reminder states that participation is needed before the participation-day deadline.

Traces to: UR-614.

##### SRS-614.2, SS — Suppress reminders inside games.

While Game 1 or Wordle is open, the system shall keep the participation reminder hidden.

Acceptance criterion: Given the student's streak is at risk, when either game opens, then no participation reminder overlays its views.

Traces to: UR-614.

##### SRS-614.3, SS — Allow reminder dismissal.

When a student dismisses the reminder, the system shall close it without requiring participation.

Acceptance criterion: Given a reminder is visible, when its dismissal control is selected, then it closes and the student can continue using the current page.

Traces to: UR-614.

##### SRS-614.4, SS — Stop reminders after qualification.

When the current participation day qualifies, the system shall suppress further at-risk reminders for that day.

Acceptance criterion: Given an at-risk reminder appeared earlier, when qualifying participation occurs, then the reminder does not appear again that day.

Traces to: UR-614.

##### SRS-614.5, SS — Remember today's dismissal.

Proposed default for review: Dismissal lasts for the remainder of the participation day. When a student dismisses the reminder, the system shall suppress it until the next participation day.

Acceptance criterion: Given today's reminder was dismissed, when the student navigates, refreshes, or signs in again before the deadline, then it remains suppressed.

Traces to: UR-614.

<a id="area-615"></a>

### Game 1: Platform Game

<a id="ur-615"></a>

#### UR-615, SS - Understand the game's rules.

User requirement: As a student, I want instructions available before and during play explaining movement, jumping, hazards, optional coins, the finish flag, retries, and pausing, so that I can learn the game and check anything unfamiliar without leaving the level.

##### SRS-615.1, SS — Read instructions before starting.

When Game 1 opens before an attempt begins, the system shall provide instructions covering controls, platforms, falls, hazards, optional coins, the finish flag, retries, and pause/resume.

Acceptance criterion: Given Game 1 is open, when Instructions is selected, then every listed topic is explained.

Traces to: UR-615.

##### SRS-615.2, SS — Reopen instructions during an attempt.

When a Game 1 attempt is open, the system shall provide an Instructions control that opens the instructions without ending the attempt.

Acceptance criterion: Given an attempt is running, when Instructions is selected, then instructions appear and the attempt remains available for resumption.

Traces to: UR-615.

<a id="ur-616"></a>

#### UR-616, SS - Complete a platform challenge.

User requirement: As a student, I want to move my avatar left and right and jump between platforms while avoiding hazards and collecting optional coins, so that I can challenge myself to reach the finish flag and choose whether to collect coins along the way.

##### SRS-616.1, SS — Present the platform challenge.

When a level starts, the system shall present a single-player, two-dimensional course containing a starting position, platforms, gaps, hazards, optional coins, and a finish flag.

Acceptance criterion: Given an available level is selected, when its attempt begins, then the course contains all listed elements.

Traces to: UR-616.

##### SRS-616.2, SS — Move while a direction is held.

While an attempt is running with one direction held, the system shall move the character horizontally in the direction specified by the Game 1 Controls table.

Acceptance criterion: Given running gameplay, when Left Arrow or on-screen Left is held alone, then the character moves left; the corresponding Right inputs move it right.

Traces to: UR-616.

##### SRS-616.3, SS — Jump input.

While an attempt is running and the character is standing on a platform, the system shall initiate a jump when Space (or the on-screen Jump control) is activated.

Acceptance criterion: Given the character is standing on a platform, when Space or the on-screen Jump control is activated, then the character jumps.

Traces to: UR-616.

##### SRS-616.4, SS — Provide on-screen controls.

When Game 1 opens in a phone browser, the system shall display Left, Right, and Jump controls matching the Game 1 Controls table.

Acceptance criterion: Given the game is open on a phone, when the student holds Right and activates Jump, then the character can jump while moving right.

Traces to: UR-616.

##### SRS-616.5, SS — Choose on-screen control visibility.

When Game 1 opens in a non-phone browser, the system shall provide an option to show or hide its on-screen controls.

Acceptance criterion: Given keyboard controls are available, when on-screen controls are enabled, then Left, Right, and Jump appear without disabling the keyboard.

Traces to: UR-616.

##### SRS-616.6, SS — Land on platforms.

During a running attempt, the system shall support the character on a platform when the character lands on its upper surface.

Acceptance criterion: Given the character is descending above a platform, when it reaches the upper surface, then it lands rather than falling through.

Traces to: UR-616.

##### SRS-616.7, SS — End a released horizontal movement request.

When a held directional input is released during running gameplay, the system shall stop horizontal movement attributable to that input.

Acceptance criterion: Given Right is held with no other direction active, when Right is released, then the character stops moving right.

Traces to: UR-616.

##### SRS-616.8, SS — Preserve vertical motion after direction release.

When a directional input is released while the character is airborne, the system shall preserve the ongoing vertical motion of the jump or fall.

Acceptance criterion: Given the character is mid-jump while moving right, when Right is released, then the character continues its vertical jump motion rather than freezing in the air.

Traces to: UR-616.

<a id="ur-617"></a>

#### UR-617, SS - Monitor my attempt.

User requirement: As a student, I want to see the current level number and the number of coins collected during my current attempt, so that I can track my progress while deciding whether to collect more coins or head for the finish flag.

##### SRS-617.1, SS — Identify the current level.

While an attempt is open, the system shall display the number of the level being attempted.

Acceptance criterion: Given Level 2 is running or paused, when its status is displayed, then the level number is 2.

Traces to: UR-617.

##### SRS-617.2, SS — Initialize the coin count.

When a new attempt begins, the system shall initialize its collected-coin count to zero.

Acceptance criterion: Given an earlier attempt collected coins, when another attempt begins, then the displayed count starts at zero.

Traces to: UR-617.

##### SRS-617.3, SS — Collect each coin once.

When the character touches an uncollected coin during running gameplay, the system shall record that coin as collected once for the current attempt.

Acceptance criterion: Given an uncollected coin, when the character touches it, then the count increases by one and touching its former location adds nothing further.

Traces to: UR-617.

##### SRS-617.4, SS — Display the current attempt's coins.

While an attempt is open, the system shall display the number of coins collected in that attempt independently of previous attempts.

Acceptance criterion: Given two coins were collected during the current attempt, when the count appears, then it displays 2 regardless of previous runs.

Traces to: UR-617.

##### SRS-617.5, SS — Restore coins for a new attempt.

When a new attempt begins, the system shall restore every coin placed in that level to its uncollected state.

Acceptance criterion: Given coins were collected during an earlier run, when the level is started, retried, or replayed, then all placed coins are available again.

Traces to: UR-617.

<a id="ur-618"></a>

#### UR-618, SS - Continue through the levels.

User requirement: As a student, I want to select any unlocked level, distinguish available, locked, and completed levels, and retain my completed and unlocked levels between visits, so that I can continue my progress or replay a completed level when I return.

##### SRS-618.1, SS — Provide the three-level baseline.

When the student opens level selection in the baseline release, the system shall list Levels 1, 2, and 3.

Acceptance criterion: Given the baseline release is available, when level selection opens, then the three required levels are listed.

Traces to: UR-618.

##### SRS-618.2, SS — Initialize level availability.

When an account without saved Game 1 progress opens level selection, the system shall make only Level 1 available to start.

Acceptance criterion: Given no saved progress, when level selection opens, then Level 1 is available and Levels 2 and 3 are locked.

Traces to: UR-618.

##### SRS-618.3, SS — Distinguish level states.

When level selection appears, the system shall identify each level as Locked, Available, or Completed according to the account's saved progress.

Acceptance criterion: Given only Level 1 is completed, when the list appears, then Level 1 is Completed, Level 2 is Available, and Level 3 is Locked.

Traces to: UR-618.

##### SRS-618.4, SS — Prevent locked-level starts.

When a student attempts to start a locked level, the system shall reject the start with an explanation identifying the required preceding level.

Acceptance criterion: Given Level 3 is locked, when the student attempts to start it, then no attempt begins and the explanation identifies Level 2.

Traces to: UR-618.

##### SRS-618.5, SS — Start an unlocked level.

When a student selects an Available or Completed level, the system shall start a new attempt at that level's starting position.

Acceptance criterion: Given Level 1 is Completed, when it is selected, then a new Level 1 attempt begins at the start.

Traces to: UR-618.

##### SRS-618.6, SS — Restore saved progression.

When a student returns to Game 1, the system shall restore the account's confirmed-saved completed and unlocked levels regardless of any unfinished attempt discarded since that save.

Acceptance criterion: Given Level 1 completion was saved and a later Level 2 attempt was abandoned, when Game 1 reopens, then Level 1 remains Completed and Level 2 remains Available.

Traces to: UR-618.

<a id="ur-619"></a>

#### UR-619, SS - Know what follows completion.

User requirement: As a student, I want confirmation when I finish a level and options to replay, continue to the next level when available, or return to the Game Room, with confirmation of completing the level sequence after the final level, so that I understand my progress and available next actions.

##### SRS-619.1, SS — Complete a level at its flag.

When the character touches the finish flag during a running attempt, the system shall end that attempt successfully regardless of the collected-coin count.

Acceptance criterion: Given no coins were collected, when the character reaches the flag, then the level is completed successfully.

Traces to: UR-619.

##### SRS-619.2, SS — Stop the completed attempt.

When an attempt ends successfully, the system shall stop gameplay interactions for that attempt.

Acceptance criterion: Given the finish flag was reached, when movement input continues, then the completed attempt does not continue moving or collecting coins.

Traces to: UR-619.

##### SRS-619.3, SS — Save level completion.

When an attempt ends successfully, the system shall initiate saving that level's completion to the signed-in account.

Acceptance criterion: Given a level was completed, when saving succeeds, then reopening level selection shows that level as Completed.

Traces to: UR-619.

##### SRS-619.4, SS — Unlock the next level.

When completion is confirmed saved and the next sequential level is Locked, the system shall change that next level to Available.

Acceptance criterion: Given Level 2 is Locked, when Level 1 completion is saved, then Level 2 becomes Available; an already Completed Level 2 remains Completed.

Traces to: UR-619.

##### SRS-619.5, SS — Offer completion actions.

When completion is confirmed saved, the system shall display Replay, Back to Game Room, and Next Level when another level exists.

Acceptance criterion: Given Level 1 completion is saved, when its result appears, then all three actions are available.

Traces to: UR-619.

##### SRS-619.6, SS — Identify sequence completion.

When completion of the final included level is confirmed saved, the system shall display a sequence-completion result containing Replay and Back to Game Room as its available next actions.

Acceptance criterion: Given the final included level is confirmed saved, when its result appears, then the result identifies sequence completion and offers Replay and Back to Game Room without Next Level.

Traces to: UR-619.

##### SRS-619.7, SS — Explain an unconfirmed completion save.

When successful completion saving cannot be confirmed, the system shall display the retained completion result with a message stating that saving has not been confirmed.

Acceptance criterion: Given the save response is lost, when the failure is reported, then the result remains available without claiming confirmed success or certain loss.

Traces to: UR-619.

##### SRS-619.8, SS — Protect an unresolved completion.

While completion saving is unresolved, the system shall prevent Next Level and Replay from starting another attempt.

Acceptance criterion: Given completion saving is unresolved, when its result appears, then neither action can start another attempt.

Traces to: UR-619.

##### SRS-619.9, SS — Retry saving completion.

When Retry Saving is selected, the system shall retry saving the retained completion result without requiring the level to be played again.

Acceptance criterion: Given a completion save failed, when Retry Saving succeeds, then completion is recorded without replaying the level.

Traces to: UR-619.

##### SRS-619.10, SS — Replay a completed level.

When Replay is selected from a confirmed-saved result, the system shall start a new attempt of that completed level.

Acceptance criterion: Given Level 2 completion is saved, when Replay is selected, then Level 2 begins from its initial state.

Traces to: UR-619.

##### SRS-619.11, SS — Continue to the next level.

When Next Level is selected from a confirmed-saved result, the system shall start a new attempt of the next sequential level.

Acceptance criterion: Given Level 1 completion is saved, when Next Level is selected, then Level 2 begins from its initial state.

Traces to: UR-619.

<a id="ur-620"></a>

#### UR-620, SS - Retry after an unsuccessful attempt.

User requirement: As a student, I want to be told whether a fall or hazard ended my attempt and be able to restart the current level immediately, with no limit on retries, so that I can try again without losing previously completed levels.

##### SRS-620.1, SS — End an attempt after a fall or hazard.

When the character falls below the level's playable area or touches a hazard during running gameplay, the system shall end the attempt unsuccessfully.

Acceptance criterion: Given an attempt is running, when either failure condition occurs, then that attempt stops unsuccessfully.

Traces to: UR-620.

##### SRS-620.2, SS — Explain the failure cause.

When an attempt ends unsuccessfully, the system shall identify whether a fall or hazard contact caused the failure.

Acceptance criterion: Given each failure cause, when the failure result appears, then a fall is identified as a fall and hazard contact is identified as hazard contact.

Traces to: UR-620.

##### SRS-620.3, SS — Retry the current level.

When Retry is selected after an unsuccessful attempt, the system shall start the same level from its initial state.

Acceptance criterion: Given an attempt failed after collecting coins, when Retry is selected, then the character returns to the start with zero collected coins and all coins restored.

Traces to: UR-620.

##### SRS-620.4, SS — Allow unlimited retries.

When an attempt ends unsuccessfully, the system shall offer Retry regardless of the number of previous attempts.

Acceptance criterion: Given repeated failures, when another attempt fails, then Retry remains available without reducing saved level progression.

Traces to: UR-620.

<a id="ur-621"></a>

#### UR-621, SS - Pause without losing my place.

User requirement: As a student, I want to pause gameplay and resume the same open attempt from the position where I paused, so that I can handle a short interruption and continue that attempt.

##### SRS-621.1, SS — Pause on request.

When Pause is selected during running gameplay, the system shall place the current attempt in the paused state.

Acceptance criterion: Given an attempt is running, when Pause is selected, then the attempt pauses and Resume becomes available.

Traces to: UR-621.

##### SRS-621.2, SS — Pause for an interruption.

When instructions or an exit confirmation open, or the game tab becomes hidden, the system shall pause a running attempt.

Acceptance criterion: Given running gameplay, when instructions open, exit confirmation opens, or the browser tab becomes hidden, then the attempt pauses for each of those interruptions.

Traces to: UR-621.

##### SRS-621.3, SS — Preserve the paused state.

While an attempt is paused, the system shall preserve its gameplay state without advancing movement, collisions, or coin collection.

Acceptance criterion: Given the character is paused mid-jump with two coins, when time passes, then its position, movement state, and coin state remain unchanged.

Traces to: UR-621.

##### SRS-621.4, SS — Require explicit resumption.

When an interruption ends, the system shall keep the attempt paused until Resume is selected.

Acceptance criterion: Given the attempt paused for instructions, exit confirmation, or a hidden tab, when that interruption ends, then gameplay remains paused.

Traces to: UR-621.

##### SRS-621.5, SS — Resume the same attempt.

When Resume is selected, the system shall continue the attempt from its preserved gameplay state.

Acceptance criterion: Given the character was paused mid-jump, when Resume is selected, then that jump continues from its preserved position and movement state.

Traces to: UR-621.

<a id="ur-622"></a>

#### UR-622, SS - Leave an attempt intentionally.

User requirement: As a student, I want a separate Exit control while navigation is hidden, with the choice to confirm ending the unfinished attempt and returning to the Game Room or cancel and remain in the game, so that I can decide whether to leave before my current attempt ends.

##### SRS-622.1, SS — Provide a return control.

When a Game 1 view appears, the system shall provide Back to Game Room.

Acceptance criterion: Given level selection, instructions, gameplay, pause, or a result is visible, when the student looks for an exit, then Back to Game Room is available.

Traces to: UR-622.

##### SRS-622.2, SS — Confirm leaving an unfinished attempt.

When Back to Game Room is selected during an unfinished attempt, the system shall display a Leave Game / Stay confirmation explaining that current attempt progress will be discarded while confirmed-saved level progression is retained.

Acceptance criterion: Given an unfinished attempt, when Back to Game Room is selected, then Leave Game and Stay appear with an explanation that saved level progression remains.

Traces to: UR-622.

##### SRS-622.3, SS — Cancel an exit.

When Stay is selected in the exit confirmation, the system shall return to the paused attempt.

Acceptance criterion: Given the exit confirmation is open, when Stay is selected, then the attempt remains unchanged and Resume is available.

Traces to: UR-622.

##### SRS-622.4, SS — Leave an unfinished attempt.

When Leave Game is confirmed, the system shall open the Game Room.

Acceptance criterion: Given the unfinished-attempt confirmation is open, when Leave Game is selected, then the Game Room opens with the saved navigation placement restored.

Traces to: UR-622.

##### SRS-622.5, SS — End an attempt on refresh or closure.

When the game page is refreshed or closed during an unfinished attempt, the system shall discard that attempt while retaining confirmed-saved progression.

Acceptance criterion: Given Level 1 is completed and Level 2 is unfinished, when the page is reopened, then Level 1 remains completed and Level 2 restarts from its beginning.

Traces to: UR-622.

##### SRS-622.6, SS — Warn before leaving an unconfirmed completion.

When Back to Game Room is selected after a completion-save error or expiration of the return-wait limit in SRS-NFR-65, the system shall offer Stay and Retry or Leave Without Saving with a warning that completion may be lost.

Acceptance criterion: Given completion saving is unconfirmed, when return is selected, then both choices and the warning appear.

Traces to: UR-622.

##### SRS-622.7, SS — Stay and retry completion saving.

When Stay and Retry is selected, the system shall retry saving the retained completion without leaving Game 1.

Acceptance criterion: Given an unconfirmed completion, when Stay and Retry is selected, then another save is attempted while the result remains open.

Traces to: UR-622.

##### SRS-622.8, SS — Leave without confirmed completion saving.

When Leave Without Saving is selected, the system shall return to the Game Room without claiming that the unconfirmed completion was recorded.

Acceptance criterion: Given the warning is open, when Leave Without Saving is selected, then the Game Room opens without a false saved-progress confirmation.

Traces to: UR-622.

##### SRS-622.9, SS — Return when no attempt needs protection.

When Back to Game Room is selected with no unfinished attempt or unresolved completion save, the system shall open the Game Room without an attempt-loss confirmation.

Acceptance criterion: Given a successfully saved completion result, when Back to Game Room is selected, then the Game Room opens directly.

Traces to: UR-622.

##### SRS-622.10, SS — Recover from an unconfirmed completion on return.

When a pending completion save reaches the wait limit in SRS-NFR-65 following a Back to Game Room request, the system shall display the unconfirmed-save exit dialog specified in SRS-622.6.

Acceptance criterion: Given no save outcome has arrived by the return-wait limit, when that limit expires, then Stay and Retry / Leave Without Saving appear with an unconfirmed-outcome warning rather than a claim that the save certainly failed.

Traces to: UR-622.

##### SRS-622.11, SS — Discard only the confirmed-exit attempt.

When Leave Game is confirmed for an unfinished attempt, the system shall discard that attempt's position and collected-coin state.

Acceptance criterion: Given an unfinished Level 2 attempt and a confirmed-saved Level 1 completion, when Leave Game is confirmed and Level 2 is later restarted, then Level 2 begins from its initial state while Level 1 remains completed.

Traces to: UR-622.

<a id="area-623"></a>

### Daily Word Game

Conditional delivery: Wordle is optional if time allows. It uses the shared participation streak. Historical puzzle browsing and statistics are excluded.

<a id="ur-623"></a>

#### UR-623, SS - Understand the daily word game's rules.

User requirement: As a student, I want instructions explaining the three feedback marks and the limit of six guesses, so that I can understand how to play my first puzzle.

Disposition: Conditional. Applies only if Wordle is included. Historical puzzle browsing and historical statistics are excluded.

##### SRS-623.1, SS — Explain Wordle rules.

When How to Play is selected, the system shall explain the five-letter English-word objective, six accepted guesses, feedback meanings, and daily-puzzle restriction.

Acceptance criterion: Given Wordle is open, when How to Play is selected, then all listed rules appear without revealing the answer.

Traces to: UR-623.

##### SRS-623.2, SS — Return from instructions.

When Wordle instructions are closed, the system shall restore the unchanged puzzle state.

Acceptance criterion: Given two accepted guesses, when instructions are opened and closed, then both guesses and the remaining attempt count are unchanged.

Traces to: UR-623.

<a id="ur-624"></a>

#### UR-624, SS - Play today's word.

User requirement: As a student, I want to submit guesses against the same daily word every other student is solving, with feedback shown immediately after each guess, so that I can take part in a shared daily challenge.

Disposition: Conditional. Applies only if Wordle is included. Historical puzzle browsing and historical statistics are excluded.

##### SRS-624.1, SS — Assign the shared daily puzzle.

When Wordle opens, the system shall use the five-letter English answer assigned to the current date in America/New_York.

Acceptance criterion: Given two students in different time zones, when they open Wordle during the same puzzle day, then both solve the same answer.

Traces to: UR-624.

##### SRS-624.2, SS — Display the guess board.

When a puzzle appears, the system shall display six guess rows containing five letter positions each.

Acceptance criterion: Given a puzzle is open, when its board is inspected, then it contains 30 positions arranged as six rows of five.

Traces to: UR-624.

##### SRS-624.3, SS — Enter guess letters.

When an A-Z letter is entered through the physical or on-screen keyboard into an unfinished, unsubmitted guess containing fewer than five letters, the system shall place that letter in the next empty position.

Acceptance criterion: Given the current unsubmitted guess contains CR, when A is entered using either supported keyboard, then the guess becomes CRA.

Traces to: UR-624.

##### SRS-624.4, SS — Edit an unsubmitted guess.

When Backspace is activated for a nonempty unsubmitted guess, the system shall remove its final letter.

Acceptance criterion: Given CRAN is unsubmitted, when Backspace is activated, then CRA remains.

Traces to: UR-624.

##### SRS-624.5, SS — Reject an incomplete guess.

When a submitted guess contains fewer than five letters, the system shall reject it without consuming an attempt, using a five-letter requirement message.

Acceptance criterion: Given CRAN is submitted, when validation occurs, then it is rejected without consuming a guess.

Traces to: UR-624.

##### SRS-624.6, SS — Reject an unknown word.

When a submitted five-letter guess is absent from the approved English word list, the system shall reject it without consuming an attempt, using a word-not-in-list message.

Acceptance criterion: Given a five-letter string absent from the list, when submitted, then it is rejected without consuming a guess.

Traces to: UR-624.

##### SRS-624.7, SS — Evaluate accepted guesses.

When a guess is accepted, the system shall mark its letters according to the Wordle feedback rule defined in this document.

Acceptance criterion: Given APPLE is the answer, when ALLEY is accepted, then its feedback is green, yellow, gray, yellow, gray.

Traces to: UR-624.

##### SRS-624.8, SS — Count accepted guesses.

When a valid guess is accepted, the system shall consume exactly one of the account's six guesses for that puzzle day.

Acceptance criterion: Given two guesses have been accepted, when a third is accepted, then three guesses remain.

Acceptance criterion: Given five guesses have been accepted for one account and puzzle day, when two devices submit competing guesses, then at most one submission occupies the sixth row and no seventh guess is accepted.

Traces to: UR-624.

##### SRS-624.9, SS — Prevent overlapping submissions.

While a submitted guess awaits its outcome, the system shall prevent another guess submission for that puzzle.

Acceptance criterion: Given a submission is pending, when Enter is activated again, then no additional submission is accepted.

Traces to: UR-624.

##### SRS-624.10, SS — Recover from an unconfirmed submission.

When a submitted guess has an unconfirmed outcome, the system shall display a recovery message offering Retry Submission and Back to Game Room.

Acceptance criterion: Given a submission response is lost, when recovery appears, then the typed guess remains available, no unconfirmed result is labeled saved, and both recovery choices are available.

Traces to: UR-624.

##### SRS-624.11, SS — Resume today's unfinished puzzle.

When an account reopens an unfinished puzzle during the same puzzle day, the system shall restore its accepted guesses and feedback.

Acceptance criterion: Given two guesses were accepted, when the student refreshes or signs in on another supported device, then both guesses and four remaining guesses are restored.

Traces to: UR-624.

##### SRS-624.12, SS — Start the new puzzle day.

When the America/New_York date changes while Wordle is open, the system shall switch the current puzzle to the new date's puzzle.

Acceptance criterion: Given yesterday's puzzle remains open, when the daily boundary occurs, then yesterday's puzzle stops accepting guesses and today's puzzle becomes current.

Traces to: UR-624.

##### SRS-624.13, SS — Explain a daily transition.

When the daily boundary replaces an unfinished puzzle, the system shall display a message explaining that the previous puzzle day ended.

Acceptance criterion: Given an unfinished puzzle is replaced at midnight Eastern Time, when the new puzzle appears, then the transition explanation is visible.

Traces to: UR-624.

##### SRS-624.14, SS — Return from Wordle.

When Back to Game Room is selected from Wordle outside an active submission-wait state, the system shall open the Game Room without deleting accepted guesses for the current puzzle day.

Acceptance criterion: Given two accepted guesses, when the student leaves from normal play or the unconfirmed-submission recovery view and returns that puzzle day, then those accepted guesses are restored from the account's saved puzzle state.

Traces to: UR-624.

##### SRS-624.15, SS — Protect a pending guess on return.

When a pending Wordle submission reaches the wait limit in SRS-NFR-65 following a Back to Game Room request, the system shall display the unconfirmed-submission recovery view specified in SRS-624.10.

Acceptance criterion: Given a return request during a pending submission with no response by the wait limit, when the limit expires, then Retry Submission and Back to Game Room become available instead of leaving the student blocked indefinitely.

Traces to: UR-624.

##### SRS-624.16, SS — Count a retried submission at most once.

When an original Wordle submission is retried, the system shall treat that submission and all of its retries as at most one accepted guess for the same account and puzzle day.

Acceptance criterion: Given the second guess was accepted but its response was lost, when Retry Submission recovers it, then the board still contains two accepted guesses with four remaining rather than consuming a third guess.

Acceptance criterion: Given an original submission is still processing when its retry arrives, when their outcomes are resolved in either order, then that original submission occupies at most one guess row.

Traces to: UR-624.

##### SRS-624.17, SS — Retry a guess not previously accepted.

When Retry Submission confirms that the original submission was not accepted and its puzzle day remains open, the system shall submit the retained guess through the normal validation flow.

Acceptance criterion: Given a submission was not accepted and today's puzzle remains unfinished, when Retry Submission is selected, then the retained word is evaluated as one submission under the ordinary validity and six-guess rules.

Traces to: UR-624.

##### SRS-624.18, SS — Keep late results with their original puzzle.

When a submission result arrives after the puzzle day changes, the system shall associate that result only with the puzzle day of the original submission.

Acceptance criterion: Given a response for yesterday arrives after today's puzzle opens, when it is processed, then it cannot populate a row or consume a guess in today's puzzle.

Traces to: UR-624.

##### SRS-624.19, SS — Ignore letters beyond the guess limit.

When the current unsubmitted guess already contains five letters, the system shall ignore additional letter-entry input.

Acceptance criterion: Given CRANE fills the current guess, when another letter is entered, then CRANE remains unchanged; Backspace can still remove its last letter.

Traces to: UR-624.

<a id="ur-625"></a>

#### UR-625, SS - Know today's outcome.

User requirement: As a student, I want confirmation when I solve the daily word within six guesses and to be shown the correct word if I use all six guesses without solving it, so that I know the puzzle's outcome.

Disposition: Conditional. Applies only if Wordle is included. Historical puzzle browsing and historical statistics are excluded.

##### SRS-625.1, SS — Display a winning outcome.

When an accepted guess matches the answer, the system shall display a solved result containing the number of accepted guesses used.

Acceptance criterion: Given the second accepted guess is correct, when evaluation completes, then the result states Solved in 2 guesses.

Traces to: UR-625.

##### SRS-625.2, SS — Display an unsuccessful outcome.

When the sixth accepted guess is incorrect, the system shall display an unsuccessful result revealing the correct answer.

Acceptance criterion: Given five incorrect accepted guesses, when the sixth is incorrect, then the puzzle ends and the answer appears.

Traces to: UR-625.

##### SRS-625.3, SS — Lock a completed puzzle.

When a puzzle reaches a solved or unsuccessful result, the system shall prevent further guess acceptance for that account and puzzle day.

Acceptance criterion: Given the puzzle is finished, when another submission is attempted, then the saved guesses and outcome remain unchanged.

Traces to: UR-625.

<a id="ur-626"></a>

#### UR-626, SS - Review my completed daily puzzle.

User requirement: As a student, I want to see my completed puzzle result, including my guesses and their feedback, after solving the word or using all six guesses, without an option to reset it before the next daily puzzle begins, so that I can review my result while keeping the daily attempt limit consistent.

Disposition: Conditional. Applies only if Wordle is included. Historical puzzle browsing and historical statistics are excluded.

##### SRS-626.1, SS — Restore today's completed puzzle.

When an account reopens a completed puzzle before the next puzzle day, the system shall display its saved result, accepted guesses, and feedback as read-only content.

Acceptance criterion: Given today's puzzle is completed, when Wordle reopens, then the same result and board appear without Reset or Replay.

Traces to: UR-626.

##### SRS-626.2, SS — Restrict results to today.

When the Wordle result view opens, the system shall restrict its displayed puzzle results to the current puzzle day.

Acceptance criterion: Given earlier puzzle days exist, when today's result opens, then no historical statistics or previous-day puzzle browser appears.

Traces to: UR-626.

<a id="area-627"></a>

### Display Preference

<a id="ur-627"></a>

#### UR-627, SS - Keep my display preference.

User requirement: As a student, I want to choose light or dark mode and have my choice remembered across visits and devices, so that I can use SocialU with my preferred appearance.

##### SRS-627.1, SS — Provide theme choices.

When navigation Preferences opens, the system shall display Light and Dark appearance choices.

Acceptance criterion: Given Preferences is open, when appearance options are inspected, then both choices are selectable.

Traces to: UR-627.

##### SRS-627.2, SS — Use the initial theme.

Proposed default for review: New accounts start in Light mode. When an account has no saved appearance preference, the system shall use Light mode.

Acceptance criterion: Given no theme has been saved, when an authenticated page opens, then Light mode is active.

Traces to: UR-627.

##### SRS-627.3, SS — Apply the selected theme.

When Light or Dark is selected, the system shall apply that appearance to the current page's shared interface.

Acceptance criterion: Given Light is active, when Dark is selected, then the shared interface changes without replacing the current page or entered content.

Traces to: UR-627.

##### SRS-627.4, SS — Restore the saved theme.

When the student signs in, the system shall restore the account's last successfully saved appearance preference.

Acceptance criterion: Given Dark was saved, when the student signs in on another supported device, then Dark is applied.

Traces to: UR-627.

##### SRS-627.5, SS — Maintain the theme across pages.

When another authenticated page opens, the system shall apply the account's selected theme to that page's shared interface.

Acceptance criterion: Given Dark is saved, when each navigation destination opens, then its shared interface uses Dark without requiring the preference to be selected again.

Traces to: UR-627.

##### SRS-627.6, SS — Limit theme changes inside games.

When a game opens with Dark selected, the system shall apply Dark to menus and controls while preserving gameplay artwork and feedback meanings.

Acceptance criterion: Given the same game is viewed in both themes, when compared, then scenery remains unchanged and Wordle feedback retains the same meanings.

Traces to: UR-627.

##### SRS-627.7, SS — Explain a theme-save failure.

When saving an appearance preference fails, the system shall display a failure message with Retry.

Acceptance criterion: Given saving Dark fails, when the error appears, then the interface identifies the unsaved preference and offers Retry.

Traces to: UR-627.

##### SRS-627.8, SS — Retry saving the theme.

When Retry is selected after a theme-save failure, the system shall retry saving the same selected theme.

Acceptance criterion: Given saving Dark failed, when Retry succeeds, then Dark becomes the account's saved theme.

Traces to: UR-627.

##### SRS-627.9, SS — Save the selected theme.

When Light or Dark is selected, the system shall initiate saving that selection without requiring a separate Save action.

Acceptance criterion: Given Light is active, when Dark is selected, then saving Dark begins without another action.

Traces to: UR-627.

<a id="nfr"></a>

## 10. Non-Functional Requirements

These records refer to the UR stories already stated. Their targets concern quality, integrity or operating constraints. Existing author targets are preserved; values marked proposed require agreement. Timing claims without a complete test profile remain open under B-09 rather than being treated as fully verified service levels.

<a id="nfr-LN"></a>

### Linh Nguyen (LN)

#### SRS-NFR-1, LN — Login Response Time.

The system shall complete a normal login request within 3 seconds after valid login credentials are submitted under normal operating conditions.

Acceptance criterion: Given valid credentials are entered under normal operating conditions, when Log In is selected, then the login completes within 3 seconds.

Traces to: UR-103

#### SRS-NFR-2, LN — Profile Update Response Time.

The system shall display successfully saved profile changes within 3 seconds after the student selects Save Changes under normal operating conditions.

Acceptance criterion: Given valid profile edits have been entered, when Save Changes is selected, then the updated profile information is displayed within 3 seconds.

Traces to: UR-110

#### SRS-NFR-3, LN — Friends Search Response Time.

The system shall display matching friends-list search results within 3 seconds after search text changes when the friends list contains up to 5,000 accepted friends under normal operating conditions.

Acceptance criterion: Given a friends list contains no more than 5,000 accepted friends, when the student changes the search text, then matching results appear within 3 seconds.

Traces to: UR-118

#### SRS-NFR-4, LN — Verification Email Delivery Time.

The system shall send a requested six-digit verification code to the student's university email within 30 seconds under normal operating conditions.

Acceptance criterion: Given a valid verification-code request is submitted, when the system accepts the request, then the verification email is sent within 30 seconds.

Traces to: UR-101, UR-102, UR-106

#### SRS-NFR-5, LN — Password Reset Email Delivery Time.

The system shall send a requested six-digit password-reset code to the student's registered university email within 30 seconds under normal operating conditions.

Acceptance criterion: Given a valid password-reset request is submitted, when the system accepts the request, then the reset email is sent within 30 seconds.

Traces to: UR-104

#### SRS-NFR-6, LN — Profile Page Load Time.

The system shall display a selected student profile within 3 seconds under normal operating conditions.

Acceptance criterion: Given an accessible student profile is selected, when the system begins loading that profile, then the profile is displayed within 3 seconds.

Traces to: UR-109, UR-111, UR-112, UR-113

#### SRS-NFR-7, LN — Remote Logout Response Time.

The system shall terminate a selected remote active session within 3 seconds after the student confirms the remote logout action under normal operating conditions.

Acceptance criterion: Given another active session exists, when the student confirms remote logout, then the selected session is terminated within 3 seconds.

Traces to: UR-107

#### SRS-NFR-8, LN — Keyboard Accessibility.

The system shall allow 100% of interactive controls in the Accounts & Authentication, Profile, and Friendships areas to be reached and activated using a keyboard without requiring a mouse.

Acceptance criterion: Given a tester uses only a keyboard, when the tester navigates the LN feature areas, then every interactive control can be reached and activated.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-9, LN — Profile Photo Upload Time.

The system shall process and display an accepted profile photo within 3 seconds after upload begins for image files of 10 MB or less under normal operating conditions.

Acceptance criterion: Given a supported profile-photo file is 10 MB or less, when the student uploads it, then the photo is processed and displayed within 3 seconds.

Traces to: UR-109, UR-110

#### SRS-NFR-10, LN — Friend Request Processing Time.

The system shall record a submitted friend request as pending within 3 seconds after the student selects Add Friend under normal operating conditions.

Acceptance criterion: Given a student is eligible to send a friend request, when Add Friend is selected, then the request is recorded as pending within 3 seconds.

Traces to: UR-114

#### SRS-NFR-11, LN — Friend Request Notification Time.

The system shall display a new friend-request notification to the receiving student within 3 seconds after the friend request is successfully recorded under normal operating conditions.

Acceptance criterion: Given a friend request is successfully recorded, when the receiving student is using SocialU, then the friend-request notification is displayed within 3 seconds.

Traces to: UR-114

#### SRS-NFR-12, LN — Friendship Update Time.

The system shall update friendship status and displayed friend count within 3 seconds after a friend request is accepted or an existing friendship is removed under normal operating conditions.

Acceptance criterion: Given a friendship is accepted or removed, when the relationship change completes, then the friendship status and friend count update within 3 seconds.

Traces to: UR-116, UR-120

#### SRS-NFR-13, LN — Block and Unblock Update Time.

The system shall apply a confirmed block or unblock action within 3 seconds under normal operating conditions.

Acceptance criterion: Given the student confirms Block or Unblock, when the action is submitted, then the relationship change is applied within 3 seconds.

Traces to: UR-121, UR-122

#### SRS-NFR-14, LN — Saved Data Persistence.

The system shall preserve 100% of successfully saved profile information, friendships, blocked-student entries, account settings, and retained account data across logout and subsequent login sessions.

Acceptance criterion: Given saved LN-area account data exists, when the student logs out and later logs back in, then all previously saved data remains available.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-15, LN — Saved Data Protection During Errors.

The system shall preserve 100% of previously saved data when an Accounts & Authentication, Profile, or Friendships operation is interrupted by a temporary system error before the new operation is successfully saved.

Acceptance criterion: Given previously saved data exists, when a temporary error interrupts an unsaved operation, then the previously saved data remains unchanged.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-16, LN — Browser Compatibility.

The system shall support the Accounts & Authentication, Profile, and Friendships features on the current supported versions of Google Chrome, Safari, Microsoft Edge, and Mozilla Firefox.

Acceptance criterion: Given the current supported version of each listed browser is used, when the LN feature areas are tested, then the required features are available in all four browsers.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-17, LN — Responsive Device Support.

The system shall provide the Accounts & Authentication, Profile, and Friendships features on smartphones, tablets, laptops, and desktop computers without requiring a separate installed application.

Acceptance criterion: Given SocialU is opened through a supported browser on each of the four device categories, when an LN feature is accessed, then the feature is usable without installing a native application.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-18, LN — Error Message Coverage.

The system shall display an error message for 100% of failed user-initiated operations in the Accounts & Authentication, Profile, and Friendships areas, identifying the failed action or invalid condition.

Acceptance criterion: Given a user-initiated LN-area operation fails, when the failure occurs, then an error message identifies the failed action or invalid condition.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-19, LN — Error Recovery Guidance.

The system shall provide at least one corrective action in the error message for each user-correctable failure in the Accounts & Authentication, Profile, and Friendships areas.

Acceptance criterion: Given a failure can be corrected by the student, when the error message is displayed, then at least one corrective action is provided.

Applies to: UR-100 through UR-123

Traces to: UR-100 through UR-123.

#### SRS-NFR-20, LN — Password Masking.

The system shall mask entered characters by default in 100% of password and password-confirmation fields.

Acceptance criterion: Given a password field is displayed, when the student types password characters, then those characters are masked by default.

Applies to: UR-100, UR-103, UR-104, UR-105, UR-106, UR-123

Traces to: UR-100, UR-103, UR-104, UR-105, UR-106, UR-123.

#### SRS-NFR-21, LN — Password Visibility Control.

The system shall provide a Show/Hide Password control for 100% of password and password-confirmation fields.

Acceptance criterion: Given a password or confirmation field contains entered characters, when Show Password is activated, then the characters become visible, and When Hide Password is activated, then they are masked again.

Applies to: UR-100, UR-103, UR-104, UR-105, UR-106, UR-123

Traces to: UR-100, UR-103, UR-104, UR-105, UR-106, UR-123.

#### SRS-NFR-22, LN — Session Persistence.

The system shall not automatically end an authenticated student session solely because of inactivity before the student manually logs out.

Acceptance criterion: Given an authenticated session remains valid and the student has not manually logged out, when the student is inactive for an extended period, then the session is not ended solely because of inactivity.

Traces to: UR-103, UR-108

#### SRS-NFR-23, LN — Private Account Data Protection.

The system shall restrict 100% of access attempts to a student's university email, login activity, blocked-students list, and private Account Settings to that authenticated student.

Acceptance criterion: Given Student A is authenticated, when Student A accesses private account information belonging to Student A, then access is allowed, and private data belonging to another student is not exposed.

Applies to: UR-106, UR-107, UR-122

Traces to: UR-106, UR-107, UR-122.

#### SRS-NFR-24, LN — Unauthorized Account Access Protection.

The system shall deny 100% of attempts by one student account to access another student's private Account Settings, login activity, or blocked-students list.

Acceptance criterion: Given Student A is authenticated, when Student A attempts to directly access Student B's private account settings, login activity, or blocked-students list, then access is denied.

Applies to: UR-106, UR-107, UR-122

Traces to: UR-106, UR-107, UR-122.

#### SRS-NFR-25, LN — Account Security Action Response Time.

The system shall complete a successful password change, account deactivation, or account reactivation within 3 seconds after all required confirmations and credentials have been accepted under normal operating conditions.

Acceptance criterion: Given all required information and confirmations are valid, when a password change, account deactivation, or reactivation is submitted, then the requested action completes within 3 seconds.

Traces to: UR-105, UR-123

<a id="nfr-LP"></a>

### Loens Paul (LP)

#### SRS-NFR-26, LP — Text message length limit.

The system shall limit an individual text message to a maximum of 500 characters.

Traces to: UR-201

#### SRS-NFR-27, LP — Text message display time.

When the student's device has an active internet connection and the Chat service is available, the system shall display a successfully sent text message in the conversation within 5 seconds after the sender submits the message.

Traces to: UR-201

#### SRS-NFR-28, LP — Media upload completion time.

When the student's device has an active internet connection and the Chat service is available, the system shall complete the sending of a supported photo or uploaded GIF of 10 MB or less within 5 seconds after the student initiates the upload.

Traces to: UR-201

#### SRS-NFR-29, LP — Media upload failure timeout.

When an uploaded photo or GIF has not successfully completed sending within 5 seconds after the upload begins, the system shall mark the media upload as failed.

Traces to: UR-201

#### SRS-NFR-30, LP — Failed media re-upload requirement.

After a photo or uploaded GIF is marked as failed because it exceeded the 5-second upload limit, the system shall require the student to initiate a new upload attempt for that media file.

Traces to: UR-201

#### SRS-NFR-31, LP — Unread-status update latency.

When a conversation's unread status changes, the system shall update the affected student's unread-conversation status within 5 seconds of the change.

Traces to: UR-212

#### SRS-NFR-32, LP — Group membership update latency.

After a student successfully accepts a group invitation, leaves a group, or is removed from a group, the system shall reflect the student's updated membership status within 5 seconds.

Traces to: UR-205 and UR-207

#### SRS-NFR-33, LP — Group role update latency.

After a successful administrator assignment, administrator revocation, or ownership transfer, the system shall apply the updated group role and associated permissions within 5 seconds.

Traces to: UR-204 and UR-208

#### SRS-NFR-34, LP — Continuous group ownership.

Every active group chat shall have exactly one current owner.

Traces to: UR-203 and UR-208

#### SRS-NFR-35, LP — Group administrator limit.

Each active group chat shall have no more than one administrator in addition to the current group owner.

Traces to: UR-204

#### SRS-NFR-36, LP — Private conversation uniqueness.

The system shall maintain no more than one private conversation between the same pair of students.

Traces to: UR-200

#### SRS-NFR-37, LP — Conversation loading time.

When the student's device has an active internet connection and the Chat service is available, the system shall display an opened private or group conversation and its available recent messages within 5 seconds after the student selects the conversation.

Traces to: UR-200 and UR-212

<a id="nfr-MS"></a>

### Merieme Sakhsoukhi (MS)

#### SRS-NFR-38, MS — Campus Feed response time.

The system shall display the first page of Campus Feed results within 3 seconds of a student's feed request under normal operating conditions for a feed containing up to 50 posts.

Traces to: UR-301

#### SRS-NFR-39, MS — Friends Feed response time.

The system shall display the first page of Friends Feed results within 3 seconds of a student's feed request under normal operating conditions for a feed containing up to 50 posts.

Traces to: UR-302

#### SRS-NFR-40, MS — Post publication response time.

The system shall make a successfully submitted text post available in its designated feed within 5 seconds after the post submission is accepted by the system.

Traces to: UR-303

#### SRS-NFR-41, MS — Photograph upload size.

The system shall accept an individual photograph attachment of up to 10 MB when a student creates or edits a post.

Traces to: UR-304

#### SRS-NFR-42, MS — Notification delivery.

The system shall create a like or comment notification within 5 seconds after the corresponding interaction is successfully recorded.

Traces to: UR-312, UR-313

#### SRS-NFR-43, MS — Report privacy.

The system shall prevent the identity of a reporting student from being exposed through student-accessible feed content for 100% of successfully submitted content reports.

Traces to: UR-314

<a id="nfr-KB"></a>

### Kabanga Mbangu (KB)

#### SRS-NFR-44, KB — Event Information Response Time.

The system shall display requested campus event information within 5 seconds under normal operating conditions.

Acceptance criterion: Given the SocialU system is operating normally and the requested campus event information is available, when a registered student requests the details of an event from the Campus Events and Trending section, then the system shall display the requested event information within 5 seconds of the request.

Traces to: UR-401

#### SRS-NFR-45, KB — Event Information Consistency.

The system shall display the most recently saved event information when a student views an event.

Acceptance criterion: Given an event creator has made changes to an event and successfully saved those changes in the system, when a registered student opens the same event after the update has been saved, then the system shall display the latest saved version of the event information instead of outdated information.

Traces to: UR-401 and UR-404

#### SRS-NFR-46, KB — Event Information Readability.

Proposed measurable replacement, pending KB agreement. When an event-detail page is displayed at 320 CSS pixels wide or wider, the system shall present the title, description, location, date, and time as separately labeled text with at least 4.5:1 text contrast and without clipping or horizontal scrolling of those fields.

Acceptance criterion: Given event details at widths of 320, 768, and 1280 CSS pixels in each supported theme, when the fields are inspected and contrast is measured, then all five labels and full field values are available through vertical scrolling and every text sample reaches 4.5:1.

Traces to: UR-400 and UR-401.

<a id="nfr-DP"></a>

### Darrin Phimphisane (DP)

SRS-NFR-47 through SRS-NFR-51 concern privacy/integrity. SRS-NFR-52 through SRS-NFR-57 are proposed engineering targets. Proposed profile for SRS-NFR-52 through SRS-NFR-55: 20 active accounts, up to 100 friends/account, 100 placed items/dorm, 100 notes/dorm, 10 Mbps and 100 ms round-trip latency, supported browser, and 100 measured operations after authentication. These are test conditions, not user limits.

#### SRS-NFR-47, DP — Authorized read isolation.

When 100 access requests are made by accounts outside a Snipe request's permitted audience, the system shall disclose zero protected photograph payloads or private request records.

Traces to: UR-511, UR-512.

#### SRS-NFR-48, DP — Removed photograph access.

After a Snipe removal is acknowledged, the system shall return zero successful photograph payloads for 100 subsequent SocialU requests for that removed photograph.

Traces to: UR-514.

#### SRS-NFR-49, DP — Reward retry integrity.

When the same qualifying reward is delivered 100 times, including concurrent deliveries, the system shall produce exactly one credit for that reward category.

Traces to: UR-523.

#### SRS-NFR-50, DP — Purchase integrity.

Across 100 repeated or concurrent submissions of the same purchase action, the system shall produce at most one committed charge.

Traces to: UR-523.

#### SRS-NFR-51, DP — Confirmed save durability.

Across 100 save-acknowledgment and session-reload cycles, the system shall restore the acknowledged dorm state in 100 of 100 cycles.

Traces to: UR-505.

#### SRS-NFR-52, DP — Dorm entry response.

Under the proposed test profile stated in this section, the system shall display an entered dorm within 3 seconds for at least 95 percent of 100 authorized entries.

Traces to: UR-507.

Status: proposed target pending team confirmation.

#### SRS-NFR-53, DP — Save acknowledgment latency.

Under the proposed test profile stated in this section, the system shall acknowledge a valid dorm save within 2 seconds for at least 95 percent of 100 saves.

Traces to: UR-505.

Status: proposed target pending team confirmation.

#### SRS-NFR-54, DP — Points refresh latency.

Under the proposed test profile stated in this section, the system shall refresh a visible balance within 2 seconds of transaction commitment for at least 95 percent of 100 transactions.

Traces to: UR-521.

Status: proposed target pending team confirmation.

#### SRS-NFR-55, DP — Friendship revocation latency.

Under the proposed test profile stated in this section, the system shall return an actively connected former-friend visitor to their DormHall within 2 seconds of friendship revocation for at least 95 percent of 100 revocations.

Traces to: UR-507.

Status: proposed target pending team confirmation.

#### SRS-NFR-56, DP — Keyboard operability.

During keyboard-only evaluation of DormSpace, guestbook, shop, and Snipe review controls, the system shall make 100 percent of available actions operable without a pointing device.

Traces to: UR-504, UR-508, UR-511, UR-522.

Status: proposed target pending team confirmation.

#### SRS-NFR-57, DP — Touch target size.

When the application is displayed at a 390 by 844 CSS-pixel touch viewport, the system shall provide a minimum 44 by 44 CSS-pixel activation area for movement, interaction, consent, and page-turn controls.

Traces to: UR-504, UR-508, UR-511.

Status: proposed target pending team confirmation.

<a id="nfr-SS"></a>

### Sonja Seferasi (SS)

SS quality targets remain proposed pending team review. The newly added return-wait requirement is SRS-NFR-65; identifiers 58-64 are unchanged.

#### SRS-NFR-58, SS — Keyboard access to interface controls.

When a student uses only a keyboard, the system shall make 100% of SS-owned interactive controls reachable and operable without a pointer.

Applies to: Navigation, preferences, Game Room, avatar editing, dialogs, game controls, instructions, and results.

Acceptance criterion: Given each applicable interface state, when a tester uses the keyboard, then every interactive control can be reached and operated with visible focus.

Traces to: UR-600. Applies to SS-owned controls supporting UR-601-UR-604 and UR-607-UR-627; teammates' form internals are outside this contribution.

#### SRS-NFR-59, SS — Readable text in both themes.

When Light or Dark is active, SS-owned interface text shall have a contrast ratio of at least 4.5:1 against its rendered background.

Applies to: Navigation, menus, dialogs, game controls, and results. Decorative artwork is excluded.

Acceptance criterion: Given each SS interface state in both themes, when text contrast is measured, then every applicable text sample reaches at least 4.5:1.

Traces to: UR-627.

#### SRS-NFR-60, SS — Wordle feedback without color dependence.

When Wordle feedback appears, the system shall expose the letter and feedback meaning for 100% of evaluated cells without requiring color perception.

Applies to: Wordle guess feedback.

Acceptance criterion: Given an evaluated row, when viewed without color or read through assistive text output, then all five letters and feedback meanings remain identifiable.

Traces to: UR-624.

#### SRS-NFR-61, SS — Desktop and phone compatibility.

Proposed target, pending team agreement. For the release browser test matrix, the system shall pass 100% of applicable SS functional acceptance scenarios on every listed browser.

Proposed test matrix: Windows Chrome, iPhone Safari, and Android Chrome. Exact browser versions and test devices are recorded in the release test report.

Acceptance criterion: Given the recorded test matrix, when applicable scenarios are executed, then all pass, including photograph selection and camera capture on devices with cameras.

Traces to: UR-609. Also applies to SS navigation, preferences, Game Room, streaks, Game 1, and Wordle when included.

#### SRS-NFR-62, SS — Retain confirmed-saved account state.

After a save is confirmed successful, the system shall retain that account's saved SS state through refresh, normal browser closure, confirmed in-app exit, and sign-out followed by sign-in.

Applies to: Avatar appearance, preferences, completed and unlocked levels, participation status, and accepted Wordle guesses and results.

Acceptance criterion: Given 20 accounts with distinct saved states, when each return path is tested, then zero confirmed saves are lost and zero accounts receive another account's state.

Traces to: UR-610. Also applies to UR-601, UR-612, UR-618, UR-624, UR-626, and UR-627.

#### SRS-NFR-63, SS — Game Room readiness.

Proposed target, pending team agreement: a 3-second loading threshold. Under the performance test profile below, the system shall make Game Room activity-opening controls usable within 3 seconds of navigation selection in at least 19 of 20 trials.

Acceptance criterion: Given the defined profile, when the Game Room is opened 20 times, then at least 19 trials meet the 3-second threshold.

Traces to: UR-607.

#### SRS-NFR-64, SS — Platform-game rendering.

Proposed target, pending team agreement: a 30 fps rendering threshold. Under the performance test profile below, Game 1 shall render at least 30 frames per second in at least 57 of 60 measured one-second intervals.

Acceptance criterion: Given a loaded level, when representative movement and jumping are measured for 60 seconds, then at least 57 intervals meet the rendering threshold.

Traces to: UR-616.

#### SRS-NFR-65, SS — Bound waiting after a game return request.

Proposed target, pending team agreement: 10 seconds. When Back to Game Room is selected during a pending Game 1 completion save or Wordle guess submission, the system shall limit that return-request waiting state to 10 seconds measured from the first such selection.

Applies to: SRS-622.10 and SRS-624.15. Repeated activation of the return control does not restart the wait.

Acceptance criterion: Given the operation produces no outcome, when the student selects Back to Game Room, then the appropriate unconfirmed-outcome recovery view is available no later than 10 seconds after that first selection, including when the return control is activated repeatedly.

Traces to: UR-622 and UR-624.

<a id="proposed-ss-performance-test-profile"></a>

#### Proposed SS performance test profile

For SRS-NFR-63 and SRS-NFR-64: one active test student; Windows 11 laptop with at least four logical CPU cores and 8 GB RAM; Chrome with exact version recorded; 10 Mbps connection and 100 ms round-trip latency; no unrelated foreground workload; at most 50 available outfits, 50 default faces and four level records; cleared application asset cache before each Game Room trial. Rendering is measured after level assets load, excluding paused intervals. This does not establish concurrent capacity or phone rendering performance.

<a id="appendix-a"></a>

## Appendix A. Behavior reference tables

These tables explain the numbered requirements; they do not introduce extra rewards or a second streak.

| Snipe condition | Outcome | Points |
| --- | --- | --- |
| Any sharing answer No | Rejected; no publication | 0 |
| Pending sharing approval withdrawn | Canceled; no publication | 0 |
| Required answer missing at deadline | Expired; no publication | 0 |
| Everyone permits sharing; all questions answered; at least one identity Yes | Approved; publish with verified targets only | Verified target count x agreed rate |
| Everyone permits sharing; all identity answers No | Closed; no publication | 0 |
| Required friendship/membership ends while pending | Canceled; no publication | 0 |
| Authorized removal after publication | Removed; replace photograph with placeholder | Previously awarded points retained |

Pending may become Approved, Rejected, Expired, Canceled or Closed. Approved may become Removed. Rejected, Expired, Canceled, Closed and Removed are terminal for that request. Withdrawal before committed publication cancels; withdrawal afterward removes without clawback. A new request must satisfy current eligibility and cooldowns.

| Participation example | Shared-state result |
| --- | --- |
| First qualifying activity on a date | Add one participation day; eligible for one daily reward. |
| Further qualifying activity on that date | No second streak increment or daily reward. |
| Completed inactive day with active streak and allowance left | Consume one allowance; preserve count without increment. |
| Fourth missed active-streak day in the same week | Reset the streak to zero. |
| Restart later in that week | Start a new streak count at one; do not replenish that week's allowance. |
| Sunday boundary | Evaluate Saturday against the ending week; initialize three allowances for the new week. |

<a id="appendix-b"></a>

## Appendix B. Interfaces and open parameters

TBD means a team decision is still required. These are explicit dependencies, not permission to choose arbitrary values during implementation. Work on independent behavior can proceed while affected reward, catalog and quality claims remain provisional.

| Owner interface | Information supplied |
| --- | --- |
| LN -> other features | Authenticated account, profile identity, accepted friendship times, account and blocking changes. |
| LP -> DP / SS | Conversation participants and roles; private Snipe rendering; unread message count. |
| SS -> DP | Shared participation date, time zone, streak instance and count; confirmed Game 1 completion identity, attempt, level and time. |
| DP -> SS | Available outfit entitlement and successful DormSpace-opening participation events; reward/purchase outcome and shared balance. |
| MS / KB -> SS | Text/photo/event creation destinations. Form validation and publishing remain with the feature owners. |
| Catalog -> DormSpace | Stable item identity, price, preview, footprint, surface, overlap compatibility and orientation. |

| Decision | Owner | Required decision | Traces |
| --- | --- | --- | --- |
| B-01 | DP | Snipe points per positively identified target; no extra daily photographer cap. | SRS-525.2; SRS-525.6; UR-528 |
| B-02 | DP + SS | Daily participation amount and separate 7/14/30-day milestone amounts. | SRS-526.5; SRS-526.17; SRS-528.5 |
| B-03 | DP + SS | Normal Game 1 rewards, coin conversion, completion proof, and reduced replay reward rules; Wordle reward rules only if included. | SRS-520.3 to SRS-520.5; SRS-528.6 |
| B-04 | DP | Catalog entries, point prices, eligibility, and initial/purchasable wall and floor appearances. | UR-500; UR-522; UR-529 |
| B-05 | DP | Room dimensions, protected cells, item footprints, allowed surfaces, overlap compatibility and fixed orientations. | SRS-500.2; SRS-500.8 to SRS-500.10; SRS-529.7 |
| B-06 | DP + LP | Snipe-specific image formats, byte limit and pixel limits. SS avatar and feed limits do not automatically define the Snipe policy. | SRS-510.2; SRS-510.3 |
| B-07 | DP | DormSpace movement speed, interaction range, touch-editing behavior and exact release devices/browser versions. | UR-504; SRS-NFR-52 to SRS-NFR-57 |
| B-08 | SS + DP | Maximum trusted participation-event delivery delay and correction of earlier days after late delivery. | SRS-613.12; SRS-613.13; SRS-526.3 |
| B-09 | All feature owners | Define concurrency, device/browser versions, network, data sizes, samples and pass thresholds for timing claims using normal operating conditions; distinguish server email dispatch from inbox delivery. | SRS-NFR-1 to SRS-NFR-13; SRS-NFR-25; SRS-NFR-27; SRS-NFR-28; SRS-NFR-38 to SRS-NFR-40; SRS-NFR-42; SRS-NFR-44 |
| B-10 | KB + DP + SS | Approve proposed event-readability thresholds, DP quality profiles, SS compatibility/performance profiles and the 10-second return-wait limit. | SRS-NFR-46; SRS-NFR-52 to SRS-NFR-65 |
| B-11 | SS | Confirm existing proposed defaults: initial Light theme, non-phone on-screen controls initially hidden, and reminder dismissal through the participation day. | SRS-616.5; SRS-614.5; SRS-627.2 |
| B-12 | MS + LN | Define creation/removal of feed post tags used by Profile Tagged content; no new tag-editing interaction is silently added. | UR-112; UR-113 |
| B-13 | MS | Define valid reports, whether repeated reporters count, and the like-notification grouping window. | UR-312; UR-314; SRS-NFR-43 |
| B-14 | LN | Supply the launch university name and approved email domains. | SRS-100.5; SRS-101.3 |
| B-15 | LP + MS | Supply the approved Chat reaction emoji set and accepted feed photograph formats. | SRS-210.2; SRS-304.1; SRS-NFR-41 |
| B-16 | DP + SS | Supply release faces/outfits, starter dorm items and authored level assets; approve the dictionary and daily puzzle schedule if Wordle is included. | SRS-503.1; UR-608 to UR-610; SRS-618.1; SRS-624.1; SRS-624.6 |

Out of scope: achievement trophies, alternate dorm layouts, furniture rotation, live multiplayer dorm synchronization, Snipe feed/profile publication, Snipe friend-group leaderboards or voting, real-money points, refunds, duplicate ownership of the same catalog item, university transfers and post/event drafts.

<a id="appendix-c"></a>

## Appendix C. Source alignment and revision record

The original uploaded PDFs remain unchanged. This revision updates the editable team SRS and aligns the repository URD with confirmed decisions. Historical stakeholder interview notes remain elicitation evidence rather than the active baseline.

| Revision | Effect |
| --- | --- |
| Existing functional IDs | Preserved all 874 original integrated functional records, including retired/deferred identifiers. |
| SS additions | Added SRS-616.7, SRS-616.8, SRS-622.11 and SRS-624.16 through SRS-624.19 under their existing parents. |
| NFR additions | Appended SRS-NFR-65 for the proposed 10-second return-wait bound; preserved all earlier NFR IDs. |
| URD alignment | Applied shared-streak/reward, messaging consent, Snipe visibility/consent, DormHall, invitations, optional Wordle and deferred-draft decisions. Added UR-405; preserved UR-627. |
| Presentation | One parent story per group; consistent requirement and acceptance-criterion labels; new TOC, page references and clean PDF text. |
| Open findings | Kept reward/catalog values and unresolved test conditions explicit; proposed a measurable replacement for vague event readability. |

<a id="appendix-d"></a>

## Appendix D. SS constraints and dependencies

Accounts supplies identity; Chat supplies unread totals; the catalog supplies available outfits; DormSpace supplies opening participation events. SS supplies one authoritative participation record to DP. SS implements navigation entry points, not the post or event forms. Audience selection is delegated through UR-605; drafts under UR-606 are deferred.

The team supplies illustrated bodies, complete outfits, default faces, three playable platform levels and Wordle word lists if selected. Wordle and a fourth level are optional; automatic background removal is conditional. The selected avatar uses a real or default face on an illustrated body.

Unconfirmed operation outcomes do not prove failure. Retry and exit behavior preserve confirmed-saved state. The return-wait target is proposed in SRS-NFR-65; repeated return requests do not restart that wait. No unagreed points conversion is defined by SS.

<a id="appendix-e"></a>

## Appendix E. User requirement coverage index

<a id="linh-nguyen-ln"></a>

### Linh Nguyen (LN)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-100 | SRS-100.1 through SRS-100.10; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21 | [See section](#ur-100) |
| UR-101 | SRS-101.1 through SRS-101.12; SRS-NFR-4, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-101) |
| UR-102 | SRS-102.1 through SRS-102.7; SRS-NFR-4, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-102) |
| UR-103 | SRS-103.1 through SRS-103.13; SRS-NFR-1, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21, SRS-NFR-22 | [See section](#ur-103) |
| UR-104 | SRS-104.1 through SRS-104.13; SRS-NFR-5, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21 | [See section](#ur-104) |
| UR-105 | SRS-105.1 through SRS-105.16; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21, SRS-NFR-25 | [See section](#ur-105) |
| UR-106 | SRS-106.1 through SRS-106.13; SRS-NFR-4, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21, SRS-NFR-23, SRS-NFR-24 | [See section](#ur-106) |
| UR-107 | SRS-107.1 through SRS-107.9; SRS-NFR-7, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-23, SRS-NFR-24 | [See section](#ur-107) |
| UR-108 | SRS-108.1 through SRS-108.7; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-22 | [See section](#ur-108) |
| UR-109 | SRS-109.1 through SRS-109.9; SRS-NFR-6, SRS-NFR-8, SRS-NFR-9, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-109) |
| UR-110 | SRS-110.1 through SRS-110.10; SRS-NFR-2, SRS-NFR-8, SRS-NFR-9, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-110) |
| UR-111 | SRS-111.1 through SRS-111.8; SRS-NFR-6, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-111) |
| UR-112 | SRS-112.1 through SRS-112.7; SRS-NFR-6, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-112) |
| UR-113 | SRS-113.1 through SRS-113.18; SRS-NFR-6, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-113) |
| UR-114 | SRS-114.1 through SRS-114.8; SRS-NFR-8, SRS-NFR-10, SRS-NFR-11, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-114) |
| UR-115 | SRS-115.1 through SRS-115.11; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-115) |
| UR-116 | SRS-116.1 through SRS-116.8; SRS-NFR-8, SRS-NFR-12, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-116) |
| UR-117 | SRS-117.1 through SRS-117.8; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-117) |
| UR-118 | SRS-118.1 through SRS-118.11; SRS-NFR-3, SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-118) |
| UR-119 | SRS-119.1 through SRS-119.13; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-119) |
| UR-120 | SRS-120.1 through SRS-120.9; SRS-NFR-8, SRS-NFR-12, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-120) |
| UR-121 | SRS-121.1 through SRS-121.13; SRS-NFR-8, SRS-NFR-13, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19 | [See section](#ur-121) |
| UR-122 | SRS-122.1 through SRS-122.12; SRS-NFR-8, SRS-NFR-13, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-23, SRS-NFR-24 | [See section](#ur-122) |
| UR-123 | SRS-123.1 through SRS-123.14; SRS-NFR-8, SRS-NFR-14, SRS-NFR-15, SRS-NFR-16, SRS-NFR-17, SRS-NFR-18, SRS-NFR-19, SRS-NFR-20, SRS-NFR-21, SRS-NFR-25 | [See section](#ur-123) |

<a id="loens-paul-lp"></a>

### Loens Paul (LP)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-200 | SRS-200.1 through SRS-200.19; SRS-NFR-36, SRS-NFR-37 | [See section](#ur-200) |
| UR-201 | SRS-201.1 through SRS-201.18; SRS-NFR-26, SRS-NFR-27, SRS-NFR-28, SRS-NFR-29, SRS-NFR-30 | [See section](#ur-201) |
| UR-202 | SRS-202.1 through SRS-202.4 | [See section](#ur-202) |
| UR-203 | SRS-203.1 through SRS-203.4; SRS-NFR-34 | [See section](#ur-203) |
| UR-204 | SRS-204.1 through SRS-204.9; SRS-NFR-33, SRS-NFR-35 | [See section](#ur-204) |
| UR-205 | SRS-205.1 through SRS-205.13; SRS-NFR-32 | [See section](#ur-205) |
| UR-206 | SRS-206.1 through SRS-206.9 | [See section](#ur-206) |
| UR-207 | SRS-207.1 through SRS-207.7; SRS-NFR-32 | [See section](#ur-207) |
| UR-208 | SRS-208.1 through SRS-208.9; SRS-NFR-33, SRS-NFR-34 | [See section](#ur-208) |
| UR-209 | SRS-209.1 through SRS-209.6 | [See section](#ur-209) |
| UR-210 | SRS-210.1 through SRS-210.6 | [See section](#ur-210) |
| UR-211 | SRS-211.1 through SRS-211.9 | [See section](#ur-211) |
| UR-212 | SRS-212.1 through SRS-212.8; SRS-NFR-31, SRS-NFR-37 | [See section](#ur-212) |
| UR-213 | SRS-213.1 through SRS-213.9 | [See section](#ur-213) |

<a id="merieme-sakhsoukhi-ms"></a>

### Merieme Sakhsoukhi (MS)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-301 | SRS-301.1 through SRS-301.3; SRS-NFR-38 | [See section](#ur-301) |
| UR-302 | SRS-302.1 through SRS-302.3; SRS-NFR-39 | [See section](#ur-302) |
| UR-303 | SRS-303.1 through SRS-303.3; SRS-NFR-40 | [See section](#ur-303) |
| UR-304 | SRS-304.1 through SRS-304.4; SRS-NFR-41 | [See section](#ur-304) |
| UR-305 | SRS-305.1 through SRS-305.3 | [See section](#ur-305) |
| UR-306 | SRS-306.1 through SRS-306.5 | [See section](#ur-306) |
| UR-307 | SRS-307.1 through SRS-307.5 | [See section](#ur-307) |
| UR-308 | SRS-308.1 through SRS-308.3 | [See section](#ur-308) |
| UR-309 | SRS-309.1 through SRS-309.2 | [See section](#ur-309) |
| UR-310 | SRS-310.1 through SRS-310.3 | [See section](#ur-310) |
| UR-311 | SRS-311.1 through SRS-311.5 | [See section](#ur-311) |
| UR-312 | SRS-312.1 through SRS-312.4; SRS-NFR-42 | [See section](#ur-312) |
| UR-313 | SRS-313.1 through SRS-313.3; SRS-NFR-42 | [See section](#ur-313) |
| UR-314 | SRS-314.1 through SRS-314.5; SRS-NFR-43 | [See section](#ur-314) |
| UR-315 | SRS-315.1 through SRS-315.7 | [See section](#ur-315) |

<a id="kabanga-mbangu-kb"></a>

### Kabanga Mbangu (KB)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-400 | SRS-400.1 through SRS-400.6; SRS-NFR-46 | [See section](#ur-400) |
| UR-401 | SRS-401.1 through SRS-401.6; SRS-NFR-44, SRS-NFR-45, SRS-NFR-46 | [See section](#ur-401) |
| UR-402 | SRS-402.1 through SRS-402.5 | [See section](#ur-402) |
| UR-403 | SRS-403.1 through SRS-403.5 | [See section](#ur-403) |
| UR-404 | SRS-404.1 through SRS-404.12; SRS-NFR-45 | [See section](#ur-404) |
| UR-405 | SRS-405.1 through SRS-405.8 | [See section](#ur-405) |

<a id="darrin-phimphisane-dp"></a>

### Darrin Phimphisane (DP)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-500 | SRS-500.1 through SRS-500.15 | [See section](#ur-500) |
| UR-503 | SRS-503.1 through SRS-503.5 | [See section](#ur-503) |
| UR-504 | SRS-504.1 through SRS-504.9; SRS-NFR-56, SRS-NFR-57 | [See section](#ur-504) |
| UR-505 | SRS-505.1 through SRS-505.9; SRS-NFR-51, SRS-NFR-53 | [See section](#ur-505) |
| UR-506 | Retired. Achievement displays and trophies are outside this release. This identifier will not be reused. | [See section](#ur-506) |
| UR-507 | SRS-507.1 through SRS-507.19; SRS-NFR-52, SRS-NFR-55 | [See section](#ur-507) |
| UR-508 | SRS-508.1 through SRS-508.21; SRS-NFR-56, SRS-NFR-57 | [See section](#ur-508) |
| UR-509 | SRS-509.1 through SRS-509.9 | [See section](#ur-509) |
| UR-510 | SRS-510.1 through SRS-510.12 | [See section](#ur-510) |
| UR-511 | SRS-511.1 through SRS-511.13; SRS-NFR-47, SRS-NFR-56, SRS-NFR-57 | [See section](#ur-511) |
| UR-512 | SRS-512.1 through SRS-512.12; SRS-NFR-47 | [See section](#ur-512) |
| UR-513 | SRS-513.1 through SRS-513.9 | [See section](#ur-513) |
| UR-514 | SRS-514.1 through SRS-514.15; SRS-NFR-48 | [See section](#ur-514) |
| UR-520 | SRS-520.1 through SRS-520.8 | [See section](#ur-520) |
| UR-521 | SRS-521.1 through SRS-521.5; SRS-NFR-54 | [See section](#ur-521) |
| UR-522 | SRS-522.1 through SRS-522.10; SRS-NFR-56 | [See section](#ur-522) |
| UR-523 | SRS-523.1 through SRS-523.11; SRS-NFR-49, SRS-NFR-50 | [See section](#ur-523) |
| UR-524 | SRS-524.1 through SRS-524.5 | [See section](#ur-524) |
| UR-525 | SRS-525.1 through SRS-525.6 | [See section](#ur-525) |
| UR-526 | SRS-526.1 through SRS-526.23 | [See section](#ur-526) |
| UR-527 | SRS-527.1 through SRS-527.8 | [See section](#ur-527) |
| UR-528 | SRS-528.1 through SRS-528.6 | [See section](#ur-528) |
| UR-529 | SRS-529.1 through SRS-529.7 | [See section](#ur-529) |

<a id="sonja-seferasi-ss"></a>

### Sonja Seferasi (SS)

| Parent UR | SRS coverage / disposition | Section |
| --- | --- | --- |
| UR-600 | SRS-600.1 through SRS-600.3; SRS-NFR-58 | [See section](#ur-600) |
| UR-601 | SRS-601.1 through SRS-601.7; SRS-NFR-58, SRS-NFR-62 | [See section](#ur-601) |
| UR-602 | SRS-602.1 through SRS-602.2; SRS-NFR-58 | [See section](#ur-602) |
| UR-603 | SRS-603.1 through SRS-603.2; SRS-NFR-58 | [See section](#ur-603) |
| UR-604 | SRS-604.1 through SRS-604.3; SRS-NFR-58 | [See section](#ur-604) |
| UR-605 | Delegated. MS requirements SRS-315.1 through SRS-315.3 implement this audience-selection goal. SS owns only the creation entry points. | [See section](#ur-605) |
| UR-606 | Deferred. Saving post or event drafts is reserved for a future release; this identifier is preserved. | [See section](#ur-606) |
| UR-607 | SRS-607.1 through SRS-607.4; SRS-NFR-58, SRS-NFR-63 | [See section](#ur-607) |
| UR-608 | SRS-608.1 through SRS-608.6; SRS-NFR-58 | [See section](#ur-608) |
| UR-609 | SRS-609.1 through SRS-609.16; SRS-NFR-58, SRS-NFR-61 | [See section](#ur-609) |
| UR-610 | SRS-610.1 through SRS-610.2; SRS-NFR-58, SRS-NFR-62 | [See section](#ur-610) |
| UR-611 | SRS-611.1; SRS-NFR-58 | [See section](#ur-611) |
| UR-612 | SRS-612.1 through SRS-612.4; SRS-NFR-58, SRS-NFR-62 | [See section](#ur-612) |
| UR-613 | SRS-613.1 through SRS-613.13; SRS-NFR-58 | [See section](#ur-613) |
| UR-614 | SRS-614.1 through SRS-614.5; SRS-NFR-58 | [See section](#ur-614) |
| UR-615 | SRS-615.1 through SRS-615.2; SRS-NFR-58 | [See section](#ur-615) |
| UR-616 | SRS-616.1 through SRS-616.8; SRS-NFR-58, SRS-NFR-64 | [See section](#ur-616) |
| UR-617 | SRS-617.1 through SRS-617.5; SRS-NFR-58 | [See section](#ur-617) |
| UR-618 | SRS-618.1 through SRS-618.6; SRS-NFR-58, SRS-NFR-62 | [See section](#ur-618) |
| UR-619 | SRS-619.1 through SRS-619.11; SRS-NFR-58 | [See section](#ur-619) |
| UR-620 | SRS-620.1 through SRS-620.4; SRS-NFR-58 | [See section](#ur-620) |
| UR-621 | SRS-621.1 through SRS-621.5; SRS-NFR-58 | [See section](#ur-621) |
| UR-622 | SRS-622.1 through SRS-622.11; SRS-NFR-58, SRS-NFR-65 | [See section](#ur-622) |
| UR-623 | SRS-623.1 through SRS-623.2 (conditional); SRS-NFR-58 | [See section](#ur-623) |
| UR-624 | SRS-624.1 through SRS-624.19 (conditional); SRS-NFR-58, SRS-NFR-60, SRS-NFR-62, SRS-NFR-65 | [See section](#ur-624) |
| UR-625 | SRS-625.1 through SRS-625.3 (conditional); SRS-NFR-58 | [See section](#ur-625) |
| UR-626 | SRS-626.1 through SRS-626.2 (conditional); SRS-NFR-58, SRS-NFR-62 | [See section](#ur-626) |
| UR-627 | SRS-627.1 through SRS-627.9; SRS-NFR-58, SRS-NFR-59, SRS-NFR-62 | [See section](#ur-627) |

<a id="appendix-f"></a>

## Appendix F. NFR old-to-new reference table

Legacy identifiers were reused by different authors. The pair of author initials and old number identifies the source. Current team-wide identifiers are unique. No existing team-wide number changes in this revision.

| Author | Legacy ID | Team-wide ID |
| --- | --- | --- |
| LN | SRS-NFR-1 | SRS-NFR-1 |
| LN | SRS-NFR-2 | SRS-NFR-2 |
| LN | SRS-NFR-3 | SRS-NFR-3 |
| LN | SRS-NFR-4 | SRS-NFR-4 |
| LN | SRS-NFR-5 | SRS-NFR-5 |
| LN | SRS-NFR-6 | SRS-NFR-6 |
| LN | SRS-NFR-7 | SRS-NFR-7 |
| LN | SRS-NFR-8 | SRS-NFR-8 |
| LN | SRS-NFR-9 | SRS-NFR-9 |
| LN | SRS-NFR-10 | SRS-NFR-10 |
| LN | SRS-NFR-11 | SRS-NFR-11 |
| LN | SRS-NFR-12 | SRS-NFR-12 |
| LN | SRS-NFR-13 | SRS-NFR-13 |
| LN | SRS-NFR-14 | SRS-NFR-14 |
| LN | SRS-NFR-15 | SRS-NFR-15 |
| LN | SRS-NFR-16 | SRS-NFR-16 |
| LN | SRS-NFR-17 | SRS-NFR-17 |
| LN | SRS-NFR-18 | SRS-NFR-18 |
| LN | SRS-NFR-19 | SRS-NFR-19 |
| LN | SRS-NFR-20 | SRS-NFR-20 |
| LN | SRS-NFR-21 | SRS-NFR-21 |
| LN | SRS-NFR-22 | SRS-NFR-22 |
| LN | SRS-NFR-23 | SRS-NFR-23 |
| LN | SRS-NFR-24 | SRS-NFR-24 |
| LN | SRS-NFR-25 | SRS-NFR-25 |
| LP | SRS-NFR-1 | SRS-NFR-26 |
| LP | SRS-NFR-2 | SRS-NFR-27 |
| LP | SRS-NFR-3 | SRS-NFR-28 |
| LP | SRS-NFR-4 | SRS-NFR-29 |
| LP | SRS-NFR-5 | SRS-NFR-30 |
| LP | SRS-NFR-6 | SRS-NFR-31 |
| LP | SRS-NFR-7 | SRS-NFR-32 |
| LP | SRS-NFR-8 | SRS-NFR-33 |
| LP | SRS-NFR-9 | SRS-NFR-34 |
| LP | SRS-NFR-10 | SRS-NFR-35 |
| LP | SRS-NFR-11 | SRS-NFR-36 |
| LP | SRS-NFR-12 | SRS-NFR-37 |
| MS | SRS-NFR-1 | SRS-NFR-38 |
| MS | SRS-NFR-2 | SRS-NFR-39 |
| MS | SRS-NFR-3 | SRS-NFR-40 |
| MS | SRS-NFR-4 | SRS-NFR-41 |
| MS | SRS-NFR-5 | SRS-NFR-42 |
| MS | SRS-NFR-6 | SRS-NFR-43 |
| KB | SRS-NFR-400.1 | SRS-NFR-44 |
| KB | SRS-NFR-400.2 | SRS-NFR-45 |
| KB | SRS-NFR-400.3 | SRS-NFR-46 |
| DP | SRS-NFR-1 | SRS-NFR-47 |
| DP | SRS-NFR-2 | SRS-NFR-48 |
| DP | SRS-NFR-3 | SRS-NFR-49 |
| DP | SRS-NFR-4 | SRS-NFR-50 |
| DP | SRS-NFR-5 | SRS-NFR-51 |
| DP | SRS-NFR-6 | SRS-NFR-52 |
| DP | SRS-NFR-7 | SRS-NFR-53 |
| DP | SRS-NFR-8 | SRS-NFR-54 |
| DP | SRS-NFR-9 | SRS-NFR-55 |
| DP | SRS-NFR-10 | SRS-NFR-56 |
| DP | SRS-NFR-11 | SRS-NFR-57 |
| SS | SRS-NFR-1 | SRS-NFR-58 |
| SS | SRS-NFR-2 | SRS-NFR-59 |
| SS | SRS-NFR-3 | SRS-NFR-60 |
| SS | SRS-NFR-4 | SRS-NFR-61 |
| SS | SRS-NFR-5 | SRS-NFR-62 |
| SS | SRS-NFR-6 | SRS-NFR-63 |
| SS | SRS-NFR-7 | SRS-NFR-64 |
| SS | SRS-NFR-8 | SRS-NFR-65 |

<a id="appendix-g"></a>

## Appendix G. URD amendment register

The aligned user_requirements.md contains these amendments. This register records the changes without repeating the complete UR stories; the current story appears above its SRS children.

| UR / scope | Alignment |
| --- | --- |
| Release scope | One university, three required Game 1 levels, DormSpace; conditional Wordle/fourth level/background removal; deferred transfers and drafts. |
| UR-100 | Account registration story explicitly includes username and password used by its existing children. |
| UR-111 to UR-113 | Profile categories and counts exclude Snipes. |
| UR-119; UR-200 | Accepted non-friend request and profile-to-message handoff. |
| UR-402; UR-405 | Any same-university invitee; Trending likes during the last seven days. |
| UR-506 | Retired identifier; no achievement display. |
| UR-507 to UR-514 | Integrated DormHall and independent Snipe identity/sharing consent with lifecycle boundaries. |
| UR-526; UR-613 | One shared participation streak and daily/milestone reward policy. |
| UR-605; UR-606 | Audience-selection delegation and explicit draft deferral. |
| UR-623 to UR-626 | Conditional daily Wordle with today's puzzle/result only. |
| UR-627 | Preserved existing display-preference requirement. |
| Constraints and historical notes | Aligned stale reward, Snipe, remote logout and reporting assumptions with the SRS; preserved historical interview evidence. |
