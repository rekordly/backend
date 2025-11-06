// Order Status Enum
const OrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DRIVER_EN_ROUTE: 'DRIVER_EN_ROUTE',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED_AT_DROPOFF: 'ARRIVED_AT_DROPOFF',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
};

// Order Status Transitions
const OrderStatusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.DRIVER_EN_ROUTE, OrderStatus.CANCELLED],
  [OrderStatus.DRIVER_EN_ROUTE]: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.ARRIVED_AT_PICKUP]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED_AT_DROPOFF, OrderStatus.CANCELLED],
  [OrderStatus.ARRIVED_AT_DROPOFF]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
  [OrderStatus.COMPLETED]: [], // Final state
  [OrderStatus.CANCELLED]: [], // Final state
  [OrderStatus.DISPUTED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] // Can be resolved
};

// Check if status transition is valid
const isValidOrderStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = OrderStatusTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Get allowed status transitions
const getAllowedOrderStatusTransitions = (currentStatus) => {
  return OrderStatusTransitions[currentStatus] || [];
};

// Check if order is active
const isOrderActive = (status) => {
  return [
    OrderStatus.ACCEPTED,
    OrderStatus.DRIVER_EN_ROUTE,
    OrderStatus.ARRIVED_AT_PICKUP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.ARRIVED_AT_DROPOFF
  ].includes(status);
};

// Check if order is completed
const isOrderCompleted = (status) => {
  return [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status);
};

// Check if order can be cancelled
const canCancelOrder = (status) => {
  return [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.DRIVER_EN_ROUTE,
    OrderStatus.ARRIVED_AT_PICKUP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.ARRIVED_AT_DROPOFF
  ].includes(status);
};

module.exports = {
  OrderStatus,
  OrderStatusTransitions,
  isValidOrderStatusTransition,
  getAllowedOrderStatusTransitions,
  isOrderActive,
  isOrderCompleted,
  canCancelOrder
};