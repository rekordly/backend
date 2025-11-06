const { prisma } = require('../../config/database');
const { AppError, NotFoundError } = require('../../shared/errors/app-error');
const { NOTIFICATION_TYPE, NOTIFICATION_STATUS } = require('../../config/constants');
const { logger } = require('../../shared/utils/logger');

class NotificationService {
  // Create notification
  async createNotification(userId, type, title, message, data = {}) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
        status: NOTIFICATION_STATUS.PENDING
      }
    });

    logger.info(`Notification created: ${notification.id} for user: ${userId}`);

    // Queue notification for sending
    await this.queueNotification(notification.id);

    return notification;
  }

  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      isRead,
      type,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    return {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Get notification details
  async getNotificationDetails(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return updatedNotification;
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      message: `${result.count} notifications marked as read`
    };
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { message: 'Notification deleted successfully' };
  }

  // Queue notification for sending
  async queueNotification(notificationId) {
    // This would integrate with a job queue (Bull)
    // For now, we'll send immediately
    try {
      await this.sendNotification(notificationId);
    } catch (error) {
      logger.error('Error queuing notification:', error);
    }
  }

  // Send notification
  async sendNotification(notificationId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            notificationPreferences: true
          }
        }
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const { user } = notification;
    const preferences = user.notificationPreferences || {};

    let emailSent = false;
    let smsSent = false;
    let pushSent = false;

    // Send email notification
    if (preferences.emailNotifications !== false) {
      try {
        await this.sendEmailNotification(notification);
        emailSent = true;
      } catch (error) {
        logger.error('Error sending email notification:', error);
      }
    }

    // Send SMS notification
    if (preferences.smsNotifications !== false) {
      try {
        await this.sendSmsNotification(notification);
        smsSent = true;
      } catch (error) {
        logger.error('Error sending SMS notification:', error);
      }
    }

    // Send push notification
    if (preferences.pushNotifications !== false) {
      try {
        await this.sendPushNotification(notification);
        pushSent = true;
      } catch (error) {
        logger.error('Error sending push notification:', error);
      }
    }

    // Update notification status
    const status = (emailSent || smsSent || pushSent) ? 
      NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED;

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status,
        sentAt: new Date()
      }
    });

    logger.info(`Notification sent: ${notificationId}, email: ${emailSent}, sms: ${smsSent}, push: ${pushSent}`);
  }

  // Send email notification
  async sendEmailNotification(notification) {
    const EmailChannel = require('./channels/email.channel');
    const emailChannel = new EmailChannel();
    
    await emailChannel.send({
      to: notification.user.email,
      subject: notification.title,
      html: this.getEmailTemplate(notification)
    });
  }

  // Send SMS notification
  async sendSmsNotification(notification) {
    const SmsChannel = require('./channels/sms.channel');
    const smsChannel = new SmsChannel();
    
    await smsChannel.send({
      to: notification.user.phoneNumber,
      message: this.getSmsTemplate(notification)
    });
  }

  // Send push notification
  async sendPushNotification(notification) {
    const PushChannel = require('./channels/push.channel');
    const pushChannel = new PushChannel();
    
    // Get user's device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: notification.userId,
        isActive: true
      }
    });

    for (const deviceToken of deviceTokens) {
      try {
        await pushChannel.send({
          token: deviceToken.token,
          title: notification.title,
          body: notification.message,
          data: notification.data
        });
      } catch (error) {
        logger.error('Error sending push notification to device:', error);
        // Deactivate invalid token
        if (error.message.includes('Invalid token')) {
          await prisma.deviceToken.update({
            where: { id: deviceToken.id },
            data: { isActive: false }
          });
        }
      }
    }
  }

  // Get email template
  getEmailTemplate(notification) {
    const templates = require('./templates/email/user-templates');
    
    switch (notification.type) {
      case NOTIFICATION_TYPE.ORDER_STATUS_UPDATE:
        return templates.orderStatusUpdate(notification);
      case NOTIFICATION_TYPE.NEW_ORDER:
        return templates.newOrder(notification);
      case NOTIFICATION_TYPE.PAYMENT_CONFIRMED:
        return templates.paymentConfirmed(notification);
      case NOTIFICATION_TYPE.KYC_APPROVED:
        return templates.kycApproved(notification);
      case NOTIFICATION_TYPE.KYC_REJECTED:
        return templates.kycRejected(notification);
      case NOTIFICATION_TYPE.DISPUTE_UPDATE:
        return templates.disputeUpdate(notification);
      case NOTIFICATION_TYPE.DRIVER_LOCATION_UPDATE:
        return templates.driverLocationUpdate(notification);
      default:
        return `
          <div>
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
          </div>
        `;
    }
  }

  // Get SMS template
  getSmsTemplate(notification) {
    const templates = require('./templates/sms/user-templates');
    
    switch (notification.type) {
      case NOTIFICATION_TYPE.ORDER_STATUS_UPDATE:
        return templates.orderStatusUpdate(notification);
      case NOTIFICATION_TYPE.NEW_ORDER:
        return templates.newOrder(notification);
      case NOTIFICATION_TYPE.PAYMENT_CONFIRMED:
        return templates.paymentConfirmed(notification);
      case NOTIFICATION_TYPE.KYC_APPROVED:
        return templates.kycApproved(notification);
      case NOTIFICATION_TYPE.KYC_REJECTED:
        return templates.kycRejected(notification);
      case NOTIFICATION_TYPE.DISPUTE_UPDATE:
        return templates.disputeUpdate(notification);
      case NOTIFICATION_TYPE.DRIVER_LOCATION_UPDATE:
        return templates.driverLocationUpdate(notification);
      default:
        return `${notification.title}: ${notification.message}`;
    }
  }

  // Get push notification template
  getPushTemplate(notification) {
    return {
      title: notification.title,
      body: notification.message,
      data: notification.data
    };
  }

  // Register device token
  async registerDeviceToken(userId, token, deviceInfo = {}) {
    const { deviceType, deviceModel, appVersion, osVersion } = deviceInfo;

    // Check if token already exists
    const existingToken = await prisma.deviceToken.findFirst({
      where: {
        userId,
        token
      }
    });

    if (existingToken) {
      // Update existing token
      const updatedToken = await prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          deviceType,
          deviceModel,
          appVersion,
          osVersion,
          isActive: true,
          lastUsedAt: new Date()
        }
      });

      return updatedToken;
    }

    // Create new token
    const newToken = await prisma.deviceToken.create({
      data: {
        userId,
        token,
        deviceType,
        deviceModel,
        appVersion,
        osVersion,
        isActive: true
      }
    });

    return newToken;
  }

  // Unregister device token
  async unregisterDeviceToken(userId, token) {
    const deviceToken = await prisma.deviceToken.findFirst({
      where: {
        userId,
        token
      }
    });

    if (!deviceToken) {
      throw new NotFoundError('Device token not found');
    }

    await prisma.deviceToken.update({
      where: { id: deviceToken.id },
      data: {
        isActive: false
      }
    });

    return { message: 'Device token unregistered successfully' };
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    const { emailNotifications, smsNotifications, pushNotifications } = preferences;

    const updatedPreferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        emailNotifications,
        smsNotifications,
        pushNotifications
      },
      create: {
        userId,
        emailNotifications,
        smsNotifications,
        pushNotifications
      }
    });

    return updatedPreferences;
  }

  // Get notification preferences
  async getNotificationPreferences(userId) {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Return default preferences
      return {
        userId,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      };
    }

    return preferences;
  }

  // Send bulk notifications
  async sendBulkNotifications(userIds, type, title, message, data = {}) {
    const notifications = await Promise.all(
      userIds.map(userId => 
        this.createNotification(userId, type, title, message, data)
      )
    );

    return {
      message: `${notifications.length} notifications created`,
      notifications
    };
  }

  // Send notification to all users
  async sendNotificationToAll(type, title, message, data = {}) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true
      }
    });

    const userIds = users.map(user => user.id);
    return await this.sendBulkNotifications(userIds, type, title, message, data);
  }

  // Send notification to all drivers
  async sendNotificationToAllDrivers(type, title, message, data = {}) {
    const drivers = await prisma.driver.findMany({
      where: {
        user: {
          isActive: true
        }
      },
      select: {
        userId: true
      }
    });

    const userIds = drivers.map(driver => driver.userId);
    return await this.sendBulkNotifications(userIds, type, title, message, data);
  }

  // Get notification statistics
  async getNotificationStatistics(filters = {}) {
    const {
      startDate,
      endDate,
      type,
      status
    } = filters;

    // Build where clause
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(type && { type }),
      ...(status && { status })
    };

    const [
      totalNotifications,
      sentNotifications,
      failedNotifications,
      readNotifications,
      unreadNotifications,
      notificationsByType,
      notificationsByStatus
    ] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ 
        where: { 
          ...where, 
          status: NOTIFICATION_STATUS.SENT 
        } 
      }),
      prisma.notification.count({ 
        where: { 
          ...where, 
          status: NOTIFICATION_STATUS.FAILED 
        } 
      }),
      prisma.notification.count({ 
        where: { 
          ...where, 
          isRead: true 
        } 
      }),
      prisma.notification.count({ 
        where: { 
          ...where, 
          isRead: false 
        } 
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true
        }
      }),
      prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true
        }
      })
    ]);

    const deliveryRate = totalNotifications > 0 ? 
      (sentNotifications / totalNotifications) * 100 : 0;
    const readRate = totalNotifications > 0 ? 
      (readNotifications / totalNotifications) * 100 : 0;

    return {
      totalNotifications,
      sentNotifications,
      failedNotifications,
      readNotifications,
      unreadNotifications,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      notificationsByType,
      notificationsByStatus
    };
  }
}

module.exports = new NotificationService();