const disputeService = require('./dispute.service');
const { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class DisputeController {
  // Create dispute
  createDispute = asyncHandler(async (req, res) => {
    const userId = req.user.role === 'USER' ? req.user.id : null;
    const driverId = req.user.role === 'DRIVER' ? req.user.driver.id : null;
    const dispute = await disputeService.createDispute(userId, driverId, req.body);
    sendCreated(res, dispute, 'Dispute created successfully');
  });

  // Get dispute details
  getDisputeDetails = asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const userId = req.user.role === 'USER' ? req.user.id : null;
    const driverId = req.user.role === 'DRIVER' ? req.user.driver.id : null;
    const dispute = await disputeService.getDisputeDetails(disputeId, userId, driverId);
    sendSuccess(res, dispute);
  });

  // Get user disputes
  getUserDisputes = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const disputes = await disputeService.getUserDisputes(userId, req.query);
    sendSuccess(res, disputes);
  });

  // Get driver disputes
  getDriverDisputes = asyncHandler(async (req, res) => {
    const driverId = req.user.driver.id;
    const disputes = await disputeService.getDriverDisputes(driverId, req.query);
    sendSuccess(res, disputes);
  });

  // Get all disputes (admin)
  getAllDisputes = asyncHandler(async (req, res) => {
    const disputes = await disputeService.getAllDisputes(req.query);
    sendSuccess(res, disputes);
  });

  // Update dispute status
  updateDisputeStatus = asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const { status, ...updateData } = req.body;
    const dispute = await disputeService.updateDisputeStatus(disputeId, status, updateData);
    sendSuccess(res, dispute, 'Dispute status updated successfully');
  });

  // Add communication to dispute
  addDisputeCommunication = asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const { message, attachments } = req.body;
    const senderId = req.user.id;
    const communication = await disputeService.addDisputeCommunication(disputeId, senderId, message, attachments);
    sendSuccess(res, communication, 'Communication added successfully');
  });

  // Add evidence to dispute
  addDisputeEvidence = asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const evidence = await disputeService.addDisputeEvidence(disputeId, req.body);
    sendSuccess(res, evidence, 'Evidence added successfully');
  });

  // Resolve dispute
  resolveDispute = asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const resolutionData = {
      ...req.body,
      resolvedBy: req.user.id
    };
    const result = await disputeService.resolveDispute(disputeId, resolutionData);
    sendSuccess(res, result, 'Dispute resolved successfully');
  });

  // Get dispute statistics
  getDisputeStatistics = asyncHandler(async (req, res) => {
    const statistics = await disputeService.getDisputeStatistics(req.query);
    sendSuccess(res, statistics);
  });

  // Get dispute trends
  getDisputeTrends = asyncHandler(async (req, res) => {
    const { period } = req.query;
    const trends = await disputeService.getDisputeTrends(period);
    sendSuccess(res, trends);
  });
}

module.exports = new DisputeController();