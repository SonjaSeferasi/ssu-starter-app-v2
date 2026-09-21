**# SocialU**

**\*\*User Requirements\*\***

**\*\*CSC 351 — Semester Project\*\***

**\*\*Team Members\*\***

Sonja • Darrin • Loens • Linh • Merieme • Kabanga

**## I. Introduction**

**### 1.1 Purpose**

This User Requirements Document describes SocialU from the perspective of the university students who will use it. It identifies what students need to accomplish through the platform and why those capabilities matter, providing a shared basis for the team to define, develop, and evaluate the application.

The requirements cover student accounts and friendships, campus posts, private and group communication, events, photograph approvals, games, and participation rewards. They focus on user goals and expected behavior; implementation details, including database structures and API design, are addressed in later documentation.

**### 1.2 Scope**

SocialU is a browser-based social platform that helps university students connect with classmates and participate in campus life. It brings communication, campus activities, and social interaction into one website, addressing the difficulty of keeping up with information spread across separate applications.

The initial release includes the following functional areas:

\- Accounts, profiles, and friendships — Students can register using university email verification, access and recover their accounts, manage their profiles, and establish or remove friend connections.

\- Campus feed and social interaction — Students can publish text and photo posts, interact through likes and comments, manage their own posts, and report inappropriate content.

\- Private messaging and group conversations — Students can communicate privately with friends and participate in group chats. Conversations are accessible only to their participants.

\- Campus events and invitations — Students can create and discover events, invite friends, respond to invitations, and view current event information. Event creators can manage attendance information, update their events, and cancel them.

\- Snipe and participation points — Students can submit photographs and request approval from tagged students before publication. Snipe photographs remain unpublished until all tagged students approve. A shared points system records rewards from qualifying Snipe activities and gameplay.

\- Games — Students can play two complete games, including a Mario-style platform game, with instructions, controls, score tracking, and connections to the shared points system.

Across these areas, SocialU provides a consistent interface and light- and dark-mode preferences.

The semester release serves students at one university and includes the core social features and two games with limited mechanics and content. Expansion to additional universities and the addition of further games are reserved for later development. Exam tips, professor ratings, video calling, and voice calling are outside the initial scope.

The following sections present these requirements grouped by functional area, each authored by the team member responsible for that area.

**### 1.3 Intended Audience**

This document is intended for the SocialU development team, the course instructor, and reviewers evaluating whether the application meets its users' needs. It is written for anyone who needs to understand what the platform must do for students without needing to read schema or API design.

**### 1.4 User Classes**

\| User class | Description |

\| --- | --- |

\| Student | A registered university student who uses SocialU to connect with classmates, share posts, message friends, attend or organize events, participate in Snipe, and play games. This includes first-time and returning users. Within specific workflows, a student may act in a more specific role — for example, an event creator versus an invited attendee, or a student tagged in a Snipe photograph who must approve it before publication — but all such roles are held by the same underlying Student user class. |

**### 1.5 Operating Environment**

SocialU will operate as a responsive, browser-based web application accessible from smartphones, tablets, laptops, and desktop computers. Users will access SocialU through modern web browsers such as Google Chrome, Safari, Microsoft Edge, and Firefox; no software installation or native mobile application is required.

The user interface will automatically adapt to different screen sizes. On smartphones and tablets, students will interact with the application primarily through touchscreen controls. On laptops and desktop computers, students will use a keyboard and mouse or trackpad. An active internet connection is required to access SocialU and its online features.

**### 1.6 What is “ Snipe”?**

“Snipe” is a group chat and direct message game built directly into SocialU’s chat system. Players can take a picture of a friend when the other person does not suspect they are being photographed, then submit that picture as a Snipe inside the conversation. The person being tagged must be friends with the player, and they receive a request to approve or reject the Snipe before it can be posted.

Approved Snipes can award points that contribute to SocialU’s larger points system and can be used toward rewards in other parts of the platform, such as unlocking items in DormSpace. To prevent spam or abuse, Snipe includes submission cooldowns, request expiration, point limits, the ability to undo an approval, and report and removal controls.

**## II. Requirements**

**### Author: Linh Nguyen (LN)**

**#### 1. Accounts & Authentication**

The Accounts & Authentication feature allows SocialU students to create and securely access their accounts using verified university email addresses. Students can verify their email, log in, recover or change their password, update account information, review recent login activity, and safely log out. These features help ensure that SocialU accounts belong to valid university students and provide students with basic controls for managing account security.

**\*\*UR-100, LN — Create an Account with School Email Verification\*\***

As a student, I want to sign up using my full name and university email, so that my identity is connected to a valid school account before I access SocialU.

**\*\*UR-101, LN — Verify My University Email\*\***

As a student, I want to enter a one-time verification code sent to my university email, so that SocialU can confirm that the email address belongs to me.

**\*\*UR-102, LN — Resend a Verification Code\*\***

As a student, I want to request a new verification code if the original code does not arrive, so that a delayed or lost email does not prevent me from completing registration.

**\*\*UR-103, LN — Log In to My Account\*\***

As a student, I want to log in using my university email and password, so that I can securely access my SocialU account when I return to the platform.

**\*\*UR-104, LN — Reset a Forgotten Password\*\***

As a student, I want to request a password reset from the login page, so that I can regain access to my account if I forget my password.

**\*\*UR-105, LN — Change My Password\*\***

As a student, I want to change my password from account settings, so that I can maintain the security of my account.

**\*\*UR-106, LN — Update My University Email\*\***

As a student, I want to update the university email associated with my account, so that my account information remains accurate if my school email changes.

**\*\*UR-107, LN — Review Recent Login Activity\*\***

As a student, I want to view recent login activity for my account, so that I can identify possible unauthorized access.

**\*\*UR-108, LN — Confirm Before Logging Out\*\***

As a student, I want SocialU to ask for confirmation before logging me out, so that I do not accidentally end my session.

**#### 2. Profile**

The Profile feature allows SocialU students to create and manage a personal profile that represents them within the university community. Students can add information such as a profile photo, major, class year, and short bio. They can edit their information, view their activity summary, organize their profile content by category, and view other students' profiles to learn more about them before connecting.

**\*\*UR-109, LN — Add Profile Information\*\***

As a student, I want to add a profile photo, major, class year, and short bio, so that other students can learn more about me.

**\*\*UR-110, LN — Edit My Profile\*\***

As a student, I want to edit my profile information, so that my profile remains accurate as my information changes.

**\*\*UR-111, LN — View My Activity Summary\*\***

As a student, I want to see my post count and friend count on my profile, so that I can quickly view my activity and network size.

**\*\*UR-112, LN — Filter My Profile Content\*\***

As a student, I want to view my profile content by category, such as posts and tagged content, so that I can quickly find a specific type of content.

**\*\*UR-113, LN — View Another Student's Profile\*\***

