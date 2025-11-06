const { logger } = require('../../shared/utils/logger');
const { prisma } = require('../../config/database');
const { ORDER_STATUS } = require('../../shared/enums');

// Auto-dispute processor - creates disputes for orders pending > 24 hours
const autoDisputeProcessor = async (job) => {
  const { data } = job;
  logger.info('Processing auto-dispute job', { jobId: job.id, data });

  try {
    // Find deliveries that have been pending for more than 24 hours
    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        status: ORDER_STATUS.PENDING,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
        disputedAt: null,
      },
      include: {
        user: true,
      },
    });

    logger.info(`Found ${pendingDeliveries.length} deliveries to auto-dispute`);

    for (const delivery of pendingDeliveries) {
      // Create dispute record
      const dispute = await prisma.dispute.create({
        data: {
          deliveryId: delivery.id,
          userId: delivery.userId,
          type: 'AUTO_TIMEOUT',
          description: 'Order automatically disputed due to 24-hour timeout',
          status: 'PENDING',
          priority: 'MEDIUM',
          createdAt: new Date(),
        },
      });

      // Update delivery status
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: ORDER_STATUS.DISPUTED,
          disputedAt: new Date(),
        },
      });

      logger.info(`Auto-dispute created for delivery ${delivery.id}`, {
        disputeId: dispute.id,
        userId: delivery.userId,
      });

      // TODO: Send notification to user about auto-dispute
      // await notificationService.sendNotificationToUser(delivery.userId, {
      //   type: 'AUTO_DISPUTE_CREATED',
      //   title: 'Order Auto-Disputed',
      //   message: 'Your order has been automatically disputed due to timeout',
      //   data: { deliveryId: delivery.id, disputeId: dispute.id }
      // });
    }

    return {
      success: true,
      processed: pendingDeliveries.length,
      message: `Processed ${pendingDeliveries.length} auto-disputes`,
    };
  } catch (error) {
    logger.error('Auto-dispute processor failed', { error: error.message, jobId: job.id });
    throw error;
  }
};

module.exports = {
  autoDisputeProcessor,
};