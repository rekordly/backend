const admin = require('firebase-admin');
const { logger } = require('../../../shared/utils/logger');

class PushChannel {
  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
  }

  async send(options) {
    try {
      const message = {
        token: options.token,
        notification: {
          title: options.title,
          body: options.body
        },
        data: options.data || {}
      };

      const result = await admin.messaging().send(message);
      logger.info(`Push notification sent to ${options.token}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendToTopic(topic, options) {
    try {
      const message = {
        topic: topic,
        notification: {
          title: options.title,
          body: options.body
        },
        data: options.data || {}
      };

      const result = await admin.messaging().send(message);
      logger.info(`Push notification sent to topic ${topic}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Error sending push notification to topic:', error);
      throw error;
    }
  }

  async subscribeToTopic(tokens, topic) {
    try {
      const result = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${tokens.length} tokens to topic ${topic}`);
      return result;
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    try {
      const result = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${tokens.length} tokens from topic ${topic}`);
      return result;
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }
}

module.exports = PushChannel;