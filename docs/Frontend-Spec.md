# StampHunter — Frontend Specification Document

---

## 1. Design Philosophy

StampHunter's visual identity is built on the world of physical postal stamps: aged white, deep ink blacks, perforated edges, rubber-stamp impressions. The UI should feel like a well-designed philatelist's app — tactile, intentional, slightly nostalgic, but clean and modern in layout. Every photo is a collector's item.

---

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-ink` | `#1A1A1A` | Primary text, borders, stamp outlines |
| `--color-paper` | `#F7F4ED` | App background (warm off-white, like stamp paper) |
| `--color-paper-dark` | `#EDE9DF` | Cards, input backgrounds |
| `--color-stamp-red` | `#C0392B` | Primary CTA, like heart fill, stamp accent |
| `--color-stamp-red-light` | `#FADBD8` | Like button background hover |
| `--color-postmark-blue` | `#1B4F8A` | Links, follow button, secondary actions |
| `--color-postmark-blue-light` | `#D6EAF8` | Follow button hover bg |
| `--color-perforated` | `#FFFFFF` | Stamp frame interior (always white) |
| `--color-muted` | `#7F8C8D` | Captions, metadata, timestamps |
| `--color-border` | `#D5CFC3` | Dividers, subtle borders |
| `--color-success` | `#27AE60` | Save confirmation, toast |
| `--color-error` | `#E74C3C` | Error states, delete confirm |

**Dark mode:** Swap `--color-paper` → `#1C1B18`, `--color-ink` → `#F0EDE6`. The stamp frame itself always stays white — it is a physical object, not a UI element that adapts to dark mode.

---

## 3. Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| App name / hero | `Playfair Display` | 32px | 700 |
| Section headings | `Playfair Display` | 22px | 600 |
| UI labels, nav | `Inter` | 14px | 500 |
| Body / captions | `Inter` | 15px | 400 |
| Metadata (date, location) | `Inter` | 12px | 400 |
| Stamp count / stats | `Playfair Display` | 28px | 700 |
| Tags / pills | `Inter` | 12px | 500, uppercase, letter-spacing 0.5px |
| Button text | `Inter` | 14px | 600 |

`Playfair Display` evokes classic postage stamp typography. `Inter` handles all functional UI. Both loaded from Google Fonts.

---

## 4. The Stamp Frame Component

This is the most critical UI element in the entire product.

### Anatomy
```
┌─ · · · · · · · · · · · · ─┐
·                             ·
·   ┌───────────────────┐    ·
·   │                   │    ·
·   │   PHOTO FILLS     │    ·
·   │   THIS AREA       │    ·
·   │                   │    ·
·   └───────────────────┘    ·
·   [caption text here]      ·
·   [location · date]        ·
·                             ·
└─ · · · · · · · · · · · · ─┘
```

- Outer border: 2px solid `--color-ink`
- Perforated edge: SVG `circle` elements repeating along all four sides, filled `--color-paper`, stroke `--color-ink`. Based on the reference image: approximately 12px diameter circles, spaced evenly with 14px center-to-center gap, placed so they bisect the outer border.
- Interior photo: object-fit cover, aspect-ratio 3/4 (portrait) or 4/3 (landscape), determined at upload
- Bottom strip inside frame: caption + location + date on `--color-perforated` background
- Overall border-radius: 2px (very slight — stamps have near-square corners)

### Sizes
| Context | Width |
|---|---|
| Grid thumbnail | 160px |
| Feed card | 100% of container, max 400px |
| Detail view | 100% of container, max 600px |
| Share OG image | 1200×630px (Cloudinary-generated) |

### SVG Perforated Border (implementation guide)
```svg
<!-- Repeat circles along top edge, bottom edge, left, right -->
<!-- Each circle: r=6, fill=white, stroke=#1A1A1A, stroke-width=1 -->
<!-- Position so circles bisect the outer rect boundary -->
<!-- Use a clipPath on the inner photo to mask to a clean rect -->
```

The same SVG component is used on both web (`StampFrame.tsx`) and mobile (React Native Skia `StampFrame.tsx`). On mobile, Skia's `Path` and `Circle` primitives draw the perf border natively.

---

## 5. The Stamp Punch Animation

This plays every time a user saves a stamp. It is the product's signature moment.

### Sequence (total ~1.2 seconds)
1. **Preview phase (0ms):** Photo shown in stamp frame at normal size, "Stamp It" button visible
2. **Arm descend (0–300ms):** A mechanical stamp arm enters from top of screen, moving down. The arm carries a rectangular stamp head. Uses Framer Motion `y` from `-200px` to `20px` with `easeIn`.
3. **Impact (300–380ms):** Arm reaches the photo. Brief pause. Screen shakes (`x: [0, -4, 4, -2, 2, 0]`, duration 80ms). Ink splat particles optional (CSS radial burst, 8 dots).
4. **Stamp imprint (380–600ms):** The perforated border "burns in" around the photo — SVG stroke-dashoffset animation draws the perf edge from 0 to full in 220ms. Slight red postmark overlay flashes (opacity 0.6 → 0 over 300ms).
5. **Arm retract (600–900ms):** Arm moves back up (`y` to `-200px`, `easeOut`).
6. **Settle (900–1200ms):** Stamp scales from `1.05` to `1.0`, opacity settles. Completion toast appears: "Stamped!"

