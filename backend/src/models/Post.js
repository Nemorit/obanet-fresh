/**
 * ObaNet Post Model
 * Community Posts & Content Schema
 */

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Başlık zorunludur'],
    trim: true,
    maxlength: [200, 'Başlık 200 karakterden uzun olamaz']
  },
  content: {
    type: String,
    required: [true, 'İçerik zorunludur'],
    maxlength: [10000, 'İçerik 10000 karakterden uzun olamaz']
  },
  contentType: {
    type: String,
    enum: ['text', 'image', 'video', 'link', 'poll', 'event_share'],
    default: 'text'
  },

  // Author & Community
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },

  // Media Content
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String,
    caption: String
  }],

  // Link Preview (for link posts)
  linkPreview: {
    url: String,
    title: String,
    description: String,
    image: String,
    domain: String
  },

  // Poll Data (for poll posts)
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      voteCount: { type: Number, default: 0 }
    }],
    allowMultiple: { type: Boolean, default: false },
    expiresAt: Date,
    totalVotes: { type: Number, default: 0 }
  },

  // Engagement
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    isEdited: { type: Boolean, default: false },
    editedAt: Date
  }],

  // Statistics
  stats: {
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 }
  },

  // Diaspora Specific
  diasporaContext: {
    relevantCountries: [String], // Which diaspora countries this is relevant to
    culturalTags: [String], // Cultural context tags
    isHomelandNews: { type: Boolean, default: false },
    isLocalDiaspora: { type: Boolean, default: false }
  },

  // Content Management
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'reported', 'removed'],
    default: 'published'
  },
  visibility: {
    type: String,
    enum: ['public', 'community_only', 'diaspora_only', 'private'],
    default: 'community_only'
  },

  // Moderation
  moderation: {
    isApproved: { type: Boolean, default: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    reports: [{
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other']
      },
      description: String,
      reportedAt: { type: Date, default: Date.now }
    }],
    moderationNotes: String
  },

  // Features
  isPinned: { type: Boolean, default: false },
  pinnedAt: Date,
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  isAnnouncement: { type: Boolean, default: false },
  announcementLevel: {
    type: String,
    enum: ['info', 'warning', 'important'],
    default: 'info'
  },

  // Scheduling
  scheduledAt: Date,
  publishedAt: { type: Date, default: Date.now },

  // Tags and Categories
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: [
      'general', 'news', 'discussion', 'question', 'help',
      'event', 'job', 'housing', 'business', 'cultural',
      'education', 'health', 'legal', 'technology'
    ],
    default: 'general'
  },

  // Location (if relevant)
  location: {
    country: String,
    city: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Metadata
  language: {
    type: String,
    enum: ['tr', 'en', 'de', 'fr'],
    default: 'tr'
  },
  
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  editHistory: [{
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: String // Description of changes made
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ isPinned: 1, createdAt: -1 });
postSchema.index({ 'stats.engagementScore': -1 });
postSchema.index({ tags: 1 });
postSchema.index({ category: 1 });
postSchema.index({ 'diasporaContext.relevantCountries': 1 });
postSchema.index({ language: 1 });

// Text search index
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Pre-save middleware
postSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Update stats
  this.stats.likeCount = this.likes.length;
  this.stats.dislikeCount = this.dislikes.length;
  this.stats.commentCount = this.comments.length;
  
  // Calculate engagement score
  this.stats.engagementScore = 
    (this.stats.likeCount * 2) + 
    (this.stats.commentCount * 3) + 
    (this.stats.shareCount * 1) + 
    (this.stats.viewCount * 0.1);
  
  // Update poll vote counts
  if (this.poll && this.poll.options) {
    this.poll.totalVotes = this.poll.options.reduce((total, option) => {
      option.voteCount = option.votes.length;
      return total + option.voteCount;
    }, 0);
  }
  
  next();
});

// Instance Methods
postSchema.methods.like = function (userId) {
  if (this.likes.includes(userId)) {
    return false; // Already liked
  }
  
  // Remove from dislikes if exists
  this.dislikes = this.dislikes.filter(id => !id.equals(userId));
  this.likes.push(userId);
  
  return true;
};

