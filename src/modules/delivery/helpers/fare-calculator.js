const { VEHICLE_TYPES, PAYMENT_METHODS } = require('../../../config/constants');

class FareCalculator {
  constructor() {
    // Base pricing configuration
    this.baseFare = {
      [VEHICLE_TYPES.BIKE]: { base: 500, perKm: 100, perMinute: 10 },
      [VEHICLE_TYPES.CAR]: { base: 800, perKm: 150, perMinute: 15 },
      [VEHICLE_TYPES.VAN]: { base: 1200, perKm: 200, perMinute: 20 },
      [VEHICLE_TYPES.TRUCK]: { base: 1500, perKm: 250, perMinute: 25 }
    };

    // Multipliers for different conditions
    this.multipliers = {
      peakHours: 1.5, // 50% increase during peak hours
      weekend: 1.2, // 20% increase on weekends
      weather: 1.3, // 30% increase during bad weather
      distance: {
        short: 1.2, // < 5km
        medium: 1.0, // 5-20km
        long: 0.9 // > 20km
      },
      package: {
        fragile: 1.1, // 10% extra for fragile items
        heavy: 1.2, // 20% extra for heavy items (> 10kg)
        bulky: 1.15, // 15% extra for bulky items
        specialHandling: 1.25 // 25% extra for special handling
      }
    };

    // Additional fees
    this.additionalFees = {
      platformFee: 0.1, // 10% platform fee
      serviceFee: 50, // Fixed service fee
      paymentMethod: {
        [PAYMENT_METHODS.CASH]: 0, // No extra fee for cash
        [PAYMENT_METHODS.CARD]: 0.02, // 2% extra for card payments
        [PAYMENT_METHODS.TRANSFER]: 0.01 // 1% extra for transfers
      }
    };

    // Peak hours (24-hour format)
    this.peakHours = [
      { start: 7, end: 10 }, // Morning peak
      { start: 17, end: 20 } // Evening peak
    ];
  }

  // Calculate fare based on distance, duration, and package details
  calculateFare(distance, duration, vehicleType = VEHICLE_TYPES.BIKE, packageDetails = {}, options = {}) {
    const {
      isPeakHour = false,
      isWeekend = false,
      isBadWeather = false,
      paymentMethod = PAYMENT_METHODS.CASH
    } = options;

    // Get base pricing for vehicle type
    const basePricing = this.baseFare[vehicleType] || this.baseFare[VEHICLE_TYPES.BIKE];

    // Calculate base fare
    let fare = basePricing.base;
    fare += distance * basePricing.perKm;
    fare += duration * basePricing.perMinute;

    // Apply distance multiplier
    const distanceMultiplier = this.getDistanceMultiplier(distance);
    fare *= distanceMultiplier;

    // Apply time-based multipliers
    if (isPeakHour) fare *= this.multipliers.peakHours;
    if (isWeekend) fare *= this.multipliers.weekend;
    if (isBadWeather) fare *= this.multipliers.weather;

    // Apply package multipliers
    if (packageDetails.isFragile) fare *= this.multipliers.package.fragile;
    if (packageDetails.weight && packageDetails.weight > 10) fare *= this.multipliers.package.heavy;
    if (packageDetails.dimensions && this.isBulky(packageDetails.dimensions)) fare *= this.multipliers.package.bulky;
    if (packageDetails.requiresSpecialHandling) fare *= this.multipliers.package.specialHandling;

    // Calculate additional fees
    const platformFee = fare * this.additionalFees.platformFee;
    const paymentMethodFee = fare * (this.additionalFees.paymentMethod[paymentMethod] || 0);
    const totalAdditionalFees = platformFee + paymentMethodFee + this.additionalFees.serviceFee;

    // Total fare
    const totalFare = Math.round(fare + totalAdditionalFees);

    return {
      baseFare: Math.round(fare),
      distanceFare: Math.round(distance * basePricing.perKm),
      timeFare: Math.round(duration * basePricing.perMinute),
      distanceMultiplier,
      peakHourMultiplier: isPeakHour ? this.multipliers.peakHours : 1,
      weekendMultiplier: isWeekend ? this.multipliers.weekend : 1,
      weatherMultiplier: isBadWeather ? this.multipliers.weather : 1,
      packageMultipliers: {
        fragile: packageDetails.isFragile ? this.multipliers.package.fragile : 1,
        heavy: packageDetails.weight && packageDetails.weight > 10 ? this.multipliers.package.heavy : 1,
        bulky: packageDetails.dimensions && this.isBulky(packageDetails.dimensions) ? this.multipliers.package.bulky : 1,
        specialHandling: packageDetails.requiresSpecialHandling ? this.multipliers.package.specialHandling : 1
      },
      additionalFees: {
        platformFee: Math.round(platformFee),
        paymentMethodFee: Math.round(paymentMethodFee),
        serviceFee: this.additionalFees.serviceFee,
        totalAdditionalFees: Math.round(totalAdditionalFees)
      },
      totalFare,
      breakdown: this.generateBreakdown(distance, duration, vehicleType, packageDetails, options)
    };
  }

  // Get distance multiplier based on distance
  getDistanceMultiplier(distance) {
    if (distance < 5) return this.multipliers.distance.short;
    if (distance <= 20) return this.multipliers.distance.medium;
    return this.multipliers.distance.long;
  }

  // Check if package is bulky
  isBulky(dimensions) {
    if (!dimensions) return false;
    const volume = dimensions.length * dimensions.width * dimensions.height;
    return volume > 50000; // > 50,000 cm³
  }

