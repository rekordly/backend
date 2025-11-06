const Joi = require('joi');

// Get all users validation
const validateGetAllUsers = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    role: Joi.string().valid('USER', 'DRIVER', 'ADMIN').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    search: Joi.string().max(100).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  });

  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get user details validation
const validateGetUserDetails = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Update user validation
const validateUpdateUser = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    fullName: Joi.string().max(100).optional(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().pattern(/^[+]?[\d\s-()]+$/).optional(),
    isActive: Joi.boolean().optional(),
    role: Joi.string().valid('USER', 'DRIVER', 'ADMIN').optional()
  });

  const { error } = schema.validate({ ...req.params, ...req.body }, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Delete user validation
const validateDeleteUser = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get all drivers validation
const validateGetAllDrivers = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('OFFLINE', 'LOGGED_IN', 'ONLINE', 'BUSY', 'INACTIVE').optional(),
    kycStatus: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional(),
    vehicleType: Joi.string().valid('BIKE', 'CAR', 'VAN', 'TRUCK').optional(),
    search: Joi.string().max(100).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  });

  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get driver details validation
const validateGetDriverDetails = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Update driver validation
const validateUpdateDriver = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required(),
    status: Joi.string().valid('OFFLINE', 'LOGGED_IN', 'ONLINE', 'BUSY', 'INACTIVE').optional(),
    isAvailable: Joi.boolean().optional(),
    overallKycStatus: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional()
  });

  const { error } = schema.validate({ ...req.params, ...req.body }, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Delete driver validation
const validateDeleteDriver = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get KYC pending drivers validation
const validateGetKycPendingDrivers = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    documentType: Joi.string().valid('NATIONAL_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION').optional(),
    search: Joi.string().max(100).optional()
  });

  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get driver KYC documents validation
const validateGetDriverKycDocuments = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Approve KYC document validation
const validateApproveKycDocument = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required(),
    documentId: Joi.string().required()
  });

  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Reject KYC document validation
const validateRejectKycDocument = (req, res, next) => {
  const schema = Joi.object({
    driverId: Joi.string().required(),
    documentId: Joi.string().required(),
    reason: Joi.string().max(500).required()
  });

  const { error } = schema.validate({ ...req.params, ...req.body }, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get system settings validation
const validateGetSystemSettings = (req, res, next) => {
  next(); // No validation needed
};

// Update system settings validation
const validateUpdateSystemSettings = (req, res, next) => {
  const schema = Joi.object({
    general: Joi.object({
      siteName: Joi.string().max(100).optional(),
      siteDescription: Joi.string().max(500).optional(),
      contactEmail: Joi.string().email().optional(),
      contactPhone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).optional(),
      currency: Joi.string().length(3).optional(),
      timezone: Joi.string().optional()
    }).optional(),
    payment: Joi.object({
      enableCashPayments: Joi.boolean().optional(),
      enableCardPayments: Joi.boolean().optional(),
      enableTransferPayments: Joi.boolean().optional(),
      commissionRate: Joi.number().min(0).max(1).optional(),
      minimumFare: Joi.number().positive().optional()
    }).optional(),
    delivery: Joi.object({
      defaultRadius: Joi.number().positive().optional(),
      maximumRadius: Joi.number().positive().optional(),
      autoAssignTimeout: Joi.number().positive().optional(),
      cancellationTimeout: Joi.number().positive().optional()
    }).optional(),
    notifications: Joi.object({
      enableEmailNotifications: Joi.boolean().optional(),
      enableSmsNotifications: Joi.boolean().optional(),
      enablePushNotifications: Joi.boolean().optional()
    }).optional()
  });

  const { error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get system logs validation
const validateGetSystemLogs = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    level: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    search: Joi.string().max(100).optional()
  });

  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

// Get analytics validation
const validateGetAnalytics = (req, res, next) => {
  const schema = Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    type: Joi.string().valid('revenue', 'deliveries', 'users', 'drivers').default('revenue')
  });

  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errorMessage,
      details: error.details
    });
  }

  next();
};

module.exports = {
  validateGetAllUsers,
  validateGetUserDetails,
  validateUpdateUser,
  validateDeleteUser,
  validateGetAllDrivers,
  validateGetDriverDetails,
  validateUpdateDriver,
  validateDeleteDriver,
  validateGetKycPendingDrivers,
  validateGetDriverKycDocuments,
  validateApproveKycDocument,
  validateRejectKycDocument,
  validateGetSystemSettings,
  validateUpdateSystemSettings,
  validateGetSystemLogs,
  validateGetAnalytics
};