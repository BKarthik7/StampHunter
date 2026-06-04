# StampHunter — Feature Ticket List

---

## How to Use This Document

Each ticket is a self-contained build unit. Work top-to-bottom within each phase — dependencies are noted. Tickets marked `[M]` are must-have for launch. `[S]` = should-have. `[N]` = nice-to-have.

---

## Phase 0 — Project Setup

---

### TICKET-001 · Monorepo scaffold `[M]`

**Description:** Set up the monorepo with three packages: `server`, `web`, `mobile`. Configure TypeScript, ESLint, Prettier uniformly. Set up shared `@stamphunter/types` package for shared TypeScript interfaces (User, Stamp, Album, etc.).

**Acceptance criteria:**
- Running `npm run dev` in `/server` starts the Express server on port 3001
- Running `npm run dev` in `/web` starts Next.js on port 3000
- Running `npx expo start` in `/mobile` opens the Expo dev client
- Shared types are importable in both server and web

**Dependencies:** None

---

### TICKET-002 · Database setup + Prisma `[M]`

**Description:** Create a PostgreSQL database on Railway. Write the full Prisma schema (`schema.prisma`) covering all tables defined in the Technical Architecture document. Run initial migration. Seed with one test user and two test stamps.

**Acceptance criteria:**
- `prisma migrate dev` runs without errors
- `prisma studio` shows all tables with correct columns
- Seed script creates test data successfully
- `DATABASE_URL` env var documented in `.env.example`

**Dependencies:** TICKET-001

---

### TICKET-003 · Express server boilerplate `[M]`

**Description:** Set up the Express server with: Helmet security headers, CORS configured for web app URL, JSON body parser, Multer middleware for file uploads (max 20MB, images only), Zod validation middleware, global error handler that returns structured JSON errors, request logging.

**Acceptance criteria:**
- `GET /api/health` returns `{ status: "ok" }`
- Uploading a non-image file to any upload endpoint returns 415
- Uploading a file over 20MB returns 413
- All unhandled errors return `{ error: { code, message } }` shape, never a stack trace

**Dependencies:** TICKET-001

---

## Phase 1 — Authentication

---

### TICKET-004 · Email/password auth — backend `[M]`

**Description:** Implement `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`. Use bcrypt (cost 12) for hashing. Issue JWT access token (15min) + refresh token (30d). Store refresh token hashed in `refresh_tokens` table. Rotate refresh tokens on use.

**Acceptance criteria:**
- Signup creates user, returns access + refresh tokens
- Login with correct credentials returns new tokens
- Login with wrong password returns 401 with `INVALID_CREDENTIALS` (same message as email not found)
- Refresh endpoint returns new token pair and invalidates old refresh token
- Logout deletes the refresh token from DB
- 5 failed logins in 10 min → 429 for 15 min (Redis-backed)

**Dependencies:** TICKET-002, TICKET-003

---

### TICKET-005 · Google OAuth — backend `[M]`

**Description:** Implement `GET /api/auth/google` (redirect) and `GET /api/auth/google/callback`. Use `passport-google-oauth20` or manual exchange. On callback: create user if new, link to existing if email matches, issue tokens.

**Acceptance criteria:**
- Google OAuth flow completes and returns same token pair as email login
- Re-authenticating with Google on an existing email account links the OAuth record (no duplicate user created)
- `oauth_accounts` table is populated correctly

**Dependencies:** TICKET-004

---

### TICKET-006 · Auth middleware `[M]`

**Description:** Write `auth.middleware.ts` that extracts and verifies the JWT from the `Authorization` header. Attaches `req.user` (id, username, email). Returns 401 with `UNAUTHORIZED` if token missing or invalid, `TOKEN_EXPIRED` if expired.

**Acceptance criteria:**
- Protected routes return 401 without a valid token
- `req.user` is populated correctly on valid token
- Expired token returns `TOKEN_EXPIRED` (so client knows to attempt refresh vs hard logout)

**Dependencies:** TICKET-004

---

### TICKET-007 · Auth UI — web (login + signup) `[M]`

**Description:** Build `/login` and `/signup` pages in Next.js. Forms with email, password fields. Google OAuth button. Client-side Zod validation. On success: store access token in Zustand, store refresh token in HttpOnly cookie (handled by server Set-Cookie). Redirect to home.

**Acceptance criteria:**
- User can sign up with email/password and land on home
- User can log in with email/password
- Google sign-in button works
- Wrong credentials shows inline error (not a toast — user should see it next to the form)
- Token persists across page refresh (refresh flow works)

**Dependencies:** TICKET-004, TICKET-005, TICKET-006

---

