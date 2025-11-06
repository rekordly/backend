const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const {
  validateSignup,
  validateLogin,
  validateAdminLogin,
  validateRequestOTP,
  validateVerifyOTP,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateLogout
} = require('./auth.validator');
const {
  authenticate,
  authenticateAdmin,
  optionalAuth
} = require('./auth.middleware');
const { authLimiter, passwordResetLimiter } = require('../../shared/middleware/rate-limiter');

// Public routes
router.post('/signup', authLimiter, validateSignup, authController.signup);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/admin/login', authLimiter, validateAdminLogin, authController.adminLogin);

// Password reset routes
router.post('/reset-password/request', passwordResetLimiter, validateRequestOTP, authController.requestPasswordReset);
router.post('/reset-password/verify-otp', validateVerifyOTP, authController.verifyOTP);
router.post('/reset-password/set-new', validateResetPassword, authController.resetPassword);

// Protected routes
router.use(authenticate);

// User profile routes
router.get('/me', authController.getCurrentUser);
router.put('/profile', validateUpdateProfile, authController.updateProfile);
router.put('/change-password', validateChangePassword, authController.changePassword);
router.post('/logout', validateLogout, authController.logout);

// Token refresh route
router.post('/refresh-token', authController.refreshToken);

// Admin routes
router.post('/admin/logout', authenticateAdmin, validateLogout, authController.adminLogout);
router.get('/admin/me', authenticateAdmin, authController.getCurrentAdmin);

module.exports = router;