As a student, I want to view another student's school, major, class year, bio, and profile content, so that I can learn more about them before connecting.

**#### 3. Friendships**

The Friendships feature allows SocialU students to build and manage their network of connections on the platform. Students can send, receive, accept, and decline friend requests, search their friends list, start conversations with friends, and remove connections when needed. Students can also block or unblock other users to control unwanted interactions and deactivate their accounts if they no longer wish to actively use SocialU.

**\*\*UR-114, LN — Send a Friend Request\*\***

As a student, I want to send a friend request from another student's profile, so that I can connect with classmates and other students I know.

**\*\*UR-115, LN — View Pending Friend Requests\*\***

As a student, I want to view my pending friend requests, so that I can see which students are waiting for my response.

**\*\*UR-116, LN — Accept a Friend Request\*\***

As a student, I want to accept a friend request, so that the requester can become part of my SocialU network.

**\*\*UR-117, LN — Decline a Friend Request\*\***

As a student, I want to decline a friend request, so that I can control who becomes part of my SocialU network.

**\*\*UR-118, LN — Search My Friends List\*\***

As a student, I want to search my friends list by name, so that I can quickly find a specific friend.

**\*\*UR-119, LN — Message a Friend\*\***

As a student, I want to start a message from a friend's profile or my friends list, so that I can communicate with them without searching for them again in Chat.

**\*\*UR-120, LN — Remove a Friend\*\***

As a student, I want to remove someone from my friends list, so that I can manage my connections as relationships change.

**\*\*UR-121, LN — Block Another Student\*\***

As a student, I want to block another student, so that I can prevent unwanted contact and interaction from that person.

**\*\*UR-122, LN — Manage Blocked Students\*\***

As a student, I want to view my blocked-students list and unblock a student when needed, so that I can manage previous blocking decisions.

**\*\*UR-123, LN — Deactivate My Account\*\***

As a student, I want to deactivate my SocialU account, so that I can stop using the platform without permanently losing my data if I decide to return later.

**### Author: Loens Paul (LP)**

The Chat feature allows SocialU students to communicate through private messages and group conversations. Students can exchange messages, keep track of conversation activity, and communicate with specific people or groups. Group chats also include ownership and administrator roles for managing membership and group responsibilities.

**#### Private Messaging**

**\*\*UR-200, LP - Start a private conversation.\*\***

As a student, I want to start a private conversation with a friend, so that I can communicate directly with them.

**\*\*UR-201, LP - Communicate through messages.\*\***

As a student, I want to send text messages, photos, emojis, and GIFs in conversations, so that I have multiple ways to communicate.

**#### Group Chats and Membership**

**\*\*UR-202, LP - Create my own group.\*\***

As a student, I want to be able to create a group chat, so that I can form groups for friends.

**\*\*UR-203, LP - Establish group ownership.\*\***

As a student who creates a group chat, I want to become the group owner and default administrator, so that I have responsibility for managing the group from the beginning.

**\*\*UR-204, LP - Assign another administrator.\*\***

As a group owner, I want to be able to give another trusted group member administrator privileges, so that another person can help manage the group when needed.

**\*\*UR-205, LP - Manage group membership.\*\***

As a group administrator, I want to add and remove members from the group, so that I can keep the group's membership appropriate and organized.

**\*\*UR-206, LP - Control group administration.\*\***

As a group member, I want group-management actions to be limited to authorized administrators or the owner, so that regular members cannot remove people or make major changes without permission.

**\*\*UR-207, LP - Leave a group chat.\*\***

As a student, I want to leave a group chat whenever I choose, so that I do not have to remain in a conversation that is no longer relevant to me.



**\*\*UR-208, LP - Transfer ownership before leaving.\*\***

As a group owner, I want to transfer ownership to another group member before leaving the group, so that the group is not left without an owner responsible for managing it.

**#### Conversation Experience**

**\*\*UR-209, LP - Reply to a specific message.\*\***

As a student, I want to reply directly to a specific message in a group conversation, so that other participants can clearly understand which message I am responding to.

**\*\*UR-210, LP - React to messages.\*\***

As a student, I want to react to messages in group conversations, so that I can quickly respond to conversations without always sending another message.

**\*\*UR-211, LP - Understand message details.\*\***

As a student, I want to see the sender's name, profile picture, message time, and message status, so that I can understand who sent a message, when it was sent, and whether my own messages have been sent or read.

**\*\*UR-212, LP - Identify unread conversations.\*\***

As a student, I want to know which conversations contain unread messages, so that I can easily find conversations that I have not yet reviewed.

**\*\*UR-213, LP - Keep conversations private.\*\***

As a student, I want private and group conversations to be accessible only to their participants, so that people outside the conversation cannot view our messages.

**#### Chat Constraints and Assumptions**

**##### Constraints**

\- The Chat feature will focus on private messaging, group conversations, group membership, and basic conversation management.

\- Private and group conversations must only be accessible to students who are participants in those conversations

\- Group-management actions must be restricted to the group owner and authorized administrators.

\- A group must always have an owner responsible for managing it. An owner must transfer ownership before leaving the group.

**##### Assumptions**

\- Students using Chat have valid SocialU accounts and are signed in to the platform.

\- The student who creates a group chat becomes the group owner and default administrator

\- Students are expected to have access to an internet connection while using SocialU messaging features.

\- Chat will work with other SocialU features, such as student profiles, so information such as names and profile pictures can be displayed in conversations.

**### Author: Merieme Sakhsoukhi (MS)**

The Campus Feed & Social Features area of SocialU is designed to give students a simple way to share information, communicate with other students, and interact with content within the university community. The feature is divided into a Community Feed, which contains publicly shared posts from students across the university, and a Friends Feed, which contains posts shared privately with accepted friends. Students should also be able to create and manage their own posts, interact with other students' posts, receive notifications, and report inappropriate content.

**\*\*UR-301, MS — Community Feed\*\***

As a student, I want a dedicated Community Feed where I can view posts that students at my university have shared publicly, so that I can discover updates, conversations, photographs, and other content from students across the wider campus community, including students who are not on my friends list.

**\*\*UR-302, MS — Friends Feed\*\***

As a student, I want a separate Friends Feed where I can view posts that my accepted friends have shared privately with their friends, so that I can see content that is intended only for people within my social circle and not available to the entire university community.

**\*\*UR-303, MS — Creating Text Posts\*\***

As a student, I want to create and publish a text post by entering a written message and selecting who should be able to view it, so that I can share campus updates, questions, opinions, or other information either with the wider university community or only with my friends.

**\*\*UR-304, MS — Attaching Photographs\*\***

As a student, I want to attach one or more photographs to a post while I am creating it, so that I can share visual content along with my written message and allow other authorized students to view the photographs directly within the post.

**\*\*UR-305, MS — Displaying the Post Author\*\***

As a student, I want every post in the Community Feed and Friends Feed to clearly display the name and profile picture of the student who created it, along with when the post was published, so that I can easily identify who shared the content before I decide to interact with it.

