/**
 * ObaNet Event Model
 * Diaspora Events & Gatherings Schema
 */

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Etkinlik başlığı zorunludur'],
    trim: true,
    maxlength: [150, 'Başlık 150 karakterden uzun olamaz']
  },
  description: {
    type: String,
    required: [true, 'Açıklama zorunludur'],
    maxlength: [2000, 'Açıklama 2000 karakterden uzun olamaz']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Kısa açıklama 300 karakterden uzun olamaz']
  },

  // Event Details
  type: {
    type: String,
    required: true,
    enum: [
      'meetup', 'workshop', 'conference', 'cultural', 'business',
      'sports', 'food', 'music', 'art', 'education', 'religious',
      'family', 'networking', 'celebration', 'protest', 'charity'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'diaspora_gathering', 'cultural_event', 'business_network',
      'educational', 'social', 'political', 'religious', 'sports',
      'arts_culture', 'food_drink', 'family_children', 'professional'
    ]
  },

  // Timing
  startDate: {
    type: Date,
    required: [true, 'Başlangıç tarihi zorunludur']
  },
  endDate: {
    type: Date,
    required: [true, 'Bitiş tarihi zorunludur']
  },
  timezone: {
    type: String,
    required: true,
    default: 'Europe/Istanbul'
  },
  duration: {
    hours: Number,
    minutes: Number
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number, // Every X days/weeks/months/years
    endDate: Date,
    daysOfWeek: [Number], // For weekly recurrence (0=Sunday, 6=Saturday)
    dayOfMonth: Number, // For monthly recurrence
    exceptions: [Date] // Dates to skip
  },

  // Location
  location: {
    type: {
      type: String,
      enum: ['physical', 'virtual', 'hybrid'],
      required: true
    },
    venue: String,
    address: String,
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    virtualLink: String,
    virtualPlatform: String, // Zoom, Teams, etc.
    virtualInstructions: String,
    capacity: Number,
    accessibility: String
  },

  // Organization
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coOrganizers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    permissions: [{
      type: String,
      enum: ['manage_attendees', 'edit_event', 'send_messages', 'manage_posts']
    }]
  }],
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },

  // Diaspora Context
  diasporaInfo: {
    targetDiaspora: [{
      type: String,
      enum: [
        'Germany', 'France', 'Netherlands', 'Belgium', 'Austria',
        'Switzerland', 'UK', 'USA', 'Canada', 'Australia',
        'Turkey', 'Northern Cyprus', 'Global'
      ]
    }],
    culturalSignificance: String,
    languageUsed: [{
      type: String,
      enum: ['tr', 'en', 'de', 'fr', 'ar', 'other']
    }],
    traditionLevel: {
      type: String,
      enum: ['very_traditional', 'traditional', 'modern', 'mixed']
    },
    generationTarget: [{
      type: String,
      enum: ['first_gen', 'second_gen', 'third_gen', 'all_generations']
    }]
  },

  // Attendance
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['attending', 'maybe', 'not_attending', 'waitlist'],
      default: 'attending'
    },
    registeredAt: { type: Date, default: Date.now },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: Date,
    guestCount: { type: Number, default: 0 },
    dietaryRequirements: String,
    specialNeeds: String,
    notes: String
  }],

  // Registration Settings
  registration: {
    required: { type: Boolean, default: false },
    deadline: Date,
    maxAttendees: Number,
    waitlistEnabled: { type: Boolean, default: false },
    approvalRequired: { type: Boolean, default: false },
    fee: {
      amount: Number,
      currency: { type: String, default: 'EUR' },
      paymentMethods: [String]
    },
    questions: [{
      question: String,
      type: { type: String, enum: ['text', 'choice', 'checkbox'] },
      required: Boolean,
      options: [String]
    }],
    refundPolicy: String
  },

  // Content & Media
  images: [{
    url: String,
    caption: String,
    isMain: Boolean
  }],
  videos: [{
    url: String,
    title: String,
    platform: String
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],

  // Social Features
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  updates: [{
    title: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isImportant: Boolean
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now },
    replies: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now }
    }]
  }],

  // Statistics
  stats: {
    viewCount: { type: Number, default: 0 },
    interestedCount: { type: Number, default: 0 },
    attendeeCount: { type: Number, default: 0 },
    maybeCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    checkInCount: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    }
  },

  // Settings
  privacy: {
    visibility: {
      type: String,
      enum: ['public', 'diaspora_only', 'community_only', 'private'],
      default: 'public'
    },
    attendeeListVisible: { type: Boolean, default: true },
    allowInvites: { type: Boolean, default: true },
    allowSharing: { type: Boolean, default: true }
  },

  // Status & Management
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'postponed', 'completed'],
    default: 'draft'
  },
  publishedAt: Date,
  
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundOffered: Boolean
  },

  postponement: {
    reason: String,
    originalDate: Date,
    postponedAt: Date,
    postponedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Tags & Discovery
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },

  // Follow-up
  feedback: [{
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    anonymous: Boolean,
    submittedAt: { type: Date, default: Date.now }
  }],
  
  // Related Events
  relatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  parentEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // For recurring events
  
  // External Integration
  externalLinks: {
    facebook: String,
    eventbrite: String,
    meetup: String,
    website: String
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ community: 1 });
eventSchema.index({ 'location.city': 1, 'location.country': 1 });
eventSchema.index({ type: 1, category: 1 });
eventSchema.index({ 'diasporaInfo.targetDiaspora': 1 });
eventSchema.index({ featured: 1, startDate: 1 });
eventSchema.index({ trending: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ 'stats.attendeeCount': -1 });

