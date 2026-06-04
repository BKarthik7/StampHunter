import 'dotenv/config';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';

async function main() {
  // Connect to DB
  await prisma.$connect();
  console.log('✅ PostgreSQL connected');

  // Attempt Redis connection (non-blocking)
  redis.connect().catch(() => {
    // Redis errors are logged in the client config; don't crash here
  });

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀 StampHunter API running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
