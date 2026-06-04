# StampHunter — Technical Architecture Document

---

## 1. Tech Stack

### Frontend — Web
| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for public stamp pages, great SEO for shareable links |
| Language | TypeScript | Type safety across a complex data model |
| Styling | Tailwind CSS | Rapid UI, consistent spacing |
| Animation | Framer Motion | Stamp punch animation, transitions |
| State | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Validation on upload/stamp creation |
| Image handling | Next/Image + Sharp | Optimised delivery |

### Frontend — Mobile
| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native (Expo SDK 51) | Code-share with web logic, fast iteration |
| Navigation | Expo Router | File-based routing like Next.js |
| Animation | React Native Reanimated + Skia | Smooth stamp punch animation on native |
| Camera | Expo Camera + ImagePicker | Capture + library access |
| Maps | React Native Maps | Location pin view |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable, well-supported |
| Framework | Express.js + TypeScript | Minimal, explicit, easy to reason about |
| API style | REST | Straightforward for this data model |
| Auth | JWT (access + refresh tokens) | Stateless, works for both web and mobile |
| ORM | Prisma | Type-safe DB queries, easy migrations |

### Database & Storage
| Layer | Choice | Reason |
|---|---|---|
| Database | PostgreSQL 16 | Relational data fits perfectly (users, stamps, follows, likes) |
| DB Hosting | Railway or Render (PostgreSQL) | Simple managed Postgres, no ops overhead |
| File Storage | Cloudinary | Image upload, transformation, CDN delivery. Handles stamp frame compositing server-side |
| Cache | Redis (Upstash) | Feed caching, rate limiting, session store |

### Infrastructure
| Layer | Choice | Reason |
|---|---|---|
| Backend hosting | Railway | Simple Node.js deploy, env vars, easy DB link |
| Web hosting | Vercel | Next.js native, edge CDN |
| Mobile | Expo EAS Build | OTA updates, App Store / Play Store builds |
| Email | Resend | Transactional email (verify, notifications) |
| Reverse geocoding | Mapbox Geocoding API | Convert GPS coords to human-readable location |
| Push notifications | Expo Push Notifications | Cross-platform, free tier sufficient for v1 |

---

## 2. System Architecture Diagram (Text)

```
[Mobile App (Expo RN)]  [Web App (Next.js)]
          |                      |
          └──────────┬───────────┘
                     │  HTTPS REST API
              [Express.js API Server]
              [Railway — Node 20]
                     │
         ┌───────────┼───────────┐
         │           │           │
    [PostgreSQL]  [Redis]   [Cloudinary]
    (primary DB)  (cache)   (images/CDN)
         │
    [Prisma ORM]
```

---

## 3. File & Folder Structure

### Backend (`/server`)
```
server/
├── src/
│   ├── index.ts                  # Entry point, Express app init
│   ├── app.ts                    # Middleware setup, route mounting
│   ├── config/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── redis.ts              # Upstash Redis client
│   │   ├── cloudinary.ts         # Cloudinary SDK config
│   │   └── env.ts                # Zod-validated env vars
│   ├── routes/
│   │   ├── auth.routes.ts        # /api/auth/*
│   │   ├── stamps.routes.ts      # /api/stamps/*
│   │   ├── users.routes.ts       # /api/users/*
│   │   ├── albums.routes.ts      # /api/albums/*
│   │   ├── feed.routes.ts        # /api/feed/*
│   │   └── social.routes.ts      # /api/follow, /api/like, /api/comment
│   ├── controllers/              # Request handlers (thin — call services)
│   ├── services/                 # Business logic
│   │   ├── auth.service.ts
│   │   ├── stamp.service.ts
│   │   ├── feed.service.ts
│   │   ├── social.service.ts
│   │   └── image.service.ts      # Cloudinary upload + stamp frame compositing
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── upload.middleware.ts  # Multer for image uploads
│   │   └── rateLimit.middleware.ts
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── geocode.ts            # Mapbox reverse geocoding
│   │   └── pagination.ts
│   └── types/
│       └── index.ts              # Shared request/response types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env
└── package.json
```

