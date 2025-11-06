const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const {
  validateGetUserNotifications,
  validateGetNotificationDetails,
  validateMarkNotificationAsRead,
  validateMarkAllNotificationsAsRead,
  validateDeleteNotification,
  validateRegisterDeviceToken,
  validateUnregisterDeviceToken,
  validateUpdateNotificationPreferences,
  validateGetNotificationPreferences,
  validateSendBulkNotifications,
  validateSendNotificationToAll,
  validateSendNotificationToAllDrivers,
  validateGetNotificationStatistics
} = require('./notification.validator');
const {
  authenticate,
  authorize,
  authorizeDriver,
  authorizeUser
} = require('../auth/auth.middleware');

// User routes
router.use(authenticate);
router.use(authorizeUser);

// User notification routes
router.get('/notifications', validateGetUserNotifications, notificationController.getUserNotifications);
router.get('/notifications/:notificationId', validateGetNotificationDetails, notificationController.getNotificationDetails);
router.put('/notifications/:notificationId/read', validateMarkNotificationAsRead, notificationController.markNotificationAsRead);
router.put('/notifications/read-all', validateMarkAllNotificationsAsRead, notificationController.markAllNotificationsAsRead);
router.delete('/notifications/:notificationId', validateDeleteNotification, notificationController.deleteNotification);

// Device token routes
router.post('/device-token', validateRegisterDeviceToken, notificationController.registerDeviceToken);
router.delete('/device-token', validateUnregisterDeviceToken, notificationController.unregisterDeviceToken);

// Notification preferences routes
router.get('/notification-preferences', validateGetNotificationPreferences, notificationController.getNotificationPreferences);
router.put('/notification-preferences', validateUpdateNotificationPreferences, notificationController.updateNotificationPreferences);

// Driver routes
router.use('/driver', authenticate, authorizeDriver);

// Driver notification routes
router.get('/driver/notifications', validateGetUserNotifications, notificationController.getUserNotifications);
router.get('/driver/notifications/:notificationId', validateGetNotificationDetails, notificationController.getNotificationDetails);
router.put('/driver/notifications/:notificationId/read', validateMarkNotificationAsRead, notificationController.markNotificationAsRead);
router.put('/driver/notifications/read-all', validateMarkAllNotificationsAsRead, notificationController.markAllNotificationsAsRead);
router.delete('/driver/notifications/:notificationId', validateDeleteNotification, notificationController.deleteNotification);

// Driver device token routes
router.post('/driver/device-token', validateRegisterDeviceToken, notificationController.registerDeviceToken);
router.delete('/driver/device-token', validateUnregisterDeviceToken, notificationController.unregisterDeviceToken);

// Driver notification preferences routes
router.get('/driver/notification-preferences', validateGetNotificationPreferences, notificationController.getNotificationPreferences);
router.put('/driver/notification-preferences', validateUpdateNotificationPreferences, notificationController.updateNotificationPreferences);

// Admin routes
router.use('/admin', authenticate, authorize('ADMIN'));

// Admin notification routes
router.post('/admin/notifications/bulk', validateSendBulkNotifications, notificationController.sendBulkNotifications);
router.post('/admin/notifications/send-to-all', validateSendNotificationToAll, notificationController.sendNotificationToAll);
router.post('/admin/notifications/send-to-drivers', validateSendNotificationToAllDrivers, notificationController.sendNotificationToAllDrivers);
router.get('/admin/notifications/statistics', validateGetNotificationStatistics, notificationController.getNotificationStatistics);

module.exports = router;