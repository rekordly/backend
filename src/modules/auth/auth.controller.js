const authService = require('./auth.service');
const { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/errors/app-error');

class AuthController {
  // User signup
  signup = asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    sendCreated(res, result, 'User registered successfully');
  });

  // User login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, 'Login successful');
  });

  // Admin login
  adminLogin = asyncHandler(async (req, res) => {
    const { adminEmail, adminPassword } = req.body;
    const result = await authService.adminLogin(adminEmail, adminPassword);
    sendSuccess(res, result, 'Admin login successful');
  });

  // Request password reset
  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    sendSuccess(res, result);
  });

  // Verify OTP
  verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp, purpose } = req.body;
    const result = await authService.verifyOTP(email, otp, purpose);
    sendSuccess(res, result);
  });

  // Reset password
  resetPassword = asyncHandler(async (req, res) => {
    const { email, newPassword, otp } = req.body;
    const result = await authService.resetPassword(email, newPassword, otp);
    sendSuccess(res, result);
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    sendSuccess(res, result);
  });

  // Update profile
  updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user.id, req.body);
    sendSuccess(res, result, 'Profile updated successfully');
  });

  // Get current user
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.id);
    sendSuccess(res, user);
  });

  // Logout
  logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.token);
    sendSuccess(res, result);
  });

  // Admin logout
  adminLogout = asyncHandler(async (req, res) => {
    const result = await authService.adminLogout(req.token);
    sendSuccess(res, result);
  });

  // Get current admin
  getCurrentAdmin = asyncHandler(async (req, res) => {
    const admin = await authService.getAdminById(req.admin.id);
    sendSuccess(res, admin);
  });

  // Refresh token (if needed)
  refreshToken = asyncHandler(async (req, res) => {
    // This would implement token refresh logic
    // For now, we'll just return success
    sendSuccess(res, { message: 'Token refresh not implemented yet' });
  });
}

module.exports = new AuthController();