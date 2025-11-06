const { AppError, AuthenticationError } = require('../../shared/errors/app-error');
const { USER_ROLES } = require('../../config/constants');
const { prisma } = require('../../config/database');

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // Get admin from database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || !admin.isActive) {
      throw new AuthenticationError('Invalid token or admin not active');
    }

    // Add admin to request object
    req.admin = admin;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    
    next(error);
  }
};

// Admin role check middleware
const requireAdminRole = (req, res, next) => {
  if (!req.admin) {
    return next(new AuthenticationError('Admin not authenticated'));
  }

  if (req.admin.role !== USER_ROLES.ADMIN) {
    return next(new AppError('Access denied. Admin role required.', 403, 'AUTHORIZATION_ERROR'));
  }

  next();
};

// Permission check middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new AuthenticationError('Admin not authenticated'));
    }

    // In a real implementation, you would check admin permissions
    // For now, we'll assume all admins have all permissions
    next();
  };
};

// Super admin check middleware
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return next(new AuthenticationError('Admin not authenticated'));
  }

  // In a real implementation, you would check if admin is super admin
  // For now, we'll assume all admins are super admins
  next();
};

// Activity logging middleware
const logAdminActivity = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log admin activity
      if (req.admin && res.statusCode < 400) {
        logActivity(req.admin, action, req, res.statusCode);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Log activity function
async function logActivity(admin, action, req, statusCode) {
  try {
    const { prisma } = require('../../config/database');
    
    await prisma.adminActivity.create({
      data: {
        adminId: admin.id,
        action,
        method: req.method,
        path: req.path,
        statusCode,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

// Rate limiting for admin routes
const adminRateLimit = (req, res, next) => {
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many admin requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  limiter(req, res, next);
};

// Admin session validation
const validateAdminSession = (req, res, next) => {
  if (!req.admin) {
    return next(new AuthenticationError('Admin session not found'));
  }

  // Check if admin session is still valid
  // In a real implementation, you might check session expiry, IP address, etc.
  
  next();
};

// Admin access control for specific resources
const canAccessResource = (resourceType) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new AuthenticationError('Admin not authenticated'));
    }

    // In a real implementation, you would check if admin has access to this resource type
    // For now, we'll allow access to all resources
    next();
  };
};

// Admin audit trail middleware
const auditTrail = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Create audit trail entry
    if (req.admin && req.method !== 'GET') {
      createAuditEntry(req, res, data);
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

// Create audit entry function
async function createAuditEntry(req, res, data) {
  try {
    const { prisma } = require('../../config/database');
    
    await prisma.auditLog.create({
      data: {
        adminId: req.admin.id,
        action: `${req.method} ${req.path}`,
        resourceType: getResourceTypeFromPath(req.path),
        resourceId: getResourceIdFromPath(req.path),
        changes: getChangesFromRequest(req, data),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating audit entry:', error);
  }
}

// Helper functions for audit trail
function getResourceTypeFromPath(path) {
  if (path.includes('/users')) return 'USER';
  if (path.includes('/drivers')) return 'DRIVER';
  if (path.includes('/deliveries')) return 'DELIVERY';
  if (path.includes('/disputes')) return 'DISPUTE';
  if (path.includes('/kyc')) return 'KYC';
  return 'SYSTEM';
}

function getResourceIdFromPath(path) {
  const matches = path.match(/\/([a-f0-9]{24})/);
  return matches ? matches[1] : null;
}

function getChangesFromRequest(req, data) {
  if (req.method === 'POST' || req.method === 'PUT') {
    return req.body;
  }
  return null;
}

module.exports = {
  authenticateAdmin,
  requireAdminRole,
  requirePermission,
  requireSuperAdmin,
  logAdminActivity,
  adminRateLimit,
  validateAdminSession,
  canAccessResource,
  auditTrail
};