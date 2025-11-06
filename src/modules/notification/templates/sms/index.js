// Order status update templates
module.exports = {
  ORDER_STATUS_UPDATE: (data) => 
    `Your order ${data.orderId} status is now ${data.status}. ${data.driverInfo ? `Driver: ${data.driverInfo.name}` : ''}`,
  
  // New order notification
  NEW_ORDER: (data) => 
    `New order available! Order ${data.orderId} from ${data.pickupAddress} to ${data.dropoffAddress}. Fare: $${data.estimatedFare}`,
  
  // Payment confirmation
  PAYMENT_CONFIRMED: (data) => 
    `Payment of $${data.amount} confirmed for order ${data.orderId}. Method: ${data.paymentMethod}`,
  
  // KYC approval
  KYC_APPROVED: (data) => 
    `KYC approved! You can now start accepting orders. Approved documents: ${data.documents.join(', ')}`,
  
  // KYC rejection
  KYC_REJECTED: (data) => 
    `KYC rejected. Reason: ${data.reason}. Please resubmit documents.`,
  
  // Dispute update
  DISPUTE_UPDATE: (data) => 
    `Dispute ${data.disputeId} status updated to ${data.status}. ${data.resolution ? `Resolution: ${data.resolution}` : ''}`,
  
  // Default template
  default: (data) => 
    data.message || 'You have a new notification'
};