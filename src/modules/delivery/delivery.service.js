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