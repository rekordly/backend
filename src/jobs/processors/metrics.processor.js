const { logger } = require('../../shared/utils/logger');
const { prisma } = require('../../config/database');

// Metrics processor - aggregates system metrics for analytics
const metricsProcessor = async (job) => {
  const { data } = job;
  logger.info('Processing metrics job', { jobId: job.id, data });

  try {
    const { type, timeframe = 'daily' } = data;

    let metrics;

    switch (type) {
      case 'delivery_metrics':
        metrics = await calculateDeliveryMetrics(timeframe);
        break;
      case 'driver_metrics':
        metrics = await calculateDriverMetrics(timeframe);
        break;
      case 'user_metrics':
        metrics = await calculateUserMetrics(timeframe);
        break;
      case 'revenue_metrics':
        metrics = await calculateRevenueMetrics(timeframe);
        break;
      case 'system_metrics':
        metrics = await calculateSystemMetrics(timeframe);
        break;
      default:
        throw new Error(`Unknown metrics type: ${type}`);
    }

    // Store aggregated metrics in database
    await storeMetrics(type, timeframe, metrics);

    logger.info(`Metrics processed successfully`, {
      jobId: job.id,
      type,
      timeframe,
      metricsCount: Object.keys(metrics).length,
    });

    return {
      success: true,
      type,
      timeframe,
      metrics,
    };
  } catch (error) {
    logger.error('Metrics processor failed', { error: error.message, jobId: job.id });
    throw error;
  }
};

// Calculate delivery metrics
const calculateDeliveryMetrics = async (timeframe) => {
  const startDate = getTimeframeStartDate(timeframe);
  
  const [
    totalDeliveries,
    completedDeliveries,
    cancelledDeliveries,
    disputedDeliveries,
    averageDeliveryTime,
    totalRevenue,
  ] = await Promise.all([
    prisma.delivery.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.delivery.count({
      where: { 
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
    }),
    prisma.delivery.count({
      where: { 
        status: 'CANCELLED',
        createdAt: { gte: startDate },
      },
    }),
    prisma.delivery.count({
      where: { 
        status: 'DISPUTED',
        createdAt: { gte: startDate },
      },
    }),
    calculateAverageDeliveryTime(startDate),
    prisma.delivery.aggregate({
      where: { 
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      _sum: { actualFare: true },
    }),
  ]);

  return {
    totalDeliveries,
    completedDeliveries,
    cancelledDeliveries,
    disputedDeliveries,
    completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
    averageDeliveryTime,
    totalRevenue: totalRevenue._sum.actualFare || 0,
  };
};

// Calculate driver metrics
const calculateDriverMetrics = async (timeframe) => {
  const startDate = getTimeframeStartDate(timeframe);
  
  const [
    totalDrivers,
    activeDrivers,
    newDrivers,
    averageRating,
    totalEarnings,
  ] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.count({
      where: { 
        status: 'ONLINE',
        updatedAt: { gte: startDate },
      },
    }),
    prisma.driver.count({
      where: { createdAt: { gte: startDate } },
    }),
    calculateAverageDriverRating(),
    prisma.driver.aggregate({
      _sum: { totalEarnings: true },
    }),
  ]);

  return {
    totalDrivers,
    activeDrivers,
    newDrivers,
    averageRating,
    totalEarnings: totalEarnings._sum.totalEarnings || 0,
  };
};

// Calculate user metrics
const calculateUserMetrics = async (timeframe) => {
  const startDate = getTimeframeStartDate(timeframe);
  
  const [
    totalUsers,
    activeUsers,
    newUsers,
    returningUsers,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: 'USER' },
    }),
    prisma.user.count({
      where: { 
        role: 'USER',
        updatedAt: { gte: startDate },
      },
    }),
    prisma.user.count({
      where: { 
        role: 'USER',
        createdAt: { gte: startDate },
      },
    }),
    calculateReturningUsers(startDate),
  ]);

  return {
    totalUsers,
    activeUsers,
    newUsers,
    returningUsers,
  };
};

// Calculate revenue metrics
const calculateRevenueMetrics = async (timeframe) => {
  const startDate = getTimeframeStartDate(timeframe);
  
  const revenue = await prisma.delivery.aggregate({
    where: { 
      status: 'COMPLETED',
      createdAt: { gte: startDate },
    },
    _sum: { actualFare: true },
  });

  return {
    totalRevenue: revenue._sum.actualFare || 0,
    timeframe,
  };
};

// Calculate system metrics
const calculateSystemMetrics = async (timeframe) => {
  // This would typically include system performance metrics
  // For now, return basic system health metrics
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    timestamp: new Date(),
  };
};

// Helper functions
const getTimeframeStartDate = (timeframe) => {
  const now = new Date();
  switch (timeframe) {
    case 'hourly':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case 'daily':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
};

const calculateAverageDeliveryTime = async (startDate) => {
  const deliveries = await prisma.delivery.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: startDate },
      completedAt: { not: null },
      acceptedAt: { not: null },
    },
    select: {
      acceptedAt: true,
      completedAt: true,
    },
  });

  if (deliveries.length === 0) return 0;

  const totalTime = deliveries.reduce((sum, delivery) => {
    return sum + (delivery.completedAt - delivery.acceptedAt);
  }, 0);

  return totalTime / deliveries.length;
};

const calculateAverageDriverRating = async () => {
  const result = await prisma.driver.aggregate({
    _avg: { rating: true },
  });

  return result._avg.rating || 0;
};

const calculateReturningUsers = async (startDate) => {
  // This is a simplified calculation
  const usersWithMultipleOrders = await prisma.user.findMany({
    where: {
      role: 'USER',
      deliveries: {
        some: {
          createdAt: { gte: startDate },
        },
      },
    },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  });

  return usersWithMultipleOrders.filter(user => user._count.deliveries > 1).length;
};

const storeMetrics = async (type, timeframe, metrics) => {
  // Store metrics in database for analytics
  // This would typically use a metrics table
  logger.info(`Storing ${type} metrics for ${timeframe}`, {
    metricsCount: Object.keys(metrics).length,
  });
};

module.exports = {
  metricsProcessor,
};