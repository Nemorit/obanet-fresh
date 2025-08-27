/**
 * ObaNet Post Controller
 * Handles community posts, diaspora stories, and content sharing
 */

const Post = require('../models/Post');
const Community = require('../models/Community');
const User = require('../models/User');
const { redisUtils } = require('../config/redis');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get posts (general feed)
// @route   GET /api/v1/posts
// @access  Public
const getPosts = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    sort = 'recent', 
    category, 
    language,
    contentType 
  } = req.query;

  let query = { 
    status: 'published',
    isDeleted: false
  };

  // Apply filters
  if (category) query.category = category;
  if (language) query.language = language;
  if (contentType) query.contentType = contentType;

  // Only show public posts or diaspora posts if user is authenticated
  if (req.user) {
    query.visibility = { $in: ['public', 'diaspora', 'community'] };
  } else {
    query.visibility = 'public';
  }

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { 'engagement.totalScore': -1, createdAt: -1 };
      break;
    case 'trending':
      sortOption = { 'engagement.recentScore': -1, createdAt: -1 };
      break;
    case 'most_liked':
      sortOption = { 'engagement.likesCount': -1 };
      break;
    case 'most_commented':
      sortOption = { 'engagement.commentsCount': -1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  const posts = await Post.find(query)
    .populate('author', 'firstName lastName username profile diasporaProfile stats isVerified')
    .populate('community', 'name slug type category diasporaInfo')
    .populate('originalPost', 'title content author createdAt')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Post.countDocuments(query);

  // Add user interaction status if authenticated
  if (req.user) {
    const user = await User.findById(req.user._id).select('likedPosts savedPosts');
    posts.forEach(post => {
      post.isLiked = user.likedPosts.includes(post._id);
      post.isSaved = user.savedPosts.includes(post._id);
    });
  }

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      filters: { category, language, contentType, sort }
    }
  });
});

