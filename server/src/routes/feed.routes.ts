import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { Errors } from '../lib/errors.js';

const router = Router();

const EXPLORE_CACHE_TTL = 60; // seconds (TICKET-025)

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  tag:    z.string().optional(),
  location_name: z.string().optional(),
});

// ─── GET /api/feed/explore — Public stamps (TICKET-025) ──────────
router.get('/explore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(Errors.validation(parsed.error.issues[0].message));

    const { cursor, limit, tag, location_name } = parsed.data;

    // Redis cache key — only for uncursored first page with no filters
    const isCacheable = !cursor && !tag && !location_name;
    const cacheKey    = `feed:explore:${limit}`;

    if (isCacheable) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      } catch { /* Redis failure is non-fatal */ }
    }

    const stamps = await prisma.stamp.findMany({
      where: {
        visibility: 'public',
        ...(tag           ? { tags:         { some: { tag } } }                                           : {}),
        ...(location_name ? { locationName: { contains: location_name, mode: 'insensitive' as const } } : {}),
        ...(cursor        ? { createdAt:    { lt: new Date(cursor) } }                                    : {}),
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { select: { tag: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const hasMore = stamps.length > limit;
    const items   = hasMore ? stamps.slice(0, limit) : stamps;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
    const payload = { stamps: items, nextCursor };

    if (isCacheable) {
      redis.setex(cacheKey, EXPLORE_CACHE_TTL, JSON.stringify(payload)).catch(() => {});
    }

    res.setHeader('X-Cache', 'MISS');
    res.json(payload);
  } catch (err) { next(err); }
});

// ─── GET /api/feed/following — Following feed (TICKET-026) ───────
router.get('/following', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(Errors.validation(parsed.error.issues[0].message));

    const { cursor, limit } = parsed.data;

    // Get IDs of users we follow
    const follows = await prisma.follow.findMany({
      where:  { followerId: req.dbUser!.id },
      select: { followingId: true },
    });
    const followingIds = follows.map(f => f.followingId);

    if (followingIds.length === 0) {
      return res.json({ stamps: [], nextCursor: null });
    }

    const stamps = await prisma.stamp.findMany({
      where: {
        userId:     { in: followingIds },
        visibility: 'public',
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { select: { tag: true } },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const hasMore = stamps.length > limit;
    const items   = hasMore ? stamps.slice(0, limit) : stamps;
    res.json({
      stamps:     items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) { next(err); }
});

export default router;
