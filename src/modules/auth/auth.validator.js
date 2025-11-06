const Joi = require('joi');
const { userSchemas, otpSchemas } = require('../../shared/errors/validation-error');

// Signup validation
const validateSignup = (req, res, next) => {
  const schema = Joi.object({
    ...userSchemas.signup.extract(['email', 'password', 'fullName', 'phoneNumber', 'role', 'locationState']),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
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

// Login validation
const validateLogin = (req, res, next) => {
  const { error } = userSchemas.login.validate(req.body, {
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

// Admin login validation
const validateAdminLogin = (req, res, next) => {
  const schema = Joi.object({
    adminEmail: Joi.string().email().required(),
    adminPassword: Joi.string().required()
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

// Request OTP validation
const validateRequestOTP = (req, res, next) => {
  const { error } = otpSchemas.requestOTP.validate(req.body, {
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

// Verify OTP validation
const validateVerifyOTP = (req, res, next) => {
  const { error } = otpSchemas.verifyOTP.validate(req.body, {
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

// Reset password validation
const validateResetPassword = (req, res, next) => {
  const schema = Joi.object({
    ...otpSchemas.resetPassword.extract(['email', 'newPassword', 'otp']),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
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

// Change password validation
const validateChangePassword = (req, res, next) => {
  const { error } = userSchemas.changePassword.validate(req.body, {
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
const validateUpdateProfile = (req, res, next) => {
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

// Logout validation (no body validation needed)
const validateLogout = (req, res, next) => {
  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateAdminLogin,
  validateRequestOTP,
  validateVerifyOTP,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateLogout
};