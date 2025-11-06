const Joi = require('joi');

// Create delivery validation
const validateCreateDelivery = (req, res, next) => {
  const schema = Joi.object({
    pickupAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    dropoffAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    receiverPhoneNumber: Joi.string().pattern(/^[+]?[\d\s-()]+$/).required(),
    goodsImageUrl: Joi.string().uri().optional(),
    estimatedFare: Joi.number().positive().optional(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').required(),
    packageDetails: Joi.object({
      weight: Joi.number().positive().optional(),
      dimensions: Joi.object({
        length: Joi.number().positive().optional(),
        width: Joi.number().positive().optional(),
        height: Joi.number().positive().optional()
      }).optional(),
      isFragile: Joi.boolean().default(false),
      requiresSpecialHandling: Joi.boolean().default(false),
      description: Joi.string().max(500).optional()
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

// Estimate fare validation
const validateEstimateFare = (req, res, next) => {
  const schema = Joi.object({
    pickupCoords: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    dropoffCoords: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    packageDetails: Joi.object({
      weight: Joi.number().positive().optional(),
      dimensions: Joi.object({
        length: Joi.number().positive().optional(),
        width: Joi.number().positive().optional(),
        height: Joi.number().positive().optional()
      }).optional(),
      isFragile: Joi.boolean().default(false),
      requiresSpecialHandling: Joi.boolean().default(false)
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

// Accept delivery validation
const validateAcceptDelivery = (req, res, next) => {
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

// Reject delivery validation
const validateRejectDelivery = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
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

// Update delivery status validation
const validateUpdateDeliveryStatus = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
    ).required(),
    actualFare: Joi.number().positive().optional(),
    deliveryPhoto: Joi.string().uri().optional(),
    recipientSignature: Joi.string().optional(),
    notes: Joi.string().max(1000).optional(),
    cancellationReason: Joi.string().max(500).optional(),
    disputeReason: Joi.string().max(500).optional()
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

// Get delivery details validation
const validateGetDeliveryDetails = (req, res, next) => {
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

// Get driver deliveries validation
const validateGetDriverDeliveries = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
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

// Get active delivery validation
const validateGetActiveDelivery = (req, res, next) => {
  next(); // No validation needed
};

// Complete delivery validation
const validateCompleteDelivery = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    actualFare: Joi.number().positive().optional(),
    deliveryPhoto: Joi.string().uri().optional(),
    recipientSignature: Joi.string().optional(),
    notes: Joi.string().max(1000).optional()
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

// Get delivery tracking validation
const validateGetDeliveryTracking = (req, res, next) => {
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

// Get pending deliveries validation
const validateGetPendingDeliveries = (req, res, next) => {
  const schema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().positive().default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    vehicleType: Joi.string().valid('BIKE', 'CAR', 'VAN', 'TRUCK').optional()
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

// Cancel delivery validation
const validateCancelDelivery = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
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

// Update delivery location validation
const validateUpdateDeliveryLocation = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    timestamp: Joi.date().iso().optional(),
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
    ).optional(),
    bearing: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
    accuracy: Joi.number().min(0).optional()
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

// Get delivery statistics validation
const validateGetDeliveryStatistics = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    driverId: Joi.string().optional(),
    userId: Joi.string().optional(),
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
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

// Get delivery analytics validation
const validateGetDeliveryAnalytics = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    driverId: Joi.string().optional(),
    userId: Joi.string().optional(),
    groupBy: Joi.string().valid('day', 'week', 'month').default('day')
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
  validateCreateDelivery,
  validateEstimateFare,
  validateAcceptDelivery,
  validateRejectDelivery,
  validateUpdateDeliveryStatus,
  validateGetDeliveryDetails,
  validateGetDriverDeliveries,
  validateGetActiveDelivery,
  validateCompleteDelivery,
  validateGetDeliveryTracking,
  validateGetPendingDeliveries,
  validateCancelDelivery,
  validateUpdateDeliveryLocation,
  validateGetDeliveryStatistics,
  validateGetDeliveryAnalytics
};