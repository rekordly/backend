const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const driverRoutes = require('../modules/driver/driver.routes');
const userRoutes = require('../modules/user/user.routes');
const deliveryRoutes = require('../modules/delivery/delivery.routes');
const locationRoutes = require('../modules/location/location.routes');
const disputeRoutes = require('../modules/dispute/dispute.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const notificationRoutes = require('../modules/notification/notification.routes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Module routes
router.use('/auth', authRoutes);
router.use('/driver', driverRoutes);
router.use('/user', userRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/location', locationRoutes);
router.use('/dispute', disputeRoutes);
router.use('/admin', adminRoutes);
router.use('/notification', notificationRoutes);

module.exports = router;
