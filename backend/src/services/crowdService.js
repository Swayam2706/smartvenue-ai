/**
 * CrowdService — business logic layer for crowd data
 * Separates route handlers from data processing
 */
const { getCurrentState, getZones } = require('../simulation/crowdSimulator');

class CrowdService {
  /**
   * Get all zones with current crowd state
   */
  getAllZones() {
    const state = getCurrentState();
    return Object.values(state);
  }

  /**
   * Get a single zone by ID
   */
  getZoneById(id) {
    const state = getCurrentState();
    return state[id] || null;
  }

  /**
   * Get heatmap data (lightweight — only what the map needs)
   */
  getHeatmapData() {
    const state = getCurrentState();
    return Object.values(state).map(z => ({
      id:        z.id,
      name:      z.name,
      x:         z.x,
      y:         z.y,
      density:   z.current,
      riskLevel: z.riskLevel,
      count:     z.count,
      capacity:  z.capacity,
    }));
  }

  /**
   * Get venue-wide summary statistics
   */
  getSummary() {
    const zones = this.getAllZones();
    const totalCount    = zones.reduce((s, z) => s + (z.count || 0), 0);
    const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
    const avgDensity    = zones.reduce((s, z) => s + z.current, 0) / zones.length;

    return {
      totalCount,
      totalCapacity,
      occupancyRate:  (totalCount / totalCapacity * 100).toFixed(1),
      avgDensity:     avgDensity.toFixed(3),
      criticalZones:  zones.filter(z => z.riskLevel === 'critical').length,
      highRiskZones:  zones.filter(z => z.riskLevel === 'high').length,
      safeZones:      zones.filter(z => z.riskLevel === 'low').length,
      avgWaitTime:    Math.floor(zones.reduce((s, z) => s + (z.waitTime || 0), 0) / zones.length),
    };
  }

  /**
   * Get zones sorted by congestion (for recommendations)
   */
  getLeastCrowdedByType(type) {
    const zones = this.getAllZones();
    return zones
      .filter(z => z.id?.includes(type))
      .sort((a, b) => a.current - b.current)[0] || null;
  }
}

module.exports = new CrowdService();
