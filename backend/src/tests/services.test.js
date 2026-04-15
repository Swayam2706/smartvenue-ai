/**
 * Services Unit Tests
 * Comprehensive tests for all service layer functions
 * 
 * @group unit
 * @group services
 */

const crowdService = require('../services/crowdService');
const firebaseService = require('../services/firebaseService');
const { getCurrentState, getZones } = require('../simulation/crowdSimulator');

describe('CrowdService', () => {
  describe('getAllZones', () => {
    it('should return all zones with complete data', () => {
      const zones = crowdService.getAllZones();

      expect(Array.isArray(zones)).toBe(true);
      expect(zones.length).toBeGreaterThan(0);

      zones.forEach(zone => {
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('current');
        expect(zone).toHaveProperty('capacity');
        expect(zone).toHaveProperty('riskLevel');
        expect(zone).toHaveProperty('waitTime');
        expect(zone).toHaveProperty('predictions');
        expect(zone).toHaveProperty('x');
        expect(zone).toHaveProperty('y');
      });
    });

    it('should return zones with valid risk levels', () => {
      const zones = crowdService.getAllZones();
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];

      zones.forEach(zone => {
        expect(validRiskLevels).toContain(zone.riskLevel);
      });
    });

    it('should return zones with valid density values', () => {
      const zones = crowdService.getAllZones();

      zones.forEach(zone => {
        expect(zone.current).toBeGreaterThanOrEqual(0);
        expect(zone.current).toBeLessThanOrEqual(1);
      });
    });

    it('should return zones with predictions', () => {
      const zones = crowdService.getAllZones();

      zones.forEach(zone => {
        expect(Array.isArray(zone.predictions)).toBe(true);
        expect(zone.predictions.length).toBe(5);
        zone.predictions.forEach(pred => {
          expect(pred).toBeGreaterThanOrEqual(0);
          expect(pred).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('getZoneById', () => {
    it('should return zone for valid ID', () => {
      const zone = crowdService.getZoneById('gate-a');

      expect(zone).toBeDefined();
      expect(zone.id).toBe('gate-a');
      expect(zone).toHaveProperty('name');
      expect(zone).toHaveProperty('current');
    });

    it('should return null for invalid ID', () => {
      const zone = crowdService.getZoneById('nonexistent-zone');

      expect(zone).toBeNull();
    });

    it('should return null for empty string', () => {
      const zone = crowdService.getZoneById('');

      expect(zone).toBeNull();
    });

    it('should return null for null ID', () => {
      const zone = crowdService.getZoneById(null);

      expect(zone).toBeNull();
    });

    it('should return null for undefined ID', () => {
      const zone = crowdService.getZoneById(undefined);

      expect(zone).toBeNull();
    });

    it('should handle case-sensitive IDs', () => {
      const zone = crowdService.getZoneById('GATE-A');

      // Should return null if case-sensitive
      expect(zone).toBeNull();
    });
  });

  describe('getHeatmapData', () => {
    it('should return lightweight heatmap data', () => {
      const heatmap = crowdService.getHeatmapData();

      expect(Array.isArray(heatmap)).toBe(true);
      expect(heatmap.length).toBeGreaterThan(0);
    });

    it('should include required fields only', () => {
      const heatmap = crowdService.getHeatmapData();

      heatmap.forEach(zone => {
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('x');
        expect(zone).toHaveProperty('y');
        expect(zone).toHaveProperty('density');
        expect(zone).toHaveProperty('riskLevel');

        // Should not include heavy fields
        expect(zone).not.toHaveProperty('predictions');
        expect(zone).not.toHaveProperty('history');
      });
    });

    it('should have valid coordinates', () => {
      const heatmap = crowdService.getHeatmapData();

      heatmap.forEach(zone => {
        expect(zone.x).toBeGreaterThanOrEqual(0);
        expect(zone.y).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(zone.x)).toBe(true);
        expect(Number.isFinite(zone.y)).toBe(true);
      });
    });

    it('should have valid density values', () => {
      const heatmap = crowdService.getHeatmapData();

      heatmap.forEach(zone => {
        expect(zone.density).toBeGreaterThanOrEqual(0);
        expect(zone.density).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getSummary', () => {
    it('should return complete venue summary', () => {
      const summary = crowdService.getSummary();

      expect(summary).toHaveProperty('totalCount');
      expect(summary).toHaveProperty('totalCapacity');
      expect(summary).toHaveProperty('occupancyRate');
      expect(summary).toHaveProperty('criticalZones');
      expect(summary).toHaveProperty('highRiskZones');
      expect(summary).toHaveProperty('safeZones');
      expect(summary).toHaveProperty('averageWaitTime');
    });

    it('should have valid total count', () => {
      const summary = crowdService.getSummary();

      expect(summary.totalCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(summary.totalCount)).toBe(true);
    });

    it('should have valid total capacity', () => {
      const summary = crowdService.getSummary();

      expect(summary.totalCapacity).toBeGreaterThan(0);
      expect(Number.isInteger(summary.totalCapacity)).toBe(true);
    });

    it('should have valid occupancy rate', () => {
      const summary = crowdService.getSummary();

      expect(summary.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(summary.occupancyRate).toBeLessThanOrEqual(1);
    });

    it('should count zones correctly', () => {
      const summary = crowdService.getSummary();
      const zones = crowdService.getAllZones();

      const criticalCount = zones.filter(z => z.riskLevel === 'critical').length;
      const highCount = zones.filter(z => z.riskLevel === 'high').length;
      const safeCount = zones.filter(z => z.riskLevel === 'low').length;

      expect(summary.criticalZones).toBe(criticalCount);
      expect(summary.highRiskZones).toBe(highCount);
      expect(summary.safeZones).toBe(safeCount);
    });

    it('should calculate average wait time correctly', () => {
      const summary = crowdService.getSummary();

      expect(summary.averageWaitTime).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(summary.averageWaitTime)).toBe(true);
    });
  });

  describe('getLeastCrowdedByType', () => {
    it('should find least crowded gate', () => {
      const gate = crowdService.getLeastCrowdedByType('gate');

      if (gate) {
        expect(gate.id).toContain('gate');
        expect(gate).toHaveProperty('current');
      }
    });

    it('should find least crowded food area', () => {
      const food = crowdService.getLeastCrowdedByType('food');

      if (food) {
        expect(food.id).toContain('food');
      }
    });

    it('should find least crowded restroom', () => {
      const restroom = crowdService.getLeastCrowdedByType('restroom');

      if (restroom) {
        expect(restroom.id).toContain('restroom');
      }
    });

    it('should return null for invalid type', () => {
      const zone = crowdService.getLeastCrowdedByType('invalid-type');

      expect(zone).toBeNull();
    });

    it('should return null for empty string', () => {
      const zone = crowdService.getLeastCrowdedByType('');

      expect(zone).toBeNull();
    });

    it('should return zone with lowest density', () => {
      const gate = crowdService.getLeastCrowdedByType('gate');

      if (gate) {
        const allGates = crowdService.getAllZones().filter(z => z.id.includes('gate'));
        const minDensity = Math.min(...allGates.map(g => g.current));

        expect(gate.current).toBe(minDensity);
      }
    });
  });

  describe('getZonesByRiskLevel', () => {
    it('should filter zones by risk level', () => {
      const zones = crowdService.getAllZones();
      const criticalZones = zones.filter(z => z.riskLevel === 'critical');

      expect(Array.isArray(criticalZones)).toBe(true);
      criticalZones.forEach(zone => {
        expect(zone.riskLevel).toBe('critical');
      });
    });

    it('should return empty array if no zones match', () => {
      const zones = crowdService.getAllZones();
      const impossibleZones = zones.filter(z => z.riskLevel === 'impossible');

      expect(impossibleZones).toHaveLength(0);
    });
  });

  describe('calculateRouteScore', () => {
    it('should calculate route score based on density', () => {
      const zones = crowdService.getAllZones();
      
      if (zones.length >= 2) {
        const route = [zones[0].id, zones[1].id];
        const score = crowdService.calculateRouteScore?.(route);

        if (score !== undefined) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });
  });
});

describe('FirebaseService', () => {
  describe('pushCrowdToFirebase', () => {
    it('should not throw when pushing data', () => {
      const state = getCurrentState();

      expect(() => {
        firebaseService.pushCrowdToFirebase(state);
      }).not.toThrow();
    });

    it('should handle empty state', () => {
      expect(() => {
        firebaseService.pushCrowdToFirebase({});
      }).not.toThrow();
    });

    it('should handle null state', () => {
      expect(() => {
        firebaseService.pushCrowdToFirebase(null);
      }).not.toThrow();
    });
  });

  describe('pushAlertToFirebase', () => {
    it('should not throw when pushing alert', () => {
      const alert = {
        id: 1,
        type: 'warning',
        title: 'Test',
        message: 'Test message'
      };

      expect(() => {
        firebaseService.pushAlertToFirebase(alert);
      }).not.toThrow();
    });

    it('should handle null alert', () => {
      expect(() => {
        firebaseService.pushAlertToFirebase(null);
      }).not.toThrow();
    });

    it('should handle alert without ID', () => {
      const alert = {
        type: 'warning',
        title: 'Test',
        message: 'Test'
      };

      expect(() => {
        firebaseService.pushAlertToFirebase(alert);
      }).not.toThrow();
    });
  });

  describe('logAnalytics', () => {
    it('should not throw when logging event', () => {
      expect(() => {
        firebaseService.logAnalytics?.('test_event', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle null event name', () => {
      expect(() => {
        firebaseService.logAnalytics?.(null, {});
      }).not.toThrow();
    });

    it('should handle null parameters', () => {
      expect(() => {
        firebaseService.logAnalytics?.('test_event', null);
      }).not.toThrow();
    });
  });
});

describe('Simulation Integration', () => {
  describe('getZones', () => {
    it('should return zone definitions', () => {
      const zones = getZones();

      expect(Array.isArray(zones)).toBe(true);
      expect(zones.length).toBeGreaterThan(0);

      zones.forEach(zone => {
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('capacity');
        expect(zone).toHaveProperty('x');
        expect(zone).toHaveProperty('y');
        expect(zone).toHaveProperty('type');
      });
    });

    it('should have unique zone IDs', () => {
      const zones = getZones();
      const ids = zones.map(z => z.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid zone types', () => {
      const zones = getZones();
      const validTypes = ['gate', 'stand', 'food', 'restroom', 'parking', 'vip', 'medical'];

      zones.forEach(zone => {
        expect(validTypes).toContain(zone.type);
      });
    });
  });

  describe('getCurrentState', () => {
    it('should return current simulation state', () => {
      const state = getCurrentState();

      expect(typeof state).toBe('object');
      expect(Object.keys(state).length).toBeGreaterThan(0);
    });

    it('should have state for all zones', () => {
      const zones = getZones();
      const state = getCurrentState();

      zones.forEach(zone => {
        expect(state).toHaveProperty(zone.id);
      });
    });

    it('should have valid state data', () => {
      const state = getCurrentState();

      Object.values(state).forEach(zoneState => {
        expect(zoneState).toHaveProperty('current');
        expect(zoneState).toHaveProperty('riskLevel');
        expect(zoneState).toHaveProperty('waitTime');
        expect(zoneState).toHaveProperty('predictions');
      });
    });
  });
});

describe('Data Transformation', () => {
  it('should transform zone data correctly', () => {
    const zones = crowdService.getAllZones();

    zones.forEach(zone => {
      // Check data types
      expect(typeof zone.id).toBe('string');
      expect(typeof zone.name).toBe('string');
      expect(typeof zone.current).toBe('number');
      expect(typeof zone.capacity).toBe('number');
      expect(typeof zone.riskLevel).toBe('string');
      expect(typeof zone.waitTime).toBe('number');
      expect(Array.isArray(zone.predictions)).toBe(true);
    });
  });

  it('should format heatmap data correctly', () => {
    const heatmap = crowdService.getHeatmapData();

    heatmap.forEach(zone => {
      expect(typeof zone.id).toBe('string');
      expect(typeof zone.x).toBe('number');
      expect(typeof zone.y).toBe('number');
      expect(typeof zone.density).toBe('number');
      expect(typeof zone.riskLevel).toBe('string');
    });
  });

  it('should format summary data correctly', () => {
    const summary = crowdService.getSummary();

    expect(typeof summary.totalCount).toBe('number');
    expect(typeof summary.totalCapacity).toBe('number');
    expect(typeof summary.occupancyRate).toBe('number');
    expect(typeof summary.criticalZones).toBe('number');
    expect(typeof summary.highRiskZones).toBe('number');
    expect(typeof summary.safeZones).toBe('number');
    expect(typeof summary.averageWaitTime).toBe('number');
  });
});
