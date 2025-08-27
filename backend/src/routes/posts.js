/**
 * ObaNet Posts Routes
 * Community posts, diaspora stories, and content sharing
 */

const express = require('express');
const router = express.Router();

// Import controllers and middleware
const postController = require('../controllers/postController');
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
  validatePostCreation,
  validateComment,
  validateObjectId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Public routes
router.get('/', 
  optionalAuth,
  validatePagination,
  postController.getPosts
);

router.get('/trending',
  optionalAuth,
  validatePagination,
  postController.getTrendingPosts
);

router.get('/search',
  optionalAuth,
  validateSearch,
  validatePagination,
  postController.searchPosts
);

router.get('/by-category/:category',
  optionalAuth,
  validatePagination,
  postController.getPostsByCategory
);

router.get('/diaspora-feed',
  optionalAuth,
  validatePagination,
  postController.getDiasporaFeed
);

router.get('/:postId',
  optionalAuth,
  validateObjectId('postId'),
  postController.getPost
);

router.get('/:postId/comments',
  optionalAuth,
  validateObjectId('postId'),
  validatePagination,
  postController.getPostComments
);

// Protected routes - authentication required
router.use(authenticate);

// Post creation and management
router.post('/',
  userRateLimit(60 * 60 * 1000, 10), // 10 posts per hour
  requireEmailVerification,
  validatePostCreation,
  postController.createPost
);

router.get('/me/posts',
  validatePagination,
  postController.getMyPosts
);

router.get('/me/liked',
  validatePagination,
  postController.getMyLikedPosts
);

router.get('/me/saved',
  validatePagination,
  postController.getMySavedPosts
);

router.get('/me/drafts',
  validatePagination,
  postController.getMyDrafts
);

router.get('/following/feed',
  validatePagination,
  postController.getFollowingFeed
);

router.patch('/:postId',
  validateObjectId('postId'),
  postController.updatePost
);

router.delete('/:postId',
  validateObjectId('postId'),
  postController.deletePost
);

// Post interactions
router.post('/:postId/like',
  userRateLimit(60 * 60 * 1000, 100), // 100 likes per hour
  validateObjectId('postId'),
  postController.likePost
);

router.delete('/:postId/like',
  validateObjectId('postId'),
  postController.unlikePost
);

router.post('/:postId/save',
  validateObjectId('postId'),
  postController.savePost
);

router.delete('/:postId/save',
  validateObjectId('postId'),
  postController.unsavePost
);

router.post('/:postId/share',
  userRateLimit(60 * 60 * 1000, 50), // 50 shares per hour
  validateObjectId('postId'),
  postController.sharePost
);

// Comments
router.post('/:postId/comments',
  userRateLimit(60 * 60 * 1000, 20), // 20 comments per hour
  validateObjectId('postId'),
  validateComment,
  postController.addComment
);

router.patch('/:postId/comments/:commentId',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  validateComment,
  postController.updateComment
);

router.delete('/:postId/comments/:commentId',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  postController.deleteComment
);

router.post('/:postId/comments/:commentId/like',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  postController.likeComment
);

router.delete('/:postId/comments/:commentId/like',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  postController.unlikeComment
);

// Reply to comments
router.post('/:postId/comments/:commentId/replies',
  userRateLimit(60 * 60 * 1000, 30), // 30 replies per hour
  validateObjectId('postId'),
  validateObjectId('commentId'),
  validateComment,
  postController.replyToComment
);

router.get('/:postId/comments/:commentId/replies',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  validatePagination,
  postController.getCommentReplies
);

// Post reporting and moderation
router.post('/:postId/report',
  userRateLimit(24 * 60 * 60 * 1000, 10), // 10 reports per day
  validateObjectId('postId'),
  postController.reportPost
);

router.post('/:postId/comments/:commentId/report',
  userRateLimit(24 * 60 * 60 * 1000, 10),
  validateObjectId('postId'),
  validateObjectId('commentId'),
  postController.reportComment
);

// Post analytics (for post authors)
router.get('/:postId/analytics',
  validateObjectId('postId'),
  postController.getPostAnalytics
);

// Community-specific post routes
router.get('/community/:communityId',
  validateObjectId('communityId'),
  validatePagination,
  postController.getCommunityPosts
);

router.get('/community/:communityId/pinned',
  validateObjectId('communityId'),
  postController.getPinnedPosts
);

// Moderator routes (requires community membership verification)
router.post('/:postId/pin',
  validateObjectId('postId'),
  verifyCommunityMembership,
  postController.pinPost
);

router.delete('/:postId/pin',
  validateObjectId('postId'),
  verifyCommunityMembership,
  postController.unpinPost
);

router.patch('/:postId/lock',
  validateObjectId('postId'),
  verifyCommunityMembership,
  postController.lockPost
);

router.patch('/:postId/unlock',
  validateObjectId('postId'),
  verifyCommunityMembership,
  postController.unlockPost
);

router.delete('/:postId/moderate',
  validateObjectId('postId'),
  verifyCommunityMembership,
  postController.moderateDeletePost
);

// Admin routes
router.patch('/:postId/feature',
  validateObjectId('postId'),
  authorize('admin'),
  postController.featurePost
);

router.patch('/:postId/status',
  validateObjectId('postId'),
  authorize('admin', 'moderator'),
  postController.updatePostStatus
);

router.delete('/:postId/admin-delete',
  validateObjectId('postId'),
  authorize('admin'),
  postController.adminDeletePost
);

module.exports = router;