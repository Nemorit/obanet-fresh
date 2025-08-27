/**
 * ObaNet Authentication Routes
 * User registration, login, logout, and token management
 */

const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const { authenticate, validateRefreshToken, userRateLimit } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin,
  validateObjectId
} = require('../middleware/validation');

// Public routes - no authentication required
router.post('/register', 
  userRateLimit(15 * 60 * 1000, 5), // 5 registrations per 15 minutes
  validateUserRegistration,
  authController.register
);

router.post('/login', 
  userRateLimit(15 * 60 * 1000, 10), // 10 login attempts per 15 minutes
  validateUserLogin,
  authController.login
);

router.post('/refresh-token', 
  userRateLimit(60 * 1000, 5), // 5 refresh attempts per minute
  validateRefreshToken,
  authController.refreshToken
);

router.post('/forgot-password',
  userRateLimit(60 * 60 * 1000, 3), // 3 attempts per hour
  authController.forgotPassword
);

router.post('/reset-password/:token',
  userRateLimit(60 * 60 * 1000, 5), // 5 attempts per hour
  authController.resetPassword
);

router.get('/verify-email/:token',
  authController.verifyEmail
);

router.post('/resend-verification',
  userRateLimit(60 * 60 * 1000, 3), // 3 attempts per hour
  authController.resendVerification
);

// Protected routes - authentication required
router.use(authenticate); // All routes below require authentication

router.post('/logout',
  authController.logout
);

router.post('/logout-all',
  authController.logoutAll
);

router.get('/me',
  authController.getMe
);

router.post('/change-password',
  userRateLimit(60 * 60 * 1000, 5), // 5 attempts per hour
  authController.changePassword
);

router.post('/deactivate-account',
  userRateLimit(24 * 60 * 60 * 1000, 1), // 1 attempt per day
  authController.deactivateAccount
);

router.post('/reactivate-account',
  userRateLimit(24 * 60 * 60 * 1000, 3), // 3 attempts per day
  authController.reactivateAccount
);

// Admin routes - require admin role
router.delete('/admin/users/:id',
  validateObjectId('id'),
  authController.adminDeleteUser
);

router.patch('/admin/users/:id/status',
  validateObjectId('id'),
  authController.adminUpdateUserStatus
);

module.exports = router;