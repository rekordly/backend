const Joi = require('joi');
const { driverSchemas } = require('../../shared/errors/validation-error');

// Update location validation
const validateUpdateLocation = (req, res, next) => {
  const { error } = driverSchemas.updateLocation.validate(req.body, {
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

// Update vehicle details validation
const validateUpdateVehicleDetails = (req, res, next) => {
  const { error } = driverSchemas.updateVehicleDetails.validate(req.body, {
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

// Update profile validation
const validateUpdateDriverProfile = (req, res, next) => {
  const { error } = driverSchemas.updateProfile.validate(req.body, {
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

// Update availability validation
const validateUpdateAvailability = (req, res, next) => {
  const schema = Joi.object({
    isAvailable: Joi.boolean().required()
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

// Get nearby drivers validation
const validateGetNearbyDrivers = (req, res, next) => {
  const schema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().positive().default(10), // in kilometers
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

// Get driver metrics validation
const validateGetDriverMetrics = (req, res, next) => {
  const schema = Joi.object({
    period: Joi.string().valid('today', 'week', 'month', 'year').default('today'),
    driverId: Joi.string().optional()
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

// Get driver earnings validation
const validateGetDriverEarnings = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    period: Joi.string().valid('today', 'week', 'month', 'year').default('month')
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

// Get driver performance validation
const validateGetDriverPerformance = (req, res, next) => {
  const schema = Joi.object({
    period: Joi.string().valid('today', 'week', 'month', 'year').default('month'),
    driverId: Joi.string().optional()
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

// Update driver status validation
const validateUpdateDriverStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('OFFLINE', 'LOGGED_IN', 'ONLINE', 'BUSY').required()
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

// Get driver dashboard validation
const validateGetDriverDashboard = (req, res, next) => {
  next(); // No validation needed for dashboard
};

// Get driver profile validation
const validateGetDriverProfile = (req, res, next) => {
  next(); // No validation needed for profile
};

module.exports = {
  validateUpdateLocation,
  validateUpdateVehicleDetails,
  validateUpdateDriverProfile,
  validateUpdateAvailability,
  validateGetNearbyDrivers,
  validateGetDriverMetrics,
  validateGetDriverEarnings,
  validateGetDriverPerformance,
  validateGetDriverLocationHistory,
  validateUpdateDriverStatus,
  validateGetDriverDashboard,
  validateGetDriverProfile
};