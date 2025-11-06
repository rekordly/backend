const { prisma } = require('../../config/database');
const { AppError, NotFoundError } = require('../../shared/errors/app-error');
const { DRIVER_STATUS, REDIS_KEYS, TIME_CONSTANTS } = require('../../config/constants');
const { calculateDistance, calculateETA } = require('../../shared/utils/geospatial');
const { logger } = require('../../shared/utils/logger');

class LocationService {
  // Update driver location
  async updateDriverLocation(driverId, locationData) {
    const { latitude, longitude, timestamp, bearing, speed, accuracy } = locationData;

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_LOCATION');
    }

    // Get driver
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Update driver status to ONLINE if currently LOGGED_IN
    let newStatus = driver.status;
    if (driver.status === DRIVER_STATUS.LOGGED_IN) {
      newStatus = DRIVER_STATUS.ONLINE;
    }

    // Update driver location and status
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        latitude,
        longitude,
        status: newStatus,
        lastLocationUpdate: new Date(timestamp || Date.now())
      }
    });

    // Store location in database for history
    await prisma.driverLocation.create({
      data: {
        driverId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()),
        status: newStatus,
        bearing,
        speed,
        accuracy
      }
    });

    // Store location in Redis for real-time access
    const redis = require('../../config/redis').getRedisClient();
    await redis.setex(
      REDIS_KEYS.DRIVER_LOCATION(driverId),
      TIME_CONSTANTS.LOCATION_TTL / 1000,
      JSON.stringify({
        driverId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()).toISOString(),
        status: newStatus,
        bearing,
        speed,
        accuracy
      })
    );

    // Update driver location in active delivery if any
    if (driver.currentDeliveryId) {
      await this.updateDeliveryLocation(driver.currentDeliveryId, {
        latitude,
        longitude,
        timestamp,
        status: newStatus,
        bearing,
        speed,
        accuracy
      });
    }

    logger.info(`Driver location updated: ${driverId}`);

    return {
      driverId,
      latitude,
      longitude,
      timestamp: new Date(timestamp || Date.now()),
      status: newStatus,
      bearing,
      speed,
      accuracy
    };
  }

  // Get driver location
  async getDriverLocation(driverId) {
    // Try to get from Redis first
    const redis = require('../../config/redis').getRedisClient();
    
    try {
      const locationData = await redis.get(REDIS_KEYS.DRIVER_LOCATION(driverId));
      if (locationData) {
        return JSON.parse(locationData);
      }
    } catch (error) {
      logger.error('Error getting driver location from Redis:', error);
    }

    // Get from database
    const latestLocation = await prisma.driverLocation.findFirst({
      where: { driverId },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestLocation) {
      throw new NotFoundError('Driver location not found');
    }

    return {
      driverId: latestLocation.driverId,
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      timestamp: latestLocation.timestamp,
      status: latestLocation.status,
      bearing: latestLocation.bearing,
      speed: latestLocation.speed,
      accuracy: latestLocation.accuracy
    };
  }

  // Get driver location history
  async getDriverLocationHistory(driverId, startDate = null, endDate = null, limit = 100, offset = 0) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let queryStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let queryEndDate = endDate ? new Date(endDate) : new Date();

    const locations = await prisma.driverLocation.findMany({
      where: {
        driverId,
        timestamp: {
          gte: queryStartDate,
          lte: queryEndDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    return locations;
  }

  // Update delivery location
  async updateDeliveryLocation(deliveryId, locationData) {
    const { latitude, longitude, timestamp, status, bearing, speed, accuracy } = locationData;

    // Get delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Create tracking record
    const tracking = await prisma.deliveryTracking.create({
      data: {
        deliveryId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()),
        status: status || delivery.status,
        bearing,
        speed,
        accuracy
      }
    });

    // Store in Redis for real-time access
    const redis = require('../../config/redis').getRedisClient();
    await redis.setex(
      REDIS_KEYS.DELIVERY_TRACKING(deliveryId),
      300, // 5 minutes TTL
      JSON.stringify({
        deliveryId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()).toISOString(),
        status: status || delivery.status,
        bearing,
        speed,
        accuracy
      })
    );

    logger.info(`Delivery location updated: ${deliveryId}`);

    return tracking;
  }

  // Get delivery location
  async getDeliveryLocation(deliveryId) {
    // Try to get from Redis first
    const redis = require('../../config/redis').getRedisClient();
    
    try {
      const locationData = await redis.get(REDIS_KEYS.DELIVERY_TRACKING(deliveryId));
      if (locationData) {
        return JSON.parse(locationData);
      }
    } catch (error) {
      logger.error('Error getting delivery location from Redis:', error);
    }

    // Get from database
    const latestTracking = await prisma.deliveryTracking.findFirst({
      where: { deliveryId },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestTracking) {
      throw new NotFoundError('Delivery location not found');
    }

    return {
      deliveryId: latestTracking.deliveryId,
      latitude: latestTracking.latitude,
      longitude: latestTracking.longitude,
      timestamp: latestTracking.timestamp,
      status: latestTracking.status,
      bearing: latestTracking.bearing,
      speed: latestTracking.speed,
      accuracy: latestTracking.accuracy
    };
  }

  // Get delivery tracking history
  async getDeliveryTrackingHistory(deliveryId, limit = 50, offset = 0) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    const tracking = await prisma.deliveryTracking.findMany({
      where: { deliveryId },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    return tracking;
  }

  // Get nearby drivers
  async getNearbyDrivers(latitude, longitude, radius = 10, limit = 10, vehicleType = null) {
    // Get all available drivers with their latest locations
    const drivers = await prisma.driver.findMany({
      where: {
        status: DRIVER_STATUS.ONLINE,
        isAvailable: true,
        overallKycStatus: 'VERIFIED',
        ...(vehicleType && { vehicle: { vehicleType } })
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        vehicle: true
      }
    });

    // Filter by distance and sort
    const nearbyDrivers = drivers
      .map(driver => {
        const distance = calculateDistance(latitude, longitude, driver.latitude || 0, driver.longitude || 0);
        return { ...driver, distance };
      })
      .filter(driver => driver.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyDrivers;
  }

  // Get driver location from Redis (for real-time)
  async getDriverLocationFromRedis(driverId) {
    const redis = require('../../config/redis').getRedisClient();
    
    try {
      const locationData = await redis.get(REDIS_KEYS.DRIVER_LOCATION(driverId));
      if (locationData) {
        return JSON.parse(locationData);
      }
    } catch (error) {
      logger.error('Error getting driver location from Redis:', error);
    }

    return null;
  }

  // Get delivery location from Redis (for real-time)
  async getDeliveryLocationFromRedis(deliveryId) {
    const redis = require('../../config/redis').getRedisClient();
    
    try {
      const locationData = await redis.get(REDIS_KEYS.DELIVERY_TRACKING(deliveryId));
      if (locationData) {
        return JSON.parse(locationData);
      }
    } catch (error) {
      logger.error('Error getting delivery location from Redis:', error);
    }

    return null;
  }

  // Batch update driver locations (for bulk operations)
  async batchUpdateDriverLocations(locations) {
    const results = [];
    
    for (const location of locations) {
      try {
        const result = await this.updateDriverLocation(location.driverId, location);
        results.push({ success: true, driverId: location.driverId, result });
      } catch (error) {
        results.push({ success: false, driverId: location.driverId, error: error.message });
      }
    }

    return results;
  }

  // Clean up old location data
  async cleanupOldLocationData(daysToKeep = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up driver locations
    const deletedDriverLocations = await prisma.driverLocation.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    // Clean up delivery tracking
    const deletedDeliveryTracking = await prisma.deliveryTracking.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${deletedDriverLocations.count} driver locations and ${deletedDeliveryTracking.count} delivery tracking records`);

    return {
      deletedDriverLocations: deletedDriverLocations.count,
      deletedDeliveryTracking: deletedDeliveryTracking.count
    };
  }

  // Get driver location statistics
  async getDriverLocationStatistics(driverId, period = 'day') {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let startDate;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get location statistics
    const locations = await prisma.driverLocation.findMany({
      where: {
        driverId,
        timestamp: {
          gte: startDate
        }
      }
    });

    if (locations.length === 0) {
      return {
        totalLocations: 0,
        averageSpeed: 0,
        totalDistance: 0,
        coverageArea: 0
      };
    }

    // Calculate statistics
    let totalDistance = 0;
    let totalSpeed = 0;
    const coordinates = [];

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      const distance = calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      
      totalDistance += distance;
      totalSpeed += curr.speed || 0;
      
      coordinates.push([curr.latitude, curr.longitude]);
    }

    const averageSpeed = locations.length > 0 ? totalSpeed / locations.length : 0;

    // Calculate coverage area (simplified - bounding box)
    const lats = locations.map(loc => loc.latitude);
    const lons = locations.map(loc => loc.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    const coverageArea = calculateDistance(minLat, minLon, maxLat, maxLon);

    return {
      totalLocations: locations.length,
      averageSpeed: Math.round(averageSpeed * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      coverageArea: Math.round(coverageArea * 100) / 100
    };
  }

  // Get geofence events
  async getGeofenceEvents(driverId, startDate = null, endDate = null) {
    // This would be implemented with geofencing logic
    // For now, return empty array
    return [];
  }

  // Create geofence
  async createGeofence(geofenceData) {
    // This would be implemented with geofencing logic
    // For now, return mock data
    return {
      id: 'mock-geofence-id',
      ...geofenceData,
      createdAt: new Date()
    };
  }
}

module.exports = new LocationService();