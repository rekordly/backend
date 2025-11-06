const userService = require('./user.service');
const { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class UserController {
  // Get user profile
  getUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await userService.getUserProfile(userId);
    sendSuccess(res, profile);
  });

  // Update user profile
  updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await userService.updateUserProfile(userId, req.body);
    sendSuccess(res, profile, 'Profile updated successfully');
  });

  // Create delivery
  createDelivery = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const delivery = await userService.createDelivery(userId, req.body);
    sendCreated(res, delivery, 'Delivery created successfully');
  });

  // Estimate fare
  estimateFare = asyncHandler(async (req, res) => {
    const fare = await userService.estimateFare(req.body.pickupCoords, req.body.dropoffCoords, req.body.packageDetails);
    sendSuccess(res, fare);
  });

  // Get user orders
  getUserOrders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const orders = await userService.getUserOrders(userId, req.query);
    sendSuccess(res, orders);
  });

  // Get order details
  getOrderDetails = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const order = await userService.getOrderDetails(userId, orderId);
    sendSuccess(res, order);
  });

  // Cancel order
  cancelOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await userService.cancelOrder(userId, orderId, reason);
    sendSuccess(res, order, 'Order cancelled successfully');
  });

  // Track delivery
  trackDelivery = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { deliveryId } = req.params;
    const tracking = await userService.trackDelivery(userId, deliveryId);
    sendSuccess(res, tracking);
  });

  // Confirm payment
  confirmPayment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { deliveryId } = req.params;
    const payment = await userService.confirmPayment(userId, deliveryId, req.body);
    sendSuccess(res, payment, 'Payment confirmed successfully');
  });

  // Rate delivery
  rateDelivery = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { deliveryId } = req.params;
    const { rating, comment } = req.body;
    const result = await userService.rateDelivery(userId, deliveryId, rating, comment);
    sendSuccess(res, result);
  });

  // Get saved addresses
  getSavedAddresses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addresses = await userService.getSavedAddresses(userId);
    sendSuccess(res, addresses);
  });

  // Create saved address
  createSavedAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const address = await userService.createSavedAddress(userId, req.body);
    sendCreated(res, address, 'Saved address created successfully');
  });

  // Update saved address
  updateSavedAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { addressId } = req.params;
    const address = await userService.updateSavedAddress(userId, addressId, req.body);
    sendSuccess(res, address, 'Saved address updated successfully');
  });

  // Delete saved address
  deleteSavedAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { addressId } = req.params;
    const result = await userService.deleteSavedAddress(userId, addressId);
    sendSuccess(res, result);
  });

  // Get user notifications
  getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notifications = await userService.getUserNotifications(userId, req.query);
    sendSuccess(res, notifications);
  });

  // Mark notification as read
  markNotificationAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const notification = await userService.markNotificationAsRead(userId, notificationId);
    sendSuccess(res, notification, 'Notification marked as read');
  });

  // Mark all notifications as read
  markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await userService.markAllNotificationsAsRead(userId);
    sendSuccess(res, result);
  });

  // Get user statistics
  getUserStatistics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    // This would be implemented to return user statistics
    sendSuccess(res, { message: 'User statistics endpoint' });
  });

  // Get user activity log
  getUserActivityLog = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    // This would be implemented to return user activity log
    sendSuccess(res, { message: 'User activity log endpoint' });
  });
}

module.exports = new UserController();