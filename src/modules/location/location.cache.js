const { REDIS_KEYS, TIME_CONSTANTS } = require('../../../config/constants');
const { logger } = require('../../../shared/utils/logger');

class LocationCache {
  constructor() {
    this.cache = new Map(); // Fallback in-memory cache
    this.redis = null;
  }

  // Initialize Redis client
  async init() {
    try {
      const { getRedisClient } = require('../../../config/redis');
      this.redis = getRedisClient();
      logger.info('Location cache initialized with Redis');
    } catch (error) {
      logger.warn('Redis not available, using in-memory cache');
    }
  }

  // Store driver location in cache
  async setDriverLocation(driverId, locationData) {
    const key = REDIS_KEYS.DRIVER_LOCATION(driverId);
    const data = {
      ...locationData,
      timestamp: new Date(locationData.timestamp || Date.now()).toISOString()
    };

    try {
      if (this.redis) {
        await this.redis.setex(key, TIME_CONSTANTS.LOCATION_TTL / 1000, JSON.stringify(data));
      } else {
        // Fallback to in-memory cache
        this.cache.set(key, {
          data,
          expiry: Date.now() + TIME_CONSTANTS.LOCATION_TTL
        });
      }
    } catch (error) {
      logger.error('Error setting driver location in cache:', error);
    }
  }

