// src/server.ts — HTTP server entrypoint with graceful shutdown.
import './tracing'; // OTel must be first
import 'dotenv/config';
import { createApp } from './app';
import { redisConnection } from './redis';
import { prisma } from './db/prisma';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const app = createApp();

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Astromedia backend started');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown initiated');

  // Stop accepting new connections
  await new Promise<void>((resolve) => server.close(() => resolve()));
  logger.info('HTTP server closed');

  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  } catch (err) {
    logger.error({ err }, 'Prisma disconnect failed');
  }

  try {
    await redisConnection.quit();
    logger.info('Redis disconnected');
  } catch (err) {
    logger.error({ err }, 'Redis disconnect failed');
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});
