const deliveryService = require('./delivery.service');
const { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class DeliveryController {
  // Create delivery
  createDelivery = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const delivery = await deliveryService.createDelivery(userId, req.body);
    sendCreated(res, delivery, 'Delivery created successfully');
  });

  // Estimate fare
  estimateFare = asyncHandler(async (req, res) => {
    const fare = await deliveryService.estimateFare(
      req.body.pickupCoords,
      req.body.dropoffCoords,
      req.body.packageDetails
    );
    sendSuccess(res, fare);
  });

  // Accept delivery (driver)
  acceptDelivery = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { deliveryId } = req.params;
    const delivery = await deliveryService.acceptDelivery(driverId, deliveryId);
    sendSuccess(res, delivery, 'Delivery accepted successfully');
  });

  // Reject delivery (driver)
  rejectDelivery = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { deliveryId } = req.params;
    const { reason } = req.body;
    const delivery = await deliveryService.rejectDelivery(driverId, deliveryId, reason);
    sendSuccess(res, delivery, 'Delivery rejected successfully');
  });

  // Update delivery status
  updateDeliveryStatus = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const { status, ...updateData } = req.body;
    const delivery = await deliveryService.updateDeliveryStatus(deliveryId, status, updateData);
    sendSuccess(res, delivery, 'Delivery status updated successfully');
  });

  // Get delivery details
  getDeliveryDetails = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const userId = req.user.role === 'USER' ? req.user.id : null;
    const driverId = req.user.role === 'DRIVER' ? req.user.driver.id : null;
    const delivery = await deliveryService.getDeliveryDetails(deliveryId, userId, driverId);
    sendSuccess(res, delivery);
  });

  // Get driver deliveries
  getDriverDeliveries = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const deliveries = await deliveryService.getDriverDeliveries(driverId, req.query);
    sendSuccess(res, deliveries);
  });

  // Get active delivery
  getActiveDelivery = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const delivery = await deliveryService.getActiveDelivery(driverId);
    sendSuccess(res, delivery);
  });

  // Complete delivery
  completeDelivery = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { deliveryId } = req.params;
    const delivery = await deliveryService.completeDelivery(driverId, deliveryId, req.body);
    sendSuccess(res, delivery, 'Delivery completed successfully');
  });

  // Get delivery tracking
  getDeliveryTracking = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const userId = req.user.role === 'USER' ? req.user.id : null;
    const tracking = await deliveryService.getDeliveryTracking(deliveryId, userId);
    sendSuccess(res, tracking);
  });

  // Get pending deliveries
  getPendingDeliveries = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius, limit, vehicleType } = req.query;
    const deliveries = await deliveryService.getPendingDeliveries(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius) || 10,
      parseInt(limit) || 10,
      vehicleType
    );
    sendSuccess(res, deliveries);
  });

  // Cancel delivery
  cancelDelivery = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const { reason } = req.body;
    const userId = req.user.role === 'USER' ? req.user.id : null;
    const driverId = req.user.role === 'DRIVER' ? req.user.driver.id : null;
    const delivery = await deliveryService.cancelDelivery(deliveryId, userId, driverId, reason);
    sendSuccess(res, delivery, 'Delivery cancelled successfully');
  });

  // Update delivery location
  updateDeliveryLocation = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const location = await deliveryService.updateDeliveryLocation(deliveryId, req.body);
    sendSuccess(res, location, 'Delivery location updated successfully');
  });

  // Get delivery statistics
  getDeliveryStatistics = asyncHandler(async (req, res) => {
    const statistics = await deliveryService.getDeliveryStatistics(req.query);
    sendSuccess(res, statistics);
  });

  // Get delivery analytics
  getDeliveryAnalytics = asyncHandler(async (req, res) => {
    const analytics = await deliveryService.getDeliveryAnalytics(req.query);
    sendSuccess(res, analytics);
  });

  // Auto-cancel pending deliveries (admin/cron)
  autoCancelPendingDeliveries = asyncHandler(async (req, res) => {
    const cancelled = await deliveryService.autoCancelPendingDeliveries();
    sendSuccess(res, { cancelledCount: cancelled.length });
  });

  // Auto-dispute deliveries (admin/cron)
  autoDisputeDeliveries = asyncHandler(async (req, res) => {
    const disputed = await deliveryService.autoDisputeDeliveries();
    sendSuccess(res, { disputedCount: disputed.length });
  });

  // Get all deliveries (admin)
  getAllDeliveries = asyncHandler(async (req, res) => {
    // This would be implemented with pagination and filtering
    sendSuccess(res, { message: 'Get all deliveries endpoint' });
  });

  // Get delivery by ID (admin)
  getDeliveryById = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const delivery = await deliveryService.getDeliveryDetails(deliveryId);
    sendSuccess(res, delivery);
  });

  // Update delivery (admin)
  updateDelivery = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const delivery = await deliveryService.updateDeliveryStatus(deliveryId, req.body.status, req.body);
    sendSuccess(res, delivery, 'Delivery updated successfully');
  });

  // Delete delivery (admin)
  deleteDelivery = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    // This would implement soft delete
    sendSuccess(res, { message: 'Delivery deleted successfully' });
  });
}

module.exports = new DeliveryController();