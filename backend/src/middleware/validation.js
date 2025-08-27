/**
 * ObaNet Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');
const config = require('../config/config');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorMessages
    });
  }
  
  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Ad sadece harflerden oluşabilir'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Soyad sadece harflerden oluşabilir'),
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Kullanıcı adı 3-20 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanıcı adı sadece harf, sayı ve alt çizgi içerebilir')
    .toLowerCase(),
  
  body('email')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Şifre 6-100 karakter arasında olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Şifre tekrarı eşleşmiyor');
      }
      return true;
    }),

  // Diaspora profile validation
  body('diasporaProfile.currentCountry')
    .isIn(config.diaspora.supportedCountries)
    .withMessage('Desteklenmeyen ülke seçimi'),
  
  body('diasporaProfile.currentCity')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Şehir adı 2-50 karakter arasında olmalıdır'),
  
  body('diasporaProfile.originCity')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Memleket şehri 2-50 karakter arasında olmalıdır'),
  
  body('diasporaProfile.diasporaGeneration')
    .optional()
    .isIn(['1st', '2nd', '3rd', 'other'])
    .withMessage('Geçersiz diaspora nesil bilgisi'),
  
  body('diasporaProfile.yearsInDiaspora')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Diasporada geçen yıl sayısı 0-100 arasında olmalıdır'),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Şifre gereklidir'),

  handleValidationErrors
];

// Community creation validation
const validateCommunityCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Topluluk adı 3-100 karakter arasında olmalıdır'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Açıklama 10-500 karakter arasında olmalıdır'),
  
  body('type')
    .isIn(['location', 'interest', 'professional', 'cultural', 'educational'])
    .withMessage('Geçersiz topluluk türü'),
  
  body('category')
    .isIn([
      'diaspora_general', 'city_based', 'country_based',
      'business_network', 'students', 'professionals',
      'cultural_arts', 'sports', 'technology', 'health',
      'education', 'family', 'youth', 'seniors',
      'religious', 'political', 'charity', 'hobbies'
    ])
    .withMessage('Geçersiz kategori seçimi'),
  
  body('diasporaInfo.targetCountry')
    .optional()
    .isIn([
      'Germany', 'France', 'Netherlands', 'Belgium', 'Austria',
      'Switzerland', 'UK', 'USA', 'Canada', 'Australia',
      'Turkey', 'Northern Cyprus', 'Global', 'Other'
    ])
    .withMessage('Desteklenmeyen ülke seçimi'),
  
  body('diasporaInfo.languagePreference')
    .optional()
    .isIn(['tr', 'en', 'de', 'fr', 'mixed'])
    .withMessage('Geçersiz dil tercihi'),
  
  body('settings.visibility')
    .optional()
    .isIn(['public', 'diaspora_only', 'private'])
    .withMessage('Geçersiz görünürlük ayarı'),
  
  body('settings.joinPolicy')
    .optional()
    .isIn(['open', 'request', 'invite_only'])
    .withMessage('Geçersiz katılım politikası'),

  handleValidationErrors
];

// Post creation validation
const validatePostCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Başlık 5-200 karakter arasında olmalıdır'),
  
  body('content')
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('İçerik 10-10000 karakter arasında olmalıdır'),
  
  body('contentType')
    .optional()
    .isIn(['text', 'image', 'video', 'link', 'poll', 'event_share'])
    .withMessage('Geçersiz içerik türü'),
  
  body('community')
    .isMongoId()
    .withMessage('Geçerli bir topluluk ID\'si gereklidir'),
  
  body('category')
    .optional()
    .isIn([
      'general', 'news', 'discussion', 'question', 'help',
      'event', 'job', 'housing', 'business', 'cultural',
      'education', 'health', 'legal', 'technology'
    ])
    .withMessage('Geçersiz kategori'),
  
  body('language')
    .optional()
    .isIn(['tr', 'en', 'de', 'fr'])
    .withMessage('Desteklenmeyen dil'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Etiketler dizi formatında olmalıdır'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Etiket 30 karakterden uzun olamaz'),

  handleValidationErrors
];

// Event creation validation
const validateEventCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage('Başlık 5-150 karakter arasında olmalıdır'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Açıklama 20-2000 karakter arasında olmalıdır'),
  
  body('type')
    .isIn([
      'meetup', 'workshop', 'conference', 'cultural', 'business',
      'sports', 'food', 'music', 'art', 'education', 'religious',
      'family', 'networking', 'celebration', 'protest', 'charity'
    ])
    .withMessage('Geçersiz etkinlik türü'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Geçerli başlangıç tarihi gereklidir')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Başlangıç tarihi gelecekte olmalıdır');
      }
      return true;
    }),
  
  body('endDate')
    .isISO8601()
    .withMessage('Geçerli bitiş tarihi gereklidir')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }
      return true;
    }),
  
  body('location.type')
    .isIn(['physical', 'virtual', 'hybrid'])
    .withMessage('Geçersiz konum türü'),
  
  body('location.city')
    .if(body('location.type').equals('physical'))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Şehir adı gereklidir'),
  
  body('location.country')
    .if(body('location.type').equals('physical'))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ülke adı gereklidir'),
  
  body('location.virtualLink')
    .if(body('location.type').isIn(['virtual', 'hybrid']))
    .isURL()
    .withMessage('Geçerli sanal toplantı linki gereklidir'),
  
  body('registration.maxAttendees')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Maksimum katılımcı sayısı 1-10000 arasında olmalıdır'),

  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Mesaj 1-1000 karakter arasında olmalıdır'),
  
  body('recipient')
    .optional()
    .isMongoId()
    .withMessage('Geçerli alıcı ID\'si gereklidir'),
  
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Geçersiz mesaj türü'),

  handleValidationErrors
];

// Comment validation
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Yorum 1-1000 karakter arasında olmalıdır'),

  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 karakter arasında olmalıdır'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 karakter arasında olmalıdır'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio 500 karakterden uzun olamaz'),
  
  body('profile.profession')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Meslek 100 karakterden uzun olamaz'),
  
  body('diasporaProfile.currentCountry')
    .optional()
    .isIn(config.diaspora.supportedCountries)
    .withMessage('Desteklenmeyen ülke seçimi'),

  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage('Geçersiz ID formatı'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sayfa numarası 1 veya daha büyük olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arasında olmalıdır'),
  
  query('sort')
    .optional()
    .isIn(['recent', 'popular', 'trending', 'oldest'])
    .withMessage('Geçersiz sıralama türü'),

  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Arama terimi 2-100 karakter arasında olmalıdır'),
  
  query('type')
    .optional()
    .isIn(['posts', 'communities', 'events', 'users'])
    .withMessage('Geçersiz arama türü'),

  handleValidationErrors
];

// File upload validation
const validateFileUpload = (allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize: maxSize,
          fileSize: file.size
        });
      }

      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          code: 'INVALID_FILE_TYPE',
          allowedTypes: allowedTypes,
          receivedType: file.mimetype
        });
      }
    }

    next();
  };
};

// Custom validation for diaspora-specific data
const validateDiasporaLocation = [
  body('country')
    .isIn(config.diaspora.supportedCountries)
    .withMessage('Desteklenmeyen ülke'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Şehir adı 2-50 karakter arasında olmalıdır'),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCommunityCreation,
  validatePostCreation,
  validateEventCreation,
  validateMessage,
  validateComment,
  validateProfileUpdate,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateFileUpload,
  validateDiasporaLocation
};