// @desc    Get trending posts
// @route   GET /api/v1/posts/trending
// @access  Public
const getTrendingPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, timeframe = 'today' } = req.query;

  let dateFilter = new Date();
  switch (timeframe) {
    case 'today':
      dateFilter.setHours(0, 0, 0, 0);
      break;
    case 'week':
      dateFilter.setDate(dateFilter.getDate() - 7);
      break;
    case 'month':
      dateFilter.setMonth(dateFilter.getMonth() - 1);
      break;
    default:
      dateFilter.setHours(0, 0, 0, 0);
  }

  const query = {
    status: 'published',
    isDeleted: false,
    createdAt: { $gte: dateFilter },
    visibility: req.user ? { $in: ['public', 'diaspora', 'community'] } : 'public'
  };

  const posts = await Post.find(query)
    .populate('author', 'firstName lastName username profile diasporaProfile stats isVerified')
    .populate('community', 'name slug type category')
    .sort({ 'engagement.recentScore': -1, 'engagement.likesCount': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Post.countDocuments(query);

  res.json({
    success: true,
    data: {
      posts,
      timeframe,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get diaspora feed (cultural/location based)
// @route   GET /api/v1/posts/diaspora-feed
// @access  Public
const getDiasporaFeed = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, country, origin } = req.query;

  let query = {
    status: 'published',
    isDeleted: false,
    visibility: req.user ? { $in: ['public', 'diaspora', 'community'] } : 'public'
  };

  // Add diaspora context filters
  if (country || origin) {
    const authorFilter = {};
    if (country) authorFilter['diasporaProfile.currentCountry'] = country;
    if (origin) authorFilter['diasporaProfile.originCity'] = origin;

    const authors = await User.find(authorFilter).select('_id');
    const authorIds = authors.map(author => author._id);
    
    query.author = { $in: authorIds };
  }

  // Prioritize diaspora-tagged content
  query.$or = [
    { tags: { $in: ['diaspora', 'türk', 'turkish', 'almanya', 'germany', 'avrupa', 'europe'] } },
    { category: { $in: ['cultural', 'diaspora_story', 'community_life'] } },
    { 'diasporaContext.isRelevant': true }
  ];

  const posts = await Post.find(query)
    .populate('author', 'firstName lastName username profile diasporaProfile stats isVerified')
    .populate('community', 'name slug type category diasporaInfo')
    .sort({ 'diasporaContext.relevanceScore': -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Post.countDocuments(query);

  res.json({
    success: true,
    data: {
      posts,
      filters: { country, origin },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Search posts
// @route   GET /api/v1/posts/search
// @access  Public
const searchPosts = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 20, sort = 'relevant' } = req.query;

  const searchQuery = {
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ],
    status: 'published',
    isDeleted: false,
    visibility: req.user ? { $in: ['public', 'diaspora', 'community'] } : 'public'
  };

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { 'engagement.totalScore': -1 };
      break;
    case 'relevant':
    default:
      sortOption = { score: { $meta: 'textScore' }, createdAt: -1 };
  }

  const posts = await Post.find(searchQuery)
    .populate('author', 'firstName lastName username profile')
    .populate('community', 'name slug')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Post.countDocuments(searchQuery);

  res.json({
    success: true,
    data: {
      posts,
      searchQuery: q,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get single post
// @route   GET /api/v1/posts/:postId
// @access  Public
const getPost = catchAsync(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate('author', 'firstName lastName username profile diasporaProfile stats isVerified')
    .populate('community', 'name slug type category settings diasporaInfo')
    .populate('originalPost', 'title content author community createdAt')
    .populate({
      path: 'comments',
      populate: {
        path: 'author',
        select: 'firstName lastName username profile'
      },
      options: { sort: { createdAt: -1 }, limit: 5 }
    });

  if (!post || post.isDeleted || post.status !== 'published') {
    throw new AppError('Gönderi bulunamadı', 404, 'POST_NOT_FOUND');
  }

  // Check visibility permissions
  if (post.visibility === 'private') {
    if (!req.user || post.author._id.toString() !== req.user._id) {
      throw new AppError('Bu gönderi private', 403, 'PRIVATE_POST');
    }
  }

  if (post.visibility === 'community') {
    if (!post.community) {
      throw new AppError('Topluluk gönderisi erişilemez', 403, 'COMMUNITY_POST_INACCESSIBLE');
    }

    // Check community membership for community posts
    const community = await Community.findById(post.community._id);
    if (community && !community.members.includes(req.user?._id) && 
        community.settings.visibility === 'private') {
      throw new AppError('Bu gönderiye erişim yok', 403, 'NO_ACCESS_TO_POST');
    }
  }

  // Increment view count
  post.stats.views += 1;
  await post.save({ validateBeforeSave: false });

  // Add user interaction status if authenticated
  let userInteractions = {
    isLiked: false,
    isSaved: false,
    isAuthor: false
  };

  if (req.user) {
    const user = await User.findById(req.user._id).select('likedPosts savedPosts');
    userInteractions = {
      isLiked: user.likedPosts.includes(post._id),
      isSaved: user.savedPosts.includes(post._id),
      isAuthor: post.author._id.toString() === req.user._id
    };
  }

  res.json({
    success: true,
    data: {
      post,
      userInteractions
    }
  });
});

// @desc    Create post
// @route   POST /api/v1/posts
// @access  Private
const createPost = catchAsync(async (req, res) => {
  const postData = {
    ...req.body,
    author: req.user._id
  };

  // Validate community membership if posting to community
  if (postData.community) {
    const community = await Community.findById(postData.community);
    if (!community) {
      throw new AppError('Topluluk bulunamadı', 404, 'COMMUNITY_NOT_FOUND');
    }

    if (!community.members.includes(req.user._id) && 
        community.owner.toString() !== req.user._id) {
      throw new AppError('Bu topluluğa gönderi yapma yetkiniz yok', 403, 'NO_POST_PERMISSION');
    }

    // Update community post count
    community.stats.postsCount += 1;
    community.lastActivityAt = new Date();
    await community.save({ validateBeforeSave: false });
  }

  const post = await Post.create(postData);

  // Populate post data
  await post.populate([
    { path: 'author', select: 'firstName lastName username profile diasporaProfile' },
    { path: 'community', select: 'name slug type category' }
  ]);

  // Award diaspora score for post creation
  let scoreBonus = 20; // Base score
  if (post.contentType === 'diaspora_story') scoreBonus += 30;
  if (post.media && post.media.length > 0) scoreBonus += 10;

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 
      'stats.diasporaScore': scoreBonus,
      'stats.postsCount': 1
    }
  });

  res.status(201).json({
    success: true,
    message: `Gönderi başarıyla oluşturuldu! +${scoreBonus} diaspora puanı kazandınız`,
    data: { post }
  });
});

// @desc    Like post
// @route   POST /api/v1/posts/:postId/like
// @access  Private
const likePost = catchAsync(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw new AppError('Gönderi bulunamadı', 404, 'POST_NOT_FOUND');
  }

  const user = await User.findById(req.user._id);

  // Check if already liked
  if (user.likedPosts.includes(postId)) {
    throw new AppError('Bu gönderiyi zaten beğendiniz', 400, 'ALREADY_LIKED');
  }

  // Add like
  user.likedPosts.push(postId);
  post.likes.push(req.user._id);
  post.engagement.likesCount += 1;
  post.engagement.totalScore += 1;
  post.engagement.recentScore += 1; // For trending calculation

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    post.save({ validateBeforeSave: false })
  ]);

  // Award score to post author
  if (post.author.toString() !== req.user._id) {
    await User.findByIdAndUpdate(post.author, {
      $inc: { 'stats.diasporaScore': 2 }
    });
  }

  res.json({
    success: true,
    message: 'Gönderi beğenildi',
    data: {
      isLiked: true,
      likesCount: post.engagement.likesCount
    }
  });
});

// @desc    Unlike post
// @route   DELETE /api/v1/posts/:postId/like
// @access  Private
const unlikePost = catchAsync(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw new AppError('Gönderi bulunamadı', 404, 'POST_NOT_FOUND');
  }

  const user = await User.findById(req.user._id);

  // Check if not liked
  if (!user.likedPosts.includes(postId)) {
    throw new AppError('Bu gönderiyi beğenmemişsiniz', 400, 'NOT_LIKED');
  }

  // Remove like
  user.likedPosts.pull(postId);
  post.likes.pull(req.user._id);
  post.engagement.likesCount = Math.max(0, post.engagement.likesCount - 1);
  post.engagement.totalScore = Math.max(0, post.engagement.totalScore - 1);

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    post.save({ validateBeforeSave: false })
  ]);

  res.json({
    success: true,
    message: 'Beğeni kaldırıldı',
    data: {
      isLiked: false,
      likesCount: post.engagement.likesCount
    }
  });
});

