const { getRedisClient } = require('../../config/redis');
const { generateOTP } = require('./crypto');
const { logger } = require('./logger');
const { REDIS_KEYS, TIME_CONSTANTS } = require('../../config/constants');

// Generate and store OTP
const generateAndStoreOTP = async (email, purpose = 'auth') => {
  try {
    const otp = generateOTP();
    const redis = getRedisClient();
    
    const key = `${REDIS_KEYS.OTP(email)}:${purpose}`;
    await redis.setex(key, TIME_CONSTANTS.OTP_EXPIRY / 1000, otp);
    
    logger.info(`OTP generated for ${email}, purpose: ${purpose}`);
    
    return otp;
  } catch (error) {
    logger.error('Error generating OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

// Verify OTP
const verifyOTP = async (email, otp, purpose = 'auth') => {
  try {
    const redis = getRedisClient();
    const key = `${REDIS_KEYS.OTP(email)}:${purpose}`;
    
    const storedOTP = await redis.get(key);
    
    if (!storedOTP) {
      return { valid: false, message: 'OTP expired or not found' };
    }
    
    if (storedOTP !== otp) {
      return { valid: false, message: 'Invalid OTP' };
    }
    
    // Delete OTP after successful verification
    await redis.del(key);
    
    logger.info(`OTP verified for ${email}, purpose: ${purpose}`);
    
    return { valid: true, message: 'OTP verified successfully' };
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

// Check if OTP exists
const checkOTPExists = async (email, purpose = 'auth') => {
  try {
    const redis = getRedisClient();
    const key = `${REDIS_KEYS.OTP(email)}:${purpose}`;
    
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Error checking OTP existence:', error);
    throw new Error('Failed to check OTP existence');
  }
};

// Get OTP TTL (time to live)
const getOTPTTL = async (email, purpose = 'auth') => {
  try {
    const redis = getRedisClient();
    const key = `${REDIS_KEYS.OTP(email)}:${purpose}`;
    
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    logger.error('Error getting OTP TTL:', error);
    throw new Error('Failed to get OTP TTL');
  }
};

// Delete OTP
const deleteOTP = async (email, purpose = 'auth') => {
  try {
    const redis = getRedisClient();
    const key = `${REDIS_KEYS.OTP(email)}:${purpose}`;
    
    await redis.del(key);
    logger.info(`OTP deleted for ${email}, purpose: ${purpose}`);
  } catch (error) {
    logger.error('Error deleting OTP:', error);
    throw new Error('Failed to delete OTP');
  }
};

// Rate limit OTP generation
const checkOTPRateLimit = async (email, purpose = 'auth') => {
  try {
    const redis = getRedisClient();
    const rateLimitKey = `otp_rate_limit:${email}:${purpose}`;
    
    const currentCount = await redis.get(rateLimitKey);
    
    if (currentCount && parseInt(currentCount) >= 3) {
      return { allowed: false, message: 'Too many OTP requests. Please try again later.' };
    }
    
    // Increment counter with 5 minute expiry
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 300); // 5 minutes
    
    return { allowed: true, message: 'OTP generation allowed' };
  } catch (error) {
    logger.error('Error checking OTP rate limit:', error);
    throw new Error('Failed to check OTP rate limit');
  }
};

// Send OTP via email (placeholder - would integrate with email service)
const sendOTPviaEmail = async (email, otp, purpose = 'auth') => {
  try {
    // This would integrate with your email service
    // For now, we'll just log it
    logger.info(`OTP ${otp} sent to ${email} for ${purpose}`);
    
    // In a real implementation, you would:
    // 1. Use nodemailer or similar to send email
    // 2. Use a proper email template
    // 3. Handle email delivery failures
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error('Error sending OTP via email:', error);
    throw new Error('Failed to send OTP via email');
  }
};

// Send OTP via SMS (placeholder - would integrate with SMS service)
const sendOTPviaSMS = async (phoneNumber, otp, purpose = 'auth') => {
  try {
    // This would integrate with your SMS service (e.g., Twilio)
    // For now, we'll just log it
    logger.info(`OTP ${otp} sent to ${phoneNumber} for ${purpose}`);
    
    // In a real implementation, you would:
    // 1. Use Twilio or similar to send SMS
    // 2. Handle SMS delivery failures
    // 3. Consider rate limiting and costs
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error('Error sending OTP via SMS:', error);
    throw new Error('Failed to send OTP via SMS');
  }
};

module.exports = {
  generateAndStoreOTP,
  verifyOTP,
  checkOTPExists,
  getOTPTTL,
  deleteOTP,
  checkOTPRateLimit,
  sendOTPviaEmail,
  sendOTPviaSMS
};