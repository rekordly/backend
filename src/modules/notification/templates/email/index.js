// Order status update templates
module.exports = {
  ORDER_STATUS_UPDATE: (data) => ({
    subject: `Order Status Update - ${data.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Your order status has been updated to: <strong>${data.status}</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>New Status:</strong> ${data.status}</p>
          <p><strong>Updated At:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
        ${data.driverInfo ? `
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Driver Information</h3>
            <p><strong>Name:</strong> ${data.driverInfo.name}</p>
            <p><strong>Vehicle:</strong> ${data.driverInfo.vehicle}</p>
            <p><strong>Phone:</strong> ${data.driverInfo.phone}</p>
          </div>
        ` : ''}
        <p>Thank you for using our service!</p>
      </div>
    `,
    text: `
      Order Status Update
      
      Your order status has been updated to: ${data.status}
      
      Order ID: ${data.orderId}
      New Status: ${data.status}
      Updated At: ${new Date(data.timestamp).toLocaleString()}
      
      ${data.driverInfo ? `
      Driver Information:
      Name: ${data.driverInfo.name}
      Vehicle: ${data.driverInfo.vehicle}
      Phone: ${data.driverInfo.phone}
      ` : ''}
      
      Thank you for using our service!
    `
  }),

  // New order notification
  NEW_ORDER: (data) => ({
    subject: 'New Order Available',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Order Available</h2>
        <p>A new order is available in your area!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Pickup:</strong> ${data.pickupAddress}</p>
          <p><strong>Dropoff:</strong> ${data.dropoffAddress}</p>
          <p><strong>Estimated Fare:</strong> $${data.estimatedFare}</p>
          <p><strong>Distance:</strong> ${data.distance} km</p>
        </div>
        <p>Please check your driver app to accept this order.</p>
      </div>
    `,
    text: `
      New Order Available
      
      A new order is available in your area!
      
      Order ID: ${data.orderId}
      Pickup: ${data.pickupAddress}
      Dropoff: ${data.dropoffAddress}
      Estimated Fare: $${data.estimatedFare}
      Distance: ${data.distance} km
      
      Please check your driver app to accept this order.
    `
  }),

  // Payment confirmation
  PAYMENT_CONFIRMED: (data) => ({
    subject: 'Payment Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Confirmed</h2>
        <p>Your payment has been successfully processed!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Processed At:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
        <p>Thank you for your payment!</p>
      </div>
    `,
    text: `
      Payment Confirmed
      
      Your payment has been successfully processed!
      
      Order ID: ${data.orderId}
      Amount: $${data.amount}
      Payment Method: ${data.paymentMethod}
      Transaction ID: ${data.transactionId}
      Processed At: ${new Date(data.timestamp).toLocaleString()}
      
      Thank you for your payment!
    `
  }),

  // KYC approval
  KYC_APPROVED: (data) => ({
    subject: 'KYC Verification Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">KYC Verification Approved</h2>
        <p>Congratulations! Your KYC verification has been approved.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>User ID:</strong> ${data.userId}</p>
          <p><strong>Approved At:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          <p><strong>Approved Documents:</strong> ${data.documents.join(', ')}</p>
        </div>
        <p>You can now start accepting orders as a driver.</p>
      </div>
    `,
    text: `
      KYC Verification Approved
      
      Congratulations! Your KYC verification has been approved.
      
      User ID: ${data.userId}
      Approved At: ${new Date(data.timestamp).toLocaleString()}
      Approved Documents: ${data.documents.join(', ')}
      
      You can now start accepting orders as a driver.
    `
  }),

  // KYC rejection
  KYC_REJECTED: (data) => ({
    subject: 'KYC Verification Rejected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">KYC Verification Rejected</h2>
        <p>Your KYC verification has been rejected. Please review the reason below and resubmit your documents.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>User ID:</strong> ${data.userId}</p>
          <p><strong>Rejected At:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          <p><strong>Rejected Documents:</strong> ${data.documents.join(', ')}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
        </div>
        <p>Please update your documents and resubmit for verification.</p>
      </div>
    `,
    text: `
      KYC Verification Rejected
      
      Your KYC verification has been rejected. Please review the reason below and resubmit your documents.
      
      User ID: ${data.userId}
      Rejected At: ${new Date(data.timestamp).toLocaleString()}
      Rejected Documents: ${data.documents.join(', ')}
      Reason: ${data.reason}
      
      Please update your documents and resubmit for verification.
    `
  }),

  // Dispute update
  DISPUTE_UPDATE: (data) => ({
    subject: `Dispute Update - ${data.disputeId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Dispute Update</h2>
        <p>Your dispute status has been updated to: <strong>${data.status}</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Dispute ID:</strong> ${data.disputeId}</p>
          <p><strong>New Status:</strong> ${data.status}</p>
          <p><strong>Updated At:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          ${data.resolution ? `<p><strong>Resolution:</strong> ${data.resolution}</p>` : ''}
        </div>
        <p>Thank you for your patience.</p>
      </div>
    `,
    text: `
      Dispute Update
      
      Your dispute status has been updated to: ${data.status}
      
      Dispute ID: ${data.disputeId}
      New Status: ${data.status}
      Updated At: ${new Date(data.timestamp).toLocaleString()}
      ${data.resolution ? `Resolution: ${data.resolution}` : ''}
      
      Thank you for your patience.
    `
  }),

  // Default template
  default: (data) => ({
    subject: 'Notification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Notification</h2>
        <p>${data.message}</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Sent At:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `,
    text: `
      Notification
      
      ${data.message}
      
      Sent At: ${new Date().toLocaleString()}
    `
  })
};