postSchema.methods.unlike = function (userId) {
  this.likes = this.likes.filter(id => !id.equals(userId));
  return true;
};

postSchema.methods.dislike = function (userId) {
  if (this.dislikes.includes(userId)) {
    return false; // Already disliked
  }
  
  // Remove from likes if exists
  this.likes = this.likes.filter(id => !id.equals(userId));
  this.dislikes.push(userId);
  
  return true;
};

postSchema.methods.undislike = function (userId) {
  this.dislikes = this.dislikes.filter(id => !id.equals(userId));
  return true;
};

postSchema.methods.addComment = function (userId, content, parentCommentId = null) {
  if (parentCommentId) {
    // Add reply to existing comment
    const parentComment = this.comments.id(parentCommentId);
    if (parentComment) {
      parentComment.replies.push({
        author: userId,
        content: content
      });
    }
  } else {
    // Add new comment
    this.comments.push({
      author: userId,
      content: content
    });
  }
  
  return this;
};

postSchema.methods.voteInPoll = function (userId, optionIndex) {
  if (!this.poll || !this.poll.options[optionIndex]) {
    return false;
  }

  const option = this.poll.options[optionIndex];
  
  // Check if user already voted (if not allowing multiple votes)
  if (!this.poll.allowMultiple) {
    // Remove previous votes
    this.poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(id => !id.equals(userId));
    });
  }

  // Add vote if not already voted for this option
  if (!option.votes.includes(userId)) {
    option.votes.push(userId);
    return true;
  }
  
  return false;
};

postSchema.methods.canUserEdit = function (userId, userRole = 'user') {
  return this.author.equals(userId) || userRole === 'moderator' || userRole === 'admin';
};

postSchema.methods.canUserDelete = function (userId, userRole = 'user', isCommunityMod = false) {
  return this.author.equals(userId) || 
         userRole === 'moderator' || 
         userRole === 'admin' || 
         isCommunityMod;
};

// Static Methods
postSchema.statics.findByUser = function (userId, status = 'published') {
  return this.find({ author: userId, status: status })
    .sort({ createdAt: -1 })
    .populate('community', 'name slug avatar')
    .select('-comments.author -likes -dislikes');
};

postSchema.statics.findByCommunity = function (communityId, options = {}) {
  const { limit = 20, skip = 0, sort = 'recent' } = options;
  
  let sortQuery = { createdAt: -1 };
  if (sort === 'popular') sortQuery = { 'stats.engagementScore': -1 };
  if (sort === 'trending') sortQuery = { 'stats.likeCount': -1, createdAt: -1 };

  return this.find({ community: communityId, status: 'published' })
    .sort(sortQuery)
    .limit(limit)
    .skip(skip)
    .populate('author', 'firstName lastName username avatar diasporaProfile.currentCountry')
    .populate('community', 'name slug avatar color')
    .select('-comments.author.email -likes -dislikes');
};

postSchema.statics.findTrending = function (timeframe = 'week', limit = 10) {
  const now = new Date();
  let timeLimit;
  
  switch (timeframe) {
    case 'day':
      timeLimit = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      timeLimit = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeLimit = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      timeLimit = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  return this.find({
    status: 'published',
    createdAt: { $gte: timeLimit }
  })
    .sort({ 'stats.engagementScore': -1, 'stats.likeCount': -1 })
    .limit(limit)
    .populate('author', 'firstName lastName username avatar')
    .populate('community', 'name slug avatar color')
    .select('-comments -likes -dislikes');
};

postSchema.statics.searchPosts = function (searchTerm, filters = {}) {
  const query = {
    status: 'published',
    $text: { $search: searchTerm }
  };

  if (filters.community) query.community = filters.community;
  if (filters.author) query.author = filters.author;
  if (filters.category) query.category = filters.category;
  if (filters.language) query.language = filters.language;
  if (filters.country) query['diasporaContext.relevantCountries'] = filters.country;

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .populate('author', 'firstName lastName username avatar')
    .populate('community', 'name slug avatar color')
    .select('-comments -likes -dislikes');
};

module.exports = mongoose.model('Post', postSchema);