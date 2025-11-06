const Joi = require('joi');

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  coordinates: /^-?\d+\.?\d*,-?\d+\.?\d*$/
};

// Common validation schemas
const commonSchemas = {
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  email: Joi.string().email().pattern(patterns.email),
  phone: Joi.string().pattern(patterns.phone),
  password: Joi.string().min(8).pattern(patterns.password),
  coordinates: Joi.string().pattern(patterns.coordinates),
  url: Joi.string().uri(),
  date: Joi.date().iso(),
  boolean: Joi.boolean(),
  string: Joi.string(),
  number: Joi.number(),
  array: Joi.array(),
  object: Joi.object()
};

// Pagination schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Location schema
const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  address: Joi.string().required()
});

// Address schema
const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  postalCode: Joi.string().required(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180)
});

// User schemas
const userSchemas = {
  signup: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    fullName: Joi.string().min(2).max(100).required(),
    phoneNumber: commonSchemas.phone.required(),
    role: Joi.string().valid('USER', 'DRIVER').required(),
    locationState: Joi.string().required()
  }),
  
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100),
    phoneNumber: commonSchemas.phone,
    email: commonSchemas.email,
    locationState: Joi.string()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  })
};

// Driver schemas
const driverSchemas = {
  updateLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    timestamp: Joi.date().iso().default(() => new Date().toISOString())
  }),
  
  updateVehicleDetails: Joi.object({
    vehicleType: Joi.string().valid('BIKE', 'CAR', 'VAN', 'TRUCK').required(),
    plateNumber: Joi.string().required(),
    vehicleModel: Joi.string().required(),
    vehicleColor: Joi.string(),
    vehicleYear: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1)
  }),
  
  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100),
    phoneNumber: commonSchemas.phone,
    email: commonSchemas.email,
    locationState: Joi.string()
  })
};

// Delivery schemas
const deliverySchemas = {
  createDelivery: Joi.object({
    pickupAddress: addressSchema.required(),
    dropoffAddress: addressSchema.required(),
    receiverPhoneNumber: commonSchemas.phone.required(),
    goodsImageUrl: commonSchemas.url,
    estimatedFare: Joi.number().positive().required(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').required(),
    packageDetails: Joi.object({
      weight: Joi.number().positive(),
      dimensions: Joi.object({
        length: Joi.number().positive(),
        width: Joi.number().positive(),
        height: Joi.number().positive()
      }),
      description: Joi.string().max(500),
      isFragile: Joi.boolean().default(false),
      requiresSpecialHandling: Joi.boolean().default(false)
    })
  }),
  
  estimateFare: Joi.object({
    pickupCoords: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    dropoffCoords: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    packageDetails: Joi.object({
      weight: Joi.number().positive(),
      dimensions: Joi.object({
        length: Joi.number().positive(),
        width: Joi.number().positive(),
        height: Joi.number().positive()
      }),
      isFragile: Joi.boolean().default(false),
      requiresSpecialHandling: Joi.boolean().default(false)
    })
  }),
  
  acceptDelivery: Joi.object({
    deliveryId: commonSchemas.id.required()
  }),
  
  rejectDelivery: Joi.object({
    deliveryId: commonSchemas.id.required(),
    reason: Joi.string().max(500)
  }),
  
  updateDeliveryStatus: Joi.object({
    status: Joi.string().valid(
      'PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP',
      'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'DISPUTED'
    ).required(),
    notes: Joi.string().max(1000)
  })
};

// KYC schemas
const kycSchemas = {
  uploadDocument: Joi.object({
    documentType: Joi.string().valid(
      'NATIONAL_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'PROOF_OF_ADDRESS'
    ).required()
  }),
  
  approveDocument: Joi.object({
    documentType: Joi.string().valid(
      'NATIONAL_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'PROOF_OF_ADDRESS'
    ).required()
  }),
  
  rejectDocument: Joi.object({
    documentType: Joi.string().valid(
      'NATIONAL_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'PROOF_OF_ADDRESS'
    ).required(),
    reason: Joi.string().required().min(10).max(500)
  })
};

// Dispute schemas
const disputeSchemas = {
  createDispute: Joi.object({
    deliveryId: commonSchemas.id.required(),
    issueTitle: Joi.string().required().min(5).max(100),
    description: Joi.string().required().min(10).max(2000),
    evidence: Joi.array().items(Joi.string().uri())
  }),
  
  resolveDispute: Joi.object({
    resolutionNotes: Joi.string().required().min(10).max(2000),
    finalAction: Joi.string().valid(
      'REFUND_ISSUED', 'DRIVER_PENALIZED', 'CUSTOMER_COMPENSATED', 'NO_ACTION'
    ).required()
  })
};

// Admin schemas
const adminSchemas = {
  login: Joi.object({
    adminEmail: commonSchemas.email.required(),
    adminPassword: Joi.string().required()
  }),
  
  updateUserStatus: Joi.object({
    status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'DELETED').required(),
    reason: Joi.string().max(500)
  }),
  
  updateUserRole: Joi.object({
    role: Joi.string().valid('USER', 'DRIVER', 'ADMIN').required(),
    reason: Joi.string().max(500)
  })
};

// Notification schemas
const notificationSchemas = {
  registerDevice: Joi.object({
    deviceToken: Joi.string().required(),
    deviceType: Joi.string().valid('IOS', 'ANDROID', 'WEB').required(),
    platform: Joi.string().valid('FCM', 'APNS', 'WEB').required()
  }),
  
  sendNotification: Joi.object({
    userId: commonSchemas.id.required(),
    type: Joi.string().valid(
      'ORDER_STATUS_UPDATE', 'NEW_ORDER', 'PAYMENT_CONFIRMED',
      'KYC_APPROVED', 'KYC_REJECTED', 'DISPUTE_UPDATE', 'DRIVER_LOCATION_UPDATE'
    ).required(),
    title: Joi.string().required().min(1).max(100),
    message: Joi.string().required().min(1).max(500),
    data: Joi.object()
  })
};

// OTP schemas
const otpSchemas = {
  requestOTP: Joi.object({
    email: commonSchemas.email.required(),
    purpose: Joi.string().valid('auth', 'password_reset', 'phone_verification').default('auth')
  }),
  
  verifyOTP: Joi.object({
    email: commonSchemas.email.required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
    purpose: Joi.string().valid('auth', 'password_reset', 'phone_verification').default('auth')
  }),
  
  resetPassword: Joi.object({
    email: commonSchemas.email.required(),
    newPassword: commonSchemas.password.required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
  })
};

module.exports = {
  patterns,
  commonSchemas,
  paginationSchema,
  locationSchema,
  addressSchema,
  userSchemas,
  driverSchemas,
  deliverySchemas,
  kycSchemas,
  disputeSchemas,
  adminSchemas,
  notificationSchemas,
  otpSchemas
};