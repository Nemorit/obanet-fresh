/**
 * ObaNet Community Controller
 * Handles diaspora communities, Oba circles, and group management
 */

const Community = require('../models/Community');
const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const { redisUtils } = require('../config/redis');
const { catchAsync, AppError, createCommunityError } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get communities
// @route   GET /api/v1/communities
// @access  Public
const getCommunities = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    sort = 'popular', 
    category, 
    type,
    country,
    language 
  } = req.query;

  let query = { 
    status: 'active',
    'settings.visibility': { $in: ['public', 'diaspora_only'] }
  };

  // Apply filters
  if (category) query.category = category;
  if (type) query.type = type;
  if (country) query['diasporaInfo.targetCountry'] = country;
  if (language) query['diasporaInfo.languagePreference'] = language;

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { 'stats.membersCount': -1, 'stats.engagementScore': -1 };
      break;
    case 'active':
      sortOption = { 'stats.engagementScore': -1, lastActivityAt: -1 };
      break;
    default:
      sortOption = { 'stats.membersCount': -1 };
  }

  const communities = await Community.find(query)
    .populate('owner', 'firstName lastName username profile.avatar')
    .populate('moderators', 'firstName lastName username profile.avatar')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Community.countDocuments(query);

  res.json({
    success: true,
    data: {
      communities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      filters: { category, type, country, language, sort }
    }
  });
});

