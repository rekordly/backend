const Joi = require('joi');

// Update driver location validation
const validateUpdateDriverLocation = (req, res, next) => {
  const schema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    timestamp: Joi.date().iso().optional(),
    bearing: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
    accuracy: Joi.number().min(0).optional()
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

// Get driver location validation
const validateGetDriverLocation = (req, res, next) => {
  next(); // No validation needed
};

// Get driver location history validation
const validateGetDriverLocationHistory = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
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

// Get delivery location validation
const validateGetDeliveryLocation = (req, res, next) => {
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

// Get delivery tracking history validation
const validateGetDeliveryTrackingHistory = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    offset: Joi.number().integer().min(0).default(0)
  });

  const { error } = schema.validate({ ...req.params, ...req.query }, {
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

// Get nearby drivers validation
const validateGetNearbyDrivers = (req, res, next) => {
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

// Batch update driver locations validation
const validateBatchUpdateDriverLocations = (req, res, next) => {
  const schema = Joi.object({
    locations: Joi.array().items(
      Joi.object({
        driverId: Joi.string().required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        timestamp: Joi.date().iso().optional(),
        bearing: Joi.number().min(0).max(360).optional(),
        speed: Joi.number().min(0).optional(),
        accuracy: Joi.number().min(0).optional()
      })
    ).min(1).max(100).required()
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

// Clean up old location data validation
const validateCleanupOldLocationData = (req, res, next) => {
  const schema = Joi.object({
    daysToKeep: Joi.number().integer().min(1).max(365).default(30)
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

// Get driver location statistics validation
const validateGetDriverLocationStatistics = (req, res, next) => {
  const schema = Joi.object({
    period: Joi.string().valid('day', 'week', 'month').default('day')
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

// Get geofence events validation
const validateGetGeofenceEvents = (req, res, next) => {
  const schema = Joi.object({
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

// Create geofence validation
const validateCreateGeofence = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    type: Joi.string().valid('CIRCLE', 'POLYGON').required(),
    coordinates: Joi.alternatives().conditional('type', {
      is: 'CIRCLE',
      then: Joi.object({
        center: Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required()
        }).required(),
        radius: Joi.number().positive().required()
      }).required(),
      otherwise: Joi.object({
        points: Joi.array().items(
          Joi.object({
            latitude: Joi.number().min(-90).max(90).required(),
            longitude: Joi.number().min(-180).max(180).required()
          })
        ).min(3).required()
      }).required()
    }).required(),
    driverId: Joi.string().optional(),
    deliveryId: Joi.string().optional(),
    isActive: Joi.boolean().default(true),
    description: Joi.string().max(500).optional()
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

module.exports = {
  validateUpdateDriverLocation,
  validateGetDriverLocation,
  validateGetDriverLocationHistory,
  validateUpdateDeliveryLocation,
  validateGetDeliveryLocation,
  validateGetDeliveryTrackingHistory,
  validateGetNearbyDrivers,
  validateBatchUpdateDriverLocations,
  validateCleanupOldLocationData,
  validateGetDriverLocationStatistics,
  validateGetGeofenceEvents,
  validateCreateGeofence
};