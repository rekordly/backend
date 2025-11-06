const nodemailer = require('nodemailer');
const { logger } = require('../../../shared/utils/logger');

class EmailChannel {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async send(options) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@d-ride.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${options.to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = EmailChannel;