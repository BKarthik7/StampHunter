import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { Errors } from '../lib/errors.js';

const router = Router();

// ─── POST /api/users/:username/follow — Follow user (TICKET-022) ─
router.post('/users/:username/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = await prisma.user.findUnique({
      where: { username: req.params.username as string },
      select: { id: true },
    });
    if (!target) return next(Errors.userNotFound());
    if (target.id === req.dbUser!.id) return next(Errors.cannotFollowSelf());

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId:  req.dbUser!.id,
          followingId: target.id,
        },
      },
      update: {},
      create: {
        followerId:  req.dbUser!.id,
        followingId: target.id,
      },
    });

    // Create notification (best-effort)
    await prisma.notification.create({
      data: {
        recipientId: target.id,
        actorId:     req.dbUser!.id,
        type:        'follow',
      },
    }).catch(() => { /* non-fatal */ });

    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// ─── DELETE /api/users/:username/follow — Unfollow user ──────────
router.delete('/users/:username/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = await prisma.user.findUnique({
      where: { username: req.params.username as string },
      select: { id: true },
    });
    if (!target) return next(Errors.userNotFound());

    await prisma.follow.deleteMany({
      where: {
        followerId:  req.dbUser!.id,
        followingId: target.id,
      },
    });

    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── POST /api/stamps/:id/like — Like stamp (TICKET-023) ─────────
router.post('/stamps/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stamp = await prisma.stamp.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, userId: true, visibility: true },
    });
    if (!stamp || stamp.visibility === 'private') return next(Errors.stampNotFound());
    if (stamp.userId === req.dbUser!.id)          return next(Errors.cannotLikeOwn());

    try {
      await prisma.like.create({
        data: { userId: req.dbUser!.id, stampId: stamp.id },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return next(Errors.alreadyLiked());
      throw err;
    }

    // Notification (best-effort)
    await prisma.notification.create({
      data: {
        recipientId: stamp.userId,
        actorId:     req.dbUser!.id,
        type:        'like',
        stampId:     stamp.id,
      },
    }).catch(() => {});

    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// ─── DELETE /api/stamps/:id/like — Unlike stamp ──────────────────
router.delete('/stamps/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.like.deleteMany({
      where: { userId: req.dbUser!.id, stampId: req.params.id as string },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── GET /api/stamps/:id/comments — List comments (TICKET-024) ───
router.get('/stamps/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit = '20' } = req.query as Record<string, string>;
    const take = Math.min(Number(limit) || 20, 50);

    const stamp = await prisma.stamp.findUnique({
      where: { id: req.params.id as string },
      select: { visibility: true },
    });
    if (!stamp || stamp.visibility === 'private') return next(Errors.stampNotFound());

    const comments = await prisma.comment.findMany({
      where: {
        stampId: req.params.id as string,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const hasMore = comments.length > take;
    const items   = hasMore ? comments.slice(0, take) : comments;
    res.json({
      comments: items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) { next(err); }
});

// ─── POST /api/stamps/:id/comments — Add comment ─────────────────
router.post('/stamps/:id/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);

    const stamp = await prisma.stamp.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, userId: true, visibility: true },
    });
    if (!stamp || stamp.visibility === 'private') return next(Errors.stampNotFound());

    const comment = await prisma.comment.create({
      data: {
        stampId: stamp.id,
        userId:  req.dbUser!.id,
        body,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // Notification (best-effort)
    if (stamp.userId !== req.dbUser!.id) {
      await prisma.notification.create({
        data: {
          recipientId: stamp.userId,
          actorId:     req.dbUser!.id,
          type:        'comment',
          stampId:     stamp.id,
        },
      }).catch(() => {});
    }

    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

// ─── DELETE /api/comments/:id — Delete comment ───────────────────
router.delete('/comments/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id as string },
      include: { stamp: { select: { userId: true } } },
    });
    if (!comment) return next(Errors.commentNotFound());

    // Author OR stamp owner can delete
    const isAuthor      = comment.userId       === req.dbUser!.id;
    const isStampOwner  = comment.stamp.userId === req.dbUser!.id;
    if (!isAuthor && !isStampOwner) return next(Errors.forbidden());

    await prisma.comment.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── GET /api/users/:username — Public profile (TICKET-030) ──────
router.get('/users/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username as string },
      select: {
        id: true, username: true, displayName: true, bio: true,
        avatarUrl: true, isVerified: true, createdAt: true,
        _count: { select: { stamps: true, followers: true, following: true } },
      },
    });
    if (!user) return next(Errors.userNotFound());

    res.json({
      user: {
        ...user,
        stampCount:    user._count.stamps,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        _count: undefined,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/users/:username/stamps ─────────────────────────────
router.get('/users/:username/stamps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit = '20' } = req.query as Record<string, string>;
    const take = Math.min(Number(limit) || 20, 50);

    const owner = await prisma.user.findUnique({
      where: { username: req.params.username as string },
      select: { id: true },
    });
    if (!owner) return next(Errors.userNotFound());

    const stamps = await prisma.stamp.findMany({
      where: {
        userId: owner.id,
        visibility: 'public',           // only public stamps for others
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: { tags: { select: { tag: true } } },
    });

    const hasMore = stamps.length > take;
    const items   = hasMore ? stamps.slice(0, take) : stamps;
    res.json({
      stamps: items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) { next(err); }
});

export default router;
