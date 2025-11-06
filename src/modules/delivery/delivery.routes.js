const express = require('express');
const router = express.Router();
const deliveryController = require('./delivery.controller');
const {
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
} = require('./delivery.validator');
const {
  authenticate,
  authorizeDriver,
  authorizeUser,
  authorize
} = require('../auth/auth.middleware');
const { locationUpdateLimiter } = require('../../shared/middleware/rate-limiter');

// Public routes (no authentication required)
router.post('/estimate-fare', validateEstimateFare, deliveryController.estimateFare);

// User routes
router.use(authenticate);
router.use(authorizeUser);

// User delivery routes
router.post('/deliveries', validateCreateDelivery, deliveryController.createDelivery);
router.get('/deliveries/:deliveryId', validateGetDeliveryDetails, deliveryController.getDeliveryDetails);
router.get('/deliveries/:deliveryId/track', validateGetDeliveryTracking, deliveryController.getDeliveryTracking);
router.put('/deliveries/:deliveryId/cancel', validateCancelDelivery, deliveryController.cancelDelivery);

// Driver routes
router.use('/driver', authenticate, authorizeDriver);

// Driver delivery routes
router.get('/driver/deliveries', validateGetDriverDeliveries, deliveryController.getDriverDeliveries);
router.get('/driver/deliveries/active', validateGetActiveDelivery, deliveryController.getActiveDelivery);
router.post('/driver/deliveries/:deliveryId/accept', validateAcceptDelivery, deliveryController.acceptDelivery);
router.post('/driver/deliveries/:deliveryId/reject', validateRejectDelivery, deliveryController.rejectDelivery);
router.put('/driver/deliveries/:deliveryId/complete', validateCompleteDelivery, deliveryController.completeDelivery);
router.put('/driver/deliveries/:deliveryId/cancel', validateCancelDelivery, deliveryController.cancelDelivery);
router.post('/driver/deliveries/:deliveryId/location', locationUpdateLimiter, validateUpdateDeliveryLocation, deliveryController.updateDeliveryLocation);

// Get pending deliveries for drivers
router.get('/driver/deliveries/pending', validateGetPendingDeliveries, deliveryController.getPendingDeliveries);

// Admin routes
router.use('/admin', authenticate, authorize('ADMIN'));

// Admin delivery routes
router.get('/admin/deliveries', deliveryController.getAllDeliveries);
router.get('/admin/deliveries/:deliveryId', validateGetDeliveryDetails, deliveryController.getDeliveryById);
router.put('/admin/deliveries/:deliveryId', validateUpdateDeliveryStatus, deliveryController.updateDelivery);
router.delete('/admin/deliveries/:deliveryId', deliveryController.deleteDelivery);
router.get('/admin/deliveries/statistics', validateGetDeliveryStatistics, deliveryController.getDeliveryStatistics);
router.get('/admin/deliveries/analytics', validateGetDeliveryAnalytics, deliveryController.getDeliveryAnalytics);

// Cron/admin routes for automated tasks
router.post('/admin/deliveries/auto-cancel', deliveryController.autoCancelPendingDeliveries);
router.post('/admin/deliveries/auto-dispute', deliveryController.autoDisputeDeliveries);

module.exports = router;