// Text search
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Geospatial index
eventSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware
eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Update attendee counts
  if (this.attendees) {
    this.stats.attendeeCount = this.attendees.filter(a => a.status === 'attending').length;
    this.stats.maybeCount = this.attendees.filter(a => a.status === 'maybe').length;
    this.stats.checkInCount = this.attendees.filter(a => a.checkedIn).length;
  }
  
  // Calculate duration if not set
  if (!this.duration && this.startDate && this.endDate) {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    this.duration = {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
  }
  
  // Calculate feedback rating
  if (this.feedback && this.feedback.length > 0) {
    const totalRating = this.feedback.reduce((sum, fb) => sum + fb.rating, 0);
    this.stats.rating = {
      average: totalRating / this.feedback.length,
      count: this.feedback.length
    };
  }
  
  next();
});

// Virtual for event status based on dates
eventSchema.virtual('eventStatus').get(function () {
  const now = new Date();
  if (this.status === 'cancelled' || this.status === 'postponed') {
    return this.status;
  }
  if (now < this.startDate) return 'upcoming';
  if (now >= this.startDate && now <= this.endDate) return 'ongoing';
  if (now > this.endDate) return 'past';
  return 'unknown';
});

// Virtual for days until event
eventSchema.virtual('daysUntil').get(function () {
  const now = new Date();
  const diff = this.startDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Instance Methods
eventSchema.methods.addAttendee = function (userId, status = 'attending', guestCount = 0) {
  const existing = this.attendees.find(a => a.user.equals(userId));
  
  if (existing) {
    existing.status = status;
    existing.guestCount = guestCount;
  } else {
    // Check capacity
    if (this.registration.maxAttendees && 
        this.stats.attendeeCount >= this.registration.maxAttendees &&
        status === 'attending') {
      if (this.registration.waitlistEnabled) {
        status = 'waitlist';
      } else {
        throw new Error('Event is at full capacity');
      }
    }
    
    this.attendees.push({
      user: userId,
      status: status,
      guestCount: guestCount
    });
  }
  
  return this;
};

eventSchema.methods.removeAttendee = function (userId) {
  this.attendees = this.attendees.filter(a => !a.user.equals(userId));
  return this;
};

eventSchema.methods.isAttending = function (userId) {
  return this.attendees.some(a => 
    a.user.equals(userId) && 
    (a.status === 'attending' || a.status === 'maybe')
  );
};

eventSchema.methods.canUserEdit = function (userId, userRole = 'user') {
  return this.organizer.equals(userId) || 
         this.coOrganizers.some(co => co.user.equals(userId)) ||
         userRole === 'admin' ||
         userRole === 'moderator';
};

eventSchema.methods.checkInAttendee = function (userId) {
  const attendee = this.attendees.find(a => 
    a.user.equals(userId) && a.status === 'attending'
  );
  
  if (attendee && !attendee.checkedIn) {
    attendee.checkedIn = true;
    attendee.checkedInAt = new Date();
    return true;
  }
  
  return false;
};

eventSchema.methods.addUpdate = function (userId, title, content, isImportant = false) {
  this.updates.push({
    title,
    content,
    createdBy: userId,
    isImportant,
    createdAt: new Date()
  });
  return this;
};

// Static Methods
eventSchema.statics.findUpcoming = function (location = null, limit = 10) {
  const query = {
    status: 'published',
    startDate: { $gte: new Date() }
  };
  
  if (location) {
    query['location.city'] = new RegExp(location.city, 'i');
    query['location.country'] = location.country;
  }
  
  return this.find(query)
    .sort({ startDate: 1 })
    .limit(limit)
    .populate('organizer', 'firstName lastName username avatar')
    .populate('community', 'name slug avatar color')
    .select('-attendees -comments');
};

eventSchema.statics.findByDiaspora = function (country, options = {}) {
  const query = {
    status: 'published',
    'diasporaInfo.targetDiaspora': country
  };
  
  if (options.upcoming) {
    query.startDate = { $gte: new Date() };
  }
  
  return this.find(query)
    .sort({ startDate: 1 })
    .populate('organizer', 'firstName lastName username avatar')
    .populate('community', 'name slug avatar color')
    .select('-attendees -comments');
};

eventSchema.statics.findNearby = function (coordinates, radiusKm = 50, limit = 10) {
  return this.find({
    status: 'published',
    startDate: { $gte: new Date() },
    'location.type': { $in: ['physical', 'hybrid'] },
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    }
  })
    .limit(limit)
    .populate('organizer', 'firstName lastName username avatar')
    .select('-attendees -comments');
};

eventSchema.statics.findTrending = function (timeframe = 'week', limit = 10) {
  const now = new Date();
  let timeLimit;
  
  switch (timeframe) {
    case 'day':
      timeLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'week':
      timeLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
  }
  
  return this.find({
    status: 'published',
    startDate: { $gte: new Date(), $lte: timeLimit }
  })
    .sort({ 'stats.attendeeCount': -1, 'stats.interestedCount': -1 })
    .limit(limit)
    .populate('organizer', 'firstName lastName username avatar')
    .populate('community', 'name slug avatar color')
    .select('-attendees -comments');
};

module.exports = mongoose.model('Event', eventSchema);