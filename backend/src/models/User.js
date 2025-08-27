/**
 * ObaNet User Model
 * Diaspora-focused User Schema
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'Ad zorunludur'],
    trim: true,
    maxlength: [50, 'Ad 50 karakterden uzun olamaz']
  },
  lastName: {
    type: String,
    required: [true, 'Soyad zorunludur'],
    trim: true,
    maxlength: [50, 'Soyad 50 karakterden uzun olamaz']
  },
  username: {
    type: String,
    required: [true, 'Kullanıcı adı zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [20, 'Kullanıcı adı 20 karakterden uzun olamaz'],
    match: [/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, sayı ve alt çizgi içerebilir']
  },
  email: {
    type: String,
    required: [true, 'E-posta zorunludur'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },

  // Diaspora Specific Information
  diasporaProfile: {
    currentCountry: {
      type: String,
      required: [true, 'Yaşadığınız ülke bilgisi zorunludur'],
      enum: config.diaspora.supportedCountries
    },
    currentCity: {
      type: String,
      required: true,
      trim: true
    },
    originCity: {
      type: String,
      required: [true, 'Memleket şehriniz zorunludur'],
      trim: true
    },
    diasporaGeneration: {
      type: String,
      enum: ['1st', '2nd', '3rd', 'other'],
      default: '1st'
    },
    yearsInDiaspora: {
      type: Number,
      min: 0,
      max: 100
    },
    languages: [{
      language: {
        type: String,
        enum: ['tr', 'en', 'de', 'fr', 'nl', 'ar', 'other']
      },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'native']
      }
    }],
    culturalConnection: {
      type: String,
      enum: ['very_strong', 'strong', 'moderate', 'weak'],
      default: 'moderate'
    }
  },

  // Profile Information
  profile: {
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio 500 karakterden uzun olamaz']
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    profession: {
      type: String,
      trim: true,
      maxlength: [100, 'Meslek 100 karakterden uzun olamaz']
    },
    interests: [{
      type: String,
      trim: true
    }],
    socialLinks: {
      linkedin: String,
      twitter: String,
      instagram: String,
      website: String
    }
  },

  // System Fields
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Activity & Engagement
  stats: {
    postsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    eventsCreated: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 },
    communitiesJoined: { type: Number, default: 0 },
    diasporaScore: { type: Number, default: 100 } // Cultural engagement score
  },

  // Privacy & Notifications
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'diaspora_only', 'private'],
      default: 'diaspora_only'
    },
    showLocation: { type: Boolean, default: true },
    showOrigin: { type: Boolean, default: true },
    allowMessages: {
      type: String,
      enum: ['everyone', 'diaspora_only', 'none'],
      default: 'diaspora_only'
    }
  },

  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    communityUpdates: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    diasporaNews: { type: Boolean, default: true }
  },

  // Relationships
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Metadata
  lastActive: { type: Date, default: Date.now },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    location: String
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'diasporaProfile.currentCountry': 1 });
userSchema.index({ 'diasporaProfile.currentCity': 1 });
userSchema.index({ 'diasporaProfile.originCity': 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Hash password only if it's modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  const payload = {
    userId: this._id,
    email: this.email,
    username: this.username,
    role: this.role
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: config.jwt.algorithm
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const payload = {
    userId: this._id,
    type: 'refresh'
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    algorithm: config.jwt.algorithm
  });
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for diaspora location
userSchema.virtual('diasporaLocation').get(function () {
  return `${this.diasporaProfile.currentCity}, ${this.diasporaProfile.currentCountry}`;
});

// Virtual for age calculation
userSchema.virtual('age').get(function () {
  if (!this.profile.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.profile.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Method to update diaspora score based on activity
userSchema.methods.updateDiasporaScore = function () {
  const baseScore = 100;
  const activityBonus = Math.min(this.stats.postsCount * 2 + this.stats.commentsCount, 100);
  const communityBonus = Math.min(this.stats.communitiesJoined * 5, 50);
  const eventBonus = Math.min(this.stats.eventsAttended * 3, 75);
  
  this.stats.diasporaScore = baseScore + activityBonus + communityBonus + eventBonus;
  return this.stats.diasporaScore;
};

// Static method to find diaspora members by location
userSchema.statics.findByDiasporaLocation = function (country, city = null) {
  const query = { 'diasporaProfile.currentCountry': country };
  if (city) {
    query['diasporaProfile.currentCity'] = new RegExp(city, 'i');
  }
  return this.find(query);
};

// Static method to find by origin
userSchema.statics.findByOrigin = function (originCity) {
  return this.find({ 'diasporaProfile.originCity': new RegExp(originCity, 'i') });
};

// Export model
module.exports = mongoose.model('User', userSchema);