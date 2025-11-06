const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const {
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
} = require('./admin.validator');
const {
  authenticate,
  authorize
} = require('../auth/auth.middleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard routes
router.get('/dashboard/statistics', adminController.getDashboardStatistics);

// User management routes
router.get('/users', validateGetAllUsers, adminController.getAllUsers);
router.get('/users/:userId', validateGetUserDetails, adminController.getUserDetails);
router.put('/users/:userId', validateUpdateUser, adminController.updateUser);
router.delete('/users/:userId', validateDeleteUser, adminController.deleteUser);

// Driver management routes
router.get('/drivers', validateGetAllDrivers, adminController.getAllDrivers);
router.get('/drivers/:driverId', validateGetDriverDetails, adminController.getDriverDetails);
router.put('/drivers/:driverId', validateUpdateDriver, adminController.updateDriver);
router.delete('/drivers/:driverId', validateDeleteDriver, adminController.deleteDriver);

// KYC management routes
router.get('/kyc/pending-drivers', validateGetKycPendingDrivers, adminController.getKycPendingDrivers);
router.get('/kyc/drivers/:driverId/documents', validateGetDriverKycDocuments, adminController.getDriverKycDocuments);
router.put('/kyc/drivers/:driverId/documents/:documentId/approve', validateApproveKycDocument, adminController.approveKycDocument);
router.put('/kyc/drivers/:driverId/documents/:documentId/reject', validateRejectKycDocument, adminController.rejectKycDocument);

// System settings routes
router.get('/settings', validateGetSystemSettings, adminController.getSystemSettings);
router.put('/settings', validateUpdateSystemSettings, adminController.updateSystemSettings);

// System monitoring routes
router.get('/logs', validateGetSystemLogs, adminController.getSystemLogs);
router.get('/analytics', validateGetAnalytics, adminController.getAnalytics);

module.exports = router;