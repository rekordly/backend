const { logger } = require('./logger');

// Earth radius in kilometers
const EARTH_RADIUS = 6371;

// Convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  try {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS * c; // Distance in kilometers
  } catch (error) {
    logger.error('Error calculating distance:', error);
    throw new Error('Failed to calculate distance');
  }
};

// Calculate distance in meters
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  return calculateDistance(lat1, lon1, lat2, lon2) * 1000;
};

// Calculate bearing between two points
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  try {
    const dLon = toRadians(lon2 - lon1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360; // Bearing in degrees
  } catch (error) {
    logger.error('Error calculating bearing:', error);
    throw new Error('Failed to calculate bearing');
  }
};

// Calculate midpoint between two points
const calculateMidpoint = (lat1, lon1, lat2, lon2) => {
  try {
    const lat1Rad = toRadians(lat1);
    const lon1Rad = toRadians(lon1);
    const lat2Rad = toRadians(lat2);
    const lon2Rad = toRadians(lon2);
    
    const dLon = lon2Rad - lon1Rad;
    
    const bx = Math.cos(lat2Rad) * Math.cos(dLon);
    const by = Math.cos(lat2Rad) * Math.sin(dLon);
    
    const lat3 = Math.atan2(
      Math.sin(lat1Rad) + Math.sin(lat2Rad),
      Math.sqrt((Math.cos(lat1Rad) + bx) * (Math.cos(lat1Rad) + bx) + by * by)
    );
    
    const lon3 = lon1Rad + Math.atan2(by, Math.cos(lat1Rad) + bx);
    
    return {
      latitude: lat3 * 180 / Math.PI,
      longitude: lon3 * 180 / Math.PI
    };
  } catch (error) {
    logger.error('Error calculating midpoint:', error);
    throw new Error('Failed to calculate midpoint');
  }
};

// Check if a point is within a radius of another point
const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
};

// Find points within a given radius
const findPointsWithinRadius = (centerLat, centerLon, points, radiusKm) => {
  return points.filter(point => {
    return isWithinRadius(centerLat, centerLon, point.latitude, point.longitude, radiusKm);
  });
};

// Sort points by distance from a center point
const sortByDistance = (centerLat, centerLon, points) => {
  return points.sort((a, b) => {
    const distanceA = calculateDistance(centerLat, centerLon, a.latitude, a.longitude);
    const distanceB = calculateDistance(centerLat, centerLon, b.latitude, b.longitude);
    return distanceA - distanceB;
  });
};

// Find nearest points
const findNearestPoints = (centerLat, centerLon, points, limit = 5) => {
  const sortedPoints = sortByDistance(centerLat, centerLon, points);
  return sortedPoints.slice(0, limit);
};

// Calculate estimated time of arrival (ETA)
const calculateETA = (distanceKm, averageSpeedKmh = 40) => {
  try {
    const hours = distanceKm / averageSpeedKmh;
    const minutes = hours * 60;
    
    return {
      hours: Math.floor(hours),
      minutes: Math.round(minutes % 60),
      totalMinutes: Math.round(minutes)
    };
  } catch (error) {
    logger.error('Error calculating ETA:', error);
    throw new Error('Failed to calculate ETA');
  }
};

// Format distance
const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

// Format coordinates
const formatCoordinates = (lat, lon) => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
};

// Validate coordinates
const isValidCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

// Parse coordinates from string
const parseCoordinates = (coordString) => {
  try {
    const parts = coordString.split(',').map(part => parseFloat(part.trim()));
    
    if (parts.length !== 2 || parts.some(isNaN)) {
      return null;
    }
    
    const [lat, lon] = parts;
    
    if (!isValidCoordinates(lat, lon)) {
      return null;
    }
    
    return { latitude: lat, longitude: lon };
  } catch (error) {
    logger.error('Error parsing coordinates:', error);
    return null;
  }
};

// Generate random point within radius
const generateRandomPointWithinRadius = (centerLat, centerLon, radiusKm) => {
  try {
    const radiusInRadians = radiusKm / EARTH_RADIUS;
    
    const u = Math.random();
    const v = Math.random();
    
    const w = radiusInRadians * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const deltaLat = w * Math.cos(t);
    const deltaLon = w * Math.sin(t) / Math.cos(toRadians(centerLat));
    
    const newLat = centerLat + deltaLat * 180 / Math.PI;
    const newLon = centerLon + deltaLon * 180 / Math.PI;
    
    return { latitude: newLat, longitude: newLon };
  } catch (error) {
    logger.error('Error generating random point:', error);
    throw new Error('Failed to generate random point');
  }
};

module.exports = {
  calculateDistance,
  calculateDistanceInMeters,
  calculateBearing,
  calculateMidpoint,
  isWithinRadius,
  findPointsWithinRadius,
  sortByDistance,
  findNearestPoints,
  calculateETA,
  formatDistance,
  formatCoordinates,
  isValidCoordinates,
  parseCoordinates,
  generateRandomPointWithinRadius
};