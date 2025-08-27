/**
 * ObaNet User Controller
 * Handles user profile management, diaspora connections, and social features
 */

const User = require('../models/User');
const Community = require('../models/Community');
const Post = require('../models/Post');
const Event = require('../models/Event');
const { redisUtils } = require('../config/redis');
const { catchAsync, AppError, createDiasporaError } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Search users
// @route   GET /api/v1/users/search?q=query&type=all&page=1&limit=20
// @access  Public
const searchUsers = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 20, sort = 'relevant' } = req.query;
  
  const searchQuery = {
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
      { 'profile.profession': { $regex: q, $options: 'i' } },
      { 'diasporaProfile.currentCity': { $regex: q, $options: 'i' } },
      { 'diasporaProfile.originCity': { $regex: q, $options: 'i' } }
    ],
    status: 'active',
    'privacy.profileVisibility': { $in: ['public', 'diaspora'] }
  };

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { 'stats.diasporaScore': -1, 'stats.followersCount': -1 };
      break;
    case 'trending':
      sortOption = { 'stats.engagementScore': -1 };
      break;
    default:
      sortOption = { 'stats.diasporaScore': -1 };
  }

  const users = await User.find(searchQuery)
    .select('firstName lastName username profile diasporaProfile stats isVerified')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await User.countDocuments(searchQuery);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get users by country
// @route   GET /api/v1/users/diaspora/:country
// @access  Public
const getUsersByCountry = catchAsync(async (req, res) => {
  const { country } = req.params;
  const { page = 1, limit = 20, sort = 'recent' } = req.query;

  if (!config.diaspora.supportedCountries.includes(country)) {
    throw new AppError('Desteklenmeyen ülke', 400, 'UNSUPPORTED_COUNTRY');
  }

  const query = {
    'diasporaProfile.currentCountry': country,
    status: 'active',
    'privacy.profileVisibility': { $in: ['public', 'diaspora'] }
  };

  let sortOption = {};
  switch (sort) {
    case 'popular':
      sortOption = { 'stats.diasporaScore': -1 };
      break;
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    default:
      sortOption = { 'stats.diasporaScore': -1 };
  }

  const users = await User.find(query)
    .select('firstName lastName username profile diasporaProfile stats isVerified')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      country,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get featured users
// @route   GET /api/v1/users/featured
// @access  Public
const getFeaturedUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const users = await User.find({
    isFeatured: true,
    status: 'active',
    'privacy.profileVisibility': 'public'
  })
    .select('firstName lastName username profile diasporaProfile stats isVerified')
    .sort({ 'stats.diasporaScore': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await User.countDocuments({
    isFeatured: true,
    status: 'active',
    'privacy.profileVisibility': 'public'
  });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get my profile
// @route   GET /api/v1/users/me/profile
// @access  Private
const getMyProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('following', 'firstName lastName username profile.avatar')
    .populate('followers', 'firstName lastName username profile.avatar')
    .select('-password -emailVerificationToken -passwordResetToken');

  res.json({
    success: true,
    data: { user }
  });
});

// @desc    Update my profile
// @route   PATCH /api/v1/users/me/profile
// @access  Private
const updateMyProfile = catchAsync(async (req, res) => {
  const allowedFields = [
    'firstName', 'lastName', 'profile.bio', 'profile.profession',
    'profile.website', 'profile.socialLinks', 'diasporaProfile.currentCity',
    'diasporaProfile.currentCountry', 'diasporaProfile.originCity',
    'diasporaProfile.yearsInDiaspora', 'diasporaProfile.languages'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select('-password -emailVerificationToken -passwordResetToken');

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  res.json({
    success: true,
    message: 'Profil başarıyla güncellendi',
    data: { user }
  });
});

// @desc    Get my diaspora connections
// @route   GET /api/v1/users/me/diaspora-connections
// @access  Private (requires diaspora profile)
const getMyDiasporaConnections = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type = 'same_city' } = req.query;

  let query = { status: 'active', _id: { $ne: req.user._id } };

  switch (type) {
    case 'same_city':
      query['diasporaProfile.currentCity'] = req.user.diasporaProfile.currentCity;
      query['diasporaProfile.currentCountry'] = req.user.diasporaProfile.currentCountry;
      break;
    case 'same_country':
      query['diasporaProfile.currentCountry'] = req.user.diasporaProfile.currentCountry;
      break;
    case 'same_origin':
      query['diasporaProfile.originCity'] = req.user.diasporaProfile.originCity;
      break;
    default:
      query['diasporaProfile.currentCity'] = req.user.diasporaProfile.currentCity;
  }

  const users = await User.find(query)
    .select('firstName lastName username profile diasporaProfile stats isVerified')
    .sort({ 'stats.diasporaScore': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      connectionType: type,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Follow user
// @route   POST /api/v1/users/follow/:userId
// @access  Private
const followUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    throw new AppError('Kendinizi takip edemezsiniz', 400, 'CANNOT_FOLLOW_SELF');
  }

  const userToFollow = await User.findById(userId);
  if (!userToFollow || userToFollow.status !== 'active') {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  const currentUser = await User.findById(req.user._id);

  if (currentUser.following.includes(userId)) {
    throw new AppError('Zaten bu kullanıcıyı takip ediyorsunuz', 400, 'ALREADY_FOLLOWING');
  }

  // Check if target user has privacy restrictions
  if (userToFollow.privacy.allowFollowers === 'none') {
    throw new AppError('Bu kullanıcı takip edilmeyi kabul etmiyor', 403, 'FOLLOW_NOT_ALLOWED');
  }

  // Add to following/followers
  currentUser.following.push(userId);
  userToFollow.followers.push(req.user._id);

  // Update stats
  currentUser.stats.followingCount += 1;
  userToFollow.stats.followersCount += 1;

  await Promise.all([
    currentUser.save({ validateBeforeSave: false }),
    userToFollow.save({ validateBeforeSave: false })
  ]);

  // Clear cache
  await Promise.all([
    redisUtils.del(`diaspora:${req.user._id}`),
    redisUtils.del(`diaspora:${userId}`)
  ]);

  res.json({
    success: true,
    message: `${userToFollow.firstName} ${userToFollow.lastName} takip edilmeye başlandı`,
    data: {
      isFollowing: true,
      followersCount: userToFollow.stats.followersCount
    }
  });
});

// @desc    Unfollow user
// @route   POST /api/v1/users/unfollow/:userId
// @access  Private
const unfollowUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const currentUser = await User.findById(req.user._id);
  const userToUnfollow = await User.findById(userId);

  if (!userToUnfollow) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  if (!currentUser.following.includes(userId)) {
    throw new AppError('Bu kullanıcıyı zaten takip etmiyorsunuz', 400, 'NOT_FOLLOWING');
  }

  // Remove from following/followers
  currentUser.following.pull(userId);
  userToUnfollow.followers.pull(req.user._id);

  // Update stats
  currentUser.stats.followingCount = Math.max(0, currentUser.stats.followingCount - 1);
  userToUnfollow.stats.followersCount = Math.max(0, userToUnfollow.stats.followersCount - 1);

  await Promise.all([
    currentUser.save({ validateBeforeSave: false }),
    userToUnfollow.save({ validateBeforeSave: false })
  ]);

  // Clear cache
  await Promise.all([
    redisUtils.del(`diaspora:${req.user._id}`),
    redisUtils.del(`diaspora:${userId}`)
  ]);

  res.json({
    success: true,
    message: `${userToUnfollow.firstName} ${userToUnfollow.lastName} takipten çıkarıldı`,
    data: {
      isFollowing: false,
      followersCount: userToUnfollow.stats.followersCount
    }
  });
});

