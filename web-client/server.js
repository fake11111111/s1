const express = require('express');
const path = require('path');
const http = require('http');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web client running on port ${PORT}`);
});