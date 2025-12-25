const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Employee = require('../models/Employee');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { adminOnly, adminOrManager } = require('../middleware/roleCheck');

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private (Admin/Manager)
router.get('/', [auth, adminOrManager], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Employee.countDocuments(query);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private (Admin/Manager)
router.get('/:id', [auth, adminOrManager], async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private (Admin/Manager)
router.post('/', [
  auth,
  adminOrManager,
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('payRate').isNumeric().withMessage('Pay rate must be a number'),
  body('otRate').isNumeric().withMessage('OT rate must be a number'),
  body('vacationPayRate').isNumeric().withMessage('Vacation pay rate must be a number'),
  body('breakTimeConfig.duration').optional().isNumeric().withMessage('Break duration must be a number'),
  body('email').isEmail().withMessage('Valid email is required for login'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      employeeId,
      name,
      position,
      dateOfEmployment,
      payRate,
      otRate,
      vacationPayRate,
      breakTimeConfig,
      personalInfo,
      passwordResetInfo,
      email,
      password
    } = req.body;

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    const employee = new Employee({
      employeeId,
      name,
      position,
      dateOfEmployment: dateOfEmployment || new Date(),
      payRate,
      otRate,
      vacationPayRate,
      breakTimeConfig: breakTimeConfig || { isPaid: false, duration: 0 },
      personalInfo: personalInfo || {},
      passwordResetInfo: passwordResetInfo || {}
    });

    await employee.save();

    // Automatically create user account for the employee
    try {
      // Use email as username (normalized to lowercase)
      const username = email.toLowerCase().trim();
      
      // Check if username/email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email: username }]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email already exists. Please use a different email.' 
        });
      }

      // Create user account with email as username
      const user = new User({
        username: username, // Email is used as username
        email: username,    // Same as username
        password: password, // Password provided by manager (will be hashed by pre-save hook)
        role: 'employee',
        linkedEmployeeId: employee._id,
        isActive: true
      });

      await user.save();

      // Update employee's personalInfo with the email if not already set
      if (!employee.personalInfo?.email) {
        employee.personalInfo = employee.personalInfo || {};
        employee.personalInfo.email = username;
        await employee.save();
      }

      res.status(201).json({
        message: 'Employee created successfully with login credentials',
        employee,
        userCredentials: {
          username: user.username,
          email: user.email,
          message: 'Login credentials created. The employee can log in using their email and the password you set.'
        }
      });
    } catch (userError) {
      // If user creation fails, still return success for employee creation
      // but log the error
      console.error('Error creating user account for employee:', userError);
      res.status(201).json({
        message: 'Employee created successfully, but user account creation failed',
        employee,
        warning: 'User account could not be created. Please create it manually.',
        error: userError.message
      });
    }
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  adminOnly,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('payRate').optional().isNumeric().withMessage('Pay rate must be a number'),
  body('otRate').optional().isNumeric().withMessage('OT rate must be a number'),
  body('vacationPayRate').optional().isNumeric().withMessage('Vacation pay rate must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee ID is being changed and if it already exists
    if (req.body.employeeId && req.body.employeeId !== employee.employeeId) {
      const existingEmployee = await Employee.findOne({ employeeId: req.body.employeeId });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/employees/:id/deactivate
// @desc    Deactivate employee (soft delete)
// @access  Private (Admin/Manager)
router.put('/:id/deactivate', [auth, adminOrManager], async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.status === 'inactive') {
      return res.status(400).json({ message: 'Employee is already deactivated' });
    }

    // Soft delete by changing status
    employee.status = 'inactive';
    await employee.save();

    res.json({ 
      message: 'Employee deactivated successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Deactivate employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/employees/:id/activate
// @desc    Activate employee
// @access  Private (Admin/Manager)
router.put('/:id/activate', [auth, adminOrManager], async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.status === 'active') {
      return res.status(400).json({ message: 'Employee is already active' });
    }

    // Activate employee
    employee.status = 'active';
    await employee.save();

    res.json({ 
      message: 'Employee activated successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Activate employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Permanently delete employee
// @access  Private (Admin only)
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee has associated timesheets or other data
    // You might want to add additional checks here based on your business logic
    const employeeId = employee.employeeId;
    const employeeName = employee.name;

    // Permanently delete the employee
    await Employee.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Employee permanently deleted successfully',
      deletedEmployee: {
        id: employee._id,
        name: employeeName,
        employeeId: employeeId
      }
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
