const { OrderStatus, isValidOrderStatusTransition, getAllowedOrderStatusTransitions } = require('../../../shared/enums/order-status');
const { PaymentStatus, isValidPaymentStatusTransition } = require('../../../shared/enums/payment-status');
const { AppError } = require('../../../shared/errors/app-error');

class StatusMachine {
  constructor() {
    // Order status flow configuration
    this.orderStatusFlow = {
      [OrderStatus.PENDING]: {
        next: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
        autoTransitions: [
          {
            condition: 'timeout',
            target: OrderStatus.DISPUTED,
            timeout: 24 * 60 * 60 * 1000 // 24 hours
          }
        ]
      },
      [OrderStatus.ACCEPTED]: {
        next: [OrderStatus.DRIVER_EN_ROUTE, OrderStatus.CANCELLED],
        autoTransitions: [
          {
            condition: 'timeout',
            target: OrderStatus.CANCELLED,
            timeout: 15 * 60 * 1000 // 15 minutes
          }
        ]
      },
      [OrderStatus.DRIVER_EN_ROUTE]: {
        next: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.CANCELLED],
        autoTransitions: []
      },
      [OrderStatus.ARRIVED_AT_PICKUP]: {
        next: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
        autoTransitions: []
      },
      [OrderStatus.IN_TRANSIT]: {
        next: [OrderStatus.ARRIVED_AT_DROPOFF, OrderStatus.CANCELLED],
        autoTransitions: []
      },
      [OrderStatus.ARRIVED_AT_DROPOFF]: {
        next: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        autoTransitions: []
      },
      [OrderStatus.DELIVERED]: {
        next: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
        autoTransitions: [
          {
            condition: 'auto_complete',
            target: OrderStatus.COMPLETED,
            timeout: 5 * 60 * 1000 // 5 minutes
          }
        ]
      },
      [OrderStatus.COMPLETED]: {
        next: [], // Final state
        autoTransitions: []
      },
      [OrderStatus.CANCELLED]: {
        next: [], // Final state
        autoTransitions: []
      },
      [OrderStatus.DISPUTED]: {
        next: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        autoTransitions: []
      }
    };

    // Payment status flow configuration
    this.paymentStatusFlow = {
      [PaymentStatus.PENDING]: {
        next: [PaymentStatus.PAID, PaymentStatus.NOT_PAID, PaymentStatus.FAILED],
        autoTransitions: []
      },
      [PaymentStatus.PAID]: {
        next: [PaymentStatus.REFUNDED],
        autoTransitions: []
      },
      [PaymentStatus.NOT_PAID]: {
        next: [PaymentStatus.PAID, PaymentStatus.FAILED],
        autoTransitions: []
      },
      [PaymentStatus.REFUNDED]: {
        next: [], // Final state
        autoTransitions: []
      },
      [PaymentStatus.FAILED]: {
        next: [PaymentStatus.PENDING],
        autoTransitions: []
      }
    };

    // Status change rules and validations
    this.statusChangeRules = {
      // Order status rules
      [OrderStatus.PENDING]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === OrderStatus.ACCEPTED && !context.driverId) {
            throw new AppError('Driver ID is required to accept order', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      },
      [OrderStatus.ACCEPTED]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === OrderStatus.DRIVER_EN_ROUTE && !context.driverLocation) {
            throw new AppError('Driver location is required to start delivery', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      },
      [OrderStatus.ARRIVED_AT_PICKUP]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === OrderStatus.IN_TRANSIT && !context.pickupConfirmed) {
            throw new AppError('Pickup must be confirmed to start transit', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      },
      [OrderStatus.ARRIVED_AT_DROPOFF]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === OrderStatus.DELIVERED && !context.deliveryConfirmed) {
            throw new AppError('Delivery must be confirmed to mark as delivered', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      },
      [OrderStatus.DELIVERED]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === OrderStatus.COMPLETED && !context.paymentConfirmed) {
            throw new AppError('Payment must be confirmed to complete order', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      },

      // Payment status rules
      [PaymentStatus.PENDING]: {
        canChangeTo: (currentStatus, newStatus, context) => {
          if (newStatus === PaymentStatus.PAID && !context.paymentProof) {
            throw new AppError('Payment proof is required to mark as paid', 400, 'VALIDATION_ERROR');
          }
          return true;
        }
      }
    };