**\*\*UR-306, MS — Editing a Student’s Own Post\*\***

As a student, I want to edit the text or attached content of a post that I personally created, so that I can correct mistakes, update information, or make changes after the post has been published, while still making it clear to other students that the post was edited.

**\*\*UR-307, MS — Deleting a Student’s Own Post\*\***

As a student, I want to delete a post that I personally created, so that I can remove content that I no longer want available in the Community Feed or Friends Feed, with the system asking me to confirm the deletion before permanently removing the post.

**\*\*UR-308, MS — Liking Posts\*\***

As a student, I want to like a post that I am allowed to view in the Community Feed or Friends Feed, so that I can quickly show appreciation or support for another student's content and allow the post's displayed like count to reflect my reaction.

**\*\*UR-309, MS — Removing a Like\*\***

As a student, I want to remove a like that I previously gave to a post, so that I can change my reaction whenever I no longer want my like associated with that post and have the displayed like count updated accordingly.

**\*\*UR-310, MS — Commenting on Posts\*\***

As a student, I want to comment on a post that I am authorized to view, whether it appears in the Community Feed or Friends Feed, so that I can participate in the discussion, respond to the author, ask questions, or share my own thoughts about the content.

**\*\*UR-311, MS — Displaying Comments\*\***

As a student, I want to view the comments that other students have posted on a feed post, including the commenter's name, profile picture, comment text, and when the comment was made, so that I can follow the conversation and understand how other students have responded to the post.

**\*\*UR-312, MS — Like Notifications\*\***

As a student, I want to receive a notification when another student likes one of my posts, so that I know that another student has interacted with my content and can identify which of my posts received the like.

**\*\*UR-313, MS — Comment Notifications\*\***

As a student, I want to receive a notification when another student comments on one of my posts, so that I know someone has responded to my content and can easily identify the related post so that I can read the comment and respond if needed.

**\*\*UR-314, MS — Reporting Inappropriate Campus Content\*\***

As a student, I want to report a post that I believe contains inappropriate, offensive, harassing, or otherwise unacceptable content, so that the report can be submitted for review without automatically deleting the reported post from the feed, and so that my identity as the person who submitted the report remains private.

**\*\*UR-315, MS — Post Visibility and Feed Scope\*\***

As a student, I want to choose the visibility of my post before publishing it, with a Public option that allows the post to appear in the Community Feed for students across the university and a Friends Only option that limits the post to my accepted friends through the Friends Feed, so that I can control whether my content is shared with the wider campus community or only with people in my friend network.

**### Author: Kabanga (KB)**

**#### 4. Campus Events / Trending Posts**

The Campus Events / Trending Posts feature allows SocialU students to create, discover, and manage campus events. Students can view event information, invite friends, respond to invitations, and track attendance. Event creators can also update or cancel events and monitor which students plan to attend, helping students stay informed about campus activities and participate in events that interest them.

**\*\*UR-400, KB — Create Campus Events\*\***

As a student on campus, I want to create a campus event with information like title, description, location, date, and time, so that I can organize an activity and provide other students with the information they need to attend the event if they want to attend.

**\*\*UR-401, KB — Discover Campus Events\*\***

As a student, I want to discover campus events created by other students and view their current information like the event title, description, location, date, and time, so that I can find activities that interest me, understand what each event is about, know when and where it will take place, and decide whether I want to attend.

**\*\*UR-402, KB — Invite Friends to Events\*\***

As an event creator, I want to invite my friends to an event and select the students I want to invite, so that I can easily let people I know participate in the activity I am organizing, and keep track of who has been invited.

**\*\*UR-403, KB — Respond to Event Invitations\*\***

As an invited student, I want to respond to an event invitation and indicate whether I plan to attend, so that the event creator can know which invited students are interested in participating.

**\*\*UR-404, KB — Manage My Events\*\***

As an event creator, I want to update or cancel an event and view the list of students who have plan to attend, so that I can keep participants informed about changes to the event, make sure they have the most accurate event information, monitor expected attendance, and effectively manage the campus activity I organized.


### Author: Darrin Phimphisane (DP)

#### DormSpace

DormSpace is a 2D social and customization game within SocialU’s Game Room. Students enter DormSpace through a DormHall containing doors for their current friends. Each door identifies the friend using their username and profile picture. Students can enter friends’ dorm rooms, explore their spaces, leave notes, and return to the DormHall. Students can also customize their own dorm using free starter items and decorations purchased with points earned throughout SocialU.

**UR-500, DP — Personalize My Virtual Dorm**

As a student, I want to arrange furniture and decorations and customize the appearance of my virtual dorm, so that I can create a personal space that reflects my style.

**UR-503, DP — Begin Decorating My Virtual Dorm**

As a student, I want access to a useful set of free starter furniture and decorations, so that I can begin personalizing my dorm before I have earned or spent any points.

**UR-504, DP — Represent Myself in DormSpace**

As a student, I want my 2D avatar to represent me while I explore DormSpace, so that I can have a recognizable character when visiting my dorm and the dorms of my friends.

**UR-505, DP — Maintain One Current Virtual Dorm**

As a student, I want my current dorm arrangement, appearance, and owned decorations to remain available between sessions, so that I can continue developing the same personal space over time.

**UR-506, DP — Display My SocialU Achievements**

As a student, I want to display trophies or other achievements earned through supported SocialU games in my dorm, so that visiting friends can see accomplishments I choose to show.

**UR-507, DP — Visit Friends Through the DormHall**

As a student, I want to move my 2D avatar through a DormHall where doors represent only my current friends and show each friend’s username and profile picture, so that I can recognize whose dorm I am choosing and enter a friend’s room to visit it.

**UR-508, DP — Explore Friends’ Dorms and Leave Notes**

As a student, I want to explore a current friend’s dorm and leave a guestbook note for the owner, while being able to manage notes associated with my own dorm, so that friends can interact with each other’s spaces even when they are not online at the same time.

**UR-509, DP — Track Visits to My Virtual Dorm**

As a student, I want a persistent visit counter for my virtual dorm, so that I can see how often friends have visited my space.

#### DormSpace Constraints and Assumptions

- DormSpace is entered from SocialU’s Game Room and opens into the student’s DormHall.
- Each student has one current virtual dorm. Alternate saved layouts and layout history are outside the initial scope.
- DormSpace uses a 2D presentation. Students can move their avatar through the DormHall and through dorm rooms that they are allowed to visit.
- DormHall doors represent only current friends and identify the friend by username and profile picture.
- A student enters a friend’s dorm by interacting with that friend’s door and returns to the DormHall by interacting with the room exit.
- Only the owner can decorate or otherwise modify their own dorm. Visitors can explore but cannot rearrange another student’s room.
- Only current friends can visit a dorm or leave a guestbook note. Removing a friendship revokes future visit and note-posting access.
- Dorm visits are asynchronous. The dorm owner does not need to be online for a friend to visit.
- Dorm settings, owned items, guestbook notes, and counted visits persist between sessions.
- DormSpace includes access to a toggleable shop for eligible decorations.
- Exact shop layout, movement controls, visit-counting rules, and note-length limits are deferred to the detailed requirements and interface design.

