const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');

const router = express.Router();

// @route   GET /api/user-management/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', [auth, adminOnly], async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }

    // Get users with pagination and populate employee data
    const users = await User.find(query)
      .select('-password')
      .populate('linkedEmployeeId', 'employeeId name position')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/user-management/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/users/:id', [auth, adminOnly], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('linkedEmployeeId', 'employeeId name position');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   POST /api/user-management/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/users', [
  auth,
  adminOnly,
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('linkedEmployeeId').optional().isMongoId().withMessage('Invalid employee ID')
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

    const { username, email, password, role, linkedEmployeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Validate linkedEmployeeId for employee role
    if (role === 'employee' && !linkedEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for employee role'
      });
    }

    // Create user (password will be hashed by User model pre-save hook)
    const user = new User({
      username,
      email,
      password,
      role,
      linkedEmployeeId: role === 'employee' ? linkedEmployeeId : undefined,
      isActive: true
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user'
    });
  }
});

// @route   PUT /api/user-management/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/users/:id', [
  auth,
  adminOnly,
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('linkedEmployeeId').optional().isMongoId().withMessage('Invalid employee ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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

    const existingUser = await User.findById(req.params.id);
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email or username is being changed and if it already exists
    if (req.body.email && req.body.email !== existingUser.email) {
      const emailCheck = await User.findOne({ email: req.body.email });
      if (emailCheck) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    if (req.body.username && req.body.username !== existingUser.username) {
      const usernameCheck = await User.findOne({ username: req.body.username });
      if (usernameCheck) {
        return res.status(400).json({
          success: false,
          message: 'User with this username already exists'
        });
      }
    }

    // Validate linkedEmployeeId for employee role
    if (req.body.role === 'employee' && !req.body.linkedEmployeeId && !existingUser.linkedEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for employee role'
      });
    }

    // Update fields (password will be hashed by User model pre-save hook if provided)
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        existingUser[key] = req.body[key];
      }
    });

    await existingUser.save();
    const updatedUser = await User.findById(req.params.id).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @route   DELETE /api/user-management/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', [auth, adminOnly], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Prevent deletion of the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUser: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// @route   PUT /api/user-management/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/users/:id/toggle-status', [auth, adminOnly], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling user status'
    });
  }
});

module.exports = router;
