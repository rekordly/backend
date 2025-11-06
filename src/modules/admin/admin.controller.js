const adminService = require('./admin.service');
const { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class AdminController {
  // Get dashboard statistics
  getDashboardStatistics = asyncHandler(async (req, res) => {
    const statistics = await adminService.getDashboardStatistics();
    sendSuccess(res, statistics);
  });

  // Get all users
  getAllUsers = asyncHandler(async (req, res) => {
    const users = await adminService.getAllUsers(req.query);
    sendSuccess(res, users);
  });

  // Get user details
  getUserDetails = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await adminService.getUserDetails(userId);
    sendSuccess(res, user);
  });

  // Update user
  updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await adminService.updateUser(userId, req.body);
    sendSuccess(res, user, 'User updated successfully');
  });

  // Delete user
  deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await adminService.deleteUser(userId);
    sendSuccess(res, user, 'User deleted successfully');
  });

  // Get all drivers
  getAllDrivers = asyncHandler(async (req, res) => {
    const drivers = await adminService.getAllDrivers(req.query);
    sendSuccess(res, drivers);
  });

  // Get driver details
  getDriverDetails = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await adminService.getDriverDetails(driverId);
    sendSuccess(res, driver);
  });

  // Update driver
  updateDriver = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await adminService.updateDriver(driverId, req.body);
    sendSuccess(res, driver, 'Driver updated successfully');
  });

  // Delete driver
  deleteDriver = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await adminService.deleteDriver(driverId);
    sendSuccess(res, driver, 'Driver deleted successfully');
  });

  // Get KYC pending drivers
  getKycPendingDrivers = asyncHandler(async (req, res) => {
    const drivers = await adminService.getKycPendingDrivers(req.query);
    sendSuccess(res, drivers);
  });

  // Get driver KYC documents
  getDriverKycDocuments = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await adminService.getDriverKycDocuments(driverId);
    sendSuccess(res, driver);
  });

  // Approve KYC document
  approveKycDocument = asyncHandler(async (req, res) => {
    const { driverId, documentId } = req.params;
    const adminId = req.user.id;
    const document = await adminService.approveKycDocument(driverId, documentId, adminId);
    sendSuccess(res, document, 'KYC document approved successfully');
  });

  // Reject KYC document
  rejectKycDocument = asyncHandler(async (req, res) => {
    const { driverId, documentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const document = await adminService.rejectKycDocument(driverId, documentId, reason, adminId);
    sendSuccess(res, document, 'KYC document rejected successfully');
  });

  // Get system settings
  getSystemSettings = asyncHandler(async (req, res) => {
    const settings = await adminService.getSystemSettings();
    sendSuccess(res, settings);
  });

  // Update system settings
  updateSystemSettings = asyncHandler(async (req, res) => {
    const result = await adminService.updateSystemSettings(req.body);
    sendSuccess(res, result);
  });

  // Get system logs
  getSystemLogs = asyncHandler(async (req, res) => {
    const logs = await adminService.getSystemLogs(req.query);
    sendSuccess(res, logs);
  });

  // Get analytics
  getAnalytics = asyncHandler(async (req, res) => {
    const analytics = await adminService.getAnalytics(req.query);
    sendSuccess(res, analytics);
  });
}

module.exports = new AdminController();