  // Check if current time is peak hour
  isPeakHour(date = new Date()) {
    const hour = date.getHours();
    return this.peakHours.some(period => hour >= period.start && hour < period.end);
  }

  // Check if current day is weekend
  isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  // Generate detailed breakdown
  generateBreakdown(distance, duration, vehicleType, packageDetails, options) {
    const basePricing = this.baseFare[vehicleType] || this.baseFare[VEHICLE_TYPES.BIKE];
    
    const breakdown = [
      { label: 'Base Fare', amount: basePricing.base },
      { label: `Distance (${distance.toFixed(1)} km)`, amount: Math.round(distance * basePricing.perKm) },
      { label: `Time (${duration} min)`, amount: Math.round(duration * basePricing.perMinute) }
    ];

    // Add package-related charges
    if (packageDetails.isFragile) {
      breakdown.push({ label: 'Fragile Item Surcharge', amount: Math.round(basePricing.base * 0.1) });
    }
    
    if (packageDetails.weight && packageDetails.weight > 10) {
      breakdown.push({ label: 'Heavy Item Surcharge', amount: Math.round(basePricing.base * 0.2) });
    }
    
    if (packageDetails.dimensions && this.isBulky(packageDetails.dimensions)) {
      breakdown.push({ label: 'Bulky Item Surcharge', amount: Math.round(basePricing.base * 0.15) });
    }
    
    if (packageDetails.requiresSpecialHandling) {
      breakdown.push({ label: 'Special Handling Fee', amount: Math.round(basePricing.base * 0.25) });
    }

    // Add time-based surcharges
    if (options.isPeakHour) {
      breakdown.push({ label: 'Peak Hour Surcharge', amount: Math.round(basePricing.base * 0.5) });
    }
    
    if (options.isWeekend) {
      breakdown.push({ label: 'Weekend Surcharge', amount: Math.round(basePricing.base * 0.2) });
    }
    
    if (options.isBadWeather) {
      breakdown.push({ label: 'Weather Surcharge', amount: Math.round(basePricing.base * 0.3) });
    }

    // Add fees
    breakdown.push(
      { label: 'Platform Fee', amount: Math.round(basePricing.base * 0.1) },
      { label: 'Service Fee', amount: this.additionalFees.serviceFee }
    );

    // Add payment method fee
    const paymentFee = basePricing.base * (this.additionalFees.paymentMethod[options.paymentMethod] || 0);
    if (paymentFee > 0) {
      breakdown.push({ label: `${options.paymentMethod} Fee`, amount: Math.round(paymentFee) });
    }

    return breakdown;
  }

  // Estimate fare for a delivery
  async estimateFare(pickupCoords, dropoffCoords, packageDetails = {}, vehicleType = VEHICLE_TYPES.BIKE) {
    // Calculate distance and duration (in a real app, this would use Google Maps API)
    const distance = this.calculateDistance(pickupCoords, dropoffCoords);
    const duration = this.calculateDuration(distance, vehicleType);

    // Get current conditions
    const now = new Date();
    const isPeakHour = this.isPeakHour(now);
    const isWeekend = this.isWeekend(now);
    const isBadWeather = await this.checkWeatherConditions(pickupCoords);

    // Calculate fare
    const fare = this.calculateFare(distance, duration, vehicleType, packageDetails, {
      isPeakHour,
      isWeekend,
      isBadWeather
    });

    return {
      ...fare,
      distance,
      duration,
      estimatedArrival: this.calculateEstimatedArrival(now, duration),
      vehicleType
    };
  }

  // Calculate distance between two coordinates (simplified)
  calculateDistance(coords1, coords2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(coords2.latitude - coords1.latitude);
    const dLon = this.toRad(coords2.longitude - coords1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(coords1.latitude)) * Math.cos(this.toRad(coords2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate duration based on distance and vehicle type
  calculateDuration(distance, vehicleType) {
    const avgSpeeds = {
      [VEHICLE_TYPES.BIKE]: 30, // km/h
      [VEHICLE_TYPES.CAR]: 40, // km/h
      [VEHICLE_TYPES.VAN]: 35, // km/h
      [VEHICLE_TYPES.TRUCK]: 25 // km/h
    };

    const avgSpeed = avgSpeeds[vehicleType] || avgSpeeds[VEHICLE_TYPES.BIKE];
    const drivingTime = (distance / avgSpeed) * 60; // Convert to minutes
    
    // Add pickup/dropoff time
    const handlingTime = 10; // 10 minutes for pickup and dropoff
    
    return Math.round(drivingTime + handlingTime);
  }

  // Convert degrees to radians
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calculate estimated arrival time
  calculateEstimatedArrival(startTime, duration) {
    const arrival = new Date(startTime.getTime() + duration * 60000);
    return arrival.toISOString();
  }

  // Check weather conditions (placeholder - would integrate with weather API)
  async checkWeatherConditions(coords) {
    // In a real implementation, this would call a weather API
    // For now, return false (no bad weather)
    return false;
  }

  // Get minimum fare for vehicle type
  getMinimumFare(vehicleType = VEHICLE_TYPES.BIKE) {
    const basePricing = this.baseFare[vehicleType] || this.baseFare[VEHICLE_TYPES.BIKE];
    return Math.round(basePricing.base * 1.5); // 1.5x base fare as minimum
  }

  // Get maximum fare for vehicle type
  getMaximumFare(vehicleType = VEHICLE_TYPES.BIKE) {
    const basePricing = this.baseFare[vehicleType] || this.baseFare[VEHICLE_TYPES.BIKE];
    return Math.round(basePricing.base * 10); // 10x base fare as maximum
  }
}

module.exports = new FareCalculator();