// @desc    Search communities
// @route   GET /api/v1/communities/search
// @access  Public
const searchCommunities = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 20, sort = 'relevant' } = req.query;

  const searchQuery = {
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } },
      { 'diasporaInfo.targetCountry': { $regex: q, $options: 'i' } }
    ],
    status: 'active',
    'settings.visibility': { $in: ['public', 'diaspora_only'] }
  };

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { 'stats.membersCount': -1 };
      break;
    case 'active':
      sortOption = { 'stats.engagementScore': -1 };
      break;
    default:
      sortOption = { 'stats.membersCount': -1 };
  }

  const communities = await Community.find(searchQuery)
    .populate('owner', 'firstName lastName username profile.avatar')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Community.countDocuments(searchQuery);

  res.json({
    success: true,
    data: {
      communities,
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

// @desc    Get featured communities
// @route   GET /api/v1/communities/featured
// @access  Public
const getFeaturedCommunities = catchAsync(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const communities = await Community.find({
    isFeatured: true,
    status: 'active',
    'settings.visibility': 'public'
  })
    .populate('owner', 'firstName lastName username profile.avatar')
    .sort({ 'stats.membersCount': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Community.countDocuments({
    isFeatured: true,
    status: 'active',
    'settings.visibility': 'public'
  });

  res.json({
    success: true,
    data: {
      communities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get communities by country
// @route   GET /api/v1/communities/by-country/:country
// @access  Public
const getCommunitiesByCountry = catchAsync(async (req, res) => {
  const { country } = req.params;
  const { page = 1, limit = 20, sort = 'popular' } = req.query;

  if (!config.diaspora.supportedCountries.includes(country) && country !== 'Global') {
    throw new AppError('Desteklenmeyen ülke', 400, 'UNSUPPORTED_COUNTRY');
  }

  const query = {
    'diasporaInfo.targetCountry': { $in: [country, 'Global'] },
    status: 'active',
    'settings.visibility': { $in: ['public', 'diaspora_only'] }
  };

  let sortOption = {};
  switch (sort) {
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'active':
      sortOption = { 'stats.engagementScore': -1 };
      break;
    default:
      sortOption = { 'stats.membersCount': -1 };
  }

  const communities = await Community.find(query)
    .populate('owner', 'firstName lastName username profile.avatar')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Community.countDocuments(query);

  res.json({
    success: true,
    data: {
      communities,
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

// @desc    Get community categories
// @route   GET /api/v1/communities/categories
// @access  Public
const getCommunityCategories = catchAsync(async (req, res) => {
  const categories = [
    { 
      id: 'diaspora_general', 
      name: 'Genel Diaspora', 
      description: 'Genel diaspora konuları',
      icon: '🌍'
    },
    { 
      id: 'city_based', 
      name: 'Şehir Bazlı', 
      description: 'Belirli şehirler için topluluklar',
      icon: '🏙️'
    },
    { 
      id: 'country_based', 
      name: 'Ülke Bazlı', 
      description: 'Belirli ülkeler için topluluklar',
      icon: '🏳️'
    },
    { 
      id: 'business_network', 
      name: 'İş Ağı', 
      description: 'İş ve kariyer odaklı topluluklar',
      icon: '💼'
    },
    { 
      id: 'students', 
      name: 'Öğrenciler', 
      description: 'Öğrenci toplulukları',
      icon: '🎓'
    },
    { 
      id: 'professionals', 
      name: 'Profesyoneller', 
      description: 'Meslek grupları',
      icon: '👔'
    },
    { 
      id: 'cultural_arts', 
      name: 'Kültür & Sanat', 
      description: 'Kültürel ve sanatsal etkinlikler',
      icon: '🎨'
    },
    { 
      id: 'sports', 
      name: 'Spor', 
      description: 'Spor ve aktivite grupları',
      icon: '⚽'
    },
    { 
      id: 'technology', 
      name: 'Teknoloji', 
      description: 'Teknoloji ve IT toplulukları',
      icon: '💻'
    },
    { 
      id: 'family', 
      name: 'Aile', 
      description: 'Aile ve çocuk toplulukları',
      icon: '👨‍👩‍👧‍👦'
    }
  ];

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Get community
// @route   GET /api/v1/communities/:communityId
// @access  Public
const getCommunity = catchAsync(async (req, res) => {
  const { communityId } = req.params;

  const community = await Community.findById(communityId)
    .populate('owner', 'firstName lastName username profile diasporaProfile stats isVerified')
    .populate('moderators', 'firstName lastName username profile diasporaProfile stats isVerified')
    .lean();

  if (!community || community.status === 'deleted') {
    throw new AppError('Topluluk bulunamadı', 404, 'COMMUNITY_NOT_FOUND');
  }

  // Check visibility permissions
  const isOwner = req.user && community.owner._id.toString() === req.user._id;
  const isModerator = req.user && community.moderators.some(mod => mod._id.toString() === req.user._id);
  const isMember = req.user && community.members.includes(req.user._id);

  if (community.settings.visibility === 'private' && !isMember && !isOwner && !isModerator) {
    throw new AppError('Bu topluluk private', 403, 'PRIVATE_COMMUNITY');
  }

  // Add membership status for authenticated users
  let membershipStatus = 'not_member';
  if (req.user) {
    if (isOwner) {
      membershipStatus = 'owner';
    } else if (isModerator) {
      membershipStatus = 'moderator';
    } else if (isMember) {
      membershipStatus = 'member';
    } else if (community.pendingMembers.includes(req.user._id)) {
      membershipStatus = 'pending';
    }
  }

  res.json({
    success: true,
    data: {
      community,
      membershipStatus,
      permissions: {
        canPost: isMember || isOwner || isModerator,
        canModerate: isOwner || isModerator,
        canManage: isOwner
      }
    }
  });
});

// @desc    Create community
// @route   POST /api/v1/communities
// @access  Private
const createCommunity = catchAsync(async (req, res) => {
  // Check if user already owns maximum number of communities
  const userCommunitiesCount = await Community.countDocuments({
    owner: req.user._id,
    status: { $ne: 'deleted' }
  });

  if (userCommunitiesCount >= config.limits.maxCommunitiesPerUser) {
    throw new AppError(
      `Maksimum ${config.limits.maxCommunitiesPerUser} topluluk oluşturabilirsiniz`, 
      400, 
      'MAX_COMMUNITIES_REACHED'
    );
  }

  const communityData = {
    ...req.body,
    owner: req.user._id,
    members: [req.user._id],
    stats: {
      membersCount: 1,
      postsCount: 0,
      eventsCount: 0,
      engagementScore: 0
    }
  };

  const community = await Community.create(communityData);

  // Populate owner information
  await community.populate('owner', 'firstName lastName username profile');

  // Award diaspora score for community creation
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'stats.diasporaScore': 100, 'stats.communitiesCreated': 1 }
  });

  res.status(201).json({
    success: true,
    message: 'Topluluk başarıyla oluşturuldu! +100 diaspora puanı kazandınız 🎉',
    data: { community }
  });
});

// @desc    Join community
// @route   POST /api/v1/communities/:communityId/join
// @access  Private
const joinCommunity = catchAsync(async (req, res) => {
  const { communityId } = req.params;

  const community = await Community.findById(communityId);
  if (!community || community.status !== 'active') {
    throw new AppError('Topluluk bulunamadı', 404, 'COMMUNITY_NOT_FOUND');
  }

  // Check if already a member
  if (community.members.includes(req.user._id)) {
    throw createCommunityError('ALREADY_MEMBER');
  }

  // Check join policy
  if (community.settings.joinPolicy === 'invite_only') {
    throw createCommunityError('COMMUNITY_PRIVATE', 'Sadece davetiye ile katılım');
  }

  if (community.settings.joinPolicy === 'request') {
    // Add to pending members if approval required
    if (!community.pendingMembers.includes(req.user._id)) {
      community.pendingMembers.push(req.user._id);
      await community.save();
    }
    
    return res.json({
      success: true,
      message: 'Katılma isteğiniz gönderildi. Onay bekliyor.',
      data: { status: 'pending' }
    });
  }

  // Check member limit
  if (community.settings.maxMembers && 
      community.members.length >= community.settings.maxMembers) {
    throw createCommunityError('COMMUNITY_FULL');
  }

  // Add user as member
  community.members.push(req.user._id);
  community.stats.membersCount += 1;
  await community.save();

  // Update user stats
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'stats.diasporaScore': 10, 'stats.communitiesJoined': 1 }
  });

  res.json({
    success: true,
    message: `${community.name} topluluğuna katıldınız! +10 diaspora puanı kazandınız`,
    data: {
      status: 'member',
      membersCount: community.stats.membersCount
    }
  });
});

// Placeholder implementations for remaining functions
const getCommunityPosts = catchAsync(async (req, res) => {
  res.json({
    success: true,
    message: 'getCommunityPosts - To be implemented',
    data: { posts: [] }
  });
});

const getCommunityEvents = catchAsync(async (req, res) => {
  res.json({
    success: true,
    message: 'getCommunityEvents - To be implemented', 
    data: { events: [] }
  });
});

const getCommunityMembers = catchAsync(async (req, res) => {
  res.json({
    success: true,
    message: 'getCommunityMembers - To be implemented',
    data: { members: [] }
  });
});

const getMyJoinedCommunities = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const communities = await Community.find({
    members: req.user._id,
    status: 'active'
  })
    .populate('owner', 'firstName lastName username profile.avatar')
    .sort({ lastActivityAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  res.json({
    success: true,
    data: {
      communities,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

const getMyOwnedCommunities = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const communities = await Community.find({
    owner: req.user._id,
    status: { $ne: 'deleted' }
  })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  res.json({
    success: true,
    data: {
      communities,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

const getMyModeratedCommunities = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const communities = await Community.find({
    moderators: req.user._id,
    status: 'active'
  })
    .populate('owner', 'firstName lastName username profile.avatar')
    .sort({ lastActivityAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  res.json({
    success: true,
    data: {
      communities,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

// Additional placeholder implementations
const leaveCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'leaveCommunity - To be implemented' });
});

const requestToJoin = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'requestToJoin - To be implemented' });
});

const updateCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'updateCommunity - To be implemented' });
});

const deleteCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'deleteCommunity - To be implemented' });
});

const getJoinRequests = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'getJoinRequests - To be implemented' });
});

const approveJoinRequest = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'approveJoinRequest - To be implemented' });
});

