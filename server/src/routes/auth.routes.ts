import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authenticate, clerkAuth } from '../middleware/auth.middleware.js';
import { Errors } from '../lib/errors.js';

const router = Router();

const syncUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: alphanumeric and underscores only'),
  displayName: z.string().max(60).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * POST /api/auth/sync
 * Called by the client immediately after Clerk sign-in.
 * Creates or updates our DB user record.
 */
router.post('/sync', clerkAuth, async (req, res, next) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return next(Errors.unauthorized());

    const body = syncUserSchema.safeParse(req.body);
    if (!body.success) {
      return next(Errors.validation(body.error.errors[0].message));
    }

    const { email, username, displayName, avatarUrl } = body.data;

    // Upsert — idempotent
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      create: {
        clerkId,
        email,
        username,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      select: {
        id: true,
        clerkId: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (err: unknown) {
    // Username conflict
    if ((err as { code?: string })?.code === 'P2002') {
      return next(Errors.validation('Username is already taken', 'username'));
    }
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's DB record.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.dbUser!.id },
      select: {
        id: true,
        clerkId: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            stamps: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) return next(Errors.userNotFound());

    res.json({
      user: {
        ...user,
        stampCount: user._count.stamps,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        _count: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
