const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');

// Import socket controller
const socketController = require('./controllers/socketController');

// Import database config
const connectDB = require('./config/db');

// Configure environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Create Socket.IO server with CORS enabled
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('API Running');
});

// Initialize Socket.IO
socketController(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

// Define port (default to 8000)
const PORT = process.env.PORT || 8000;

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
