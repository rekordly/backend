// SMS templates for users
const orderStatusUpdate = (notification) => 
  `D-Ride: Your order status has been updated to ${notification.data.status}. Order ID: ${notification.data.orderId}. Track in app: ${process.env.APP_URL}`;

const newOrder = (notification) => 
  `D-Ride: New delivery request! Order ID: ${notification.data.orderId}. Fare: ${notification.data.estimatedFare}. Accept in app now: ${process.env.APP_URL}`;

const paymentConfirmed = (notification) => 
  `D-Ride: Payment confirmed! Amount: ${notification.data.amount}. Order ID: ${notification.data.orderId}. Thank you for using D-Ride!`;

const kycApproved = (notification) => 
  `D-Ride: KYC Approved! You can now start accepting delivery requests. Update your availability in the driver app. Congratulations!`;

const kycRejected = (notification) => 
  `D-Ride: KYC verification rejected. Reason: ${notification.data.reason}. Please resubmit your documents. Contact support for help.`;

const disputeUpdate = (notification) => 
  `D-Ride: Dispute update. Status: ${notification.data.status}. Dispute ID: ${notification.data.disputeId}. View details in your account.`;

const driverLocationUpdate = (notification) => 
  `D-Ride: Driver update! ${notification.data.driverName} is ${notification.data.eta} mins away. Order ID: ${notification.data.orderId}. Track in app.`;

module.exports = {
  orderStatusUpdate,
  newOrder,
  paymentConfirmed,
  kycApproved,
  kycRejected,
  disputeUpdate,
  driverLocationUpdate
};