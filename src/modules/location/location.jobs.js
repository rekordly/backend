const { logger } = require('../../../shared/utils/logger');

class LocationJobs {
  constructor() {
    this.jobs = [];
  }

  // Archive old location data to database
  async archiveLocationsToDatabase() {
    try {
      const { prisma } = require('../../../config/database');
      const { REDIS_KEYS } = require('../../../config/constants');
      const { getRedisClient } = require('../../../config/redis');
      
      const redis = getRedisClient();
      const driverKeys = await redis.keys('driver:location:*');
      
      let archivedCount = 0;
      
      for (const key of driverKeys) {
        try {
          const locationData = await redis.get(key);
          if (locationData) {
            const location = JSON.parse(locationData);
            const driverId = key.split(':').pop();
            
            // Archive to database
            await prisma.driverLocation.create({
              data: {
                driverId,
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: new Date(location.timestamp),
                status: location.status,
                bearing: location.bearing,
                speed: location.speed,
                accuracy: location.accuracy
              }
            });
            
            archivedCount++;
          }
        } catch (error) {
          logger.error(`Error archiving location for key ${key}:`, error);
        }
      }
      
      logger.info(`Archived ${archivedCount} locations to database`);
      return { archivedCount, message: 'Location archiving completed' };
    } catch (error) {
      logger.error('Error in archiveLocationsToDatabase job:', error);
      throw error;
    }
  }

