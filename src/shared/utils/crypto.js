const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { logger } = require('./logger');

// Hash password
const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
};

// Generate random token
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure random string
const generateSecureRandomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }
  
  return result;
};

// Generate numeric OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

// Hash data with SHA256
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Generate JWT secret
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Encrypt sensitive data (for storing in database)
const encryptData = (data, secretKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, secretKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt sensitive data
const decryptData = (encryptedData, secretKey, iv, authTag) => {
  try {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, secretKey);
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomToken,
  generateSecureRandomString,
  generateOTP,
  hashData,
  generateJWTSecret,
  encryptData,
  decryptData
};