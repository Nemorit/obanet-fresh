/**
 * ObaNet Authentication Middleware
 * JWT Token Verification & User Authentication
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { redisUtils } = require('../config/redis');

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No valid token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm]
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please refresh your token',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Token is malformed or invalid',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }

    // Check if token is blacklisted (in Redis)
    const isBlacklisted = await redisUtils.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token revoked',
        message: 'This token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Get user from database (with caching)
    let user;
    const cachedUser = await redisUtils.getDiasporaData(decoded.userId);
    
    if (cachedUser) {
      user = cachedUser;
    } else {
      user = await User.findById(decoded.userId)
        .select('-password -emailVerificationToken -passwordResetToken')
        .lean();
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'Token is valid but user no longer exists',
          code: 'USER_NOT_FOUND'
        });
      }

      // Cache user data
      await redisUtils.cacheDiasporaData(user._id, user);
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended',
        message: `Your account is ${user.status}`,
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Add user to request object
    req.user = {
      ...user,
      _id: user._id.toString() // Ensure _id is string
    };
    
    // Update last active time (async, don't wait)
    User.findByIdAndUpdate(user._id, { 
      lastActive: new Date() 
    }).catch(() => {}); // Ignore errors for this non-critical update

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication service temporarily unavailable',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Optional authentication (allows both authenticated and guest users)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue as guest
    req.user = null;
    return next();
  }

  // Token provided, attempt authentication
  authenticate(req, res, (err) => {
    if (err) {
      // Authentication failed, but continue as guest
      req.user = null;
    }
    next();
  });
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Requires one of: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Diaspora verification middleware
const verifyDiaspora = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user has completed diaspora profile
  if (!req.user.diasporaProfile || 
      !req.user.diasporaProfile.currentCountry || 
      !req.user.diasporaProfile.originCity) {
    return res.status(403).json({
      success: false,
      error: 'Diaspora profile incomplete',
      message: 'Please complete your diaspora profile to access this feature',
      code: 'DIASPORA_PROFILE_INCOMPLETE'
    });
  }

  next();
};

// Email verification middleware
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

// Community membership verification
const verifyCommunityMembership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const communityId = req.params.communityId || req.body.community;
    
    if (!communityId) {
      return res.status(400).json({
        success: false,
        error: 'Community ID required',
        code: 'COMMUNITY_ID_REQUIRED'
      });
    }

    const Community = require('../models/Community');
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Community not found',
        code: 'COMMUNITY_NOT_FOUND'
      });
    }

    // Check if user is a member
    const isMember = community.isMember(req.user._id);
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Community membership required',
        message: 'You must be a member of this community to perform this action',
        code: 'NOT_COMMUNITY_MEMBER'
      });
    }

    // Add community to request object
    req.community = community;
    req.isCommunityModerator = community.isModerator(req.user._id);
    
    next();
  } catch (error) {
    console.error('Community membership verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'COMMUNITY_CHECK_ERROR'
    });
  }
};

// Rate limiting by user
const userRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated users
    }

    const key = `rate_limit:user:${req.user._id}`;
    
    try {
      const requests = await redisUtils.incr(key, Math.floor(windowMs / 1000));
      
      if (requests > maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 60000} minutes`,
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.floor(windowMs / 1000)
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - requests),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });

      next();
    } catch (error) {
      console.error('User rate limiting error:', error);
      // Continue on rate limiting service failure
      next();
    }
  };
};

// Refresh token validation
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret, {
        algorithms: [config.jwt.algorithm]
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await redisUtils.exists(`blacklist:refresh:${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token revoked',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // Get user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    console.error('Refresh token validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'REFRESH_TOKEN_SERVICE_ERROR'
    });
  }
};

// Token blacklisting helper
const blacklistToken = async (token, type = 'access') => {
  try {
    const key = type === 'refresh' ? `blacklist:refresh:${token}` : `blacklist:${token}`;
    const ttl = type === 'refresh' ? 
      30 * 24 * 60 * 60 : // 30 days for refresh tokens
      7 * 24 * 60 * 60;   // 7 days for access tokens
    
    await redisUtils.set(key, 'blacklisted', ttl);
    return true;
  } catch (error) {
    console.error('Token blacklisting error:', error);
    return false;
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  verifyDiaspora,
  requireEmailVerification,
  verifyCommunityMembership,
  userRateLimit,
  validateRefreshToken,
  blacklistToken
};