  // Get driver location from cache
  async getDriverLocation(driverId) {
    const key = REDIS_KEYS.DRIVER_LOCATION(driverId);

    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } else {
        // Fallback to in-memory cache
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data;
        }
      }
    } catch (error) {
      logger.error('Error getting driver location from cache:', error);
    }

    return null;
  }

  // Delete driver location from cache
  async deleteDriverLocation(driverId) {
    const key = REDIS_KEYS.DRIVER_LOCATION(driverId);

    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.cache.delete(key);
      }
    } catch (error) {
      logger.error('Error deleting driver location from cache:', error);
    }
  }

  // Get multiple driver locations
  async getMultipleDriverLocations(driverIds) {
    const locations = [];

    for (const driverId of driverIds) {
      const location = await this.getDriverLocation(driverId);
      if (location) {
        locations.push(location);
      }
    }

    return locations;
  }

  // Get all active drivers from cache
  async getAllActiveDrivers() {
    const drivers = [];

    try {
      if (this.redis) {
        const keys = await this.redis.keys('driver:location:*');
        
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const location = JSON.parse(data);
            if (location.status === 'ONLINE') {
              drivers.push(location);
            }
          }
        }
      } else {
        // Fallback to in-memory cache
        for (const [key, cached] of this.cache.entries()) {
          if (key.startsWith('driver:location:') && cached.expiry > Date.now()) {
            const location = cached.data;
            if (location.status === 'ONLINE') {
              drivers.push(location);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error getting active drivers from cache:', error);
    }

    return drivers;
  }

  // Get drivers within radius
  async getDriversWithinRadius(centerLat, centerLon, radius, vehicleType = null) {
    const drivers = await this.getAllActiveDrivers();
    const { calculateDistance } = require('../../../shared/utils/geospatial');

    return drivers
      .filter(driver => {
        // Filter by vehicle type if specified
        if (vehicleType && driver.vehicleType !== vehicleType) {
          return false;
        }

        // Filter by distance
        const distance = calculateDistance(
          centerLat,
          centerLon,
          driver.latitude,
          driver.longitude
        );
        return distance <= radius;
      })
      .map(driver => ({
        ...driver,
        distance: calculateDistance(
          centerLat,
          centerLon,
          driver.latitude,
          driver.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  // Cache delivery tracking info
  async setDeliveryTracking(deliveryId, trackingData) {
    const key = REDIS_KEYS.DELIVERY_TRACKING(deliveryId);
    const data = {
      ...trackingData,
      timestamp: new Date().toISOString()
    };

    try {
      if (this.redis) {
        await this.redis.setex(key, TIME_CONSTANTS.LOCATION_TTL / 1000, JSON.stringify(data));
      } else {
        this.cache.set(key, {
          data,
          expiry: Date.now() + TIME_CONSTANTS.LOCATION_TTL
        });
      }
    } catch (error) {
      logger.error('Error setting delivery tracking in cache:', error);
    }
  }

  // Get delivery tracking info
  async getDeliveryTracking(deliveryId) {
    const key = REDIS_KEYS.DELIVERY_TRACKING(deliveryId);

    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } else {
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data;
        }
      }
    } catch (error) {
      logger.error('Error getting delivery tracking from cache:', error);
    }

    return null;
  }

  // Delete delivery tracking info
  async deleteDeliveryTracking(deliveryId) {
    const key = REDIS_KEYS.DELIVERY_TRACKING(deliveryId);

    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.cache.delete(key);
      }
    } catch (error) {
      logger.error('Error deleting delivery tracking from cache:', error);
    }
  }

  // Cache user socket mapping
  async setUserSocket(userId, socketId) {
    const key = REDIS_KEYS.USER_SOCKET(userId);

    try {
      if (this.redis) {
        await this.redis.setex(key, TIME_CONSTANTS.LOCATION_TTL / 1000, socketId);
      } else {
        this.cache.set(key, {
          data: socketId,
          expiry: Date.now() + TIME_CONSTANTS.LOCATION_TTL
        });
      }
    } catch (error) {
      logger.error('Error setting user socket in cache:', error);
    }
  }

  // Get user socket
  async getUserSocket(userId) {
    const key = REDIS_KEYS.USER_SOCKET(userId);

    try {
      if (this.redis) {
        return await this.redis.get(key);
      } else {
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data;
        }
      }
    } catch (error) {
      logger.error('Error getting user socket from cache:', error);
    }

    return null;
  }

  // Delete user socket
  async deleteUserSocket(userId) {
    const key = REDIS_KEYS.USER_SOCKET(userId);

    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.cache.delete(key);
      }
    } catch (error) {
      logger.error('Error deleting user socket from cache:', error);
    }
  }

  // Clean up expired cache entries
  cleanup() {
    if (!this.redis) {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (cached.expiry <= now) {
          this.cache.delete(key);
        }
      }
    }
  }

  // Get cache statistics
  async getStats() {
    const stats = {
      driverLocations: 0,
      deliveryTracking: 0,
      userSockets: 0,
      totalEntries: 0
    };

    try {
      if (this.redis) {
        stats.driverLocations = await this.redis.keys('driver:location:*').then(keys => keys.length);
        stats.deliveryTracking = await this.redis.keys('delivery:tracking:*').then(keys => keys.length);
        stats.userSockets = await this.redis.keys('user:socket:*').then(keys => keys.length);
      } else {
        for (const key of this.cache.keys()) {
          if (key.startsWith('driver:location:')) stats.driverLocations++;
          else if (key.startsWith('delivery:tracking:')) stats.deliveryTracking++;
          else if (key.startsWith('user:socket:')) stats.userSockets++;
        }
      }
    } catch (error) {
      logger.error('Error getting cache stats:', error);
    }

    stats.totalEntries = stats.driverLocations + stats.deliveryTracking + stats.userSockets;

    return stats;
  }

  // Clear all cache (for testing/admin)
  async clear() {
    try {
      if (this.redis) {
        const keys = await this.redis.keys('driver:location:*');
        keys.push(...await this.redis.keys('delivery:tracking:*'));
        keys.push(...await this.redis.keys('user:socket:*'));
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        this.cache.clear();
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }
}

// Create singleton instance
const locationCache = new LocationCache();

// Initialize on module load
locationCache.init().catch(error => {
  logger.error('Failed to initialize location cache:', error);
});

// Periodic cleanup
if (!locationCache.redis) {
  setInterval(() => {
    locationCache.cleanup();
  }, 60000); // Clean up every minute
}

module.exports = locationCache;