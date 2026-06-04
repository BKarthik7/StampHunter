# StampHunter — Security & Access Document

---

## 1. Authentication Method

### Email + Password
- Password hashed with **bcrypt** (cost factor 12)
- On signup: validate email format, check uniqueness, hash password, create user
- On login: compare hash, issue access token (15min) + refresh token (30d)
- Refresh token stored hashed in `refresh_tokens` table (not in plain text)
- Refresh endpoint: exchange valid refresh token for new access + refresh token pair (rotation)

### Google OAuth 2.0
- Flow: client gets Google auth code → sends to `POST /api/auth/google` → server exchanges for profile → creates or links user
- If email already exists via email/password: link the OAuth account to the existing user
- No password required for OAuth users

### Token Delivery
- **Access token:** returned in response body, stored in memory (web: Zustand store, not localStorage)
- **Refresh token:** `HttpOnly` cookie (web) or SecureStore (mobile via Expo)
- This prevents XSS from stealing the refresh token on web

### Session Rules
- After 5 failed login attempts from same IP in 10 minutes: rate-limit with 429 and 15-min block (Redis-based)
- After password change: invalidate all existing refresh tokens for that user

---

## 2. User Roles & Permissions

StampHunter v1 has two roles: **User** and **Admin**.

### User (all authenticated users)
| Action | Allowed |
|---|---|
| Create stamps | Yes |
| View own private stamps | Yes |
| View own public stamps | Yes |
| View other users' public stamps | Yes |
| View other users' private stamps | No |
| Edit own stamps | Yes |
| Delete own stamps | Yes |
| Edit/delete other users' stamps | No |
| Create/manage own albums | Yes |
| Follow/unfollow users | Yes |
| Like public stamps | Yes |
| Comment on public stamps | Yes |
| Delete own comments | Yes |
| Delete other users' comments | No |
| Access admin panel | No |

### Admin (internal only, set directly in DB)
- Can delete any stamp, comment, or user (moderation)
- Can view aggregate analytics
- Cannot view other users' private stamps (even admins)
- Admin flag: `is_admin` boolean on users table (not exposed in API responses)

### Unauthenticated (public)
- Can view any stamp via its shareable link if `visibility = 'public'`
- Can view public profiles
- Cannot like, comment, follow, or create stamps

---

## 3. Authorization Rules (Row-Level Logic)

These are enforced in the service layer, not just at the route level.

**Stamps**
- `GET /api/stamps/:id` — if `visibility = 'private'`, only the owner (`stamp.user_id === req.user.id`) may access it. Anyone else gets 404 (not 403 — do not confirm the stamp exists)
- `PATCH /api/stamps/:id` — only owner
- `DELETE /api/stamps/:id` — only owner

**Albums**
- All album operations — only owner
- Stamps in an album inherit their own visibility; adding a private stamp to an album does not make it public

**Comments**
- `DELETE /api/comments/:id` — only the comment author OR the stamp owner (who can moderate their own stamp)

**Follows**
- A user cannot follow themselves: `if (follower_id === following_id) return 400`

**Likes**
- Cannot like a private stamp (even if you know the ID): check visibility before recording like

---

## 4. Input Validation

Every incoming request body is validated with **Zod** before reaching the controller.

```
POST /api/stamps
  - image: required, file (validated by Multer: max 20MB, types: image/jpeg image/png image/webp)
  - caption: optional, max 500 chars, strip HTML
  - visibility: enum ['private', 'public']
  - lat: optional, number -90..90
  - lng: optional, number -180..180
  - tags: optional, array of strings, max 10 tags, each max 40 chars, alphanumeric + spaces only
  - album_ids: optional, array of UUIDs

POST /api/auth/signup
  - email: valid email format, max 255 chars
  - password: min 8 chars, max 72 chars (bcrypt limit)
  - username: 3–30 chars, alphanumeric + underscores only, no spaces

POST /api/stamps/:id/comments
  - body: required, 1–1000 chars, strip HTML
```

---

## 5. Error Handling

Every error response follows the same shape:
```json
{
  "error": {
    "code": "STAMP_NOT_FOUND",
    "message": "Stamp not found"
  }
}
```

**Auth errors**
| Scenario | HTTP Code | Code |
|---|---|---|
| Missing or malformed JWT | 401 | `UNAUTHORIZED` |
| Expired access token | 401 | `TOKEN_EXPIRED` |
| Invalid refresh token | 401 | `INVALID_REFRESH_TOKEN` |
| Wrong password | 401 | `INVALID_CREDENTIALS` |
| Email not found | 401 | `INVALID_CREDENTIALS` (same — don't reveal which field is wrong) |
| Too many login attempts | 429 | `RATE_LIMITED` |

**Resource errors**
| Scenario | HTTP Code | Code |
|---|---|---|
| Private stamp accessed by non-owner | 404 | `STAMP_NOT_FOUND` |
| Stamp not found | 404 | `STAMP_NOT_FOUND` |
| User not found | 404 | `USER_NOT_FOUND` |
| Trying to like own stamp | 400 | `CANNOT_LIKE_OWN` |
| Duplicate like | 409 | `ALREADY_LIKED` |
| Follow self | 400 | `CANNOT_FOLLOW_SELF` |

**Upload errors**
| Scenario | HTTP Code | Code |
|---|---|---|
| File too large (>20MB) | 413 | `FILE_TOO_LARGE` |
| Invalid file type | 415 | `INVALID_FILE_TYPE` |
| Cloudinary upload failure | 503 | `UPLOAD_FAILED` |

**Validation errors**
| Scenario | HTTP Code | Code |
|---|---|---|
| Missing required field | 400 | `VALIDATION_ERROR` (include field name) |
| Value out of allowed range | 400 | `VALIDATION_ERROR` |

**Server errors**
- All unhandled errors: 500, code `INTERNAL_ERROR`, generic message. Never expose stack traces in production.
- All 500s are logged to console (structured JSON) and can be piped to a log service.

---

## 6. Edge Cases

**Upload**
- User uploads a file with a renamed extension (e.g. `.exe` renamed `.jpg`): Multer checks MIME type via magic bytes, rejects if not image
- User uploads a 0-byte file: caught by Multer size validation
- Cloudinary upload times out: return 503, do not create the stamp record (transaction: upload must succeed before DB write)

**Geolocation**
- User denies location permission: `lat`/`lng` sent as null, stamp saved without location, no error
- Reverse geocoding (Mapbox) fails: save stamp without `location_name`, do not block the save

**Concurrent actions**
- Two simultaneous likes on the same stamp: database UNIQUE constraint on `(user_id, stamp_id)` in likes table handles this. Return 409 gracefully
- Follow/unfollow race: same — UNIQUE constraint on follows, DELETE is idempotent

**Account deletion (future)**
- Not in v1, but the schema is prepared: `ON DELETE CASCADE` on all user foreign keys ensures data is cleaned up

**Shareable link access**
- Stamp made private after link was shared: link now returns 404. The share link is not a permanent grant.

**Token edge cases**
- Refresh token used twice (replay attack): rotate and invalidate old token on use. If an already-used token is presented, invalidate the entire token family for that user and force re-login

---

## 7. Security Headers (Express)

Use `helmet` middleware:
```
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
```

CORS: allow only `https://stamphunter.app` and `http://localhost:3000` (dev). Mobile app communicates directly to the API over HTTPS.
