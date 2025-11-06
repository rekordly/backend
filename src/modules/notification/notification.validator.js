const Joi = require('joi');

// Get user notifications validation
const validateGetUserNotifications = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    isRead: Joi.boolean().optional(),
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).optional(),
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

// Get notification details validation
const validateGetNotificationDetails = (req, res, next) => {
  const schema = Joi.object({
    notificationId: Joi.string().required()
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

// Mark notification as read validation
const validateMarkNotificationAsRead = (req, res, next) => {
  const schema = Joi.object({
    notificationId: Joi.string().required()
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

// Mark all notifications as read validation
const validateMarkAllNotificationsAsRead = (req, res, next) => {
  next(); // No validation needed
};

// Delete notification validation
const validateDeleteNotification = (req, res, next) => {
  const schema = Joi.object({
    notificationId: Joi.string().required()
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

// Register device token validation
const validateRegisterDeviceToken = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    deviceInfo: Joi.object({
      deviceType: Joi.string().valid('ANDROID', 'IOS', 'WEB').required(),
      deviceModel: Joi.string().optional(),
      appVersion: Joi.string().optional(),
      osVersion: Joi.string().optional()
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

// Unregister device token validation
const validateUnregisterDeviceToken = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required()
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

// Update notification preferences validation
const validateUpdateNotificationPreferences = (req, res, next) => {
  const schema = Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional()
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

// Get notification preferences validation
const validateGetNotificationPreferences = (req, res, next) => {
  next(); // No validation needed
};

// Send bulk notifications validation
const validateSendBulkNotifications = (req, res, next) => {
  const schema = Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).max(1000).required(),
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).required(),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(1000).required(),
    data: Joi.object().optional()
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

// Send notification to all validation
const validateSendNotificationToAll = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).required(),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(1000).required(),
    data: Joi.object().optional()
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

// Send notification to all drivers validation
const validateSendNotificationToAllDrivers = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).required(),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(1000).required(),
    data: Joi.object().optional()
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

// Get notification statistics validation
const validateGetNotificationStatistics = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).optional(),
    status: Joi.string().valid('PENDING', 'SENT', 'FAILED').optional()
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
  validateGetUserNotifications,
  validateGetNotificationDetails,
  validateMarkNotificationAsRead,
  validateMarkAllNotificationsAsRead,
  validateDeleteNotification,
  validateRegisterDeviceToken,
  validateUnregisterDeviceToken,
  validateUpdateNotificationPreferences,
  validateGetNotificationPreferences,
  validateSendBulkNotifications,
  validateSendNotificationToAll,
  validateSendNotificationToAllDrivers,
  validateGetNotificationStatistics
};