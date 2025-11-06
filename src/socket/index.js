const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { JWT_SECRET, REDIS_KEYS } = require('../config/constants');
const { logger } = require('../shared/utils/logger');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.connectedDrivers = new Map();
    this.connectedUsers = new Map();
    this.connectedAdmins = new Map();
    this.deliveryRooms = new Map();

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: {
            driver: true
          }
        });

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.user = user;
        socket.userId = user.id;
        socket.userRole = user.role;

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.userId} (${socket.userRole})`);

      // Handle user role-specific connections
      this.handleUserConnection(socket);

      // Handle driver-specific events
      if (socket.userRole === 'DRIVER' && socket.user.driver) {
        this.handleDriverConnection(socket);
      }

      // Handle admin-specific events
      if (socket.userRole === 'ADMIN') {
        this.handleAdminConnection(socket);
      }

      // Handle delivery tracking
      this.handleDeliveryTracking(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  handleUserConnection(socket) {
    // Store user connection
    this.connectedUsers.set(socket.userId, socket);

    // Join user room
    socket.join(`user:${socket.userId}`);

    // Handle user events
    socket.on('user:track_delivery', async (data) => {
      try {
        const { deliveryId } = data;
        
        // Verify user has access to this delivery
        const delivery = await prisma.delivery.findFirst({
          where: {
            id: deliveryId,
            userId: socket.userId
          }
        });

        if (!delivery) {
          socket.emit('error', { message: 'Delivery not found or access denied' });
          return;
        }

        // Join delivery room
        socket.join(`delivery:${deliveryId}`);
        
        // Store delivery room mapping
        if (!this.deliveryRooms.has(deliveryId)) {
          this.deliveryRooms.set(deliveryId, new Set());
        }
        this.deliveryRooms.get(deliveryId).add(socket.userId);

        logger.info(`User ${socket.userId} started tracking delivery ${deliveryId}`);

        // Send current delivery status
        socket.emit('delivery:status_update', {
          deliveryId,
          status: delivery.status,
          driver: delivery.driver ? {
            id: delivery.driver.id,
            name: delivery.driver.user.fullName,
            vehicle: delivery.driver.vehicle
          } : null
        });

      } catch (error) {
        logger.error('Error in user:track_delivery:', error);
        socket.emit('error', { message: 'Failed to track delivery' });
      }
    });

    socket.on('user:stop_tracking', (data) => {
      const { deliveryId } = data;
      
      // Leave delivery room
      socket.leave(`delivery:${deliveryId}`);
      
      // Remove from delivery room mapping
      if (this.deliveryRooms.has(deliveryId)) {
        this.deliveryRooms.get(deliveryId).delete(socket.userId);
        if (this.deliveryRooms.get(deliveryId).size === 0) {
          this.deliveryRooms.delete(deliveryId);
        }
      }

      logger.info(`User ${socket.userId} stopped tracking delivery ${deliveryId}`);
    });

    socket.on('user:contact_driver', async (data) => {
      try {
        const { deliveryId, message } = data;
        
        // Verify user has access to this delivery
        const delivery = await prisma.delivery.findFirst({
          where: {
            id: deliveryId,
            userId: socket.userId
          },
          include: {
            driver: {
              include: {
                user: true
              }
            }
          }
        });

        if (!delivery || !delivery.driver) {
          socket.emit('error', { message: 'Delivery or driver not found' });
          return;
        }

        // Send message to driver
        const driverSocket = this.connectedDrivers.get(delivery.driver.id);
        if (driverSocket) {
          driverSocket.emit('user:message', {
            from: {
              id: socket.userId,
              name: socket.user.fullName
            },
            deliveryId,
            message,
            timestamp: new Date()
          });
        }

        socket.emit('message_sent', { success: true });

      } catch (error) {
        logger.error('Error in user:contact_driver:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  handleDriverConnection(socket) {
    const driverId = socket.user.driver.id;
    
    // Store driver connection
    this.connectedDrivers.set(driverId, socket);

    // Join driver room
    socket.join(`driver:${driverId}`);

    // Handle driver location updates
    socket.on('driver:update_location', async (data) => {
      try {
        const { latitude, longitude, timestamp, bearing, speed, accuracy } = data;

        // Update driver location in database
        await prisma.driver.update({
          where: { id: driverId },
          data: {
            latitude,
            longitude,
            lastLocationUpdate: new Date(timestamp || Date.now())
          }
        });

        // Store location in Redis
        const redis = require('../config/redis').getRedisClient();
        await redis.setex(
          REDIS_KEYS.DRIVER_LOCATION(driverId),
          300, // 5 minutes TTL
          JSON.stringify({
            driverId,
            latitude,
            longitude,
            timestamp: new Date(timestamp || Date.now()).toISOString(),
            bearing,
            speed,
            accuracy
          })
        );

        // Update active delivery location if any
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          include: {
            currentDelivery: true
          }
        });

        if (driver.currentDelivery) {
          // Update delivery tracking
          await prisma.deliveryTracking.create({
            data: {
              deliveryId: driver.currentDelivery.id,
              latitude,
              longitude,
              timestamp: new Date(timestamp || Date.now()),
              status: driver.currentDelivery.status,
              bearing,
              speed,
              accuracy
            }
          });

          // Store in Redis
          await redis.setex(
            REDIS_KEYS.DELIVERY_TRACKING(driver.currentDelivery.id),
            300,
            JSON.stringify({
              deliveryId: driver.currentDelivery.id,
              latitude,
              longitude,
              timestamp: new Date(timestamp || Date.now()).toISOString(),
              status: driver.currentDelivery.status,
              bearing,
              speed,
              accuracy
            })
          );

          // Broadcast to users tracking this delivery
          this.io.to(`delivery:${driver.currentDelivery.id}`).emit('driver:location_update', {
            deliveryId: driver.currentDelivery.id,
            driverId,
            latitude,
            longitude,
            timestamp: new Date(timestamp || Date.now()),
            bearing,
            speed,
            accuracy
          });
        }

        // Acknowledge location update
        socket.emit('location_updated', { success: true });

      } catch (error) {
        logger.error('Error in driver:update_location:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle driver status updates
    socket.on('driver:update_status', async (data) => {
      try {
        const { status, isAvailable } = data;

        await prisma.driver.update({
          where: { id: driverId },
          data: {
            status,
            isAvailable: isAvailable !== undefined ? isAvailable : true
          }
        });

        socket.emit('status_updated', { success: true });

        // Notify admins of driver status change
        this.io.to('admin:monitoring').emit('driver:status_changed', {
          driverId,
          status,
          isAvailable
        });

      } catch (error) {
        logger.error('Error in driver:update_status:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle new delivery requests
    socket.on('driver:request_delivery', async (data) => {
      try {
        const { deliveryId, action } = data;

        const delivery = await prisma.delivery.findUnique({
          where: { id: deliveryId }
        });

        if (!delivery || delivery.status !== 'PENDING') {
          socket.emit('error', { message: 'Delivery not available' });
          return;
        }

        if (action === 'accept') {
          // Accept delivery
          await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
              driverId,
              status: 'ACCEPTED',
              acceptedAt: new Date()
            }
          });

          await prisma.driver.update({
            where: { id: driverId },
            data: {
              status: 'BUSY',
              currentDeliveryId: deliveryId,
              isAvailable: false
            }
          });

          // Notify user
          this.io.to(`user:${delivery.userId}`).emit('delivery:accepted', {
            deliveryId,
            driver: {
              id: driverId,
              name: socket.user.fullName
            }
          });

          socket.emit('delivery:accepted', { deliveryId });

        } else if (action === 'reject') {
          // Reject delivery
          await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelledBy: 'DRIVER'
            }
          });

          socket.emit('delivery:rejected', { deliveryId });
        }

      } catch (error) {
        logger.error('Error in driver:request_delivery:', error);
        socket.emit('error', { message: 'Failed to process delivery request' });
      }
    });

    // Handle driver messages to user
    socket.on('driver:message_user', async (data) => {
      try {
        const { deliveryId, message } = data;

        const delivery = await prisma.delivery.findFirst({
          where: {
            id: deliveryId,
            driverId
          }
        });

        if (!delivery) {
          socket.emit('error', { message: 'Delivery not found' });
          return;
        }

        // Send message to user
        this.io.to(`user:${delivery.userId}`).emit('driver:message', {
          from: {
            id: driverId,
            name: socket.user.fullName
          },
          deliveryId,
          message,
          timestamp: new Date()
        });

        socket.emit('message_sent', { success: true });

      } catch (error) {
        logger.error('Error in driver:message_user:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  handleAdminConnection(socket) {
    // Store admin connection
    this.connectedAdmins.set(socket.userId, socket);

    // Join admin monitoring room
    socket.join('admin:monitoring');

    // Handle admin monitoring requests
    socket.on('admin:monitor_drivers', () => {
      // Send current driver status
      const driverStatus = Array.from(this.connectedDrivers.entries()).map(([driverId, socket]) => ({
        driverId,
        userId: socket.userId,
        name: socket.user.fullName,
        status: socket.user.driver.status,
        isAvailable: socket.user.driver.isAvailable,
        lastSeen: new Date()
      }));

      socket.emit('admin:driver_status', driverStatus);
    });

    // Handle admin broadcasts
    socket.on('admin:broadcast', (data) => {
      const { message, target } = data;

      if (target === 'all') {
        this.io.emit('admin:announcement', {
          message,
          from: socket.user.fullName,
          timestamp: new Date()
        });
      } else if (target === 'drivers') {
        this.io.to('drivers').emit('admin:announcement', {
          message,
          from: socket.user.fullName,
          timestamp: new Date()
        });
      } else if (target === 'users') {
        this.io.to('users').emit('admin:announcement', {
          message,
          from: socket.user.fullName,
          timestamp: new Date()
        });
      }
    });
  }

  handleDeliveryTracking(socket) {
    // Handle delivery status updates
    socket.on('delivery:update_status', async (data) => {
      try {
        const { deliveryId, status, additionalData } = data;

        const delivery = await prisma.delivery.findUnique({
          where: { id: deliveryId }
        });

        if (!delivery) {
          socket.emit('error', { message: 'Delivery not found' });
          return;
        }

        // Update delivery status
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status,
            ...additionalData
          }
        });

        // Broadcast status update
        this.io.to(`delivery:${deliveryId}`).emit('delivery:status_update', {
          deliveryId,
          status,
          timestamp: new Date(),
          ...additionalData
        });

        // Notify user and driver
        this.io.to(`user:${delivery.userId}`).emit('delivery:status_changed', {
          deliveryId,
          status
        });

        if (delivery.driverId) {
          this.io.to(`driver:${delivery.driverId}`).emit('delivery:status_changed', {
            deliveryId,
            status
          });
        }

      } catch (error) {
        logger.error('Error in delivery:update_status:', error);
        socket.emit('error', { message: 'Failed to update delivery status' });
      }
    });
  }

  handleDisconnection(socket) {
    logger.info(`User disconnected: ${socket.userId} (${socket.userRole})`);

    // Remove from connected users
    this.connectedUsers.delete(socket.userId);

    // Remove from connected drivers
    if (socket.userRole === 'DRIVER' && socket.user.driver) {
      this.connectedDrivers.delete(socket.user.driver.id);
    }

    // Remove from connected admins
    if (socket.userRole === 'ADMIN') {
      this.connectedAdmins.delete(socket.userId);
    }

    // Leave all rooms
    socket.leaveAll();

    // Update driver status if disconnected
    if (socket.userRole === 'DRIVER' && socket.user.driver) {
      prisma.driver.update({
        where: { id: socket.user.driver.id },
        data: {
          status: 'OFFLINE',
          isAvailable: false
        }
      }).catch(error => {
        logger.error('Error updating driver status on disconnect:', error);
      });
    }
  }

  // Helper methods for broadcasting
  notifyUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  notifyDriver(driverId, event, data) {
    this.io.to(`driver:${driverId}`).emit(event, data);
  }

  notifyAdmins(event, data) {
    this.io.to('admin:monitoring').emit(event, data);
  }

  broadcastToDelivery(deliveryId, event, data) {
    this.io.to(`delivery:${deliveryId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  broadcastToDrivers(event, data) {
    this.io.to('drivers').emit(event, data);
  }

  broadcastToUsers(event, data) {
    this.io.to('users').emit(event, data);
  }
}

module.exports = SocketService;