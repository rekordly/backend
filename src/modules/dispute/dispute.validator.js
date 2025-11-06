const Joi = require('joi');

// Create dispute validation
const validateCreateDispute = (req, res, next) => {
  const schema = Joi.object({
    deliveryId: Joi.string().required(),
    type: Joi.string().valid(
      'DELIVERY_DELAY',
      'PACKAGE_DAMAGE',
      'WRONG_PACKAGE',
      'PAYMENT_ISSUE',
      'DRIVER_BEHAVIOR',
      'CUSTOMER_BEHAVIOR',
      'LOST_PACKAGE',
      'OTHER'
    ).required(),
    title: Joi.string().max(200).required(),
    description: Joi.string().max(2000).required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
    evidence: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO').required(),
        url: Joi.string().uri().required(),
        description: Joi.string().max(500).optional()
      })
    ).optional()
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

// Get dispute details validation
const validateGetDisputeDetails = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required()
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

// Get user disputes validation
const validateGetUserDisputes = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED').optional(),
    type: Joi.string().valid(
      'DELIVERY_DELAY',
      'PACKAGE_DAMAGE',
      'WRONG_PACKAGE',
      'PAYMENT_ISSUE',
      'DRIVER_BEHAVIOR',
      'CUSTOMER_BEHAVIOR',
      'LOST_PACKAGE',
      'OTHER'
    ).optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
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

// Get driver disputes validation
const validateGetDriverDisputes = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED').optional(),
    type: Joi.string().valid(
      'DELIVERY_DELAY',
      'PACKAGE_DAMAGE',
      'WRONG_PACKAGE',
      'PAYMENT_ISSUE',
      'DRIVER_BEHAVIOR',
      'CUSTOMER_BEHAVIOR',
      'LOST_PACKAGE',
      'OTHER'
    ).optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
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

// Get all disputes validation
const validateGetAllDisputes = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED').optional(),
    type: Joi.string().valid(
      'DELIVERY_DELAY',
      'PACKAGE_DAMAGE',
      'WRONG_PACKAGE',
      'PAYMENT_ISSUE',
      'DRIVER_BEHAVIOR',
      'CUSTOMER_BEHAVIOR',
      'LOST_PACKAGE',
      'OTHER'
    ).optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    reporterType: Joi.string().valid('USER', 'DRIVER').optional(),
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

// Update dispute status validation
const validateUpdateDisputeStatus = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required(),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED').required(),
    assignedTo: Joi.string().optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
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

// Add dispute communication validation
const validateAddDisputeCommunication = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required(),
    message: Joi.string().max(2000).required(),
    attachments: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO').required(),
        url: Joi.string().uri().required(),
        description: Joi.string().max(500).optional()
      })
    ).optional()
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

// Add dispute evidence validation
const validateAddDisputeEvidence = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required(),
    type: Joi.string().valid('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO').required(),
    url: Joi.string().uri().required(),
    description: Joi.string().max(500).optional(),
    uploadedBy: Joi.string().optional()
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

// Resolve dispute validation
const validateResolveDispute = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required(),
    resolution: Joi.string().valid(
      'REFUND_ISSUED',
      'DRIVER_PENALIZED',
      'CUSTOMER_PENALIZED',
      'NO_ACTION',
      'PARTIAL_REFUND',
      'COMPENSATION_ISSUED',
      'OTHER'
    ).required(),
    action: Joi.string().max(500).required(),
    notes: Joi.string().max(2000).optional()
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

// Get dispute statistics validation
const validateGetDisputeStatistics = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    type: Joi.string().valid(
      'DELIVERY_DELAY',
      'PACKAGE_DAMAGE',
      'WRONG_PACKAGE',
      'PAYMENT_ISSUE',
      'DRIVER_BEHAVIOR',
      'CUSTOMER_BEHAVIOR',
      'LOST_PACKAGE',
      'OTHER'
    ).optional(),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED').optional(),
    reporterType: Joi.string().valid('USER', 'DRIVER').optional()
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

// Get dispute trends validation
const validateGetDisputeTrends = (req, res, next) => {
  const schema = Joi.object({
    period: Joi.string().valid('day', 'week', 'month').default('month')
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
  validateCreateDispute,
  validateGetDisputeDetails,
  validateGetUserDisputes,
  validateGetDriverDisputes,
  validateGetAllDisputes,
  validateUpdateDisputeStatus,
  validateAddDisputeCommunication,
  validateAddDisputeEvidence,
  validateResolveDispute,
  validateGetDisputeStatistics,
  validateGetDisputeTrends
};