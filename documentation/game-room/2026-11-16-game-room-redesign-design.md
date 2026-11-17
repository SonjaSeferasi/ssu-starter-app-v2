# Game Room redesign and active friends — design

Date: 16 November 2026. Owner: SS (Sonja). Status: approach approved in conversation; build in the stages below.

## Intent
Make the Game Room feel like a welcoming campus game lounge, in the pastel illustrated style of the reference image, while showing only what SocialU really has: three games, the avatar editor, shared points, the participation streak and its two rankings. Add one new feature because it is fun and social: seeing which friends are in the Game Room or a game right now.

## Goals
- A dashboard with a welcome banner and three areas: avatar (left), games (centre, largest), streak, points and rankings (right). Sections stack on tablets and phones.
- Three game cards with real artwork and one clear action each: DormSpace 3D (`/game-room/dormspace`), Jumpyland (`/game-1`), World Explorer (`/world-explorer`).
- A streak card with a flame, the real count, today's status, the forgiven misses left, and a brief celebration once today's reward is confirmed. All numbers come from `/api/game-participation`.
- Rankings labelled for what they measure (current participation streak in days), signed-in student highlighted.
- Active friends: accepted friends who are in the Game Room or a game right now, with a green dot and where they are, plus a "Show me as online" switch.
- A background picker with four themes, saved on the device only.

## Non-goals
- No new games. Wordle stays out of the playable collection until it is connected.
- No XP, levels, badges, achievements, weekly challenge or recommendations: none of these exist.
- No change to avatar saving, reward rules, game progress, routes or authentication.
- No replacement of the avatar renderer.

## Anti-goals (would make this a failure even if it looks right)
- Any invented number, friend, ranking row or checkmark.
- A decorative control that does nothing.
- A student shown as online to someone who is not their accepted friend, or after they switched visibility off.
- A celebration shown when no reward was confirmed today.

## What exists today (checked in `main` at 1b5b88b)
- `components/game-room/game-room.tsx` renders a two-column page: avatar editor and an activity column. Cards come from `room.activities` (Jumpyland, DormSpace, Wordle) plus a hard-coded World Explorer card with no image.
- `components/game-room/participation-streak.tsx` shows the streak count, today's status, forgiven misses and two rankings from `/api/game-participation` (`count`, `qualifiedToday`, `forgivenRemaining`, `rewardPoints`, `leaderboards.dormspace|explorer`). There is no celebration and no dated week history.
- Shared points are shown by `components/navigation/points-badge.tsx` from `/api/points`.
- Friends: `/api/friends?view=friends` returns accepted friends with username, name and photo. There is no presence data except inside DormSpace live rooms.
- `/dev/game-room` renders the page with sample data and no account, which is how the layout is checked in a browser.

## Approaches for "online right now"
1. **Check-in every 30 seconds (chosen).** While the Game Room or a game is open and visible, the browser posts a check-in. The Game Room asks the server for friends seen in the last 75 seconds. The server joins against accepted friendships, so only friends are ever returned; a student with visibility off is not recorded. Trade-off: a dot can lag by up to about a minute.
2. **Live channel.** Instant updates, but restricting a real-time presence channel to friends only is much harder to get right, and a mistake exposes who is online to everyone. Rejected for that risk.
3. **Played today.** Cheap and uses streak data, but it is not "right now". Rejected because the request is for live presence.

## Design
### Stage 1 — dashboard look (SRS-629.1, 629.2)
- New pieces in `components/game-room/`: `welcome-banner.tsx` (heading, copy, vector campus scenery and a small original controller mascot, all `aria-hidden`), `game-card.tsx` (image, name, description, one action), `dashboard-panel` styles.
- `game-room.tsx` keeps all avatar state and saving logic unchanged; only its layout wrappers, headings and class names change. "Save avatar" becomes "Save Look"; the Discard button and all status messages stay.
- Editor tabs become icon-and-label tabs; a selected tile gets a purple outline and a checkmark.
- Game cards: fixed list of the three games, each shown only when its entry point exists. DormSpace and Jumpyland still respect `room.activities` availability. Wordle is not listed.
- Palette and type from the brief: blush `#FFF1F6`, lavender `#F1E9FF`, panel `#FFFCFF`, purple `#8B45E6`, plum `#302044`, grey `#70677D`, orange `#FF8A28`, gold `#FFD36B`, mint `#71D9AE`. Purple buttons use white text only at sizes that keep contrast readable.
- Layout: three columns when the page is at least 1000px wide, two rows when it is narrower (games and streak first, avatar below), and one column under 640px in the order banner, streak, games, avatar, rankings. The widths are those of the page itself, not the window, because the page sits beside the site navigation.

### Stage 2 — streak celebration and rankings (SRS-612.1, 612.2)
- `participation-streak.tsx` becomes the right column: flame, count, status line, forgiven misses, points reward text, then the two rankings as tabs.
- Before qualification: subdued flame, "Keep your flame growing." / "Play a qualifying activity today to earn your daily reward." After: bright flame with a tick, "You're on fire!" / "+N points earned today" where N is `rewardPoints` from the server.
- The celebration animation runs once per day per device after `qualifiedToday` becomes true, is under one second, and is skipped under `prefers-reduced-motion`.
- No weekly calendar strip: the API has no dated history, so it is left out rather than faked.
- Failure shows a message and Retry, never a zero.
- The migration file's reward of 5 is changed to 10 to match the hosted database.

### Stage 3 — active friends (SRS-630.1 to 630.4)
- Migration: `socialu.game_presence (student_id pk, place text, seen_at timestamptz)`, RLS on, no direct access; a `presence_visible boolean default true` account preference; RPC `socialu_game_presence(p_auth_id, p_action, p_place)` with actions `checkin`, `leave`, `friends`, `visibility`.
- `friends` returns accepted, unblocked friends with `presence_visible` and `seen_at` within 75 seconds: username, display name, photo key, place.
- API `app/api/game-presence`: `POST` check-in or leave, `GET` friends online and my visibility, `PUT` visibility.
- Client hook `useGamePresence(place)` in the Game Room, Jumpyland, DormSpace and World Explorer: checks in on mount, every 30 seconds while the tab is visible, and sends `leave` on unload.
- Panel "Friends playing now": avatar or initial, name, green dot plus the text of where they are (not colour alone), empty state "No friends are playing right now.", and the "Show me as online" switch.

### Stage 4 — background picker (SRS-629.3)
- "Background" button with four thumbnails: Campus Day (default), Cozy Dorm, Adventure Sky, World Journey. Stored in `localStorage` only; it changes banner and page-edge scenery, never data.

## Testing
- Markup tests with `renderToStaticMarkup` for the banner, game cards, streak states and friends panel, as the repo already does.
- Database tests for the presence RPC with the in-memory Postgres used by the other database tests: friends only, blocked excluded, hidden excluded, stale excluded.
- Layout checked in headless Chrome on `/dev/game-room` at 1440, 1024, 768 and 390 pixels wide.

## Left to the builder
Exact spacing, the vector scenery drawings, icon choices from `lucide-react`, and animation timing within the limits above.
