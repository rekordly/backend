const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../shared/utils/crypto');
const { generateAndStoreOTP, verifyOTP, checkOTPRateLimit, sendOTPviaEmail } = require('../../shared/utils/otp');
const { AppError, AuthenticationError } = require('../../shared/errors/app-error');
const { USER_ROLES } = require('../../config/constants');
const { logger } = require('../../shared/utils/logger');

class AuthService {
  // User signup
  async signup(userData) {
    const { email, password, fullName, phoneNumber, role, locationState } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      }
    });

    if (existingUser) {
      throw new AppError('User with this email or phone number already exists', 409, 'CONFLICT');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phoneNumber,
        role,
        locationState
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        locationState: true,
        isActive: true,
        createdAt: true
      }
    });

    // Create driver profile if role is DRIVER
    if (role === USER_ROLES.DRIVER) {
      await prisma.driver.create({
        data: {
          userId: user.id,
          status: 'OFFLINE',
          overallKycStatus: 'NOT_STARTED',
          todaysEarnings: 0,
          totalEarnings: 0,
          completedCount: 0,
          rating: 0,
          totalRatings: 0,
          isAvailable: false
        }
      });
    }

    // Generate JWT token
    const token = this.generateJWTToken(user);

    logger.info(`New user registered: ${email}, role: ${role}`);

    return { user, token };
  }

  // User login
  async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true
      }
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateJWTToken(user);

    // Update last login (if you have this field)
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { lastLoginAt: new Date() }
    // });

    logger.info(`User logged in: ${email}`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  // Admin login
  async adminLogin(adminEmail, adminPassword) {
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (!admin || !admin.isActive) {
      throw new AuthenticationError('Invalid admin credentials');
    }

    // Check password
    const isPasswordValid = await comparePassword(adminPassword, admin.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid admin credentials');
    }

    // Generate admin JWT token
    const token = this.generateAdminJWTToken(admin);

    logger.info(`Admin logged in: ${adminEmail}`);

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;

    return { admin: adminWithoutPassword, token };
  }

  // Request password reset
  async requestPasswordReset(email) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      throw new AppError('If this email is registered, you will receive a password reset OTP', 200);
    }

    // Check rate limit
    const rateLimitCheck = await checkOTPRateLimit(email, 'password_reset');
    if (!rateLimitCheck.allowed) {
      throw new AppError(rateLimitCheck.message, 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Generate and store OTP
    const otp = await generateAndStoreOTP(email, 'password_reset');

    // Send OTP via email
    await sendOTPviaEmail(email, otp, 'password_reset');

    logger.info(`Password reset OTP requested for: ${email}`);

    return { message: 'If this email is registered, you will receive a password reset OTP' };
  }

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'auth') {
    const result = await verifyOTP(email, otp, purpose);
    
    if (!result.valid) {
      throw new AppError(result.message, 400, 'INVALID_OTP');
    }

    logger.info(`OTP verified for: ${email}, purpose: ${purpose}`);

    return { message: result.message };
  }

  // Reset password
  async resetPassword(email, newPassword, otp) {
    // Verify OTP first
    await this.verifyOTP(email, otp, 'password_reset');

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    logger.info(`Password reset successful for: ${email}`);

    return { message: 'Password reset successful' };
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logger.info(`Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  // Update profile
  async updateProfile(userId, updateData) {
    const { email, phoneNumber, fullName, locationState } = updateData;

    // Check if email or phone number is already taken by another user
    if (email || phoneNumber) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email, NOT: { id: userId } }] : []),
            ...(phoneNumber ? [{ phoneNumber, NOT: { id: userId } }] : [])
          ]
        }
      });

      if (existingUser) {
        throw new AppError('Email or phone number already taken', 409, 'CONFLICT');
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(fullName && { fullName }),
        ...(locationState && { locationState })
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        locationState: true,
        isActive: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    logger.info(`Profile updated for user: ${updatedUser.email}`);

    return updatedUser;
  }

  // Logout (invalidate token)
  async logout(token) {
    // In a real implementation, you might want to add the token to a blacklist
    // For now, we'll just log the logout
    logger.info('User logged out');

    return { message: 'Logged out successfully' };
  }

  // Admin logout
  async adminLogout(token) {
    logger.info('Admin logged out');

    return { message: 'Admin logged out successfully' };
  }

  // Generate JWT token
  generateJWTToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );
  }

  // Generate admin JWT token
  generateAdminJWTToken(admin) {
    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.ADMIN_JWT_SECRET,
      {
        expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h'
      }
    );
  }

  // Verify JWT token
  verifyJWTToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  // Verify admin JWT token
  verifyAdminJWTToken(token) {
    try {
      return jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError('Invalid admin token');
    }
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: true
      }
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  // Get admin by ID
  async getAdminById(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin || !admin.isActive) {
      throw new AppError('Admin not found', 404, 'NOT_FOUND');
    }

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;

    return adminWithoutPassword;
  }
}

module.exports = new AuthService();