### TICKET-008 · Auth UI — mobile `[M]`

**Description:** Build login and signup screens for Expo. Use `expo-secure-store` for refresh token. Use `expo-auth-session` for Google OAuth. Mirror the web validation logic.

**Acceptance criteria:**
- Same as TICKET-007, on iOS and Android simulators
- Refresh token survives app restart (SecureStore persists)

**Dependencies:** TICKET-004, TICKET-005, TICKET-006

---

## Phase 2 — Stamp Core

---

### TICKET-009 · Stamp frame SVG component — web `[M]`

**Description:** Build `StampFrame.tsx` as a reusable React component. Accepts `imageUrl`, `caption`, `locationName`, `date`, `size` ('thumb' | 'card' | 'detail'). Renders the perforated border using SVG circles along all four edges as specified in the Frontend Spec. Inner photo uses `next/image` with object-fit cover.

**Acceptance criteria:**
- Component renders correctly at all three sizes
- Perforated border matches the reference image (evenly spaced circles bisecting the outer border)
- Bottom strip shows caption, location (with pin icon), date
- Works in light and dark mode (photo area always white-framed)
- Passes a11y audit: image has alt text, decorative SVG has aria-hidden

**Dependencies:** TICKET-001

---

### TICKET-010 · Stamp frame component — mobile `[M]`

**Description:** Implement the equivalent `StampFrame.tsx` for React Native using `@shopify/react-native-skia`. Draw the perforated border using Skia `Circle` primitives. Use `expo-image` for the photo.

**Acceptance criteria:**
- Visually matches the web component
- Renders at 60fps on mid-range Android device
- Border circles are crisp (not blurry) at all pixel densities

**Dependencies:** TICKET-001

---

### TICKET-011 · Stamp punch animation — web `[M]`

**Description:** Build `StampPunchAnimation.tsx` using Framer Motion. Implement the full sequence from the Frontend Spec: arm descend → impact shake → perf border draw-in → postmark flash → arm retract → settle. The animation wraps the `StampFrame` component and plays when `isAnimating` prop is true.

**Acceptance criteria:**
- Full animation sequence plays in ~1.2 seconds
- Screen shake on impact (x oscillation)
- SVG stroke-dashoffset draws the perf border during imprint phase
- With `prefers-reduced-motion`: jump directly to final state, no arm movement
- "Stamped!" toast appears after animation completes

**Dependencies:** TICKET-009

---

### TICKET-012 · Stamp punch animation — mobile `[M]`

**Description:** Implement the punch animation for React Native using `react-native-reanimated`. Same sequence as web. Use `Vibration.vibrate(40)` for haptic on impact. Stamp arm is a PNG asset positioned absolutely.

**Acceptance criteria:**
- Same sequence and timing as web
- Haptic feedback fires on impact
- Runs at 60fps — no dropped frames during animation

**Dependencies:** TICKET-010

---

### TICKET-013 · Stamp creation — backend `[M]`

**Description:** Implement `POST /api/stamps`. Accept `multipart/form-data` with image + metadata. Flow: validate inputs → upload image to Cloudinary → call Mapbox reverse geocode if lat/lng provided → insert stamp record + tags into DB (transaction). Return created stamp object.

**Acceptance criteria:**
- Stamp is created with correct `user_id` from JWT
- Image URL stored in `image_url` field
- Tags stored in `stamp_tags` table
- If Cloudinary upload fails: return 503, no DB record created
- If Mapbox fails: save stamp without `location_name`, return 200
- Private stamps default if `visibility` not sent

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-014 · Stamp creation flow — web `[M]`

**Description:** Build the stamp creation flow: photo picker (or camera on supported browsers) → preview screen with `StampFrame` showing the chosen photo → form for caption, tags, album, privacy toggle → "Stamp It" button → triggers `StampPunchAnimation` → calls `POST /api/stamps` during animation → success redirects to collection.

**Acceptance criteria:**
- User can pick a photo from their device
- Preview shows photo inside the stamp frame before saving
- All form fields validate before submission
- Animation plays while the API call is in flight
- On API failure: animation stops, error toast shown, user stays on preview screen

**Dependencies:** TICKET-009, TICKET-011, TICKET-013

---

### TICKET-015 · Stamp creation flow — mobile `[M]`

**Description:** Mobile equivalent of TICKET-014 using Expo Camera + ImagePicker. Camera tab opens directly to camera. After capture/select: same preview + form flow.

**Acceptance criteria:**
- Camera permission request handled (prompt on first use, deep-link to settings if denied)
- Works with both camera capture and photo library pick
- Same validation and animation as web

