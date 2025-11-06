const { PrismaClient } = require('@prisma/client');
const { logger } = require('../shared/utils/logger');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error']
  });
} else {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });
}

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Database disconnection failed:', error);
    throw error;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};