# Game Room dashboard (Stage 1) Implementation Plan

**Goal:** Restyle the Game Room as a three-area pastel dashboard with a welcome banner and three real game cards, without changing avatar, reward or routing behavior.

**Architecture:** Presentation only. `game-room.tsx` keeps its state and save logic; new small components supply the banner and game cards, and the CSS module is rewritten around a three-column grid. Card content is a fixed list in `lib/game-room-cards.ts`, filtered by the existing availability data.

**Tech Stack:** Next.js 14, React 18, CSS modules, `lucide-react`, Vitest with `react-dom/server` markup tests.

**Spec:** `documentation/game-room/2026-11-16-game-room-redesign-design.md`

## Global Constraints
- Colors: `#FFF1F6` page, `#F1E9FF` secondary, `#FFFCFF` panels, `#8B45E6` primary, `#302044` text, `#70677D` supporting text, `#FF8A28` and `#FFD36B` streak, `#71D9AE` success.
- Banner copy, exactly: "Game Room" / "Your next little adventure starts here." / "Play, explore, make your space your own, and grow your daily streak."
- Card copy, buttons and destinations exactly as in the design brief sections for DormSpace 3D, Jumpyland and World Explorer.
- No Wordle, Quiz Clash, Study Sprint or Puzzle Quest card. No XP, level, badge or invented value anywhere.
- Touch targets at least 44 by 44 px. Decorative art is `aria-hidden`. Text is real HTML.
- Stages 2 to 4 (celebration, active friends, background picker) are separate plans.

## Review Focus
- Game Room data fails to load: the error notice and Retry still show, and no game card claims availability it cannot confirm for DormSpace or Jumpyland.
- An account whose `activities` list omits or disables Jumpyland or DormSpace: that card is not offered as playable.
- A 390 px phone: no horizontal scrolling, and the order is banner, streak, games, avatar.
- Unsaved avatar changes: Save Look enables, Discard still works, status messages unchanged.
- Keyboard only: every tab, tile and card action is reachable with a visible focus ring.

---

### Task 1: SRS items
**Files:** Modify `documentation/SocialU_SRS_Editable.md` (after the last SRS-628 item).
- [x] Add `UR-629, SS — Enjoy a welcoming Game Room` with SRS-629.1 (present the Game Room dashboard), SRS-629.2 (present the three games), SRS-629.3 (choose a Game Room background), and `UR-630, SS — See friends who are playing now` with SRS-630.1 to 630.4, in the document's existing "shall / Acceptance criterion / Traces to" form.

### Task 2: Game card data and component
**Files:** Create `lib/game-room-cards.ts`, `components/game-room/game-card.tsx`; Test `__tests__/game-room-cards.test.ts`.
**Interfaces — Produces:**
- `type GameCard = { key: 'dormspace' | 'jumpyland' | 'explorer'; activityCode: 'dormspace' | 'game1' | null; name: string; description: string; action: string; href: string; image: string | null; accent: 'dorm' | 'jumpy' | 'explorer' }`
- `gameCards: GameCard[]` in the order DormSpace 3D, Jumpyland, World Explorer.
- `availableGameCards(activities: { code: string; included: boolean }[] | undefined): GameCard[]` returns World Explorer always, and the other two only when their activity is included.
- `<GameCardView card={GameCard} />` renders an `article` with the image area, `h3`, description and one link.
- [x] Test: names, descriptions, actions and hrefs equal the brief; `availableGameCards([])` is World Explorer only; with both activities included it is all three; an activity with `included:false` is dropped; no card is named Wordle.
- [x] Test: `renderToStaticMarkup(<GameCardView card={gameCards[1]} />)` contains `href="/game-1"`, "Play Jumpyland" and an empty-alt image.
- [x] Implement, run, commit.

### Task 3: Welcome banner
**Files:** Create `components/game-room/welcome-banner.tsx`; Test `__tests__/game-room-banner.test.ts`.
**Interfaces — Produces:** `<WelcomeBanner />`.
- [x] Test: markup has an `h1` "Game Room", both copy lines, and the scenery `svg` carries `aria-hidden="true"`.
- [x] Implement with inline vector scenery, run, commit.

### Task 4: Dashboard layout and styling
**Files:** Modify `components/game-room/game-room.tsx`, `components/game-room/game-room.module.css`; Test `__tests__/game-room-dashboard.test.ts`.
**Interfaces — Consumes:** `WelcomeBanner`, `GameCardView`, `availableGameCards`.
- [x] Test: `renderToStaticMarkup(<GameRoomContent preview />)` contains the banner, the three game names in order, "Save Look", the five editor tab labels, and none of "Wordle", "XP", "Lv.".
- [x] Replace the page header with the banner; lay out avatar, games and streak as three grid areas; icon-and-label editor tabs; checkmark on the selected tile; rename the save button to "Save Look". Leave every state variable and handler as is.
- [x] Rewrite the CSS module to the palette and the breakpoints in the design.
- [x] Run the new tests plus `__tests__/avatar-editor.test.ts` and type-check.
- [x] Check `/dev/game-room` in headless Chrome at 1440, 1024, 768 and 390 px wide; fix overflow or overlap.
- [x] Commit.

## Outcome
- Delivered on two branches, one per SRS item: `srs-629.2-present-the-three-games` (card data, card component, card images) and, on top of it, `srs-629.1-present-the-game-room-dashboard` (welcome banner, three-area layout, pastel styling).
- The three game cards are stacked in the games area with the artwork beside the copy; the artwork moves above the copy by itself when a card is narrow.
- The layout follows the width of the page itself (CSS container queries at 1000px and 640px) because the page sits beside the site navigation, so window-width breakpoints misjudged the space available.
- The unused `components/game-room/activity-art.tsx` was removed.
- Checked at 1440, 1024, 768 and 390 px wide with no horizontal scrolling or overlap.
