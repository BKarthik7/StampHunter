import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { errorHandler } from './lib/errors.js';
import { handleMulterError } from './middleware/upload.middleware.js';
import authRoutes from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  // ─── Security ─────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_WEB_URL, 'http://localhost:3000', 'http://localhost:19006'],
      credentials: true,
    })
  );

  // ─── Clerk (must come before route handlers) ──────────────────
  app.use(clerkMiddleware());

  // ─── Parsing & Logging ────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // ─── Health check (no auth) ───────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Routes ───────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);

  // Additional routes will be mounted here as they are built:
  // app.use('/api/stamps', stampsRoutes);
  // app.use('/api/albums', albumsRoutes);
  // app.use('/api/feed', feedRoutes);
  // app.use('/api/users', usersRoutes);

  // ─── Error Handlers (must be last) ───────────────────────────
  app.use(handleMulterError);
  app.use(errorHandler);

  return app;
}
