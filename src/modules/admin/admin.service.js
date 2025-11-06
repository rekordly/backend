const { prisma } = require('../../config/database');
const { AppError, NotFoundError, ConflictError } = require('../../shared/errors/app-error');
const { ORDER_STATUS, DISPUTE_STATUS, USER_ROLES, DRIVER_STATUS, KYC_STATUS } = require('../../shared/enums');
const { logger } = require('../../shared/utils/logger');

class AdminService {
  // Get dashboard statistics
  async getDashboardStatistics() {
    const [
      totalUsers,
      totalDrivers,
      activeDrivers,
      totalDeliveries,
      completedDeliveries,
      totalDisputes,
      openDisputes,
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue
    ] = await Promise.all([
      prisma.user.count({
        where: {
          isActive: true
        }
      }),
      prisma.driver.count({
        where: {
          user: {
            isActive: true
          }
        }
      }),
      prisma.driver.count({
        where: {
          user: {
            isActive: true
          },
          isAvailable: true
        }
      }),
      prisma.delivery.count(),
      prisma.delivery.count({
        where: {
          status: ORDER_STATUS.COMPLETED
        }
      }),
      prisma.dispute.count(),
      prisma.dispute.count({
        where: {
          status: DISPUTE_STATUS.OPEN
        }
      }),
      this.getTotalRevenue(),
      this.getTodayRevenue(),
      this.getWeeklyRevenue(),
      this.getMonthlyRevenue()
    ]);

    const completionRate = totalDeliveries > 0 ? 
      (completedDeliveries / totalDeliveries) * 100 : 0;

    const disputeRate = totalDeliveries > 0 ? 
      (totalDisputes / totalDeliveries) * 100 : 0;

    return {
      users: {
        total: totalUsers,
        drivers: {
          total: totalDrivers,
          active: activeDrivers
        }
      },
      deliveries: {
        total: totalDeliveries,
        completed: completedDeliveries,
        completionRate: Math.round(completionRate * 100) / 100
      },
      disputes: {
        total: totalDisputes,
        open: openDisputes,
        disputeRate: Math.round(disputeRate * 100) / 100
      },
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue
      }
    };
  }

  // Get total revenue
  async getTotalRevenue() {
    const result = await prisma.delivery.aggregate({
      where: {
        status: ORDER_STATUS.COMPLETED,
        paymentStatus: 'PAID'
      },
      _sum: {
        actualFare: true
      }
    });

    return result._sum.actualFare || 0;
  }

  // Get today's revenue
  async getTodayRevenue() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const result = await prisma.delivery.aggregate({
      where: {
        status: ORDER_STATUS.COMPLETED,
        paymentStatus: 'PAID',
        completedAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      _sum: {
        actualFare: true
      }
    });

    return result._sum.actualFare || 0;
  }

  // Get weekly revenue
  async getWeeklyRevenue() {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.delivery.aggregate({
      where: {
        status: ORDER_STATUS.COMPLETED,
        paymentStatus: 'PAID',
        completedAt: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      },
      _sum: {
        actualFare: true
      }
    });

    return result._sum.actualFare || 0;
  }

  // Get monthly revenue
  async getMonthlyRevenue() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const result = await prisma.delivery.aggregate({
      where: {
        status: ORDER_STATUS.COMPLETED,
        paymentStatus: 'PAID',
        completedAt: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      },
      _sum: {
        actualFare: true
      }
    });

    return result._sum.actualFare || 0;
  }

  // Get all users
  async getAllUsers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      ...(role && { role }),
      ...(status !== undefined && { isActive: status === 'active' }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          locationState: true,
          profilePictureUrl: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
          updatedAt: true,
          driver: {
            select: {
              id: true,
              status: true,
              isAvailable: true,
              overallKycStatus: true,
              rating: true,
              totalRatings: true,
              completedCount: true,
              totalEarnings: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
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

  // Get user details
  async getUserDetails(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: {
          include: {
            vehicle: true,
            kycDocuments: true
          }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            estimatedFare: true,
            actualFare: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        disputes: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // Update user
  async updateUser(userId, updateData) {
    const { fullName, email, phoneNumber, isActive, role } = updateData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Check if email or phone number is already taken by another user
    if (email || phoneNumber) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email, NOT: { id: userId } }] : []),
            ...(phoneNumber ? [{ phoneNumber, NOT: { id: userId } }] : [])
          ]
        }
      });

      if (duplicateUser) {
        throw new ConflictError('Email or phone number already taken');
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(isActive !== undefined && { isActive }),
        ...(role && { role })
      },
      include: {
        driver: {
          include: {
            vehicle: true,
            kycDocuments: true
          }
        }
      }
    });

    logger.info(`User updated: ${userId} by admin`);

    return updatedUser;
  }

  // Delete user (soft delete)
  async deleteUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    // If user is a driver, update driver status
    if (user.role === USER_ROLES.DRIVER) {
      await prisma.driver.update({
        where: { userId },
        data: {
          status: DRIVER_STATUS.INACTIVE,
          isAvailable: false
        }
      });
    }

    logger.info(`User deleted: ${userId} by admin`);

    return updatedUser;
  }

  // Get all drivers
  async getAllDrivers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      kycStatus,
      vehicleType,
      search,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      user: {
        isActive: true
      },
      ...(status && { status }),
      ...(kycStatus && { overallKycStatus: kycStatus }),
      ...(vehicleType && { vehicle: { vehicleType } }),
      ...(search && {
        OR: [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phoneNumber: { contains: search, mode: 'insensitive' } } }
        ]
      }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get drivers with pagination
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              isActive: true
            }
          },
          vehicle: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.driver.count({ where })
    ]);

    return {
      drivers,
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

  // Get driver details
  async getDriverDetails(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            isActive: true,
            createdAt: true
          }
        },
        vehicle: true,
        kycDocuments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            estimatedFare: true,
            actualFare: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        disputes: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return driver;
  }

  // Update driver
  async updateDriver(driverId, updateData) {
    const { status, isAvailable, overallKycStatus } = updateData;

    // Check if driver exists
    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!existingDriver) {
      throw new NotFoundError('Driver not found');
    }

    // Update driver
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        ...(status && { status }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(overallKycStatus && { overallKycStatus })
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        vehicle: true,
        kycDocuments: true
      }
    });

    logger.info(`Driver updated: ${driverId} by admin`);

    return updatedDriver;
  }

  // Delete driver (soft delete)
  async deleteDriver(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: driver.userId },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    // Update driver status
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: DRIVER_STATUS.INACTIVE,
        isAvailable: false
      }
    });

    logger.info(`Driver deleted: ${driverId} by admin`);

    return updatedDriver;
  }

  // Get KYC pending drivers
  async getKycPendingDrivers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      documentType,
      search
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      overallKycStatus: KYC_STATUS.PENDING,
      user: {
        isActive: true
      },
      ...(documentType && {
        kycDocuments: {
          some: {
            type: documentType,
            status: KYC_STATUS.PENDING
          }
        }
      }),
      ...(search && {
        OR: [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phoneNumber: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    // Get drivers with pagination
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true
            }
          },
          kycDocuments: {
            where: {
              status: KYC_STATUS.PENDING
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.driver.count({ where })
    ]);

    return {
      drivers,
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

  // Get driver KYC documents
  async getDriverKycDocuments(driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        kycDocuments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return driver;
  }

  // Approve KYC document
  async approveKycDocument(driverId, documentId, adminId) {
    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check if document exists and belongs to driver
    const document = await prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        driverId
      }
    });

    if (!document) {
      throw new NotFoundError('KYC document not found');
    }

    // Update document status
    const updatedDocument = await prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: KYC_STATUS.VERIFIED,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // Check if all documents are verified
    const pendingDocuments = await prisma.kycDocument.count({
      where: {
        driverId,
        status: KYC_STATUS.PENDING
      }
    });

    // Update driver KYC status if no pending documents
    if (pendingDocuments === 0) {
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          overallKycStatus: KYC_STATUS.VERIFIED
        }
      });
    }

    logger.info(`KYC document approved: ${documentId} for driver: ${driverId}`);

    return updatedDocument;
  }

  // Reject KYC document
  async rejectKycDocument(driverId, documentId, reason, adminId) {
    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check if document exists and belongs to driver
    const document = await prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        driverId
      }
    });

    if (!document) {
      throw new NotFoundError('KYC document not found');
    }

    // Update document status
    const updatedDocument = await prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: KYC_STATUS.REJECTED,
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // Update driver KYC status to rejected
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        overallKycStatus: KYC_STATUS.REJECTED
      }
    });

    logger.info(`KYC document rejected: ${documentId} for driver: ${driverId}, reason: ${reason}`);

    return updatedDocument;
  }

  // Get system settings
  async getSystemSettings() {
    // This would typically fetch from a settings table
    // For now, return default settings
    return {
      fareSettings: {
        baseFare: 500,
        perKmRate: 100,
        perMinuteRate: 10,
        minimumFare: 200
      },
      commissionSettings: {
        platformCommissionPercentage: 20,
        driverCommissionPercentage: 80
      },
      systemSettings: {
        maxDeliveryDistance: 50,
        defaultSearchRadius: 5,
        driverTimeoutSeconds: 30
      }
    };
  }

  // Update system settings
  async updateSystemSettings(settings) {
    // This would typically update a settings table
    // For now, just log the update
    logger.info('System settings updated by admin', settings);

    return { message: 'System settings updated successfully' };
  }

  // Get system logs
  async getSystemLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      level,
      startDate,
      endDate
    } = filters;

    // This would typically fetch from a logs table or file system
    // For now, return mock data
    return {
      logs: [
        {
          id: '1',
          level: 'info',
          message: 'Server started successfully',
          timestamp: new Date(),
          metadata: {}
        },
        {
          id: '2',
          level: 'error',
          message: 'Database connection failed',
          timestamp: new Date(),
          metadata: { error: 'Connection timeout' }
        }
      ],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  // Get analytics
  async getAnalytics(filters = {}) {
    const {
      startDate,
      endDate,
      groupBy = 'day'
    } = filters;

    // This would typically fetch from an analytics table or run complex queries
    // For now, return mock analytics data
    return {
      revenue: [
        {
          date: new Date(),
          revenue: 15000,
          orders: 45
        }
      ],
      orders: [
        {
          date: new Date(),
          total: 45,
          completed: 42,
          cancelled: 3
        }
      ],
      drivers: [
        {
          date: new Date(),
          active: 25,
          online: 18
        }
      ]
    };
  }
}

module.exports = new AdminService();