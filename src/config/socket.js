const { socketAuthMiddleware } = require('../socket/middleware/socket-auth');
const driverHandler = require('../socket/handlers/driver.handler');
const userHandler = require('../socket/handlers/user.handler');
const adminHandler = require('../socket/handlers/admin.handler');
const { logger } = require('../shared/utils/logger');

function setupSocket(io) {
  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, User: ${socket.user?.id || 'Unknown'}`);

    // Handle user type specific logic
    if (socket.user.role === 'DRIVER') {
      driverHandler.handleDriverConnection(socket, io);
    } else if (socket.user.role === 'USER') {
      userHandler.handleUserConnection(socket, io);
    } else if (socket.user.role === 'ADMIN') {
      adminHandler.handleAdminConnection(socket, io);
    }

    // Generic disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
      
      // Clean up user from active connections
      if (socket.user) {
        // Remove from Redis active connections
        const redis = require('../config/redis').getRedisClient();
        redis.del(`user:socket:${socket.user.id}`);
        
        // Update driver status if applicable
        if (socket.user.role === 'DRIVER') {
          // Set driver to offline
          // This will be handled by the driver handler
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('Socket.IO server configured');
}

module.exports = { setupSocket };