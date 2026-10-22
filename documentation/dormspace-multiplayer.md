# DormSpace shared multiplayer

Requested on 20 October 2026. The campus version now shows other signed-in players on the same hall floor or inside the same authorized dorm. Saved Game Room clothing, hair, face details and colors follow each player. The preserved classic version remains separate.

## Player experience

- Hall floors are shared campus spaces with fixed logical geometry across viewport sizes. The door list still belongs to each student and leads to that student's own dorm and current friends.
- Rooms are shared by their owner and authorized current friends. Guests can see and talk with other guests, including guests who are not themselves friends. Blocks hide players and their new messages from one another.
- Nearby chat is limited to the current space. Messages appear in the chat log and in a speech bubble above the sender for six seconds, including while seated or sleeping. Messages are plain text, limited to 200 characters and one new message per second. Failed sends retain the draft; duplicate retries do not duplicate a message.
- One player connection is active per account. Opening a second tab replaces the earlier connection; the earlier tab offers Reconnect. Use two different accounts to try multiplayer.
- Chairs, sofas, armchairs and beds have one interaction slot per item. A used item shows the occupying player's own avatar; another player cannot claim the same slot. Anyone sleeping in the bed makes the room's window nighttime for all occupants.
- Current visitors receive saved furniture changes without changing the owner's layout. Room access and broadcast recipients are checked against current friendships, blocks, active accounts and valid sessions.
- Leaving removes the player. Crashed or sleeping connections expire after 15 seconds and rejoin automatically when the page becomes active. Network interruptions use bounded requests, reconnect handling and snapshot reconciliation.
- Nearby chat covers the current visit, is bounded to 40 messages in the UI, and expired transient storage is cleaned during the next multiplayer operation after ten minutes. It is separate from direct messages and guestbooks.

## Implementation and limits

`/api/dorm/live` verifies the bearer token and application session before the server-only `socialu_dormspace_live` bridge. Identity and selected appearance come from the saved account, never from client-supplied usernames or clothing. The database maintains transient leases and validates coordinates, furniture occupancy and sequence ordering. The database work lives in the private `dormspace_live` schema with RLS, no browser table access, a service-only invoker wrapper and fixed search paths. The only Realtime schema change is a receive-only RLS policy for the student's own private `dormspace:<auth uid>` topic. Clients cannot broadcast other players' state.

Changed movement is published at most once per 150 ms with a single request in flight. Unchanged idle leases do not broadcast; the sender receives its acknowledgement through the authenticated API. Snapshot reconciliation normally runs every two seconds, or more often while the live transport reconnects. Presence updates are targeted only to currently authorized peers in the same space. This is appropriate for small campus gatherings; large-scale MMO traffic would warrant a dedicated state relay and load testing.

Coordinates and remote smoothing are held outside React; position packets retain the same visual and room roster snapshots. React updates only when avatar appearance, facing, motion state, speech, occupancy or membership changes. Animation applies transforms with cached surface measurements. Existing furniture proportions, 1.5× running speed, saved layouts, permissions and staged Git work are retained.

Apply the accompanying additive `dormspace_multiplayer` migration after the existing DormSpace, avatar customization, friendships and furniture rotation migrations. It does not reset existing data or grant browser access to SocialU's private tables. Existing environment variables supply the public Realtime URL/key and server bridge credentials; no new key is shipped to the browser.

## Verification

`npm test` includes account-bound API validation, real PostgreSQL-compatible migration/authorization tests, and a store test that proves coordinate packets do not replace React's visual snapshots. The multiplayer browser suite uses the real Next app, its real Supabase JS WebSocket client, and a local Auth/PostgREST/Realtime transport over a disposable database. It checks two accounts, shared movement and saved appearances, bubbles, expiry, safe text, room isolation, occupied seats, shared nighttime, friendship revocation, socket recovery, mobile edges, layout updates, expired leases and tab replacement. A CPU-throttled two-player movement sample records frame and layout counts. No real students receive test messages.

```sh
npm test
node_modules/.bin/vitest run --config vitest.dormspace-multiplayer.config.ts
node_modules/.bin/vitest run --config vitest.dormspace-campus.config.ts
npm run build
```

The browser runners use `SOCIALU_PLAYWRIGHT_MODULE` and `DORMSPACE_BROWSER_EXECUTABLE` when Playwright and Chrome are provided by the workspace runtime. Evidence is saved to `tmp/dormspace-multiplayer` and `tmp/dormspace-campus`.

References: [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), and the [Realtime schema restrictions](https://supabase.com/changelog/realtime-schema-locked-down-against-modification). The current changelog was checked before implementation; platform-owned Realtime objects are not altered.
