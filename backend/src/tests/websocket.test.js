/**
 * WebSocket Server Tests
 * Tests for WebSocket functionality (mocked)
 */

// Mock ws library
const mockWs = {
  on: jest.fn(),
  send: jest.fn(),
  readyState: 1, // OPEN
  OPEN: 1,
  CLOSED: 3
};

jest.mock('ws', () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          // Simulate connection
          setTimeout(() => handler(mockWs), 0);
        }
      }),
      clients: new Set([mockWs])
    }))
  };
});

jest.mock('../config/firebaseAdmin', () => ({
  pushCrowdToFirebase: jest.fn(),
  pushAlertToFirebase: jest.fn()
}));

describe('WebSocket Server', () => {
  let wsServer;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to get fresh instance
    jest.resetModules();
    wsServer = require('../websocket/wsServer');
  });

  it('exports required functions', () => {
    expect(typeof wsServer.initWebSocket).toBe('function');
    expect(typeof wsServer.broadcast).toBe('function');
    expect(typeof wsServer.broadcastAlert).toBe('function');
  });

  it('broadcast does not throw', () => {
    expect(() => wsServer.broadcast({ type: 'TEST', data: 'test' })).not.toThrow();
  });

  it('broadcastAlert does not throw', () => {
    expect(() => wsServer.broadcastAlert({ id: 1, type: 'warning', message: 'Test' })).not.toThrow();
  });

  it('handles broadcast with no clients', () => {
    expect(() => wsServer.broadcast({ type: 'TEST' })).not.toThrow();
  });

  it('handles null message in broadcast', () => {
    expect(() => wsServer.broadcast(null)).not.toThrow();
  });

  it('handles undefined message in broadcast', () => {
    expect(() => wsServer.broadcast(undefined)).not.toThrow();
  });

  it('handles empty object in broadcast', () => {
    expect(() => wsServer.broadcast({})).not.toThrow();
  });

  it('handles large message in broadcast', () => {
    const largeMessage = {
      type: 'TEST',
      data: 'x'.repeat(10000)
    };
    expect(() => wsServer.broadcast(largeMessage)).not.toThrow();
  });

  it('broadcastAlert handles all alert types', () => {
    const types = ['info', 'warning', 'critical', 'evacuation'];
    types.forEach(type => {
      expect(() => wsServer.broadcastAlert({
        id: 1,
        type,
        title: 'Test',
        message: 'Test message'
      })).not.toThrow();
    });
  });

  it('broadcast handles special characters', () => {
    expect(() => wsServer.broadcast({
      type: 'TEST',
      data: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    })).not.toThrow();
  });

  it('broadcast handles unicode', () => {
    expect(() => wsServer.broadcast({
      type: 'TEST',
      data: '你好 مرحبا שלום 🎉'
    })).not.toThrow();
  });
});

describe('WebSocket Message Types', () => {
  const wsServer = require('../websocket/wsServer');

  it('handles CROWD_UPDATE message', () => {
    expect(() => wsServer.broadcast({
      type: 'CROWD_UPDATE',
      data: { 'gate-a': { current: 0.5 } }
    })).not.toThrow();
  });

  it('handles ALERT message', () => {
    expect(() => wsServer.broadcast({
      type: 'ALERT',
      data: { id: 1, type: 'warning' }
    })).not.toThrow();
  });

  it('handles NAVIGATION message', () => {
    expect(() => wsServer.broadcast({
      type: 'NAVIGATION',
      data: { route: ['gate-a', 'north-stand'] }
    })).not.toThrow();
  });

  it('handles custom message types', () => {
    expect(() => wsServer.broadcast({
      type: 'CUSTOM_TYPE',
      data: { custom: 'data' }
    })).not.toThrow();
  });
});
