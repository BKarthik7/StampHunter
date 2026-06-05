import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { Errors } from '../lib/errors.js';
import { decodeCursor } from '../lib/pagination.js';

const router = Router();

// ─── Validation ───────────────────────────────────────────────────

const createAlbumSchema = z.object({
  name: z.string().min(1).max(80),
});

const updateAlbumSchema = z.object({
  name:         z.string().min(1).max(80).optional(),
  coverStampId: z.string().uuid().nullable().optional(),
});

// ─── GET /api/albums — List user's albums ────────────────────────
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albums = await prisma.album.findMany({
      where: { userId: req.dbUser!.id },
      include: {
        stamps: {
          take: 1,
          orderBy: { position: 'asc' },
          include: { stamp: { select: { imageUrl: true, framedUrl: true } } },
        },
        _count: { select: { stamps: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ albums });
  } catch (err) { next(err); }
});

// ─── GET /api/albums/:id — Get specific album ────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await prisma.album.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: { select: { stamps: true } },
      },
    });

    if (!album)                          return next(Errors.albumNotFound());
    if (album.userId !== req.dbUser!.id) return next(Errors.forbidden());

    res.json({ album });
  } catch (err) { next(err); }
});

// ─── GET /api/albums/:id/stamps — Get stamps inside album ─────────
router.get('/:id/stamps', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await prisma.album.findUnique({
      where: { id: req.params.id as string },
    });

    if (!album)                          return next(Errors.albumNotFound());
    if (album.userId !== req.dbUser!.id) return next(Errors.forbidden());

    const limit = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.limit);
    const cursor = req.query.cursor as string | undefined;

    let cursorDate: Date | undefined;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        cursorDate = decoded.createdAt;
      } else {
        const parsedDate = new Date(cursor);
        if (!isNaN(parsedDate.getTime())) {
          cursorDate = parsedDate;
        }
      }
    }

    const stamps = await prisma.stamp.findMany({
      where: {
        albumEntries: {
          some: { albumId: req.params.id as string },
        },
        userId: req.dbUser!.id,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = stamps.length > limit;
    const items   = hasMore ? stamps.slice(0, limit) : stamps;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    res.json({ stamps: items, nextCursor });
  } catch (err) { next(err); }
});

// ─── POST /api/albums — Create album ─────────────────────────────
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAlbumSchema.safeParse(req.body);
    if (!parsed.success) return next(Errors.validation(parsed.error.issues[0].message));

    const album = await prisma.album.create({
      data: { userId: req.dbUser!.id, name: parsed.data.name },
    });
    res.status(201).json({ album });
  } catch (err) { next(err); }
});

// ─── PATCH /api/albums/:id — Update album ────────────────────────
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAlbumSchema.safeParse(req.body);
    if (!parsed.success) return next(Errors.validation(parsed.error.issues[0].message));

    const existing = await prisma.album.findUnique({ where: { id: req.params.id as string } });
    if (!existing)                          return next(Errors.albumNotFound());
    if (existing.userId !== req.dbUser!.id) return next(Errors.forbidden());

    const album = await prisma.album.update({
      where: { id: req.params.id as string },
      data: {
        ...(parsed.data.name         !== undefined ? { name: parsed.data.name }                   : {}),
        ...(parsed.data.coverStampId !== undefined ? { coverStampId: parsed.data.coverStampId }   : {}),
      },
    });
    res.json({ album });
  } catch (err) { next(err); }
});

// ─── DELETE /api/albums/:id — Delete album (stamps untouched) ────
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.album.findUnique({ where: { id: req.params.id as string } });
    if (!existing)                          return next(Errors.albumNotFound());
    if (existing.userId !== req.dbUser!.id) return next(Errors.forbidden());

    await prisma.album.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── POST /api/albums/:id/stamps — Add stamp to album ────────────
router.post('/:id/stamps', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stampId, position } = z.object({
      stampId:  z.string().uuid(),
      position: z.number().int().optional(),
    }).parse(req.body);

    const album = await prisma.album.findUnique({ where: { id: req.params.id as string } });
    if (!album)                          return next(Errors.albumNotFound());
    if (album.userId !== req.dbUser!.id) return next(Errors.forbidden());

    try {
      await prisma.albumStamp.create({
        data: {
          albumId: req.params.id as string,
          stampId,
          position: position ?? 0,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return next(Errors.duplicateAlbumStamp());
      throw err;
    }

    // Auto-set cover to first stamp if not set
    if (!album.coverStampId) {
      await prisma.album.update({
        where: { id: req.params.id as string },
        data: { coverStampId: stampId },
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// ─── DELETE /api/albums/:id/stamps/:stampId ───────────────────────
router.delete('/:id/stamps/:stampId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await prisma.album.findUnique({ where: { id: req.params.id as string } });
    if (!album)                          return next(Errors.albumNotFound());
    if (album.userId !== req.dbUser!.id) return next(Errors.forbidden());

    await prisma.albumStamp.delete({
      where: {
        albumId_stampId: {
          albumId: req.params.id as string,
          stampId: req.params.stampId as string,
        },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