#### Snipe

Snipe is a game built directly into SocialU’s Chat system. Students can submit photographs of their friends through direct messages or group chats when the friend does not expect the photograph to be taken. Before the Snipe can appear in the conversation, the tagged student must be given the opportunity to approve or reject the photograph. Approved Snipes may also qualify for points in SocialU’s shared points system.

**UR-510, DP — Submit Snipes Inside Chat**

As a student, I want to submit a photograph of a friend through an eligible direct message or group chat when the friend did not expect the photograph to be taken, so that Snipe feels like a natural game inside conversations I already use.

**UR-511, DP — Control Consent to a Snipe**

As a student tagged in a Snipe, I want to review the submitted photograph and approve or reject it before it is posted, and withdraw my approval while the request is still pending, so that I control whether a photograph involving me is shared in the conversation.

**UR-512, DP — Track Snipe Requests and Outcomes**

As a student, I want Snipe approval requests and their current status to be visible in the relevant conversation and unanswered requests to expire, so that I know whether a submission is pending, approved, rejected, expired, or removed without leaving old requests open indefinitely.

**UR-513, DP — Avoid Excessive Snipe Submissions**

As a student, I want submission cooldowns to limit how frequently Snipes can be submitted, so that Snipe does not overwhelm direct messages or group chats.

**UR-514, DP — Address Unwanted Snipes**

As a student, I want reporting and removal controls for Snipes that are inappropriate or unwanted, so that I can respond to content that should no longer remain in a conversation.

#### Snipe Constraints and Assumptions

- Snipe is built into SocialU Chat and may be used in eligible direct messages and group chats.
- Snipes are not published to the Campus Feed as part of the initial release.
- A tagged student must be a current friend of the submitter and must be a participant in the conversation where the Snipe is submitted.
- A Snipe remains unpublished until the required tagged student or students approve it.
- If a required tagged student rejects the Snipe or the request expires, the photograph is not posted.
- Pending approval may be withdrawn before publication.
- Submission cooldowns, request expiration, Snipe point limits, reporting, and removal controls are included.
- Approved Snipes may qualify for shared SocialU points, subject to the shared reward rules and Snipe-specific limits.
- The initial release does not include a Snipe friend-group leaderboard, weekly voting, or weekly Snipe highlights.
- Exact cooldown durations, expiration periods, and numerical point limits remain to be determined.
- Detailed rules for multiple tagged students, changes in friendship or group membership while a request is pending, report review, and the effect of removing a previously rewarded Snipe remain to be determined.

#### Shared Points System

The Shared Points System connects SocialU’s games and reward-based activities through one common balance. Students can earn points from qualifying activities such as supported games, approved Snipes, and daily participation. These points can then be spent on eligible virtual rewards, especially DormSpace decorations. The system is intended to give students a reason to participate in different parts of SocialU without requiring excessive grinding or encouraging spam.

**UR-520, DP — Earn Shared SocialU Rewards**

As a student, I want qualifying SocialU activities, including supported game activity and eligible approved Snipes, to contribute to one shared points balance, so that participation in different parts of SocialU helps me work toward the same rewards.

**UR-521, DP — Know My Available Balance**

As a student, I want to view my current shared points balance anywhere it is relevant to earning or spending points, so that I can understand my progress and decide whether I can afford a reward I want.

**UR-522, DP — Redeem Points for Virtual Rewards**

As a student, I want to spend my available points on eligible virtual rewards, including DormSpace decorations and other supported Game Room items, so that the points I earn give me meaningful customization goals across SocialU.

**UR-523, DP — Trust Reward and Purchase Results**

As a student, I want each qualifying reward and purchase to update my points and item ownership accurately without duplicate credits or duplicate charges, so that I can trust the value of the points I earn and spend.

**UR-524, DP — Keep My Earned Progress**

As a student, I want my points balance and purchased rewards to remain available between sessions, so that I do not lose progress when I leave SocialU and return later.

**UR-525, DP — Limit Snipe Point Farming**

As a student, I want Snipe point awards to use clear reward limits and eligibility rules, so that earning points does not encourage repeated submissions or spam in my conversations.

**UR-526, DP — Receive a Daily Login Reward**

As a student, I want to receive a points reward for returning to SocialU on an eligible day, limited to one daily login reward for that day, so that I can make steady progress without needing to repeatedly perform the same activity.

**UR-527, DP — Review My Points History**

As a student, I want to review a history of points I have earned and spent, including the activity or purchase that caused each change, so that I can understand why my balance changed and identify unexpected results.

**UR-528, DP — Understand How Points Can Be Earned**

As a student, I want the available ways to earn points and any important reward limits to be understandable before I participate, so that I know which activities can make progress toward rewards and when an activity is no longer eligible for additional points.

**UR-529, DP — Understand Rewards Before Spending**

As a student, I want eligible rewards to show their point cost and whether I already own or can currently purchase them, so that I can make informed choices about how to spend my points.

#### Shared Points Constraints and Assumptions

- Each student has one shared SocialU points balance used by all supported earning and spending features.
- Qualifying game rewards, eligible approved Snipe rewards, and daily login rewards contribute to the same balance.
- Individual SocialU features determine what counts as a qualifying activity for their rewards.
- A reward is credited only when its qualifying activity is completed.
- Rejected, expired, or otherwise ineligible Snipe requests do not award points.
- Students may spend only points from their own balance.
- A purchase requires enough available points and satisfaction of any applicable item eligibility requirements.
- A successful purchase grants the item once and deducts its cost once.
- The points history records meaningful balance changes from earning and spending so students can understand the source of each change.
- Snipe reward limits are intended to reduce point farming and chat spam.
- Cooldown rules and reward limits should be understandable to students so they know when a Snipe is eligible to earn points.
- Daily login rewards are limited to one eligible reward per day.
- Previously earned points are not lost because a student misses a day.
- Points are not awarded for Feed likes, comments, event RSVPs, or event attendance in the initial release.
- Real-money purchases are outside the initial scope.
- Exact reward amounts, shop prices, Snipe reward caps, item eligibility rules, daily reset rules, and the effect of removing a previously rewarded Snipe remain to be determined in the detailed requirements.

#### Cross-Feature Coordination

- The platform game, Wordle, Snipe, and any other point-awarding activity use the shared points system rather than maintaining separate spendable point balances.
- DormSpace uses the shared points balance for eligible decoration purchases and preserves ownership of purchased items.
- Chat provides the conversation context needed for Snipe submissions, approvals, and status information.
- Friendship information determines which students may be tagged through Snipe and which dorm rooms a student may visit.
- Account authentication identifies the student whose points balance, purchases, DormSpace state, and Snipe actions are being used.


