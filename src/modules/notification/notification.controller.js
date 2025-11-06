const notificationService = require('./notification.service');
const { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class NotificationController {
  // Get user notifications
  getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notifications = await notificationService.getUserNotifications(userId, req.query);
    sendSuccess(res, notifications);
  });

  // Get notification details
  getNotificationDetails = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const notification = await notificationService.getNotificationDetails(notificationId, userId);
    sendSuccess(res, notification);
  });

  // Mark notification as read
  markNotificationAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const notification = await notificationService.markNotificationAsRead(notificationId, userId);
    sendSuccess(res, notification, 'Notification marked as read');
  });

  // Mark all notifications as read
  markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notificationService.markAllNotificationsAsRead(userId);
    sendSuccess(res, result);
  });

  // Delete notification
  deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const result = await notificationService.deleteNotification(notificationId, userId);
    sendSuccess(res, result);
  });

  // Register device token
  registerDeviceToken = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const deviceToken = await notificationService.registerDeviceToken(userId, req.body.token, req.body.deviceInfo);
    sendSuccess(res, deviceToken, 'Device token registered successfully');
  });

  // Unregister device token
  unregisterDeviceToken = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { token } = req.body;
    const result = await notificationService.unregisterDeviceToken(userId, token);
    sendSuccess(res, result);
  });

  // Update notification preferences
  updateNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = await notificationService.updateNotificationPreferences(userId, req.body);
    sendSuccess(res, preferences, 'Notification preferences updated successfully');
  });

  // Get notification preferences
  getNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = await notificationService.getNotificationPreferences(userId);
    sendSuccess(res, preferences);
  });

  // Send bulk notifications (admin)
  sendBulkNotifications = asyncHandler(async (req, res) => {
    const { userIds, type, title, message, data } = req.body;
    const result = await notificationService.sendBulkNotifications(userIds, type, title, message, data);
    sendSuccess(res, result);
  });

  // Send notification to all users (admin)
  sendNotificationToAll = asyncHandler(async (req, res) => {
    const { type, title, message, data } = req.body;
    const result = await notificationService.sendNotificationToAll(type, title, message, data);
    sendSuccess(res, result);
  });

  // Send notification to all drivers (admin)
  sendNotificationToAllDrivers = asyncHandler(async (req, res) => {
    const { type, title, message, data } = req.body;
    const result = await notificationService.sendNotificationToAllDrivers(type, title, message, data);
    sendSuccess(res, result);
  });

  // Get notification statistics (admin)
  getNotificationStatistics = asyncHandler(async (req, res) => {
    const statistics = await notificationService.getNotificationStatistics(req.query);
    sendSuccess(res, statistics);
  });
}

module.exports = new NotificationController();