// Placeholder implementations for remaining functions
const getPostsByCategory = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getPostsByCategory - To be implemented' });
});

const getPostComments = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getPostComments - To be implemented' });
});

const getMyPosts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getMyPosts - To be implemented' });
});

const getMyLikedPosts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getMyLikedPosts - To be implemented' });
});

const getMySavedPosts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getMySavedPosts - To be implemented' });
});

const getMyDrafts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getMyDrafts - To be implemented' });
});

const getFollowingFeed = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getFollowingFeed - To be implemented' });
});

const updatePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'updatePost - To be implemented' });
});

const deletePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'deletePost - To be implemented' });
});

const savePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'savePost - To be implemented' });
});

const unsavePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'unsavePost - To be implemented' });
});

const sharePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'sharePost - To be implemented' });
});

const addComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'addComment - To be implemented' });
});

const updateComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'updateComment - To be implemented' });
});

const deleteComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'deleteComment - To be implemented' });
});

const likeComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'likeComment - To be implemented' });
});

const unlikeComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'unlikeComment - To be implemented' });
});

const replyToComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'replyToComment - To be implemented' });
});

const getCommentReplies = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getCommentReplies - To be implemented' });
});

const reportPost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'reportPost - To be implemented' });
});

const reportComment = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'reportComment - To be implemented' });
});

const getPostAnalytics = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getPostAnalytics - To be implemented' });
});

const getCommunityPosts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getCommunityPosts - To be implemented' });
});

const getPinnedPosts = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getPinnedPosts - To be implemented' });
});

const pinPost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'pinPost - To be implemented' });
});

const unpinPost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'unpinPost - To be implemented' });
});

const lockPost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'lockPost - To be implemented' });
});

const unlockPost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'unlockPost - To be implemented' });
});

const moderateDeletePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'moderateDeletePost - To be implemented' });
});

const featurePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'featurePost - To be implemented' });
});

const updatePostStatus = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'updatePostStatus - To be implemented' });
});

const adminDeletePost = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'adminDeletePost - To be implemented' });
});

module.exports = {
  getPosts,
  getTrendingPosts,
  getDiasporaFeed,
  searchPosts,
  getPost,
  getPostsByCategory,
  getPostComments,
  createPost,
  getMyPosts,
  getMyLikedPosts,
  getMySavedPosts,
  getMyDrafts,
  getFollowingFeed,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  sharePost,
  addComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  replyToComment,
  getCommentReplies,
  reportPost,
  reportComment,
  getPostAnalytics,
  getCommunityPosts,
  getPinnedPosts,
  pinPost,
  unpinPost,
  lockPost,
  unlockPost,
  moderateDeletePost,
  featurePost,
  updatePostStatus,
  adminDeletePost
};