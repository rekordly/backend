const { prisma } = require('../../config/database');
const { AppError, NotFoundError } = require('../../shared/errors/app-error');
const { ORDER_STATUS, DRIVER_STATUS, PAYMENT_STATUS } = require('../../shared/enums');
const { calculateDistance, findNearestPoints } = require('../../shared/utils/geospatial');
const { calculateFare } = require('./helpers/fare-calculator');
const { matchDrivers } = require('./helpers/driver-matcher');
const { updateDeliveryStatus } = require('./helpers/status-machine');
const { REDIS_KEYS } = require('../../config/constants');
const { logger } = require('../../shared/utils/logger');
const driverService = require('../driver/driver.service');
const notificationService = require('../notification/notification.service');

class DeliveryService {
  // Create delivery request
  async createDelivery(userId, deliveryData) {
    const {
      pickupAddress,
      deliveryAddress,
      packageInfo,
      deliveryType = 'STANDARD',
      paymentMethod = 'CASH',
      specialInstructions = '',
      estimatedFare = null
    } = deliveryData;

    // Validate user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found');
    }

    // Calculate fare if not provided
    const fare = estimatedFare || await calculateFare({
      pickupAddress,
      deliveryAddress,
      deliveryType,
      packageInfo
    });

    // Create delivery
    const delivery = await prisma.delivery.create({
      data: {
        userId,
        pickupAddress: {
          create: pickupAddress
        },
        deliveryAddress: {
          create: deliveryAddress
        },
        packageInfo: {
          create: packageInfo
        },
        deliveryType,
        paymentMethod,
        specialInstructions,
        estimatedFare: fare.totalFare,
        distance: fare.distance,
        estimatedDuration: fare.duration,
        status: ORDER_STATUS.PENDING,
        paymentStatus: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true
          }
        },
        pickupAddress: true,
        deliveryAddress: true,
        packageInfo: true
      }
    });

    // Find and match drivers
    try {
      const matchedDrivers = await matchDrivers(delivery);
      
      if (matchedDrivers.length > 0) {
        // Update delivery with matched drivers
        await prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            matchedDrivers: {
              connect: matchedDrivers.map(driver => ({ id: driver.id }))
            }
          }
        });

        // Notify matched drivers
        await notificationService.sendNotificationToDrivers(
          matchedDrivers.map(d => d.userId),
          {
            type: 'NEW_DELIVERY_REQUEST',
            title: 'New Delivery Request',
            message: `New delivery request from ${delivery.user.fullName}`,
            data: {
              deliveryId: delivery.id,
              pickupAddress: delivery.pickupAddress,
              deliveryAddress: delivery.deliveryAddress,
              estimatedFare: delivery.estimatedFare
            }
          }
        );
      }
    } catch (error) {
      logger.error(`Failed to match drivers for delivery ${delivery.id}:`, error);
    }

    logger.info(`Delivery created: ${delivery.id} by user: ${userId}`);

    return delivery;
  }

  // Accept delivery by driver
  async acceptDelivery(deliveryId, driverId) {
    // Get delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        user: true
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Check if delivery can be accepted
    if (delivery.status !== ORDER_STATUS.PENDING) {
      throw new AppError('Delivery cannot be accepted', 400, 'INVALID_ORDER_STATUS');
    }

    // Check if driver is available
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true
      }
    });

    if (!driver || !driver.isAvailable || driver.status !== DRIVER_STATUS.ONLINE) {
      throw new AppError('Driver not available', 400, 'DRIVER_UNAVAILABLE');
    }

    // Update delivery
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        driverId,
        status: ORDER_STATUS.ACCEPTED,
        acceptedAt: new Date()
      },
      include: {
        user: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    });

    // Update driver status
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: DRIVER_STATUS.BUSY,
        isAvailable: false,
        currentDeliveryId: deliveryId
      }
    });

    // Notify user
    await notificationService.sendNotificationToUser(
      delivery.userId,
      {
        type: 'DELIVERY_ACCEPTED',
        title: 'Driver Assigned',
        message: `${driver.user.fullName} has accepted your delivery request`,
        data: {
          deliveryId: delivery.id,
          driver: {
            id: driver.id,
            name: driver.user.fullName,
            phone: driver.user.phoneNumber,
            vehicle: driver.vehicle
          }
        }
      }
    );

    logger.info(`Delivery ${deliveryId} accepted by driver ${driverId}`);

    return updatedDelivery;
  }

  // Update delivery status
  async updateDeliveryStatus(deliveryId, status, updateData = {}) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        user: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Validate status transition
    const validTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PICKUP_CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PICKUP_CONFIRMED]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED],
      [ORDER_STATUS.COMPLETED]: [],
      [ORDER_STATUS.CANCELLED]: [],
      [ORDER_STATUS.DISPUTED]: [ORDER_STATUS.RESOLVED, ORDER_STATUS.CANCELLED]
    };

    if (!validTransitions[delivery.status].includes(status)) {
      throw new AppError(`Invalid status transition from ${delivery.status} to ${status}`, 400, 'INVALID_STATUS_TRANSITION');
    }

    // Build update data
    const updateFields = {
      status,
      ...updateData
    };

    // Add timestamps based on status
    switch (status) {
      case ORDER_STATUS.PICKUP_CONFIRMED:
        updateFields.pickupConfirmedAt = new Date();
        break;
      case ORDER_STATUS.IN_TRANSIT:
        updateFields.inTransitAt = new Date();
        break;
      case ORDER_STATUS.DELIVERED:
        updateFields.deliveredAt = new Date();
        break;
      case ORDER_STATUS.COMPLETED:
        updateFields.completedAt = new Date();
        updateFields.paymentStatus = 'PAID';
        break;
      case ORDER_STATUS.CANCELLED:
        updateFields.cancelledAt = new Date();
        break;
    }

    // Update delivery
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateFields,
      include: {
        user: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    });

    // Update driver status if completed
    if (status === ORDER_STATUS.COMPLETED && delivery.driverId) {
      await prisma.driver.update({
        where: { id: delivery.driverId },
        data: {
          status: DRIVER_STATUS.ONLINE,
          isAvailable: true,
          currentDeliveryId: null,
          completedCount: { increment: 1 },
          totalEarnings: { increment: delivery.actualFare || delivery.estimatedFare }
        }
      });
    }

    // Send notifications
    const notificationData = {
      type: 'DELIVERY_STATUS_UPDATE',
      title: 'Delivery Status Updated',
      message: `Your delivery status is now ${status}`,
      data: {
        deliveryId: delivery.id,
        status,
        timestamp: new Date()
      }
    };

    // Notify user
    await notificationService.sendNotificationToUser(delivery.userId, notificationData);

    // Notify driver if applicable
    if (delivery.driverId) {
      await notificationService.sendNotificationToUser(delivery.driver.userId, notificationData);
    }

    logger.info(`Delivery ${deliveryId} status updated to ${status}`);

    return updatedDelivery;
  }

  // Get delivery by ID
  async getDeliveryById(deliveryId, userId = null, driverId = null) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            profilePictureUrl: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                profilePictureUrl: true
              }
            },
            vehicle: true
          }
        },
        pickupAddress: true,
        deliveryAddress: true,
        packageInfo: true,
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50
        }
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Check permissions
    if (userId && delivery.userId !== userId) {
      throw new AppError('Unauthorized to access this delivery', 403, 'UNAUTHORIZED');
    }

    if (driverId && delivery.driverId !== driverId) {
      throw new AppError('Unauthorized to access this delivery', 403, 'UNAUTHORIZED');
    }

    return delivery;
  }

  // Get user deliveries
  async getUserDeliveries(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId,
      ...(status && { status }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true
                }
              },
              vehicle: true
            }
          },
          pickupAddress: true,
          deliveryAddress: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.delivery.count({ where })
    ]);

    return {
      deliveries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Get driver deliveries
  async getDriverDeliveries(driverId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      driverId,
      ...(status && { status }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true
            }
          },
          pickupAddress: true,
          deliveryAddress: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.delivery.count({ where })
    ]);

    return {
      deliveries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Get nearby deliveries for driver
  async getNearbyDeliveries(driverId, latitude, longitude, radius = 10, limit = 20) {
    // Get driver
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver || !driver.isAvailable || driver.status !== DRIVER_STATUS.ONLINE) {
      throw new AppError('Driver not available', 400, 'DRIVER_UNAVAILABLE');
    }

    // Get pending deliveries within radius
    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        status: ORDER_STATUS.PENDING,
        driverId: null,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      include: {
        pickupAddress: true,
        user: {
          select: {
            id: true,
            fullName: true,
            rating: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Calculate distances and filter
    const nearbyDeliveries = pendingDeliveries
      .map(delivery => {
        const pickupLat = delivery.pickupAddress.latitude;
        const pickupLon = delivery.pickupAddress.longitude;
        const distance = calculateDistance(
          latitude,
          longitude,
          pickupLat,
          pickupLon
        );
        return { ...delivery, distance };
      })
      .filter(delivery => delivery.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyDeliveries;
  }

  // Cancel delivery
  async cancelDelivery(deliveryId, userId = null, driverId = null, reason = '') {
    // Get delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        driver: true,
        user: true
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Check if delivery can be cancelled
    if (delivery.status === ORDER_STATUS.COMPLETED || delivery.status === ORDER_STATUS.CANCELLED) {
      throw new AppError('Delivery cannot be cancelled', 400, 'INVALID_ORDER_STATUS');
    }

    // Check permissions
    let cancelledBy = 'SYSTEM';
    if (userId && delivery.userId === userId) {
      cancelledBy = 'USER';
    } else if (driverId && delivery.driverId === driverId) {
      cancelledBy = 'DRIVER';
    } else {
      throw new AppError('Unauthorized to cancel this delivery', 403, 'UNAUTHORIZED');
    }

    // Update delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: ORDER_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason
      },
      include: {
        user: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    });

    // Update driver status if assigned
    if (delivery.driverId) {
      await prisma.driver.update({
        where: { id: delivery.driverId },
        data: {
          status: DRIVER_STATUS.ONLINE,
          currentDeliveryId: null,
          isAvailable: true
        }
      });
    }

    logger.info(`Delivery ${deliveryId} cancelled by ${cancelledBy}, reason: ${reason}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return updatedDelivery;
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

    // Update driver location if driver is assigned
    if (delivery.driverId) {
      const driverService = require('../driver/driver.service');
      await driverService.updateDriverLocation(delivery.driverId, {
        latitude,
        longitude,
        timestamp,
        bearing,
        speed,
        accuracy
      });
    }

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

  // Get delivery statistics
  async getDeliveryStatistics(filters = {}) {
    const {
      startDate,
      endDate,
      driverId,
      userId,
      status
    } = filters;

    // Build where clause
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(driverId && { driverId }),
      ...(userId && { userId }),
      ...(status && { status })
    };

    // Get statistics
    const [
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      disputedDeliveries,
      totalEarnings,
      totalDistance
    ] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.delivery.count({ 
        where: { 
          ...where, 
          status: ORDER_STATUS.COMPLETED 
        } 
      }),
      prisma.delivery.count({ 
        where: { 
          ...where, 
          status: ORDER_STATUS.CANCELLED 
        } 
      }),
      prisma.delivery.count({ 
        where: { 
          ...where, 
          status: ORDER_STATUS.DISPUTED 
        } 
      }),
      prisma.delivery.aggregate({
        where: {
          ...where,
          status: ORDER_STATUS.COMPLETED
        },
        _sum: {
          actualFare: true
        }
      }),
      prisma.delivery.aggregate({
        where: {
          ...where,
          status: ORDER_STATUS.COMPLETED
        },
        _sum: {
          distance: true
        }
      })
    ]);

    const completionRate = totalDeliveries > 0 ? 
      (completedDeliveries / totalDeliveries) * 100 : 0;
    const cancellationRate = totalDeliveries > 0 ? 
      (cancelledDeliveries / totalDeliveries) * 100 : 0;
    const disputeRate = totalDeliveries > 0 ? 
      (disputedDeliveries / totalDeliveries) * 100 : 0;

    const averageFare = completedDeliveries > 0 ? 
      (totalEarnings._sum.actualFare || 0) / completedDeliveries : 0;
    const averageDistance = completedDeliveries > 0 ? 
      (totalDistance._sum.distance || 0) / completedDeliveries : 0;

    return {
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      disputedDeliveries,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      disputeRate: Math.round(disputeRate * 100) / 100,
      totalEarnings: totalEarnings._sum.actualFare || 0,
      averageFare: Math.round(averageFare * 100) / 100,
      totalDistance: totalDistance._sum.distance || 0,
      averageDistance: Math.round(averageDistance * 100) / 100
    };
  }

  // Get delivery analytics
  async getDeliveryAnalytics(filters = {}) {
    const {
      startDate,
      endDate,
      driverId,
      userId,
      groupBy = 'day'
    } = filters;

    // Build where clause
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(driverId && { driverId }),
      ...(userId && { userId })
    };

    // Get analytics based on groupBy
    let analytics;
    switch (groupBy) {
      case 'day':
        analytics = await this.getDailyAnalytics(where);
        break;
      case 'week':
        analytics = await this.getWeeklyAnalytics(where);
        break;
      case 'month':
        analytics = await this.getMonthlyAnalytics(where);
        break;
      default:
        analytics = await this.getDailyAnalytics(where);
    }

    return analytics;
  }

  // Get daily analytics
  async getDailyAnalytics(where) {
    const analytics = await prisma.delivery.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      },
      _sum: {
        actualFare: true,
        distance: true
      },
      orderBy: {
        status: 'asc'
      }
    });

    return analytics;
  }

  // Get weekly analytics
  async getWeeklyAnalytics(where) {
    const analytics = await prisma.delivery.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      },
      _sum: {
        actualFare: true,
        distance: true
      },
      orderBy: {
        status: 'asc'
      }
    });

    return analytics;
  }

  // Get monthly analytics
  async getMonthlyAnalytics(where) {
    const analytics = await prisma.delivery.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      },
      _sum: {
        actualFare: true,
        distance: true
      },
      orderBy: {
        status: 'asc'
      }
    });

    return analytics;
  }

  // Auto-cancel pending deliveries
  async autoCancelPendingDeliveries() {
    const timeout = 30 * 60 * 1000; // 30 minutes

    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        status: ORDER_STATUS.PENDING,
        createdAt: {
          lte: new Date(Date.now() - timeout)
        }
      }
    });

    const cancelledDeliveries = await Promise.all(
      pendingDeliveries.map(delivery => 
        this.cancelDelivery(
          delivery.id,
          null,
          null,
          'Auto-cancelled due to timeout'
        )
      )
    );

    logger.info(`Auto-cancelled ${cancelledDeliveries.length} pending deliveries`);

    return cancelledDeliveries;
  }

  // Auto-dispute deliveries
  async autoDisputeDeliveries() {
    const timeout = 24 * 60 * 60 * 1000; // 24 hours

    const disputedDeliveries = await prisma.delivery.findMany({
      where: {
        status: ORDER_STATUS.DELIVERED,
        deliveredAt: {
          lte: new Date(Date.now() - timeout)
        },
        paymentStatus: {
          not: PAYMENT_STATUS.PAID
        }
      }
    });

    const updatedDeliveries = await Promise.all(
      disputedDeliveries.map(delivery => 
        this.updateDeliveryStatus(
          delivery.id,
          ORDER_STATUS.DISPUTED,
          {
            disputeReason: 'Auto-disputed due to payment timeout'
          }
        )
      )
    );

    logger.info(`Auto-disputed ${updatedDeliveries.length} deliveries`);

    return updatedDeliveries;
  }
}

module.exports = new DeliveryService();