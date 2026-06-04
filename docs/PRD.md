# StampHunter — Product Requirements Document

---

## 1. Problem Statement

Every day people encounter moments worth keeping — a perfect sunset, a hidden café, a street mural, a mountain view — and reach for their phone. The photo gets saved to a camera roll that becomes a graveyard: thousands of images with no context, no narrative, no way to surface the memory again meaningfully.

Existing solutions either optimise for broadcast (Instagram, TikTok) or passive archiving (Google Photos). There is no product built around the ritual of *intentionally preserving a moment as a memory* — something you choose to stamp, keep, and optionally share.

StampHunter fills that gap. When you see something worth remembering, you stamp it. The act of stamping — modelled after a physical postal stamp being pressed onto paper — gives the moment weight, permanence, and personality.

---

## 2. Target Users

**Primary — The Intentional Memory Keeper**
Age 18–35. Travels, explores cities, hikes, attends events. Takes photos deliberately, not habitually. Frustrated that their best shots get buried. Values aesthetics and personal narrative. Comfortable with mobile apps but not looking for another social feed to scroll.

**Secondary — The Casual Sharer**
Wants to share specific moments publicly without the pressure of a full social profile. Uses the explore feed occasionally, follows people whose eye they trust.

---

## 3. Product Vision

StampHunter is the world's most intentional photo memory app — where every saved moment gets stamped like a letter, tagged to where and when it happened, and kept in a collection that feels like a personal archive rather than a feed.

---

## 4. Core Concept — What Is a Stamp?

A **Stamp** is the core unit of StampHunter. It is a photo wrapped in a postal-stamp frame (perforated border, as per the reference image), enriched with:

- GPS location at time of capture
- Timestamp
- User-defined tags / category
- Optional caption
- Privacy setting: **Private** (only you) or **Public** (discoverable)

When a user saves a photo, a stamping animation plays: a mechanical punch descends and presses the stamp frame onto the photo. The stamp is born.

---

## 5. App Flow

### Onboarding
1. User opens app → sees hero animation of a stamp being pressed
2. Sign up with email/password or Google OAuth
3. Username selection → profile created
4. Empty state: "Stamp your first memory" CTA

### Core Loop — Stamping a Memory
1. User taps **+** (stamp button)
2. Camera opens or photo picker shown
3. Photo selected → **Stamp preview screen** appears:
   - Photo fills the stamp frame with perforated border
   - GPS auto-attached (shown as location pill)
   - Date auto-filled
   - User adds: tags, caption (optional), album selection (optional)
   - Privacy toggle: Private / Public
4. User taps **Stamp It** → stamping animation plays (punch descends, stamp pressed)
5. Stamp saved → lands in personal collection

### Personal Collection (Home)
- Grid of stamps, each showing the perforated frame thumbnail
- Filterable by: date, location, tag, album
- Tap stamp → full detail view (full photo, location map, tags, caption, likes/comments if public)

### Albums
- User can create named albums (e.g. "Tokyo 2025", "Street Art")
- Stamps can belong to one or more albums
- Album view: masonry grid of stamps with a cover stamp

### Explore (Public Feed)
- Discover public stamps from all users
- Filterable by: location, tag, trending
- Like, comment, follow from here

### Profile
- Grid of all public stamps
- Follower / following count
- Stamp count, collection stats

### Social Actions
- Follow a user → their public stamps appear in a Following feed
- Like a stamp → heart animation
- Comment on a stamp
- Share a stamp → generates a unique link that shows the stamp in frame (no login required to view)

---

## 6. Features — Must-Have vs Nice-to-Have

| Feature | Priority |
|---|---|
| Photo capture + upload | Must-have |
| Postal stamp frame + perforated border render | Must-have |
| Stamping punch animation on save | Must-have |
| GPS tagging | Must-have |
| Tags / categories | Must-have |
| Private / public toggle | Must-have |
| Personal collection grid | Must-have |
| Albums | Must-have |
| User auth (email + Google) | Must-have |
| Explore / public feed | Must-have |
| Follow / followers | Must-have |
| Likes | Must-have |
| Comments | Must-have |
| Shareable stamp link | Must-have |
| Push notifications (likes, follows, comments) | Should-have |
| Map view (pins of your stamps on a world map) | Should-have |
| Date-based timeline view | Should-have |
| Stamp series / sets (limited collections) | Nice-to-have |
| Custom stamp border designs | Nice-to-have |
| Story-mode: animated slideshow of a trip | Nice-to-have |
| AI-suggested tags from photo content | Nice-to-have |

---

## 7. MVP Scope

The v1 MVP includes everything marked **Must-have** above. The stamping animation and postal frame render are non-negotiable — they are the product's identity.

**Explicitly NOT in v1:**
- Video stamps
- In-app camera filters
- Paid tiers / monetisation
- Direct messaging
- Story-mode
- AI tagging

---

## 8. Success Metrics

- 7-day retention ≥ 30%
- Average stamps per active user per week ≥ 3
- % of stamps made public ≥ 25%
- Follow actions per session ≥ 1 for active social users
- Stamp link share-to-view conversion ≥ 40%

---

## 9. Reference Assets

The stamp frame design is based on the provided reference image: two classic postal stamps with clean perforated edges and white interior. The frame must render consistently across web and mobile. The punch animation must feel satisfying — mechanical, deliberate, with a slight impact shake.
