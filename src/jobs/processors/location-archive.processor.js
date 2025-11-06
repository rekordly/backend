const { logger } = require('../../shared/utils/logger');
const { prisma } = require('../../config/database');
const { getRedisClient } = require('../../config/redis');

// Location archive processor - archives driver locations from Redis to PostgreSQL
const locationArchiveProcessor = async (job) => {
  const { data } = job;
  logger.info('Processing location archive job', { jobId: job.id, data });

  try {
    const { batchSize = 100, archiveOlderThan = 5 } = data; // Archive locations older than 5 minutes

    const redis = getRedisClient();
    
    // Get all driver location keys
    const driverLocationKeys = await redis.keys('driver:location:*');
    
    if (driverLocationKeys.length === 0) {
      logger.info('No driver locations to archive');
      return { success: true, archived: 0, message: 'No locations to archive' };
    }

    const locationsToArchive = [];
    const cutoffTime = new Date(Date.now() - archiveOlderThan * 60 * 1000);

    // Process each driver location
    for (const key of driverLocationKeys) {
      try {
        const locationData = await redis.get(key);
        if (!locationData) continue;

        const location = JSON.parse(locationData);
        
        // Only archive if location is older than cutoff time
        if (new Date(location.timestamp) < cutoffTime) {
          const driverId = key.split(':')[2];
          
          locationsToArchive.push({
            driverId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || null,
            speed: location.speed || null,
            heading: location.heading || null,
            timestamp: new Date(location.timestamp),
            status: location.status || 'ACTIVE',
            createdAt: new Date(),
          });
        }
      } catch (error) {
        logger.error(`Error processing location key ${key}`, { error: error.message });
      }
    }

    if (locationsToArchive.length === 0) {
      logger.info('No locations meet archive criteria');
      return { success: true, archived: 0, message: 'No locations meet archive criteria' };
    }

    // Batch insert locations into database
    const archivedCount = await batchInsertLocations(locationsToArchive, batchSize);

    // Clean up archived locations from Redis
    await cleanupArchivedLocations(redis, locationsToArchive);

    logger.info(`Location archive completed`, {
      jobId: job.id,
      totalFound: locationsToArchive.length,
      archived: archivedCount,
      cutoffTime,
    });

    return {
      success: true,
      totalFound: locationsToArchive.length,
      archived: archivedCount,
      message: `Successfully archived ${archivedCount} locations`,
    };
  } catch (error) {
    logger.error('Location archive processor failed', { error: error.message, jobId: job.id });
    throw error;
  }
};

// Batch insert locations into database
const batchInsertLocations = async (locations, batchSize) => {
  let insertedCount = 0;
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    try {
      await prisma.driverLocationHistory.createMany({
        data: batch,
        skipDuplicates: true,
      });
      
      insertedCount += batch.length;
      
      logger.debug(`Batch inserted ${batch.length} locations`, {
        batchNumber: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(locations.length / batchSize),
      });
    } catch (error) {
      logger.error(`Failed to insert batch ${Math.floor(i / batchSize) + 1}`, {
        error: error.message,
        batchSize: batch.length,
      });
    }
  }
  
  return insertedCount;
};

// Clean up archived locations from Redis
const cleanupArchivedLocations = async (redis, locations) => {
  const pipeline = redis.pipeline();
  
  for (const location of locations) {
    const key = `driver:location:${location.driverId}`;
    pipeline.del(key);
  }
  
  try {
    const results = await pipeline.exec();
    const deletedCount = results.filter(([err, count]) => !err && count > 0).length;
    
    logger.info(`Cleaned up ${deletedCount} location keys from Redis`);
    return deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup archived locations from Redis', {
      error: error.message,
    });
    return 0;
  }
};

// Cleanup old location history (keep only last 30 days)
const cleanupOldLocationHistory = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.driverLocationHistory.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(`Cleaned up ${deletedCount.count} old location records`, {
      cutoffDate: thirtyDaysAgo,
    });

    return deletedCount.count;
  } catch (error) {
    logger.error('Failed to cleanup old location history', {
      error: error.message,
    });
    return 0;
  }
};

module.exports = {
  locationArchiveProcessor,
  cleanupOldLocationHistory,
};