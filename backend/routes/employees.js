const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Employee = require('../models/Employee');
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
// @access  Private (Admin only)
router.post('/', [
  auth,
  adminOnly,
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('payRate').isNumeric().withMessage('Pay rate must be a number'),
  body('otRate').isNumeric().withMessage('OT rate must be a number'),
  body('vacationPayRate').isNumeric().withMessage('Vacation pay rate must be a number'),
  body('breakTimeConfig.duration').optional().isNumeric().withMessage('Break duration must be a number')
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
      passwordResetInfo
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

    res.status(201).json({
      message: 'Employee created successfully',
      employee
    });
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

// @route   DELETE /api/employees/:id
// @desc    Soft delete employee
// @access  Private (Admin only)
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Soft delete by changing status
    employee.status = 'inactive';
    await employee.save();

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