### Web Frontend (`/web`)
```
web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx            # Nav, bottom bar
│   │   ├── page.tsx              # Home / personal collection
│   │   ├── explore/page.tsx
│   │   ├── stamp/[id]/page.tsx   # Public shareable stamp page
│   │   └── profile/[username]/page.tsx
│   └── api/                      # Next.js API routes (proxies to backend or thin wrappers)
├── components/
│   ├── stamp/
│   │   ├── StampFrame.tsx        # Perforated border SVG component
│   │   ├── StampPunchAnimation.tsx # Framer Motion punch sequence
│   │   ├── StampCard.tsx         # Grid thumbnail
│   │   └── StampDetail.tsx       # Full detail view
│   ├── feed/
│   │   ├── ExploreGrid.tsx
│   │   └── FollowingFeed.tsx
│   ├── ui/                       # Buttons, inputs, modals
│   └── layout/
│       ├── Navbar.tsx
│       └── BottomNav.tsx
├── lib/
│   ├── api.ts                    # Axios client with auth interceptors
│   ├── hooks/                    # useStamps, useUser, useFeed
│   └── store/                    # Zustand stores
├── public/
│   └── assets/
│       ├── stamp-frame.svg       # Perforated border SVG
│       └── punch-sprite.png      # Animation frames (if sprite-based)
└── package.json
```

### Mobile (`/mobile`)
```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx             # Home collection
│   │   ├── explore.tsx
│   │   ├── camera.tsx            # Stamp creation flow
│   │   └── profile.tsx
│   ├── stamp/[id].tsx
│   └── _layout.tsx
├── components/
│   ├── stamp/
│   │   ├── StampFrame.tsx        # Skia-rendered perforated border
│   │   ├── StampPunch.tsx        # Reanimated punch sequence
│   │   └── StampGrid.tsx
│   ├── camera/
│   │   └── CameraView.tsx
│   └── ui/
├── lib/
│   ├── api.ts
│   └── hooks/
└── package.json
```

---

## 4. Database Schema

### `users`
```
id              UUID        PK, default gen_random_uuid()
username        VARCHAR(30) UNIQUE NOT NULL
email           VARCHAR     UNIQUE NOT NULL
password_hash   VARCHAR     nullable (null if OAuth only)
display_name    VARCHAR(60)
bio             TEXT
avatar_url      VARCHAR
is_verified     BOOLEAN     default false
created_at      TIMESTAMP   default now()
updated_at      TIMESTAMP
```

### `oauth_accounts`
```
id              UUID        PK
user_id         UUID        FK → users.id ON DELETE CASCADE
provider        VARCHAR     ('google')
provider_id     VARCHAR     UNIQUE per provider
created_at      TIMESTAMP
```

### `refresh_tokens`
```
id              UUID        PK
user_id         UUID        FK → users.id ON DELETE CASCADE
token_hash      VARCHAR     UNIQUE
expires_at      TIMESTAMP
created_at      TIMESTAMP
```

### `stamps`
```
id              UUID        PK
user_id         UUID        FK → users.id ON DELETE CASCADE
image_url       VARCHAR     NOT NULL  (Cloudinary URL — full image)
framed_url      VARCHAR               (Cloudinary URL — stamp-framed version)
caption         TEXT
visibility      ENUM        ('private', 'public') default 'private'
lat             DECIMAL(9,6) nullable
lng             DECIMAL(9,6) nullable
location_name   VARCHAR                (reverse geocoded, e.g. "Koramangala, Bengaluru")
taken_at        TIMESTAMP              (EXIF date or upload time)
created_at      TIMESTAMP   default now()
updated_at      TIMESTAMP
```

### `stamp_tags`
```
id              UUID        PK
stamp_id        UUID        FK → stamps.id ON DELETE CASCADE
tag             VARCHAR(40) NOT NULL
-- index on (stamp_id), (tag)
```

### `albums`
```
id              UUID        PK
user_id         UUID        FK → users.id ON DELETE CASCADE
name            VARCHAR(80) NOT NULL
cover_stamp_id  UUID        FK → stamps.id nullable
created_at      TIMESTAMP
```

