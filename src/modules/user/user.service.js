const { prisma } = require('../../config/database');
const { AppError, NotFoundError, ConflictError } = require('../../shared/errors/app-error');
const { USER_ROLES, ORDER_STATUS, PAYMENT_STATUS } = require('../../config/constants');
const { calculateDistance, calculateETA } = require('../../shared/utils/geospatial');
const { startOfDay, endOfDay, addDays, addHours, addMinutes } = require('../../shared/utils/date');
const { logger } = require('../../shared/utils/logger');

class UserService {
  // Get user profile
  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        locationState: true,
        profilePictureUrl: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    const { fullName, phoneNumber, email, locationState } = updateData;

    // Check if email or phone number is already taken by another user
    if (email || phoneNumber) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email, NOT: { id: userId } }] : []),
            ...(phoneNumber ? [{ phoneNumber, NOT: { id: userId } }] : [])
          ]
        }
      });

      if (existingUser) {
        throw new ConflictError('Email or phone number already taken');
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
        ...(locationState && { locationState })
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        locationState: true,
        profilePictureUrl: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    logger.info(`User profile updated: ${userId}`);

    return updatedUser;
  }

  // Create delivery
  async createDelivery(userId, deliveryData) {
    const {
      pickupAddress,
      dropoffAddress,
      receiverPhoneNumber,
      goodsImageUrl,
      estimatedFare,
      paymentMethod,
      packageDetails
    } = deliveryData;

    // Calculate distance and duration
    const distance = calculateDistance(
      pickupAddress.latitude,
      pickupAddress.longitude,
      dropoffAddress.latitude,
      dropoffAddress.longitude
    );

    const eta = calculateETA(distance);
    const duration = eta.totalMinutes;

    // Create delivery
    const delivery = await prisma.delivery.create({
      data: {
        userId,
        pickupAddress,
        dropoffAddress,
        receiverPhoneNumber,
        goodsImageUrl,
        estimatedFare,
        distance,
        duration,
        paymentMethod,
        packageDetails,
        status: ORDER_STATUS.PENDING,
        paymentStatus: PAYMENT_STATUS.PENDING
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        }
      }
    });

    logger.info(`New delivery created: ${delivery.id} by user: ${userId}`);

    // TODO: Send notification to nearby drivers
    // This would be implemented with the notification service

    return delivery;
  }

  // Estimate fare
  async estimateFare(pickupCoords, dropoffCoords, packageDetails = {}) {
    // Calculate distance
    const distance = calculateDistance(
      pickupCoords.latitude,
      pickupCoords.longitude,
      dropoffCoords.latitude,
      dropoffCoords.longitude
    );

    // Calculate base fare
    let baseFare = 500; // Base fare in local currency
    let distanceRate = 100; // Rate per kilometer
    let timeRate = 2; // Rate per minute

    // Calculate distance cost
    const distanceCost = distance * distanceRate;

    // Calculate time cost (estimated)
    const eta = calculateETA(distance);
    const timeCost = eta.totalMinutes * timeRate;

    // Calculate package surcharges
    let packageSurcharge = 0;
    if (packageDetails) {
      // Weight surcharge
      if (packageDetails.weight && packageDetails.weight > 5) {
        packageSurcharge += (packageDetails.weight - 5) * 50;
      }

      // Fragile items surcharge
      if (packageDetails.isFragile) {
        packageSurcharge += 200;
      }

      // Special handling surcharge
      if (packageDetails.requiresSpecialHandling) {
        packageSurcharge += 300;
      }

      // Large package surcharge
      if (packageDetails.dimensions) {
        const { length, width, height } = packageDetails.dimensions;
        const volume = length * width * height;
        if (volume > 50000) { // Large volume
          packageSurcharge += 400;
        }
      }
    }

    // Calculate total fare
    const totalFare = baseFare + distanceCost + timeCost + packageSurcharge;

    // Apply minimum fare
    const minimumFare = 800;
    const finalFare = Math.max(totalFare, minimumFare);

    return {
      estimatedFare: Math.round(finalFare),
      distance: Math.round(distance * 100) / 100,
      estimatedDuration: eta.totalMinutes,
      breakdown: {
        baseFare,
        distanceCost: Math.round(distanceCost),
        timeCost: Math.round(timeCost),
        packageSurcharge: Math.round(packageSurcharge),
        totalFare: Math.round(finalFare)
      }
    };
  }

  // Get user orders
  async getUserOrders(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
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

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phoneNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.delivery.count({ where })
    ]);

    return {
      orders,
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

  // Get order details
  async getOrderDetails(userId, orderId) {
    const order = await prisma.delivery.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
                profilePictureUrl: true
              }
            },
            vehicle: true
          }
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  // Cancel order
  async cancelOrder(userId, orderId, reason = '') {
    const order = await prisma.delivery.findFirst({
      where: {
        id: orderId,
        userId
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if order can be cancelled
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.CANCELLED) {
      throw new AppError('Order cannot be cancelled', 400, 'INVALID_ORDER_STATUS');
    }

    // Update order status
    const updatedOrder = await prisma.delivery.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'USER',
        cancellationReason: reason
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    // If order was assigned to driver, update driver status
    if (updatedOrder.driverId) {
      await prisma.driver.update({
        where: { id: updatedOrder.driverId },
        data: {
          currentDeliveryId: null,
          status: 'ONLINE'
        }
      });
    }

    logger.info(`Order cancelled: ${orderId} by user: ${userId}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return updatedOrder;
  }

  // Track delivery
  async trackDelivery(userId, deliveryId) {
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        userId
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
                profilePictureUrl: true
              }
            },
            vehicle: true
          }
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        }
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Calculate ETA if driver is assigned
    let eta = null;
    if (delivery.driver && delivery.driver.latitude && delivery.driver.longitude) {
      const dropoffLat = delivery.dropoffAddress.latitude;
      const dropoffLon = delivery.dropoffAddress.longitude;
      const distance = calculateDistance(
        delivery.driver.latitude,
        delivery.driver.longitude,
        dropoffLat,
        dropoffLon
      );
      eta = calculateETA(distance);
    }

    return {
      delivery,
      tracking: delivery.tracking,
      eta
    };
  }

  // Confirm payment
  async confirmPayment(userId, deliveryId, paymentData = {}) {
    const { paymentMethod, transactionId } = paymentData;

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        userId
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Check if payment can be confirmed
    if (delivery.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new AppError('Payment already confirmed', 400, 'PAYMENT_ALREADY_PROCESSED');
    }

    // Update payment status
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        paymentStatus: PAYMENT_STATUS.PAID,
        actualFare: delivery.estimatedFare, // Use estimated fare as actual
        ...(paymentMethod && { paymentMethod }),
        completedAt: new Date()
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    // Update driver earnings if assigned
    if (updatedDelivery.driverId) {
      const fare = updatedDelivery.actualFare || updatedDelivery.estimatedFare;
      await prisma.driver.update({
        where: { id: updatedDelivery.driverId },
        data: {
          todaysEarnings: {
            increment: fare
          },
          totalEarnings: {
            increment: fare
          },
          completedCount: {
            increment: 1
          }
        }
      });
    }

    logger.info(`Payment confirmed for delivery: ${deliveryId} by user: ${userId}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return updatedDelivery;
  }

  // Rate delivery
  async rateDelivery(userId, deliveryId, rating, comment = '') {
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        userId,
        status: ORDER_STATUS.COMPLETED
      },
      include: {
        driver: true
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found or not completed');
    }

    if (!delivery.driverId) {
      throw new AppError('No driver assigned to this delivery', 400, 'DRIVER_NOT_AVAILABLE');
    }

    // Update driver rating
    const driver = delivery.driver;
    const totalRatings = driver.totalRatings + 1;
    const currentTotal = driver.rating * driver.totalRatings;
    const newRating = (currentTotal + rating) / totalRatings;

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        rating: newRating,
        totalRatings: totalRatings
      }
    });

    // TODO: Store rating in a separate ratings table for detailed analysis
    // This would be implemented with a ratings model

    logger.info(`Delivery rated: ${deliveryId} by user: ${userId}, rating: ${rating}`);

    return { message: 'Rating submitted successfully' };
  }

  // Get saved addresses
  async getSavedAddresses(userId) {
    const addresses = await prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { addressType: 'asc' }
      ]
    });

    return addresses;
  }

  // Create saved address
  async createSavedAddress(userId, addressData) {
    const { addressType, address, isDefault } = addressData;

    // If this is set as default, unset other defaults of the same type
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: {
          userId,
          addressType
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create saved address
    const savedAddress = await prisma.savedAddress.create({
      data: {
        userId,
        addressType,
        address,
        isDefault: isDefault || false
      }
    });

    logger.info(`Saved address created: ${savedAddress.id} for user: ${userId}`);

    return savedAddress;
  }

  // Update saved address
  async updateSavedAddress(userId, addressId, updateData) {
    const { addressType, address, isDefault } = updateData;

    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      throw new NotFoundError('Saved address not found');
    }

    // If this is set as default, unset other defaults of the same type
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: {
          userId,
          addressType,
          NOT: {
            id: addressId
          }
        },
        data: {
          isDefault: false
        }
      });
    }

    // Update saved address
    const updatedAddress = await prisma.savedAddress.update({
      where: { id: addressId },
      data: {
        ...(addressType && { addressType }),
        ...(address && { address }),
        ...(isDefault !== undefined && { isDefault })
      }
    });

    logger.info(`Saved address updated: ${addressId} for user: ${userId}`);

    return updatedAddress;
  }

  // Delete saved address
  async deleteSavedAddress(userId, addressId) {
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      throw new NotFoundError('Saved address not found');
    }

    // Delete saved address
    await prisma.savedAddress.delete({
      where: { id: addressId }
    });

    logger.info(`Saved address deleted: ${addressId} for user: ${userId}`);

    return { message: 'Saved address deleted successfully' };
  }

  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      isRead,
      type
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type })
    };

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          sentAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    return {
      notifications,
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

  // Mark notification as read
  async markNotificationAsRead(userId, notificationId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return updatedNotification;
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      message: `${result.count} notifications marked as read`
    };
  }
}

module.exports = new UserService();