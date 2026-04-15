/**
 * @fileoverview Crowd Service - Business logic layer for crowd data management
 * @module services/crowdService
 * @description Separates route handlers from data processing, providing clean API for crowd operations
 * @requires ../simulation/crowdSimulator
 */

const { getCurrentState, getZones } = require('../simulation/crowdSimulator');

/**
 * CrowdService class - Manages crowd data operations
 * @class
 */
class CrowdService {
  /**
   * Retrieves all zones with current crowd state
   * 
   * @returns {Array<Object>} Array of zone objects with complete crowd data
   * 
   * @example
   * [
   *   {
   *     id: "north-stand",
   *     name: "North Stand",
   *     capacity: 8000,
   *     current: 0.75,
   *     count: 6000,
   *     riskLevel: "high",
   *     waitTime: 12,
   *     predictions: [0.76, 0.78, 0.80, 0.82, 0.84],
   *     x: 50,
   *     y: 10
   *   }
   * ]
   */
  getAllZones() {
    const state = getCurrentState();
    return Object.values(state);
  }

  /**
   * Retrieves a single zone by its identifier
   * 
   * @param {string} id - Zone identifier (e.g., "north-stand", "gate-a")
   * @returns {Object|null} Zone object with crowd data, or null if not found
   * 
   * @example
   * {
   *   id: "north-stand",
   *   name: "North Stand",
   *   capacity: 8000,
   *   current: 0.75,
   *   count: 6000,
   *   riskLevel: "high",
   *   waitTime: 12,
   *   predictions: [0.76, 0.78, 0.80, 0.82, 0.84]
   * }
   */
  getZoneById(id) {
    const state = getCurrentState();
    return state[id] || null;
  }

  /**
   * Retrieves lightweight heatmap data optimized for map visualization
   * Only includes essential fields needed for rendering
   * 
   * @returns {Array<Object>} Array of zone objects with minimal data for heatmap
   * 
   * @example
   * [
   *   {
   *     id: "north-stand",
   *     name: "North Stand",
   *     x: 50,
   *     y: 10,
   *     density: 0.75,
   *     riskLevel: "high",
   *     count: 6000,
   *     capacity: 8000
   *   }
   * ]
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
   * Calculates venue-wide summary statistics
   * Aggregates data across all zones for dashboard overview
   * 
   * @returns {Object} Summary statistics object
   * 
   * @example
   * {
   *   totalCount: 25000,
   *   totalCapacity: 32000,
   *   occupancyRate: "78.1",
   *   avgDensity: "0.781",
   *   criticalZones: 2,
   *   highRiskZones: 5,
   *   safeZones: 13,
   *   avgWaitTime: 8
   * }
   */
  getSummary() {
    const zones = this.getAllZones();
    const totalCount    = zones.reduce((s, z) => s + (z.count || 0), 0);
    const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
    const avgDensity    = zones.reduce((s, z) => s + z.current, 0) / zones.length;

    return {
      totalCount,
      totalCapacity,
      occupancyRate:  parseFloat((totalCount / totalCapacity * 100).toFixed(1)),
      avgDensity:     parseFloat(avgDensity.toFixed(3)),
      criticalZones:  zones.filter(z => z.riskLevel === 'critical').length,
      highRiskZones:  zones.filter(z => z.riskLevel === 'high').length,
      safeZones:      zones.filter(z => z.riskLevel === 'low').length,
      avgWaitTime:    Math.floor(zones.reduce((s, z) => s + (z.waitTime || 0), 0) / zones.length),
    };
  }

  /**
   * Finds the least crowded zone of a specific type
   * Useful for recommendations (e.g., "Which gate has shortest wait?")
   * 
   * @param {string} type - Zone type identifier (e.g., "gate", "food", "restroom")
   * @returns {Object|null} Least crowded zone of specified type, or null if none found
   * 
   * @example
   * {
   *   id: "gate-b",
   *   name: "Gate B",
   *   current: 0.35,
   *   waitTime: 5,
   *   riskLevel: "low"
   * }
   */
  getLeastCrowdedByType(type) {
    const zones = this.getAllZones();
    return zones
      .filter(z => z.id?.includes(type))
      .sort((a, b) => a.current - b.current)[0] || null;
  }
}

module.exports = new CrowdService();
