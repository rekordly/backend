const express = require('express');
const router = express.Router();
const driverController = require('./driver.controller');
const {
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
} = require('./driver.validator');
const {
  authenticate,
  authorizeDriver,
  authorize
} = require('../auth/auth.middleware');
const { locationUpdateLimiter } = require('../../shared/middleware/rate-limiter');

// All driver routes require authentication and driver role
router.use(authenticate);
router.use(authorizeDriver);

// Driver profile routes
router.get('/profile', validateGetDriverProfile, driverController.getDriverProfile);
router.put('/profile', validateUpdateDriverProfile, driverController.updateDriverProfile);

// Location routes
router.post('/location/update', locationUpdateLimiter, validateUpdateLocation, driverController.updateDriverLocation);
router.get('/location/history', validateGetDriverLocationHistory, driverController.getDriverLocationHistory);

// Vehicle routes
router.put('/vehicle', validateUpdateVehicleDetails, driverController.updateVehicleDetails);

// Availability routes
router.put('/availability', validateUpdateAvailability, driverController.updateDriverAvailability);

// Status routes
router.put('/status', validateUpdateDriverStatus, driverController.updateDriverStatus);

// Dashboard and metrics routes
router.get('/dashboard', validateGetDriverDashboard, driverController.getDriverDashboard);
router.get('/metrics', validateGetDriverMetrics, driverController.getDriverMetrics);
router.get('/earnings', validateGetDriverEarnings, driverController.getDriverEarnings);
router.get('/performance', validateGetDriverPerformance, driverController.getDriverPerformance);

// Public routes (for finding nearby drivers)
router.get('/nearby', validateGetNearbyDrivers, driverController.getNearbyDrivers);

// Admin routes
router.get('/admin/drivers', authorize('ADMIN'), driverController.getAllDrivers);
router.get('/admin/drivers/:driverId', authorize('ADMIN'), validateGetDriverProfile, driverController.getDriverById);
router.put('/admin/drivers/:driverId/status', authorize('ADMIN'), validateUpdateDriverStatus, driverController.updateDriverStatusAdmin);
router.delete('/admin/drivers/:driverId', authorize('ADMIN'), driverController.deleteDriver);

module.exports = router;