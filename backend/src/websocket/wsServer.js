/**
 * WebSocket Server Module
 * Provides real-time bidirectional communication for crowd data updates
 * 
 * Features:
 * - Real-time crowd data broadcasting
 * - Alert notifications
 * - Connection keep-alive for Cloud Run
 * - Firebase integration for persistence
 * - Client subscription management
 * 
 * @module websocket/wsServer
 */

const WebSocket = require('ws');
const { storeCrowdData, storeAlert, logAnalyticsEvent } = require('../services/firebaseService');
const logger = require('../utils/logger');

let wss = null;
const clients = new Set();
const subscriptions = new Map(); // Track client subscriptions

/**
 * Initialize WebSocket server
 * Sets up connection handling, keep-alive, and message routing
 * 
 * @param {http.Server} server - HTTP server instance
 * @returns {void}
 * 
 * @cloudrun
 * Cloud Run closes idle connections after 60s
 * Ping interval set to 30s to maintain connections
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  // Keep-alive ping for Cloud Run (closes idle connections after 60s)
  const pingInterval = setInterval(() => {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else if (ws.readyState === WebSocket.CLOSED) {
        clients.delete(ws);
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
    logger.info('WebSocket server closed');
  });

  wss.on('connection', (ws, req) => {
    handleNewConnection(ws, req);
  });

  logger.info('WebSocket server initialized on /ws');
}

/**
 * Handle new WebSocket connection
 * Sends initial state and sets up event handlers
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 * @returns {void}
 * 
 * @security
 * - IP logging for security monitoring
 * - Message validation
 * - Error handling
 */
function handleNewConnection(ws, req) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  clients.add(ws);
  ws.isAlive = true;
  ws.clientId = generateClientId();
  
  logger.info('WebSocket client connected', { 
    clientId: ws.clientId,
    ip: clientIp,
    total: clients.size 
  });

  // Send initial state immediately
  const { getCurrentState } = require('../simulation/crowdSimulator');
  const initialState = getCurrentState();
  
  sendToClient(ws, {
    type: 'INITIAL_STATE',
    data: initialState,
    timestamp: new Date().toISOString(),
    clientId: ws.clientId
  });

  // Log analytics event
  logAnalyticsEvent('websocket_connected', {
    clientId: ws.clientId,
    totalClients: clients.size
  });

  // Handle pong responses (keep-alive)
  ws.on('pong', () => { 
    ws.isAlive = true; 
  });

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      handleClientMessage(ws, msg);
    } catch (error) {
      logger.warn('Invalid WebSocket message', { 
        clientId: ws.clientId,
        error: error.message 
      });
      sendToClient(ws, { 
        type: 'ERROR', 
        message: 'Invalid message format' 
      });
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    clients.delete(ws);
    subscriptions.delete(ws.clientId);
    
    logger.info('WebSocket client disconnected', { 
      clientId: ws.clientId,
      total: clients.size 
    });

    logAnalyticsEvent('websocket_disconnected', {
      clientId: ws.clientId,
      totalClients: clients.size
    });
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error('WebSocket error', { 
      clientId: ws.clientId,
      error: error.message 
    });
    clients.delete(ws);
    subscriptions.delete(ws.clientId);
  });
}

/**
 * Handle messages from client
 * Routes messages to appropriate handlers
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} msg - Parsed message object
 * @returns {void}
 * 
 * @messages
 * - PING: Keep-alive check
 * - SUBSCRIBE_ZONE: Subscribe to specific zone updates
 * - UNSUBSCRIBE_ZONE: Unsubscribe from zone updates
 * - GET_STATE: Request current state
 */
