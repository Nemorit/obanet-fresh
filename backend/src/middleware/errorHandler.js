/**
 * ObaNet Global Error Handler Middleware
 * Centralized error handling for the API
 */

const config = require('../config/config');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// MongoDB/Mongoose error handlers
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists. Please use another value.`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    status: err.status,
    stack: err.stack,
    details: {
      name: err.name,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    }
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'OPERATIONAL_ERROR'
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥:', err);

    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'The server encountered an unexpected condition that prevented it from fulfilling the request.'
    });
  }
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details
  console.error(`🚨 Error ${err.statusCode}: ${err.message}`);
  if (config.server.env === 'development') {
    console.error('Stack:', err.stack);
  }

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.name === 'CastError') error = handleCastErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Handle Multer (file upload) errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 413, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new AppError('Too many files uploaded', 413, 'TOO_MANY_FILES');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // Handle Redis errors (non-critical)
  if (err.message && err.message.includes('Redis')) {
    console.warn('Redis error (non-critical):', err.message);
    error = new AppError('Cache service temporarily unavailable', 503, 'CACHE_SERVICE_ERROR');
  }

  // Send appropriate error response
  if (config.server.env === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const error = new AppError(
    `Can't find ${req.originalUrl} on this server!`, 
    404, 
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

// Diaspora-specific error messages in Turkish
const diasporaErrors = {
  COMMUNITY_NOT_FOUND: 'Topluluk bulunamadı',
  NOT_COMMUNITY_MEMBER: 'Bu topluluğa üye değilsiniz',
  DIASPORA_PROFILE_INCOMPLETE: 'Diaspora profilinizi tamamlamanız gerekiyor',
  EMAIL_NOT_VERIFIED: 'E-posta adresinizi doğrulamanız gerekiyor',
  INVALID_DIASPORA_DATA: 'Geçersiz diaspora bilgileri',
  LOCATION_REQUIRED: 'Konum bilgisi zorunludur',
  ORIGIN_CITY_REQUIRED: 'Memleket şehri bilgisi zorunludur'
};

// Helper function to create diaspora-specific errors
const createDiasporaError = (code, statusCode = 400) => {
  const message = diasporaErrors[code] || 'Diaspora işlemi başarısız';
  return new AppError(message, statusCode, code);
};

// Validation helper for diaspora data
const validateDiasporaData = (data) => {
  const errors = [];

  if (!data.currentCountry) {
    errors.push('Yaşadığınız ülke bilgisi zorunludur');
  }
  
  if (!data.currentCity) {
    errors.push('Yaşadığınız şehir bilgisi zorunludur');
  }
  
  if (!data.originCity) {
    errors.push('Memleket şehriniz bilgisi zorunludur');
  }

  if (!config.diaspora.supportedCountries.includes(data.currentCountry)) {
    errors.push('Desteklenmeyen ülke seçimi');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400, 'DIASPORA_VALIDATION_ERROR');
  }
};

// Rate limiting error
const createRateLimitError = (retryAfter) => {
  return new AppError(
    `Too many requests. Please try again after ${retryAfter} seconds.`,
    429,
    'RATE_LIMIT_EXCEEDED'
  );
};

// File upload error helpers
const createFileUploadError = (type, details = '') => {
  const messages = {
    INVALID_FILE_TYPE: `Geçersiz dosya türü. ${details}`,
    FILE_TOO_LARGE: `Dosya çok büyük. Maksimum boyut: ${details}`,
    UPLOAD_FAILED: 'Dosya yüklenemedi',
    NO_FILE: 'Dosya seçilmedi'
  };

  const message = messages[type] || 'Dosya yükleme hatası';
  return new AppError(message, 400, type);
};

// Database connection error
const createDBError = (operation = 'database') => {
  return new AppError(
    `Database ${operation} failed. Please try again later.`,
    503,
    'DATABASE_ERROR'
  );
};

// Community-specific error handlers
const createCommunityError = (type, details = '') => {
  const messages = {
    COMMUNITY_FULL: 'Topluluk dolu',
    ALREADY_MEMBER: 'Zaten bu topluluğun üyesisiniz',
    NOT_AUTHORIZED: 'Bu işlem için yetkiniz yok',
    COMMUNITY_PRIVATE: 'Bu topluluk privattır',
    JOIN_REQUEST_PENDING: 'Katılma isteğiniz beklemede'
  };

  const message = messages[type] || 'Topluluk işlemi başarısız';
  return new AppError(`${message}. ${details}`.trim(), 400, type);
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFound,
  createDiasporaError,
  validateDiasporaData,
  createRateLimitError,
  createFileUploadError,
  createDBError,
  createCommunityError
};