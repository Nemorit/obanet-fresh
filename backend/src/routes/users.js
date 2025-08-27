/**
 * ObaNet User Management Routes
 * User profiles, diaspora connections, and social features
 */

const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const { 
  authenticate, 
  optionalAuth, 
  authorize, 
  verifyDiaspora,
  requireEmailVerification,
  userRateLimit 
} = require('../middleware/auth');
const { 
  validateProfileUpdate,
  validateObjectId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Public routes
router.get('/search', 
  optionalAuth,
  validateSearch,
  validatePagination,
  userController.searchUsers
);

router.get('/diaspora/:country',
  optionalAuth,
  validatePagination,
  userController.getUsersByCountry
);

router.get('/featured',
  optionalAuth,
  validatePagination,
  userController.getFeaturedUsers
);

// Protected routes - authentication required
router.use(authenticate);

router.get('/me/profile',
  userController.getMyProfile
);

router.patch('/me/profile',
  userRateLimit(60 * 60 * 1000, 10), // 10 updates per hour
  validateProfileUpdate,
  userController.updateMyProfile
);

router.get('/me/diaspora-connections',
  verifyDiaspora,
  validatePagination,
  userController.getMyDiasporaConnections
);

router.get('/me/activity',
  validatePagination,
  userController.getMyActivity
);

router.get('/me/stats',
  userController.getMyStats
);

// Follow/Unfollow system
router.post('/follow/:userId',
  userRateLimit(60 * 60 * 1000, 50), // 50 follow actions per hour
  validateObjectId('userId'),
  requireEmailVerification,
  userController.followUser
);

router.post('/unfollow/:userId',
  userRateLimit(60 * 60 * 1000, 50),
  validateObjectId('userId'),
  userController.unfollowUser
);

router.get('/me/followers',
  validatePagination,
  userController.getMyFollowers
);

router.get('/me/following',
  validatePagination,
  userController.getMyFollowing
);

// User profiles (public with authentication for additional features)
router.get('/:userId',
  validateObjectId('userId'),
  userController.getUserProfile
);

router.get('/:userId/posts',
  validateObjectId('userId'),
  validatePagination,
  userController.getUserPosts
);

router.get('/:userId/communities',
  validateObjectId('userId'),
  validatePagination,
  userController.getUserCommunities
);

router.get('/:userId/events',
  validateObjectId('userId'),
  validatePagination,
  userController.getUserEvents
);

// Diaspora specific routes
router.get('/diaspora/:country/cities',
  verifyDiaspora,
  userController.getDiasporaCities
);

router.get('/diaspora/:country/:city',
  verifyDiaspora,
  validatePagination,
  userController.getUsersByCity
);

// Privacy and blocking
router.post('/block/:userId',
  userRateLimit(24 * 60 * 60 * 1000, 10), // 10 blocks per day
  validateObjectId('userId'),
  userController.blockUser
);

router.post('/unblock/:userId',
  validateObjectId('userId'),
  userController.unblockUser
);

router.get('/me/blocked',
  validatePagination,
  userController.getBlockedUsers
);

// Profile visibility settings
router.patch('/me/privacy',
  userRateLimit(60 * 60 * 1000, 5), // 5 privacy updates per hour
  userController.updatePrivacySettings
);

// Notification preferences
router.patch('/me/notifications',
  userRateLimit(60 * 60 * 1000, 10),
  userController.updateNotificationSettings
);

// User verification (for featured users)
router.post('/request-verification',
  userRateLimit(24 * 60 * 60 * 1000, 1), // 1 request per day
  requireEmailVerification,
  verifyDiaspora,
  userController.requestVerification
);

// Admin routes
router.patch('/:userId/verify',
  validateObjectId('userId'),
  authorize('admin', 'moderator'),
  userController.verifyUser
);

router.patch('/:userId/feature',
  validateObjectId('userId'),
  authorize('admin'),
  userController.featureUser
);

router.patch('/:userId/status',
  validateObjectId('userId'),
  authorize('admin', 'moderator'),
  userController.updateUserStatus
);

router.delete('/:userId',
  validateObjectId('userId'),
  authorize('admin'),
  userController.deleteUser
);

module.exports = router;