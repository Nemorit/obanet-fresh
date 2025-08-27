/**
 * ObaNet Community Model
 * Diaspora Community/Oba Schema
 */

const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Topluluk adı zorunludur'],
    trim: true,
    maxlength: [100, 'Topluluk adı 100 karakterden uzun olamaz']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug sadece küçük harf, sayı ve tire içerebilir']
  },
  description: {
    type: String,
    required: [true, 'Açıklama zorunludur'],
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  longDescription: {
    type: String,
    maxlength: [2000, 'Uzun açıklama 2000 karakterden uzun olamaz']
  },

  // Visual Elements
  avatar: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#DC2626', // ObaNet primary red
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçerli hex renk kodu giriniz']
  },

  // Community Type & Focus
  type: {
    type: String,
    required: true,
    enum: ['location', 'interest', 'professional', 'cultural', 'educational'],
    default: 'location'
  },
  category: {
    type: String,
    required: true,
    enum: [
      'diaspora_general', 'city_based', 'country_based',
      'business_network', 'students', 'professionals',
      'cultural_arts', 'sports', 'technology', 'health',
      'education', 'family', 'youth', 'seniors',
      'religious', 'political', 'charity', 'hobbies'
    ]
  },

  // Diaspora Specific
  diasporaInfo: {
    targetCountry: {
      type: String,
      enum: [
        'Germany', 'France', 'Netherlands', 'Belgium', 'Austria',
        'Switzerland', 'UK', 'USA', 'Canada', 'Australia',
        'Turkey', 'Northern Cyprus', 'Global', 'Other'
      ]
    },
    targetCity: String,
    originRegion: String, // Hangi bölgeden gelenler için
    languagePreference: {
      type: String,
      enum: ['tr', 'en', 'de', 'fr', 'mixed'],
      default: 'mixed'
    },
    culturalFocus: {
      type: String,
      enum: ['traditional', 'modern', 'mixed'],
      default: 'mixed'
    }
  },

  // Management
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    permissions: [{
      type: String,
      enum: ['manage_posts', 'manage_events', 'manage_members', 'moderate_content']
    }]
  }],

  // Membership
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    role: {
      type: String,
      enum: ['member', 'active_member', 'contributor', 'leader'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['active', 'muted', 'banned'],
      default: 'active'
    }
  }],

  // Settings
  settings: {
    visibility: {
      type: String,
      enum: ['public', 'diaspora_only', 'private'],
      default: 'public'
    },
    joinPolicy: {
      type: String,
      enum: ['open', 'request', 'invite_only'],
      default: 'open'
    },
    postingRights: {
      type: String,
      enum: ['all_members', 'active_members', 'moderators_only'],
      default: 'all_members'
    },
    allowEvents: { type: Boolean, default: true },
    allowPolls: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    diasporaVerificationRequired: { type: Boolean, default: false }
  },

  // Content Rules
  rules: [{
    title: String,
    description: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Statistics
  stats: {
    memberCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 }, // Active in last 30 days
    engagementScore: { type: Number, default: 0 },
    weeklyGrowth: { type: Number, default: 0 },
    monthlyGrowth: { type: Number, default: 0 }
  },

  // Activity Tracking
  activity: {
    lastPostAt: Date,
    lastEventAt: Date,
    lastMemberJoin: Date,
    peakActiveTime: {
      hour: Number, // 0-23
      dayOfWeek: Number // 0-6 (Sunday=0)
    }
  },

  // Status & Flags
  status: {
    type: String,
    enum: ['active', 'archived', 'suspended', 'under_review'],
    default: 'active'
  },
  featured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },

  // Tags for discovery
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Join Requests (for request-based communities)
  joinRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    requestedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],

  // Events associated with this community
  upcomingEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

  // Pinned posts
  pinnedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],

  // Social links
  socialLinks: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String,
    telegram: String,
    whatsapp: String
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
communitySchema.index({ slug: 1 });
communitySchema.index({ type: 1, category: 1 });
communitySchema.index({ 'diasporaInfo.targetCountry': 1 });
communitySchema.index({ 'diasporaInfo.targetCity': 1 });
communitySchema.index({ status: 1 });
communitySchema.index({ featured: 1 });
communitySchema.index({ trending: 1 });
communitySchema.index({ 'stats.memberCount': -1 });
communitySchema.index({ 'stats.engagementScore': -1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index({ tags: 1 });

// Pre-save middleware
communitySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Auto-generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  next();
});

// Virtual for member count
communitySchema.virtual('memberCountDisplay').get(function () {
  const count = this.stats.memberCount;
  if (count < 1000) return count.toString();
  if (count < 1000000) return (count / 1000).toFixed(1) + 'B';
  return (count / 1000000).toFixed(1) + 'M';
});

// Instance methods
communitySchema.methods.addMember = async function (userId, role = 'member') {
  // Check if already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member');
  }

  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });

  this.stats.memberCount = this.members.length;
  this.activity.lastMemberJoin = new Date();
  
  await this.save();
  return this;
};

communitySchema.methods.removeMember = async function (userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  this.stats.memberCount = this.members.length;
  await this.save();
  return this;
};

communitySchema.methods.isMember = function (userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    member.status === 'active'
  );
};

communitySchema.methods.isModerator = function (userId) {
  return this.moderators.some(mod => 
    mod.user.toString() === userId.toString()
  ) || this.creator.toString() === userId.toString();
};

communitySchema.methods.updateEngagementScore = function () {
  // Simple engagement calculation
  const memberWeight = this.stats.memberCount * 1;
  const postWeight = this.stats.postCount * 2;
  const eventWeight = this.stats.eventCount * 5;
  const activeWeight = this.stats.activeMembers * 3;
  
  this.stats.engagementScore = memberWeight + postWeight + eventWeight + activeWeight;
  return this.stats.engagementScore;
};

// Static methods
communitySchema.statics.findByLocation = function (country, city = null) {
  const query = { 'diasporaInfo.targetCountry': country, status: 'active' };
  if (city) {
    query['diasporaInfo.targetCity'] = new RegExp(city, 'i');
  }
  return this.find(query).sort({ 'stats.memberCount': -1 });
};

communitySchema.statics.findTrending = function (limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.engagementScore': -1, 'stats.weeklyGrowth': -1 })
    .limit(limit)
    .populate('creator', 'firstName lastName username')
    .select('-members -joinRequests');
};

communitySchema.statics.findFeatured = function () {
  return this.find({ featured: true, status: 'active' })
    .sort({ 'stats.memberCount': -1 })
    .populate('creator', 'firstName lastName username avatar')
    .select('-members -joinRequests');
};

communitySchema.statics.searchCommunities = function (searchTerm, filters = {}) {
  const query = {
    status: 'active',
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { description: new RegExp(searchTerm, 'i') },
      { tags: new RegExp(searchTerm, 'i') }
    ]
  };

  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.country) query['diasporaInfo.targetCountry'] = filters.country;
  if (filters.city) query['diasporaInfo.targetCity'] = new RegExp(filters.city, 'i');

  return this.find(query)
    .sort({ 'stats.engagementScore': -1 })
    .populate('creator', 'firstName lastName username avatar')
    .select('-members -joinRequests');
};

module.exports = mongoose.model('Community', communitySchema);