**### Author : Sonja Seferasi ( SS )**

**#### Navigation Bar**

The navigation bar is the menu available to signed-in students outside active gameplay. It provides access to:

\- Home

\- Messages

\- Game Room

\- Profile

\- Events and Trending

“Events and Trending” is one navigation item. Students can choose side or bottom placement through an option on the navigation bar. The Messages item displays the total number of unread messages across private and group conversations. The plus (+) button offers Text Post, Photo Post, and Event creation.

The navigation bar, including the plus (+) button, is hidden during active gameplay. Game 1 provides a separate Exit control for returning to the Game Room.

**\*\*UR-600, SS — Find and open a section.\*\***

As a student, I want the navigation bar to identify my current section and provide access to Home, Messages, Game Room, Profile, and Events and Trending, so that I can recognize where I am and move to the section I need.

**\*\*UR-601, SS — Keep my navigation preference.\*\***

As a student, I want to choose side or bottom placement through an option on the navigation bar and have that choice remembered after signing out and returning, so that I can continue using my preferred layout.

**\*\*UR-602, SS — Play without distraction.\*\***

As a student, I want the navigation bar hidden while I am actively playing a game, so that I can focus on gameplay and avoid accidentally switching to another section.

**\*\*UR-603, SS — Notice unread messages.\*\***

As a student, I want the Messages item to show the total number of unread messages across my private and group conversations, so that I can identify when conversations need my attention without opening each one to check.

**\*\*UR-604, SS — Start creating content through navigation.\*\***

As a student, I want the plus (+) button to offer Text Post, Photo Post, and Event from any section where the navigation bar is available, so that I can start creating content without first opening its destination section.

**#### Post and Event Creation Entry Points**

**\*\*UR-605 and UR-606 describe creation workflows reached through the navigation bar. Their detailed behavior must be coordinated with the team members responsible for posts and events.\*\***

The campus feed shares posts with signed-in students at the same university. The friends feed shares posts with the author's friends. A draft is unfinished content saved for later editing without being published.

**\*\*UR-605, SS — Choose my post's audience.\*\***

As a student, I want to select the campus feed or friends feed before publishing a text or photo post, so that I can share it with my intended audience.

**\*\*UR-606, SS — Finish a draft later.\*\***

As a student, I want to save an unfinished text post, photo post, or event as a draft and reopen its saved content for editing, so that I can finish preparing it later without losing my work or publishing it prematurely.

**#### Game Room and Avatar Customization**

The Game Room contains three activities:

\- Game 1: A single-player, two-dimensional platform game with a sequence of levels.

\- Wordle: A daily word-guessing game.

\- Dorm Space: An avatar and room customization area with no win-or-lose gameplay of its own.

Each activity has a description explaining what the student does in it. Students can open any activity without first changing their character.

The avatar is the character displayed in the Game Room and used during Game 1. Students choose a complete outfit and either a provided default face or a face cropped from an uploaded photograph. Clothing selection uses complete outfits rather than individually mixed pieces. Uploading a photograph is optional.

Outfit and default-face selections are displayed and saved immediately. For an uploaded photograph, students can resize and reposition a crop area, preview the result, and save the selected face. A new photograph replaces the avatar's face only after it is successfully saved. If a photograph cannot be accepted, the student receives an explanation and can select another photograph. The previously saved appearance remains unchanged.

**\*\*UR-607, SS — Choose and open an activity.\*\***

As a student, I want to read the descriptions of Game 1, Wordle, and Dorm Space and open my selection, with a clear message and the option to retry or choose a different activity if it fails to open, so that I can recover from the problem and continue using the Game Room.

**\*\*UR-608, SS — Choose an outfit and default face.\*\***

As a student, I want to select a complete outfit and a provided default face, with both selections immediately displayed and saved on my avatar, so that I can personalize my character without uploading a photograph.

**\*\*UR-609, SS — Use a photograph for my avatar's face.\*\***

As a student, I want to resize and reposition the crop area of an uploaded photograph and preview the result before saving it, so that I can choose how the photograph appears on my avatar.

**\*\*UR-610, SS — Retain my saved appearance.\*\***

As a student, I want my saved face and outfit to remain selected on later visits and appear on my character in Game 1, so that I do not have to repeat my setup every time I return.

**\*\*UR-611, SS — Change my avatar anytime.\*\***

As a student, I want to update my outfit or face from the Game Room whenever I choose, so that I can change my appearance after the initial setup.

**#### Participation Streak**

A participation streak records the number of qualifying participation days accumulated without a reset. Forgiven missed days preserve the count without increasing it.

Qualifying participation means starting a Game 1 attempt, submitting a Wordle guess, or opening Dorm Space. Opening the Game Room menu alone does not count. Opening Game 1 without starting an attempt or opening Wordle without submitting a guess does not count. An activity that fails to open does not count. Winning, completing a level, and changing a decoration are not required.

The participation rules are:

\- A participation day runs from midnight up to, but not including, the next midnight in the student's local time zone.

\- Qualifying participation increases the streak count at most once per day, regardless of how many activities the student uses.

\- Each streak week runs Sunday through Saturday in the student's local time zone.

\- A missed day is a completed calendar day without qualifying participation while a streak is in progress. Days before the student starts a streak do not count as missed days.

\- Up to three missed days within the same calendar week preserve the existing streak count without increasing it.

\- After all three forgiven misses have been used, any further missed day in that week resets an active streak to zero. The next qualifying participation day starts a new streak at one.

\- The missed-day allowance resets each Sunday, does not carry over, and does not reset when a new streak begins.

A streak is at risk when the student has an active streak, has used all three forgiven missed days for the current week, and has not qualified for participation today. Under the reminder-delivery assumption in Section 9, an in-app reminder appears outside gameplay while these conditions apply. It stops appearing once the student qualifies for participation that day.

**\*\*UR-612, SS — Understand my streak status.\*\***

As a student, I want to see my current streak count, whether I have qualified for today's participation, and how many of this week's three forgiven missed days remain, so that I understand my progress and the flexibility available before my streak resets.

**\*\*UR-613, SS — Maintain progress through participation.\*\***

As a student, I want to start a Game 1 attempt, submit a Word guess, or open Dorm Space to count toward my streak once per day without requiring a win, with up to three missed days per calendar week preserving my existing count, so that I can maintain progress around classes and other commitments.

**\*\*UR-614, SS — Get warned before losing my streak.\*\***

As a student, I want an in-app reminder outside of gameplay when I have an active streak, have used all three forgiven missed days this week, and have not qualified for participation today, so that I know I must participate before local midnight to prevent a reset.

**#### Game 1: Platform Game**

**##### Rules and Current Attempt**

Game 1 is a single-player, two-dimensional platform game launched from the Game Room. Students control their selected avatar through a sequence of levels.