**Dependencies:** TICKET-010, TICKET-012, TICKET-013

---

### TICKET-016 · Personal collection — backend `[M]`

**Description:** Implement `GET /api/stamps` (owner's own stamps, paginated, cursor-based). Support filter params: `tag`, `album_id`, `visibility`, `date_from`, `date_to`. Return stamps with tag arrays joined.

**Acceptance criteria:**
- Returns only the authenticated user's stamps
- Pagination works correctly (cursor-based, not offset)
- All filter combinations work and are tested
- Response includes `next_cursor` when more results exist

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-017 · Personal collection grid — web + mobile `[M]`

**Description:** Build the home/collection screen. Displays the user's stamps in a responsive grid using `StampCard` (thumbnail-sized `StampFrame`). Infinite scroll / load more. Filter bar at top: by tag, by album, by date. Empty state with "Stamp your first memory" CTA.

**Acceptance criteria:**
- Grid renders stamps correctly at all breakpoints
- Infinite scroll loads next page on scroll to bottom
- Filters update the query and reset pagination
- Empty state shows only when there are truly no stamps
- Tapping a stamp navigates to the detail view

**Dependencies:** TICKET-009, TICKET-016

---

### TICKET-018 · Stamp detail view `[M]`

**Description:** Build the stamp detail screen (web: `app/stamp/[id]/page.tsx`, mobile: `app/stamp/[id].tsx`). Shows full-size `StampFrame`, location map pin (Mapbox static map or React Native Maps), tags, caption, like count, comment list. Edit / delete options for owner.

**Acceptance criteria:**
- Full stamp frame renders at detail size
- If stamp has GPS: shows a small static map with a pin
- Owner sees edit and delete options (others do not)
- Like button and comment section visible for public stamps
- Correct 404 behaviour for private stamps accessed by non-owner

**Dependencies:** TICKET-009, TICKET-010, TICKET-017

---

### TICKET-019 · Edit + delete stamp `[M]`

**Description:** `PATCH /api/stamps/:id` (backend) + edit form (web + mobile). Allow editing: caption, tags, visibility, album membership. `DELETE /api/stamps/:id` with confirmation modal.

**Acceptance criteria:**
- Only the owner can reach the edit screen
- Visibility change from public → private removes stamp from explore feed immediately
- Delete requires confirmation ("This stamp is gone forever")
- Deleted stamp no longer appears in collection

**Dependencies:** TICKET-018

---

## Phase 3 — Albums

---

### TICKET-020 · Albums CRUD — backend `[M]`

**Description:** Implement all album endpoints: `GET/POST /api/albums`, `PATCH/DELETE /api/albums/:id`, `POST /api/albums/:id/stamps`, `DELETE /api/albums/:id/stamps/:stampId`.

**Acceptance criteria:**
- All CRUD operations work for the authenticated user only
- Adding a stamp to an album works; duplicate add returns 409
- Deleting an album does not delete its stamps
- Album cover is the first stamp added unless `cover_stamp_id` is set

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-021 · Albums UI `[M]`

**Description:** Albums section in the collection view. Create album, rename, delete, view album (filtered stamp grid), add/remove stamps from album on the stamp detail screen.

**Acceptance criteria:**
- User can create a named album
- Album cover shows the cover stamp thumbnail
- Stamps can be added to albums from the stamp detail screen
- Album deletion prompts confirmation, does not delete stamps

**Dependencies:** TICKET-017, TICKET-020

---

## Phase 4 — Social

---

### TICKET-022 · Follow system — backend `[M]`

**Description:** `POST /api/users/:username/follow`, `DELETE /api/users/:username/follow`. Create notification on follow. Enforce: cannot follow self.

**Acceptance criteria:**
- Follow/unfollow toggles correctly
- Re-following after unfollow works (idempotent)
- Following self returns 400
- Notification record created on new follow

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-023 · Likes — backend `[M]`

**Description:** `POST /api/stamps/:id/like`, `DELETE /api/stamps/:id/like`. Cannot like private stamps. Cannot like own stamp. Creates notification.

**Acceptance criteria:**
- Like/unlike toggles
- Liking a private stamp returns 404
- Liking own stamp returns 400
- Duplicate like returns 409

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-024 · Comments — backend `[M]`

**Description:** `GET /api/stamps/:id/comments` (paginated), `POST /api/stamps/:id/comments`, `DELETE /api/comments/:id` (author or stamp owner can delete).

**Acceptance criteria:**
- Comments paginate correctly (cursor-based)
- Comment on private stamp returns 404
- Only author or stamp owner can delete a comment

**Dependencies:** TICKET-006, TICKET-002

---

### TICKET-025 · Explore feed — backend `[M]`

**Description:** `GET /api/feed/explore` — returns public stamps, paginated, sorted by `created_at` DESC. Support filter params: `tag`, `location_name` (partial match). Cache result for 60s in Redis.

**Acceptance criteria:**
- Only public stamps returned
- Pagination correct
- Filters work
- Response time under 200ms for cached responses

**Dependencies:** TICKET-002, TICKET-003

---

### TICKET-026 · Following feed — backend `[M]`

**Description:** `GET /api/feed/following` — returns public stamps from users the authenticated user follows, sorted by `created_at` DESC.

**Acceptance criteria:**
- Only stamps from followed users appear
- New follow immediately affects feed on next fetch
- Paginated correctly

**Dependencies:** TICKET-022

---

### TICKET-027 · Explore page — web + mobile `[M]`

**Description:** Explore screen with masonry grid of public stamps. Filter bar (by tag, by location text search). Infinite scroll. Tapping a stamp opens detail.

**Acceptance criteria:**
- Masonry grid renders without layout shifts
- Filters apply correctly
- Infinite scroll works
- Shows a "Follow" button inline on each stamp that isn't from the current user

**Dependencies:** TICKET-009, TICKET-025

---

### TICKET-028 · Social actions UI `[M]`

**Description:** Like button (heart icon, count, fill animation on like), comment section (list + input at bottom), follow/unfollow button on profiles and explore cards.

**Acceptance criteria:**
- Like button animates (scale + fill) on tap with optimistic update
- Unlike reverts the state
- Comment input submits on Enter (web) / Send button (mobile)
- Follow button text toggles between "Follow" and "Following"
- All actions handle API errors gracefully (revert optimistic update on failure)

**Dependencies:** TICKET-022, TICKET-023, TICKET-024

---

### TICKET-029 · Shareable stamp link `[M]`

**Description:** Each public stamp has a URL: `stamphunter.app/stamp/:id`. This page renders even without login. Shows the stamp in its frame with metadata. Has Open Graph tags using the Cloudinary-generated `framed_url` as the OG image. "Open in StampHunter" CTA for mobile deeplink.

**Acceptance criteria:**
- Page renders without authentication
- OG image is the stamp in its frame (not raw photo)
- WhatsApp / Twitter unfurl shows the stamp frame image
- Private stamps return 404 on this route
- "Open in StampHunter" deeplinks to the stamp detail in the mobile app

**Dependencies:** TICKET-013, TICKET-018

---

### TICKET-030 · User profile page `[M]`

**Description:** Public profile at `/@username`. Shows: avatar, display name, bio, follower count, following count, stamp count. Grid of public stamps. Follow/unfollow button (not shown on own profile). Own profile shows all stamps including private (with a lock icon on private stamps).

**Acceptance criteria:**
- Profile loads for any username
- Non-existent username returns 404
- Own profile shows private stamps with lock icon
- Others' profiles show only public stamps
- Follow button is functional

**Dependencies:** TICKET-022, TICKET-028

---

## Phase 5 — Should-Have

---

### TICKET-031 · Map view `[S]`

**Description:** A "Map" tab in the collection that shows all of the user's stamps as pins on a world map. Tapping a pin shows a thumbnail StampFrame popup. Uses Mapbox GL JS (web) or React Native Maps (mobile).

**Dependencies:** TICKET-017

---

### TICKET-032 · Timeline view `[S]`

**Description:** Alternative view mode in the collection: stamps grouped by month/year in a vertical timeline. Toggle between grid and timeline in the collection header.

**Dependencies:** TICKET-017

---

### TICKET-033 · Push notifications `[S]`

**Description:** On like, comment, new follow: trigger Expo Push Notification to the recipient's device. Save notification to `notifications` table. Show notification bell in nav with unread count badge.

**Dependencies:** TICKET-022, TICKET-023, TICKET-024

---

## Phase 6 — Nice-to-Have

---

### TICKET-034 · Custom stamp border designs `[N]`

**Description:** Let users pick from 3–5 stamp frame styles (classic perforated, vintage zigzag, modern clean border). Selected style stored on the stamp record.

**Dependencies:** TICKET-009, TICKET-013

---

### TICKET-035 · AI tag suggestions `[N]`

**Description:** On stamp creation preview, analyse the image using a vision model (e.g. OpenAI Vision) and suggest up to 5 tags. User can tap to add them. Done server-side, result returned with stamp preview endpoint.

**Dependencies:** TICKET-013, TICKET-014

---

*End of Feature Ticket List — 35 tickets total. Ship Phase 0–4 for a complete v1 launch.*
