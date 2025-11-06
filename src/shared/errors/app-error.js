const { ERROR_CODES } = require('../../config/constants');

class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR);
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, ERROR_CODES.AUTHENTICATION_ERROR);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Authorization failed') {
    super(message, 403, ERROR_CODES.AUTHORIZATION_ERROR);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

class RateLimitExceededError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
}

class KycPendingError extends AppError {
  constructor(message = 'KYC verification pending') {
    super(message, 403, ERROR_CODES.KYC_PENDING);
  }
}

class OrderNotFoundError extends AppError {
  constructor(message = 'Order not found') {
    super(message, 404, ERROR_CODES.ORDER_NOT_FOUND);
  }
}

class DriverNotAvailableError extends AppError {
  constructor(message = 'Driver not available') {
    super(message, 400, ERROR_CODES.DRIVER_NOT_AVAILABLE);
  }
}

// Factory function to create errors
const createError = (code, message = null, statusCode = null) => {
  const errorConfig = {
    [ERROR_CODES.VALIDATION_ERROR]: {
      statusCode: 400,
      defaultMessage: 'Validation error'
    },
    [ERROR_CODES.AUTHENTICATION_ERROR]: {
      statusCode: 401,
      defaultMessage: 'Authentication failed'
    },
    [ERROR_CODES.AUTHORIZATION_ERROR]: {
      statusCode: 403,
      defaultMessage: 'Authorization failed'
    },
    [ERROR_CODES.NOT_FOUND]: {
      statusCode: 404,
      defaultMessage: 'Resource not found'
    },
    [ERROR_CODES.CONFLICT]: {
      statusCode: 409,
      defaultMessage: 'Resource conflict'
    },
    [ERROR_CODES.INTERNAL_ERROR]: {
      statusCode: 500,
      defaultMessage: 'Internal server error'
    },
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
      statusCode: 429,
      defaultMessage: 'Rate limit exceeded'
    },
    [ERROR_CODES.KYC_PENDING]: {
      statusCode: 403,
      defaultMessage: 'KYC verification pending'
    },
    [ERROR_CODES.ORDER_NOT_FOUND]: {
      statusCode: 404,
      defaultMessage: 'Order not found'
    },
    [ERROR_CODES.DRIVER_NOT_AVAILABLE]: {
      statusCode: 400,
      defaultMessage: 'Driver not available'
    }
  };

  const config = errorConfig[code] || errorConfig[ERROR_CODES.INTERNAL_ERROR];
  
  return new AppError(
    message || config.defaultMessage,
    statusCode || config.statusCode,
    code
  );
};

// Async error wrapper for express routes
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitExceededError,
  KycPendingError,
  OrderNotFoundError,
  DriverNotAvailableError,
  createError,
  asyncHandler
};