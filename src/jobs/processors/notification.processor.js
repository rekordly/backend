const { logger } = require('../../shared/utils/logger');
const notificationService = require('../../modules/notification/notification.service');

// Notification processor - handles sending notifications asynchronously
const notificationProcessor = async (job) => {
  const { data } = job;
  logger.info('Processing notification job', { jobId: job.id, data });

  try {
    const { type, recipients, title, message, data: notificationData, channels = ['push'] } = data;

    const results = [];

    for (const recipient of recipients) {
      try {
        let result;

        switch (type) {
          case 'DELIVERY_STATUS_UPDATE':
            result = await sendDeliveryStatusUpdate(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
            break;

          case 'NEW_DELIVERY_REQUEST':
            result = await sendNewDeliveryRequest(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
            break;

          case 'DRIVER_ASSIGNED':
            result = await sendDriverAssigned(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
            break;

          case 'PAYMENT_CONFIRMED':
            result = await sendPaymentConfirmed(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
            break;

          case 'KYC_APPROVED':
          case 'KYC_REJECTED':
            result = await sendKycStatusUpdate(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
            break;

          default:
            result = await sendGenericNotification(recipient, {
              title,
              message,
              data: notificationData,
              channels,
            });
        }

        results.push({ recipient, success: true, result });
      } catch (error) {
        logger.error(`Failed to send notification to ${recipient}`, {
          error: error.message,
          jobId: job.id,
        });
        results.push({ recipient, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info(`Notification job completed`, {
      jobId: job.id,
      total: results.length,
      success: successCount,
      failures: failureCount,
    });

    return {
      success: failureCount === 0,
      total: results.length,
      successCount,
      failureCount,
      results,
    };
  } catch (error) {
    logger.error('Notification processor failed', { error: error.message, jobId: job.id });
    throw error;
  }
};

// Helper functions for different notification types
const sendDeliveryStatusUpdate = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToUser(recipient, {
    type: 'DELIVERY_STATUS_UPDATE',
    title,
    message,
    data,
    channels,
  });
};

const sendNewDeliveryRequest = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToDriver(recipient, {
    type: 'NEW_DELIVERY_REQUEST',
    title,
    message,
    data,
    channels,
  });
};

const sendDriverAssigned = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToUser(recipient, {
    type: 'DRIVER_ASSIGNED',
    title,
    message,
    data,
    channels,
  });
};

const sendPaymentConfirmed = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToUser(recipient, {
    type: 'PAYMENT_CONFIRMED',
    title,
    message,
    data,
    channels,
  });
};

const sendKycStatusUpdate = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToDriver(recipient, {
    type: data.type === 'KYC_APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
    title,
    message,
    data,
    channels,
  });
};

const sendGenericNotification = async (recipient, { title, message, data, channels }) => {
  return await notificationService.sendNotificationToUser(recipient, {
    type: 'GENERIC',
    title,
    message,
    data,
    channels,
  });
};

module.exports = {
  notificationProcessor,
};