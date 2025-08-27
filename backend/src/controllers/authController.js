/**
 * ObaNet Authentication Controller
 * Handles user authentication operations
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { redisUtils } = require('../config/redis');
const { catchAsync, AppError, createDiasporaError } = require('../middleware/errorHandler');
const { blacklistToken } = require('../middleware/auth');
const config = require('../config/config');

// Helper function to create and send tokens
const createSendTokens = (user, statusCode, res) => {
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in Redis with user ID
  redisUtils.set(
    `refresh_token:${user._id}`, 
    refreshToken, 
    30 * 24 * 60 * 60 // 30 days
  );

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message: 'Authentication successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        diasporaProfile: user.diasporaProfile,
        avatar: user.profile?.avatar,
        diasporaScore: user.stats?.diasporaScore
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    }
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = catchAsync(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    diasporaProfile
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Bu e-posta adresi zaten kullanımda', 400, 'EMAIL_EXISTS');
    }
    if (existingUser.username === username) {
      throw new AppError('Bu kullanıcı adı zaten kullanımda', 400, 'USERNAME_EXISTS');
    }
  }

  // Create new user
  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    password,
    diasporaProfile: {
      ...diasporaProfile,
      yearsInDiaspora: diasporaProfile.yearsInDiaspora || 0
    }
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  // await sendVerificationEmail(user.email, verificationToken);

  // Cache user data
  await redisUtils.cacheDiasporaData(user._id, user);

  createSendTokens(user, 201, res);
});

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Check for user and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Geçersiz e-posta veya şifre', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (user.status !== 'active') {
    throw new AppError(`Hesabınız ${user.status} durumunda`, 403, 'ACCOUNT_SUSPENDED');
  }

  // Update login history
  user.loginHistory.unshift({
    timestamp: new Date(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    location: req.get('CF-IPCountry') || 'Unknown'
  });

  // Keep only last 10 login records
  if (user.loginHistory.length > 10) {
    user.loginHistory = user.loginHistory.slice(0, 10);
  }

  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  // Cache user data
  await redisUtils.cacheDiasporaData(user._id, user);

  createSendTokens(user, 200, res);
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public (but requires valid refresh token)
const refreshToken = catchAsync(async (req, res) => {
  const { user, refreshToken: oldRefreshToken } = req;

  // Generate new tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Blacklist old refresh token
  await blacklistToken(oldRefreshToken, 'refresh');

  // Store new refresh token
  await redisUtils.set(
    `refresh_token:${user._id}`, 
    refreshToken, 
    30 * 24 * 60 * 60
  );

  res.json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    }
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = catchAsync(async (req, res) => {
  const token = req.header('Authorization').substring(7);

  // Blacklist the current access token
  await blacklistToken(token);

  // Remove refresh token from Redis
  await redisUtils.del(`refresh_token:${req.user._id}`);

  // Clear user cache
  await redisUtils.del(`diaspora:${req.user._id}`);

  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
});

// @desc    Logout from all devices
// @route   POST /api/v1/auth/logout-all
// @access  Private
const logoutAll = catchAsync(async (req, res) => {
  // This would require storing all active tokens for a user
  // For now, we'll just clear the current session
  const token = req.header('Authorization').substring(7);
  
  await blacklistToken(token);
  await redisUtils.del(`refresh_token:${req.user._id}`);
  await redisUtils.del(`diaspora:${req.user._id}`);

  res.json({
    success: true,
    message: 'Tüm cihazlardan çıkış yapıldı'
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('following', 'firstName lastName username avatar')
    .populate('followers', 'firstName lastName username avatar');

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        diasporaProfile: user.diasporaProfile,
        profile: user.profile,
        stats: user.stats,
        privacy: user.privacy,
        notifications: user.notifications,
        following: user.following,
        followers: user.followers,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }
    }
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists or not
    return res.json({
      success: true,
      message: 'Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save({ validateBeforeSave: false });

  // TODO: Send reset email
  // await sendPasswordResetEmail(user.email, resetToken);

  res.json({
    success: true,
    message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi'
  });
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
const resetPassword = catchAsync(async (req, res) => {
  const { password } = req.body;

  // Get user by token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Geçersiz veya süresi dolmuş token', 400, 'INVALID_RESET_TOKEN');
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  createSendTokens(user, 200, res);
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
const verifyEmail = catchAsync(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Geçersiz veya süresi dolmuş doğrulama token\'ı', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.stats.diasporaScore += 50; // Bonus points for email verification

  await user.save();

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  res.json({
    success: true,
    message: 'E-posta adresi başarıyla doğrulandı! +50 diaspora puanı kazandınız 🎉'
  });
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
const resendVerification = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({
      success: true,
      message: 'Eğer bu e-posta adresi sistemde kayıtlıysa, doğrulama e-postası gönderildi'
    });
  }

  if (user.isEmailVerified) {
    throw new AppError('E-posta adresi zaten doğrulanmış', 400, 'EMAIL_ALREADY_VERIFIED');
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  // await sendVerificationEmail(user.email, verificationToken);

  res.json({
    success: true,
    message: 'Doğrulama e-postası tekrar gönderildi'
  });
});

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Mevcut şifre hatalı', 400, 'INVALID_CURRENT_PASSWORD');
  }

  user.password = newPassword;
  await user.save();

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  res.json({
    success: true,
    message: 'Şifre başarıyla güncellendi'
  });
});

// @desc    Deactivate account
// @route   POST /api/v1/auth/deactivate-account
// @access  Private
const deactivateAccount = catchAsync(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findById(req.user._id);
  user.status = 'deactivated';
  
  // Store deactivation reason in a hypothetical field
  if (reason) {
    user.deactivationReason = reason;
    user.deactivatedAt = new Date();
  }

  await user.save();

  // Clear user cache and logout
  await redisUtils.del(`diaspora:${user._id}`);
  await redisUtils.del(`refresh_token:${user._id}`);

  res.json({
    success: true,
    message: 'Hesabınız deaktive edildi. Tekrar aktif hale getirmek için giriş yapabilirsiniz.'
  });
});

// @desc    Reactivate account
// @route   POST /api/v1/auth/reactivate-account
// @access  Private
const reactivateAccount = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.status !== 'deactivated') {
    throw new AppError('Hesap zaten aktif', 400, 'ACCOUNT_ALREADY_ACTIVE');
  }

  user.status = 'active';
  user.deactivationReason = undefined;
  user.deactivatedAt = undefined;

  await user.save();

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  res.json({
    success: true,
    message: 'Hesabınız tekrar aktif hale getirildi! Diaspora\'ya hoş geldiniz 🏕️'
  });
});

// Admin only functions
const adminDeleteUser = catchAsync(async (req, res) => {
  // TODO: Implement admin authorization check
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  await user.deleteOne();

  // Clear all related cache
  await redisUtils.del(`diaspora:${user._id}`);
  await redisUtils.del(`refresh_token:${user._id}`);

  res.json({
    success: true,
    message: 'Kullanıcı başarıyla silindi'
  });
});

const adminUpdateUserStatus = catchAsync(async (req, res) => {
  // TODO: Implement admin authorization check
  const { status } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  // Clear user cache
  await redisUtils.del(`diaspora:${user._id}`);

  res.json({
    success: true,
    message: 'Kullanıcı durumu güncellendi',
    data: { user }
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  deactivateAccount,
  reactivateAccount,
  adminDeleteUser,
  adminUpdateUserStatus
};