function handleClientMessage(ws, msg) {
  logger.debug('WebSocket message received', { 
    clientId: ws.clientId,
    type: msg.type 
  });

  switch (msg.type) {
    case 'PING':
      sendToClient(ws, { 
        type: 'PONG', 
        timestamp: new Date().toISOString() 
      });
      break;

    case 'SUBSCRIBE_ZONE':
      if (msg.zoneId) {
        if (!subscriptions.has(ws.clientId)) {
          subscriptions.set(ws.clientId, new Set());
        }
        subscriptions.get(ws.clientId).add(msg.zoneId);
        
        sendToClient(ws, { 
          type: 'SUBSCRIBED', 
          zoneId: msg.zoneId 
        });
        
        logger.info('Client subscribed to zone', { 
          clientId: ws.clientId,
          zoneId: msg.zoneId 
        });
      }
      break;

    case 'UNSUBSCRIBE_ZONE':
      if (msg.zoneId && subscriptions.has(ws.clientId)) {
        subscriptions.get(ws.clientId).delete(msg.zoneId);
        
        sendToClient(ws, { 
          type: 'UNSUBSCRIBED', 
          zoneId: msg.zoneId 
        });
      }
      break;

    case 'GET_STATE':
      const { getCurrentState } = require('../simulation/crowdSimulator');
      sendToClient(ws, {
        type: 'STATE_UPDATE',
        data: getCurrentState(),
        timestamp: new Date().toISOString()
      });
      break;

    default:
      logger.warn('Unknown message type', { 
        clientId: ws.clientId,
        type: msg.type 
      });
      break;
  }
}

/**
 * Send message to specific client
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Data to send
 * @returns {boolean} Success status
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Failed to send to client', { error: error.message });
      return false;
    }
  }
  return false;
}

/**
 * Broadcast message to all connected clients
 * Also stores data in Firebase for persistence
 * 
 * @param {Object} data - Data to broadcast
 * @returns {number} Number of clients reached
 * 
 * @firebase Stores crowd data in Firebase Realtime Database
 * @performance O(n) where n is number of connected clients
 */
async function broadcast(data) {
  if (!wss) {
    logger.warn('WebSocket server not initialized');
    return 0;
  }

  const message = JSON.stringify(data);
  let successCount = 0;

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        logger.error('Broadcast error', { 
          clientId: client.clientId,
          error: error.message 
        });
      }
    }
  });

  // Store in Firebase for persistence and real-time sync
  if (data.type === 'CROWD_UPDATE' && data.data) {
    try {
      await storeCrowdData(data.data);
    } catch (error) {
      logger.error('Failed to store crowd data in Firebase', { 
        error: error.message 
      });
    }
  }

  logger.debug('Broadcast complete', { 
    type: data.type,
    clients: successCount 
  });

  return successCount;
}

/**
 * Broadcast alert to all clients
 * Stores alert in Firebase and sends push notifications
 * 
 * @param {Object} alert - Alert object
 * @returns {Promise<number>} Number of clients reached
 * 
 * @firebase
 * - Stores alert in Firebase
 * - Triggers push notifications for critical alerts
 */
async function broadcastAlert(alert) {
  const data = { 
    type: 'ALERT', 
    data: alert, 
    timestamp: new Date().toISOString() 
  };

  // Store alert in Firebase
  try {
    const alertId = await storeAlert(alert);
    data.data.id = alertId;
    
    logger.info('Alert stored in Firebase', { 
      alertId,
      type: alert.type 
    });
  } catch (error) {
    logger.error('Failed to store alert in Firebase', { 
      error: error.message 
    });
  }

  // Broadcast to all clients
  const clientsReached = await broadcast(data);

  // Log analytics
  await logAnalyticsEvent('alert_broadcast', {
    alertType: alert.type,
    severity: alert.severity,
    clientsReached
  });

  return clientsReached;
}

/**
 * Generate unique client ID
 * 
 * @returns {string} Unique client identifier
 */
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current connection statistics
 * 
 * @returns {Object} Connection statistics
 */
function getStats() {
  return {
    totalClients: clients.size,
    subscriptions: subscriptions.size,
    timestamp: new Date().toISOString()
  };
}

module.exports = { 
  initWebSocket, 
  broadcast, 
  broadcastAlert,
  getStats
};