Each level contains:

\- Platforms: Surfaces on which the character stands and moves.

\- Gaps: Spaces between platforms that the character must jump across.

\- Hazards: Obstacles, such as spikes, that end an attempt when touched.

\- Coins: Optional objects collected when the character touches them.

\- Finish flag: The destination that completes the level when reached.

Students move left, move right, and jump. Collecting every coin is not required to finish a level.

An attempt begins when a student starts or restarts a level. Reaching the finish flag completes the level. Falling into a gap or touching a hazard ends the attempt unsuccessfully.

**\*\*UR-615, SS — Understand the game's rules.\*\***

As a student, I want instructions available before and during play explaining movement, jumping, hazards, optional coins, the finish flag, retries, and pausing, so that I can learn the game and check anything unfamiliar without leaving the level.

**\*\*UR-616, SS — Complete a platform challenge.\*\***

As a student, I want to move my avatar left and right and jump between platforms while avoiding hazards and collecting optional coins, so that I can challenge myself to reach the finish flag and choose whether to collect coins along the way.

**\*\*UR-617, SS — Monitor my attempt.\*\***

As a student, I want to see the current level number and the number of coins collected during my current attempt, so that I can track my progress while deciding whether to collect more coins or head for the finish flag.

**##### Level Progression**

The first level is initially available. Completing a level unlocks the next level, when another exists. Students can select any unlocked level, including previously completed levels. Completion records and unlocked levels remain available between visits.

Completing the final level identifies the game's level sequence as completed. Completed levels remain available for replay.

**\*\*UR-618, SS — Continue through the levels.\*\***

As a student, I want to select any unlocked level, distinguish available, locked, and completed levels, and retain my completed and unlocked levels between visits, so that I can continue my progress or replay a completed level when I return.

**\*\*UR-619, SS — Know what follows completion.\*\***

As a student, I want confirmation when I finish a level and options to replay, continue to the next level when available, or return to the Game Room, with confirmation of completing the level sequence after the final level, so that I understand my progress and available next actions.

**##### Retries, Pausing, and Leaving**

Students have unlimited retries from the beginning of the current level. Unsuccessful attempts do not remove previously completed levels.

Pausing stops gameplay and preserves the current position within the open attempt. Resuming continues that same attempt. Pausing does not save an unfinished attempt after the student exits the game.

A separate Exit control asks students to confirm before ending an unfinished attempt and returning to the Game Room. Canceling the exit leaves the attempt open. Confirming the exit preserves completed levels, but a later attempt at the unfinished level begins from its start.

**\*\*UR-620, SS — Retry after an unsuccessful attempt.\*\***

As a student, I want to be told whether a fall or hazard ended my attempt and be able to restart the current level immediately, with no limit on retries, so that I can try again without losing previously completed levels.

**\*\*UR-621, SS — Pause without losing my place.\*\***

As a student, I want to pause gameplay and resume the same open attempt from the position where I paused, so that I can handle a short interruption and continue that attempt.

**\*\*UR-622, SS — Leave an attempt intentionally.\*\***

As a student, I want a separate Exit control while navigation is hidden, with the choice to confirm ending the unfinished attempt and returning to the Game Room or cancel and remain in the game, so that I can decide whether to leave before my current attempt ends.

**#### Daily Word Game**

Wordle presents one secret word per puzzle day, shared by every student. Students have up to six guesses. After each guess, letters receive feedback showing a correct letter in the correct position, a correct letter in a different position, or no match for that occurrence of the letter. Detailed guess-validation and repeated-letter rules belong in the team's Wordle functional section.

Under the puzzle-day assumption in Section 9, Wordle uses the university's local time zone for all students. A new puzzle becomes available at midnight in that time zone. The published word stays fixed until the next daily puzzle begins. This shared puzzle clock is separate from the student's local participation-streak clock.

**\*\*UR-623, SS — Understand the daily word game's rules.\*\***

As a student, I want instructions explaining the three feedback marks and the limit of six guesses, so that I can understand how to play my first puzzle.

**\*\*UR-624, SS — Play today's word.\*\***

As a student, I want to submit guesses against the same daily word every other student is solving, with feedback shown immediately after each guess, so that I can take part in a shared daily challenge.

**\*\*UR-625, SS — Know today's outcome.\*\***

As a student, I want confirmation when I solve the daily word within six guesses and to be shown the correct word if I use all six guesses without solving it, so that I know the puzzle's outcome.

**\*\*UR-626, SS — Review my completed daily puzzle.\*\***

As a student, I want to see my completed puzzle result, including my guesses and their feedback, after solving the word or using all six guesses, without an option to reset it before the next daily puzzle begins, so that I can review my result while keeping the daily attempt limit consistent.

**#### Constraints**

\- Features are available only to signed-in students at the participating university.

\- Game 1 is a single-player, 2D game with levels.

\- Avatar customization uses complete outfits and either default faces or cropped photographs.

\- Navigation is hidden during active gameplay; Game 1 has a separate Exit control.

\- Dorm Space focuses on customization and has no win-or-lose gameplay.

\- Wordle offers one shared daily puzzle with a maximum of six guesses per student.

**#### Assumptions**

\- Authentication and friendship information are available from the team's shared features.

\- Students have an internet connection and a supported web browser.

\- Other team members provide the connected messaging, posting, event, and profile features.

\- The team provides the game levels, default faces, outfits, and daily puzzle content.

\- Reminder delivery — to confirm: Streak reminders appear inside SocialU, outside gameplay, while the student's streak is at risk.

**### Author: Linh Nguyen**

**#### Accounts & Authentication ( LN )**

\- Verification assumes each student has ongoing access to a valid, unique university email address at the time of signup and whenever the linked email is changed.

\- A verification code is time-limited; the system assumes students will complete verification within that window or request a new code.

\- Password recovery assumes the student still has access to their registered school email — recovery for a student who has lost access to that email entirely is out of scope for this release.

\- Login activity tracking assumes the platform can reliably capture device/session metadata at login; it does not assume the ability to remotely terminate another device's active session in this release.

**#### Profile ( LN )**

\- Profile fields (major, class year, bio, photo) are self-reported by the student; the platform does not verify their accuracy beyond the initial school email check.

\- Viewing another student's profile assumes both accounts are active and neither has blocked the other.

\- Post and friend counts shown on a profile reflect only content and connections visible to the viewer, not necessarily the student's total activity.

**#### Friendships ( LN )**

\- Messaging and full profile visibility between two students assume a mutual, accepted friend connection; one-directional "following" is not part of this release.

\- Blocking is assumed to be mutual and immediate — once blocked, neither student can view the other's profile, send friend requests, or message, even if a prior friendship existed.

\- Removing a friend is assumed to be a lighter action than blocking: it ends the connection but does not prevent the other student from sending a new friend request in the future.

