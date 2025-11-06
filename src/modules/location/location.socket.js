const { REDIS_KEYS, TIME_CONSTANTS } = require('../../../config/constants');
const { calculateDistance, calculateETA } = require('../../../shared/utils/geospatial');
const { logger } = require('../../../shared/utils/logger');

class LocationSocketHandler {
  constructor() {
    this.activeDrivers = new Map(); // driverId -> socketId
    this.activeUsers = new Map(); // userId -> socketId
    this.deliveryTracking = new Map(); // deliveryId -> Set of user socketIds
  }

  // Handle driver connection
  handleDriverConnection(socket, io) {
    const driverId = socket.user.driver?.id;

    if (!driverId) {
      logger.warn('Driver connection attempted without driver profile');
      socket.disconnect();
      return;
    }

    // Register driver
    this.activeDrivers.set(driverId, socket.id);
    socket.join(`driver:${driverId}`);

    logger.info(`Driver connected: ${driverId}`);

    // Handle location updates
    socket.on('location:update', async (data) => {
      try {
        await this.handleLocationUpdate(socket, io, data);
      } catch (error) {
        logger.error('Error handling location update:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle delivery status updates
    socket.on('delivery:status:update', async (data) => {
      try {
        await this.handleDeliveryStatusUpdate(socket, io, data);
      } catch (error) {
        logger.error('Error handling delivery status update:', error);
        socket.emit('error', { message: 'Failed to update delivery status' });
      }
    });

    // Handle driver availability
    socket.on('driver:availability:update', async (data) => {
      try {
        await this.handleDriverAvailabilityUpdate(socket, io, data);
      } catch (error) {
        logger.error('Error handling driver availability update:', error);
        socket.emit('error', { message: 'Failed to update availability' });
      }
    });

    // Handle new delivery response
    socket.on('delivery:response', async (data) => {
      try {
        await this.handleDeliveryResponse(socket, io, data);
      } catch (error) {
        logger.error('Error handling delivery response:', error);
        socket.emit('error', { message: 'Failed to process delivery response' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDriverDisconnection(driverId);
    });
  }

  // Handle user connection
  handleUserConnection(socket, io) {
    const userId = socket.user.id;

    // Register user
    this.activeUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    logger.info(`User connected: ${userId}`);

    // Handle tracking request
    socket.on('delivery:track', async (data) => {
      try {
        await this.handleDeliveryTrack(socket, io, data);
      } catch (error) {
        logger.error('Error handling delivery track:', error);
        socket.emit('error', { message: 'Failed to track delivery' });
      }
    });

    // Handle stop tracking
    socket.on('delivery:untrack', async (data) => {
      try {
        await this.handleDeliveryUntrack(socket, io, data);
      } catch (error) {
        logger.error('Error handling delivery untrack:', error);
        socket.emit('error', { message: 'Failed to stop tracking' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleUserDisconnection(userId);
    });
  }

  // Handle location update from driver
  async handleLocationUpdate(socket, io, data) {
    const driverId = socket.user.driver.id;
    const { latitude, longitude, timestamp, bearing, speed, accuracy } = data;

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Invalid coordinates');
    }

    // Update driver location in Redis
    const redis = require('../../../config/redis').getRedisClient();
    await redis.setex(
      REDIS_KEYS.DRIVER_LOCATION(driverId),
      TIME_CONSTANTS.LOCATION_TTL / 1000,
      JSON.stringify({
        driverId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()).toISOString(),
        status: 'ONLINE',
        bearing,
        speed,
        accuracy
      })
    );

    // Get driver's active delivery
    const { prisma } = require('../../../config/database');
    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        driverId,
        status: {
          in: ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF']
        }
      }
    });

    // If driver has active delivery, update tracking and notify users
    if (activeDelivery) {
      // Store location in delivery tracking
      await prisma.deliveryTracking.create({
        data: {
          deliveryId: activeDelivery.id,
          driverId,
          latitude,
          longitude,
          timestamp: new Date(timestamp || Date.now()),
          bearing,
          speed,
          accuracy
        }
      });

      // Notify tracking users
      const trackingUsers = this.deliveryTracking.get(activeDelivery.id) || new Set();
      const locationData = {
        deliveryId: activeDelivery.id,
        driverId,
        latitude,
        longitude,
        timestamp: new Date(timestamp || Date.now()).toISOString(),
        bearing,
        speed,
        accuracy
      };

      // Calculate ETA if applicable
      if (activeDelivery.dropoffAddress) {
        const distance = calculateDistance(
          latitude,
          longitude,
          activeDelivery.dropoffAddress.latitude,
          activeDelivery.dropoffAddress.longitude
        );
        const eta = calculateETA(distance);
        locationData.eta = eta;
      }

      // Broadcast to tracking users
      trackingUsers.forEach(userSocketId => {
        io.to(userSocketId).emit('driver:location', locationData);
      });

      // Also broadcast to delivery room
      io.to(`delivery:${activeDelivery.id}`).emit('driver:location', locationData);
    }

    // Acknowledge location update
    socket.emit('location:updated', {
      success: true,
      timestamp: new Date().toISOString()
    });
  }

  // Handle delivery status update
  async handleDeliveryStatusUpdate(socket, io, data) {
    const driverId = socket.user.driver.id;
    const { deliveryId, status, notes } = data;

    // Validate driver owns this delivery
    const { prisma } = require('../../../config/database');
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        driverId
      }
    });

    if (!delivery) {
      throw new Error('Delivery not found or not assigned to this driver');
    }

    // Update delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status,
        ...(notes && { driverNotes: notes }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Notify user about status change
    const userSocketId = this.activeUsers.get(delivery.userId);
    if (userSocketId) {
      io.to(userSocketId).emit('delivery:status:updated', {
        deliveryId,
        status,
        timestamp: new Date().toISOString(),
        notes
      });
    }

    // Also broadcast to delivery room
    io.to(`delivery:${deliveryId}`).emit('delivery:status:updated', {
      deliveryId,
      status,
      timestamp: new Date().toISOString(),
      notes
    });

    // Acknowledge status update
    socket.emit('delivery:status:updated', {
      success: true,
      deliveryId,
      status
    });
  }

  // Handle driver availability update
  async handleDriverAvailabilityUpdate(socket, io, data) {
    const driverId = socket.user.driver.id;
    const { isAvailable } = data;

    // Update driver availability
    const { prisma } = require('../../../config/database');
    await prisma.driver.update({
      where: { id: driverId },
      data: { isAvailable }
    });

    // Broadcast availability change
    io.emit('driver:availability:updated', {
      driverId,
      isAvailable,
      timestamp: new Date().toISOString()
    });

    // Acknowledge availability update
    socket.emit('driver:availability:updated', {
      success: true,
      isAvailable
    });
  }

  // Handle delivery response (accept/reject)
  async handleDeliveryResponse(socket, io, data) {
    const driverId = socket.user.driver.id;
    const { deliveryId, response, reason } = data;

    // Record driver response
    const { prisma } = require('../../../config/database');
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
          reason,
          respondedAt: new Date().toISOString()
        }
      }
    });

