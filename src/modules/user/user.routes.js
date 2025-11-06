const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const {
  validateUpdateUserProfile,
  validateCreateDelivery,
  validateEstimateFare,
  validateGetUserOrders,
  validateGetOrderDetails,
  validateCancelOrder,
  validateTrackDelivery,
  validateConfirmPayment,
  validateRateDelivery,
  validateGetSavedAddresses,
  validateCreateSavedAddress,
  validateUpdateSavedAddress,
  validateDeleteSavedAddress,
  validateGetUserNotifications,
  validateMarkNotificationAsRead,
  validateGetUserProfile
} = require('./user.validator');
const {
  authenticate,
  authorizeUser
} = require('../auth/auth.middleware');
const { uploadGoodsImageMiddleware } = require('../../shared/middleware/upload');

// All user routes require authentication and user role
router.use(authenticate);
router.use(authorizeUser);

// User profile routes
router.get('/profile', validateGetUserProfile, userController.getUserProfile);
router.put('/profile', validateUpdateUserProfile, userController.updateUserProfile);

// Delivery routes
router.post('/deliveries', uploadGoodsImageMiddleware, validateCreateDelivery, userController.createDelivery);
router.get('/deliveries', validateGetUserOrders, userController.getUserOrders);
router.get('/deliveries/:orderId', validateGetOrderDetails, userController.getOrderDetails);
router.put('/deliveries/:orderId/cancel', validateCancelOrder, userController.cancelOrder);
router.get('/deliveries/:deliveryId/track', validateTrackDelivery, userController.trackDelivery);
router.post('/deliveries/:deliveryId/payment', validateConfirmPayment, userController.confirmPayment);
router.post('/deliveries/:deliveryId/rate', validateRateDelivery, userController.rateDelivery);

// Fare estimation
router.post('/estimate-fare', validateEstimateFare, userController.estimateFare);

// Saved addresses routes
router.get('/addresses', validateGetSavedAddresses, userController.getSavedAddresses);
router.post('/addresses', validateCreateSavedAddress, userController.createSavedAddress);
router.put('/addresses/:addressId', validateUpdateSavedAddress, userController.updateSavedAddress);
router.delete('/addresses/:addressId', validateDeleteSavedAddress, userController.deleteSavedAddress);

// Notification routes
router.get('/notifications', validateGetUserNotifications, userController.getUserNotifications);
router.put('/notifications/:notificationId/read', validateMarkNotificationAsRead, userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);

// Statistics and activity routes
router.get('/statistics', userController.getUserStatistics);
router.get('/activity', userController.getUserActivityLog);

module.exports = router;