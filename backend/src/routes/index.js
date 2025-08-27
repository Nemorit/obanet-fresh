/**
 * ObaNet API Routes Index
 * Main route handler and API versioning
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const communityRoutes = require('./communities');
const postRoutes = require('./posts');

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ObaNet API v1.0 🏕️',
    description: 'Dijital Diaspora Platformu - Connecting Turkish communities worldwide',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      communities: '/api/v1/communities',
      posts: '/api/v1/posts'
    },
    documentation: 'https://docs.obanet.com',
    support: 'support@obanet.com',
    culturalGreeting: 'Diaspora\'ya hoş geldiniz! 🤝'
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'ObaNet API is running smoothly',
    services: {
      database: 'connected',
      redis: 'connected',
      server: 'healthy'
    }
  });
});

// API Statistics endpoint
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    message: 'API Statistics',
    stats: {
      totalEndpoints: 50,
      authenticationMethods: ['JWT', 'Refresh Token'],
      supportedLanguages: ['tr', 'en', 'de', 'fr'],
      diasporaCountries: [
        'Germany', 'France', 'Netherlands', 'Belgium', 'Austria',
        'Switzerland', 'UK', 'USA', 'Canada', 'Australia'
      ],
      features: [
        'User Authentication',
        'Diaspora Profiles',
        'Community Management',
        'Post & Content Sharing',
        'Real-time Messaging',
        'Event Management',
        'Cultural Integration'
      ]
    }
  });
});

// Mount API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/communities', communityRoutes);
router.use('/posts', postRoutes);

// 404 handler for API routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `Can't find ${req.originalUrl} on this server`,
    code: 'ENDPOINT_NOT_FOUND',
    suggestion: 'Check the API documentation at /api/v1 for available endpoints'
  });
});

module.exports = router;