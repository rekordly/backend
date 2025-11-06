// Driver Profile DTO
class DriverProfileDTO {
  constructor(driver) {
    this.id = driver.id;
    this.userId = driver.userId;
    this.user = {
      id: driver.user.id,
      email: driver.user.email,
      fullName: driver.user.fullName,
      phoneNumber: driver.user.phoneNumber,
      locationState: driver.user.locationState,
      profilePictureUrl: driver.user.profilePictureUrl
    };
    this.status = driver.status;
    this.overallKycStatus = driver.overallKycStatus;
    this.currentDeliveryId = driver.currentDeliveryId;
    this.todaysEarnings = driver.todaysEarnings;
    this.totalEarnings = driver.totalEarnings;
    this.completedCount = driver.completedCount;
    this.rating = driver.rating;
    this.totalRatings = driver.totalRatings;
    this.isAvailable = driver.isAvailable;
    this.lastLocationUpdate = driver.lastLocationUpdate;
    this.createdAt = driver.createdAt;
    this.updatedAt = driver.updatedAt;
    
    // Include vehicle if available
    if (driver.vehicle) {
      this.vehicle = {
        id: driver.vehicle.id,
        vehicleType: driver.vehicle.vehicleType,
        plateNumber: driver.vehicle.plateNumber,
        vehicleModel: driver.vehicle.vehicleModel,
        vehicleColor: driver.vehicle.vehicleColor,
        vehicleYear: driver.vehicle.vehicleYear,
        make: driver.vehicle.make
      };
    }
  }
}

// Driver Metrics DTO
class DriverMetricsDTO {
  constructor(driver, todayStats) {
    this.id = driver.id;
    this.userId = driver.userId;
    this.fullName = driver.user.fullName;
    this.todaysEarnings = driver.todaysEarnings;
    this.totalEarnings = driver.totalEarnings;
    this.completedCount = driver.completedCount;
    this.rating = driver.rating;
    this.totalRatings = driver.totalRatings;
    this.status = driver.status;
    this.isAvailable = driver.isAvailable;
    
    // Today's additional stats
    this.todayStats = {
      totalDeliveries: todayStats.totalDeliveries || 0,
      averageRating: todayStats.averageRating || 0,
      totalDistance: todayStats.totalDistance || 0,
      totalTime: todayStats.totalTime || 0
    };
  }
}

// Driver Location DTO
class DriverLocationDTO {
  constructor(location) {
    this.driverId = location.driverId;
    this.latitude = location.latitude;
    this.longitude = location.longitude;
    this.timestamp = location.timestamp;
    this.status = location.status;
    this.bearing = location.bearing;
    this.speed = location.speed;
    this.accuracy = location.accuracy;
  }
}

// Driver Dashboard DTO
class DriverDashboardDTO {
  constructor(driver, activeDelivery, newRequests, metrics) {
    this.driver = {
      id: driver.id,
      status: driver.status,
      isAvailable: driver.isAvailable,
      todaysEarnings: driver.todaysEarnings,
      completedCount: driver.completedCount
    };
    
    this.activeDelivery = activeDelivery ? {
      id: activeDelivery.id,
      status: activeDelivery.status,
      pickupAddress: activeDelivery.pickupAddress,
      dropoffAddress: activeDelivery.dropoffAddress,
      estimatedFare: activeDelivery.estimatedFare,
      receiverPhoneNumber: activeDelivery.receiverPhoneNumber,
      acceptedAt: activeDelivery.acceptedAt,
      pickedUpAt: activeDelivery.pickedUpAt
    } : null;
    
    this.newRequests = newRequests.map(request => ({
      id: request.id,
      pickupAddress: request.pickupAddress,
      dropoffAddress: request.dropoffAddress,
      estimatedFare: request.estimatedFare,
      distance: request.distance,
      duration: request.duration,
      createdAt: request.createdAt
    }));
    
    this.metrics = metrics;
  }
}

// Driver List DTO
class DriverListDTO {
  constructor(drivers) {
    this.drivers = drivers.map(driver => ({
      id: driver.id,
      userId: driver.userId,
      fullName: driver.user.fullName,
      email: driver.user.email,
      phoneNumber: driver.user.phoneNumber,
      status: driver.status,
      overallKycStatus: driver.overallKycStatus,
      rating: driver.rating,
      totalRatings: driver.totalRatings,
      isAvailable: driver.isAvailable,
      lastLocationUpdate: driver.lastLocationUpdate,
      vehicle: driver.vehicle ? {
        vehicleType: driver.vehicle.vehicleType,
        plateNumber: driver.vehicle.plateNumber,
        vehicleModel: driver.vehicle.vehicleModel
      } : null
    }));
    
    this.total = drivers.length;
  }
}

// Driver Availability DTO
class DriverAvailabilityDTO {
  constructor(driver, availableDriversCount) {
    this.driverId = driver.id;
    this.status = driver.status;
    this.isAvailable = driver.isAvailable;
    this.availableDriversCount = availableDriversCount;
    this.message = driver.isAvailable ? 
      'You are available to receive orders' : 
      'You are not available to receive orders';
  }
}

module.exports = {
  DriverProfileDTO,
  DriverMetricsDTO,
  DriverLocationDTO,
  DriverDashboardDTO,
  DriverListDTO,
  DriverAvailabilityDTO
};