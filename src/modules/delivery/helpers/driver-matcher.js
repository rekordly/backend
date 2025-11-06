const { calculateDistance, findNearestPoints } = require('../../../shared/utils/geospatial');
const { DRIVER_STATUS, REDIS_KEYS, TIME_CONSTANTS } = require('../../../config/constants');

class DriverMatcher {
  constructor() {
    // Matching configuration
    this.config = {
      maxDistance: 10, // Maximum distance in km
      maxDrivers: 5, // Maximum number of drivers to notify
      driverTimeout: 30000, // 30 seconds for driver to respond
      retryAttempts: 2, // Number of retry attempts if no driver accepts
      retryDelay: 10000, // 10 seconds between retries
      minRating: 3.0, // Minimum driver rating
      maxActiveDeliveries: 1, // Maximum active deliveries per driver
      requiredVehicleTypes: ['BIKE', 'CAR', 'VAN', 'TRUCK']
    };

    // Scoring weights for driver matching
    this.scoringWeights = {
      distance: 0.4, // 40% weight for distance
      rating: 0.3, // 30% weight for rating
      availability: 0.2, // 20% weight for availability
      experience: 0.1 // 10% weight for experience
    };
  }

  // Find best drivers for a delivery
  async findBestDrivers(pickupCoords, deliveryDetails, options = {}) {
    const {
      vehicleType = null,
      maxDistance = this.config.maxDistance,
      maxDrivers = this.config.maxDrivers,
      excludeDrivers = []
    } = options;

    try {
      // Get available drivers
      const availableDrivers = await this.getAvailableDrivers(pickupCoords, maxDistance, vehicleType, excludeDrivers);

      if (availableDrivers.length === 0) {
        return { drivers: [], message: 'No available drivers found' };
      }

      // Score and rank drivers
      const scoredDrivers = await this.scoreDrivers(availableDrivers, pickupCoords, deliveryDetails);

      // Sort by score (highest first)
      scoredDrivers.sort((a, b) => b.score - a.score);

      // Return top drivers
      const bestDrivers = scoredDrivers.slice(0, maxDrivers);

      return {
        drivers: bestDrivers,
        totalAvailable: availableDrivers.length,
        message: `Found ${bestDrivers.length} suitable drivers`
      };
    } catch (error) {
      console.error('Error finding best drivers:', error);
      return { drivers: [], message: 'Error finding drivers' };
    }
  }

  // Get available drivers within radius
  async getAvailableDrivers(pickupCoords, maxDistance, vehicleType = null, excludeDrivers = []) {
    try {
      // Get drivers from Redis (real-time locations)
      const redis = require('../../../config/redis').getRedisClient();
      const driverKeys = await redis.keys('driver:location:*');
      
      let drivers = [];
      
      for (const key of driverKeys) {
        const locationData = await redis.get(key);
        if (locationData) {
          const driverLocation = JSON.parse(locationData);
          
          // Check if driver is available and meets criteria
          if (this.isDriverEligible(driverLocation, vehicleType, excludeDrivers)) {
            const distance = calculateDistance(
              pickupCoords.latitude,
              pickupCoords.longitude,
              driverLocation.latitude,
              driverLocation.longitude
            );
            
            if (distance <= maxDistance) {
              drivers.push({
                ...driverLocation,
                distance,
                redisKey: key
              });
            }
          }
        }
      }

      // If Redis doesn't have enough drivers, fallback to database
      if (drivers.length < 3) {
        const dbDrivers = await this.getDriversFromDatabase(pickupCoords, maxDistance, vehicleType, excludeDrivers);
        drivers = [...drivers, ...dbDrivers];
      }

      // Remove duplicates
      const uniqueDrivers = drivers.filter((driver, index, self) =>
        index === self.findIndex(d => d.driverId === driver.driverId)
      );

      return uniqueDrivers;
    } catch (error) {
      console.error('Error getting available drivers:', error);
      return [];
    }
  }

