// Payment Status Enum
const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  NOT_PAID: 'NOT_PAID',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED'
};

// Payment Status Transitions
const PaymentStatusTransitions = {
  [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.NOT_PAID, PaymentStatus.FAILED],
  [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
  [PaymentStatus.NOT_PAID]: [PaymentStatus.PAID, PaymentStatus.FAILED],
  [PaymentStatus.REFUNDED]: [], // Final state
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING] // Can retry
};

// Check if payment status transition is valid
const isValidPaymentStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = PaymentStatusTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Get allowed payment status transitions
const getAllowedPaymentStatusTransitions = (currentStatus) => {
  return PaymentStatusTransitions[currentStatus] || [];
};

// Check if payment is completed
const isPaymentCompleted = (status) => {
  return [PaymentStatus.PAID, PaymentStatus.REFUNDED].includes(status);
};

// Check if payment is pending
const isPaymentPending = (status) => {
  return [PaymentStatus.PENDING, PaymentStatus.NOT_PAID].includes(status);
};

// Check if payment can be refunded
const canRefundPayment = (status) => {
  return status === PaymentStatus.PAID;
};

// Check if payment can be retried
const canRetryPayment = (status) => {
  return status === PaymentStatus.FAILED;
};

module.exports = {
  PaymentStatus,
  PaymentStatusTransitions,
  isValidPaymentStatusTransition,
  getAllowedPaymentStatusTransitions,
  isPaymentCompleted,
  isPaymentPending,
  canRefundPayment,
  canRetryPayment
};