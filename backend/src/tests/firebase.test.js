/**
 * Firebase Service Tests
 * Tests for Firebase integration (mocked)
 */

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  database: jest.fn(() => ({
    ref: jest.fn(() => ({
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue({ key: 'test-key' }),
      once: jest.fn().mockResolvedValue({
        val: () => ({ test: 'data' }),
        forEach: jest.fn()
      }),
      orderByChild: jest.fn().mockReturnThis(),
      limitToLast: jest.fn().mockReturnThis()
    }))
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
    getUser: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User'
    })
  })),
  messaging: jest.fn(() => ({
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0
    })
  })),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn()
  }
}));

jest.mock('../websocket/wsServer', () => ({ broadcast: jest.fn(), broadcastAlert: jest.fn() }));

describe('Firebase Service', () => {
  const firebaseService = require('../services/firebaseService');

  it('exports required functions', () => {
    expect(typeof firebaseService.initializeFirebase).toBe('function');
    expect(typeof firebaseService.logAnalyticsEvent).toBe('function');
    expect(typeof firebaseService.trackAnalyticsEvent).toBe('function');
    expect(typeof firebaseService.storeCrowdData).toBe('function');
    expect(typeof firebaseService.isFirebaseAvailable).toBe('function');
  });

  it('isFirebaseAvailable returns boolean', () => {
    const available = firebaseService.isFirebaseAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('logAnalyticsEvent does not throw', async () => {
    await expect(
      firebaseService.logAnalyticsEvent('test_event', { param: 'value' })
    ).resolves.not.toThrow();
  });

  it('trackAnalyticsEvent does not throw', async () => {
    await expect(
      firebaseService.trackAnalyticsEvent('test_event', { param: 'value' })
    ).resolves.not.toThrow();
  });

  it('storeCrowdData does not throw', async () => {
    await expect(
      firebaseService.storeCrowdData({ zone1: { density: 0.5 } })
    ).resolves.not.toThrow();
  });

  it('handles empty event parameters', async () => {
    await expect(
      firebaseService.logAnalyticsEvent('test_event')
    ).resolves.not.toThrow();
  });

  it('handles null event parameters', async () => {
    await expect(
      firebaseService.logAnalyticsEvent('test_event', null)
    ).resolves.not.toThrow();
  });
});

describe('Firebase Admin Config', () => {
  const { pushCrowdToFirebase, pushAlertToFirebase } = require('../config/firebaseAdmin');

  it('pushCrowdToFirebase does not throw', () => {
    expect(() => pushCrowdToFirebase({ 'gate-a': { current: 0.5 } })).not.toThrow();
  });

  it('pushAlertToFirebase does not throw', () => {
    expect(() => pushAlertToFirebase({ id: 1, type: 'warning', message: 'Test' })).not.toThrow();
  });

  it('handles empty crowd data', () => {
    expect(() => pushCrowdToFirebase({})).not.toThrow();
  });

  it('handles null alert', () => {
    expect(() => pushAlertToFirebase(null)).not.toThrow();
  });
});
