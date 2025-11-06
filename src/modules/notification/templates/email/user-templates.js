// Email templates for users
const orderStatusUpdate = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Order Status Update</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>Your order status has been updated to: <strong>${notification.data.status}</strong></p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${notification.data.orderId}</p>
      <p><strong>New Status:</strong> ${notification.data.status}</p>
      <p><strong>Updated At:</strong> ${new Date(notification.data.timestamp).toLocaleString()}</p>
    </div>
    <p>You can track your order in real-time using our mobile app.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const newOrder = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">New Order Received</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>You have received a new delivery request!</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${notification.data.orderId}</p>
      <p><strong>Pickup:</strong> ${notification.data.pickupAddress}</p>
      <p><strong>Dropoff:</strong> ${notification.data.dropoffAddress}</p>
      <p><strong>Estimated Fare:</strong> ${notification.data.estimatedFare}</p>
    </div>
    <p>Please accept or reject this order in your driver app.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const paymentConfirmed = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Payment Confirmed</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>Your payment has been confirmed successfully!</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${notification.data.orderId}</p>
      <p><strong>Amount:</strong> ${notification.data.amount}</p>
      <p><strong>Payment Method:</strong> ${notification.data.paymentMethod}</p>
      <p><strong>Transaction ID:</strong> ${notification.data.transactionId}</p>
    </div>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const kycApproved = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #28a745;">KYC Approved!</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>Congratulations! Your KYC verification has been approved.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Verification Status:</strong> Approved</p>
      <p><strong>Approved At:</strong> ${new Date().toLocaleString()}</p>
    </div>
    <p>You can now start accepting delivery requests. Update your availability in the driver app to begin receiving orders.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const kycRejected = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #dc3545;">KYC Verification Rejected</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>We regret to inform you that your KYC verification has been rejected.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Verification Status:</strong> Rejected</p>
      <p><strong>Reason:</strong> ${notification.data.reason}</p>
      <p><strong>Rejected At:</strong> ${new Date().toLocaleString()}</p>
    </div>
    <p>Please review the rejection reason and submit your documents again. If you have any questions, please contact our support team.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const disputeUpdate = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Dispute Update</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>There has been an update to your dispute case.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Dispute ID:</strong> ${notification.data.disputeId}</p>
      <p><strong>Status:</strong> ${notification.data.status}</p>
      <p><strong>Updated At:</strong> ${new Date(notification.data.timestamp).toLocaleString()}</p>
    </div>
    <p>You can view the full details and respond to this update in your account dashboard.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

const driverLocationUpdate = (notification) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Driver Location Update</h2>
    <p>Hello ${notification.user.fullName},</p>
    <p>Your driver is on the way! Here's the latest location update:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${notification.data.orderId}</p>
      <p><strong>Driver Name:</strong> ${notification.data.driverName}</p>
      <p><strong>Estimated Time of Arrival:</strong> ${notification.data.eta} minutes</p>
      <p><strong>Last Updated:</strong> ${new Date(notification.data.timestamp).toLocaleString()}</p>
    </div>
    <p>You can track your driver's location in real-time using our mobile app.</p>
    <p>Thank you for using D-Ride!</p>
  </div>
`;

module.exports = {
  orderStatusUpdate,
  newOrder,
  paymentConfirmed,
  kycApproved,
  kycRejected,
  disputeUpdate,
  driverLocationUpdate
};