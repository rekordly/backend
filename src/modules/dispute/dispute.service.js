const { prisma } = require('../../config/database');
const { AppError, NotFoundError, ConflictError } = require('../../shared/errors/app-error');
const { DISPUTE_STATUS, DISPUTE_TYPE, ORDER_STATUS } = require('../../config/constants');
const { logger } = require('../../shared/utils/logger');

class DisputeService {
  // Create dispute
  async createDispute(userId, driverId, disputeData) {
    const {
      deliveryId,
      type,
      title,
      description,
      priority = 'MEDIUM',
      evidence = []
    } = disputeData;

    // Check if delivery exists
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        user: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    // Check if user has access to this delivery
    if (delivery.userId !== userId && delivery.driverId !== driverId) {
      throw new AppError('Unauthorized to create dispute for this delivery', 403, 'UNAUTHORIZED');
    }

    // Check if dispute already exists for this delivery
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        deliveryId,
        status: {
          in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW]
        }
      }
    });

    if (existingDispute) {
      throw new ConflictError('A dispute is already open for this delivery');
    }

    // Determine dispute parties
    const reporterId = userId || driverId;
    const reporterType = userId ? 'USER' : 'DRIVER';
    const respondentId = userId ? delivery.driverId : delivery.userId;
    const respondentType = userId ? 'DRIVER' : 'USER';

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        deliveryId,
        reporterId,
        reporterType,
        respondentId,
        respondentType,
        type,
        title,
        description,
        priority,
        status: DISPUTE_STATUS.OPEN,
        evidence
      },
      include: {
        delivery: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true
              }
            },
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true
                  }
                }
              }
            }
          }
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        respondent: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Update delivery status to disputed
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: ORDER_STATUS.DISPUTED
      }
    });

    logger.info(`Dispute created: ${dispute.id} for delivery: ${deliveryId} by ${reporterType}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return dispute;
  }

  // Get dispute details
  async getDisputeDetails(disputeId, userId = null, driverId = null) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        delivery: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true
              }
            },
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true
                  }
                }
              }
            }
          }
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        respondent: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        communications: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          }
        },
        evidence: true,
        resolution: true
      }
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check if user has access to this dispute
    if (userId && dispute.delivery.userId !== userId && dispute.reporterId !== userId && dispute.respondentId !== userId) {
      throw new AppError('Unauthorized to access this dispute', 403, 'UNAUTHORIZED');
    }

    if (driverId && dispute.delivery.driverId !== driverId && dispute.reporterId !== driverId && dispute.respondentId !== driverId) {
      throw new AppError('Unauthorized to access this dispute', 403, 'UNAUTHORIZED');
    }

    return dispute;
  }

  // Get user disputes
  async getUserDisputes(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      OR: [
        { reporterId: userId },
        { respondentId: userId }
      ],
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get disputes with pagination
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              estimatedFare: true,
              createdAt: true
            }
          },
          reporter: {
            select: {
              id: true,
              fullName: true
            }
          },
          respondent: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.dispute.count({ where })
    ]);

    return {
      disputes,
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

  // Get driver disputes
  async getDriverDisputes(driverId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      startDate,
      endDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      OR: [
        { reporterId: driverId },
        { respondentId: driverId }
      ],
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get disputes with pagination
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              estimatedFare: true,
              createdAt: true
            }
          },
          reporter: {
            select: {
              id: true,
              fullName: true
            }
          },
          respondent: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.dispute.count({ where })
    ]);

    return {
      disputes,
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

  // Get all disputes (admin)
  async getAllDisputes(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      reporterType,
      startDate,
      endDate,
      search
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(reporterType && { reporterType }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Get disputes with pagination
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              estimatedFare: true,
              createdAt: true
            }
          },
          reporter: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          respondent: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.dispute.count({ where })
    ]);

    return {
      disputes,
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

  // Update dispute status
  async updateDisputeStatus(disputeId, newStatus, updateData = {}) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        delivery: true
      }
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Validate status transition
    const validTransitions = {
      [DISPUTE_STATUS.OPEN]: [DISPUTE_STATUS.UNDER_REVIEW, DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.CANCELLED],
      [DISPUTE_STATUS.UNDER_REVIEW]: [DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.CANCELLED],
      [DISPUTE_STATUS.RESOLVED]: [], // Final state
      [DISPUTE_STATUS.CANCELLED]: [] // Final state
    };

    const allowedTransitions = validTransitions[dispute.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${dispute.status} to ${newStatus}`, 400, 'INVALID_STATUS_TRANSITION');
    }

    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        ...updateData
      },
      include: {
        delivery: {
          include: {
            user: true,
            driver: {
              include: {
                user: true
              }
            }
          }
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        respondent: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Update delivery status if dispute is resolved
    if (newStatus === DISPUTE_STATUS.RESOLVED) {
      await prisma.delivery.update({
        where: { id: dispute.deliveryId },
        data: {
          status: ORDER_STATUS.COMPLETED
        }
      });
    }

    logger.info(`Dispute ${disputeId} status updated to ${newStatus}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return updatedDispute;
  }

  // Add communication to dispute
  async addDisputeCommunication(disputeId, senderId, message, attachments = []) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check if sender is involved in the dispute
    if (dispute.reporterId !== senderId && dispute.respondentId !== senderId) {
      throw new AppError('Unauthorized to add communication to this dispute', 403, 'UNAUTHORIZED');
    }

    // Check if dispute is still open
    if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.CANCELLED) {
      throw new AppError('Cannot add communication to a closed dispute', 400, 'DISPUTE_CLOSED');
    }

    // Create communication
    const communication = await prisma.disputeCommunication.create({
      data: {
        disputeId,
        senderId,
        message,
        attachments
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });

    logger.info(`Communication added to dispute ${disputeId} by sender ${senderId}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return communication;
  }

  // Add evidence to dispute
  async addDisputeEvidence(disputeId, evidenceData) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check if dispute is still open
    if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.CANCELLED) {
      throw new AppError('Cannot add evidence to a closed dispute', 400, 'DISPUTE_CLOSED');
    }

    // Create evidence
    const evidence = await prisma.disputeEvidence.create({
      data: {
        disputeId,
        ...evidenceData
      }
    });

    logger.info(`Evidence added to dispute ${disputeId}`);

    return evidence;
  }

  // Resolve dispute
  async resolveDispute(disputeId, resolutionData) {
    const {
      resolution,
      action,
      notes,
      resolvedBy
    } = resolutionData;

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        delivery: true
      }
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Create resolution
    const resolutionRecord = await prisma.disputeResolution.create({
      data: {
        disputeId,
        resolution,
        action,
        notes,
        resolvedBy
      }
    });

    // Update dispute status
    const updatedDispute = await this.updateDisputeStatus(disputeId, DISPUTE_STATUS.RESOLVED, {
      resolvedAt: new Date(),
      resolutionId: resolutionRecord.id
    });

    logger.info(`Dispute ${disputeId} resolved by ${resolvedBy}`);

    // TODO: Send notifications
    // This would be implemented with the notification service

    return {
      dispute: updatedDispute,
      resolution: resolutionRecord
    };
  }

  // Get dispute statistics
  async getDisputeStatistics(filters = {}) {
    const {
      startDate,
      endDate,
      type,
      status,
      reporterType
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
      ...(status && { status }),
      ...(reporterType && { reporterType })
    };

    // Get statistics
    const [
      totalDisputes,
      openDisputes,
      underReviewDisputes,
      resolvedDisputes,
      cancelledDisputes,
      disputesByType,
      disputesByReporterType,
      averageResolutionTime
    ] = await Promise.all([
      prisma.dispute.count({ where }),
      prisma.dispute.count({ 
        where: { 
          ...where, 
          status: DISPUTE_STATUS.OPEN 
        } 
      }),
      prisma.dispute.count({ 
        where: { 
          ...where, 
          status: DISPUTE_STATUS.UNDER_REVIEW 
        } 
      }),
      prisma.dispute.count({ 
        where: { 
          ...where, 
          status: DISPUTE_STATUS.RESOLVED 
        } 
      }),
      prisma.dispute.count({ 
        where: { 
          ...where, 
          status: DISPUTE_STATUS.CANCELLED 
        } 
      }),
      prisma.dispute.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true
        }
      }),
      prisma.dispute.groupBy({
        by: ['reporterType'],
        where,
        _count: {
          reporterType: true
        }
      }),
      this.calculateAverageResolutionTime(where)
    ]);

    const resolutionRate = totalDisputes > 0 ? 
      (resolvedDisputes / totalDisputes) * 100 : 0;

    return {
      totalDisputes,
      openDisputes,
      underReviewDisputes,
      resolvedDisputes,
      cancelledDisputes,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      disputesByType,
      disputesByReporterType,
      averageResolutionTime
    };
  }

  // Calculate average resolution time
  async calculateAverageResolutionTime(where) {
    const resolvedDisputes = await prisma.dispute.findMany({
      where: {
        ...where,
        status: DISPUTE_STATUS.RESOLVED,
        resolvedAt: {
          not: null
        }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      }
    });

    if (resolvedDisputes.length === 0) {
      return 0;
    }

    const totalTime = resolvedDisputes.reduce((sum, dispute) => {
      const resolutionTime = new Date(dispute.resolvedAt) - new Date(dispute.createdAt);
      return sum + resolutionTime;
    }, 0);

    const averageTime = totalTime / resolvedDisputes.length;
    return Math.round(averageTime / (1000 * 60 * 60 * 24)); // Convert to days
  }

  // Get dispute trends
  async getDisputeTrends(period = 'month') {
    let groupBy;
    switch (period) {
      case 'day':
        groupBy = {
          createdAt: 'day'
        };
        break;
      case 'week':
        groupBy = {
          createdAt: 'week'
        };
        break;
      case 'month':
        groupBy = {
          createdAt: 'month'
        };
        break;
      default:
        groupBy = {
          createdAt: 'month'
        };
    }

    const trends = await prisma.dispute.groupBy({
      by: ['type', 'status', ...Object.keys(groupBy)],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return trends;
  }
}

module.exports = new DisputeService();