\- The friends list assumes a single, flat friend relationship (no "close friends" tiers or follower/following asymmetry) for this release.

**### Author: Merieme Sakhsoukhi**

**#### Constraints**

\- The Campus Feed and Social Features must remain focused on the core social functionality required for the SocialU project. The feature should support text posts and photographs, while more resource-intensive media such as video is not treated as a primary requirement.

\- The system must respect the visibility selected by the student when creating a post. Public posts are intended for the wider university community, while Friends Only posts are restricted to accepted friends. Therefore, the feed must distinguish between content intended for the Community Feed and content intended for the Friends Feed.

\- Students should only be able to modify or delete posts that they personally created. This prevents one student from changing or removing another student's content.

\- Interactions such as likes and comments should only be available for posts that the student is authorized to view. Content that is not visible to a student should not become accessible through interactions.

\- Reported posts should not automatically be deleted when a report is submitted. A report is intended to be recorded and reviewed before any decision is made about the reported content.

\- The identity of the student who submits a report should remain private from other students.

\- Notifications need to provide enough information for the recipient to understand what interaction occurred and which of their posts was involved. Like notifications may need to be grouped when multiple students like the same post in order to avoid excessive notification activity.

**#### Assumptions**

\- It is assumed that all users of SocialU are students belonging to the participating university and that students have an account before accessing the feed.

\- It is assumed that the system can determine whether two students have an accepted friendship relationship so that Friends Only posts can be displayed to the appropriate users.

\- It is assumed that students will choose the visibility of their post before publishing it and that the selected visibility determines which feed can display the post.

\- It is assumed that text posts and photographs are the primary types of content supported by the Campus Feed during the project.

\- It is assumed that students can view and interact with content only when they have permission to access that content.

\- It is assumed that a student can receive notifications for interactions involving posts that the student created.

\- It is assumed that submitted reports are stored and made available for review rather than causing the reported post to be immediately removed.

**## IV. Stakeholder Interview Notes :**

**### Linh Nguyen**

**#### Q1: What do you think about this project? Do you think it will be good in 15 weeks for your role?**

The stakeholder liked the overall concept, especially Snipe as a hook feature. On scope: accounts/profiles/friendships is foundational — every other feature (Snipe, chats, events) depends on it working correctly, so it needs to be solid early. Flagged that professor reviews and exam/study tips were mentioned in the overview but not in the requirements, and asked for clarification on scope.

**#### Q2: For friend requests — should students search by name, or get suggestions based on mutual friends?**

Search by name is expected baseline functionality. Mutual-friend suggestions were flagged as a meaningfully bigger feature — it requires analyzing the whole friend graph, not just a UI addition — and the stakeholder recommended confirming it's an actual student need (not just a nice-to-have copied from other apps) before committing time to it, given the 15-week timeline.

**#### Q3: What about profile picture constraints — file size, format, moderation/approval, default avatar?**

Recommended: common formats supported with reasonable size limits, a default avatar shown before upload, and immediate posting rather than pre-approval moderation. Full pre-approval was flagged as too heavy for the timeline unless it could plug into an existing moderation/reporting system already used elsewhere in the app (e.g., for posts).

**#### Q4: Should a student be able to change their display name freely, or should it be tied to their verified real name?**

Flagged the tension: flexibility is good for user experience, but full freedom weakens the platform's identity-trust guarantee, which is core to SocialU's pitch as a verified-student app. Suggested a middle ground: allow a free display name/nickname, but keep the verified real name visible somewhere on the profile.

Decision: Students can set a free-form display name, but their real (verified) name will still be shown on their profile.

…

**### Merieme Sakhsoukhi:**

The stakeholder interview was conducted to better understand how students expect the Campus Feed and social interaction features to work. The discussion focused on post management, privacy, interactions, notifications, reporting, and the types of media students should be able to share.

**#### Question 1: What should happen when someone reports a post?**

**\*\*Stakeholder response:\*\***

When a student reports a post, the report should be recorded and sent for review rather than automatically deleting the post. The student who submitted the report should receive a confirmation that the report was successfully submitted. If the reported content is found to violate the rules, it can then be removed; otherwise, the post should remain visible. The identity of the student who submitted the report should remain private.

**#### Question 2: Should students be allowed to edit their posts after publishing them?**

**\*\*Stakeholder response:\*\***

Yes. Students should be able to edit posts that they created themselves. However, the system should make it clear that the post was changed by displaying an indicator such as “Edited.” This prevents students from silently changing the content of an existing post without other users knowing that it was modified.

**#### Question 3: How should users be notified when someone likes their post?**

**\*\*Stakeholder response:\*\***

Students should receive a notification when another student likes one of their posts. The notification should identify who liked the post and indicate which post received the like. Notifications should be available through a notification section, and ideally selecting the notification should take the student to the related post. To avoid creating too many notifications, multiple likes could be grouped together, such as “Maya and 5 others liked your post.”

**#### Question 4: Which posts should students be allowed to interact with?**

**\*\*Stakeholder response:\*\***

Students should be able to interact with posts that are visible in the Campus Feed. They should be able to like posts, comment on them, and view their comments. Only published and visible content should be interactive. Snipe photographs that are still waiting for approval should not appear in the feed and therefore should not be available for interaction. Students should also have editing and deletion controls for their own posts.

**#### Question 5: Should students be able to choose whether their posts are public or private?**

**\*\*Stakeholder response:\*\***

Yes. Students should have privacy options when creating a post. At minimum, there should be a public option and a private/friends-only option. Public posts can be viewed by other students at the university, while private posts should only be visible to the student's friends or selected people. The student should choose the visibility of the post before publishing it.

**#### Question 6: What do you think about allowing text posts?**

**\*\*Stakeholder response:\*\***

Text posts should definitely be supported because they are useful for different types of student communication. Students could use them to ask questions, share updates, find study partners, organize activities, or communicate something happening on campus. Students should be able to write their post, choose its visibility, publish it, and later edit or delete it. Other students should be able to interact with these posts by liking and commenting.

**#### Question 7: Should students be able to post videos?**

**\*\*Stakeholder response:\*\***

Video posts could be useful, but they would introduce additional technical concerns, especially storage and handling large files. If video is included, it would be better to limit it to short videos and provide the ability to upload, view, like, and comment on them while keeping the same privacy options as other posts. However, because of the technical and storage requirements, video should be considered a lower-priority feature compared with text posts and photographs.

….

**### Author: Loens Paul (LP)**

Stakeholder role: A realistic university student who would use SocialU. The stakeholder was asked to explain needs and constraints without designing the software.

**#### Question 1**

Loens: What types of messages would you like to be able to send?

Stakeholder: As a student, I would mainly want to send text messages, but I would also like to share photos, emojis, GIFs, and links in conversations. For group chats, it would also be useful to react quickly to messages, especially when people are coordinating events or plans. I would not consider voice or video messages essential for the first version because the main goal is simple campus communication.

