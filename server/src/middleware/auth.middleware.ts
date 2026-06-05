import type { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import { prisma } from '../config/db.js';
import { Errors } from '../lib/errors.js';

// Extend Express Request to include our resolved user
declare global {
  namespace Express {
    interface Request {
      dbUser?: {
        id: string;
        clerkId: string;
        username: string;
        email: string;
      };
    }
  }
}

/**
 * Requires a valid Clerk session.
 * Attaches req.auth.userId (from Clerk) automatically.
 */
export const clerkAuth = requireAuth();

/**
 * After clerkAuth: resolves the Clerk userId to our DB user row.
 * Use this on routes that need req.dbUser.
 */
export async function resolveDbUser(req: Request, res: Response, next: NextFunction) {
  try {
    const clerkId = getAuth(req).userId;
    if (!clerkId) {
      return next(Errors.unauthorized());
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, username: true, email: true },
    });

    if (!user) {
      // User has a Clerk session but no DB row yet — this shouldn't happen
      // if /api/auth/sync is called on sign-in, but handle gracefully
      return next(Errors.userNotFound());
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Combined middleware: Clerk auth + DB user resolution.
 * Use this on most protected routes.
 */
export const authenticate = [clerkAuth, resolveDbUser];
