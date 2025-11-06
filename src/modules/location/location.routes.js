const express = require('express');
const router = express.Router();
const locationController = require('./location.controller');
const {
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
} = require('./location.validator');
const {
  authenticate,
  authorizeDriver,
  authorizeUser,
  authorize
} = require('../auth/auth.middleware');
const { locationUpdateLimiter } = require('../../shared/middleware/rate-limiter');

// Public routes (no authentication required)
router.get('/nearby-drivers', validateGetNearbyDrivers, locationController.getNearbyDrivers);

// Driver routes
router.use(authenticate);
router.use(authorizeDriver);

// Driver location routes
router.post('/driver/location', locationUpdateLimiter, validateUpdateDriverLocation, locationController.updateDriverLocation);
router.get('/driver/location', validateGetDriverLocation, locationController.getDriverLocation);
router.get('/driver/location/history', validateGetDriverLocationHistory, locationController.getDriverLocationHistory);
router.get('/driver/location/cache', locationController.getDriverLocationFromRedis);
router.get('/driver/location/statistics', validateGetDriverLocationStatistics, locationController.getDriverLocationStatistics);

// Delivery location routes
router.post('/delivery/:deliveryId/location', locationUpdateLimiter, validateUpdateDeliveryLocation, locationController.updateDeliveryLocation);
router.get('/delivery/:deliveryId/location', validateGetDeliveryLocation, locationController.getDeliveryLocation);
router.get('/delivery/:deliveryId/location/cache', locationController.getDeliveryLocationFromRedis);
router.get('/delivery/:deliveryId/tracking', validateGetDeliveryTrackingHistory, locationController.getDeliveryTrackingHistory);

// Geofence routes
router.get('/driver/geofence/events', validateGetGeofenceEvents, locationController.getGeofenceEvents);
router.post('/geofence', validateCreateGeofence, locationController.createGeofence);

// Admin routes
router.use('/admin', authenticate, authorize('ADMIN'));

// Admin location routes
router.post('/admin/locations/batch', validateBatchUpdateDriverLocations, locationController.batchUpdateDriverLocations);
router.post('/admin/locations/cleanup', validateCleanupOldLocationData, locationController.cleanupOldLocationData);

module.exports = router;