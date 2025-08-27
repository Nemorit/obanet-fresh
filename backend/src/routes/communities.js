/**
 * ObaNet Community Routes
 * Diaspora communities, Oba circles, and group management
 */

const express = require('express');
const router = express.Router();

// Import controllers and middleware
const communityController = require('../controllers/communityController');
const { 
  authenticate, 
  optionalAuth,
  authorize,
  verifyDiaspora,
  requireEmailVerification,
  verifyCommunityMembership,
  userRateLimit 
} = require('../middleware/auth');
const { 
  validateCommunityCreation,
  validateObjectId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Public routes
router.get('/', 
  optionalAuth,
  validatePagination,
  communityController.getCommunities
);

router.get('/search',
  optionalAuth,
  validateSearch,
  validatePagination,
  communityController.searchCommunities
);

router.get('/featured',
  optionalAuth,
  validatePagination,
  communityController.getFeaturedCommunities
);

router.get('/by-country/:country',
  optionalAuth,
  validatePagination,
  communityController.getCommunitiesByCountry
);

router.get('/categories',
  communityController.getCommunityCategories
);

router.get('/:communityId',
  optionalAuth,
  validateObjectId('communityId'),
  communityController.getCommunity
);

router.get('/:communityId/posts',
  optionalAuth,
  validateObjectId('communityId'),
  validatePagination,
  communityController.getCommunityPosts
);

router.get('/:communityId/events',
  optionalAuth,
  validateObjectId('communityId'),
  validatePagination,
  communityController.getCommunityEvents
);

router.get('/:communityId/members',
  optionalAuth,
  validateObjectId('communityId'),
  validatePagination,
  communityController.getCommunityMembers
);

// Protected routes - authentication required
router.use(authenticate);

// Community creation and management
router.post('/',
  userRateLimit(24 * 60 * 60 * 1000, 5), // 5 communities per day
  requireEmailVerification,
  verifyDiaspora,
  validateCommunityCreation,
  communityController.createCommunity
);

router.get('/me/joined',
  validatePagination,
  communityController.getMyJoinedCommunities
);

router.get('/me/owned',
  validatePagination,
  communityController.getMyOwnedCommunities
);

router.get('/me/moderated',
  validatePagination,
  communityController.getMyModeratedCommunities
);

// Community membership
router.post('/:communityId/join',
  userRateLimit(60 * 60 * 1000, 20), // 20 join requests per hour
  validateObjectId('communityId'),
  requireEmailVerification,
  communityController.joinCommunity
);

router.post('/:communityId/leave',
  validateObjectId('communityId'),
  communityController.leaveCommunity
);

router.post('/:communityId/request-join',
  userRateLimit(60 * 60 * 1000, 10), // 10 join requests per hour
  validateObjectId('communityId'),
  requireEmailVerification,
  communityController.requestToJoin
);

// Community owner/moderator routes
router.patch('/:communityId',
  validateObjectId('communityId'),
  verifyCommunityMembership,
  communityController.updateCommunity
);

router.delete('/:communityId',
  validateObjectId('communityId'),
  communityController.deleteCommunity
);

router.get('/:communityId/join-requests',
  validateObjectId('communityId'),
  validatePagination,
  verifyCommunityMembership,
  communityController.getJoinRequests
);

router.post('/:communityId/join-requests/:userId/approve',
  validateObjectId('communityId'),
  validateObjectId('userId'),
  verifyCommunityMembership,
  communityController.approveJoinRequest
);

router.post('/:communityId/join-requests/:userId/reject',
  validateObjectId('communityId'),
  validateObjectId('userId'),
  verifyCommunityMembership,
  communityController.rejectJoinRequest
);

router.post('/:communityId/members/:userId/remove',
  validateObjectId('communityId'),
  validateObjectId('userId'),
  verifyCommunityMembership,
  communityController.removeMember
);

router.post('/:communityId/members/:userId/make-moderator',
  validateObjectId('communityId'),
  validateObjectId('userId'),
  verifyCommunityMembership,
  communityController.makeModerator
);

router.post('/:communityId/members/:userId/remove-moderator',
  validateObjectId('communityId'),
  validateObjectId('userId'),
  verifyCommunityMembership,
  communityController.removeModerator
);

router.post('/:communityId/transfer-ownership',
  validateObjectId('communityId'),
  verifyCommunityMembership,
  communityController.transferOwnership
);

// Community reporting and moderation
router.post('/:communityId/report',
  userRateLimit(24 * 60 * 60 * 1000, 5), // 5 reports per day
  validateObjectId('communityId'),
  communityController.reportCommunity
);

// Admin routes
router.patch('/:communityId/feature',
  validateObjectId('communityId'),
  authorize('admin'),
  communityController.featureCommunity
);

router.patch('/:communityId/status',
  validateObjectId('communityId'),
  authorize('admin', 'moderator'),
  communityController.updateCommunityStatus
);

router.delete('/:communityId/admin-delete',
  validateObjectId('communityId'),
  authorize('admin'),
  communityController.adminDeleteCommunity
);

module.exports = router;