    // If accepted, update delivery
    if (response === 'accepted') {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      });

      if (delivery && delivery.status === 'PENDING') {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'ACCEPTED',
            driverId,
            acceptedAt: new Date()
          }
        });

        // Update driver status
        await prisma.driver.update({
          where: { id: driverId },
          data: {
            status: 'BUSY',
            currentDeliveryId: deliveryId
          }
        });

        // Notify user
        const userSocketId = this.activeUsers.get(delivery.userId);
        if (userSocketId) {
          io.to(userSocketId).emit('delivery:accepted', {
            deliveryId,
            driverId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Acknowledge response
    socket.emit('delivery:response:recorded', {
      success: true,
      deliveryId,
      response
    });
  }

  // Handle delivery track request
  async handleDeliveryTrack(socket, io, data) {
    const userId = socket.user.id;
    const { deliveryId } = data;

    // Validate user owns this delivery
    const { prisma } = require('../../../config/database');
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        userId
      }
    });

    if (!delivery) {
      throw new Error('Delivery not found or not owned by user');
    }

    // Add user to tracking
    if (!this.deliveryTracking.has(deliveryId)) {
      this.deliveryTracking.set(deliveryId, new Set());
    }
    this.deliveryTracking.get(deliveryId).add(socket.id);

    // Join delivery room
    socket.join(`delivery:${deliveryId}`);

    // Get latest driver location
    if (delivery.driverId) {
      const redis = require('../../../config/redis').getRedisClient();
      const locationData = await redis.get(REDIS_KEYS.DRIVER_LOCATION(delivery.driverId));
      
      if (locationData) {
        const location = JSON.parse(locationData);
        
        // Calculate ETA
        if (delivery.dropoffAddress) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            delivery.dropoffAddress.latitude,
            delivery.dropoffAddress.longitude
          );
          const eta = calculateETA(distance);
          location.eta = eta;
        }

        socket.emit('driver:location', location);
      }
    }

    // Acknowledge tracking
    socket.emit('delivery:tracking:started', {
      success: true,
      deliveryId
    });
  }

  // Handle delivery untrack request
  async handleDeliveryUntrack(socket, io, data) {
    const userId = socket.user.id;
    const { deliveryId } = data;

    // Remove user from tracking
    if (this.deliveryTracking.has(deliveryId)) {
      this.deliveryTracking.get(deliveryId).delete(socket.id);
      
      // Clean up if no more trackers
      if (this.deliveryTracking.get(deliveryId).size === 0) {
        this.deliveryTracking.delete(deliveryId);
      }
    }

    // Leave delivery room
    socket.leave(`delivery:${deliveryId}`);

    // Acknowledge untracking
    socket.emit('delivery:tracking:stopped', {
      success: true,
      deliveryId
    });
  }

  // Handle driver disconnection
  handleDriverDisconnection(driverId) {
    this.activeDrivers.delete(driverId);
    
    // Update driver status to offline
    const { prisma } = require('../../../config/database');
    prisma.driver.update({
      where: { id: driverId },
      data: { status: 'OFFLINE' }
    }).catch(error => {
      logger.error('Error updating driver status on disconnect:', error);
    });

    logger.info(`Driver disconnected: ${driverId}`);
  }

  // Handle user disconnection
  handleUserDisconnection(userId) {
    this.activeUsers.delete(userId);
    
    // Remove user from all tracking
    for (const [deliveryId, trackers] of this.deliveryTracking.entries()) {
      trackers.delete(userId);
      if (trackers.size === 0) {
        this.deliveryTracking.delete(deliveryId);
      }
    }

    logger.info(`User disconnected: ${userId}`);
  }

  // Get active drivers count
  getActiveDriversCount() {
    return this.activeDrivers.size;
  }

  // Get active users count
  getActiveUsersCount() {
    return this.activeUsers.size;
  }

  // Get tracking info for delivery
  getTrackingInfo(deliveryId) {
    const trackers = this.deliveryTracking.get(deliveryId);
    return {
      deliveryId,
      trackingUsers: trackers ? trackers.size : 0,
      isBeingTracked: trackers && trackers.size > 0
    };
  }

  // Broadcast to all active drivers
  broadcastToDrivers(io, event, data) {
    for (const [driverId, socketId] of this.activeDrivers.entries()) {
      io.to(socketId).emit(event, data);
    }
  }

  // Broadcast to all active users
  broadcastToUsers(io, event, data) {
    for (const [userId, socketId] of this.activeUsers.entries()) {
      io.to(socketId).emit(event, data);
    }
  }

  // Send notification to specific user
  sendToUser(io, userId, event, data) {
    const socketId = this.activeUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  }

  // Send notification to specific driver
  sendToDriver(io, driverId, event, data) {
    const socketId = this.activeDrivers.get(driverId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  }
}

module.exports = new LocationSocketHandler();