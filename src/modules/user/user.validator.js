const Joi = require('joi');
const { userSchemas, deliverySchemas } = require('../../shared/errors/validation-error');

// Update user profile validation
const validateUpdateUserProfile = (req, res, next) => {
  const { error } = userSchemas.updateProfile.validate(req.body, {
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

// Create delivery validation
const validateCreateDelivery = (req, res, next) => {
  const schema = Joi.object({
    ...deliverySchemas.createDelivery.extract(['pickupAddress', 'dropoffAddress', 'receiverPhoneNumber', 'estimatedFare', 'paymentMethod', 'packageDetails']),
    goodsImage: Joi.any().optional() // File upload handled separately
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

// Estimate fare validation
const validateEstimateFare = (req, res, next) => {
  const { error } = deliverySchemas.estimateFare.validate(req.body, {
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

// Get user orders validation
const validateGetUserOrders = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
    ).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'estimatedFare', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
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

// Get order details validation
const validateGetOrderDetails = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().required()
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

// Cancel order validation
const validateCancelOrder = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    reason: Joi.string().max(500).optional()
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

// Track delivery validation
const validateTrackDelivery = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required()
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

// Confirm payment validation
const validateConfirmPayment = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').optional(),
    transactionId: Joi.string().optional()
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

// Rate delivery validation
const validateRateDelivery = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).optional()
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

// Get saved addresses validation
const validateGetSavedAddresses = (req, res, next) => {
  next(); // No validation needed
};

// Create saved address validation
const validateCreateSavedAddress = (req, res, next) => {
  const schema = Joi.object({
    addressType: Joi.string().valid('HOME', 'WORK', 'OTHER').required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).required(),
    isDefault: Joi.boolean().default(false)
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

// Update saved address validation
const validateUpdateSavedAddress = (req, res, next) => {
  const schema = Joi.object({
    addressType: Joi.string().valid('HOME', 'WORK', 'OTHER').optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      postalCode: Joi.string().optional(),
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional(),
    isDefault: Joi.boolean().optional()
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

// Delete saved address validation
const validateDeleteSavedAddress = (req, res, next) => {
  const schema = Joi.object({
    addressId: Joi.string().required()
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

// Get user notifications validation
const validateGetUserNotifications = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    isRead: Joi.boolean().optional(),
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).optional()
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

// Get user profile validation
const validateGetUserProfile = (req, res, next) => {
  next(); // No validation needed
};

module.exports = {
  validateUpdateUserProfile,
  validateCreateDelivery,
  validateEstimateFare,
  validateGetUserOrders,
  validateGetOrderDetails,
  validateCancelOrder,
  validateTrackDelivery,
  validateConfirmPayment,
  validateRateDelivery,
  validateGetSavedAddresses,
  validateCreateSavedAddress,
  validateUpdateSavedAddress,
  validateDeleteSavedAddress,
  validateGetUserNotifications,
  validateMarkNotificationAsRead,
  validateGetUserProfile
};