    // Side effects for status changes
    this.statusChangeEffects = {
      // Order status effects
      [OrderStatus.ACCEPTED]: [
        'notify_user_order_accepted',
        'update_driver_status',
        'start_location_tracking'
      ],
      [OrderStatus.DRIVER_EN_ROUTE]: [
        'notify_user_driver_en_route',
        'update_eta'
      ],
      [OrderStatus.ARRIVED_AT_PICKUP]: [
        'notify_user_arrived_at_pickup'
      ],
      [OrderStatus.IN_TRANSIT]: [
        'notify_user_package_in_transit',
        'start_real_time_tracking'
      ],
      [OrderStatus.ARRIVED_AT_DROPOFF]: [
        'notify_user_arrived_at_dropoff'
      ],
      [OrderStatus.DELIVERED]: [
        'notify_user_delivered',
        'request_payment_confirmation'
      ],
      [OrderStatus.COMPLETED]: [
        'notify_user_completed',
        'update_driver_earnings',
        'update_driver_stats',
        'generate_invoice',
        'stop_location_tracking'
      ],
      [OrderStatus.CANCELLED]: [
        'notify_user_cancelled',
        'notify_driver_cancelled',
        'release_driver',
        'process_refund_if_applicable'
      ],
      [OrderStatus.DISPUTED]: [
        'notify_user_disputed',
        'notify_driver_disputed',
        'create_dispute_record',
        'escalate_to_admin'
      ],

      // Payment status effects
      [PaymentStatus.PAID]: [
        'confirm_payment',
        'update_order_status_if_ready',
        'notify_payment_received'
      ],
      [PaymentStatus.REFUNDED]: [
        'process_refund',
        'notify_refund_processed'
      ],
      [PaymentStatus.FAILED]: [
        'notify_payment_failed',
        'retry_payment_or_request_alternative'
      ]
    };
  }

  // Validate and execute order status change
  async changeOrderStatus(deliveryId, newStatus, context = {}) {
    try {
      // Get current delivery
      const { prisma } = require('../../../config/database');
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      });

      if (!delivery) {
        throw new AppError('Delivery not found', 404, 'NOT_FOUND');
      }

      const currentStatus = delivery.status;

      // Validate status transition
      this.validateOrderStatusTransition(currentStatus, newStatus, context);

      // Execute status change
      const updatedDelivery = await this.executeOrderStatusChange(deliveryId, newStatus, context);

      // Execute side effects
      await this.executeStatusChangeEffects(newStatus, 'order', { delivery: updatedDelivery, context });

      return updatedDelivery;
    } catch (error) {
      console.error('Error changing order status:', error);
      throw error;
    }
  }

  // Validate and execute payment status change
  async changePaymentStatus(deliveryId, newStatus, context = {}) {
    try {
      // Get current delivery
      const { prisma } = require('../../../config/database');
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      });

      if (!delivery) {
        throw new AppError('Delivery not found', 404, 'NOT_FOUND');
      }

      const currentStatus = delivery.paymentStatus;

      // Validate status transition
      this.validatePaymentStatusTransition(currentStatus, newStatus, context);

      // Execute status change
      const updatedDelivery = await this.executePaymentStatusChange(deliveryId, newStatus, context);

      // Execute side effects
      await this.executeStatusChangeEffects(newStatus, 'payment', { delivery: updatedDelivery, context });

      return updatedDelivery;
    } catch (error) {
      console.error('Error changing payment status:', error);
      throw error;
    }
  }

  // Validate order status transition
  validateOrderStatusTransition(currentStatus, newStatus, context) {
    // Check if transition is valid
    if (!isValidOrderStatusTransition(currentStatus, newStatus)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${newStatus}`, 400, 'INVALID_ORDER_STATUS');
    }

    // Apply custom rules
    const rules = this.statusChangeRules[currentStatus];
    if (rules && rules.canChangeTo) {
      rules.canChangeTo(currentStatus, newStatus, context);
    }
  }

  // Validate payment status transition
  validatePaymentStatusTransition(currentStatus, newStatus, context) {
    // Check if transition is valid
    if (!isValidPaymentStatusTransition(currentStatus, newStatus)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${newStatus}`, 400, 'INVALID_PAYMENT_STATUS');
    }

    // Apply custom rules
    const rules = this.statusChangeRules[currentStatus];
    if (rules && rules.canChangeTo) {
      rules.canChangeTo(currentStatus, newStatus, context);
    }
  }

  // Execute order status change
  async executeOrderStatusChange(deliveryId, newStatus, context) {
    const { prisma } = require('../../../config/database');
    
    const updateData = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Add timestamps based on status
    switch (newStatus) {
      case OrderStatus.ACCEPTED:
        updateData.acceptedAt = new Date();
        updateData.driverId = context.driverId;
        break;
      case OrderStatus.ARRIVED_AT_PICKUP:
        updateData.pickedUpAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        break;
      case OrderStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = context.cancelledBy;
        updateData.cancellationReason = context.cancellationReason;
        break;
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData
    });

    return updatedDelivery;
  }

  // Execute payment status change
  async executePaymentStatusChange(deliveryId, newStatus, context) {
    const { prisma } = require('../../../config/database');
    
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        paymentStatus: newStatus,
        updatedAt: new Date()
      }
    });

    return updatedDelivery;
  }

  // Execute status change side effects
  async executeStatusChangeEffects(status, type, data) {
    const effects = this.statusChangeEffects[status];
    if (!effects) return;

    for (const effect of effects) {
      try {
        await this.executeEffect(effect, type, data);
      } catch (error) {
        console.error(`Error executing effect ${effect}:`, error);
        // Continue with other effects even if one fails
      }
    }
  }

  // Execute individual effect
  async executeEffect(effect, type, data) {
    const { delivery, context } = data;

    switch (effect) {
      case 'notify_user_order_accepted':
        await this.notifyUserOrderAccepted(delivery, context);
        break;
      case 'notify_user_driver_en_route':
        await this.notifyUserDriverEnRoute(delivery, context);
        break;
      case 'notify_user_arrived_at_pickup':
        await this.notifyUserArrivedAtPickup(delivery, context);
        break;
      case 'notify_user_package_in_transit':
        await this.notifyUserPackageInTransit(delivery, context);
        break;
      case 'notify_user_arrived_at_dropoff':
        await this.notifyUserArrivedAtDropoff(delivery, context);
        break;
      case 'notify_user_delivered':
        await this.notifyUserDelivered(delivery, context);
        break;
      case 'notify_user_completed':
        await this.notifyUserCompleted(delivery, context);
        break;
      case 'notify_user_cancelled':
        await this.notifyUserCancelled(delivery, context);
        break;
      case 'notify_user_disputed':
        await this.notifyUserDisputed(delivery, context);
        break;
      case 'update_driver_status':
        await this.updateDriverStatus(delivery.driverId, 'BUSY');
        break;
      case 'update_driver_earnings':
        await this.updateDriverEarnings(delivery.driverId, delivery.actualFare || delivery.estimatedFare);
        break;
      case 'update_driver_stats':
        await this.updateDriverStats(delivery.driverId);
        break;
      case 'generate_invoice':
        await this.generateInvoice(delivery.id);
        break;
      case 'start_location_tracking':
        await this.startLocationTracking(delivery.id, delivery.driverId);
        break;
      case 'stop_location_tracking':
        await this.stopLocationTracking(delivery.id);
        break;
      case 'release_driver':
        await this.releaseDriver(delivery.driverId);
        break;
      case 'process_refund_if_applicable':
        await this.processRefundIfApplicable(delivery);
        break;
      case 'create_dispute_record':
        await this.createDisputeRecord(delivery, context);
        break;
      case 'escalate_to_admin':
        await this.escalateToAdmin(delivery);
        break;
      case 'confirm_payment':
        await this.confirmPayment(delivery);
        break;
      case 'notify_payment_received':
        await this.notifyPaymentReceived(delivery);
        break;
      case 'process_refund':
        await this.processRefund(delivery);
        break;
      case 'notify_refund_processed':
        await this.notifyRefundProcessed(delivery);
        break;
      case 'notify_payment_failed':
        await this.notifyPaymentFailed(delivery);
        break;
      default:
        console.log(`Effect ${effect} not implemented`);
    }
  }

  // Effect implementations (placeholders)
  async notifyUserOrderAccepted(delivery, context) {
    // Implement notification logic
    console.log(`Notifying user ${delivery.userId} that order ${delivery.id} was accepted`);
  }

  async notifyUserDriverEnRoute(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that driver is en route`);
  }

  async notifyUserArrivedAtPickup(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that driver arrived at pickup`);
  }

  async notifyUserPackageInTransit(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that package is in transit`);
  }

  async notifyUserArrivedAtDropoff(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that driver arrived at dropoff`);
  }

  async notifyUserDelivered(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that package was delivered`);
  }

  async notifyUserCompleted(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that order was completed`);
  }

  async notifyUserCancelled(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that order was cancelled`);
  }

  async notifyUserDisputed(delivery, context) {
    console.log(`Notifying user ${delivery.userId} that order is disputed`);
  }

  async updateDriverStatus(driverId, status) {
    const { prisma } = require('../../../config/database');
    await prisma.driver.update({
      where: { id: driverId },
      data: { status }
    });
  }

  async updateDriverEarnings(driverId, amount) {
    const { prisma } = require('../../../config/database');
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        todaysEarnings: { increment: amount },
        totalEarnings: { increment: amount },
        completedCount: { increment: 1 }
      }
    });
  }

  async updateDriverStats(driverId) {
    // Update driver statistics
    console.log(`Updating stats for driver ${driverId}`);
  }

  async generateInvoice(deliveryId) {
    console.log(`Generating invoice for delivery ${deliveryId}`);
  }

  async startLocationTracking(deliveryId, driverId) {
    console.log(`Starting location tracking for delivery ${deliveryId}`);
  }

  async stopLocationTracking(deliveryId) {
    console.log(`Stopping location tracking for delivery ${deliveryId}`);
  }

  async releaseDriver(driverId) {
    await this.updateDriverStatus(driverId, 'ONLINE');
  }

  async processRefundIfApplicable(delivery) {
    if (delivery.paymentStatus === 'PAID') {
      await this.processRefund(delivery);
    }
  }

  async createDisputeRecord(delivery, context) {
    const { prisma } = require('../../../config/database');
    await prisma.dispute.create({
      data: {
        deliveryId: delivery.id,
        userId: delivery.userId,
        driverId: delivery.driverId,
        issueTitle: context.disputeTitle || 'Order Dispute',
        description: context.disputeDescription || 'Order dispute created automatically',
        status: 'OPEN'
      }
    });
  }

  async escalateToAdmin(delivery) {
    console.log(`Escalating delivery ${delivery.id} to admin`);
  }

  async confirmPayment(delivery) {
    console.log(`Confirming payment for delivery ${delivery.id}`);
  }

  async notifyPaymentReceived(delivery) {
    console.log(`Notifying payment received for delivery ${delivery.id}`);
  }

  async processRefund(delivery) {
    console.log(`Processing refund for delivery ${delivery.id}`);
  }

  async notifyRefundProcessed(delivery) {
    console.log(`Notifying refund processed for delivery ${delivery.id}`);
  }

  async notifyPaymentFailed(delivery) {
    console.log(`Notifying payment failed for delivery ${delivery.id}`);
  }

  // Get allowed transitions for a status
  getAllowedOrderStatusTransitions(currentStatus) {
    return getAllowedOrderStatusTransitions(currentStatus);
  }

  // Check if status is final
  isFinalOrderStatus(status) {
    return [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status);
  }

  // Check if status is active
  isActiveOrderStatus(status) {
    return [
      OrderStatus.ACCEPTED,
      OrderStatus.DRIVER_EN_ROUTE,
      OrderStatus.ARRIVED_AT_PICKUP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.ARRIVED_AT_DROPOFF
    ].includes(status);
  }

  // Get status flow diagram
  getStatusFlowDiagram() {
    return {
      order: this.orderStatusFlow,
      payment: this.paymentStatusFlow
    };
  }
}

module.exports = new StatusMachine();