const rejectJoinRequest = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'rejectJoinRequest - To be implemented' });
});

const removeMember = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'removeMember - To be implemented' });
});

const makeModerator = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'makeModerator - To be implemented' });
});

const removeModerator = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'removeModerator - To be implemented' });
});

const transferOwnership = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'transferOwnership - To be implemented' });
});

const reportCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'reportCommunity - To be implemented' });
});

const featureCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'featureCommunity - To be implemented' });
});

const updateCommunityStatus = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'updateCommunityStatus - To be implemented' });
});

const adminDeleteCommunity = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'adminDeleteCommunity - To be implemented' });
});

module.exports = {
  getCommunities,
  searchCommunities,
  getFeaturedCommunities,
  getCommunitiesByCountry,
  getCommunityCategories,
  getCommunity,
  getCommunityPosts,
  getCommunityEvents,
  getCommunityMembers,
  createCommunity,
  getMyJoinedCommunities,
  getMyOwnedCommunities,
  getMyModeratedCommunities,
  joinCommunity,
  leaveCommunity,
  requestToJoin,
  updateCommunity,
  deleteCommunity,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  makeModerator,
  removeModerator,
  transferOwnership,
  reportCommunity,
  featureCommunity,
  updateCommunityStatus,
  adminDeleteCommunity
};