**#### Question 2**

Loens: What kinds of links would you like to be able to send?

Stakeholder: Mostly normal web links, such as campus event pages, club websites, Google Docs or Forms, articles, restaurant pages, or social media posts. I would also want to share links to things inside SocialU, especially a student profile, campus post, or event, so I can send something directly to a friend or group chat without making them search for it.

**#### Question 3**

Loens: What feature would you like to see me create?

Stakeholder: As a student, I would really like a reply-to-message feature, especially in group chats. Campus group conversations can get busy, so I want to be able to reply directly to a specific message so people know exactly what I am responding to. I would also want it to stay simple. I would not prioritize voice messages or video calls for the first version.

**#### Question 4**

Loens: Would you like to have groups with everyone in your school or only with your friends?

Stakeholder: I would prefer group chats to be mainly with friends or specific groups of students, not automatically everyone in the school. For school-wide communication, I would rather see that through campus posts or announcements. A chat with the entire university would probably get overwhelming and make it hard to follow conversations.

**#### Question 5**

Loens: Is my part a big workload?

Stakeholder: From my perspective as a stakeholder, yes. Your part is a fairly significant workload because messaging has several behaviors users expect to work reliably. You are responsible for private chats, group conversations, creating chats, sending and displaying messages, group membership, unread-message indicators, participant-only access, and showing Snipe requests and approval updates in chat. That makes your area broader than simply sending a message. I would consider it a medium-to-large portion of the project, especially because privacy and access are important. For a 15-week semester, I would rather see those core messaging features work well than have many extra chat features.

**#### Question 6**

Loens: Should group chats have administrators or owners?

Stakeholder: Yes. I would want group chats to have at least an owner or administrator. As a student, I would expect that person to have some control over the group, especially for adding or removing members and keeping the group organized. I would also want the owner to be able to give another trusted member administrator privileges if needed. One constraint I would care about is that regular members should not be able to remove people or make major changes to the group without permission.

….

200 - LP Ai interview transcript

**### Sonja Seferasi**

**#### -Stakeholder interview**

**#### Q1-What do you think if in this app there is a game imitating mario game where a student can pick its face where it can be a cropped face of a picture of them of other people if they have approval for it should this game get attraction of the students**

Tuesday 11:55 AM

I’d try it. Seeing my own face on a character jumping through a Mario-style game sounds funny, and I can imagine friends showing each other and getting curious about SocialU.

For me, though, the face would get my attention; the game being fun would make me come back. I’d probably play between classes, so I’d want something I can enjoy in a few minutes without a long learning curve.

I’d be more cautious about someone using another person’s face. If a friend used mine, I’d want to know what I was agreeing to, who could see it, and whether I could change my mind. Agreeing to appear in their game wouldn’t automatically mean I’m comfortable with screenshots being posted publicly.

So yes, I think it could attract students like me initially—but I wouldn’t assume everyone would join SocialU for it.

Tuesday 11:55 AM

**#### Q2-There is also a part that is like a game room where you can have the ability to change the avatar, choose the face they want to play the outfit on and then go and play the games and they can view the points.**

Tuesday 12:29 PM

That sounds appealing to me as a student. Having a character I personalize and use across the games would make it feel more like my own space in SocialU. I’d enjoy choosing an outfit and face, then seeing the points I’ve earned.

A few things would matter to me:

\- I’d want my choices remembered so I could jump into a game next time.

\- I’d want to play without using a real person’s photo.

\- On a busy day, I’d want to skip changing clothes and start playing.

\- I’d like to understand what earns points.

What would those points mean for me—are they for comparing scores, or could I spend them on things like outfits?

Tuesday 12:29 PM

**#### Q3-the scores will be used to buy maybe outfits we have a dorm game when you can decorate your game what do you think of that also in the game room there will be an easy way to get points like wordle**

Tuesday 12:36 PM

That gives me a stronger reason to play. I’d enjoy earning an outfit or decorating my virtual dorm because I’d have something personal to show for the time I spent playing.

A short Wordle-style puzzle would appeal to me between classes, especially if I could earn points without being good at the platform game.

My main concern would be how much effort it takes to afford something I like. If a few casual sessions let me buy a small decoration, I’d feel encouraged. If it takes weeks, I’d probably lose interest.

I’d also want to enjoy it without spending real money or feeling pressured to play every day. As a student, I’d want this to feel like a relaxing break, not another obligation.

**#### Q4- For the mario game you as a student will like that to be with levels or infinite versions until you lose.**

Tuesday 12:44 PM

I’d prefer levels. Between classes, I’d like to finish a short challenge and feel that I accomplished something. Reaching a new level would give me a reason to come back.

An infinite version would appeal to me when I’m trying to beat a friend’s score, but I’d probably get frustrated if every loss meant starting from the beginning.

For me, the biggest factor is being able to leave for class and return later without losing my progress.

Tuesday 12:45 PM

**#### Q5-What do you think if you have the daily streak that gives you points and there are some milestones if you reach 7 days or 14-30 you will get more points?**

Tuesday 12:57 PM

I’d like that as an extra way to earn points, especially while saving for an outfit or dorm decoration. Seven days feels achievable, and bigger rewards at 14 and 30 days would tempt me to keep going.

My concern would be missing a day during exams or because I’m busy. I’d be disappointed if that erased a lot of progress, and I wouldn’t want to lose points I’d already earned. I’d want to feel comfortable coming back after a break.

What would count toward the streak—opening SocialU, doing something social, or playing a game? That would affect whether it feels natural or like a daily chore to me.

Tuesday 12:58 PM

**#### The stakeholder interview**

**### Author: Kabanga (KB)**

**#### 1. What information should a student provide when creating a campus event?**

Answer: A student should provide the event title, description, location, date, and time.

**#### 2. Why is each piece of event information important?**

Answer: The title tells students what the event is about. The description provides additional details about the activity. The location tells students where the event will take place. The date tells students which day the event will happen, and the time tells them when it will start.

**#### 3. Should students be able to create public campus events and smaller events for their friends?**

Answer: Yes. Students should be able to create campus events that can be discovered by other students, as well as events intended for a smaller group of friends.

**#### 4. Who should be allowed to create a campus event?**

Answer: Registered SocialU students should be allowed to create campus events.

**#### 5. Should a student be able to invite individual friends to an event?**

Answer: Yes. An event creator should be able to select individual friends and invite them to an event.

**#### 6. Should a student be able to invite multiple friends at the same time?**

Answer: Yes. An event creator should be able to select multiple students when sending invitations instead of having to invite each person separately.

**#### 7. What should an invited student be able to do after receiving an event invitation?**

Answer: The invited student should be able to view the event information and respond to the invitation by indicating whether they plan to attend.

**#### 8. Should invited students be able to accept or decline an event invitation?**

Answer: Yes. Invited students should be able to indicate whether they plan to attend or do not plan to attend.