  // Clean up old location data
  async cleanupOldLocations() {
    try {
      const { prisma } = require('../../../config/database');
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const deletedCount = await prisma.driverLocation.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${deletedCount.count} old location records`);
      return { deletedCount: deletedCount.count, message: 'Old location cleanup completed' };
    } catch (error) {
      logger.error('Error in cleanupOldLocations job:', error);
      throw error;
    }
  }

  // Update driver statistics based on location data
  async updateDriverStatistics() {
    try {
      const { prisma } = require('../../../config/database');
      
      // Get all active drivers
      const drivers = await prisma.driver.findMany({
        where: {
          status: 'ONLINE'
        }
      });
      
      let updatedCount = 0;
      
      for (const driver of drivers) {
        try {
          // Get today's location data
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const locations = await prisma.driverLocation.findMany({
            where: {
              driverId: driver.id,
              timestamp: {
                gte: today,
                lt: tomorrow
              }
            },
            orderBy: {
              timestamp: 'asc'
            }
          });
          
          if (locations.length > 1) {
            // Calculate total distance traveled today
            let totalDistance = 0;
            for (let i = 1; i < locations.length; i++) {
              const { calculateDistance } = require('../../../shared/utils/geospatial');
              totalDistance += calculateDistance(
                locations[i - 1].latitude,
                locations[i - 1].longitude,
                locations[i].latitude,
                locations[i].longitude
              );
            }
            
            // Calculate active time
            const activeTime = locations.length > 0 ? 
              (locations[locations.length - 1].timestamp - locations[0].timestamp) / (1000 * 60) : 0; // in minutes
            
            // Update driver statistics (you would need to add these fields to the Driver model)
            // For now, just log the statistics
            logger.info(`Driver ${driver.id} statistics:`, {
              totalDistance: Math.round(totalDistance * 100) / 100,
              activeTime: Math.round(activeTime),
              locationUpdates: locations.length
            });
            
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Error updating statistics for driver ${driver.id}:`, error);
        }
      }
      
      logger.info(`Updated statistics for ${updatedCount} drivers`);
      return { updatedCount, message: 'Driver statistics update completed' };
    } catch (error) {
      logger.error('Error in updateDriverStatistics job:', error);
      throw error;
    }
  }

  // Remove inactive drivers from cache
  async removeInactiveDrivers() {
    try {
      const { getRedisClient } = require('../../../config/redis');
      const redis = getRedisClient();
      
      const driverKeys = await redis.keys('driver:location:*');
      let removedCount = 0;
      
      for (const key of driverKeys) {
        try {
          const locationData = await redis.get(key);
          if (locationData) {
            const location = JSON.parse(locationData);
            const locationAge = Date.now() - new Date(location.timestamp).getTime();
            
            // Remove if location is older than 1 hour
            if (locationAge > 60 * 60 * 1000) {
              await redis.del(key);
              removedCount++;
            }
          }
        } catch (error) {
          logger.error(`Error checking driver activity for key ${key}:`, error);
        }
      }
      
      logger.info(`Removed ${removedCount} inactive drivers from cache`);
      return { removedCount, message: 'Inactive drivers cleanup completed' };
    } catch (error) {
      logger.error('Error in removeInactiveDrivers job:', error);
      throw error;
    }
  }

  // Generate location heatmap data
  async generateLocationHeatmap() {
    try {
      const { prisma } = require('../../../config/database');
      
      // Get location data for the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const locations = await prisma.driverLocation.findMany({
        where: {
          timestamp: {
            gte: oneHourAgo
          }
        },
        select: {
          latitude: true,
          longitude: true,
          driverId: true
        }
      });
      
      // Group locations by grid cells
      const gridSize = 0.01; // Approximately 1km
      const heatmap = {};
      
      locations.forEach(location => {
        const latGrid = Math.floor(location.latitude / gridSize);
        const lngGrid = Math.floor(location.longitude / gridSize);
        const key = `${latGrid},${lngGrid}`;
        
        if (!heatmap[key]) {
          heatmap[key] = {
            lat: latGrid * gridSize,
            lng: lngGrid * gridSize,
            count: 0,
            weight: 0
          };
        }
        
        heatmap[key].count++;
        heatmap[key].weight += 1;
      });
      
      // Store heatmap data in cache
      const { getRedisClient } = require('../../../config/redis');
      const redis = getRedisClient();
      
      await redis.setex(
        'location:heatmap',
        60 * 60, // 1 hour TTL
        JSON.stringify(Object.values(heatmap))
      );
      
      logger.info(`Generated location heatmap with ${Object.keys(heatmap).length} cells`);
      return { cells: Object.keys(heatmap).length, message: 'Location heatmap generated' };
    } catch (error) {
      logger.error('Error in generateLocationHeatmap job:', error);
      throw error;
    }
  }

  // Validate and fix location data consistency
  async validateLocationData() {
    try {
      const { prisma } = require('../../../config/database');
      
      // Find drivers with inconsistent location data
      const inconsistentDrivers = await prisma.driver.findMany({
        where: {
          OR: [
            { status: 'ONLINE', lastLocationUpdate: null },
            { status: 'OFFLINE', lastLocationUpdate: { gt: new Date(Date.now() - 5 * 60 * 1000) } }
          ]
        }
      });
      
      let fixedCount = 0;
      
      for (const driver of inconsistentDrivers) {
        try {
          if (driver.status === 'ONLINE' && !driver.lastLocationUpdate) {
            // Set driver to offline if no location update
            await prisma.driver.update({
              where: { id: driver.id },
              data: { status: 'OFFLINE' }
            });
            fixedCount++;
          } else if (driver.status === 'OFFLINE' && driver.lastLocationUpdate) {
            // Check if driver should be online based on recent location
            const recentLocation = await prisma.driverLocation.findFirst({
              where: {
                driverId: driver.id,
                timestamp: {
                  gte: new Date(Date.now() - 5 * 60 * 1000)
                }
              }
            });
            
            if (recentLocation) {
              await prisma.driver.update({
                where: { id: driver.id },
                data: { status: 'ONLINE' }
              });
              fixedCount++;
            }
          }
        } catch (error) {
          logger.error(`Error fixing driver ${driver.id}:`, error);
        }
      }
      
      logger.info(`Fixed ${fixedCount} inconsistent driver records`);
      return { fixedCount, message: 'Location data validation completed' };
    } catch (error) {
      logger.error('Error in validateLocationData job:', error);
      throw error;
    }
  }

  // Schedule all jobs
  scheduleAll(queue) {
    // Archive locations every 5 minutes
    this.jobs.push(
      queue.add('archiveLocations', {}, {
        repeat: { every: 5 * 60 * 1000 } // 5 minutes
      })
    );

    // Cleanup old locations daily
    this.jobs.push(
      queue.add('cleanupOldLocations', {}, {
        repeat: { every: 24 * 60 * 60 * 1000 } // 24 hours
      })
    );

    // Update driver statistics hourly
    this.jobs.push(
      queue.add('updateDriverStatistics', {}, {
        repeat: { every: 60 * 60 * 1000 } // 1 hour
      })
    );

    // Remove inactive drivers every 10 minutes
    this.jobs.push(
      queue.add('removeInactiveDrivers', {}, {
        repeat: { every: 10 * 60 * 1000 } // 10 minutes
      })
    );

    // Generate heatmap every 30 minutes
    this.jobs.push(
      queue.add('generateLocationHeatmap', {}, {
        repeat: { every: 30 * 60 * 1000 } // 30 minutes
      })
    );

    // Validate location data every hour
    this.jobs.push(
      queue.add('validateLocationData', {}, {
        repeat: { every: 60 * 60 * 1000 } // 1 hour
      })
    );

    logger.info(`Scheduled ${this.jobs.length} location jobs`);
    return this.jobs;
  }

  // Get job status
  getJobStatus() {
    return {
      totalJobs: this.jobs.length,
      scheduledJobs: this.jobs.length,
      jobTypes: [
        'archiveLocations',
        'cleanupOldLocations',
        'updateDriverStatistics',
        'removeInactiveDrivers',
        'generateLocationHeatmap',
        'validateLocationData'
      ]
    };
  }
}

module.exports = new LocationJobs();