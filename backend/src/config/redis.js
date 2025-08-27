/**
 * ObaNet Redis Configuration
 * Cache and Session Management
 */

const { createClient } = require('redis');
const config = require('./config');

let redisClient = null;

const connectRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      return redisClient;
    }

    const redisConfig = {
      socket: {
        host: config.database.redis.host,
        port: config.database.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Redis max retries exceeded');
          return Math.min(retries * 50, 1000);
        }
      },
      database: config.database.redis.db
    };

    if (config.database.redis.password) {
      redisConfig.password = config.database.redis.password;
    }

    redisClient = createClient(redisConfig);

    // Error handling
    redisClient.on('error', (err) => {
      console.error('🔴 Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔴 Redis connected');
    });

    redisClient.on('ready', () => {
      console.log('🔴 Redis ready for commands');
    });

    redisClient.on('end', () => {
      console.warn('🔴 Redis connection closed');
    });

    await redisClient.connect();
    return redisClient;

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    redisClient = null;
    throw error;
  }
};

// Redis utility functions
const redisUtils = {
  // Get data from Redis
  async get(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        console.warn('Redis not available for GET operation');
        return null;
      }
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  // Set data in Redis with TTL
  async set(key, value, ttl = config.cache.ttl.medium) {
    try {
      if (!redisClient || !redisClient.isReady) {
        console.warn('Redis not available for SET operation');
        return false;
      }
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  // Delete data from Redis
  async del(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        console.warn('Redis not available for DEL operation');
        return false;
      }
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      if (!redisClient || !redisClient.isReady) return false;
      return await redisClient.exists(key) === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Increment counter
  async incr(key, ttl = config.cache.ttl.short) {
    try {
      if (!redisClient || !redisClient.isReady) return 1;
      const result = await redisClient.incr(key);
      if (result === 1) {
        await redisClient.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 1;
    }
  },

  // Cache diaspora data
  async cacheDiasporaData(userId, diasporaInfo) {
    const key = `diaspora:${userId}`;
    return await this.set(key, diasporaInfo, config.cache.ttl.user);
  },

  // Get cached diaspora data
  async getDiasporaData(userId) {
    const key = `diaspora:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Cache community data
  async cacheCommunity(communityId, communityData) {
    const key = `community:${communityId}`;
    return await this.set(key, communityData, config.cache.ttl.community);
  },

  // Get cached community data
  async getCommunity(communityId) {
    const key = `community:${communityId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }
};

// Close Redis connection
const closeRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('🔴 Redis connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};

module.exports = connectRedis;
module.exports.redisClient = () => redisClient;
module.exports.redisUtils = redisUtils;
module.exports.closeRedis = closeRedis;