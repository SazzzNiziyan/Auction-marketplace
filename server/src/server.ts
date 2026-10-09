import { httpServer } from './app';
import { env } from './config/env';
import prisma from './config/database';

const PORT = parseInt(env.PORT, 10);

async function main() {
  // Verify database connectivity before accepting traffic
  await prisma.$connect();
  console.log('✅ Database connected');

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