// @desc    Get user profile
// @route   GET /api/v1/users/:userId
// @access  Public (with auth for additional features)
const getUserProfile = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select('-password -emailVerificationToken -passwordResetToken -loginHistory')
    .populate('followers', 'firstName lastName username profile.avatar', { status: 'active' })
    .populate('following', 'firstName lastName username profile.avatar', { status: 'active' })
    .lean();

  if (!user || user.status !== 'active') {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  // Check privacy settings
  const isOwner = req.user && req.user._id === userId;
  const isFollowing = req.user && user.followers.some(f => f._id.toString() === req.user._id);

  if (user.privacy.profileVisibility === 'private' && !isOwner && !isFollowing) {
    throw new AppError('Bu profil private', 403, 'PRIVATE_PROFILE');
  }

  // Remove sensitive data based on privacy settings
  if (!isOwner) {
    if (user.privacy.showFollowers === 'none' || 
        (user.privacy.showFollowers === 'followers_only' && !isFollowing)) {
      user.followers = [];
      user.stats.followersCount = 0;
    }

    if (user.privacy.showFollowing === 'none' || 
        (user.privacy.showFollowing === 'followers_only' && !isFollowing)) {
      user.following = [];
      user.stats.followingCount = 0;
    }
  }

  // Add relationship status if authenticated
  let relationshipStatus = 'none';
  if (req.user && req.user._id !== userId) {
    const currentUser = await User.findById(req.user._id).select('following blockedUsers');
    
    if (currentUser.blockedUsers.includes(userId)) {
      relationshipStatus = 'blocked';
    } else if (currentUser.following.includes(userId)) {
      relationshipStatus = 'following';
    }
  }

  res.json({
    success: true,
    data: {
      user,
      relationshipStatus,
      isOwner: Boolean(isOwner)
    }
  });
});

