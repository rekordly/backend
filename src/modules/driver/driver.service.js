const { prisma } = require('../../config/database');
const { AppError, NotFoundError, ConflictError } = require('../../shared/errors/app-error');
const { DRIVER_STATUS, USER_ROLES, REDIS_KEYS, TIME_CONSTANTS } = require('../../config/constants');
const { calculateDistance, calculateETA } = require('../../shared/utils/geospatial');
const { startOfDay, endOfDay, addDays, addHours, addMinutes } = require('../../shared/utils/date');
const { DriverProfileDTO, DriverMetricsDTO, DriverEarningsDTO, DriverPerformanceDTO } = require('./dto/driver-profile.dto');
const { DriverMetricsDTO: MetricsDTO, DriverEarningsDTO: EarningsDTO, DriverPerformanceDTO: PerformanceDTO } = require('./dto/driver-metrics.dto');
const { logger } = require('../../shared/utils/logger');

class DriverService {
  // Get driver profile
  async getDriverProfile(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            locationState: true,
            profilePictureUrl: true,
            isActive: true
          }
        },
        vehicle: true,
        kycDocuments: {
          select: {
            id: true,
            type: true,
            status: true,
            fileName: true,
            createdAt: true,
            reviewedAt: true
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return new DriverProfileDTO(driver);
  }

  // Update driver profile
  async updateDriverProfile(driverId, updateData) {
    const { fullName, phoneNumber, email, locationState } = updateData;

    // Check if email or phone number is already taken by another user
    if (email || phoneNumber) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email, NOT: { id: driverId } }] : []),
            ...(phoneNumber ? [{ phoneNumber, NOT: { id: driverId } }] : [])
          ]
        }
      });

      if (existingUser) {
        throw new ConflictError('Email or phone number already taken');
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: driverId },
      data: {
        ...(fullName && { fullName }),
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
        ...(locationState && { locationState })
      }
    });

    // Get updated driver profile
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            locationState: true,
            profilePictureUrl: true,
            isActive: true
          }
        },
        vehicle: true
      }
    });

    logger.info(`Driver profile updated: ${driverId}`);

    return new DriverProfileDTO(driver);
  }

  // Update driver location
  async updateDriverLocation(driverId, locationData) {
    const { latitude, longitude, timestamp, bearing, speed, accuracy } = locationData;

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_LOCATION');
    }

    // Update driver status to ONLINE if currently LOGGED_IN
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let newStatus = driver.status;
    if (driver.status === DRIVER_STATUS.LOGGED_IN) {
      newStatus = DRIVER_STATUS.ONLINE;
    }

    // Update driver location and status
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
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

  // Update vehicle details
  async updateVehicleDetails(driverId, vehicleData) {
    const { vehicleType, plateNumber, vehicleModel, vehicleColor, vehicleYear, make } = vehicleData;

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { driverId }
    });

    let vehicle;
    if (existingVehicle) {
      // Update existing vehicle
      vehicle = await prisma.vehicle.update({
        where: { driverId },
        data: {
          vehicleType,
          plateNumber,
          vehicleModel,
          vehicleColor,
          vehicleYear,
          make
        }
      });
    } else {
      // Create new vehicle
      vehicle = await prisma.vehicle.create({
        data: {
          driverId,
          vehicleType,
          plateNumber,
          vehicleModel,
          vehicleColor,
          vehicleYear,
          make
        }
      });
    }

    logger.info(`Vehicle details updated for driver: ${driverId}`);

    return vehicle;
  }

  // Update driver availability
  async updateDriverAvailability(driverId, isAvailable) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check if driver is eligible to be available (KYC verified)
    if (isAvailable && driver.overallKycStatus !== 'VERIFIED') {
      throw new AppError('KYC verification required to be available', 403, 'KYC_PENDING');
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { isAvailable }
    });

    logger.info(`Driver availability updated: ${driverId}, available: ${isAvailable}`);

    return {
      driverId: updatedDriver.id,
      isAvailable: updatedDriver.isAvailable,
      status: updatedDriver.status
    };
  }

  // Update driver status
  async updateDriverStatus(driverId, status) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { status }
    });

    logger.info(`Driver status updated: ${driverId}, status: ${status}`);

    return updatedDriver;
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

  // Get driver metrics
  async getDriverMetrics(driverId, period = 'today') {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            fullName: true
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = addDays(startOfDay(now), -7);
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = addDays(startOfDay(now), -30);
        endDate = endOfDay(now);
        break;
      case 'year':
        startDate = addDays(startOfDay(now), -365);
        endDate = endOfDay(now);
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    // Get deliveries for the period
    const deliveries = await prisma.delivery.findMany({
      where: {
        driverId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate metrics
    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.actualFare || d.estimatedFare), 0);
    const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
    const totalTime = deliveries.reduce((sum, d) => {
      if (d.acceptedAt && d.completedAt) {
        return sum + (new Date(d.completedAt) - new Date(d.acceptedAt)) / (1000 * 60); // minutes
      }
      return sum;
    }, 0);

    const averageRating = driver.totalRatings > 0 ? driver.rating : 0;
    const averageDeliveryTime = totalDeliveries > 0 ? totalTime / totalDeliveries : 0;
    const cancellationRate = 0; // TODO: Calculate from cancelled deliveries

    const todayStats = {
      totalDeliveries,
      totalEarnings,
      averageRating,
      totalDistance,
      totalTime,
      averageDeliveryTime,
      cancellationRate
    };

    return new DriverMetricsDTO(driver, todayStats);
  }

  // Get driver earnings
  async getDriverEarnings(driverId, period = 'month', startDate = null, endDate = null) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let queryStartDate, queryEndDate;
    
    if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(endDate);
    } else {
      const now = new Date();
      switch (period) {
        case 'today':
          queryStartDate = startOfDay(now);
          queryEndDate = endOfDay(now);
          break;
        case 'week':
          queryStartDate = addDays(startOfDay(now), -7);
          queryEndDate = endOfDay(now);
          break;
        case 'month':
          queryStartDate = addDays(startOfDay(now), -30);
          queryEndDate = endOfDay(now);
          break;
        case 'year':
          queryStartDate = addDays(startOfDay(now), -365);
          queryEndDate = endOfDay(now);
          break;
        default:
          queryStartDate = addDays(startOfDay(now), -30);
          queryEndDate = endOfDay(now);
      }
    }

    // Get completed deliveries
    const deliveries = await prisma.delivery.findMany({
      where: {
        driverId,
        status: 'COMPLETED',
        completedAt: {
          gte: queryStartDate,
          lte: queryEndDate
        }
      }
    });

    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.actualFare || d.estimatedFare), 0);
    const todaysEarnings = driver.todaysEarnings;

    // Calculate earnings breakdown
    const earningsByDay = this.calculateEarningsByDay(deliveries);
    const earningsByWeek = this.calculateEarningsByWeek(deliveries);
    const earningsByMonth = this.calculateEarningsByMonth(deliveries);

    const earningsData = {
      totalEarnings,
      todaysEarnings,
      weeklyEarnings: earningsByWeek.reduce((sum, week) => sum + week.earnings, 0),
      monthlyEarnings: earningsByMonth.reduce((sum, month) => sum + month.earnings, 0),
      byDay: earningsByDay,
      byWeek: earningsByWeek,
      byMonth: earningsByMonth,
      averageEarningsPerDelivery: deliveries.length > 0 ? totalEarnings / deliveries.length : 0,
      averageEarningsPerHour: this.calculateEarningsPerHour(deliveries)
    };

    return new DriverEarningsDTO(earningsData);
  }

  // Get driver performance
  async getDriverPerformance(driverId, period = 'month') {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            fullName: true
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Get performance data
    const performanceData = await this.calculatePerformanceData(driverId, period);

    return new DriverPerformanceDTO(driver, performanceData);
  }

  // Get driver location history
  async getDriverLocationHistory(driverId, startDate = null, endDate = null, limit = 100, offset = 0) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    let queryStartDate = startDate ? new Date(startDate) : addDays(new Date(), -7);
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

  // Get driver dashboard
  async getDriverDashboard(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Get active delivery
    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        driverId,
        status: {
          in: ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF']
        }
      }
    });

    // Get new requests (pending deliveries near driver)
    const newRequests = await this.getNearbyPendingDeliveries(driverId);

    // Get today's metrics
    const todayMetrics = await this.getDriverMetrics(driverId, 'today');

    return {
      driver: {
        id: driver.id,
        status: driver.status,
        isAvailable: driver.isAvailable,
        todaysEarnings: driver.todaysEarnings,
        completedCount: driver.completedCount
      },
      activeDelivery,
      newRequests,
      metrics: todayMetrics
    };
  }

  // Helper methods
  calculateEarningsByDay(deliveries) {
    const earningsByDay = {};
    
    deliveries.forEach(delivery => {
      const date = new Date(delivery.completedAt).toISOString().split('T')[0];
      const fare = delivery.actualFare || delivery.estimatedFare;
      
      if (!earningsByDay[date]) {
        earningsByDay[date] = { date, earnings: 0, deliveries: 0 };
      }
      
      earningsByDay[date].earnings += fare;
      earningsByDay[date].deliveries += 1;
    });
    
    return Object.values(earningsByDay).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  calculateEarningsByWeek(deliveries) {
    const earningsByWeek = {};
    
    deliveries.forEach(delivery => {
      const date = new Date(delivery.completedAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      const fare = delivery.actualFare || delivery.estimatedFare;
      
      if (!earningsByWeek[weekKey]) {
        earningsByWeek[weekKey] = { weekStart: weekKey, earnings: 0, deliveries: 0 };
      }
      
      earningsByWeek[weekKey].earnings += fare;
      earningsByWeek[weekKey].deliveries += 1;
    });
    
    return Object.values(earningsByWeek).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
  }

  calculateEarningsByMonth(deliveries) {
    const earningsByMonth = {};
    
    deliveries.forEach(delivery => {
      const date = new Date(delivery.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const fare = delivery.actualFare || delivery.estimatedFare;
      
      if (!earningsByMonth[monthKey]) {
        earningsByMonth[monthKey] = { month: monthKey, earnings: 0, deliveries: 0 };
      }
      
      earningsByMonth[monthKey].earnings += fare;
      earningsByMonth[monthKey].deliveries += 1;
    });
    
    return Object.values(earningsByMonth).sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  calculateEarningsPerHour(deliveries) {
    let totalHours = 0;
    let totalEarnings = 0;
    
    deliveries.forEach(delivery => {
      if (delivery.acceptedAt && delivery.completedAt) {
        const duration = (new Date(delivery.completedAt) - new Date(delivery.acceptedAt)) / (1000 * 60 * 60); // hours
        totalHours += duration;
        totalEarnings += delivery.actualFare || delivery.estimatedFare;
      }
    });
    
    return totalHours > 0 ? totalEarnings / totalHours : 0;
  }

  async calculatePerformanceData(driverId, period) {
    // This is a simplified version - in production, you'd want more sophisticated calculations
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = addDays(startOfDay(now), -7);
        break;
      case 'month':
        startDate = addDays(startOfDay(now), -30);
        break;
      case 'year':
        startDate = addDays(startOfDay(now), -365);
        break;
      default:
        startDate = addDays(startOfDay(now), -30);
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        driverId,
        completedAt: {
          gte: startDate
        }
      }
    });

    const completedDeliveries = deliveries.filter(d => d.status === 'COMPLETED');
    const cancelledDeliveries = deliveries.filter(d => d.status === 'CANCELLED');

    return {
      completionRate: deliveries.length > 0 ? (completedDeliveries.length / deliveries.length) * 100 : 0,
      cancellationRate: deliveries.length > 0 ? (cancelledDeliveries.length / deliveries.length) * 100 : 0,
      onTimeRate: 95, // TODO: Calculate based on delivery times
      acceptanceRate: 85, // TODO: Calculate based on acceptance rate
      averageDeliveryTime: this.calculateAverageDeliveryTime(completedDeliveries),
      averageDistancePerDelivery: this.calculateAverageDistance(completedDeliveries),
      earningsPerHour: this.calculateEarningsPerHour(completedDeliveries),
      earningsPerKilometer: this.calculateEarningsPerKilometer(completedDeliveries),
      ratingBreakdown: {
        fiveStar: 80,
        fourStar: 15,
        threeStar: 3,
        twoStar: 1,
        oneStar: 1,
        totalRatings: 100
      },
      positiveFeedback: 90,
      negativeFeedback: 10,
      complaints: 2,
      compliments: 15
    };
  }

  calculateAverageDeliveryTime(deliveries) {
    if (deliveries.length === 0) return 0;
    
    const totalTime = deliveries.reduce((sum, d) => {
      if (d.acceptedAt && d.completedAt) {
        return sum + (new Date(d.completedAt) - new Date(d.acceptedAt)) / (1000 * 60); // minutes
      }
      return sum;
    }, 0);
    
    return totalTime / deliveries.length;
  }

  calculateAverageDistance(deliveries) {
    if (deliveries.length === 0) return 0;
    
    const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
    return totalDistance / deliveries.length;
  }

  calculateEarningsPerKilometer(deliveries) {
    if (deliveries.length === 0) return 0;
    
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.actualFare || d.estimatedFare), 0);
    const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
    
    return totalDistance > 0 ? totalEarnings / totalDistance : 0;
  }

  async getNearbyPendingDeliveries(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Get driver's current location from Redis or database
    const redis = require('../../config/redis').getRedisClient();
    let driverLocation;
    
    try {
      const locationData = await redis.get(REDIS_KEYS.DRIVER_LOCATION(driverId));
      if (locationData) {
        driverLocation = JSON.parse(locationData);
      }
    } catch (error) {
      logger.error('Error getting driver location from Redis:', error);
    }

    if (!driverLocation) {
      // Get from database
      const latestLocation = await prisma.driverLocation.findFirst({
        where: { driverId },
        orderBy: { timestamp: 'desc' }
      });
      
      if (latestLocation) {
        driverLocation = {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude
        };
      }
    }

    if (!driverLocation) {
      return [];
    }

    // Get pending deliveries within radius
    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: addMinutes(new Date(), -30) // Only recent deliveries
        }
      }
    });

    // Filter by distance and sort
    const nearbyDeliveries = pendingDeliveries
      .map(delivery => {
        const pickupLat = delivery.pickupAddress.latitude;
        const pickupLon = delivery.pickupAddress.longitude;
        const distance = calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          pickupLat,
          pickupLon
        );
        return { ...delivery, distance };
      })
      .filter(delivery => delivery.distance <= 10) // 10km radius
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    return nearbyDeliveries;
  }
}

module.exports = new DriverService();