  // Get drivers from database (fallback)
  async getDriversFromDatabase(pickupCoords, maxDistance, vehicleType = null, excludeDrivers = []) {
    try {
      const { prisma } = require('../../../config/database');
      
      const where = {
        status: DRIVER_STATUS.ONLINE,
        isAvailable: true,
        overallKycStatus: 'VERIFIED',
        currentDeliveryId: null, // Not currently on a delivery
        id: {
          notIn: excludeDrivers
        }
      };

      // Add vehicle type filter if specified
      if (vehicleType) {
        where.vehicle = {
          vehicleType
        };
      }

      const drivers = await prisma.driver.findMany({
        where,
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

      // Filter by distance and add distance info
      const driversWithDistance = drivers
        .map(driver => {
          const distance = calculateDistance(
            pickupCoords.latitude,
            pickupCoords.longitude,
            driver.latitude || 0,
            driver.longitude || 0
          );
          
          return {
            ...driver,
            distance,
            latitude: driver.latitude,
            longitude: driver.longitude,
            status: driver.status,
            timestamp: driver.lastLocationUpdate
          };
        })
        .filter(driver => driver.distance <= maxDistance);

      return driversWithDistance;
    } catch (error) {
      console.error('Error getting drivers from database:', error);
      return [];
    }
  }

  // Check if driver is eligible for matching
  isDriverEligible(driver, vehicleType = null, excludeDrivers = []) {
    // Check if driver is in exclude list
    if (excludeDrivers.includes(driver.driverId)) {
      return false;
    }

    // Check driver status
    if (driver.status !== DRIVER_STATUS.ONLINE || !driver.isAvailable) {
      return false;
    }

    // Check KYC status
    if (driver.overallKycStatus !== 'VERIFIED') {
      return false;
    }

    // Check if driver is currently on a delivery
    if (driver.currentDeliveryId) {
      return false;
    }

    // Check vehicle type if specified
    if (vehicleType && driver.vehicle?.vehicleType !== vehicleType) {
      return false;
    }

    // Check minimum rating
    if (driver.rating < this.config.minRating) {
      return false;
    }

    // Check if location is recent (within last 5 minutes)
    const locationAge = Date.now() - new Date(driver.timestamp).getTime();
    if (locationAge > TIME_CONSTANTS.LOCATION_UPDATE_INTERVAL * 2) {
      return false;
    }

    return true;
  }

  // Score drivers based on various factors
  async scoreDrivers(drivers, pickupCoords, deliveryDetails) {
    const scoredDrivers = [];

    for (const driver of drivers) {
      const score = await this.calculateDriverScore(driver, pickupCoords, deliveryDetails);
      scoredDrivers.push({
        ...driver,
        score,
        scoreBreakdown: this.getScoreBreakdown(driver, pickupCoords, deliveryDetails)
      });
    }

    return scoredDrivers;
  }

  // Calculate individual driver score
  async calculateDriverScore(driver, pickupCoords, deliveryDetails) {
    let score = 0;

    // Distance score (closer is better)
    const distanceScore = this.calculateDistanceScore(driver.distance);
    score += distanceScore * this.scoringWeights.distance;

    // Rating score (higher rating is better)
    const ratingScore = this.calculateRatingScore(driver.rating);
    score += ratingScore * this.scoringWeights.rating;

    // Availability score (based on current status and recent activity)
    const availabilityScore = await this.calculateAvailabilityScore(driver);
    score += availabilityScore * this.scoringWeights.availability;

    // Experience score (based on completed deliveries)
    const experienceScore = this.calculateExperienceScore(driver);
    score += experienceScore * this.scoringWeights.experience;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  // Calculate distance score (0-100)
  calculateDistanceScore(distance) {
    // Score decreases with distance
    const maxDistance = this.config.maxDistance;
    if (distance <= 1) return 100; // Very close
    if (distance <= 3) return 80; // Close
    if (distance <= 5) return 60; // Moderate
    if (distance <= 8) return 40; // Far
    return 20; // Very far
  }

  // Calculate rating score (0-100)
  calculateRatingScore(rating) {
    if (!rating || rating === 0) return 0;
    return Math.min(100, (rating / 5) * 100);
  }

  // Calculate availability score (0-100)
  async calculateAvailabilityScore(driver) {
    let score = 100;

    // Deduct points if location is not recent
    const locationAge = Date.now() - new Date(driver.timestamp).getTime();
    if (locationAge > TIME_CONSTANTS.LOCATION_UPDATE_INTERVAL) {
      score -= 20;
    }

    // Deduct points if driver has been idle for too long
    const idleTime = Date.now() - new Date(driver.lastLocationUpdate).getTime();
    if (idleTime > 3600000) { // 1 hour
      score -= 10;
    }

    return Math.max(0, score);
  }

  // Calculate experience score (0-100)
  calculateExperienceScore(driver) {
    if (!driver.completedCount) return 0;
    
    // Score based on number of completed deliveries
    const deliveries = driver.completedCount;
    if (deliveries >= 1000) return 100;
    if (deliveries >= 500) return 90;
    if (deliveries >= 200) return 80;
    if (deliveries >= 100) return 70;
    if (deliveries >= 50) return 60;
    if (deliveries >= 20) return 50;
    if (deliveries >= 10) return 40;
    if (deliveries >= 5) return 30;
    return 20;
  }

  // Get detailed score breakdown
  getScoreBreakdown(driver, pickupCoords, deliveryDetails) {
    return {
      distance: {
        score: this.calculateDistanceScore(driver.distance),
        weight: this.scoringWeights.distance,
        value: driver.distance
      },
      rating: {
        score: this.calculateRatingScore(driver.rating),
        weight: this.scoringWeights.rating,
        value: driver.rating
      },
      availability: {
        score: 80, // Placeholder
        weight: this.scoringWeights.availability,
        value: driver.status
      },
      experience: {
        score: this.calculateExperienceScore(driver),
        weight: this.scoringWeights.experience,
        value: driver.completedCount
      }
    };
  }

  // Notify drivers about new delivery
  async notifyDrivers(drivers, deliveryId, deliveryDetails) {
    const notifications = [];

    for (const driver of drivers) {
      try {
        // Send notification via Socket.IO
        const io = require('../../../config/socket').getIO();
        io.to(`driver:${driver.driverId}`).emit('new_delivery', {
          deliveryId,
          deliveryDetails,
          driverInfo: {
            distance: driver.distance,
            estimatedTime: this.calculateEstimatedTime(driver.distance)
          }
        });

        // Store notification in database
        await this.storeDriverNotification(driver.driverId, deliveryId);

        notifications.push({
          driverId: driver.driverId,
          status: 'sent',
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error notifying driver ${driver.driverId}:`, error);
        notifications.push({
          driverId: driver.driverId,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
      }
    }

    return notifications;
  }

  // Calculate estimated time for driver to reach pickup
  calculateEstimatedTime(distance) {
    // Average speed in city: 30 km/h
    const avgSpeed = 30;
    const timeInMinutes = (distance / avgSpeed) * 60;
    return Math.round(timeInMinutes);
  }

  // Store driver notification in database
  async storeDriverNotification(driverId, deliveryId) {
    try {
      const { prisma } = require('../../../config/database');
      
      await prisma.notification.create({
        data: {
          userId: driverId,
          type: 'NEW_ORDER',
          title: 'New Delivery Request',
          message: 'A new delivery request is available in your area',
          data: {
            deliveryId,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error storing driver notification:', error);
    }
  }

  // Handle driver response to delivery request
  async handleDriverResponse(driverId, deliveryId, response) {
    try {
      const { prisma } = require('../../../config/database');
      
      // Update notification status
      await prisma.notification.updateMany({
        where: {
          userId: driverId,
          type: 'NEW_ORDER',
          data: {
            path: ['deliveryId'],
            equals: deliveryId
          }
        },
        data: {
          data: {
            response,
            respondedAt: new Date().toISOString()
          }
        }
      });

      return { success: true, message: 'Driver response recorded' };
    } catch (error) {
      console.error('Error handling driver response:', error);
      return { success: false, message: 'Error recording driver response' };
    }
  }

  // Get driver matching statistics
  async getMatchingStatistics() {
    try {
      const { prisma } = require('../../../config/database');
      
      // Get total deliveries
      const totalDeliveries = await prisma.delivery.count();
      
      // Get successful matches
      const successfulMatches = await prisma.delivery.count({
        where: {
          driverId: { not: null },
          status: { not: 'PENDING' }
        }
      });
      
      // Get failed matches
      const failedMatches = await prisma.delivery.count({
        where: {
          driverId: null,
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
          }
        }
      });

      return {
        totalDeliveries,
        successfulMatches,
        failedMatches,
        successRate: totalDeliveries > 0 ? (successfulMatches / totalDeliveries) * 100 : 0,
        averageMatchingTime: 0 // Would need to calculate from actual data
      };
    } catch (error) {
      console.error('Error getting matching statistics:', error);
      return {
        totalDeliveries: 0,
        successfulMatches: 0,
        failedMatches: 0,
        successRate: 0,
        averageMatchingTime: 0
      };
    }
  }
}

module.exports = new DriverMatcher();