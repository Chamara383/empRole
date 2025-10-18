const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const User = require('../models/User');

const router = express.Router();

// @route   POST /api/employee-password-reset/verify
// @desc    Verify employee identity for password reset
// @access  Public
router.post('/verify', [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('dateOfBirth').isISO8601().withMessage('Date of birth must be a valid date')
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

    const { employeeId, dateOfBirth } = req.body;

    // Find employee by ID
    const employee = await Employee.findOne({ 
      employeeId: employeeId.toUpperCase(),
      status: 'active'
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Employee not found or inactive'
      });
    }

    // Check if employee has password reset info
    if (!employee.passwordResetInfo) {
      return res.status(400).json({
        success: false,
        message: 'Password reset information not configured for this employee'
      });
    }

    // Verify the provided information
    const providedDOB = new Date(dateOfBirth);
    const storedDOB = new Date(employee.passwordResetInfo.dateOfBirth);
    
    const isDOBMatch = providedDOB.getTime() === storedDOB.getTime();

    if (!isDOBMatch) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth does not match our records'
      });
    }

    // Find the associated user account
    const user = await User.findOne({ 
      linkedEmployeeId: employee._id,
      role: 'employee'
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No user account found for this employee'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee verification successful',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        position: employee.position
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Employee verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during employee verification'
    });
  }
});

// @route   POST /api/employee-password-reset/reset
// @desc    Reset employee password after verification
// @access  Public
router.post('/reset', [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('dateOfBirth').isISO8601().withMessage('Date of birth must be a valid date'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
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

    const { employeeId, dateOfBirth, newPassword } = req.body;

    // Find employee by ID
    const employee = await Employee.findOne({ 
      employeeId: employeeId.toUpperCase(),
      status: 'active'
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Employee not found or inactive'
      });
    }

    // Check if employee has password reset info
    if (!employee.passwordResetInfo) {
      return res.status(400).json({
        success: false,
        message: 'Password reset information not configured for this employee'
      });
    }

    // Verify the provided information
    const providedDOB = new Date(dateOfBirth);
    const storedDOB = new Date(employee.passwordResetInfo.dateOfBirth);
    
    const isDOBMatch = providedDOB.getTime() === storedDOB.getTime();

    if (!isDOBMatch) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth does not match our records'
      });
    }

    // Find the associated user account
    const user = await User.findOne({ 
      linkedEmployeeId: employee._id,
      role: 'employee'
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No user account found for this employee'
      });
    }

    // Update the password
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Employee password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

module.exports = router;
