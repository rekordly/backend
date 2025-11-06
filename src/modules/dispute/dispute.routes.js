const express = require('express');
const router = express.Router();
const disputeController = require('./dispute.controller');
const {
  validateCreateDispute,
  validateGetDisputeDetails,
  validateGetUserDisputes,
  validateGetDriverDisputes,
  validateGetAllDisputes,
  validateUpdateDisputeStatus,
  validateAddDisputeCommunication,
  validateAddDisputeEvidence,
  validateResolveDispute,
  validateGetDisputeStatistics,
  validateGetDisputeTrends
} = require('./dispute.validator');
const {
  authenticate,
  authorizeDriver,
  authorizeUser,
  authorize
} = require('../auth/auth.middleware');

// User routes
router.use(authenticate);
router.use(authorizeUser);

// User dispute routes
router.post('/disputes', validateCreateDispute, disputeController.createDispute);
router.get('/disputes', validateGetUserDisputes, disputeController.getUserDisputes);
router.get('/disputes/:disputeId', validateGetDisputeDetails, disputeController.getDisputeDetails);
router.post('/disputes/:disputeId/communications', validateAddDisputeCommunication, disputeController.addDisputeCommunication);
router.post('/disputes/:disputeId/evidence', validateAddDisputeEvidence, disputeController.addDisputeEvidence);

// Driver routes
router.use('/driver', authenticate, authorizeDriver);

// Driver dispute routes
router.get('/driver/disputes', validateGetDriverDisputes, disputeController.getDriverDisputes);
router.get('/driver/disputes/:disputeId', validateGetDisputeDetails, disputeController.getDisputeDetails);
router.post('/driver/disputes/:disputeId/communications', validateAddDisputeCommunication, disputeController.addDisputeCommunication);
router.post('/driver/disputes/:disputeId/evidence', validateAddDisputeEvidence, disputeController.addDisputeEvidence);

// Admin routes
router.use('/admin', authenticate, authorize('ADMIN'));

// Admin dispute routes
router.get('/admin/disputes', validateGetAllDisputes, disputeController.getAllDisputes);
router.get('/admin/disputes/:disputeId', validateGetDisputeDetails, disputeController.getDisputeDetails);
router.put('/admin/disputes/:disputeId/status', validateUpdateDisputeStatus, disputeController.updateDisputeStatus);
router.post('/admin/disputes/:disputeId/resolve', validateResolveDispute, disputeController.resolveDispute);
router.get('/admin/disputes/statistics', validateGetDisputeStatistics, disputeController.getDisputeStatistics);
router.get('/admin/disputes/trends', validateGetDisputeTrends, disputeController.getDisputeTrends);

module.exports = router;