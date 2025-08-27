/**
 * ObaNet Configuration Settings
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1'
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/obanet',
      testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/obanet_test',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    algorithm: 'HS256'
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'text/plain', 'application/msword'],
      videos: ['video/mp4', 'video/mpeg', 'video/quicktime']
    }
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: {
      email: process.env.FROM_EMAIL || 'noreply@obanet.com',
      name: process.env.FROM_NAME || 'ObaNet'
    }
  },

  // Feature Flags
  features: {
    aiModeration: process.env.ENABLE_AI_MODERATION === 'true',
    notifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    realTimeMessaging: true,
    fileUploads: true
  },

  // Diaspora Specific Configuration
  diaspora: {
    supportedCountries: [
      'Germany', 'France', 'Netherlands', 'Belgium', 'Austria',
      'Switzerland', 'UK', 'USA', 'Canada', 'Australia',
      'Turkey', 'Northern Cyprus', 'Other'
    ],
    supportedLanguages: ['tr', 'en', 'de', 'fr'],
    defaultLanguage: 'tr',
    communityTypes: [
      'location', 'interest', 'professional', 'cultural', 'educational'
    ]
  },

  // Cache Configuration
  cache: {
    ttl: {
      short: 60 * 5, // 5 minutes
      medium: 60 * 60, // 1 hour
      long: 60 * 60 * 24, // 24 hours
      user: 60 * 30, // 30 minutes
      community: 60 * 60 * 2, // 2 hours
      posts: 60 * 15 // 15 minutes
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'development' ? 'dev' : 'combined',
    file: process.env.LOG_FILE || 'logs/obanet.log'
  }
};