// Placeholder implementations for remaining controller functions
const getUserPosts = catchAsync(async (req, res) => {
  // TODO: Implement user posts retrieval
  res.json({
    success: true,
    message: 'getUserPosts - To be implemented',
    data: { posts: [] }
  });
});

const getUserCommunities = catchAsync(async (req, res) => {
  // TODO: Implement user communities retrieval
  res.json({
    success: true,
    message: 'getUserCommunities - To be implemented',
    data: { communities: [] }
  });
});

const getUserEvents = catchAsync(async (req, res) => {
  // TODO: Implement user events retrieval
  res.json({
    success: true,
    message: 'getUserEvents - To be implemented',
    data: { events: [] }
  });
});

const getMyActivity = catchAsync(async (req, res) => {
  // TODO: Implement activity feed
  res.json({
    success: true,
    message: 'getMyActivity - To be implemented',
    data: { activities: [] }
  });
});

const getMyStats = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('stats');
  
  res.json({
    success: true,
    data: { stats: user.stats }
  });
});

const getMyFollowers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const user = await User.findById(req.user._id)
    .populate({
      path: 'followers',
      select: 'firstName lastName username profile diasporaProfile stats isVerified',
      match: { status: 'active' },
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit,
        sort: { 'stats.diasporaScore': -1 }
      }
    });

  res.json({
    success: true,
    data: {
      followers: user.followers,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

const getMyFollowing = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const user = await User.findById(req.user._id)
    .populate({
      path: 'following',
      select: 'firstName lastName username profile diasporaProfile stats isVerified',
      match: { status: 'active' },
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit,
        sort: { 'stats.diasporaScore': -1 }
      }
    });

  res.json({
    success: true,
    data: {
      following: user.following,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

// Additional placeholder implementations
const getDiasporaCities = catchAsync(async (req, res) => {
  // TODO: Implement diaspora cities aggregation
  res.json({ success: true, message: 'getDiasporaCities - To be implemented' });
});

const getUsersByCity = catchAsync(async (req, res) => {
  // TODO: Implement users by city
  res.json({ success: true, message: 'getUsersByCity - To be implemented' });
});

const blockUser = catchAsync(async (req, res) => {
  // TODO: Implement user blocking
  res.json({ success: true, message: 'blockUser - To be implemented' });
});

const unblockUser = catchAsync(async (req, res) => {
  // TODO: Implement user unblocking
  res.json({ success: true, message: 'unblockUser - To be implemented' });
});

const getBlockedUsers = catchAsync(async (req, res) => {
  // TODO: Implement blocked users list
  res.json({ success: true, message: 'getBlockedUsers - To be implemented' });
});

const updatePrivacySettings = catchAsync(async (req, res) => {
  // TODO: Implement privacy settings update
  res.json({ success: true, message: 'updatePrivacySettings - To be implemented' });
});

const updateNotificationSettings = catchAsync(async (req, res) => {
  // TODO: Implement notification settings update
  res.json({ success: true, message: 'updateNotificationSettings - To be implemented' });
});

const requestVerification = catchAsync(async (req, res) => {
  // TODO: Implement verification request
  res.json({ success: true, message: 'requestVerification - To be implemented' });
});

const verifyUser = catchAsync(async (req, res) => {
  // TODO: Implement user verification (admin)
  res.json({ success: true, message: 'verifyUser - To be implemented' });
});

const featureUser = catchAsync(async (req, res) => {
  // TODO: Implement user featuring (admin)
  res.json({ success: true, message: 'featureUser - To be implemented' });
});

const updateUserStatus = catchAsync(async (req, res) => {
  // TODO: Implement user status update (admin)
  res.json({ success: true, message: 'updateUserStatus - To be implemented' });
});

const deleteUser = catchAsync(async (req, res) => {
  // TODO: Implement user deletion (admin)
  res.json({ success: true, message: 'deleteUser - To be implemented' });
});

module.exports = {
  searchUsers,
  getUsersByCountry,
  getFeaturedUsers,
  getMyProfile,
  updateMyProfile,
  getMyDiasporaConnections,
  followUser,
  unfollowUser,
  getUserProfile,
  getUserPosts,
  getUserCommunities,
  getUserEvents,
  getMyActivity,
  getMyStats,
  getMyFollowers,
  getMyFollowing,
  getDiasporaCities,
  getUsersByCity,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updatePrivacySettings,
  updateNotificationSettings,
  requestVerification,
  verifyUser,
  featureUser,
  updateUserStatus,
  deleteUser
};