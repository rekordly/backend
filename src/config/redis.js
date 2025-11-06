const { createClient } = require('redis');
const { logger } = require('../shared/utils/logger');

let redisClient;

async function connectRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
    logger.info('Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Don't throw error, just return null so server can continue
    logger.warn('Server will continue without Redis. Some features may not work properly.');
    return null;
  }
}

async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.disconnect();
      logger.info('Redis client disconnected');
    }
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
    throw error;
  }
}

function getRedisClient() {
  // Return null if Redis is not available
  return redisClient || null;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient
};