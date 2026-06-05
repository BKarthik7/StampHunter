import type { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth, clerkClient } from '@clerk/express';
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

    let user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, username: true, email: true },
    });

    if (!user) {
      // User has a Clerk session but no DB row yet — let's JIT sync from Clerk
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        if (!clerkUser) {
          return next(Errors.userNotFound());
        }

        const email = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
          return next(Errors.validation('User has no email address on Clerk'));
        }

        // Clean username to follow alphanumeric + underscores only validation rules
        let username = clerkUser.username ?? email.split('@')[0];
        username = username.replace(/[^a-zA-Z0-9_]/g, '');
        if (username.length < 3) {
          username = 'user_' + username;
        }

        const displayName = clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : (clerkUser.firstName || clerkUser.lastName || clerkUser.username || null);

        user = await prisma.user.create({
          data: {
            clerkId,
            email,
            username,
            displayName,
            avatarUrl: clerkUser.imageUrl || null,
          },
          select: { id: true, clerkId: true, username: true, email: true },
        });
      } catch (syncErr) {
        console.error('Failed to JIT sync user from Clerk:', syncErr);
        return next(Errors.userNotFound());
      }
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
