const driverService = require('./driver.service');
const { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class DriverController {
  // Get driver profile
  getDriverProfile = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const profile = await driverService.getDriverProfile(driverId);
    sendSuccess(res, profile);
  });

  // Update driver profile
  updateDriverProfile = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const profile = await driverService.updateDriverProfile(driverId, req.body);
    sendSuccess(res, profile, 'Profile updated successfully');
  });

  // Update driver location
  updateDriverLocation = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const location = await driverService.updateDriverLocation(driverId, req.body);
    sendSuccess(res, location, 'Location updated successfully');
  });

  // Update vehicle details
  updateVehicleDetails = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const vehicle = await driverService.updateVehicleDetails(driverId, req.body);
    sendSuccess(res, vehicle, 'Vehicle details updated successfully');
  });

  // Update driver availability
  updateDriverAvailability = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const availability = await driverService.updateDriverAvailability(driverId, req.body.isAvailable);
    sendSuccess(res, availability, 'Availability updated successfully');
  });

  // Update driver status
  updateDriverStatus = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const status = await driverService.updateDriverStatus(driverId, req.body.status);
    sendSuccess(res, status, 'Status updated successfully');
  });

  // Get nearby drivers
  getNearbyDrivers = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius, limit, vehicleType } = req.query;
    const drivers = await driverService.getNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius) || 10,
      parseInt(limit) || 10,
      vehicleType
    );
    sendSuccess(res, drivers);
  });

  // Get driver metrics
  getDriverMetrics = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { period } = req.query;
    const metrics = await driverService.getDriverMetrics(driverId, period);
    sendSuccess(res, metrics);
  });

  // Get driver earnings
  getDriverEarnings = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { period, startDate, endDate } = req.query;
    const earnings = await driverService.getDriverEarnings(driverId, period, startDate, endDate);
    sendSuccess(res, earnings);
  });

  // Get driver performance
  getDriverPerformance = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { period } = req.query;
    const performance = await driverService.getDriverPerformance(driverId, period);
    sendSuccess(res, performance);
  });

  // Get driver location history
  getDriverLocationHistory = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const { startDate, endDate, limit, offset } = req.query;
    const history = await driverService.getDriverLocationHistory(
      driverId,
      startDate,
      endDate,
      parseInt(limit) || 100,
      parseInt(offset) || 0
    );
    sendSuccess(res, history);
  });

  // Get driver dashboard
  getDriverDashboard = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const dashboard = await driverService.getDriverDashboard(driverId);
    sendSuccess(res, dashboard);
  });

  // Get driver by ID (admin only)
  getDriverById = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await driverService.getDriverProfile(driverId);
    sendSuccess(res, driver);
  });

  // Get all drivers (admin only)
  getAllDrivers = asyncHandler(async (req, res) => {
    const { page, limit, status, kycStatus, vehicleType } = req.query;
    // This would be implemented with pagination and filtering
    sendSuccess(res, { message: 'Get all drivers endpoint' });
  });

  // Update driver status (admin only)
  updateDriverStatusAdmin = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { status } = req.body;
    const driver = await driverService.updateDriverStatus(driverId, status);
    sendSuccess(res, driver, 'Driver status updated successfully');
  });

  // Delete driver (admin only)
  deleteDriver = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    // This would implement soft delete
    sendSuccess(res, { message: 'Driver deleted successfully' });
  });
}

module.exports = new DriverController();