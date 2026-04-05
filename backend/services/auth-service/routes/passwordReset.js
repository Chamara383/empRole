const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/password-reset/request
// @desc    Request password reset
// @access  Public
router.post('/request', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Generate reset token
    const resetToken = await PasswordResetToken.generateToken(user._id);

    // In a real application, you would send an email here
    // For now, we'll return the token in the response for testing
    res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email.',
      // Remove this in production - only for testing
      resetToken: resetToken.token,
      expiresAt: resetToken.expiresAt
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// @route   POST /api/password-reset/verify
// @desc    Verify password reset token
// @access  Public
router.post('/verify', [
  body('token').notEmpty().withMessage('Reset token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    // Verify token
    const resetToken = await PasswordResetToken.verifyToken(token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reset token is valid',
      user: {
        id: resetToken.userId._id,
        username: resetToken.userId.username,
        email: resetToken.userId.email
      }
    });

  } catch (error) {
    console.error('Password reset verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
});

// @route   POST /api/password-reset/reset
// @desc    Reset password with token
// @access  Public
router.post('/reset', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Verify token
    const resetToken = await PasswordResetToken.verifyToken(token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update user password
    const user = resetToken.userId;
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    // Mark token as used
    await resetToken.markAsUsed();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});


module.exports = router;