### `album_stamps`
```
album_id        UUID        FK → albums.id ON DELETE CASCADE
stamp_id        UUID        FK → stamps.id ON DELETE CASCADE
position        INTEGER     (for custom ordering)
PRIMARY KEY (album_id, stamp_id)
```

### `follows`
```
follower_id     UUID        FK → users.id ON DELETE CASCADE
following_id    UUID        FK → users.id ON DELETE CASCADE
created_at      TIMESTAMP
PRIMARY KEY (follower_id, following_id)
```

### `likes`
```
user_id         UUID        FK → users.id ON DELETE CASCADE
stamp_id        UUID        FK → stamps.id ON DELETE CASCADE
created_at      TIMESTAMP
PRIMARY KEY (user_id, stamp_id)
```

### `comments`
```
id              UUID        PK
stamp_id        UUID        FK → stamps.id ON DELETE CASCADE
user_id         UUID        FK → users.id ON DELETE CASCADE
body            TEXT        NOT NULL
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### `notifications`
```
id              UUID        PK
recipient_id    UUID        FK → users.id ON DELETE CASCADE
actor_id        UUID        FK → users.id
type            ENUM        ('like', 'comment', 'follow', 'mention')
stamp_id        UUID        FK → stamps.id nullable
read            BOOLEAN     default false
created_at      TIMESTAMP
```

---

## 5. Key Relationships

- A user has many stamps, albums, followers, following
- A stamp belongs to one user, has many tags, many albums (via album_stamps), many likes, many comments
- Follows is a self-join on users
- Notifications fan out from social actions

---

## 6. Stamp Frame Compositing

The perforated stamp border is applied in two ways:

**Web/Mobile display:** SVG overlay component renders the perforated border over the photo at display time. No server work needed for rendering.

**Shareable link + OG image:** Cloudinary transformation chain generates the framed version server-side on first request, stores as `framed_url`. This ensures the stamp frame appears when a link is shared to WhatsApp, Twitter, etc.

Cloudinary transformation example:
```
l_stamp_frame_overlay,w_1.0,fl_relative/stamp_frame_mask
```

---

## 7. Environment Variables

### Server `.env`
```
DATABASE_URL=postgresql://user:pass@host:5432/stamphunter
REDIS_URL=rediss://...
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAPBOX_TOKEN=
RESEND_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLIENT_WEB_URL=https://stamphunter.app
NODE_ENV=production
PORT=3001
```

### Web `.env.local`
```
NEXT_PUBLIC_API_URL=https://api.stamphunter.app
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_CLOUDINARY_CLOUD=
```

### Mobile `.env`
```
EXPO_PUBLIC_API_URL=https://api.stamphunter.app
EXPO_PUBLIC_MAPBOX_TOKEN=
```

---

## 8. API Endpoint Summary

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/google

GET    /api/stamps              (user's own stamps, paginated)
POST   /api/stamps              (create stamp — multipart/form-data)
GET    /api/stamps/:id          (single stamp — public or owner)
PATCH  /api/stamps/:id          (edit caption, tags, visibility)
DELETE /api/stamps/:id

GET    /api/albums
POST   /api/albums
PATCH  /api/albums/:id
DELETE /api/albums/:id
POST   /api/albums/:id/stamps   (add stamp to album)
DELETE /api/albums/:id/stamps/:stampId

GET    /api/feed/explore        (public stamps, paginated, filterable)
GET    /api/feed/following       (stamps from followed users)

POST   /api/stamps/:id/like
DELETE /api/stamps/:id/like
GET    /api/stamps/:id/comments
POST   /api/stamps/:id/comments
DELETE /api/comments/:id

POST   /api/users/:username/follow
DELETE /api/users/:username/follow
GET    /api/users/:username
GET    /api/users/:username/stamps
GET    /api/users/:username/followers
GET    /api/users/:username/following

GET    /api/notifications
PATCH  /api/notifications/read-all
```

---

## 9. floci Reference

The [floci repo](https://github.com/floci-io/floci) provides reference patterns for:
- Real-time feed updates (adapt their WebSocket or polling approach)
- Follow/unfollow optimistic UI pattern
- Profile page layout conventions
- Explore grid infinite scroll implementation

Adapt, do not copy wholesale — StampHunter's stamp frame UI and animation system are a distinct layer on top.
