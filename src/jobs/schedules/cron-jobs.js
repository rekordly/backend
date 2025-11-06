const cron = require('node-cron');
const { logger } = require('../../shared/utils/logger');
const { createJobQueues } = require('../queue');
const autoDisputeProcessor = require('../processors/auto-dispute.processor');
const metricsProcessor = require('../processors/metrics.processor');
const locationArchiveProcessor = require('../processors/location-archive.processor');

// Initialize scheduled jobs
const initializeScheduledJobs = () => {
  logger.info('Initializing scheduled jobs...');

  // Auto-dispute job - runs every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled auto-dispute job');
    
    try {
      const { disputeQueue } = createJobQueues();
      
      await disputeQueue.add('auto-dispute-check', {
        type: 'AUTO_DISPUTE_CHECK',
        timestamp: new Date(),
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      
      logger.info('Auto-dispute job scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule auto-dispute job', { error: error.message });
    }
  });

  // Daily metrics aggregation - runs every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily metrics aggregation');
    
    try {
      const { metricsQueue } = createJobQueues();
      
      const metricTypes = ['delivery_metrics', 'driver_metrics', 'user_metrics', 'revenue_metrics'];
      
      for (const type of metricTypes) {
        await metricsQueue.add('daily-metrics', {
          type,
          timeframe: 'daily',
          timestamp: new Date(),
        }, {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        });
      }
      
      logger.info('Daily metrics jobs scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule daily metrics jobs', { error: error.message });
    }
  });

  // Weekly metrics aggregation - runs every Sunday at 1 AM
  cron.schedule('0 1 * * 0', async () => {
    logger.info('Running weekly metrics aggregation');
    
    try {
      const { metricsQueue } = createJobQueues();
      
      const metricTypes = ['delivery_metrics', 'driver_metrics', 'user_metrics', 'revenue_metrics'];
      
      for (const type of metricTypes) {
        await metricsQueue.add('weekly-metrics', {
          type,
          timeframe: 'weekly',
          timestamp: new Date(),
        }, {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        });
      }
      
      logger.info('Weekly metrics jobs scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule weekly metrics jobs', { error: error.message });
    }
  });

  // Location archive job - runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running location archive job');
    
    try {
      const { locationArchiveQueue } = createJobQueues();
      
      await locationArchiveQueue.add('archive-locations', {
        type: 'LOCATION_ARCHIVE',
        batchSize: 100,
        archiveOlderThan: 5, // minutes
        timestamp: new Date(),
      }, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      
      logger.info('Location archive job scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule location archive job', { error: error.message });
    }
  });

  // Old location history cleanup - runs daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running old location history cleanup');
    
    try {
      const { locationArchiveQueue } = createJobQueues();
      
      await locationArchiveQueue.add('cleanup-old-locations', {
        type: 'CLEANUP_OLD_LOCATIONS',
        timestamp: new Date(),
      }, {
        attempts: 1,
      });
      
      logger.info('Location cleanup job scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule location cleanup job', { error: error.message });
    }
  });

  // System health check - runs every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running system health check');
    
    try {
      const { metricsQueue } = createJobQueues();
      
      await metricsQueue.add('system-health-check', {
        type: 'system_metrics',
        timeframe: 'hourly',
        timestamp: new Date(),
      }, {
        attempts: 1,
      });
      
      logger.info('System health check job scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule system health check', { error: error.message });
    }
  });

  logger.info('All scheduled jobs initialized successfully');
};

// Graceful shutdown for scheduled jobs
const shutdownScheduledJobs = () => {
  logger.info('Shutting down scheduled jobs...');
  
  // Get all scheduled tasks and stop them
  const tasks = cron.getTasks();
  
  tasks.forEach((task, name) => {
    task.stop();
    logger.info(`Stopped scheduled job: ${name}`);
  });
  
  logger.info('All scheduled jobs stopped');
};

module.exports = {
  initializeScheduledJobs,
  shutdownScheduledJobs,
};