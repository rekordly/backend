// Driver Metrics DTO
class DriverMetricsDTO {
  constructor(driver, todayStats, weeklyStats, monthlyStats) {
    this.driverId = driver.id;
    this.userId = driver.userId;
    this.fullName = driver.user.fullName;
    
    // Current stats
    this.currentStats = {
      status: driver.status,
      isAvailable: driver.isAvailable,
      todaysEarnings: driver.todaysEarnings,
      totalEarnings: driver.totalEarnings,
      completedCount: driver.completedCount,
      rating: driver.rating,
      totalRatings: driver.totalRatings
    };
    
    // Today's stats
    this.todayStats = {
      totalDeliveries: todayStats.totalDeliveries || 0,
      totalEarnings: todayStats.totalEarnings || 0,
      averageRating: todayStats.averageRating || 0,
      totalDistance: todayStats.totalDistance || 0,
      totalTime: todayStats.totalTime || 0,
      averageDeliveryTime: todayStats.averageDeliveryTime || 0,
      cancellationRate: todayStats.cancellationRate || 0
    };
    
    // Weekly stats
    this.weeklyStats = {
      totalDeliveries: weeklyStats.totalDeliveries || 0,
      totalEarnings: weeklyStats.totalEarnings || 0,
      averageRating: weeklyStats.averageRating || 0,
      totalDistance: weeklyStats.totalDistance || 0,
      totalTime: weeklyStats.totalTime || 0,
      bestDay: weeklyStats.bestDay || null,
      worstDay: weeklyStats.worstDay || null
    };
    
    // Monthly stats
    this.monthlyStats = {
      totalDeliveries: monthlyStats.totalDeliveries || 0,
      totalEarnings: monthlyStats.totalEarnings || 0,
      averageRating: monthlyStats.averageRating || 0,
      totalDistance: monthlyStats.totalDistance || 0,
      totalTime: monthlyStats.totalTime || 0,
      bestWeek: monthlyStats.bestWeek || null,
      growthRate: monthlyStats.growthRate || 0
    };
    
    // Performance indicators
    this.performance = {
      efficiency: this.calculateEfficiency(todayStats),
      reliability: this.calculateReliability(todayStats),
      consistency: this.calculateConsistency(weeklyStats, monthlyStats),
      overallScore: this.calculateOverallScore(driver, todayStats)
    };
  }
  
  calculateEfficiency(todayStats) {
    if (!todayStats.totalDeliveries || !todayStats.totalTime) return 0;
    const avgTimePerDelivery = todayStats.totalTime / todayStats.totalDeliveries;
    // Lower time is better, max score 100
    return Math.max(0, Math.min(100, 100 - (avgTimePerDelivery / 60) * 2)); // 2 points per minute over ideal
  }
  
  calculateReliability(todayStats) {
    if (!todayStats.totalDeliveries) return 0;
    const cancellationRate = todayStats.cancellationRate || 0;
    return Math.max(0, 100 - cancellationRate * 100);
  }
  
  calculateConsistency(weeklyStats, monthlyStats) {
    if (!weeklyStats.totalDeliveries || !monthlyStats.totalDeliveries) return 0;
    const weeklyAvg = weeklyStats.totalDeliveries / 7;
    const monthlyAvg = monthlyStats.totalDeliveries / 30;
    const variance = Math.abs(weeklyAvg - monthlyAvg) / ((weeklyAvg + monthlyAvg) / 2);
    return Math.max(0, 100 - variance * 100);
  }
  
  calculateOverallScore(driver, todayStats) {
    const ratingScore = driver.rating * 20; // Max 100
    const efficiencyScore = this.calculateEfficiency(todayStats);
    const reliabilityScore = this.calculateReliability(todayStats);
    
    return Math.round((ratingScore + efficiencyScore + reliabilityScore) / 3);
  }
}

// Driver Earnings DTO
class DriverEarningsDTO {
  constructor(earningsData) {
    this.totalEarnings = earningsData.totalEarnings || 0;
    this.todaysEarnings = earningsData.todaysEarnings || 0;
    this.weeklyEarnings = earningsData.weeklyEarnings || 0;
    this.monthlyEarnings = earningsData.monthlyEarnings || 0;
    
    this.earningsBreakdown = {
      byDay: earningsData.byDay || [],
      byWeek: earningsData.byWeek || [],
      byMonth: earningsData.byMonth || []
    };
    
    this.earningsTrend = {
      dailyGrowth: earningsData.dailyGrowth || 0,
      weeklyGrowth: earningsData.weeklyGrowth || 0,
      monthlyGrowth: earningsData.monthlyGrowth || 0
    };
    
    this.performanceMetrics = {
      averageEarningsPerDelivery: earningsData.averageEarningsPerDelivery || 0,
      averageEarningsPerHour: earningsData.averageEarningsPerHour || 0,
      bestEarningDay: earningsData.bestEarningDay || null,
      bestEarningWeek: earningsData.bestEarningWeek || null
    };
  }
}

// Driver Performance DTO
class DriverPerformanceDTO {
  constructor(driver, performanceData) {
    this.driverId = driver.id;
    this.fullName = driver.user.fullName;
    
    this.rating = {
      current: driver.rating,
      totalRatings: driver.totalRatings,
      breakdown: performanceData.ratingBreakdown || {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0
      }
    };
    
    this.reliability = {
      completionRate: performanceData.completionRate || 0,
      cancellationRate: performanceData.cancellationRate || 0,
      onTimeRate: performanceData.onTimeRate || 0,
      acceptanceRate: performanceData.acceptanceRate || 0
    };
    
    this.efficiency = {
      averageDeliveryTime: performanceData.averageDeliveryTime || 0,
      averageDistancePerDelivery: performanceData.averageDistancePerDelivery || 0,
      earningsPerHour: performanceData.earningsPerHour || 0,
      earningsPerKilometer: performanceData.earningsPerKilometer || 0
    };
    
    this.customerSatisfaction = {
      positiveFeedback: performanceData.positiveFeedback || 0,
      negativeFeedback: performanceData.negativeFeedback || 0,
      complaints: performanceData.complaints || 0,
      compliments: performanceData.compliments || 0
    };
    
    this.overallScore = this.calculateOverallScore(performanceData);
  }
  
  calculateOverallScore(performanceData) {
    const ratingScore = (performanceData.ratingBreakdown?.fiveStar / performanceData.ratingBreakdown?.totalRatings || 0) * 100;
    const reliabilityScore = performanceData.completionRate || 0;
    const efficiencyScore = Math.min(100, (performanceData.earningsPerHour / 50) * 100); // Assuming $50/hour is excellent
    const satisfactionScore = performanceData.positiveFeedback / (performanceData.positiveFeedback + performanceData.negativeFeedback) * 100 || 0;
    
    return Math.round((ratingScore + reliabilityScore + efficiencyScore + satisfactionScore) / 4);
  }
}

module.exports = {
  DriverMetricsDTO,
  DriverEarningsDTO,
  DriverPerformanceDTO
};