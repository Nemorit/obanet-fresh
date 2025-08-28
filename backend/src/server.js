/**
 * ObaNet - Dijital Diaspora Platformu
 * Backend Server Entry Point
 * 
 * @author Fatih Bilgiç <fatih@antagrioin.com>
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import configurations and middleware
const config = require('./config/config');
const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const apiRoutes = require('./routes/index');

const app = express();
const server = createServer(app);

// Socket.IO setup for real-time features
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'ObaNet Backend is running! 🏕️',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/v1', apiRoutes);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join diaspora room based on user location
  socket.on('join-diaspora', (diasporaData) => {
    const roomName = `diaspora-${diasporaData.country}`;
    socket.join(roomName);
    socket.emit('joined-diaspora', { room: roomName, message: 'Diaspora odasına katıldınız! 🤝' });
  });

  // Handle real-time messaging
  socket.on('send-message', (messageData) => {
    io.to(messageData.room).emit('new-message', messageData);
  });

  // Handle community activities
  socket.on('community-activity', (activityData) => {
    socket.to(`community-${activityData.communityId}`).emit('activity-update', activityData);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist',
    code: 'NOT_FOUND'
  });
});

app.use(errorHandler);

// Database connections
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('📊 MongoDB connected successfully');

    // Connect to Redis
    try {
      await connectRedis();
      console.log('🚀 Redis connected successfully');
    } catch (error) {
      console.warn('⚠️  Redis connection failed, running without cache:', error.message);
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log('\n🏕️  =====================================');
      console.log('🇹🇷  ObaNet Dijital Diaspora Platformu');
      console.log('🏕️  =====================================');
      console.log(`🚀  Server running on port ${PORT}`);
      console.log(`🌍  Environment: ${process.env.NODE_ENV}`);
      console.log(`📡  API Base: ${process.env.NODE_ENV === 'production' ? 'https://obanet-api.netlify.app' : `http://localhost:${PORT}`}/api/v1`);
      console.log(`💻  Health Check: ${process.env.NODE_ENV === 'production' ? 'https://obanet-api.netlify.app' : `http://localhost:${PORT}`}/health`);
      console.log('🏕️  =====================================\n');
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };