const jwt = require('jsonwebtoken');
const { AppError } = require('../../shared/errors/app-error');
const { USER_ROLES } = require('../../config/constants');
const { prisma } = require('../../config/database');

// JWT authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Access token required', 401, 'AUTHENTICATION_ERROR');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        driver: true
      }
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid token or user not active', 401, 'AUTHENTICATION_ERROR');
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'AUTHENTICATION_ERROR'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'AUTHENTICATION_ERROR'));
    }
    
    next(error);
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Access token required', 401, 'AUTHENTICATION_ERROR');
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // Get admin from database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || !admin.isActive) {
      throw new AppError('Invalid token or admin not active', 401, 'AUTHENTICATION_ERROR');
    }

    // Add admin to request object
    req.admin = admin;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'AUTHENTICATION_ERROR'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'AUTHENTICATION_ERROR'));
    }
    
    next(error);
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTHENTICATION_ERROR'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access denied', 403, 'AUTHORIZATION_ERROR'));
    }

    next();
  };
};

// Driver-specific authorization
const authorizeDriver = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTHENTICATION_ERROR'));
    }

    if (req.user.role !== USER_ROLES.DRIVER) {
      return next(new AppError('Access denied. Driver role required.', 403, 'AUTHORIZATION_ERROR'));
    }

    // Check if driver profile exists
    if (!req.user.driver) {
      return next(new AppError('Driver profile not found', 404, 'NOT_FOUND'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// User-specific authorization
const authorizeUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTHENTICATION_ERROR'));
    }

    if (req.user.role !== USER_ROLES.USER) {
      return next(new AppError('Access denied. User role required.', 403, 'AUTHORIZATION_ERROR'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Resource ownership check
const checkOwnership = (resourceIdField = 'id', userModel = 'user') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401, 'AUTHENTICATION_ERROR'));
      }

      const resourceId = req.params[resourceIdField];
      
      if (!resourceId) {
        return next(new AppError('Resource ID not provided', 400, 'VALIDATION_ERROR'));
      }

      // For admin users, skip ownership check
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      // Check ownership based on user model
      let resource;
      
      switch (userModel) {
        case 'user':
          resource = await prisma.user.findUnique({
            where: { id: resourceId }
          });
          break;
        case 'delivery':
          resource = await prisma.delivery.findUnique({
            where: { id: resourceId }
          });
          break;
        case 'driver':
          resource = await prisma.driver.findUnique({
            where: { id: resourceId },
            include: { user: true }
          });
          break;
        default:
          return next(new AppError('Invalid user model', 400, 'VALIDATION_ERROR'));
      }

      if (!resource) {
        return next(new AppError('Resource not found', 404, 'NOT_FOUND'));
      }

      // Check ownership
      let isOwner = false;
      
      switch (userModel) {
        case 'user':
          isOwner = resource.id === req.user.id;
          break;
        case 'delivery':
          isOwner = resource.userId === req.user.id;
          break;
        case 'driver':
          isOwner = resource.userId === req.user.id;
          break;
      }

      if (!isOwner) {
        return next(new AppError('Access denied', 403, 'AUTHORIZATION_ERROR'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          driver: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authenticateAdmin,
  authorize,
  authorizeDriver,
  authorizeUser,
  checkOwnership,
  optionalAuth
};