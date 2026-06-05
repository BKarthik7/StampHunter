import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { cloudinary } from '../config/cloudinary.js';
import { prisma } from '../config/db.js';
import { reverseGeocode } from '../lib/geocode.js';
import { decodeCursor } from '../lib/pagination.js';
import { Errors } from '../lib/errors.js';
import { getAuth } from '@clerk/express';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────

const createStampSchema = z.object({
  caption:    z.string().max(500).optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  lat:        z.coerce.number().min(-90).max(90).optional(),
  lng:        z.coerce.number().min(-180).max(180).optional(),
  tags:       z.string().optional(), // comma-separated e.g. "travel,sunset"
  takenAt:    z.string().datetime().optional(),
});

const updateStampSchema = z.object({
  caption:    z.string().max(500).optional(),
  visibility: z.enum(['private', 'public']).optional(),
  tags:       z.array(z.string().max(40)).max(10).optional(),
});

const listStampsSchema = z.object({
  cursor:     z.string().optional(),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
  tag:        z.string().optional(),
  album_id:   z.string().uuid().optional(),
  visibility: z.enum(['private', 'public']).optional(),
  date_from:  z.string().datetime().optional(),
  date_to:    z.string().datetime().optional(),
});

// ─── POST /api/stamps — Create stamp (TICKET-013) ────────────────
router.post(
  '/',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(Errors.validation('Image file is required', 'image'));
      }

      const parsed = createStampSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(Errors.validation(parsed.error.issues[0].message));
      }

      const { caption, visibility, lat, lng, tags, takenAt } = parsed.data;
      const userId = req.dbUser!.id;

      // 1. Upload to Cloudinary (with local filesystem fallback on failure)
      let imageUrl: string;
      try {
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'stamps', resource_type: 'image' },
            (err, result) => {
              if (err || !result) return reject(err ?? new Error('Upload failed'));
              resolve(result);
            }
          );
          stream.end(req.file!.buffer);
        });
        imageUrl = result.secure_url;
      } catch (err) {
        console.warn('Cloudinary upload failed, falling back to local file storage:', err);
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const ext = path.extname(req.file!.originalname) || '.jpg';
          const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
          const filepath = path.join(uploadsDir, filename);
          
          fs.writeFileSync(filepath, req.file!.buffer);
          // Use dynamic req attributes to construct accessible URL
          imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
          console.log('Saved file locally as fallback:', imageUrl);
        } catch (fallbackErr) {
          console.error('Local fallback upload failed:', fallbackErr);
          return next(Errors.uploadFailed());
        }
      }

      // 2. Reverse geocode (non-fatal if it fails)
      let locationName: string | null = null;
      if (lat !== undefined && lng !== undefined) {
        locationName = await reverseGeocode(lat, lng);
      }

      // 3. Parse tags
      const tagList = tags
        ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 10)
        : [];

      // 4. DB insert in a single transaction
      const stamp = await prisma.$transaction(async (tx) => {
        const s = await tx.stamp.create({
          data: {
            userId,
            imageUrl,
            caption: caption ?? null,
            visibility: visibility as 'private' | 'public',
            lat: lat ?? null,
            lng: lng ?? null,
            locationName,
            takenAt: takenAt ? new Date(takenAt) : new Date(),
          },
        });

        if (tagList.length > 0) {
          await tx.stampTag.createMany({
            data: tagList.map(tag => ({ stampId: s.id, tag })),
          });
        }

        return tx.stamp.findUnique({
          where: { id: s.id },
          include: { tags: { select: { tag: true } } },
        });
      });

      res.status(201).json({ stamp });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/stamps — List owner's stamps (TICKET-016) ──────────
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listStampsSchema.safeParse(req.query);
      if (!parsed.success) {
        return next(Errors.validation(parsed.error.issues[0].message));
      }

      const { cursor, limit, tag, album_id, visibility, date_from, date_to } = parsed.data;
      const userId = req.dbUser!.id;

      const cursorDate = cursor ? decodeCursor(cursor)?.createdAt : undefined;

      const stamps = await prisma.stamp.findMany({
        where: {
          userId,
          ...(visibility ? { visibility: visibility as 'private' | 'public' } : {}),
          ...(tag ? { tags: { some: { tag } } } : {}),
          ...(album_id ? { albumEntries: { some: { albumId: album_id } } } : {}),
          ...(date_from || date_to ? {
            takenAt: {
              ...(date_from ? { gte: new Date(date_from) } : {}),
              ...(date_to   ? { lte: new Date(date_to)   } : {}),
            }
          } : {}),
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        take: limit + 1,
        orderBy: { createdAt: 'desc' },
        include: { tags: { select: { tag: true } } },
      });

      const hasMore = stamps.length > limit;
      const items   = hasMore ? stamps.slice(0, limit) : stamps;
      const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

      res.json({ stamps: items, nextCursor });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/stamps/:id — Single stamp ──────────────────────────
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stamp = await prisma.stamp.findUnique({
        where: { id: req.params.id as string },
        include: {
          tags:     { select: { tag: true } },
          user:     { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      });

      if (!stamp) return next(Errors.stampNotFound());

      // Private stamps: only owner can see
      const clerkId = getAuth(req as any).userId;
      const isOwner = clerkId
        ? (await prisma.user.findUnique({ where: { clerkId }, select: { id: true } }))?.id === stamp.userId
        : false;

      if (stamp.visibility === 'private' && !isOwner) {
        return next(Errors.stampNotFound()); // 404 — never reveal private stamps exist
      }

      res.json({ stamp });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/stamps/:id — Edit stamp (TICKET-019) ─────────────
router.patch(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateStampSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(Errors.validation(parsed.error.issues[0].message));
      }

      const { caption, visibility, tags } = parsed.data;

      const existing = await prisma.stamp.findUnique({ where: { id: req.params.id as string } });
      if (!existing)                           return next(Errors.stampNotFound());
      if (existing.userId !== req.dbUser!.id)  return next(Errors.forbidden());

      const stamp = await prisma.$transaction(async (tx) => {
        const updated = await tx.stamp.update({
          where: { id: req.params.id as string },
          data: {
            ...(caption    !== undefined ? { caption }                             : {}),
            ...(visibility !== undefined ? { visibility: visibility as 'private' | 'public' } : {}),
          },
        });

        // Sync tags if provided: delete all then re-insert
        if (tags !== undefined) {
          await tx.stampTag.deleteMany({ where: { stampId: updated.id } });
          if (tags.length > 0) {
            await tx.stampTag.createMany({
              data: tags.map(tag => ({ stampId: updated.id, tag: tag.toLowerCase() })),
            });
          }
        }

        return tx.stamp.findUnique({
          where: { id: updated.id },
          include: { tags: { select: { tag: true } } },
        });
      });

      res.json({ stamp });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/stamps/:id — Delete stamp (TICKET-019) ──────────
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.stamp.findUnique({ where: { id: req.params.id as string } });
      if (!existing)                           return next(Errors.stampNotFound());
      if (existing.userId !== req.dbUser!.id)  return next(Errors.forbidden());

      await prisma.stamp.delete({ where: { id: req.params.id as string } });
      // Note: Cloudinary cleanup can be done async via a background job later

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
