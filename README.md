# StampHunter

> The world's most intentional photo memory app — stamp moments like letters, keep them in a personal archive.

## Documentation

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product Requirements — problem statement, user personas, feature priorities, success metrics |
| [Technical Architecture](docs/Technical-Architecture.md) | Tech stack, folder structure, DB schema, API endpoints, environment variables |
| [Security & Access](docs/Security-Access.md) | Auth flow, role permissions, input validation, error codes, edge cases |
| [Frontend Spec](docs/Frontend-Spec.md) | Design system, color palette, typography, stamp frame component, animation sequence |
| [Feature Tickets](docs/Feature-Tickets.md) | 35 build tickets across 6 phases (Phase 0–4 = v1 MVP) |

## Monorepo Structure

```
StampHunter/
├── docs/               # Project documentation (start here)
├── server/             # Node.js + Express + Prisma backend (port 3001)
├── web/                # Next.js 14 frontend (port 3000)
└── mobile/             # React Native (Expo SDK 51)
```

## Quick Start

```bash
# Backend
cd server && npm install && npm run dev

# Web
cd web && npm install && npm run dev

# Mobile
cd mobile && npx expo start
```

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Backend | Node.js 20 + Express + TypeScript + Prisma |
| Database | PostgreSQL 16 (Railway) |
| Cache | Redis (Upstash) |
| Storage | Cloudinary |
| Web | Next.js 14 (App Router) + Tailwind + Framer Motion |
| Mobile | Expo SDK 51 + Reanimated + Skia |
| Auth | JWT (access + refresh) + Google OAuth 2.0 |
