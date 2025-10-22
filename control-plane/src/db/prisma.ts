/**
 * Prisma Client Configuration
 *
 * Centralized Prisma client for the Jarvis platform
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Log connection status
prisma.$connect()
  .then(() => {
    logger.info('Prisma client connected to database');
  })
  .catch((error) => {
    logger.error('Failed to connect Prisma client', error);
  });

export default prisma;
