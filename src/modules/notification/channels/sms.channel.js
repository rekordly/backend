const twilio = require('twilio');
const { logger } = require('../../../shared/utils/logger');

class SmsChannel {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async send(options) {
    try {
      const result = await this.client.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.to
      });

      logger.info(`SMS sent to ${options.to}: ${result.sid}`);
      return result;
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw error;
    }
  }
}

module.exports = SmsChannel;