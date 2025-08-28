/**
 * Netlify Serverless Function for ObaNet API
 * Wraps the Express.js backend for serverless deployment
 */

const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import configurations and middleware
const config = require('../../backend/src/config/config');
const { errorHandler, notFound } = require('../../backend/src/middleware/errorHandler');

// Import routes
const apiRoutes = require('../../backend/src/routes/index');

const app = express();

// Connect to MongoDB (with connection caching for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://your-mongo-connection-string', {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    
    cachedDb = connection;
    console.log('📊 MongoDB connected (serverless)');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Let Netlify handle CSP
}));

// Rate limiting (lighter for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
app.use(cors({
  origin: [
    'https://obanet.netlify.app',
    'https://obanet.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'ObaNet API is running on Netlify! 🏕️',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: 'serverless'
  });
});

// Connect to database before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({
      success: false,
      error: 'Database service unavailable',
      code: 'DB_CONNECTION_ERROR'
    });
  }
});

// API routes
app.use('/api/v1', apiRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Export the serverless function
const handler = serverless(app, {
  binary: ['image/*', 'application/octet-stream']
});

module.exports.handler = async (event, context) => {
  // Set context to not wait for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'SERVERLESS_ERROR'
      })
    };
  }
};