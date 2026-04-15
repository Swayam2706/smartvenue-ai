require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initWebSocket } = require('./websocket/wsServer');
const { startSimulation } = require('./simulation/crowdSimulator');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize WebSocket server
initWebSocket(server);

// Start crowd simulation (updates every 4 seconds)
startSimulation();

server.listen(PORT, () => {
  console.log(`🚀 SmartVenue AI Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = server;
