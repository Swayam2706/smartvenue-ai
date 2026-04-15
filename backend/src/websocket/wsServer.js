const WebSocket = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  // Cloud Run closes idle connections after 60s — send ping every 30s
  const pingInterval = setInterval(() => {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`🔌 WebSocket client connected. Total: ${clients.size}`);

    // Send current state immediately on connect
    const { getCurrentState } = require('../simulation/crowdSimulator');
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      data: getCurrentState(),
      timestamp: new Date().toISOString()
    }));

    // Respond to pings from client
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        handleClientMessage(ws, msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`🔌 WebSocket client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });
  });

  console.log('🔌 WebSocket server initialized');
}
function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      break;
    case 'SUBSCRIBE_ZONE':
      // Could implement zone-specific subscriptions
      ws.send(JSON.stringify({ type: 'SUBSCRIBED', zoneId: msg.zoneId }));
      break;
    default:
      break;
  }
}

function broadcast(data) {
  if (!wss) return;
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastAlert(alert) {
  broadcast({ type: 'ALERT', data: alert, timestamp: new Date().toISOString() });
}

module.exports = { initWebSocket, broadcast, broadcastAlert };