### Mobile (React Native Reanimated)
- Same sequence using `withTiming`, `withSpring`, `withSequence`
- Arm is an `Animated.View` containing a PNG of the stamp arm
- Impact uses `Vibration.vibrate(40)` for haptic feedback

### Accessibility
- `prefers-reduced-motion`: skip to step 4 immediately, no arm movement, just the perf border draw-in

---

## 6. Component Library

### Buttons
```
Primary (Stamp Red):
  bg: --color-stamp-red | text: white | border: none
  padding: 12px 24px | border-radius: 6px
  hover: brightness(1.1) | active: scale(0.97)

Secondary (Postmark Blue outline):
  bg: transparent | text: --color-postmark-blue
  border: 1.5px solid --color-postmark-blue
  padding: 10px 20px | border-radius: 6px

Ghost:
  bg: transparent | text: --color-ink
  border: 1px solid --color-border
  padding: 10px 20px | border-radius: 6px

Icon button (circular):
  width/height: 40px | border-radius: 50%
  bg: --color-paper-dark
```

### Input Fields
```
border: 1px solid --color-border
border-radius: 6px
padding: 10px 14px
background: --color-perforated
font: Inter 15px
focus: border-color --color-postmark-blue, outline none
error: border-color --color-error
```

### Tag / Pill
```
bg: --color-paper-dark
border: 1px solid --color-border
border-radius: 999px
padding: 4px 10px
font: Inter 12px 500 uppercase
letter-spacing: 0.5px
color: --color-ink
```

### Cards (feed / explore)
```
bg: --color-perforated (white)
border: 1px solid --color-border
border-radius: 8px
padding: 0 (image bleeds to edge, metadata below)
box-shadow: 0 1px 3px rgba(0,0,0,0.08)
```

### Modals / Sheets
```
Mobile: bottom sheet (slides up from bottom edge)
Web: centered modal with backdrop blur(4px) and rgba(0,0,0,0.4) overlay
border-radius: 12px 12px 0 0 (mobile sheet) | 12px (web modal)
padding: 24px
```

---

## 7. Spacing & Layout

Grid: 8px base unit. All spacing is multiples of 8.

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Icon gaps, tight elements |
| `--space-sm` | 8px | Inline spacing |
| `--space-md` | 16px | Component padding |
| `--space-lg` | 24px | Section gaps |
| `--space-xl` | 40px | Page margins |

**Grid layouts:**
- Collection grid (web): `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, gap 12px
- Collection grid (mobile): 2-column, gap 10px
- Explore grid: masonry (CSS columns: 2 on mobile, 3 on tablet, 4 on desktop)

**Page max-width:** 1100px, centered, `padding: 0 var(--space-xl)`

**Bottom nav (mobile):** 56px height, 5 items: Home, Explore, Stamp (+), Notifications, Profile. The Stamp button is 56px circular, `--color-stamp-red`, slightly elevated with a shadow.

---

## 8. API & Integration Spec

### Backend REST API
- Base URL: `https://api.stamphunter.app`
- All requests: `Content-Type: application/json` (except file uploads: `multipart/form-data`)
- Auth: `Authorization: Bearer <access_token>` header
- Errors: structured JSON (see Security doc)
- Client uses Axios with interceptors: on 401 → try refresh → retry original request → if refresh fails, redirect to login

### Cloudinary
- Purpose: image hosting, CDN delivery, stamp frame OG image generation
- Upload endpoint: `POST https://api.cloudinary.com/v1_1/{cloud}/image/upload`
- Upload triggered server-side (server signs the upload request, client never holds API secret)
- Transformations used:
  - Thumbnail: `c_fill,w_320,h_400,q_auto,f_auto`
  - Feed card: `c_fill,w_800,q_auto,f_auto`
  - OG image: `c_fill,w_1200,h_630,l_stamp_frame,q_auto`
- Delivery URL pattern: `https://res.cloudinary.com/{cloud}/image/upload/{transforms}/{public_id}`

### Mapbox Geocoding API
- Purpose: reverse geocode GPS coordinates to human-readable location name
- Endpoint: `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json`
- Params: `types=place,locality&access_token={token}`
- Called server-side on stamp creation. Result stored in `location_name` field.
- Failure is silent — stamp saves without location name.

### Google OAuth 2.0
- Web: `@react-oauth/google` client library, returns auth code sent to backend
- Mobile: `expo-auth-session` with Google provider
- Backend exchanges code at `https://oauth2.googleapis.com/token`, fetches profile from `https://www.googleapis.com/oauth2/v2/userinfo`

### Expo Push Notifications
- Service: Expo's push notification service (wraps APNs + FCM)
- Flow: client gets Expo push token on app open → `POST /api/users/push-token` to save it → server sends via `https://exp.host/--/api/v2/push/send` when notifications are triggered
- Events that trigger push: like, comment, new follower

### Resend (Email)
- Purpose: email verification on signup, password reset
- SDK: `resend` npm package
- Templates: plain HTML, styled to look like a stamped letter (PostmarkBlue header, stamp graphic)
- From address: `stamps@stamphunter.app`

---

## 9. Responsive Breakpoints

```
mobile:   0 – 767px
tablet:   768px – 1023px
desktop:  1024px+
```

The web app is mobile-first. The React Native app handles mobile natively. Tablet web shows a 3-column grid and side-by-side profile layout.
