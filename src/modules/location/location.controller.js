const locationService = require('./location.service');
const { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class LocationController {
  // Update driver location
  updateDriverLocation = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const location = await locationService.updateDriverLocation(driverId, req.body);
    sendSuccess(res, location, 'Location updated successfully');
  });

  // Get driver location
  getDriverLocation = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const location = await locationService.getDriverLocation(driverId);
    sendSuccess(res, location);
  });

  // Get driver location history
  getDriverLocationHistory = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { startDate, endDate, limit, offset } = req.query;
    const history = await locationService.getDriverLocationHistory(
      driverId,
      startDate,
      endDate,
      parseInt(limit) || 100,
      parseInt(offset) || 0
    );
    sendSuccess(res, history);
  });

  // Update delivery location
  updateDeliveryLocation = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const location = await locationService.updateDeliveryLocation(deliveryId, req.body);
    sendSuccess(res, location, 'Delivery location updated successfully');
  });

  // Get delivery location
  getDeliveryLocation = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const location = await locationService.getDeliveryLocation(deliveryId);
    sendSuccess(res, location);
  });

  // Get delivery tracking history
  getDeliveryTrackingHistory = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const { limit, offset } = req.query;
    const tracking = await locationService.getDeliveryTrackingHistory(
      deliveryId,
      parseInt(limit) || 50,
      parseInt(offset) || 0
    );
    sendSuccess(res, tracking);
  });

  // Get nearby drivers
  getNearbyDrivers = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius, limit, vehicleType } = req.query;
    const drivers = await locationService.getNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius) || 10,
      parseInt(limit) || 10,
      vehicleType
    );
    sendSuccess(res, drivers);
  });

  // Get driver location from Redis (real-time)
  getDriverLocationFromRedis = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const location = await locationService.getDriverLocationFromRedis(driverId);
    
    if (!location) {
      return sendNotFound(res, 'Driver location not found in cache');
    }
    
    sendSuccess(res, location);
  });

  // Get delivery location from Redis (real-time)
  getDeliveryLocationFromRedis = asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    const location = await locationService.getDeliveryLocationFromRedis(deliveryId);
    
    if (!location) {
      return sendNotFound(res, 'Delivery location not found in cache');
    }
    
    sendSuccess(res, location);
  });

  // Batch update driver locations
  batchUpdateDriverLocations = asyncHandler(async (req, res) => {
    const { locations } = req.body;
    const results = await locationService.batchUpdateDriverLocations(locations);
    sendSuccess(res, results);
  });

  // Clean up old location data
  cleanupOldLocationData = asyncHandler(async (req, res) => {
    const { daysToKeep } = req.query;
    const result = await locationService.cleanupOldLocationData(parseInt(daysToKeep) || 30);
    sendSuccess(res, result, 'Old location data cleaned up successfully');
  });

  // Get driver location statistics
  getDriverLocationStatistics = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { period } = req.query;
    const statistics = await locationService.getDriverLocationStatistics(driverId, period);
    sendSuccess(res, statistics);
  });

  // Get geofence events
  getGeofenceEvents = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { startDate, endDate } = req.query;
    const events = await locationService.getGeofenceEvents(driverId, startDate, endDate);
    sendSuccess(res, events);
  });

  // Create geofence
  createGeofence = asyncHandler(async (req, res) => {
    const geofence = await locationService.createGeofence(req.body);
    sendCreated(res, geofence, 'Geofence created successfully');
  });
}

module.exports = new LocationController();