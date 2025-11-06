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
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
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
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient
};